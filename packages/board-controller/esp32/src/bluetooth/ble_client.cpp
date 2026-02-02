#include "ble_client.h"
#include "aurora_protocol.h"

// Global instance
BleClient bleClient;

// Maximum LED data bytes per BLE packet (MTU limit minus overhead)
#define MAX_PACKET_DATA_SIZE 180

BleClient::BleClient()
    : pClient(nullptr),
      pRemoteService(nullptr),
      pRemoteRxChar(nullptr),
      pScan(nullptr),
      clientConnected(false),
      lastReconnectAttempt(0),
      autoReconnect(true),
      scanComplete(false),
      scanInProgress(false) {}

bool BleClient::begin() {
    Serial.println("[BLE-Client] Initializing BLE client...");

    // Create BLE client
    pClient = NimBLEDevice::createClient();
    pClient->setClientCallbacks(this);

    // Set connection parameters for reliability
    pClient->setConnectionParams(12, 12, 0, 51);  // min, max interval, latency, timeout

    Serial.println("[BLE-Client] BLE client initialized");
    return true;
}

void BleClient::stop() {
    if (clientConnected) {
        disconnect();
    }
    if (pClient) {
        NimBLEDevice::deleteClient(pClient);
        pClient = nullptr;
    }
    Serial.println("[BLE-Client] BLE client stopped");
}

std::vector<ScannedBoard> BleClient::scan(int durationSeconds) {
    // Guard against concurrent scans
    if (scanInProgress) {
        Serial.println("[BLE-Client] Scan already in progress, returning empty results");
        return std::vector<ScannedBoard>();
    }

    scanInProgress = true;
    Serial.printf("[BLE-Client] Starting scan for %d seconds...\n", durationSeconds);

    scanResults.clear();
    scanComplete = false;

    pScan = NimBLEDevice::getScan();
    pScan->setAdvertisedDeviceCallbacks(this);
    pScan->setActiveScan(true);
    pScan->setInterval(97);
    pScan->setWindow(37);

    // Start blocking scan
    NimBLEScanResults results = pScan->start(durationSeconds, false);

    scanInProgress = false;
    Serial.printf("[BLE-Client] Scan complete, found %d devices\n", scanResults.size());

    // Filter to only return boards with Aurora UUID
    std::vector<ScannedBoard> kilterBoards;
    for (const auto& board : scanResults) {
        if (board.hasAuroraUuid) {
            kilterBoards.push_back(board);
            Serial.printf("[BLE-Client]   Kilter board: %s (%s) RSSI: %d\n",
                          board.name.c_str(), board.address.c_str(), board.rssi);
        }
    }

    return kilterBoards;
}

void BleClient::onResult(NimBLEAdvertisedDevice* advertisedDevice) {
    ScannedBoard board;
    board.address = advertisedDevice->getAddress().toString().c_str();
    board.name = advertisedDevice->haveName() ? advertisedDevice->getName().c_str() : "";
    board.rssi = advertisedDevice->getRSSI();
    board.hasAuroraUuid = advertisedDevice->haveServiceUUID() &&
                          advertisedDevice->isAdvertisingService(NimBLEUUID(AURORA_ADVERTISED_UUID));

    // Only add boards with Aurora UUID or "Kilter" in the name
    if (board.hasAuroraUuid ||
        board.name.indexOf("Kilter") >= 0 ||
        board.name.indexOf("Tension") >= 0) {
        scanResults.push_back(board);
    }
}

bool BleClient::connect(const String& address) {
    Serial.printf("[BLE-Client] Connecting to %s...\n", address.c_str());

    targetAddress = address;

    // Disconnect if already connected to something else
    if (clientConnected && connectedAddress != address) {
        disconnect();
    }

    if (clientConnected && connectedAddress == address) {
        Serial.println("[BLE-Client] Already connected to this board");
        return true;
    }

    return connectToServer();
}

bool BleClient::connectToServer() {
    if (!pClient) {
        Serial.println("[BLE-Client] Client not initialized");
        return false;
    }

    NimBLEAddress addr(targetAddress.c_str());

    // Connect to the board
    if (!pClient->connect(addr)) {
        Serial.println("[BLE-Client] Connection failed");
        return false;
    }

    Serial.println("[BLE-Client] Connected, discovering services...");

    // Get Nordic UART service
    pRemoteService = pClient->getService(NORDIC_UART_SERVICE_UUID);
    if (!pRemoteService) {
        Serial.println("[BLE-Client] Failed to find Nordic UART service");
        pClient->disconnect();
        return false;
    }

    // Get RX characteristic (we write LED data to this)
    pRemoteRxChar = pRemoteService->getCharacteristic(NORDIC_UART_RX_UUID);
    if (!pRemoteRxChar) {
        Serial.println("[BLE-Client] Failed to find RX characteristic");
        pClient->disconnect();
        return false;
    }

    // Verify we can write to it
    if (!pRemoteRxChar->canWrite() && !pRemoteRxChar->canWriteNoResponse()) {
        Serial.println("[BLE-Client] RX characteristic is not writable");
        pClient->disconnect();
        return false;
    }

    connectedAddress = targetAddress;
    clientConnected = true;
    autoReconnect = true;

    Serial.printf("[BLE-Client] Successfully connected to %s\n", connectedAddress.c_str());

    return true;
}

void BleClient::disconnect() {
    autoReconnect = false;

    if (pClient && pClient->isConnected()) {
        pClient->disconnect();
    }

    clientConnected = false;
    connectedAddress = "";
    pRemoteService = nullptr;
    pRemoteRxChar = nullptr;

    Serial.println("[BLE-Client] Disconnected");
}

bool BleClient::isConnected() {
    return clientConnected && pClient && pClient->isConnected();
}

