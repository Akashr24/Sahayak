"""routers/seniors.py — Senior citizens CRUD + audit logs"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
import aiosqlite

from database import (
    get_senior_citizens, get_senior_by_id,
    add_senior_citizen, get_audit_logs, log_audit,
    DB_PATH,
)

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@router.get("/api/senior-citizens")
@router.get("/api/seniors")
async def list_seniors(language: Optional[str] = Query(None)):
    async with aiosqlite.connect(DB_PATH) as db:
        return await get_senior_citizens(db, language=language)


@router.get("/api/senior-citizens/{sc_id}")
@router.get("/api/seniors/{sc_id}")
async def get_senior(sc_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        s = await get_senior_by_id(db, sc_id)
    if not s:
        return JSONResponse(status_code=404, content={"error": "Senior citizen not found"})
    return s


@router.post("/api/senior-citizens", status_code=201)
async def register_senior(request: Request):
    body = await request.json()
    name  = body.get("name")
    phone = body.get("phone")
    if not name or not phone:
        return JSONResponse(status_code=400, content={"error": "Name and Phone are required."})

    new_sc = {
        "name": name, "phone": phone,
        "age": body.get("age"),
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
                        f"New senior citizen: {name} (Age: {body.get('age', 'N/A')}, "
                        f"{new_sc['location']}). Phone: {phone}.",
                        "Sahayak Registration Portal")
    return created


# ─── Audit logs ───────────────────────────────────────────────────────────────
@router.get("/api/audit-logs")
async def audit_logs(
    action: Optional[str] = Query(None),
    actor:  Optional[str] = Query(None),
    limit:  Optional[int] = Query(None),
):
    async with aiosqlite.connect(DB_PATH) as db:
        return await get_audit_logs(db, action=action, actor=actor, limit=limit)
