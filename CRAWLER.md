# 爬虫与数据入库详细说明（CRAWLER.md）

> 面向开发者的讲解文档：链家南昌二手房数据是如何被抓取、清洗、存储并最终写入数据库的。读完本文你应能回答三个问题：**涉及哪些文件、数据存在哪、怎么进数据库**。

## 1. 数据链路总览

```text
链家公开列表页
   │ ① LianjiaSpider 按行政区翻页抓取（UA 轮换 + 随机延时 + Cookie）
   ▼
HTML 页面
   │ ② parse_page / _parse_card 提取每张卡片 → 结构化 dict
   ▼
房源列表 listings（内存中的 Python 字典列表）
   │ ③ run_crawler.save_listings 按 source_url 去重
   ▼
SQLite 数据库（backend/instance/house_demo_nc.db）
   ├─ houses              房源主表（每套房一行）
   ├─ house_price_records 价格快照表（每次入库写一条）
   └─ crawl_runs          采集运行日志表（每次采集一行）
```

整个链路只有 3 个 Python 文件在"干活"，外加 3 个文件负责"存储与配置"：

## 2. 相关文件与职责

| 文件 | 职责 | 关键类 / 函数 |
| --- | --- | --- |
| `backend/crawler/lianjia_spider.py` | **抓取**：请求链家列表页、翻页、解析 HTML 卡片为结构化数据 | `LianjiaSpider` 类：`fetch_page` / `parse_page` / `_parse_card` / `crawl` |
| `backend/crawler/cleaner.py` | **清洗**：把"780万""3室2厅1卫"等中文文本解析成数字 | `parse_price_total` / `parse_price_per_sqm` / `parse_area` / `parse_room_plan` / `flag_price_outliers` |
| `backend/crawler/run_crawler.py` | **入库**：命令行入口 + 把爬到的列表写入数据库 | `save_listings(app, listings, source)` / `main()` |
| `backend/models.py` | 定义数据库表结构（ORM） | `House` / `HousePriceRecord` / `CrawlRun` |
| `backend/config.py` + `backend/.env` | 数据库连接与运行配置 | `DATABASE_URL` / `SECRET_KEY` / `LIANJIA_COOKIE` / `LIANJIA_UA` |
| `backend/extensions.py` | SQLAlchemy 实例（`db`），供全局引用 | `db = SQLAlchemy()` |
| `backend/routes/admin.py` | 管理后台"一键采集"接口 | `POST /api/admin/crawl-runs`（内部复用 spider + save_listings） |
| `backend/app.py` | Flask 应用工厂，`create_app()` | `init-db` / `seed-users` 命令 |

## 3. 爬虫如何抓取（lianjia_spider.py）

### 3.1 URL 构造与行政区划分

列表页 URL 模板：

```python
BASE_URL = "https://{city}.lianjia.com/ershoufang/{region}pg{page}/"
# 例：https://nc.lianjia.com/ershoufang/donghuqupg2/  → 东湖区第 2 页
```

链家每个区域最多展示 100 页，因此把南昌按 **12 个行政区**（`ADMIN_REGIONS`）拆分爬取：东湖区、西湖区、青云谱区、青山湖区、红谷滩区、湾里区、新建区、南昌县、进贤县、安义县、高新区、经开区。`crawl()` 按区域顺序逐区翻页，收集够 `limit` 条即停止。

### 3.2 请求头、Cookie 与限速

- **User-Agent 轮换**：内置 6 个浏览器 UA（Chrome / Edge / Firefox / Safari 等），每次请求随机取一个；也可用环境变量 `LIANJIA_UA` 固定。
- **Cookie**：优先读取 `backend/.crawler_cookie` 文件，其次读环境变量 `LIANJIA_COOKIE`（登录态 Cookie，避免被识别为无身份爬虫）。
- **随机延时**：每次请求后 `time.sleep(random.uniform(1.0, 3.0))`（可通过 `--delay / --delay-max` 调整）；累计请求 2500 次后强制休息 20 分钟再继续。
- **失败重试**：单页最多重试 2 次，间隔随机 1–2 秒递增；若响应跳转到 `clogin.lianjia.com/login`（Cookie 失效）立即停止；同一区域连续失败 2 次则跳过该区域。

### 3.3 翻页与解析

```python
html = spider.fetch_page(region="donghuqu", page=1)   # ① 拿 HTML
listings = spider.parse_page(html)                     # ② 解析当前页
```

`parse_page` 用 BeautifulSoup + lxml 选择 `ul.sellListContent li`（每张房源卡片），逐个交给 `_parse_card` 解析。

### 3.4 卡片解析（_parse_card）——网页字段 → 结构化字段

每张卡片里的 DOM 节点与最终字段对应关系：

