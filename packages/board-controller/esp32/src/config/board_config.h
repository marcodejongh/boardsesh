#ifndef BOARD_CONFIG_H
#define BOARD_CONFIG_H

// ============================================
// Hardware Configuration
// ============================================

// Default LED configuration
#define DEFAULT_LED_PIN 5           // GPIO pin for WS2811 data line
#define DEFAULT_LED_COUNT 300       // Maximum number of LEDs
#define DEFAULT_BRIGHTNESS 128      // Default brightness (0-255)

// LED timing (WS2811)
#define LED_TYPE WS2811
#define LED_COLOR_ORDER GRB

// ============================================
// WiFi Configuration
// ============================================

// Access Point mode settings
#define AP_SSID "BoardSesh-Controller"
#define AP_PASSWORD ""              // Empty for open AP
#define AP_CHANNEL 1
#define AP_HIDDEN 0
#define AP_MAX_CONNECTIONS 4

// WiFi connection timeout (ms)
#define WIFI_CONNECT_TIMEOUT 30000

// ============================================
// Backend Configuration
// ============================================

// Default backend URL (can be overridden via config)
#define DEFAULT_BACKEND_URL "wss://backend.boardsesh.com/graphql"

// WebSocket reconnection settings
#define WS_RECONNECT_INTERVAL 5000  // ms between reconnection attempts
#define WS_PING_INTERVAL 30000      // ms between ping messages
#define WS_PONG_TIMEOUT 10000       // ms to wait for pong response

// ============================================
// BLE Configuration
// ============================================

// Aurora/Nordic UART Service UUIDs
#define AURORA_ADVERTISED_UUID "4488b571-7806-4df6-bcff-a2897e4953ff"
#define NORDIC_UART_SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define NORDIC_UART_RX_UUID "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define NORDIC_UART_TX_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

// BLE device name (appears in scan)
#define BLE_DEVICE_NAME "Kilter Board"

// ============================================
// Web Server Configuration
// ============================================

#define WEB_SERVER_PORT 80

// ============================================
// NVS Configuration Keys
// ============================================

#define NVS_NAMESPACE "boardsesh"
#define NVS_KEY_WIFI_SSID "wifi_ssid"
#define NVS_KEY_WIFI_PASS "wifi_pass"
#define NVS_KEY_API_KEY "api_key"
#define NVS_KEY_BACKEND_URL "backend_url"
#define NVS_KEY_SESSION_ID "session_id"
#define NVS_KEY_LED_PIN "led_pin"
#define NVS_KEY_LED_COUNT "led_count"
#define NVS_KEY_BRIGHTNESS "brightness"

// ============================================
// Debug Configuration
// ============================================

#define DEBUG_SERIAL Serial
#define DEBUG_BAUD 115200

// Enable/disable debug output
#define DEBUG_WIFI 1
#define DEBUG_WEBSOCKET 1
#define DEBUG_BLE 1
#define DEBUG_LED 1

#endif // BOARD_CONFIG_H
