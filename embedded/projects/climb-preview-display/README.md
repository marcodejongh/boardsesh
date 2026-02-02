# Boardsesh Climb Preview Display

Firmware for the Waveshare ESP32-S3 Touch LCD 4.3" to display climb previews from Boardsesh party sessions.

## Hardware

- **Display**: [Waveshare ESP32-S3 Touch LCD 4.3"](https://www.waveshare.com/esp32-s3-touch-lcd-4.3.htm)
  - 800x480 RGB parallel interface LCD
  - ESP32-S3 with 16MB Flash + 8MB PSRAM
  - GT911 capacitive touch controller
  - Built-in WiFi and Bluetooth

## Features

- Real-time climb preview display
- Shows climb name, angle, difficulty, and setter
- Colored hold visualization matching the web UI
- **Proxy mode compatible** - works alongside ESP32 controllers in proxy mode
- Touch screen support for future interactions
- WiFiManager for easy WiFi configuration
- Web-based configuration portal

## Setup

### 1. Prerequisites

- [PlatformIO](https://platformio.org/) (VS Code extension or CLI)
- USB-C cable for programming

### 2. Register a Controller

Before the display can receive climb updates, you need to register it as a controller:

1. Go to [boardsesh.com](https://boardsesh.com) and sign in
2. Navigate to Settings > Controllers
3. Click "Register Controller"
4. Select your board configuration (e.g., Kilter Homewall 10x12)
5. Save the generated API key

### 3. Flash the Firmware

```bash
cd embedded/projects/climb-preview-display
pio run -t upload
```

### 4. Configure the Display

After flashing, the display will start a WiFi access point:

1. Connect to the WiFi network: `Boardsesh-Preview-XXXX`
2. Open a browser and go to `192.168.4.1`
3. Configure your WiFi credentials
4. After connecting, access the display's IP address in your browser
5. Configure the following settings:
   - **API Key**: The API key from step 2
   - **Session ID**: The party session ID (from the URL when in a session)
   - **Backend Host**: `boardsesh.com` (default)
   - **Backend Port**: `443` (default)

### 5. Join a Session

1. Start a party session on boardsesh.com
2. Copy the session ID from the URL (e.g., `2cbba412-1a5f-4fda-9a32-5c5919d99079`)
3. Enter it in the display's configuration
4. The display will automatically connect and show climb previews

## Configuration

### Web Configuration

Access the display's IP address in your browser to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| `api_key` | Controller API key from boardsesh.com | (required) |
| `session_id` | Party session ID to subscribe to | (required) |
| `backend_host` | Boardsesh backend hostname | `boardsesh.com` |
| `backend_port` | Backend WebSocket port | `443` |
| `backend_path` | GraphQL endpoint path | `/graphql` |
| `brightness` | Display brightness (0-255) | `200` |

### Board Configuration

To display holds correctly, you need to configure the hold positions for your specific board setup. Edit `src/config/hold_positions.h`:

1. Set the board edges to match your configuration
2. Generate hold position data using the web app's data
3. Populate the `holdPositionCache` in `main.cpp`

For the Kilter Homewall 10x12 Full Ride configuration, the default settings should work.

## Display Layout

```
+------------------+------------------+
|                  |                  |
|    Board Area    |    Info Panel    |
|    (400x480)     |    (400x480)     |
|                  |                  |
|   [Hold Grid]    |   Climb Name     |
|                  |   Angle          |
|                  |   Difficulty     |
|                  |   Setter         |
|                  |                  |
+------------------+------------------+
```

## How It Works

1. **WiFi Connection**: The display connects to your WiFi network
2. **Backend Connection**: Establishes a WebSocket connection to boardsesh.com
3. **GraphQL Subscription**: Subscribes to `controllerEvents` for the configured session
4. **LED Updates**: Receives `LedUpdate` events when the current climb changes
5. **Display Rendering**: Converts LED commands to colored hold circles on the display

The display uses the same subscription system as the physical LED controller, so both can run simultaneously.

## Proxy Mode Compatibility

The display is fully compatible with the ESP32 controller's **proxy mode**, which allows the controller to forward LED commands to an official Kilter/Tension board via Bluetooth.

### How it works with proxy mode:

1. **ESP32 Controller (Proxy Mode)**: Connects to your official Kilter board via BLE and forwards LED commands
2. **This Display**: Subscribes to the same `controllerEvents` and renders climb previews
3. **Both devices** receive `LedUpdate` events simultaneously from the Boardsesh backend

### Typical setup with proxy mode:

```
                        ┌─────────────────┐
                        │  Boardsesh.com  │
                        │    (Backend)    │
                        └────────┬────────┘
                                 │
                    WebSocket (controllerEvents)
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────▼───────┐         ┌───────▼───────┐
            │ ESP32 Board   │         │ ESP32 Display │
            │  Controller   │         │   (this)      │
            │ (Proxy Mode)  │         │               │
            └───────┬───────┘         └───────────────┘
                    │
                 BLE
                    │
            ┌───────▼───────┐
            │ Official      │
            │ Kilter Board  │
            └───────────────┘
```

This allows you to add a preview display to your existing Kilter/Tension board without replacing the official controller.

## Troubleshooting

### Display shows "Configure WiFi"
- The display couldn't connect to WiFi
- Connect to the `Boardsesh-Preview-XXXX` WiFi and configure credentials

### Display shows "Configure API key"
- No API key is configured
- Access the web configuration and enter your API key

### Display shows "Configure session ID"
- No session ID is configured
- Enter the party session ID from boardsesh.com

### Holds not displaying correctly
- The hold position cache may not match your board configuration
- Update `hold_positions.h` with your board's data

### Connection issues
- Check that the API key is valid (not expired)
- Ensure the session ID matches an active session
- Verify WiFi connectivity

## Development

### Project Structure

```
climb-preview-display/
├── platformio.ini          # PlatformIO configuration
├── partitions.csv          # Flash partition table
├── README.md               # This file
└── src/
    ├── main.cpp            # Main application
    └── config/
        ├── display_config.h    # Display hardware configuration
        └── hold_positions.h    # Hold position data
```

### Shared Libraries

The project uses shared libraries from `embedded/libs/`:

- `climb-display`: LovyanGFX-based display driver
- `config-manager`: NVS configuration storage
- `wifi-utils`: WiFi connection management
- `graphql-ws-client`: GraphQL-over-WebSocket client
- `esp-web-server`: Configuration web server
- `log-buffer`: Logging utilities

### Building

```bash
# Build only
pio run

# Build and upload
pio run -t upload

# Monitor serial output
pio device monitor
```

## Future Enhancements

- [ ] Load board background images from SPIFFS
- [ ] Touch controls for queue navigation
- [ ] Display queue list
- [ ] Show user avatars for who added the climb
- [ ] Settings screen via touch
- [ ] OTA firmware updates

## License

MIT - See the main Boardsesh repository for details.
