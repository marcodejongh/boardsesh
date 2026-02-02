# ESP32 OTA Update Architecture

This document describes the Over-The-Air (OTA) update system for ESP32 board controllers.

## Overview

The OTA system enables remote firmware updates for deployed ESP32 controllers through the existing WebSocket/GraphQL infrastructure. Controllers check for updates periodically and download firmware binaries over HTTPS.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Admin     │     │     Backend     │     │  Blob Storage   │
│   Dashboard     │────▶│  (GraphQL API)  │────▶│  (S3/Vercel)    │
└─────────────────┘     └────────┬────────┘     └────────▲────────┘
                                 │                       │
                        GraphQL-WS                  HTTPS GET
                        (notifications)            (binary download)
                                 │                       │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │  ESP32 Device   │──────────────┘
                        │  (Controller)   │
                        └─────────────────┘
```

## Design Principles

1. **Leverage existing infrastructure** - Use current WebSocket connection for notifications
2. **Separate binary delivery** - HTTPS download from blob storage (not WebSocket)
3. **Fail-safe updates** - Dual OTA partitions with automatic rollback
4. **Minimal disruption** - Updates happen during idle periods
5. **Audit trail** - Track all update attempts and outcomes

## Database Schema

### New Tables

```sql
-- Firmware releases table
CREATE TABLE esp32_firmware_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,           -- Semantic version: "1.2.3"
  version_code INTEGER NOT NULL,          -- Numeric for comparison: 10203
  board_type VARCHAR(20) NOT NULL,        -- "esp32", "esp32s3", "esp32c3"
  channel VARCHAR(20) DEFAULT 'stable',   -- "stable", "beta", "dev"
  binary_url TEXT NOT NULL,               -- HTTPS URL to firmware binary
  binary_size INTEGER NOT NULL,           -- Size in bytes
  checksum_sha256 VARCHAR(64) NOT NULL,   -- SHA256 hash of binary
  release_notes TEXT,
  min_version_code INTEGER DEFAULT 0,     -- Minimum version that can upgrade
  is_mandatory BOOLEAN DEFAULT FALSE,     -- Force update
  is_active BOOLEAN DEFAULT TRUE,         -- Available for download
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,

  UNIQUE(version, board_type, channel)
);

