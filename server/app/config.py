import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    allowed_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"])
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "mtg_app"
    db_user: str = "postgres"
    db_password: str = "postgres"
    jwt_secret_key: str = "changeme"
    jwt_algorithm: str = "HS256"

    @field_validator("allowed_hosts", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, value: object) -> object:
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []

            if raw.startswith("["):
                return json.loads(raw)

            return [host.strip() for host in raw.split(",") if host.strip()]

        return value

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    def validate_production_settings(self) -> None:
        if not self.is_production:
            return

        if self.db_password == "postgres":
            raise ValueError("DB_PASSWORD must not use the default value in production")
        if self.jwt_secret_key == "changeme":
            raise ValueError("JWT_SECRET_KEY must not use the default value in production")
        if not self.allowed_hosts:
            raise ValueError("ALLOWED_HOSTS must be configured in production")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        enable_decoding=False,
    )


settings = Settings()
