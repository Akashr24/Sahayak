"""
database.py — Sahayak SQLite async database layer (Python/aiosqlite)
Equivalent of the former db.js (better-sqlite3)

All 6 tables:
  senior_citizens, volunteers, requests,
  emergency_records, audit_logs, shirva_locations
"""

import json
import os
import uuid
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiosqlite

# ─── Path resolution ──────────────────────────────────────────────────────────
_HERE = Path(__file__).parent
_DEFAULT_DB = _HERE / ".." / "database" / "sahayak.db"
_LOCAL_BACKEND_DB = _HERE / "sahayak.db"

if os.environ.get("VERCEL"):
    # In Vercel serverless environments, only /tmp is writable
    DB_PATH = os.environ.get("DB_PATH") or "/tmp/sahayak.db"
elif os.environ.get("DB_PATH"):
    DB_PATH = os.environ.get("DB_PATH")
elif _LOCAL_BACKEND_DB.exists():
    DB_PATH = str(_LOCAL_BACKEND_DB.resolve())
else:
    DB_PATH = str(_DEFAULT_DB.resolve())

# ─── Shirva landmark constants ────────────────────────────────────────────────
SHIRVA_LOCATIONS = [
    {"id": "loc-1", "name": "Manchakal Junction, Shirva",            "lat": 13.2389, "lng": 74.8322},
    {"id": "loc-2", "name": "Near Our Lady of Health Church, Shirva", "lat": 13.2421, "lng": 74.8360},
    {"id": "loc-3", "name": "Mattar Cross Road, Shirva",              "lat": 13.2280, "lng": 74.8450},
    {"id": "loc-4", "name": "Bantakal Bus Stand (near SMVITM)",       "lat": 13.2185, "lng": 74.8512},
    {"id": "loc-5", "name": "Shirva Market & Bus Stand",              "lat": 13.2405, "lng": 74.8341},
    {"id": "loc-6", "name": "Paniyadi Temple Road, Shirva",           "lat": 13.2450, "lng": 74.8290},
]

EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "cardiac", "unconscious", "breathing problem",
    "fainted", "bleeding", "accident", "fire", "thief", "robbery", "attacked",
    "choking", "stroke", "emergency",
    "ede novu", "ede novide", "raktasrava", "apaghatha", "benki", "kalla",
    "kallaru", "swasa kattide", "biddubitte", "thale suthu", "maranantika",
    "kondoyiri", "hospital beku", "ambulance",
]

