#!/usr/bin/env bash
# GodView · 一键换模型（带体检 + 失败自动回滚）
#
# 用法（在服务器上）：
#   cd /root/GodView && ./switch-model.sh qwen3.8-flash
#
# 体检项：
#   1) 普通调用是否通
#   2) JSON 模式是否支持（"生成世界"强依赖 response_format=json_object）
# 任一不通过 → 自动还原原配置，线上不受影响。

set -u
MODEL="${1:-}"
if [ -z "$MODEL" ]; then
  echo "用法: $0 <模型名>      例如: $0 qwen3.8-flash"
  echo "可用模型可先跑: $0 --list"
  exit 1
fi

cd /root/GodView
ENVF=backend/.env
cp "$ENVF" "$ENVF.bak"

KEY=$(grep '^LLM_API_KEY=' "$ENVF" | cut -d= -f2-)
BASE=$(grep '^LLM_BASE_URL=' "$ENVF" | cut -d= -f2-)
OLD=$(grep '^LLM_MODEL=' "$ENVF" | cut -d= -f2-)

if [ "$MODEL" = "--list" ]; then
  curl -s --max-time 25 "$BASE/models" -H "Authorization: Bearer $KEY" \
    | grep -oE '"id":"[^"]+"' | sed 's/"id"://;s/"//g' | grep -Ei 'qwen|deepseek|glm|step' | head -40
  exit 0
fi

echo "当前模型: $OLD"
echo "目标模型: $MODEL"

check_json() {
  curl -s --max-time 40 -X POST "$BASE/chat/completions" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"只输出JSON，不要其他内容: {\\\"ok\\\":true}\"}],\"max_tokens\":120,\"enable_thinking\":false,\"response_format\":{\"type\":\"json_object\"}}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
c = d.get('choices', [{}])[0].get('message', {}).get('content', '')
u = d.get('usage', {})
json.loads(c)   # 必须是合法 JSON
print('JSON 模式: OK   总token:', u.get('total_tokens'))
" 2>/dev/null
}

check_plain() {
  curl -s --max-time 40 -X POST "$BASE/chat/completions" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"只回复OK\"}],\"max_tokens\":60,\"enable_thinking\":false}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
c = d.get('choices', [{}])[0].get('message', {}).get('content', '')
u = d.get('usage', {})
if 'error' in d: raise SystemExit(1)
print('普通调用: OK   总token:', u.get('total_tokens'), '  回答:', c.strip()[:30])
" 2>/dev/null
}

echo "--- 体检 1/2 ---"
if ! check_plain; then
  echo "❌ 普通调用失败，已回滚，当前仍为: $OLD"
  cp "$ENVF.bak" "$ENVF"; exit 1
fi

echo "--- 体检 2/2 ---"
if ! check_json; then
  echo "❌ 该模型不支持 JSON 模式（生成世界会失败），已回滚，当前仍为: $OLD"
  cp "$ENVF.bak" "$ENVF"; exit 1
fi

echo "--- 写入配置并重建 ---"
sed -i "s|^LLM_MODEL=.*|LLM_MODEL=$MODEL|" "$ENVF"
docker compose up -d --force-recreate >/dev/null 2>&1
sleep 5

echo "--- 验证 ---"
curl -s --max-time 10 http://127.0.0.1/api/health
echo
PUB=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://121.40.52.164/ 2>/dev/null)
echo "外网首页: $PUB"
echo
echo "✅ 已切换到: $MODEL （原模型备份在 $ENVF.bak，回退: cp $ENVF.bak $ENVF && docker compose up -d --force-recreate）"
