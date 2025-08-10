"""
BoardSesh API client with caching
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import aiosqlite
import httpx
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "board_controller.db"
CACHE_TTL_HOURS = 24  # Cache climb data for 24 hours


class BoardSeshClient:
    """Client for BoardSesh API with SQLite caching"""
    
    def __init__(self, base_url: str = "https://www.boardsesh.com", db_path: Path = DB_PATH):
        self.base_url = base_url
        self.db_path = db_path
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def fetch_climb_details(
        self,
        board_name: str,
        layout_id: int,
        size_id: int,
        set_ids: str,
        angle: int,
        climb_uuid: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch climb details from BoardSesh API with caching
        """
        # Check cache first
        cached_data = await self._get_cached_climb(climb_uuid)
        if cached_data:
            logger.info(f"Using cached data for climb {climb_uuid}")
            return cached_data
        
        # Fetch from API
        try:
            url = f"{self.base_url}/api/v1/{board_name}/{layout_id}/{size_id}/{set_ids}/{angle}/{climb_uuid}"
            logger.info(f"Fetching climb from BoardSesh: {url}")
            
            response = await self.client.get(url)
            response.raise_for_status()
            
            climb_data = response.json()
            
            # Cache the response
            await self._cache_climb(climb_uuid, board_name, climb_data)
            
            return climb_data
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch climb {climb_uuid}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching climb {climb_uuid}: {e}")
            return None
    
    async def search_climbs(
        self,
        board_name: str,
        layout_id: int,
        size_id: int,
        set_ids: str,
        angle: int,
        filters: Optional[Dict[str, Any]] = None
    ) -> Optional[list]:
        """
        Search for climbs on BoardSesh
        """
        try:
            url = f"{self.base_url}/api/v1/{board_name}/{layout_id}/{size_id}/{set_ids}/{angle}/search"
            logger.info(f"Searching climbs on BoardSesh: {url}")
            
            # Prepare search parameters
            params = filters or {}
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            return response.json()
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to search climbs: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error searching climbs: {e}")
            return None
    
    async def get_board_details(
        self,
        board_name: str,
        layout_id: int,
        size_id: int,
        set_ids: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get board configuration details
        """
        try:
            url = f"{self.base_url}/api/v1/{board_name}/{layout_id}/{size_id}/{set_ids}/details"
            logger.info(f"Fetching board details from BoardSesh: {url}")
            
            response = await self.client.get(url)
            response.raise_for_status()
            
            return response.json()
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch board details: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching board details: {e}")
            return None
    
    async def get_layouts(self, board_name: str) -> Optional[list]:
        """
        Get available layouts for a board
        """
        try:
            url = f"{self.base_url}/api/v1/{board_name}/layouts"
            response = await self.client.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch layouts: {e}")
            return None
    
    async def get_sizes(self, board_name: str, layout_id: int) -> Optional[list]:
        """
        Get available sizes for a board layout
        """
        try:
            url = f"{self.base_url}/api/v1/{board_name}/{layout_id}/sizes"
            response = await self.client.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch sizes: {e}")
            return None
    
    async def get_sets(self, board_name: str, layout_id: int, size_id: int) -> Optional[list]:
        """
        Get available sets for a board configuration
        """
        try:
            url = f"{self.base_url}/api/v1/{board_name}/{layout_id}/{size_id}/sets"
            response = await self.client.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch sets: {e}")
            return None
    
    async def _get_cached_climb(self, climb_uuid: str) -> Optional[Dict[str, Any]]:
        """
        Get climb from cache if it exists and is fresh
        """
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute(
                    'SELECT data_json, cached_at FROM climb_cache WHERE climb_uuid = ?',
                    (climb_uuid,)
                )
                row = await cursor.fetchone()
                
                if row:
                    # Check if cache is still valid
                    cached_at = datetime.fromisoformat(row['cached_at'])
                    if datetime.now() - cached_at < timedelta(hours=CACHE_TTL_HOURS):
                        return json.loads(row['data_json'])
                    else:
                        # Cache expired, delete it
                        await db.execute('DELETE FROM climb_cache WHERE climb_uuid = ?', (climb_uuid,))
                        await db.commit()
                
                return None
                
        except Exception as e:
            logger.error(f"Error reading from cache: {e}")
            return None
    
    async def _cache_climb(self, climb_uuid: str, board_name: str, data: Dict[str, Any]):
        """
        Cache climb data in SQLite
        """
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    '''INSERT OR REPLACE INTO climb_cache 
                       (climb_uuid, board_name, data_json, cached_at)
                       VALUES (?, ?, ?, ?)''',
                    (climb_uuid, board_name, json.dumps(data), datetime.now().isoformat())
                )
                await db.commit()
                logger.info(f"Cached climb data for {climb_uuid}")
                
        except Exception as e:
            logger.error(f"Error caching climb data: {e}")
    
    async def clear_expired_cache(self):
        """
        Clear expired cache entries
        """
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cutoff_time = (datetime.now() - timedelta(hours=CACHE_TTL_HOURS)).isoformat()
                await db.execute(
                    'DELETE FROM climb_cache WHERE cached_at < ?',
                    (cutoff_time,)
                )
                await db.commit()
                logger.info("Cleared expired cache entries")
                
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
    
    async def close(self):
        """
        Close the HTTP client
        """
        await self.client.aclose()