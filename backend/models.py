from extensions import db, utcnow


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum("user", "admin", name="user_role"),
        nullable=False,
        default="user",
    )
    nickname = db.Column(db.String(50), nullable=False, default="")
    email = db.Column(db.String(120), unique=True, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    favorites = db.relationship(
        "Favorite", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User id={self.id} username={self.username!r}>"


class House(TimestampMixin, db.Model):
    __tablename__ = "houses"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(50), nullable=False, default="", index=True)
    district = db.Column(db.String(50), nullable=True, index=True)
    community = db.Column(db.String(120), nullable=True)
    price_total = db.Column(db.Numeric(12, 2), nullable=False, index=True)
    price_per_sqm = db.Column(db.Numeric(10, 2), nullable=True)
    area = db.Column(db.Numeric(8, 2), nullable=True, index=True)
    rooms = db.Column(db.SmallInteger, nullable=True)
    halls = db.Column(db.SmallInteger, nullable=True)
    bathrooms = db.Column(db.SmallInteger, nullable=True)
    orientation = db.Column(db.String(20), nullable=True)
    floor = db.Column(db.String(50), nullable=True)
    building_type = db.Column(db.String(30), nullable=True)
    decoration = db.Column(db.String(30), nullable=True)
    followers_count = db.Column(db.Integer, nullable=True)
    listing_days = db.Column(db.Integer, nullable=True)
    tags = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    source = db.Column(db.String(50), nullable=True)
    source_url = db.Column(db.String(512), unique=True, nullable=True)
    published_at = db.Column(db.DateTime, nullable=True)

    price_records = db.relationship(
        "HousePriceRecord",
        back_populates="house",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<House id={self.id} title={self.title!r}>"


class HousePriceRecord(db.Model):
    __tablename__ = "house_price_records"
    __table_args__ = (
        db.Index("ix_house_price_record_time", "house_id", "recorded_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    house_id = db.Column(
        db.Integer, db.ForeignKey("houses.id", ondelete="CASCADE"), nullable=False
    )
    price_total = db.Column(db.Numeric(12, 2), nullable=False)
    price_per_sqm = db.Column(db.Numeric(10, 2), nullable=True)
    recorded_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    house = db.relationship("House", back_populates="price_records")

    def __repr__(self):
        return f"<HousePriceRecord id={self.id} house_id={self.house_id}>"


class Favorite(db.Model):
    __tablename__ = "favorites"
    __table_args__ = (
        db.UniqueConstraint("user_id", "house_id", name="uq_favorite_user_house"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    house_id = db.Column(
        db.Integer, db.ForeignKey("houses.id", ondelete="CASCADE"), nullable=False
    )
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="favorites")
    house = db.relationship("House")

    def __repr__(self):
        return f"<Favorite id={self.id} user_id={self.user_id} house_id={self.house_id}>"


class Announcement(TimestampMixin, db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    published_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<Announcement id={self.id} title={self.title!r}>"


class CrawlRun(db.Model):
    __tablename__ = "crawl_runs"

    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(50), nullable=False)
    status = db.Column(
        db.Enum("running", "success", "failed", "partial", name="crawl_status"),
        nullable=False,
        default="running",
    )
    started_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    finished_at = db.Column(db.DateTime, nullable=True)
    total_found = db.Column(db.Integer, nullable=False, default=0)
    total_imported = db.Column(db.Integer, nullable=False, default=0)
    error_message = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<CrawlRun id={self.id} source={self.source!r} status={self.status!r}>"
