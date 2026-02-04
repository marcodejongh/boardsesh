#include <Arduino.h>

// Shared libraries
#include <esp_web_server.h>
#include <wifi_utils.h>

#include <aurora_protocol.h>
#include <config_manager.h>
#include <graphql_ws_client.h>
#include <led_controller.h>
#include <log_buffer.h>
#include <nordic_uart_ble.h>

// Project-specific config
#include "config/board_config.h"
#include "config/led_placement_map.h"

// State
bool wifiConnected = false;
bool backendConnected = false;

// Forward declarations
void onWiFiStateChange(WiFiConnectionState state);
void onBLEConnect(bool connected);
void onBLEData(const uint8_t* data, size_t len);
void onBLELedData(const LedCommand* commands, int count, int angle);
void onGraphQLStateChange(GraphQLConnectionState state);
void onGraphQLMessage(JsonDocument& doc);
void processLedCommand(JsonDocument& doc);
void startupAnimation();

void setup() {
    Serial.begin(115200);
    delay(1000);

    Logger.logln("=================================");
    Logger.logln("%s v%s", DEVICE_NAME, FIRMWARE_VERSION);
    Logger.logln("=================================");

    // Initialize config manager
    Config.begin();

    // Initialize LEDs
    Logger.logln("Initializing LEDs...");
    LEDs.begin(LED_PIN, NUM_LEDS);
    LEDs.setBrightness(Config.getInt("brightness", DEFAULT_BRIGHTNESS));

    // Startup animation
    startupAnimation();

    // Initialize WiFi
    Logger.logln("Initializing WiFi...");
    WiFiMgr.begin();
    WiFiMgr.setStateCallback(onWiFiStateChange);

    // Try to connect to saved WiFi
    if (!WiFiMgr.connectSaved()) {
        Logger.logln("No saved WiFi credentials");
    }

    // Initialize BLE - always use BLE_DEVICE_NAME for Kilter app compatibility
    Logger.logln("Initializing BLE as '%s'...", BLE_DEVICE_NAME);
    BLE.begin(BLE_DEVICE_NAME);
    BLE.setConnectCallback(onBLEConnect);
    BLE.setDataCallback(onBLEData);
    BLE.setLedDataCallback(onBLELedData);

    // Initialize web config server
    Logger.logln("Starting web server...");
    WebConfig.begin();

    Logger.logln("Setup complete!");
    Logger.logln("IP: %s", WiFiMgr.getIP().c_str());

    // Green blink to indicate ready
    LEDs.blink(0, 255, 0, 3, 100);
}

void loop() {
    // Process WiFi
    WiFiMgr.loop();

    // Process BLE
    BLE.loop();

    // Process WebSocket if WiFi connected
    if (wifiConnected) {
        GraphQL.loop();
    }

    // Process web server
    WebConfig.loop();
}

void onWiFiStateChange(WiFiConnectionState state) {
    switch (state) {
        case WiFiConnectionState::CONNECTED: {
            Logger.logln("WiFi connected: %s", WiFiMgr.getIP().c_str());
            wifiConnected = true;

            // Get backend config
            String host = Config.getString("backend_host", DEFAULT_BACKEND_HOST);
            int port = Config.getInt("backend_port", DEFAULT_BACKEND_PORT);
            String path = Config.getString("backend_path", DEFAULT_BACKEND_PATH);
            String apiKey = Config.getString("api_key");

            if (apiKey.length() == 0) {
                Logger.logln("No API key configured - skipping backend connection");
                break;
            }

            Logger.logln("Connecting to backend: %s:%d%s", host.c_str(), port, path.c_str());
            GraphQL.setStateCallback(onGraphQLStateChange);
            GraphQL.setMessageCallback(onGraphQLMessage);
            GraphQL.begin(host.c_str(), port, path.c_str(), apiKey.c_str());
            break;
        }

        case WiFiConnectionState::DISCONNECTED:
            Logger.logln("WiFi disconnected");
            wifiConnected = false;
            backendConnected = false;
            break;

        case WiFiConnectionState::CONNECTING:
            Logger.logln("WiFi connecting...");
            break;

        case WiFiConnectionState::CONNECTION_FAILED:
            Logger.logln("WiFi connection failed");
            break;
    }
}

void onBLEConnect(bool connected) {
    if (connected) {
        Logger.logln("BLE client connected");
    } else {
        Logger.logln("BLE client disconnected");
    }
}

void onBLEData(const uint8_t* data, size_t len) {
    // Raw BLE data callback - Aurora parsing is handled by nordic_uart_ble library
}

/**
 * Callback when LED data is received via Bluetooth from official app
 * Forward the climb to the BoardSesh session so it can be matched
 */
void onBLELedData(const LedCommand* commands, int count, int angle) {
    Logger.logln("Main: Bluetooth LED data received: %d LEDs, angle: %d", count, angle);

    // Forward to backend via WebSocket to match climb
    if (GraphQL.isSubscribed()) {
        GraphQL.sendLedPositions(commands, count, angle);
    } else {
        Logger.logln("Main: Cannot forward LED data - not subscribed to backend");
    }
}

void onGraphQLStateChange(GraphQLConnectionState state) {
    switch (state) {
        case GraphQLConnectionState::CONNECTION_ACK: {
            Logger.logln("Backend connected!");
            backendConnected = true;

            // Get session ID for subscription (API key is passed via connectionParams)
            String sessionId = Config.getString("session_id");

            if (sessionId.length() == 0) {
                Logger.logln("No session ID configured - skipping subscription");
                break;
            }

            // Build variables JSON (apiKey is in connectionParams, not here)
            String variables = "{\"sessionId\":\"" + sessionId + "\"}";

            // Subscribe to controller events
            GraphQL.subscribe("controller-events",
                              "subscription ControllerEvents($sessionId: ID!) { "
                              "controllerEvents(sessionId: $sessionId) { "
                              "... on LedUpdate { __typename commands { position r g b } climbUuid climbName angle } "
                              "... on ControllerPing { __typename timestamp } "
                              "} }",
                              variables.c_str());
            break;
        }

        case GraphQLConnectionState::DISCONNECTED:
            Logger.logln("Backend disconnected");
            backendConnected = false;
            break;

        default:
            break;
    }
}

void onGraphQLMessage(JsonDocument& doc) {
    // Handle incoming GraphQL subscription data
    // Note: LedUpdate is now handled directly by GraphQL.handleLedUpdate
    // This callback is for additional message handling if needed
}

void processLedCommand(JsonDocument& doc) {
    // Legacy - now handled by GraphQL.handleLedUpdate
}

void startupAnimation() {
    // Simple chase animation to verify LED wiring
    for (int i = 0; i < NUM_LEDS; i++) {
        LEDs.clear();
        LEDs.setLed(i, 0, 255, 0);  // Green
        LEDs.show();
        delay(10);
    }

    // Flash all LEDs briefly
    LEDs.clear();
    for (int i = 0; i < NUM_LEDS; i++) {
        LEDs.setLed(i, 0, 0, 255);  // Blue
    }
    LEDs.show();
    delay(200);

    LEDs.clear();
    LEDs.show();
}
