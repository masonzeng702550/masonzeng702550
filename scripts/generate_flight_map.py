#!/usr/bin/env python3
"""Generate an SVG world map made of green dots with an airplane flying along a route.

Two variants are produced:
  assets/flight-map.svg       — for light backgrounds
  assets/flight-map-dark.svg  — for GitHub dark theme
"""
import math
import random
from pathlib import Path

W, H = 960, 320

# longitude/latitude → svg coords
def ll(lon, lat):
    x = (lon + 180.0) / 360.0 * W
    y = (90.0 - lat) / 180.0 * H
    return x, y

# Rough continent bounding boxes in lon/lat. Dots are sampled inside, then
# masked by a coarse "land-likely" predicate so the silhouette is readable.
CONTINENTS = [
    # name, (lon_min, lon_max, lat_min, lat_max)
    ("NA",  (-168, -52, 14, 72)),
    ("SA",  (-82, -34, -56, 13)),
    ("EU",  (-10, 40, 36, 71)),
    ("AF",  (-18, 52, -35, 37)),
    ("AS",  (26, 145, 8, 72)),
    ("OC",  (112, 178, -47, -10)),
]

# Hand-curated "is this lon/lat probably land?" — series of circle stamps.
# Each stamp = (lon, lat, radius_in_degrees). Sampled dot is kept if it falls
# inside any stamp. Tuned by eye to produce recognizable continent shapes.
LAND_STAMPS = [
    # North America
    (-150, 65, 8), (-140, 62, 8), (-130, 60, 8), (-115, 55, 10),
    (-100, 55, 12), (-90, 55, 10), (-80, 52, 8), (-70, 48, 7),
    (-120, 45, 10), (-105, 42, 12), (-90, 40, 10), (-78, 40, 9),
    (-115, 35, 8), (-100, 32, 9), (-88, 32, 8), (-78, 32, 7),
    (-105, 25, 6), (-95, 22, 6), (-88, 18, 5), (-82, 15, 4),
    # Central America
    (-90, 14, 4), (-85, 11, 3), (-80, 9, 3),
    # South America
    (-72, 5, 5), (-65, 0, 6), (-60, -5, 7), (-55, -10, 8),
    (-65, -15, 7), (-60, -20, 7), (-58, -28, 6), (-65, -35, 5),
    (-70, -42, 4), (-72, -50, 3),
    # Europe
    (-5, 50, 5), (5, 50, 6), (15, 50, 6), (25, 52, 7), (35, 55, 8),
    (10, 60, 6), (20, 62, 7), (0, 42, 4), (12, 42, 4), (22, 42, 4),
    # Africa
    (-15, 22, 5), (-5, 18, 7), (5, 13, 7), (15, 12, 8), (25, 15, 9),
    (32, 22, 6), (35, 12, 4), (40, 8, 4),
    (15, 5, 6), (25, 0, 7), (28, -8, 6), (20, -15, 5),
    (30, -18, 6), (25, -28, 5), (20, -30, 4),
    # Asia
    (40, 50, 6), (55, 55, 8), (70, 60, 10), (85, 62, 10), (100, 62, 10),
    (115, 60, 9), (130, 58, 8), (140, 60, 6),
    (60, 40, 8), (75, 35, 9), (90, 40, 8), (105, 38, 9), (120, 38, 8),
    (135, 38, 5), (140, 40, 4),
    (55, 28, 5), (70, 25, 6), (82, 22, 7), (95, 22, 6), (110, 22, 6),
    (120, 22, 4), (78, 12, 5), (100, 12, 4), (108, 14, 4),
    # Southeast Asia islands
    (110, 0, 4), (118, 0, 4), (125, 0, 3), (135, -2, 3),
    # Oceania (Australia)
    (122, -22, 6), (132, -22, 8), (142, -22, 8), (148, -28, 6),
    (138, -32, 5), (130, -30, 4), (118, -28, 4), (146, -38, 3),
    # NZ
    (172, -42, 3),
    # Japan
    (138, 36, 3), (142, 42, 3),
    # Indonesia / Philippines
    (120, -8, 3), (122, 12, 3),
]

