#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

/**
 * PROJECT: IoT RFID Wallet System
 * COMPONENT: ESP8266 Firmware
 * DESCRIPTION: Reads RFID UID and publishes to MQTT backend.
 */

// --- CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "157.173.101.159"; // Replace with your MQTT Broker address
const int mqtt_port = 1883;

// MQTT Topics
const char* topic_publish = "rfid/wallet/scan";
const char* topic_subscribe = "rfid/wallet/response";

// Hardware Pins (Adjust for your board - D1 Mini/NodeMCU)
#define SS_PIN  D2
#define RST_PIN D1

// --- OBJECTS ---
WiFiClient espClient;
PubSubClient client(espClient);
MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Handle feedback from backend
  // StaticJsonDocument<200> doc;
  // deserializeJson(doc, message);
  // Example: if(doc["status"] == "success") blink green LED
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(topic_subscribe);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("RFID Reader Ready");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Look for new cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Get UID
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.print("RFID UID: ");
  Serial.println(uid);

  // Prepare JSON payload
  StaticJsonDocument<200> doc;
  doc["device_id"] = WiFi.macAddress();
  doc["rfid_uid"] = uid;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);

  // Publish
  if (client.publish(topic_publish, buffer)) {
    Serial.println("Published to MQTT");
  } else {
    Serial.println("Failed to publish");
  }

  delay(2000); // Debounce
}
