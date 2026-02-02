#include "climb_display.h"

// Global instance
ClimbDisplay Display;

ClimbDisplay::ClimbDisplay()
    : _boardSprite(nullptr)
    , _infoSprite(nullptr)
    , _bgColor(TFT_BLACK)
    , _hasClimb(false) {
}

bool ClimbDisplay::begin() {
    Serial.println("[Display] Initializing...");

    // Initialize the display
    _display.init();
    _display.setRotation(0);  // Landscape
    _display.setBrightness(200);

    // Create sprites for double buffering
    // Board area sprite (left side)
    _boardSprite = new LGFX_Sprite(&_display);
    if (!_boardSprite->createSprite(BOARD_AREA_WIDTH, BOARD_AREA_HEIGHT)) {
        Serial.println("[Display] Failed to create board sprite");
        return false;
    }
    _boardSprite->setColorDepth(16);

    // Info panel sprite (right side)
    _infoSprite = new LGFX_Sprite(&_display);
    if (!_infoSprite->createSprite(INFO_AREA_WIDTH, BOARD_AREA_HEIGHT)) {
        Serial.println("[Display] Failed to create info sprite");
        return false;
    }
    _infoSprite->setColorDepth(16);

    // Initial clear
    clear();

    Serial.println("[Display] Initialized successfully");
    return true;
}

void ClimbDisplay::setBrightness(uint8_t brightness) {
    _display.setBrightness(brightness);
}

void ClimbDisplay::clear() {
    _display.fillScreen(TFT_BLACK);
    if (_boardSprite) _boardSprite->fillSprite(TFT_BLACK);
    if (_infoSprite) _infoSprite->fillSprite(TFT_BLACK);
}

void ClimbDisplay::update() {
    // Push sprites to display
    if (_boardSprite) {
        _boardSprite->pushSprite(0, 0);
    }
    if (_infoSprite) {
        _infoSprite->pushSprite(INFO_AREA_X, 0);
    }
}

void ClimbDisplay::setBackgroundColor(uint16_t color) {
    _bgColor = color;
}

void ClimbDisplay::showClimb(const ClimbInfo& climb, const std::vector<DisplayHold>& holds) {
    _currentClimb = climb;
    _hasClimb = true;

    Serial.printf("[Display] Showing climb: %s @ %d degrees\n",
                  climb.name.c_str(), climb.angle);

    // Draw board area with holds
    drawBoardArea(holds);

    // Draw info panel
    drawInfoPanel(climb);

    // Push to screen
    update();
}

void ClimbDisplay::showNoClimb() {
    _hasClimb = false;

    // Clear board area
    if (_boardSprite) {
        _boardSprite->fillSprite(_bgColor);

        // Draw placeholder board outline
        int margin = 20;
        _boardSprite->drawRect(margin, margin,
                               BOARD_AREA_WIDTH - 2 * margin,
                               BOARD_AREA_HEIGHT - 2 * margin,
                               TFT_DARKGREY);

        // Center text
        _boardSprite->setTextColor(TFT_DARKGREY);
        _boardSprite->setTextDatum(middle_center);
        _boardSprite->setFont(&fonts::Font4);
        _boardSprite->drawString("No Climb", BOARD_AREA_WIDTH / 2, BOARD_AREA_HEIGHT / 2);
    }

    // Info panel
    if (_infoSprite) {
        _infoSprite->fillSprite(TFT_BLACK);

        // Title
        _infoSprite->setTextColor(TFT_WHITE);
        _infoSprite->setTextDatum(top_center);
        _infoSprite->setFont(&fonts::FreeSansBold18pt7b);
        _infoSprite->drawString("Boardsesh", INFO_AREA_WIDTH / 2, 40);

        // Subtitle
        _infoSprite->setFont(&fonts::Font4);
        _infoSprite->setTextColor(TFT_DARKGREY);
        _infoSprite->drawString("Waiting for climb...", INFO_AREA_WIDTH / 2, 120);
    }

    update();
}

void ClimbDisplay::showConnecting() {
    clear();

    // Center message on full screen
    _display.setTextColor(TFT_WHITE);
    _display.setTextDatum(middle_center);
    _display.setFont(&fonts::FreeSansBold18pt7b);
    _display.drawString("Connecting...", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 30);

    _display.setFont(&fonts::Font4);
    _display.setTextColor(TFT_DARKGREY);
    _display.drawString("Waiting for WiFi and backend", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 30);
}

void ClimbDisplay::showError(const char* message) {
    clear();

    // Error icon area
    _display.fillCircle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60, 40, TFT_RED);
    _display.setTextColor(TFT_WHITE);
    _display.setTextDatum(middle_center);
    _display.setFont(&fonts::FreeSansBold24pt7b);
    _display.drawString("!", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60);

    // Error message
    _display.setFont(&fonts::Font4);
    _display.setTextColor(TFT_RED);
    _display.drawString("Error", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

    _display.setTextColor(TFT_WHITE);
    _display.drawString(message, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60);
}

void ClimbDisplay::showStatus(const char* status) {
    // Show status in bottom bar
    int barHeight = 30;
    _display.fillRect(0, SCREEN_HEIGHT - barHeight, SCREEN_WIDTH, barHeight, TFT_NAVY);

    _display.setTextColor(TFT_WHITE);
    _display.setTextDatum(middle_center);
    _display.setFont(&fonts::Font2);
    _display.drawString(status, SCREEN_WIDTH / 2, SCREEN_HEIGHT - barHeight / 2);
}

bool ClimbDisplay::getTouchPoint(int16_t& x, int16_t& y) {
    lgfx::touch_point_t tp;
    if (_display.getTouch(&tp)) {
        x = tp.x;
        y = tp.y;
        return true;
    }
    return false;
}

