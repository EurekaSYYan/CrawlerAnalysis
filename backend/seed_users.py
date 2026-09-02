"""Create the built-in demo accounts without generating mock houses."""

from werkzeug.security import generate_password_hash

from extensions import db
from models import User


def seed_users():
    created = 0
    if not User.query.filter_by(username="admin").first():
        db.session.add(
            User(
                username="admin",
                password_hash=generate_password_hash("admin123"),
                role="admin",
                nickname="系统管理员",
                email="admin@house.local",
                phone="13800000000",
            )
        )
        created += 1
    if not User.query.filter_by(username="demo").first():
        db.session.add(
            User(
                username="demo",
                password_hash=generate_password_hash("demo123"),
                role="user",
                nickname="Demo 用户",
                email="demo@house.local",
                phone="13900000000",
            )
        )
        created += 1
    db.session.commit()
    return created
