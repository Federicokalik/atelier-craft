"""Render original, localized Open Graph and Twitter images for Atelier."""

from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from sitegen import LANGS, T, WEB  # noqa: E402

FONT = WEB / "fonts" / "dm-sans-700.ttf"
REGULAR = WEB / "fonts" / "dm-sans-400.ttf"
ACCENTS = ["#78a9ff", "#ff826a", "#a786ff", "#ffc36a", "#93d0b5", "#ef82bd", "#a4d26f", "#48dcb0", "#9aa9ff", "#71cbe8", "#ff9c62", "#6ad2dc", "#a7d899"]
NAMES = ["Photo", "Vector", "Film", "Light", "PDF", "Effect", "Design", "Fig", "Word", "Sound", "Deck", "CAD", "Grid"]


def font(size, bold=True):
    return ImageFont.truetype(str(FONT if bold else REGULAR), size)


def fit(draw, text, max_width, initial=55):
    for size in range(initial, 27, -1):
        candidate = font(size)
        if draw.textbbox((0, 0), text, font=candidate)[2] <= max_width:
            return candidate
    return font(28)


def render(lang, kind, height):
    image = Image.new("RGB", (1200, height), "#111216")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1199, height - 1), outline="#484c59", width=2)
    for x in range(0, 1200, 60):
        draw.line((x, 0, x, height), fill="#1a1d25", width=1)
    for y in range(0, height, 60):
        draw.line((0, y, 1200, y), fill="#1a1d25", width=1)

    draw.rounded_rectangle((56, 56, 122, 122), radius=9, fill="#d9e4ff")
    draw.text((72, 57), "A", font=font(50), fill="#151c2d")
    draw.text((145, 48), "Atelier", font=font(65), fill="#f6f7fb")
    draw.text((57, 161), "HOMELAB  /  13 WEB APPS", font=font(18), fill="#82abef", spacing=3)

    left = 56
    first = T["hero_a"][LANGS.index(lang)]
    second = T["hero_b"][LANGS.index(lang)]
    draw.text((left, 247), first, font=fit(draw, first, 540), fill="#f5f6fa")
    draw.text((left, 318), second, font=fit(draw, second, 540), fill="#f5f6fa")
    draw.line((left, 416, 591, 416), fill="#74849e", width=2)
    draw.text((left, 440), "CRAFT WEB APPS   /   AUTOMATIC UPDATES", font=font(17), fill="#b9c4d9")

    grid_left, grid_top = 640, 115
    cell_w, cell_h = 125, 104 if kind == "og" else 116
    for index in range(16):
        col, row = index % 4, index // 4
        x = grid_left + col * cell_w
        y = grid_top + row * cell_h
        if index >= len(NAMES):
            draw.rectangle((x, y, x + cell_w - 5, y + cell_h - 5), outline="#414653", width=1)
            continue
        accent = ACCENTS[index]
        draw.rectangle((x, y, x + cell_w - 5, y + cell_h - 5), fill="#20232d", outline="#646979", width=1)
        draw.rectangle((x, y, x + cell_w - 5, y + 5), fill=accent)
        draw.text((x + 14, y + 15), NAMES[index][0], font=font(40), fill=accent)
        draw.text((x + 14, y + cell_h - 31), NAMES[index].upper(), font=font(12), fill="#e1e4eb")
        draw.line((x + 14, y + cell_h - 37, x + cell_w - 20, y + cell_h - 37), fill="#70798b", width=1)

    footer_y = height - 61
    draw.line((56, footer_y - 17, 1144, footer_y - 17), fill="#5a6171", width=1)
    draw.text((56, footer_y), "CALICCHIA.DESIGN", font=font(16), fill="#d5dcf0")
    draw.text((940, footer_y), "ATELIER / 2026", font=font(15), fill="#939cad")
    code = lang.lower().replace("-", "-")
    target = WEB / f"{kind}-{code}.png"
    image.save(target, optimize=True)
    print(f"{target.relative_to(ROOT)} {image.width}x{image.height}")


if __name__ == "__main__":
    for language in LANGS:
        render(language, "og", 630)
        render(language, "twitter", 675)
