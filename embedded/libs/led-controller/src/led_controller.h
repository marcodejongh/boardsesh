#ifndef LED_CONTROLLER_H
#define LED_CONTROLLER_H

#include <Arduino.h>
#include <FastLED.h>

#define MAX_LEDS 500

/**
 * LED command structure matching GraphQL LedCommand type.
 *
 * IMPORTANT: This struct is duplicated here and in graphql_types.h.
 * - This copy enables native tests (which can't include Arduino.h from graphql_types.h)
 * - The graphql_types.h copy is auto-generated from the GraphQL schema
 * - Both use LEDCOMMAND_DEFINED include guard to prevent redefinition
 *
 * If fields change, update BOTH:
 *   1. packages/shared-schema/src/schema.ts (source of truth)
 *   2. Run `npm run controller:codegen` to regenerate graphql_types.h
 *   3. Update this struct to match
 */
#ifndef LEDCOMMAND_DEFINED
#define LEDCOMMAND_DEFINED
struct LedCommand {
    int32_t position;
    uint8_t r;
    uint8_t g;
    uint8_t b;
};
#endif

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
