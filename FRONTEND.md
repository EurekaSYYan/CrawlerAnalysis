# 前端详细说明（FRONTEND.md）



## 1. 前端是什么

前端是一个 **Vite + React 单页应用（SPA）**。它负责用户看到和操作的一切：登录注册、数据大盘、房源列表与筛选、房源详情、数据分析图表、个人中心和管理员控制台。

它本身不存数据，所有数据都通过 HTTP 请求向后端（Flask）获取，拿到结果后用 React 渲染成页面。

## 2. 技术构成

| 技术 | 版本 | 作用 |
| --- | --- | --- |
| Vite | 6.x | 开发服务器与生产构建工具 |
| React | 18.x | 界面组件与状态渲染 |
| React Router | 6.x | 前端路由（页面跳转） |
| Tailwind CSS | 4.x | 原子化样式，主题变量集中在 CSS |
| ECharts | 5.x | 图表绘制 |
| lucide-react | 0.468.x | 图标库 |
|

所有依赖见 [`frontend/package.json`](frontend/package.json)。

## 3. 目录与文件详解

```text
frontend/
├── index.html              # HTML 入口，挂载 #root，并提前设置主题属性避免闪跳
├── package.json            # 依赖与脚本（dev / build / preview）
├── package-lock.json       # 依赖锁定文件（不要手动改）
├── vite.config.js          # Vite 配置：端口 5173、/api 代理到后端 5000、分包
└── src/                    # 全部源码
    ├── main.jsx            # 程序入口：挂载 React 应用
    ├── App.jsx             # 路由表 + 全局 Provider（主题、鉴权）+ 登录守卫
    ├── api/client.js       # 统一的 HTTP 请求封装（自动带 Token、解析错误）
    ├── auth/AuthContext.jsx# 登录状态管理（登录 / 注册 / 恢复会话 / 退出）
    ├── theme/ThemeContext.jsx # 日间 / 夜间主题切换
    ├── utils/format.js     # 金额（万）、数字、单价、日期格式化
    ├── styles/index.css    # 全局样式、Tailwind 主题、深浅色变量、动画
    ├── components/         # 通用组件
    │   ├── ui.jsx          # Button / Card / Modal / 表单 / 状态组件等基础件
    │   ├── AppShell.jsx    # 应用外壳：侧边栏、顶栏、主题与退出入口
    │   ├── Charts.jsx      # ECharts 封装 + 各图表配置生成器
    │   ├── HouseCard.jsx   # 房源卡片（列表与收藏共用）
    │   └── HouseFormModal.jsx # 管理员新增 / 编辑房源弹窗
    └── views/              # 页面视图（每个路由对应一个）
        ├── LoginView.jsx           # 登录 / 注册
        ├── DashboardView.jsx       # 数据大盘（普通用户 / 管理员两套）
        ├── ListingsView.jsx        # 房源大厅（筛选、分页、收藏）
        ├── ListingDetailView.jsx   # 房源详情
        ├── AnalyticsView.jsx       # 数据分析（图表页）
        ├── ProfileView.jsx         # 个人中心
        └── ConsoleView.jsx         # 综合控制台（管理员后台）
```

### 每个文件负责什么

| 文件 | 职责 |
| --- | --- |
| `main.jsx` | 引入 React 和全局样式，把 `<App />` 挂载到 `#root`。一般不用改。 |
| `App.jsx` | 定义所有路由：`/login`、`/`、`/houses`、`/houses/:id`、`/analytics`、`/profile`、`/console`；用 `RequireAuth` 保护需要登录的页面；挂载主题与鉴权 Provider。**新增页面要在这里加路由。** |
| `api/client.js` | 封装 `fetch`：自动加 `Authorization: Bearer`、JSON 序列化、错误抛出、401 自动清理 Token。提供 `api.get/post/put/patch/delete`。**所有请求都走这里。** |
| `auth/AuthContext.jsx` | 全局保存当前登录用户；`login`/`register` 调用后端并保存 Token；启动时用 `/auth/me` 恢复会话；`logout` 清 Token。 |
| `theme/ThemeContext.jsx` | 管理 `dark/light` 主题，写入 `localStorage` 并设置 `<html data-theme>`。 |
| `utils/format.js` | `formatWan`（元 → 万）、`formatNumber`、`formatPerSqm`（单价）、`formatDate`。 |
| `styles/index.css` | Tailwind v4 的 `@theme` 令牌、深浅色两套 CSS 变量、面板/背景/动画样式。**改配色和动效主要改这里。** |
| `components/ui.jsx` | 页面共用基础件：按钮、卡片、统计卡、页头、徽章、输入框、下拉、多行文本、加载、空状态、分页、弹窗。 |
| `components/AppShell.jsx` | 所有登录后页面的外壳：左侧导航、移动端顶栏、主题切换、退出登录；导航项数组 `baseNavItems` 在这里定义。 |
| `components/Charts.jsx` | `EChart` 组件负责初始化/销毁图表、自适应尺寸、Tooltip 巡航；各 `xxxChartOption` 函数按数据生成 ECharts 配置；图表文字/网格/Tooltip 使用语义色，按主题自动解析。 |
| `components/HouseCard.jsx` | 房源卡片：标题、价格、单价、面积、户型、标签、收藏按钮，点击跳详情。 |
| `components/HouseFormModal.jsx` | 管理员新增/编辑房源的弹窗表单，提交到 `POST/PUT /houses`。 |
| `views/LoginView.jsx` | 登录/注册表单、角色选择、演示账号提示、主题切换按钮。 |
| `views/DashboardView.jsx` | 请求 `/dashboard`：普通用户看市场指标与热门房源；管理员看系统指标、采集状态与最近入库。 |
| `views/ListingsView.jsx` | 请求 `/houses`：筛选表单（关键词/区域/户型/价格/面积/排序）、分页、收藏切换。 |
| `views/ListingDetailView.jsx` | 请求 `/houses/:id`：展示详情字段、标签、价格、收藏按钮。 |
| `views/AnalyticsView.jsx` | 请求 `/analytics/summary`：统计卡 + 图表（柱状、饼图、散点、双轴）+ 相关性洞察。 |
| `views/ProfileView.jsx` | 个人资料编辑（`PATCH /auth/me`）、收藏管理、重新登录。 |
| `views/ConsoleView.jsx` | 管理员：用户管理、房源管理（增删改）、触发采集；普通用户访问时退回个人中心。 |

