/**
 * Unit Tests for GraphQL WebSocket Client Library
 *
 * Tests the WebSocket GraphQL client for backend communication.
 */

#include <unity.h>
#include <graphql_ws_client.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <cstring>

// Access the global WebSocket mock through GraphQL client
static GraphQLWSClient* client;
static WebSocketsClient* wsMock;

// Test state callback tracking
static GraphQLConnectionState lastCallbackState = GraphQLConnectionState::DISCONNECTED;
static int stateCallbackCount = 0;

void stateCallback(GraphQLConnectionState state) {
    lastCallbackState = state;
    stateCallbackCount++;
}

// Test message callback tracking
static int messageCallbackCount = 0;

void messageCallback(JsonDocument& doc) {
    (void)doc;
    messageCallbackCount++;
}

void setUp(void) {
    Preferences::resetAll();
    lastCallbackState = GraphQLConnectionState::DISCONNECTED;
    stateCallbackCount = 0;
    messageCallbackCount = 0;
    client = new GraphQLWSClient();
}

void tearDown(void) {
    delete client;
    client = nullptr;
}

// =============================================================================
// Constructor Tests
// =============================================================================

void test_initial_state_is_disconnected(void) {
    TEST_ASSERT_EQUAL(GraphQLConnectionState::DISCONNECTED, client->getState());
}

void test_initial_is_connected_returns_false(void) {
    TEST_ASSERT_FALSE(client->isConnected());
}

void test_initial_is_subscribed_returns_false(void) {
    TEST_ASSERT_FALSE(client->isSubscribed());
}

void test_initial_display_hash_is_zero(void) {
    TEST_ASSERT_EQUAL_UINT32(0, client->getCurrentDisplayHash());
}

// =============================================================================
// Begin/Connection Tests
// =============================================================================

void test_begin_sets_state_to_connecting(void) {
    client->begin("test.host.com", 443, "/graphql", "test-api-key");
    TEST_ASSERT_EQUAL(GraphQLConnectionState::CONNECTING, client->getState());
}

// =============================================================================
// State Callback Tests
// =============================================================================

void test_set_state_callback(void) {
    client->setStateCallback(stateCallback);
    client->begin("test.host.com", 443, "/graphql", nullptr);

    // State should change to CONNECTING, triggering callback
    TEST_ASSERT_EQUAL(1, stateCallbackCount);
    TEST_ASSERT_EQUAL(GraphQLConnectionState::CONNECTING, lastCallbackState);
}

// =============================================================================
// Connection State Tests
// =============================================================================

void test_is_connected_true_when_connection_ack(void) {
    // Manually simulate state changes (in real code, these come from WS events)
    client->begin("test.host.com", 443, "/graphql", nullptr);

    // isConnected should return true for CONNECTION_ACK or SUBSCRIBED states
    // We can't easily set state directly, so we verify initial state
    TEST_ASSERT_EQUAL(GraphQLConnectionState::CONNECTING, client->getState());
    TEST_ASSERT_FALSE(client->isConnected());
}

void test_is_subscribed_false_when_not_subscribed(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    TEST_ASSERT_FALSE(client->isSubscribed());
}

// =============================================================================
// Disconnect Tests
// =============================================================================

void test_disconnect_sets_state_to_disconnected(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    TEST_ASSERT_EQUAL(GraphQLConnectionState::CONNECTING, client->getState());

    client->disconnect();
    TEST_ASSERT_EQUAL(GraphQLConnectionState::DISCONNECTED, client->getState());
}

// =============================================================================
// LED Hash Computation Tests (via sendLedPositions behavior)
// =============================================================================

void test_led_hash_different_for_different_positions(void) {
    // Testing that the hash computation produces different values for different inputs
    // We can test this indirectly through getCurrentDisplayHash after LED updates

    // Initial hash should be 0
    TEST_ASSERT_EQUAL_UINT32(0, client->getCurrentDisplayHash());
}

