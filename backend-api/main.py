import os
import json
import time
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import paho.mqtt.client as mqtt
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MQTT_BROKER = "157.173.101.159"
MQTT_PORT = 1883
TOPIC_SCAN = "rfid/wallet/scan"
TOPIC_RESPONSE = "rfid/wallet/response"

# --- DATABASE ---
client = MongoClient(MONGO_URI)
db = client["rfid_commerce"]
wallets = db["wallets"]
transactions = db["transactions"]
products = db["products"]

# --- GLOBAL STATE (Last Scanned Card) ---
active_session = {
    "rfid_uid": None,
    "last_scan_time": 0,
    "user_data": None
}

def seed_products():
    if products.count_documents({}) == 0:
        items = [
            {"name": "School Cafeteria Meal", "price": 50, "category": "Food"},
            {"name": "Library Print (B&W)", "price": 5, "category": "Service"},
            {"name": "1GB Campus WiFi", "price": 100, "category": "Internet"},
            {"name": "Student Gala Ticket", "price": 500, "category": "Event"}
        ]
        products.insert_many(items)

seed_products()

# --- MQTT SETUP ---
def on_connect(client, userdata, flags, rc, properties=None):
    print(f"Connected to MQTT Broker with result code {rc}")
    client.subscribe(TOPIC_SCAN)

def on_message(client, userdata, msg):
    global active_session
    try:
        data = json.loads(msg.payload.decode())
        uid = data.get("rfid_uid")
        print(f"Hardware Scan Detected: {uid}")
        
        # Look up or create wallet
        wallet = wallets.find_one({"rfid_uid": uid})
        if not wallet:
            wallet = {
                "rfid_uid": uid,
                "balance": 200,
                "user_name": "New student",
                "status": "active"
            }
            wallets.insert_one(wallet)
        
        # Update session
        active_session["rfid_uid"] = uid
        active_session["last_scan_time"] = time.time()
        active_session["user_data"] = {
            "uid": uid,
            "balance": wallet["balance"],
            "status": wallet["status"]
        }
        
        # Publish feedback to hardware
        response = {"status": "success", "message": f"Welcome {uid}", "balance": wallet["balance"]}
        client.publish(TOPIC_RESPONSE, json.dumps(response))
        
    except Exception as e:
        print(f"Error processing MQTT: {e}")

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def start_mqtt():
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_forever()

threading.Thread(target=start_mqtt, daemon=True).start()

# --- API ENDPOINTS ---

@app.route("/api/session", methods=["GET"])
def get_session():
    """Checks if a card was recently scanned to 'unlock' the dashboard"""
    # Session stays active for 5 minutes after hardware scan
    if time.time() - active_session["last_scan_time"] < 300:
        return jsonify(active_session)
    return jsonify({"rfid_uid": None})

@app.route("/api/session/logout", methods=["POST"])
def logout():
    global active_session
    active_session = {"rfid_uid": None, "last_scan_time": 0, "user_data": None}
    return jsonify({"success": True})

@app.route("/api/products", methods=["GET"])
def get_products():
    items = list(products.find())
    for item in items:
        item["_id"] = str(item["_id"])
    return jsonify(items)

@app.route("/api/purchase", methods=["POST"])
def purchase():
    data = request.json
    uid = data.get("uid")
    product_id = data.get("product_id")
    
    wallet = wallets.find_one({"rfid_uid": uid})
    product = products.find_one({"_id": ObjectId(product_id)})
    
    if not wallet or wallet["status"] == "blocked":
        return jsonify({"success": False, "message": "Card Blocked/Invalid"})
    
    if wallet["balance"] < product["price"]:
        return jsonify({"success": False, "message": "Insufficient Balance"})
    
    # Atomic-ish update (Simplified for local Mongo)
    wallets.update_one({"rfid_uid": uid}, {"$inc": {"balance": -product["price"]}})
    
    transactions.insert_one({
        "rfid_uid": uid,
        "amount": product["price"],
        "type": "debit",
        "description": f"Bought {product['name']}",
        "timestamp": time.time()
    })
    
    return jsonify({"success": True, "new_balance": wallet["balance"] - product["price"]})

@app.route("/api/topup", methods=["POST"])
def topup():
    data = request.json
    uid = data.get("uid")
    amount = data.get("amount", 100)
    
    wallets.update_one({"rfid_uid": uid}, {"$inc": {"balance": amount}})
    transactions.insert_one({
        "rfid_uid": uid,
        "amount": amount,
        "type": "credit",
        "description": "Dashboard Top-up",
        "timestamp": time.time()
    })
    return jsonify({"success": True})

@app.route("/api/history/<uid>", methods=["GET"])
def history(uid):
    logs = list(transactions.find({"rfid_uid": uid}).sort("timestamp", -1).limit(10))
    for log in logs:
        log["_id"] = str(log["_id"])
    return jsonify(logs)

if __name__ == "__main__":
    app.run(port=5000, debug=True)
