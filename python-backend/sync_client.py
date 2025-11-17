"""
Sync client module
Handles synchronization with remote sync server
"""

import httpx
from typing import Dict, List, Optional
from datetime import datetime
from db import get_connection, get_setting, set_setting


class SyncError(Exception):
    """Exception raised for sync errors"""
    pass


class SyncClient:
    """Client for syncing with remote server"""

    def __init__(self, server_url: str = "http://localhost:8001"):
        self.server_url = server_url.rstrip("/")
        self.timeout = 30.0

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers from stored token"""
        token = get_setting("auth_token")
        if not token:
            raise SyncError("Not logged in. Please login first.")
        return {"Authorization": f"Bearer {token}"}

    async def register(self, email: str, password: str) -> Dict:
        """
        Register a new user account

        Args:
            email: User email
            password: User password

        Returns:
            User info and token
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.server_url}/auth/register",
                    json={"email": email, "password": password}
                )
                response.raise_for_status()
                data = response.json()

                # Store credentials locally
                set_setting("user_id", str(data["user_id"]))
                set_setting("auth_token", data["access_token"])

                return data
            except httpx.HTTPStatusError as e:
                raise SyncError(f"Registration failed: {e.response.text}")
            except Exception as e:
                raise SyncError(f"Registration error: {str(e)}")

    async def login(self, email: str, password: str) -> Dict:
        """
        Login to existing account

        Args:
            email: User email
            password: User password

        Returns:
            User info and token
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.server_url}/auth/login",
                    json={"email": email, "password": password}
                )
                response.raise_for_status()
                data = response.json()

                # Store credentials locally
                set_setting("user_id", str(data["user_id"]))
                set_setting("auth_token", data["access_token"])

                return data
            except httpx.HTTPStatusError as e:
                raise SyncError(f"Login failed: {e.response.text}")
            except Exception as e:
                raise SyncError(f"Login error: {str(e)}")

    def logout(self):
        """Logout and clear local credentials"""
        set_setting("user_id", "")
        set_setting("auth_token", "")
        set_setting("last_sync_time", "")

    async def upload_changes(self) -> Dict:
        """
        Upload local changes to server

        Returns:
            Upload result
        """
        last_sync = get_setting("last_sync_time") or "1970-01-01T00:00:00"

        # Get local changes since last sync
        conn = get_connection()
        cursor = conn.cursor()

        changes = {
            "news": [],
            "concepts": [],
            "phrases": [],
        }

        # Get updated news (starred status changes)
        cursor.execute(
            "SELECT * FROM news WHERE updated_at > ? AND deleted = 0",
            (last_sync,)
        )
        changes["news"] = [dict(row) for row in cursor.fetchall()]

        # Get updated concepts
        cursor.execute(
            "SELECT * FROM concepts WHERE updated_at > ?",
            (last_sync,)
        )
        changes["concepts"] = [dict(row) for row in cursor.fetchall()]

        # Get updated phrases
        cursor.execute(
            "SELECT * FROM phrases WHERE updated_at > ?",
            (last_sync,)
        )
        changes["phrases"] = [dict(row) for row in cursor.fetchall()]

        conn.close()

        # Upload to server
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.server_url}/sync/upload",
                    json=changes,
                    headers=self.get_auth_headers()
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise SyncError(f"Upload failed: {e.response.text}")
            except Exception as e:
                raise SyncError(f"Upload error: {str(e)}")

    async def download_changes(self) -> Dict:
        """
        Download changes from server

        Returns:
            Changes from server
        """
        last_sync = get_setting("last_sync_time") or "1970-01-01T00:00:00"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(
                    f"{self.server_url}/sync/download",
                    params={"since": last_sync},
                    headers=self.get_auth_headers()
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise SyncError(f"Download failed: {e.response.text}")
            except Exception as e:
                raise SyncError(f"Download error: {str(e)}")

    def apply_changes(self, changes: Dict):
        """
        Apply downloaded changes to local database

        Args:
            changes: Changes from server
        """
        conn = get_connection()
        cursor = conn.cursor()

        try:
            # Apply news changes (mainly starred status)
            for item in changes.get("news", []):
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO news
                    (id, title, url, summary, content_raw, source, date, starred, user_id, updated_at, deleted)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"], item["title"], item["url"], item["summary"],
                        item["content_raw"], item["source"], item["date"],
                        item["starred"], item["user_id"], item["updated_at"], item["deleted"]
                    )
                )

            # Apply concept changes
            for item in changes.get("concepts", []):
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO concepts
                    (id, news_id, term, definition, user_id, updated_at, deleted)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"], item["news_id"], item["term"], item["definition"],
                        item["user_id"], item["updated_at"], item["deleted"]
                    )
                )

            # Apply phrase changes
            for item in changes.get("phrases", []):
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO phrases
                    (id, news_id, text, note, user_id, updated_at, deleted)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"], item["news_id"], item["text"], item["note"],
                        item["user_id"], item["updated_at"], item["deleted"]
                    )
                )

            conn.commit()
        except Exception as e:
            conn.rollback()
            raise SyncError(f"Failed to apply changes: {str(e)}")
        finally:
            conn.close()

    async def sync(self) -> Dict:
        """
        Perform full bidirectional sync

        Returns:
            Sync status
        """
        try:
            # Upload local changes
            upload_result = await self.upload_changes()

            # Download remote changes
            remote_changes = await self.download_changes()

            # Apply remote changes
            self.apply_changes(remote_changes)

            # Update last sync time
            set_setting("last_sync_time", datetime.now().isoformat())

            return {
                "status": "success",
                "uploaded": upload_result.get("count", 0),
                "downloaded": sum(len(v) for v in remote_changes.values()),
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            raise SyncError(f"Sync failed: {str(e)}")

    def get_sync_status(self) -> Dict:
        """Get current sync status"""
        return {
            "logged_in": bool(get_setting("auth_token")),
            "user_id": get_setting("user_id"),
            "last_sync": get_setting("last_sync_time"),
            "auto_sync": get_setting("auto_sync_enabled") == "true",
        }