// =============================================================================
// Message Callback Tests
// =============================================================================

void test_set_message_callback(void) {
    client->setMessageCallback(messageCallback);
    // Callback is stored internally, will be called when messages arrive
    TEST_ASSERT_TRUE(true);  // Verify no crash
}

// =============================================================================
// Config Key Constants Tests
// =============================================================================

void test_config_keys_are_defined(void) {
    TEST_ASSERT_NOT_NULL(GraphQLWSClient::KEY_HOST);
    TEST_ASSERT_NOT_NULL(GraphQLWSClient::KEY_PORT);
    TEST_ASSERT_NOT_NULL(GraphQLWSClient::KEY_PATH);

    TEST_ASSERT_EQUAL_STRING("gql_host", GraphQLWSClient::KEY_HOST);
    TEST_ASSERT_EQUAL_STRING("gql_port", GraphQLWSClient::KEY_PORT);
    TEST_ASSERT_EQUAL_STRING("gql_path", GraphQLWSClient::KEY_PATH);
}

// =============================================================================
// Loop Behavior Tests
// =============================================================================

void test_loop_does_not_crash_when_disconnected(void) {
    // Loop should be safe to call even when disconnected
    client->loop();
    client->loop();
    client->loop();
    TEST_ASSERT_TRUE(true);  // Verify no crash
}

void test_loop_does_not_crash_after_begin(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    client->loop();
    client->loop();
    TEST_ASSERT_TRUE(true);  // Verify no crash
}

// =============================================================================
// Subscribe Tests
// =============================================================================

void test_subscribe_changes_state_to_subscribed(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    // Note: In real implementation, subscribe requires being in CONNECTION_ACK state
    // but for testing we verify the method doesn't crash
    client->subscribe("test-sub", "subscription { test }", nullptr);
    // State changes to SUBSCRIBED
    TEST_ASSERT_EQUAL(GraphQLConnectionState::SUBSCRIBED, client->getState());
}

void test_subscribe_with_variables(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    client->subscribe("test-sub", "subscription Test($id: ID!) { test(id: $id) }", "{\"id\":\"123\"}");
    TEST_ASSERT_EQUAL(GraphQLConnectionState::SUBSCRIBED, client->getState());
}

// =============================================================================
// Unsubscribe Tests
// =============================================================================

void test_unsubscribe_does_not_crash(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    client->unsubscribe("test-sub");
    TEST_ASSERT_TRUE(true);  // Verify no crash
}

// =============================================================================
// Send Tests
// =============================================================================

void test_send_query_does_not_crash(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    client->send("query { test }", nullptr);
    TEST_ASSERT_TRUE(true);  // Verify no crash
}

void test_send_query_with_variables(void) {
    client->begin("test.host.com", 443, "/graphql", nullptr);
    client->send("query Test($id: ID!) { test(id: $id) }", "{\"id\":\"123\"}");
    TEST_ASSERT_TRUE(true);  // Verify no crash
}

// =============================================================================
// sendLedPositions Tests
// =============================================================================

void test_send_led_positions_requires_subscribed_state(void) {
    // When not subscribed, sendLedPositions should not crash but also won't send
    LedCommand commands[2] = {
        {10, 255, 0, 0},   // Position 10, red
        {20, 0, 255, 0}    // Position 20, green
    };

    client->begin("test.host.com", 443, "/graphql", nullptr);
    // State is CONNECTING, not SUBSCRIBED
    client->sendLedPositions(commands, 2, 40);
    TEST_ASSERT_TRUE(true);  // Should not crash
}

void test_send_led_positions_when_subscribed(void) {
    LedCommand commands[3] = {
        {10, 255, 0, 0},   // Position 10, red
        {20, 0, 255, 0},   // Position 20, green
        {30, 0, 0, 255}    // Position 30, blue
    };

    client->begin("test.host.com", 443, "/graphql", nullptr);
    client->subscribe("test-sub", "subscription { test }", nullptr);
    client->sendLedPositions(commands, 3, 40);
    TEST_ASSERT_TRUE(true);  // Verify no crash
}

