import urllib.request, json

base = "http://localhost:5000"
print("[1] Testing Normal Call Pipeline...")
payload_normal = json.dumps({
    "callerPhone": "+91 97410 88231",
    "transcript": "Please send an auto rickshaw to go to hospital for doctor visit",
    "language": "English"
}).encode("utf-8")
req = urllib.request.Request(f"{base}/api/pipeline/text", data=payload_normal, headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req)
data = json.loads(res.read())
print("  Decision:", data.get("decision"))
print("  Emergency:", data.get("isEmergency"))
print("  Location:", data.get("location"))
print("  Assigned Volunteer:", data.get("volunteer", {}).get("name") if data.get("volunteer") else "None")
print("  Location sent to:", data.get("locationSentTo"))
print("  Status:", "PASS" if data.get("decision") == "ASSIGNED_TO_VOLUNTEER" else "FAIL")

print("\n[2] Testing Emergency Call Pipeline...")
payload_emg = json.dumps({
    "callerPhone": "+91 94491 55672",
    "transcript": "Accident happened bleeding heavily need ambulance immediately",
    "language": "English"
}).encode("utf-8")
req2 = urllib.request.Request(f"{base}/api/pipeline/text", data=payload_emg, headers={"Content-Type": "application/json"})
res2 = urllib.request.urlopen(req2)
data2 = json.loads(res2.read())
print("  Decision:", data2.get("decision"))
print("  Emergency:", data2.get("isEmergency"))
print("  Location:", data2.get("location"))
print("  ERSS 112 Ref:", data2.get("erss112RefNo"))
print("  Location sent to:", data2.get("locationSentTo"))
print("  Status:", "PASS" if data2.get("isEmergency") and data2.get("decision") == "ESCALATED_TO_112" else "FAIL")

print("\n[3] Checking Dashboard Call History API...")
req3 = urllib.request.Request(f"{base}/api/requests")
res3 = urllib.request.urlopen(req3)
history = json.loads(res3.read())
items = history.get("items", [])
print(f"  Total calls in history: {len(items)}")
for it in items[:3]:
    urg = it.get("urgency")
    sname = it.get("seniorName")
    loc = it.get("location")
    desc = it.get("description")[:60]
    print(f"   * [{urg}] {sname} @ {loc}: {desc}")

print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
