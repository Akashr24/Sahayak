"""routers/health.py — GET /api/health, GET /api/stats"""

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/api/health")
async def health(request: Request):
    cfg = request.app.state.helpline
    return {
        "status": "online",
        "platform": "Sahayak Community Assistance Platform",
        "database": "SQLite (sahayak.db via aiosqlite)",
        "station": "Shirva Police Station (HPL 2026 PS 03)",
        "helpline": cfg,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
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
