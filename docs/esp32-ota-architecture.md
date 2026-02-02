# ESP32 OTA Update Architecture

This document describes the Over-The-Air (OTA) update system for ESP32 board controllers.

## Overview

The OTA system enables remote firmware updates for deployed ESP32 controllers through the existing WebSocket/GraphQL infrastructure. Controllers check for updates periodically and download firmware binaries over HTTPS. The ESP32's built-in WebUI provides a firmware browser for manual selection and installation.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Admin     │     │     Backend     │     │  GitHub Actions │
│   Dashboard     │────▶│  (GraphQL API)  │◀────│  (CI/CD Build)  │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                        GraphQL-WS              Upload binaries
                        + REST API                       │
                                 │                       ▼
                                 ▼              ┌─────────────────┐
                        ┌─────────────────┐     │   S3 Bucket     │
                        │  ESP32 Device   │────▶│   (Railway)     │
                        │  (Controller)   │     └─────────────────┘
                        │                 │
                        │  ┌───────────┐  │
                        │  │  WebUI    │  │  ← Firmware browser
                        │  │  (HTTP)   │  │    for manual selection
                        │  └───────────┘  │
                        └─────────────────┘
```

## Design Principles

1. **Leverage existing infrastructure** - Use current WebSocket connection for notifications
2. **Separate binary delivery** - HTTPS download from blob storage (not WebSocket)
3. **Fail-safe updates** - Dual OTA partitions with automatic rollback
4. **Minimal disruption** - Updates happen during idle periods
5. **Audit trail** - Track all update attempts and outcomes
6. **Branch-based channels** - CI builds from PRs, main, and tags flow to different channels
7. **Local firmware browser** - ESP32 WebUI allows browsing and installing any available firmware

## Channel Strategy

Firmware is automatically built and published based on Git source:

| Source | Channel | Description | Auto-update |
|--------|---------|-------------|-------------|
| Pull Request | `alpha` | Experimental builds from feature branches | No |
| `main` branch | `beta` | Latest merged features, pre-release testing | Opt-in |
| Tagged `latest` | `stable` | Production-ready releases | Yes (default) |

### Channel Behavior

- **Alpha**: Built on every PR update. Named with PR number and commit SHA (e.g., `pr-123-abc1234`). Not advertised for auto-update. Visible in ESP32 WebUI for manual installation.
- **Beta**: Built on every push to `main`. Named with commit SHA (e.g., `main-abc1234`). Controllers opted into beta channel receive auto-update notifications.
- **Stable**: Created when a release is tagged and marked as "latest" on GitHub. Uses semantic versioning (e.g., `1.2.3`). Default channel for all controllers.

## Database Schema

### New Tables

```sql
-- Firmware releases table
CREATE TABLE esp32_firmware_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,           -- Version identifier (see versioning below)
  version_code INTEGER NOT NULL,          -- Numeric for comparison
  board_type VARCHAR(20) NOT NULL,        -- "esp32", "esp32s3", "esp32c3"
  channel VARCHAR(20) NOT NULL,           -- "stable", "beta", "alpha"
  binary_url TEXT NOT NULL,               -- HTTPS URL to firmware binary
  binary_size INTEGER NOT NULL,           -- Size in bytes
  checksum_sha256 VARCHAR(64) NOT NULL,   -- SHA256 hash of binary
  release_notes TEXT,
  min_version_code INTEGER DEFAULT 0,     -- Minimum version that can upgrade
  is_mandatory BOOLEAN DEFAULT FALSE,     -- Force update (stable channel only)
  is_active BOOLEAN DEFAULT TRUE,         -- Available for download
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,

  -- Git source tracking
  git_ref VARCHAR(100),                   -- Branch name, tag, or PR ref
  git_sha VARCHAR(40),                    -- Full commit SHA
  pr_number INTEGER,                      -- PR number (for alpha channel)
  pr_title VARCHAR(200),                  -- PR title for display
  pr_author VARCHAR(100),                 -- PR author username
  workflow_run_id BIGINT,                 -- GitHub Actions run ID for traceability

  UNIQUE(board_type, channel, git_sha)    -- One build per commit per board type
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
  channel: FirmwareChannel!
  binaryUrl: String!
  binarySize: Int!
  checksumSha256: String!
  releaseNotes: String
  isMandatory: Boolean!
  isActive: Boolean!
  createdAt: String!
  publishedAt: String

  # Git source information
  gitRef: String
  gitSha: String
  prNumber: Int
  prTitle: String
  prAuthor: String
}

