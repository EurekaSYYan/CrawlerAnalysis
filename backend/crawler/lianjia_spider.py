"""Lianjia Nanchang second-hand house spider (academic demo, low frequency).

Design notes from the referenced CSDN article:
1. Split the crawl by administrative region so each region stays below the
   100-page pagination ceiling.
2. Rotate User-Agent headers between requests.
3. Sleep 1-3 seconds after every request, and rest 20 minutes after every
   2500 requests.

This implementation intentionally stays single-threaded, does not bypass
captchas, and stops on repeated failures.
"""

import logging
import os
import random
import re
import time
from datetime import timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from crawler.cleaner import (
    clean_orientation,
    parse_area,
    parse_price_per_sqm,
    parse_price_total,
    parse_room_plan,
)
from extensions import utcnow

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) "
    "Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]


ADMIN_REGIONS = [
    ("donghuqu", "东湖区"),
    ("xihuqu", "西湖区"),
    ("qingyunpuqu", "青云谱区"),
    ("qingshanhuqu", "青山湖区"),
    ("honggutanqu", "红谷滩区"),
    ("wanliqu", "湾里区"),
    ("xinjianqu", "新建区"),
    ("nanchangxian", "南昌县"),
    ("jinxianxian", "进贤县"),
    ("anyixian", "安义县"),
    ("gaoxinqu11", "高新区"),
    ("jingkaiqu8", "经开区"),
]


