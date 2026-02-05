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

#ifdef ENABLE_DISPLAY
// Queue/climb state for display
String currentQueueItemUuid = "";
String currentGradeColor = "";
String currentClimbUuid = "";
String currentClimbName = "";
String currentGrade = "";
String boardType = "kilter";
bool hasCurrentClimb = false;

// Static buffer for queue sync to avoid heap fragmentation
// LocalQueueItem is ~88 bytes each, so 150 items = ~13KB
static LocalQueueItem g_queueSyncBuffer[MAX_QUEUE_SIZE];

/**
 * Convert hex color string to RGB565 without String allocations
 * @param hex Color string in format "#RRGGBB"
 * @return RGB565 color value, or 0xFFFF (white) if invalid
 */
static uint16_t hexToRgb565Fast(const char* hex) {
    if (!hex || hex[0] != '#' || strlen(hex) < 7) {
        return 0xFFFF;  // White default
    }

    // Parse hex digits directly without String objects
    char buf[3] = {0, 0, 0};

    buf[0] = hex[1]; buf[1] = hex[2];
    uint8_t r = strtol(buf, NULL, 16);

    buf[0] = hex[3]; buf[1] = hex[4];
    uint8_t g = strtol(buf, NULL, 16);

    buf[0] = hex[5]; buf[1] = hex[6];
    uint8_t b = strtol(buf, NULL, 16);

    // Convert to RGB565: 5 bits red, 6 bits green, 5 bits blue
    return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}
#endif

// Forward declarations
void onWiFiStateChange(WiFiConnectionState state);
void onBLEConnect(bool connected);
void onBLEData(const uint8_t* data, size_t len);
void onBLELedData(const LedCommand* commands, int count, int angle);
void onGraphQLStateChange(GraphQLConnectionState state);
void onGraphQLMessage(JsonDocument& doc);
#ifdef ENABLE_DISPLAY
void handleLedUpdateExtended(JsonObject& data);
void onQueueSync(const ControllerQueueSyncData& data);
void navigatePrevious();
void navigateNext();
void sendNavigationMutation(const char* queueItemUuid);
#endif
void startupAnimation();

#ifdef ENABLE_BLE_PROXY
void onBLERawForward(const uint8_t* data, size_t len);
void onProxyStateChange(BLEProxyState state);
void onWebSocketLedUpdate(const LedCommand* commands, int count);

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
#ifdef ENABLE_BLE_PROXY
    // When proxy is enabled, don't advertise yet - connect to board first
    // Advertising will start after successful connection to real board
    BLE.begin(BLE_DEVICE_NAME, false);
#else
    BLE.begin(BLE_DEVICE_NAME, true);
#endif
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
    Proxy.setSendToAppCallback(sendToAppViaBLE);
#endif

#ifdef ENABLE_DISPLAY
    Display.setBleStatus(true, false);  // BLE enabled, not connected

    // Initialize button pins for navigation
    pinMode(BUTTON_1_PIN, INPUT_PULLUP);
    pinMode(BUTTON_2_PIN, INPUT_PULLUP);
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

