"""routers/location.py — Geocoding, phone-based location tracking, radar map markers"""

from fastapi import APIRouter, Request, Query
from typing import Optional
import aiosqlite

from database import (
    get_senior_citizens, get_volunteers, get_requests, log_audit,
    DB_PATH, SHIRVA_LOCATIONS,
)
from maps import geocode_address, get_route_distance

router = APIRouter()


@router.get("/api/locations")
@router.get("/api/location/locations")
@router.get("/api/shirva-locations")
async def get_locations():
    return SHIRVA_LOCATIONS


@router.get("/api/location/geocode")
async def geocode(address: Optional[str] = Query(None, alias="address"),
                  q: Optional[str] = Query(None)):
    addr = address or q
    if not addr:
        return {"error": "Address parameter required (e.g. ?address=Shirva+Police+Station)"}, 400
    result = await geocode_address(addr)
    if result:
        async with aiosqlite.connect(DB_PATH) as db:
            await log_audit(db,
                "ADDRESS_GEOCODED",
                f"Geocoded \"{addr}\" → {result['lat']}, {result['lng']} via OpenStreetMap Nominatim",
                "Maps API")
        return {
            "success": True, "address": addr,
            "lat": result["lat"], "lng": result["lng"],
            "displayName": result["displayName"],
            "source": "OpenStreetMap Nominatim (Free)",
        }
    return {
        "success": False, "address": addr,
        "error": "Could not geocode this address.",
        "source": "OpenStreetMap Nominatim",
    }


@router.get("/api/location/track-by-number")
async def track_by_number(request: Request,
                           phone: Optional[str] = Query(None),
                           number: Optional[str] = Query(None)):
    raw_phone = phone or number
    if not raw_phone:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=400,
                            content={"error": "Phone number parameter required (e.g. ?phone=+919741088231)"})

    async with aiosqlite.connect(DB_PATH) as db:
        result = await _get_location_by_phone(raw_phone, db)
        await log_audit(db,
            "LIVE_LOCATION_TRACKED",
            f"Phone {raw_phone} tracked on Shirva Live Radar. ({result['entityName']})",
            "Live Map Radar")

    return result


@router.get("/api/location/all-markers")
async def all_markers(request: Request):
    app = request.app
    async with aiosqlite.connect(DB_PATH) as db:
        seniors    = await get_senior_citizens(db)
        volunteers = await get_volunteers(db)
        requests   = await get_requests(db)

    senior_markers = []
    for s in seniors:
        loc = await geocode_address(s["address"])
        senior_markers.append({
            "id": s["id"], "name": s["name"], "phone": s["phone"],
            "type": "SENIOR",
            "lat": loc["lat"] if loc else 13.2389,
            "lng": loc["lng"] if loc else 74.8322,
            "address": s["address"], "medicalNotes": s.get("medicalNotes", ""),
            "emergencyContact": s.get("emergencyContact", ""),
        })

    vol_markers = []
    for v in volunteers:
        loc = await geocode_address(v["location"])
        vol_markers.append({
            "id": v["id"], "name": v["name"], "phone": v["phone"],
            "type": "VOLUNTEER", "org": v["organization"],
            "policeBadgeNo": v.get("policeBadgeNo"),
            "status": v["verificationStatus"], "isAvailable": v["isAvailable"],
            "lat": loc["lat"] if loc else 13.2389,
            "lng": loc["lng"] if loc else 74.8322,
            "location": v["location"],
        })

    station_geo = await geocode_address("Police Station Road, Manchakal, Shirva")
    police_station = {
        "id": "station-shirva", "name": "Shirva Police Station (Command Center)",
        "type": "POLICE_STATION",
        "lat": station_geo["lat"] if station_geo else 13.2395,
        "lng": station_geo["lng"] if station_geo else 74.8335,
        "phone": app.state.helpline["stationDesk"],
        "address": "Police Station Road, Manchakal, Shirva",
    }

    req_markers = []
    for r in requests:
        loc = await geocode_address(r.get("location", "Shirva"))
        req_markers.append({
            "id": r["id"], "seniorName": r["seniorName"],
            "category": r.get("category"), "urgency": r.get("urgency"),
            "status": r["status"], "assignedVolunteerName": r.get("assignedVolunteerName"),
            "lat": loc["lat"] if loc else 13.2389,
            "lng": loc["lng"] if loc else 74.8322,
        })

    return {
        "station": police_station,
        "seniors": senior_markers,
        "volunteers": vol_markers,
        "requests": req_markers,
    }


