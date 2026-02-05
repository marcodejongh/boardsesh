#ifndef LILYGO_DISPLAY_H
#define LILYGO_DISPLAY_H

#include <Arduino.h>

#include <LovyanGFX.hpp>
#include <vector>

// ============================================
// LilyGo T-Display S3 Pin Configuration
// ============================================

// Parallel 8-bit data pins
#define LCD_D0_PIN 39
#define LCD_D1_PIN 40
#define LCD_D2_PIN 41
#define LCD_D3_PIN 42
#define LCD_D4_PIN 45
#define LCD_D5_PIN 46
#define LCD_D6_PIN 47
#define LCD_D7_PIN 48

// Control pins
#define LCD_WR_PIN 8   // Write strobe
#define LCD_RD_PIN 9   // Read strobe
#define LCD_RS_PIN 7   // Register select (DC)
#define LCD_CS_PIN 6   // Chip select
#define LCD_RST_PIN 5  // Reset

// Backlight and power
#define LCD_BL_PIN 38
#define LCD_POWER_PIN 15

// Built-in buttons
#define BUTTON_1_PIN 0   // GPIO0 - Boot button
#define BUTTON_2_PIN 14  // GPIO14 - User button

// ============================================
// Display Settings
// ============================================

#define LILYGO_SCREEN_WIDTH 170
#define LILYGO_SCREEN_HEIGHT 320

// ============================================
// UI Layout (170x320 Portrait) - Condensed for Navigation
// ============================================

// Status bar at top
#define STATUS_BAR_HEIGHT 20
#define STATUS_BAR_Y 0

// Previous climb indicator (kept for backward compatibility, not displayed)
#define PREV_INDICATOR_Y 20
#define PREV_INDICATOR_HEIGHT 22

// Current climb section (moved up - prev indicator removed, redundant with history)
#define CURRENT_CLIMB_Y 20
#define CURRENT_CLIMB_HEIGHT 75

// Climb name area
#define CLIMB_NAME_Y 25
#define CLIMB_NAME_HEIGHT 30

// Grade badge area (starts at 55, height 36, ends at 91)
#define GRADE_Y 55
#define GRADE_HEIGHT 36

// QR code section (enlarged for 120px QR code)
#define QR_SECTION_Y 95
#define QR_SECTION_HEIGHT 133
#define QR_CODE_SIZE 120

// Next climb indicator
#define NEXT_INDICATOR_Y 228
#define NEXT_INDICATOR_HEIGHT 22

// History section (previous climbs in queue)
#define HISTORY_Y 250
#define HISTORY_HEIGHT 59
#define HISTORY_ITEM_HEIGHT 18
#define HISTORY_MAX_ITEMS 3
#define HISTORY_LABEL_HEIGHT 12

// Button hint bar at bottom
#define BUTTON_HINT_Y 309
#define BUTTON_HINT_HEIGHT 11

// ============================================
// Colors (RGB565)
// ============================================

#define COLOR_BACKGROUND 0x0000  // Black
#define COLOR_TEXT 0xFFFF        // White
#define COLOR_TEXT_DIM 0x7BEF    // Gray
#define COLOR_ACCENT 0x07FF      // Cyan

#define COLOR_STATUS_OK 0x07E0     // Green
#define COLOR_STATUS_WARN 0xFD20   // Orange
#define COLOR_STATUS_ERROR 0xF800  // Red
#define COLOR_STATUS_OFF 0x4208    // Dark gray

#define COLOR_QR_FG 0x0000  // Black
#define COLOR_QR_BG 0xFFFF  // White

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
// Queue Item for Local Queue Storage
// ============================================

// Maximum number of queue items to store locally
#define MAX_QUEUE_SIZE 150

// Optimized queue item structure (~88 bytes per item)
struct LocalQueueItem {
    char uuid[37];           // Queue item UUID (for navigation)
    char climbUuid[37];      // Climb UUID (for display/matching)
    char name[32];           // Climb name (truncated for display)
    char grade[12];          // Grade string
    uint16_t gradeColorRgb;  // RGB565 color (saves parsing)

