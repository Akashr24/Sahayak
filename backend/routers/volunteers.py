"""routers/volunteers.py — Volunteer CRUD + login + OTP auth"""

import time
import random
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import aiosqlite

from database import (
    get_volunteers, get_volunteer_by_id, add_volunteer,
    update_volunteer_verification, update_volunteer_availability,
    log_audit, DB_PATH,
)

router = APIRouter()

# In-memory OTP cache: clean_phone → {otp, expires_at}
_otp_cache: dict[str, dict] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ─── Volunteer list & detail ───────────────────────────────────────────────────
@router.get("/api/volunteers")
async def list_volunteers(status: Optional[str] = Query(None)):
    async with aiosqlite.connect(DB_PATH) as db:
        return await get_volunteers(db, status=status)


@router.get("/api/volunteers/{vol_id}")
async def get_volunteer(vol_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        v = await get_volunteer_by_id(db, vol_id)
    if not v:
        return JSONResponse(status_code=404, content={"error": "Volunteer not found"})
    return v


# ─── Register new volunteer ────────────────────────────────────────────────────
from fastapi import Request as _Req


@router.post("/api/volunteers", status_code=201)
async def register_volunteer(request: _Req):
    body = await request.json()
    name  = body.get("name")
    phone = body.get("phone")
    if not name or not phone:
        return JSONResponse(status_code=400, content={"error": "Name and Phone required"})
    new_vol = {
        "name": name, "phone": phone,
        "organization": body.get("organization", "Citizen Volunteer"),
        "skills": body.get("skills") or ["General Community Support"],
        "location": body.get("location", "Shirva"),
        "verificationStatus": "PENDING", "isAvailable": False,
        "registeredAt": _now(),
    }
    async with aiosqlite.connect(DB_PATH) as db:
        created = await add_volunteer(db, new_vol)
        await log_audit(db, "VOLUNTEER_REGISTERED",
                        f"New volunteer: {name} ({new_vol['organization']}, {phone}). Pending clearance.",
                        "Volunteer Portal")
    return created


# ─── Verify / Reject ──────────────────────────────────────────────────────────
@router.put("/api/volunteers/{vol_id}/verify")
async def verify_volunteer(vol_id: str, request: _Req):
    body = await request.json()
    action      = body.get("action")
    officer     = body.get("officerName", "PSI Shirva Police Station")
    notes       = body.get("notes", "")

    async with aiosqlite.connect(DB_PATH) as db:
        v = await get_volunteer_by_id(db, vol_id)
        if not v:
            return JSONResponse(status_code=404, content={"error": "Volunteer not found"})

        if action == "APPROVE":
            all_vols = await get_volunteers(db)
            badge_count = sum(1 for x in all_vols if x.get("policeBadgeNo"))
            badge_no = f"SHR-VOL-{100 + badge_count + 1}"
            await update_volunteer_verification(
                db, vol_id, "VERIFIED", badge_no,
                notes or "ID and background check completed by Shirva Police.",
            )
            await log_audit(db, "VOLUNTEER_VERIFIED",
                            f"{v['name']} approved by {officer}. Badge: {badge_no}.",
                            "Shirva Police Administrator")
        elif action == "REJECT":
            await update_volunteer_verification(db, vol_id, "REJECTED", None,
                                                notes or "Application rejected.")
            await log_audit(db, "VOLUNTEER_REJECTED",
                            f"{v['name']} rejected by {officer}.",
                            "Shirva Police Administrator")
        else:
            return JSONResponse(status_code=400, content={"error": "Invalid action."})

        updated = await get_volunteer_by_id(db, vol_id)
    return updated


# ─── Availability toggle ──────────────────────────────────────────────────────
@router.put("/api/volunteers/{vol_id}/availability")
async def toggle_availability(vol_id: str, request: _Req):
    body = await request.json()
    is_available = bool(body.get("isAvailable"))
    actor = body.get("actor")

    async with aiosqlite.connect(DB_PATH) as db:
        v = await get_volunteer_by_id(db, vol_id)
        if not v:
            return JSONResponse(status_code=404, content={"error": "Volunteer not found"})
        if v["verificationStatus"] != "VERIFIED":
            return JSONResponse(status_code=400, content={"error": "Only verified volunteers can toggle availability."})

        await update_volunteer_availability(db, vol_id, is_available)
        await log_audit(db, "VOLUNTEER_AVAILABILITY_UPDATED",
                        f"{v['name']} ({v.get('policeBadgeNo', 'Verified')}) marked as "
                        f"{'AVAILABLE' if is_available else 'UNAVAILABLE'}.",
                        actor or v["name"])
        updated = await get_volunteer_by_id(db, vol_id)
    return updated


# ─── Badge / Phone login ──────────────────────────────────────────────────────
@router.post("/api/volunteers/login")
async def volunteer_login(request: _Req):
    body = await request.json()
    raw = (body.get("identifier") or body.get("phone") or body.get("badgeNo") or "").strip()
    if not raw:
        return JSONResponse(status_code=400, content={
            "error": "Please enter your registered Mobile Number or Police Badge ID."
        })

    clean_digits = "".join(c for c in raw if c.isdigit())[-10:]
    clean_badge  = raw.upper().replace(" ", "")

    async with aiosqlite.connect(DB_PATH) as db:
        volunteers = await get_volunteers(db)
        match = None
        for v in volunteers:
            badge = (v.get("policeBadgeNo") or "").upper().replace(" ", "")
            if badge and (badge == clean_badge or badge == f"SHR-VOL-{clean_badge}"):
                match = v; break
            if len(clean_digits) >= 10:
                v_digits = "".join(c for c in (v.get("phone") or "") if c.isdigit())[-10:]
                if v_digits == clean_digits:
                    match = v; break

        if not match:
            return JSONResponse(status_code=404, content={
                "error": f'No registered volunteer found matching "{raw}". '
                         "Please check the phone/badge or register below."
            })

        await log_audit(db, "VOLUNTEER_LOGIN",
                        f"{match['name']} ({match.get('policeBadgeNo', 'Pending')}) authenticated.",
                        match["name"])

    return {
        "success": True,
        "volunteer": match,
        "token": f"sahayak-vol-{match['id']}-{int(time.time() * 1000)}",
    }


# ─── Request OTP ──────────────────────────────────────────────────────────────
@router.post("/api/volunteers/request-otp")
async def request_otp(request: _Req):
    body = await request.json()
    phone = (body.get("phone") or "").strip()
    if not phone:
        return JSONResponse(status_code=400, content={"error": "Mobile number is required."})

    clean_phone = "".join(c for c in phone if c.isdigit())[-10:]
    if len(clean_phone) < 10:
        return JSONResponse(status_code=400, content={"error": "Please provide a valid 10-digit mobile number."})

    otp = str(random.randint(1000, 9999))
    _otp_cache[clean_phone] = {"otp": otp, "expires_at": time.time() + 300}

    async with aiosqlite.connect(DB_PATH) as db:
        volunteers = await get_volunteers(db)
        vol = next(
            (v for v in volunteers
             if "".join(c for c in (v.get("phone") or "") if c.isdigit())[-10:] == clean_phone),
            None,
        )
        await log_audit(db, "VOLUNTEER_OTP_SENT",
                        f"OTP SMS dispatched to +91 {clean_phone} for "
                        f"{vol['name'] if vol else 'Citizen Volunteer'}. Code: {otp}",
                        "Shirva Police Telephony Gateway")

    return {
        "success": True, "cleanPhone": clean_phone,
        "simulatedOtp": otp,
        "message": f"Verification code sent to +91 {clean_phone}",
        "isRegistered": bool(vol),
        "volunteerName": vol["name"] if vol else None,
    }


# ─── Verify OTP ───────────────────────────────────────────────────────────────
@router.post("/api/volunteers/verify-otp")
async def verify_otp(request: _Req):
    body = await request.json()
    phone = (body.get("phone") or "").strip()
    otp   = str(body.get("otp") or "").strip()

    if not phone or not otp:
        return JSONResponse(status_code=400, content={"error": "Phone number and OTP code are required."})

    clean_phone = "".join(c for c in phone if c.isdigit())[-10:]
    cached = _otp_cache.get(clean_phone)
    is_valid = (cached and cached["otp"] == otp and time.time() < cached["expires_at"]) or otp == "1234"

    if not is_valid:
        return JSONResponse(status_code=400, content={
            "error": "Invalid verification code. Please check your SMS or enter 1234 for demo."
        })

    async with aiosqlite.connect(DB_PATH) as db:
        volunteers = await get_volunteers(db)
        vol = next(
            (v for v in volunteers
             if "".join(c for c in (v.get("phone") or "") if c.isdigit())[-10:] == clean_phone),
            None,
        )
        if vol:
            await log_audit(db, "VOLUNTEER_LOGIN",
                            f"{vol['name']} ({vol.get('policeBadgeNo', 'Pending')}) logged in via SMS OTP.",
                            vol["name"])

    if not vol:
        return {
            "success": True, "registered": False,
            "phone": f"+91 {clean_phone}",
            "message": "OTP verified. Please complete your volunteer registration.",
        }

    return {
        "success": True, "registered": True,
        "volunteer": vol,
        "token": f"sahayak-vol-{vol['id']}-{int(time.time() * 1000)}",
    }
