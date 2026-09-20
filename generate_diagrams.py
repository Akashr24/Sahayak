import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Set high DPI for crisp images
DPI = 300

os.makedirs('c:/Sahayak/docs_assets', exist_ok=True)

def create_architecture_diagram():
    fig, ax = plt.subplots(figsize=(12, 7.5), dpi=DPI)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Title
    ax.text(50, 96, 'SAHAYAK — System Architecture (Backend Track)', 
            fontsize=15, fontweight='bold', ha='center', va='center', color='#1e293b')

    # Layer 1: Clients & Ingestion
    ax.add_patch(patches.FancyBboxPatch((4, 75), 92, 16, boxstyle="round,pad=1.5", 
                                        ec='#94a3b8', fc='#f8fafc', lw=1.5, ls='--'))
    ax.text(6, 89, 'CLIENT & INGESTION LAYER', fontsize=9, fontweight='bold', color='#64748b')

    # Client boxes
    c1 = patches.FancyBboxPatch((7, 77), 26, 9, boxstyle="round,pad=0.8", ec='#2563eb', fc='#dbeafe', lw=1.5)
    ax.add_patch(c1)
    ax.text(20, 81.5, 'Senior Voice Portal / IVR\n(Kannada, Tulu, English Speech)', fontsize=8.5, ha='center', va='center', color='#1e40af', fontweight='semibold')

    c2 = patches.FancyBboxPatch((37, 77), 26, 9, boxstyle="round,pad=0.8", ec='#16a34a', fc='#dcfce7', lw=1.5)
    ax.add_patch(c2)
    ax.text(50, 81.5, 'Volunteer Portal\n(Task Claim, Status, Availability)', fontsize=8.5, ha='center', va='center', color='#166534', fontweight='semibold')

    c3 = patches.FancyBboxPatch((67, 77), 26, 9, boxstyle="round,pad=0.8", ec='#dc2626', fc='#fee2e2', lw=1.5)
    ax.add_patch(c3)
    ax.text(80, 81.5, 'Police Command Center\n(Verification, Triage, 112 Relay)', fontsize=8.5, ha='center', va='center', color='#991b1b', fontweight='semibold')

    # Arrows down
    for x in [20, 50, 80]:
        ax.annotate('', xy=(x, 68), xytext=(x, 75),
                    arrowprops=dict(arrowstyle="->", lw=2, color='#475569'))
    ax.text(50, 71.5, 'HTTP / REST APIs (JSON)', fontsize=8, ha='center', va='center', color='#475569', backgroundcolor='white')

    # Layer 2: API Gateway & Middleware
    ax.add_patch(patches.FancyBboxPatch((4, 52), 92, 16, boxstyle="round,pad=1.5", 
                                        ec='#3b82f6', fc='#eff6ff', lw=1.5))
    ax.text(6, 65.5, 'API GATEWAY & MIDDLEWARE LAYER (Node.js / Express)', fontsize=9, fontweight='bold', color='#1d4ed8')

    m1 = patches.FancyBboxPatch((7, 54), 26, 9, boxstyle="round,pad=0.8", ec='#3b82f6', fc='#ffffff', lw=1.2)
    ax.add_patch(m1)
    ax.text(20, 58.5, 'CORS & Security Controls\nRate Limiting & Headers', fontsize=8, ha='center', va='center', color='#1e293b')

    m2 = patches.FancyBboxPatch((37, 54), 26, 9, boxstyle="round,pad=0.8", ec='#e11d48', fc='#fff1f2', lw=1.2)
    ax.add_patch(m2)
    ax.text(50, 58.5, 'Emergency NLP Scanner\n(Kannada/Tulu Triage Engine)', fontsize=8, ha='center', va='center', color='#9f1239', fontweight='bold')

    m3 = patches.FancyBboxPatch((67, 54), 26, 9, boxstyle="round,pad=0.8", ec='#3b82f6', fc='#ffffff', lw=1.2)
    ax.add_patch(m3)
    ax.text(80, 58.5, 'Auth & RBAC Guards\n(Station & Volunteer Verification)', fontsize=8, ha='center', va='center', color='#1e293b')

    # Arrows down
    for x in [20, 50, 80]:
        ax.annotate('', xy=(x, 45), xytext=(x, 52),
                    arrowprops=dict(arrowstyle="->", lw=2, color='#475569'))

    # Layer 3: Core Domain Services
    ax.add_patch(patches.FancyBboxPatch((4, 25), 92, 19, boxstyle="round,pad=1.5", 
                                        ec='#6366f1', fc='#eef2ff', lw=1.5))
    ax.text(6, 41.5, 'CORE APPLICATION SERVICES (Business Rules & Orchestration)', fontsize=9, fontweight='bold', color='#4338ca')

    s1 = patches.FancyBboxPatch((7, 27), 20, 12, boxstyle="round,pad=0.8", ec='#6366f1', fc='#ffffff', lw=1.2)
    ax.add_patch(s1)
    ax.text(17, 33, 'Senior Registry &\nRequest Dispatcher\n• Proximity Matching\n• Routine/High Triage', fontsize=7.5, ha='center', va='center', color='#1e293b')

    s2 = patches.FancyBboxPatch((29.5, 27), 20, 12, boxstyle="round,pad=0.8", ec='#6366f1', fc='#ffffff', lw=1.2)
    ax.add_patch(s2)
    ax.text(39.5, 33, 'Volunteer Verification\n& Lifecycle Engine\n• KYC & Station Badging\n• Availability Management', fontsize=7.5, ha='center', va='center', color='#1e293b')

    s3 = patches.FancyBboxPatch((52, 27), 19, 12, boxstyle="round,pad=0.8", ec='#dc2626', fc='#fef2f2', lw=1.2)
    ax.add_patch(s3)
    ax.text(61.5, 33, '112 Emergency\nEscalation Manager\n• Preemption Handler\n• Station Alert Broadcast', fontsize=7.5, ha='center', va='center', color='#991b1b', fontweight='bold')

    s4 = patches.FancyBboxPatch((73, 27), 20, 12, boxstyle="round,pad=0.8", ec='#059669', fc='#ecfdf5', lw=1.2)
    ax.add_patch(s4)
    ax.text(83, 33, 'Audit Trail &\nCompliance Engine\n• Immutable Event Stream\n• Police Oversight Log', fontsize=7.5, ha='center', va='center', color='#065f46')

    # Layer 4: Storage & External Services
    ax.annotate('', xy=(30, 18), xytext=(30, 25), arrowprops=dict(arrowstyle="->", lw=2, color='#475569'))
    ax.annotate('', xy=(70, 18), xytext=(70, 25), arrowprops=dict(arrowstyle="->", lw=2, color='#475569'))

    d1 = patches.FancyBboxPatch((6, 4), 48, 14, boxstyle="round,pad=1.2", ec='#0f766e', fc='#f0fdfa', lw=1.5)
    ax.add_patch(d1)
    ax.text(30, 14, 'DATA STORAGE LAYER (In-Memory Repository & Models)', fontsize=8.5, fontweight='bold', ha='center', color='#0f766e')
    ax.text(30, 8.5, 'SeniorCitizens | Volunteers | Requests | EmergencyRecords | AuditLogs\n(Structured Schemas with JSON State Snapshots)', fontsize=7.5, ha='center', va='center', color='#134e4a')

    d2 = patches.FancyBboxPatch((58, 4), 38, 14, boxstyle="round,pad=1.2", ec='#b45309', fc='#fffbeb', lw=1.5)
    ax.add_patch(d2)
    ax.text(77, 14, 'EXTERNAL SERVICES & GATEWAYS', fontsize=8.5, fontweight='bold', ha='center', color='#b45309')
    ax.text(77, 8.5, '• ERSS 112 Emergency Dispatch Webhook\n• Shirva Police Station Terminal Alarm\n• IVR Speech Recognition Adapter', fontsize=7.5, ha='center', va='center', color='#78350f')

    plt.tight_layout()
    plt.savefig('c:/Sahayak/docs_assets/architecture_diagram.png', dpi=DPI, bbox_inches='tight')
    plt.close()
    print("Architecture diagram created.")