| 网页元素 | 解析方式 | 输出字段 |
| --- | --- | --- |
| `.title a` 标题与链接 | 取文本 / href | `title`、`source_url` |
| `.positionInfo` 位置 | 按 `-` / `—` 拆分 | `community`（小区）、`district`（商圈） |
| `.houseInfo` 房屋信息 | 按 `\|` 拆分 6 段 | 户型 / 面积 / 朝向 / 装修 / 楼层 / 建筑类型 |
| `.totalPrice span` 总价 | `parse_price_total`（"780万"→7800000） | `price_total` |
| `.unitPrice span` 单价 | `parse_price_per_sqm`（"68000元/平"） | `price_per_sqm` |
| `.followInfo` 关注 | 正则 `(\d+)\s*人关注` | `followers_count` |
| `.followInfo` 挂牌时间 | `_parse_listing_days` | `listing_days`、`published_at` |
| `.tag span` 标签 | 取前 4 个 | `tags` |
| 卡片 `<img>` | `data-src` / `src` | `image_url` |

此外固定写入 `city="南昌"`、`source="lianjia-nc"`。

### 3.5 挂牌天数的特殊解析（_parse_listing_days）

- "刚刚发布" → `0`
- "3天前发布" → `3`
- "1个月前发布" / "1个月以?前发布" → `30`
- "1年前发布" → `365`
- "N小时前发布" → `0`
- 中文数字（一~十）也会被识别

`published_at = 当前时间 - listing_days`，即估算的上架时间。

## 4. 字段解析与清洗（cleaner.py）

`cleaner.py` 提供两类能力：

**① 单字段解析器**（爬虫 `_parse_card` 实际调用，把中文文本转数字）：

| 函数 | 输入示例 | 输出 |
| --- | --- | --- |
| `parse_price_total` | `"780万"` / `"320万元"` / `"7,800,000"` | `7800000.0`（元） |
| `parse_price_per_sqm` | `"68000元/平"` / `"6.8万/平米"` | `68000.0`（元/㎡） |
| `parse_area` | `"89.4平米"` | `89.4`（㎡） |
| `parse_room_plan` | `"3室2厅1卫"` | `(3, 2, 1)`（室/厅/卫） |
| `clean_orientation` | `"南 北"` | `"南北"` |

**② pandas 批量清洗流水线**（`clean_housing_frame` / `flag_price_outliers`）：把整个 DataFrame 的价格、面积、户型批量解析，并用 **IQR（四分位距）法**标记/剔除价格异常值（小于 Q1-1.5×IQR 或大于 Q3+1.5×IQR）。注意：**当前爬虫入库路径是逐卡片解析、未启用 IQR 剔除**，该流水线是为需要批量清洗的场景预留的。

## 5. 数据如何存储

### 5.1 数据库位置与配置

- 默认数据库是 **SQLite**，一个单文件：`backend/instance/house_demo_nc.db`
- 由 `backend/.env` 控制（示例见 `.env.example`）：

```ini
DATABASE_URL=sqlite:///./house_demo_nc.db
```

- `config.py` 的处理：若 `DATABASE_URL` 以 `sqlite:///./` 开头，会自动把相对路径**重写到 `backend/instance/` 目录下**，所以数据库文件实际落在 `backend/instance/house_demo_nc.db`。
- 生产环境换 MySQL 只需改 `.env`：`DATABASE_URL=mysql+pymysql://用户:密码@主机:3306/库名?charset=utf8mb4`，代码无需改动。
- 表结构由 `models.py` 定义，执行 `flask --app app init-db` 自动建表（`db.create_all()`）。

### 5.2 与爬虫相关的三张表

**`houses` 房源主表**（每套房源一行）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | Integer PK | 主键 |
| `title` | String(255) | 房源标题 |
| `city` / `district` / `community` | String | 城市 / 商圈 / 小区 |
| `price_total` | Numeric(12,2) | 挂牌总价（元） |
| `price_per_sqm` | Numeric(10,2) | 单价（元/㎡） |
| `area` | Numeric(8,2) | 建筑面积（㎡） |
| `rooms` / `halls` / `bathrooms` | SmallInteger | 室 / 厅 / 卫 |
| `orientation` / `floor` / `building_type` / `decoration` | String | 朝向 / 楼层 / 建筑类型 / 装修 |
| `followers_count` | Integer | 关注人数 |
| `listing_days` | Integer | 挂牌天数 |
| `tags` | Text | 标签（逗号分隔） |
| `image_url` / `source` / `source_url` | String | 图片 / 来源（lianjia-nc）/ 链家详情页链接（**唯一索引，去重依据**） |
| `published_at` / `created_at` / `updated_at` | DateTime | 上架时间 / 入库时间 / 更新时间 |

