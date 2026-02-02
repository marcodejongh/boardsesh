#include <Arduino.h>
#include <map>

// Shared libraries
#include <log_buffer.h>
#include <config_manager.h>
#include <wifi_utils.h>
#include <graphql_ws_client.h>
#include <esp_web_server.h>

// BLE client for proxy mode
#include <aurora_ble_client.h>

// Display library
#include "climb_display.h"

// Project configuration
#include "config/display_config.h"
#include "config/hold_positions.h"

// ============================================
// State
// ============================================

bool wifiConnected = false;
bool backendConnected = false;
bool bleConnected = false;
bool bleProxyEnabled = false;
unsigned long lastDisplayUpdate = 0;
unsigned long lastBleScanTime = 0;
const unsigned long DISPLAY_UPDATE_INTERVAL = 100; // ms
const unsigned long BLE_SCAN_INTERVAL = 30000; // Retry scan every 30 seconds

// Current climb data
ClimbInfo currentClimb;
std::vector<DisplayHold> currentHolds;
std::vector<LedCommand> currentLedCommands;  // Store for forwarding to BLE
bool hasCurrentClimb = false;

// Hold position cache (placement ID -> screen coordinates)
// This is populated dynamically from backend data or baked-in data
std::map<uint16_t, std::pair<float, float>> holdPositionCache;

// ============================================
// Forward Declarations
// ============================================

void onWiFiStateChange(WiFiConnectionState state);
void onGraphQLStateChange(GraphQLConnectionState state);
void onLedUpdate(const LedCommand* commands, int count, const char* climbUuid, const char* climbName, int angle);
void onBleConnect(bool connected, const char* deviceName);
void onBleScan(const char* deviceName, const char* address);
void updateDisplay();
void forwardToBoard();
uint16_t holdStateToColor(const char* state);
void populateHoldPositionCache();

// ============================================
// Setup
// ============================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Logger.logln("=================================");
    Logger.logln("%s v%s", DEVICE_NAME, FIRMWARE_VERSION);
    Logger.logln("ESP32-S3 Touch LCD 4.3\"");
    Logger.logln("=================================");

    // Initialize config manager
    Config.begin();

    // Initialize display
    Logger.logln("Initializing display...");
    if (!Display.begin()) {
        Logger.logln("ERROR: Display initialization failed!");
        while (1) delay(1000);
    }

    // Show connecting screen
    Display.showConnecting();

    // Initialize WiFi
    Logger.logln("Initializing WiFi...");
    WiFiMgr.begin();
    WiFiMgr.setStateCallback(onWiFiStateChange);

    // Try to connect to saved WiFi
    if (!WiFiMgr.connectSaved()) {
        Logger.logln("No saved WiFi credentials - starting config portal");
        Display.showError("Configure WiFi");
    }

    // Initialize web config server
    Logger.logln("Starting web server...");
    WebConfig.begin();

    // Populate hold position cache from baked-in data
    populateHoldPositionCache();

    // Initialize BLE client for proxy mode
    bleProxyEnabled = Config.getBool("ble_proxy_enabled", false);
    if (bleProxyEnabled) {
        Logger.logln("Initializing BLE client for proxy mode...");
        BLEClient.begin();
        BLEClient.setConnectCallback(onBleConnect);
        BLEClient.setScanCallback(onBleScan);

        // Check for saved board address
        String savedBoardAddress = Config.getString("ble_board_address");
        if (savedBoardAddress.length() > 0) {
            Logger.logln("Connecting to saved board: %s", savedBoardAddress.c_str());
            BLEClient.connect(savedBoardAddress.c_str());
        } else {
            // Start scanning for boards
            BLEClient.setAutoConnect(true);
            BLEClient.startScan(30);
        }
    }

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

    // Process web server
    WebConfig.loop();

    // Process BLE client if proxy mode enabled
    if (bleProxyEnabled) {
        BLEClient.loop();

        // Retry scanning if not connected and not already scanning
        unsigned long now = millis();
        if (!bleConnected && !BLEClient.isScanning() &&
            now - lastBleScanTime > BLE_SCAN_INTERVAL) {
            Logger.logln("Retrying BLE scan...");
            BLEClient.startScan(15);
            lastBleScanTime = now;
        }
    }

    // Handle touch input
    int16_t touchX, touchY;
    if (Display.getTouchPoint(touchX, touchY)) {
        // Could add touch interactions here
        Logger.logln("Touch: %d, %d", touchX, touchY);
    }

    // Periodic display refresh (for animations, status updates, etc.)
    unsigned long now = millis();
    if (now - lastDisplayUpdate > DISPLAY_UPDATE_INTERVAL) {
        lastDisplayUpdate = now;
        // Could add status bar updates here
    }
}