# ─── Schema & Seed SQL ────────────────────────────────────────────────────────
_INIT_SQL = """
CREATE TABLE IF NOT EXISTS shirva_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

INSERT OR IGNORE INTO shirva_locations (id, name, latitude, longitude) VALUES
('loc-1', 'Manchakal Junction, Shirva', 13.2389, 74.8322),
('loc-2', 'Near Our Lady of Health Church, Shirva', 13.2421, 74.8360),
('loc-3', 'Mattar Cross Road, Shirva', 13.2280, 74.8450),
('loc-4', 'Bantakal Bus Stand (near SMVITM)', 13.2185, 74.8512),
('loc-5', 'Shirva Market & Bus Stand', 13.2405, 74.8341),
('loc-6', 'Paniyadi Temple Road, Shirva', 13.2450, 74.8290);

CREATE TABLE IF NOT EXISTS senior_citizens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 50),
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    location TEXT NOT NULL,
    preferredLanguage TEXT NOT NULL DEFAULT 'Kannada',
    emergencyContact TEXT NOT NULL,
    medicalNotes TEXT,
    registeredAt TEXT NOT NULL,
    isActive INTEGER NOT NULL DEFAULT 1,
    totalRequestsMade INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO senior_citizens
    (id, name, age, phone, address, location, preferredLanguage, emergencyContact, medicalNotes, registeredAt, isActive, totalRequestsMade)
VALUES
('sc-001', 'Saraswathi Amma', 74, '+91 97410 88231',
 'Near Our Lady of Health Church, Shirva', 'Near Our Lady of Health Church, Shirva',
 'Kannada', 'Son: Ravi Kamath (+91 98440 12345)',
 'Hypertension, Diabetes Type 2. Regular BP & insulin medication needed.',
 '2026-08-15T09:00:00Z', 1, 3),
('sc-002', 'Benedict D''Souza', 81, '+91 94491 55672',
 'Manchakal Junction, Shirva', 'Manchakal Junction, Shirva',
 'English', 'Daughter: Maria D''Souza (+91 98002 67890)',
 'Arthritis, limited mobility. Requires transport escort to PHC.',
 '2026-08-20T11:30:00Z', 1, 2),
('sc-003', 'Kamala Bai Nayak', 68, '+91 96110 34892',
 'Paniyadi Temple Road, Shirva', 'Paniyadi Temple Road, Shirva',
 'Tulu', 'Nephew: Suresh Nayak (+91 94483 22110)',
 'Lives alone. No major medical conditions. Needs grocery & ration help.',
 '2026-09-01T08:00:00Z', 1, 1);

CREATE TABLE IF NOT EXISTS volunteers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    organization TEXT NOT NULL,
    skills TEXT NOT NULL,
    location TEXT NOT NULL,
    verificationStatus TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (verificationStatus IN ('PENDING', 'VERIFIED', 'REJECTED')),
    policeBadgeNo TEXT,
    registeredAt TEXT NOT NULL,
    activeRequestsCount INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 5.0,
    isAvailable INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

INSERT OR IGNORE INTO volunteers
    (id, name, phone, organization, skills, location, verificationStatus,
     policeBadgeNo, registeredAt, activeRequestsCount, rating, isAvailable, notes)
VALUES
('vol-001', 'Ramesh Acharya', '+91 98451 22340', 'Lions Club of Shirva',
 '["First Aid Certified", "Vehicle Available", "Medicine Purchase"]',
 'Shirva Market Road', 'VERIFIED', 'SHR-VOL-101', '2026-09-01T10:00:00Z', 1, 4.9, 1,
 'Background verified by PSI Shirva. ID proofs validated.'),
('vol-002', 'Deepa Shetty', '+91 98860 91823', 'Leo Club Bantakal',
 '["Elderly Care", "Kannada & Tulu Fluent", "Grocery Logistics"]',
 'Near SMVITM Bantakal', 'VERIFIED', 'SHR-VOL-102', '2026-09-03T14:30:00Z', 0, 4.8, 1,
 'Verified via Leo Club president recommendation & Aadhaar.'),
('vol-003', 'Pradeep Kumar Nayak', '+91 94480 34112', 'Local Auto Driver Union & Red Cross',
 '["Emergency Transport", "Auto-Rickshaw 24/7", "Oxygen cylinder transport"]',
 'Manchakal Auto Stand', 'VERIFIED', 'SHR-VOL-103', '2026-09-05T09:15:00Z', 0, 5.0, 1,
 'Police verification cleared with 15+ years safe local driving history.'),
('vol-004', 'Vikram Poojary', '+91 87620 44519', 'Independent Resident Volunteer',
 '["General Chores", "Bike Transport"]',
 'Mattar Village', 'PENDING', NULL, '2026-09-06T12:00:00Z', 0, 0.0, 0,
 'New submission pending background check and photo ID verification at station.');

CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    seniorName TEXT NOT NULL,
    seniorPhone TEXT,
    location TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'Kannada',
    category TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (urgency IN ('CRITICAL_112', 'HIGH', 'MEDIUM', 'ROUTINE')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED_112')),
    assignedVolunteerId TEXT,
    assignedVolunteerName TEXT,
    createdAt TEXT NOT NULL,
    resolvedAt TEXT,
    escalatedTo112 INTEGER NOT NULL DEFAULT 0,
    audioNotes TEXT,
    FOREIGN KEY (assignedVolunteerId) REFERENCES volunteers (id)
);

INSERT OR IGNORE INTO requests
    (id, seniorName, seniorPhone, location, language, category, urgency,
     description, status, assignedVolunteerId, assignedVolunteerName,
     createdAt, resolvedAt, escalatedTo112, audioNotes)
VALUES
('REQ-2026-089', 'Saraswathi Amma (Age 74)', '+91 97410 88231',
 'Near Our Lady of Health Church, Shirva', 'Kannada', 'Medicines / Pharmacy', 'HIGH',
 'Need urgent blood pressure tablet (Amlodipine 5mg) & Insulin from Shirva Medicals delivered to home.',
 'IN_PROGRESS', 'vol-001', 'Ramesh Acharya', '2026-09-15T10:00:00Z', NULL, 0,
 'Caller sounded anxious, requesting morning dose.'),
('REQ-2026-088', 'Benedict D''Souza (Age 81)', '+91 94491 55672',
 'Manchakal Junction, Shirva', 'English', 'Auto-Rickshaw / Transport', 'MEDIUM',
 'Needs an auto to visit Primary Health Centre (PHC) Shirva for routine doctor checkup.',
 'RESOLVED', 'vol-003', 'Pradeep Kumar Nayak', '2026-09-15T09:00:00Z',
 '2026-09-15T10:00:00Z', 0, 'Completed smoothly by auto volunteer.');

CREATE TABLE IF NOT EXISTS emergency_records (
    id TEXT PRIMARY KEY,
    requestId TEXT NOT NULL,
    seniorName TEXT NOT NULL,
    location TEXT NOT NULL,
    reason TEXT NOT NULL,
    callerPhone TEXT,
    escalatedAt TEXT NOT NULL,
    escalatedBy TEXT NOT NULL DEFAULT 'System',
    erss112RefNo TEXT,
    policeStation TEXT NOT NULL DEFAULT 'Shirva PS',
    status TEXT NOT NULL DEFAULT 'DISPATCHED'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT NOT NULL,
    targetEntityId TEXT
);

INSERT OR IGNORE INTO audit_logs (id, timestamp, action, actor, details, targetEntityId) VALUES
('log-1', '2026-09-15T09:00:00Z', 'REQUEST_CREATED', 'System AI Voice IVR',
 'Voice call received from Benedict D''Souza (Manchakal). Categorized as Transport.', 'REQ-2026-088'),
('log-2', '2026-09-15T09:10:00Z', 'VOLUNTEER_ASSIGNED', 'Dispatcher Engine',
 'Assigned Pradeep Kumar Nayak (Auto Union & Red Cross) to REQ-2026-088.', 'REQ-2026-088'),
('log-3', '2026-09-15T10:00:00Z', 'REQUEST_RESOLVED', 'Volunteer Pradeep Kumar Nayak',
 'REQ-2026-088 marked completed. Safe transport to PHC Shirva fulfilled.', 'REQ-2026-088'),
('log-4', '2026-09-15T10:35:00Z', 'REQUEST_CREATED', 'System AI Voice IVR',
 'Voice call received from Saraswathi Amma. Categorized as Medicines (High Priority).', 'REQ-2026-089'),
('log-5', '2026-09-15T10:38:00Z', 'VOLUNTEER_ASSIGNED', 'Dispatcher Engine',
 'Assigned Ramesh Acharya (Lions Club) to REQ-2026-089.', 'REQ-2026-089');
"""


