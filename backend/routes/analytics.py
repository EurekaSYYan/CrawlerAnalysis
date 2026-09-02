from collections import defaultdict
from datetime import timedelta
import math
import re
from statistics import median

from extensions import db, utcnow
from models import House, HousePriceRecord
from routes import api_bp
from utils import login_required, ok, to_float

PRICE_BINS = [
    ("300万以下", 0, 3_000_000),
    ("300-500万", 3_000_000, 5_000_000),
    ("500-800万", 5_000_000, 8_000_000),
    ("800-1200万", 8_000_000, 12_000_000),
    ("1200万以上", 12_000_000, None),
]

LISTING_BINS = [
    ("7天以内", 0, 7),
    ("7-30天", 7, 30),
    ("30-90天", 30, 90),
    ("90-180天", 90, 180),
    ("180天以上", 180, None),
]

FLOOR_LEVELS = ["低楼层", "中楼层", "高楼层", "其他"]

ROOM_LABELS = {
    1: "1室",
    2: "2室",
    3: "3室",
    4: "4室",
    5: "5室及以上",
}


def _room_label(rooms):
    if not rooms:
        return "未知户型"
    return ROOM_LABELS.get(min(rooms, 5), "5室及以上")


def _price_bin(price):
    for label, lower, upper in PRICE_BINS:
        if (lower is None or price >= lower) and (
            upper is None or price < upper
        ):
            return label
    return "1200万以上"


def _listing_bin(days):
    for label, lower, upper in LISTING_BINS:
        if (lower is None or days >= lower) and (
            upper is None or days < upper
        ):
            return label
    return "180天以上"


def _floor_level(value):
    if not value:
        return "其他"
    match = re.search(r"(低|中|高)楼层", str(value))
    if match:
        return f"{match.group(1)}楼层"
    return "其他"


def _pearson(xs, ys):
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    if len(pairs) < 3:
        return None
    mean_x = sum(p[0] for p in pairs) / len(pairs)
    mean_y = sum(p[1] for p in pairs) / len(pairs)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in pairs)
    denom_x = math.sqrt(sum((x - mean_x) ** 2 for x, _ in pairs))
    denom_y = math.sqrt(sum((y - mean_y) ** 2 for _, y in pairs))
    if denom_x == 0 or denom_y == 0:
        return None
    return round(numerator / (denom_x * denom_y), 4)


def _build_attention_scatter(houses):
    points = []
    for house in houses:
        price = to_float(house.price_total)
        followers = house.followers_count
        if price is None or followers is None:
            continue
        points.append(
            {
                "id": house.id,
                "district": house.district or "未知",
                "price_total": price,
                "price_per_sqm": to_float(house.price_per_sqm),
                "followers_count": followers,
                "area": to_float(house.area),
                "listing_days": house.listing_days,
                "floor_level": _floor_level(house.floor),
            }
        )
    return points


def _build_area_price_scatter(houses):
    points = []
    for house in houses:
        area = to_float(house.area)
        price = to_float(house.price_total)
        if area is None or price is None:
            continue
        points.append(
            {
                "id": house.id,
                "district": house.district or "未知",
                "area": area,
                "price_total": price,
                "price_per_sqm": to_float(house.price_per_sqm),
                "followers_count": house.followers_count,
                "rooms": house.rooms,
                "decoration": house.decoration,
                "building_type": house.building_type,
            }
        )
    return points


def _build_building_types(houses):
    groups = defaultdict(list)
    for house in houses:
        label = house.building_type or "未知"
        per_sqm = to_float(house.price_per_sqm)
        if per_sqm is None:
            continue
        groups[label].append(
            (per_sqm, to_float(house.price_total), to_float(house.area))
        )
    result = []
    for label, values in sorted(groups.items(), key=lambda item: -len(item[1])):
        result.append(
            {
                "label": label,
                "count": len(values),
                "avg_price_per_sqm": round(
                    sum(v[0] for v in values) / len(values), 2
                ),
                "avg_price_total": round(
                    sum(v[1] or 0 for v in values) / len(values), 2
                ),
                "avg_area": round(
                    sum(v[2] or 0 for v in values) / len(values), 2
                ),
            }
        )
    return result


