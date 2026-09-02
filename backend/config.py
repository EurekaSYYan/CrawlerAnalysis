import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    _database_url = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:root@127.0.0.1:3306/house_demo?charset=utf8mb4",
    )
    if _database_url.startswith("sqlite:///./"):
        _db_file = _database_url.replace("sqlite:///./", "", 1)
        SQLALCHEMY_DATABASE_URI = (
            f"sqlite:///{(BASE_DIR / 'instance' / _db_file).as_posix()}"
        )
    else:
        SQLALCHEMY_DATABASE_URI = _database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5000"))
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