# ─── DB Init ──────────────────────────────────────────────────────────────────
async def init_db() -> None:
    db_file = Path(DB_PATH)
    db_file.parent.mkdir(parents=True, exist_ok=True)

    # If running on Vercel and /tmp/sahayak.db doesn't exist yet, copy from bundled sahayak.db if present
    if os.environ.get("VERCEL") and not db_file.exists():
        bundled_seed = _HERE / "sahayak.db"
        if bundled_seed.exists():
            import shutil
            try:
                shutil.copyfile(str(bundled_seed), DB_PATH)
            except Exception as e:
                print(f"[DB] Notice: could not copy bundled seed: {e}")

    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_INIT_SQL)
        await db.commit()
    print(f"[DB] SQLite database initialised: {DB_PATH}")


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _parse_skills(value) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return [s.strip() for s in value.split(",") if s.strip()]
    return []


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _short_id() -> str:
    return str(int(datetime.now().timestamp() * 1000))[-4:]


# ─── Read helpers ─────────────────────────────────────────────────────────────
async def get_volunteers(db: aiosqlite.Connection, status: Optional[str] = None) -> list:
    q = "SELECT * FROM volunteers"
    params: tuple = ()
    if status:
        q += " WHERE verificationStatus = ?"
        params = (status,)
    q += " ORDER BY registeredAt DESC"
    async with db.execute(q, params) as cur:
        cols = [d[0] for d in cur.description]
        rows = await cur.fetchall()
    result = []
    for row in rows:
        r = dict(zip(cols, row))
        r["skills"] = _parse_skills(r.get("skills", "[]"))
        r["isAvailable"] = bool(r.get("isAvailable", 0))
        result.append(r)
    return result


async def get_senior_citizens(db: aiosqlite.Connection, language: Optional[str] = None) -> list:
    q = "SELECT * FROM senior_citizens"
    params: tuple = ()
    if language:
        q += " WHERE lower(preferredLanguage) = lower(?)"
        params = (language,)
    q += " ORDER BY registeredAt DESC"
    async with db.execute(q, params) as cur:
        cols = [d[0] for d in cur.description]
        rows = await cur.fetchall()
    return [dict(zip(cols, row)) | {"isActive": bool(dict(zip(cols, row)).get("isActive", 1))} for row in rows]


