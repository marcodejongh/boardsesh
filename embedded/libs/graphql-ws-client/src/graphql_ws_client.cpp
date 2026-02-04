#include "graphql_ws_client.h"

#include <aurora_protocol.h>
#include <nordic_uart_ble.h>

GraphQLWSClient GraphQL;

const char* GraphQLWSClient::KEY_HOST = "gql_host";
const char* GraphQLWSClient::KEY_PORT = "gql_port";
const char* GraphQLWSClient::KEY_PATH = "gql_path";

GraphQLWSClient::GraphQLWSClient()
    : state(GraphQLConnectionState::DISCONNECTED), messageCallback(nullptr), stateCallback(nullptr), serverPort(443),
      lastPingTime(0), lastPongTime(0), reconnectTime(0), lastSentLedHash(0), currentDisplayHash(0) {}

void GraphQLWSClient::begin(const char* host, uint16_t port, const char* path, const char* apiKeyParam) {
    serverHost = host;
    serverPort = port;
    serverPath = path;
    this->apiKey = apiKeyParam ? apiKeyParam : "";
    this->sessionId = Config.getString("session_id");

    // Set up WebSocket event handler
    ws.onEvent(
        [this](WStype_t type, uint8_t* payload, size_t length) { this->onWebSocketEvent(type, payload, length); });

    // Enable heartbeat
    ws.enableHeartbeat(WS_PING_INTERVAL, WS_PONG_TIMEOUT, 2);

    // Set subprotocol for graphql-ws
    ws.setExtraHeaders("Sec-WebSocket-Protocol: graphql-transport-ws");

    // Connect with SSL
    ws.beginSSL(host, port, path);

    ws.setReconnectInterval(WS_RECONNECT_INTERVAL);

    setState(GraphQLConnectionState::CONNECTING);
}

void GraphQLWSClient::loop() {
    ws.loop();

    // Handle ping interval
    if (state == GraphQLConnectionState::SUBSCRIBED) {
        unsigned long now = millis();
        if (now - lastPingTime > WS_PING_INTERVAL) {
            sendPing();
            lastPingTime = now;
        }
    }

    // Handle reconnection
    if (state == GraphQLConnectionState::DISCONNECTED && reconnectTime > 0) {
        if (millis() > reconnectTime) {
            Logger.logln("GraphQL: Attempting reconnection...");
            begin(serverHost.c_str(), serverPort, serverPath.c_str(), apiKey.c_str());
            reconnectTime = 0;
        }
    }
}

void GraphQLWSClient::disconnect() {
    ws.disconnect();
    setState(GraphQLConnectionState::DISCONNECTED);
}

bool GraphQLWSClient::isConnected() {
    return state == GraphQLConnectionState::CONNECTION_ACK || state == GraphQLConnectionState::SUBSCRIBED;
}

bool GraphQLWSClient::isSubscribed() {
    return state == GraphQLConnectionState::SUBSCRIBED;
}

GraphQLConnectionState GraphQLWSClient::getState() {
    return state;
}

void GraphQLWSClient::subscribe(const char* subId, const char* query, const char* variables) {
    subscriptionId = subId;

    JsonDocument doc;
    doc["id"] = subId;
    doc["type"] = "subscribe";

    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["query"] = query;

    if (variables) {
        JsonDocument varsDoc;
        deserializeJson(varsDoc, variables);
        payload["variables"] = varsDoc;
    }

    String msg;
    serializeJson(doc, msg);
    ws.sendTXT(msg);

    setState(GraphQLConnectionState::SUBSCRIBED);
    Logger.logln("GraphQL: Subscribed to %s", subId);
}

void GraphQLWSClient::unsubscribe(const char* subId) {
    JsonDocument doc;
    doc["id"] = subId;
    doc["type"] = "complete";

    String msg;
    serializeJson(doc, msg);
    ws.sendTXT(msg);
}

void GraphQLWSClient::send(const char* query, const char* variables) {
    static int queryId = 0;

    JsonDocument doc;
    doc["id"] = String(++queryId);
    doc["type"] = "subscribe";

    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["query"] = query;

    if (variables) {
        JsonDocument varsDoc;
        deserializeJson(varsDoc, variables);
        payload["variables"] = varsDoc;
    }

    String msg;
    serializeJson(doc, msg);
    ws.sendTXT(msg);
}

void GraphQLWSClient::setMessageCallback(GraphQLMessageCallback callback) {
    messageCallback = callback;
}

