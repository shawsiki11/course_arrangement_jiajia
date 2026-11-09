# 课程安排系统 (Course Scheduling System)

一个直观、高效的可视化周历排课系统，支持拖拽排课、点击时间段快速排课、30 分钟粒度时间轴、智能循环排课以及跨课程冲突检测。

---

## 核心功能

- **课程管理**：
  - 支持创建、编辑与删除课程。
  - 配置课程名称、适用年级（一年级至九年级）、授课方式（面授 / 在线）、总课次、单节时长（支持 0.5 小时步进）及主题颜色。
- **灵活的排课方式**：
  - **拖拽排课**：将左侧课程卡片直接拖拽至周历对应的时间格，或直接在日历中拖动已排课次调整时间。
  - **点击快速排课**：点击日历任意空白时间段，直接从弹窗列表中选择待排课程（适合课程列表较长时快速操作）。
  - **双击微调**：双击日历上已安排的课次，可单独修改该节课的开始时间。
- **半点排课支持**：
  - 日历网格支持 **30 分钟** 时间粒度（08:00 - 21:00），支持整点与半点（如 `09:30`、`10:30`）开始排课。
- **智能预设与循环排课**：
  - 支持预设多个每周固定上课时间段。
  - 支持 **不重复**、**每天重复**、**每周重复** 三种排课模式，可根据第一节课基准或预设时间自动生成后续课次，直至排满剩余课次。
- **高精度冲突检测与防重叠**：
  - 自动检测不同课程在同一日期、同一时间段的重叠情况。
  - 拖拽、点击添加或修改课程时长/重复规则时，若与其他课程发生冲突会予以拦截并弹出提示。
  - 拖动同一门课程的课次时自动豁免同课程内部校验，保证拖拽调整顺畅。
- **固定表头（Sticky Header）**：
  - 顶部星期与日期栏在页面垂直滚动时始终固定显示，方便对照查看全天课程。

---

## 技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite 6
- **样式方案**：Tailwind CSS v4
- **UI 组件库**：shadcn/ui (`@base-ui/react`) + Lucide Icons
- **动画交互**：Motion (Framer Motion)
- **日期处理**：`date-fns`

---

## 目录结构

```text
├── components/
│   └── ui/                 # shadcn/ui 基础 UI 组件 (Dialog, Select, Button, ScrollArea 等)
├── lib/
│   └── utils.ts            # 样式合并等通用工具函数 (cn)
├── src/
│   ├── App.tsx             # 核心排课应用逻辑、冲突检测、日历视图与弹窗交互
│   ├── types.ts            # 课程 (Course) 与排课记录 (ScheduledSlot) 类型定义
│   ├── index.css           # 全局样式与 Tailwind CSS 引入
│   └── main.tsx            # React 应用挂载入口
├── index.html              # HTML 入口模板
├── package.json            # 项目依赖与脚本配置
├── tsconfig.json           # TypeScript 配置文件
└── vite.config.ts          # Vite 构建与开发服务器配置
```

---

## 本地开发与运行指南

### 1. 环境要求
- **Node.js**：建议使用 `v18.x`、`v20.x` 或 `v22.x` (LTS)
- **包管理器**：`npm`（Node.js 自带）或 `bun`

### 2. 安装依赖
在项目根目录下打开终端，执行：

```bash
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```
启动后在浏览器访问 **[http://localhost:3000](http://localhost:3000)** 即可开始使用和开发（支持热更新 HMR）。

---

## 常用脚本命令

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动本地 Vite 开发服务器（默认端口 `3000`） |
| `npm run lint` | 运行 TypeScript 类型检查 (`tsc --noEmit`)，验证语法与类型安全 |
| `npm run build` | 打包构建生产环境静态文件，输出至 `dist/` 目录 |
| `npm run preview` | 在本地启动服务器预览 `dist/` 打包后的生产环境效果 |
| `npm run clean` | 清理 `dist/` 构建产物目录 |

---

## 部署说明

1. **静态托管平台（推荐）**：
   - 将代码推送到 GitHub 仓库后，可直接导入至 **Vercel**、**Netlify** 或 **Cloudflare Pages**。
   - 构建命令（Build Command）：`npm run build`
   - 输出目录（Output Directory）：`dist`
2. **自有服务器 / Nginx / Docker**：
   - 执行 `npm run build` 生成 `dist/` 文件夹，将 `dist/` 目录下的静态文件配置到 Nginx 或任意静态文件服务器即可。
