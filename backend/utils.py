"""
utils.py — Shared helpers for all Sahayak routers.

Centralises:
  • _now()          – ISO-8601 UTC timestamp string
  • _broadcast()    – SSE fan-out to all connected dashboard clients
  • make_req_id()   – Collision-safe request ID generator
  • make_emg_id()   – Collision-safe emergency ID generator
  • paginate()      – Slice a list with offset/limit semantics
"""

import json
import uuid
from datetime import datetime, timezone


# ─── Timestamp ────────────────────────────────────────────────────────────────
def _now() -> str:
    """Return current UTC time as an ISO-8601 string ending in 'Z'."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ─── SSE broadcast ────────────────────────────────────────────────────────────
async def broadcast(app, event: str, data: dict) -> None:
    """
    Fan-out `data` as a Server-Sent Event to every connected SSE client.
    Uses put_nowait so we never block the event loop; slow / disconnected
    clients are silently skipped.
    """
    msg = {"event": event, "data": json.dumps(data)}
    dead: list = []
    for q in list(app.state.sse_clients):
        try:
            q.put_nowait(msg)
        except Exception:
            dead.append(q)
    # Remove queues that can no longer accept messages
    if dead:
        app.state.sse_clients = [c for c in app.state.sse_clients if c not in dead]


# ─── ID generators ────────────────────────────────────────────────────────────
def make_req_id() -> str:
    """Generate a collision-safe service request ID, e.g. REQ-2026-A3F9."""
    year = datetime.now().year
    suffix = uuid.uuid4().hex[:4].upper()
    return f"REQ-{year}-{suffix}"


def make_emg_id() -> str:
    """Generate a collision-safe emergency record ID, e.g. EMG-112-B7C2."""
    suffix = uuid.uuid4().hex[:4].upper()
    return f"EMG-112-{suffix}"


# ─── Pagination ───────────────────────────────────────────────────────────────
def paginate(items: list, limit: int | None, offset: int | None) -> dict:
    """
    Slice `items` with optional limit/offset and return a standard envelope:

        { "total": N, "offset": K, "limit": L, "items": [...] }
    """
    total = len(items)
    start = max(int(offset or 0), 0)
    sliced = items[start:]
    if limit is not None and int(limit) > 0:
        sliced = sliced[: int(limit)]
    return {
        "total": total,
        "offset": start,
        "limit": int(limit) if limit is not None else None,
        "items": sliced,
    }