class LianjiaSpider:
    BASE_URL = "https://{city}.lianjia.com/ershoufang/{region}pg{page}/"

    def __init__(
        self,
        city="nc",
        timeout=15,
        min_delay=1.0,
        max_delay=3.0,
        max_retries=2,
        long_sleep_after=2500,
        long_sleep_seconds=1200,
    ):
        self.city = city
        self.timeout = timeout
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        self.long_sleep_after = long_sleep_after
        self.long_sleep_seconds = long_sleep_seconds
        self.session = requests.Session()
        self.request_count = 0
        self.cookie = ""
        cookie_file = Path(__file__).resolve().parents[1] / ".crawler_cookie"
        if cookie_file.exists():
            self.cookie = cookie_file.read_text(encoding="utf-8").strip()
        if not self.cookie:
            self.cookie = os.getenv("LIANJIA_COOKIE") or ""
        self.user_agent = os.getenv("LIANJIA_UA") or ""

    def _headers(self):
        headers = {
            "User-Agent": self.user_agent or random.choice(USER_AGENTS),
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,*/*;q=0.8"
            ),
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": f"https://{self.city}.lianjia.com/",
            "Connection": "keep-alive",
        }
        if self.cookie:
            return {**headers, "Cookie": self.cookie}
        return headers

    def _sleep(self):
        time.sleep(random.uniform(self.min_delay, self.max_delay))
        self.request_count += 1
        if self.request_count >= self.long_sleep_after:
            logger.info(
                "Reached %s requests, resting %s seconds",
                self.request_count,
                self.long_sleep_seconds,
            )
            time.sleep(self.long_sleep_seconds)
            self.request_count = 0

    def fetch_page(self, region="", page=1):
        url = self.BASE_URL.format(
            city=self.city,
            region=f"{region}/" if region else "",
            page=page,
        )
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self.session.get(
                    url, headers=self._headers(), timeout=self.timeout
                )
                if "clogin.lianjia.com/login" in response.url:
                    logger.error(
                        "Login required for %s; cookie expired or invalid",
                        url,
                    )
                    return None
                if response.status_code == 200:
                    self._sleep()
                    return response.text
                logger.warning(
                    "URL %s returned %s, attempt %s/%s",
                    url,
                    response.status_code,
                    attempt,
                    self.max_retries,
                )
            except requests.RequestException as exc:
                logger.warning(
                    "URL %s request failed: %s, attempt %s/%s",
                    url,
                    exc,
                    attempt,
                    self.max_retries,
                )
            time.sleep(random.uniform(1, 2) * attempt)
        return None

    def parse_page(self, html):
        soup = BeautifulSoup(html, "lxml")
        listings = []
        for card in soup.select("ul.sellListContent li"):
            listing = self._parse_card(card)
            if listing:
                listings.append(listing)
        return listings

    def _parse_card(self, card):
        node = card.select_one(".info")
        if node is None:
            return None
        title_node = node.select_one(".title a")
        position_node = node.select_one(".positionInfo")
        house_info_node = node.select_one(".houseInfo")
        total_node = node.select_one(".totalPrice span")
        unit_node = node.select_one(".unitPrice span")
        follow_info = node.select_one(".followInfo")
        if title_node is None or total_node is None:
            return None

        title = title_node.get_text(" ", strip=True)
        source_url = title_node.get("href") or ""
        position_text = (
            position_node.get_text(" ", strip=True) if position_node else ""
        )
        position_parts = [
            part.strip()
            for part in re.split(r"[-—]", position_text)
            if part.strip()
        ]
        community = position_parts[0] if position_parts else None
        district = position_parts[1] if len(position_parts) > 1 else None
        if district == "未知商圈":
            district = None

        house_text = (
            house_info_node.get_text(" ", strip=True)
            if house_info_node
            else ""
        )
        house_parts = [
            part.strip() for part in house_text.split("|") if part.strip()
        ]
        room_plan = house_parts[0] if house_parts else None
        area = parse_area(house_parts[1]) if len(house_parts) > 1 else None
        orientation = (
            clean_orientation(house_parts[2])
            if len(house_parts) > 2
            else None
        )
        decoration = house_parts[3] if len(house_parts) > 3 else None
        floor = house_parts[4] if len(house_parts) > 4 else None
        building_type = house_parts[5] if len(house_parts) > 5 else None
        if building_type == "暂无数据":
            building_type = None

        rooms, halls, bathrooms = parse_room_plan(room_plan)
        total_text = (
            total_node.parent.get_text(" ", strip=True)
            if total_node.parent is not None
            else None
        )
        price_total = parse_price_total(total_text)
        price_per_sqm = parse_price_per_sqm(
            unit_node.get_text(strip=True) if unit_node else None
        )

        follow_text = (
            follow_info.get_text(" ", strip=True) if follow_info else ""
        )
        watch_match = re.search(r"(\d+)\s*人关注", follow_text)
        listing_days = self._parse_listing_days(follow_text)
        tags = [
            tag.get_text(strip=True)
            for tag in node.select(".tag span")
            if tag.get_text(strip=True)
        ]

        image_node = card.select_one("img")
        image_url = None
        if image_node is not None:
            image_url = image_node.get("data-src") or image_node.get("src")

        return {
            "title": title,
            "city": "南昌",
            "district": district,
            "community": community,
            "price_total": price_total,
            "price_per_sqm": price_per_sqm,
            "area": area,
            "rooms": rooms,
            "halls": halls,
            "bathrooms": bathrooms,
            "orientation": orientation,
            "floor": floor,
            "building_type": building_type,
            "decoration": decoration,
            "followers_count": int(watch_match.group(1)) if watch_match else 0,
            "listing_days": listing_days,
            "published_at": (
                utcnow() - timedelta(days=listing_days)
                if listing_days is not None
                else None
            ),
            "tags": ",".join(tags[:4]),
            "image_url": image_url,
            "source": "lianjia-nc",
            "source_url": source_url,
        }

    @staticmethod
    def _parse_listing_days(text):
        if not text:
            return None
        if "刚刚发布" in text:
            return 0
        chinese_numbers = {
            "一": 1,
            "二": 2,
            "两": 2,
            "三": 3,
            "四": 4,
            "五": 5,
            "六": 6,
            "七": 7,
            "八": 8,
            "九": 9,
            "十": 10,
        }
        match = re.search(
            r"([0-9一二两三四五六七八九十]+)\s*(年|个月|月|天|小时|时)(以)?前发布",
            text,
        )
        if not match:
            return None
        raw = match.group(1)
        amount = int(raw) if raw.isdigit() else chinese_numbers.get(raw, 1)
        unit = match.group(2)
        if unit == "年":
            return amount * 365
        if unit in ("个月", "月"):
            return amount * 30
        if unit in ("小时", "时"):
            return 0
        return amount

    def crawl(self, limit=300, regions=None, max_pages_per_region=100):
        regions = regions or [slug for slug, _ in ADMIN_REGIONS]
        collected = []
        seen_urls = set()
        for region in regions:
            if len(collected) >= limit:
                break
            logger.info(
                "Crawling region %s, collected %s/%s",
                region,
                len(collected),
                limit,
            )
            failures = 0
            for page in range(1, max_pages_per_region + 1):
                if len(collected) >= limit:
                    break
                html = self.fetch_page(region=region, page=page)
                if html is None:
                    failures += 1
                    if failures >= 2:
                        logger.warning(
                            "Region %s failed twice, moving on", region
                        )
                        break
                    continue
                page_listings = self.parse_page(html)
                if not page_listings:
                    failures += 1
                    if failures >= 2:
                        break
                    continue
                failures = 0
                for item in page_listings:
                    if len(collected) >= limit:
                        break
                    if not item.get("source_url") or item["source_url"] in seen_urls:
                        continue
                    seen_urls.add(item["source_url"])
                    collected.append(item)
        return collected
