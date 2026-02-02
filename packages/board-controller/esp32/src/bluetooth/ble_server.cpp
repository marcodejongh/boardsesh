#include "ble_server.h"
#include "../led/led_controller.h"

// Global instance
BleServer bleServer;

BleServer::BleServer()
    : pServer(nullptr),
      pUartService(nullptr),
      pRxCharacteristic(nullptr),
      pTxCharacteristic(nullptr),
      pAdvertising(nullptr),
      deviceConnected(false),
      ledDataCallback(nullptr) {}

bool BleServer::begin() {
    Serial.println("[BLE] Initializing BLE server...");

    // Initialize NimBLE
    NimBLEDevice::init(BLE_DEVICE_NAME);

    // Set power level
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

    // Create server
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(this);

    // Create Nordic UART Service
    pUartService = pServer->createService(NORDIC_UART_SERVICE_UUID);

    // Create RX characteristic (for receiving data from app)
    pRxCharacteristic = pUartService->createCharacteristic(
        NORDIC_UART_RX_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    pRxCharacteristic->setCallbacks(this);

    // Create TX characteristic (for sending data to app - not used currently)
    pTxCharacteristic = pUartService->createCharacteristic(
        NORDIC_UART_TX_UUID,
        NIMBLE_PROPERTY::NOTIFY
    );

    // Start service
    pUartService->start();

    // Set up advertising
    setupAdvertising();

    Serial.println("[BLE] BLE server started");
    Serial.printf("[BLE] Device name: %s\n", BLE_DEVICE_NAME);

    return true;
}

void BleServer::setupAdvertising() {
    pAdvertising = NimBLEDevice::getAdvertising();

    // Add Aurora's custom advertised UUID
    pAdvertising->addServiceUUID(AURORA_ADVERTISED_UUID);

    // Add Nordic UART service UUID
    pAdvertising->addServiceUUID(NORDIC_UART_SERVICE_UUID);

    // Set scan response data
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // Connection interval min
    pAdvertising->setMaxPreferred(0x12);  // Connection interval max

    // Start advertising
    pAdvertising->start();

    Serial.println("[BLE] Advertising started");
}

void BleServer::stop() {
    if (pAdvertising) {
        pAdvertising->stop();
    }
    NimBLEDevice::deinit();
    Serial.println("[BLE] BLE server stopped");
}

bool BleServer::isConnected() {
    return deviceConnected;
}

void BleServer::setLedDataCallback(void (*callback)(const LedCommand* commands, int count, int angle)) {
    ledDataCallback = callback;
}

void BleServer::onConnect(NimBLEServer* pServer, ble_gap_conn_desc* desc) {
    deviceConnected = true;

    // Get the connected device's MAC address
    connectedDeviceAddress = NimBLEAddress(desc->peer_ota_addr).toString().c_str();
    Serial.printf("[BLE] Device connected: %s (total: %d)\n",
                  connectedDeviceAddress.c_str(), pServer->getConnectedCount());

    // Flash green to indicate connection
    ledController.blink(0, 255, 0, 2, 100);

    // Restart advertising to allow more connections
    if (pServer->getConnectedCount() < CONFIG_BT_NIMBLE_MAX_CONNECTIONS) {
        pAdvertising->start();
        Serial.println("[BLE] Advertising restarted for more connections");
    }
}

void BleServer::onDisconnect(NimBLEServer* pServer) {
    deviceConnected = false;
    Serial.printf("[BLE] Device disconnected: %s\n", connectedDeviceAddress.c_str());

    // Remove MAC from tracking on disconnect to free memory
    if (connectedDeviceAddress.length() > 0) {
        auto it = lastSentHashByMac.find(connectedDeviceAddress);
        if (it != lastSentHashByMac.end()) {
            Serial.printf("[BLE] Evicting disconnected MAC: %s\n", connectedDeviceAddress.c_str());
            lastSentHashByMac.erase(it);
        }
    }
    connectedDeviceAddress = "";

    // Restart advertising
    pAdvertising->start();
    Serial.println("[BLE] Advertising restarted");

    // Flash red to indicate disconnection
    ledController.blink(255, 0, 0, 2, 100);
}

bool BleServer::shouldSendLedData(uint32_t hash) {
    if (connectedDeviceAddress.length() == 0) {
        Serial.println("[BLE] shouldSendLedData: no device address, allowing");
        return true;
    }

    auto it = lastSentHashByMac.find(connectedDeviceAddress);
    if (it == lastSentHashByMac.end()) {
        Serial.printf("[BLE] shouldSendLedData: first time from %s, allowing\n", connectedDeviceAddress.c_str());
        return true;  // Never sent from this device before
    }

    bool shouldSend = (it->second.hash != hash);
    Serial.printf("[BLE] shouldSendLedData: %s, lastHash=%u, newHash=%u, send=%s\n",
                  connectedDeviceAddress.c_str(), it->second.hash, hash, shouldSend ? "yes" : "no");
    return shouldSend;
}

void BleServer::evictOldestMacEntries() {
    // If we're under the limit, nothing to do
    while (lastSentHashByMac.size() > MAX_MAC_TRACKING) {
        // Find the oldest entry
        auto oldest = lastSentHashByMac.begin();
        for (auto it = lastSentHashByMac.begin(); it != lastSentHashByMac.end(); ++it) {
            if (it->second.timestamp < oldest->second.timestamp) {
                oldest = it;
            }
        }
        Serial.printf("[BLE] Evicting oldest MAC entry: %s (age: %lu ms)\n",
                      oldest->first.c_str(), millis() - oldest->second.timestamp);
        lastSentHashByMac.erase(oldest);
    }
}

void BleServer::updateLastSentHash(uint32_t hash) {
    if (connectedDeviceAddress.length() > 0) {
        MacHashEntry entry;
        entry.hash = hash;
        entry.timestamp = millis();
        lastSentHashByMac[connectedDeviceAddress] = entry;

        // Evict oldest entries if we exceed the limit
        evictOldestMacEntries();
    }
}

void BleServer::onWrite(NimBLECharacteristic* pCharacteristic) {
    if (pCharacteristic != pRxCharacteristic) return;

    std::string value = pCharacteristic->getValue();
    if (value.length() == 0) return;

    if (DEBUG_BLE) {
        Serial.printf("[BLE] Received %zu bytes\n", value.length());
    }

    // Process the packet through Aurora protocol decoder
    bool complete = protocol.processPacket(
        (const uint8_t*)value.data(),
        value.length()
    );

    if (complete) {
        // Get decoded LED commands
        const std::vector<LedCommand>& commands = protocol.getLedCommands();

        if (commands.size() > 0) {
            // Update LEDs directly
            ledController.setLeds(commands.data(), commands.size());
            ledController.show();

            Serial.printf("[BLE] Updated %zu LEDs from Bluetooth\n", commands.size());

            // If callback is set, forward to backend
            if (ledDataCallback) {
                ledDataCallback(commands.data(), commands.size(), protocol.getAngle());
            }
        }
    }
}
