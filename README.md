# Dmall Future Market — 零售经营未来推演引擎

> 让每一个经营决策，都先在未来发生一次。
> LLM 驱动的多智能体图谱推演沙盘（代号 GodView）— 输入一个领域假设（零售 / 供应链 / 宏观 / AI 产业…），长出一个会演化、能解释、可访谈的世界。

Dmall Future Market 把"零售决策推演"变成三步叙事：**WHAT IF（假设）→ SIMULATE（涌现）→ OBSERVE（洞察）**，外加常驻的 **INTERVIEW（访谈）**。图谱上的每个节点都是一个带人格的 agent，整个推演过程可见、可问、可追溯。应用打开先见多页下滑式品牌落地页（产品理念 / 核心能力 / 推演流程 / 场景包），点「进入控制台」进入工作台，点左上角品牌 logo 随时返回首页（工作台数据经 localStorage 持久化、不丢失）。

## 三阶段 + 常驻访谈

```
WHAT IF           SIMULATE            OBSERVE
构建世界           自生长推演           决策报告
──────────────────────────────────────────────────────
种子文本           多智能体并行涌现       ReACT 式报告
+ 假设事件  ──▶   + 实时活动流   ──▶   + 图谱检索证据
+ 参数推荐          + 枢纽加权出场        + 追问全局分析师
                   + 核心角色锁定
                   + 稳态早停
                        │
              INTERVIEW（常驻）── 点任意节点，以它的 persona 对话
```

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| **多智能体社会涌现** | 节点即 agent：带 persona 并行反应、受世界局势驱动、可催生新 agent，宏观结构自下而上涌现 |
| **LLM 直抽图谱** | 种子文本 → 大模型直接抽取实体 + 初始关系（轻量替代 Zep，零外部图数据库依赖） |
| **WHAT IF 假设事件** | 结构化前提（如"竞品新店开业大促"）注入抽取与整个推演，让假设名副其实 |
| **实时活动流** | 每轮每个 agent 的动作滚动可见（新关系/影响/涌现），轮次进度实时显示 |
| **枢纽加权出场** | 焦点按图谱度数加权抽取，店长/头部供应商等关键角色自动成为"主角" |
| **核心角色锁定** | 锁定任意实体为常驻焦点，每轮必出场，故事线不划水 |
| **稳态早停** | 连续多轮无新关系即收敛，"世界在第 X 轮达到均衡"，省 token 且可写进报告 |
| **ReACT 式报告** | 动笔前先检索图谱证据（影响力中心/高频关系/演化趋势/冲突），大纲 + 章节 SSE 真流式 |
| **追问全局分析师** | 报告后问"为什么客流掉了"这类全局问题，由带图谱上下文的分析师流式作答 |
| **Interview 节点** | 与任意图谱节点以 persona + 推演行为记忆对话（角色扮演）；对话时图谱保持全局视野、不强制聚焦该节点 |
| **场景包制** | 领域知识外置为配置（内置零售 / 供应链 / 宏观经济 / AI 产业），不同场景 = 不同输入，推理引擎恒定 |
| **D3 知识图谱** | 力导向布局 + 点阵星空背景；动态稳定节点配色（新类型自动领色、同类型恒同色）；悬停只高亮不模糊（玫粉高亮边）；孤立节点治理（向心聚拢 + 「隐藏孤立」开关 + 灰虚线样式）；搜索/路径/详情/图例 |
| **实验持久化** | 推演快照保存为 JSON，支持回看对比 |

## 🏗️ 技术栈

```
前端: Vue 3 + Vite + D3.js（力导向图谱）
后端: Node.js + Express（LLM 代理 + SSE + 实验持久化）
LLM:  任意 OpenAI 兼容 API（默认阿里百炼 dashscope，qwen3.7-plus）
```

- 后端代理 LLM 调用 → **根治 CORS + 密钥不暴露到前端**
- 真流式：后端 `/api/chat/stream` SSE 透传，前端逐 token 渲染
- 单文件实验持久化 → 无需数据库

## 🚀 快速开始

### 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | **18+**（推荐 22.x） |

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

编辑 `backend/.env`，填入你的 API 信息（默认示例为阿里百炼）：

```env
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-your-key-here
LLM_MODEL=qwen3.7-plus

PORT=3100
```

> 支持任意 OpenAI 兼容接口（DeepSeek / Moonshot / OpenAI 等）。推理模型（如 qwen3.7-plus）会在首 token 前有数秒思考静默，属正常现象；追求响应速度可换 `qwen-plus` 等非推理模型。

### 4. 启动

**开发模式（前后端同时启动）：**

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3100
- Vite 自动将 `/api/*` 代理到后端

> 后端固定走 **3100** 端口（3001 常被其他项目占用，已迁移），`backend/.env` 的 `PORT` 与 `frontend/vite.config.js` 的代理目标需保持一致。

**生产模式：**

```bash
npm run build
npm start
```

## 📖 使用流程

