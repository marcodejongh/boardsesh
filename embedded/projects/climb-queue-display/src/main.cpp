#include <Arduino.h>

// Shared libraries
#include <log_buffer.h>
#include <config_manager.h>
#include <wifi_utils.h>
#include <graphql_ws_client.h>
#include <esp_web_server.h>
#include <lilygo_display.h>

// BLE client for proxy mode - disabled for now due to NimBLE API issues
// TODO: Re-enable once aurora-ble-client is updated for NimBLE 1.4.x
// #include <aurora_ble_client.h>
#define BLE_PROXY_DISABLED 1

// Project configuration
#include "config/display_config.h"

// ============================================
// State
// ============================================

bool wifiConnected = false;
bool backendConnected = false;
String boardType = "kilter";

#if !BLE_PROXY_DISABLED
bool bleConnected = false;
bool bleProxyEnabled = false;
unsigned long lastBleScanTime = 0;
const unsigned long BLE_SCAN_INTERVAL = 30000;
std::vector<LedCommand> currentLedCommands;
#endif

unsigned long lastDisplayUpdate = 0;
const unsigned long DISPLAY_UPDATE_INTERVAL = 100;
const int MAX_LED_COMMANDS = 500;

// Current climb data
String currentClimbUuid = "";
String currentClimbName = "";
String currentGrade = "";
String currentGradeColor = "";
bool hasCurrentClimb = false;

// ============================================
// Forward Declarations
// ============================================

void onWiFiStateChange(WiFiConnectionState state);
void onGraphQLStateChange(GraphQLConnectionState state);
void onLedUpdate(const LedCommand* commands, int count, const char* climbUuid,
                 const char* climbName, const char* grade, const char* gradeColor, int angle);

#if !BLE_PROXY_DISABLED
void onBleConnect(bool connected, const char* deviceName);
void onBleScan(const char* deviceName, const char* address);
void forwardToBoard();
#endif

// ============================================
// Setup
// ============================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Logger.logln("=================================");
    Logger.logln("%s v%s", DEVICE_NAME, FIRMWARE_VERSION);
    Logger.logln("LilyGo T-Display S3 (170x320)");
    Logger.logln("=================================");

    // Initialize config manager first (needed for display settings)
    Config.begin();

    // Initialize display
    Logger.logln("Initializing display...");
    if (!Display.begin()) {
        Logger.logln("ERROR: Display initialization failed!");
        while (1) delay(1000);
    }

    Display.showConnecting();

    // Load board type
    boardType = Config.getString("board_type", "kilter");

    // Initialize WiFi
    Logger.logln("Initializing WiFi...");
    WiFiMgr.begin();
    WiFiMgr.setStateCallback(onWiFiStateChange);

    // Try to connect to saved WiFi or start AP mode for setup
    if (!WiFiMgr.connectSaved()) {
        Logger.logln("No saved WiFi credentials - starting AP mode");
        String apName = "Boardsesh-Queue-" + String((uint32_t)(ESP.getEfuseMac() & 0xFFFF), HEX);
        if (WiFiMgr.startAP(apName.c_str())) {
            Display.showConfigPortal(apName.c_str(), WiFiMgr.getAPIP().c_str());
        } else {
            Display.showError("AP Mode Failed");
        }
    }

    // Initialize web config server
    Logger.logln("Starting web server...");
    WebConfig.begin();

    // Initialize BLE client for proxy mode
#if !BLE_PROXY_DISABLED
    bleProxyEnabled = Config.getBool("ble_proxy_enabled", false);
    if (bleProxyEnabled) {
        Logger.logln("Initializing BLE client for proxy mode...");
        BLEClient.begin();
        BLEClient.setConnectCallback(onBleConnect);
        BLEClient.setScanCallback(onBleScan);

        String savedBoardAddress = Config.getString("ble_board_address");
        if (savedBoardAddress.length() > 0) {
            Logger.logln("Connecting to saved board: %s", savedBoardAddress.c_str());
            BLEClient.connect(savedBoardAddress.c_str());
        } else {
            BLEClient.setAutoConnect(true);
            BLEClient.startScan(BLE_SCAN_TIMEOUT_SEC);
        }
    }
    Display.setBleStatus(bleProxyEnabled, false);
#else
    Logger.logln("BLE proxy mode disabled in this build");
    Display.setBleStatus(false, false);
#endif

    Logger.logln("Setup complete!");
}

// ============================================
// Main Loop
// ============================================

