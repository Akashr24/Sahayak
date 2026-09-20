-- ==============================================================================
-- SAHAYAK (PS 03) — SQLite Database Schema & Initial Data
-- Sponsor: Shirva Police Station
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. SHIRVA LOCATIONS TABLE
DROP TABLE IF EXISTS shirva_locations;
CREATE TABLE shirva_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

INSERT INTO shirva_locations (id, name, latitude, longitude) VALUES
('loc-1', 'Manchakal Junction, Shirva', 13.2389, 74.8322),
('loc-2', 'Near Our Lady of Health Church, Shirva', 13.2421, 74.8360),
('loc-3', 'Mattar Cross Road, Shirva', 13.2280, 74.8450),
('loc-4', 'Bantakal Bus Stand (near SMVITM)', 13.2185, 74.8512),
('loc-5', 'Shirva Market & Bus Stand', 13.2405, 74.8341),
('loc-6', 'Paniyadi Temple Road, Shirva', 13.2450, 74.8290);

-- 2. SENIOR CITIZENS TABLE
DROP TABLE IF EXISTS senior_citizens;
CREATE TABLE senior_citizens (
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

INSERT INTO senior_citizens (id, name, age, phone, address, location, preferredLanguage, emergencyContact, medicalNotes, registeredAt, isActive, totalRequestsMade) VALUES
('sc-001', 'Saraswathi Amma', 74, '+91 97410 88231', 'Near Our Lady of Health Church, Shirva', 'Near Our Lady of Health Church, Shirva', 'Kannada', 'Son: Ravi Kamath (+91 98440 12345)', 'Hypertension, Diabetes Type 2. Regular BP & insulin medication needed.', '2026-08-15T09:00:00Z', 1, 3),
('sc-002', 'Benedict D''Souza', 81, '+91 94491 55672', 'Manchakal Junction, Shirva', 'Manchakal Junction, Shirva', 'English', 'Daughter: Maria D''Souza (+91 98002 67890)', 'Arthritis, limited mobility. Requires transport escort to PHC.', '2026-08-20T11:30:00Z', 1, 2),
('sc-003', 'Kamala Bai Nayak', 68, '+91 96110 34892', 'Paniyadi Temple Road, Shirva', 'Paniyadi Temple Road, Shirva', 'Tulu', 'Nephew: Suresh Nayak (+91 94483 22110)', 'Lives alone. No major medical conditions. Needs grocery & ration help.', '2026-09-01T08:00:00Z', 1, 1);

-- 3. VOLUNTEERS TABLE
DROP TABLE IF EXISTS volunteers;
CREATE TABLE volunteers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    organization TEXT NOT NULL,
    skills TEXT NOT NULL, -- JSON string or comma-separated
    location TEXT NOT NULL,
    verificationStatus TEXT NOT NULL DEFAULT 'PENDING' CHECK (verificationStatus IN ('PENDING', 'VERIFIED', 'REJECTED')),
    policeBadgeNo TEXT,
    registeredAt TEXT NOT NULL,
    activeRequestsCount INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 5.0,
    isAvailable INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

INSERT INTO volunteers (id, name, phone, organization, skills, location, verificationStatus, policeBadgeNo, registeredAt, activeRequestsCount, rating, isAvailable, notes) VALUES
('vol-001', 'Ramesh Acharya', '+91 98451 22340', 'Lions Club of Shirva', '["First Aid Certified", "Vehicle Available", "Medicine Purchase"]', 'Shirva Market Road', 'VERIFIED', 'SHR-VOL-101', '2026-09-01T10:00:00Z', 1, 4.9, 1, 'Background verified by PSI Shirva. ID proofs validated.'),
('vol-002', 'Deepa Shetty', '+91 98860 91823', 'Leo Club Bantakal', '["Elderly Care", "Kannada & Tulu Fluent", "Grocery Logistics"]', 'Near SMVITM Bantakal', 'VERIFIED', 'SHR-VOL-102', '2026-09-03T14:30:00Z', 0, 4.8, 1, 'Verified via Leo Club president recommendation & Aadhaar.'),
('vol-003', 'Pradeep Kumar Nayak', '+91 94480 34112', 'Local Auto Driver Union & Red Cross', '["Emergency Transport", "Auto-Rickshaw 24/7", "Oxygen cylinder transport"]', 'Manchakal Auto Stand', 'VERIFIED', 'SHR-VOL-103', '2026-09-05T09:15:00Z', 0, 5.0, 1, 'Police verification cleared with 15+ years safe local driving history.'),
('vol-004', 'Vikram Poojary', '+91 87620 44519', 'Independent Resident Volunteer', '["General Chores", "Bike Transport"]', 'Mattar Village', 'PENDING', NULL, datetime('now'), 0, 0.0, 0, 'New submission pending background check and photo ID verification at station.');

-- 4. SERVICE REQUESTS TABLE
DROP TABLE IF EXISTS requests;
CREATE TABLE requests (
    id TEXT PRIMARY KEY,
    seniorName TEXT NOT NULL,
    seniorPhone TEXT,
    location TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'Kannada',
    category TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (urgency IN ('CRITICAL_112', 'HIGH', 'MEDIUM', 'ROUTINE')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED_112')),
    assignedVolunteerId TEXT,
    assignedVolunteerName TEXT,
    createdAt TEXT NOT NULL,
    resolvedAt TEXT,
    escalatedTo112 INTEGER NOT NULL DEFAULT 0,
    audioNotes TEXT,
    FOREIGN KEY (assignedVolunteerId) REFERENCES volunteers (id)
);

INSERT INTO requests (id, seniorName, seniorPhone, location, language, category, urgency, description, status, assignedVolunteerId, assignedVolunteerName, createdAt, resolvedAt, escalatedTo112, audioNotes) VALUES
('REQ-2026-089', 'Saraswathi Amma (Age 74)', '+91 97410 88231', 'Near Our Lady of Health Church, Shirva', 'Kannada', 'Medicines / Pharmacy', 'HIGH', 'Need urgent blood pressure tablet (Amlodipine 5mg) & Insulin from Shirva Medicals delivered to home.', 'IN_PROGRESS', 'vol-001', 'Ramesh Acharya', datetime('now', '-25 minutes'), NULL, 0, 'Caller sounded anxious, requesting morning dose.'),
('REQ-2026-088', 'Benedict D''Souza (Age 81)', '+91 94491 55672', 'Manchakal Junction, Shirva', 'English', 'Auto-Rickshaw / Transport', 'MEDIUM', 'Needs an auto to visit Primary Health Centre (PHC) Shirva for routine doctor checkup.', 'RESOLVED', 'vol-003', 'Pradeep Kumar Nayak', datetime('now', '-120 minutes'), datetime('now', '-60 minutes'), 0, 'Completed smoothly by auto volunteer.');

-- 5. EMERGENCY RECORDS TABLE
DROP TABLE IF EXISTS emergency_records;
CREATE TABLE emergency_records (
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

-- 6. AUDIT LOGS TABLE
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT NOT NULL,
    targetEntityId TEXT
);

INSERT INTO audit_logs (id, timestamp, action, actor, details, targetEntityId) VALUES
('log-1', datetime('now', '-120 minutes'), 'REQUEST_CREATED', 'System AI Voice IVR', 'Voice call received from Benedict D''Souza (Manchakal). Categorized as Transport.', 'REQ-2026-088'),
('log-2', datetime('now', '-110 minutes'), 'VOLUNTEER_ASSIGNED', 'Dispatcher Engine', 'Assigned Pradeep Kumar Nayak (Auto Union & Red Cross) to REQ-2026-088.', 'REQ-2026-088'),
('log-3', datetime('now', '-60 minutes'), 'REQUEST_RESOLVED', 'Volunteer Pradeep Kumar Nayak', 'REQ-2026-088 marked completed. Safe transport to PHC Shirva fulfilled.', 'REQ-2026-088'),
('log-4', datetime('now', '-25 minutes'), 'REQUEST_CREATED', 'System AI Voice IVR', 'Voice call received from Saraswathi Amma. Categorized as Medicines (High Priority).', 'REQ-2026-089'),
('log-5', datetime('now', '-22 minutes'), 'VOLUNTEER_ASSIGNED', 'Dispatcher Engine', 'Assigned Ramesh Acharya (Lions Club) to REQ-2026-089.', 'REQ-2026-089');
