#ifndef DISPLAY_CONFIG_H
#define DISPLAY_CONFIG_H

// ============================================
// Device Identification
// ============================================

#define DEVICE_NAME "Boardsesh Queue Display"
#define FIRMWARE_VERSION "1.1.0"

// ============================================
// Backend Configuration Defaults
// ============================================

#define DEFAULT_BACKEND_HOST    "boardsesh.com"
#define DEFAULT_BACKEND_PORT    443
#define DEFAULT_BACKEND_PATH    "/graphql"

// ============================================
// BLE Configuration
// ============================================

#define BLE_SCAN_TIMEOUT_SEC    30
#define BLE_RECONNECT_INTERVAL_MS 30000

// ============================================
// App URL Prefixes for QR Codes
// ============================================

#define KILTER_APP_URL_PREFIX   "https://kilterboardapp.com/climbs/"
#define TENSION_APP_URL_PREFIX  "https://tensionboardapp2.com/climbs/"

// ============================================
// Debug Options
// ============================================

#define DEBUG_SERIAL    true
#define DEBUG_DISPLAY   false
#define DEBUG_GRAPHQL   false

#endif // DISPLAY_CONFIG_H
