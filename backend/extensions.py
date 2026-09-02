from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def utcnow():
    """Naive UTC now — drop-in replacement for the deprecated datetime.utcnow()."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