void GraphQLWSClient::setStateCallback(GraphQLStateCallback callback) {
    stateCallback = callback;
}

void GraphQLWSClient::onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Logger.logln("GraphQL: Disconnected");
            setState(GraphQLConnectionState::DISCONNECTED);
            // Schedule reconnection
            reconnectTime = millis() + WS_RECONNECT_INTERVAL;
            // Clear LEDs on disconnect
            LEDs.clear();
            LEDs.show();
            break;

        case WStype_CONNECTED:
            Logger.logln("GraphQL: Connected to %s", serverHost.c_str());
            setState(GraphQLConnectionState::CONNECTED);
            sendConnectionInit();
            break;

        case WStype_TEXT:
            handleMessage(payload, length);
            break;

        case WStype_ERROR:
            Logger.logln("GraphQL: WebSocket error");
            break;

        case WStype_PING:
            Logger.logln("GraphQL: Ping received");
            break;

        case WStype_PONG:
            lastPongTime = millis();
            break;

        default:
            break;
    }
}

void GraphQLWSClient::sendConnectionInit() {
    JsonDocument doc;
    doc["type"] = "connection_init";

    // Include controller API key in connection payload if provided
    if (apiKey.length() > 0) {
        JsonObject payload = doc["payload"].to<JsonObject>();
        payload["controllerApiKey"] = apiKey;
    }

    String msg;
    serializeJson(doc, msg);
    ws.sendTXT(msg);

    Logger.logln("GraphQL: Sent connection_init");
    setState(GraphQLConnectionState::CONNECTION_INIT);
}

void GraphQLWSClient::handleMessage(uint8_t* payload, size_t length) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload, length);

    if (error) {
        Logger.logln("GraphQL: JSON parse error: %s", error.c_str());
        return;
    }

    const char* type = doc["type"];

    if (strcmp(type, "connection_ack") == 0) {
        Logger.logln("GraphQL: Connection acknowledged");
        setState(GraphQLConnectionState::CONNECTION_ACK);
    } else if (strcmp(type, "next") == 0) {
        // Subscription data
        JsonObject payloadObj = doc["payload"];
        if (payloadObj["data"].is<JsonObject>()) {
            JsonObject data = payloadObj["data"];
            if (data["controllerEvents"].is<JsonObject>()) {
                JsonObject event = data["controllerEvents"];
                const char* typename_ = event["__typename"];

                if (typename_ && strcmp(typename_, "LedUpdate") == 0) {
                    handleLedUpdate(event);
                } else if (typename_ && strcmp(typename_, "ControllerPing") == 0) {
                    Logger.logln("GraphQL: Received ping from server");
                }
            }
        }
        if (messageCallback) {
            messageCallback(doc);
        }
    } else if (strcmp(type, "error") == 0) {
        Logger.logln("GraphQL: Subscription error");
        JsonArray errors = doc["payload"];
        for (JsonObject err : errors) {
            Logger.logln("GraphQL: Error: %s", err["message"].as<const char*>());
        }
    } else if (strcmp(type, "complete") == 0) {
        const char* msgId = doc["id"];
        // Only reset state if main subscription completed, not mutations
        if (msgId && subscriptionId == String(msgId)) {
            Logger.logln("GraphQL: Main subscription completed");
            setState(GraphQLConnectionState::CONNECTION_ACK);
        } else {
            Logger.logln("GraphQL: Mutation completed");
            // Don't change state - subscription is still active
        }
    } else if (strcmp(type, "pong") == 0) {
        lastPongTime = millis();
    }
}