void loop() {
    // Process WiFi
    WiFiMgr.loop();

    // Process WebSocket if WiFi connected
    if (wifiConnected) {
        GraphQL.loop();
    }

    // Process web server (works in both AP and STA mode)
    WebConfig.loop();

    // Process BLE client if proxy mode enabled
#if !BLE_PROXY_DISABLED
    if (bleProxyEnabled) {
        BLEClient.loop();

        // Retry scanning if not connected
        unsigned long now = millis();
        if (!bleConnected && !BLEClient.isScanning() &&
            now - lastBleScanTime > BLE_SCAN_INTERVAL) {
            Logger.logln("Retrying BLE scan...");
            BLEClient.startScan(15);
            if (BLEClient.isScanning()) {
                lastBleScanTime = now;
            }
        }
    }
#endif

    // Handle button presses
    static bool lastButton1 = HIGH;
    static unsigned long button1PressTime = 0;
    bool button1 = digitalRead(BUTTON_1_PIN);

    // Button 1 - long press (3 sec) to reset config
    if (button1 == LOW && lastButton1 == HIGH) {
        button1PressTime = millis();
        Logger.logln("Button 1 pressed - hold 3s to reset config");
    }
    if (button1 == LOW && button1PressTime > 0 && millis() - button1PressTime > 3000) {
        Logger.logln("Resetting configuration...");
        Display.showError("Resetting...");

        Config.setString("wifi_ssid", "");
        Config.setString("wifi_pass", "");
        Config.setString("api_key", "");
        Config.setString("session_id", "");

        delay(1000);
        ESP.restart();
    }
    if (button1 == HIGH) {
        button1PressTime = 0;
    }
    lastButton1 = button1;
}

// ============================================
// WiFi Callbacks
// ============================================

void onWiFiStateChange(WiFiConnectionState state) {
    switch (state) {
        case WiFiConnectionState::CONNECTED: {
            Logger.logln("WiFi connected: %s", WiFiMgr.getIP().c_str());
            wifiConnected = true;
            Display.setWiFiStatus(true);

            // Stop AP mode if it was active
            if (WiFiMgr.isAPMode()) {
                WiFiMgr.stopAP();
            }

            // Get backend config
            String host = Config.getString("backend_host", DEFAULT_BACKEND_HOST);
            int port = Config.getInt("backend_port", DEFAULT_BACKEND_PORT);
            String path = Config.getString("backend_path", DEFAULT_BACKEND_PATH);
            String apiKey = Config.getString("api_key");

            if (apiKey.length() == 0) {
                Logger.logln("No API key configured");
                Display.showError("Configure API key", WiFiMgr.getIP().c_str());
                break;
            }

            String sessionId = Config.getString("session_id");
            if (sessionId.length() == 0) {
                Logger.logln("No session ID configured");
                Display.showError("Configure session", WiFiMgr.getIP().c_str());
                break;
            }

            Logger.logln("Connecting to backend: %s:%d%s", host.c_str(), port, path.c_str());
            Display.showConnecting();

            GraphQL.setStateCallback(onGraphQLStateChange);
            GraphQL.setLedUpdateCallback(onLedUpdate);
            GraphQL.begin(host.c_str(), port, path.c_str(), apiKey.c_str());
            break;
        }

        case WiFiConnectionState::DISCONNECTED:
            Logger.logln("WiFi disconnected");
            wifiConnected = false;
            backendConnected = false;
            Display.setWiFiStatus(false);
            Display.setBackendStatus(false);
            Display.showConnecting();
            break;

        case WiFiConnectionState::CONNECTING:
            Logger.logln("WiFi connecting...");
            break;

        case WiFiConnectionState::CONNECTION_FAILED:
            Logger.logln("WiFi connection failed");
            Display.showError("WiFi failed");
            break;

        case WiFiConnectionState::AP_MODE:
            Logger.logln("WiFi AP mode active: %s", WiFiMgr.getAPIP().c_str());
            break;
    }
}

// ============================================
// GraphQL Callbacks
// ============================================

