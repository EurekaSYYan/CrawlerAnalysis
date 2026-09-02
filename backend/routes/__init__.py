from flask import Blueprint


api_bp = Blueprint("api", __name__)

from routes import admin, analytics, auth, dashboard, houses  # noqa: E402,F401


@api_bp.get("/health")
def health():
    return {
        "status": "ok",
        "service": "second-hand-house-demo",
        "phase": "phase-2",
    }
