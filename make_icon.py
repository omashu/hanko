from PIL import Image, ImageDraw

SIZE = 512
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

RED = (209, 69, 61, 255)
RED_DARK = (163, 45, 39, 255)
PAPER = (233, 231, 226, 255)
INK = (23, 28, 38, 255)

pad = 18
# outer stamp ring
d.ellipse([pad, pad, SIZE - pad, SIZE - pad], fill=RED_DARK)
inset = 30
d.ellipse([pad + inset, pad + inset, SIZE - pad - inset, SIZE - pad - inset], fill=RED)

# a subtle inner ring for the "seal" look
ring_pad = 56
d.ellipse([ring_pad, ring_pad, SIZE - ring_pad, SIZE - ring_pad], outline=(255, 255, 255, 60), width=6)

# book / page glyph in the middle: a paper rectangle with a folded corner
bw, bh = 210, 260
bx = (SIZE - bw) // 2
by = (SIZE - bh) // 2 + 6
fold = 46

d.polygon(
    [
        (bx, by),
        (bx + bw - fold, by),
        (bx + bw, by + fold),
        (bx + bw, by + bh),
        (bx, by + bh),
    ],
    fill=PAPER,
)
# folded corner triangle
d.polygon(
    [
        (bx + bw - fold, by),
        (bx + bw, by + fold),
        (bx + bw - fold, by + fold),
    ],
    fill=(200, 197, 190, 255),
)

# three "text" lines on the page
line_x0 = bx + 26
line_x1 = bx + bw - 44
ly = by + 96
for i in range(3):
    d.rounded_rectangle([line_x0, ly, line_x1 - (i * 30), ly + 14], radius=7, fill=INK)
    ly += 34

img.save("/home/claude/hanko/assets/icon.png")

# Windows .ico with multiple sizes
sizes = [16, 24, 32, 48, 64, 128, 256]
img.save("/home/claude/hanko/assets/icon.ico", sizes=[(s, s) for s in sizes])

print("done")
