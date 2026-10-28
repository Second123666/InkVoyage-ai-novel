from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]
ICON_PATH = REPO_ROOT / "desktop" / "builder" / "app-icon.png"
GITHUB_DIR = REPO_ROOT / "images" / "github"
SITE_ASSETS_DIR = REPO_ROOT / "site" / "public" / "assets"

WIDTH = 1280
HEIGHT = 640

CREAM = (247, 241, 227, 255)
TEAL = (92, 199, 214, 255)
GOLD = (240, 190, 90, 255)


def load_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError(f"None of the expected fonts were found: {candidates}")


def build_background() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#081726")
    draw = ImageDraw.Draw(image, "RGBA")
    top = (8, 23, 38)
    bottom = (16, 47, 74)
    for y in range(HEIGHT):
        progress = y / (HEIGHT - 1)
        color = tuple(round(top[index] * (1 - progress) + bottom[index] * progress) for index in range(3))
        draw.line([(0, y), (WIDTH, y)], fill=color)

    draw.ellipse((-180, -220, 360, 320), fill=(30, 96, 120, 55))
    draw.ellipse((980, 330, 1480, 830), fill=(18, 76, 100, 60))
    draw.ellipse((720, -180, 1040, 140), fill=(20, 70, 95, 45))
    draw.ellipse((1120, 40, 1210, 130), fill=(240, 190, 90, 150))
    draw.ellipse((1180, 90, 1220, 130), fill=(92, 199, 214, 170))
    return image


def main() -> None:
    image = build_background()
    draw = ImageDraw.Draw(image, "RGBA")

    draw.rounded_rectangle(
        (70, 130, 410, 470),
        radius=54,
        fill=(13, 35, 54, 235),
        outline=(45, 82, 108, 180),
        width=2,
    )
    icon = Image.open(ICON_PATH).convert("RGBA").resize((272, 272), Image.LANCZOS)
    image.paste(icon, (104, 164), icon)

    title_font = load_font(["C:/Windows/Fonts/msyhbd.ttc", "/System/Library/Fonts/PingFang.ttc"], 70)
    subtitle_font = load_font(["C:/Windows/Fonts/msyhbd.ttc", "/System/Library/Fonts/PingFang.ttc"], 34)
    body_font = load_font(["C:/Windows/Fonts/msyh.ttc", "/System/Library/Fonts/PingFang.ttc"], 25)
    eyebrow_font = load_font(["C:/Windows/Fonts/msyhbd.ttc", "/System/Library/Fonts/PingFang.ttc"], 24)
    latin_font = load_font(["C:/Windows/Fonts/arial.ttf", "/System/Library/Fonts/Helvetica.ttc"], 22)

    x = 470
    draw.text((x, 142), "AI NATIVE · 长篇小说生产系统", font=eyebrow_font, fill=TEAL)
    draw.text((x, 194), "墨航 InkVoyage", font=title_font, fill=CREAM)
    draw.text((x, 306), "从一句灵感到一本完整长篇小说", font=subtitle_font, fill=CREAM)
    draw.line([(x, 372), (x + 390, 372)], fill=GOLD, width=3)
    draw.text((x, 402), "开书 · 规划 · 章节生产 · 审核修复 · 长篇记忆", font=body_font, fill=(185, 201, 214, 255))
    draw.text((x, 500), "github.com/Second123666/AI-novel", font=latin_font, fill=(127, 155, 176, 255))

    GITHUB_DIR.mkdir(parents=True, exist_ok=True)
    SITE_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    image.save(GITHUB_DIR / "project-social-preview-1280x640.png", "PNG", optimize=True)
    image.resize((640, 320), Image.LANCZOS).save(GITHUB_DIR / "project-social-preview-640x320.png", "PNG", optimize=True)
    image.save(SITE_ASSETS_DIR / "project-social-preview.png", "PNG", optimize=True)
    print("Generated social preview assets.")


if __name__ == "__main__":
    main()