void ClimbDisplay::drawBoardArea(const std::vector<DisplayHold>& holds) {
    if (!_boardSprite) return;

    // Fill with background
    _boardSprite->fillSprite(_bgColor);

    // Draw board outline
    int margin = 10;
    _boardSprite->drawRect(margin, margin,
                           BOARD_AREA_WIDTH - 2 * margin,
                           BOARD_AREA_HEIGHT - 2 * margin,
                           TFT_DARKGREY);

    // Draw grid lines (faint reference)
    uint16_t gridColor = _display.color565(30, 30, 30);
    int gridSpacing = 40;
    for (int x = margin + gridSpacing; x < BOARD_AREA_WIDTH - margin; x += gridSpacing) {
        _boardSprite->drawFastVLine(x, margin, BOARD_AREA_HEIGHT - 2 * margin, gridColor);
    }
    for (int y = margin + gridSpacing; y < BOARD_AREA_HEIGHT - margin; y += gridSpacing) {
        _boardSprite->drawFastHLine(margin, y, BOARD_AREA_WIDTH - 2 * margin, gridColor);
    }

    // Draw holds
    for (const auto& hold : holds) {
        drawHold(hold.x, hold.y, hold.radius, hold.color, true);
    }
}

void ClimbDisplay::drawInfoPanel(const ClimbInfo& climb) {
    if (!_infoSprite) return;

    // Dark background for info panel
    _infoSprite->fillSprite(_display.color565(20, 20, 30));

    int yOffset = 30;
    int lineHeight = 50;

    // Climb name (large, prominent)
    _infoSprite->setTextColor(TFT_WHITE);
    _infoSprite->setTextDatum(top_center);
    _infoSprite->setFont(&fonts::FreeSansBold18pt7b);

    // Truncate name if too long
    String displayName = climb.name;
    if (displayName.length() > 18) {
        displayName = displayName.substring(0, 17) + "...";
    }
    _infoSprite->drawString(displayName.c_str(), INFO_AREA_WIDTH / 2, yOffset);

    yOffset += 60;

    // Angle (very prominent)
    _infoSprite->setFont(&fonts::FreeSansBold24pt7b);
    _infoSprite->setTextColor(_display.color565(100, 200, 255));
    char angleStr[16];
    snprintf(angleStr, sizeof(angleStr), "%d", climb.angle);
    _infoSprite->drawString(angleStr, INFO_AREA_WIDTH / 2, yOffset);

    // Degree symbol
    _infoSprite->setFont(&fonts::Font4);
    _infoSprite->drawString("degrees", INFO_AREA_WIDTH / 2, yOffset + 50);

    yOffset += 100;

    // Difficulty (if available)
    if (climb.difficulty.length() > 0) {
        _infoSprite->setFont(&fonts::FreeSansBold12pt7b);
        _infoSprite->setTextColor(_display.color565(255, 200, 100));
        _infoSprite->drawString(climb.difficulty.c_str(), INFO_AREA_WIDTH / 2, yOffset);
        yOffset += lineHeight;
    }

    // Setter (if available)
    if (climb.setter.length() > 0) {
        _infoSprite->setFont(&fonts::Font4);
        _infoSprite->setTextColor(TFT_LIGHTGREY);
        String setterStr = "by " + climb.setter;
        if (setterStr.length() > 25) {
            setterStr = setterStr.substring(0, 24) + "...";
        }
        _infoSprite->drawString(setterStr.c_str(), INFO_AREA_WIDTH / 2, yOffset);
        yOffset += lineHeight;
    }

    // Mirror indicator
    if (climb.mirrored) {
        _infoSprite->setFont(&fonts::Font4);
        _infoSprite->setTextColor(_display.color565(255, 100, 100));
        _infoSprite->drawString("[MIRRORED]", INFO_AREA_WIDTH / 2, BOARD_AREA_HEIGHT - 80);
    }

    // Status bar at bottom
    _infoSprite->fillRect(0, BOARD_AREA_HEIGHT - 40, INFO_AREA_WIDTH, 40,
                          _display.color565(30, 30, 50));
    _infoSprite->setFont(&fonts::Font2);
    _infoSprite->setTextColor(TFT_DARKGREY);
    _infoSprite->setTextDatum(middle_center);
    _infoSprite->drawString("Connected to Boardsesh", INFO_AREA_WIDTH / 2, BOARD_AREA_HEIGHT - 20);
}

void ClimbDisplay::drawHold(int16_t x, int16_t y, int16_t radius, uint16_t color, bool filled) {
    if (!_boardSprite) return;

    if (filled) {
        // Filled circle with slight gradient effect
        _boardSprite->fillCircle(x, y, radius, color);

        // Add a darker inner circle for depth
        uint8_t r = ((color >> 11) & 0x1F) << 3;
        uint8_t g = ((color >> 5) & 0x3F) << 2;
        uint8_t b = (color & 0x1F) << 3;
        uint16_t innerColor = _display.color565(r * 0.7, g * 0.7, b * 0.7);
        _boardSprite->drawCircle(x, y, radius - 2, innerColor);
    } else {
        // Just outline
        _boardSprite->drawCircle(x, y, radius, color);
        _boardSprite->drawCircle(x, y, radius - 1, color);
    }
}

void ClimbDisplay::drawCenteredText(const char* text, int y, const lgfx::IFont* font, uint16_t color) {
    _display.setFont(font);
    _display.setTextColor(color);
    _display.setTextDatum(top_center);
    _display.drawString(text, SCREEN_WIDTH / 2, y);
}