// ============================================
// WiFi Callbacks
// ============================================

void onWiFiStateChange(WiFiConnectionState state) {
    switch (state) {
        case WiFiConnectionState::CONNECTED: {
            Logger.logln("WiFi connected: %s", WiFiMgr.getIP().c_str());
            wifiConnected = true;

            // Show IP on display
            Display.showStatus(("WiFi: " + WiFiMgr.getIP()).c_str());

            // Get backend config
            String host = Config.getString("backend_host", DEFAULT_BACKEND_HOST);
            int port = Config.getInt("backend_port", DEFAULT_BACKEND_PORT);
            String path = Config.getString("backend_path", DEFAULT_BACKEND_PATH);
            String apiKey = Config.getString("api_key");

            if (apiKey.length() == 0) {
                Logger.logln("No API key configured - skipping backend connection");
                Display.showError("Configure API key");
                break;
            }

            Logger.logln("Connecting to backend: %s:%d%s", host.c_str(), port, path.c_str());
            Display.showStatus("Connecting to Boardsesh...");

            GraphQL.setStateCallback(onGraphQLStateChange);
            // Use LED update callback - receives parsed LED commands directly
            GraphQL.setLedUpdateCallback(onLedUpdate);
            GraphQL.begin(host.c_str(), port, path.c_str(), apiKey.c_str());
            break;
        }

        case WiFiConnectionState::DISCONNECTED:
            Logger.logln("WiFi disconnected");
            wifiConnected = false;
            backendConnected = false;
            Display.showConnecting();
            break;

        case WiFiConnectionState::CONNECTING:
            Logger.logln("WiFi connecting...");
            break;

        case WiFiConnectionState::CONNECTION_FAILED:
            Logger.logln("WiFi connection failed");
            Display.showError("WiFi connection failed");
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

            // Get session ID for subscription
            String sessionId = Config.getString("session_id");

            if (sessionId.length() == 0) {
                Logger.logln("No session ID configured");
                Display.showError("Configure session ID");
                break;
            }

            Display.showStatus("Subscribing to session...");

            // Build variables JSON
            String variables = "{\"sessionId\":\"" + sessionId + "\"}";

            // Subscribe to controller events (same as board-controller)
            GraphQL.subscribe("controller-events",
                "subscription ControllerEvents($sessionId: ID!) { "
                "controllerEvents(sessionId: $sessionId) { "
                "... on LedUpdate { __typename commands { position r g b } climbUuid climbName angle } "
                "... on ControllerPing { __typename timestamp } "
                "} }",
                variables.c_str());

            // Show waiting state
            Display.showNoClimb();
            break;
        }

        case GraphQLConnectionState::SUBSCRIBED:
            Logger.logln("Subscribed to session updates");
            Display.showStatus("Connected - waiting for climb");
            break;

        case GraphQLConnectionState::DISCONNECTED:
            Logger.logln("Backend disconnected");
            backendConnected = false;
            Display.showConnecting();
            break;

        default:
            break;
    }
}

// ============================================
// LED Update Callback
// ============================================

void onLedUpdate(const LedCommand* commands, int count, const char* climbUuid, const char* climbName, int angle) {
    Logger.logln("LED Update: %s @ %d degrees (%d holds)",
                 climbName ? climbName : "(none)", angle, count);

    // Handle clear command (no holds)
    if (commands == nullptr || count == 0) {
        hasCurrentClimb = false;
        currentHolds.clear();
        currentLedCommands.clear();
        Display.showNoClimb();

        // Also clear LEDs on connected board
        if (bleProxyEnabled && bleConnected) {
            BLEClient.clearLeds();
        }
        return;
    }

    // Store LED commands for forwarding to BLE
    currentLedCommands.clear();
    currentLedCommands.reserve(count);
    for (int i = 0; i < count; i++) {
        currentLedCommands.push_back(commands[i]);
    }

    // Update current climb info
    currentClimb.uuid = climbUuid ? climbUuid : "";
    currentClimb.name = climbName ? climbName : "";
    currentClimb.angle = angle;
    currentClimb.mirrored = false;

    // Clear previous holds
    currentHolds.clear();

    // Process LED commands into display holds
    for (int i = 0; i < count; i++) {
        const LedCommand& cmd = commands[i];

        // Convert RGB to RGB565
        uint16_t color = Display.getDisplay().color565(cmd.r, cmd.g, cmd.b);

        // Look up hold position
        auto it = holdPositionCache.find(cmd.position);
        if (it != holdPositionCache.end()) {
            // Convert to display coordinates
            float cx = it->second.first;
            float cy = it->second.second;

            int16_t displayX, displayY;
            scaleToDisplay(cx, cy,
                          ClimbDisplay::BOARD_AREA_WIDTH,
                          ClimbDisplay::BOARD_AREA_HEIGHT,
                          displayX, displayY);

            int16_t radius = getDisplayRadius(
                ClimbDisplay::BOARD_AREA_WIDTH,
                ClimbDisplay::BOARD_AREA_HEIGHT);

            DisplayHold hold;
            hold.x = displayX;
            hold.y = displayY;
            hold.radius = radius > 8 ? radius : 8;  // Minimum visible radius
            hold.color = color;

            currentHolds.push_back(hold);
        } else {
            // Position not in cache - use a default grid position as fallback
            int gridCols = 12;
            int col = cmd.position % gridCols;
            int row = (cmd.position / gridCols) % 20;

            int16_t displayX = 30 + col * 30;
            int16_t displayY = 30 + row * 22;

            DisplayHold hold;
            hold.x = displayX;
            hold.y = displayY;
            hold.radius = 8;
            hold.color = color;

            currentHolds.push_back(hold);
        }
    }

    // Check if we have a climb
    hasCurrentClimb = (count > 0 && climbName && strlen(climbName) > 0);

    // Update display
    if (hasCurrentClimb) {
        Display.showClimb(currentClimb, currentHolds);
    } else {
        Display.showNoClimb();
    }

    // Forward LED commands to connected board via BLE
    forwardToBoard();
}

