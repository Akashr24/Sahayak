"""routers/requests.py — Requests CRUD + 112 emergency escalation"""

from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
import aiosqlite

from database import (
    get_requests, get_request_by_id, get_volunteers,
    add_request, add_emergency_record, update_request_assign,
    update_request_status, update_request_fields,
    get_emergency_records, log_audit,
    DB_PATH,
)
from utils import _now, broadcast, make_req_id, make_emg_id, paginate

router = APIRouter()


# ─── List requests (paginated + filtered) ─────────────────────────────────────
@router.get("/api/requests", tags=["Requests"])
async def list_requests(
    status:  Optional[str] = Query(None, description="PENDING|ASSIGNED|IN_PROGRESS|RESOLVED|ESCALATED_112"),
    urgency: Optional[str] = Query(None, description="CRITICAL_112|HIGH|MEDIUM|ROUTINE"),
    limit:   Optional[int] = Query(None, ge=1, le=500),
    offset:  Optional[int] = Query(0,    ge=0),
):
    async with aiosqlite.connect(DB_PATH) as db:
        reqs = await get_requests(db, status=status, urgency=urgency)
    return paginate(reqs, limit, offset)


# ─── Single request ───────────────────────────────────────────────────────────
@router.get("/api/requests/{req_id}", tags=["Requests"])
async def get_request(req_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        r = await get_request_by_id(db, req_id)
    if not r:
        return JSONResponse(status_code=404, content={"error": "Request not found"})
    return r


# ─── Create request ───────────────────────────────────────────────────────────
@router.post("/api/requests", status_code=201, tags=["Requests"])
async def create_request(request: Request):
    body = await request.json()
    senior_name = (body.get("seniorName") or "").strip()
    description = (body.get("description") or "").strip()
    if not senior_name or not description:
        return JSONResponse(status_code=400, content={"error": "seniorName and description are required."})

    req_id = make_req_id()
    new_req = {
        "id": req_id, "seniorName": senior_name,
        "seniorPhone": body.get("seniorPhone"),
        "location": body.get("location", "Shirva Town"),
        "language": body.get("language", "Kannada"),
        "category": body.get("category", "General Assistance"),
        "urgency": body.get("urgency", "MEDIUM"),
        "description": description, "status": "PENDING",
    }
    async with aiosqlite.connect(DB_PATH) as db:
        created = await add_request(db, new_req)
        await log_audit(db, "REQUEST_CREATED",
                        f"Request {req_id} created for {senior_name} ({new_req['category']}).",
                        "Web Portal")

    await broadcast(request.app, "REQUEST_CREATED", created)
    return created


# ─── Partial update (PATCH) ───────────────────────────────────────────────────
@router.patch("/api/requests/{req_id}", tags=["Requests"])
async def patch_request(req_id: str, request: Request):
    """Update mutable fields on a request (category, urgency, description, location, language, audioNotes)."""
    body = await request.json()
    actor = body.pop("_actor", "Web Portal")

    async with aiosqlite.connect(DB_PATH) as db:
        r = await get_request_by_id(db, req_id)
        if not r:
            return JSONResponse(status_code=404, content={"error": "Request not found"})
        updated = await update_request_fields(db, req_id, body)
        await log_audit(db, "REQUEST_UPDATED",
                        f"Request {req_id} fields updated by {actor}: {list(body.keys())}.",
                        actor)

    await broadcast(request.app, "REQUEST_UPDATED", updated)
    return updated


# ─── Update status ────────────────────────────────────────────────────────────
@router.put("/api/requests/{req_id}/status", tags=["Requests"])
async def update_status(req_id: str, request: Request):
    body = await request.json()
    status = body.get("status")
    actor  = body.get("actor", "Volunteer")
    note   = body.get("note", "Updated by user")

    valid_statuses = {"PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "ESCALATED_112"}
    if status not in valid_statuses:
        return JSONResponse(status_code=400, content={
            "error": f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}"
        })

    async with aiosqlite.connect(DB_PATH) as db:
        r = await get_request_by_id(db, req_id)
        if not r:
            return JSONResponse(status_code=404, content={"error": "Request not found"})
        old_status = r["status"]
        await update_request_status(db, req_id, status)
        await log_audit(db, "STATUS_UPDATED",
                        f"Request {req_id} changed from {old_status} to {status}. Note: {note}.",
                        actor)
        updated = await get_request_by_id(db, req_id)

    await broadcast(request.app, "REQUEST_STATUS_UPDATED", updated)
    return updated


# ─── Assign volunteer ─────────────────────────────────────────────────────────
@router.put("/api/requests/{req_id}/assign", tags=["Requests"])
async def assign_request(req_id: str, request: Request):
    body = await request.json()
    vol_id = body.get("volunteerId")
    actor  = body.get("actor", "Police Dispatcher")

    async with aiosqlite.connect(DB_PATH) as db:
        r = await get_request_by_id(db, req_id)
        volunteers = await get_volunteers(db)
        v = next((x for x in volunteers if x["id"] == vol_id), None)

        if not r:
            return JSONResponse(status_code=404, content={"error": "Request not found"})
        if not v:
            return JSONResponse(status_code=404, content={"error": "Volunteer not found"})
        if v["verificationStatus"] != "VERIFIED":
            return JSONResponse(status_code=400, content={
                "error": "Cannot assign unverified volunteer. Shirva Police verification required."
            })

        await update_request_assign(db, req_id, v["id"], v["name"])
        await log_audit(db, "VOLUNTEER_ASSIGNED",
                        f"Request {req_id} dispatched to {v['name']} ({v.get('policeBadgeNo', 'Verified')}).",
                        actor)
        updated = await get_request_by_id(db, req_id)

    await broadcast(request.app, "REQUEST_ASSIGNED", updated)
    return updated


# ─── Emergency manual escalation ──────────────────────────────────────────────
@router.post("/api/emergency/manual-escalate", status_code=201, tags=["Requests"])
async def manual_escalate(request: Request):
    body = await request.json()
    senior_name  = body.get("seniorName", "Unknown Senior Resident")
    senior_phone = body.get("seniorPhone", "Unknown")
    location     = body.get("location", "Shirva")
    reason       = body.get("reason", "Emergency reported at police station desk")
    officer_name = body.get("officerName", "PSI Shirva Police Station")

    if not senior_name or not location:
        return JSONResponse(status_code=400, content={"error": "seniorName and location are required."})

    emg_id = make_emg_id().replace("112", "MANUAL")
    emg_req = {
        "id": emg_id, "seniorName": senior_name, "seniorPhone": senior_phone,
        "location": location, "language": "English",
        "category": "CRITICAL EMERGENCY (112) — Manual Police Escalation",
        "urgency": "CRITICAL_112",
        "description": f"[MANUAL 112 ESCALATION by {officer_name}] {reason}",
        "status": "ESCALATED_112", "escalatedTo112": True,
        "assignedVolunteerName": "Shirva Police Quick Response Unit + 112 Dispatch",
        "audioNotes": f"Manual escalation by {officer_name} from web console.",
    }
    async with aiosqlite.connect(DB_PATH) as db:
        await add_request(db, emg_req)
        await add_emergency_record(db, {
            "id": make_emg_id(),
            "requestId": emg_id, "seniorName": senior_name, "location": location,
            "reason": f"Manual 112 by {officer_name}: {reason}",
            "callerPhone": senior_phone, "escalatedBy": officer_name,
            "policeStation": "Shirva PS", "status": "DISPATCHED",
        })
        await log_audit(db, "EMERGENCY_112_MANUAL_ESCALATION",
                        f"MANUAL 112 by {officer_name}: {senior_name} at {location}. Reason: {reason}",
                        officer_name)

    await broadcast(request.app, "EMERGENCY_ESCALATED", emg_req)
    return {
        "success": True,
        "message": f"Manual 112 escalation logged. Shirva Police QRT and 112 notified for {senior_name} at {location}.",
        "emergency": emg_req,
    }


# ─── Emergency records ────────────────────────────────────────────────────────
@router.get("/api/emergency/records", tags=["Requests"])
async def emergency_records(
    limit:  Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(0,    ge=0),
):
    async with aiosqlite.connect(DB_PATH) as db:
        records = await get_emergency_records(db)
    return paginate(records, limit, offset)
