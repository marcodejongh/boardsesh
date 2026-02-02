#include "ws_client.h"
#include "../bluetooth/aurora_protocol.h"
#include "../bluetooth/ble_server.h"

// Global instance
WsClient wsClient;

// Static instance pointer for event handler
static WsClient* wsClientInstance = nullptr;

WsClient::WsClient()
    : state(WsState::DISCONNECTED),
      lastPingTime(0),
      lastPongTime(0),
      reconnectTime(0),
      lastSentLedHash(0),
      currentDisplayHash(0) {
    wsClientInstance = this;
}

void WsClient::parseUrl(const String& url, String& host, uint16_t& port, String& path, bool& useSSL) {
    // Default values
    useSSL = url.startsWith("wss://");
    port = useSSL ? 443 : 80;
    path = "/graphql";

    // Remove protocol
    String urlWithoutProtocol = url;
    if (url.startsWith("wss://")) {
        urlWithoutProtocol = url.substring(6);
    } else if (url.startsWith("ws://")) {
        urlWithoutProtocol = url.substring(5);
    }

    // Find path
    int pathIndex = urlWithoutProtocol.indexOf('/');
    if (pathIndex > 0) {
        path = urlWithoutProtocol.substring(pathIndex);
        urlWithoutProtocol = urlWithoutProtocol.substring(0, pathIndex);
    }

    // Find port
    int portIndex = urlWithoutProtocol.indexOf(':');
    if (portIndex > 0) {
        host = urlWithoutProtocol.substring(0, portIndex);
        port = urlWithoutProtocol.substring(portIndex + 1).toInt();
    } else {
        host = urlWithoutProtocol;
    }
}

bool WsClient::begin() {
    apiKey = configManager.getApiKey();
    sessionId = configManager.getSessionId();

    if (apiKey.length() == 0) {
        Serial.println("[WS] No API key configured");
        return false;
    }

    if (sessionId.length() == 0) {
        Serial.println("[WS] No session ID configured");
        return false;
    }

    String backendUrl = configManager.getBackendUrl();
    String host;
    uint16_t port;
    String path;
    bool useSSL;

    parseUrl(backendUrl, host, port, path, useSSL);

    Serial.printf("[WS] Connecting to %s:%d%s (SSL: %s)\n",
                  host.c_str(), port, path.c_str(), useSSL ? "yes" : "no");

    // Set up WebSocket event handler
    webSocket.onEvent(webSocketEvent);

    // Enable heartbeat
    webSocket.enableHeartbeat(WS_PING_INTERVAL, WS_PONG_TIMEOUT, 2);

    // Connect
    if (useSSL) {
        webSocket.beginSSL(host.c_str(), port, path.c_str());
    } else {
        webSocket.begin(host.c_str(), port, path.c_str());
    }

    // Set subprotocol for graphql-ws
    webSocket.setExtraHeaders("Sec-WebSocket-Protocol: graphql-transport-ws");

    state = WsState::CONNECTING;
    return true;
}

void WsClient::loop() {
    webSocket.loop();

    // Handle ping interval
    if (state == WsState::SUBSCRIBED) {
        unsigned long now = millis();
        if (now - lastPingTime > WS_PING_INTERVAL) {
            sendPing();
            lastPingTime = now;
        }
    }

    // Handle reconnection
    if (state == WsState::DISCONNECTED && reconnectTime > 0) {
        if (millis() > reconnectTime) {
            Serial.println("[WS] Attempting reconnection...");
            begin();
            reconnectTime = 0;
        }
    }
}

bool WsClient::isConnected() {
    return state == WsState::CONNECTED || state == WsState::SUBSCRIBING || state == WsState::SUBSCRIBED;
}

bool WsClient::isSubscribed() {
    return state == WsState::SUBSCRIBED;
}

WsState WsClient::getState() {
    return state;
}

void WsClient::reconnect() {
    disconnect();
    begin();
}

void WsClient::disconnect() {
    webSocket.disconnect();
    state = WsState::DISCONNECTED;
}

void WsClient::setSessionId(const String& newSessionId) {
    sessionId = newSessionId;
    configManager.setSessionId(sessionId);

    // Reconnect with new session
    if (state != WsState::DISCONNECTED) {
        reconnect();
    }
}

String WsClient::getSessionId() {
    return sessionId;
}

