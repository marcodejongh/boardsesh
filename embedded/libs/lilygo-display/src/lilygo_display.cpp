#include "lilygo_display.h"
#include <qrcode.h>

// Global display instance
LilyGoDisplay Display;

// ============================================
// LGFX_TDisplayS3 Implementation
// ============================================

LGFX_TDisplayS3::LGFX_TDisplayS3() {
    // Bus configuration for parallel 8-bit
    {
        auto cfg = _bus_instance.config();
        cfg.port = 0;
        cfg.freq_write = 20000000;
        cfg.pin_wr = LCD_WR_PIN;
        cfg.pin_rd = LCD_RD_PIN;
        cfg.pin_rs = LCD_RS_PIN;

        cfg.pin_d0 = LCD_D0_PIN;
        cfg.pin_d1 = LCD_D1_PIN;
        cfg.pin_d2 = LCD_D2_PIN;
        cfg.pin_d3 = LCD_D3_PIN;
        cfg.pin_d4 = LCD_D4_PIN;
        cfg.pin_d5 = LCD_D5_PIN;
        cfg.pin_d6 = LCD_D6_PIN;
        cfg.pin_d7 = LCD_D7_PIN;

        _bus_instance.config(cfg);
        _panel_instance.setBus(&_bus_instance);
    }

    // Panel configuration
    {
        auto cfg = _panel_instance.config();
        cfg.pin_cs = LCD_CS_PIN;
        cfg.pin_rst = LCD_RST_PIN;
        cfg.pin_busy = -1;

        cfg.memory_width = LILYGO_SCREEN_WIDTH;
        cfg.memory_height = LILYGO_SCREEN_HEIGHT;
        cfg.panel_width = LILYGO_SCREEN_WIDTH;
        cfg.panel_height = LILYGO_SCREEN_HEIGHT;
        cfg.offset_x = 35;
        cfg.offset_y = 0;
        cfg.offset_rotation = 0;
        cfg.dummy_read_pixel = 8;
        cfg.dummy_read_bits = 1;
        cfg.readable = true;
        cfg.invert = true;
        cfg.rgb_order = false;
        cfg.dlen_16bit = false;
        cfg.bus_shared = true;

        _panel_instance.config(cfg);
    }

    // Backlight configuration
    {
        auto cfg = _light_instance.config();
        cfg.pin_bl = LCD_BL_PIN;
        cfg.invert = false;
        cfg.freq = 12000;
        cfg.pwm_channel = 0;
        _light_instance.config(cfg);
        _panel_instance.setLight(&_light_instance);
    }

    setPanel(&_panel_instance);
}

// ============================================
// LilyGoDisplay Implementation
// ============================================

LilyGoDisplay::LilyGoDisplay()
    : _wifiConnected(false)
    , _backendConnected(false)
    , _bleEnabled(false)
    , _bleConnected(false)
    , _hasClimb(false)
    , _angle(0)
    , _boardType("kilter")
    , _hasQRCode(false) {
}

LilyGoDisplay::~LilyGoDisplay() {
}

bool LilyGoDisplay::begin() {
    // Enable display power
    pinMode(LCD_POWER_PIN, OUTPUT);
    digitalWrite(LCD_POWER_PIN, HIGH);
    delay(100);

    // Initialize display
    _display.init();
    _display.setRotation(0);  // Portrait mode
    _display.setBrightness(255);  // Max brightness

    // Test pattern to verify display works
    _display.fillScreen(0xF800);  // RED
    delay(500);
    _display.fillScreen(0x07E0);  // GREEN
    delay(500);
    _display.fillScreen(0x001F);  // BLUE
    delay(500);

    _display.fillScreen(COLOR_BACKGROUND);
    _display.setTextColor(COLOR_TEXT);

    // Initialize buttons
    pinMode(BUTTON_1_PIN, INPUT_PULLUP);
    pinMode(BUTTON_2_PIN, INPUT_PULLUP);

    return true;
}

void LilyGoDisplay::setWiFiStatus(bool connected) {
    _wifiConnected = connected;
    drawStatusBar();
}

void LilyGoDisplay::setBackendStatus(bool connected) {
    _backendConnected = connected;
    drawStatusBar();
}

void LilyGoDisplay::setBleStatus(bool enabled, bool connected) {
    _bleEnabled = enabled;
    _bleConnected = connected;
    drawStatusBar();
}

