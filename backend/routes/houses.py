from flask import request

from extensions import db, utcnow
from models import Favorite, House, HousePriceRecord
from routes import api_bp
from utils import (
    admin_required,
    as_decimal,
    clean_text,
    fail,
    login_required,
    ok,
    paginate,
    resolve_current_user,
    serialize_house,
)


SORTS = {
    "price_asc": House.price_total.asc(),
    "price_desc": House.price_total.desc(),
    "area_desc": House.area.desc(),
    "newest": House.created_at.desc(),
    "followers_desc": House.followers_count.desc(),
    "listing_asc": House.listing_days.asc(),
}


def _house_query():
    query = House.query
    q = clean_text(request.args.get("q"))
    city = clean_text(request.args.get("city"))
    district = clean_text(request.args.get("district"))
    rooms = request.args.get("rooms")

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            db.or_(
                House.title.ilike(pattern),
                House.community.ilike(pattern),
                House.district.ilike(pattern),
            )
        )
    if city:
        query = query.filter(House.city == city)
    if district:
        query = query.filter(House.district == district)
    if rooms and rooms.isdigit():
        query = query.filter(House.rooms == int(rooms))
    for field, col in (
        ("min_price", House.price_total),
        ("max_price", House.price_total),
        ("min_area", House.area),
        ("max_area", House.area),
    ):
        raw = request.args.get(field)
        if raw and _is_number(raw):
            value = float(raw)
            if field.startswith("min"):
                query = query.filter(col >= value)
            else:
                query = query.filter(col <= value)
    return query


def _is_number(value):
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


@api_bp.get("/houses")
def list_houses():
    query = _house_query()
    page = max(1, int(request.args.get("page", 1) or 1))
    per_page = min(50, max(1, int(request.args.get("per_page", 12) or 12)))
    sort = request.args.get("sort", "newest")
    query = query.order_by(SORTS.get(sort, House.created_at.desc()))
    items, total = paginate(query, page, per_page)

    city_rows = (
        db.session.query(House.city, db.func.count(House.id))
        .group_by(House.city)
        .all()
    )
    district_rows = (
        db.session.query(House.district, db.func.count(House.id))
        .group_by(House.district)
        .all()
    )
    user = resolve_current_user()
    favorite_ids = set()
    if user:
        favorite_ids = {
            row.house_id
            for row in Favorite.query.filter_by(user_id=user.id).all()
        }
    houses = [
        serialize_house(house, house.id in favorite_ids) for house in items
    ]
    return ok(
        {
            "items": houses,
            "total": total,
            "page": page,
            "per_page": per_page,
            "cities": [{"name": row[0], "count": row[1]} for row in city_rows],
            "districts": [
                {"name": row[0], "count": row[1]} for row in district_rows
            ],
        }
    )


@api_bp.get("/houses/<int:house_id>")
def get_house(house_id):
    house = db.session.get(House, house_id)
    if house is None:
        return fail("房源不存在", 404)
    user = resolve_current_user()
    is_favorite = bool(
        user
        and Favorite.query.filter_by(user_id=user.id, house_id=house.id).first()
    )
    records = (
        HousePriceRecord.query.filter_by(house_id=house.id)
        .order_by(HousePriceRecord.recorded_at.asc())
        .all()
    )
    history = [
        {
            "recorded_at": row.recorded_at.isoformat(),
            "price_total": float(row.price_total),
            "price_per_sqm": float(row.price_per_sqm)
            if row.price_per_sqm is not None
            else None,
        }
        for row in records
    ]
    return ok({"house": serialize_house(house, is_favorite), "history": history})


@api_bp.get("/houses/<int:house_id>/history")
def get_house_history(house_id):
    house = db.session.get(House, house_id)
    if house is None:
        return fail("房源不存在", 404)
    records = (
        HousePriceRecord.query.filter_by(house_id=house.id)
        .order_by(HousePriceRecord.recorded_at.asc())
        .all()
    )
    return ok(
        {
            "house_id": house.id,
            "history": [
                {
                    "recorded_at": row.recorded_at.isoformat(),
                    "price_total": float(row.price_total),
                    "price_per_sqm": float(row.price_per_sqm)
                    if row.price_per_sqm is not None
                    else None,
                }
                for row in records
            ],
        }
    )


