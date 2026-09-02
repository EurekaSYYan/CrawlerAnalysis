from flask import request
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models import User
from routes import api_bp
from utils import (
    clean_text,
    fail,
    login_required,
    make_token,
    ok,
    resolve_current_user,
    serialize_user,
)


def _valid_role(value):
    return value in ("user", "admin")


@api_bp.post("/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    username = clean_text(payload.get("username"), 50)
    password = payload.get("password") or ""
    role = payload.get("role") or "user"

    if not username or len(username) < 3:
        return fail("用户名至少需要 3 个字符")
    if len(password) < 6:
        return fail("密码至少需要 6 个字符")
    if not _valid_role(role):
        return fail("角色只能是 user 或 admin")
    if User.query.filter_by(username=username).first():
        return fail("用户名已存在", 409)

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role=role,
        nickname=clean_text(payload.get("nickname")) or username,
        email=clean_text(payload.get("email"), 120),
        phone=clean_text(payload.get("phone"), 20),
    )
    db.session.add(user)
    db.session.commit()
    return ok(
        {"token": make_token(user), "user": serialize_user(user)},
        "注册成功",
        201,
    )


@api_bp.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = clean_text(payload.get("username"), 50)
    password = payload.get("password") or ""
    user = User.query.filter_by(username=username).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return fail("用户名或密码错误", 401)
    if not user.is_active:
        return fail("账号已停用，请联系管理员", 403)
    return ok({"token": make_token(user), "user": serialize_user(user)}, "登录成功")


@api_bp.get("/auth/me")
@login_required
def me():
    return ok({"user": serialize_user(resolve_current_user())})


@api_bp.patch("/auth/me")
@login_required
def update_me():
    user = resolve_current_user()
    payload = request.get_json(silent=True) or {}
    nickname = clean_text(payload.get("nickname"), 50)
    email = clean_text(payload.get("email"), 120)
    phone = clean_text(payload.get("phone"), 20)
    if nickname:
        user.nickname = nickname
    if email:
        user.email = email
    if phone:
        user.phone = phone
    db.session.commit()
    return ok({"user": serialize_user(user)}, "资料已更新")


@api_bp.post("/auth/logout")
@login_required
def logout():
    return ok({"logged_out": True}, "已退出登录")