void LilyGoDisplay::showConnecting() {
    _display.fillScreen(COLOR_BACKGROUND);

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.setTextDatum(lgfx::middle_center);
    _display.drawString("Connecting...", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);

    _display.setFont(&fonts::Font2);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.drawString("Boardsesh Queue", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

    _display.setTextDatum(lgfx::top_left);
}

void LilyGoDisplay::showError(const char* message, const char* ipAddress) {
    _display.fillScreen(COLOR_BACKGROUND);

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_STATUS_ERROR);
    _display.setTextDatum(lgfx::middle_center);
    _display.drawString("Error", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 30);

    _display.setFont(&fonts::Font2);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString(message, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 10);

    // Show IP if provided
    if (ipAddress && strlen(ipAddress) > 0) {
        _display.setTextColor(COLOR_TEXT_DIM);
        _display.setFont(&fonts::Font0);
        _display.drawString(ipAddress, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50);
    }

    _display.setTextDatum(lgfx::top_left);
}

void LilyGoDisplay::showConfigPortal(const char* apName, const char* ip) {
    _display.fillScreen(COLOR_BACKGROUND);

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_ACCENT);
    _display.setTextDatum(lgfx::top_center);
    _display.drawString("WiFi Setup", SCREEN_WIDTH / 2, 20);

    _display.setFont(&fonts::Font2);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString("Connect to WiFi:", SCREEN_WIDTH / 2, 60);

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_STATUS_OK);
    _display.drawString(apName, SCREEN_WIDTH / 2, 90);

    _display.setFont(&fonts::Font2);
    _display.setTextColor(COLOR_TEXT);
    _display.drawString("Then open browser:", SCREEN_WIDTH / 2, 140);

    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_ACCENT);
    _display.drawString(ip, SCREEN_WIDTH / 2, 170);

    _display.setFont(&fonts::Font0);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.drawString("Enter your WiFi", SCREEN_WIDTH / 2, 220);
    _display.drawString("credentials to continue", SCREEN_WIDTH / 2, 235);

    _display.setTextDatum(lgfx::top_left);
}

void LilyGoDisplay::showClimb(const char* name, const char* grade, const char* gradeColor,
                               int angle, const char* uuid, const char* boardType) {
    // Store climb data
    _climbName = name ? name : "";
    _grade = grade ? grade : "";
    _gradeColor = gradeColor ? gradeColor : "";
    _angle = angle;
    _climbUuid = uuid ? uuid : "";
    _boardType = boardType ? boardType : "kilter";
    _hasClimb = true;

    // Generate QR code for the climb
    if (_climbUuid.length() > 0) {
        String url;
        if (_boardType == "tension") {
            url = "https://tensionboardapp2.com/climbs/";
        } else {
            url = "https://kilterboardapp.com/climbs/";
        }
        url += _climbUuid;
        generateQRCode(url.c_str());
    }

    // Update display
    refresh();
}

void LilyGoDisplay::showNoClimb() {
    _hasClimb = false;
    _climbName = "";
    _grade = "";
    _gradeColor = "";
    _angle = 0;
    _climbUuid = "";
    _hasQRCode = false;

    refresh();
}

void LilyGoDisplay::addToHistory(const char* name, const char* grade, const char* gradeColor) {
    if (!name || strlen(name) == 0) return;

    ClimbHistoryEntry entry;
    entry.name = name;
    entry.grade = grade ? grade : "";
    entry.gradeColor = gradeColor ? gradeColor : "";

    _history.push_back(entry);

    // Keep only last N items
    while (_history.size() > MAX_HISTORY_ITEMS) {
        _history.erase(_history.begin());
    }
}

void LilyGoDisplay::clearHistory() {
    _history.clear();
}

void LilyGoDisplay::refresh() {
    drawStatusBar();
    drawCurrentClimb();
    drawQRCode();
    drawHistory();
}