-- Controller firmware status tracking
CREATE TABLE esp32_controller_firmware (
  controller_id UUID PRIMARY KEY REFERENCES esp32_controllers(id) ON DELETE CASCADE,
  current_version VARCHAR(20),
  current_version_code INTEGER,
  board_type VARCHAR(20),                 -- Detected board type
  channel VARCHAR(20) DEFAULT 'stable',   -- Update channel preference
  last_check_at TIMESTAMP,
  last_update_at TIMESTAMP,
  update_state VARCHAR(20),               -- 'idle', 'downloading', 'installing', 'failed'
  update_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Firmware update history/audit log
CREATE TABLE esp32_firmware_update_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id UUID REFERENCES esp32_controllers(id) ON DELETE SET NULL,
  from_version VARCHAR(20),
  to_version VARCHAR(20),
  release_id UUID REFERENCES esp32_firmware_releases(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL,            -- 'started', 'downloading', 'installing', 'success', 'failed', 'rolled_back'
  progress INTEGER,                       -- 0-100 percentage
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB                          -- Additional debug info
);

-- Indexes
CREATE INDEX idx_firmware_releases_lookup ON esp32_firmware_releases(board_type, channel, is_active);
CREATE INDEX idx_firmware_log_controller ON esp32_firmware_update_log(controller_id, started_at DESC);
```

## GraphQL Schema Extensions

### Types

```graphql
type FirmwareRelease {
  id: ID!
  version: String!
  versionCode: Int!
  boardType: String!
  channel: String!
  binaryUrl: String!
  binarySize: Int!
  checksumSha256: String!
  releaseNotes: String
  isMandatory: Boolean!
  publishedAt: String
}

type FirmwareUpdateInfo {
  available: Boolean!
  release: FirmwareRelease
  currentVersion: String
  message: String
}

type FirmwareUpdateStatus {
  controllerId: ID!
  status: FirmwareUpdateState!
  progress: Int
  currentVersion: String
  targetVersion: String
  error: String
  updatedAt: String!
}

enum FirmwareUpdateState {
  IDLE
  CHECKING
  AVAILABLE
  DOWNLOADING
  INSTALLING
  SUCCESS
  FAILED
  ROLLED_BACK
}

type FirmwareUpdateLogEntry {
  id: ID!
  fromVersion: String
  toVersion: String
  status: String!
  progress: Int
  errorMessage: String
  startedAt: String!
  completedAt: String
}

input ReportFirmwareStatusInput {
  status: FirmwareUpdateState!
  progress: Int
  currentVersion: String
  targetVersion: String
  error: String
  metadata: JSON
}
```

### Queries

```graphql
extend type Query {
  # For admin dashboard - list all firmware releases
  firmwareReleases(boardType: String, channel: String): [FirmwareRelease!]!

  # For admin - get update status of all controllers
  controllerFirmwareStatuses: [FirmwareUpdateStatus!]!

  # For admin - get update history for a controller
  firmwareUpdateLog(controllerId: ID!, limit: Int): [FirmwareUpdateLogEntry!]!
}
```

### Mutations

```graphql
extend type Mutation {
  # Called by ESP32 to check for updates
  checkFirmwareUpdate(
    currentVersion: String!
    currentVersionCode: Int!
    boardType: String!
    channel: String
  ): FirmwareUpdateInfo!

  # Called by ESP32 to report update progress
  reportFirmwareStatus(input: ReportFirmwareStatusInput!): Boolean!

  # Admin: Upload/register a new firmware release
  createFirmwareRelease(
    version: String!
    boardType: String!
    channel: String!
    binaryUrl: String!
    binarySize: Int!
    checksumSha256: String!
    releaseNotes: String
    minVersionCode: Int
    isMandatory: Boolean
  ): FirmwareRelease!

  # Admin: Trigger update for specific controller(s)
  triggerFirmwareUpdate(controllerIds: [ID!]!): Boolean!

  # Admin: Set controller update channel
  setControllerUpdateChannel(controllerId: ID!, channel: String!): Boolean!
}
```

### Subscriptions

```graphql
extend type Subscription {
  # ESP32 subscribes to receive update notifications
  firmwareUpdateAvailable: FirmwareUpdateInfo!

  # Admin dashboard subscribes to track update progress
  firmwareUpdateProgress(controllerId: ID): FirmwareUpdateStatus!
}
```

## Update Flow

### 1. Periodic Check (ESP32-initiated)

```
ESP32                          Backend                         Storage
  │                               │                               │
  │──checkFirmwareUpdate()───────▶│                               │
  │   (currentVersion, boardType) │                               │
  │                               │──query latest release────────▶│
  │                               │◀─────────────────────────────│
  │◀──FirmwareUpdateInfo─────────│                               │
  │   (available, release info)   │                               │
  │                               │                               │
  [If update available]           │                               │
  │                               │                               │
  │──reportFirmwareStatus────────▶│                               │
  │   (DOWNLOADING)               │                               │
  │                               │                               │
  │──────────────────────────────────────HTTPS GET binary────────▶│
  │◀─────────────────────────────────────firmware.bin────────────│
  │                               │                               │
  │──reportFirmwareStatus────────▶│                               │
  │   (INSTALLING, progress)      │                               │
  │                               │                               │
  [Flash & Reboot]                │                               │
  │                               │                               │
  │──reportFirmwareStatus────────▶│                               │
  │   (SUCCESS, newVersion)       │                               │
```

### 2. Push Update (Admin-triggered)

```
Admin                          Backend                         ESP32
  │                               │                               │
  │──triggerFirmwareUpdate()─────▶│                               │
  │   (controllerIds)             │                               │
  │                               │──firmwareUpdateAvailable─────▶│
  │                               │   (via subscription)          │
  │                               │                               │
  │                               │◀─reportFirmwareStatus────────│
  │◀──firmwareUpdateProgress─────│   (DOWNLOADING...)            │
  │   (via subscription)          │                               │
```

## ESP32 Implementation

### OTA Manager Class

```cpp
// src/ota/ota_manager.h
#pragma once

#include <Arduino.h>
#include <HTTPClient.h>
#include <Update.h>
#include <functional>

enum class OTAState {
    IDLE,
    CHECKING,
    AVAILABLE,
    DOWNLOADING,
    INSTALLING,
    SUCCESS,
    FAILED,
    ROLLED_BACK
};

struct FirmwareInfo {
    String version;
    int versionCode;
    String url;
    size_t size;
    String checksumSha256;
    bool mandatory;
};

class OTAManager {
public:
    using ProgressCallback = std::function<void(OTAState state, int progress, const String& error)>;

    OTAManager();

    void begin();
    void loop();

    // Configuration
    void setCheckInterval(unsigned long intervalMs);
    void setProgressCallback(ProgressCallback callback);

    // Manual triggers
    void checkForUpdate();
    void startUpdate(const FirmwareInfo& info);
    void cancelUpdate();

    // State
    OTAState getState() const { return _state; }
    int getProgress() const { return _progress; }
    const String& getCurrentVersion() const { return _currentVersion; }

    // Called when update notification received via WebSocket
    void onUpdateAvailable(const FirmwareInfo& info);

private:
    OTAState _state = OTAState::IDLE;
    int _progress = 0;
    String _currentVersion;
    int _currentVersionCode;
    String _boardType;

    unsigned long _checkInterval = 3600000; // 1 hour default
    unsigned long _lastCheck = 0;

    FirmwareInfo _pendingUpdate;
    ProgressCallback _progressCallback;

    void setState(OTAState state, int progress = 0, const String& error = "");
    bool downloadAndInstall(const FirmwareInfo& info);
    bool verifyChecksum(const uint8_t* data, size_t len, const String& expected);
    void reportStatus(OTAState state, int progress, const String& error = "");
    String getBoardType();
};

extern OTAManager otaManager;
```

### OTA Manager Implementation

```cpp
// src/ota/ota_manager.cpp
#include "ota_manager.h"
#include "../config/config_manager.h"
#include "../websocket/ws_client.h"
#include <esp_ota_ops.h>
#include <esp_partition.h>
#include <mbedtls/sha256.h>

// Current firmware version - update with each release
#define FIRMWARE_VERSION "1.0.0"
#define FIRMWARE_VERSION_CODE 10000

OTAManager otaManager;

OTAManager::OTAManager()
    : _currentVersion(FIRMWARE_VERSION)
    , _currentVersionCode(FIRMWARE_VERSION_CODE) {
    _boardType = getBoardType();
}

void OTAManager::begin() {
    // Check if we just completed an update
    const esp_partition_t* running = esp_ota_get_running_partition();
    esp_ota_img_states_t ota_state;

    if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK) {
        if (ota_state == ESP_OTA_IMG_PENDING_VERIFY) {
            // We just booted after an update - mark as valid
            esp_ota_mark_app_valid_cancel_rollback();
            Serial.println("[OTA] Update verified successfully");
            setState(OTAState::SUCCESS);
            reportStatus(OTAState::SUCCESS, 100);
        }
    }
}

