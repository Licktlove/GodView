# GodView 项目规则

## 不可违反

- 保留工作区中已有的用户改动；只修改直接服务于当前目标的文件。
- 不提交 commit，不创建分支，除非用户明确要求。
- 促销诊断的数值只能来自 `backend/data/xueqing/store_ops.json` 的训练期数据；盲测数据只能用于回放验证。
- 大模型只解释已计算证据，不负责生成事实、修改指标或绕过业务约束。

## 验证命令

- `npm run build --prefix frontend`
- `node --check backend/server.js`
- `PYTHONPYCACHEPREFIX=/private/tmp/godview-pycache python3 -m py_compile backend/scripts/ingest_pos.py backend/scripts/score_playbook.py`