def create_workflow_diagram():
    fig, ax = plt.subplots(figsize=(12, 8.5), dpi=DPI)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 97, 'SAHAYAK — Core Backend Workflows', fontsize=15, fontweight='bold', ha='center', color='#1e293b')

    # Workflow 1: Call Ingestion & Triage
    ax.text(5, 92, 'WORKFLOW 1: Senior Citizen Request Ingestion & Auto-Triage', fontsize=10, fontweight='bold', color='#1d4ed8')
    ax.add_patch(patches.FancyBboxPatch((5, 76), 18, 13, boxstyle="round,pad=0.5", ec='#2563eb', fc='#eff6ff', lw=1.2))
    ax.text(14, 82.5, 'Senior Voice / Call\n(Kannada / Tulu / Eng)', fontsize=7.5, ha='center', va='center')

    ax.annotate('', xy=(27, 82.5), xytext=(23, 82.5), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((27, 76), 20, 13, boxstyle="round,pad=0.5", ec='#e11d48', fc='#fff1f2', lw=1.2))
    ax.text(37, 82.5, 'Keyword NLP Scanner\nEmergency Detection?', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#9f1239')

    # Branch 1: Yes -> Emergency
    ax.annotate('YES: Cardiac, Fall, etc.', xy=(51, 87), xytext=(47, 84), arrowprops=dict(arrowstyle="->", lw=1.5, color='#dc2626'))
    ax.add_patch(patches.FancyBboxPatch((51, 83), 22, 10, boxstyle="round,pad=0.5", ec='#dc2626', fc='#fee2e2', lw=1.2))
    ax.text(62, 88, 'CRITICAL_112 Trigger\n• Create EmergencyRecord\n• Alert 112 & Police Console', fontsize=7.2, ha='center', va='center', color='#991b1b', fontweight='bold')

    # Branch 2: No -> Routine
    ax.annotate('NO: Routine / Medicines', xy=(51, 78), xytext=(47, 81), arrowprops=dict(arrowstyle="->", lw=1.5, color='#16a34a'))
    ax.add_patch(patches.FancyBboxPatch((51, 74), 22, 9, boxstyle="round,pad=0.5", ec='#16a34a', fc='#dcfce7', lw=1.2))
    ax.text(62, 78.5, 'Category & Urgency Assigned\n(Medicines, Groceries, Transport)\nStatus: PENDING', fontsize=7.2, ha='center', va='center', color='#166534')

    ax.annotate('', xy=(77, 81), xytext=(73, 81), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))
    ax.add_patch(patches.FancyBboxPatch((77, 76), 18, 12, boxstyle="round,pad=0.5", ec='#059669', fc='#f0fdf4', lw=1.2))
    ax.text(86, 82, 'Append to Audit Log\n& Emit Real-Time\nDashboard Update', fontsize=7.2, ha='center', va='center')

    # Workflow 2: Volunteer Verification
    ax.text(5, 68, 'WORKFLOW 2: Volunteer Registration & Police Verification Gateway', fontsize=10, fontweight='bold', color='#0f766e')
    
    ax.add_patch(patches.FancyBboxPatch((5, 53), 18, 12, boxstyle="round,pad=0.5", ec='#0f766e', fc='#f0fdfa', lw=1.2))
    ax.text(14, 59, 'Volunteer Submits Form\n(Name, Org, Aadhaar, Skills)\nStatus: PENDING', fontsize=7.2, ha='center', va='center')

    ax.annotate('', xy=(27, 59), xytext=(23, 59), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((27, 53), 22, 12, boxstyle="round,pad=0.5", ec='#0f766e', fc='#f0fdfa', lw=1.2))
    ax.text(38, 59, 'Shirva Police Station Review\n• Background verification\n• Org endorsement check', fontsize=7.2, ha='center', va='center')

    ax.annotate('', xy=(53, 59), xytext=(49, 59), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((53, 53), 22, 12, boxstyle="round,pad=0.5", ec='#16a34a', fc='#dcfce7', lw=1.2))
    ax.text(64, 59, 'Police Approve & Badge\nAssign: SHR-VOL-xxx\nStatus: VERIFIED', fontsize=7.2, ha='center', va='center', fontweight='bold', color='#166534')

    ax.annotate('', xy=(79, 59), xytext=(75, 59), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((79, 53), 16, 12, boxstyle="round,pad=0.5", ec='#059669', fc='#ecfdf5', lw=1.2))
    ax.text(87, 59, 'Eligible for Dispatch\nVolunteer Toggles\nisAvailable = true', fontsize=7.2, ha='center', va='center')

    # Workflow 3: Request Dispatch & Fulfillment
    ax.text(5, 45, 'WORKFLOW 3: Volunteer Assignment, Task Execution & Resolution', fontsize=10, fontweight='bold', color='#7c3aed')

    ax.add_patch(patches.FancyBboxPatch((5, 29), 18, 12, boxstyle="round,pad=0.5", ec='#7c3aed', fc='#f5f3ff', lw=1.2))
    ax.text(14, 35, 'PENDING Request\nProximity & Skill Match\nFind Available Vol.', fontsize=7.2, ha='center', va='center')

    ax.annotate('', xy=(27, 35), xytext=(23, 35), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((27, 29), 20, 12, boxstyle="round,pad=0.5", ec='#7c3aed', fc='#f5f3ff', lw=1.2))
    ax.text(37, 35, 'PUT /api/requests/:id/assign\nStatus: ASSIGNED\nNotify Assigned Vol.', fontsize=7.2, ha='center', va='center')

    ax.annotate('', xy=(51, 35), xytext=(47, 35), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((51, 29), 20, 12, boxstyle="round,pad=0.5", ec='#7c3aed', fc='#f5f3ff', lw=1.2))
    ax.text(61, 35, 'Task Execution\nStatus: IN_PROGRESS\n(Vol. delivers medicines/help)', fontsize=7.2, ha='center', va='center')

    ax.annotate('', xy=(75, 35), xytext=(71, 35), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((75, 29), 20, 12, boxstyle="round,pad=0.5", ec='#16a34a', fc='#dcfce7', lw=1.2))
    ax.text(85, 35, 'PUT /status -> RESOLVED\nRecord resolvedAt\nLog to Audit Trail', fontsize=7.2, ha='center', va='center', fontweight='bold', color='#166534')

    # Workflow 4: Emergency Escalation & Oversight
    ax.text(5, 21, 'WORKFLOW 4: Police 112 Emergency Escalation & Record-Keeping', fontsize=10, fontweight='bold', color='#dc2626')

    ax.add_patch(patches.FancyBboxPatch((5, 5), 20, 12, boxstyle="round,pad=0.5", ec='#dc2626', fc='#fee2e2', lw=1.2))
    ax.text(15, 11, 'Trigger Event\n(NLP Emergency OR\nPolice Manual Button)', fontsize=7.2, ha='center', va='center', color='#991b1b', fontweight='bold')

    ax.annotate('', xy=(29, 11), xytext=(25, 11), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((29, 5), 22, 12, boxstyle="round,pad=0.5", ec='#dc2626', fc='#fee2e2', lw=1.2))
    ax.text(40, 11, 'POST /emergency/manual-escalate\n• Status -> ESCALATED_112\n• Set escalatedTo112 = true', fontsize=7.2, ha='center', va='center', color='#991b1b')

    ax.annotate('', xy=(55, 11), xytext=(51, 11), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((55, 5), 22, 12, boxstyle="round,pad=0.5", ec='#b45309', fc='#fffbeb', lw=1.2))
    ax.text(66, 11, 'Emergency Record Created\nTimestamp, Audio Transcript,\nVictim Location & PHC Alert', fontsize=7.2, ha='center', va='center', color='#78350f')

    ax.annotate('', xy=(81, 11), xytext=(77, 11), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((81, 5), 15, 12, boxstyle="round,pad=0.5", ec='#1e293b', fc='#f1f5f9', lw=1.2))
    ax.text(88.5, 11, 'GET /emergency/records\nPolice Review &\nJudicial Oversight', fontsize=7.2, ha='center', va='center', color='#1e293b', fontweight='bold')

    plt.tight_layout()
    plt.savefig('c:/Sahayak/docs_assets/workflow_diagram.png', dpi=DPI, bbox_inches='tight')
    plt.close()
    print("Workflow diagram created.")

