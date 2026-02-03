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

// Conditional libraries for display and proxy modes
#ifdef ENABLE_BLE_PROXY
#include <ble_proxy.h>
#include <climb_history.h>
#endif

#ifdef ENABLE_DISPLAY
#include <lilygo_display.h>
#endif

// Project-specific config
#include "config/board_config.h"
#include "config/led_placement_map.h"

// State
bool wifiConnected = false;
bool backendConnected = false;
String currentBoardPath = "";  // Stored from LedUpdate events

// Forward declarations
void onWiFiStateChange(WiFiConnectionState state);
void onBLEConnect(bool connected);
void onBLEData(const uint8_t* data, size_t len);
void onBLELedData(const LedCommand* commands, int count, int angle);
void onGraphQLStateChange(GraphQLConnectionState state);
void onGraphQLMessage(JsonDocument& doc);
void handleLedUpdateExtended(JsonObject& data);
void startupAnimation();

#ifdef ENABLE_BLE_PROXY
void onBLERawForward(const uint8_t* data, size_t len);
void onProxyStateChange(BLEProxyState state);

// Function to send data to app via BLE (used by proxy)
void sendToAppViaBLE(const uint8_t* data, size_t len) {
    BLE.send(data, len);
}
#endif

void setup() {
    Serial.begin(115200);
    delay(3000);  // Longer delay to ensure serial monitor catches boot messages

    Logger.logln("=================================");
    Logger.logln("%s v%s", DEVICE_NAME, FIRMWARE_VERSION);
    Logger.logln("LED_PIN = %d", LED_PIN);
#ifdef ENABLE_BLE_PROXY
    Logger.logln("BLE Proxy: Enabled");
#endif
#ifdef ENABLE_DISPLAY
    Logger.logln("Display: Enabled");
#endif
    Logger.logln("=================================");

    // Initialize config manager
    Config.begin();

#ifdef ENABLE_DISPLAY
    // Initialize display first (before LEDs for visual feedback)
    Logger.logln("Initializing display... (ENABLE_DISPLAY is defined)");
    if (!Display.begin()) {
        Logger.logln("ERROR: Display initialization failed!");
    } else {
        Logger.logln("Display.begin() returned true");
    }
    Logger.logln("Setting WiFi status...");
    Display.setWiFiStatus(false);
    Logger.logln("Setting BLE status...");
    Display.setBleStatus(false, false);
    Logger.logln("Showing connecting screen...");
    Display.showConnecting();
    Logger.logln("Display initialization complete");
#else
    Logger.logln("ENABLE_DISPLAY is NOT defined");
#endif

    // Initialize LEDs
    Logger.logln("Initializing LEDs on pin %d...", LED_PIN);
    LEDs.begin(LED_PIN, NUM_LEDS);
    LEDs.setBrightness(Config.getInt("brightness", DEFAULT_BRIGHTNESS));

    // Startup animation (brief to confirm LEDs working)
    startupAnimation();


    // Initialize WiFi
    Logger.logln("Initializing WiFi...");
    WiFiMgr.begin();
    WiFiMgr.setStateCallback(onWiFiStateChange);

#ifdef ENABLE_DISPLAY
    Display.setWiFiStatus(false);
#endif

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

#ifdef ENABLE_BLE_PROXY
    // Set up raw data forwarding for proxy mode
    BLE.setRawForwardCallback(onBLERawForward);

    // Initialize proxy
    String targetMac = Config.getString("proxy_mac");
    Proxy.begin(targetMac);
    Proxy.setStateCallback(onProxyStateChange);
#endif

#ifdef ENABLE_DISPLAY
    Display.setBleStatus(true, false);  // BLE enabled, not connected
#endif

    // Initialize web config server
    Logger.logln("Starting web server...");
    WebConfig.begin();

    Logger.logln("Setup complete!");
    Logger.logln("IP: %s", WiFiMgr.getIP().c_str());

    // Green blink to indicate ready
    LEDs.blink(0, 255, 0, 3, 100);

#ifdef ENABLE_DISPLAY
    Display.refresh();
#endif
}