void LilyGoDisplay::drawStatusBar() {
    // Clear status bar area
    _display.fillRect(0, STATUS_BAR_Y, SCREEN_WIDTH, STATUS_BAR_HEIGHT, COLOR_BACKGROUND);

    // WiFi indicator
    _display.setTextSize(1);
    _display.setFont(&fonts::Font0);
    _display.setCursor(4, STATUS_BAR_Y + 6);
    _display.setTextColor(_wifiConnected ? COLOR_STATUS_OK : COLOR_STATUS_ERROR);
    _display.print("WiFi");

    // Draw status dot
    _display.fillCircle(35, STATUS_BAR_Y + 10, 4, _wifiConnected ? COLOR_STATUS_OK : COLOR_STATUS_OFF);

    // Backend indicator
    _display.setCursor(55, STATUS_BAR_Y + 6);
    _display.setTextColor(_backendConnected ? COLOR_STATUS_OK : COLOR_STATUS_ERROR);
    _display.print("WS");
    _display.fillCircle(75, STATUS_BAR_Y + 10, 4, _backendConnected ? COLOR_STATUS_OK : COLOR_STATUS_OFF);

    // BLE indicator (if enabled)
    if (_bleEnabled) {
        _display.setCursor(95, STATUS_BAR_Y + 6);
        _display.setTextColor(_bleConnected ? COLOR_STATUS_OK : COLOR_TEXT_DIM);
        _display.print("BLE");
        _display.fillCircle(120, STATUS_BAR_Y + 10, 4, _bleConnected ? COLOR_STATUS_OK : COLOR_STATUS_OFF);
    }

    // Angle display (right side)
    if (_hasClimb && _angle > 0) {
        _display.setTextColor(COLOR_TEXT);
        _display.setCursor(SCREEN_WIDTH - 35, STATUS_BAR_Y + 6);
        _display.printf("%d", _angle);
        _display.drawCircle(SCREEN_WIDTH - 8, STATUS_BAR_Y + 7, 2, COLOR_TEXT);  // Degree symbol
    }
}

void LilyGoDisplay::drawCurrentClimb() {
    int yStart = CURRENT_CLIMB_Y;

    // Clear current climb area
    _display.fillRect(0, yStart, SCREEN_WIDTH, CURRENT_CLIMB_HEIGHT, COLOR_BACKGROUND);

    if (!_hasClimb) {
        // Show "waiting for climb" message
        _display.setFont(&fonts::Font2);
        _display.setTextColor(COLOR_TEXT_DIM);
        _display.setTextDatum(lgfx::middle_center);
        _display.drawString("Waiting for climb...", SCREEN_WIDTH / 2, yStart + CURRENT_CLIMB_HEIGHT / 2);
        _display.setTextDatum(lgfx::top_left);
        return;
    }

    // Draw climb name (may need to truncate)
    _display.setFont(&fonts::FreeSansBold9pt7b);
    _display.setTextColor(COLOR_TEXT);
    _display.setTextDatum(lgfx::top_center);

    String displayName = _climbName;
    if (displayName.length() > 18) {
        displayName = displayName.substring(0, 15) + "...";
    }
    _display.drawString(displayName.c_str(), SCREEN_WIDTH / 2, CLIMB_NAME_Y);

    // Draw grade badge
    if (_grade.length() > 0) {
        // Calculate badge dimensions
        int badgeWidth = 80;
        int badgeHeight = 36;
        int badgeX = (SCREEN_WIDTH - badgeWidth) / 2;
        int badgeY = GRADE_Y;

        // Get grade color
        uint16_t gradeColor565 = COLOR_ACCENT;
        if (_gradeColor.length() > 0) {
            gradeColor565 = hexToRgb565(_gradeColor.c_str());
        }

        // Draw rounded rectangle badge
        _display.fillRoundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8, gradeColor565);

        // Draw grade text (determine text color based on background brightness)
        uint8_t r = ((gradeColor565 >> 11) & 0x1F) << 3;
        uint8_t g = ((gradeColor565 >> 5) & 0x3F) << 2;
        uint8_t b = (gradeColor565 & 0x1F) << 3;
        uint16_t textColor = (r + g + b > 384) ? 0x0000 : 0xFFFF;

        _display.setFont(&fonts::FreeSansBold12pt7b);
        _display.setTextColor(textColor);
        _display.setTextDatum(lgfx::middle_center);

        // Extract just the V-grade for display if combined format
        String displayGrade = _grade;
        int slashPos = displayGrade.indexOf('/');
        if (slashPos > 0) {
            displayGrade = displayGrade.substring(slashPos + 1);
        }

        _display.drawString(displayGrade.c_str(), badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    }

    _display.setTextDatum(lgfx::top_left);
}

