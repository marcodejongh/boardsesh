#include "led_controller.h"

// For ESP32-S3 T-Display, use a different RMT channel to avoid display conflicts
#if defined(CONFIG_IDF_TARGET_ESP32S3) && defined(ENABLE_DISPLAY)
// Use RMT channel 1 (channel 0 might conflict with display DMA)
#define FASTLED_RMT_MAX_CHANNELS 2
#endif

LedController LEDs;

LedController::LedController() : numLeds(0), brightness(128), initialized(false) {
    memset(leds, 0, sizeof(leds));
}

void LedController::begin(uint8_t pin, uint16_t count) {
    numLeds = min(count, (uint16_t)MAX_LEDS);

    // FastLED.addLeds requires compile-time pin constant
    // Use conditional compilation for different board configurations
#ifdef TDISPLAY_LED_PIN
    // T-Display-S3: Use GPIO 43 (avoids LCD_RST on GPIO 5)
    FastLED.addLeds<WS2812B, TDISPLAY_LED_PIN, GRB>(leds, numLeds);
#else
    // Default: Use GPIO 5
    FastLED.addLeds<WS2812B, 5, GRB>(leds, numLeds);
#endif

    FastLED.setBrightness(brightness);

    clear();
    show();

    initialized = true;
}

void LedController::setLed(int index, CRGB color) {
    if (index >= 0 && index < numLeds) {
        leds[index] = color;
    }
}

void LedController::setLed(int index, uint8_t r, uint8_t g, uint8_t b) {
    setLed(index, CRGB(r, g, b));
}

void LedController::setLeds(const LedCommand* commands, int count) {
    for (int i = 0; i < count; i++) {
        if (commands[i].position >= 0 && commands[i].position < numLeds) {
            leds[commands[i].position] = CRGB(commands[i].r, commands[i].g, commands[i].b);
        }
    }
}

void LedController::clear() {
    FastLED.clear();
}

void LedController::show() {
    FastLED.show();
}

void LedController::setBrightness(uint8_t b) {
    brightness = b;
    FastLED.setBrightness(brightness);
}

uint8_t LedController::getBrightness() {
    return brightness;
}

uint16_t LedController::getNumLeds() {
    return numLeds;
}

void LedController::blink(uint8_t r, uint8_t g, uint8_t b, int count, int delayMs) {
    for (int i = 0; i < count; i++) {
        for (int j = 0; j < numLeds; j++) {
            leds[j] = CRGB(r, g, b);
        }
        show();
        delay(delayMs);
        clear();
        show();
        delay(delayMs);
    }
}
