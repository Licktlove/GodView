# 🌐 门店上帝视角推演沙盘

> LLM 驱动的知识图谱自生长推演引擎 — 让零售决策在沙盘中预演，在模拟后胜出。

输入一个经营场景（"如果…会怎样"），LLM 自动生成零售实体 → 多轮自生长推演 → 生成决策报告，图谱逐轮演化、关系动态涌现。推演完成后还可与任意实体深度对话。

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| **LLM 生成实体** | 0-999 个实体，类型动态扩展（基础 9 类 + LLM 自定义） |
| **自生长推演** | 0-200 轮，每轮焦点实体基于人格行动，催生新关系/新实体 |
| **D3 知识图谱** | 力导向布局、zoom/pan/拖拽、悬停高亮（智驾蓝）、节点详情、图例收缩 |
| **ReACT 多章节报告** | 先规划大纲 → 逐章节流式生成 → 可折叠展示 |
| **实体画像丰富** | 人物：age/MBTI/bio/traits；物体：specs/impact/trend/lifecycle |
| **交互记忆 (Episode)** | 每轮交互的行为效应存为实体记忆，供深度互动使用 |
| **时序图谱** | 关系标记诞生轮次与状态 (active/expired) |
| **深度互动** | 推演后与任意实体角色扮演对话，回答基于人格 + 行为记忆 |
| **自动推荐参数** | LLM 根据场景推荐推演轮数和焦点数，预填滑块 |
| **实验持久化** | 推演快照保存为 JSON，支持回看对比 |

## 🏗️ 技术栈

```
前端: Vue 3 + Vite + D3.js（力导向图谱）
后端: Node.js + Express（LLM 代理 + 实验持久化）
LLM:  任意 OpenAI 兼容 API（DeepSeek / Moonshot / OpenAI 等）
```

- 后端代理 LLM 调用 → **根治 CORS + 密钥不暴露到前端**
- 前端 D3 替代 ECharts → bundle 仅 91KB (gzip)
- 单文件实验持久化 → 无需数据库

## 🚀 快速开始

### 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | **18+**（推荐 24.x） |

### 1. 克隆仓库

```bash
git clone https://github.com/Licktlove/GodView.git
cd GodView
```

### 2. 安装依赖

```bash
npm run install:all
```

### 3. 配置 LLM

```bash
cp .env.example backend/.env
```

编辑 `backend/.env`，填入你的 API 信息：

```env
LLM_BASE_URL=https://api.moonshot.cn/v1
LLM_API_KEY=sk-your-key-here
LLM_MODEL=moonshot-v1-32k

PORT=3001
```

> 支持任意 OpenAI 兼容接口。推荐使用 Moonshot (Kimi) 或 DeepSeek，性价比高。
> 
> ⚠️ 推理模型（如 kimi-k2.6）仅支持 temperature=1，后端会自动适配。

### 4. 启动

**开发模式（前后端同时启动）：**

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001
- Vite 自动将 `/api/*` 代理到后端

**生产模式：**

```bash
npm run build
npm start
```

访问 http://localhost:3001（前端由后端同源托管）

## 📖 使用流程

```
输入场景 → 生成实体 → [画像丰富] → 启动推演 → 生成报告 → 深度互动
   │           │          │           │          │          │
   │     LLM 自动      LLM 二次     多轮 LLM    ReACT     与任意
   │     生成 0-999    丰富每个     交互催生    多章节     实体
   │     个实体        实体画像     新关系      流式生成   对话
   │                                新实体
   └─ 自动推荐 rounds / perR 参数
```

1. **构建世界**：输入经营场景，LLM 生成实体并推荐推演参数
2. **自生长推演**：每轮焦点实体基于人格行动，图谱逐轮自生长
3. **决策报告**：ReACT 多章节流式生成，含因果链/风险/置信度
4. **深度互动**：与任意实体对话，回答基于推演中的行为记忆

> 💡 无 API Key 时可点"加载示例"查看完整演示效果（合成数据）。

## 📁 项目结构

```
god-view-sandbox/
├── backend/
│   ├── server.js          # Express 服务：LLM 代理 + 实验 CRUD
│   ├── .env               # 你的 API 密钥（不提交）
│   └── data/experiments/  # 推演快照 JSON
├── frontend/
│   ├── src/
│   │   ├── App.vue              # 根组件：分屏布局 + 步骤向导
│   │   ├── components/
│   │   │   ├── GraphPanel.vue   # D3 力导向图谱
│   │   │   └── GrowthPanel.vue  # D3 生长曲线
│   │   ├── engine/
│   │   │   ├── simulate.js      # 推演引擎（生成/推演/报告/互动）
│   │   │   ├── importance.js    # 节点重要性（PageRank+中介+接近）
│   │   │   └── synthetic.js     # 无 Key 兜底演示
│   │   ├── store/sim.js         # 全局状态
│   │   ├── services/llm.js      # API 调用
│   │   └── styles/main.css      # 全局样式
│   └── vite.config.js     # Vite 配置（含 /api 代理）
├── .env.example            # 环境变量模板
├── .gitignore
└── package.json            # 顶层脚本（install:all / dev / build / start）
```

## ⚠️ 可信度红线

> 推演 ≠ 预测 · 置信度仅表征内部自洽程度 · 参谋非司令

LLM 推演结果基于假设场景，不等于现实概率。重大决策须结合实际数据反向复盘校准。

## 📄 License

MIT