@api_bp.post("/houses/<int:house_id>/favorite")
@login_required
def add_favorite(house_id):
    user = resolve_current_user()
    house = db.session.get(House, house_id)
    if house is None:
        return fail("房源不存在", 404)
    if not Favorite.query.filter_by(user_id=user.id, house_id=house.id).first():
        db.session.add(Favorite(user_id=user.id, house_id=house.id))
        db.session.commit()
    return ok({"favorite": True}, "已收藏")


@api_bp.delete("/houses/<int:house_id>/favorite")
@login_required
def remove_favorite(house_id):
    user = resolve_current_user()
    favorite = Favorite.query.filter_by(
        user_id=user.id, house_id=house_id
    ).first()
    if favorite:
        db.session.delete(favorite)
        db.session.commit()
    return ok({"favorite": False}, "已取消收藏")


@api_bp.get("/favorites")
@login_required
def list_favorites():
    user = resolve_current_user()
    favorite_rows = Favorite.query.filter_by(user_id=user.id).all()
    houses = []
    for row in favorite_rows:
        house = db.session.get(House, row.house_id)
        if house:
            houses.append(serialize_house(house, True))
    return ok({"items": houses, "total": len(houses)})


def _apply_house_payload(house, payload):
    fields = {
        "title": "title",
        "city": "city",
        "district": "district",
        "community": "community",
        "price_total": "price_total",
        "price_per_sqm": "price_per_sqm",
        "area": "area",
        "rooms": "rooms",
        "halls": "halls",
        "bathrooms": "bathrooms",
        "orientation": "orientation",
        "floor": "floor",
        "building_type": "building_type",
        "decoration": "decoration",
        "followers_count": "followers_count",
        "listing_days": "listing_days",
        "tags": "tags",
        "image_url": "image_url",
        "source": "source",
    }
    for source_key, target in fields.items():
        if source_key not in payload:
            continue
        value = payload[source_key]
        if target in ("price_total", "price_per_sqm", "area"):
            setattr(house, target, as_decimal(value))
        elif target in (
            "rooms",
            "halls",
            "bathrooms",
            "followers_count",
            "listing_days",
        ):
            setattr(
                house,
                target,
                int(value) if value not in (None, "") else None,
            )
        elif target == "tags" and isinstance(value, list):
            house.tags = ",".join(str(t).strip() for t in value if str(t).strip())
        else:
            setattr(house, target, clean_text(value, 512))
    if house.title and house.price_per_sqm is None and house.area:
        house.price_per_sqm = house.price_total / house.area
    return house


@api_bp.post("/houses")
@admin_required
def create_house():
    payload = request.get_json(silent=True) or {}
    if not payload.get("title") or not payload.get("price_total"):
        return fail("标题和总价不能为空")
    house = House(
        title=payload["title"],
        city=payload.get("city") or "南昌",
        price_total=as_decimal(payload.get("price_total")),
        published_at=utcnow(),
    )
    _apply_house_payload(house, payload)
    db.session.add(house)
    db.session.commit()
    return ok({"house": serialize_house(house)}, "房源已创建", 201)


@api_bp.put("/houses/<int:house_id>")
@admin_required
def update_house(house_id):
    house = db.session.get(House, house_id)
    if house is None:
        return fail("房源不存在", 404)
    _apply_house_payload(house, request.get_json(silent=True) or {})
    db.session.commit()
    return ok({"house": serialize_house(house)}, "房源已更新")


@api_bp.delete("/houses/<int:house_id>")
@admin_required
def delete_house(house_id):
    house = db.session.get(House, house_id)
    if house is None:
        return fail("房源不存在", 404)
    db.session.delete(house)
    db.session.commit()
    return ok({"deleted": True}, "房源已删除")
