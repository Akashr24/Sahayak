"""routers/health.py — GET /api/health, GET /api/stats"""

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
@router.get("/api/health")
async def health(request: Request):
    from datetime import datetime, timezone
    cfg = request.app.state.helpline
    return {
        "status": "online",
        "platform": "Sahayak Community Assistance Platform",
        "database": "SQLite (sahayak.db via aiosqlite)",
        "station": "Shirva Police Station (HPL 2026 PS 03)",
        "helpline": cfg,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


@router.get("/api/stats")
async def stats(request: Request):
    from database import get_volunteers, get_senior_citizens, get_requests, get_emergency_records, DB_PATH
    import aiosqlite

    async with aiosqlite.connect(DB_PATH) as db:
        volunteers       = await get_volunteers(db)
        senior_citizens  = await get_senior_citizens(db)
        requests         = await get_requests(db)

    verified    = [v for v in volunteers if v["verificationStatus"] == "VERIFIED"]
    pending     = [v for v in volunteers if v["verificationStatus"] == "PENDING"]
    active_reqs = [r for r in requests if r["status"] in ("PENDING", "ASSIGNED", "IN_PROGRESS")]
    emg112      = [r for r in requests if r.get("escalatedTo112")]
    resolved    = [r for r in requests if r["status"] == "RESOLVED"]

    return {
        "totalVolunteers":          len(volunteers),
        "verifiedVolunteersCount":  len(verified),
        "pendingVolunteersCount":   len(pending),
        "activeRequestsCount":      len(active_reqs),
        "emergency112Count":        len(emg112),
        "resolvedRequestsCount":    len(resolved),
        "seniorCitizensCount":      len(senior_citizens),
        "helpline":                 request.app.state.helpline,
        "currentCall":              request.app.state.current_call,
        "locations":                request.app.state.shirva_locations,
    }


@router.post("/api/police/login")
async def police_login(request: Request):
    from fastapi.responses import JSONResponse
    body = await request.json()
    badge_no = (body.get("badgeNo") or body.get("username") or "").strip()
    pin = (body.get("pin") or body.get("password") or "").strip()

    valid_pins = {"112", "112112", "shirvapolice", "police123", "admin"}
    if not badge_no or not pin or pin.lower() not in valid_pins:
        return JSONResponse(status_code=401, content={
            "success": False,
            "error": "Invalid Police Credentials. Authorized Karnataka Police Officers only."
        })

    officer = {
        "name": "Sub-Inspector K. Santhosh",
        "badgeNo": badge_no.upper() if badge_no else "SHR-PSI-01",
        "rank": "Police Sub-Inspector (PSI)",
        "station": "Shirva Police Station",
        "district": "Udupi District, Karnataka",
        "loginTime": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }
    return {"success": True, "officer": officer}
