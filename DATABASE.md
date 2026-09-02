# 数据库存储说明（DATABASE.md）

## 1. 总览

本项目的数据全部存在**一个文件**里：`backend/instance/house_demo_nc.db`。

- **爬虫**抓到房源 → 后端程序把它**写成一行行"表记录"**存进这个文件；
- **后端**（Flask）程序启动后**直接读写这个文件**；
- **前端**（浏览器里的 React）**不碰这个文件**，它只通过 HTTP 接口向后端要数据。

```text
链家网页 → 爬虫 → 后端程序（Flask + SQLAlchemy）→ house_demo_nc.db（一个文件）
                                              ↑
前端（浏览器）→ HTTP 请求 → 后端 → 读文件 → JSON 返回 → 前端渲染
```

## 2. SQLite 与 MySQL 有什么不同

先打个比方：

> **SQLite** 就像一份 **Excel 工作簿文件**：整个"数据库"就是磁盘上的一个 `.db` 文件。哪个程序要用它，直接打开这个文件就行，不需要任何额外软件。
>
> **MySQL** 就像一台**独立的文件服务器**：你要先安装一个 MySQL 服务程序、启动它、它监听某个端口（默认 3306），别的程序通过网络连上去才能读写里面的数据。

两者的核心区别如下表：

| 对比项 | SQLite | MySQL |
| --- | --- | --- |
| 形态 | **嵌入式**：数据库引擎就嵌在你的程序里 | **客户端-服务器**：独立服务器进程 |
| 安装部署 | 零安装零配置（Python 自带 sqlite3） | 需安装服务、建库、配账号密码 |
| 存储形式 | **一个 `.db` 文件**，可复制、可拷贝、可放进 Git | 数据存在服务器磁盘，由服务程序管理 |
| 连接方式 | 程序直接打开本地文件，**无端口无网络** | 通过网络连接 `主机:3306`，需账号密码 |
| 并发能力 | 适合单机、少量并发读写（写时互斥） | 支持高并发（连接池、行级锁） |
| 数据规模 | 中小数据量（几万条内）性能很好 | 大数据量、多用户场景 |
| 用户权限 | 无（靠文件权限） | 完整的用户/权限体系 |
| 数据迁移 | 拷走一个文件即可 | 需导出/导入，较麻烦 |

一句话总结：**SQLite 简单轻量、单文件即数据库；MySQL 强大完整、但需要一台服务器来跑。**

## 3. 为什么本项目改用 SQLite

之前配置里默认写的是 MySQL，但那其实是个"坑"——别的同学下载项目后如果没有 MySQL，一启动就连不上数据库。现在改为默认 SQLite，理由非常实在：

1. **开箱即用**：Python 3.12 自带 sqlite3，下载项目后**不需要安装任何数据库软件**，`pip install -r requirements.txt` 后直接 `flask --app app run` 就能跑。
2. **数据库可以随代码分发**：SQLite 是单文件（约 577KB），可以直接提交进 GitHub。这样别人 clone 下来，**756 条真实链家挂牌已经在里面了**，不用自己爬、不用自己建库。这是 MySQL 做不到的——MySQL 的数据在服务器里，没法跟代码一起打包。
3. **本项目规模完全够用**：单机运行、几百条数据、用户量很小，SQLite 的读写性能绰绰有余，还省掉了网络开销。
4. **以后想换 MySQL 很容易**：SQLAlchemy 这个 ORM 对两种数据库"一视同仁"，业务代码一个字都不用改，只改 `.env` 里一行 `DATABASE_URL` 即可（详见第 5.4 节）。
5. **演示/教学场景友好**：整个数据库就是一个文件，想备份、想重置、想查看都特别直观。

## 4. 爬取的数据是怎么存进 SQLite 的

### 4.1 完整链路（从网页到磁盘）

```text
链家列表页 HTML
   │  lianjia_spider.py 解析每张卡片
   ▼
Python 字典列表（内存中）  例：{"title": "xxx小区3室2厅", "price_total": 7800000, ...}
   │  run_crawler.py 的 save_listings()：去重 → 交给 ORM
   ▼
SQLAlchemy 把字典变成 House 对象
   │  对象 → 自动生成 INSERT 语句
   ▼
SQLite 引擎写入 house_demo_nc.db 文件（事务提交）
```

### 4.2 数据库文件在哪

- 文件名：`house_demo_nc.db`
- 位置：`backend/instance/` 目录下
- 为什么在 `instance/`？因为 `.env` 里写的是相对路径 `sqlite:///./house_demo_nc.db`，`config.py` 检测到这种写法后，会自动把文件落到 `backend/instance/` 里（详见 5.2 节）。

### 4.3 文件里有什么（表）

一个 `.db` 文件内部可以装多张"表"，本项目共有 6 张表，与爬虫直接相关的是这 3 张：

| 表名 | 存什么 | 通俗理解 |
| --- | --- | --- |
| `houses` | 每套房源一行 | 房源的"档案"（标题、区域、总价、面积、户型、关注数…） |
| `house_price_records` | 每次入库的价格快照 | 房源的"价格体检记录" |
| `crawl_runs` | 每次采集的运行日志 | 爬虫的"工作日志"（抓到几条、入库几条） |

另外还有 `users`（用户）、`favorites`（收藏）、`announcements`（公告）三张业务表。

### 4.4 写入过程（save_listings 干了什么）

`run_crawler.py` 的 `save_listings()` 是唯一的入库入口，核心就 4 步：