#ifdef ENABLE_DISPLAY
    // Handle button presses with debouncing
    static bool lastButton1 = HIGH;
    static bool lastButton2 = HIGH;
    static unsigned long button1PressTime = 0;
    static unsigned long button2PressTime = 0;
    static bool button1LongPressTriggered = false;
    static const unsigned long DEBOUNCE_MS = 50;
    static const unsigned long LONG_PRESS_MS = 3000;
    static const unsigned long SHORT_PRESS_MAX_MS = 500;

    bool button1 = digitalRead(BUTTON_1_PIN);
    bool button2 = digitalRead(BUTTON_2_PIN);
    unsigned long now = millis();

    // Button 1: Short press = previous, Long press (3s) = reset config
    if (button1 == LOW && lastButton1 == HIGH) {
        // Button just pressed
        button1PressTime = now;
        button1LongPressTriggered = false;
    } else if (button1 == LOW && button1PressTime > 0) {
        // Button held down - check for long press
        if (!button1LongPressTriggered && now - button1PressTime > LONG_PRESS_MS) {
            Logger.logln("Button 1 long press - resetting configuration...");
            Display.showError("Resetting...");
            button1LongPressTriggered = true;

            Config.setString("wifi_ssid", "");
            Config.setString("wifi_pass", "");
            Config.setString("api_key", "");
            Config.setString("session_id", "");

            delay(1000);
            ESP.restart();
        }
    } else if (button1 == HIGH && lastButton1 == LOW) {
        // Button just released - check for short press (navigate previous)
        if (!button1LongPressTriggered && button1PressTime > 0) {
            unsigned long pressDuration = now - button1PressTime;
            if (pressDuration > DEBOUNCE_MS && pressDuration < SHORT_PRESS_MAX_MS) {
                Logger.logln("Button 1 short press - navigate previous");
                navigatePrevious();
            }
        }
        button1PressTime = 0;
    }
    lastButton1 = button1;

    // Button 2: Short press = next
    if (button2 == LOW && lastButton2 == HIGH) {
        // Button just pressed
        button2PressTime = now;
    } else if (button2 == HIGH && lastButton2 == LOW) {
        // Button just released - check for short press (navigate next)
        if (button2PressTime > 0) {
            unsigned long pressDuration = now - button2PressTime;
            if (pressDuration > DEBOUNCE_MS && pressDuration < SHORT_PRESS_MAX_MS) {
                Logger.logln("Button 2 short press - navigate next");
                navigateNext();
            }
        }
        button2PressTime = 0;
    }
    lastButton2 = button2;
#endif
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

            // Note: Device MAC address is automatically used for clientId comparison
            // (set during connection_init in graphql_ws_client.cpp)

            Logger.logln("Connecting to backend: %s:%d%s", host.c_str(), port, path.c_str());
            GraphQL.setStateCallback(onGraphQLStateChange);
            GraphQL.setMessageCallback(onGraphQLMessage);
#ifdef ENABLE_BLE_PROXY
            // Set up LED update callback for proxy forwarding
            GraphQL.setLedUpdateCallback(onWebSocketLedUpdate);
#endif
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

/**
 * Callback for LED updates received via WebSocket
 * Encodes LED commands into Aurora protocol and forwards to the real board
 */
void onWebSocketLedUpdate(const LedCommand* commands, int count) {
    if (!Proxy.isConnectedToBoard()) {
        Logger.logln("Proxy: Cannot forward LED update - not connected to board");
        return;
    }

    Logger.logln("Proxy: Forwarding %d LEDs to board via BLE", count);

    // Encode LED commands into Aurora protocol packets
    std::vector<std::vector<uint8_t>> packets;
    AuroraProtocol::encodeLedCommands(commands, count, packets);

    // BLE max write size is 20 bytes (matches TypeScript MAX_BLUETOOTH_MESSAGE_SIZE)
    const size_t MAX_BLE_CHUNK_SIZE = 20;
    int totalChunks = 0;

    // Send each protocol packet, split into 20-byte BLE chunks
    for (const auto& packet : packets) {
        // Split packet into 20-byte chunks
        for (size_t offset = 0; offset < packet.size(); offset += MAX_BLE_CHUNK_SIZE) {
            size_t chunkSize = min(MAX_BLE_CHUNK_SIZE, packet.size() - offset);
            Proxy.forwardToBoard(packet.data() + offset, chunkSize);
            totalChunks++;

            // Small delay between chunks to avoid overwhelming the BLE connection
            delay(10);
        }
    }

    Logger.logln("Proxy: Sent %d chunks (%zu protocol packets) to board", totalChunks, packets.size());
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

            // Subscribe to controller events (full subscription with navigation and queue sync)
            // clientId is included so ESP32 can decide whether to disconnect BLE client
            GraphQL.subscribe("controller-events",
                              "subscription ControllerEvents($sessionId: ID!) { "
                              "controllerEvents(sessionId: $sessionId) { "
                              "... on LedUpdate { __typename commands { position r g b } queueItemUuid climbUuid climbName "
                              "climbGrade gradeColor boardPath angle clientId "
                              "navigation { previousClimbs { name grade gradeColor } "
                              "nextClimb { name grade gradeColor } currentIndex totalCount } } "
                              "... on ControllerQueueSync { __typename queue { uuid climbUuid name grade gradeColor } currentIndex } "
                              "... on ControllerPing { __typename timestamp } "
                              "} }",
                              variables.c_str());

#ifdef ENABLE_DISPLAY
            // Set queue sync callback for display builds
            GraphQL.setQueueSyncCallback(onQueueSync);
            hasCurrentClimb = false;
            Display.showNoClimb();
#endif
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
#ifdef ENABLE_DISPLAY
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
#else
    (void)doc;  // Suppress unused parameter warning
#endif
}

