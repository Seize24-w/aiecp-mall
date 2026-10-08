# -*- coding: utf-8 -*-
"""生成本地 SVG 商品图素材（无外部依赖，离线可用）。"""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "assets", "img", "product")
os.makedirs(OUT, exist_ok=True)

# (商品序号, 主色, 辅色, emoji)
PRODUCTS = [
    (1,  "#3B6BFF", "#7C4DFF", "\U0001F35A"),   # 电饭煲
    (2,  "#2FA8FF", "#5B8CFF", "\U0001F35A"),
    (3,  "#FF8A3D", "#FFB35C", "\U0001F371"),   # 微波炉
    (4,  "#6C4DF6", "#9B6BFF", "\U0001F916"),   # 扫地机器人
    (5,  "#4C6EF5", "#7C9BFF", "\U0001F916"),
    (6,  "#00B8A9", "#3ED9C9", "\U0001F9F9"),   # 吸尘器
    (7,  "#5AC8FA", "#8FDFFF", "\U0001F9CA"),   # 冰箱
    (8,  "#3FA9F5", "#7FCCFF", "❄"),            # 空调
    (9,  "#1F2937", "#4B5563", "\U0001F4F1"),   # 手机
    (10, "#8B5CF6", "#C4B5FD", "\U0001F4F1"),
    (11, "#F56A6A", "#FFA3A3", "\U0001F4D3"),   # 平板
    (12, "#22C55E", "#86EFAC", "⌚"),            # 手表
    (13, "#14B8A6", "#5EEAD4", "⌚"),
    (14, "#F59E0B", "#FCD34D", "\U0001F3A7"),   # 耳机
    (15, "#EC4899", "#F9A8D4", "\U0001F6CF"),   # 四件套
    (16, "#A78BFA", "#DDD6FE", "\U0001F6CF"),
    (17, "#F97316", "#FDBA74", "\U0001F6CC"),   # 被子
    (18, "#0EA5E9", "#7DD3FC", "\U0001F4E6"),   # 收纳
    (19, "#EAB308", "#FDE68A", "\U0001F56F"),   # 香薰
    (20, "#7C3AED", "#C4B5FD", "\U0001F916"),
    (21, "#475569", "#94A3B8", "\U0001F4F1"),
    (22, "#FB7185", "#FDA4AF", "\U0001F371"),
    (23, "#0D9488", "#5EEAD4", "\U0001F4E6"),
    (24, "#D97706", "#FCD34D", "\U0001F56F"),
]

VARIANTS = [
    # (后缀, 缩放, 旋转, 透明装饰偏移)
    (1, 1.00, 0, 0),
    (2, 1.55, -8, 1),
    (3, 0.82, 6, 2),
]


def svg(idx, c1, c2, emoji, variant):
    suffix, scale, rot, deco = variant
    size = 600
    fs = int(210 * scale)
    cx, cy = size / 2, size / 2 - 10
    deco_map = [
        "",
        '<circle cx="470" cy="150" r="70" fill="#FFFFFF" opacity="0.10"/>'
        '<circle cx="140" cy="470" r="110" fill="#FFFFFF" opacity="0.08"/>',
        '<circle cx="120" cy="130" r="48" fill="#FFFFFF" opacity="0.12"/>'
        '<circle cx="500" cy="440" r="90" fill="#FFFFFF" opacity="0.08"/>'
        '<circle cx="480" cy="170" r="26" fill="#FFFFFF" opacity="0.14"/>',
    ]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="product">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{c1}"/>
      <stop offset="1" stop-color="{c2}"/>
    </linearGradient>
  </defs>
  <rect width="{size}" height="{size}" fill="url(#g)"/>
  {deco_map[deco]}
  <ellipse cx="{cx}" cy="{size - 96}" rx="150" ry="26" fill="#000000" opacity="0.10"/>
  <text x="{cx}" y="{cy}" font-size="{fs}" text-anchor="middle" dominant-baseline="central"
        transform="rotate({rot} {cx} {cy})"
        font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Microsoft YaHei, sans-serif">{emoji}</text>
</svg>'''

count = 0
for idx, c1, c2, emoji in PRODUCTS:
    for v in VARIANTS:
        path = os.path.join(OUT, f"p{idx}_{v[0]}.svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg(idx, c1, c2, emoji, v))
        count += 1

print(f"generated {count} svg files -> {OUT}")
