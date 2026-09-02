from flask import request

from extensions import db
from models import User
from routes import api_bp
from utils import admin_required, clean_text, fail, ok, resolve_current_user


@api_bp.get("/admin/users")
@admin_required
def list_users():
    query = User.query
    q = clean_text(request.args.get("q"))
    role = clean_text(request.args.get("role"))
    active = request.args.get("active")
    if q:
        query = query.filter(User.username.ilike(f"%{q}%"))
    if role:
        query = query.filter(User.role == role)
    if active in ("true", "false"):
        query = query.filter(User.is_active == (active == "true"))
    users = query.order_by(User.created_at.desc()).all()
    from utils import serialize_user

    return ok({"items": [serialize_user(u) for u in users], "total": len(users)})


@api_bp.patch("/admin/users/<int:user_id>")
@admin_required
def update_user(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return fail("用户不存在", 404)
    payload = request.get_json(silent=True) or {}
    if "role" in payload:
        if payload["role"] not in ("user", "admin"):
            return fail("角色只能是 user 或 admin")
        user.role = payload["role"]
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])
    if "nickname" in payload:
        user.nickname = clean_text(payload["nickname"], 50) or user.nickname
    db.session.commit()
    from utils import serialize_user

    return ok({"user": serialize_user(user)}, "用户已更新")


@api_bp.delete("/admin/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    current = resolve_current_user()
    if current.id == user_id:
        return fail("不能删除当前登录账号")
    user = db.session.get(User, user_id)
    if user is None:
        return fail("用户不存在", 404)
    db.session.delete(user)
    db.session.commit()
    return ok({"deleted": True}, "用户已删除")


@api_bp.get("/admin/crawl-runs")
@admin_required
def list_crawl_runs():
    from models import CrawlRun

    runs = CrawlRun.query.order_by(CrawlRun.started_at.desc()).limit(20).all()
    return ok(
        {
            "items": [
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
                    "error_message": run.error_message,
                }
                for run in runs
            ]
        }
    )


@api_bp.post("/admin/crawl-runs")
@admin_required
def trigger_crawl():
    from flask import current_app

    from crawler.lianjia_spider import LianjiaSpider
    from crawler.run_crawler import save_listings

    payload = request.get_json(silent=True) or {}
    count = max(1, min(100, int(payload.get("count", 50) or 50)))
    spider = LianjiaSpider(city="nc", min_delay=1.0, max_delay=3.0)
    listings = spider.crawl(limit=count)
    imported = save_listings(
        current_app._get_current_object(), listings, source="lianjia-nc"
    )
    return ok(
        {
            "total_found": len(listings),
            "total_imported": imported,
            "source": "lianjia-nc",
        },
        "链家采集已完成",
        201,
    )
