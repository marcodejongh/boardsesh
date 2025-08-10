#!/usr/bin/env python3
"""
Board Controller - Unified server for Bluetooth and Web control
Usage: python main.py [--no-bluetooth] [--port 8000] [--host 0.0.0.0]
"""

import asyncio
import argparse
import json
import logging
import os
import sys
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import aiosqlite
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path(__file__).parent / "board_controller.db"
STATIC_PATH = Path(__file__).parent / "static"


class DatabaseManager:
    """Manages SQLite database operations"""
    
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        
    async def init_database(self):
        """Initialize database tables"""
        async with aiosqlite.connect(self.db_path) as db:
            # Sessions table
            await db.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    controller_id TEXT UNIQUE NOT NULL,
                    board_name TEXT,
                    layout_id INTEGER,
                    size_id INTEGER,
                    set_ids TEXT,
                    angle INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Queue items table
            await db.execute('''
                CREATE TABLE IF NOT EXISTS queue_items (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    climb_uuid TEXT NOT NULL,
                    climb_name TEXT,
                    climb_grade TEXT,
                    added_by TEXT,
                    position INTEGER NOT NULL,
                    is_current BOOLEAN DEFAULT 0,
                    is_suggested BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )
            ''')
            
            # Climb cache table
            await db.execute('''
                CREATE TABLE IF NOT EXISTS climb_cache (
                    climb_uuid TEXT PRIMARY KEY,
                    board_name TEXT,
                    data_json TEXT NOT NULL,
                    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes
            await db.execute('CREATE INDEX IF NOT EXISTS idx_queue_session ON queue_items(session_id, position)')
            await db.execute('CREATE INDEX IF NOT EXISTS idx_queue_current ON queue_items(session_id, is_current)')
            await db.execute('CREATE INDEX IF NOT EXISTS idx_cache_time ON climb_cache(cached_at)')
            
            await db.commit()
            logger.info(f"Database initialized at {self.db_path}")
    
    async def create_session(self, controller_id: str) -> str:
        """Create a new session"""
        session_id = str(uuid.uuid4())
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'INSERT OR REPLACE INTO sessions (id, controller_id) VALUES (?, ?)',
                (session_id, controller_id)
            )
            await db.commit()
        return session_id
    
    async def cache_climb_data(self, climb_uuid: str, climb_data: dict, board_name: str = "unknown"):
        """Cache full climb data for later reconstruction"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                '''INSERT OR REPLACE INTO climb_cache (climb_uuid, board_name, data_json)
                   VALUES (?, ?, ?)''',
                (climb_uuid, board_name, json.dumps(climb_data))
            )
            await db.commit()
    
    async def get_queue(self, session_id: str) -> tuple[List[dict], dict]:
        """Get queue items and current climb for a session with full climb data"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                '''SELECT qi.*, cc.data_json as climb_data
                   FROM queue_items qi
                   LEFT JOIN climb_cache cc ON qi.climb_uuid = cc.climb_uuid
                   WHERE qi.session_id = ? 
                   ORDER BY qi.position''',
                (session_id,)
            )
            rows = await cursor.fetchall()
            
            # Reconstruct queue items with full climb data
            queue_items = []
            current_climb_item = None
            
            for row in rows:
                row_dict = dict(row)
                
                # Try to get climb data from cache
                climb_data = None
                if row_dict.get('climb_data'):
                    try:
                        climb_data = json.loads(row_dict['climb_data'])
                    except:
                        pass
                
                # If no cached climb data, create minimal climb object
                if not climb_data:
                    climb_data = {
                        'uuid': row_dict['climb_uuid'],
                        'name': row_dict.get('climb_name', 'Unknown'),
                        'difficulty': row_dict.get('climb_grade', ''),
                        'angle': 40  # Default angle, could be made configurable
                    }
                
                # Reconstruct the queue item in the expected format
                queue_item = {
                    'uuid': row_dict['id'],
                    'climb': climb_data,
                    'addedBy': row_dict.get('added_by', 'unknown'),
                    'suggested': bool(row_dict.get('is_suggested', False))
                }
                
                queue_items.append(queue_item)
                
                # Track current climb
                if row_dict.get('is_current'):
                    current_climb_item = queue_item
            
            return queue_items, current_climb_item
    
    async def add_queue_item(self, session_id: str, item: dict) -> dict:
        """Add item to queue"""
        item_id = str(uuid.uuid4())
        async with aiosqlite.connect(self.db_path) as db:
            # Get next position
            cursor = await db.execute(
                'SELECT MAX(position) as max_pos FROM queue_items WHERE session_id = ?',
                (session_id,)
            )
            row = await cursor.fetchone()
            position = (row[0] + 1) if row[0] is not None else 0
            
            # Insert item
            await db.execute(
                '''INSERT INTO queue_items 
                   (id, session_id, climb_uuid, climb_name, climb_grade, added_by, position)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (item_id, session_id, item['climb_uuid'], item.get('climb_name'),
                 item.get('climb_grade'), item.get('added_by'), position)
            )
            await db.commit()
            
        return {'id': item_id, 'position': position, **item}
    
    async def remove_queue_item(self, session_id: str, item_uuid: str):
        """Remove item from queue and reorder"""
        async with aiosqlite.connect(self.db_path) as db:
            # Get position of item to remove
            cursor = await db.execute(
                'SELECT position FROM queue_items WHERE session_id = ? AND id = ?',
                (session_id, item_uuid)
            )
            row = await cursor.fetchone()
            if row:
                position = row[0]
                # Delete item
                await db.execute(
                    'DELETE FROM queue_items WHERE session_id = ? AND id = ?',
                    (session_id, item_uuid)
                )
                # Update positions
                await db.execute(
                    '''UPDATE queue_items 
                       SET position = position - 1 
                       WHERE session_id = ? AND position > ?''',
                    (session_id, position)
                )
                await db.commit()
    
    async def set_current_climb(self, session_id: str, item_uuid: str):
        """Set the current climb"""
        async with aiosqlite.connect(self.db_path) as db:
            # Clear current flags
            await db.execute(
                'UPDATE queue_items SET is_current = 0 WHERE session_id = ?',
                (session_id,)
            )
            # Set new current
            await db.execute(
                'UPDATE queue_items SET is_current = 1 WHERE session_id = ? AND id = ?',
                (session_id, item_uuid)
            )
            await db.commit()
    
    async def set_current_climb_by_climb_uuid(self, session_id: str, climb_uuid: str):
        """Set the current climb by climb UUID (finds existing queue item)"""
        async with aiosqlite.connect(self.db_path) as db:
            # Clear current flags
            await db.execute(
                'UPDATE queue_items SET is_current = 0 WHERE session_id = ?',
                (session_id,)
            )
            # Set new current by climb UUID
            await db.execute(
                'UPDATE queue_items SET is_current = 1 WHERE session_id = ? AND climb_uuid = ?',
                (session_id, climb_uuid)
            )
            await db.commit()


class WebSocketManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_info: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_info[websocket] = {
            'session_id': session_id,
            'connected_at': datetime.now()
        }
        logger.info(f"WebSocket connected for session {session_id}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            info = self.connection_info.pop(websocket, {})
            logger.info(f"WebSocket disconnected for session {info.get('session_id')}")
    
    async def broadcast(self, message: dict, session_id: Optional[str] = None, exclude: Optional[WebSocket] = None):
        """Broadcast message to all or specific session connections, optionally excluding sender"""
        for connection in self.active_connections:
            if exclude and connection == exclude:
                continue  # Skip the excluded connection (sender)
            
            conn_info = self.connection_info.get(connection, {})
            if session_id is None or conn_info.get('session_id') == session_id:
                try:
                    await connection.send_json(message)
                except:
                    # Connection might be closed
                    pass
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")
            logger.error(f"Message was: {message}")


class BluetoothManager:
    """Manages Bluetooth controller integration"""
    
    def __init__(self, db_manager: DatabaseManager, ws_manager: WebSocketManager, session_id: str = None):
        self.db_manager = db_manager
        self.ws_manager = ws_manager
        self.session_id = session_id
        self.bluetooth_controller = None
        self.bluetooth_enabled = False
    
    def set_session_id(self, session_id: str):
        """Set the session ID for queue operations"""
        self.session_id = session_id
    
    def start_bluetooth(self):
        """Start Bluetooth controller in background thread"""
        try:
            from bluetooth_controller import BluetoothController
            
            # Create callback for LED updates
            def handle_led_update(led_data: list, inferred_climb_uuid: str = None):
                """Handle LED updates from Bluetooth"""
                if inferred_climb_uuid and self.session_id:
                    # Update current climb in database
                    asyncio.create_task(self._update_current_climb(inferred_climb_uuid))
                
                # Broadcast LED update to WebSocket clients
                asyncio.create_task(self._broadcast_bluetooth_update(led_data, inferred_climb_uuid))
            
            # Initialize and start Bluetooth controller
            self.bluetooth_controller = BluetoothController(queue_callback=handle_led_update)
            self.bluetooth_controller.start()
            self.bluetooth_enabled = True
            logger.info("Bluetooth controller started successfully")
            
        except ImportError:
            logger.warning("Bluetooth controller module not found, running in web-only mode")
        except Exception as e:
            logger.error(f"Failed to start Bluetooth controller: {e}")
    
    async def _update_current_climb(self, climb_uuid: str):
        """Update current climb in database"""
        try:
            if self.session_id:
                await self.db_manager.set_current_climb(self.session_id, climb_uuid)
        except Exception as e:
            logger.error(f"Failed to update current climb: {e}")
    
    async def _broadcast_bluetooth_update(self, led_data: list, climb_uuid: str = None):
        """Broadcast Bluetooth update to WebSocket clients"""
        try:
            message = {
                "type": "bluetooth-update",
                "ledData": led_data,
                "inferredClimb": climb_uuid,
                "source": "bluetooth"
            }
            await self.ws_manager.broadcast(message, self.session_id)
        except Exception as e:
            logger.error(f"Failed to broadcast Bluetooth update: {e}")


class BoardController:
    """Main application controller"""
    
    def __init__(self, no_bluetooth: bool = False):
        self.app = FastAPI(title="Board Controller", version="1.0.0")
        self.controller_id = str(uuid.uuid4())
        self.session_id = None
        
        # Initialize managers
        self.db_manager = DatabaseManager()
        self.ws_manager = WebSocketManager()
        self.bluetooth_manager = BluetoothManager(self.db_manager, self.ws_manager)
        
        # Setup
        self._setup_middleware()
        self._setup_routes()
        
        # Start Bluetooth if enabled
        if not no_bluetooth:
            self.bluetooth_manager.start_bluetooth()
    
    def _setup_middleware(self):
        """Configure CORS and other middleware"""
        # Define allowed origins
        allowed_origins = [
            "https://www.boardsesh.com",
            "http://localhost:3000",
            "http://localhost:3001",  # Vite dev server
            "http://localhost:8000",  # Self-hosted frontend
        ]
        
        # Add local network origins for Raspberry Pi deployment
        # This allows access from any device on the local network
        import socket
        try:
            # Get local IP address
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            allowed_origins.extend([
                f"http://{local_ip}:8000",
                f"http://{local_ip}:3000",
                f"http://{local_ip}:3001",
            ])
            logger.info(f"Added local network origins for IP: {local_ip}")
        except Exception as e:
            logger.warning(f"Could not determine local IP: {e}")
        
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.on_event("startup")
        async def startup_event():
            """Initialize database on startup"""
            await self.db_manager.init_database()
            self.session_id = await self.db_manager.create_session(self.controller_id)
            self.bluetooth_manager.set_session_id(self.session_id)
            logger.info(f"Controller started with ID: {self.controller_id}")
            logger.info(f"Session ID: {self.session_id}")
        
        @self.app.get("/api/session")
        async def get_session():
            """Get current session info"""
            return {
                "sessionId": self.session_id,
                "controllerId": self.controller_id,
                "bluetoothEnabled": self.bluetooth_manager.bluetooth_enabled
            }
        
        @self.app.get("/api/queue")
        async def get_queue():
            """Get current queue"""
            queue, current_climb = await self.db_manager.get_queue(self.session_id)
            return {
                "queue": queue,
                "currentClimbQueueItem": current_climb
            }
        
        @self.app.post("/api/queue/add")
        async def add_to_queue(item: dict):
            """Add item to queue"""
            result = await self.db_manager.add_queue_item(self.session_id, item)
            
            # Broadcast update
            await self.ws_manager.broadcast({
                "type": "add-queue-item",
                "item": result
            }, self.session_id)
            
            return result
        
        @self.app.delete("/api/queue/{item_uuid}")
        async def remove_from_queue(item_uuid: str):
            """Remove item from queue"""
            await self.db_manager.remove_queue_item(self.session_id, item_uuid)
            
            # Broadcast update
            await self.ws_manager.broadcast({
                "type": "remove-queue-item",
                "uuid": item_uuid
            }, self.session_id)
            
            return {"status": "removed"}
        
        @self.app.post("/api/queue/current/{item_uuid}")
        async def set_current_climb(item_uuid: str):
            """Set current climb"""
            await self.db_manager.set_current_climb(self.session_id, item_uuid)
            
            # Broadcast update
            await self.ws_manager.broadcast({
                "type": "update-current-climb",
                "uuid": item_uuid
            }, self.session_id)
            
            return {"status": "updated"}
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for real-time updates"""
            # Check origin for security (WebSocket equivalent of CORS)
            origin = websocket.headers.get("origin")
            allowed_origins = [
                "https://www.boardsesh.com",
                "http://localhost:3000",
                "http://localhost:3001",  # Vite dev server
                "http://localhost:8000",  # Self-hosted
                f"http://{websocket.url.hostname}:8000",  # Same-origin
                f"http://{websocket.url.hostname}:3001",  # Frontend dev
            ]
            
            # Add local network origins (same as CORS middleware)
            try:
                import socket
                hostname = socket.gethostname()
                local_ip = socket.gethostbyname(hostname)
                allowed_origins.extend([
                    f"http://{local_ip}:8000",
                    f"http://{local_ip}:3000", 
                    f"http://{local_ip}:3001",
                ])
            except Exception:
                pass  # Silently fail, we have other allowed origins
            
            # Allow local network access (for Raspberry Pi deployment)
            if origin and any(origin.startswith(allowed) for allowed in allowed_origins):
                logger.info(f"WebSocket connection from allowed origin: {origin}")
            elif not origin:
                # Allow connections without origin header (e.g., mobile apps, direct connections)
                logger.info("WebSocket connection without origin header - allowing")
            else:
                logger.warning(f"WebSocket connection from disallowed origin: {origin}")
                await websocket.close(code=1008, reason="Origin not allowed")
                return
            
            await self.ws_manager.connect(websocket, self.session_id)
            
            try:
                logger.info(f"WebSocket handshake starting for session {self.session_id}")
                
                # Send initial handshake
                handshake_message = {
                    "type": "controller-handshake",
                    "sessionId": self.session_id,
                    "controllerId": self.controller_id,
                    "version": "1.0",
                    "capabilities": ["queue", "bluetooth", "persistence"]
                }
                await self.ws_manager.send_personal_message(handshake_message, websocket)
                logger.info(f"Sent handshake: {handshake_message}")
                
                # Send current queue state using the same format as PeerJS
                queue, current_climb = await self.db_manager.get_queue(self.session_id)
                queue_message = {
                    "type": "initial-queue-data",
                    "queue": queue,
                    "currentClimbQueueItem": current_climb
                }
                await self.ws_manager.send_personal_message(queue_message, websocket)
                logger.info(f"Sent queue state: {len(queue)} items, current: {current_climb['climb']['name'] if current_climb else 'None'}")
                
                # Handle incoming messages
                while True:
                    data = await websocket.receive_json()
                    logger.info(f"Received WebSocket message: {data}")
                    await self._handle_websocket_message(data, websocket)
                    
            except WebSocketDisconnect:
                self.ws_manager.disconnect(websocket)
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                self.ws_manager.disconnect(websocket)
        
        # Proxy BoardSesh API requests
        @self.app.get("/api/boardsesh/climb/{climb_uuid}")
        async def proxy_climb_details(climb_uuid: str):
            """Proxy climb details from BoardSesh API"""
            # TODO: Implement actual API call with caching
            return {"uuid": climb_uuid, "name": "Test Climb", "grade": "V5"}
        
        # Root endpoint - redirect to BoardSesh with controller URL
        @self.app.get("/")
        async def root(request: Request):
            from fastapi.responses import RedirectResponse
            import urllib.parse
            
            # Get the request host to build controller URL  
            host = request.url.hostname or "localhost"
            port = request.url.port or 8000
            controller_url = f"http://{host}:{port}"
            encoded_controller_url = urllib.parse.quote(controller_url, safe='')
            
            # Default board configuration (can be made configurable later)
            boardsesh_url = f"https://www.boardsesh.com/kilter/original/12x12/screw_bolt/40/list?controllerUrl={encoded_controller_url}"
            
            return RedirectResponse(url=boardsesh_url, status_code=302)
        
        # No static files needed - we redirect to BoardSesh
    
    async def _handle_websocket_message(self, data: dict, websocket: WebSocket):
        """Handle incoming WebSocket messages"""
        msg_type = data.get("type")
        
        if msg_type == "new-connection":
            # Send current queue state to new connection (mimics PeerJS behavior)
            queue, current_climb = await self.db_manager.get_queue(self.session_id)
            await self.ws_manager.send_personal_message({
                "type": "initial-queue-data",
                "queue": queue,
                "currentClimbQueueItem": current_climb,
                "source": self.controller_id
            }, websocket)
        
        elif msg_type == "controller-takeover":
            # BoardSesh is acknowledging controller takeover
            await self.ws_manager.broadcast({
                "type": "controller-active",
                "sessionId": self.session_id
            })
        
        elif msg_type in ["add-queue-item", "remove-queue-item", "update-current-climb"]:
            # Queue operations from BoardSesh
            # Update database and broadcast to other connections
            if msg_type == "add-queue-item":
                item_data = data.get("item", {})
                # Extract climb data from nested structure
                climb_data = item_data.get("climb", {})
                
                # Cache the full climb data
                if climb_data.get("uuid"):
                    await self.db_manager.cache_climb_data(
                        climb_data["uuid"], 
                        climb_data, 
                        "kilter"  # TODO: Make board name configurable
                    )
                
                db_item = {
                    "climb_uuid": climb_data.get("uuid"),
                    "climb_name": climb_data.get("name"),
                    "climb_grade": climb_data.get("difficulty"),
                    "added_by": item_data.get("addedBy"),
                    "is_suggested": item_data.get("suggested", False)
                }
                result = await self.db_manager.add_queue_item(self.session_id, db_item)
                # Don't broadcast back to sender to avoid duplicates
                await self.ws_manager.broadcast({
                    "type": "add-queue-item",
                    "item": result
                }, self.session_id, exclude=websocket)
            
            elif msg_type == "remove-queue-item":
                await self.db_manager.remove_queue_item(self.session_id, data.get("uuid"))
                await self.ws_manager.broadcast(data, self.session_id, exclude=websocket)
            
            elif msg_type == "update-current-climb":
                # Extract climb data and use climb UUID to find existing queue item
                item_data = data.get("item", {})
                climb_data = item_data.get("climb", {})
                climb_uuid = climb_data.get("uuid")
                
                if not climb_uuid:
                    logger.error("update-current-climb message missing climb UUID")
                    return
                
                # Cache climb data if available
                if climb_data.get("uuid"):
                    await self.db_manager.cache_climb_data(
                        climb_data["uuid"], 
                        climb_data, 
                        "kilter"  # TODO: Make board name configurable
                    )
                
                # Use climb UUID to find and set current climb
                await self.db_manager.set_current_climb_by_climb_uuid(self.session_id, climb_uuid)
                
                # Get updated queue state and broadcast it
                queue, current_climb = await self.db_manager.get_queue(self.session_id)
                await self.ws_manager.broadcast({
                    "type": "initial-queue-data",
                    "queue": queue,
                    "currentClimbQueueItem": current_climb,
                    "source": self.controller_id
                }, self.session_id, exclude=websocket)
    
    async def run(self, host: str = "0.0.0.0", port: int = 8000):
        """Start the server"""
        config = uvicorn.Config(
            app=self.app,
            host=host,
            port=port,
            log_level="info"
        )
        server = uvicorn.Server(config)
        await server.serve()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Board Controller Server")
    parser.add_argument("--no-bluetooth", action="store_true", help="Run without Bluetooth support")
    parser.add_argument("--port", type=int, default=8000, help="Server port (default: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Server host (default: 0.0.0.0)")
    
    args = parser.parse_args()
    
    # Create and run controller
    controller = BoardController(no_bluetooth=args.no_bluetooth)
    
    try:
        asyncio.run(controller.run(host=args.host, port=args.port))
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()