def create_er_diagram():
    fig, ax = plt.subplots(figsize=(12, 8), dpi=DPI)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, 'SAHAYAK — Entity Relationship (ER) Diagram', fontsize=15, fontweight='bold', ha='center', color='#1e293b')

    # Entity 1: SeniorCitizen
    ax.add_patch(patches.FancyBboxPatch((4, 56), 26, 34, boxstyle="round,pad=0.8", ec='#2563eb', fc='#f8fafc', lw=1.5))
    ax.add_patch(patches.Rectangle((4, 83), 26, 7, ec='#2563eb', fc='#2563eb'))
    ax.text(17, 86.5, 'SENIOR_CITIZEN', fontsize=9, fontweight='bold', color='white', ha='center')
    sc_fields = [
        'PK  id (VARCHAR)',
        '    name (VARCHAR)',
        '    age (INTEGER)',
        '    phone (VARCHAR)',
        '    address (TEXT)',
        '    location (VARCHAR)',
        '    preferredLanguage (VARCHAR)',
        '    emergencyContact (TEXT)',
        '    medicalNotes (TEXT)',
        '    totalRequestsMade (INT)',
        '    registeredAt (TIMESTAMP)'
    ]
    for i, f in enumerate(sc_fields):
        ax.text(5.5, 80 - (i * 2.3), f, fontsize=7, color='#1e293b')

    # Entity 2: Volunteer
    ax.add_patch(patches.FancyBboxPatch((70, 56), 26, 34, boxstyle="round,pad=0.8", ec='#16a34a', fc='#f8fafc', lw=1.5))
    ax.add_patch(patches.Rectangle((70, 83), 26, 7, ec='#16a34a', fc='#16a34a'))
    ax.text(83, 86.5, 'VOLUNTEER', fontsize=9, fontweight='bold', color='white', ha='center')
    vol_fields = [
        'PK  id (VARCHAR)',
        '    name (VARCHAR)',
        '    phone (VARCHAR)',
        '    organization (VARCHAR)',
        '    skills (ARRAY/TEXT)',
        '    location (VARCHAR)',
        '    verificationStatus (ENUM)',
        '    policeBadgeNo (VARCHAR)',
        '    isAvailable (BOOLEAN)',
        '    rating (FLOAT)',
        '    notes (TEXT)',
        '    registeredAt (TIMESTAMP)'
    ]
    for i, f in enumerate(vol_fields):
        ax.text(71.5, 80 - (i * 2.1), f, fontsize=7, color='#1e293b')

    # Entity 3: ServiceRequest (Center)
    ax.add_patch(patches.FancyBboxPatch((35, 45), 30, 42, boxstyle="round,pad=0.8", ec='#7c3aed', fc='#f8fafc', lw=1.8))
    ax.add_patch(patches.Rectangle((35, 80), 30, 7, ec='#7c3aed', fc='#7c3aed'))
    ax.text(50, 83.5, 'SERVICE_REQUEST', fontsize=9.5, fontweight='bold', color='white', ha='center')
    req_fields = [
        'PK  id (VARCHAR)',
        'FK  seniorId / seniorPhone',
        '    seniorName (VARCHAR)',
        '    location (VARCHAR)',
        '    category (ENUM)',
        '    urgency (ENUM)',
        '    description (TEXT)',
        '    status (ENUM)',
        'FK  assignedVolunteerId (VARCHAR)',
        '    assignedVolunteerName (VARCHAR)',
        '    escalatedTo112 (BOOLEAN)',
        '    audioNotes (TEXT)',
        '    createdAt (TIMESTAMP)',
        '    resolvedAt (TIMESTAMP)'
    ]
    for i, f in enumerate(req_fields):
        ax.text(36.5, 77 - (i * 2.2), f, fontsize=7, color='#1e293b')

    # Entity 4: EmergencyRecord
    ax.add_patch(patches.FancyBboxPatch((8, 6), 34, 30, boxstyle="round,pad=0.8", ec='#dc2626', fc='#f8fafc', lw=1.5))
    ax.add_patch(patches.Rectangle((8, 29), 34, 7, ec='#dc2626', fc='#dc2626'))
    ax.text(25, 32.5, 'EMERGENCY_RECORD', fontsize=9, fontweight='bold', color='white', ha='center')
    em_fields = [
        'PK  id (VARCHAR)',
        'FK  requestId (VARCHAR)',
        '    seniorName (VARCHAR)',
        '    location (VARCHAR)',
        '    reason (TEXT)',
        '    callerPhone (VARCHAR)',
        '    escalatedAt (TIMESTAMP)',
        '    escalatedBy (VARCHAR)',
        '    erss112RefNo (VARCHAR)',
        '    policeStation (VARCHAR)',
        '    status (VARCHAR)'
    ]
    for i, f in enumerate(em_fields):
        ax.text(9.5, 26 - (i * 2.2), f, fontsize=7, color='#1e293b')

    # Entity 5: AuditLog
    ax.add_patch(patches.FancyBboxPatch((58, 6), 36, 30, boxstyle="round,pad=0.8", ec='#059669', fc='#f8fafc', lw=1.5))
    ax.add_patch(patches.Rectangle((58, 29), 36, 7, ec='#059669', fc='#059669'))
    ax.text(76, 32.5, 'AUDIT_LOG', fontsize=9, fontweight='bold', color='white', ha='center')
    log_fields = [
        'PK  id (VARCHAR)',
        '    timestamp (TIMESTAMP)',
        '    action (VARCHAR)',
        '    actor (VARCHAR)',
        '    details (TEXT)',
        'FK  targetEntityId (VARCHAR)',
        '    ipAddress (VARCHAR)',
        '    metadata (JSON)'
    ]
    for i, f in enumerate(log_fields):
        ax.text(59.5, 26 - (i * 2.5), f, fontsize=7, color='#1e293b')

    # Relationships Lines
    # SeniorCitizen -> ServiceRequest (1 to Many)
    ax.annotate('', xy=(35, 70), xytext=(30, 70), arrowprops=dict(arrowstyle="<|-", lw=1.8, color='#2563eb'))
    ax.text(31, 72, '1 : N', fontsize=7.5, fontweight='bold', color='#2563eb')

    # Volunteer -> ServiceRequest (1 to Many)
    ax.annotate('', xy=(65, 70), xytext=(70, 70), arrowprops=dict(arrowstyle="-|>", lw=1.8, color='#16a34a'))
    ax.text(66, 72, '0..1 : N', fontsize=7.5, fontweight='bold', color='#16a34a')

    # ServiceRequest -> EmergencyRecord (1 to 1)
    ax.annotate('', xy=(25, 36), xytext=(40, 45), arrowprops=dict(arrowstyle="-|>", lw=1.8, color='#dc2626'))
    ax.text(31, 40, '1 : 0..1', fontsize=7.5, fontweight='bold', color='#dc2626')

    # System Entities -> AuditLog (1 to Many)
    ax.annotate('', xy=(68, 36), xytext=(55, 45), arrowprops=dict(arrowstyle="-|>", lw=1.8, color='#059669'))
    ax.text(62, 40, 'Tracks All', fontsize=7.5, fontweight='bold', color='#059669')

    plt.tight_layout()
    plt.savefig('c:/Sahayak/docs_assets/er_diagram.png', dpi=DPI, bbox_inches='tight')
    plt.close()
    print("ER diagram created.")

