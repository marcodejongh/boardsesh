# ESP32 OTA Implementation Plan

This document outlines the phased implementation plan for the ESP32 OTA update system described in [esp32-ota-architecture.md](./esp32-ota-architecture.md).

## Summary

A custom OTA solution that leverages existing infrastructure:
- **Backend**: GraphQL API for version management, S3 for binary storage
- **ESP32**: Native ESP-IDF OTA with HTTPS download
- **CI/CD**: GitHub Actions for automated builds across channels (alpha/beta/stable)

**Target scale**: 20-100 devices (expandable)

## Implementation Phases

### Phase 1: Database & Backend Foundation
**Estimated scope**: Backend changes only

#### 1.1 Database Schema
Create migrations for OTA tables in `packages/db/`:

```bash
# From packages/db/
npx drizzle-kit generate
```

**Tables to create**:
- `esp32_firmware_releases` - Firmware version registry
- `esp32_controller_firmware` - Per-controller firmware state
- `esp32_firmware_update_log` - Audit trail

**Files to create/modify**:
- `packages/db/src/schema/app/firmware.ts` - Drizzle schema
- `packages/db/src/schema/index.ts` - Export new tables

#### 1.2 GraphQL Schema Extension
Add firmware types to shared schema:

**File**: `packages/shared-schema/src/schema.ts`
- Add `FirmwareRelease`, `FirmwareChannel`, `FirmwareUpdateInfo` types
- Add `FirmwareUpdateState` enum
- Add input types for mutations

#### 1.3 Backend Resolvers
Create firmware resolver module:

**Files to create**:
- `packages/backend/src/graphql/resolvers/firmware/index.ts`
- `packages/backend/src/graphql/resolvers/firmware/queries.ts`
  - `availableFirmware` - List firmware by board type and channel
  - `firmwareReleases` - Admin listing
  - `controllerFirmwareStatuses` - Fleet status
- `packages/backend/src/graphql/resolvers/firmware/mutations.ts`
  - `checkFirmwareUpdate` - Controller update check
  - `reportFirmwareStatus` - Controller status reporting
  - `registerFirmwareBuild` - CI registration (requires CI_API_KEY)
  - `setUpdateChannel` - Controller channel preference
  - `cleanupAlphaBuilds` - CI cleanup of old PR builds
- `packages/backend/src/graphql/resolvers/firmware/subscriptions.ts`
  - `firmwareUpdateAvailable` - Push notifications to controllers

**Files to modify**:
- `packages/backend/src/graphql/resolvers/index.ts` - Add firmware resolvers
- `packages/backend/src/websocket/setup.ts` - Add CI API key auth

#### 1.4 CI Authentication
Add CI API key validation for GitHub Actions:

**Environment variables**:
- `CI_API_KEY` - Secret for GitHub Actions authentication

**Auth flow**: Bearer token in Authorization header, validated in `requireCIAuth()` helper.

---

### Phase 2: ESP32 Firmware Implementation
**Estimated scope**: Embedded C++ code

#### 2.1 OTA Manager Module
Create core OTA functionality:

**Files to create**:
- `packages/board-controller/esp32/src/ota/ota_manager.h`
- `packages/board-controller/esp32/src/ota/ota_manager.cpp`

**Features**:
- Periodic update checks (configurable interval, default 1 hour)
- HTTPS firmware download with progress tracking
- SHA256 checksum verification
- ESP-IDF dual-partition OTA with automatic rollback
- Status reporting to backend via GraphQL

#### 2.2 Version Header
Auto-generated version info:

**File**: `packages/board-controller/esp32/src/version.h`
```cpp
#pragma once
#define FIRMWARE_VERSION "1.0.0"
#define FIRMWARE_VERSION_CODE 10000
#define FIRMWARE_CHANNEL "stable"
```

CI injects correct values during build.

#### 2.3 WebSocket Client Extensions
Add firmware-related GraphQL operations:

**File to modify**: `packages/board-controller/esp32/src/websocket/`
- `sendCheckFirmwareUpdate()` - Query for updates
- `sendFirmwareStatus()` - Report progress
- `queryAvailableFirmware()` - List available versions
- `mutateSetUpdateChannel()` - Change channel preference

#### 2.4 Main Integration
Integrate OTA manager into main loop:

**File to modify**: `packages/board-controller/esp32/src/main.cpp`
- Initialize OTA manager in `setup()`
- Call `otaManager.loop()` in main loop
- Handle update notifications from WebSocket

---

### Phase 3: CI/CD Pipeline
**Estimated scope**: GitHub Actions workflow

#### 3.1 Build Workflow
Automated firmware builds on Git events:

**File to create**: `.github/workflows/firmware-build.yml`

**Triggers**:
| Event | Channel | Version Format |
|-------|---------|----------------|
| Pull Request | alpha | `pr-{num}-{sha}` |
| Push to main | beta | `main-{sha}` |
| Release (latest) | stable | Semantic version |

**Build matrix**: esp32, esp32s3

**Steps**:
1. Checkout code
2. Setup PlatformIO
3. Determine version from Git context
4. Inject version into `version.h`
5. Build firmware
6. Calculate SHA256 checksum
7. Upload to S3
8. Register with backend via GraphQL mutation

#### 3.2 S3 Configuration
Use existing Railway S3 (same as avatars):

**Path structure**: `firmware/{channel}/{board_type}/{version}/firmware.bin`

**Environment variables** (already configured):
- `AWS_S3_BUCKET_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ENDPOINT_URL`

