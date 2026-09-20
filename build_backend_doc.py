import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os

# Start fresh from original template
doc = docx.Document(r'c:\Sahayak\Backend_Document_Template.original.docx')

def set_cell(cell, text, bold=False, font_size=8.5, color=None, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.05
    run = p.add_run(text)
    run.bold = bold
    run.font.name = 'Calibri'
    run.font.size = Pt(font_size)
    if color:
        run.font.color.rgb = color
    return cell

def set_header_cell(cell, text, font_size=8.5):
    set_cell(cell, text, bold=True, font_size=font_size, color=RGBColor(255, 255, 255))
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="174A5B" w:val="clear"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def populate_table_rows(table, data, start_row=1, bold_col_0=False):
    for r_idx, row_data in enumerate(data):
        target_r = start_row + r_idx
        if target_r < len(table.rows):
            row = table.rows[target_r]
        else:
            row = table.add_row()
        for c_idx, val in enumerate(row_data):
            if c_idx < len(row.cells):
                is_bold = (bold_col_0 and c_idx == 0)
                set_cell(row.cells[c_idx], str(val), bold=is_bold)

# ==============================================================================
# 0. TITLE & TEAM METADATA (Table 0)
# ==============================================================================
table_0 = doc.tables[0]
set_cell(table_0.cell(1, 0), "Team Sahayak", bold=True, font_size=9.5)
set_cell(table_0.cell(1, 1), "SAHAYAK (PS 03) — Senior Citizen Community Assistance & Emergency Escalation Platform", bold=True, font_size=9.5)
set_cell(table_0.cell(1, 2), "Backend", bold=False, font_size=9.5)
set_cell(table_0.cell(1, 3), "1", bold=False, font_size=9.5)

# ==============================================================================
# 1. SYSTEM OVERVIEW (Paragraph 10, Table 3)
# ==============================================================================
for p in doc.paragraphs:
    if "Give a concise overview of what the backend is responsible for" in p.text:
        p.text = (
            "The Sahayak backend is a mission-critical community assistance and emergency escalation platform "
            "engineered for senior citizens residing across the Shirva and Bantakal panchayat jurisdictions, "
            "operating under the administrative and judicial oversight of the Shirva Police Station. The backend "
            "acts as the authoritative system of record and real-time dispatch engine, responsible for: (1) multi-lingual "
            "voice-intent request ingestion (Kannada, Tulu transliterated, and English) with life-safety NLP triage, "
            "(2) community volunteer onboarding, KYC background verification, and police badge issuance workflows, "
            "(3) rule-based request assignment, status tracking, and fulfillment lifecycle management, (4) dual-trigger "
            "automated and manual emergency escalation to the Karnataka 112 Emergency Response Support System (ERSS) with "
            "police station audible/visual alerting, and (5) comprehensive, immutable audit logging to guarantee station "
            "oversight, civic transparency, and legal record-keeping."
        )

overview_data = [
    [
        "Backend Responsibility",
        "Centralized orchestration of senior citizen registration, volunteer onboarding and police background "
        "verification, intelligent multi-lingual voice-intent request triage, proximity-aware volunteer dispatch, "
        "dual-trigger emergency escalation to ERSS 112 with police station alerting, and real-time dashboard analytics."
    ],
    [
        "Primary actors / roles",
        "• Senior Citizen: Elderly resident / voice caller requesting assistance (medicines, transport, groceries).\n"
        "• Community Volunteer: Police-verified local responder fulfilling assigned community tasks.\n"
        "• Police Admin / Dispatcher: Shirva Police Station command officer managing verification, dispatch, and emergency 112 escalation."
    ],
    [
        "Functional Decomposition",
        "1. Authentication & Role Gate Module (Station login, volunteer self-registration, session management)\n"
        "2. Volunteer Lifecycle & Police Verification Subsystem (Background check, station badge issuance, availability)\n"
        "3. Senior Citizen Registry & Medical Profiling (Resident registry, emergency contacts, medical notes)\n"
        "4. Request Ingestion & Dispatch Engine (Auto-categorization, priority tagging, assignment, state tracking)\n"
        "5. Emergency 112 Escalation & Safety Guard Subsystem (NLP keyword triage, 112 ERSS relay, station alerts)\n"
        "6. Police Audit & Compliance Logging Engine (Immutable event stream, oversight history, action tracking)\n"
        "7. Multi-Lingual Voice NLP Parser (Kannada, Tulu transliterated, and English intent extraction)"
    ],
    [
        "Main entities",
        "SeniorCitizen (beneficiary), Volunteer (responder), ServiceRequest (task), EmergencyRecord (112 incident), "
        "AuditLog (immutable event), ShirvaLocation (panchayat geographic point)."
    ]
]
populate_table_rows(doc.tables[3], overview_data, start_row=1, bold_col_0=True)

# ==============================================================================
# 2. BACKEND ARCHITECTURE (Diagram, Table 5 Components, Table 6 Decisions)
# ==============================================================================
for p in doc.paragraphs:
    if "[ INSERT ARCHITECTURE DIAGRAM HERE ]" in p.text:
        p.text = ""
        run = p.add_run()
        run.add_picture(r'c:\Sahayak\docs_assets\architecture_diagram.png', width=Inches(6.2))
        p_caption = doc.add_paragraph()
        p_caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c_run = p_caption.add_run("Figure 2.1: Sahayak High-Level Backend System Architecture & Layer Decomposition")
        c_run.font.size = Pt(8)
        c_run.font.italic = True
        break

components_data = [
    [
        "API / Server",
        "Provides REST endpoints for senior requests, volunteer management, police verification, voice intent "
        "processing, and emergency dispatch with CORS, JSON body validation, and RBAC guards.",
        "Node.js (v20+), Express.js framework, CORS, UUID"
    ],
    [
        "Database",
        "Stores structured entities: SeniorCitizens, Volunteers, ServiceRequests, EmergencyRecords, and AuditLogs "
        "with atomic update functions and snapshot capability.",
        "Node.js In-Memory Data Store (db.js) / JSON-backed persistent store"
    ],
    [
        "Voice & NLP Engine",
        "Ingests multi-lingual transcripts (Kannada transliteration, Tulu, English) and applies lexical triage to detect "
        "cardiac symptoms, falls, accidents, and life hazards.",
        "Rule-based Lexical Matcher & Multi-Lingual Keyword Classifier"
    ],
    [
        "Emergency Worker",
        "Synchronous safety engine that intercepts CRITICAL_112 requests, logs formal incident dossiers, and alerts "
        "Shirva Police Station dispatchers.",
        "Synchronous Escalation Service & In-Memory Event Stream"
    ],
    [
        "External Gateway",
        "Connects backend to Karnataka Emergency Response Support System (ERSS 112) webhook and Shirva Station "
        "visual/audio alert terminal.",
        "HTTP REST Webhook Relay & Emergency Dispatch Adapter"
    ]
]
populate_table_rows(doc.tables[5], components_data, start_row=1, bold_col_0=True)

decisions_data = [
    [
        "AD-01",
        "Express Modular REST Engine",
        "Chosen for minimal runtime overhead, asynchronous non-blocking event loop, and sub-20ms API response times "
        "critical during emergency triage and voice IVR processing.",
        "Requires explicit custom middleware for schema validation compared to heavier, heavyweight frameworks."
    ],
    [
        "AD-02",
        "In-Memory Core with Append-Only Audit Logging",
        "Delivers ultra-low latency (<2ms) data access and zero external database dependency during power or network "
        "instabilities in rural Shirva, while keeping an immutable chronological log.",
        "Volatile RAM storage mitigated by append-only event logging; repository layer designed for drop-in migration to PostgreSQL."
    ],
    [
        "AD-03",
        "Dual-Trigger Emergency Escalation (Auto-NLP + Police Override)",
        "Critical fail-safe: Automated triage instantly catches life-threatening symptoms in transcripts, while Police "
        "Command retains a 1-click manual override endpoint (/api/emergency/manual-escalate).",
        "Algorithmic alerts require dispatcher acknowledgement to prevent false-alarm fatigue on non-critical phrases."
    ],
    [
        "AD-04",
        "Mandatory Police Verification Gate for Volunteer Assignment",
        "Volunteers cannot view, accept, or be assigned to any senior requests until Shirva Police Station verifies "
        "identity (Aadhaar/Org) and assigns a policeBadgeNo.",
        "Slight onboarding latency while police inspect credentials, but completely eliminates safety risks for vulnerable seniors."
    ]
]
populate_table_rows(doc.tables[6], decisions_data, start_row=1, bold_col_0=True)

# ==============================================================================
# 3. CORE BACKEND WORKFLOWS (Diagram & Descriptions)
# ==============================================================================
for p in doc.paragraphs:
    if "[ INSERT WORKFLOW DIAGRAMS HERE ]" in p.text:
        p.text = ""
        run = p.add_run()
        run.add_picture(r'c:\Sahayak\docs_assets\workflow_diagram.png', width=Inches(6.2))
        p_caption = doc.add_paragraph()
        p_caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c_run = p_caption.add_run("Figure 3.1: End-to-End Core Backend Workflows for Ingestion, Verification, Fulfillment, and 112 Escalation")
        c_run.font.size = Pt(8)
        c_run.font.italic = True
        break

for p in doc.paragraphs:
    if "Show the 3–5 most important end-to-end backend workflows" in p.text:
        p.text = (
            "The Sahayak backend orchestrates four primary end-to-end operational workflows: "
            "(1) Voice Ingestion & Automated Emergency Triage, (2) Volunteer KYC Registration & Police Badging, "
            "(3) Proximity Dispatch, Task Execution & Resolution, and (4) Police 112 Emergency Escalation & Record-Keeping."
        )

# ==============================================================================
# 4. DATA MODEL & SCHEMA (Diagram & Tables 7, 8, 9)
# ==============================================================================
for p in doc.paragraphs:
    if "[ INSERT ER DIAGRAM HERE ]" in p.text:
        p.text = ""
        run = p.add_run()
        run.add_picture(r'c:\Sahayak\docs_assets\er_diagram.png', width=Inches(6.2))
        p_caption = doc.add_paragraph()
        p_caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c_run = p_caption.add_run("Figure 4.1: Entity-Relationship (ER) Diagram showing Sahayak Domain Entities & Associations")
        c_run.font.size = Pt(8)
        c_run.font.italic = True
        break

# Set Table headings
tbl_headings = [p for p in doc.paragraphs if "TABLE: [" in p.text or "TABLE: " in p.text]
if len(tbl_headings) >= 3:
    tbl_headings[0].text = "TABLE: senior_citizens"
    tbl_headings[1].text = "TABLE: volunteers"
    tbl_headings[2].text = "TABLE: requests"

for p in doc.paragraphs:
    if "Add/remove rows as required" in p.text:
        p.text = ""

# Table 7: senior_citizens schema
sc_schema = [
    ["id", "VARCHAR(36)", "PK", "No", "UUID v4", "Unique identifier for senior citizen record"],
    ["name", "VARCHAR(100)", "—", "No", "—", "Full name of senior citizen (e.g. Saraswathi Amma)"],
    ["age", "INTEGER", "—", "No", "—", "Age in years (validated >= 60)"],
    ["phone", "VARCHAR(20)", "—", "No", "—", "Primary contact telephone / mobile number"],
    ["address", "TEXT", "—", "No", "—", "Detailed physical residential address in Shirva/Bantakal"],
    ["location", "VARCHAR(100)", "FK", "No", "—", "Locality name linking to Shirva Panchayath landmark"],
    ["preferredLanguage", "VARCHAR(30)", "—", "No", "'Kannada'", "Primary communication tongue (Kannada, Tulu, English)"],
    ["emergencyContact", "TEXT", "—", "No", "—", "Next of kin name, relationship, and reachable phone number"],
    ["medicalNotes", "TEXT", "—", "Yes", "NULL", "Chronic conditions (Hypertension, Diabetes, Mobility limits)"],
    ["totalRequestsMade", "INTEGER", "—", "No", "0", "Counter of all lifetime assistance requests placed"],
    ["isActive", "BOOLEAN", "—", "No", "TRUE", "Active status indicator for senior registry"],
    ["registeredAt", "TIMESTAMP", "—", "No", "CURRENT_TIMESTAMP", "Timestamp when registered into system"]
]
populate_table_rows(doc.tables[7], sc_schema, start_row=1, bold_col_0=True)

# Table 8: volunteers schema
vol_schema = [
    ["id", "VARCHAR(36)", "PK", "No", "UUID v4", "Unique identifier for community volunteer record"],
    ["name", "VARCHAR(100)", "—", "No", "—", "Full name of volunteer responder"],
    ["phone", "VARCHAR(20)", "—", "No", "—", "Verified mobile phone number"],
    ["organization", "VARCHAR(100)", "—", "No", "—", "Affiliated NGO (Lions Club, Leo Club Bantakal, Auto Union)"],
    ["skills", "TEXT[] / JSON", "—", "No", "'[]'", "List of competencies (First Aid, Transport, Groceries)"],
    ["location", "VARCHAR(100)", "FK", "No", "—", "Primary area of operation within Shirva"],
    ["verificationStatus", "VARCHAR(20)", "—", "No", "'PENDING'", "State: PENDING, VERIFIED, or REJECTED"],
    ["policeBadgeNo", "VARCHAR(30)", "—", "Yes", "NULL", "Official Shirva Police Station badge ID (e.g. SHR-VOL-101)"],
    ["isAvailable", "BOOLEAN", "—", "No", "FALSE", "On-duty / Off-duty availability toggle for dispatch"],
    ["activeRequestsCount", "INTEGER", "—", "No", "0", "Number of currently active assigned requests"],
    ["rating", "FLOAT", "—", "No", "5.0", "Community service satisfaction rating (0.0 to 5.0)"],
    ["notes", "TEXT", "—", "Yes", "NULL", "Police background check notes and verification audit"],
    ["registeredAt", "TIMESTAMP", "—", "No", "CURRENT_TIMESTAMP", "Registration submission timestamp"]
]
populate_table_rows(doc.tables[8], vol_schema, start_row=1, bold_col_0=True)

# Table 9: requests schema
req_schema = [
    ["id", "VARCHAR(36)", "PK", "No", "REQ-YYYY-XXX", "Human-readable request code (e.g. REQ-2026-089)"],
    ["seniorName", "VARCHAR(100)", "—", "No", "—", "Senior citizen beneficiary name"],
    ["seniorPhone", "VARCHAR(20)", "—", "No", "—", "Phone number of caller or senior"],
    ["location", "VARCHAR(100)", "FK", "No", "—", "Pickup / delivery landmark within Shirva"],
    ["language", "VARCHAR(30)", "—", "No", "'Kannada'", "Language of request (Kannada, Tulu, English)"],
    ["category", "VARCHAR(50)", "—", "No", "—", "Classification: Medicines, Transport, Groceries, Companionship"],
    ["urgency", "VARCHAR(20)", "—", "No", "'MEDIUM'", "Triage Level: CRITICAL_112, HIGH, MEDIUM, ROUTINE"],
    ["description", "TEXT", "—", "No", "—", "Full description of requested community assistance"],
    ["status", "VARCHAR(20)", "—", "No", "'PENDING'", "Status: PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, ESCALATED_112"],
    ["assignedVolunteerId", "VARCHAR(36)", "FK", "Yes", "NULL", "Links to volunteers.id when task is assigned"],
    ["assignedVolunteerName", "VARCHAR(100)", "—", "Yes", "NULL", "Denormalized name of assigned volunteer for fast read"],
    ["escalatedTo112", "BOOLEAN", "—", "No", "FALSE", "Flag indicating whether incident was relayed to 112 ERSS"],
    ["audioNotes", "TEXT", "—", "Yes", "NULL", "Voice transcript / audio triage notes from IVR intake"],
    ["createdAt", "TIMESTAMP", "—", "No", "CURRENT_TIMESTAMP", "Request ingestion timestamp"],
    ["resolvedAt", "TIMESTAMP", "—", "Yes", "NULL", "Completion timestamp when marked RESOLVED"]
]
populate_table_rows(doc.tables[9], req_schema, start_row=1, bold_col_0=True)

# ==============================================================================
# 5. BUSINESS LOGIC & RULES (Table 10, State Diagram)
# ==============================================================================
rules_data = [
    [
        "BR-01",
        "Volunteer Verification Gate: Only volunteers with verificationStatus === 'VERIFIED' and isAvailable === true "
        "can be assigned to a senior citizen request. Unverified or off-duty volunteers are strictly blocked.",
        "Dispatch API Controller & middleware (/api/requests/:id/assign)"
    ],
    [
        "BR-02",
        "Request Lifecycle Immutability: Once a request transitions to 'RESOLVED' or 'ESCALATED_112', its status cannot "
        "revert back to 'PENDING', 'ASSIGNED', or 'IN_PROGRESS'. Terminal states are immutable.",
        "Status State Machine Guard in /api/requests/:id/status"
    ],
    [
        "BR-03",
        "Emergency NLP Preemption: If incoming voice transcripts contain cardiac, fall, or severe trauma keywords "
        "(e.g., 'chest pain', 'ede novu', 'swasa kattide', 'raktasrava'), urgency is auto-promoted to 'CRITICAL_112', "
        "escalatedTo112 is flagged true, and an EmergencyRecord is immediately created.",
        "Natural Language Processing Parser & Ingestion Controller"
    ],
    [
        "BR-04",
        "Mandatory Police Audit Trail: Every domain event—including request creation, volunteer assignment, status changes, "
        "police verification approval/rejection, and emergency escalations—must append an unalterable record to auditLogs.",
        "Centralized logAudit() Service Hook invoked in all state-mutating endpoints"
    ],
    [
        "BR-05",
        "Police Badge Authority: Only authenticated Shirva Police Station administrators can approve volunteer registrations, "
        "assign official policeBadgeNo identifiers, or perform manual 112 emergency escalations.",
        "Authentication & Role-Based Access Control Guard Middleware"
    ],
    [
        "BR-06",
        "Workload Throttling: A single volunteer cannot hold more than 3 concurrent 'IN_PROGRESS' requests to prevent "
        "burnout and ensure rapid response times for seniors.",
        "Assignment Validation Guard in PUT /api/requests/:id/assign"
    ]
]
populate_table_rows(doc.tables[10], rules_data, start_row=1, bold_col_0=True)

for p in doc.paragraphs:
    if "[ INSERT STATE TRANSITION DIAGRAMS HERE ]" in p.text:
        p.text = ""
        run = p.add_run()
        run.add_picture(r'c:\Sahayak\docs_assets\state_transition_diagram.png', width=Inches(6.2))
        p_caption = doc.add_paragraph()
        p_caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c_run = p_caption.add_run("Figure 5.1: Finite State Machines for Volunteer Verification & Service Request Lifecycles")
        c_run.font.size = Pt(8)
        c_run.font.italic = True
        break

# ==============================================================================
# 6. API DESIGN (Table 11 Summary, Tables 12-17 Contracts)
# ==============================================================================
api_summary_data = [
    ["API-01", "POST", "/api/auth/login", "Public", "Senior / Volunteer / Police", "Authenticate credentials and issue role session"],
    ["API-02", "POST", "/api/auth/register-volunteer", "Public", "Volunteer", "Self-registration of volunteer with skills and org"],
    ["API-03", "GET", "/api/volunteers", "Required", "Police Admin / Volunteer", "List all volunteers with verification/status filters"],
    ["API-04", "GET", "/api/volunteers/:id", "Required", "Volunteer / Police", "Get detailed profile and service history of volunteer"],
    ["API-05", "PUT", "/api/volunteers/:id/verification", "Required", "Police Admin", "Approve/reject volunteer and assign police badge"],
    ["API-06", "PUT", "/api/volunteers/:id/availability", "Required", "Volunteer", "Toggle on-duty / off-duty availability state"],
    ["API-07", "GET", "/api/senior-citizens", "Required", "Police Admin / Volunteer", "List registered senior citizens and medical notes"],
    ["API-08", "POST", "/api/senior-citizens", "Required", "Police / Volunteer", "Register a new elderly resident with emergency contact"],
    ["API-09", "GET", "/api/requests", "Required", "Volunteer / Police", "List assistance requests with status & urgency filters"],
    ["API-10", "POST", "/api/requests", "Public", "Voice IVR / Police / Web", "Create new assistance request with NLP auto-triage"],
    ["API-11", "PUT", "/api/requests/:id/assign", "Required", "Police Dispatcher", "Assign verified on-duty volunteer to assistance task"],
    ["API-12", "PUT", "/api/requests/:id/status", "Required", "Volunteer / Police", "Update request status (IN_PROGRESS, RESOLVED)"],
    ["API-13", "POST", "/api/emergency/manual-escalate", "Required", "Police Admin / Dispatch", "Manual override escalation of request to ERSS 112"],
    ["API-14", "GET", "/api/emergency/records", "Required", "Police Admin", "Retrieve reviewable log of all 112 escalated emergencies"],
    ["API-15", "GET", "/api/audit-logs", "Required", "Police Admin", "Fetch chronological audit trail for station oversight"]
]
populate_table_rows(doc.tables[11], api_summary_data, start_row=1, bold_col_0=True)

# Detailed Endpoint Contracts Headings
headings_api = [p for p in doc.paragraphs if "API-01 —" in p.text or "API-02 —" in p.text]
if len(headings_api) >= 2:
    headings_api[0].text = "API-01 — POST /api/requests (Request Ingestion & NLP Auto-Triage)"
    headings_api[1].text = "API-02 — POST /api/emergency/manual-escalate (Police 112 Emergency Escalation)"

contract_1 = [
    ["Purpose", "Ingest assistance requests from Voice IVR or Web, analyze transcript for emergencies, and auto-classify priority."],
    ["Authentication", "Public (or API Key for IVR telephony gateway)"],
    ["Authorization", "Senior Citizen, Volunteer, or Police Dispatcher"],
    ["Parameters", "Body: seniorName, phone, location, category, urgency, description, language, audioNotes"],
    ["Validation", "seniorName (min 2 chars), phone (valid 10+ digit number), location (must match known Shirva landmark)"],
    ["Success status", "201 Created"],
    ["Error statuses", "400 Bad Request (missing required fields), 500 Internal Server Error"]
]
populate_table_rows(doc.tables[12], contract_1, start_row=1, bold_col_0=True)

req_1_json = """{
  "seniorName": "Saraswathi Amma",
  "phone": "+91 97410 88231",
  "location": "Near Our Lady of Health Church, Shirva",
  "language": "Kannada",
  "category": "Medicines / Pharmacy",
  "urgency": "HIGH",
  "description": "Urgent blood pressure tablets (Amlodipine 5mg) needed from Shirva Medicals.",
  "audioNotes": "Caller requesting morning dose, lives alone."
}"""
set_cell(doc.tables[13].cell(0, 0), req_1_json, font_size=8)

res_1_json = """{
  "success": true,
  "data": {
    "id": "REQ-2026-092",
    "seniorName": "Saraswathi Amma",
    "location": "Near Our Lady of Health Church, Shirva",
    "category": "Medicines / Pharmacy",
    "urgency": "HIGH",
    "status": "PENDING",
    "escalatedTo112": false,
    "createdAt": "2026-09-15T11:42:00.000Z"
  }
}"""
set_cell(doc.tables[14].cell(0, 0), res_1_json, font_size=8)

contract_2 = [
    ["Purpose", "Police command override to instantly escalate any ongoing or pending request directly to ERSS 112."],
    ["Authentication", "Required (Police session / token)"],
    ["Authorization", "Police Admin / Station Dispatcher only"],
    ["Parameters", "Body: requestId, reason, escalatedBy, notify112 (boolean)"],
    ["Validation", "requestId must exist in database; request must not already be RESOLVED"],
    ["Success status", "200 OK"],
    ["Error statuses", "400 Bad Request (missing requestId/reason), 404 Not Found (request ID invalid), 409 Conflict (already resolved)"]
]
populate_table_rows(doc.tables[15], contract_2, start_row=1, bold_col_0=True)

req_2_json = """{
  "requestId": "REQ-2026-089",
  "reason": "Senior reported sudden severe chest pain and breathlessness during delivery check.",
  "escalatedBy": "PSI Shirva Police Station",
  "notify112": true
}"""
set_cell(doc.tables[16].cell(0, 0), req_2_json, font_size=8)

res_2_json = """{
  "success": true,
  "message": "Request REQ-2026-089 escalated to 112 emergency services and Shirva Police dispatch",
  "emergencyRecord": {
    "id": "EMG-1726398120000",
    "requestId": "REQ-2026-089",
    "seniorName": "Saraswathi Amma (Age 74)",
    "location": "Near Our Lady of Health Church, Shirva",
    "reason": "Senior reported sudden severe chest pain and breathlessness.",
    "escalatedAt": "2026-09-15T11:42:15.000Z",
    "escalatedBy": "PSI Shirva Police Station",
    "erss112RefNo": "ERSS-KA-UDU-2026-8819",
    "status": "DISPATCHED"
  }
}"""
set_cell(doc.tables[17].cell(0, 0), res_2_json, font_size=8)

# ==============================================================================
# 7. AUTHENTICATION & AUTHORIZATION (Tables 18, 19, 20)
# ==============================================================================
auth_data = [
    ["Authentication mechanism", "Role-based token & credential matching for Police Station ('admin') and Volunteers ('volunteer')."],
    ["Credential storage", "Secure salt-hashed credential comparison with Station badge ID cross-referencing."],
    ["Token / session lifetime", "8 hours (matches standard police active operational shift duration)."],
    ["Refresh mechanism", "Sliding window auto-renewal on active command console interaction."]
]
populate_table_rows(doc.tables[18], auth_data, start_row=1, bold_col_0=True)

# Table 19: RBAC Matrix
# Headers in original: Action | [ Role 1 ] | [ Role 2 ] | [ Role 3 ] | [ Role 4 ]
# Number of cols is 5
set_cell(doc.tables[19].cell(0, 0), "Action", bold=True)
set_cell(doc.tables[19].cell(0, 1), "Police Admin", bold=True)
set_cell(doc.tables[19].cell(0, 2), "Verified Volunteer", bold=True)
set_cell(doc.tables[19].cell(0, 3), "Senior Citizen", bold=True)
set_cell(doc.tables[19].cell(0, 4), "Public / IVR", bold=True)

rbac_data = [
    ["Register Volunteer Profile", "✓", "✓", "✗", "✓"],
    ["Verify & Badge Volunteer (KYC)", "✓", "✗", "✗", "✗"],
    ["Create Assistance Request", "✓", "✓", "✓", "✓"],
    ["View All Requests & Triage", "✓", "Assigned Only", "Own Only", "✗"],
    ["Assign Volunteer to Request", "✓", "✗", "✗", "✗"],
    ["Update Request Status (Resolve)", "✓", "Assigned Only", "✗", "✗"],
    ["Trigger 112 Emergency Escalation", "✓ (Manual)", "✓ (Report)", "Auto (Keyword)", "✗"],
    ["View Emergency Records & Audits", "✓", "✗", "✗", "✗"]
]
populate_table_rows(doc.tables[19], rbac_data, start_row=1, bold_col_0=True)

security_data = [
    ["Input validation", "Strict Express JSON schema validation checking non-empty strings, phone digits, and enum constraints."],
    ["Authorization", "Route-level RBAC middleware enforcing allowed roles before processing sensitive state transitions."],
    ["Password security", "Salted hash verification; sensitive credentials stripped from all logging and API responses."],
    ["Sensitive data", "Senior citizen health diagnoses and emergency contacts restricted to assigned responders and police."],
    ["Rate limiting", "IP-based rate limiter on public ingestion endpoints to guard against denial of service and spam."]
]
populate_table_rows(doc.tables[20], security_data, start_row=1, bold_col_0=True)

# ==============================================================================
# 8. BACKGROUND PROCESSING & SERVICES (Tables 21, 22)
# ==============================================================================
bg_data = [
    [
        "BG-01",
        "Emergency Escalation Dispatcher",
        "Event Trigger: CRITICAL_112 keyword match or manual escalation",
        "Dispatches immediate synchronous incident dossier to Shirva Police Station console and logs 112 ERSS payload.",
        "Node.js In-Memory Event Dispatcher & Service Hook",
        "Synchronous retry (3x), fallback to station SMS/telephony relay, recorded in audit logs."
    ],
    [
        "BG-02",
        "Unassigned Request SLA Monitor",
        "Cron / Interval Timer (Every 5 minutes)",
        "Scans PENDING requests older than 15 minutes; automatically elevates triage alert and flags dispatcher console.",
        "Node.js Background Interval Service",
        "Logs SLA breach in audit trail, triggers visual priority badge on Police Command dashboard."
    ]
]
populate_table_rows(doc.tables[22], bg_data, start_row=1, bold_col_0=True)

# ==============================================================================
# 9. EXTERNAL INTEGRATIONS (Tables 23, 24)
# ==============================================================================
ext_data = [
    [
        "EXT-01",
        "Karnataka ERSS 112 Emergency Dispatch Gateway",
        "Transmits life-safety emergency payloads (senior name, address, medical condition, audio transcript) to 112.",
        "Backend → ERSS 112 Service",
        "Outbound: JSON Emergency Incident Dossier; Inbound: ERSS 112 Reference ID (e.g. ERSS-KA-UDU-2026-8819)",
        "Logged to EmergencyRecords as PENDING_112_ACK; audible alarm sounds at Shirva Police Station terminal."
    ],
    [
        "EXT-02",
        "Web Speech & IVR Telephony Bridge",
        "Transcribes senior voice calls in Kannada, Tulu transliteration, and English into structured text for backend parsing.",
        "Telephony Gateway → Backend",
        "Inbound: Speech audio transcript, caller phone number, approximate cell tower landmark",
        "Falls back to human dispatcher queue with audio recording attachment."
    ]
]
populate_table_rows(doc.tables[24], ext_data, start_row=1, bold_col_0=True)

# ==============================================================================
# 10. ERROR HANDLING & RELIABILITY (Tables 25, 26, 27)
# ==============================================================================
error_json = """{
  "success": false,
  "error": {
    "code": "VOLUNTEER_NOT_ELIGIBLE",
    "message": "Only police-verified, on-duty volunteers can be assigned to senior requests.",
    "timestamp": "2026-09-15T11:42:00.000Z",
    "details": {
      "volunteerId": "vol-004",
      "verificationStatus": "PENDING"
    }
  }
}"""
set_cell(doc.tables[25].cell(0, 0), error_json, font_size=8)

status_conv_data = [
    ["Invalid input", "400", "Missing required seniorName, invalid phone format, or unverified volunteer assignment."],
    ["Unauthenticated", "401", "Missing or expired authorization credentials on protected police routes."],
    ["Unauthorized", "403", "Volunteer attempting to approve another volunteer or access station emergency records."],
    ["Not found", "404", "Target volunteer ID, senior citizen record, or request ID does not exist in database."],
    ["Conflict", "409", "Attempting to change status of a request that has already been RESOLVED or ESCALATED_112."],
    ["Server failure", "500", "Unexpected runtime exception or unhandled promise rejection in backend services."]
]
populate_table_rows(doc.tables[26], status_conv_data, start_row=1, bold_col_0=True)

fail_scenarios_data = [
    [
        "ERR-01",
        "Database or Storage Access Failure",
        "Backend captures error, logs event with HIGH severity, and returns 500 error without leaking server stack trace."
    ],
    [
        "ERR-02",
        "ERSS 112 Gateway Timeout or Network Unavailability",
        "Escalation request is flagged as ESCALATED_112_OFFLINE; emergency record is created locally, and Station alarm triggers."
    ],
    [
        "ERR-03",
        "Invalid State Machine Transition (e.g. RESOLVED → PENDING)",
        "Controller rejects transition with HTTP 409 Conflict; records unauthorized attempt in audit log."
    ],
    [
        "ERR-04",
        "Assignment of Unverified or Inactive Volunteer",
        "Request assignment rejected with HTTP 400 Bad Request; dispatcher notified to select a verified volunteer."
    ]
]
populate_table_rows(doc.tables[27], fail_scenarios_data, start_row=1, bold_col_0=True)

# ==============================================================================
# 11. TESTING STRATEGY (Table 28)
# ==============================================================================
test_data = [
    [
        "T-01",
        "REQ-01: Routine Request Creation",
        "Senior creates request for routine medicines via POST /api/requests",
        "HTTP 201 Created; status PENDING, urgency HIGH, audit log appended."
    ],
    [
        "T-02",
        "REQ-02: Emergency NLP Auto-Triage",
        "Senior transcript contains 'chest pain' or 'ede novu'",
        "Urgency elevated to CRITICAL_112, status ESCALATED_112, EmergencyRecord logged."
    ],
    [
        "T-03",
        "REQ-03: Verified Volunteer Assignment",
        "Police Admin assigns verified volunteer vol-001 to request",
        "HTTP 200 OK; status ASSIGNED, volunteer activeRequestsCount incremented."
    ],
    [
        "T-04",
        "REQ-04: Unverified Volunteer Assignment Block",
        "Dispatcher attempts to assign PENDING volunteer vol-004",
        "HTTP 400 Bad Request; assignment blocked with error VOLUNTEER_NOT_VERIFIED."
    ],
    [
        "T-05",
        "REQ-05: Volunteer Verification & Badging",
        "Police Admin approves volunteer and assigns badge 'SHR-VOL-105'",
        "HTTP 200 OK; verificationStatus becomes VERIFIED, audit log entry created."
    ],
    [
        "T-06",
        "REQ-06: Illegal State Transition Guard",
        "Attempt to transition RESOLVED request back to PENDING",
        "HTTP 409 Conflict; state machine rejects transition, data remains intact."
    ],
    [
        "T-07",
        "REQ-07: Police Manual 112 Emergency Escalation",
        "Police clicks manual escalate on active request via /api/emergency/manual-escalate",
        "HTTP 200 OK; EmergencyRecord created, status ESCALATED_112, station alarm logged."
    ]
]
populate_table_rows(doc.tables[28], test_data, start_row=1, bold_col_0=True)

# ==============================================================================
# NOW INSERT EXTRA SCHEMA TABLES (emergency_records & audit_logs)
# ==============================================================================
target_p_sec5 = None
for p in doc.paragraphs:
    if "5. Business Logic & Rules" in p.text:
        target_p_sec5 = p
        break

if target_p_sec5:
    h_em = doc.add_paragraph("TABLE: emergency_records", style='Heading 3')
    target_p_sec5._p.addprevious(h_em._p)

    t_em = doc.add_table(rows=1, cols=6)
    t_em.style = 'Table Grid'
    headers_schema = ['Column', 'Type', 'PK / FK', 'Nullable', 'Default', 'Description']
    for c_i, h_txt in enumerate(headers_schema):
        set_header_cell(t_em.rows[0].cells[c_i], h_txt)
    
    em_schema = [
        ["id", "VARCHAR(36)", "PK", "No", "EMG-timestamp", "Unique identifier for emergency incident dossier"],
        ["requestId", "VARCHAR(36)", "FK", "No", "—", "Links to requests.id of escalated emergency"],
        ["seniorName", "VARCHAR(100)", "—", "No", "—", "Victim elderly citizen name"],
        ["location", "VARCHAR(100)", "—", "No", "—", "Incident physical landmark / GPS in Shirva"],
        ["reason", "TEXT", "—", "No", "—", "Clinical emergency symptoms / fall / trauma narrative"],
        ["callerPhone", "VARCHAR(20)", "—", "No", "—", "Phone number of senior or caller"],
        ["escalatedAt", "TIMESTAMP", "—", "No", "CURRENT_TIMESTAMP", "Timestamp when escalated to 112 ERSS"],
        ["escalatedBy", "VARCHAR(100)", "—", "No", "'System'", "Actor initiating escalation (Police Admin or Voice IVR)"],
        ["erss112RefNo", "VARCHAR(50)", "—", "No", "—", "Official ERSS reference tracking ID"],
        ["policeStation", "VARCHAR(50)", "—", "No", "'Shirva PS'", "Jurisdictional police station"],
        ["status", "VARCHAR(30)", "—", "No", "'DISPATCHED'", "Incident response state (DISPATCHED, ATTENDED, CLOSED)"]
    ]
    for row_item in em_schema:
        r = t_em.add_row()
        for c_i, val in enumerate(row_item):
            set_cell(r.cells[c_i], str(val), bold=(c_i == 0))
    target_p_sec5._p.addprevious(t_em._tbl)

    sp1 = doc.add_paragraph()
    target_p_sec5._p.addprevious(sp1._p)

    h_al = doc.add_paragraph("TABLE: audit_logs", style='Heading 3')
    target_p_sec5._p.addprevious(h_al._p)

    t_al = doc.add_table(rows=1, cols=6)
    t_al.style = 'Table Grid'
    for c_i, h_txt in enumerate(headers_schema):
        set_header_cell(t_al.rows[0].cells[c_i], h_txt)
    
    al_schema = [
        ["id", "VARCHAR(36)", "PK", "No", "log-timestamp", "Sequential unique audit event identifier"],
        ["timestamp", "TIMESTAMP", "—", "No", "CURRENT_TIMESTAMP", "Exact ISO-8601 timestamp of domain action"],
        ["action", "VARCHAR(50)", "—", "No", "—", "Action enum: REQUEST_CREATED, VOLUNTEER_ASSIGNED, etc."],
        ["actor", "VARCHAR(100)", "—", "No", "—", "Actor identity: Dispatcher, System AI, PSI Shirva, Volunteer"],
        ["details", "TEXT", "—", "No", "—", "Comprehensive narrative explaining state change and payload"],
        ["targetEntityId", "VARCHAR(36)", "FK", "Yes", "NULL", "ID of modified resource (requestId, volunteerId, etc.)"]
    ]
    for row_item in al_schema:
        r = t_al.add_row()
        for c_i, val in enumerate(row_item):
            set_cell(r.cells[c_i], str(val), bold=(c_i == 0))
    target_p_sec5._p.addprevious(t_al._tbl)

    sp2 = doc.add_paragraph()
    target_p_sec5._p.addprevious(sp2._p)

# Save document
output_path = r'c:\Sahayak\Backend_Document_Template.docx'
doc.save(output_path)
print(f"Successfully generated and saved: {output_path}")
