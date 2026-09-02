from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from extensions import db
from models import User

TOKEN_MAX_AGE = 7 * 24 * 3600


def ok(data=None, message="ok", status=200):
    body = {"message": message}
    if data is not None:
        body["data"] = data
    return jsonify(body), status


def fail(message, status=400):
    return jsonify({"message": message}), status


def make_token(user):
    serializer = URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"], salt="house-demo-auth"
    )
    return serializer.dumps({"uid": user.id, "role": user.role})


def read_token(raw_token):
    serializer = URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"], salt="house-demo-auth"
    )
    try:
        return serializer.loads(raw_token, max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None


def resolve_current_user():
    if "current_user" in g:
        return g.current_user
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    payload = read_token(auth_header[7:])
    if not payload:
        return None
    user = db.session.get(User, payload.get("uid"))
    if user is None or not user.is_active:
        return None
    g.current_user = user
    return user


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = resolve_current_user()
        if user is None:
            return fail("请先登录", 401)
        g.current_user = user
        return view(*args, **kwargs)

    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = resolve_current_user()
        if user is None:
            return fail("请先登录", 401)
        if user.role != "admin":
            return fail("需要管理员权限", 403)
        g.current_user = user
        return view(*args, **kwargs)

    return wrapped


def to_float(value):
    if value is None:
        return None
    return float(value)


def clean_text(value, max_length=None):
    if value is None:
        return None
    value = str(value).strip()
    if max_length and len(value) > max_length:
        value = value[:max_length]
    return value or None


def as_decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


def serialize_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "role": user.role,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def serialize_house(house, is_favorite=False):
    tags = []
    if house.tags:
        tags = [t.strip() for t in house.tags.split(",") if t.strip()]
    return {
        "id": house.id,
        "title": house.title,
        "city": house.city,
        "district": house.district,
        "community": house.community,
        "price_total": to_float(house.price_total),
        "price_per_sqm": to_float(house.price_per_sqm),
        "area": to_float(house.area),
        "rooms": house.rooms,
        "halls": house.halls,
        "bathrooms": house.bathrooms,
        "orientation": house.orientation,
        "floor": house.floor,
        "building_type": house.building_type,
        "decoration": house.decoration,
        "followers_count": house.followers_count,
        "listing_days": house.listing_days,
        "tags": tags,
        "image_url": house.image_url,
        "source": house.source,
        "published_at": house.published_at.isoformat()
        if house.published_at
        else None,
        "is_favorite": is_favorite,
    }


def paginate(query, page, per_page):
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, total