#### 3.3 Alpha Cleanup
Automatic cleanup of old PR builds:

Post-build step calls `cleanupAlphaBuilds` mutation to keep only last 5 builds per PR.

---

### Phase 4: ESP32 WebUI Firmware Browser
**Estimated scope**: Embedded web interface

#### 4.1 Firmware Routes
HTTP endpoints on ESP32 that proxy to GraphQL:

**File to create**: `packages/board-controller/esp32/src/web/firmware_routes.cpp`
- `GET /api/firmware/available` - Cached firmware list
- `GET /api/firmware/status` - Current version and state
- `POST /api/firmware/install` - Trigger update
- `POST /api/firmware/channel` - Change channel preference

#### 4.2 WebUI Page
Single-page firmware browser:

**File to create**: `packages/board-controller/esp32/data/firmware.html`
- View firmware across all channels
- See PR details for alpha builds
- Install any version
- Change update channel
- Real-time update progress

---

### Phase 5: Admin Dashboard (Optional)
**Estimated scope**: Next.js web components

#### 5.1 Firmware Management Page
Admin interface for fleet management:

**Files to create**:
- `packages/web/app/admin/firmware/page.tsx`
- `packages/web/app/components/firmware/FirmwareList.tsx`
- `packages/web/app/components/firmware/ControllerStatus.tsx`

**Features**:
- View all firmware releases
- See controller fleet status
- Trigger updates for specific controllers
- View update logs and errors
- Promote beta to stable
- Deactivate problematic releases

---

## Implementation Order

```
Phase 1 (Backend)     ████████░░░░░░░░░░░░
Phase 2 (ESP32)       ░░░░████████░░░░░░░░
Phase 3 (CI/CD)       ░░░░░░░░████████░░░░
Phase 4 (WebUI)       ░░░░░░░░░░░░████░░░░
Phase 5 (Admin)       ░░░░░░░░░░░░░░░░████  (optional)
```

**Recommended approach**:
1. Complete Phase 1 fully (enables CI to register builds)
2. Phase 2 + 3 in parallel (ESP32 dev + CI workflow)
3. Phase 4 after OTA works end-to-end
4. Phase 5 as needed for fleet management

---

## Testing Strategy

### Phase 1 Testing
- Unit tests for GraphQL resolvers
- Manual GraphQL playground testing
- Verify database migrations

### Phase 2 Testing
- Bench test: ESP32 dev board with serial monitor
- Test update flow with manually uploaded binary
- Verify checksum validation
- Test rollback by uploading intentionally broken firmware

### Phase 3 Testing
- Create test PR to verify alpha builds
- Merge to main to verify beta builds
- Create pre-release to verify stable builds
- Verify S3 uploads and GraphQL registration

### End-to-End Testing
1. Build firmware locally
2. Upload to S3 manually
3. Register via GraphQL mutation
4. Verify ESP32 detects and installs update
5. Verify rollback on boot failure

---

## Rollout Plan

### Initial Deployment (Week 1-2)
- Deploy backend changes
- Build and flash initial OTA-capable firmware manually
- Test with 2-3 development boards

### Beta Testing (Week 3-4)
- Enable CI pipeline
- Onboard 5-10 beta testers
- Monitor logs via Axiom integration
- Fix any issues

### Production Rollout (Week 5+)
- Tag first stable release
- Gradual rollout to remaining devices
- Monitor for rollback events

---

## Risk Mitigation

### Bricked Devices
- ESP-IDF dual-partition ensures automatic rollback
- 60-second validation window before confirming update
- Manual recovery possible via USB if needed

### Network Failures
- Resumable downloads not supported initially (full retry)
- Conservative timeout (30 seconds)
- Exponential backoff on check failures

### Bad Firmware
- SHA256 verification before flashing
- `is_active` flag to immediately hide bad releases
- Previous stable always available as fallback

---

## Dependencies

### Required Secrets (GitHub Actions)
- `CI_API_KEY` - Backend authentication for firmware registration
- `RAILWAY_S3_ACCESS_KEY` - S3 upload credentials
- `RAILWAY_S3_SECRET_KEY` - S3 upload credentials

### Required Variables (GitHub Actions)
- `BACKEND_URL` - GraphQL endpoint URL
- `RAILWAY_S3_BUCKET` - S3 bucket name
- `RAILWAY_S3_REGION` - S3 region
- `RAILWAY_S3_ENDPOINT` - S3 endpoint URL

---

## File Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/db/src/schema/app/firmware.ts` | Database schema |
| `packages/backend/src/graphql/resolvers/firmware/*.ts` | GraphQL resolvers |
| `packages/board-controller/esp32/src/ota/*.cpp` | OTA manager |
| `packages/board-controller/esp32/src/version.h` | Version defines |
| `packages/board-controller/esp32/src/web/firmware_routes.cpp` | WebUI routes |
| `packages/board-controller/esp32/data/firmware.html` | WebUI page |
| `.github/workflows/firmware-build.yml` | CI/CD pipeline |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/shared-schema/src/schema.ts` | Add firmware types |
| `packages/backend/src/graphql/resolvers/index.ts` | Register firmware resolvers |
| `packages/backend/src/websocket/setup.ts` | CI API key auth |
| `packages/board-controller/esp32/src/main.cpp` | Integrate OTA manager |
| `packages/board-controller/esp32/src/websocket/*.cpp` | GraphQL methods |
| `packages/board-controller/esp32/platformio.ini` | Add OTA dependencies |