enum FirmwareChannel {
  STABLE   # Tagged releases marked as "latest"
  BETA     # Builds from main branch
  ALPHA    # Builds from PRs
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
  firmwareReleases(boardType: String, channel: FirmwareChannel): [FirmwareRelease!]!

  # For ESP32 WebUI - browse available firmware (no auth required, uses API key)
  # Returns firmwares grouped by channel, sorted by recency
  availableFirmware(
    boardType: String!
    includeChannels: [FirmwareChannel!]  # Default: all channels
    limit: Int                            # Per channel, default 10
  ): AvailableFirmwareResponse!

  # For admin - get update status of all controllers
  controllerFirmwareStatuses: [FirmwareUpdateStatus!]!

  # For admin - get update history for a controller
  firmwareUpdateLog(controllerId: ID!, limit: Int): [FirmwareUpdateLogEntry!]!
}

# Response type for firmware browser
type AvailableFirmwareResponse {
  stable: [FirmwareRelease!]!
  beta: [FirmwareRelease!]!
  alpha: [FirmwareRelease!]!
  currentVersion: String         # Controller's current version (if authenticated)
  recommendedUpdate: FirmwareRelease  # Recommended update based on channel preference
}
```

### Mutations

```graphql
extend type Mutation {
  # Called by ESP32 to check for updates (uses controller's channel preference)
  checkFirmwareUpdate(
    currentVersion: String!
    currentVersionCode: Int!
    boardType: String!
  ): FirmwareUpdateInfo!

  # Called by ESP32 to report update progress
  reportFirmwareStatus(input: ReportFirmwareStatusInput!): Boolean!

  # CI: Register a new firmware build (called by GitHub Actions)
  # Requires CI_API_KEY authentication
  registerFirmwareBuild(input: RegisterFirmwareBuildInput!): FirmwareRelease!

  # Admin: Promote a beta release to stable (creates new stable release)
  promoteFirmwareToStable(releaseId: ID!): FirmwareRelease!

  # Admin: Deactivate a firmware release (hides from listings, stops updates)
  deactivateFirmwareRelease(releaseId: ID!): Boolean!

  # Admin: Trigger update for specific controller(s)
  triggerFirmwareUpdate(controllerIds: [ID!]!, releaseId: ID): Boolean!

  # Controller: Set preferred update channel
  setUpdateChannel(channel: FirmwareChannel!): Boolean!
}