def _build_listing_lifecycle(houses):
    buckets = {label: [] for label, _, _ in LISTING_BINS}
    for house in houses:
        days = house.listing_days
        per_sqm = to_float(house.price_per_sqm)
        if days is None:
            continue
        buckets[_listing_bin(days)].append(
            (per_sqm, to_float(house.price_total), house.followers_count)
        )
    result = []
    for label, _, _ in LISTING_BINS:
        values = buckets[label]
        if not values:
            result.append(
                {
                    "label": label,
                    "count": 0,
                    "avg_price_per_sqm": 0,
                    "avg_price_total": 0,
                    "avg_followers": 0,
                }
            )
            continue
        per_sqm_values = [v[0] for v in values if v[0]]
        result.append(
            {
                "label": label,
                "count": len(values),
                "avg_price_per_sqm": round(
                    sum(per_sqm_values) / len(per_sqm_values)
                    if per_sqm_values
                    else 0,
                    2,
                ),
                "avg_price_total": round(
                    sum(v[1] or 0 for v in values) / len(values), 2
                ),
                "avg_followers": round(
                    sum(v[2] or 0 for v in values) / len(values), 2
                ),
            }
        )
    return result


def _build_floor_analysis(houses):
    groups = {label: [] for label in FLOOR_LEVELS}
    for house in houses:
        level = _floor_level(house.floor)
        per_sqm = to_float(house.price_per_sqm)
        if per_sqm is None:
            continue
        groups[level].append(
            (per_sqm, to_float(house.price_total), to_float(house.area))
        )
    result = []
    for label in FLOOR_LEVELS:
        values = groups[label]
        if not values:
            result.append(
                {
                    "label": label,
                    "count": 0,
                    "avg_price_per_sqm": 0,
                    "avg_price_total": 0,
                    "avg_area": 0,
                }
            )
            continue
        result.append(
            {
                "label": label,
                "count": len(values),
                "avg_price_per_sqm": round(
                    sum(v[0] for v in values) / len(values), 2
                ),
                "avg_price_total": round(
                    sum(v[1] or 0 for v in values) / len(values), 2
                ),
                "avg_area": round(
                    sum(v[2] or 0 for v in values) / len(values), 2
                ),
            }
        )
    return result


def _build_price_bins(houses):
    buckets = {label: [] for label, _, _ in PRICE_BINS}
    for house in houses:
        price = to_float(house.price_total)
        if price is None:
            continue
        buckets[_price_bin(price)].append(
            (price, to_float(house.price_per_sqm))
        )
    result = []
    for label, _, _ in PRICE_BINS:
        values = buckets[label]
        avg_price = sum(v[0] for v in values) / len(values) if values else 0
        avg_per_sqm = (
            sum(v[1] for v in values if v[1]) / len(values) if values else 0
        )
        result.append(
            {
                "label": label,
                "count": len(values),
                "avg_price_total": round(avg_price, 2),
                "avg_price_per_sqm": round(avg_per_sqm, 2),
            }
        )
    return result


def _build_room_types(houses):
    groups = defaultdict(list)
    for house in houses:
        label = _room_label(house.rooms)
        groups[label].append(
            {
                "area": to_float(house.area),
                "per_sqm": to_float(house.price_per_sqm),
                "price": to_float(house.price_total),
            }
        )
    result = []
    for label in ROOM_LABELS.values():
        values = groups.get(label, [])
        if not values:
            result.append(
                {
                    "label": label,
                    "count": 0,
                    "avg_area": 0,
                    "avg_price_total": 0,
                    "avg_price_per_sqm": 0,
                }
            )
            continue
        result.append(
            {
                "label": label,
                "count": len(values),
                "avg_area": round(
                    sum(v["area"] or 0 for v in values) / len(values), 2
                ),
                "avg_price_total": round(
                    sum(v["price"] or 0 for v in values) / len(values), 2
                ),
                "avg_price_per_sqm": round(
                    sum(v["per_sqm"] or 0 for v in values) / len(values), 2
                ),
            }
        )
    return result


def _build_districts(houses):
    groups = defaultdict(list)
    for house in houses:
        district = house.district or "未知"
        groups[district].append(
            {
                "price": to_float(house.price_total),
                "per_sqm": to_float(house.price_per_sqm),
                "area": to_float(house.area),
            }
        )
    result = []
    for district, values in sorted(groups.items()):
        prices = [v["price"] or 0 for v in values]
        per_sqm = [v["per_sqm"] for v in values if v["per_sqm"]]
        areas = [v["area"] or 0 for v in values]
        result.append(
            {
                "district": district,
                "count": len(values),
                "avg_price_total": round(sum(prices) / len(prices), 2),
                "avg_price_per_sqm": round(
                    sum(per_sqm) / len(per_sqm) if per_sqm else 0, 2
                ),
                "median_price_per_sqm": round(median(per_sqm), 2)
                if per_sqm
                else 0,
                "avg_area": round(sum(areas) / len(areas), 2),
            }
        )
    return result