void OTAManager::loop() {
    unsigned long now = millis();

    // Periodic update check
    if (_state == OTAState::IDLE && (now - _lastCheck >= _checkInterval)) {
        checkForUpdate();
        _lastCheck = now;
    }
}

void OTAManager::checkForUpdate() {
    if (_state != OTAState::IDLE && _state != OTAState::AVAILABLE) {
        return;
    }

    setState(OTAState::CHECKING);

    // Send GraphQL mutation via WebSocket
    // The response will come back via onUpdateAvailable()
    wsClient.sendCheckFirmwareUpdate(_currentVersion, _currentVersionCode, _boardType);
}

void OTAManager::onUpdateAvailable(const FirmwareInfo& info) {
    if (info.versionCode > _currentVersionCode) {
        _pendingUpdate = info;
        setState(OTAState::AVAILABLE);

        if (info.mandatory) {
            // Start immediately for mandatory updates
            startUpdate(info);
        }
    } else {
        setState(OTAState::IDLE);
    }
}

void OTAManager::startUpdate(const FirmwareInfo& info) {
    if (_state == OTAState::DOWNLOADING || _state == OTAState::INSTALLING) {
        return; // Already updating
    }

    _pendingUpdate = info;

    // Run update in separate task to not block main loop
    xTaskCreate(
        [](void* param) {
            OTAManager* self = static_cast<OTAManager*>(param);
            bool success = self->downloadAndInstall(self->_pendingUpdate);
            if (success) {
                Serial.println("[OTA] Update complete, rebooting...");
                delay(1000);
                ESP.restart();
            }
            vTaskDelete(NULL);
        },
        "ota_update",
        8192,
        this,
        1,
        NULL
    );
}