void onGraphQLStateChange(GraphQLConnectionState state) {
    switch (state) {
        case GraphQLConnectionState::CONNECTION_ACK: {
            Logger.logln("Backend connected!");
            backendConnected = true;
            Display.setBackendStatus(true);

            String sessionId = Config.getString("session_id");
            if (sessionId.length() == 0) {
                Logger.logln("No session ID configured");
                Display.showError("Configure session");
                break;
            }

            String variables = "{\"sessionId\":\"" + sessionId + "\"}";
            GraphQL.subscribe("controller-events",
                "subscription ControllerEvents($sessionId: ID!) { "
                "controllerEvents(sessionId: $sessionId) { "
                "... on LedUpdate { __typename commands { position r g b } climbUuid climbName grade gradeColor angle } "
                "... on ControllerPing { __typename timestamp } "
                "} }",
                variables.c_str());

            hasCurrentClimb = false;
            Display.showNoClimb();
            break;
        }

        case GraphQLConnectionState::SUBSCRIBED:
            Logger.logln("Subscribed to session updates");
            break;

        case GraphQLConnectionState::DISCONNECTED:
            Logger.logln("Backend disconnected");
            backendConnected = false;
            Display.setBackendStatus(false);
            Display.showConnecting();
            break;

        default:
            break;
    }
}

// ============================================
// LED Update Callback
// ============================================

void onLedUpdate(const LedCommand* commands, int count, const char* climbUuid,
                 const char* climbName, const char* grade, const char* gradeColor, int angle) {
    Logger.logln("LED Update: %s [%s] @ %d degrees (%d holds)",
                 climbName ? climbName : "(none)",
                 grade ? grade : "?",
                 angle, count);

    // Handle clear command
    if (commands == nullptr || count == 0) {
        if (hasCurrentClimb && currentClimbName.length() > 0) {
            Display.addToHistory(currentClimbName.c_str(), currentGrade.c_str(), currentGradeColor.c_str());
        }

        hasCurrentClimb = false;
        currentClimbUuid = "";
        currentClimbName = "";
        currentGrade = "";
        currentGradeColor = "";

        Display.showNoClimb();

#if !BLE_PROXY_DISABLED
        currentLedCommands.clear();
        if (bleProxyEnabled && bleConnected) {
            BLEClient.clearLeds();
        }
#endif
        return;
    }

    // Validate count
    if (count > MAX_LED_COMMANDS) {
        Logger.logln("WARNING: Received %d LED commands, limiting to %d", count, MAX_LED_COMMANDS);
        count = MAX_LED_COMMANDS;
    }

    // Add previous climb to history if different
    if (hasCurrentClimb && currentClimbUuid.length() > 0 &&
        climbUuid && String(climbUuid) != currentClimbUuid) {
        Display.addToHistory(currentClimbName.c_str(), currentGrade.c_str(), currentGradeColor.c_str());
    }

#if !BLE_PROXY_DISABLED
    // Store LED commands for BLE forwarding
    currentLedCommands.clear();
    currentLedCommands.reserve(count);
    for (int i = 0; i < count; i++) {
        currentLedCommands.push_back(commands[i]);
    }
#endif

    // Update state
    currentClimbUuid = climbUuid ? climbUuid : "";
    currentClimbName = climbName ? climbName : "";
    currentGrade = grade ? grade : "";
    currentGradeColor = gradeColor ? gradeColor : "";
    hasCurrentClimb = true;

    // Update display
    Display.showClimb(climbName, grade, gradeColor, angle, climbUuid, boardType.c_str());

#if !BLE_PROXY_DISABLED
    // Forward to BLE board
    forwardToBoard();
#endif
}

// ============================================
// BLE Callbacks
// ============================================

#if !BLE_PROXY_DISABLED
void onBleConnect(bool connected, const char* deviceName) {
    bleConnected = connected;
    Display.setBleStatus(bleProxyEnabled, connected);

    if (connected) {
        Logger.logln("BLE: Connected to board: %s", deviceName ? deviceName : "(unknown)");

        String address = BLEClient.getConnectedDeviceAddress();
        if (address.length() > 0) {
            Config.setString("ble_board_address", address.c_str());
        }

        if (hasCurrentClimb && currentLedCommands.size() > 0) {
            Logger.logln("BLE: Sending current climb to newly connected board");
            forwardToBoard();
        }
    } else {
        Logger.logln("BLE: Disconnected from board");
    }
}

void onBleScan(const char* deviceName, const char* address) {
    Logger.logln("BLE: Found board: %s (%s)", deviceName, address);
}

void forwardToBoard() {
    if (!bleProxyEnabled || !bleConnected || currentLedCommands.empty()) {
        return;
    }

    Logger.logln("BLE: Forwarding %d LED commands to board", currentLedCommands.size());
    if (BLEClient.sendLedCommands(currentLedCommands.data(), currentLedCommands.size())) {
        Logger.logln("BLE: LED commands sent successfully");
    } else {
        Logger.logln("BLE: Failed to send LED commands");
    }
}
#endif
