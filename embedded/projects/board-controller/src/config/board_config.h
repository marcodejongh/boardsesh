#ifndef BOARD_CONFIG_H
#define BOARD_CONFIG_H

// Device identification
#define DEVICE_NAME "Boardsesh Controller"
#define FIRMWARE_VERSION "1.0.0"

// LED configuration
// Note: GPIO 5 conflicts with LCD_RST on T-Display-S3
// Use TDISPLAY_LED_PIN build flag to override for display builds
#ifdef TDISPLAY_LED_PIN
#define LED_PIN TDISPLAY_LED_PIN
#else
#define LED_PIN 5         // GPIO pin for LED data (default for non-display builds)
#endif
#define NUM_LEDS 200      // Total number of LEDs
#define LED_TYPE WS2812B  // LED strip type
#define COLOR_ORDER GRB   // Color order

// Default brightness (0-255)
#define DEFAULT_BRIGHTNESS 128

// BLE configuration
#define BLE_DEVICE_NAME "Kilter Boardsesh"

// Backend configuration (defaults)
#define DEFAULT_BACKEND_HOST "boardsesh.com"
#define DEFAULT_BACKEND_PORT 443
#define DEFAULT_BACKEND_PATH "/graphql"

// Web server
#define WEB_SERVER_PORT 80

// Debug options
#define DEBUG_SERIAL true
#define DEBUG_BLE false

#endif
