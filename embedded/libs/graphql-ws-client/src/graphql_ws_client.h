#ifndef GRAPHQL_WS_CLIENT_H
#define GRAPHQL_WS_CLIENT_H

#include <Arduino.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <led_controller.h>
#include <log_buffer.h>
#include <config_manager.h>

// Forward declaration
class NordicUartBLE;

#define GQL_WS_PROTOCOL "graphql-transport-ws"

// WebSocket timing constants
#define WS_PING_INTERVAL 30000
#define WS_PONG_TIMEOUT 10000
#define WS_RECONNECT_INTERVAL 5000

enum class GraphQLConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    CONNECTION_INIT,
    CONNECTION_ACK,
    SUBSCRIBED
};

typedef void (*GraphQLMessageCallback)(JsonDocument& doc);
typedef void (*GraphQLStateCallback)(GraphQLConnectionState state);

class GraphQLWSClient {
public:
    GraphQLWSClient();

    void begin(const char* host, uint16_t port, const char* path = "/graphql", const char* apiKey = nullptr);
    void loop();
    void disconnect();

    // Connection state
    bool isConnected();
    bool isSubscribed();
    GraphQLConnectionState getState();

    // Subscribe to a GraphQL subscription
    void subscribe(const char* subscriptionId, const char* query, const char* variables = nullptr);
    void unsubscribe(const char* subscriptionId);

    // Send a GraphQL query/mutation
    void send(const char* query, const char* variables = nullptr);

    // Send LED positions from Bluetooth to backend (to match climb)
    void sendLedPositions(const LedCommand* commands, int count, int angle);

    // Callbacks
    void setMessageCallback(GraphQLMessageCallback callback);
    void setStateCallback(GraphQLStateCallback callback);

    // Handle LED update from backend
    void handleLedUpdate(JsonObject& data);

    // Config keys
    static const char* KEY_HOST;
    static const char* KEY_PORT;
    static const char* KEY_PATH;

    // Get current display hash (for deduplication)
    uint32_t getCurrentDisplayHash() { return currentDisplayHash; }

private:
    WebSocketsClient ws;
    GraphQLConnectionState state;
    GraphQLMessageCallback messageCallback;
    GraphQLStateCallback stateCallback;

    String serverHost;
    uint16_t serverPort;
    String serverPath;
    String apiKey;
    String sessionId;
    String subscriptionId;

    unsigned long lastPingTime;
    unsigned long lastPongTime;
    unsigned long reconnectTime;
    uint32_t lastSentLedHash;      // Hash of last sent LED positions (to avoid duplicates)
    uint32_t currentDisplayHash;   // Hash of currently displayed LEDs (from backend LedUpdate)

    void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);
    void sendConnectionInit();
    void handleMessage(uint8_t* payload, size_t length);
    void setState(GraphQLConnectionState newState);
    void sendPing();
    String generateSubscriptionId();
    uint32_t computeLedHash(const LedCommand* commands, int count);
};

extern GraphQLWSClient GraphQL;

#endif
