# 后端详细说明（BACKEND.md）

> 面向新手的前端后端讲解文档：讲清楚技术构成、每个文件负责什么、爬虫与数据分析如何工作，以及你要改功能 / 加功能时该动哪些文件。

## 1. 后端是什么

后端是一个 **Flask REST API 服务**，承担三件事：

1. **对外提供数据接口**：登录注册、房源查询、收藏、大盘、分析、管理。
2. **抓取数据**：从链家南昌公开页面爬取真实二手房挂牌。
3. **清洗与分析**：把脏文本解析成结构化字段，过滤异常值，并计算统计指标供图表使用。

前端只负责展示，所有业务逻辑都在这里。

## 2. 技术构成

| 技术 | 版本 | 作用 |
| --- | --- | --- |
| Python | 3.12 | 运行语言 |
| Flask | 3.x | Web 框架与路由 |
| Flask-SQLAlchemy | 3.x | ORM，用 Python 对象操作数据库 |
| SQLite | 默认 | 本地演示数据库（`backend/instance/house_demo_nc.db`） |
| MySQL（PyMySQL） | 生产可换 | 通过 `.env` 的 `DATABASE_URL` 切换 |
| pandas | 2.x | 数据清洗与异常值过滤 |
| requests + BeautifulSoup + lxml | — | 链家页面抓取与 HTML 解析 |
| itsdangerous | — | 签发 / 校验登录 Token |
| werkzeug | — | 密码加盐哈希与校验 |

依赖清单见 [`backend/requirements.txt`](backend/requirements.txt)。

## 3. 目录与文件详解

```text
backend/
├── app.py               # 应用入口：create_app、init-db、seed-users 命令、启动服务
├── config.py            # 配置：SECRET_KEY、DATABASE_URL、主机/端口/调试开关
├── extensions.py        # SQLAlchemy 实例（db），供全局引用
├── models.py            # 数据库表模型（ORM）
├── utils.py             # 通用工具：响应封装、Token、鉴权、序列化、分页
├── seed_users.py        # 内置演示账号（admin / demo）
├── requirements.txt     # Python 依赖清单
├── routes/              # API 路由（按业务拆文件）
│   ├── __init__.py      # 创建蓝图 api_bp，注册所有路由模块，提供 /health
│   ├── auth.py          # 注册 / 登录 / 当前用户 / 改资料 / 退出
│   ├── houses.py        # 房源列表 / 详情 / 增删改 / 收藏 / 价格历史
│   ├── dashboard.py     # 数据大盘（普通用户 / 管理员）
│   ├── analytics.py     # 数据分析汇总
│   └── admin.py         # 管理员：用户管理、采集记录与触发采集
├── crawler/             # 爬虫与数据清洗
│   ├── lianjia_spider.py# 链家爬虫：翻页、解析、限速、Cookie
│   ├── cleaner.py       # 字段解析（价格/面积/户型等）与 IQR 异常过滤
│   └── run_crawler.py   # 命令行入口 + 入库逻辑（去重、价格快照、采集日志）
├── tests/               # 单元测试
│   └── test_analytics.py
└── instance/            # SQLite 数据库文件（不提交到仓库）
```

### 每个文件负责什么

| 文件 | 职责 |
| --- | --- |
| `app.py` | `create_app()` 组装 Flask 应用；提供 `flask --app app init-db`（建表）与 `seed-users`（演示账号）命令；`python app.py` 或 `flask --app app run` 启动服务。 |
| `config.py` | 读取 `.env`；把 `DATABASE_URL` 相对路径重写到 `backend/instance/` 下；配置密钥、端口、调试。 |
| `extensions.py` | 只创建 `db = SQLAlchemy()`，避免循环导入。 |
| `models.py` | 定义 6 张表：`User`（用户）、`House`（房源）、`HousePriceRecord`（价格快照）、`Favorite`（收藏）、`Announcement`（公告）、`CrawlRun`（采集记录）；`TimestampMixin` 提供创建/更新时间。 |
| `utils.py` | `ok/fail`（统一响应格式）；`make_token/read_token`（Token 签发校验）；`login_required/admin_required`（鉴权装饰器）；`clean_text/to_float/as_decimal`（字段处理）；`serialize_user/serialize_house`（模型转 JSON）；`paginate`（分页）。 |
| `seed_users.py` | 若无 admin/demo 账号则创建，密码为 admin123 / demo123。 |
| `routes/__init__.py` | 创建 `api_bp` 蓝图，import 各路由模块完成注册，提供 `GET /api/health`。 |
| `routes/auth.py` | 注册（可选角色 user/admin）、登录（校验密码与启停状态）、`GET/PATCH /auth/me`、退出。 |
| `routes/houses.py` | 房源列表（关键词/区域/户型/价格/面积/排序/分页）、详情、价格历史、收藏增删、我的收藏；管理员增删改房源。 |
| `routes/dashboard.py` | 按角色返回大盘数据：普通用户看市场指标/区域/热门房源；管理员看用户数、房源数、采集状态、最近入库。 |
| `routes/analytics.py` | 聚合统计：区域均价、户型占比、总价分箱、面积×总价散点、挂牌生命周期、楼层分层、建筑类型分布、相关系数。 |
| `routes/admin.py` | 用户搜索/改角色/启停/删除；查看采集记录；触发一次链家采集。 |
| `crawler/lianjia_spider.py` | 按行政区翻页抓取列表页，解析每条房源字段，带随机延时与 User-Agent 轮换。 |
| `crawler/cleaner.py` | 把“780万”“3室2厅1卫”等文本解析成数字；用 pandas IQR 过滤价格异常值。 |
| `crawler/run_crawler.py` | `python -m crawler.run_crawler --city nc --limit 300` 抓取并入库；`save_listings` 按 `source_url` 去重、写价格快照、记录采集日志。 |