def on_land(lon, lat):
    for clon, clat, r in LAND_STAMPS:
        if (lon - clon) ** 2 + (lat - clat) ** 2 < r * r:
            return True
    return False

def generate_dots(seed=7, step=2.2, jitter=0.6):
    random.seed(seed)
    dots = []
    lat = -55
    while lat < 75:
        lon = -178
        while lon < 178:
            jlon = lon + random.uniform(-jitter, jitter)
            jlat = lat + random.uniform(-jitter, jitter)
            if on_land(jlon, jlat):
                x, y = ll(jlon, jlat)
                # palette weight: deeper greens near "core" of stamps, lighter on edges
                d = min(((jlon - clon) ** 2 + (jlat - clat) ** 2) / (r * r) for clon, clat, r in LAND_STAMPS if (jlon - clon) ** 2 + (jlat - clat) ** 2 < r * r)
                dots.append((x, y, d))
            lon += step
        lat += step
    return dots


# Flight route — major hubs around the world, looped
ROUTE_CITIES = [
    ("TPE", 121.5, 25.0),    # Taipei (home)
    ("HND", 139.7, 35.6),    # Tokyo
    ("HNL", -157.8, 21.3),   # Honolulu
    ("LAX", -118.2, 34.0),   # LA
    ("JFK", -74.0, 40.7),    # NYC
    ("LHR", -0.45, 51.5),    # London
    ("CDG", 2.5, 49.0),      # Paris
    ("DXB", 55.4, 25.3),     # Dubai
    ("BOM", 72.9, 19.1),     # Mumbai
    ("SIN", 103.9, 1.3),     # Singapore
    ("TPE", 121.5, 25.0),    # back home
]

def build_flight_path():
    pts = [ll(lon, lat) for _, lon, lat in ROUTE_CITIES]
    # smooth with quadratic curves for nice arcs
    d = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(1, len(pts)):
        x0, y0 = pts[i - 1]
        x1, y1 = pts[i]
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        # arc up — control point pulled toward top of svg
        cy = my - abs(x1 - x0) * 0.25
        d.append(f"Q {mx:.1f} {cy:.1f} {x1:.1f} {y1:.1f}")
    return " ".join(d), pts


PALETTE_DARK  = ["#0e4429", "#006d32", "#26a641", "#39d353"]
PALETTE_LIGHT = ["#9be9a8", "#40c463", "#30a14e", "#216e39"]


