# GodView · 单服务全栈镜像
# 阶段 1 构建前端静态产物，阶段 2 由 Express 后端同时托管 dist 与 /api，
# 因此线上只有一个域名、一个端口，不存在跨域问题。
#
# 构建： docker build -t godview .
# 运行： docker run -p 8080:3001 --env-file backend/.env godview
#        （或用 docker compose up -d）

# ---------- 阶段 1：构建前端 ----------
FROM node:22-alpine AS builder
WORKDIR /app/frontend
# 国内构建加速；包内容不受影响，海外构建也可用
RUN npm config set registry https://registry.npmmirror.com
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 阶段 2：运行后端（同时托管前端 dist） ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# 只装生产依赖（express / cors / dotenv）
COPY backend/package.json /app/backend/package.json
RUN npm config set registry https://registry.npmmirror.com && cd /app/backend && npm install --omit=dev --no-audit --no-fund

COPY backend/server.js /app/backend/server.js
# server.js 从 ../frontend/dist 读取静态产物，路径必须保持这一层关系
COPY --from=builder /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
