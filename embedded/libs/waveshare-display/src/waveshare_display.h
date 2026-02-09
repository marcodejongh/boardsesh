#ifndef WAVESHARE_DISPLAY_H
#define WAVESHARE_DISPLAY_H

#include <Arduino.h>

#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <lgfx/v1/platforms/esp32s3/Panel_RGB.hpp>
#include <lgfx/v1/platforms/esp32s3/Bus_RGB.hpp>
#include <display_base.h>

// Board image data is only available when explicitly enabled
#ifdef ENABLE_BOARD_IMAGE
#include <board_hold_data.h>
#endif

#include "ch422g.h"

// ============================================
// Waveshare ESP32-S3-Touch-LCD-7 Pin Configuration
// ============================================

// RGB 16-bit parallel control pins
#define WS_LCD_DE    5
#define WS_LCD_VSYNC 3
#define WS_LCD_HSYNC 46
#define WS_LCD_PCLK  7

// RGB data pins - Red (5 bits)
#define WS_LCD_R0   1
#define WS_LCD_R1   2
#define WS_LCD_R2   42
#define WS_LCD_R3   41
#define WS_LCD_R4   40

// RGB data pins - Green (6 bits)
#define WS_LCD_G0   39
#define WS_LCD_G1   0
#define WS_LCD_G2   45
#define WS_LCD_G3   48
#define WS_LCD_G4   47
#define WS_LCD_G5   21

// RGB data pins - Blue (5 bits)
#define WS_LCD_B0   14
#define WS_LCD_B1   38
#define WS_LCD_B2   18
#define WS_LCD_B3   17
#define WS_LCD_B4   10

// Touch pins (GT911 via I2C)
#define WS_TOUCH_SDA 8
#define WS_TOUCH_SCL 9
#define WS_TOUCH_INT 4
#define WS_TOUCH_RST -1  // Reset handled by CH422G

// I2C for CH422G IO expander
#define WS_I2C_SDA  8
#define WS_I2C_SCL  9

// ============================================
// Display Settings (native 800x480, portrait 480x800)
// ============================================

#define WS_SCREEN_WIDTH_NATIVE  800
#define WS_SCREEN_HEIGHT_NATIVE 480

// After rotation to portrait
#define WS_SCREEN_WIDTH  480
#define WS_SCREEN_HEIGHT 800

// ============================================
// UI Layout (480x800 Portrait) - Scaled from LilyGo 170x320
// ============================================

// Status bar at top
#define WS_STATUS_BAR_HEIGHT 50
#define WS_STATUS_BAR_Y 0

// Current climb section
#define WS_CURRENT_CLIMB_Y 50
#define WS_CURRENT_CLIMB_HEIGHT 190

// Climb name area
#define WS_CLIMB_NAME_Y 60
#define WS_CLIMB_NAME_HEIGHT 75

// Grade badge area
#define WS_GRADE_Y 140
#define WS_GRADE_HEIGHT 90

// QR code section
#define WS_QR_SECTION_Y 240
#define WS_QR_SECTION_HEIGHT 330
#define WS_QR_CODE_SIZE 300

// Next climb indicator
#define WS_NEXT_INDICATOR_Y 570
#define WS_NEXT_INDICATOR_HEIGHT 55

// History section (previous climbs in queue)
#define WS_HISTORY_Y 625
#define WS_HISTORY_HEIGHT 115
#define WS_HISTORY_ITEM_HEIGHT 35
#define WS_HISTORY_MAX_ITEMS 3
#define WS_HISTORY_LABEL_HEIGHT 25

// Board image section (v2 layout with board image)
#define WS_BOARD_IMAGE_Y        40
#define WS_BOARD_IMAGE_MAX_H    560
#define WS_BOARD_IMAGE_MAX_W    480
#define WS_CLIMB_INFO_V2_HEIGHT 80

// Navigation buttons at bottom (touch targets)
#define WS_NAV_BUTTON_Y 740
#define WS_NAV_BUTTON_HEIGHT 60

// ============================================
// Touch Event
// ============================================

enum class TouchAction {
    NONE,
    NAVIGATE_PREVIOUS,
    NAVIGATE_NEXT
};

struct TouchEvent {
    TouchAction action;
    int16_t x;
    int16_t y;

    TouchEvent() : action(TouchAction::NONE), x(0), y(0) {}
};

// ============================================
// Waveshare 7" LGFX Display Class (RGB bus)
// ============================================

class LGFX_Waveshare7 : public lgfx::LGFX_Device {
    lgfx::Panel_RGB _panel_instance;
    lgfx::Bus_RGB _bus_instance;
    lgfx::Touch_GT911 _touch_instance;

  public:
    LGFX_Waveshare7();
};

// ============================================
// Waveshare Display Manager
// ============================================

class WaveshareDisplay : public DisplayBase {
  public:
    WaveshareDisplay();
    ~WaveshareDisplay();

    // DisplayBase overrides
    bool begin() override;
    void showConnecting() override;
    void showError(const char* message, const char* ipAddress = nullptr) override;
    void showConfigPortal(const char* apName, const char* ip) override;
    void showSetupScreen(const char* apName) override;
    void refresh() override;
    void refreshInfoOnly() override;

    // Touch handling
    TouchEvent pollTouch();

    // Get display for custom drawing
    LGFX_Waveshare7& getDisplay() { return _display; }

    // Screen dimensions
    static const int SCREEN_WIDTH = WS_SCREEN_WIDTH;
    static const int SCREEN_HEIGHT = WS_SCREEN_HEIGHT;

  protected:
    void onStatusChanged() override;

  private:
    LGFX_Waveshare7 _display;
    CH422G _ioExpander;

    // Touch debouncing
    unsigned long _lastTouchTime;
    static const unsigned long TOUCH_DEBOUNCE_MS = 150;

    // Internal drawing methods
    void drawStatusBar();
    void drawCurrentClimb();
    void drawQRCode();
    void drawNextClimbIndicator();
    void drawHistory();
    void drawNavButtons();

#ifdef ENABLE_BOARD_IMAGE
  public:
    // LED command struct (public so main.cpp can construct them)
    struct LedCmd { uint16_t position; uint8_t r, g, b; };
    static const int MAX_LED_COMMANDS = 512;

    void setBoardConfig(const BoardConfig* config);
    void setLedCommands(const LedCmd* commands, int count);

  private:
    // Board image rendering (v2 layout)
    void drawBoardImageWithHolds();
    void drawClimbInfoCompact();

    // Board image state
    bool _hasBoardImage = false;
    const BoardConfig* _currentBoardConfig = nullptr;

    // Current LED commands for hold overlay
    LedCmd _ledCommands[MAX_LED_COMMANDS];
    int _ledCommandCount = 0;
#endif
};

extern WaveshareDisplay Display;

#endif  // WAVESHARE_DISPLAY_H