#ifdef ENABLE_DISPLAY
/**
 * Handle queue sync event from backend
 * Uses static buffer to avoid heap fragmentation from repeated allocations
 */
void onQueueSync(const ControllerQueueSyncData& data) {
    Logger.logln("Queue sync: %d items, currentIndex: %d", data.count, data.currentIndex);

    // Use static buffer to avoid heap fragmentation
    int itemCount = min(data.count, MAX_QUEUE_SIZE);

    for (int i = 0; i < itemCount; i++) {
        strncpy(g_queueSyncBuffer[i].uuid, data.items[i].uuid, sizeof(g_queueSyncBuffer[i].uuid) - 1);
        g_queueSyncBuffer[i].uuid[sizeof(g_queueSyncBuffer[i].uuid) - 1] = '\0';

        strncpy(g_queueSyncBuffer[i].climbUuid, data.items[i].climbUuid, sizeof(g_queueSyncBuffer[i].climbUuid) - 1);
        g_queueSyncBuffer[i].climbUuid[sizeof(g_queueSyncBuffer[i].climbUuid) - 1] = '\0';

        strncpy(g_queueSyncBuffer[i].name, data.items[i].name, sizeof(g_queueSyncBuffer[i].name) - 1);
        g_queueSyncBuffer[i].name[sizeof(g_queueSyncBuffer[i].name) - 1] = '\0';

        strncpy(g_queueSyncBuffer[i].grade, data.items[i].grade, sizeof(g_queueSyncBuffer[i].grade) - 1);
        g_queueSyncBuffer[i].grade[sizeof(g_queueSyncBuffer[i].grade) - 1] = '\0';

        // Convert hex color to RGB565 using fast helper (no String allocations)
        g_queueSyncBuffer[i].gradeColorRgb = hexToRgb565Fast(data.items[i].gradeColor);
    }

    // Update display queue state (no delete needed - using static buffer)
    Display.setQueueFromSync(g_queueSyncBuffer, itemCount, data.currentIndex);

    Logger.logln("Queue sync complete: stored %d items, index %d", Display.getQueueCount(),
                 Display.getCurrentQueueIndex());
}

/**
 * Handle extended LedUpdate data for display
 * This is called in addition to GraphQL.handleLedUpdate (which handles LED control)
 */
