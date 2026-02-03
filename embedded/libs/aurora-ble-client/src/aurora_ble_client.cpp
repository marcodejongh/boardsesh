#include "aurora_ble_client.h"

#if __has_include(<log_buffer.h>)
#include <log_buffer.h>
#else
// Fallback logging
class FallbackLogger {
public:
    void logln(const char* fmt, ...) {
        va_list args;
        va_start(args, fmt);
        vprintf(fmt, args);
        va_end(args);
        printf("\n");
    }
};
static FallbackLogger Logger;
#endif

AuroraBLEClient BLEClient;

AuroraBLEClient::AuroraBLEClient()
    : pClient(nullptr)
    , pRxCharacteristic(nullptr)
    , pTxCharacteristic(nullptr)
    , deviceConnected(false)
    , scanning(false)
    , autoConnect(false)
    , connectCallback(nullptr)
    , scanCallback(nullptr)
    , pScanCallbacks(nullptr) {}

AuroraBLEClient::~AuroraBLEClient() {
    if (pScanCallbacks) {
        delete pScanCallbacks;
        pScanCallbacks = nullptr;
    }
    // Note: pClient is managed by NimBLEDevice, not deleted here
}

void AuroraBLEClient::begin() {
    Logger.logln("BLEClient: Initializing...");

    // Initialize NimBLE in client mode
    NimBLEDevice::init("Boardsesh-Display");
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

    // Create scan callbacks
    pScanCallbacks = new ScanCallbacks(this);

    Logger.logln("BLEClient: Ready");
}

void AuroraBLEClient::loop() {
    // Check for disconnection
    if (pClient && !pClient->isConnected() && deviceConnected) {
        deviceConnected = false;
        connectedDeviceName = "";
        connectedDeviceAddress = "";
        Logger.logln("BLEClient: Connection lost");

        if (connectCallback) {
            connectCallback(false, nullptr);
        }
    }
}

void AuroraBLEClient::startScan(uint32_t duration) {
    if (scanning) {
        Logger.logln("BLEClient: Already scanning");
        return;
    }

    Logger.logln("BLEClient: Starting scan for %d seconds...", duration);

    NimBLEScan* pScan = NimBLEDevice::getScan();
    pScan->setAdvertisedDeviceCallbacks(pScanCallbacks);
    pScan->setActiveScan(true);
    pScan->setInterval(100);
    pScan->setWindow(99);
    pScan->start(duration, false);

    scanning = true;
}

void AuroraBLEClient::stopScan() {
    if (!scanning) return;

    NimBLEDevice::getScan()->stop();
    scanning = false;
    Logger.logln("BLEClient: Scan stopped");
}

bool AuroraBLEClient::isScanning() {
    return scanning;
}

bool AuroraBLEClient::connect(const char* address) {
    Logger.logln("BLEClient: Connecting to %s...", address);

    if (deviceConnected) {
        Logger.logln("BLEClient: Already connected, disconnecting first");
        disconnect();
    }

    // Create client if needed
    if (!pClient) {
        pClient = NimBLEDevice::createClient();
        pClient->setClientCallbacks(this);
    }

    // Connect to device
    NimBLEAddress addr(address);
    if (!pClient->connect(addr)) {
        Logger.logln("BLEClient: Failed to connect");
        return false;
    }

    // Get NUS service
    NimBLERemoteService* pService = pClient->getService(NUS_SERVICE_UUID);
    if (!pService) {
        Logger.logln("BLEClient: NUS service not found");
        pClient->disconnect();
        return false;
    }

    // Get RX characteristic (for writing to board)
    pRxCharacteristic = pService->getCharacteristic(NUS_RX_CHARACTERISTIC);
    if (!pRxCharacteristic) {
        Logger.logln("BLEClient: RX characteristic not found");
        pClient->disconnect();
        return false;
    }

    // Get TX characteristic (for receiving from board - optional)
    pTxCharacteristic = pService->getCharacteristic(NUS_TX_CHARACTERISTIC);

    deviceConnected = true;
    connectedDeviceAddress = address;

    Logger.logln("BLEClient: Connected successfully");
    return true;
}

