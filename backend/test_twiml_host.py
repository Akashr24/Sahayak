import urllib.request
from twilio.rest import Client

TWIML = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Pause length="1"/>
    <Say voice="Polly.Aditi" language="kn-IN">
        Namaskara. Shirva Police Sahayakke swagatha. Nimma samasye heLi, nava kshamavagi keluthiddene. Athava emergencyge 1 otti.
    </Say>
    <Say voice="Polly.Aditi" language="en-IN">
        Welcome to Shirva Police Sahayak helpline. Please speak your requirement clearly after the tone, or press 1 for emergency.
    </Say>
    <Record timeout="10" maxLength="30" playBeep="true"/>
    <Say voice="Polly.Aditi" language="kn-IN">
        Dhanyavadagalu. Nimma korike Shirva Police Niyantrana Kothadige thalupide. Sahayavannu kaluhisalaaguttide.
    </Say>
    <Say voice="Polly.Aditi" language="en-IN">
        Thank you. Your request is registered with Shirva Police. Help is on the way. Please stay safe.
    </Say>
    <Hangup/>
</Response>"""

def upload_twiml():
    req = urllib.request.Request('https://paste.rs', data=TWIML.encode('utf-8'), method='POST')
    with urllib.request.urlopen(req) as resp:
        url = resp.read().decode('utf-8').strip()
        print('Uploaded TwiML URL:', url)
        return url

def make_call(twiml_url: str):
    import os
    sid = os.getenv('TWILIO_ACCOUNT_SID', '')
    token = os.getenv('TWILIO_AUTH_TOKEN', '')
    from_num = os.getenv('TWILIO_PHONE_NUMBER', '')
    to_num = os.getenv('TWILIO_ALERT_NUMBER', '+919945594198')
    
    client = Client(sid, token)
    print(f"Calling {to_num} from {from_num}...")
    call = client.calls.create(
        to=to_num,
        from_=from_num,
        url=twiml_url
    )
    print(f"Call placed successfully! Call SID: {call.sid}, Status: {call.status}")
    return call.sid

if __name__ == '__main__':
    url = upload_twiml()
    make_call(url)