input RegisterFirmwareBuildInput {
  boardType: String!
  channel: FirmwareChannel!
  binaryUrl: String!
  binarySize: Int!
  checksumSha256: String!
  releaseNotes: String

  # Git metadata (required)
  gitRef: String!
  gitSha: String!

  # PR info (required for alpha channel)
  prNumber: Int
  prTitle: String
  prAuthor: String

  # CI traceability
  workflowRunId: String
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

## ESP32 WebUI Firmware Browser

The ESP32's built-in web interface includes a firmware browser that allows users to:
- View all available firmware across all channels (stable, beta, alpha)
- See PR details for alpha builds (title, author, PR number)
- Manually install any firmware version
- Switch between update channels

### WebUI Endpoints

Add these endpoints to the existing ESP32 web server:

```cpp
// src/web/firmware_routes.cpp

#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include "../ota/ota_manager.h"

void setupFirmwareRoutes(AsyncWebServer& server) {

    // GET /api/firmware/available - Fetch available firmware from backend
    server.on("/api/firmware/available", HTTP_GET, [](AsyncWebServerRequest* request) {
        // Forward request to backend API
        // This is done client-side in JavaScript to avoid blocking
        request->send(200, "application/json", "{\"redirect\": true}");
    });

    // GET /api/firmware/status - Current firmware and update status
    server.on("/api/firmware/status", HTTP_GET, [](AsyncWebServerRequest* request) {
        JsonDocument doc;
        doc["currentVersion"] = otaManager.getCurrentVersion();
        doc["currentVersionCode"] = otaManager.getCurrentVersionCode();
        doc["boardType"] = otaManager.getBoardType();
        doc["channel"] = configManager.getUpdateChannel();
        doc["state"] = otaStateToString(otaManager.getState());
        doc["progress"] = otaManager.getProgress();

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // POST /api/firmware/install - Install specific firmware
    server.on("/api/firmware/install", HTTP_POST, [](AsyncWebServerRequest* request) {},
        NULL,
        [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
            JsonDocument doc;
            deserializeJson(doc, data, len);

            FirmwareInfo info;
            info.version = doc["version"].as<String>();
            info.versionCode = doc["versionCode"].as<int>();
            info.url = doc["binaryUrl"].as<String>();
            info.size = doc["binarySize"].as<size_t>();
            info.checksumSha256 = doc["checksumSha256"].as<String>();
            info.mandatory = false;

            otaManager.startUpdate(info);

            request->send(200, "application/json", "{\"success\": true, \"message\": \"Update started\"}");
        }
    );

    // POST /api/firmware/channel - Change update channel preference
    server.on("/api/firmware/channel", HTTP_POST, [](AsyncWebServerRequest* request) {},
        NULL,
        [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
            JsonDocument doc;
            deserializeJson(doc, data, len);

            String channel = doc["channel"].as<String>();
            if (channel == "stable" || channel == "beta" || channel == "alpha") {
                configManager.setUpdateChannel(channel);
                configManager.save();
                request->send(200, "application/json", "{\"success\": true}");
            } else {
                request->send(400, "application/json", "{\"error\": \"Invalid channel\"}");
            }
        }
    );
}
```

### WebUI HTML/JavaScript

The firmware browser UI is served as a single-page application:

```html
<!-- Embedded in ESP32 flash, served at /firmware.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Firmware Update</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; font-family: -apple-system, sans-serif; }
        body { margin: 0; padding: 16px; background: #1a1a2e; color: #eee; }
        .card { background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .channel-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .tab { padding: 8px 16px; border-radius: 4px; cursor: pointer; background: #0f3460; }
        .tab.active { background: #e94560; }
        .firmware-item { padding: 12px; border-bottom: 1px solid #0f3460; }
        .firmware-item:last-child { border-bottom: none; }
        .version { font-weight: bold; font-size: 1.1em; }
        .meta { color: #888; font-size: 0.85em; margin-top: 4px; }
        .pr-info { background: #0f3460; padding: 8px; border-radius: 4px; margin-top: 8px; }
        .btn { background: #e94560; color: white; border: none; padding: 8px 16px;
               border-radius: 4px; cursor: pointer; }
        .btn:disabled { background: #666; cursor: not-allowed; }
        .btn-secondary { background: #0f3460; }
        .progress { height: 4px; background: #0f3460; border-radius: 2px; margin-top: 8px; }
        .progress-bar { height: 100%; background: #e94560; border-radius: 2px; transition: width 0.3s; }
        .current { border: 2px solid #4ecca3; }
        .status { padding: 8px; border-radius: 4px; margin-bottom: 16px; }
        .status.updating { background: #e94560; }
        .status.success { background: #4ecca3; color: #000; }
        .status.error { background: #ff6b6b; }
    </style>
</head>
<body>
    <h1>Firmware Update</h1>

    <div class="card">
        <h3>Current Firmware</h3>
        <div id="current-info">Loading...</div>
        <div style="margin-top: 12px">
            <label>Update Channel: </label>
            <select id="channel-select" onchange="changeChannel(this.value)">
                <option value="stable">Stable (Recommended)</option>
                <option value="beta">Beta (Latest from main)</option>
                <option value="alpha">Alpha (PR builds)</option>
            </select>
        </div>
    </div>

    <div id="update-status" class="status" style="display: none;"></div>

    <div class="channel-tabs">
        <div class="tab active" onclick="showChannel('stable')">Stable</div>
        <div class="tab" onclick="showChannel('beta')">Beta</div>
        <div class="tab" onclick="showChannel('alpha')">Alpha (PRs)</div>
    </div>

    <div class="card">
        <div id="firmware-list">Loading available firmware...</div>
    </div>

    <script>
        const BACKEND_URL = ''; // Injected at build time or fetched from config
        let currentVersion = '';
        let firmwareData = { stable: [], beta: [], alpha: [] };
        let activeChannel = 'stable';

        async function init() {
            await fetchStatus();
            await fetchFirmware();
            pollStatus();
        }

        async function fetchStatus() {
            const res = await fetch('/api/firmware/status');
            const data = await res.json();
            currentVersion = data.currentVersion;
            document.getElementById('channel-select').value = data.channel;
            document.getElementById('current-info').innerHTML = `
                <div class="version">${data.currentVersion}</div>
                <div class="meta">Board: ${data.boardType} | Channel: ${data.channel}</div>
            `;
            updateStatusDisplay(data);
        }

        async function fetchFirmware() {
            const status = await (await fetch('/api/firmware/status')).json();
            const backendUrl = await getBackendUrl();

            const res = await fetch(`${backendUrl}/api/firmware/available?boardType=${status.boardType}`);
            firmwareData = await res.json();
            renderFirmwareList();
        }

        async function getBackendUrl() {
            const config = await (await fetch('/api/config')).json();
            return config.backendUrl || 'https://api.boardsesh.com';
        }

        function renderFirmwareList() {
            const list = firmwareData[activeChannel] || [];
            const container = document.getElementById('firmware-list');

            if (list.length === 0) {
                container.innerHTML = '<p>No firmware available in this channel.</p>';
                return;
            }

            container.innerHTML = list.map(fw => `
                <div class="firmware-item ${fw.version === currentVersion ? 'current' : ''}">
                    <div class="version">
                        ${fw.version}
                        ${fw.version === currentVersion ? '<span style="color: #4ecca3;"> (current)</span>' : ''}
                    </div>
                    <div class="meta">
                        ${new Date(fw.createdAt).toLocaleDateString()}
                        ${fw.binarySize ? ` • ${(fw.binarySize / 1024).toFixed(0)} KB` : ''}
                    </div>
                    ${fw.prNumber ? `
                        <div class="pr-info">
                            <strong>PR #${fw.prNumber}</strong>: ${fw.prTitle || 'No title'}
                            <div class="meta">by ${fw.prAuthor || 'unknown'}</div>
                        </div>
                    ` : ''}
                    ${fw.releaseNotes ? `<div class="meta" style="margin-top: 8px;">${fw.releaseNotes}</div>` : ''}
                    <button class="btn" style="margin-top: 8px;"
                            onclick="installFirmware(${JSON.stringify(fw).replace(/"/g, '&quot;')})"
                            ${fw.version === currentVersion ? 'disabled' : ''}>
                        ${fw.version === currentVersion ? 'Installed' : 'Install'}
                    </button>
                </div>
            `).join('');
        }

        function showChannel(channel) {
            activeChannel = channel;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            renderFirmwareList();
        }

        async function installFirmware(fw) {
            if (!confirm(`Install firmware ${fw.version}? The device will reboot after installation.`)) {
                return;
            }

            const res = await fetch('/api/firmware/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fw)
            });

            if (res.ok) {
                showStatus('updating', 'Starting firmware update...');
            } else {
                showStatus('error', 'Failed to start update');
            }
        }

        async function changeChannel(channel) {
            await fetch('/api/firmware/channel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel })
            });
            fetchStatus();
        }

        function updateStatusDisplay(data) {
            if (data.state === 'DOWNLOADING' || data.state === 'INSTALLING') {
                showStatus('updating', `${data.state}: ${data.progress}%`);
            } else if (data.state === 'SUCCESS') {
                showStatus('success', 'Update complete! Device will reboot.');
            } else if (data.state === 'FAILED') {
                showStatus('error', 'Update failed. Please try again.');
            } else {
                hideStatus();
            }
        }

        function showStatus(type, message) {
            const el = document.getElementById('update-status');
            el.className = `status ${type}`;
            el.textContent = message;
            el.style.display = 'block';
        }

        function hideStatus() {
            document.getElementById('update-status').style.display = 'none';
        }

        function pollStatus() {
            setInterval(async () => {
                const res = await fetch('/api/firmware/status');
                const data = await res.json();
                updateStatusDisplay(data);
            }, 2000);
        }

        init();
    </script>
</body>
</html>
```