void WsClient::webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    if (!wsClientInstance) return;

    switch (type) {
        case WStype_DISCONNECTED:
            Serial.println("[WS] Disconnected");
            wsClientInstance->state = WsState::DISCONNECTED;
            // Schedule reconnection
            wsClientInstance->reconnectTime = millis() + WS_RECONNECT_INTERVAL;
            // Clear LEDs on disconnect
            ledController.clear();
            ledController.show();
            break;

        case WStype_CONNECTED:
            Serial.printf("[WS] Connected to %s\n", (char*)payload);
            wsClientInstance->state = WsState::CONNECTED;
            // Send connection_init
            wsClientInstance->sendConnectionInit();
            break;

        case WStype_TEXT:
            if (DEBUG_WEBSOCKET) {
                Serial.printf("[WS] Received: %s\n", (char*)payload);
            }
            wsClientInstance->handleMessage(String((char*)payload));
            break;

        case WStype_ERROR:
            Serial.println("[WS] Error");
            break;

        case WStype_PING:
            Serial.println("[WS] Ping received");
            break;

        case WStype_PONG:
            wsClientInstance->lastPongTime = millis();
            break;

        default:
            break;
    }
}

void WsClient::handleMessage(const String& message) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
        Serial.printf("[WS] JSON parse error: %s\n", error.c_str());
        return;
    }

    const char* type = doc["type"];
    if (!type) return;

    if (strcmp(type, "connection_ack") == 0) {
        Serial.println("[WS] Connection acknowledged");
        state = WsState::SUBSCRIBING;
        sendSubscribe();
    }
    else if (strcmp(type, "next") == 0) {
        // Subscription data
        JsonObject payload = doc["payload"];
        if (payload.containsKey("data")) {
            JsonObject data = payload["data"];
            if (data.containsKey("controllerEvents")) {
                JsonObject event = data["controllerEvents"];
                const char* typename_ = event["__typename"];

                if (typename_ && strcmp(typename_, "LedUpdate") == 0) {
                    handleLedUpdate(event);
                }
                else if (typename_ && strcmp(typename_, "ControllerPing") == 0) {
                    Serial.println("[WS] Received ping from server");
                }
            }
        }
    }
    else if (strcmp(type, "error") == 0) {
        Serial.println("[WS] Subscription error");
        JsonArray errors = doc["payload"];
        for (JsonObject err : errors) {
            Serial.printf("[WS] Error: %s\n", err["message"].as<const char*>());
        }
    }
    else if (strcmp(type, "complete") == 0) {
        const char* msgId = doc["id"];
        // Only reset state if main subscription completed, not mutations
        if (msgId && subscriptionId == String(msgId)) {
            Serial.println("[WS] Main subscription completed");
            state = WsState::CONNECTED;
        } else {
            Serial.println("[WS] Mutation completed");
            // Don't change state - subscription is still active
        }
    }
    else if (strcmp(type, "pong") == 0) {
        lastPongTime = millis();
    }
}

void WsClient::sendConnectionInit() {
    JsonDocument doc;
    doc["type"] = "connection_init";

    // Include API key in connection payload
    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["apiKey"] = apiKey;

    String message;
    serializeJson(doc, message);

    if (DEBUG_WEBSOCKET) {
        Serial.printf("[WS] Sending: %s\n", message.c_str());
    }
    webSocket.sendTXT(message);
}

void WsClient::sendSubscribe() {
    subscriptionId = generateSubscriptionId();

    JsonDocument doc;
    doc["id"] = subscriptionId;
    doc["type"] = "subscribe";

    JsonObject payload = doc["payload"].to<JsonObject>();

    // GraphQL subscription query
    payload["query"] = "subscription ControllerEvents($sessionId: ID!, $apiKey: String!) { "
                       "controllerEvents(sessionId: $sessionId, apiKey: $apiKey) { "
                       "... on LedUpdate { __typename commands { position r g b } climbUuid climbName angle } "
                       "... on ControllerPing { __typename timestamp } "
                       "} }";

    JsonObject variables = payload["variables"].to<JsonObject>();
    variables["sessionId"] = sessionId;
    variables["apiKey"] = apiKey;

    String message;
    serializeJson(doc, message);

    if (DEBUG_WEBSOCKET) {
        Serial.printf("[WS] Sending subscription: %s\n", message.c_str());
    }
    webSocket.sendTXT(message);

    state = WsState::SUBSCRIBED;
    Serial.printf("[WS] Subscribed to session %s\n", sessionId.c_str());
}

void WsClient::sendPing() {
    JsonDocument doc;
    doc["type"] = "ping";

    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
}

void WsClient::sendHeartbeat() {
    // Send heartbeat mutation
    JsonDocument doc;
    doc["id"] = generateSubscriptionId();
    doc["type"] = "subscribe";

    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["query"] = "mutation Heartbeat($sessionId: ID!) { controllerHeartbeat(sessionId: $sessionId) }";

    JsonObject variables = payload["variables"].to<JsonObject>();
    variables["sessionId"] = sessionId;

    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
}

