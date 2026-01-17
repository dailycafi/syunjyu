"""
Centralized configuration management
All settings are read from environment variables with sensible defaults
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env files
# Priority: .env.local > .env (local overrides default)
# Check both the backend directory and parent directory for .env files
backend_dir = Path(__file__).parent
project_root = backend_dir.parent

# Load from backend directory first (for server deployment)
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir / ".env.local", override=True)

# Then load from project root (for local development)
load_dotenv(project_root / ".env", override=True)
load_dotenv(project_root / ".env.local", override=True)


class Config:
    """Configuration class that reads from environment variables"""
    
    # Model Configuration
    DEFAULT_MODEL_NAME = os.getenv("DEFAULT_MODEL_NAME", "MiniMax-M2.1")
    DEFAULT_ANALYSIS_PROVIDER = os.getenv("DEFAULT_ANALYSIS_PROVIDER", "minimax")
    DEFAULT_MODEL_PROVIDER = os.getenv("DEFAULT_MODEL_PROVIDER", "remote")
    DEFAULT_REMOTE_PROVIDER = os.getenv("DEFAULT_REMOTE_PROVIDER", "minimax")
    
    # Local model settings
    LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "local_medium")
    LOCAL_MODEL_BASE_URL = os.getenv("LOCAL_MODEL_BASE_URL", "http://127.0.0.1:1234/v1")
    
    # API Keys
    MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    
    # Server Configuration
    BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
    SYNC_SERVER_PORT = int(os.getenv("SYNC_SERVER_PORT", "8001"))
    
    # Database
    DATABASE_PATH = os.getenv("DATABASE_PATH", "database.sqlite")
    
    @classmethod
    def get_api_key(cls, provider: str) -> str:
        """Get API key for a specific provider"""
        key_map = {
            "minimax": cls.MINIMAX_API_KEY,
            "openai": cls.OPENAI_API_KEY,
            "deepseek": cls.DEEPSEEK_API_KEY,
        }
        return key_map.get(provider.lower(), "")


# Singleton instance for easy import
config = Config()
