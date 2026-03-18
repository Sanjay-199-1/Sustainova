import os

from dotenv import load_dotenv


load_dotenv()


class Settings:
    def __init__(self) -> None:
        # Database (Supabase only)
        self.DATABASE_URL: str | None = os.getenv("DATABASE_URL")
        if not self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL is required and must point to Supabase.")
        if self.DATABASE_URL.startswith("sqlite"):
            raise RuntimeError("SQLite is disabled. Use Supabase DATABASE_URL only.")
        if "pooler.supabase.com" not in self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL must use Supabase pooler hostname.")
        if ":6543" not in self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL must use port 6543.")
        if "sslmode=require" not in self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL must include sslmode=require.")
        if "psycopg2" not in self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL must use the psycopg2 driver.")

        # JWT
        self.SECRET_KEY: str = os.getenv("SECRET_KEY", "secret")
        self.ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = max(
            120,
            int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
        )

        # Redis (OTP)
        self.REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
        self.REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

        # Twilio (SMS)
        self.TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")


settings = Settings()
