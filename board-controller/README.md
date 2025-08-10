# Board Controller

A unified Python server that combines Bluetooth control for Kilter/Tension boards with WebSocket integration for BoardSesh.com queue management.

## Features

- **Single Entry Point**: One command starts everything
- **Bluetooth Support**: Accepts commands from Kilter/Tension mobile apps
- **Web Integration**: Seamlessly integrates with BoardSesh.com via WebSocket
- **Queue Persistence**: SQLite database stores queue state across restarts
- **QR Code Interface**: Simple web UI with QR code for easy connection
- **API Caching**: BoardSesh API responses cached locally for performance

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+ (for building frontend)
- Bluetooth adapter (for Bluetooth functionality)

### Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Build React frontend
cd frontend
chmod +x build.sh
./build.sh
cd ..
```

### Usage

```bash
# Start the controller (with Bluetooth)
python main.py

# Start without Bluetooth (web-only mode)
python main.py --no-bluetooth

# Use custom port
python main.py --port 8080
```

### First Connection

1. Run `python main.py`
2. Open http://localhost:8000 in your browser
3. Scan the QR code with your phone
4. This opens BoardSesh with controller integration
5. The controller takes over queue management
6. Use both web interface and Kilter/Tension apps

## Architecture

### Components

- **main.py**: Unified server entry point
- **bluetooth_controller.py**: Bluetooth service wrapper
- **boardsesh_client.py**: API client with caching
- **frontend/**: React web interface
- **board_controller.db**: SQLite database (auto-created)

### API Endpoints

- `GET /api/session` - Get session info
- `GET /api/queue` - Get current queue
- `POST /api/queue/add` - Add climb to queue
- `DELETE /api/queue/{uuid}` - Remove climb from queue
- `POST /api/queue/current/{uuid}` - Set current climb
- `WS /ws` - WebSocket for real-time updates

### WebSocket Protocol

Messages sent between BoardSesh and controller:

```typescript
// Handshake
{
  "type": "controller-handshake",
  "sessionId": "uuid",
  "capabilities": ["queue", "bluetooth", "persistence"]
}

// Queue operations
{
  "type": "add-queue-item",
  "item": { /* queue item */ }
}

// Bluetooth updates
{
  "type": "bluetooth-update",
  "ledData": [...],
  "inferredClimb": "climb-uuid"
}
```

## Development

### Frontend Development

```bash
cd frontend
npm run dev  # Starts Vite dev server on port 3001
```

### Python Development

The server uses FastAPI with automatic reload:

```bash
# Install in development mode
pip install -e .

# Run with auto-reload
uvicorn main:app --reload --port 8000
```

### Database

SQLite database is created automatically with tables:
- `sessions` - Controller sessions
- `queue_items` - Queue persistence
- `climb_cache` - BoardSesh API cache

## Configuration

### Environment Variables

- `LOG_LEVEL` - Logging level (default: INFO)
- `DB_PATH` - Database file path (default: ./board_controller.db)
- `CACHE_TTL_HOURS` - API cache TTL (default: 24)

### Command Line Options

```bash
python main.py --help
```

Options:
- `--no-bluetooth` - Disable Bluetooth support
- `--port PORT` - Server port (default: 8000)
- `--host HOST` - Server host (default: 0.0.0.0)

## Troubleshooting

### Bluetooth Issues

1. Ensure Bluetooth adapter is available:
   ```bash
   bluetoothctl show
   ```

2. Check if running with proper permissions:
   ```bash
   sudo python main.py
   ```

3. For Raspberry Pi, ensure BlueZ is installed:
   ```bash
   sudo apt install bluez python3-dbus
   ```

### WebSocket Connection Issues

1. Check firewall settings
2. Ensure port 8000 is accessible
3. For HTTPS sites, controller needs HTTPS/WSS too

### Database Issues

1. Check write permissions in controller directory
2. Delete `board_controller.db` to reset
3. Check disk space

## Deployment

### Raspberry Pi

```bash
# Install system dependencies
sudo apt update
sudo apt install python3-pip bluez python3-dbus

# Clone and setup
git clone <repo>
cd board-controller
pip install -r requirements.txt
cd frontend && ./build.sh && cd ..

# Run as service (optional)
sudo cp board-controller.service /etc/systemd/system/
sudo systemctl enable board-controller
sudo systemctl start board-controller
```

### Docker

```bash
# Build image
docker build -t board-controller .

# Run container
docker run -p 8000:8000 --privileged board-controller
```

Note: `--privileged` needed for Bluetooth access.

## Integration with BoardSesh

The controller is designed to seamlessly integrate with BoardSesh.com:

1. **Detection**: BoardSesh detects `controllerUrl` parameter in URL
2. **Connection**: Establishes WebSocket connection to controller
3. **Takeover**: Controller becomes the source of truth for queue state
4. **Synchronization**: All queue changes sync through controller
5. **Fallback**: If controller disconnects, BoardSesh falls back to PeerJS

This allows users to control their climbing board through:
- BoardSesh web interface
- Kilter/Tension mobile apps
- Controller web interface

All interfaces stay synchronized through the controller's queue management.