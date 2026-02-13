# Firmware Unit Testing Guide

This document describes the unit testing approach for the ESP32 firmware shared libraries and tracks testing progress.

## Overview

The firmware uses **PlatformIO's native test environment** with the **Unity test framework** to run unit tests on the host machine (no ESP32 hardware required). This enables fast iteration and CI integration.

## Directory Structure

```
embedded/
├── libs/                     # Shared PlatformIO libraries
│   ├── aurora-protocol/      # BLE protocol decoder
│   ├── ble-proxy/            # BLE client connection to boards
│   ├── climb-history/        # Circular buffer climb history
│   ├── config-manager/       # NVS configuration storage
│   ├── esp-web-server/       # HTTP configuration server
│   ├── graphql-ws-client/    # WebSocket GraphQL client
│   ├── led-controller/       # FastLED abstraction
│   ├── log-buffer/           # Ring buffer logger
│   ├── nordic-uart-ble/      # BLE UART service
│   └── wifi-utils/           # WiFi connection management
├── projects/
│   └── board-controller/     # Main firmware project
└── test/                     # Unit tests
    ├── platformio.ini        # Test configuration
    ├── lib/mocks/            # Hardware mocks for native testing
    │   ├── Arduino.h         # Arduino API mock (with controllable millis)
    │   ├── ArduinoJson.h     # JSON library mock
    │   ├── FastLED.h         # FastLED mock
    │   ├── NimBLEDevice.h    # NimBLE mock (server + client)
    │   ├── Preferences.h     # NVS mock
    │   ├── WebServer.h       # WebServer mock
    │   ├── WebSocketsClient.h # WebSocket mock
    │   └── WiFi.h            # ESP32 WiFi mock
    ├── lib/grade-colors/     # V-grade color scheme (header-only)
    ├── test_aurora_protocol/ # Aurora protocol tests
    ├── test_ble_client/      # BLE client connection tests
    ├── test_climb_history/   # Climb history tests
    ├── test_grade_colors/    # Grade color mapping tests
    ├── test_log_buffer/      # Log buffer tests
    ├── test_led_controller/  # LED controller tests
    ├── test_config_manager/  # Config manager tests
    ├── test_wifi_utils/      # WiFi utils tests
    ├── test_graphql_ws_client/ # GraphQL WebSocket tests
    ├── test_nordic_uart_ble/ # Nordic UART BLE tests
    └── test_esp_web_server/  # ESP web server tests
```

## Running Tests

### Run All Tests
```bash
cd embedded/test
pio test -e native
```

### Run Specific Test Suite
```bash
cd embedded/test
pio test -e native -f test_aurora_protocol
pio test -e native -f test_log_buffer
```

### Verbose Output
```bash
cd embedded/test
pio test -e native -v
```

## Writing Tests

### Test File Structure
Each test suite should:
1. Live in its own directory: `test/test_<module_name>/`
2. Have a main test file: `test_<module_name>.cpp`
3. Use Unity test framework macros
4. Include `setUp()` and `tearDown()` functions

### Example Test Template
```cpp
#include <unity.h>
#include <module_to_test.h>

void setUp(void) {
    // Initialize before each test
}

void tearDown(void) {
    // Cleanup after each test
}

void test_feature_description(void) {
    // Arrange
    // Act
    // Assert
    TEST_ASSERT_TRUE(condition);
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_feature_description);
    return UNITY_END();
}
```

### Unity Assertion Macros
```cpp
TEST_ASSERT_TRUE(condition)
TEST_ASSERT_FALSE(condition)
TEST_ASSERT_EQUAL(expected, actual)
TEST_ASSERT_EQUAL_INT(expected, actual)
TEST_ASSERT_EQUAL_UINT8(expected, actual)
TEST_ASSERT_EQUAL_STRING(expected, actual)
TEST_ASSERT_NULL(pointer)
TEST_ASSERT_NOT_NULL(pointer)
TEST_ASSERT_EQUAL_MEMORY(expected, actual, len)
```

## Mocking Hardware Dependencies

The `lib/mocks/` directory contains mock implementations of hardware-dependent APIs:

- **Arduino.h**: Provides `String`, `Serial`, timing functions, pin functions
- **ArduinoJson.h**: Provides `JsonDocument`, `JsonObject`, `JsonArray` for JSON parsing/serialization
- **FastLED.h**: Provides `CRGB` struct and `FastLED` controller
- **NimBLEDevice.h**: Provides NimBLE BLE device, server, service, and characteristic mocks
- **Preferences.h**: Provides in-memory NVS storage simulation
- **WebServer.h**: Provides HTTP server mock with route handling and request simulation
- **WebSocketsClient.h**: Provides WebSocket client mock with connection and message simulation
- **WiFi.h**: Provides mock WiFi class with controllable state for testing

When adding new tests that require hardware mocks, extend these files or create new mock headers.

---

## Module Testing Status

### Legend
- :white_check_mark: Complete - Tests implemented and passing
- :construction: In Progress - Tests being written
- :x: Not Started - No tests yet
- :warning: Partial - Some tests exist but coverage incomplete

---

### 1. aurora-protocol :white_check_mark:
**Location:** `libs/aurora-protocol/`
**Test File:** `test/test_aurora_protocol/test_aurora_protocol.cpp`

BLE protocol decoder for Kilter/Tension board communication.

| Feature | Status | Notes |
|---------|--------|-------|
| `colorToRole()` function | :white_check_mark: | All color mappings tested |
| Frame parsing | :white_check_mark: | SOH/STX/ETX validation |
| Checksum validation | :white_check_mark: | Valid and invalid checksums |
| V2 LED decoding | :white_check_mark: | 2-byte format, position bits |
| V3 LED decoding | :white_check_mark: | 3-byte format, full range |
| Multi-packet assembly | :white_check_mark: | First/middle/last packets |
| Error recovery | :white_check_mark: | Garbage data, incomplete frames |

**Test Count:** 29 tests

---

### 2. log-buffer :white_check_mark:
**Location:** `libs/log-buffer/`
**Test File:** `test/test_log_buffer/test_log_buffer.cpp`

Ring buffer logging utility for storing and retrieving log messages.

| Feature | Status | Notes |
|---------|--------|-------|
| Basic logging (log/logln) | :white_check_mark: | Simple strings, newlines |
| Format strings | :white_check_mark: | printf-style formatting |
| Buffer management | :white_check_mark: | Size tracking, clear |
| Ring buffer wrapping | :white_check_mark: | Overflow handling |
| Serial enable/disable | :white_check_mark: | Toggle serial output |
| Edge cases | :white_check_mark: | Long messages, special chars |

**Test Count:** 31 tests

---

### 3. led-controller :white_check_mark:
**Location:** `libs/led-controller/`
**Test File:** `test/test_led_controller/test_led_controller.cpp`

FastLED abstraction layer for WS2812B LED control.

| Feature | Status | Notes |
|---------|--------|-------|
| LED initialization | :white_check_mark: | `begin()` function, caps at MAX_LEDS |
| Individual LED control | :white_check_mark: | `setLed()` with CRGB and RGB variants |
| Batch LED updates | :white_check_mark: | `setLeds()` from LedCommand arrays |
| Brightness control | :white_check_mark: | `setBrightness()`/`getBrightness()` |
| Clear/show operations | :white_check_mark: | FastLED interactions |
| Blink feedback | :white_check_mark: | Visual feedback function |
| Bounds checking | :white_check_mark: | Negative and out-of-range index handling |

**Test Count:** 29 tests

---

### 4. config-manager :white_check_mark:
**Location:** `libs/config-manager/`
**Test File:** `test/test_config_manager/test_config_manager.cpp`

NVS (Non-Volatile Storage) configuration persistence.

| Feature | Status | Notes |
|---------|--------|-------|
| String storage | :white_check_mark: | `getString()`/`setString()` with defaults |
| Integer storage | :white_check_mark: | `getInt()`/`setInt()` including min/max values |
| Boolean storage | :white_check_mark: | `getBool()`/`setBool()` with toggle tests |
| Byte array storage | :white_check_mark: | `getBytes()`/`setBytes()` with truncation |
| Key existence check | :white_check_mark: | `hasKey()` for all types |
| Key removal | :white_check_mark: | `remove()` and reuse |
| Clear all | :white_check_mark: | `clear()` removes all keys |
| Default values | :white_check_mark: | Fallback handling for missing keys |

**Test Count:** 37 tests

---

### 5. wifi-utils :white_check_mark:
**Location:** `libs/wifi-utils/`
**Test File:** `test/test_wifi_utils/test_wifi_utils.cpp`

WiFi connection management with auto-reconnect.

