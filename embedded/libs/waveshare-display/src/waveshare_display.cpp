#include "waveshare_display.h"

#include <grade_colors.h>

#include <qrcode.h>

// Global display instance
WaveshareDisplay Display;

// ============================================
// LGFX_Waveshare7 Implementation (RGB bus)
// ============================================

LGFX_Waveshare7::LGFX_Waveshare7() {
    // Panel configuration (must be set before bus)
    {
        auto cfg = _panel_instance.config();
        cfg.memory_width  = WS_SCREEN_WIDTH_NATIVE;
        cfg.memory_height = WS_SCREEN_HEIGHT_NATIVE;
        cfg.panel_width   = WS_SCREEN_WIDTH_NATIVE;
        cfg.panel_height  = WS_SCREEN_HEIGHT_NATIVE;
        cfg.offset_x = 0;
        cfg.offset_y = 0;

        _panel_instance.config(cfg);
    }

    // RGB Bus configuration
    {
        auto cfg = _bus_instance.config();
        cfg.panel = &_panel_instance;

        cfg.freq_write = 16000000;  // 16MHz pixel clock

        // Blue channel (5 bits) - pin_d0..d4
        cfg.pin_d0  = WS_LCD_B0;   // GPIO 14
        cfg.pin_d1  = WS_LCD_B1;   // GPIO 38
        cfg.pin_d2  = WS_LCD_B2;   // GPIO 18
        cfg.pin_d3  = WS_LCD_B3;   // GPIO 17
        cfg.pin_d4  = WS_LCD_B4;   // GPIO 10

        // Green channel (6 bits) - pin_d5..d10
        cfg.pin_d5  = WS_LCD_G0;   // GPIO 39
        cfg.pin_d6  = WS_LCD_G1;   // GPIO 0
        cfg.pin_d7  = WS_LCD_G2;   // GPIO 45
        cfg.pin_d8  = WS_LCD_G3;   // GPIO 48
        cfg.pin_d9  = WS_LCD_G4;   // GPIO 47
        cfg.pin_d10 = WS_LCD_G5;   // GPIO 21

        // Red channel (5 bits) - pin_d11..d15
        cfg.pin_d11 = WS_LCD_R0;   // GPIO 1
        cfg.pin_d12 = WS_LCD_R1;   // GPIO 2
        cfg.pin_d13 = WS_LCD_R2;   // GPIO 42
        cfg.pin_d14 = WS_LCD_R3;   // GPIO 41
        cfg.pin_d15 = WS_LCD_R4;   // GPIO 40

        // Control signals
        cfg.pin_henable = WS_LCD_DE;     // GPIO 5
        cfg.pin_vsync   = WS_LCD_VSYNC;  // GPIO 3
        cfg.pin_hsync   = WS_LCD_HSYNC;  // GPIO 46
        cfg.pin_pclk    = WS_LCD_PCLK;   // GPIO 7

        // Sync timing
        cfg.hsync_polarity    = 0;
        cfg.hsync_front_porch = 8;
        cfg.hsync_pulse_width = 4;
        cfg.hsync_back_porch  = 8;
        cfg.vsync_polarity    = 0;
        cfg.vsync_front_porch = 8;
        cfg.vsync_pulse_width = 4;
        cfg.vsync_back_porch  = 8;
        cfg.pclk_active_neg   = 1;
        cfg.de_idle_high      = 0;
        cfg.pclk_idle_high    = 0;

        _bus_instance.config(cfg);
    }

    _panel_instance.setBus(&_bus_instance);

    // Touch configuration (GT911)
    {
        auto cfg = _touch_instance.config();
        cfg.x_min      = 0;
        cfg.x_max      = WS_SCREEN_WIDTH_NATIVE - 1;
        cfg.y_min      = 0;
        cfg.y_max      = WS_SCREEN_HEIGHT_NATIVE - 1;
        cfg.pin_int    = WS_TOUCH_INT;
        cfg.pin_rst    = WS_TOUCH_RST;
        cfg.bus_shared = true;   // I2C bus shared with CH422G (already initialized)
        cfg.offset_rotation = 0;

        cfg.i2c_port   = 0;     // Same I2C port as CH422G (shared bus, different addresses)
        cfg.i2c_addr   = 0x14;  // GT911 default address
        cfg.pin_sda    = WS_TOUCH_SDA;
        cfg.pin_scl    = WS_TOUCH_SCL;
        cfg.freq       = 400000;

        _touch_instance.config(cfg);
        _panel_instance.setTouch(&_touch_instance);
    }

    setPanel(&_panel_instance);
}