void AuroraBLEClient::disconnect() {
    if (pClient && pClient->isConnected()) {
        pClient->disconnect();
    }
    deviceConnected = false;
    connectedDeviceName = "";
    connectedDeviceAddress = "";
    pRxCharacteristic = nullptr;
    pTxCharacteristic = nullptr;
}

bool AuroraBLEClient::isConnected() {
    return deviceConnected && pClient && pClient->isConnected();
}

String AuroraBLEClient::getConnectedDeviceName() {
    return connectedDeviceName;
}

String AuroraBLEClient::getConnectedDeviceAddress() {
    return connectedDeviceAddress;
}

bool AuroraBLEClient::sendLedCommands(const LedCommand* commands, int count) {
    if (!isConnected() || !pRxCharacteristic) {
        Logger.logln("BLEClient: Not connected, cannot send LED commands");
        return false;
    }

    if (count == 0) {
        return clearLeds();
    }

    Logger.logln("BLEClient: Sending %d LED commands", count);

    // Encode LED data (3 bytes per LED for V3 protocol)
    std::vector<uint8_t> ledData;
    ledData.reserve(count * 3);

    for (int i = 0; i < count; i++) {
        // Position (little-endian)
        ledData.push_back(commands[i].position & 0xFF);
        ledData.push_back((commands[i].position >> 8) & 0xFF);

        // Color (RRRGGGBB format)
        ledData.push_back(encodeColor(commands[i].r, commands[i].g, commands[i].b));
    }

    // Calculate how many packets we need
    // Max data per packet = MAX_BLE_PACKET_SIZE - frame overhead (5 bytes: SOH, len, checksum, STX, cmd, ETX)
    // Actually: frame is [SOH, len, checksum, STX, cmd, ...data..., ETX]
    // So overhead is 6 bytes (SOH, len, checksum, STX, cmd, ETX)
    const size_t maxDataPerPacket = MAX_BLE_PACKET_SIZE - 6;
    const size_t bytesPerLed = 3;
    const size_t maxLedsPerPacket = maxDataPerPacket / bytesPerLed;

    if ((size_t)count <= maxLedsPerPacket) {
        // Single packet
        auto frame = createFrame(CMD_V3_PACKET_ONLY, ledData.data(), ledData.size());
        return sendPacket(frame.data(), frame.size());
    }

    // Multi-packet sequence
    size_t offset = 0;
    int packetNum = 0;

    while (offset < ledData.size()) {
        size_t remaining = ledData.size() - offset;
        size_t chunkSize = (remaining > maxDataPerPacket) ? maxDataPerPacket : remaining;

        // Round down to complete LEDs
        chunkSize = (chunkSize / bytesPerLed) * bytesPerLed;

        uint8_t command;
        if (offset == 0) {
            command = CMD_V3_PACKET_FIRST;
        } else if (offset + chunkSize >= ledData.size()) {
            command = CMD_V3_PACKET_LAST;
        } else {
            command = CMD_V3_PACKET_MIDDLE;
        }

        auto frame = createFrame(command, ledData.data() + offset, chunkSize);
        if (!sendPacket(frame.data(), frame.size())) {
            Logger.logln("BLEClient: Failed to send packet %d", packetNum);
            return false;
        }

        offset += chunkSize;
        packetNum++;

        // Small delay between packets
        delay(20);
    }

    Logger.logln("BLEClient: Sent %d packets", packetNum);
    return true;
}

bool AuroraBLEClient::clearLeds() {
    if (!isConnected() || !pRxCharacteristic) {
        return false;
    }

    // Send empty packet to clear LEDs
    auto frame = createFrame(CMD_V3_PACKET_ONLY, nullptr, 0);
    return sendPacket(frame.data(), frame.size());
}

void AuroraBLEClient::setConnectCallback(BLEClientConnectCallback callback) {
    connectCallback = callback;
}

void AuroraBLEClient::setScanCallback(BLEClientScanCallback callback) {
    scanCallback = callback;
}

void AuroraBLEClient::setAutoConnect(bool enabled) {
    autoConnect = enabled;
}

