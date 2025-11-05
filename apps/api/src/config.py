import os
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Flask
    FLASK_ENV: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@postgres:5432/deepseek_ocr"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # CORS
    WEB_HOST: str = "http://localhost:3000"
    
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Prometheus
    METRICS_ENABLED: bool = True
    
    class Config:
        env_file = ".env"


settings = Settings()