bool OTAManager::downloadAndInstall(const FirmwareInfo& info) {
    setState(OTAState::DOWNLOADING, 0);
    reportStatus(OTAState::DOWNLOADING, 0);

    HTTPClient http;
    http.begin(info.url);
    http.setTimeout(30000);

    int httpCode = http.GET();
    if (httpCode != HTTP_CODE_OK) {
        String error = "HTTP error: " + String(httpCode);
        setState(OTAState::FAILED, 0, error);
        reportStatus(OTAState::FAILED, 0, error);
        return false;
    }

    int contentLength = http.getSize();
    if (contentLength != info.size) {
        String error = "Size mismatch: expected " + String(info.size) + ", got " + String(contentLength);
        setState(OTAState::FAILED, 0, error);
        reportStatus(OTAState::FAILED, 0, error);
        return false;
    }

    // Begin OTA update
    if (!Update.begin(contentLength)) {
        String error = "Not enough space for OTA";
        setState(OTAState::FAILED, 0, error);
        reportStatus(OTAState::FAILED, 0, error);
        return false;
    }

    setState(OTAState::INSTALLING, 0);

    WiFiClient* stream = http.getStreamPtr();

    // SHA256 context for verification
    mbedtls_sha256_context sha256_ctx;
    mbedtls_sha256_init(&sha256_ctx);
    mbedtls_sha256_starts(&sha256_ctx, 0);

    uint8_t buffer[1024];
    size_t written = 0;
    int lastProgress = 0;

    while (http.connected() && written < contentLength) {
        size_t available = stream->available();
        if (available) {
            size_t readBytes = stream->readBytes(buffer, min(available, sizeof(buffer)));

            // Update hash
            mbedtls_sha256_update(&sha256_ctx, buffer, readBytes);

            // Write to flash
            size_t writtenNow = Update.write(buffer, readBytes);
            if (writtenNow != readBytes) {
                String error = "Write failed";
                setState(OTAState::FAILED, 0, error);
                reportStatus(OTAState::FAILED, 0, error);
                Update.abort();
                return false;
            }

            written += writtenNow;

            // Report progress every 5%
            int progress = (written * 100) / contentLength;
            if (progress >= lastProgress + 5) {
                lastProgress = progress;
                setState(OTAState::INSTALLING, progress);
                reportStatus(OTAState::INSTALLING, progress);
            }
        }
        delay(1);
    }

    // Verify checksum
    uint8_t hash[32];
    mbedtls_sha256_finish(&sha256_ctx, hash);
    mbedtls_sha256_free(&sha256_ctx);

    String calculatedHash;
    for (int i = 0; i < 32; i++) {
        char hex[3];
        snprintf(hex, sizeof(hex), "%02x", hash[i]);
        calculatedHash += hex;
    }

    if (calculatedHash != info.checksumSha256) {
        String error = "Checksum mismatch";
        setState(OTAState::FAILED, 0, error);
        reportStatus(OTAState::FAILED, 0, error);
        Update.abort();
        return false;
    }

    // Finalize update
    if (!Update.end(true)) {
        String error = "Update finalization failed: " + String(Update.errorString());
        setState(OTAState::FAILED, 0, error);
        reportStatus(OTAState::FAILED, 0, error);
        return false;
    }

    setState(OTAState::INSTALLING, 100);
    reportStatus(OTAState::INSTALLING, 100);

    return true;
}

