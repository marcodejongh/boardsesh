#ifndef LILYGO_DISPLAY_H
#define LILYGO_DISPLAY_H

#include <Arduino.h>
#include <LovyanGFX.hpp>
#include <vector>

// ============================================
// LilyGo T-Display S3 Pin Configuration
// ============================================

// Parallel 8-bit data pins
#define LCD_D0_PIN      39
#define LCD_D1_PIN      40
#define LCD_D2_PIN      41
#define LCD_D3_PIN      42
#define LCD_D4_PIN      45
#define LCD_D5_PIN      46
#define LCD_D6_PIN      47
#define LCD_D7_PIN      48

// Control pins
#define LCD_WR_PIN      8   // Write strobe
#define LCD_RD_PIN      9   // Read strobe
#define LCD_RS_PIN      7   // Register select (DC)
#define LCD_CS_PIN      6   // Chip select
#define LCD_RST_PIN     5   // Reset

// Backlight and power
#define LCD_BL_PIN      38
#define LCD_POWER_PIN   15

// Built-in buttons
#define BUTTON_1_PIN    0   // GPIO0 - Boot button
#define BUTTON_2_PIN    14  // GPIO14 - User button

// ============================================
// Display Settings
// ============================================

#define LILYGO_SCREEN_WIDTH    170
#define LILYGO_SCREEN_HEIGHT   320

// ============================================
// UI Layout (170x320 Portrait)
// ============================================

// Status bar at top
#define STATUS_BAR_HEIGHT   20
#define STATUS_BAR_Y        0

// Current climb section
#define CURRENT_CLIMB_Y     20
#define CURRENT_CLIMB_HEIGHT 120

// Climb name area
#define CLIMB_NAME_Y        25
#define CLIMB_NAME_HEIGHT   40

// Grade badge area
#define GRADE_Y             70
#define GRADE_HEIGHT        60

// QR code section
#define QR_SECTION_Y        140
#define QR_SECTION_HEIGHT   115
#define QR_CODE_SIZE        100

// History section
#define HISTORY_Y           255
#define HISTORY_HEIGHT      65
#define HISTORY_ITEM_HEIGHT 18
#define HISTORY_MAX_ITEMS   3

// ============================================
// Colors (RGB565)
// ============================================

#define COLOR_BACKGROUND    0x0000  // Black
#define COLOR_TEXT          0xFFFF  // White
#define COLOR_TEXT_DIM      0x7BEF  // Gray
#define COLOR_ACCENT        0x07FF  // Cyan

#define COLOR_STATUS_OK     0x07E0  // Green
#define COLOR_STATUS_WARN   0xFD20  // Orange
#define COLOR_STATUS_ERROR  0xF800  // Red
#define COLOR_STATUS_OFF    0x4208  // Dark gray

#define COLOR_QR_FG         0x0000  // Black
#define COLOR_QR_BG         0xFFFF  // White

// ============================================
// LilyGo T-Display S3 Display Class
// ============================================

class LGFX_TDisplayS3 : public lgfx::LGFX_Device {
    lgfx::Panel_ST7789 _panel_instance;
    lgfx::Bus_Parallel8 _bus_instance;
    lgfx::Light_PWM _light_instance;

public:
    LGFX_TDisplayS3();
};

// ============================================
// Climb History Entry
// ============================================

struct ClimbHistoryEntry {
    String name;
    String grade;
    String gradeColor;  // Hex color from backend
};

// ============================================
// LilyGo Display Manager
// ============================================

class LilyGoDisplay {
public:
    LilyGoDisplay();
    ~LilyGoDisplay();

    // Initialization
    bool begin();

    // Status indicators
    void setWiFiStatus(bool connected);
    void setBackendStatus(bool connected);
    void setBleStatus(bool enabled, bool connected);

    // Full screen modes
    void showConnecting();
    void showError(const char* message, const char* ipAddress = nullptr);
    void showConfigPortal(const char* apName, const char* ip);

    // Climb display
    void showClimb(const char* name, const char* grade, const char* gradeColor,
                   int angle, const char* uuid, const char* boardType);
    void showNoClimb();

    // History management
    void addToHistory(const char* name, const char* grade, const char* gradeColor);
    void clearHistory();

    // Refresh all sections
    void refresh();

    // Get display for custom drawing
    LGFX_TDisplayS3& getDisplay() { return _display; }

    // Screen dimensions
    static const int SCREEN_WIDTH = LILYGO_SCREEN_WIDTH;
    static const int SCREEN_HEIGHT = LILYGO_SCREEN_HEIGHT;

private:
    LGFX_TDisplayS3 _display;

    // Status state
    bool _wifiConnected;
    bool _backendConnected;
    bool _bleEnabled;
    bool _bleConnected;

    // Current climb state
    bool _hasClimb;
    String _climbName;
    String _grade;
    String _gradeColor;
    int _angle;
    String _climbUuid;
    String _boardType;

    // History
    std::vector<ClimbHistoryEntry> _history;
    static const int MAX_HISTORY_ITEMS = 5;

    // QR code data
    static const int QR_VERSION = 6;
    static const int QR_BUFFER_SIZE = 211;
    uint8_t _qrCodeData[QR_BUFFER_SIZE];
    String _qrUrl;
    bool _hasQRCode;

    // Internal drawing methods
    void drawStatusBar();
    void drawCurrentClimb();
    void drawQRCode();
    void drawHistory();
    void setQRCodeUrl(const char* url);

    // Utility
    uint16_t hexToRgb565(const char* hex);
};

extern LilyGoDisplay Display;

#endif // LILYGO_DISPLAY_H