String BleClient::getConnectedAddress() {
    return connectedAddress;
}

void BleClient::onConnect(NimBLEClient* pClient) {
    Serial.println("[BLE-Client] Connected callback");
    clientConnected = true;
}

void BleClient::onDisconnect(NimBLEClient* pClient) {
    Serial.println("[BLE-Client] Disconnected callback");
    clientConnected = false;
    pRemoteService = nullptr;
    pRemoteRxChar = nullptr;
}

void BleClient::loop() {
    // Handle auto-reconnection
    if (autoReconnect && !clientConnected && targetAddress.length() > 0) {
        unsigned long now = millis();
        if (now - lastReconnectAttempt > BLE_CLIENT_RECONNECT_INTERVAL) {
            lastReconnectAttempt = now;
            Serial.println("[BLE-Client] Attempting reconnection...");
            connectToServer();
        }
    }
}

// Calculate Aurora protocol checksum
static uint8_t calculateChecksum(const uint8_t* data, size_t length) {
    uint8_t sum = 0;
    for (size_t i = 0; i < length; i++) {
        sum = (sum + data[i]) & 0xFF;
    }
    return sum ^ 0xFF;
}

void BleClient::encodeAndSendPacket(const uint8_t* ledData, size_t ledDataLength, uint8_t command) {
    // Frame format: [SOH, length, checksum, STX, command, ...ledData..., ETX]
    // Length = 1 (command) + ledDataLength
    size_t dataLength = 1 + ledDataLength;  // command + LED data

    // Build the data portion (command + LED data)
    std::vector<uint8_t> data(dataLength);
    data[0] = command;
    memcpy(&data[1], ledData, ledDataLength);

    // Calculate checksum over data
    uint8_t checksum = calculateChecksum(data.data(), dataLength);

    // Build complete frame
    std::vector<uint8_t> frame;
    frame.push_back(FRAME_SOH);
    frame.push_back(static_cast<uint8_t>(dataLength));
    frame.push_back(checksum);
    frame.push_back(FRAME_STX);
    frame.insert(frame.end(), data.begin(), data.end());
    frame.push_back(FRAME_ETX);

    // Send frame
    if (pRemoteRxChar) {
        if (pRemoteRxChar->canWriteNoResponse()) {
            pRemoteRxChar->writeValue(frame.data(), frame.size(), false);
        } else {
            pRemoteRxChar->writeValue(frame.data(), frame.size(), true);
        }

        if (DEBUG_BLE) {
            Serial.printf("[BLE-Client] Sent packet: cmd='%c', %zu LED bytes, %zu total bytes\n",
                          command, ledDataLength, frame.size());
        }
    }
}

bool BleClient::sendLedCommands(const LedCommand* commands, int count) {
    if (!isConnected() || !pRemoteRxChar) {
        Serial.println("[BLE-Client] Not connected, cannot send LED commands");
        return false;
    }

    if (count == 0) {
        Serial.println("[BLE-Client] No LED commands to send");
        return true;
    }

    Serial.printf("[BLE-Client] Encoding and sending %d LED commands\n", count);

    // Encode LED commands to API v3 format (3 bytes per LED)
    // Format: [pos_low, pos_high, color_byte]
    // Color: RRRGGGBB (3 bits red, 3 bits green, 2 bits blue)
    std::vector<uint8_t> ledData;
    ledData.reserve(count * 3);

    for (int i = 0; i < count; i++) {
        uint16_t position = static_cast<uint16_t>(commands[i].position);

        // Convert RGB (0-255) to packed color format (RRRGGGBB)
        // Matches the TypeScript encoding in bluetooth.ts:
        //   Math.floor(r / 32) << 5 | Math.floor(g / 32) << 2 | Math.floor(b / 64)
        uint8_t r3 = commands[i].r / 32;  // 0-7
        uint8_t g3 = commands[i].g / 32;  // 0-7
        uint8_t b2 = commands[i].b / 64;  // 0-3

        uint8_t colorByte = (r3 << 5) | (g3 << 2) | b2;

        // Position (little-endian)
        ledData.push_back(position & 0xFF);
        ledData.push_back((position >> 8) & 0xFF);
        ledData.push_back(colorByte);
    }

    // Calculate how many LEDs fit per packet
    size_t maxLedsPerPacket = MAX_PACKET_DATA_SIZE / 3;
    size_t totalLeds = count;
    size_t packetCount = (totalLeds + maxLedsPerPacket - 1) / maxLedsPerPacket;

    if (packetCount == 1) {
        // Single packet - use CMD_V3_PACKET_ONLY ('T')
        encodeAndSendPacket(ledData.data(), ledData.size(), CMD_V3_PACKET_ONLY);
    } else {
        // Multi-packet sequence
        size_t ledsSent = 0;
        for (size_t pkt = 0; pkt < packetCount; pkt++) {
            size_t ledsInPacket = std::min(maxLedsPerPacket, totalLeds - ledsSent);
            size_t byteOffset = ledsSent * 3;
            size_t byteCount = ledsInPacket * 3;

            uint8_t command;
            if (pkt == 0) {
                command = CMD_V3_PACKET_FIRST;  // 'R'
            } else if (pkt == packetCount - 1) {
                command = CMD_V3_PACKET_LAST;   // 'S'
            } else {
                command = CMD_V3_PACKET_MIDDLE; // 'Q'
            }

            encodeAndSendPacket(&ledData[byteOffset], byteCount, command);
            ledsSent += ledsInPacket;

            // Small delay between packets
            delay(10);
        }
    }

    Serial.printf("[BLE-Client] Sent %zu LED commands in %zu packet(s)\n",
                  totalLeds, packetCount);

    return true;
}
