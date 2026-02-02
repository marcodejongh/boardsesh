#ifndef DISPLAY_CONFIG_H
#define DISPLAY_CONFIG_H

// Device identification
#define DEVICE_NAME "Boardsesh Preview"
#define FIRMWARE_VERSION "1.0.0"

// ============================================
// Waveshare ESP32-S3 Touch LCD 4.3" Pin Configuration
// https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-4.3
// ============================================

// Display is RGB parallel interface (directly driven by ESP32-S3 LCD controller)
// No explicit SPI pins needed - using ESP32-S3's built-in RGB LCD peripheral

// RGB LCD Data pins (directly connected to LCD panel)
#define LCD_DE_PIN      40
#define LCD_VSYNC_PIN   41
#define LCD_HSYNC_PIN   39
#define LCD_PCLK_PIN    42

// RGB data pins (directly mapped to RGB565)
#define LCD_R0_PIN      45
#define LCD_R1_PIN      48
#define LCD_R2_PIN      47
#define LCD_R3_PIN      21
#define LCD_R4_PIN      14

#define LCD_G0_PIN      5
#define LCD_G1_PIN      6
#define LCD_G2_PIN      7
#define LCD_G3_PIN      15
#define LCD_G4_PIN      16
#define LCD_G5_PIN      4

#define LCD_B0_PIN      8
#define LCD_B1_PIN      3
#define LCD_B2_PIN      46
#define LCD_B3_PIN      9
#define LCD_B4_PIN      1

// Backlight control
#define LCD_BL_PIN      2

// Touch panel (GT911 I2C)
#define TOUCH_SDA_PIN   17
#define TOUCH_SCL_PIN   18
#define TOUCH_INT_PIN   -1  // Not connected on some versions
#define TOUCH_RST_PIN   38

// I2C address for GT911 touch controller
#define TOUCH_I2C_ADDR  0x5D

// ============================================
// Display Settings
// ============================================

#define SCREEN_WIDTH    800
#define SCREEN_HEIGHT   480
#define COLOR_DEPTH     16  // RGB565

// Refresh rate
#define LCD_PIXEL_CLOCK_MHZ  16

// Display timing parameters for 800x480 panel
#define LCD_H_RES       800
#define LCD_V_RES       480
#define LCD_HSYNC_BACK_PORCH    40
#define LCD_HSYNC_FRONT_PORCH   48
#define LCD_HSYNC_PULSE_WIDTH   40
#define LCD_VSYNC_BACK_PORCH    32
#define LCD_VSYNC_FRONT_PORCH   13
#define LCD_VSYNC_PULSE_WIDTH   4

// ============================================
// Board Preview Layout
// ============================================

// Board image display area (left side of screen)
// Board images are ~4:5 aspect ratio, so on 800x480 screen:
// Height: 480px (full height)
// Width: 480 * 0.8 = 384px
#define BOARD_AREA_WIDTH    400
#define BOARD_AREA_HEIGHT   480
#define BOARD_AREA_X        0
#define BOARD_AREA_Y        0

// Info panel (right side of screen)
#define INFO_AREA_X         400
#define INFO_AREA_Y         0
#define INFO_AREA_WIDTH     400
#define INFO_AREA_HEIGHT    480

// Climb info positioning
#define CLIMB_NAME_Y        40
#define CLIMB_NAME_FONT     &lv_font_montserrat_36
#define ANGLE_Y             120
#define ANGLE_FONT          &lv_font_montserrat_48
#define DIFFICULTY_Y        200
#define DIFFICULTY_FONT     &lv_font_montserrat_32
#define SETTER_Y            260
#define SETTER_FONT         &lv_font_montserrat_20
#define STATUS_Y            440
#define STATUS_FONT         &lv_font_montserrat_16

// ============================================
// Hold Rendering Settings
// ============================================

// Hold circle settings (scaled for display)
#define HOLD_STROKE_WIDTH   3
#define HOLD_FILL_OPACITY   200  // 0-255

// Hold colors (same as web app)
#define COLOR_STARTING      0x07E0  // Green (#00FF00) in RGB565
#define COLOR_HAND          0x07FF  // Cyan (#00FFFF) in RGB565
#define COLOR_FINISH        0xF81F  // Magenta (#FF00FF) in RGB565
#define COLOR_FOOT          0xFD40  // Orange (#FFAA00) in RGB565

// ============================================
// Backend Configuration
// ============================================

#define DEFAULT_BACKEND_HOST    "boardsesh.com"
#define DEFAULT_BACKEND_PORT    443
#define DEFAULT_BACKEND_PATH    "/graphql"

// ============================================
// Web Server
// ============================================

#define WEB_SERVER_PORT 80

// ============================================
// Debug Options
// ============================================

#define DEBUG_SERIAL    true
#define DEBUG_TOUCH     false
#define DEBUG_GRAPHQL   false

#endif // DISPLAY_CONFIG_H
