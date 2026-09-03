from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = 'maps/word/media/image7.png'
im = Image.open(SRC).convert('RGB')
W, H = im.size

SEA  = (122,167,188)
LAND = (220,220,220)
FAR  = (180,180,180)
BORD = (0,0,0)

# --- palette -------------------------------------------------------------
C_SEA   = (206,222,232)
C_LAND  = (231,227,219)
C_FAR   = (216,212,204)
C_BE    = (193, 18, 31)      # Belgian red
C_HALO  = (232,185,60)       # Belgian gold
NEIGH   = {'FR':(214,206,190), 'DE':(210,214,204), 'NL':(206,213,214),
           'UK':(219,211,205), 'LU':(224,203,178), 'CH':(215,210,200)}

# 1. recolour base
base = Image.new('RGB', (W,H))
sp, dp = im.load(), base.load()
for y in range(H):
    for x in range(W):
        c = sp[x,y]
        dp[x,y] = C_SEA if c==SEA else C_LAND if c==LAND else C_FAR if c==FAR else (60,60,66)

# 2. tint neighbours + Belgium (flood fill on the ORIGINAL, copy mask onto base)
SEEDS = {'FR':(470,1270), 'DE':(730,1050), 'NL':(610,1017),
         'UK':(410,980),  'LU':(615,1140), 'CH':(660,1263)}

def mask_of(seed):
    t = im.copy()
    ImageDraw.floodfill(t, seed, (255,0,255), thresh=40)
    tp = t.load()
    m = Image.new('L',(W,H),0); mpx = m.load()
    for y in range(H):
        for x in range(W):
            if tp[x,y]==(255,0,255): mpx[x,y]=255
    return m

for k,s in SEEDS.items():
    base.paste(Image.new('RGB',(W,H),NEIGH[k]), (0,0), mask_of(s))

m_be = mask_of((557,1100))
base.paste(Image.new('RGB',(W,H),C_BE), (0,0), m_be)

# 3. crop + upscale
BOX = (200, 790, 1030, 1430)
S = 3
cw, ch = BOX[2]-BOX[0], BOX[3]-BOX[1]
canvas = base.crop(BOX).resize((cw*S, ch*S), Image.LANCZOS)

# gold halo ring around Belgium, drawn at high res
be_big = m_be.crop(BOX).resize((cw*S, ch*S), Image.LANCZOS).point(lambda v: 255 if v>110 else 0)
ring = be_big.filter(ImageFilter.MaxFilter(15))
ring = Image.eval(ring, lambda v: v).point(lambda v: 255 if v>110 else 0)
ring_only = Image.composite(Image.new('L',ring.size,0), ring, be_big)
canvas.paste(Image.new('RGB', ring.size, C_HALO), (0,0), ring_only)
canvas.paste(Image.new('RGB', ring.size, C_BE), (0,0), be_big)


d = ImageDraw.Draw(canvas)
def P(x,y): return ((x-BOX[0])*S, (y-BOX[1])*S)

F   = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
FR_ = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
FI  = '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf'
f_country = ImageFont.truetype(F, 42)
f_sub     = ImageFont.truetype(FR_, 30)
f_sea     = ImageFont.truetype(FI, 36)
f_seasub  = ImageFont.truetype(FI, 28)
f_big     = ImageFont.truetype(F, 72)
f_bigsub  = ImageFont.truetype(FR_, 40)
f_small   = ImageFont.truetype(F, 30)
f_smsub   = ImageFont.truetype(FR_, 24)

INK  = (32,32,38)
MUTE = (96,96,106)
SEAT = (84,124,148)

def ctext(xy, txt, font, fill=INK, anchor='mm'):
    d.text(xy, txt, font=font, fill=fill, anchor=anchor)

def stack(orig_xy, top, bot, ftop, fbot, ctop=INK, cbot=MUTE, gap=40):
    x,y = P(*orig_xy)
    ctext((x, y-gap//2), top, ftop, ctop)
    if bot: ctext((x, y+gap//2+4), bot, fbot, cbot)

# --- countries ---
stack((388, 946), 'ROYAUME-UNI', 'United Kingdom', f_country, f_sub)
stack((452, 1300), 'FRANCE', None, f_country, f_sub)
stack((748, 1112), 'ALLEMAGNE', 'Germany', f_country, f_sub)
stack((592, 1042), 'PAYS-BAS', 'Netherlands', f_small, f_smsub, gap=32)

# --- Luxembourg leader ---
lx, ly = P(704, 1183); tx, ty = P(613, 1142)
d.line([(lx,ly),(tx,ty)], fill=INK, width=5)
d.ellipse([tx-8,ty-8,tx+8,ty+8], fill=INK)
ctext((lx+16, ly-16), 'LUXEMBOURG', f_small, INK, 'lm')
ctext((lx+16, ly+20), 'Luxembourg', f_smsub, MUTE, 'lm')

# --- seas ---
stack((622, 946), 'MER DU NORD', 'North Sea', f_sea, f_seasub, SEAT, SEAT, gap=36)
stack((372, 1098), 'LA MANCHE', 'English Channel', f_sea, f_seasub, SEAT, SEAT, gap=36)

# --- Belgium callout ---
bx, by = P(546, 874)
bw, bh = 580, 186
d.rounded_rectangle([bx-bw//2, by-bh//2, bx+bw//2, by+bh//2], radius=24, fill=(24,24,28))
ctext((bx, by-32), 'LA BELGIQUE', f_big, (232,185,60))
ctext((bx, by+44), 'Belgium  \u00b7  Belgi\u00eb', f_bigsub, (245,242,236))

import math
p1 = (bx, by + bh//2)
p2 = P(546, 1040)
p3 = P(530, 1076)
d.line([p1, p2, p3], fill=(24,24,28), width=9, joint='curve')
ang = math.atan2(p3[1]-p2[1], p3[0]-p2[0]); L = 36
d.polygon([p3,
           (p3[0]-L*math.cos(ang-0.42), p3[1]-L*math.sin(ang-0.42)),
           (p3[0]-L*math.cos(ang+0.42), p3[1]-L*math.sin(ang+0.42))], fill=(24,24,28))

canvas.save('img/map_europe_belgium.png')
print('saved', canvas.size)