// ============================================
// WaveshareDisplay Implementation
// ============================================

WaveshareDisplay::WaveshareDisplay() : _lastTouchTime(0) {}

WaveshareDisplay::~WaveshareDisplay() {}

bool WaveshareDisplay::begin() {
    // 1. Initialize I2C for CH422G IO expander
    Wire.begin(WS_I2C_SDA, WS_I2C_SCL);

    // 2. Initialize IO expander (sets all IO pins HIGH initially)
    _ioExpander.begin(Wire);

    // 3. Reset LCD panel via IO expander (pin 3)
    _ioExpander.resetLCD();

    // 4. Reset touch panel via IO expander (pin 1)
    _ioExpander.resetTouch();

    // 5. Backlight off during init
    _ioExpander.setBacklight(false);
    delay(100);

    // 6. Initialize LovyanGFX display
    _display.init();
    _display.setRotation(1);      // Portrait mode (480x800)

    // 7. Enable backlight
    _ioExpander.setBacklight(true);

    // 8. Test pattern to verify display works
    _display.fillScreen(0xF800);  // RED
    delay(300);
    _display.fillScreen(0x07E0);  // GREEN
    delay(300);
    _display.fillScreen(0x001F);  // BLUE
    delay(300);

    _display.fillScreen(COLOR_BACKGROUND);
    _display.setTextColor(COLOR_TEXT);

    return true;
}

void WaveshareDisplay::showConnecting() {
    _display.fillScreen(COLOR_BACKGROUND);

    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.setTextDatum(lgfx::middle_center);
    _display.drawString("Connecting...", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);

    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.drawString("Boardsesh Queue", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50);

    _display.setTextDatum(lgfx::top_left);
}

void WaveshareDisplay::showError(const char* message, const char* ipAddress) {
    _display.fillScreen(COLOR_BACKGROUND);

    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_STATUS_ERROR);
    _display.setTextDatum(lgfx::middle_center);
    _display.drawString("Error", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 80);

    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString(message, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

    if (ipAddress && strlen(ipAddress) > 0) {
        _display.setTextColor(COLOR_TEXT_DIM);
        _display.setFont(&fonts::FreeSansBold9pt7b);
        _display.drawString(ipAddress, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 120);
    }

    _display.setTextDatum(lgfx::top_left);
}

void WaveshareDisplay::showConfigPortal(const char* apName, const char* ip) {
    _display.fillScreen(COLOR_BACKGROUND);

    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_ACCENT);
    _display.setTextDatum(lgfx::top_center);
    _display.drawString("WiFi Setup", SCREEN_WIDTH / 2, 40);

    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString("Connect to WiFi:", SCREEN_WIDTH / 2, 140);

    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_STATUS_OK);
    _display.drawString(apName, SCREEN_WIDTH / 2, 200);

    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString("Then open browser:", SCREEN_WIDTH / 2, 340);

    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_ACCENT);
    _display.drawString(ip, SCREEN_WIDTH / 2, 400);

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.drawString("Enter your WiFi credentials to continue", SCREEN_WIDTH / 2, 520);

    _display.setTextDatum(lgfx::top_left);
}

