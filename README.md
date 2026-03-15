# RFID E-Commerce & Terminal System (Hardware-Locked)

A professional, academic-grade IoT RFID Wallet and E-Commerce platform. This system enforces a **Hardware-First** security model where the dashboard (Web or Mobile) remains locked until an RFID card is scanned via the physical merchant terminal.

## 🔒 Hardware-First Security Flow
Unlike traditional apps, this system requires physical presence:
1. **Locked State**: The Web Dashboard and Mobile App stay on a "Terminal Locked" screen by default.
2. **Physical Scan**: When a student/user scans their RFID card on the ESP8266 reader, a `POST` is sent to the MQTT broker.
3. **Session Unlock**: The Python Backend (main.py) detects the scan, validates the card, and "unlocks" a 5-minute interactive session on the Dashboards.
4. **Service Purchase**: Once unlocked, the merchant/user can process purchases for Cafeteria meals, Printing services, and more.
5. **Auto-Lock**: The session automatically locks after 5 minutes of inactivity or by manually pressing the "Log Out" button.

## 🛠️ Technology Stack
- **Backend**: Python (Flask) with `paho-mqtt` for hardware integration.
- **Database**: MongoDB (Persistent wallet storage and transaction ledger).
- **Web Frontend**: Vanilla HTML5, CSS3 (Glassmorphism design), and JavaScript (Fetch API).
- **Mobile Frontend**: React Native, Expo Router, and Axios (Premium cross-platform mobile app).
- **Hardware**: ESP8266 + MFRC522 RFID Reader + MQTT Broker.

## 🚀 Setup & Deployment

### 1. Backend API (Python)
The central brain. Handles REST API requests and listens to MQTT hardware scans.
Ensure you have Python 3.10+ installed.
```bash
cd backend-api
pip install -r requirements.txt
python main.py
```
> Note: A secondary Node.js backend (`index.js`) is also available in the backend folder for reference, but `main.py` is the primary runner.

### 2. Web Dashboard
The desktop interface for merchants.
Serve the dashboard using a local server (to avoid CORS/File-System blocks).
```bash
cd web-dashboard
npx serve -s . -l 8240
```
Access at: `http://localhost:8240` (or your server IP).

### 3. Mobile App (React Native/Expo)
The modern, portable companion app for the RFID system.
Ensure you have Node.js installed.
```bash
cd mobile
npm install
npx expo start -c
```
- **Android/iOS**: Scan the QR code in the terminal with the Expo Go app. *(Make sure your phone and PC are on the same Wi-Fi network)*.
- **Web**: Press `w` in the terminal to open the mobile app layout in your browser.

> Note: The mobile app uses an intelligent API configuration (`constants/Config.js`). It connects to `10.0.2.2` automatically when running on an Android Emulator, and `127.0.0.1` when viewed on the web.

### 4. ESP8266 Firmware
The physical hardware terminal component.
- Open `esp8266-firmware/esp8266-firmware.ino` in Arduino IDE.
- Update your WiFi SSID, Password, and the MQTT Broker IP.
- Flash the code to your board.

### Useful Tools for Testing without Hardware
If you don't have the physical hardware connected, you can simulate an RFID scan to unlock the dashboards:
```bash
cd backend-api
python simulate_scan.py
```
This script will send a fake MQTT signal with UID `A1B2C3D4` to unlock the UI for 5 minutes.

## 💡 Key Features
- **Atomic Wallet Updates**: Balances are updated safely using MongoDB logic.
- **Transaction Ledger**: Every purchase, top-up, and scan is logged for accounting.
- **Service Catalog**: Pre-seeded services including Cafeteria, Internet, and Printing.
- **Session Management**: Automated logout after 5 minutes of inactivity.
- **Card Admin Tools**: Admins can block compromised cards or instantly migrate a balance/history to a new physical card.

## 📂 Repository Structure
```text
/rfid-wallet-system
├── esp8266-firmware/   # Arduino/C++ Hardware Source
├── backend-api/        # Python (Flask) Backend Logic
├── web-dashboard/      # Vanilla HTML/CSS/JS Desktop Dashboard
├── mobile/             # React Native (Expo) Mobile App
├── docs/               # System Architecture Diagrams
└── README.md           # Project Documentation
```
