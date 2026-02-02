/**
 * Library Source Compilation Unit
 *
 * This file includes all library source files that need to be compiled
 * for the native unit tests. PlatformIO's build_src_filter doesn't work
 * reliably for external paths, so we include them directly here.
 */

// Mock implementations
#include "../mocks/Arduino.cpp"
#include "../mocks/FastLED.cpp"

// Library sources
#include "../../libs/aurora-protocol/src/aurora_protocol.cpp"
#include "../../libs/log-buffer/src/log_buffer.cpp"