// ============================================
// BLE Callbacks
// ============================================

void onBleConnect(bool connected, const char* deviceName) {
    bleConnected = connected;

    if (connected) {
        Logger.logln("BLE: Connected to board: %s", deviceName ? deviceName : "(unknown)");
        Display.setBleStatus(true, deviceName);

        // Save the board address for future reconnection
        String address = BLEClient.getConnectedDeviceAddress();
        if (address.length() > 0) {
            Config.setString("ble_board_address", address.c_str());
        }

        // If we have a current climb, forward it to the board
        if (hasCurrentClimb && currentLedCommands.size() > 0) {
            Logger.logln("BLE: Sending current climb to newly connected board");
            forwardToBoard();
        }
    } else {
        Logger.logln("BLE: Disconnected from board");
        Display.setBleStatus(false, nullptr);
    }
}

void onBleScan(const char* deviceName, const char* address) {
    Logger.logln("BLE: Found board: %s (%s)", deviceName, address);
    // Could update display with discovered boards for user selection
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

// ============================================
// Utility Functions
// ============================================

uint16_t holdStateToColor(const char* state) {
    if (strcmp(state, "STARTING") == 0) return HOLD_COLOR_STARTING;
    if (strcmp(state, "HAND") == 0) return HOLD_COLOR_HAND;
    if (strcmp(state, "FINISH") == 0) return HOLD_COLOR_FINISH;
    if (strcmp(state, "FOOT") == 0) return HOLD_COLOR_FOOT;
    return HOLD_COLOR_OFF;
}

void populateHoldPositionCache() {
    // ==========================================================================
    // IMPORTANT: PLACEHOLDER DATA - WILL NOT WORK WITH REAL BOARDS
    // ==========================================================================
    //
    // This function creates FAKE hold positions for testing/development only.
    // For the display to show holds correctly on a real Kilter/Tension board,
    // you MUST replace this with actual hold placement data.
    //
    // To get real hold data for your board configuration:
    //
    // 1. Use the Boardsesh web app to export hold placements:
    //    - Go to your board configuration page
    //    - Look for the HOLE_PLACEMENTS data in the API response
    //    - Export the placement IDs and (x, y) coordinates
    //
    // 2. Or query the Aurora API directly for your layout/size/set combination
    //
    // 3. Convert the data to this format:
    //    holdPositionCache[placementId] = std::make_pair(cx, cy);
    //    where (cx, cy) are coordinates after holdToScreenCoords() transform
    //
    // The placement ID is sent in LedUpdate events from the backend.
    // If the ID isn't in this cache, the hold will fall back to a grid position.
    //
    // ==========================================================================

    Logger.logln("WARNING: Using placeholder hold positions (testing only)");

    // PLACEHOLDER: Fake grid for testing - replace with real data!
    // These IDs (4117+) are examples from Kilter Homewall 10x12
    int placementId = 4117;
    for (int row = 0; row < 15; row++) {
        for (int col = 0; col < 12; col++) {
            int16_t x = -48 + col * 8;
            int16_t y = 140 - row * 8;

            float cx, cy;
            holdToScreenCoords(x, y, cx, cy);

            holdPositionCache[placementId] = std::make_pair(cx, cy);
            placementId++;
        }
    }

    Logger.logln("Hold position cache: %d placeholder entries (replace for production!)",
                 holdPositionCache.size());
}

void updateDisplay() {
    // Called periodically to refresh display if needed
    // Currently handled by showClimb/showNoClimb directly
}
