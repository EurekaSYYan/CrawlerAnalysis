"""CLI entry point for the crawler.

Usage:
    python -m crawler.run_crawler --city nc --limit 300
"""

import argparse
import logging

from app import create_app
from extensions import db, utcnow
from models import CrawlRun, House, HousePriceRecord


def save_listings(app, listings, source="lianjia"):
    started_at = utcnow()
    with app.app_context():
        run = CrawlRun(
            source=source,
            status="running",
            started_at=started_at,
            total_found=len(listings),
        )
        db.session.add(run)
        db.session.flush()
        imported = 0
        for item in listings:
            if House.query.filter_by(source_url=item["source_url"]).first():
                continue
            house = House(**item)
            db.session.add(house)
            db.session.flush()
            db.session.add(
                HousePriceRecord(
                    house_id=house.id,
                    price_total=house.price_total,
                    price_per_sqm=house.price_per_sqm,
                    recorded_at=started_at,
                )
            )
            imported += 1
        run.status = "success" if imported else "partial"
        run.finished_at = utcnow()
        run.total_imported = imported
        db.session.commit()
        return imported


def main():
    parser = argparse.ArgumentParser(description="二手房源爬虫")
    parser.add_argument("--city", default="nc", help="链家城市拼音，例如 nc")
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--delay", type=float, default=1.0, help="最小请求间隔秒数")
    parser.add_argument("--delay-max", type=float, default=3.0, help="最大请求间隔秒数")
    parser.add_argument("--regions", default="", help="逗号分隔的区域 slug，默认按行政区划分")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)

    app = create_app()
    from crawler.lianjia_spider import LianjiaSpider

    regions = [r.strip() for r in args.regions.split(",") if r.strip()] or None
    spider = LianjiaSpider(
        city=args.city,
        min_delay=args.delay,
        max_delay=args.delay_max,
    )
    listings = spider.crawl(limit=args.limit, regions=regions)
    imported = save_listings(app, listings, source="lianjia")
    print(f"Found {len(listings)} listings, imported {imported}.")


if __name__ == "__main__":
    main()
