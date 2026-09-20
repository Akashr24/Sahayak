"""
maps.py — Sahayak Geocoding & Routing helpers (Python/httpx)
Equivalent of the former maps.js

Uses:
  - OpenStreetMap Nominatim for geocoding (free, no API key)
  - OSRM for driving distance / ETA (free, no API key)
"""

import asyncio
import time
from typing import Optional

import httpx

USER_AGENT = "SahayakShirvaPolice/1.0 (Community Senior Citizen Assistance Platform)"

#  In-memory caches 
_geocode_cache: dict[str, dict] = {}
_route_cache:   dict[str, dict] = {}

#  Preloaded Shirva landmarks (instant 0ms lookup, no network) 
_PRELOADED = [
    ("near our lady of health church, shirva",  13.2421, 74.8360),
    ("our lady of health church, shirva",       13.2421, 74.8360),
    ("our lady of health church",               13.2421, 74.8360),
    ("manchakal junction, shirva",              13.2389, 74.8322),
    ("manchakal junction",                      13.2389, 74.8322),
    ("mattar cross road, shirva",               13.2280, 74.8450),
    ("mattar cross road",                       13.2280, 74.8450),
    ("mattar village",                          13.2280, 74.8450),
    ("bantakal bus stand (near smvitm)",        13.2185, 74.8512),
    ("near smvitm bantakal",                    13.2185, 74.8512),
    ("smvitm bantakal",                         13.2185, 74.8512),
    ("shirva market & bus stand",               13.2405, 74.8341),
    ("shirva market road",                      13.2405, 74.8341),
    ("paniyadi temple road, shirva",            13.2450, 74.8290),
    ("paniyadi temple road",                    13.2450, 74.8290),
    ("manchakal auto stand",                    13.2385, 74.8325),
    ("shirva police station",                   13.2395, 74.8335),
    ("primary health centre, shirva",           13.2415, 74.8350),
    ("phc shirva",                              13.2415, 74.8350),
]

for _key, _lat, _lng in _PRELOADED:
    _geocode_cache[_key] = {"lat": _lat, "lng": _lng, "displayName": _key}

#  Nominatim rate limiter (max 1 req/sec) 
_last_nominatim_call: float = 0.0
_nominatim_lock = asyncio.Lock()


async def _throttle_nominatim() -> None:
    global _last_nominatim_call
    async with _nominatim_lock:
        elapsed = time.monotonic() - _last_nominatim_call
        if elapsed < 1.1:
            await asyncio.sleep(1.1 - elapsed)
        _last_nominatim_call = time.monotonic()


#  Public API 
async def geocode_address(address: Optional[str]) -> Optional[dict]:
    """
    Geocode a string address → {"lat": float, "lng": float, "displayName": str}
    Returns None on failure.
    """
    if not address or not isinstance(address, str):
        return None

    key = address.strip().lower()

    # Exact cache hit
    if key in _geocode_cache:
        return _geocode_cache[key]

    # Substring match against preloaded landmarks
    for cached_key, val in _geocode_cache.items():
        if key in cached_key or cached_key in key:
            _geocode_cache[key] = val
            return val

    # Live Nominatim lookup
    try:
        await _throttle_nominatim()
        query = f"{address}, Shirva, Udupi, Karnataka, India"
        params = {"q": query, "format": "json", "limit": "1", "addressdetails": "1"}
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )

        if resp.status_code == 200:
            results = resp.json()
            if results:
                r = {
                    "lat": float(results[0]["lat"]),
                    "lng": float(results[0]["lon"]),
                    "displayName": results[0].get("display_name", address),
                }
                _geocode_cache[key] = r
                print(f"[Maps]  Geocoded '{address}' → {r['lat']}, {r['lng']}")
                return r

        # Broader fallback query
        await _throttle_nominatim()
        broad_params = {"q": f"{address}, Karnataka, India", "format": "json", "limit": "1"}
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp2 = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=broad_params,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )
        if resp2.status_code == 200:
            results2 = resp2.json()
            if results2:
                r2 = {
                    "lat": float(results2[0]["lat"]),
                    "lng": float(results2[0]["lon"]),
                    "displayName": results2[0].get("display_name", address),
                }
                _geocode_cache[key] = r2
                print(f"[Maps]  Geocoded (broad) '{address}' → {r2['lat']}, {r2['lng']}")
                return r2

        print(f"[Maps] ️ Could not geocode '{address}'")
        return None
    except Exception as e:
        print(f"[Maps]  Geocoding error for '{address}': {e}")
        return None


async def get_route_distance(origin_lat: float, origin_lng: float,
                              dest_lat: float, dest_lng: float) -> Optional[dict]:
    """
    Get driving distance & ETA using OSRM.
    Returns {"distanceKm": float, "etaMinutes": int, "distanceText": str, "durationText": str}
    """
    if not all([origin_lat, origin_lng, dest_lat, dest_lng]):
        return None

    cache_key = f"{origin_lat:.4f},{origin_lng:.4f}-{dest_lat:.4f},{dest_lng:.4f}"
    if cache_key in _route_cache:
        return _route_cache[cache_key]

    try:
        url = (
            f"https://router.project-osrm.org/route/v1/driving/"
            f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}?overview=false"
        )
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url, headers={"User-Agent": USER_AGENT})

        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                distance_km = round(route["distance"] / 1000, 1)
                eta_minutes = max(1, round(route["duration"] / 60))
                h, m = divmod(eta_minutes, 60)
                result = {
                    "distanceKm": distance_km,
                    "etaMinutes": eta_minutes,
                    "distanceText": f"{distance_km} km",
                    "durationText": f"{h}h {m}m" if h else f"{eta_minutes} min",
                }
                _route_cache[cache_key] = result
                print(f"[Maps]  Route: {distance_km} km, {eta_minutes} min")
                return result

        print("[Maps] ️ OSRM returned no routes")
        return None
    except Exception as e:
        print(f"[Maps]  OSRM routing error: {e}")
        return None


def clear_map_caches() -> None:
    _geocode_cache.clear()
    _route_cache.clear()
    print("[Maps] Caches cleared")
