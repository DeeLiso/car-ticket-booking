from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    app_name: str = "Car Ticket Booking API"
    app_version: str = "1.0.0"
    environment: str = Field(default="development")  # development | test | staging | production
    debug: bool = Field(default=True)

    # Postgres in production/docker; SQLite is supported for local dev/tests.
    database_url: str = "postgresql+psycopg://booking:booking@localhost:5432/car_tickets"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_echo: bool = False

    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    bcrypt_rounds: int = 12

    # Comma-separated origin list (list typing is awkward with .env parsing).
    cors_origins_str: str = "http://localhost:5173,http://127.0.0.1:5173"
    allowed_hosts_str: str = "*"

    app_timezone: str = "Asia/Yangon"
    seat_reservation_timeout_minutes: int = 10
    booking_expiry_minutes: int = 15
    booking_fee_percent: float = Field(default=0.0, ge=0, le=100)
    cancellation_cutoff_hours: int = Field(default=2, ge=0)

    # Payments. "mock" is the development-only adapter; never enable it in production
    # without a real provider (kbzpay/wavepay/cbpay/bank_transfer).
    payment_provider: str = "mock"
    payment_mock_enabled: bool = True
    kbzpay_merchant_id: str = ""
    kbzpay_secret_key: str = ""
    wavepay_merchant_id: str = ""
    wavepay_secret_key: str = ""
    cbpay_merchant_id: str = ""
    cbpay_secret_key: str = ""
    bank_transfer_account: str = ""
    webhook_secret: str = "change-me-webhook-secret"

    ticket_single_use: bool = True
    rate_limit_per_minute: int = 120
    rate_limit_auth_per_minute: int = 10

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins_str.split(",") if o.strip()]

    @property
    def allowed_hosts(self) -> List[str]:
        return [h.strip() for h in self.allowed_hosts_str.split(",") if h.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def jwt_secret_ok(self) -> bool:
        return self.secret_key not in ("change-me-in-production", "") and len(self.secret_key) >= 32


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