**`house_price_records` 价格快照表**（每次入库为每套房写一条，供价格历史查询）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | Integer PK | 主键 |
| `house_id` | Integer FK → houses.id | 关联房源（级联删除） |
| `price_total` | Numeric(12,2) | 该次采集时的总价 |
| `price_per_sqm` | Numeric(10,2) | 该次采集时的单价 |
| `recorded_at` | DateTime | 采集时间（与当次 CrawlRun 的开始时间一致） |

**`crawl_runs` 采集运行日志表**（每次采集一行，记录成败）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | Integer PK | 主键 |
| `source` | String | 数据来源（如 `lianjia` / `lianjia-nc`） |
| `status` | Enum | `running` / `success` / `partial` / `failed` |
| `started_at` / `finished_at` | DateTime | 开始 / 结束时间 |
| `total_found` | Integer | 本次共抓到多少条 |
| `total_imported` | Integer | 实际新入库多少条 |
| `error_message` | Text | 失败原因 |

## 6. 如何存入数据库（run_crawler.py → save_listings）

`save_listings(app, listings, source)` 是唯一的入库入口，流程如下：

```python
with app.app_context():
    # ① 建一条采集运行记录（running）
    run = CrawlRun(source=source, status="running", total_found=len(listings))
    db.session.add(run); db.session.flush()

    for item in listings:
        # ② 按 source_url 去重：已存在则跳过
        if House.query.filter_by(source_url=item["source_url"]).first():
            continue
        # ③ 房源主表入库
        house = House(**item)              # item 的键与 House 字段一一对应
        db.session.add(house); db.session.flush()   # flush 拿到自增 id
        # ④ 写一条价格快照
        db.session.add(HousePriceRecord(
            house_id=house.id,
            price_total=house.price_total,
            price_per_sqm=house.price_per_sqm,
            recorded_at=started_at,
        ))
    # ⑤ 收尾：更新运行状态与统计
    run.status = "success" if imported else "partial"
    run.finished_at = utcnow()
    run.total_imported = imported
    db.session.commit()
```

要点：

- **去重依据是 `source_url`**（链家详情页链接），重复采集同一批房源不会产生重复行；所以 `total_imported` 可能小于 `total_found`（都是已入库过的）。
- `House(**item)` 直接把爬虫字典的键映射为模型列，因此 **爬虫字段名与 `models.House` 列名必须一致**（新增字段时要前后端同步）。
- 每次都写价格快照（`HousePriceRecord`），因此数据库中 `house_price_records` 的数量等于累计入库的房源数。
- 全部操作在**同一个事务**里 commit，中途失败则整批回滚。

## 7. 如何触发采集

**方式一：命令行**（适合批量/手动抓取）：

```bash
cd backend
python -m crawler.run_crawler --city nc --limit 300          # 默认抓 300 条
python -m crawler.run_crawler --city nc --limit 50 --regions donghuqu,xihuqu   # 指定区域
```

常用参数：`--city`（城市拼音，默认 nc）、`--limit`（条数上限）、`--delay / --delay-max`（请求间隔秒数）、`--regions`（逗号分隔的区域 slug）。

**方式二：管理后台"开始链家采集"**（`routes/admin.py`）：

- 前端综合控制台点击 → `POST /api/admin/crawl-runs`（body 传 `count`，1–100）
- 后端内部等价执行 `LianjiaSpider(city="nc").crawl(limit=count)` + `save_listings(...)`
- 注意：该接口是**同步阻塞**的（请求期间前端等待），这是刻意为之——保持低频请求，避免被链家识别为恶意攻击

## 8. 防反爬与限频策略汇总

| 策略 | 实现位置 |
| --- | --- |
| 随机延时 1–3 秒 / 请求 | `LianjiaSpider._sleep()` |
| 6 个 UA 轮换 | `USER_AGENTS` + `_headers()` |
| 登录态 Cookie | `.crawler_cookie` 文件或 `LIANJIA_COOKIE` 环境变量 |
| 每 2500 次请求休息 20 分钟 | `_sleep()` |
| 检测登录跳转立即停止 | `fetch_page()` 检查 `clogin.lianjia.com/login` |
| 连续失败 2 次跳过区域 | `crawl()` 的 `failures` 计数 |
| 单线程、不绕过验证码 | 设计约束（学术演示用途） |

## 9. 常见问题排查

| 现象 | 原因与处理 |
| --- | --- |
| 抓到的列表为空 / 日志出现 "Login required" | Cookie 失效：更新 `backend/.crawler_cookie` 或 `LIANJIA_COOKIE` 后重试 |
| `total_imported` 远小于 `total_found` | 正常：`source_url` 去重，之前已入库的房源被跳过 |
| 想重抓某条数据 | 先删除 `houses` 中对应行（级联删快照），再触发采集 |
| 数据库文件在哪 | `backend/instance/house_demo_nc.db`；不要提交到版本库（`.gitignore` 已忽略 `instance/`） |
| 采集失败想查原因 | 查看 `crawl_runs` 表的 `status` / `error_message`，或管理后台"采集记录" |
