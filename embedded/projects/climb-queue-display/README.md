# Boardsesh Climb Queue Display

ESP32 firmware for displaying climb queue information on a LilyGo T-Display S3.

## Hardware

- **Device**: LilyGo T-Display S3
- **Display**: 1.9" TFT LCD, 170x320 pixels, ST7789 driver
- **Interface**: Parallel 8-bit bus
- **MCU**: ESP32-S3 with WiFi/BLE
- **Buttons**: GPIO 0 (Boot) and GPIO 14 (User)

## Features

1. **Current Climb Display** - Shows climb name and grade with colored badge
2. **Previous Climbs History** - Shows last 3-5 climbs with grade colors
3. **QR Code** - Scan to open current climb in official Kilter/Tension app
4. **BLE Proxy Mode** - Forward LED commands to official boards (optional)

## Display Layout (170x320 Portrait)

```
┌─────────────────────┐ Y=0
│  WiFi ● WS ● BLE ●  │ Status bar (20px)
├─────────────────────┤ Y=20
│                     │
│   Current Climb     │ Climb name
│   ┌───────────┐     │
│   │    V3     │     │ Grade badge (colored)
│   └───────────┘     │
├─────────────────────┤ Y=140
│    Open in App      │
│    ┌─────────┐      │
│    │ QR CODE │      │ 100x100 pixels
│    │         │      │
│    └─────────┘      │
├─────────────────────┤ Y=255
│ Previous:           │
│ ● Climb A    V2     │ History (3 items)
│ ● Climb B    V4     │
│ ● Climb C    V1     │
└─────────────────────┘ Y=320
```

## Building

### Prerequisites

1. Install [PlatformIO](https://platformio.org/)
2. Clone this repository

### Build

```bash
cd embedded/projects/climb-queue-display
pio run
```

### Upload

```bash
pio run -t upload
```

### Monitor Serial Output

```bash
pio device monitor
```

## Configuration

The device hosts a web configuration portal on port 80 when connected to WiFi.

### Required Settings

| Setting | Description |
|---------|-------------|
| `api_key` | Controller API key from Boardsesh web app |
| `session_id` | Party session ID to subscribe to |

### Optional Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `board_type` | `kilter` | Board type: `kilter` or `tension` |
| `ble_proxy_enabled` | `false` | Enable BLE proxy mode |
| `ble_board_address` | (auto) | Saved board BLE address |
| `backend_host` | `boardsesh.com` | Backend server hostname |
| `backend_port` | `443` | Backend server port |
| `backend_path` | `/graphql` | GraphQL endpoint path |

## BLE Proxy Mode

When enabled, the device can forward LED commands to an official Kilter or Tension board:

1. Enable `ble_proxy_enabled` in config
2. The device will scan for nearby Aurora boards
3. Once connected, LED commands from Boardsesh are forwarded to the board
4. The board address is saved for automatic reconnection

## Grade Colors

Grade colors are sent from the Boardsesh backend as hex strings (e.g., `#FF7043`). The firmware converts these to RGB565 for display. This keeps colors in sync with the web UI automatically.

Color progression:
- **V0-V2**: Yellow to Orange
- **V3-V4**: Orange-red
- **V5-V6**: Red
- **V7-V10**: Dark red to purple
- **V11+**: Purple shades

## App URL QR Codes

The QR code links to the climb in the official app:
- **Kilter**: `https://kilterboardapp.com/climbs/{uuid}`
- **Tension**: `https://tensionboardapp2.com/climbs/{uuid}`

## Dependencies

- [LovyanGFX](https://github.com/lovyan03/LovyanGFX) - Display driver
- [qrcode](https://github.com/ricmoo/QRCode) - QR code generation
- [NimBLE-Arduino](https://github.com/h2zero/NimBLE-Arduino) - BLE stack
- [ArduinoJson](https://github.com/bblanchon/ArduinoJson) - JSON parsing
- [WebSockets](https://github.com/Links2004/arduinoWebSockets) - WebSocket client

Plus shared Boardsesh libraries:
- config-manager
- log-buffer
- wifi-utils
- graphql-ws-client
- esp-web-server
- aurora-ble-client

## Troubleshooting

### Display shows "Configure WiFi"
Connect to the device's AP and configure WiFi credentials.

### Display shows "Configure API key"
1. Go to Boardsesh web app
2. Register a controller device
3. Copy the API key to device config

### Display shows "Configure session"
Set the `session_id` to a valid party session ID.

### QR code not showing
The QR code only appears when there's a current climb with a valid UUID.

### BLE not connecting
- Ensure `ble_proxy_enabled` is true
- Check that the board is powered and not connected to another device
- Try clearing `ble_board_address` to force a new scan
