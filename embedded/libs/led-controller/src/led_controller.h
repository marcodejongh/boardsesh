#ifndef LED_CONTROLLER_H
#define LED_CONTROLLER_H

#include <Arduino.h>
#include <FastLED.h>
#include <graphql_types.h>  // Generated GraphQL types (includes LedCommand)

#define MAX_LEDS 500

// LedCommand is now defined in graphql_types.h (auto-generated from GraphQL schema)

class LedController {
  public:
    LedController();

    void begin(uint8_t pin, uint16_t numLeds);

    void setLed(int index, CRGB color);
    void setLed(int index, uint8_t r, uint8_t g, uint8_t b);
    void setLeds(const LedCommand* commands, int count);

    void clear();
    void show();

    void setBrightness(uint8_t brightness);
    uint8_t getBrightness();

    uint16_t getNumLeds();

    // Run quick blink (for feedback)
    void blink(uint8_t r, uint8_t g, uint8_t b, int count = 3, int delayMs = 100);

  private:
    CRGB leds[MAX_LEDS];
    uint16_t numLeds;
    uint8_t brightness;
    bool initialized;
};

extern LedController LEDs;

#endif