## 4. 功能是如何实现的

### 4.1 请求与响应约定

所有接口统一返回 JSON：

```json
{ "message": "ok", "data": { ... } }
```

- 成功：`ok(data, message, status)`，数据放在 `data` 字段。
- 失败：`fail(message, status)`，只有 `message`。
- 前端 `api/client.js` 直接取 `data` 字段，异常时抛出带状态码的 `Error`。

### 4.2 鉴权

1. 注册 / 登录成功后，`make_token` 用 `SECRET_KEY` 签发一个 7 天有效的 Token（内含用户 id）。
2. 前端请求带 `Authorization: Bearer <token>`。
3. `login_required` / `admin_required` 装饰器调用 `resolve_current_user()` 解析 Token → 查数据库 → 校验账号未停用，并把用户缓存到 `g`。
4. 密码使用 `generate_password_hash` 加盐哈希存储，登录时用 `check_password_hash` 校验，数据库不保存明文。

### 4.3 数据库

- 表结构全部由 `models.py` 定义，`flask --app app init-db` 执行 `db.create_all()` 自动建表，无需手写 SQL。
- 默认数据库是 SQLite（`backend/instance/house_demo_nc.db`），由 `.env` 的 `DATABASE_URL=sqlite:///./house_demo_nc.db` 指定。
- 想换 MySQL：改 `.env` 为 `DATABASE_URL=mysql+pymysql://用户:密码@主机:端口/库名?charset=utf8mb4`。
- `flask --app app seed-users` 写入演示账号。

### 4.4 爬虫流程

```text
链家列表页 → LianjiaSpider 按区翻页抓取 → _parse_card 解析字段 → 去重 → save_listings 入库
                                                                        ↓
                                                    同时写价格快照 + 采集日志
```

- 请求间随机延时 1-3 秒、轮换 User-Agent，请求 2500 次后休息 20 分钟；遇到登录跳转或连续失败会停止。
- 每个房源以 `source_url` 去重，避免重复入库。
- 入库时创建一条 `CrawlRun` 记录，并给每套房源写一条 `HousePriceRecord` 价格快照，用于价格历史。
- 触发方式：命令行 `python -m crawler.run_crawler --city nc --limit 300`，或管理员在控制台调用 `POST /api/admin/crawl-runs`。

### 4.5 数据清洗

`cleaner.py` 负责把网页上的中文文本解析成结构化数字：

- `parse_price_total`：把“780万”解析为 7800000 元。
- `parse_price_per_sqm` / `parse_area`：解析单价与面积。
- `parse_room_plan`：把“3室2厅1卫”拆成 rooms/halls/bathrooms。
- `flag_price_outliers`：用四分位距（IQR）标记异常价格，清洗时剔除。

### 4.6 数据分析

`routes/analytics.py` 从 `House` 表做聚合查询：

- 区域均价、户型占比、总价分箱（`PRICE_BINS`）、面积×总价散点原始数据。
- 挂牌生命周期分箱（`LISTING_BINS`）、楼层分层（`FLOOR_LEVELS`）、建筑类型分布。
- 关注度-总价相关系数（皮尔逊）、均价/中位数等汇总指标。

接口 `GET /api/analytics/summary` 一次性返回全部图表所需数据，前端直接渲染。

## 5. 修改与功能添加指南

| 想做的事情 | 需要处理的文件 |
| --- | --- |
| 新增一张数据表 | `models.py` 加模型类 → 重启后执行 `flask --app app init-db`（或删库重建） |
| 新增一个 API 接口 | 在对应 `routes/*.py` 里用 `@api_bp.get/post/...` 写函数，或新建文件并在 `routes/__init__.py` 注册 |
| 给房源加字段 | `models.py`（列）→ `utils.py` 的 `serialize_house`（序列化）→ 前端 `HouseCard/详情/表单` |
| 修改房源筛选 / 排序 | `routes/houses.py` 的 `_house_query()` 与 `SORTS` |
| 修改登录注册逻辑 | `routes/auth.py`；密码规则在 `register` 里 |
| 修改权限控制 | `utils.py` 的 `login_required` / `admin_required`，以及各路由函数上的装饰器 |
| 修改大盘数据 | `routes/dashboard.py` |
| 修改分析指标或分箱 | `routes/analytics.py`（`PRICE_BINS`、`LISTING_BINS` 等） |
| 修改爬虫抓取字段 | `crawler/lianjia_spider.py` 的 `_parse_card`；解析规则在 `crawler/cleaner.py` |
| 修改采集入库逻辑 | `crawler/run_crawler.py` 的 `save_listings` |
| 修改演示账号 | `seed_users.py` |
| 修改数据库连接 / 密钥 | `backend/.env`（参考 `.env.example`） |
| 新增 Python 依赖 | `requirements.txt` 加一行后 `pip install -r requirements.txt` |
| 新增 / 修改测试 | `tests/test_analytics.py`（或新建 `tests/test_*.py`），运行 `python -m unittest discover -s tests -v` |

## 6. 本地运行

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate                  # Windows；macOS/Linux：source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                  # Windows；macOS/Linux：cp .env.example .env
flask --app app init-db                 # 初始化数据库表
flask --app app seed-users              # 创建演示账号 admin/admin123、demo/demo123
flask --app app run                     # 启动服务：http://127.0.0.1:5000
```

## 7. 测试

```bash
cd backend
python -m unittest discover -s tests -v
```