void WaveshareDisplay::showSetupScreen(const char* apName) {
    _display.fillScreen(COLOR_BACKGROUND);

    // Header
    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_ACCENT);
    _display.setTextDatum(lgfx::top_center);
    _display.drawString("WiFi Setup", SCREEN_WIDTH / 2, 20);

    // Step 1: Connect to WiFi AP
    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString("1. Connect to WiFi:", SCREEN_WIDTH / 2, 90);

    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_STATUS_OK);
    _display.drawString(apName, SCREEN_WIDTH / 2, 140);

    // QR Code section - generate QR for http://192.168.4.1
    const char* configUrl = "http://192.168.4.1";
    QRCode qrCode;
    qrcode_initText(&qrCode, _qrCodeData, QR_VERSION, ECC_LOW, configUrl);

    int qrSize = qrCode.size;
    int pixelSize = 250 / qrSize;  // Target ~250px QR code
    if (pixelSize < 1) pixelSize = 1;

    int actualQrSize = pixelSize * qrSize;
    int qrX = (SCREEN_WIDTH - actualQrSize) / 2;
    int qrY = 220;

    // Draw white background for QR code
    _display.fillRect(qrX - 8, qrY - 8, actualQrSize + 16, actualQrSize + 16, COLOR_QR_BG);

    // Draw QR code modules
    for (uint8_t y = 0; y < qrSize; y++) {
        for (uint8_t x = 0; x < qrSize; x++) {
            if (qrcode_getModule(&qrCode, x, y)) {
                _display.fillRect(qrX + x * pixelSize, qrY + y * pixelSize, pixelSize, pixelSize, COLOR_QR_FG);
            }
        }
    }

    // Step 2: Instructions below QR code
    int instructionY = qrY + actualQrSize + 30;

    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString("2. Scan QR code or", SCREEN_WIDTH / 2, instructionY);
    _display.drawString("open in browser:", SCREEN_WIDTH / 2, instructionY + 40);

    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_ACCENT);
    _display.drawString("192.168.4.1", SCREEN_WIDTH / 2, instructionY + 100);

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.drawString("to configure settings", SCREEN_WIDTH / 2, instructionY + 160);

    _display.setTextDatum(lgfx::top_left);
}

void WaveshareDisplay::onStatusChanged() {
    drawStatusBar();
}

void WaveshareDisplay::refresh() {
    drawStatusBar();

#ifdef ENABLE_BOARD_IMAGE
    if (_hasBoardImage && _currentBoardConfig) {
        // Clear margins around the board image instead of full fillScreen
        int offsetX = (SCREEN_WIDTH - _currentBoardConfig->imageWidth) / 2;
        if (offsetX > 0) {
            _display.fillRect(0, WS_BOARD_IMAGE_Y, offsetX, _currentBoardConfig->imageHeight, COLOR_BACKGROUND);
            _display.fillRect(offsetX + _currentBoardConfig->imageWidth, WS_BOARD_IMAGE_Y, offsetX, _currentBoardConfig->imageHeight, COLOR_BACKGROUND);
        }
        drawBoardImageWithHolds();
        drawClimbInfoCompact();
    } else {
        _display.fillScreen(COLOR_BACKGROUND);
        drawStatusBar();
        drawCurrentClimb();
        drawQRCode();
        drawNextClimbIndicator();
        drawHistory();
    }
#else
    _display.fillScreen(COLOR_BACKGROUND);
    drawStatusBar();
    drawCurrentClimb();
    drawQRCode();
    drawNextClimbIndicator();
    drawHistory();
#endif

    drawNavButtons();
}

void WaveshareDisplay::refreshInfoOnly() {
    drawStatusBar();
#ifdef ENABLE_BOARD_IMAGE
    if (_hasBoardImage && _currentBoardConfig) {
        drawClimbInfoCompact();
    } else {
        drawCurrentClimb();
    }
#else
    drawCurrentClimb();
#endif
    drawNavButtons();
}

// ============================================
// Drawing Methods (480x800 layout)
// ============================================