| Feature | Status | Notes |
|---------|--------|-------|
| Connection state machine | :white_check_mark: | State transitions tested |
| Credential storage | :white_check_mark: | Via config-manager integration |
| Timeout handling | :white_check_mark: | Connection timeout logic |
| Auto-reconnect | :white_check_mark: | Reconnection on disconnect |
| State callbacks | :white_check_mark: | Notification system with null safety |
| IP/SSID/RSSI reporting | :white_check_mark: | Status information methods |

**Test Count:** 27 tests

**Note:** Uses `WiFi.h` mock in `test/lib/mocks/src/`

---

### 6. graphql-ws-client :white_check_mark:
**Location:** `libs/graphql-ws-client/`
**Test File:** `test/test_graphql_ws_client/test_graphql_ws_client.cpp`

WebSocket client for GraphQL subscriptions (graphql-transport-ws protocol).

| Feature | Status | Notes |
|---------|--------|-------|
| Connection state machine | :white_check_mark: | WS connection flow |
| Connection init/ack | :white_check_mark: | Protocol handshake |
| Subscription management | :white_check_mark: | Subscribe/unsubscribe |
| Message parsing | :white_check_mark: | JSON message handling |
| LED update handling | :white_check_mark: | `handleLedUpdate()` |
| Hash computation | :white_check_mark: | Deduplication logic |
| State callbacks | :white_check_mark: | Connection notification |
| Config key constants | :white_check_mark: | Configuration keys defined |

**Test Count:** 25 tests

**Note:** Uses `WebSocketsClient.h` and `ArduinoJson.h` mocks in `test/lib/mocks/src/`

---

### 7. nordic-uart-ble :white_check_mark:
**Location:** `libs/nordic-uart-ble/`
**Test File:** `test/test_nordic_uart_ble/test_nordic_uart_ble.cpp`

BLE UART service compatible with Kilter/Tension mobile apps.

| Feature | Status | Notes |
|---------|--------|-------|
| BLE initialization | :white_check_mark: | Device name, power level |
| BLE advertising | :white_check_mark: | Service UUID setup, auto-restart |
| Connection callbacks | :white_check_mark: | Connect/disconnect handlers |
| Data callbacks | :white_check_mark: | Raw data and LED data |
| Data transmission | :white_check_mark: | `send()` for bytes and strings |
| Per-device hash tracking | :white_check_mark: | Deduplication by MAC address |
| Client disconnect | :white_check_mark: | Force disconnect on web change |
| Hash clearing | :white_check_mark: | `clearLastSentHash()` |

**Test Count:** 30 tests

**Note:** Uses `NimBLEDevice.h` mock in `test/lib/mocks/src/`

---

### 8. esp-web-server :white_check_mark:
**Location:** `libs/esp-web-server/`
**Test File:** `test/test_esp_web_server/test_esp_web_server.cpp`

HTTP server for configuration web interface.

| Feature | Status | Notes |
|---------|--------|-------|
| Server lifecycle | :white_check_mark: | `begin()`/`stop()`/`loop()` |
| Route registration | :white_check_mark: | Custom GET/POST handlers |
| Built-in routes | :white_check_mark: | Config, WiFi, restart endpoints |
| JSON responses | :white_check_mark: | `sendJson()` with document and string |
| Error responses | :white_check_mark: | `sendError()` with various codes |
| CORS headers | :white_check_mark: | Cross-origin support on custom routes |
| WiFi scan | :white_check_mark: | `/api/wifi/scan` endpoint |
| WiFi connect | :white_check_mark: | `/api/wifi/connect` with validation |
| Config persistence | :white_check_mark: | Settings saved via config-manager |

**Test Count:** 33 tests

**Note:** Uses `WebServer.h` mock in `test/lib/mocks/src/`

---

### 9. ble-proxy (BLE Client) :white_check_mark:
**Location:** `libs/ble-proxy/`
**Test File:** `test/test_ble_client/test_ble_client.cpp`

BLE client connection management for connecting to Aurora climbing boards via Nordic UART Service.

| Feature | Status | Notes |
|---------|--------|-------|
| Initial state | :white_check_mark: | IDLE state, not connected, empty address |
| Successful connection | :white_check_mark: | connect() returns true, state transitions |
| Connect failure handling | :white_check_mark: | Callback with false, DISCONNECTED state |
| Connect guard | :white_check_mark: | Prevents duplicate connections |
| Explicit disconnect | :white_check_mark: | Sets IDLE, clears reconnect timer |
| BLE link loss (onDisconnect) | :white_check_mark: | Sets DISCONNECTED, nullifies characteristics |
| Loop/reconnection | :white_check_mark: | Timer-based reconnect attempts |
| Send data | :white_check_mark: | Fails when not connected or no RX char |
| Address tracking | :white_check_mark: | Empty when disconnected |
| Multiple connections | :white_check_mark: | Connect/disconnect cycles, different addresses |
| Callback registration | :white_check_mark: | Connect and data callbacks, null safety |

