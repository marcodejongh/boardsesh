# BoardSesh Daemon

WebSocket server for BoardSesh Party Mode. Provides reliable real-time synchronization for multi-user climbing queue management.

## Quick Start with Docker

```bash
# Start the daemon with PostgreSQL
docker-compose up -d

# The daemon will be available at ws://localhost:8080
```

## Manual Setup

### Prerequisites

- Node.js 22+
- PostgreSQL 16+

### Installation

```bash
# Install dependencies
npm install

# Set up environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/boardsesh_daemon"

# Run database migrations
npm run db:migrate

# Start in development mode
npm run dev

# Or build and run in production
npm run build
npm start
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | WebSocket server port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/boardsesh_daemon` | PostgreSQL connection string |

## Network Setup

For other devices on your network to connect:

1. Find your local IP address:
   - macOS/Linux: `ifconfig` or `ip addr`
   - Windows: `ipconfig`

2. Use the daemon URL in BoardSesh: `ws://YOUR_IP:8080`

Example: `ws://192.168.1.100:8080`

## API

The daemon uses WebSocket with JSON messages. See `src/types/messages.ts` for the full protocol definition.

### Client -> Daemon Messages

- `join-session`: Join a session room
- `leave-session`: Leave current session
- `update-username`: Update display name
- `add-queue-item`: Add climb to queue
- `remove-queue-item`: Remove climb from queue
- `update-queue`: Full queue replacement
- `update-current-climb`: Set current climb
- `mirror-current-climb`: Toggle climb mirroring
- `heartbeat`: Keep-alive ping

### Daemon -> Client Messages

- `session-joined`: Confirmation with session state
- `user-joined`: New user notification
- `user-left`: User left notification
- `leader-changed`: Leader change notification
- `heartbeat-response`: Heartbeat response
- `error`: Error message

Queue operation messages are relayed to all session members.