void handleLedUpdateExtended(JsonObject& data) {
    const char* queueItemUuid = data["queueItemUuid"];
    const char* climbUuid = data["climbUuid"];
    const char* climbName = data["climbName"];
    const char* climbGrade = data["climbGrade"];
    const char* gradeColor = data["gradeColor"];
    const char* boardPath = data["boardPath"];
    int angle = data["angle"] | 0;

    JsonArray commands = data["commands"];
    int count = commands.isNull() ? 0 : commands.size();

    Logger.logln("LED Update: %s [%s] @ %d degrees (%d holds), queueItemUuid: %s", climbName ? climbName : "(none)",
                 climbGrade ? climbGrade : "?", angle, count, queueItemUuid ? queueItemUuid : "(none)");

    // Check if this confirms a pending navigation
    if (Display.hasPendingNavigation() && queueItemUuid) {
        const char* pendingUuid = Display.getPendingQueueItemUuid();
        if (pendingUuid && strcmp(queueItemUuid, pendingUuid) == 0) {
            Logger.logln("LED Update confirms pending navigation to %s", queueItemUuid);
            Display.clearPendingNavigation();
        } else {
            Logger.logln("LED Update conflicts with pending navigation (expected %s, got %s)", pendingUuid,
                         queueItemUuid);
            Display.clearPendingNavigation();
        }
    }

    // Handle clear/unknown climb command
    if (commands.isNull() || count == 0) {
        // Check if this is an "Unknown Climb" scenario (BLE loaded a climb not in database)
        if (climbName && strcmp(climbName, "Unknown Climb") == 0) {
            Logger.logln("LED Update: Unknown climb from BLE - displaying with navigation context");

            // Update state for unknown climb
            hasCurrentClimb = true;
            currentQueueItemUuid = "";
            currentClimbUuid = "";
            currentClimbName = climbName;
            currentGrade = climbGrade ? climbGrade : "?";
            currentGradeColor = gradeColor ? gradeColor : "#888888";

            // Parse navigation context if present (allows navigating back to known climbs)
            if (data["navigation"].is<JsonObject>()) {
                JsonObject nav = data["navigation"];
                int currentIndex = nav["currentIndex"] | -1;
                int totalCount = nav["totalCount"] | 0;

                // Parse previous climb (first in previousClimbs array = immediate previous)
                QueueNavigationItem prevClimb;
                if (nav["previousClimbs"].is<JsonArray>()) {
                    JsonArray prevArray = nav["previousClimbs"];
                    if (prevArray.size() > 0) {
                        JsonObject prev = prevArray[0];
                        prevClimb = QueueNavigationItem(prev["name"] | "", prev["grade"] | "", prev["gradeColor"] | "");
                    }
                }

                // Parse next climb
                QueueNavigationItem nextClimb;
                if (nav["nextClimb"].is<JsonObject>()) {
                    JsonObject next = nav["nextClimb"];
                    nextClimb = QueueNavigationItem(next["name"] | "", next["grade"] | "", next["gradeColor"] | "");
                }

                Display.setNavigationContext(prevClimb, nextClimb, currentIndex, totalCount);
            } else {
                Display.clearNavigationContext();
            }

            // Show unknown climb on display
            Display.showClimb(climbName, currentGrade.c_str(), currentGradeColor.c_str(), 0, "", boardType.c_str());
            return;
        }

        // Normal clear - no climb selected
        if (hasCurrentClimb && currentClimbName.length() > 0) {
            Display.addToHistory(currentClimbName.c_str(), currentGrade.c_str(), currentGradeColor.c_str());
        }

        hasCurrentClimb = false;
        currentQueueItemUuid = "";
        currentClimbUuid = "";
        currentClimbName = "";
        currentGrade = "";
        currentGradeColor = "";

        Display.showNoClimb();
        return;
    }

    // Add previous climb to history if different
    if (hasCurrentClimb && currentClimbUuid.length() > 0 && climbUuid && String(climbUuid) != currentClimbUuid) {
        Display.addToHistory(currentClimbName.c_str(), currentGrade.c_str(), currentGradeColor.c_str());
    }

    // Extract board type from boardPath (e.g., "kilter/1/12/1,2,3/40" -> "kilter")
    if (boardPath) {
        String bp = boardPath;
        int slashPos = bp.indexOf('/');
        if (slashPos > 0) {
            boardType = bp.substring(0, slashPos);
        }
    }

    // Update state
    currentQueueItemUuid = queueItemUuid ? queueItemUuid : "";
    currentClimbUuid = climbUuid ? climbUuid : "";
    currentClimbName = climbName ? climbName : "";
    currentGrade = climbGrade ? climbGrade : "";
    currentGradeColor = gradeColor ? gradeColor : "";
    hasCurrentClimb = true;

    // Sync local queue index with backend if we have queueItemUuid
    if (queueItemUuid && Display.getQueueCount() > 0) {
        for (int i = 0; i < Display.getQueueCount(); i++) {
            const LocalQueueItem* item = Display.getQueueItem(i);
            if (item && strcmp(item->uuid, queueItemUuid) == 0) {
                Display.setCurrentQueueIndex(i);
                Logger.logln("LED Update: Synced local queue index to %d", i);
                break;
            }
        }
    }

    // Parse navigation context if present
    if (data["navigation"].is<JsonObject>()) {
        JsonObject nav = data["navigation"];
        int currentIndex = nav["currentIndex"] | -1;
        int totalCount = nav["totalCount"] | 0;

        // Parse previous climb (first in previousClimbs array = immediate previous)
        QueueNavigationItem prevClimb;
        if (nav["previousClimbs"].is<JsonArray>()) {
            JsonArray prevArray = nav["previousClimbs"];
            if (prevArray.size() > 0) {
                JsonObject prev = prevArray[0];
                prevClimb = QueueNavigationItem(prev["name"] | "", prev["grade"] | "", prev["gradeColor"] | "");
            }
        }

        // Parse next climb
        QueueNavigationItem nextClimb;
        if (nav["nextClimb"].is<JsonObject>()) {
            JsonObject next = nav["nextClimb"];
            nextClimb = QueueNavigationItem(next["name"] | "", next["grade"] | "", next["gradeColor"] | "");
        }

        Display.setNavigationContext(prevClimb, nextClimb, currentIndex, totalCount);
        Logger.logln("Navigation: index %d/%d, prev: %s, next: %s", currentIndex + 1, totalCount,
                     prevClimb.isValid ? "yes" : "no", nextClimb.isValid ? "yes" : "no");
    } else {
        Display.clearNavigationContext();
    }

    // Update display with gradeColor
    Display.showClimb(climbName, climbGrade ? climbGrade : "", currentGradeColor.c_str(), angle,
                      climbUuid ? climbUuid : "", boardType.c_str());
}