void OTAManager::reportStatus(OTAState state, int progress, const String& error) {
    // Send status update to backend via WebSocket
    wsClient.sendFirmwareStatus(state, progress, _currentVersion,
                                _pendingUpdate.version, error);
}

String OTAManager::getBoardType() {
    #if CONFIG_IDF_TARGET_ESP32
        return "esp32";
    #elif CONFIG_IDF_TARGET_ESP32S3
        return "esp32s3";
    #elif CONFIG_IDF_TARGET_ESP32C3
        return "esp32c3";
    #else
        return "unknown";
    #endif
}

void OTAManager::setState(OTAState state, int progress, const String& error) {
    _state = state;
    _progress = progress;

    if (_progressCallback) {
        _progressCallback(state, progress, error);
    }
}
```

### WebSocket Client Extensions

Add to existing `ws_client.h/cpp`:

```cpp
// Add to ws_client.h
void sendCheckFirmwareUpdate(const String& version, int versionCode, const String& boardType);
void sendFirmwareStatus(OTAState state, int progress, const String& currentVersion,
                        const String& targetVersion, const String& error);

// Add to ws_client.cpp
void WSClient::sendCheckFirmwareUpdate(const String& version, int versionCode, const String& boardType) {
    JsonDocument doc;
    doc["id"] = generateId();
    doc["type"] = "subscribe";

    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["query"] = R"(
        mutation CheckFirmwareUpdate($version: String!, $versionCode: Int!, $boardType: String!) {
            checkFirmwareUpdate(currentVersion: $version, currentVersionCode: $versionCode, boardType: $boardType) {
                available
                release {
                    version
                    versionCode
                    binaryUrl
                    binarySize
                    checksumSha256
                    isMandatory
                }
            }
        }
    )";

    JsonObject variables = payload["variables"].to<JsonObject>();
    variables["version"] = version;
    variables["versionCode"] = versionCode;
    variables["boardType"] = boardType;

    String message;
    serializeJson(doc, message);
    _webSocket.sendTXT(message);
}

