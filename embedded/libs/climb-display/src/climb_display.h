#ifndef CLIMB_DISPLAY_H
#define CLIMB_DISPLAY_H

#include <Arduino.h>
#include <LovyanGFX.hpp>
#include <ArduinoJson.h>
#include <map>

// Display configuration for Waveshare ESP32-S3 Touch LCD 4.3"
// 800x480 RGB parallel interface

// Waveshare ESP32-S3 Touch LCD 4.3" specific configuration
class LGFX_Waveshare_4_3 : public lgfx::LGFX_Device {
    lgfx::Panel_RGB _panel_instance;
    lgfx::Bus_RGB _bus_instance;
    lgfx::Light_PWM _light_instance;
    lgfx::Touch_GT911 _touch_instance;

public:
    LGFX_Waveshare_4_3() {
        // Bus configuration
        {
            auto cfg = _bus_instance.config();

            cfg.panel = &_panel_instance;

            // RGB data pins
            cfg.pin_d0  = 8;   // B0
            cfg.pin_d1  = 3;   // B1
            cfg.pin_d2  = 46;  // B2
            cfg.pin_d3  = 9;   // B3
            cfg.pin_d4  = 1;   // B4
            cfg.pin_d5  = 5;   // G0
            cfg.pin_d6  = 6;   // G1
            cfg.pin_d7  = 7;   // G2
            cfg.pin_d8  = 15;  // G3
            cfg.pin_d9  = 16;  // G4
            cfg.pin_d10 = 4;   // G5
            cfg.pin_d11 = 45;  // R0
            cfg.pin_d12 = 48;  // R1
            cfg.pin_d13 = 47;  // R2
            cfg.pin_d14 = 21;  // R3
            cfg.pin_d15 = 14;  // R4

            // Control pins
            cfg.pin_pclk = 42;  // PCLK
            cfg.pin_vsync = 41; // VSYNC
            cfg.pin_hsync = 39; // HSYNC
            cfg.pin_henable = 40; // DE

            cfg.freq_write = 16000000;  // 16MHz pixel clock

            // Timing parameters for 800x480
            cfg.hsync_polarity = 0;
            cfg.hsync_front_porch = 48;
            cfg.hsync_pulse_width = 40;
            cfg.hsync_back_porch = 40;

            cfg.vsync_polarity = 0;
            cfg.vsync_front_porch = 13;
            cfg.vsync_pulse_width = 4;
            cfg.vsync_back_porch = 32;

            cfg.pclk_active_neg = 1;
            cfg.de_idle_high = 0;
            cfg.pclk_idle_high = 0;

            _bus_instance.config(cfg);
        }

        // Panel configuration
        {
            auto cfg = _panel_instance.config();

            cfg.memory_width  = 800;
            cfg.memory_height = 480;
            cfg.panel_width   = 800;
            cfg.panel_height  = 480;
            cfg.offset_x = 0;
            cfg.offset_y = 0;

            _panel_instance.config(cfg);
        }

        // Backlight configuration
        {
            auto cfg = _light_instance.config();
            cfg.pin_bl = 2;
            cfg.invert = false;
            cfg.freq = 12000;
            cfg.pwm_channel = 0;
            _light_instance.config(cfg);
            _panel_instance.setLight(&_light_instance);
        }

        // Touch configuration (GT911)
        {
            auto cfg = _touch_instance.config();
            cfg.x_min = 0;
            cfg.x_max = 800;
            cfg.y_min = 0;
            cfg.y_max = 480;
            cfg.pin_int = -1;  // Not used
            cfg.pin_rst = 38;
            cfg.bus_shared = false;
            cfg.offset_rotation = 0;
            cfg.i2c_port = 1;
            cfg.i2c_addr = 0x5D;
            cfg.pin_sda = 17;
            cfg.pin_scl = 18;
            cfg.freq = 400000;
            _touch_instance.config(cfg);
            _panel_instance.setTouch(&_touch_instance);
        }

        _panel_instance.setBus(&_bus_instance);
        setPanel(&_panel_instance);
    }
};

// Hold state colors (RGB565 format for display)
enum HoldColor : uint16_t {
    HOLD_COLOR_STARTING = 0x07E0,  // Green (#00FF00)
    HOLD_COLOR_HAND     = 0x07FF,  // Cyan (#00FFFF)
    HOLD_COLOR_FINISH   = 0xF81F,  // Magenta (#FF00FF)
    HOLD_COLOR_FOOT     = 0xFD40,  // Orange (#FFAA00)
    HOLD_COLOR_OFF      = 0x0000,  // Black
};

// Hold rendering data
struct DisplayHold {
    int16_t x;       // Display X coordinate
    int16_t y;       // Display Y coordinate
    int16_t radius;  // Display radius
    uint16_t color;  // RGB565 color
};

// Climb information for display
struct ClimbInfo {
    String name;
    int angle;
    String difficulty;
    String setter;
    String uuid;
    bool mirrored;
};

/**
 * Climb Preview Display Manager
 * Handles display initialization, rendering, and updates
 */
class ClimbDisplay {
public:
    ClimbDisplay();
    ~ClimbDisplay();

    // Initialization
    bool begin();

    // Display control
    void setBrightness(uint8_t brightness);
    void clear();
    void update();

    // Climb preview rendering
    void showClimb(const ClimbInfo& climb, const std::vector<DisplayHold>& holds);
    void showNoClimb();
    void showConnecting();
    void showError(const char* message);
    void showStatus(const char* status);

    // BLE proxy status (shown in info panel)
    void setBleStatus(bool connected, const char* deviceName = nullptr);

    // Board background (optional - can load from SPIFFS or draw placeholder)
    void setBackgroundColor(uint16_t color);

    // Touch handling
    bool getTouchPoint(int16_t& x, int16_t& y);

    // Get display reference for custom drawing
    LGFX_Waveshare_4_3& getDisplay() { return _display; }

    // Screen dimensions
    static const int SCREEN_WIDTH = 800;
    static const int SCREEN_HEIGHT = 480;

    // Layout areas
    static const int BOARD_AREA_WIDTH = 400;
    static const int BOARD_AREA_HEIGHT = 480;
    static const int INFO_AREA_X = 400;
    static const int INFO_AREA_WIDTH = 400;

private:
    LGFX_Waveshare_4_3 _display;
    LGFX_Sprite* _boardSprite;  // Double-buffered board area
    LGFX_Sprite* _infoSprite;   // Info panel area

    uint16_t _bgColor;
    ClimbInfo _currentClimb;
    bool _hasClimb;

    // BLE proxy status
    bool _bleConnected;
    String _bleDeviceName;

    // Internal drawing methods
    void drawBoardArea(const std::vector<DisplayHold>& holds);
    void drawInfoPanel(const ClimbInfo& climb);
    void drawHold(int16_t x, int16_t y, int16_t radius, uint16_t color, bool filled = true);
    void drawCenteredText(const char* text, int y, const lgfx::IFont* font, uint16_t color);
};

extern ClimbDisplay Display;

#endif // CLIMB_DISPLAY_H
