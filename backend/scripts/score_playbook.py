#!/usr/bin/env python3
"""Score playbook actions against holdout week; keep misses on the board."""
from __future__ import annotations

import csv
import json
import os
from datetime import datetime
from pathlib import Path

SRC = os.environ.get(
    "GODVIEW_POS_CSV",
    r"C:\Users\admin\Desktop\物美数据\part-00000-975e4179-364c-4456-a5ec-4b55c253a427-c000_cleaned.csv",
)
OPS = Path(__file__).resolve().parents[1] / "data" / "xueqing" / "store_ops.json"
HOLDOUT_START = "20260624"
BULK_HINTS = ("企业团购", "企业购")


def fen(v):
    try:
        return float(v or 0) / 100.0
    except (TypeError, ValueError):
        return 0.0


def num(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def money(x):
    return round(float(x or 0), 2)


def is_floor(row):
    blob = " ".join([
        row.get("trans_type_name2") or "",
        row.get("trans_type_name3") or "",
        row.get("trans_type_name4") or "",
    ])
    return not any(h in blob for h in BULK_HINTS)


def hour_of(row):
    t = (row.get("order_complete_time") or row.get("order_create_time") or "")[:19]
    try:
        return datetime.strptime(t, "%Y-%m-%d %H:%M:%S").hour
    except ValueError:
        return None


def blank_sku():
    return {
        "train_gmv": 0.0, "train_profit": 0.0, "train_discount": 0.0,
        "w1_gmv": 0.0,
        "hold_gmv": 0.0, "hold_profit": 0.0, "hold_discount": 0.0,
        "hold_promo_gmv": 0.0, "hold_promo_profit": 0.0, "hold_promo_discount": 0.0,
    }


def verdict_push(s, expected_week):
    if s["hold_gmv"] <= 1:
        return "insufficient", "盲测周几乎没有成交，无法判断主推对不对"
    if s["hold_profit"] < 0 or s["hold_gmv"] < 0.3 * expected_week:
        return "miss", f"盲测周销售 {money(s['hold_gmv'])} 元、毛利 {money(s['hold_profit'])} 元，主推假设被打脸"
    if s["hold_profit"] > 0 and s["hold_gmv"] >= 0.5 * expected_week:
        return "hit", f"盲测周销售 {money(s['hold_gmv'])} 元、毛利 {money(s['hold_profit'])} 元，主推方向被坐实"
    return "insufficient", f"盲测周销售 {money(s['hold_gmv'])} 元、毛利 {money(s['hold_profit'])} 元，信号不够硬"


def verdict_cut(s):
    w1_week = s["w1_gmv"] / 7.0 * 7.0
    hold = s["hold_gmv"]
    if w1_week <= 1 and hold <= 1:
        return "insufficient", "训练期与盲测周都几乎无量，无法判断该不该砍"
    if hold >= 0.8 * w1_week and hold > 80:
        return "miss", f"盲测周日均回升到 {money(hold / 7)} 元，接近月初，砍面可能误杀"
    if hold < 0.5 * w1_week:
        return "hit", f"盲测周销售仅 {money(hold)} 元，仍远低于月初，减面被坐实"
    return "insufficient", f"盲测周销售 {money(hold)} 元，介于回升与继续掉之间"


def verdict_stop(s):
    if s["hold_promo_discount"] > 20 and (s["hold_promo_profit"] < 0 or s["hold_profit"] < 0):
        return "hit", f"盲测周仍在促，让利 {money(s['hold_promo_discount'])} 元、促销毛利 {money(s['hold_promo_profit'])} 元，停促被坐实"
    if s["hold_profit"] > 50 and s["hold_promo_profit"] >= 0 and s["hold_gmv"] > 80:
        return "miss", f"盲测周毛利 {money(s['hold_profit'])} 元且促销不再明显亏，停促被打脸"
    if s["hold_gmv"] <= 1:
        return "insufficient", "盲测周该品几乎无成交，停促对错判不清"
    return "insufficient", f"盲测周销售 {money(s['hold_gmv'])} 元、毛利 {money(s['hold_profit'])} 元，停促证据不够硬"


def main():
    ops = json.loads(OPS.read_text(encoding="utf-8"))
    playbook = ops.get("playbook") or []
    sku_ids = {a.get("skuId") for a in playbook if a.get("skuId")}
    stats = {sid: blank_sku() for sid in sku_ids}
    hour = {
        "train": {"eve": 0.0, "all": 0.0},
        "hold": {"eve": 0.0, "all": 0.0},
    }

    with open(SRC, "r", encoding="utf-8", errors="replace", newline="") as f:
        for row in csv.DictReader(f):
            dt = (row.get("dt") or "").strip()
            if len(dt) != 8 or not dt.isdigit():
                continue
            if (row.get("refund_flag") or "0").strip() not in ("0", "0.0", ""):
                continue
            if num(row.get("sale_num")) <= 0:
                continue
            if not is_floor(row):
                continue
            gmv = fen(row.get("actual_sale_taxed_amt"))
            cost = fen(row.get("cost_taxed_amt"))
            discount = fen(row.get("promotion_amt")) + fen(row.get("coupon_amt")) + fen(row.get("pay_discount_amt")) + fen(row.get("vender_promotion_amt"))
            profit = gmv - cost
            split = "hold" if dt >= HOLDOUT_START else "train"
            h = hour_of(row)
            hour[split]["all"] += gmv
            if h is not None and 17 <= h <= 21:
                hour[split]["eve"] += gmv
            sid = (row.get("matnr") or "").strip()
            if sid not in stats:
                continue
            s = stats[sid]
            promo = discount > 0.009
            if split == "train":
                s["train_gmv"] += gmv
                s["train_profit"] += profit
                s["train_discount"] += discount
                if dt <= "20260607":
                    s["w1_gmv"] += gmv
            else:
                s["hold_gmv"] += gmv
                s["hold_profit"] += profit
                s["hold_discount"] += discount
                if promo:
                    s["hold_promo_gmv"] += gmv
                    s["hold_promo_profit"] += profit
                    s["hold_promo_discount"] += discount

    train_eve_share = (100.0 * hour["train"]["eve"] / hour["train"]["all"]) if hour["train"]["all"] else 0
    hold_eve_share = (100.0 * hour["hold"]["eve"] / hour["hold"]["all"]) if hour["hold"]["all"] else 0
    train_member = (ops.get("facts") or {}).get("train") or {}
    hold_member = (ops.get("facts") or {}).get("holdout") or {}

    counts = {"hit": 0, "miss": 0, "insufficient": 0}
    for a in playbook:
        kind = a.get("kind")
        sid = a.get("skuId") or ""
        s = stats.get(sid) or blank_sku()
        expected_week = (s["train_gmv"] / 23.0) * 7 if s["train_gmv"] else 0
        if kind == "push":
            code, note = verdict_push(s, expected_week)
        elif kind == "cut":
            code, note = verdict_cut(s)
        elif kind == "stop_promo":
            code, note = verdict_stop(s)
        elif a.get("cat") == "全店":
            if hold_eve_share >= 25:
                code, note = "hit", f"盲测周晚高峰仍占到店销售 {round(hold_eve_share, 1)}%（训练期 {round(train_eve_share, 1)}%），补货窗口被坐实"
            elif hold_eve_share < 15:
                code, note = "miss", f"盲测周晚高峰只占 {round(hold_eve_share, 1)}%，晚高峰补货被打脸"
            else:
                code, note = "insufficient", f"盲测周晚高峰占比 {round(hold_eve_share, 1)}%，节奏信号不够硬"
        elif a.get("cat") == "会员":
            tm = float(train_member.get("member_share") or 0)
            hm = float(hold_member.get("member_share") or 0)
            if hm >= tm - 5:
                code, note = "hit", f"盲测周会员订单占比 {hm}%（训练期 {tm}%），会员优先仍被坐实"
            elif hm < tm - 10:
                code, note = "miss", f"盲测周会员占比掉到 {hm}%（训练期 {tm}%），会员优先被打脸"
            else:
                code, note = "insufficient", f"盲测周会员占比 {hm}%，变化不足以判决"
        else:
            code, note = "insufficient", "没有对应 SKU 的盲测样本"
        label = {"hit": "盲测坐实", "miss": "盲测打脸", "insufficient": "证据不足"}[code]
        a["backtestVerdict"] = code
        a["backtestLabel"] = label
        a["holdoutEvidence"] = note
        a.pop("simStatus", None)
        counts[code] += 1

    bt = ops.setdefault("backtest", {})
    bt["actionSummary"] = {
        "hit": counts["hit"],
        "miss": counts["miss"],
        "insufficient": counts["insufficient"],
        "note": "动作级盲测：24–30 日真数对照 1–23 日给出的推/砍/停促。打脸条目保留，证明可证伪。",
    }
    bt["eveningShare"] = {"train": round(train_eve_share, 1), "holdout": round(hold_eve_share, 1)}
    OPS.write_text(json.dumps(ops, ensure_ascii=False, indent=2), encoding="utf-8")
    print("scored", counts)


if __name__ == "__main__":
    main()