def create_state_transition_diagram():
    fig, ax = plt.subplots(figsize=(12, 7.5), dpi=DPI)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, 'SAHAYAK — State Transition Diagrams', fontsize=15, fontweight='bold', ha='center', color='#1e293b')

    # Sub-diagram 1: Volunteer Verification Lifecycle
    ax.text(5, 88, '1. VOLUNTEER VERIFICATION & AVAILABILITY STATE MACHINE', fontsize=9.5, fontweight='bold', color='#0f766e')
    
    # State: PENDING
    ax.add_patch(patches.FancyBboxPatch((6, 68), 18, 12, boxstyle="round,pad=0.6", ec='#b45309', fc='#fef3c7', lw=1.5))
    ax.text(15, 74, 'PENDING\n(Self-Registered)', fontsize=8, ha='center', va='center', fontweight='bold', color='#78350f')

    # Transition to VERIFIED
    ax.annotate('Police Station Approval\n(Assign Badge SHR-VOL-xxx)', xy=(34, 76), xytext=(24, 76),
                arrowprops=dict(arrowstyle="->", lw=1.5, color='#16a34a'))
    ax.text(29, 80, 'Approve', fontsize=7, fontweight='bold', color='#16a34a', ha='center')

    # State: VERIFIED / ACTIVE
    ax.add_patch(patches.FancyBboxPatch((34, 68), 22, 12, boxstyle="round,pad=0.6", ec='#16a34a', fc='#dcfce7', lw=1.5))
    ax.text(45, 74, 'VERIFIED (ON-DUTY)\nisAvailable = true\nEligible for Dispatch', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#166534')

    # Toggle to OFF-DUTY
    ax.annotate('Toggle Off', xy=(66, 78), xytext=(56, 78), arrowprops=dict(arrowstyle="->", lw=1.5, color='#64748b'))
    ax.annotate('Toggle On', xy=(56, 70), xytext=(66, 70), arrowprops=dict(arrowstyle="->", lw=1.5, color='#16a34a'))

    # State: OFF-DUTY
    ax.add_patch(patches.FancyBboxPatch((66, 68), 22, 12, boxstyle="round,pad=0.6", ec='#64748b', fc='#f1f5f9', lw=1.5))
    ax.text(77, 74, 'VERIFIED (OFF-DUTY)\nisAvailable = false\nNot Eligible for Dispatch', fontsize=7.5, ha='center', va='center', color='#334155')

    # Rejection transition
    ax.annotate('Reject (Bad KYC/Record)', xy=(15, 52), xytext=(15, 68), arrowprops=dict(arrowstyle="->", lw=1.5, color='#dc2626'))
    ax.add_patch(patches.FancyBboxPatch((6, 42), 18, 10, boxstyle="round,pad=0.6", ec='#dc2626', fc='#fee2e2', lw=1.5))
    ax.text(15, 47, 'REJECTED\n(Cannot Receive Requests)', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#991b1b')

    # Sub-diagram 2: Service Request Lifecycle
    ax.text(5, 34, '2. SERVICE REQUEST LIFECYCLE & EMERGENCY OVERRIDE', fontsize=9.5, fontweight='bold', color='#7c3aed')

    # Request States: PENDING -> ASSIGNED -> IN_PROGRESS -> RESOLVED
    ax.add_patch(patches.FancyBboxPatch((4, 14), 16, 12, boxstyle="round,pad=0.5", ec='#2563eb', fc='#eff6ff', lw=1.5))
    ax.text(12, 20, 'PENDING\n(Created via IVR/Web)', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#1e40af')

    ax.annotate('Dispatcher Assigns\nVerified Volunteer', xy=(28, 20), xytext=(20, 20), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((28, 14), 18, 12, boxstyle="round,pad=0.5", ec='#7c3aed', fc='#f5f3ff', lw=1.5))
    ax.text(37, 20, 'ASSIGNED\n(Volunteer Notified)', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#5b21b6')

    ax.annotate('Volunteer Starts Task', xy=(54, 20), xytext=(46, 20), arrowprops=dict(arrowstyle="->", lw=1.5, color='#475569'))

    ax.add_patch(patches.FancyBboxPatch((54, 14), 18, 12, boxstyle="round,pad=0.5", ec='#f59e0b', fc='#fffbeb', lw=1.5))
    ax.text(63, 20, 'IN_PROGRESS\n(Delivering Medicines/etc)', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#92400e')

    ax.annotate('Fulfill Request', xy=(80, 20), xytext=(72, 20), arrowprops=dict(arrowstyle="->", lw=1.5, color='#16a34a'))

    ax.add_patch(patches.FancyBboxPatch((80, 14), 16, 12, boxstyle="round,pad=0.5", ec='#16a34a', fc='#dcfce7', lw=1.5))
    ax.text(88, 20, 'RESOLVED\n(Terminal State,\nImmutable Log)', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#166534')

    # Emergency Override Arrow from PENDING or IN_PROGRESS to ESCALATED_112
    ax.annotate('Emergency Keyword OR Police Override', xy=(45, 4), xytext=(12, 14),
                arrowprops=dict(arrowstyle="->", lw=1.8, color='#dc2626', connectionstyle="arc3,rad=0.2"))
    ax.annotate('', xy=(50, 4), xytext=(63, 14),
                arrowprops=dict(arrowstyle="->", lw=1.8, color='#dc2626', connectionstyle="arc3,rad=-0.2"))

    ax.add_patch(patches.FancyBboxPatch((36, 0.5), 28, 9, boxstyle="round,pad=0.5", ec='#dc2626', fc='#fee2e2', lw=1.8))
    ax.text(50, 5, 'ESCALATED_112 (Emergency Incident)\n112 Dispatched + Police Station Actioned', fontsize=7.5, ha='center', va='center', fontweight='bold', color='#991b1b')

    plt.tight_layout()
    plt.savefig('c:/Sahayak/docs_assets/state_transition_diagram.png', dpi=DPI, bbox_inches='tight')
    plt.close()
    print("State transition diagram created.")

create_architecture_diagram()
create_workflow_diagram()
create_er_diagram()
create_state_transition_diagram()
print("All 4 diagrams generated successfully.")