### Backend API for Firmware Browser

The backend exposes a REST endpoint for the ESP32 to fetch available firmware:

```typescript
// packages/backend/src/routes/firmware.ts

import { Router } from 'express';
import { db } from '../db';
import { esp32FirmwareReleases } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// GET /api/firmware/available - List firmware for ESP32 WebUI
router.get('/available', async (req, res) => {
  const { boardType } = req.query;

  if (!boardType || typeof boardType !== 'string') {
    return res.status(400).json({ error: 'boardType is required' });
  }

  const [stable, beta, alpha] = await Promise.all([
    db.select()
      .from(esp32FirmwareReleases)
      .where(and(
        eq(esp32FirmwareReleases.boardType, boardType),
        eq(esp32FirmwareReleases.channel, 'stable'),
        eq(esp32FirmwareReleases.isActive, true)
      ))
      .orderBy(desc(esp32FirmwareReleases.versionCode))
      .limit(10),

    db.select()
      .from(esp32FirmwareReleases)
      .where(and(
        eq(esp32FirmwareReleases.boardType, boardType),
        eq(esp32FirmwareReleases.channel, 'beta'),
        eq(esp32FirmwareReleases.isActive, true)
      ))
      .orderBy(desc(esp32FirmwareReleases.createdAt))
      .limit(10),

    db.select()
      .from(esp32FirmwareReleases)
      .where(and(
        eq(esp32FirmwareReleases.boardType, boardType),
        eq(esp32FirmwareReleases.channel, 'alpha'),
        eq(esp32FirmwareReleases.isActive, true)
      ))
      .orderBy(desc(esp32FirmwareReleases.createdAt))
      .limit(20),  // More alpha builds since there are many PRs
  ]);

  res.json({ stable, beta, alpha });
});

// POST /api/firmware/register - CI registers new firmware build
router.post('/register', authenticateCI, async (req, res) => {
  const {
    boardType, channel, version, binaryUrl, binarySize,
    checksumSha256, gitRef, gitSha, prNumber, prTitle,
    prAuthor, releaseNotes, workflowRunId
  } = req.body;

  // Calculate version code
  let versionCode: number;
  if (channel === 'stable') {
    const [major, minor, patch] = version.split('.').map(Number);
    versionCode = major * 10000 + minor * 100 + patch;
  } else {
    // Use timestamp for beta/alpha
    versionCode = Math.floor(Date.now() / 1000);
  }

  const [release] = await db.insert(esp32FirmwareReleases)
    .values({
      version,
      versionCode,
      boardType,
      channel,
      binaryUrl,
      binarySize,
      checksumSha256,
      gitRef,
      gitSha,
      prNumber,
      prTitle,
      prAuthor,
      releaseNotes,
      workflowRunId,
      isActive: true,
      publishedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [esp32FirmwareReleases.boardType, esp32FirmwareReleases.channel, esp32FirmwareReleases.gitSha],
      set: { binaryUrl, binarySize, checksumSha256, updatedAt: new Date() }
    })
    .returning();

  res.json(release);
});

// POST /api/firmware/cleanup-alpha - Remove old alpha builds for a PR
router.post('/cleanup-alpha', authenticateCI, async (req, res) => {
  const { prNumber, keepCount = 5 } = req.body;

  // Get all alpha builds for this PR, sorted by newest first
  const builds = await db.select()
    .from(esp32FirmwareReleases)
    .where(and(
      eq(esp32FirmwareReleases.channel, 'alpha'),
      eq(esp32FirmwareReleases.prNumber, prNumber)
    ))
    .orderBy(desc(esp32FirmwareReleases.createdAt));

  // Deactivate all but the newest `keepCount`
  const toDeactivate = builds.slice(keepCount);

  for (const build of toDeactivate) {
    await db.update(esp32FirmwareReleases)
      .set({ isActive: false })
      .where(eq(esp32FirmwareReleases.id, build.id));
  }

  res.json({ deactivated: toDeactivate.length });
});

export default router;
```

