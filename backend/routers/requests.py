"""routers/requests.py — Requests CRUD + 112 emergency escalation"""

import random
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from typing import Optional
import aiosqlite

from database import (
    get_requests, get_request_by_id, get_volunteers,
    add_request, add_emergency_record, update_request_assign,
    update_request_status, get_emergency_records, log_audit,
    DB_PATH,
)

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@router.get("/api/requests")
async def list_requests(status: Optional[str] = None, urgency: Optional[str] = None):
    async with aiosqlite.connect(DB_PATH) as db:
        return await get_requests(db, status=status, urgency=urgency)


@router.get("/api/requests/{req_id}")
async def get_request(req_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        r = await get_request_by_id(db, req_id)
    if not r:
        return JSONResponse(status_code=404, content={"error": "Request not found"})
    return r


@router.post("/api/requests", status_code=201)
async def create_request(request: Request):
    body = await request.json()
    senior_name = body.get("seniorName")
    description = body.get("description")
    if not senior_name or not description:
        return JSONResponse(status_code=400, content={"error": "seniorName and description are required."})

    req_id = f"REQ-{datetime.now().year}-{random.randint(100, 999)}"
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
    return created


@router.put("/api/requests/{req_id}/status")
async def update_status(req_id: str, request: Request):
    body = await request.json()
    status = body.get("status")
    actor  = body.get("actor", "Volunteer")
    note   = body.get("note", "Updated by user")

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
    return updated


@router.put("/api/requests/{req_id}/assign")
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
    return updated


# ─── Emergency manual escalation ──────────────────────────────────────────────
@router.post("/api/emergency/manual-escalate", status_code=201)
async def manual_escalate(request: Request):
    body = await request.json()
    senior_name  = body.get("seniorName", "Unknown Senior Resident")
    senior_phone = body.get("seniorPhone", "Unknown")
    location     = body.get("location", "Shirva")
    reason       = body.get("reason", "Emergency reported at police station desk")
    officer_name = body.get("officerName", "PSI Shirva Police Station")

    if not senior_name or not location:
        return JSONResponse(status_code=400, content={"error": "seniorName and location are required."})

    emg_id = f"EMG-MANUAL-{int(datetime.now().timestamp() * 1000) % 10000}"
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
            "id": f"EMG-{int(datetime.now().timestamp() * 1000)}",
            "requestId": emg_id, "seniorName": senior_name, "location": location,
            "reason": f"Manual 112 by {officer_name}: {reason}",
            "callerPhone": senior_phone, "escalatedBy": officer_name,
            "policeStation": "Shirva PS", "status": "DISPATCHED",
        })
        await log_audit(db, "EMERGENCY_112_MANUAL_ESCALATION",
                        f"MANUAL 112 by {officer_name}: {senior_name} at {location}. Reason: {reason}",
                        officer_name)

    return {
        "success": True,
        "message": f"Manual 112 escalation logged. Shirva Police QRT and 112 notified for {senior_name} at {location}.",
        "emergency": emg_req,
    }


@router.get("/api/emergency/records")
async def emergency_records():
    async with aiosqlite.connect(DB_PATH) as db:
        return await get_emergency_records(db)
