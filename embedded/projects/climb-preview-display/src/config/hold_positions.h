#ifndef HOLD_POSITIONS_H
#define HOLD_POSITIONS_H

#include <Arduino.h>

/**
 * Hold position data for rendering on the display.
 *
 * This file contains hold positions for a specific board configuration.
 * The data is derived from the web app's getBoardDetails function.
 *
 * To generate data for a different board configuration:
 * 1. Run the generator script: npx tsx scripts/generate-esp32-hold-data.ts
 * 2. Copy the output to this file
 *
 * Current configuration:
 * - Board: Kilter Homewall
 * - Layout: 8 (Homewall)
 * - Size: 25 (10x12 Full Ride)
 * - Sets: 26 (Mainline), 27 (Auxiliary), 28 (Mainline Kickboard), 29 (Auxiliary Kickboard)
 */

// Board dimensions (matches web app image dimensions)
#define BOARD_IMG_WIDTH   1080
#define BOARD_IMG_HEIGHT  1920

// Board edges (from PRODUCT_SIZES data)
#define EDGE_LEFT   -56
#define EDGE_RIGHT   56
#define EDGE_BOTTOM -12
#define EDGE_TOP    144

// Scaling factors
#define X_SPACING   (float)(BOARD_IMG_WIDTH) / (EDGE_RIGHT - EDGE_LEFT)
#define Y_SPACING   (float)(BOARD_IMG_HEIGHT) / (EDGE_TOP - EDGE_BOTTOM)
#define HOLD_RADIUS (X_SPACING * 4)

// Hold position structure
struct HoldPosition {
    uint16_t placementId;
    int16_t  mirroredId;  // -1 if no mirrored hold
    float    cx;          // Center X in screen coordinates
    float    cy;          // Center Y in screen coordinates (Y-flipped)
    float    r;           // Radius
};

// Maximum number of holds we can store (adjust as needed)
#define MAX_HOLDS 500

/**
 * Convert raw hold data to screen coordinates.
 * @param x Raw X position from database
 * @param y Raw Y position from database
 * @param cx Output center X in image coordinates
 * @param cy Output center Y in image coordinates (Y-flipped)
 */
inline void holdToScreenCoords(int16_t x, int16_t y, float& cx, float& cy) {
    cx = (x - EDGE_LEFT) * X_SPACING;
    cy = BOARD_IMG_HEIGHT - (y - EDGE_BOTTOM) * Y_SPACING;
}

/**
 * Scale hold coordinates to display size.
 * @param cx Input center X in image coordinates
 * @param cy Input center Y in image coordinates
 * @param displayWidth Width of display area
 * @param displayHeight Height of display area
 * @param outX Output X position for display
 * @param outY Output Y position for display
 */
inline void scaleToDisplay(float cx, float cy, uint16_t displayWidth, uint16_t displayHeight,
                           int16_t& outX, int16_t& outY) {
    // Maintain aspect ratio - board is ~4:5 (width:height)
    float imgAspect = (float)BOARD_IMG_WIDTH / BOARD_IMG_HEIGHT;
    float displayAspect = (float)displayWidth / displayHeight;

    float scale;
    int16_t offsetX = 0, offsetY = 0;

    if (imgAspect > displayAspect) {
        // Image is wider - fit to width
        scale = (float)displayWidth / BOARD_IMG_WIDTH;
        offsetY = (displayHeight - BOARD_IMG_HEIGHT * scale) / 2;
    } else {
        // Image is taller - fit to height
        scale = (float)displayHeight / BOARD_IMG_HEIGHT;
        offsetX = (displayWidth - BOARD_IMG_WIDTH * scale) / 2;
    }

    outX = (int16_t)(cx * scale) + offsetX;
    outY = (int16_t)(cy * scale) + offsetY;
}

/**
 * Get scaled hold radius for display.
 */
inline int16_t getDisplayRadius(uint16_t displayWidth, uint16_t displayHeight) {
    float imgAspect = (float)BOARD_IMG_WIDTH / BOARD_IMG_HEIGHT;
    float displayAspect = (float)displayWidth / displayHeight;

    float scale;
    if (imgAspect > displayAspect) {
        scale = (float)displayWidth / BOARD_IMG_WIDTH;
    } else {
        scale = (float)displayHeight / BOARD_IMG_HEIGHT;
    }

    return (int16_t)(HOLD_RADIUS * scale);
}

// ============================================
// Hold Position Data
// ============================================
//
// This data should be generated using the script or manually extracted.
// For now, we use a dynamic lookup approach where the ESP32 stores
// hold positions received from the backend.
//
// The LedUpdate subscription provides positions which are placement IDs
// that map to physical LED positions. The ESP32 needs to maintain a
// mapping from placement IDs to screen coordinates.
//
// Since different board configurations have different holds, we load
// this data dynamically from configuration rather than baking it in.
// ============================================

// Placeholder for compiled-in hold data (optional - for specific board configs)
// Uncomment and populate for a specific board configuration:
/*
static const HoldPosition KILTER_HOMEWALL_10x12_HOLDS[] PROGMEM = {
    // {placementId, mirroredId, cx, cy, r}
    // Data generated from getBoardDetails
};
static const int KILTER_HOMEWALL_10x12_HOLD_COUNT = sizeof(KILTER_HOMEWALL_10x12_HOLDS) / sizeof(HoldPosition);
*/

#endif // HOLD_POSITIONS_H
