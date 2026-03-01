# Architecture Diagram

```mermaid
graph TD
    User((User)) -->|Browser| Dashboard[Web Dashboard]
    Dashboard -->|HTTP/REST| API[Backend API Node.js]
    API -->|Mongoose| DB[(MongoDB)]
    API <-->|MQTT| Broker[MQTT Broker]
    Broker <-->|MQTT| ESP[ESP8266 Firmware]
    ESP <-->|SPI| RFID[RFID Reader]
    RFID <-->|NFC| Tag[RFID Tag/Wallet]
```

## Data Flow
1. RFID Tag is scanned by the Reader.
2. ESP8266 reads the UID and publishes to `rfid/wallet/scan`.
3. Backend API receives the message, validates the UID in MongoDB.
4. Backend API processes the transaction (Atomic Update).
5. Backend API publishes results to `rfid/wallet/response`.
6. Dashboard polls Backend API every 3s via HTTP to show latest state.
