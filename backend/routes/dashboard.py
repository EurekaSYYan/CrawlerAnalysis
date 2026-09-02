from datetime import timedelta

from sqlalchemy import func

from extensions import db, utcnow
from models import Announcement, CrawlRun, Favorite, House, HousePriceRecord, User
from routes import api_bp
from utils import login_required, ok, resolve_current_user, serialize_house, to_float


def _active_announcements(limit=5):
    return (
        Announcement.query.filter_by(is_active=True)
        .order_by(Announcement.published_at.desc())
        .limit(limit)
        .all()
    )


def _announcement_dict(item):
    return {
        "id": item.id,
        "title": item.title,
        "content": item.content,
        "published_at": item.published_at.isoformat()
        if item.published_at
        else None,
    }


def _district_stats():
    rows = (
        db.session.query(
            House.district,
            func.count(House.id),
            func.avg(House.price_per_sqm),
            func.avg(House.area),
        )
        .group_by(House.district)
        .all()
    )
    return [
        {
            "district": row[0] or "未知",
            "count": row[1],
            "avg_price_per_sqm": round(float(row[2] or 0), 2),
            "avg_area": round(float(row[3] or 0), 2),
        }
        for row in rows
    ]


def _price_trend():
    records = HousePriceRecord.query.filter(
        HousePriceRecord.recorded_at >= utcnow() - timedelta(days=400)
    ).all()
    grouped = {}
    for row in records:
        month = row.recorded_at.strftime("%Y-%m")
        prices = grouped.setdefault(month, [])
        if row.price_per_sqm is not None:
            prices.append(float(row.price_per_sqm))
    return [
        {
            "month": month,
            "avg_price_per_sqm": round(sum(values) / len(values), 2),
        }
        for month, values in sorted(grouped.items())
        if values
    ]


def _latest_crawl():
    run = CrawlRun.query.order_by(CrawlRun.started_at.desc()).first()
    if run is None:
        return None
    return {
        "id": run.id,
        "source": run.source,
        "status": run.status,
        "started_at": run.started_at.isoformat(),
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "total_found": run.total_found,
        "total_imported": run.total_imported,
        "error_message": run.error_message,
    }


def _favorite_ids(user):
    return {
        row.house_id for row in Favorite.query.filter_by(user_id=user.id).all()
    }


@api_bp.get("/dashboard")
@login_required
def dashboard():
    user = resolve_current_user()
    announcements = _active_announcements()
    trend = _price_trend()
    districts = _district_stats()

    if user.role == "admin":
        user_count = User.query.count()
        house_count = House.query.count()
        favorite_count = Favorite.query.count()
        avg_price = db.session.query(func.avg(House.price_total)).scalar()
        avg_per_sqm = db.session.query(func.avg(House.price_per_sqm)).scalar()
        recent_houses = House.query.order_by(House.created_at.desc()).limit(5).all()
        crawl_runs = (
            CrawlRun.query.order_by(CrawlRun.started_at.desc()).limit(5).all()
        )
        return ok(
            {
                "role": "admin",
                "announcements": [_announcement_dict(a) for a in announcements],
                "metrics": {
                    "user_count": user_count,
                    "house_count": house_count,
                    "favorite_count": favorite_count,
                    "avg_price": round(float(avg_price or 0), 2),
                    "avg_price_per_sqm": round(float(avg_per_sqm or 0), 2),
                    "latest_crawl": _latest_crawl(),
                },
                "trend": trend,
                "districts": districts,
                "recent_houses": [
                    serialize_house(house) for house in recent_houses
                ],
                "crawl_runs": [
                    {
                        "id": run.id,
                        "source": run.source,
                        "status": run.status,
                        "started_at": run.started_at.isoformat(),
                        "finished_at": run.finished_at.isoformat()
                        if run.finished_at
                        else None,
                        "total_found": run.total_found,
                        "total_imported": run.total_imported,
                    }
                    for run in crawl_runs
                ],
            }
        )

    favorite_ids = _favorite_ids(user)
    hot_houses = (
        House.query.order_by(House.updated_at.desc(), House.price_per_sqm.desc())
        .limit(6)
        .all()
    )
    avg_price = db.session.query(func.avg(House.price_total)).scalar()
    avg_per_sqm = db.session.query(func.avg(House.price_per_sqm)).scalar()
    total_houses = House.query.count()
    return ok(
        {
            "role": "user",
            "announcements": [_announcement_dict(a) for a in announcements],
            "market": {
                "total_houses": total_houses,
                "avg_price": round(float(avg_price or 0), 2),
                "avg_price_per_sqm": round(float(avg_per_sqm or 0), 2),
                "districts": districts,
            },
            "trend": trend,
            "hot_houses": [
                serialize_house(house, house.id in favorite_ids)
                for house in hot_houses
            ],
        }
    )
