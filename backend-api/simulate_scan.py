import paho.mqtt.client as mqtt
import json
import time

# --- CONFIG ---
MQTT_BROKER = "157.173.101.159"
TOPIC_SCAN = "rfid/wallet/scan"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(MQTT_BROKER, 1883, 60)

print(f"Simulating RFID Scan on {MQTT_BROKER}...")

# Test UID
test_payload = {
    "rfid_uid": "A1B2C3D4",
    "mode": "purchase"
}

client.publish(TOPIC_SCAN, json.dumps(test_payload))
print("Sent 'A1B2C3D4' scan signal. Check your dashboard!")
client.disconnect()
