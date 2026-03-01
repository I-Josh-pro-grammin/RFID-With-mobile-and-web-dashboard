# RFID Wallet System

A complete IoT RFID Wallet System for secure, contactless payments.

## System Overview
This project implements a decentralized wallet system where RFID tags act as digital wallets. The system provides atomic transaction processing, a live monitoring dashboard, and secure MQTT-based hardware communication.

## Architecture
The system follows a hub-and-spoke architecture:
`Dashboard (Web) ←[HTTP]→ Backend API (Node.js) ←[MQTT]→ ESP8266 (Firmware) ←[SPI]→ RFID Reader`

- **Dashboard**: Pure HTML/CSS/JS interface for viewing balances and transaction history.
- **Backend API**: Central decision-maker using Express and MongoDB. Manages wallet states and logs transactions.
- **MQTT Broker**: Facilitates asynchronous communication between hardware and backend.
- **ESP8266**: Edge device that reads RFID UIDs and sends them for processing.

## Technologies Used
- **Firmware**: Arduino/C++, ESP8266WiFi, PubSubClient, MFRC522, ArduinoJson.
- **Backend**: Node.js, Express, MongoDB (Mongoose), MQTT.js.
- **Frontend**: Vanilla HTML5, CSS3 (Custom Design System), JavaScript (Fetch API).
- **Communication**: MQTT for IoT, REST (JSON/HTTP) for Web.

## Safe Wallet Update
The system uses **MongoDB Transactions (Sessions)** to ensure atomicity. When a card is scanned:
1. A transaction session starts.
2. The wallet balance is checked.
3. If sufficient, the balance is deducted and a transaction log is created.
4. The session is committed. If any step fails, the entire operation is rolled back, preventing data inconsistency.

## Installation & Setup

### 1. Backend API
```bash
cd backend-api
npm install
# Configure .env with your MongoDB URI and MQTT Broker
npm start
```

### 2. Web Dashboard
- Open `web-dashboard/index.html` in any modern browser.
- Ensure the `API_URL` in the `<script>` tag matches your backend's address.

### 3. ESP8266 Firmware
- Open `esp8266-firmware/esp8266-firmware.ino` in Arduino IDE.
- Install libraries: `PubSubClient`, `MFRC522`, `ArduinoJson`.
- Update WiFi and MQTT credentials in the configuration section.
- Upload to your ESP8266 board.

## API Endpoints Summary
- `GET /api/wallets`: List all registered wallets and balances.
- `GET /api/transactions`: Retrieve the 50 most recent transactions.
- `POST /api/wallets/topup`: Manually add balance to a card (Body: `{ rfidUid, amount }`).

## Live Web Dashboard
http://157.173.101.159:8240

---
*Developed for University Capstone Submission*
