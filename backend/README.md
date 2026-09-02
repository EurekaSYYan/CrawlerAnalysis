# 后端说明（backend/）

本项目后端是一个基于 **Flask** 的 REST API 服务，负责用户鉴权、房源数据管理、链家爬虫入库与数据分析统计，为前端提供全部数据接口。

## 技术栈

| 依赖 | 用途 |
| --- | --- |
| Flask 3 | Web 框架与路由 |
| Flask-SQLAlchemy 3 | ORM 数据库访问 |
| SQLite（默认） / MySQL（生产） | 数据库 |
| PyMySQL | MySQL 驱动 |
| python-dotenv | 读取 `.env` 环境配置 |
| requests + BeautifulSoup + lxml | 链家页面抓取与解析 |
| pandas | 数据清洗（异常值过滤） |
| werkzeug / itsdangerous | 密码哈希与 Token 签发 |

## 目录结构

```text
backend/
├── app.py               # 应用入口（create_app、init-db、seed-users 命令）
├── config.py            # 配置：数据库地址、密钥、端口等
├── extensions.py        # SQLAlchemy 实例
├── models.py            # ORM 模型：用户、房源、价格快照、收藏、公告、采集记录
├── utils.py             # 通用工具：Token、鉴权装饰器、序列化、分页
├── seed_users.py        # 内置演示账号（admin / demo）
├── requirements.txt     # Python 依赖
├── routes/              # API 路由（auth / houses / dashboard / analytics / admin）
├── crawler/             # 链家爬虫与数据清洗
├── tests/               # 后端单元测试
└── instance/            # SQLite 数据库文件（默认 house_demo_nc.db，不提交）
```

## 核心 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册（可选择 user / admin 角色） |
| POST | `/api/auth/login` | 登录，返回 Bearer Token |
| GET/PATCH | `/api/auth/me` | 当前用户信息 / 修改资料 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/houses` | 房源列表（价格、面积、户型、区域筛选 + 分页） |
| GET | `/api/houses/<id>` | 房源详情 |
| GET | `/api/houses/<id>/history` | 房源价格历史 |
| POST/DELETE | `/api/houses/<id>/favorite` | 收藏 / 取消收藏 |
| GET | `/api/favorites` | 我的收藏 |
| POST/PUT/DELETE | `/api/houses[/<id>]` | 管理员新增 / 修改 / 删除房源 |
| GET | `/api/dashboard` | 用户大盘或管理员大盘 |
| GET | `/api/analytics/summary` | 数据分析汇总（统计、散点、生命周期、楼层等） |
| GET/PATCH/DELETE | `/api/admin/users[/<id>]` | 管理员用户管理 |
| GET/POST | `/api/admin/crawl-runs[/]` | 采集记录 / 触发链家采集 |

## 实现原理

### 1. 鉴权

- 注册 / 登录成功后，后端用 `itsdangerous` 签发一个 7 天有效的 Token（内含用户 id）。
- 需要登录的接口通过 `login_required` 装饰器校验 `Authorization: Bearer <token>`，并解析出当前用户；管理员接口使用 `admin_required`。
- 密码使用 `werkzeug.security` 加盐哈希存储，数据库不保存明文。

### 2. 数据库

- 使用 SQLAlchemy ORM，模型定义在 `models.py`；执行 `flask --app app init-db` 会通过 `db.create_all()` 自动建表。
- 默认数据库为 `backend/instance/house_demo_nc.db`（SQLite，由 `.env` 的 `DATABASE_URL` 指定）；生产环境可改为 MySQL：`DATABASE_URL=mysql+pymysql://用户:密码@主机:端口/库名?charset=utf8mb4`。
- `flask --app app seed-users` 会创建内置账号：管理员 `admin / admin123`、普通用户 `demo / demo123`。

### 3. 爬虫

- `crawler/lianjia_spider.py` 抓取链家公开列表页，按行政区翻页，低频率请求并随机延时，轮换 User-Agent。
- `crawler/cleaner.py` 用 pandas 清洗字段（价格、面积、关注度等），并按 IQR 过滤明显异常值。
- `crawler/run_crawler.py` 提供命令行入口：

```bash
cd backend
python -m crawler.run_crawler --city nc --limit 300
```

- 也可以在综合控制台（管理员）点击“开始链家采集”，后端调用 `POST /api/admin/crawl-runs` 完成抓取入库。
- 入库时按 `source_url` 去重，并为每套房源写入一条价格快照到 `house_price_records`，同时记录 `crawl_runs` 采集日志。

### 4. 数据分析

- `routes/analytics.py` 从 `houses` 表聚合出区域均价、户型占比、总价分箱、面积 × 总价散点、挂牌生命周期、楼层分层、建筑类型分布等数据。
- 提供关注度-总价相关系数（皮尔逊）、均价、中位数等汇总指标，供前端图表直接渲染。

## 快速开始

```bash
cd backend
python -m venv .venv                 # 创建虚拟环境（已有可跳过）
.venv\Scripts\activate               # Windows；macOS/Linux 用 source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env               # Windows；macOS/Linux 用 cp .env.example .env
flask --app app init-db              # 初始化数据库表
flask --app app seed-users           # 创建演示账号
flask --app app run                  # 启动服务，默认 http://127.0.0.1:5000
```

> 前端开发服务器已配置代理，把 `/api` 请求转发到本服务；先启动后端再启动前端即可联调。

## 测试

```bash
cd backend
python -m unittest discover -s tests -v
```
