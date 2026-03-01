# RFID E-Commerce & Wallet Platform (Enhanced)

A comprehensive IoT solution for service purchasing using RFID wallets, featuring atomic transactions, card management, and a premium web dashboard.

## System Architecture
**Dashboard (Web)** ←[HTTP]→ **Backend API (Node.js)** ←[MQTT]→ **ESP8266 (Firmware)**
- **Central Decision-Maker**: The Backend API handles all business logic, balance checks, and database updates.
- **Hardware Integration**: The ESP8266 acts as a merchant terminal, scanning cards and sending them to the backend.

## Hardware-First Security (New Flow)
This project enforces a **Scan-to-Access** security model. The Web Dashboard is locked by default and only opens when a valid RFID tag is scanned via the hardware (ESP8266 or Simulator).

1. **Hardware Scan**: Scans card and notifies the Backend.
2. **Dashboard Unlock**: The Web Dashboard detects the scan and opens the specific user's store session.
3. **Timed Session**: Access expires after 5 minutes of inactivity for security.
4. **Service Purchase**: Once unlocked, users can buy cafeteria meals, print documents, or top-up their balance.

## Setup & Deployment
1. **Backend (Python)**:
   ```bash
   cd backend-api
   pip install -r requirements.txt
   python main.py
   ```
2. **Frontend**: Open `web-dashboard/index.html`. It will show "Terminal Locked" until a card is scanned.


## Safety & Rollback
The system is designed for high reliability. 
> [!NOTE]
> **Standalone MongoDB Support**: By default, this version supports standard standalone MongoDB installations. To enable full Acid-compliant **Atomic Transactions**, you must run MongoDB as a **Replica Set** and re-enable the `session` logic in `index.js`. 

In the current version, the system performs sequential updates (Wallets then Transactions) to ensure compatibility across all environments.

<<<<<<< HEAD
=======
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
>>>>>>> d60f1534b2e46fa8bc3adecd54bc552bb1b0a629

---
*Created for Academic Submission - Production-Ready Standards*
