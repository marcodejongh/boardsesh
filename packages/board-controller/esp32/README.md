# BoardSesh ESP32 Controller

ESP32-based controller that replaces the official Kilter/Tension board controller, enabling:

1. **Direct LED control from BoardSesh** - Receive climb data via WebSocket and display on WS2811 LEDs
2. **Official app compatibility** - BLE GATT server compatible with Kilter/Tension mobile apps
3. **Bluetooth-to-BoardSesh bridge** - When the official app sets a climb, it can be forwarded to your BoardSesh session

## Hardware Requirements

- ESP32-WROOM-32 or ESP32-S3
- Logic level shifter (3.3V → 5V) for WS2811 data line
- 5V power supply (sized for your LED count)
- WS2811 LED strip

## Software Requirements

- [PlatformIO](https://platformio.org/)
- VS Code with PlatformIO extension (recommended)

## Setup

### 1. Install PlatformIO

```bash
# Using pip
pip install platformio

# Or via VS Code extension
```

### 2. Build and Upload

```bash
cd packages/board-controller/esp32

# Build
pio run

# Upload to ESP32
pio run -t upload

# Monitor serial output
pio device monitor
```

### 3. Initial Configuration

On first boot, the controller starts in AP mode:

1. Connect to WiFi network: `BoardSesh-Controller`
2. Open http://192.168.4.1 in your browser
3. Configure your WiFi network
4. After connecting, note the IP address shown

### 4. BoardSesh Configuration

1. Go to BoardSesh settings and register a new controller
2. Copy the generated API key
3. Access the controller's web interface at its IP address
4. Enter the API key and session ID

## Configuration Options

| Setting | Description |
|---------|-------------|
| API Key | Your BoardSesh controller API key |
| Session ID | The BoardSesh session to connect to |
| Backend URL | WebSocket URL (default: wss://backend.boardsesh.com/graphql) |
| LED Count | Number of LEDs in your strip |
| Brightness | Global brightness (0-255) |

## Pin Configuration

| Pin | Function |
|-----|----------|
| GPIO 5 | WS2811 data (default) |

## BLE Features

The controller advertises as "Kilter Board" and implements the Nordic UART Service, making it compatible with:

- Kilter Board app
- Tension Board app
- Any app using the Aurora Climbing protocol

When the official app sends a climb via Bluetooth:
1. LEDs are updated immediately
2. (Optional) Climb data can be forwarded to your BoardSesh session

## REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Configuration web UI |
| `/api/status` | GET | Current status JSON |
| `/api/config` | POST | Update configuration |
| `/api/test-led` | POST | Run LED test pattern |
| `/api/reset` | POST | Factory reset |

## LED Test Pattern

Access via web UI or:
```bash
curl -X POST http://<controller-ip>/api/test-led
```

## Troubleshooting

### WiFi won't connect
- Press reset button for 10 seconds to enter AP mode
- Reconfigure WiFi through captive portal

### WebSocket not connecting
- Verify API key is correct
- Check session ID exists
- Ensure backend URL is correct

### LEDs not working
- Check power supply capacity
- Verify logic level shifter is connected
- Test with `/api/test-led`

### BLE not visible
- Ensure no other device is connected
- Controller only allows one BLE connection at a time

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   BoardSesh Web     │         │  Official Kilter    │
│     Frontend        │         │   Mobile App        │
└─────────┬───────────┘         └──────────┬──────────┘
          │                                │
          │ GraphQL-WS                     │ BLE (Nordic UART)
          │                                │
          ▼                                ▼
┌─────────────────────┐         ┌─────────────────────┐
│  BoardSesh Backend  │◄───────►│       ESP32         │
│  (graphql-ws)       │ WS      │  - BLE GATT Server  │
└─────────────────────┘         │  - LED Controller   │
                                └──────────┬──────────┘
                                           │ GPIO
                                           ▼
                                   ┌───────────────┐
                                   │  WS2811 LEDs  │
                                   └───────────────┘
```

## Development

### Project Structure

```
esp32/
├── platformio.ini          # PlatformIO configuration
├── src/
│   ├── main.cpp            # Entry point
│   ├── config/
│   │   ├── board_config.h  # Hardware constants
│   │   └── config_manager.* # NVS storage
│   ├── wifi/
│   │   └── wifi_manager.*  # WiFi connection
│   ├── websocket/
│   │   └── ws_client.*     # GraphQL-WS client
│   ├── bluetooth/
│   │   ├── ble_server.*    # BLE GATT server
│   │   └── aurora_protocol.* # Packet decoder
│   ├── led/
│   │   └── led_controller.* # FastLED control
│   └── web/
│       └── web_server.*    # Config web UI
└── data/                   # SPIFFS data (web assets)
```

### Adding Features

1. Create header and implementation files in appropriate directory
2. Include in `main.cpp`
3. Initialize in `setup()` function

## License

Same license as BoardSesh main project.