## Firmware Build & Release Process

### CI/CD Pipeline (GitHub Actions)

The build pipeline automatically builds and publishes firmware based on the Git event:

```yaml
# .github/workflows/firmware-build.yml
name: Firmware Build

on:
  pull_request:
    paths:
      - 'packages/board-controller/esp32/**'
  push:
    branches:
      - main
    paths:
      - 'packages/board-controller/esp32/**'
  release:
    types: [published]

env:
  BACKEND_URL: ${{ vars.BACKEND_URL }}

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

      - name: Determine version info
        id: version
        run: |
          COMMIT_SHA="${{ github.sha }}"
          SHORT_SHA="${COMMIT_SHA:0:7}"
          TIMESTAMP=$(git show -s --format=%ct $COMMIT_SHA)

          if [[ "${{ github.event_name }}" == "pull_request" ]]; then
            echo "channel=alpha" >> $GITHUB_OUTPUT
            echo "version=pr-${{ github.event.pull_request.number }}-${SHORT_SHA}" >> $GITHUB_OUTPUT
            echo "version_code=${TIMESTAMP}" >> $GITHUB_OUTPUT
            echo "pr_number=${{ github.event.pull_request.number }}" >> $GITHUB_OUTPUT
            echo "pr_title=${{ github.event.pull_request.title }}" >> $GITHUB_OUTPUT
            echo "pr_author=${{ github.event.pull_request.user.login }}" >> $GITHUB_OUTPUT
            echo "git_ref=refs/pull/${{ github.event.pull_request.number }}/head" >> $GITHUB_OUTPUT
          elif [[ "${{ github.event_name }}" == "push" && "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "channel=beta" >> $GITHUB_OUTPUT
            echo "version=main-${SHORT_SHA}" >> $GITHUB_OUTPUT
            echo "version_code=${TIMESTAMP}" >> $GITHUB_OUTPUT
            echo "git_ref=refs/heads/main" >> $GITHUB_OUTPUT
          elif [[ "${{ github.event_name }}" == "release" ]]; then
            VERSION="${{ github.event.release.tag_name }}"
            VERSION="${VERSION#v}"  # Remove 'v' prefix if present
            VERSION="${VERSION#firmware-}"  # Remove 'firmware-' prefix if present

            # Parse semantic version for version code
            IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
            VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

            echo "channel=stable" >> $GITHUB_OUTPUT
            echo "version=${VERSION}" >> $GITHUB_OUTPUT
            echo "version_code=${VERSION_CODE}" >> $GITHUB_OUTPUT
            echo "git_ref=refs/tags/${{ github.event.release.tag_name }}" >> $GITHUB_OUTPUT
          fi

      - name: Inject version into firmware
        working-directory: packages/board-controller/esp32
        run: |
          # Update version defines in firmware
          cat > src/version.h << EOF
          #pragma once
          #define FIRMWARE_VERSION "${{ steps.version.outputs.version }}"
          #define FIRMWARE_VERSION_CODE ${{ steps.version.outputs.version_code }}
          #define FIRMWARE_CHANNEL "${{ steps.version.outputs.channel }}"
          EOF

      - name: Build firmware
        working-directory: packages/board-controller/esp32
        run: |
          pio run -e ${{ matrix.board }}

      - name: Generate checksums
        id: checksum
        working-directory: packages/board-controller/esp32
        run: |
          CHECKSUM=$(sha256sum .pio/build/${{ matrix.board }}/firmware.bin | cut -d' ' -f1)
          SIZE=$(stat -c%s .pio/build/${{ matrix.board }}/firmware.bin)
          echo "sha256=${CHECKSUM}" >> $GITHUB_OUTPUT
          echo "size=${SIZE}" >> $GITHUB_OUTPUT

      - name: Upload firmware to S3
        id: upload
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.RAILWAY_S3_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.RAILWAY_S3_SECRET_KEY }}
          AWS_REGION: ${{ vars.RAILWAY_S3_REGION }}
          S3_BUCKET: ${{ vars.RAILWAY_S3_BUCKET }}
          S3_ENDPOINT: ${{ vars.RAILWAY_S3_ENDPOINT }}
        working-directory: packages/board-controller/esp32
        run: |
          # S3 path: firmware/{channel}/{board_type}/{version}/firmware.bin
          S3_PATH="firmware/${{ steps.version.outputs.channel }}/${{ matrix.board }}/${{ steps.version.outputs.version }}/firmware.bin"

          aws s3 cp .pio/build/${{ matrix.board }}/firmware.bin \
            "s3://${S3_BUCKET}/${S3_PATH}" \
            --endpoint-url "${S3_ENDPOINT}"

          # Generate the public URL
          BINARY_URL="${S3_ENDPOINT}/${S3_BUCKET}/${S3_PATH}"
          echo "binary_url=${BINARY_URL}" >> $GITHUB_OUTPUT

      - name: Upload artifact (for local testing)
        uses: actions/upload-artifact@v4
        with:
          name: firmware-${{ matrix.board }}-${{ steps.version.outputs.version }}
          path: packages/board-controller/esp32/.pio/build/${{ matrix.board }}/firmware.bin
          retention-days: 7

      - name: Register firmware with backend
        env:
          CI_API_KEY: ${{ secrets.CI_API_KEY }}
        run: |
          # Build the registration payload
          PAYLOAD=$(jq -n \
            --arg boardType "${{ matrix.board }}" \
            --arg channel "${{ steps.version.outputs.channel }}" \
            --arg version "${{ steps.version.outputs.version }}" \
            --arg binaryUrl "${{ steps.upload.outputs.binary_url }}" \
            --argjson binarySize "${{ steps.checksum.outputs.size }}" \
            --arg checksumSha256 "${{ steps.checksum.outputs.sha256 }}" \
            --arg gitRef "${{ steps.version.outputs.git_ref }}" \
            --arg gitSha "${{ github.sha }}" \
            --arg workflowRunId "${{ github.run_id }}" \
            '{
              boardType: $boardType,
              channel: $channel,
              version: $version,
              binaryUrl: $binaryUrl,
              binarySize: $binarySize,
              checksumSha256: $checksumSha256,
              gitRef: $gitRef,
              gitSha: $gitSha,
              workflowRunId: $workflowRunId
            }')

          # Add PR info for alpha channel
          if [[ "${{ steps.version.outputs.channel }}" == "alpha" ]]; then
            PAYLOAD=$(echo "$PAYLOAD" | jq \
              --argjson prNumber "${{ steps.version.outputs.pr_number }}" \
              --arg prTitle "${{ steps.version.outputs.pr_title }}" \
              --arg prAuthor "${{ steps.version.outputs.pr_author }}" \
              '. + {prNumber: $prNumber, prTitle: $prTitle, prAuthor: $prAuthor}')
          fi

          # Add release notes for stable channel
          if [[ "${{ steps.version.outputs.channel }}" == "stable" ]]; then
            PAYLOAD=$(echo "$PAYLOAD" | jq \
              --arg releaseNotes '${{ github.event.release.body }}' \
              '. + {releaseNotes: $releaseNotes}')
          fi

          curl -f -X POST "${BACKEND_URL}/api/firmware/register" \
            -H "Authorization: Bearer ${CI_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD"

  # Cleanup old alpha builds (keep last 5 per PR)
  cleanup-alpha:
    if: github.event_name == 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup old alpha builds
        env:
          CI_API_KEY: ${{ secrets.CI_API_KEY }}
        run: |
          curl -X POST "${BACKEND_URL}/api/firmware/cleanup-alpha" \
            -H "Authorization: Bearer ${CI_API_KEY}" \
            -H "Content-Type: application/json" \
            -d '{"prNumber": ${{ github.event.pull_request.number }}, "keepCount": 5}'
```

