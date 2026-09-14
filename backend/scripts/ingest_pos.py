#!/usr/bin/env python3
"""Aggregate 学清路店 POS into store_ops.json for GodView ACT 作战台."""
from __future__ import annotations

import csv
import json
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SRC = os.environ.get(
    "GODVIEW_POS_CSV",
    r"C:\Users\admin\Desktop\物美数据\part-00000-975e4179-364c-4456-a5ec-4b55c253a427-c000_cleaned.csv",
)
OUT = Path(__file__).resolve().parents[1] / "data" / "xueqing" / "store_ops.json"

TRAIN_END = "20260623"
HOLDOUT_START = "20260624"
FLOOR_CHANNELS = {"线下商超", "智能购", "线下超市", "自助购"}
BULK_HINTS = ("企业团购", "企业购")

CAT_RULES = [
    ("乳品", ("酸奶", "牛奶", "纯牛奶", "酸牛奶", "乳", "奶酪", "黄油")),
    ("粮油米面", ("大米", "面粉", "食用油", "花生油", "菜籽", "挂面", "香油")),
    ("生鲜", ("猪肉", "牛肉", "羊肉", "鸡肉", "鱼", "虾", "菜", "水果", "苹果", "香蕉", "叶菜")),
    ("饮料", ("可乐", "雪碧", "果汁", "茶饮料", "矿泉水", "苏打", "咖啡")),
    ("零食", ("饼干", "薯片", "巧克力", "糖果", "瓜子", "坚果", "面包")),
    ("日化", ("洗衣液", "牙膏", "纸巾", "卫生纸", "洗发", "沐浴露", "蚊香")),
    ("酒水", ("啤酒", "白酒", "葡萄酒", "黄酒")),
]


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


def category(name):
    for cat, kws in CAT_RULES:
        if any(k in name for k in kws):
            return cat
    return "其他"


def is_floor(row):
    blob = " ".join([
        row.get("trans_type_name2") or "",
        row.get("trans_type_name3") or "",
        row.get("trans_type_name4") or "",
    ])
    if any(h in blob for h in BULK_HINTS):
        return False
    return True


def weekday(dt):
    return datetime.strptime(dt, "%Y%m%d").weekday()  # 0=Mon


def hour_of(row):
    t = (row.get("order_complete_time") or row.get("order_create_time") or "")[:19]
    try:
        return datetime.strptime(t, "%Y-%m-%d %H:%M:%S").hour
    except ValueError:
        return None


def bucket_hour(h):
    if h is None:
        return "未知"
    if 7 <= h <= 10:
        return "早高峰 07–10"
    if 11 <= h <= 14:
        return "午间 11–14"
    if 17 <= h <= 21:
        return "晚高峰 17–21"
    return "其余时段"


def money(x):
    return round(float(x or 0), 2)


def pct(n, d):
    return round(100.0 * n / d, 1) if d else 0.0


def mape(pred, actual):
    if actual == 0:
        return None
    return round(abs(pred - actual) / abs(actual) * 100.0, 1)


def blank_kpi():
    return {
        "days": 0,
        "lines": 0,
        "orders": 0,
        "gmv": 0.0,
        "cost": 0.0,
        "profit": 0.0,
        "discount": 0.0,
        "qty": 0.0,
        "member_orders": 0,
        "promo_gmv": 0.0,
    }


def add_kpi(k, gmv, cost, profit, discount, qty, member, promo):
    k["lines"] += 1
    k["gmv"] += gmv
    k["cost"] += cost
    k["profit"] += profit
    k["discount"] += discount
    k["qty"] += qty
    if promo:
        k["promo_gmv"] += gmv