void GraphQLWSClient::handleLedUpdate(JsonObject& data) {
    JsonArray commands = data["commands"];

    if (commands.isNull() || commands.size() == 0) {
        // Clear LEDs command - if BLE connected, this is likely web taking over
        if (BLE.isConnected()) {
            Logger.logln("GraphQL: Web user cleared climb, disconnecting BLE client");
            BLE.disconnectClient();
            BLE.clearLastSentHash();
        }
        LEDs.clear();
        LEDs.show();
        currentDisplayHash = 0;
        Logger.logln("GraphQL: Cleared LEDs (no commands)");
        return;
    }

    int count = commands.size();

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

    // Compute hash of incoming LED data
    uint32_t incomingHash = computeLedHash(ledCommands, count);

    // If BLE is connected, check if this is an echo of our own data or a web-initiated change
    if (BLE.isConnected()) {
        if (incomingHash == currentDisplayHash && currentDisplayHash != 0) {
            // This is likely an echo from our own BLE send - ignore it
            Logger.logln("GraphQL: Ignoring LedUpdate (hash %u matches current display, likely echo)", incomingHash);
            delete[] ledCommands;
            return;
        } else {
            // Different LED data - web user is taking over
            Logger.logln("GraphQL: Web user changed climb, disconnecting BLE client");
            BLE.disconnectClient();
            BLE.clearLastSentHash();
        }
    }

    // Update LEDs
    LEDs.setLeds(ledCommands, count);
    LEDs.show();

    // Store hash of currently displayed LEDs (to detect if BLE sends the same climb)
    currentDisplayHash = incomingHash;

    // Log climb info if available
    const char* climbName = data["climbName"];
    if (climbName) {
        Logger.logln("GraphQL: Displaying climb: %s (%d LEDs)", climbName, count);
    } else {
        Logger.logln("GraphQL: Updated %d LEDs", count);
    }

    delete[] ledCommands;
}

void GraphQLWSClient::sendLedPositions(const LedCommand* commands, int count, int angle) {
    Logger.logln("GraphQL: sendLedPositions called: %d LEDs, state=%d", count, (int)state);

    if (state != GraphQLConnectionState::SUBSCRIBED) {
        Logger.logln("GraphQL: Cannot send LED positions - not subscribed");
        return;
    }

    // Check if this is the same LED data we just sent (deduplication)
    uint32_t currentHash = computeLedHash(commands, count);
    Logger.logln("GraphQL: Hash: %u, lastSent: %u, display: %u", currentHash, lastSentLedHash, currentDisplayHash);

    // Skip if same as last sent
    if (currentHash == lastSentLedHash && lastSentLedHash != 0) {
        Logger.logln("GraphQL: Skipping duplicate LED data (same as last sent)");
        return;
    }

    // Skip if matches what's currently displayed on the board (from backend)
    if (currentHash == currentDisplayHash && currentDisplayHash != 0) {
        Logger.logln("GraphQL: Skipping LED data (matches display hash: %u)", currentDisplayHash);
        return;
    }

    // Update last sent hash
    lastSentLedHash = currentHash;
    Logger.logln("GraphQL: Proceeding to send (updated hash)");

    JsonDocument doc;
    doc["id"] = generateSubscriptionId();
    doc["type"] = "subscribe";  // Using subscribe for mutations in graphql-ws

    JsonObject payload = doc["payload"].to<JsonObject>();
    // Send positions array - backend will convert to frames string
    payload["query"] = "mutation SetClimbFromLeds($sessionId: ID!, $positions: [LedCommandInput!]!) { "
                       "setClimbFromLedPositions(sessionId: $sessionId, positions: $positions) { "
                       "matched climbUuid climbName } }";

    JsonObject variables = payload["variables"].to<JsonObject>();
    variables["sessionId"] = sessionId;

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
        if (role == ROLE_STARTING)
            starts++;
        else if (role == ROLE_HAND)
            hands++;
        else if (role == ROLE_FINISH)
            finishes++;
        else if (role == ROLE_FOOT)
            foots++;
    }
    Logger.logln("GraphQL: Sending %d LED positions (roles: %d start, %d hand, %d finish, %d foot)", count, starts,
                 hands, finishes, foots);

    ws.sendTXT(message);
}

void GraphQLWSClient::setState(GraphQLConnectionState newState) {
    if (state != newState) {
        state = newState;
        if (stateCallback) {
            stateCallback(state);
        }
    }
}

void GraphQLWSClient::sendPing() {
    JsonDocument doc;
    doc["type"] = "ping";

    String message;
    serializeJson(doc, message);
    ws.sendTXT(message);
}

String GraphQLWSClient::generateSubscriptionId() {
    return String(random(100000, 999999));
}

uint32_t GraphQLWSClient::computeLedHash(const LedCommand* commands, int count) {
    // Order-independent hash: XOR all LED data together
    // This way the same LEDs in different order produce the same hash
    uint32_t hash = count;
    for (int i = 0; i < count; i++) {
        // Create a unique value for each LED and XOR them together
        uint32_t ledValue = (commands[i].position << 16) | (commands[i].r << 8) | (commands[i].g);
        // Mix in blue separately to avoid collisions
        ledValue ^= (commands[i].b << 24) | (commands[i].position);
        hash ^= ledValue;
    }
    return hash;
}