### Stable Release Workflow

To create a stable release:

1. Create a GitHub Release with a semantic version tag (e.g., `v1.2.3` or `firmware-v1.2.3`)
2. Mark the release as "latest" in GitHub
3. CI automatically:
   - Builds firmware for all board types
   - Uploads binaries to the GitHub Release
   - Registers with the backend as `stable` channel
   - Controllers on stable channel receive update notifications

### Version Naming Convention

Different channels use different version naming schemes:

| Channel | Version Format | Example | Version Code |
|---------|---------------|---------|--------------|
| **Stable** | Semantic version | `1.2.3` | `10000 * major + 100 * minor + patch` |
| **Beta** | `main-{sha}` | `main-abc1234` | Unix timestamp of commit |
| **Alpha** | `pr-{num}-{sha}` | `pr-123-abc1234` | Unix timestamp of commit |

### Version Code Calculation

```
Stable:  MAJOR * 10000 + MINOR * 100 + PATCH
         1.2.3 → 10203

Beta:    Unix timestamp (seconds since epoch)
         2024-01-15 12:00:00 → 1705320000

Alpha:   Unix timestamp (seconds since epoch)
         2024-01-15 12:00:00 → 1705320000
```

**Note**: Timestamp-based version codes ensure beta/alpha builds are always "newer" than the last stable release from a version code comparison perspective. The channel preference determines which updates are offered, not just version code comparison.

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