1. 建一条 `crawl_runs` 记录，标记"本次采集开始"；
2. 遍历爬到的字典：如果 `source_url`（链家详情页链接）在 `houses` 表里已存在，说明之前存过，**跳过**（去重）；
3. 把字典套进 `House(**item)` —— 字典的键正好对应表的列名，SQLAlchemy 把它翻译成一条 `INSERT INTO houses (...) VALUES (...)` 发给 SQLite；
4. 顺手给这套房写一条 `house_price_records` 价格快照，最后统一 `commit()`——**commit 才是真正把数据落盘的那一步**（commit 前都在内存里，出错可整体回滚）。

> 想亲眼看看文件里有什么？命令行运行：
> ```bash
> cd backend
> python -m sqlite3 instance/house_demo_nc.db "SELECT COUNT(*) FROM houses;"
> ```
> 或者安装免费的图形工具 **DB Browser for SQLite**，双击打开这个文件即可浏览所有表。

## 5. 后端是如何"连接"SQLite 的

### 5.1 连接字符串（URL）

SQLAlchemy 用一段"数据库地址"来定位数据库，叫 `DATABASE_URL`：

```ini
# SQLite（本项目默认）：sqlite:/// + 数据库文件路径
DATABASE_URL=sqlite:///./house_demo_nc.db

# 对比 MySQL：协议://用户:密码@主机:端口/库名
# DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/house_demo?charset=utf8mb4
```

注意两者本质差异：**SQLite 连的是"文件"，MySQL 连的是"服务器"**。

### 5.2 config.py 怎么处理这个路径

`backend/config.py` 里有一段"贴心"的逻辑：

```python
if _database_url.startswith("sqlite:///./"):
    _db_file = _database_url.replace("sqlite:///./", "", 1)   # 取出文件名
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{(BASE_DIR / 'instance' / _db_file).as_posix()}"
```

意思是：如果写的是相对路径（`./xxx.db`），就自动把它**拼到 `backend/instance/` 目录下**，变成绝对路径。所以无论你在哪个目录启动程序，都能找到同一个数据库文件。

### 5.3 后端代码怎么用

后端**没有网络连接、没有服务器地址**——`flask-sqlalchemy` 在应用启动时（`app.py` 的 `db.init_app(app)`）根据上面的 URI **直接打开这个文件**，之后所有路由里的查询（如 `House.query.filter_by(...)`）都会被 SQLAlchemy 自动翻译成 SQL 去读写文件。对程序员来说，全程就像在操作一个 Python 对象列表，感觉不到"数据库引擎"的存在。

### 5.4 以后想换 MySQL 怎么办

只需要在 `backend/.env` 里改一行（去掉注释、填上你的 MySQL 信息）：

```ini
DATABASE_URL=mysql+pymysql://你的用户名:你的密码@127.0.0.1:3306/house_demo?charset=utf8mb4
```

然后先在 MySQL 里建好 `house_demo` 库、执行 `flask --app app init-db` 建表即可。**`models.py`、路由、爬虫入库代码完全不用动**——这就是用 ORM（SQLAlchemy）的好处：换数据库只换"连接字符串"。

## 6. 前端是如何"连接"SQLite 的

这里要澄清一个常见误解：**前端永远不直接连数据库**。

浏览器里的 React 代码（`frontend/src/api/client.js`）只做一件事：向后端发 **HTTP 请求**（如 `GET /api/houses`）。完整流程：

```text
前端页面（React）
   │  api.get("/houses")   ← 普通 HTTP 请求
   ▼
Flask 路由 houses.py（后端进程内）
   │  House.query...（SQLAlchemy 查 SQLite 文件）
   ▼
house_demo_nc.db
   │  查询结果 → JSON
   ▼
前端拿到 JSON → 渲染成卡片/图表
```

所以：

- **数据库只跟后端进程打交道**（同一个程序里直接打开文件）；
- **前端只跟后端 HTTP 接口打交道**，数据库对前端是完全透明的；
- 正因为隔了这一层，**以后把 SQLite 换成 MySQL，前端一行代码都不用改**——前端根本不知道、也不关心数据存在哪个数据库里。

## 7. 小结

| 问题 | 答案 |
| --- | --- |
| 数据存在哪 | `backend/instance/house_demo_nc.db` 这一个文件里 |
| 用什么存 | 6 张表（爬虫相关：houses / house_price_records / crawl_runs） |
| 爬虫数据怎么进库 | `save_listings()` → ORM → INSERT → commit 落盘 |
| 后端怎么连 | 通过 `DATABASE_URL` 直接打开文件（SQLAlchemy 封装） |
| 前端怎么连 | 不直连；只通过后端的 HTTP API 间接取数 |
| 为什么用 SQLite | 零安装、单文件可随 Git 分发、本规模够用、换 MySQL 只改一行 |

### 常见疑问速答

**Q：SQLite 是不是"玩具"，不如 MySQL 正规？**
A：不是。SQLite 是全世界部署量最大的数据库（手机、浏览器、桌面软件都在用）。它和 MySQL 只是定位不同：SQLite 适合单机/嵌入式/中小数据，MySQL 适合服务器高并发。本项目是单机演示系统，SQLite 是恰好合适的选择，同时保留了平滑升级到 MySQL 的能力。

**Q：数据库文件被提交到 GitHub，别人会不会乱改？**
A：别人 clone 后运行自己的副本，改的是他自己的本地文件，不会影响你的仓库。数据库里的数据只是"演示初始数据"，业务上不存在敏感信息。

**Q：如果我自己爬了新数据，会写进同一个文件吗？**
A：会。运行爬虫或管理员点击"开始链家采集"后，新数据会追加写入 `house_demo_nc.db`，文件随之变大。如果想回到初始状态，从 Git 恢复这个文件即可。
