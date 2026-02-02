/**
 * BoardSesh ESP32 Controller
 *
 * This firmware enables an ESP32 to replace the official Kilter/Tension board controller.
 * It provides:
 * - Direct WS2811 LED control from BoardSesh via WebSocket
 * - BLE GATT server compatible with official Kilter/Tension apps
 * - Web interface for WiFi/API key configuration
 *
 * When the official app sets a climb via Bluetooth, the LED data can be forwarded
 * to the BoardSesh session for synchronization.
 */

#include <Arduino.h>
#include "config/config_manager.h"
#include "wifi/wifi_manager.h"
#include "led/led_controller.h"
#include "websocket/ws_client.h"
#include "bluetooth/ble_server.h"
#include "web/web_server.h"

// Forward declaration for BLE callback
void onBluetoothLedData(const LedCommand* commands, int count, int angle);

void setup() {
    // Initialize serial for debugging
    Serial.begin(DEBUG_BAUD);
    delay(1000);

    Serial.println();
    Serial.println("=================================");
    Serial.println("  BoardSesh ESP32 Controller");
    Serial.println("=================================");
    Serial.println();

    // Initialize configuration manager
    if (!configManager.begin()) {
        Serial.println("[FATAL] Failed to initialize config manager");
        while (1) delay(1000);
    }
    configManager.printConfig();

    // Initialize LED controller
    if (!ledController.begin()) {
        Serial.println("[WARN] Failed to initialize LED controller");
    } else {
        // Quick startup blink
        ledController.blink(0, 0, 255, 2, 100);
    }

    // Initialize BLE server (before WiFi to allow configuration via app)
    if (!bleServer.begin()) {
        Serial.println("[WARN] Failed to initialize BLE server");
    } else {
        // Set callback for when LED data is received from Bluetooth
        bleServer.setLedDataCallback(onBluetoothLedData);
    }

    // Initialize WiFi (may block for config portal)
    Serial.println("[INIT] Starting WiFi...");
    if (!boardWiFiManager.begin()) {
        Serial.println("[WARN] WiFi not connected - use AP mode to configure");
    }

    // Initialize web server (for configuration)
    if (!boardWebServer.begin()) {
        Serial.println("[WARN] Failed to initialize web server");
    }

    // Initialize WebSocket client (if API key is configured)
    if (configManager.hasApiKey() && configManager.getSessionId().length() > 0) {
        Serial.println("[INIT] Starting WebSocket client...");
        if (!wsClient.begin()) {
            Serial.println("[WARN] Failed to initialize WebSocket client");
        }
    } else {
        Serial.println("[INIT] WebSocket client not started - configure API key and session ID");
    }

    // Ready
    Serial.println();
    Serial.println("=================================");
    Serial.println("  Controller Ready!");
    Serial.println("=================================");
    Serial.printf("  IP: %s\n", boardWiFiManager.getIPAddress().c_str());
    Serial.printf("  BLE: %s\n", BLE_DEVICE_NAME);
    Serial.println("=================================");
    Serial.println();

    // Green blink to indicate ready
    ledController.blink(0, 255, 0, 3, 100);
}

void loop() {
    // Process WebSocket events
    wsClient.loop();

    // Process web server requests
    boardWebServer.handleClient();

    // Small delay to prevent watchdog issues
    delay(1);
}

/**
 * Callback when LED data is received via Bluetooth from official app
 * Forward the climb to the BoardSesh session so it can be matched
 */
void onBluetoothLedData(const LedCommand* commands, int count, int angle) {
    Serial.printf("[Main] Bluetooth LED data received: %d LEDs, angle: %d\n", count, angle);

    // Forward to backend via WebSocket to match climb
    if (wsClient.isSubscribed()) {
        wsClient.sendLedPositions(commands, count, angle);
    }
}