async def get_requests(db: aiosqlite.Connection, status: Optional[str] = None, urgency: Optional[str] = None) -> list:
    q = "SELECT * FROM requests WHERE 1=1"
    params: list = []
    if status:
        q += " AND status = ?"
        params.append(status)
    if urgency:
        q += " AND urgency = ?"
        params.append(urgency)
    q += " ORDER BY createdAt DESC"
    async with db.execute(q, params) as cur:
        cols = [d[0] for d in cur.description]
        rows = await cur.fetchall()
    return [dict(zip(cols, row)) | {"escalatedTo112": bool(dict(zip(cols, row)).get("escalatedTo112", 0))} for row in rows]


async def get_emergency_records(db: aiosqlite.Connection) -> list:
    async with db.execute("SELECT * FROM emergency_records ORDER BY escalatedAt DESC") as cur:
        cols = [d[0] for d in cur.description]
        rows = await cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


async def get_audit_logs(db: aiosqlite.Connection,
                         action: Optional[str] = None,
                         actor: Optional[str] = None,
                         limit: Optional[int] = None) -> list:
    q = "SELECT * FROM audit_logs WHERE 1=1"
    params: list = []
    if action:
        q += " AND lower(action) LIKE lower(?)"
        params.append(f"%{action}%")
    if actor:
        q += " AND lower(actor) LIKE lower(?)"
        params.append(f"%{actor}%")
    q += " ORDER BY timestamp DESC"
    if limit:
        q += f" LIMIT {int(limit)}"
    async with db.execute(q, params) as cur:
        cols = [d[0] for d in cur.description]
        rows = await cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


async def get_volunteer_by_id(db: aiosqlite.Connection, vol_id: str) -> Optional[dict]:
    async with db.execute("SELECT * FROM volunteers WHERE id = ?", (vol_id,)) as cur:
        cols = [d[0] for d in cur.description]
        row = await cur.fetchone()
    if not row:
        return None
    r = dict(zip(cols, row))
    r["skills"] = _parse_skills(r.get("skills", "[]"))
    r["isAvailable"] = bool(r.get("isAvailable", 0))
    return r


async def get_senior_by_id(db: aiosqlite.Connection, sc_id: str) -> Optional[dict]:
    async with db.execute("SELECT * FROM senior_citizens WHERE id = ?", (sc_id,)) as cur:
        cols = [d[0] for d in cur.description]
        row = await cur.fetchone()
    if not row:
        return None
    return dict(zip(cols, row))


async def get_request_by_id(db: aiosqlite.Connection, req_id: str) -> Optional[dict]:
    async with db.execute("SELECT * FROM requests WHERE id = ?", (req_id,)) as cur:
        cols = [d[0] for d in cur.description]
        row = await cur.fetchone()
    if not row:
        return None
    r = dict(zip(cols, row))
    r["escalatedTo112"] = bool(r.get("escalatedTo112", 0))
    return r


# ─── Write helpers ────────────────────────────────────────────────────────────
async def add_volunteer(db: aiosqlite.Connection, v: dict) -> dict:
    vid = v.get("id") or f"vol-{_short_id()}"
    await db.execute(
        """INSERT INTO volunteers
           (id, name, phone, organization, skills, location, verificationStatus,
            policeBadgeNo, registeredAt, activeRequestsCount, rating, isAvailable, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            vid, v["name"], v["phone"], v.get("organization", "Citizen Volunteer"),
            json.dumps(v.get("skills", [])), v.get("location", "Shirva"),
            v.get("verificationStatus", "PENDING"), v.get("policeBadgeNo"),
            v.get("registeredAt", _now()),
            v.get("activeRequestsCount", 0), v.get("rating", 5.0),
            1 if v.get("isAvailable") else 0,
            v.get("notes", "Awaiting police station verification check."),
        ),
    )
    await db.commit()
    return await get_volunteer_by_id(db, vid)


async def update_volunteer_verification(db: aiosqlite.Connection, vol_id: str,
                                         status: str, badge: Optional[str], notes: str) -> None:
    await db.execute(
        """UPDATE volunteers
           SET verificationStatus = ?, policeBadgeNo = ?, notes = ?,
               isAvailable = CASE WHEN ? = 'VERIFIED' THEN 1 ELSE 0 END
           WHERE id = ?""",
        (status, badge, notes or "", status, vol_id),
    )
    await db.commit()


async def update_volunteer_availability(db: aiosqlite.Connection, vol_id: str, is_available: bool) -> None:
    await db.execute("UPDATE volunteers SET isAvailable = ? WHERE id = ?", (1 if is_available else 0, vol_id))
    await db.commit()


async def add_senior_citizen(db: aiosqlite.Connection, sc: dict) -> dict:
    sc_id = sc.get("id") or f"sc-{_short_id()}"
    await db.execute(
        """INSERT INTO senior_citizens
           (id, name, age, phone, address, location, preferredLanguage,
            emergencyContact, medicalNotes, registeredAt, isActive, totalRequestsMade)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            sc_id, sc["name"], sc.get("age"), sc["phone"],
            sc.get("address", sc.get("location", "Shirva")), sc.get("location", "Shirva"),
            sc.get("preferredLanguage", "Kannada"), sc.get("emergencyContact", ""),
            sc.get("medicalNotes", ""), sc.get("registeredAt", _now()),
            1 if sc.get("isActive", True) else 0,
            sc.get("totalRequestsMade", 0),
        ),
    )
    await db.commit()
    return await get_senior_by_id(db, sc_id)