void loop() {
    // Process WiFi
    WiFiMgr.loop();

    // Process BLE
    BLE.loop();

#ifdef ENABLE_BLE_PROXY
    // Process BLE proxy
    Proxy.loop();
#endif

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

#ifdef ENABLE_DISPLAY
            Display.setWiFiStatus(true);
#endif

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
#ifdef ENABLE_DISPLAY
            Display.setWiFiStatus(false);
#endif
            break;

        case WiFiConnectionState::CONNECTING:
            Logger.logln("WiFi connecting...");
#ifdef ENABLE_DISPLAY
            Display.setWiFiStatus(false);
#endif
            break;

        case WiFiConnectionState::CONNECTION_FAILED:
            Logger.logln("WiFi connection failed");
#ifdef ENABLE_DISPLAY
            Display.setWiFiStatus(false);
#endif
            break;
    }
}

void onBLEConnect(bool connected) {
    if (connected) {
        Logger.logln("BLE client connected");
#ifdef ENABLE_DISPLAY
        Display.setBleStatus(true, true);
#endif
    } else {
        Logger.logln("BLE client disconnected");
#ifdef ENABLE_DISPLAY
        Display.setBleStatus(true, false);
#endif
    }
}

void onBLEData(const uint8_t* data, size_t len) {
    // Raw BLE data callback - Aurora parsing is handled by nordic_uart_ble library
}

#ifdef ENABLE_BLE_PROXY
void onBLERawForward(const uint8_t* data, size_t len) {
    // Forward raw BLE data to the actual board via proxy
    if (Proxy.isConnectedToBoard()) {
        Proxy.forwardToBoard(data, len);
    }
}

void onProxyStateChange(BLEProxyState state) {
#ifdef ENABLE_DISPLAY
    switch (state) {
        case BLEProxyState::CONNECTED:
            Display.setBleStatus(true, true);  // BLE enabled, proxy connected
            break;
        case BLEProxyState::SCANNING:
        case BLEProxyState::CONNECTING:
        case BLEProxyState::RECONNECTING:
            Display.setBleStatus(true, false);  // BLE enabled, not connected
            break;
        default:
            break;
    }
#endif
}
#endif

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

            // Subscribe to controller events (including new climbGrade and boardPath fields)
            GraphQL.subscribe("controller-events",
                              "subscription ControllerEvents($sessionId: ID!) { "
                              "controllerEvents(sessionId: $sessionId) { "
                              "... on LedUpdate { __typename commands { position r g b } climbUuid climbName climbGrade boardPath angle } "
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
    // Handle extended LedUpdate data (for display)
    JsonObject payloadObj = doc["payload"];
    if (payloadObj["data"].is<JsonObject>()) {
        JsonObject data = payloadObj["data"];
        if (data["controllerEvents"].is<JsonObject>()) {
            JsonObject event = data["controllerEvents"];
            const char* typename_ = event["__typename"];

            if (typename_ && strcmp(typename_, "LedUpdate") == 0) {
                handleLedUpdateExtended(event);
            }
        }
    }
}

/**
 * Handle extended LedUpdate data for display
 * This is called in addition to GraphQL.handleLedUpdate (which handles LED control)
 */
void handleLedUpdateExtended(JsonObject& data) {
#ifdef ENABLE_DISPLAY
    // Store boardPath for QR code generation
    const char* boardPath = data["boardPath"];
    if (boardPath) {
        currentBoardPath = boardPath;
    }

    // Update display with climb info
    const char* climbName = data["climbName"];
    const char* climbGrade = data["climbGrade"];
    const char* climbUuid = data["climbUuid"];
    int angle = data["angle"] | 0;

    // Extract board type from boardPath (e.g., "kilter/1/12/1,2,3/40" -> "kilter")
    String boardType = "kilter";
    if (boardPath) {
        String bp = boardPath;
        int slashPos = bp.indexOf('/');
        if (slashPos > 0) {
            boardType = bp.substring(0, slashPos);
        }
    }

    if (climbName && climbUuid) {
        // lilygo-display uses showClimb with gradeColor (hex), but we don't have it
        // Pass empty string for gradeColor - display will use default
        Display.showClimb(
            climbName,
            climbGrade ? climbGrade : "",
            "",  // gradeColor - not available from backend yet
            angle,
            climbUuid,
            boardType.c_str()
        );
    } else {
        // No climb - clear display
        Display.showNoClimb();
    }
#else
    // Store boardPath even without display (might be useful for logging)
    const char* boardPath = data["boardPath"];
    if (boardPath) {
        currentBoardPath = boardPath;
    }
#endif
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
