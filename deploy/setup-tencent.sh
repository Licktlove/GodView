#!/usr/bin/env bash
# GodView · 腾讯云轻量应用服务器 / CVM 一键部署
# 适用：Ubuntu 22.04+ / Debian 11+ / TencentOS 3
#
# 用法（在服务器上）：
#   curl -O https://raw.githubusercontent.com/Licktlove/GodView/main/deploy/setup-tencent.sh
#   chmod +x setup-tencent.sh && ./setup-tencent.sh
#
# 前置：腾讯云控制台 → 防火墙放行 22 / 80 / 443

set -e

REPO="https://github.com/Licktlove/GodView.git"
DIR="${GODVIEW_DIR:-$HOME/GodView}"

echo "===== 1/5 安装 Docker ====="
if ! command -v docker >/dev/null 2>&1; then
  # 腾讯云内网镜像源，避免 get.docker.com 超时
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu/gpg | \
      sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -y && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    # TencentOS / CentOS 系
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://mirrors.cloud.tencent.com/docker-ce/linux/centos/docker-ce.repo
    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  sudo systemctl enable --now docker
  echo "Docker 已安装"
else
  echo "Docker 已存在，跳过"
fi

# Docker Hub 拉取加速（腾讯云内网镜像）
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
EOF
sudo systemctl restart docker

echo "===== 2/5 获取代码 ====="
if [ -d "$DIR/.git" ]; then
  cd "$DIR" && git pull
elif git clone "$REPO" "$DIR" 2>/dev/null; then
  cd "$DIR"
else
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
  echo "⚠️  请编辑 backend/.env 填入 LLM_API_KEY："
  echo "    vi $DIR/backend/.env"
  echo
  echo "或现在直接输入密钥（回车跳过，稍后手动填）："
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

echo "===== 5/5 验证 ====="
sleep 3
curl -s http://127.0.0.1:8080/api/health || true
echo
echo
echo "===== 完成 ====="
echo "访问：http://<你的公网IP>:8080"
echo "（可选）配 Nginx 反代到 80 端口，配置见 deploy/nginx-godview.conf（SSE 免缓冲已配好）"