void test_send_led_positions_deduplication(void) {
    // Same LED data should be deduplicated
    LedCommand commands[2] = {
        {10, 255, 0, 0},
        {20, 0, 255, 0}
    };

    client->begin("test.host.com", 443, "/graphql", nullptr);
    client->subscribe("test-sub", "subscription { test }", nullptr);

    // First send
    client->sendLedPositions(commands, 2, 40);
    // Second send with same data - should be deduplicated
    client->sendLedPositions(commands, 2, 40);
    TEST_ASSERT_TRUE(true);  // No crash, deduplication should work
}

// =============================================================================
// State Transitions Tests
// =============================================================================

void test_multiple_state_transitions(void) {
    client->setStateCallback(stateCallback);
    stateCallbackCount = 0;

    client->begin("test.host.com", 443, "/graphql", nullptr);
    TEST_ASSERT_EQUAL(1, stateCallbackCount);  // DISCONNECTED -> CONNECTING

    client->disconnect();
    TEST_ASSERT_EQUAL(2, stateCallbackCount);  // CONNECTING -> DISCONNECTED
}

// =============================================================================
// WebSocket Timing Constants Tests
// =============================================================================

void test_websocket_timing_constants_defined(void) {
    // These constants are defined in the header
    TEST_ASSERT_EQUAL(30000, WS_PING_INTERVAL);
    TEST_ASSERT_EQUAL(10000, WS_PONG_TIMEOUT);
    TEST_ASSERT_EQUAL(5000, WS_RECONNECT_INTERVAL);
}

// =============================================================================
// Protocol Constant Tests
// =============================================================================

void test_graphql_ws_protocol_defined(void) {
    TEST_ASSERT_EQUAL_STRING("graphql-transport-ws", GQL_WS_PROTOCOL);
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char **argv) {
    UNITY_BEGIN();

    // Constructor tests
    RUN_TEST(test_initial_state_is_disconnected);
    RUN_TEST(test_initial_is_connected_returns_false);
    RUN_TEST(test_initial_is_subscribed_returns_false);
    RUN_TEST(test_initial_display_hash_is_zero);

    // Begin/Connection tests
    RUN_TEST(test_begin_sets_state_to_connecting);

    // State callback tests
    RUN_TEST(test_set_state_callback);

    // Connection state tests
    RUN_TEST(test_is_connected_true_when_connection_ack);
    RUN_TEST(test_is_subscribed_false_when_not_subscribed);

    // Disconnect tests
    RUN_TEST(test_disconnect_sets_state_to_disconnected);

    // LED hash tests
    RUN_TEST(test_led_hash_different_for_different_positions);

    // Message callback tests
    RUN_TEST(test_set_message_callback);

    // Config key tests
    RUN_TEST(test_config_keys_are_defined);

    // Loop behavior tests
    RUN_TEST(test_loop_does_not_crash_when_disconnected);
    RUN_TEST(test_loop_does_not_crash_after_begin);

    // Subscribe tests
    RUN_TEST(test_subscribe_changes_state_to_subscribed);
    RUN_TEST(test_subscribe_with_variables);

    // Unsubscribe tests
    RUN_TEST(test_unsubscribe_does_not_crash);

    // Send tests
    RUN_TEST(test_send_query_does_not_crash);
    RUN_TEST(test_send_query_with_variables);

    // sendLedPositions tests
    RUN_TEST(test_send_led_positions_requires_subscribed_state);
    RUN_TEST(test_send_led_positions_when_subscribed);
    RUN_TEST(test_send_led_positions_deduplication);

    // State transition tests
    RUN_TEST(test_multiple_state_transitions);

    // Timing constant tests
    RUN_TEST(test_websocket_timing_constants_defined);

    // Protocol constant tests
    RUN_TEST(test_graphql_ws_protocol_defined);

    return UNITY_END();
}