def _build_heatmap(houses):
    districts = sorted({h.district for h in houses if h.district})
    room_labels = list(ROOM_LABELS.values())
    matrix = {}
    for house in houses:
        if not house.district:
            continue
        label = _room_label(house.rooms)
        per_sqm = to_float(house.price_per_sqm)
        if per_sqm is None:
            continue
        matrix[(house.district, label)] = matrix.get(
            (house.district, label), []
        ) + [per_sqm]
    data = []
    for district_index, district in enumerate(districts):
        for room_index, label in enumerate(room_labels):
            values = matrix.get((district, label), [])
            avg = sum(values) / len(values) if values else None
            data.append([room_index, district_index, avg])
    return {
        "x_labels": room_labels,
        "y_labels": districts,
        "data": data,
    }


def _build_trend():
    records = HousePriceRecord.query.filter(
        HousePriceRecord.recorded_at
        >= utcnow() - timedelta(days=540)
    ).all()
    grouped = defaultdict(list)
    for row in records:
        month = row.recorded_at.strftime("%Y-%m")
        per_sqm = to_float(row.price_per_sqm)
        if per_sqm is not None:
            grouped[month].append(per_sqm)
    result = []
    for month in sorted(grouped):
        values = grouped[month]
        result.append(
            {
                "month": month,
                "avg_price_per_sqm": round(sum(values) / len(values), 2),
                "min_price_per_sqm": round(min(values), 2),
                "max_price_per_sqm": round(max(values), 2),
                "samples": len(values),
            }
        )
    return result


def _empty_payload():
    return {
        "summary": {
            "total_houses": 0,
            "total_districts": 0,
            "avg_price_total": 0,
            "median_price_total": 0,
            "avg_price_per_sqm": 0,
            "avg_followers_count": 0,
            "avg_listing_days": 0,
            "hot_listing_ratio": 0,
            "correlation_attention_price": None,
        },
        "price_bins": [],
        "room_types": [],
        "districts": [],
        "heatmap": {"x_labels": [], "y_labels": [], "data": []},
        "trend": [],
        "attention_scatter": [],
        "area_price_scatter": [],
        "building_types": [],
        "listing_lifecycle": [],
        "floor_analysis": [],
    }


@api_bp.get("/analytics/summary")
@login_required
def analytics_summary():
    houses = House.query.all()
    if not houses:
        return ok(_empty_payload())

    prices = [to_float(h.price_total) for h in houses]
    prices = [p for p in prices if p is not None]
    per_sqm = [
        to_float(h.price_per_sqm)
        for h in houses
        if to_float(h.price_per_sqm) is not None
    ]
    followers = [h.followers_count for h in houses if h.followers_count is not None]
    listing_days = [h.listing_days for h in houses if h.listing_days is not None]
    hot_listings = sum(
        1 for h in houses if (h.followers_count or 0) >= 200
    )
    attention_price = _pearson(
        [h.followers_count for h in houses],
        [to_float(h.price_total) for h in houses],
    )
    districts = _build_districts(houses)
    return ok(
        {
            "summary": {
                "total_houses": len(houses),
                "total_districts": len(districts),
                "avg_price_total": round(sum(prices) / len(prices), 2)
                if prices
                else 0,
                "median_price_total": round(median(prices), 2)
                if prices
                else 0,
                "avg_price_per_sqm": round(sum(per_sqm) / len(per_sqm), 2)
                if per_sqm
                else 0,
                "avg_followers_count": round(
                    sum(followers) / len(followers), 2
                )
                if followers
                else 0,
                "avg_listing_days": round(
                    sum(listing_days) / len(listing_days), 2
                )
                if listing_days
                else 0,
                "hot_listing_ratio": round(hot_listings / len(houses), 4)
                if houses
                else 0,
                "correlation_attention_price": attention_price,
            },
            "price_bins": _build_price_bins(houses),
            "room_types": _build_room_types(houses),
            "districts": districts,
            "heatmap": _build_heatmap(houses),
            "trend": _build_trend(),
            "attention_scatter": _build_attention_scatter(houses),
            "area_price_scatter": _build_area_price_scatter(houses),
            "building_types": _build_building_types(houses),
            "listing_lifecycle": _build_listing_lifecycle(houses),
            "floor_analysis": _build_floor_analysis(houses),
        }
    )
