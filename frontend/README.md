# 前端说明（frontend/）

本项目前端是一个基于 **Vite + React** 的单页应用（SPA），负责展示数据大盘、房源列表、数据分析图表与后台管理界面，并通过 HTTP API 与后端通信。

## 技术栈

| 依赖 | 用途 |
| --- | --- |
| Vite 6 | 开发服务器与构建工具 |
| React 18 + React Router 6 | 页面渲染与前端路由 |
| Tailwind CSS v4 | 原子化样式与主题变量 |
| ECharts 5 | 数据可视化图表 |
| lucide-react | 图标库 |
| Fontsource（Inter / JetBrains Mono / Noto Serif SC） | 界面字体 |

## 目录结构

```text
src/
├── api/client.js          # 统一的 API 请求封装（自动携带 Token）
├── auth/AuthContext.jsx   # 登录状态管理（登录、注册、会话恢复、退出）
├── components/            # 通用组件
│   ├── AppShell.jsx       # 应用外壳：侧边栏、顶栏、主题切换
│   ├── Charts.jsx         # ECharts 封装与各图表配置生成器
│   ├── HouseCard.jsx      # 房源卡片
│   ├── HouseFormModal.jsx # 房源新增 / 编辑弹窗
│   └── ui.jsx             # Button / Card / Modal / 表单等基础组件
├── styles/index.css       # 全局样式、Tailwind 主题与深浅色变量
├── theme/ThemeContext.jsx # 日间 / 夜间主题上下文
├── utils/format.js        # 金额、数字、日期格式化
└── views/                 # 页面视图（与路由一一对应）
```

## 页面与路由

| 路由 | 视图 | 业务功能 |
| --- | --- | --- |
| `/login` | LoginView | 登录 / 注册（可选择普通用户或管理员角色） |
| `/` | DashboardView | 数据大盘：普通用户看市场脉搏，管理员看系统指标 |
| `/houses` | ListingsView | 房源大厅：多条件筛选、收藏、分页 |
| `/houses/:id` | ListingDetailView | 房源详情与收藏 |
| `/analytics` | AnalyticsView | 数据分析：各类图表与相关性洞察 |
| `/profile` | ProfileView | 个人中心：资料编辑、收藏管理、重新登录 |
| `/console` | ConsoleView | 综合控制台：管理员用户 / 房源 / 采集管理 |

## 与后端交互

所有请求都通过 [`src/api/client.js`](src/api/client.js) 发出：

- 以 `/api` 为前缀请求后端（开发模式下由 Vite 代理到 `http://127.0.0.1:5000`，见 `vite.config.js`）。
- 登录后 Token 保存在 `localStorage`（键名 `house_pulse_token`），每次请求自动附带 `Authorization: Bearer <token>`。
- 封装了 `get / post / put / patch / delete` 五个方法，返回后端 `data` 字段；接口错误会抛出带 `status` 的 `Error`。
- 如需要自定义后端地址，可设置环境变量 `VITE_API_BASE`（默认 `/api`）。

## 鉴权流程

1. 登录 / 注册成功后，后端返回 Token 与用户信息，前端存入本地并写入全局状态。
2. 刷新页面时，`AuthContext` 读取本地 Token 调用 `GET /api/auth/me` 恢复会话；Token 无效则自动清理并跳转登录页。
3. 退出登录时清除本地 Token 并跳转 `/login`。

## 图表渲染机制

- `EChart` 组件负责初始化 / 销毁 ECharts 实例，监听容器尺寸变化自动缩放，并支持 Tooltip 自动巡航（鼠标悬停时暂停）。
- 各图表通过 `barChartOption`、`pieChartOption`、`scatterChartOption`、`districtBubbleOption`、`dualAxisBarLineOption` 等函数生成配置。
- 图表文字、网格、Tooltip 使用语义化颜色令牌，渲染时按当前主题（深色 / 日间）自动解析，切换主题无需重建数据。

## 主题切换

- 默认日间主题；登录页右上角与侧边栏底部可切换“日间 / 夜间模式”。
- 选择持久化在 `localStorage`，并通过 `<html data-theme="light">` 驱动全局 CSS 变量。

## 快速开始

```bash
cd frontend
npm install
npm run dev        # 启动开发服务器，默认 http://localhost:5173
```

生产构建：

```bash
npm run build      # 产物输出到 frontend/dist/
npm run preview    # 本地预览构建产物
```

> 开发前请先启动后端服务（见 [`../backend/README.md`](../backend/README.md)）。