void WaveshareDisplay::drawStatusBar() {
    _display.fillRect(0, WS_STATUS_BAR_Y, SCREEN_WIDTH, WS_STATUS_BAR_HEIGHT, COLOR_BACKGROUND);

    _display.setTextSize(1);
    _display.setFont(&fonts::FreeSansBold9pt7b);

    // WiFi indicator
    _display.setCursor(10, WS_STATUS_BAR_Y + 18);
    _display.setTextColor(_wifiConnected ? COLOR_STATUS_OK : COLOR_STATUS_ERROR);
    _display.print("WiFi");
    _display.fillCircle(80, WS_STATUS_BAR_Y + 25, 8, _wifiConnected ? COLOR_STATUS_OK : COLOR_STATUS_OFF);

    // Backend indicator
    _display.setCursor(110, WS_STATUS_BAR_Y + 18);
    _display.setTextColor(_backendConnected ? COLOR_STATUS_OK : COLOR_STATUS_ERROR);
    _display.print("WS");
    _display.fillCircle(160, WS_STATUS_BAR_Y + 25, 8, _backendConnected ? COLOR_STATUS_OK : COLOR_STATUS_OFF);

    // BLE indicator (if enabled)
    if (_bleEnabled) {
        _display.setCursor(190, WS_STATUS_BAR_Y + 18);
        _display.setTextColor(_bleConnected ? COLOR_STATUS_OK : COLOR_TEXT_DIM);
        _display.print("BLE");
        _display.fillCircle(240, WS_STATUS_BAR_Y + 25, 8, _bleConnected ? COLOR_STATUS_OK : COLOR_STATUS_OFF);
    }

    // Angle display (right side)
    if (_hasClimb && _angle > 0) {
        _display.setTextColor(COLOR_TEXT);
        _display.setCursor(SCREEN_WIDTH - 80, WS_STATUS_BAR_Y + 18);
        _display.printf("%d", _angle);
        _display.drawCircle(SCREEN_WIDTH - 20, WS_STATUS_BAR_Y + 18, 4, COLOR_TEXT);  // Degree symbol
    }
}

