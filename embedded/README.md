# Embedded Firmware

This directory contains ESP32 firmware projects and shared libraries for Boardsesh hardware controllers.

## Structure

```
embedded/
├── libs/                          # Shared PlatformIO libraries
│   ├── aurora-protocol/           # Kilter/Tension BLE protocol decoder
│   ├── led-controller/            # FastLED abstraction
│   ├── config-manager/            # NVS persistence
│   ├── log-buffer/                # Ring buffer logging
│   ├── wifi-utils/                # WiFi connection wrapper
│   ├── graphql-ws-client/         # WebSocket client
│   ├── nordic-uart-ble/           # BLE GATT server (Nordic UART Service)
│   └── esp-web-server/            # HTTP configuration server
│
└── projects/
    └── board-controller/          # Main firmware for LED board control
```

## Development Setup

### Prerequisites

- [PlatformIO](https://platformio.org/) (install via VS Code extension or CLI)
- ESP32 development board (ESP32-S3 recommended)

### Building

```bash
cd embedded/projects/board-controller
pio run
```

### Flashing

```bash
cd embedded/projects/board-controller
pio run -t upload
```

### Monitoring Serial Output

```bash
cd embedded/projects/board-controller
pio device monitor
```

## Shared Libraries

Libraries in `libs/` are shared across firmware projects using PlatformIO's symlink feature. Each project references them in `platformio.ini`:

```ini
lib_deps =
    aurora-protocol=symlink://../../libs/aurora-protocol
    led-controller=symlink://../../libs/led-controller
    ; ... etc
```

### Library Structure

Each library follows PlatformIO conventions:

```
libs/my-library/
├── library.json          # Library manifest
└── src/
    ├── my_library.h      # Public header
    └── my_library.cpp    # Implementation
```

## Projects

### board-controller

Main firmware for controlling Kilter/Tension climbing board LEDs. Features:

- **BLE Server**: Exposes Nordic UART Service for direct board control
- **Aurora Protocol**: Decodes Kilter/Tension BLE commands
- **LED Control**: Drives addressable LEDs via FastLED
- **WiFi Connectivity**: Connects to backend for party mode
- **GraphQL-WS Client**: Real-time sync with Boardsesh backend
- **Web Config**: HTTP server for WiFi and device setup

## Adding a New Project

1. Create directory: `mkdir -p projects/my-project/{src,data,test,scripts}`
2. Create `platformio.ini` with shared library references
3. Create `src/main.cpp`
4. Build: `pio run`

## Convenience Scripts (from repo root)

```bash
npm run controller:build      # Build board-controller
npm run controller:upload     # Flash board-controller
npm run controller:monitor    # Serial monitor
```
