# Sahayak — Database Layer

This directory contains all database-related files for the **Sahayak Community Assistance Platform** (Shirva Police Station PS 03).

---

## Files

| File | Description |
|---|---|
| `sahayak.db` | SQLite database — main data store |
| `schema.sql` | SQL schema definitions for all 6 tables |
| `init_db.js` | Standalone init/verification script |

---

## Database Engine

**SQLite** via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (synchronous API, no connection pooling needed for the single-server setup).

---

## Schema Overview — 6 Tables

### 1. `senior_citizens`
Registered senior citizens enrolled in the Sahayak program.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Full name |
| `phone` | TEXT | Registered mobile |
| `address` | TEXT | Home address in Shirva |
| `medicalConditions` | TEXT | Comma-separated conditions |
| `emergencyContact` | TEXT | Guardian/family contact |
| `latitude` | REAL | Geocoded lat |
| `longitude` | REAL | Geocoded lng |
| `createdAt` | TEXT | ISO timestamp |

---

### 2. `volunteers`
Community volunteers registered and verified by Shirva Police Station.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Full name |
| `phone` | TEXT | Mobile number |
| `organization` | TEXT | Affiliated organization (e.g. Lions Club) |
| `location` | TEXT | Area served |
| `skills` | TEXT | JSON array of skill tags |
| `isAvailable` | INTEGER | 1 = Available, 0 = Busy |
| `verificationStatus` | TEXT | `PENDING` \| `VERIFIED` \| `REJECTED` |
| `policeBadgeNo` | TEXT | Issued badge (e.g. `SHR-VOL-001`) |
| `totalTasksCompleted` | INTEGER | Resolved request count |
| `createdAt` | TEXT | ISO timestamp |

---

### 3. `requests`
Senior citizen assistance requests matched to volunteers.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `seniorCitizenId` | TEXT FK | References `senior_citizens.id` |
| `type` | TEXT | Request category |
| `description` | TEXT | Details |
| `status` | TEXT | `PENDING` \| `IN_PROGRESS` \| `RESOLVED` \| `ESCALATED` |
| `assignedVolunteerId` | TEXT FK | References `volunteers.id` |
| `escalatedTo112` | INTEGER | 1 if dispatched to emergency |
| `createdAt` | TEXT | ISO timestamp |
| `resolvedAt` | TEXT | ISO timestamp when resolved |

---

### 4. `emergency_records`
Log of 112 emergency dispatches triggered from the platform.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `requestId` | TEXT FK | References `requests.id` |
| `reason` | TEXT | Escalation reason |
| `dispatchedAt` | TEXT | ISO timestamp |

---

### 5. `audit_logs`
Full audit trail of all system actions (logins, status changes, escalations).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `action` | TEXT | Action code (e.g. `VOLUNTEER_LOGIN`) |
| `detail` | TEXT | Human-readable description |
| `actor` | TEXT | Who performed the action |
| `timestamp` | TEXT | ISO timestamp |

---

### 6. `shirva_locations`
Known Shirva landmark coordinates for map rendering.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Slug ID |
| `name` | TEXT | Location name |
| `latitude` | REAL | |
| `longitude` | REAL | |

---

## Running the Init Script

```bash
node database/init_db.js
```

This will verify all 6 tables exist and print a health summary. It is safe to run at any time.

---

## Connection

The backend (`backend/db.js`) connects to this database using:

```js
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'database', 'sahayak.db');
```

To use a custom path, set the `DB_PATH` environment variable before starting the backend.
