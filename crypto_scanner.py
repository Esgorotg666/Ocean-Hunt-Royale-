import requests
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
from datetime import datetime
import os

OUTPUT_DIR = "/home/user/Ocean-Hunt-Royale-/crypto_graphs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def scan_top_coins(limit=20):
    url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h"
    resp = requests.get(url, timeout=15)
    data = resp.json()
    coins = []
    for coin in data[:limit]:
        pct = coin.get('price_change_percentage_24h', 0) or 0
        coins.append({
            'id': coin['id'],
            'name': coin['name'],
            'symbol': coin['symbol'].upper(),
            'price': coin['current_price'],
            'volume': coin['total_volume'],
            'market_cap': coin['market_cap'],
            'pct_24h': pct,
            'high_24h': coin.get('high_24h', coin['current_price']),
            'low_24h':  coin.get('low_24h',  coin['current_price']),
        })
    return coins

STABLECOINS = {'usdt', 'usdc', 'dai', 'busd', 'tusd', 'fdusd', 'pyusd', 'usde', 'usds', 'usdp'}

def pick_best_coin(coins):
    """
    Score each coin by:
    - Volume rank (higher = better liquidity for a $100 trade)
    - 24h momentum (mild positive bias, avoid extreme pumps/dumps)
    - Price range width relative to price (volatility opportunity)
    We want positive momentum but not already overbought.
    """
    tradeable = [c for c in coins if c['symbol'].lower() not in STABLECOINS]
    scored = []
    max_vol = max(c['volume'] for c in tradeable)
    coins = tradeable  # shadow param
    for c in coins:
        vol_score   = c['volume'] / max_vol * 40          # 0-40 pts
        mom_score   = max(0, min(c['pct_24h'], 8)) * 2    # 0-16 pts, cap at 8%
        range_pct   = (c['high_24h'] - c['low_24h']) / c['price'] * 100
        range_score = min(range_pct, 10) * 2              # 0-20 pts, cap at 10%
        total = vol_score + mom_score + range_score
        scored.append((total, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1], scored[:6]

def calculate_100_position(entry, sl, tp1, tp2=None):
    coins_bought = 100 / entry
    tp2_price = tp2 if tp2 else tp1 * 1.5
    scenarios = {
        "Bull (TP2)": {"exit": tp2_price, "profit": coins_bought * (tp2_price - entry)},
        "Base (TP1)": {"exit": tp1,       "profit": coins_bought * (tp1 - entry)},
        "Bear (SL)":  {"exit": sl,        "profit": coins_bought * (sl - entry)},
    }
    return coins_bought, scenarios

def generate_graphs(name, symbol, entry, sl, tp1, tp2, scenarios, coins_bought):
    # ── Graph 1: P&L Bar Chart ────────────────────────────────────────────────
    labels  = list(scenarios.keys())
    profits = [scenarios[k]['profit'] for k in labels]
    colors  = ['#00cc66' if p >= 0 else '#ff4444' for p in profits]

    fig1 = go.Figure()
    fig1.add_trace(go.Bar(
        x=labels, y=profits,
        text=[f"${p:+.2f}  ({(p/100)*100:+.1f}%)" for p in profits],
        textposition="outside",
        marker_color=colors
    ))
    fig1.add_hline(y=0, line_width=1, line_dash="dash", line_color="white")
    fig1.update_layout(
        title=f"{name} ({symbol}) — $100 Position P&L Scenarios",
        xaxis_title="Scenario", yaxis_title="Profit / Loss ($)",
        template="plotly_dark", height=500
    )

    # ── Graph 2: Payoff Diagram ───────────────────────────────────────────────
    low  = min(sl * 0.95, entry * 0.80)
    high = max((tp2 or tp1 * 1.5) * 1.10, entry * 1.40)
    import numpy as np
    price_range = [low + (high - low) * i / 200 for i in range(201)]
    pnl_range   = [coins_bought * (p - entry) for p in price_range]

    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=price_range, y=pnl_range, mode='lines',
        line=dict(color='cyan', width=2), name='P&L'
    ))
    fig2.add_vline(x=entry, line_dash="dot",  line_color="white",  annotation_text=f"Entry ${entry:,.2f}")
    fig2.add_vline(x=sl,    line_dash="dash", line_color="red",    annotation_text=f"SL ${sl:,.2f}")
    fig2.add_vline(x=tp1,   line_dash="dash", line_color="#00cc66",annotation_text=f"TP1 ${tp1:,.2f}")
    if tp2:
        fig2.add_vline(x=tp2, line_dash="dash", line_color="lime", annotation_text=f"TP2 ${tp2:,.2f}")
    fig2.add_hline(y=0, line_width=1, line_dash="dash", line_color="grey")
    fig2.update_layout(
        title=f"Payoff Diagram — P&L vs Exit Price ({symbol})",
        xaxis_title="Exit Price ($)", yaxis_title="P&L ($)",
        template="plotly_dark", height=500
    )

    # ── Graph 3: Trade Level Chart ────────────────────────────────────────────
    tp2_display = tp2 or tp1 * 1.5
    levels = {
        f"TP2  ${tp2_display:,.2f}": (tp2_display, "lime"),
        f"TP1  ${tp1:,.2f}":         (tp1,          "#00cc66"),
        f"Entry ${entry:,.2f}":      (entry,         "white"),
        f"SL   ${sl:,.2f}":          (sl,            "red"),
    }
    fig3 = go.Figure()
    for label, (price, color) in levels.items():
        fig3.add_hline(y=price, line_color=color, line_width=2,
                       annotation_text=label, annotation_position="right")
    # shade risk & reward zones
    fig3.add_hrect(y0=sl, y1=entry, fillcolor="red",   opacity=0.08, line_width=0)
    fig3.add_hrect(y0=entry, y1=tp2_display, fillcolor="#00cc66", opacity=0.08, line_width=0)
    fig3.update_layout(
        title=f"{name} ({symbol}) — Trade Level Map  |  $100 → {coins_bought:.6f} coins",
        yaxis_title="Price ($)", xaxis_visible=False,
        template="plotly_dark", height=500,
        yaxis=dict(range=[sl * 0.97, tp2_display * 1.03])
    )

    return fig1, fig2, fig3