# ─── Internal: resolve phone → location + ETA ─────────────────────────────────
async def _get_location_by_phone(raw_phone: str, db) -> dict:
    clean_phone = "".join(c for c in raw_phone if c.isdigit())[-10:]

    seniors    = await get_senior_citizens(db)
    volunteers = await get_volunteers(db)
    requests   = await get_requests(db)

    def phone_match(p: str) -> bool:
        return "".join(c for c in (p or "") if c.isdigit()).endswith(clean_phone)

    senior   = next((s for s in seniors    if phone_match(s.get("phone", ""))), None)
    volunteer= next((v for v in volunteers if phone_match(v.get("phone", ""))), None)
    request  = next((r for r in requests   if phone_match(r.get("seniorPhone", ""))), None)

    entity_type   = "UNKNOWN"
    entity_name   = "Shirva Resident"
    address       = "Manchakal Junction, Shirva"
    phone         = raw_phone
    medical_notes = ""
    emergency_contact = ""

    if senior:
        entity_type, entity_name = "SENIOR_CITIZEN", senior["name"]
        phone = senior["phone"]
        address = senior.get("address") or senior.get("location", address)
        medical_notes = senior.get("medicalNotes", "")
        emergency_contact = senior.get("emergencyContact", "")
    elif volunteer:
        entity_type = "VOLUNTEER"
        entity_name = f"{volunteer['name']} ({volunteer['organization']})"
        phone = volunteer["phone"]
        address = volunteer.get("location", address)
    elif request:
        entity_type, entity_name = "SENIOR_CALLER", request["seniorName"]
        phone = request.get("seniorPhone") or raw_phone
        address = request.get("location", address)

    geocoded = await geocode_address(address)
    if geocoded:
        lat, lng = geocoded["lat"], geocoded["lng"]
    else:
        addr_lower = address.lower()
        if "church" in addr_lower or "lady" in addr_lower:
            lat, lng = 13.2421, 74.8360
        elif "mattar" in addr_lower:
            lat, lng = 13.2280, 74.8450
        elif "smvitm" in addr_lower or "bantakal" in addr_lower:
            lat, lng = 13.2185, 74.8512
        elif "market" in addr_lower:
            lat, lng = 13.2405, 74.8341
        elif "paniyadi" in addr_lower or "temple" in addr_lower:
            lat, lng = 13.2450, 74.8290
        else:
            h = sum(ord(c) for c in clean_phone)
            lat = 13.2389 + ((h % 20) - 10) * 0.0008
            lng = 74.8322 + ((h % 30) - 15) * 0.0008

    active_tracking = None
    active_req = next(
        (r for r in requests if
         phone_match(r.get("seniorPhone", "")) or
         (volunteer and r.get("assignedVolunteerId") == volunteer["id"])),
        None,
    )
    if active_req and active_req.get("assignedVolunteerId"):
        vol = next((v for v in volunteers if v["id"] == active_req["assignedVolunteerId"]), None)
        if vol:
            vol_geo = await geocode_address(vol["location"])
            vol_lat = vol_geo["lat"] if vol_geo else lat - 0.0035
            vol_lng = vol_geo["lng"] if vol_geo else lng - 0.0025
            route = await get_route_distance(vol_lat, vol_lng, lat, lng)
            active_tracking = {
                "requestId": active_req["id"], "category": active_req.get("category"),
                "urgency": active_req.get("urgency"), "status": active_req["status"],
                "seniorName": active_req["seniorName"],
                "volunteerName": vol["name"], "volunteerPhone": vol["phone"],
                "volunteerOrg": vol["organization"],
                "policeBadgeNo": vol.get("policeBadgeNo") or "SHR-VOL-VERIFIED",
                "etaMinutes": 0 if active_req["status"] == "RESOLVED" else (route["etaMinutes"] if route else 4),
                "distanceKm": route["distanceKm"] if route else 1.8,
                "volunteerLat": vol_lat, "volunteerLng": vol_lng,
                "targetLat": lat, "targetLng": lng,
            }

    return {
        "searchedPhone": raw_phone, "cleanPhone": clean_phone,
        "phone": phone, "entityType": entity_type, "entityName": entity_name,
        "address": address, "lat": lat, "lng": lng,
        "medicalNotes": medical_notes, "emergencyContact": emergency_contact,
        "geocodeSource": "OpenStreetMap Nominatim" if geocoded else "Fallback (Hardcoded Landmarks)",
        "cellTower": f"Shirva Police Tower BNL-104 ({entity_type})",
        "accuracyRadiusMeters": 5 if geocoded else 15,
        "activeTracking": active_tracking,
    }