0. **首页 · 多页产品落地页**：打开应用先见 Dmall Future Market 多页下滑式首页（吸顶导航 + 锚点跳转，含产品理念 / 核心能力 / 推演流程 / 场景包），点「进入控制台」进入工作台；点左上角品牌 logo 返回首页，工作台内容（实体 / 关系 / 推演 / 对话）经 localStorage 持久化、刷新或返回均不丢失
1. **WHAT IF · 构建世界**：输入经营场景 + 添加假设事件（可多条），LLM 抽取实体并推荐推演参数
2. **SIMULATE · 自生长推演**：设定轮数/焦点数，启动后实时活动流展示每个 agent 的动作；可锁定主角、观察世界在何时达到稳态
3. **OBSERVE · 决策报告**：生成报告（含图谱检索证据、因果链、决策建议），报告后可追问全局分析师
4. **INTERVIEW · 随时问**：点任意节点，以它的 persona 对话

> 💡 无 API Key 时可点"加载示例"查看完整演示效果（合成数据）。

## 📁 项目结构

```
GodView/
├── backend/
│   ├── server.js          # Express：LLM 代理 + SSE 流式 + 实验 CRUD
│   ├── .env               # 你的 API 密钥（不提交）
│   └── data/experiments/  # 推演快照 JSON
├── frontend/
│   ├── src/
│   │   ├── App.vue              # 根组件：首页 + 三阶段工作台 + 图谱分屏
│   │   ├── components/
│   │   │   ├── HomeView.vue     # 品牌首页（多页下滑式产品落地页）
│   │   │   ├── WorkflowView.vue  # 工作台引导页（进入控制台前的流程/场景介绍）
│   │   │   ├── GraphPanel.vue    # D3 力导向图谱（点阵背景/玫粉高亮）
│   │   │   ├── ReportView.vue    # 报告全屏视图
│   │   │   └── GrowthPanel.vue   # D3 生长曲线
│   │   ├── scenarios/           # 场景包（领域知识外置）
│   │   │   ├── index.js         # 场景注册/选择
│   │   │   ├── retail.js        # 零售 · 单店生态（KPI: 客流/客单价/复购率/坪效/毛利）
│   │   │   ├── supplyChain.js   # 供应链 · 韧性（KPI: 交付周期/断供风险/牛鞭放大倍数/库存周转/履约成本）
│   │   │   ├── macro.js         # 宏观经济（KPI: GDP增速/通胀率/失业率/汇率/利率/消费信心）
│   │   │   └── ai.js            # AI 行业竞争（KPI: 框架采用率/开源活跃度/生态工具数/推理成本/开发者满意度/商业化收入）
│   │   ├── engine/
│   │   │   ├── simulate.js      # 推演引擎（抽取/涌现/报告/访谈/检索）
│   │   │   ├── palette.js       # 节点动态稳定配色（唯一颜色来源）
│   │   │   ├── analytics.js     # 冲突/群体/桥节点分析
│   │   │   ├── importance.js    # 节点重要性
│   │   │   └── synthetic.js     # 无 Key 兜底演示
│   │   ├── store/sim.js         # 全局状态
│   │   ├── services/llm.js      # API 调用 + SSE 流式
│   │   └── styles/main.css      # 全局样式（冰川青主题）
│   └── vite.config.js     # Vite 配置（/api 代理 → 3100）
├── .env.example            # 环境变量模板
├── .gitignore
└── package.json            # 顶层脚本（install:all / dev / build / start）
```

## 🧩 场景包

场景包把"领域知识"从引擎里抽出来：换个场景只需新增一个 `scenarios/*.js`，推理过程不变。

```js
// scenarios/retail.js（示意）
{
  id: 'retail',
  domain: '零售经营',
  entityTypes: ['顾客分群', '门店', '竞品', '供应商', '员工', '平台', '商品', '环境', 'KPI', '组织'],
  personTypes: [...],          // 人格实体白名单
  objectTypes: [...],          // 非人格实体白名单
  kpiSchema: ['客流', '客单价', '复购率', '坪效', '毛利'],
  prompts: { sysGen: '...', sysRound: '...', ... },  // {domain} 占位符
  demoData: { entities: [...], edges: [...] },       // 无 Key 兜底
}
```

**已内置场景包：**

| 场景包 | 领域 | 关键 KPI |
|--------|------|----------|
| `retail` | 零售经营 · 单店生态 | 客流 / 客单价 / 复购率 / 坪效 / 毛利 |
| `supplyChain` | 供应链 · 韧性 | 交付周期 / 断供风险 / 牛鞭放大倍数 / 库存周转 / 履约成本 |
| `macro` | 宏观经济推演 | GDP增速 / 通胀率 / 失业率 / 汇率 / 利率 / 消费信心 |
| `ai` | AI 行业竞争 · 框架之战 | 框架采用率 / 开源活跃度 / 生态工具数 / 推理成本 / 开发者满意度 / 商业化收入 |

新增场景：复制 `scenarios/retail.js`，改 `domain` 与 `{domain}` 占位符即可，推理引擎零改动。

## ⚠️ 可信度红线

> 推演 ≠ 预测 · 置信度仅表征内部自洽程度 · 参谋非司令

LLM 推演结果基于假设场景，不等于现实概率。重大决策须结合实际数据反向复盘校准。

## 📄 License

MIT