# ═══════════════════════════════════════════════════════════════════
print("🚀 Claude Crypto $100 Scanner — Live Market Run\n")
print("Fetching top 20 coins by market cap…")
coins = scan_top_coins(limit=20)

best, leaderboard = pick_best_coin(coins)

print("\n📊 Leaderboard (Top 6 scored coins):")
print(f"{'Rank':<5} {'Name':<16} {'Symbol':<8} {'Price':>12} {'Vol (24h)':>16} {'24h %':>8}  Score")
print("─" * 75)
for i, (score, c) in enumerate(leaderboard, 1):
    flag = " ← BEST PICK" if i == 1 else ""
    print(f"  {i:<4} {c['name']:<16} {c['symbol']:<8} ${c['price']:>11,.4f} ${c['volume']:>15,.0f} {c['pct_24h']:>+7.2f}%  {score:.1f}{flag}")

c = best
name, symbol, price = c['name'], c['symbol'], c['price']
print(f"\n✅ Best coin for $100 trade: {name} ({symbol})  @ ${price:,.4f}")

# Auto-calculate clean R:R levels
entry = price
sl    = entry * 0.93    # -7% stop
tp1   = entry * 1.10   # +10% TP1
tp2   = entry * 1.20   # +20% TP2

rr = (tp1 - entry) / (entry - sl)
print(f"\n📐 Auto-calculated levels:")
print(f"   Entry : ${entry:,.4f}")
print(f"   SL    : ${sl:,.4f}  (-7.0%)")
print(f"   TP1   : ${tp1:,.4f}  (+10.0%)")
print(f"   TP2   : ${tp2:,.4f}  (+20.0%)")
print(f"   R:R   : 1 : {rr:.2f}")

coins_bought, scenarios = calculate_100_position(entry, sl, tp1, tp2)
print(f"\n💰 $100 buys {coins_bought:.6f} {symbol}")
print("\nP&L Scenarios:")
for scen, d in scenarios.items():
    pct = (d['profit'] / 100) * 100
    bar = "█" * int(abs(pct) / 2) if pct >= 0 else "▓" * int(abs(pct) / 2)
    print(f"  {scen:<18}: ${d['profit']:>+7.2f}  ({pct:>+6.1f}%)  {bar}")

# Generate & save graphs
fig1, fig2, fig3 = generate_graphs(name, symbol, entry, sl, tp1, tp2, scenarios, coins_bought)

paths = [
    f"{OUTPUT_DIR}/1_pnl_bar.html",
    f"{OUTPUT_DIR}/2_payoff_diagram.html",
    f"{OUTPUT_DIR}/3_trade_levels.html",
]
fig1.write_html(paths[0])
fig2.write_html(paths[1])
fig3.write_html(paths[2])

print(f"\n📈 3 Graphs saved:")
for p in paths:
    print(f"   {p}")
print("\n✅ Done! Open any .html file in your browser to view interactive graphs.")