### Channel-Based Development Flow

```
Feature Branch → PR → Alpha Build
                  ↓
              PR Merged → Main → Beta Build
                              ↓
                          Tag Release → Stable Build
```

### Testing Pipeline

1. **Alpha (PR builds)**
   - Developers test their own PR builds on personal devices
   - QA can install specific PR builds via WebUI for testing
   - Automatic cleanup keeps only last 5 builds per PR
   - No auto-update notifications

2. **Beta (main branch)**
   - Power users opt-in via WebUI channel selector
   - Automatic notifications when new beta is available
   - ~24-48 hours of beta testing before stable release
   - Report issues via device logs (Axiom integration)

3. **Stable (tagged releases)**
   - All production devices (default channel)
   - Tagged when beta has no critical issues
   - Automatic update notifications
   - `is_mandatory` flag for critical security fixes

### Creating a Stable Release

1. Ensure `main` branch is stable (beta channel tested)
2. Create GitHub Release with semantic version tag (e.g., `v1.2.3`)
3. Mark the release as "Set as the latest release"
4. CI automatically:
   - Builds firmware with stable version code
   - Uploads to S3
   - Registers as stable channel
   - Notifies all stable-channel controllers

### Emergency Rollback

1. **Deactivate problematic release**:
   - Mark `is_active = false` in database
   - Removes from available firmware lists
   - Stops auto-update notifications

2. **Push previous stable**:
   - Controllers checking for updates will see previous stable version
   - Or trigger manual update push to affected controllers

3. **ESP32 automatic rollback**:
   - If new firmware fails to validate within 60 seconds, ESP32 automatically rolls back
   - Rollback events logged for monitoring
