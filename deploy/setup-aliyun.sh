#!/usr/bin/env bash
# GodView · 阿里云轻量应用服务器 / ECS 一键部署
# 适用：Alibaba Cloud Linux 3 / CentOS 7+ / Ubuntu 20.04+
#
# 用法（在服务器上）：
#   curl -O https://raw.githubusercontent.com/Licktlove/GodView/main/deploy/setup-aliyun.sh
#   chmod +x setup-aliyun.sh && ./setup-aliyun.sh
#
# 或者：git clone 仓库后执行 bash deploy/setup-aliyun.sh
#
# 注意：安全组需自行在阿里云控制台放行 80 / 443 端口（脚本无法代劳）

set -e

REPO="https://github.com/Licktlove/GodView.git"
DIR="${GODVIEW_DIR:-$HOME/GodView}"

echo "===== 1/5 安装 Docker ====="
if ! command -v docker >/dev/null 2>&1; then
  # --mirror Aliyun：国内直接走 get.docker.com 常超时，必须用阿里云镜像源
  curl -fsSL https://get.docker.com | sh -s -- --mirror Aliyun
  # 阿里云镜像加速（国内拉镜像快很多）
  sudo mkdir -p /etc/docker
  sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": ["https://registry.cn-hangzhou.aliyuncs.com"]
}
EOF
  sudo systemctl enable --now docker
  echo "Docker 已安装"
else
  echo "Docker 已存在，跳过"
fi

echo "===== 2/5 获取代码 ====="
if [ -d "$DIR/.git" ]; then
  cd "$DIR" && git pull
elif git clone "$REPO" "$DIR" 2>/dev/null; then
  cd "$DIR"
else
  # 服务器上 GitHub 常常拉不动 —— 改在本机打包后 scp 上传（见 DEPLOY.md 方式 E）
  echo "⚠️  GitHub 克隆失败（国内网络常见）。请在本机执行："
  echo "    zip -qr godview.zip . -x 'node_modules/*' '.git/*' 'video/shots/*'"
  echo "    scp godview.zip root@<公网IP>:$HOME/"
  echo "  然后在服务器上：cd ~ && unzip -q godview.zip -d GodView && cd GodView"
  exit 1
fi

echo "===== 3/5 配置环境变量 ====="
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo
  echo "⚠️  请编辑 backend/.env 填入 LLM_API_KEY（其余已预置）："
  echo "    vi $DIR/backend/.env"
  echo
  echo "填好后重跑本脚本即可继续构建；或现在手动输入密钥（直接回车跳过）："
  read -r -s -p "LLM_API_KEY: " KEY
  echo
  if [ -n "$KEY" ]; then
    sed -i.bak "s|^LLM_API_KEY=.*|LLM_API_KEY=$KEY|" backend/.env && rm -f backend/.env.bak
    echo "已写入密钥"
  fi
else
  echo "backend/.env 已存在，跳过"
fi

echo "===== 4/5 构建并启动 ====="
sudo docker compose up -d --build

echo "===== 5/5 配置 Nginx（可选，用于 80 端口与 SSE） ====="
if command -v nginx >/dev/null 2>&1; then
  sudo cp deploy/nginx-godview.conf /etc/nginx/conf.d/godview.conf
  sudo nginx -t && sudo systemctl reload nginx
  echo "Nginx 已反代到 80 端口"
else
  echo "未安装 nginx，可稍后安装后执行："
  echo "  sudo yum install -y nginx   # 或 apt install -y nginx"
  echo "  sudo cp deploy/nginx-godview.conf /etc/nginx/conf.d/ && sudo nginx -t && sudo systemctl reload nginx"
fi

sleep 3
echo
echo "===== 完成 ====="
echo "健康检查："
curl -s http://127.0.0.1/api/health || true
echo
echo
echo "别忘了在阿里云控制台 → 安全组 → 放行 80（和 443）端口！"
