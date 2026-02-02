#ifndef BLE_SERVER_H
#define BLE_SERVER_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <map>
#include "../config/board_config.h"
#include "aurora_protocol.h"

/**
 * BLE Server
 * Implements Nordic UART Service compatible with official Kilter/Tension apps
 */
class BleServer : public NimBLEServerCallbacks, public NimBLECharacteristicCallbacks {
public:
    BleServer();

    // Initialize BLE server
    bool begin();

    // Stop BLE server
    void stop();

    // Check if a device is connected
    bool isConnected();

    // Set callback for when LED data is received from Bluetooth
    void setLedDataCallback(void (*callback)(const LedCommand* commands, int count, int angle));

    // Server callbacks
    void onConnect(NimBLEServer* pServer, ble_gap_conn_desc* desc) override;
    void onDisconnect(NimBLEServer* pServer) override;

    // Characteristic callbacks
    void onWrite(NimBLECharacteristic* pCharacteristic) override;

private:
    NimBLEServer* pServer;
    NimBLEService* pUartService;
    NimBLECharacteristic* pRxCharacteristic;
    NimBLECharacteristic* pTxCharacteristic;
    NimBLEAdvertising* pAdvertising;

    AuroraProtocol protocol;
    bool deviceConnected;
    String connectedDeviceAddress;  // MAC address of currently connected device
    std::map<String, uint32_t> lastSentHashByMac;  // Track last sent hash per MAC address

    void (*ledDataCallback)(const LedCommand* commands, int count, int angle);

    void setupAdvertising();

public:
    // Get the current connected device's MAC address
    String getConnectedDeviceAddress() { return connectedDeviceAddress; }

    // Check if we should send this LED data for this MAC (deduplication per device)
    bool shouldSendLedData(uint32_t hash);

    // Update the last sent hash for the connected device
    void updateLastSentHash(uint32_t hash);
};

// Global BLE server instance
extern BleServer bleServer;

#endif // BLE_SERVER_H
