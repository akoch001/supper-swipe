"""Draws the home-screen icons: a stack of two dish cards on plum. Standard library only."""
import struct
import zlib

PLUM = (122, 46, 93)
SAFFRON = (242, 182, 50)
TEAL = (15, 110, 120)


def inside(x, y, left, top, right, bottom, radius):
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def colour(x, y):
    """x and y run from 0 to 1 across the icon."""
    if inside(x, y, 0.36, 0.17, 0.80, 0.70, 0.06):
        return TEAL
    if inside(x, y, 0.24, 0.28, 0.68, 0.83, 0.06):
        return SAFFRON
    return PLUM


def png(size):
    rows = bytearray()
    for j in range(size):
        rows.append(0)
        for i in range(size):
            rows.extend(colour((i + 0.5) / size, (j + 0.5) / size))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")


for size in (192, 512):
    with open(f"icons/icon-{size}.png", "wb") as f:
        f.write(png(size))