void LilyGoDisplay::generateQRCode(const char* url) {
    // Store URL and generate QR code
    _qrUrl = url;
    _hasQRCode = true;
}

void LilyGoDisplay::drawQRCode() {
    int yStart = QR_SECTION_Y;

    // Clear QR code area
    _display.fillRect(0, yStart, SCREEN_WIDTH, QR_SECTION_HEIGHT, COLOR_BACKGROUND);

    if (!_hasClimb || !_hasQRCode || _climbUuid.length() == 0) {
        return;
    }

    // Draw "Open in App" label
    _display.setFont(&fonts::Font0);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.setTextDatum(lgfx::top_center);
    _display.drawString("Open in App", SCREEN_WIDTH / 2, yStart + 2);

    // Generate QR code from stored URL
    QRCode qrCode;
    qrcode_initText(&qrCode, _qrCodeData, QR_VERSION, ECC_LOW, _qrUrl.c_str());

    // Calculate scale factor for QR code
    int qrSize = qrCode.size;
    int pixelSize = QR_CODE_SIZE / qrSize;
    if (pixelSize < 1) pixelSize = 1;

    int actualQrSize = pixelSize * qrSize;
    int qrX = (SCREEN_WIDTH - actualQrSize) / 2;
    int qrY = yStart + 15;

    // Draw white background for QR code
    _display.fillRect(qrX - 4, qrY - 4, actualQrSize + 8, actualQrSize + 8, COLOR_QR_BG);

    // Draw QR code modules
    for (uint8_t y = 0; y < qrSize; y++) {
        for (uint8_t x = 0; x < qrSize; x++) {
            if (qrcode_getModule(&qrCode, x, y)) {
                _display.fillRect(qrX + x * pixelSize, qrY + y * pixelSize,
                                 pixelSize, pixelSize, COLOR_QR_FG);
            }
        }
    }

    _display.setTextDatum(lgfx::top_left);
}

void LilyGoDisplay::drawHistory() {
    int yStart = HISTORY_Y;

    // Clear history area
    _display.fillRect(0, yStart, SCREEN_WIDTH, HISTORY_HEIGHT, COLOR_BACKGROUND);

    if (_history.empty()) {
        return;
    }

    // Draw "Previous:" label
    _display.setFont(&fonts::Font0);
    _display.setTextColor(COLOR_TEXT_DIM);
    _display.setCursor(4, yStart);
    _display.print("Previous:");

    // Draw history items
    int y = yStart + 12;
    int itemsToShow = min((int)_history.size(), HISTORY_MAX_ITEMS);

    for (int i = 0; i < itemsToShow; i++) {
        const ClimbHistoryEntry& entry = _history[_history.size() - 1 - i];

        // Draw bullet with grade color
        uint16_t bulletColor = COLOR_TEXT_DIM;
        if (entry.gradeColor.length() > 0) {
            bulletColor = hexToRgb565(entry.gradeColor.c_str());
        }
        _display.fillCircle(8, y + 6, 3, bulletColor);

        // Draw climb name (truncated)
        String name = entry.name;
        if (name.length() > 12) {
            name = name.substring(0, 10) + "..";
        }

        _display.setTextColor(COLOR_TEXT);
        _display.setCursor(16, y + 2);
        _display.print(name.c_str());

        // Draw grade
        _display.setTextColor(bulletColor);
        _display.setCursor(SCREEN_WIDTH - 35, y + 2);

        String grade = entry.grade;
        int slashPos = grade.indexOf('/');
        if (slashPos > 0) {
            grade = grade.substring(slashPos + 1);
        }
        _display.print(grade.c_str());

        y += HISTORY_ITEM_HEIGHT;
    }
}

uint16_t LilyGoDisplay::hexToRgb565(const char* hex) {
    if (!hex || hex[0] != '#' || strlen(hex) < 7) {
        return COLOR_TEXT;  // Default to white if invalid
    }

    // Parse #RRGGBB
    char r_str[3] = {hex[1], hex[2], 0};
    char g_str[3] = {hex[3], hex[4], 0};
    char b_str[3] = {hex[5], hex[6], 0};

    uint8_t r = strtol(r_str, NULL, 16);
    uint8_t g = strtol(g_str, NULL, 16);
    uint8_t b = strtol(b_str, NULL, 16);

    // Convert to RGB565
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}
