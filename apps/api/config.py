from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://localhost:5432/postgres"
    groq_api_key: str = ""
    admin_email: str = "admin@example.com"
    admin_password: str = "admin123"
    jwt_secret: str = "change-me-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Pydantic v2 settings configuration to read from a .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore" # Ignores extra environment variables not defined in the model
    )


settings = Settings()