void WaveshareDisplay::drawCurrentClimb() {
    int yStart = WS_CURRENT_CLIMB_Y;

    _display.fillRect(0, yStart, SCREEN_WIDTH, WS_CURRENT_CLIMB_HEIGHT, COLOR_BACKGROUND);

    if (!_hasClimb) {
        _display.setFont(&fonts::FreeSansBold18pt7b);
        _display.setTextColor(COLOR_TEXT_DIM);
        _display.setTextDatum(lgfx::middle_center);
        _display.drawString("Waiting for climb...", SCREEN_WIDTH / 2, yStart + WS_CURRENT_CLIMB_HEIGHT / 2);
        _display.setTextDatum(lgfx::top_left);
        return;
    }

    // Draw climb name
    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.setTextDatum(lgfx::top_center);

    String displayName = _climbName;
    if (displayName.length() > 25) {
        displayName = displayName.substring(0, 22) + "...";
    }
    _display.drawString(displayName.c_str(), SCREEN_WIDTH / 2, WS_CLIMB_NAME_Y);

    // Draw grade badge or "Project" for ungraded climbs
    if (_grade.length() > 0) {
        int badgeWidth = 200;
        int badgeHeight = 90;
        int badgeX = (SCREEN_WIDTH - badgeWidth) / 2;
        int badgeY = WS_GRADE_Y;

        uint16_t gradeColor565 = getGradeColor(_grade.c_str());

        _display.fillRoundRect(badgeX, badgeY, badgeWidth, badgeHeight, 16, gradeColor565);

        uint16_t textColor = getGradeTextColor(gradeColor565);

        _display.setFont(&fonts::FreeSansBold24pt7b);
        _display.setTextColor(textColor);
        _display.setTextDatum(lgfx::middle_center);

        // Extract just the V-grade for display if combined format
        String displayGrade = _grade;
        int slashPos = displayGrade.indexOf('/');
        if (slashPos > 0) {
            displayGrade = displayGrade.substring(slashPos + 1);
        }

        _display.drawString(displayGrade.c_str(), badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    } else {
        _display.setFont(&fonts::FreeSansOblique24pt7b);
        _display.setTextColor(COLOR_TEXT_DIM);
        _display.setTextDatum(lgfx::middle_center);
        _display.drawString("Project", SCREEN_WIDTH / 2, WS_GRADE_Y + 45);
    }

    _display.setTextDatum(lgfx::top_left);
}

void WaveshareDisplay::drawQRCode() {
    int yStart = WS_QR_SECTION_Y;

    _display.fillRect(0, yStart, SCREEN_WIDTH, WS_QR_SECTION_HEIGHT, COLOR_BACKGROUND);

    if (!_hasClimb || !_hasQRCode || _sessionId.length() == 0) {
        return;
    }

    QRCode qrCode;
    qrcode_initText(&qrCode, _qrCodeData, QR_VERSION, ECC_LOW, _qrUrl.c_str());

    int qrSize = qrCode.size;
    int pixelSize = WS_QR_CODE_SIZE / qrSize;
    if (pixelSize < 1) pixelSize = 1;

    int actualQrSize = pixelSize * qrSize;
    int qrX = (SCREEN_WIDTH - actualQrSize) / 2;
    int qrY = yStart + (WS_QR_SECTION_HEIGHT - actualQrSize) / 2;

    // Draw white background for QR code
    _display.fillRect(qrX - 8, qrY - 8, actualQrSize + 16, actualQrSize + 16, COLOR_QR_BG);

    // Draw QR code modules
    for (uint8_t y = 0; y < qrSize; y++) {
        for (uint8_t x = 0; x < qrSize; x++) {
            if (qrcode_getModule(&qrCode, x, y)) {
                _display.fillRect(qrX + x * pixelSize, qrY + y * pixelSize, pixelSize, pixelSize, COLOR_QR_FG);
            }
        }
    }
}

void WaveshareDisplay::drawNextClimbIndicator() {
    _display.fillRect(0, WS_NEXT_INDICATOR_Y, SCREEN_WIDTH, WS_NEXT_INDICATOR_HEIGHT, COLOR_BACKGROUND);

    if (!_hasNavigation || !_nextClimb.isValid) {
        return;
    }

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextDatum(lgfx::middle_left);

    // Draw right arrow
    _display.setTextColor(COLOR_ACCENT);
    _display.drawString(">", 10, WS_NEXT_INDICATOR_Y + WS_NEXT_INDICATOR_HEIGHT / 2);

    // Draw "Next:" label
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.drawString("Next:", 30, WS_NEXT_INDICATOR_Y + WS_NEXT_INDICATOR_HEIGHT / 2);

    // Truncate name if needed
    String name = _nextClimb.name;
    if (name.length() > 20) {
        name = name.substring(0, 17) + "...";
    }

    _display.setTextColor(COLOR_TEXT);
    _display.drawString(name.c_str(), 100, WS_NEXT_INDICATOR_Y + WS_NEXT_INDICATOR_HEIGHT / 2);

    // Draw grade with color
    uint16_t gradeColor = COLOR_TEXT;
    if (_nextClimb.gradeColor.length() > 0) {
        gradeColor = hexToRgb565(_nextClimb.gradeColor.c_str());
    } else if (_nextClimb.grade.length() > 0) {
        gradeColor = getGradeColor(_nextClimb.grade.c_str());
    }

    String grade = _nextClimb.grade;
    int slashPos = grade.indexOf('/');
    if (slashPos > 0) {
        grade = grade.substring(slashPos + 1);
    }

    _display.setTextDatum(lgfx::middle_right);
    _display.setTextColor(gradeColor);
    _display.drawString(grade.c_str(), SCREEN_WIDTH - 10, WS_NEXT_INDICATOR_Y + WS_NEXT_INDICATOR_HEIGHT / 2);

    _display.setTextDatum(lgfx::top_left);
}

void WaveshareDisplay::drawHistory() {
    int yStart = WS_HISTORY_Y;

    _display.fillRect(0, yStart, SCREEN_WIDTH, WS_HISTORY_HEIGHT, COLOR_BACKGROUND);

    if (_history.empty()) {
        return;
    }

    // Draw "Previous:" label
    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.setCursor(10, yStart + 5);
    _display.print("Previous:");

    // Draw history items
    int y = yStart + WS_HISTORY_LABEL_HEIGHT;
    int itemsToShow = min((int)_history.size(), WS_HISTORY_MAX_ITEMS);

    for (int i = 0; i < itemsToShow; i++) {
        const ClimbHistoryEntry& entry = _history[_history.size() - 1 - i];

        uint16_t bulletColor = COLOR_TEXT_DIM;
        if (entry.grade.length() > 0) {
            bulletColor = getGradeColor(entry.grade.c_str());
        }
        _display.fillCircle(20, y + 14, 6, bulletColor);

        // Draw climb name (truncated)
        String name = entry.name;
        if (name.length() > 25) {
            name = name.substring(0, 22) + "...";
        }

        _display.setTextColor(COLOR_TEXT);
        _display.setCursor(38, y + 6);
        _display.print(name.c_str());

        // Draw grade
        _display.setTextColor(bulletColor);
        _display.setCursor(SCREEN_WIDTH - 80, y + 6);

        String grade = entry.grade;
        int slashPos = grade.indexOf('/');
        if (slashPos > 0) {
            grade = grade.substring(slashPos + 1);
        }
        _display.print(grade.c_str());

        y += WS_HISTORY_ITEM_HEIGHT;
    }
}

void WaveshareDisplay::drawNavButtons() {
    _display.fillRect(0, WS_NAV_BUTTON_Y, SCREEN_WIDTH, WS_NAV_BUTTON_HEIGHT, COLOR_BACKGROUND);

    if (!_hasNavigation || _queueTotal <= 1) {
        return;
    }

    // Draw button bar background
    _display.fillRect(0, WS_NAV_BUTTON_Y, SCREEN_WIDTH, WS_NAV_BUTTON_HEIGHT, 0x2104);

    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextDatum(lgfx::middle_center);

    // Show position indicator in center
    _display.setTextColor(COLOR_TEXT_DIM);
    char posStr[16];
    snprintf(posStr, sizeof(posStr), "%d / %d", _queueIndex + 1, _queueTotal);
    _display.drawString(posStr, SCREEN_WIDTH / 2, WS_NAV_BUTTON_Y + WS_NAV_BUTTON_HEIGHT / 2);

    // Draw Previous button (left side)
    if (_prevClimb.isValid) {
        _display.fillRoundRect(10, WS_NAV_BUTTON_Y + 5, 140, WS_NAV_BUTTON_HEIGHT - 10, 8, COLOR_ACCENT);
        _display.setTextColor(0x0000);  // Black text on cyan
        _display.drawString("< Prev", 80, WS_NAV_BUTTON_Y + WS_NAV_BUTTON_HEIGHT / 2);
    }

    // Draw Next button (right side)
    if (_nextClimb.isValid) {
        _display.fillRoundRect(SCREEN_WIDTH - 150, WS_NAV_BUTTON_Y + 5, 140, WS_NAV_BUTTON_HEIGHT - 10, 8,
                               COLOR_ACCENT);
        _display.setTextColor(0x0000);  // Black text on cyan
        _display.drawString("Next >", SCREEN_WIDTH - 80, WS_NAV_BUTTON_Y + WS_NAV_BUTTON_HEIGHT / 2);
    }

    _display.setTextDatum(lgfx::top_left);
}

// ============================================
// Board Image Rendering (v2 layout)
// ============================================

#ifdef ENABLE_BOARD_IMAGE
void WaveshareDisplay::setBoardConfig(const BoardConfig* config) {
    _currentBoardConfig = config;
    _hasBoardImage = (config != nullptr);
}

void WaveshareDisplay::setLedCommands(const LedCmd* commands, int count) {
    _ledCommandCount = min(count, MAX_LED_COMMANDS);
    if (commands && _ledCommandCount > 0) {
        memcpy(_ledCommands, commands, _ledCommandCount * sizeof(LedCmd));
    }
}

void WaveshareDisplay::drawBoardImageWithHolds() {
    if (!_currentBoardConfig) return;

    const BoardConfig* cfg = _currentBoardConfig;

    // Center the image horizontally
    int offsetX = (SCREEN_WIDTH - cfg->imageWidth) / 2;
    int offsetY = WS_BOARD_IMAGE_Y;

    // Draw JPEG from PROGMEM to display
    _display.drawJpg(cfg->imageData, cfg->imageSize,
                     offsetX, offsetY,
                     cfg->imageWidth, cfg->imageHeight);

    // Overlay hold circles for each active LED command.
    // holdMap is sorted by ledPosition (at code generation time),
    // so we use binary search for O(n log m) instead of O(n*m).
    for (int i = 0; i < _ledCommandCount; i++) {
        uint16_t target = _ledCommands[i].position;
        int lo = 0, hi = cfg->holdCount - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            uint16_t midPos = cfg->holdMap[mid].ledPosition;
            if (midPos == target) {
                uint16_t color = _display.color565(
                    _ledCommands[i].r, _ledCommands[i].g, _ledCommands[i].b);
                int dx = offsetX + cfg->holdMap[mid].cx;
                int dy = offsetY + cfg->holdMap[mid].cy;
                int dr = cfg->holdMap[mid].radius;
                // Anti-aliased ring using fillArc (full 360° sweep)
                int strokeWidth = 3;
                int innerR = max(1, dr - strokeWidth);
                _display.fillArc(dx, dy, dr, innerR, 0.0f, 360.0f, color);
                break;
            } else if (midPos < target) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
    }
}

void WaveshareDisplay::drawClimbInfoCompact() {
    if (!_hasClimb || !_currentBoardConfig) return;

    int yStart = WS_BOARD_IMAGE_Y + _currentBoardConfig->imageHeight + 10;

    // Clear the climb info area
    _display.fillRect(0, yStart, SCREEN_WIDTH, WS_CLIMB_INFO_V2_HEIGHT, COLOR_BACKGROUND);

    // Draw climb name centered
    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.setTextDatum(lgfx::top_center);

    String displayName = _climbName;
    if (displayName.length() > 28) {
        displayName = displayName.substring(0, 25) + "...";
    }
    _display.drawString(displayName.c_str(), SCREEN_WIDTH / 2, yStart);

    // Draw grade badge
    if (_grade.length() > 0) {
        int badgeWidth = 140;
        int badgeHeight = 40;
        int badgeX = (SCREEN_WIDTH - badgeWidth) / 2;
        int badgeY = yStart + 38;

        uint16_t gradeColor565 = getGradeColor(_grade.c_str());
        _display.fillRoundRect(badgeX, badgeY, badgeWidth, badgeHeight, 10, gradeColor565);

        uint16_t textColor = getGradeTextColor(gradeColor565);
        _display.setFont(&fonts::FreeSansBold12pt7b);
        _display.setTextColor(textColor);
        _display.setTextDatum(lgfx::middle_center);

        // Extract V-grade for display
        String displayGrade = _grade;
        int slashPos = displayGrade.indexOf('/');
        if (slashPos > 0) {
            displayGrade = displayGrade.substring(slashPos + 1);
        }
        _display.drawString(displayGrade.c_str(), badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    }

    _display.setTextDatum(lgfx::top_left);
}
#endif

// ============================================
// Touch Handling
// ============================================

TouchEvent WaveshareDisplay::pollTouch() {
    TouchEvent event;

    unsigned long now = millis();
    if (now - _lastTouchTime < TOUCH_DEBOUNCE_MS) {
        return event;  // Still in debounce period
    }

    lgfx::touch_point_t tp;
    if (_display.getTouch(&tp)) {
        _lastTouchTime = now;

        // Check if touch is in the nav button area
        if (tp.y >= WS_NAV_BUTTON_Y && tp.y <= WS_NAV_BUTTON_Y + WS_NAV_BUTTON_HEIGHT) {
            event.x = tp.x;
            event.y = tp.y;

            // Left side = previous
            if (tp.x < SCREEN_WIDTH / 3) {
                event.action = TouchAction::NAVIGATE_PREVIOUS;
            }
            // Right side = next
            else if (tp.x > SCREEN_WIDTH * 2 / 3) {
                event.action = TouchAction::NAVIGATE_NEXT;
            }
        }
    }

    return event;
}