## 4. 功能是如何实现的

### 4.1 页面数据流

```text
用户操作 → 视图（views/）→ api/client.js → 后端 REST API → 返回 JSON → React setState → 页面渲染
```

以房源大厅为例：`ListingsView` 把筛选条件作为查询参数调用 `api.get("/houses", {...})`，后端返回 `{ items, total, page, districts }`，视图用 `useState` 保存并渲染卡片与分页。

### 4.2 鉴权流程

1. `LoginView` 提交用户名密码 → `AuthContext.login()` → `POST /api/auth/login`。
2. 后端返回 `{ token, user }`；`api/client.js` 把 Token 存入 `localStorage`（键名 `house_pulse_token`），`AuthContext` 保存用户。
3. 之后每个请求自动带上 `Authorization: Bearer <token>`。
4. 刷新页面时，`AuthContext` 读取 Token 调 `GET /api/auth/me` 恢复会话；Token 失效则清理并跳登录页。
5. 退出时调用 `POST /api/auth/logout` 并清除本地 Token。

### 4.3 图表渲染机制

- 每个图表由 `EChart` 组件承载：挂载时 `echarts.init`，数据或主题变化时重建，容器尺寸变化时自动 `resize`，卸载时 `dispose`。
- 视图用 `useMemo` 把数据计算成 ECharts `option`，再传给 `EChart`。
- `Charts.jsx` 内置各图表生成器：`barChartOption`（柱状）、`pieChartOption`（饼图）、`scatterChartOption`（散点+趋势线）、`districtBubbleOption`（区域气泡）、`dualAxisBarLineOption`（双轴柱线）。
- 图表里的坐标轴、网格线、Tooltip 使用 `@sem:` 语义令牌，`EChart` 渲染前按当前主题替换成具体颜色，因此深色/日间模式切换时图表自动换色。

### 4.4 主题机制

- `ThemeContext` 把主题写入 `<html data-theme="light|dark">`。
- `styles/index.css` 用两套 CSS 变量（`:root` 深色、`[data-theme="light"]` 日间）控制背景、卡片、文字、边框、阴影。
- Tailwind 颜色工具类（`text-charcoal`、`bg-white/6` 等）都引用 CSS 变量，主题切换时自动生效，无需改组件。

### 4.5 收藏流程

列表页/详情页/个人中心都通过 `POST /houses/:id/favorite` 与 `DELETE /houses/:id/favorite` 切换收藏状态，接口返回后局部更新本页数据，不需要刷新整页。

## 5. 修改与功能添加指南

> 原则：先找到“数据从哪来”（对应接口），再找到“显示在哪”（对应视图），最后找到“长什么样”（对应组件/样式）。

| 想做的事情 | 需要处理的文件 |
| --- | --- |
| 新增一个页面 | 在 `views/` 新建 `XxxView.jsx`；在 `App.jsx` 加 `<Route>`；需要导航入口时在 `components/AppShell.jsx` 的 `baseNavItems` 加一项 |
| 修改导航 / 侧边栏 | `components/AppShell.jsx` |
| 修改登录 / 注册表单或角色选择 | `views/LoginView.jsx`；交互状态在 `auth/AuthContext.jsx` |
| 修改主题配色 / 深浅色 | `styles/index.css`（`:root` 深色、`[data-theme="light"]` 日间变量） |
| 新增图表 | 在 `components/Charts.jsx` 写一个 `xxxChartOption` 生成器，在目标视图用 `useMemo` 计算并渲染 `<EChart option={...} />` |
| 修改图表样式 / 颜色 | `components/Charts.jsx`（`palette`、`themeTokens`、`semantic()`） |
| 修改房源筛选条件 | 前端 `views/ListingsView.jsx` 的表单字段；后端 `backend/routes/houses.py` 的 `_house_query()` |
| 修改房源卡片展示 | `components/HouseCard.jsx`；字段来源在 `backend/utils.py` 的 `serialize_house` |
| 新增房源字段 | 需要前后端一起改：`backend/models.py`（模型列）→ `backend/utils.py`（序列化）→ 前端卡片/详情/表单对应组件 |
| 修改数据大盘内容 | `views/DashboardView.jsx` + 后端 `backend/routes/dashboard.py` |
| 修改分析页内容 | `views/AnalyticsView.jsx` + 后端 `backend/routes/analytics.py` |
| 修改个人中心 | `views/ProfileView.jsx` + 后端 `routes/auth.py` 的 `update_me` |
| 新增通用组件 | 放进 `components/ui.jsx` 并在各视图复用 |
| 修改请求地址 / 超时 / 错误处理 | `api/client.js`、`vite.config.js`（开发代理） |
| 修改按钮、卡片等基础组件样式 | `components/ui.jsx` 的类名 + `styles/index.css` 的公共样式 |

## 6. 本地运行

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173，/api 自动代理到后端 5000
npm run build    # 生产构建，输出到 frontend/dist/
```

> 前端必须配合后端一起使用，后端启动方式见 [`backend/README.md`](backend/README.md)。
