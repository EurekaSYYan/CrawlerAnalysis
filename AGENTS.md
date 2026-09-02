# AGENTS.md

本文件用于指导后续参与本项目的开发。开始任何修改前，请先阅读本文件并遵守其中的约定。

## 目录结构

```text
.
├── README.md              # 项目总览、技术栈、目录说明与快速上手
├── frontend/              # 前端：Vite + React
│   ├── README.md          # 前端说明（路由、状态、API 交互、图表）
│   └── src/               # 前端源码
└── backend/               # 后端：Flask + SQLAlchemy
    ├── README.md          # 后端说明（接口、爬虫、数据分析）
    ├── app.py             # 应用入口
    ├── routes/            # API 路由
    ├── crawler/           # 爬虫与数据清洗
    └── tests/             # 后端测试
```

## 开发规则

1. 代码文件只放在 `frontend/src/` 与 `backend/` 下，不在其他目录新增代码。
2. 项目统一文档在根目录 `README.md`、`frontend/README.md`、`backend/README.md`；新增功能或关键决策同步更新对应 README。
3. 修改代码前先阅读现有代码与约定，保持既有风格和架构；不要顺手重构无关代码。
4. 不删除、不回滚未明确要求的文件或内容；遇到已有改动时，与这些改动共存，必要时先询问。
5. 新增或修改功能后，补充必要测试，并确保 `backend/tests` 下的测试全部通过。
6. 构建产物、运行日志、依赖目录与本地数据库不提交（见 `.gitignore`）；环境配置使用 `.env` / `.env.example`。
7. 文档默认使用中文；代码中的注释与命名遵循项目既有语言习惯。

## 快速入口

- 项目说明见根 `README.md`
- 前端说明见 `frontend/README.md`
- 后端说明见 `backend/README.md`
