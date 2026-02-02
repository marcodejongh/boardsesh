#ifndef AURORA_BLE_CLIENT_H
#define AURORA_BLE_CLIENT_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <vector>

// Define LedCommand if not already defined
#ifndef LED_COMMAND_DEFINED
#define LED_COMMAND_DEFINED
struct LedCommand {
    uint16_t position;
    uint8_t r, g, b;
};
#endif

// Aurora boards advertise this service UUID for discovery
#define AURORA_ADVERTISED_SERVICE_UUID "4488b571-7806-4df6-bcff-a2897e4953ff"

// Nordic UART Service UUIDs - used for actual communication
#define NUS_SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_RX_CHARACTERISTIC   "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"  // Write to board
#define NUS_TX_CHARACTERISTIC   "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"  // Receive from board

// Framing constants
#define FRAME_SOH 0x01  // Start of header
#define FRAME_STX 0x02  // Start of text
#define FRAME_ETX 0x03  // End of text

// API v3 commands (3 bytes per LED)
#define CMD_V3_PACKET_ONLY   'T'  // 84 - Single packet (complete message)
#define CMD_V3_PACKET_FIRST  'R'  // 82 - First packet of multi-packet sequence
#define CMD_V3_PACKET_MIDDLE 'Q'  // 81 - Middle packet of multi-packet sequence
#define CMD_V3_PACKET_LAST   'S'  // 83 - Last packet of multi-packet sequence

// Maximum BLE packet size (conservative to ensure compatibility)
#define MAX_BLE_PACKET_SIZE 182

// Callbacks
typedef void (*BLEClientConnectCallback)(bool connected, const char* deviceName);
typedef void (*BLEClientScanCallback)(const char* deviceName, const char* address);

/**
 * Aurora BLE Client
 * Connects to official Kilter/Tension boards and sends LED commands
 */
class AuroraBLEClient : public NimBLEClientCallbacks {
public:
    AuroraBLEClient();

    // Initialization
    void begin();
    void loop();

    // Scanning
    void startScan(uint32_t duration = 10);  // seconds
    void stopScan();
    bool isScanning();

    // Connection
    bool connect(const char* address);
    void disconnect();
    bool isConnected();
    String getConnectedDeviceName();
    String getConnectedDeviceAddress();

    // LED commands
    bool sendLedCommands(const LedCommand* commands, int count);
    bool clearLeds();

    // Callbacks
    void setConnectCallback(BLEClientConnectCallback callback);
    void setScanCallback(BLEClientScanCallback callback);

    // Auto-connect to first discovered Aurora board
    void setAutoConnect(bool enabled);
    bool getAutoConnect() { return autoConnect; }

    // NimBLE callbacks
    void onConnect(NimBLEClient* client) override;
    void onDisconnect(NimBLEClient* client, int reason) override;

private:
    NimBLEClient* pClient;
    NimBLERemoteCharacteristic* pRxCharacteristic;  // Write to board
    NimBLERemoteCharacteristic* pTxCharacteristic;  // Receive from board

    bool deviceConnected;
    bool scanning;
    bool autoConnect;
    String connectedDeviceName;
    String connectedDeviceAddress;

    BLEClientConnectCallback connectCallback;
    BLEClientScanCallback scanCallback;

    // Scan callback class
    class ScanCallbacks : public NimBLEScanCallbacks {
    public:
        ScanCallbacks(AuroraBLEClient* parent) : parent(parent) {}
        void onResult(NimBLEAdvertisedDevice* advertisedDevice) override;
        void onScanEnd(NimBLEScanResults results) override;
    private:
        AuroraBLEClient* parent;
    };
    ScanCallbacks* pScanCallbacks;

    // Internal methods
    bool connectToDevice(NimBLEAdvertisedDevice* device);
    bool sendPacket(const uint8_t* data, size_t length);

    // Protocol encoding
    uint8_t calculateChecksum(const uint8_t* data, size_t length);
    uint8_t encodeColor(uint8_t r, uint8_t g, uint8_t b);
    std::vector<uint8_t> createFrame(uint8_t command, const uint8_t* data, size_t dataLength);
};

extern AuroraBLEClient BLEClient;

#endif // AURORA_BLE_CLIENT_H