/**
 * Send navigation mutation to backend
 */
void sendNavigationMutation(const char* queueItemUuid) {
    String sessionId = Config.getString("session_id");
    if (sessionId.length() == 0) {
        Logger.logln("Navigation: No session ID configured");
        return;
    }

    // Use queueItemUuid for direct navigation (most reliable)
    String vars = "{\"sessionId\":\"" + sessionId + "\",\"direction\":\"next\"";
    vars += ",\"queueItemUuid\":\"" + String(queueItemUuid) + "\"";
    vars += "}";

    GraphQL.sendMutation("nav-direct",
                         "mutation NavDirect($sessionId: ID!, $direction: String!, $queueItemUuid: String) { "
                         "navigateQueue(sessionId: $sessionId, direction: $direction, queueItemUuid: $queueItemUuid) { "
                         "uuid climb { name difficulty } } }",
                         vars.c_str());

    Logger.logln("Navigation: Sent navigate request to queueItemUuid: %s", queueItemUuid);
}

/**
 * Navigate to previous climb in queue
 */
void navigatePrevious() {
    if (!backendConnected) {
        Logger.logln("Navigation: Cannot navigate - not connected to backend");
        return;
    }

    if (Display.getQueueCount() == 0) {
        Logger.logln("Navigation: No queue state - cannot navigate");
        return;
    }

    if (!Display.canNavigatePrevious()) {
        Logger.logln("Navigation: Already at start of queue");
        return;
    }

    // Optimistic update - immediately show previous climb
    if (Display.navigateToPrevious()) {
        const LocalQueueItem* newCurrent = Display.getCurrentQueueItem();
        if (newCurrent) {
            Logger.logln("Navigation: Optimistic update to previous - %s (uuid: %s)", newCurrent->name,
                         newCurrent->uuid);

            // Update display immediately (optimistic)
            Display.showClimb(newCurrent->name, newCurrent->grade, "", 0, newCurrent->climbUuid, boardType.c_str());

            // Send mutation with queueItemUuid for backend sync
            sendNavigationMutation(newCurrent->uuid);
        }
    }
}

/**
 * Navigate to next climb in queue
 */
void navigateNext() {
    if (!backendConnected) {
        Logger.logln("Navigation: Cannot navigate - not connected to backend");
        return;
    }

    if (Display.getQueueCount() == 0) {
        Logger.logln("Navigation: No queue state - cannot navigate");
        return;
    }

    if (!Display.canNavigateNext()) {
        Logger.logln("Navigation: Already at end of queue");
        return;
    }

    // Optimistic update - immediately show next climb
    if (Display.navigateToNext()) {
        const LocalQueueItem* newCurrent = Display.getCurrentQueueItem();
        if (newCurrent) {
            Logger.logln("Navigation: Optimistic update to next - %s (uuid: %s)", newCurrent->name, newCurrent->uuid);

            // Update display immediately (optimistic)
            Display.showClimb(newCurrent->name, newCurrent->grade, "", 0, newCurrent->climbUuid, boardType.c_str());

            // Send mutation with queueItemUuid for backend sync
            sendNavigationMutation(newCurrent->uuid);
        }
    }
}
#endif

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
