from flask import Flask
from flask_cors import CORS

import models  # noqa: F401  (registers models with SQLAlchemy)
from config import Config
from extensions import db
from routes import api_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json.ensure_ascii = False

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(api_bp, url_prefix="/api")
    return app


app = create_app()


@app.cli.command("init-db")
def init_db_command():
    """Create all database tables defined in models.py."""
    db.create_all()
    print("Database tables created.")


@app.cli.command("seed-users")
def seed_users_command():
    """Create the built-in admin and demo accounts."""
    from seed_users import seed_users

    created = seed_users()
    print(f"Demo accounts ready, created {created} new users.")


if __name__ == "__main__":
    app.run(
        host=app.config.get("HOST", "127.0.0.1"),
        port=app.config.get("PORT", 5000),
        debug=app.config.get("DEBUG", False),
    )