def finalize_kpi(k, n_days, n_orders, n_member_orders):
    k["days"] = n_days
    k["orders"] = n_orders
    k["member_orders"] = n_member_orders
    k["gmv"] = money(k["gmv"])
    k["cost"] = money(k["cost"])
    k["profit"] = money(k["profit"])
    k["discount"] = money(k["discount"])
    k["qty"] = round(k["qty"], 1)
    k["margin"] = pct(k["profit"], k["gmv"])
    k["aov"] = money(k["gmv"] / n_orders) if n_orders else 0
    k["member_share"] = pct(n_member_orders, n_orders)
    k["promo_share"] = pct(k["promo_gmv"], k["gmv"])
    k["promo_gmv"] = money(k["promo_gmv"])
    return k


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f"POS csv not found: {SRC}")

    daily = defaultdict(lambda: {
        "gmv": 0.0, "profit": 0.0, "orders": set(), "floor_gmv": 0.0, "floor_profit": 0.0,
        "floor_orders": set(), "discount": 0.0,
    })
    channel = defaultdict(lambda: {"gmv": 0.0, "orders": set(), "lines": 0})
    hour_b = defaultdict(lambda: {"gmv": 0.0, "orders": set()})
    cat = defaultdict(lambda: {"gmv": 0.0, "profit": 0.0, "qty": 0.0})
    skus = {}
    store_name = "学清路店"
    store_code = "1365"
    dts = set()
    train_orders = set()
    hold_orders = set()
    train_member_orders = set()
    hold_member_orders = set()
    all_orders = set()
    all_member = set()
    train_kpi = blank_kpi()
    hold_kpi = blank_kpi()
    full_kpi = blank_kpi()
    floor_train_kpi = blank_kpi()
    n = 0
    skipped = 0

    with open(SRC, "r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            n += 1
            dt = (row.get("dt") or "").strip()
            if len(dt) != 8 or not dt.isdigit():
                skipped += 1
                continue
            refund = (row.get("refund_flag") or "0").strip()
            if refund not in ("0", "0.0", ""):
                skipped += 1
                continue
            qty = num(row.get("sale_num"))
            if qty <= 0:
                skipped += 1
                continue
            name = (row.get("ware_name") or "").strip()
            if not name:
                skipped += 1
                continue

            store_name = (row.get("store_name") or store_name).strip() or store_name
            store_code = (row.get("store_code") or store_code).strip() or store_code
            gmv = fen(row.get("actual_sale_taxed_amt"))
            cost = fen(row.get("cost_taxed_amt"))
            discount = fen(row.get("promotion_amt")) + fen(row.get("coupon_amt")) + fen(row.get("pay_discount_amt")) + fen(row.get("vender_promotion_amt"))
            profit = gmv - cost
            oid = row.get("order_id") or ""
            member = (row.get("member_flag") or "0").strip() in ("1", "1.0", "true", "True")
            promo = discount > 0.009
            floor = is_floor(row)
            ch = (row.get("trans_type_name2") or row.get("trans_type_name4") or "其他").strip() or "其他"
            sid = (row.get("matnr") or row.get("item_num") or name).strip()
            cat_name = category(name)
            h = hour_of(row)

            dts.add(dt)
            all_orders.add(oid)
            if member:
                all_member.add(oid)
            d = daily[dt]
            d["gmv"] += gmv
            d["profit"] += profit
            d["discount"] += discount
            d["orders"].add(oid)
            channel[ch]["gmv"] += gmv
            channel[ch]["orders"].add(oid)
            channel[ch]["lines"] += 1
            if floor:
                d["floor_gmv"] += gmv
                d["floor_profit"] += profit
                d["floor_orders"].add(oid)
                hour_b[bucket_hour(h)]["gmv"] += gmv
                hour_b[bucket_hour(h)]["orders"].add(oid)
                cat[cat_name]["gmv"] += gmv
                cat[cat_name]["profit"] += profit
                cat[cat_name]["qty"] += qty

            split = "hold" if dt >= HOLDOUT_START else "train"
            if split == "train":
                add_kpi(train_kpi, gmv, cost, profit, discount, qty, member, promo)
                train_orders.add(oid)
                if member:
                    train_member_orders.add(oid)
                if floor:
                    add_kpi(floor_train_kpi, gmv, cost, profit, discount, qty, member, promo)
            else:
                add_kpi(hold_kpi, gmv, cost, profit, discount, qty, member, promo)
                hold_orders.add(oid)
                if member:
                    hold_member_orders.add(oid)
            add_kpi(full_kpi, gmv, cost, profit, discount, qty, member, promo)

            sku = skus.get(sid)
            if sku is None:
                sku = {
                    "id": sid,
                    "name": name,
                    "barcode": (row.get("item_num") or "").strip(),
                    "cat": cat_name,
                    "train_gmv": 0.0, "train_profit": 0.0, "train_qty": 0.0, "train_discount": 0.0,
                    "train_days": set(), "train_promo_gmv": 0.0, "train_promo_profit": 0.0, "train_promo_discount": 0.0,
                    "w1_gmv": 0.0, "w3_gmv": 0.0,
                    "hold_gmv": 0.0, "hold_profit": 0.0, "hold_qty": 0.0,
                    "floor_train_gmv": 0.0, "floor_train_profit": 0.0, "floor_train_qty": 0.0,
                    "wd_gmv": [0.0] * 7, "wd_n": [0] * 7, "wd_seen": [set() for _ in range(7)],
                }
                skus[sid] = sku
            if split == "train":
                sku["train_gmv"] += gmv
                sku["train_profit"] += profit
                sku["train_qty"] += qty
                sku["train_discount"] += discount
                sku["train_days"].add(dt)
                wd = weekday(dt)
                if dt not in sku["wd_seen"][wd]:
                    sku["wd_n"][wd] += 1
                    sku["wd_seen"][wd].add(dt)
                sku["wd_gmv"][wd] += gmv
                if promo:
                    sku["train_promo_gmv"] += gmv
                    sku["train_promo_profit"] += profit
                    sku["train_promo_discount"] += discount
                if floor:
                    sku["floor_train_gmv"] += gmv
                    sku["floor_train_profit"] += profit
                    sku["floor_train_qty"] += qty
                    if dt <= "20260607":
                        sku["w1_gmv"] += gmv
                    elif dt >= "20260615":
                        sku["w3_gmv"] += gmv
            else:
                sku["hold_gmv"] += gmv
                sku["hold_profit"] += profit
                sku["hold_qty"] += qty

    train_days = sorted(d for d in dts if d <= TRAIN_END)
    hold_days = sorted(d for d in dts if d >= HOLDOUT_START)
    all_days = sorted(dts)

    finalize_kpi(train_kpi, len(train_days), len(train_orders), len(train_member_orders))
    finalize_kpi(hold_kpi, len(hold_days), len(hold_orders), len(hold_member_orders))
    finalize_kpi(full_kpi, len(all_days), len(all_orders), len(all_member))
    floor_train_orders = 0
    for d in train_days:
        floor_train_orders += len(daily[d]["floor_orders"])
    finalize_kpi(floor_train_kpi, len(train_days), floor_train_orders, 0)

    daily_out = []
    train_daily_gmv = []
    wd_store = [[] for _ in range(7)]
    for d in all_days:
        rec = daily[d]
        item = {
            "dt": d,
            "split": "holdout" if d >= HOLDOUT_START else "train",
            "gmv": money(rec["gmv"]),
            "profit": money(rec["profit"]),
            "orders": len(rec["orders"]),
            "floor_gmv": money(rec["floor_gmv"]),
            "floor_profit": money(rec["floor_profit"]),
            "floor_orders": len(rec["floor_orders"]),
        }
        daily_out.append(item)
        if d <= TRAIN_END:
            train_daily_gmv.append(rec["floor_gmv"])
            wd_store[weekday(d)].append(rec["floor_gmv"])

    wd_mean = [ (sum(xs) / len(xs) if xs else (sum(train_daily_gmv) / len(train_daily_gmv) if train_daily_gmv else 0)) for xs in wd_store ]
    pred_hold_gmv = 0.0
    actual_hold_gmv = 0.0
    actual_hold_profit = 0.0
    pred_hold_profit_ratio = (floor_train_kpi["profit"] / floor_train_kpi["gmv"]) if floor_train_kpi["gmv"] else 0
    for d in hold_days:
        pred_hold_gmv += wd_mean[weekday(d)]
        actual_hold_gmv += daily[d]["floor_gmv"]
        actual_hold_profit += daily[d]["floor_profit"]
    pred_hold_profit = pred_hold_gmv * pred_hold_profit_ratio

    # SKU weekday forecast for top overlap
    floor_skus = [s for s in skus.values() if s["floor_train_gmv"] > 1]
    for s in floor_skus:
        pred = 0.0
        for d in hold_days:
            wd = weekday(d)
            if s["wd_n"][wd]:
                pred += s["wd_gmv"][wd] / s["wd_n"][wd]
            elif sum(s["wd_n"]):
                pred += s["train_gmv"] / max(1, len(s["train_days"]))
        s["pred_hold_gmv"] = pred

    top_n = 20
    actual_top = sorted(floor_skus, key=lambda x: x["hold_gmv"], reverse=True)[:top_n]
    pred_top = sorted(floor_skus, key=lambda x: x.get("pred_hold_gmv", 0), reverse=True)[:top_n]
    actual_ids = {x["id"] for x in actual_top}
    pred_ids = {x["id"] for x in pred_top}
    overlap = len(actual_ids & pred_ids)

    sku_mapes = []
    for s in floor_skus:
        if s["hold_gmv"] >= 30 and s.get("pred_hold_gmv", 0) > 0:
            sku_mapes.append(abs(s["pred_hold_gmv"] - s["hold_gmv"]) / s["hold_gmv"] * 100)
    sku_mapes.sort()
    sku_mape_med = round(sku_mapes[len(sku_mapes) // 2], 1) if sku_mapes else None

    channels = sorted(
        [{"name": k, "gmv": money(v["gmv"]), "orders": len(v["orders"]), "lines": v["lines"]} for k, v in channel.items()],
        key=lambda x: -x["gmv"],
    )
    hours = [
        {"name": k, "gmv": money(v["gmv"]), "orders": len(v["orders"])}
        for k, v in hour_b.items() if k != "未知"
    ]
    hours.sort(key=lambda x: -x["gmv"])
    cats = sorted(
        [{"name": k, "gmv": money(v["gmv"]), "profit": money(v["profit"]), "margin": pct(v["profit"], v["gmv"])} for k, v in cat.items()],
        key=lambda x: -x["gmv"],
    )

    # Playbook from train floor only
    push_pool = [s for s in floor_skus if s["floor_train_profit"] > 20 and s["floor_train_gmv"] > 80]
    push_pool.sort(key=lambda s: (s["w3_gmv"] / 9.0) - (s["w1_gmv"] / 7.0) + s["floor_train_profit"] / 50.0, reverse=True)
    cut_pool = [s for s in floor_skus if s["w1_gmv"] > 40 and s["w3_gmv"] / 9.0 < 0.45 * (s["w1_gmv"] / 7.0)]
    cut_pool.sort(key=lambda s: (s["w1_gmv"] / 7.0) - (s["w3_gmv"] / 9.0), reverse=True)
    lose_pool = [s for s in floor_skus if s["train_promo_discount"] > 20 and (s["train_promo_profit"] < 0 or s["train_promo_discount"] > max(s["train_promo_profit"], 0) * 1.2)]
    lose_pool.sort(key=lambda s: s["train_promo_discount"] - s["train_promo_profit"], reverse=True)

    playbook = []

    def add_action(kind, who, when, sku, action, evidence, expected, stop):
        playbook.append({
            "id": "a" + str(len(playbook) + 1),
            "kind": kind,
            "who": who,
            "when": when,
            "skuId": sku["id"] if sku else "",
            "sku": sku["name"] if sku else "",
            "cat": sku["cat"] if sku else "",
            "action": action,
            "evidence": evidence,
            "expected": expected,
            "stop": stop,
        })

    for s in push_pool[:3]:
        lift = money((s["w3_gmv"] / 9.0) - (s["w1_gmv"] / 7.0))
        add_action(
            "push", "理货 / 店长", "下周一开店前", s,
            f"主推「{s['name']}」：黄金位补货、晚高峰保持不断货",
            f"1–23日到店销售额 {money(s['floor_train_gmv'])} 元，毛利 {money(s['floor_train_profit'])} 元；月中后日均比月初 {'+' if lift>=0 else ''}{lift} 元",
            f"守住该品到店毛利贡献（训练期 {money(s['floor_train_profit'])} 元）",
            "若下周连续 3 天日销低于训练期日均的 50%，撤回堆头",
        )

    for s in cut_pool[:2]:
        add_action(
            "cut", "店长 / 采购", "本周例会定，下周执行", s,
            f"砍「{s['name']}」排面：减陈列面、暂停加订，观察一周",
            f"月初日均 {money(s['w1_gmv']/7)} 元，月中后日均掉到 {money(s['w3_gmv']/9)} 元，到店毛利 {money(s['floor_train_profit'])} 元",
            "把排面让给正在走量的头部品，减少滞销占位",
            "若减面后该品日销回升到月初 80%，恢复一个排面",
        )

    for s in lose_pool[:3]:
        add_action(
            "stop_promo", "店长 / 促销员", "立刻停，最迟下周一档期切换", s,
            f"停「{s['name']}」亏本促：取消让利或改成会员专享小额券",
            f"促销让利 {money(s['train_promo_discount'])} 元，促销期毛利 {money(s['train_promo_profit'])} 元",
            f"把让利从该品挪走，避免继续用折扣换负毛利",
            "若停促后面价销售毛利率仍低于全店训练期水平，考虑汰换",
        )

    # Store-level actions from patterns
    eve = next((h for h in hours if h["name"].startswith("晚高峰")), None)
    if eve and hours and eve["gmv"] >= 0.28 * sum(h["gmv"] for h in hours):
        playbook.append({
            "id": "a" + str(len(playbook) + 1),
            "kind": "ops",
            "who": "理货 / 收银",
            "when": "每日 16:30 前",
            "skuId": "",
            "sku": "",
            "cat": "全店",
            "action": "晚高峰前把头部品补满收银口与主通道，17–21 点不断货",
            "evidence": f"到店晚高峰 17–21 占销售额 {pct(eve['gmv'], sum(h['gmv'] for h in hours))}%（{eve['gmv']} 元）",
            "expected": "减少晚高峰缺货，保住日盘后半段客单",
            "stop": "若补货后该时段销售连续 3 天仍掉超 15%，改查排班而不是继续加陈列",
        })

    member_share = train_kpi["member_share"]
    if member_share >= 40:
        playbook.append({
            "id": "a" + str(len(playbook) + 1),
            "kind": "ops",
            "who": "店长 / 会员岗",
            "when": "下周全周",
            "skuId": "",
            "sku": "",
            "cat": "会员",
            "action": "头部品主推动作优先打给会员：停亏本全场促，改会员价/积分",
            "evidence": f"1–23 日会员订单占比 {member_share}% ，客单价 {train_kpi['aov']} 元",
            "expected": "同样让利更集中在复购客，降低全场砸价",
            "stop": "若会员成交占比掉过 5 个点，检查会员价是否可见",
        })

    playbook = playbook[:10]

    def sku_brief(s, extra="train"):
        return {
            "id": s["id"],
            "name": s["name"],
            "cat": s["cat"],
            "gmv": money(s["floor_train_gmv"] if extra == "train" else s["hold_gmv"]),
            "profit": money(s["floor_train_profit"] if extra == "train" else s["hold_profit"]),
            "qty": round(s["floor_train_qty"] if extra == "train" else s["hold_qty"], 1),
            "discount": money(s["train_discount"]),
            "promoProfit": money(s["train_promo_profit"]),
        }

    seed = (
        f"我是物美「{store_name}」（店号 {store_code}）店长。手里是 2026 年 6 月整月真实 POS："
        f"全月销售额 {full_kpi['gmv']:.0f} 元、毛利 {full_kpi['profit']:.0f} 元、综合毛利率 {full_kpi['margin']}%，"
        f"订单 {full_kpi['orders']} 笔、客单价 {full_kpi['aov']} 元、会员订单占比 {full_kpi['member_share']}%。"
        f"1–23 日到店（排除企业团购）销售额 {floor_train_kpi['gmv']:.0f} 元、毛利 {floor_train_kpi['profit']:.0f} 元、毛利率 {floor_train_kpi['margin']}%。"
        f"让利/促销折扣合计 {train_kpi['discount']:.0f} 元，促销销售占比 {train_kpi['promo_share']}%。"
        f"命题只有一个：根据已发生的成交，下周该推什么、砍什么、停哪几场亏本促销。"
        f"不要讲空话，动作必须落到 SKU、责任人和停手条件。"
    )
    assumptions = [
        "只用学清路店 2026-06-01 至 06-23 的到店成交做决策，06-24 至 06-30 留作盲测，禁止偷看",
        "企业团购大单不进货架动作；作战台只对到店客（POS / 自助购）负责",
        "结论必须可执行：SKU + 谁做 + 哪天 + 预期 + 停手条件；盲测坐实或打脸都留在台上，图谱只标对齐或未对齐",
    ]

    payload = {
        "store": {"name": store_name, "code": store_code, "period": "2026-06", "source": "物美 POS 明细"},
        "split": {"train": [train_days[0], train_days[-1]] if train_days else [], "holdout": [hold_days[0], hold_days[-1]] if hold_days else []},
        "ingest": {"rows": n, "skipped": skipped, "skuCount": len(skus), "generatedAt": datetime.now().isoformat(timespec="seconds")},
        "facts": {
            "train": train_kpi,
            "holdout": hold_kpi,
            "full": full_kpi,
            "floorTrain": floor_train_kpi,
            "channels": channels[:8],
            "hours": hours,
            "categories": cats[:8],
            "daily": daily_out,
        },
        "sku": {
            "push": [sku_brief(s) for s in push_pool[:8]],
            "cut": [sku_brief(s) for s in cut_pool[:8]],
            "losingPromos": [sku_brief(s) for s in lose_pool[:8]],
        },
        "playbook": playbook,
        "backtest": {
            "method": "口径：到店成交（POS/自助购，不含企业团购）。用 1–23 日「星期几均值」预测 24–30 日销售；毛利按训练期到店毛利率外推。头部 SKU 同样用星期几均值，与真实头部交叉验证。",
            "holdoutDays": hold_days,
            "gmvPred": money(pred_hold_gmv),
            "gmvActual": money(actual_hold_gmv),
            "gmvMape": mape(pred_hold_gmv, actual_hold_gmv),
            "profitPred": money(pred_hold_profit),
            "profitActual": money(actual_hold_profit),
            "profitMape": mape(pred_hold_profit, actual_hold_profit),
            "top20Overlap": overlap,
            "top20Size": top_n,
            "top20HitRate": pct(overlap, top_n),
            "skuMapeMedian": sku_mape_med,
            "skuMapeN": len(sku_mapes),
            "predTop": [{"name": s["name"], "pred": money(s.get("pred_hold_gmv", 0)), "actual": money(s["hold_gmv"])} for s in pred_top[:8]],
            "actualTop": [{"name": s["name"], "actual": money(s["hold_gmv"]), "pred": money(s.get("pred_hold_gmv", 0))} for s in actual_top[:8]],
        },
        "seed": seed,
        "assumptions": assumptions,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT)
    print("rows", n, "skipped", skipped, "skus", len(skus))
    print("train gmv", train_kpi["gmv"], "hold gmv actual", hold_kpi["gmv"], "pred", money(pred_hold_gmv), "mape", payload["backtest"]["gmvMape"])
    print("playbook", len(playbook), [a["kind"] for a in playbook])


if __name__ == "__main__":
    main()