void WSClient::sendFirmwareStatus(OTAState state, int progress, const String& currentVersion,
                                   const String& targetVersion, const String& error) {
    JsonDocument doc;
    doc["id"] = generateId();
    doc["type"] = "subscribe";

    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["query"] = R"(
        mutation ReportFirmwareStatus($input: ReportFirmwareStatusInput!) {
            reportFirmwareStatus(input: $input)
        }
    )";

    JsonObject variables = payload["variables"].to<JsonObject>();
    JsonObject input = variables["input"].to<JsonObject>();

    const char* stateStr;
    switch (state) {
        case OTAState::IDLE: stateStr = "IDLE"; break;
        case OTAState::CHECKING: stateStr = "CHECKING"; break;
        case OTAState::AVAILABLE: stateStr = "AVAILABLE"; break;
        case OTAState::DOWNLOADING: stateStr = "DOWNLOADING"; break;
        case OTAState::INSTALLING: stateStr = "INSTALLING"; break;
        case OTAState::SUCCESS: stateStr = "SUCCESS"; break;
        case OTAState::FAILED: stateStr = "FAILED"; break;
        case OTAState::ROLLED_BACK: stateStr = "ROLLED_BACK"; break;
    }

    input["status"] = stateStr;
    input["progress"] = progress;
    input["currentVersion"] = currentVersion;
    input["targetVersion"] = targetVersion;
    if (error.length() > 0) {
        input["error"] = error;
    }

    String message;
    serializeJson(doc, message);
    _webSocket.sendTXT(message);
}
```

## Firmware Build & Release Process

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/firmware-release.yml
name: Firmware Release

on:
  push:
    tags:
      - 'firmware-v*'

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        board: [esp32, esp32s3]

    steps:
      - uses: actions/checkout@v4

      - name: Setup PlatformIO
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - run: pip install platformio

      - name: Build firmware
        working-directory: packages/board-controller/esp32
        run: |
          pio run -e ${{ matrix.board }}

      - name: Generate checksums
        run: |
          sha256sum .pio/build/${{ matrix.board }}/firmware.bin > firmware-${{ matrix.board }}.sha256

      - name: Upload to release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            .pio/build/${{ matrix.board }}/firmware.bin
            firmware-${{ matrix.board }}.sha256

      - name: Register firmware in database
        env:
          ADMIN_API_KEY: ${{ secrets.ADMIN_API_KEY }}
        run: |
          VERSION=${GITHUB_REF#refs/tags/firmware-v}
          CHECKSUM=$(cat firmware-${{ matrix.board }}.sha256 | cut -d' ' -f1)
          SIZE=$(stat -c%s .pio/build/${{ matrix.board }}/firmware.bin)

          curl -X POST "${{ vars.BACKEND_URL }}/api/admin/firmware" \
            -H "Authorization: Bearer $ADMIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
              \"version\": \"$VERSION\",
              \"boardType\": \"${{ matrix.board }}\",
              \"channel\": \"stable\",
              \"binaryUrl\": \"https://github.com/${{ github.repository }}/releases/download/firmware-v$VERSION/firmware.bin\",
              \"binarySize\": $SIZE,
              \"checksumSha256\": \"$CHECKSUM\"
            }"
```

### Version Code Convention

```
Version: 1.2.3
Version Code: 10203

Format: MAJOR * 10000 + MINOR * 100 + PATCH

Examples:
- 1.0.0 → 10000
- 1.2.3 → 10203
- 2.0.0 → 20000
- 2.15.7 → 21507
```

## Security Considerations

### 1. Binary Integrity
- SHA256 checksum verification before flashing
- Checksum stored in database and verified by ESP32

### 2. Transport Security
- HTTPS-only for binary downloads
- TLS certificate validation on ESP32

### 3. Authentication
- ESP32 uses API key for all GraphQL operations
- Admin endpoints require user JWT with admin role

### 4. Rollback Protection
- ESP32 uses dual OTA partitions
- New firmware must call `esp_ota_mark_app_valid_cancel_rollback()` within 60 seconds
- Automatic rollback if validation fails

### 5. Rate Limiting
- Firmware check: max once per 5 minutes per controller
- Download: max 3 concurrent downloads per controller

## Admin Dashboard Features

### Firmware Management
- Upload new firmware releases
- Set release channel (stable/beta/dev)
- View download statistics
- Rollback to previous versions

### Controller Monitoring
- View all controllers with firmware versions
- See update status in real-time
- Trigger updates for individual or all controllers
- View update history and error logs

### Alerts
- Failed update notifications
- Controllers stuck on old versions
- Rollback events

## Rollout Strategy

### Phased Rollout
1. **Dev channel**: Internal testing devices
2. **Beta channel**: Early adopter opt-in
3. **Stable channel**: All production devices

### Percentage-Based Rollout
For stable channel updates:
1. 5% of devices (monitor for 24h)
2. 25% of devices (monitor for 24h)
3. 50% of devices (monitor for 24h)
4. 100% of devices

### Emergency Rollback
- Mark problematic release as inactive
- Push notification to affected devices
- Automatic rollback or update to patched version
