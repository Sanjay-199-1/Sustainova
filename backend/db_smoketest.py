import os
from urllib.parse import urlparse

import psycopg2
from dotenv import load_dotenv


def _mask_database_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc
        if "@" in netloc:
            userinfo, hostinfo = netloc.split("@", 1)
            if ":" in userinfo:
                user, _ = userinfo.split(":", 1)
                userinfo = f"{user}:***"
            else:
                userinfo = f"{userinfo}:***"
            netloc = f"{userinfo}@{hostinfo}"
        return parsed._replace(netloc=netloc).geturl()
    except Exception:
        return "<invalid-database-url>"


def main() -> int:
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set.")
        return 2

    print(f"Trying DATABASE_URL: {_mask_database_url(database_url)}")
    try:
        conn = psycopg2.connect(database_url)
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
        conn.close()
        print(f"Success: SELECT 1 returned {result}")
        return 0
    except Exception as exc:
        print(f"Connection failed: {type(exc).__name__}: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
