from __future__ import annotations

import io
import math
import struct
from pathlib import Path

from PIL import Image, ImageDraw


REPO_ROOT = Path(__file__).resolve().parents[2]
BUILDER_DIR = REPO_ROOT / "desktop" / "builder"
CLIENT_PUBLIC_DIR = REPO_ROOT / "client" / "public"
SITE_PUBLIC_DIR = REPO_ROOT / "site" / "public"
SITE_ASSETS_DIR = REPO_ROOT / "site" / "src" / "assets"

PNG_SIZES = [32, 64, 128, 256, 512]
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
RENDER_SIZE = 1024

CREAM = (247, 243, 234, 255)
NAVY = (19, 50, 70, 255)
GOLD = (240, 190, 90, 255)
TEAL = (92, 199, 214, 255)
GRADIENT_START = (26, 95, 122)
GRADIENT_END = (18, 32, 51)


def lerp_color(left: tuple[int, int, int], right: tuple[int, int, int], progress: float) -> tuple[int, int, int]:
    return tuple(int(left[index] + (right[index] - left[index]) * progress) for index in range(3))


def scale_point(size: int, x: float, y: float) -> tuple[float, float]:
    factor = size / 96.0
    return (x * factor, y * factor)


def scale_width(size: int, width: float) -> int:
    return max(1, int(round(size * (width / 96.0))))


def build_gradient_square(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = image.load()
    for y in range(size):
        for x in range(size):
            progress = min(1.0, max(0.0, ((x / max(1, size - 1)) * 0.45) + ((y / max(1, size - 1)) * 0.55)))
            pixels[x, y] = (*lerp_color(GRADIENT_START, GRADIENT_END, progress), 255)
    return image


def create_brand_icon(size: int = RENDER_SIZE, small: bool = False) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gradient_square = build_gradient_square(size)
    square_mask = Image.new("L", (size, size), 0)
    square_draw = ImageDraw.Draw(square_mask)
    margin = int(size * ((4 if small else 8) / 96))
    corner_radius = int(size * (24 / 96))
    square_draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=corner_radius,
        fill=255,
    )
    canvas.paste(gradient_square, (0, 0), square_mask)
    draw = ImageDraw.Draw(canvas)

    if small:
        sail = [(48, 12), (74, 52), (48, 52)]
        hull = [(22, 52), (74, 52), (68, 68), (48, 78), (28, 68)]
        fold = []
        fold_width = 4.2
        star_center = (76, 22)
        star_radius = 6.0
    else:
        sail = [(48, 16), (70, 50), (48, 50)]
        hull = [(26, 50), (70, 50), (64, 66), (48, 74), (32, 66)]
        fold = [(48, 50), (48, 68)]
        fold_width = 3.5
        star_center = (73, 25)
        star_radius = 5.0

    draw.polygon([scale_point(size, x, y) for x, y in sail], fill=CREAM)
    draw.polygon([scale_point(size, x, y) for x, y in hull], fill=CREAM)
    if fold:
        draw.line(
            [scale_point(size, x, y) for x, y in fold],
            fill=NAVY,
            width=scale_width(size, fold_width),
        )

    center = scale_point(size, *star_center)
    radius = size * (star_radius / 96)
    draw.ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        fill=GOLD,
    )

    if not small:
        wave_points = [
            (x, 80 + 3 * math.sin((x - 18) / 10 * math.pi))
            for x in range(18, 79, 2)
        ]
        draw.line(
            [scale_point(size, x, y) for x, y in wave_points],
            fill=TEAL,
            width=scale_width(size, 4),
            joint="curve",
        )

    return canvas


def write_ico(path: Path, images: dict[int, Image.Image]) -> None:
    frames: list[tuple[int, bytes]] = []
    for size in sorted(images):
        buffer = io.BytesIO()
        images[size].save(buffer, format="PNG")
        frames.append((size, buffer.getvalue()))

    header = struct.pack("<HHH", 0, 1, len(frames))
    offset = 6 + 16 * len(frames)
    entries = bytearray()
    payload = bytearray()
    for size, data in frames:
        dimension = 0 if size >= 256 else size
        entries.extend(
            struct.pack(
                "<BBBBHHII",
                dimension,
                dimension,
                0,
                0,
                1,
                32,
                len(data),
                offset,
            )
        )
        payload.extend(data)
        offset += len(data)

    path.write_bytes(header + bytes(entries) + bytes(payload))


def main() -> None:
    BUILDER_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    SITE_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    SITE_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    full_master = create_brand_icon(RENDER_SIZE, small=False)
    small_master = create_brand_icon(RENDER_SIZE, small=True)

    def render(size: int) -> Image.Image:
        master = small_master if size <= 32 else full_master
        return master.resize((size, size), Image.LANCZOS)

    rendered: dict[int, Image.Image] = {}
    for size in sorted(set(PNG_SIZES + ICO_SIZES + [16, 48, 180])):
        rendered[size] = render(size)

    for size in PNG_SIZES:
        rendered[size].save(BUILDER_DIR / f"app-icon-{size}.png")
    rendered[512].save(BUILDER_DIR / "app-icon.png")
    write_ico(BUILDER_DIR / "app-icon.ico", {size: rendered[size] for size in ICO_SIZES})

    rendered[32].save(CLIENT_PUBLIC_DIR / "favicon-32x32.png")
    write_ico(CLIENT_PUBLIC_DIR / "favicon.ico", {size: rendered[size] for size in ICO_SIZES})
    rendered[180].save(CLIENT_PUBLIC_DIR / "apple-touch-icon.png")
    rendered[512].save(CLIENT_PUBLIC_DIR / "web-app-icon.png")

    rendered[32].save(SITE_PUBLIC_DIR / "favicon-32.png")
    write_ico(SITE_PUBLIC_DIR / "favicon.ico", {size: rendered[size] for size in ICO_SIZES})
    rendered[256].save(SITE_ASSETS_DIR / "app-icon.png")

    print(f"Generated InkVoyage icon assets in {BUILDER_DIR}, {CLIENT_PUBLIC_DIR}, and {SITE_PUBLIC_DIR}")


if __name__ == "__main__":
    main()
