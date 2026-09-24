"""routers/seniors.py — Senior citizens CRUD + audit logs"""

from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
import aiosqlite

from database import (
    get_senior_citizens, get_senior_by_id,
    add_senior_citizen, update_senior_citizen, delete_senior_citizen,
    get_audit_logs, log_audit,
    DB_PATH,
)
from utils import _now, broadcast, paginate

router = APIRouter()


# ─── List seniors (paginated) ─────────────────────────────────────────────────
@router.get("/api/senior-citizens", tags=["Senior Citizens"])
@router.get("/api/seniors", tags=["Senior Citizens"])
async def list_seniors(
    language: Optional[str] = Query(None, description="Filter by preferred language"),
    active:   Optional[bool] = Query(None, description="Filter by isActive flag"),
    limit:    Optional[int]  = Query(None, ge=1, le=500, description="Max records to return"),
    offset:   Optional[int]  = Query(0,    ge=0,         description="Records to skip"),
):
    async with aiosqlite.connect(DB_PATH) as db:
        seniors = await get_senior_citizens(db, language=language)

    if active is not None:
        seniors = [s for s in seniors if bool(s.get("isActive", 1)) == active]

    return paginate(seniors, limit, offset)


# ─── Get single senior ────────────────────────────────────────────────────────
@router.get("/api/senior-citizens/{sc_id}", tags=["Senior Citizens"])
@router.get("/api/seniors/{sc_id}", tags=["Senior Citizens"])
async def get_senior(sc_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        s = await get_senior_by_id(db, sc_id)
    if not s:
        return JSONResponse(status_code=404, content={"error": "Senior citizen not found"})
    return s


# ─── Register new senior ──────────────────────────────────────────────────────
@router.post("/api/senior-citizens", status_code=201, tags=["Senior Citizens"])
async def register_senior(request: Request):
    body = await request.json()
    name  = (body.get("name") or "").strip()
    phone = (body.get("phone") or "").strip()

    if not name or not phone:
        return JSONResponse(status_code=400, content={"error": "Name and phone are required."})

    age = body.get("age")
    if age is not None:
        try:
            age = int(age)
            if age < 50:
                return JSONResponse(status_code=400, content={"error": "Age must be 50 or older."})
        except (TypeError, ValueError):
            return JSONResponse(status_code=400, content={"error": "Age must be a number."})

    new_sc = {
        "name": name, "phone": phone,
        "age": age,
        "address": body.get("address") or body.get("location", "Shirva"),
        "location": body.get("location", "Shirva"),
        "preferredLanguage": body.get("preferredLanguage", "Kannada"),
        "emergencyContact": body.get("emergencyContact", ""),
        "medicalNotes": body.get("medicalNotes", ""),
        "registeredAt": _now(), "isActive": True, "totalRequestsMade": 0,
    }
    async with aiosqlite.connect(DB_PATH) as db:
        created = await add_senior_citizen(db, new_sc)
        await log_audit(db, "SENIOR_CITIZEN_REGISTERED",
                        f"New senior citizen: {name} (Age: {age or 'N/A'}, {new_sc['location']}). Phone: {phone}.",
                        "Sahayak Registration Portal")

    await broadcast(request.app, "SENIOR_REGISTERED", created)
    return created


# ─── Update senior (partial) ──────────────────────────────────────────────────
@router.put("/api/senior-citizens/{sc_id}", tags=["Senior Citizens"])
@router.patch("/api/senior-citizens/{sc_id}", tags=["Senior Citizens"])
async def update_senior(sc_id: str, request: Request):
    async with aiosqlite.connect(DB_PATH) as db:
        existing = await get_senior_by_id(db, sc_id)
        if not existing:
            return JSONResponse(status_code=404, content={"error": "Senior citizen not found"})

        body = await request.json()
        actor = body.pop("_actor", "Web Portal")

        updated = await update_senior_citizen(db, sc_id, body)
        await log_audit(db, "SENIOR_CITIZEN_UPDATED",
                        f"Senior {existing['name']} ({sc_id}) profile updated by {actor}.",
                        actor)

    await broadcast(request.app, "SENIOR_UPDATED", updated)
    return updated


# ─── Soft-delete senior ────────────────────────────────────────────────────────
@router.delete("/api/senior-citizens/{sc_id}", tags=["Senior Citizens"])
async def deactivate_senior(sc_id: str, request: Request):
    actor = (request.query_params.get("actor") or "Web Portal").strip()
    async with aiosqlite.connect(DB_PATH) as db:
        ok = await delete_senior_citizen(db, sc_id)
        if not ok:
            return JSONResponse(status_code=404, content={"error": "Senior citizen not found or already inactive."})
        senior = await get_senior_by_id(db, sc_id)
        await log_audit(db, "SENIOR_CITIZEN_DEACTIVATED",
                        f"Senior {senior['name'] if senior else sc_id} marked inactive by {actor}.",
                        actor)

    await broadcast(request.app, "SENIOR_DEACTIVATED", {"id": sc_id})
    return {"success": True, "message": f"Senior citizen {sc_id} deactivated.", "id": sc_id}


# ─── Audit logs ───────────────────────────────────────────────────────────────
@router.get("/api/audit-logs", tags=["Senior Citizens"])
async def audit_logs(
    action: Optional[str] = Query(None),
    actor:  Optional[str] = Query(None),
    limit:  Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0,   ge=0),
):
    async with aiosqlite.connect(DB_PATH) as db:
        logs = await get_audit_logs(db, action=action, actor=actor, limit=None)
    return paginate(logs, limit, offset)
