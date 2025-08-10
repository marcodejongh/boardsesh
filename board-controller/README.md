# Board Controller

A Python WebSocket server that enables persistent queue management and collaborative control for Kilter/Tension climbing boards. Integrates with BoardSesh.com to provide synchronized queue state across multiple devices and apps.

## Features

- **Single Entry Point**: One command starts everything
- **Bluetooth Support**: Accepts commands from Kilter/Tension mobile apps (optional)
- **WebSocket Integration**: Real-time synchronization with BoardSesh.com
- **Queue Persistence**: SQLite database maintains queue state across restarts
- **Auto-redirect**: localhost:8000 automatically redirects to BoardSesh with controller integration
- **Multi-device Support**: Control queue from both web browser and mobile apps simultaneously

## Quick Start

### Prerequisites

- Python 3.8+
- Bluetooth adapter (optional, for Bluetooth functionality)

### Installation

```bash
# Install Python dependencies
pip install fastapi uvicorn aiosqlite

# Or create requirements.txt:
echo "fastapi>=0.100.0" > requirements.txt
echo "uvicorn>=0.23.0" >> requirements.txt  
echo "aiosqlite>=0.19.0" >> requirements.txt
pip install -r requirements.txt
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
3. You'll be automatically redirected to BoardSesh with controller integration
4. The controller takes over queue management from BoardSesh
5. Add climbs to the queue - they persist across browser refreshes
6. Use both BoardSesh web interface and Kilter/Tension mobile apps

## Architecture

### Components

- **main.py**: Unified FastAPI server with WebSocket support
- **controller.py**: Original Bluetooth controller integration (optional)
- **board_controller.db**: SQLite database for queue persistence (auto-created)

### API Endpoints

- `GET /api/session` - Get session info
- `GET /api/queue` - Get current queue
- `POST /api/queue/add` - Add climb to queue
- `DELETE /api/queue/{uuid}` - Remove climb from queue
- `POST /api/queue/current/{uuid}` - Set current climb
- `WS /ws` - WebSocket for real-time updates

### WebSocket Protocol

Key message types between BoardSesh and controller:

```json
// Initial handshake from controller
{
  "type": "controller-handshake",
  "sessionId": "uuid",
  "controllerId": "uuid", 
  "capabilities": ["queue", "bluetooth", "persistence"]
}

// New connection request (triggers queue data response)
{
  "type": "new-connection",
  "source": "boardsesh-client"
}

// Queue state update
{
  "type": "initial-queue-data",
  "queue": [...],
  "currentClimbQueueItem": {...}
}

// Queue operations
{
  "type": "add-queue-item",
  "item": { "climb": {...}, "addedBy": "user", "uuid": "..." }
}

{
  "type": "update-current-climb", 
  "item": {...},
  "shouldAddToQueue": false
}
```

## Development

The server uses FastAPI with automatic reload:

```bash
# Run with auto-reload for development
python main.py --no-bluetooth

# Or use uvicorn directly
uvicorn main:BoardController().app --reload --port 8000
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
- `--ssl-cert FILE` - SSL certificate file for HTTPS/WSS
- `--ssl-key FILE` - SSL private key file for HTTPS/WSS

### SSL Setup (HTTPS/WSS Support)

When accessing the controller from HTTPS sites like boardsesh.com, you need SSL support:

**Generate development certificates:**
```bash
# Install cryptography library
pip install cryptography

# Generate self-signed certificate
python generate_cert.py --ip 192.168.1.112

# Start server with SSL
python main.py --ssl-cert server.crt --ssl-key server.key
```

**Production certificates:**
```bash
# Use Let's Encrypt or other CA
certbot certonly --standalone -d your-domain.com

# Start with real certificates  
python main.py --ssl-cert /etc/letsencrypt/live/your-domain.com/fullchain.pem \
               --ssl-key /etc/letsencrypt/live/your-domain.com/privkey.pem
```

The server automatically detects SSL and uses WSS for WebSocket connections.

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
3. For HTTPS sites, controller needs HTTPS/WSS too (see SSL Setup below)

### Database Issues

1. Check write permissions in controller directory
2. Delete `board_controller.db` to reset
3. Check disk space

## Deployment

### Raspberry Pi

```bash
# Install system dependencies
sudo apt update
sudo apt install python3-pip python3-venv

# Optional: for Bluetooth support
sudo apt install bluez python3-dbus

# Clone and setup
git clone <repo>
cd board-controller
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn aiosqlite

# Run
python main.py

# Run as service (create systemd service file)
sudo tee /etc/systemd/system/board-controller.service > /dev/null <<EOF
[Unit]
Description=Board Controller
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/board-controller
Environment=PATH=/home/pi/board-controller/venv/bin
ExecStart=/home/pi/board-controller/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable board-controller
sudo systemctl start board-controller
```

### Docker

**Option 1: Docker Compose (Recommended)**

```bash
# Run with persistent database
docker-compose up -d

# Run web-only mode (no Bluetooth)
docker-compose --profile web-only up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Option 2: Docker Run**

```bash
# Build image
docker build -t board-controller .

# Run container (basic)
docker run -p 8000:8000 board-controller

# Run with Bluetooth support (Linux only)
docker run -p 8000:8000 --privileged --net=host board-controller

# Run with persistent database
docker run -p 8000:8000 -v ./data:/app/data board-controller

# Run web-only mode
docker run -p 8000:8000 -v ./data:/app/data board-controller \
  python main.py --no-bluetooth --host 0.0.0.0
```

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

## Publishing & Distribution

### Container Registry

The Docker image is automatically built and published to GitHub Container Registry:

**Pull and run the latest version:**

```bash
# Pull latest image
docker pull ghcr.io/marcodejongh/boardsesh-board-controller:latest

# Run with Docker
docker run -p 8000:8000 -v ./data:/app/data ghcr.io/marcodejongh/boardsesh-board-controller:latest

# Or use docker-compose (recommended)
curl -O https://raw.githubusercontent.com/marcodejongh/boardsesh/main/board-controller/docker-compose.yml
docker-compose up -d
```

**Available tags:**
- `latest` - Latest stable build from main branch
- `main` - Latest build from main branch  
- `v1.0.0` - Specific version releases
- `pr-123` - Pull request builds for testing

### GitHub Releases

Create releases with pre-built assets:

```bash
# Create release with binaries for different platforms
# Include installation scripts for Raspberry Pi
# Package Docker compose files
```

### Package Managers

Consider publishing to:
- **PyPI**: `pip install board-controller`
- **Homebrew**: `brew install board-controller`  
- **APT repository**: For Debian/Ubuntu users

### One-Line Install Script

Create an install script for easy setup:

```bash
# Install script example
curl -fsSL https://raw.githubusercontent.com/user/repo/main/install.sh | bash
```

This would handle:
1. Platform detection (Raspberry Pi, Linux, macOS)
2. Dependency installation 
3. Service setup
4. Configuration prompts