**Test Count:** 33 tests

**Note:** Uses `NimBLEDevice.h` client-side mock. Key regression test: connect failure must call connectCallback with false.

---

### 10. climb-history :white_check_mark:
**Location:** `libs/climb-history/`
**Test File:** `test/test_climb_history/test_climb_history.cpp`

Circular buffer climb history with NVS persistence for tracking recent climbs.

| Feature | Status | Notes |
|---------|--------|-------|
| Add/get climbs | :white_check_mark: | addClimb, getCurrentClimb, getCount |
| History shifting | :white_check_mark: | LIFO order, preserves grades/uuids |
| Max capacity overflow | :white_check_mark: | Oldest entry discarded, exact fill |
| Duplicate detection | :white_check_mark: | Same UUID updates current, not history |
| Clear current | :white_check_mark: | Marks no current, keeps history entries |
| Index bounds checking | :white_check_mark: | Negative, out-of-bounds, empty slots |
| Null input handling | :white_check_mark: | Null name/uuid ignored, null grade OK |
| String truncation | :white_check_mark: | Long name/grade/uuid truncated safely |
| Clear all | :white_check_mark: | Removes all history and NVS data |
| Stress testing | :white_check_mark: | Rapid add/clear cycles |

**Test Count:** 43 tests

**Note:** NVS persistence is exercised through addClimb() which calls save() automatically. Full deserialization round-trip tests require enhanced ArduinoJson mock support for root-level arrays.

---

### 11. grade-colors :white_check_mark:
**Location:** `test/lib/grade-colors/` (header-only library)
**Test File:** `test/test_grade_colors/test_grade_colors.cpp`

V-grade color scheme mapping for climbing grade visualization on LEDs and displays.

| Feature | Status | Notes |
|---------|--------|-------|
| V-grade to color mapping | :white_check_mark: | V0-V17, out-of-range, negative |
| Font grade to color | :white_check_mark: | 4a through 8c+, invalid inputs |
| Combined grade format | :white_check_mark: | Extracts V-grade from combined strings |
| Light/dark detection | :white_check_mark: | isLightColor for contrast decisions |
| Text color selection | :white_check_mark: | Black/white based on background luminance |
| Edge cases | :white_check_mark: | Null, empty, single char, invalid strings |

**Test Count:** 43 tests

---

## Testing Priority Order

All 11 shared library modules now have complete test coverage:

1. ~~**aurora-protocol**~~ :white_check_mark: Complete (29 tests)
2. ~~**log-buffer**~~ :white_check_mark: Complete (31 tests)
3. ~~**led-controller**~~ :white_check_mark: Complete (30 tests)
4. ~~**config-manager**~~ :white_check_mark: Complete (40 tests)
5. ~~**wifi-utils**~~ :white_check_mark: Complete (27 tests)
6. ~~**graphql-ws-client**~~ :white_check_mark: Complete (25 tests)
7. ~~**nordic-uart-ble**~~ :white_check_mark: Complete (30 tests)
8. ~~**esp-web-server**~~ :white_check_mark: Complete (33 tests)
9. ~~**ble-proxy**~~ :white_check_mark: Complete (33 tests)
10. ~~**climb-history**~~ :white_check_mark: Complete (43 tests)
11. ~~**grade-colors**~~ :white_check_mark: Complete (43 tests)

**Total: 364 tests across 11 modules**

## CI Integration

Tests run automatically on GitHub Actions:
- Trigger: Push/PR to `main` affecting `embedded/**`
- Workflow: `.github/workflows/firmware-tests.yml`
- Environment: Ubuntu with PlatformIO native

## Adding New Mock Headers

When testing a module that requires new hardware mocks:

1. Create the mock header in `test/mocks/`
2. Add minimal API surface needed for tests
3. Update `platformio.ini` build flags if needed
4. Document the mock in this file

## Coverage Goals

- **Target:** 80%+ line coverage for pure-logic modules
- **Focus:** Error handling, edge cases, state transitions
- **Skip:** Hardware-specific timing, actual I/O operations
