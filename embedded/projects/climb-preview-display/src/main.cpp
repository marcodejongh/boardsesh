#include <Arduino.h>
#include <map>

// Shared libraries
#include <log_buffer.h>
#include <config_manager.h>
#include <wifi_utils.h>
#include <graphql_ws_client.h>
#include <esp_web_server.h>

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
unsigned long lastDisplayUpdate = 0;
const unsigned long DISPLAY_UPDATE_INTERVAL = 100; // ms

// Current climb data
ClimbInfo currentClimb;
std::vector<DisplayHold> currentHolds;
bool hasCurrentClimb = false;

// Hold position cache (placement ID -> screen coordinates)
// This is populated dynamically from backend data or baked-in data
std::map<uint16_t, std::pair<float, float>> holdPositionCache;

// ============================================
// Forward Declarations
// ============================================

void onWiFiStateChange(WiFiConnectionState state);
void onGraphQLStateChange(GraphQLConnectionState state);
void onGraphQLMessage(JsonDocument& doc);
void processLedUpdate(JsonObject& data);
void updateDisplay();
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
            GraphQL.setMessageCallback(onGraphQLMessage);
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

void onGraphQLMessage(JsonDocument& doc) {
    // Handle incoming GraphQL subscription data
    JsonObject payload = doc["payload"]["data"]["controllerEvents"];

    if (!payload) {
        return;
    }

    const char* typeName = payload["__typename"];

    if (strcmp(typeName, "LedUpdate") == 0) {
        processLedUpdate(payload);
    } else if (strcmp(typeName, "ControllerPing") == 0) {
        Logger.logln("Received ping");
    }
}

// ============================================
// LED Update Processing
// ============================================

void processLedUpdate(JsonObject& data) {
    const char* climbUuid = data["climbUuid"] | "";
    const char* climbName = data["climbName"] | "";
    int angle = data["angle"] | 0;
    JsonArray commands = data["commands"];

    Logger.logln("LED Update: %s @ %d degrees (%d holds)",
                 climbName, angle, commands.size());

    // Update current climb info
    currentClimb.uuid = climbUuid;
    currentClimb.name = climbName;
    currentClimb.angle = angle;
    currentClimb.mirrored = false;  // TODO: Get from LedUpdate if available

    // Clear previous holds
    currentHolds.clear();

    // Process LED commands into display holds
    for (JsonObject cmd : commands) {
        int position = cmd["position"];
        int r = cmd["r"];
        int g = cmd["g"];
        int b = cmd["b"];

        // Convert RGB to RGB565
        uint16_t color = Display.getDisplay().color565(r, g, b);

        // Look up hold position
        auto it = holdPositionCache.find(position);
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
            // Position not in cache - use a default position based on position ID
            // This is a fallback for when we don't have position data
            // In production, you'd want to ensure all positions are in the cache

            // Simple grid layout as fallback
            int gridCols = 12;
            int col = position % gridCols;
            int row = position / gridCols;

            int16_t displayX = 30 + col * 30;
            int16_t displayY = 30 + row * 30;

            DisplayHold hold;
            hold.x = displayX;
            hold.y = displayY;
            hold.radius = 8;
            hold.color = color;

            currentHolds.push_back(hold);
        }
    }

    // Check if we have a climb
    hasCurrentClimb = (commands.size() > 0 && strlen(climbName) > 0);

    // Update display
    if (hasCurrentClimb) {
        Display.showClimb(currentClimb, currentHolds);
    } else {
        Display.showNoClimb();
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
    // This function populates the hold position cache from baked-in data
    // or could be extended to load from SPIFFS/configuration

    // For now, this is a placeholder - the actual hold positions depend on
    // the specific board configuration (layout, size, sets)

    // Example: Manually add some positions for testing
    // In production, these would come from the generated data or a backend query

    Logger.logln("Populating hold position cache...");

    // The cache maps placement IDs to (cx, cy) in image coordinates
    // These would normally come from HOLE_PLACEMENTS data

    // Placeholder: Create a grid of positions for testing
    // Replace this with actual hold data for your board configuration

    int placementId = 4117;  // Starting from Kilter Homewall 10x12 first hold
    for (int row = 0; row < 15; row++) {
        for (int col = 0; col < 12; col++) {
            // Calculate raw coordinates (similar to actual data)
            int16_t x = -48 + col * 8;
            int16_t y = 140 - row * 8;

            // Convert to screen coordinates
            float cx, cy;
            holdToScreenCoords(x, y, cx, cy);

            holdPositionCache[placementId] = std::make_pair(cx, cy);
            placementId++;
        }
    }

    Logger.logln("Hold position cache populated with %d entries", holdPositionCache.size());
}

void updateDisplay() {
    // Called periodically to refresh display if needed
    // Currently handled by showClimb/showNoClimb directly
}