def render_svg(palette, bg, plane_color, label_color, route_color, accent):
    dots = generate_dots()
    path_d, pts = build_flight_path()
    duration = 24  # seconds per loop

    parts = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mason Zeng — flying across the contribution map">')
    parts.append(f'<defs>')
    parts.append(f'  <radialGradient id="bg" cx="50%" cy="55%" r="70%">')
    parts.append(f'    <stop offset="0%" stop-color="{bg[0]}"/>')
    parts.append(f'    <stop offset="100%" stop-color="{bg[1]}"/>')
    parts.append(f'  </radialGradient>')
    parts.append(f'  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">')
    parts.append(f'    <feGaussianBlur stdDeviation="2.2" result="b"/>')
    parts.append(f'    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>')
    parts.append(f'  </filter>')
    parts.append(f'  <path id="flight" d="{path_d}" fill="none"/>')
    parts.append(f'</defs>')

    # background
    parts.append(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')

    # subtle latitude grid lines
    for lat in (-40, -20, 0, 20, 40, 60):
        _, gy = ll(0, lat)
        parts.append(f'<line x1="0" y1="{gy:.1f}" x2="{W}" y2="{gy:.1f}" stroke="{accent}" stroke-width="0.4" opacity="0.06"/>')
    for lon in (-120, -60, 0, 60, 120):
        gx, _ = ll(lon, 0)
        parts.append(f'<line x1="{gx:.1f}" y1="0" x2="{gx:.1f}" y2="{H}" stroke="{accent}" stroke-width="0.4" opacity="0.06"/>')

    # contribution-style dots
    for x, y, d in dots:
        # pick palette index by depth into stamp
        idx = min(3, int((1 - d) * 4))
        color = palette[idx]
        r = 2.0 + (1 - d) * 0.6
        parts.append(f'<rect x="{x - r:.1f}" y="{y - r:.1f}" width="{r * 2:.1f}" height="{r * 2:.1f}" rx="0.8" ry="0.8" fill="{color}" opacity="0.92"/>')

    # flight route — dashed line
    parts.append(f'<use href="#flight" stroke="{route_color}" stroke-width="1" stroke-dasharray="3 5" fill="none" opacity="0.55"/>')

    # city dots + labels
    for name, lon, lat in ROUTE_CITIES[:-1]:
        x, y = ll(lon, lat)
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{accent}" filter="url(#glow)"/>')
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.4" fill="{bg[0]}"/>')
        parts.append(f'<text x="{x + 5:.1f}" y="{y - 5:.1f}" font-family="JetBrains Mono, monospace" font-size="8" fill="{label_color}" opacity="0.85">{name}</text>')

    # contrail (fades behind plane) — multiple delayed copies
    for i in range(6):
        delay = -i * (duration / 60)
        op = 0.42 - i * 0.06
        parts.append(f'<circle r="{2.2 - i * 0.25:.1f}" fill="{accent}" opacity="{op:.2f}" filter="url(#glow)">')
        parts.append(f'  <animateMotion dur="{duration}s" repeatCount="indefinite" begin="{delay:.2f}s" rotate="auto"><mpath href="#flight"/></animateMotion>')
        parts.append(f'</circle>')

    # airplane svg — pointed nose along +x axis so rotate="auto" works
    plane = (
        f'<g>'
        f'<path d="M -10 0 L 10 0 M 0 -7 L 6 0 L 0 7 Z M -6 -3 L -10 -6 M -6 3 L -10 6" '
        f'stroke="{plane_color}" stroke-width="1.6" fill="{plane_color}" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)"/>'
        f'</g>'
    )
    parts.append(f'<g>{plane}<animateMotion dur="{duration}s" repeatCount="indefinite" rotate="auto"><mpath href="#flight"/></animateMotion></g>')

    # corner badges
    parts.append(f'<text x="14" y="22" font-family="JetBrains Mono, monospace" font-size="11" fill="{accent}" opacity="0.9">$ mason.fly()</text>')
    parts.append(f'<text x="14" y="{H - 12}" font-family="JetBrains Mono, monospace" font-size="9" fill="{label_color}" opacity="0.6">// 10 hubs · 5 continents · ICAO standard radiotelephony</text>')
    parts.append(f'<text x="{W - 14}" y="{H - 12}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9" fill="{label_color}" opacity="0.6">cruising · FL360</text>')

    parts.append('</svg>')
    return "\n".join(parts)


def main():
    here = Path(__file__).resolve().parent.parent / "assets"
    here.mkdir(exist_ok=True)

    dark = render_svg(
        palette=PALETTE_DARK,
        bg=("#0f2027", "#000814"),
        plane_color="#00c9a7",
        label_color="#9bb5c2",
        route_color="#00c9a7",
        accent="#00c9a7",
    )
    light = render_svg(
        palette=PALETTE_LIGHT,
        bg=("#f0fdf4", "#dcfce7"),
        plane_color="#0d9488",
        label_color="#1f2937",
        route_color="#0d9488",
        accent="#0d9488",
    )
    (here / "flight-map-dark.svg").write_text(dark, encoding="utf-8")
    (here / "flight-map.svg").write_text(light, encoding="utf-8")
    print(f"wrote {here}/flight-map.svg and flight-map-dark.svg")


if __name__ == "__main__":
    main()