async def add_request(db: aiosqlite.Connection, r: dict) -> dict:
    rid = r.get("id") or f"REQ-{datetime.now().year}-{random.randint(100, 999)}"
    await db.execute(
        """INSERT INTO requests
           (id, seniorName, seniorPhone, location, language, category, urgency,
            description, status, assignedVolunteerId, assignedVolunteerName,
            createdAt, resolvedAt, escalatedTo112, audioNotes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            rid, r["seniorName"], r.get("seniorPhone"), r.get("location", "Shirva"),
            r.get("language", "Kannada"), r.get("category", "General Assistance"),
            r.get("urgency", "MEDIUM"), r["description"],
            r.get("status", "PENDING"),
            r.get("assignedVolunteerId"), r.get("assignedVolunteerName"),
            r.get("createdAt", _now()), r.get("resolvedAt"),
            1 if r.get("escalatedTo112") else 0,
            r.get("audioNotes"),
        ),
    )
    await db.commit()
    return await get_request_by_id(db, rid)


async def update_request_assign(db: aiosqlite.Connection, req_id: str, vol_id: str, vol_name: str) -> None:
    await db.execute(
        "UPDATE requests SET status='ASSIGNED', assignedVolunteerId=?, assignedVolunteerName=? WHERE id=?",
        (vol_id, vol_name, req_id),
    )
    await db.execute(
        "UPDATE volunteers SET activeRequestsCount = activeRequestsCount + 1 WHERE id = ?", (vol_id,)
    )
    await db.commit()


async def update_request_status(db: aiosqlite.Connection, req_id: str, status: str) -> None:
    resolved_at = _now() if status == "RESOLVED" else None
    await db.execute(
        "UPDATE requests SET status=?, resolvedAt=COALESCE(?, resolvedAt) WHERE id=?",
        (status, resolved_at, req_id),
    )
    if status == "RESOLVED":
        async with db.execute("SELECT assignedVolunteerId FROM requests WHERE id=?", (req_id,)) as cur:
            row = await cur.fetchone()
        if row and row[0]:
            await db.execute(
                "UPDATE volunteers SET activeRequestsCount = MAX(0, activeRequestsCount - 1) WHERE id=?",
                (row[0],),
            )
    await db.commit()


async def add_emergency_record(db: aiosqlite.Connection, er: dict) -> None:
    eid = er.get("id") or f"EMG-{_short_id()}"
    erss_ref = er.get("erss112RefNo") or f"ERSS-KA-UDU-2026-{random.randint(1000, 9999)}"
    await db.execute(
        """INSERT INTO emergency_records
           (id, requestId, seniorName, location, reason, callerPhone,
            escalatedAt, escalatedBy, erss112RefNo, policeStation, status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (
            eid, er["requestId"], er["seniorName"], er["location"],
            er["reason"], er.get("callerPhone"),
            er.get("escalatedAt", _now()), er.get("escalatedBy", "System"),
            erss_ref, er.get("policeStation", "Shirva PS"),
            er.get("status", "DISPATCHED"),
        ),
    )
    await db.execute(
        'UPDATE requests SET status="ESCALATED_112", escalatedTo112=1 WHERE id=?',
        (er["requestId"],),
    )
    await db.commit()


async def log_audit(db: aiosqlite.Connection, action: str, details: str, actor: str = "System") -> dict:
    lid = f"log-{int(datetime.now().timestamp() * 1000)}-{random.randint(0, 999)}"
    ts = _now()
    await db.execute(
        "INSERT INTO audit_logs (id, timestamp, action, actor, details) VALUES (?,?,?,?,?)",
        (lid, ts, action, actor, details),
    )
    await db.commit()
    return {"id": lid, "timestamp": ts, "action": action, "actor": actor, "details": details}
