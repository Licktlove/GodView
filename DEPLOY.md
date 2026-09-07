# GodView 部署指南（给评委的在线 Demo 链接）

架构：**单服务单域名** —— Express 后端同时提供 `/api/*` 接口和托管前端 `frontend/dist` 静态产物，
所以线上只需要起**一个**进程、**一个**网址，没有跨域、没有 CORS、没有前后端两个地址要维护。

```
浏览器 ──► https://你的域名/            → 前端 SPA（由后端托管）
        └─► https://你的域名/api/*      → LLM 代理 / 实验存档
```

LLM 密钥**只在服务端环境变量里**，前端永远拿不到。

---

## 一、环境变量（三种平台都一样）

| 变量 | 值 | 说明 |
|---|---|---|
| `PORT` | `3001` | 容器内固定 3001；平台会自动注入自己的 PORT，代码已读 `process.env.PORT` |
| `LLM_BASE_URL` | `https://ai-router.dmall.com/v1` | 多点 ai-router 网关（已验证外网可达） |
| `LLM_MODEL` | `qwen3.6-flash` | 可换成网关上任意模型 |
| `LLM_API_KEY` | `sk-...` | **只在平台后台填，绝不进 Git** |

---

## 二、三种部署方式（任选其一）

### 方式 A：Render（推荐，最快，免费档够用）

1. 把仓库推到 GitHub（已推则跳过）
2. 登录 [render.com](https://render.com) → **New → Blueprint** → 选 `Licktlove/GodView`
3. 自动识别根目录 `render.yaml` → 填 `LLM_API_KEY`（其余已预置）
4. 点 Apply，等 3~5 分钟构建完成 → 得到 `https://godview.onrender.com`

> 免费档 15 分钟无访问会休眠，首次打开要等约 30 秒冷启动。
> **比赛期间建议升 Starter（约 $7/月）保持常驻**，否则评委点开要干等。

### 方式 B：Fly.io（冷启动更友好）

```bash
fly auth login
fly apps create godview          # 或改 fly.toml 里的 app 名
fly secrets set LLM_API_KEY=sk-你的密钥
fly deploy                        # 用根目录 Dockerfile
```
得到 `https://godview.fly.dev`。`fly.toml` 已设 `min_machines_running = 1`，不会冷启动。

### 方式 C：自有服务器 / 公司内网（最合规，密钥不出公司）

任意一台能跑 Docker 的机器：

```bash
git clone git@github.com:Licktlove/GodView.git && cd GodView
cp backend/.env.example backend/.env && vi backend/.env   # 填密钥
docker compose up -d --build
# 打开 http://<机器IP>:8080
```
不用 Docker 也行（需 Node 18+）：
```bash
npm install --prefix frontend && npm run build --prefix frontend
npm install --prefix backend   && npm start --prefix backend
```

### 方式 D：腾讯云轻量 / 云服务器

用 **方式 C** 的 Docker 方式即可；再配个 Nginx 反代 80/443 → 8080，加个免费 HTTPS 证书，
链接就是 `https://godview.你的域名` —— 比 `onrender.com` 更正式，适合写进报名表。

---

## 三、部署后必须验证（提交材料前逐条过）

| # | 检查项 | 期望 |
|---|---|---|
| 1 | `curl https://域名/api/health` | 返回 `{"ok":true,"model":"qwen3.6-flash","keyConfigured":true}` |
| 2 | 浏览器打开根路径 | 首页正常，无 404、无控制台报错 |
| 3 | 进工作台 → **加载示例** | 图谱出现 14+ 实体（这一步不调 LLM，用来验证前端） |
| 4 | 输入命题 → **生成世界** | 实体生成成功（验证 LLM 链路通） |
| 5 | 点节点 → 提问 | 访谈有流式回答 |
| 6 | **生成报告** | 报告出得来（验证完整链路） |
| 7 | 换一台网络（手机 4G）访问 | 能打开，不需要内网/VPN |

第 3~6 条有一条挂了，通常是 `LLM_API_KEY` 没填或网关拒绝来源 IP。

---

## 四、风险与注意

- **密钥**：只放平台环境变量。`backend/.env` 已被 `.gitignore` 忽略，`render.yaml` 里 `LLM_API_KEY` 是 `sync: false`（不入库）。
- **冷启动**：Render 免费档会休眠；比赛当天建议用常驻档，或改 Fly.io / 自有服务器。
- **数据落盘**：实验快照写在 `backend/data/`，容器重建会丢。比赛演示不受影响；要长期保存就挂个 volume：
  ```yaml
  volumes:
    - ./backend/data:/app/backend/data
  ```
- **网关来源 IP**：`ai-router.dmall.com` 目前外网可达（返回 401 = 仅鉴权拦截）。若部署后 LLM 调用 403/超时，多半是网关侧白名单，需要找 ai-router 管理员加一下出口 IP。
- **兜底**：无论线上如何，**演示视频一定要一并提交**——评审明确写了"链接失效会影响评审"。

---

## 五、我改了什么

- 新增 `Dockerfile`（两阶段：构建前端 → 后端托管）
- 新增 `docker-compose.yml`、`render.yaml`、`fly.toml`、`.dockerignore`、`backend/.env.example`
- 删除 `backend/package.json` 里的僵尸依赖 `"god-view-sandbox": "file:.."`（无人 require，且会让 Docker 构建把整个父目录打进去）