    LocalQueueItem() : gradeColorRgb(0xFFFF) {
        uuid[0] = '\0';
        climbUuid[0] = '\0';
        name[0] = '\0';
        grade[0] = '\0';
    }

    bool isValid() const { return uuid[0] != '\0'; }
    void clear() {
        uuid[0] = '\0';
        climbUuid[0] = '\0';
        name[0] = '\0';
        grade[0] = '\0';
        gradeColorRgb = 0xFFFF;
    }
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
// Queue Navigation Item (for prev/next display)
// ============================================

struct QueueNavigationItem {
    String name;
    String grade;
    String gradeColor;
    bool isValid;

    QueueNavigationItem() : isValid(false) {}
    QueueNavigationItem(const String& n, const String& g, const String& c)
        : name(n), grade(g), gradeColor(c), isValid(true) {}
    void clear() {
        name = "";
        grade = "";
        gradeColor = "";
        isValid = false;
    }
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
    void showClimb(const char* name, const char* grade, const char* gradeColor, int angle, const char* uuid,
                   const char* boardType);
    void showNoClimb();

    // Session ID for QR code
    void setSessionId(const char* sessionId);

    // History management
    void addToHistory(const char* name, const char* grade, const char* gradeColor);
    void clearHistory();

    // Queue navigation (for prev/next indicators)
    void setNavigationContext(const QueueNavigationItem& prevClimb, const QueueNavigationItem& nextClimb,
                              int currentIndex, int totalCount);
    void clearNavigationContext();

    // Local queue management
    void setQueueFromSync(LocalQueueItem* items, int count, int currentIndex);
    void clearQueue();
    int getQueueCount() const { return _queueCount; }
    int getCurrentQueueIndex() const { return _currentQueueIndex; }
    const LocalQueueItem* getQueueItem(int index) const;
    const LocalQueueItem* getCurrentQueueItem() const;
    const LocalQueueItem* getPreviousQueueItem() const;
    const LocalQueueItem* getNextQueueItem() const;
    bool canNavigatePrevious() const { return _queueCount > 0 && _currentQueueIndex > 0; }
    bool canNavigateNext() const { return _queueCount > 0 && _currentQueueIndex < _queueCount - 1; }

    // Optimistic navigation (returns true if navigation was possible)
    bool navigateToPrevious();
    bool navigateToNext();
    void setCurrentQueueIndex(int index);

    // Pending navigation state (for reconciliation with backend)
    bool hasPendingNavigation() const { return _pendingNavigation; }
    void clearPendingNavigation() { _pendingNavigation = false; }
    const char* getPendingQueueItemUuid() const;
    void setPendingNavigation(bool pending) { _pendingNavigation = pending; }

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

    // Session ID for QR code URL
    String _sessionId;

    // History
    std::vector<ClimbHistoryEntry> _history;
    static const int MAX_HISTORY_ITEMS = 5;

    // Local queue storage
    LocalQueueItem _queueItems[MAX_QUEUE_SIZE];
    int _queueCount;
    int _currentQueueIndex;
    bool _pendingNavigation;

    // Navigation state (from backend)
    QueueNavigationItem _prevClimb;
    QueueNavigationItem _nextClimb;
    int _queueIndex;
    int _queueTotal;
    bool _hasNavigation;

    // QR code data
    // QR Version 6: size = 6*4+17 = 41 modules per side
    // Buffer = ((41*41)+7)/8 = 211 bytes
    static const int QR_VERSION = 6;
    static const int QR_BUFFER_SIZE = 211;
    uint8_t _qrCodeData[QR_BUFFER_SIZE];
    String _qrUrl;
    bool _hasQRCode;

    // Internal drawing methods
    void drawStatusBar();
    void drawPrevClimbIndicator();
    void drawCurrentClimb();
    void drawQRCode();
    void drawNextClimbIndicator();
    void drawHistory();
    void drawButtonHints();
    void setQRCodeUrl(const char* url);

    // Utility
    uint16_t hexToRgb565(const char* hex);
};

extern LilyGoDisplay Display;

#endif  // LILYGO_DISPLAY_H