void AuroraBLEClient::onConnect(NimBLEClient* client) {
    Logger.logln("BLEClient: onConnect callback");
    deviceConnected = true;

    if (connectCallback) {
        connectCallback(true, connectedDeviceName.c_str());
    }
}

void AuroraBLEClient::onDisconnect(NimBLEClient* client, int reason) {
    Logger.logln("BLEClient: onDisconnect callback (reason: %d)", reason);
    deviceConnected = false;
    connectedDeviceName = "";
    connectedDeviceAddress = "";
    pRxCharacteristic = nullptr;
    pTxCharacteristic = nullptr;

    if (connectCallback) {
        connectCallback(false, nullptr);
    }
}

// Scan callbacks
void AuroraBLEClient::ScanCallbacks::onResult(NimBLEAdvertisedDevice* advertisedDevice) {
    // Check if this is an Aurora board
    if (advertisedDevice->haveServiceUUID() &&
        advertisedDevice->isAdvertisingService(NimBLEUUID(AURORA_ADVERTISED_SERVICE_UUID))) {

        String name = advertisedDevice->getName().c_str();
        String address = advertisedDevice->getAddress().toString().c_str();

        Logger.logln("BLEClient: Found Aurora board: %s (%s)",
                      name.c_str(), address.c_str());

        // Call user callback
        if (parent->scanCallback) {
            parent->scanCallback(name.c_str(), address.c_str());
        }

        // Auto-connect if enabled
        if (parent->autoConnect && !parent->deviceConnected) {
            Logger.logln("BLEClient: Auto-connecting...");
            parent->stopScan();
            parent->connectedDeviceName = name;
            parent->connect(address.c_str());
        }
    }
}

void AuroraBLEClient::ScanCallbacks::onScanEnd(NimBLEScanResults results) {
    parent->scanning = false;
    Logger.logln("BLEClient: Scan complete, found %d devices", results.getCount());
}

// Internal methods
bool AuroraBLEClient::sendPacket(const uint8_t* data, size_t length) {
    if (!pRxCharacteristic) return false;

    return pRxCharacteristic->writeValue(data, length, true);
}

uint8_t AuroraBLEClient::calculateChecksum(const uint8_t* data, size_t length) {
    uint8_t sum = 0;
    for (size_t i = 0; i < length; i++) {
        sum = (sum + data[i]) & 0xFF;
    }
    return sum ^ 0xFF;
}

uint8_t AuroraBLEClient::encodeColor(uint8_t r, uint8_t g, uint8_t b) {
    // Convert 8-bit RGB to RRRGGGBB format
    // R: 3 bits (0-7), G: 3 bits (0-7), B: 2 bits (0-3)
    uint8_t r3 = (r * 7 + 127) / 255;  // Scale 0-255 to 0-7 with rounding
    uint8_t g3 = (g * 7 + 127) / 255;
    uint8_t b2 = (b * 3 + 127) / 255;  // Scale 0-255 to 0-3 with rounding

    return (r3 << 5) | (g3 << 2) | b2;
}

std::vector<uint8_t> AuroraBLEClient::createFrame(uint8_t command, const uint8_t* data, size_t dataLength) {
    // Frame format: [SOH, length, checksum, STX, command, ...data..., ETX]
    // length = command byte + data length
    uint8_t length = 1 + dataLength;

    // Create message for checksum calculation (command + data)
    std::vector<uint8_t> message;
    message.reserve(1 + dataLength);
    message.push_back(command);
    if (data && dataLength > 0) {
        message.insert(message.end(), data, data + dataLength);
    }

    uint8_t checksum = calculateChecksum(message.data(), message.size());

    // Build complete frame
    std::vector<uint8_t> frame;
    frame.reserve(6 + dataLength);
    frame.push_back(FRAME_SOH);
    frame.push_back(length);
    frame.push_back(checksum);
    frame.push_back(FRAME_STX);
    frame.push_back(command);
    if (data && dataLength > 0) {
        frame.insert(frame.end(), data, data + dataLength);
    }
    frame.push_back(FRAME_ETX);

    return frame;
}
