# 南昌二手房数据爬取分析项目

一个面向普通用户与管理员的全栈数据工作台：自动爬取链家南昌站真实二手房挂牌，清洗入库后，通过数据大盘、房源筛选、数据分析图表与后台管理，把“数据”变成“可用的信息”。

## 项目简介

房脉围绕一条完整的数据链路构建：

```text
链家公开页面 → 爬虫抓取 → 数据清洗 → 数据库 → REST API → 前端可视化
```

- 数据真实：当前数据库包含 **756 条链家南昌真实挂牌**（`source_url` 均为链家详情页地址）。
- 双角色体系：普通用户看市场脉搏、筛选收藏房源；管理员可管理用户、房源并触发采集。
- 开箱即用：内置演示账号，一条命令初始化数据库，前后端分别启动即可运行。

## 功能特性

- **数据大盘**：普通用户查看挂牌规模、区域均价与热门房源；管理员查看系统指标与采集状态。
- **房源大厅**：按价格、面积、户型、区域多条件筛选，支持收藏与分页。
- **房源详情**：真实挂牌字段展示与收藏操作。
- **数据分析**：区域均价、户型占比、总价分箱、面积 × 总价散点、挂牌生命周期、楼层分层等图表，以及关注度-总价相关性洞察。
- **个人中心**：资料编辑、收藏管理、重新登录。
- **综合控制台**：管理员管理用户角色/启停、房源增删改查，一键触发链家采集。

## 技术栈概览

| 端 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Vite 6 + React 18 | 构建工具与 UI 框架 |
| 前端 | React Router 6 | 前端路由 |
| 前端 | Tailwind CSS v4 | 原子化样式与主题变量 |
| 前端 | ECharts 5 | 数据可视化图表 |
| 后端 | Python 3.12 + Flask 3 | REST API 服务 |
| 后端 | Flask-SQLAlchemy 3 | ORM 数据库访问 |
| 后端 | pandas | 数据清洗与异常值过滤 |
| 后端 | requests + BeautifulSoup | 链家页面抓取与解析 |
| 数据库 | SQLite（默认） / MySQL（生产） | 数据存储 |
| 鉴权 | itsdangerous + werkzeug | Token 签发与密码哈希 |

## 目录结构

```text
.
├── README.md              # 项目总览（本文件）
├── AGENTS.md              # 面向开发 AI 的项目约定
├── .gitignore
├── frontend/              # 前端：Vite + React 单页应用
│   ├── README.md          # 前端说明文档
│   ├── src/               # 前端源码
│   │   ├── api/           # API 请求封装（自动携带 Token）
│   │   ├── auth/          # 登录状态管理
│   │   ├── components/    # 通用组件与图表封装
│   │   ├── styles/        # 全局样式与深浅色主题变量
│   │   ├── theme/         # 主题切换上下文
│   │   ├── utils/         # 格式化工具
│   │   └── views/         # 页面视图（登录、大盘、房源、分析、个人、控制台）
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── backend/               # 后端：Flask REST API
    ├── README.md          # 后端说明文档
    ├── app.py             # 应用入口与 CLI 命令
    ├── config.py          # 数据库与运行配置
    ├── models.py          # ORM 数据模型
    ├── utils.py           # Token / 鉴权 / 序列化工具
    ├── seed_users.py      # 内置演示账号
    ├── requirements.txt
    ├── routes/            # API 路由（auth / houses / dashboard / analytics / admin）
    ├── crawler/           # 链家爬虫与数据清洗
    ├── tests/             # 后端单元测试
    └── instance/          # SQLite 数据库文件（不提交）
```

## 快速上手

### 环境要求

- Python 3.12+
- Node.js 18+

### 第 1 步：启动后端

> 提示：仓库已内置示例数据库 `backend/instance/house_demo_nc.db`（含 756 条真实挂牌与演示账号），
> 下面的 `copy .env.example .env`、`init-db`、`seed-users` 均可跳过（不配置 `.env` 时默认使用内置 SQLite），
> 安装依赖后直接执行最后的 `flask --app app run` 即可。

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows；macOS/Linux：source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # 可选；不配置则默认使用内置 SQLite
flask --app app init-db       # 可选；示例库已建表，重复执行无副作用
flask --app app seed-users    # 可选；示例库已含 admin/demo 账号
flask --app app run           # 启动服务：http://127.0.0.1:5000
```

### 第 2 步：启动前端

```bash
cd frontend
npm install
npm run dev                   # 启动开发服务器：http://localhost:5173
```

浏览器打开 `http://localhost:5173` 即可使用。开发模式下前端会把 `/api` 请求自动代理到后端。

### 演示账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | admin | admin123 |
| 普通用户 | demo | demo123 |

## 项目文档

- **前端详细讲解**（技术构成、文件职责、实现原理、改功能指南）：[FRONTEND.md](FRONTEND.md)
- **后端详细讲解**（技术构成、文件职责、爬虫/分析原理、改功能指南）：[BACKEND.md](BACKEND.md)
- **爬虫与数据入库详解**（相关文件、抓取/清洗流程、存储位置、入库逻辑）：[CRAWLER.md](CRAWLER.md)
- 前端快速参考：[frontend/README.md](frontend/README.md)
- 后端快速参考（接口、启动、测试）：[backend/README.md](backend/README.md)

## 测试

```bash
cd backend
python -m unittest discover -s tests -v
```

## 生产部署提示

- 修改 `backend/.env` 中的 `DATABASE_URL` 可切换到 MySQL。
- 修改 `SECRET_KEY` 为强随机值。
- 前端构建产物：`cd frontend && npm run build`，输出到 `frontend/dist/`。
