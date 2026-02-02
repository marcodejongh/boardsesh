# Firmware Unit Testing Guide

This document describes the unit testing approach for the ESP32 firmware shared libraries and tracks testing progress.

## Overview

The firmware uses **PlatformIO's native test environment** with the **Unity test framework** to run unit tests on the host machine (no ESP32 hardware required). This enables fast iteration and CI integration.

## Directory Structure

```
embedded/
├── libs/                     # Shared PlatformIO libraries
│   ├── aurora-protocol/      # BLE protocol decoder
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
    ├── mocks/                # Hardware mocks for native testing
    │   ├── Arduino.h         # Arduino API mock
    │   ├── FastLED.h         # FastLED mock
    │   └── Preferences.h     # NVS mock
    ├── test_aurora_protocol/ # Aurora protocol tests
    └── test_log_buffer/      # Log buffer tests
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

The `mocks/` directory contains mock implementations of hardware-dependent APIs:

- **Arduino.h**: Provides `String`, `Serial`, timing functions, pin functions
- **FastLED.h**: Provides `CRGB` struct and `FastLED` controller
- **Preferences.h**: Provides in-memory NVS storage simulation

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

### 3. led-controller :x:
**Location:** `libs/led-controller/`

FastLED abstraction layer for WS2812B LED control.

| Feature | Status | Notes |
|---------|--------|-------|
| LED initialization | :x: | `begin()` function |
| Individual LED control | :x: | `setLed()` variants |
| Batch LED updates | :x: | `setLeds()` from commands |
| Brightness control | :x: | `setBrightness()`/`getBrightness()` |
| Clear/show operations | :x: | FastLED interactions |
| Blink feedback | :x: | Visual feedback function |
| Bounds checking | :x: | Index validation |

**Priority:** High - Core functionality used by multiple modules

---

### 4. config-manager :x:
**Location:** `libs/config-manager/`

NVS (Non-Volatile Storage) configuration persistence.

| Feature | Status | Notes |
|---------|--------|-------|
| String storage | :x: | `getString()`/`setString()` |
| Integer storage | :x: | `getInt()`/`setInt()` |
| Boolean storage | :x: | `getBool()`/`setBool()` |
| Byte array storage | :x: | `getBytes()`/`setBytes()` |
| Key existence check | :x: | `hasKey()` |
| Key removal | :x: | `remove()` |
| Clear all | :x: | `clear()` |
| Default values | :x: | Fallback handling |

**Priority:** High - Used by wifi-utils, graphql-ws-client

**Note:** Requires `Preferences.h` mock (already implemented)

---

### 5. wifi-utils :x:
**Location:** `libs/wifi-utils/`

WiFi connection management with auto-reconnect.

| Feature | Status | Notes |
|---------|--------|-------|
| Connection state machine | :x: | State transitions |
| Credential storage | :x: | Via config-manager |
| Timeout handling | :x: | Connection timeout |
| Auto-reconnect | :x: | Reconnection logic |
| State callbacks | :x: | Notification system |
| IP/SSID/RSSI reporting | :x: | Status information |

**Priority:** Medium - Requires WiFi mock (complex)

**Note:** May need significant mocking of ESP32 WiFi library

---

### 6. graphql-ws-client :x:
**Location:** `libs/graphql-ws-client/`

WebSocket client for GraphQL subscriptions (graphql-transport-ws protocol).

| Feature | Status | Notes |
|---------|--------|-------|
| Connection state machine | :x: | WS connection flow |
| Connection init/ack | :x: | Protocol handshake |
| Subscription management | :x: | Subscribe/unsubscribe |
| Message parsing | :x: | JSON message handling |
| LED update handling | :x: | `handleLedUpdate()` |
| Hash computation | :x: | Deduplication logic |
| Ping/pong keep-alive | :x: | Connection maintenance |
| Reconnection logic | :x: | Auto-reconnect |

**Priority:** Medium - Requires WebSockets mock (complex)

---

### 7. nordic-uart-ble :x:
**Location:** `libs/nordic-uart-ble/`

BLE UART service compatible with Kilter/Tension mobile apps.

| Feature | Status | Notes |
|---------|--------|-------|
| BLE advertising | :x: | Service UUID setup |
| Connection callbacks | :x: | Connect/disconnect |
| Data reception | :x: | Write characteristic |
| Data transmission | :x: | Notify characteristic |
| Aurora protocol integration | :x: | LED data callback |
| Per-device hash tracking | :x: | Deduplication by MAC |
| Client disconnect | :x: | Force disconnect |

**Priority:** Low - Requires NimBLE mock (complex)

---

### 8. esp-web-server :x:
**Location:** `libs/esp-web-server/`

HTTP server for configuration web interface.

| Feature | Status | Notes |
|---------|--------|-------|
| Route registration | :x: | Custom handlers |
| Built-in routes | :x: | Config, WiFi, restart |
| JSON responses | :x: | `sendJson()` |
| Error responses | :x: | `sendError()` |
| CORS headers | :x: | Cross-origin support |
| WiFi scan | :x: | Network discovery |

**Priority:** Low - Requires WebServer mock (complex)

---

## Testing Priority Order

Based on dependencies and complexity:

1. **led-controller** - Core functionality, simple interface, minimal dependencies
2. **config-manager** - Foundation for other modules, mock already exists
3. **wifi-utils** - Medium complexity, requires WiFi mock
4. **graphql-ws-client** - Complex, requires WebSockets mock
5. **nordic-uart-ble** - Complex, requires NimBLE mock
6. **esp-web-server** - Complex, requires WebServer mock

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