void WsClient::handleLedUpdate(JsonObject& data) {
    JsonArray commands = data["commands"];

    if (commands.isNull()) {
        // No commands - clear LEDs
        ledController.clear();
        ledController.show();
        return;
    }

    int count = commands.size();
    if (count == 0) {
        ledController.clear();
        ledController.show();
        return;
    }

    // Convert to LedCommand array
    LedCommand* ledCommands = new LedCommand[count];

    int i = 0;
    for (JsonObject cmd : commands) {
        ledCommands[i].position = cmd["position"];
        ledCommands[i].r = cmd["r"];
        ledCommands[i].g = cmd["g"];
        ledCommands[i].b = cmd["b"];
        i++;
    }

    // Update LEDs
    ledController.setLeds(ledCommands, count);
    ledController.show();

    // Store hash of currently displayed LEDs (to detect if BLE sends the same climb)
    currentDisplayHash = computeLedHash(ledCommands, count);

    // Log climb info if available
    const char* climbName = data["climbName"];
    if (climbName) {
        Serial.printf("[WS] Displaying climb: %s (%d LEDs)\n", climbName, count);
    } else {
        Serial.printf("[WS] Updated %d LEDs\n", count);
    }

    delete[] ledCommands;
}

void WsClient::sendLedPositions(const LedCommand* commands, int count, int angle) {
    Serial.printf("[WS] sendLedPositions called: %d LEDs, state=%d\n", count, (int)state);

    if (state != WsState::SUBSCRIBED) {
        Serial.println("[WS] Cannot send LED positions - not subscribed");
        return;
    }

    // Check if this is the same LED data this device just sent (per-MAC deduplication)
    uint32_t currentHash = computeLedHash(commands, count);
    Serial.printf("[WS] Hash: %u, device: %s\n", currentHash, bleServer.getConnectedDeviceAddress().c_str());

    if (!bleServer.shouldSendLedData(currentHash)) {
        Serial.printf("[WS] Skipping duplicate from %s (same as last sent by this device)\n",
                      bleServer.getConnectedDeviceAddress().c_str());
        return;
    }

    // Check if this matches what's currently displayed on the board (from backend)
    // This handles the case where user ticks a climb while someone else changed it via web
    if (currentHash == currentDisplayHash && currentDisplayHash != 0) {
        Serial.printf("[WS] Skipping LED data (matches display hash: %u)\n", currentDisplayHash);
        return;
    }

    // Update the last sent hash for this device
    bleServer.updateLastSentHash(currentHash);
    Serial.printf("[WS] Proceeding to send (updated hash for device)\n");

    JsonDocument doc;
    doc["id"] = generateSubscriptionId();
    doc["type"] = "subscribe";  // Using subscribe for mutations in graphql-ws

    JsonObject payload = doc["payload"].to<JsonObject>();
    // Send positions array - backend will convert to frames string
    payload["query"] = "mutation SetClimbFromLeds($sessionId: ID!, $positions: [LedCommandInput!], $apiKey: String!) { "
                       "setClimbFromLedPositions(sessionId: $sessionId, positions: $positions, apiKey: $apiKey) { "
                       "matched climbUuid climbName } }";

    JsonObject variables = payload["variables"].to<JsonObject>();
    variables["sessionId"] = sessionId;
    variables["apiKey"] = apiKey;

    JsonArray positions = variables["positions"].to<JsonArray>();
    for (int i = 0; i < count; i++) {
        JsonObject pos = positions.add<JsonObject>();
        pos["position"] = commands[i].position;
        pos["r"] = commands[i].r;
        pos["g"] = commands[i].g;
        pos["b"] = commands[i].b;
        // Add role code for easier matching on backend
        pos["role"] = colorToRole(commands[i].r, commands[i].g, commands[i].b);
    }

    String message;
    serializeJson(doc, message);

    // Log role breakdown
    int starts = 0, hands = 0, finishes = 0, foots = 0;
    for (int i = 0; i < count; i++) {
        uint8_t role = colorToRole(commands[i].r, commands[i].g, commands[i].b);
        if (role == ROLE_STARTING) starts++;
        else if (role == ROLE_HAND) hands++;
        else if (role == ROLE_FINISH) finishes++;
        else if (role == ROLE_FOOT) foots++;
    }
    Serial.printf("[WS] Sending %d LED positions to backend (roles: %d start, %d hand, %d finish, %d foot)\n",
                  count, starts, hands, finishes, foots);

    if (DEBUG_WEBSOCKET) {
        Serial.printf("[WS] Message: %s\n", message.c_str());
    }
    webSocket.sendTXT(message);
}

String WsClient::generateSubscriptionId() {
    return String(random(100000, 999999));
}

uint32_t WsClient::computeLedHash(const LedCommand* commands, int count) {
    // Order-independent hash: XOR all LED data together
    // This way the same LEDs in different order produce the same hash
    uint32_t hash = count;
    for (int i = 0; i < count; i++) {
        // Create a unique value for each LED and XOR them together
        uint32_t ledValue = (commands[i].position << 16) |
                           (commands[i].r << 8) |
                           (commands[i].g);
        // Mix in blue separately to avoid collisions
        ledValue ^= (commands[i].b << 24) | (commands[i].position);
        hash ^= ledValue;
    }
    return hash;
}
