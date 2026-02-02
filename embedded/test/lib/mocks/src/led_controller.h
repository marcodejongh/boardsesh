/**
 * LED Controller Mock Header for Native Unit Testing
 *
 * Provides the LedCommand struct and minimal LedController class
 * for testing code that depends on led_controller.h
 */

#ifndef LED_CONTROLLER_MOCK_H
#define LED_CONTROLLER_MOCK_H

#include <Arduino.h>
#include <FastLED.h>

#define MAX_LEDS 500

/**
 * LED command structure matching GraphQL LedCommand type
 */
struct LedCommand {
    int position;
    uint8_t r;
    uint8_t g;
    uint8_t b;
};

/**
 * Mock LED Controller class
 */
class LedController {
public:
    LedController() : numLeds(0), brightness(255), initialized(false) {}

    void begin(uint8_t pin, uint16_t numLeds) {
        (void)pin;
        this->numLeds = numLeds;
        initialized = true;
    }

    void setLed(int index, CRGB color) {
        if (index >= 0 && index < numLeds) {
            leds[index] = color;
        }
    }

    void setLed(int index, uint8_t r, uint8_t g, uint8_t b) {
        setLed(index, CRGB(r, g, b));
    }

    void setLeds(const LedCommand* commands, int count) {
        for (int i = 0; i < count; i++) {
            setLed(commands[i].position, commands[i].r, commands[i].g, commands[i].b);
        }
    }

    void clear() {
        for (int i = 0; i < numLeds; i++) {
            leds[i] = CRGB(0, 0, 0);
        }
    }

    void show() {
        // Mock - does nothing
    }

    void setBrightness(uint8_t b) { brightness = b; }
    uint8_t getBrightness() { return brightness; }
    uint16_t getNumLeds() { return numLeds; }

    void blink(uint8_t r, uint8_t g, uint8_t b, int count = 3, int delayMs = 100) {
        (void)r; (void)g; (void)b; (void)count; (void)delayMs;
    }

private:
    CRGB leds[MAX_LEDS];
    uint16_t numLeds;
    uint8_t brightness;
    bool initialized;
};

extern LedController LEDs;

#endif // LED_CONTROLLER_MOCK_H
