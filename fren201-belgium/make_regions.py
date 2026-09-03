from PIL import Image, ImageDraw, ImageFont, ImageFilter

im = Image.open('maps/word/media/image7.png').convert('RGB')
W,H = im.size
t = im.copy(); ImageDraw.floodfill(t,(557,1100),(255,0,255),thresh=40)
tp=t.load()
m = Image.new('L',(W,H),0); mp=m.load()
for y in range(1050,1170):
    for x in range(505,635):
        if tp[x,y]==(255,0,255): mp[x,y]=255

BB=(520,1068,616,1149)               # Belgium bbox in source px
PAD=3
sub = m.crop((BB[0]-PAD,BB[1]-PAD,BB[2]+PAD+1,BB[3]+PAD+1))
sw,sh = sub.size                      # 103 x 88

# --- upscale + smooth the outline -----------------------------------------
K = 16
big = sub.resize((sw*K, sh*K), Image.LANCZOS)
big = big.filter(ImageFilter.GaussianBlur(9)).point(lambda v: 255 if v>128 else 0)
big = big.filter(ImageFilter.GaussianBlur(3))
BW,BH = big.size

# geo -> big-canvas px  (Belgium extent: lon 2.547-6.408 E, lat 49.497-51.505 N)
LON0,LON1 = 2.547, 6.408
LAT0,LAT1 = 51.505, 49.497
def G(lon,lat):
    px = (BB[0] + (lon-LON0)/(LON1-LON0)*(BB[2]-BB[0]))
    py = (BB[1] + (LAT0-lat)/(LAT0-LAT1)*(BB[3]-BB[1]))
    return ((px-(BB[0]-PAD))*K, (py-(BB[1]-PAD))*K)

# --- colours ---------------------------------------------------------------
BG      = (255,255,255)
C_FL    = (232,185,60)      # Flanders  - gold
C_WA    = (193,18,31)       # Wallonia  - red
C_BXL   = (22,22,26)        # Brussels  - ink
C_DE    = (122,52,58)       # German-speaking community
INK     = (24,24,28)

# language frontier (approx.), west -> east
FRONT = [(2.40,50.79),(2.90,50.78),(3.35,50.76),(3.75,50.78),(4.10,50.77),
         (4.35,50.72),(4.60,50.76),(4.95,50.77),(5.25,50.73),(5.55,50.77),
         (5.85,50.76),(6.50,50.76)]

# Wallonia = shape below the frontier
wal = Image.new('L',(BW,BH),0)
dw = ImageDraw.Draw(wal)
poly = [G(*p) for p in FRONT] + [(BW+50,BH+50),(-50,BH+50)]
dw.polygon(poly, fill=255)

canvas = Image.new('RGB',(BW,BH),BG)
canvas.paste(Image.new('RGB',(BW,BH),C_FL), (0,0), big)                       # all gold
wal_in = Image.composite(wal, Image.new('L',(BW,BH),0), big.point(lambda v:255 if v>128 else 0))
canvas.paste(Image.new('RGB',(BW,BH),C_WA), (0,0), wal_in)                    # south = red

# German-speaking community strip (9 municipalities, eastern Liege province)
gde = Image.new('L',(BW,BH),0); dg=ImageDraw.Draw(gde)
dg.polygon([G(6.12,50.78),G(6.60,50.78),G(6.60,50.05),G(6.20,50.05),
            G(6.20,50.32),G(6.06,50.55)], fill=255)
gde_in = Image.composite(gde, Image.new('L',(BW,BH),0), big.point(lambda v:255 if v>128 else 0))
canvas.paste(Image.new('RGB',(BW,BH),C_DE), (0,0), gde_in)

# outline
edge = big.point(lambda v:255 if v>128 else 0)
out  = edge.filter(ImageFilter.MaxFilter(9))
out  = Image.composite(Image.new('L',(BW,BH),0), out, edge)
canvas.paste(Image.new('RGB',(BW,BH),INK), (0,0), out)

# --- final canvas with room for labels ------------------------------------
SCALE = 1500/BW
mapw, maph = int(BW*SCALE), int(BH*SCALE)
PADL, PADR, PADT, PADB = 40, 620, 40, 80
FW, FH = mapw+PADL+PADR, maph+PADT+PADB
final = Image.new('RGB',(FW,FH),BG)
final.paste(canvas.resize((mapw,maph), Image.LANCZOS),(PADL,PADT))
d = ImageDraw.Draw(final)
def Q(lon,lat):
    x,y = G(lon,lat); return (x*SCALE+PADL, y*SCALE+PADT)

F  = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
FRg= '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
f_reg  = ImageFont.truetype(F, 50)
f_regs = ImageFont.truetype(FRg, 32)
f_city = ImageFont.truetype(F, 30)
f_cal  = ImageFont.truetype(F, 32)
f_note = ImageFont.truetype(FRg, 27)

def reglabel(lon,lat,a,b,ca,cb):
    x,y=Q(lon,lat)
    d.text((x,y-20),a,font=f_reg,fill=ca,anchor='mm')
    d.text((x,y+30),b,font=f_regs,fill=cb,anchor='mm')

reglabel(4.66,51.10,'FLANDRE','Vlaanderen · Dutch-speaking',(58,42,0),(94,72,10))
reglabel(4.75,50.12,'WALLONIE','Wallonia · French-speaking',(255,255,255),(255,246,244))

CITIES=[('Anvers',4.40,51.22,'l'),('Gand',3.72,51.05,'r'),
        ('Bruges',3.22,51.21,'l'),('Liège',5.57,50.63,'l'),
        ('Namur',4.87,50.47,'l'),('Charleroi',4.44,50.41,'r'),
        ('Mons',3.95,50.45,'r')]
for name,lon,lat,side in CITIES:
    x,y=Q(lon,lat)
    d.ellipse([x-9,y-9,x+9,y+9], fill=INK, outline=(255,255,255), width=4)
    dx = -22 if side=='r' else 22
    d.text((x+dx, y), name, font=f_city,
           fill=INK if lat>50.78 else (255,255,255), anchor=('rm' if side=='r' else 'lm'))

# Brussels marker
bx,by = Q(4.35,50.85)
d.ellipse([bx-27,by-27,bx+27,by+27], fill=C_BXL, outline=(255,255,255), width=6)
d.ellipse([bx-11,by-11,bx+11,by+11], fill=(232,185,60))
d.text((bx-46,by), 'Bruxelles / Brussel', font=ImageFont.truetype(F,36), fill=INK, anchor='rm')

# right-hand callouts
COL = PADL + mapw + 46
def callout(from_xy, y, title, sub):
    fx,fy = from_xy
    d.line([(fx,fy),(COL-26,y)], fill=INK, width=5)
    d.ellipse([COL-34,y-8,COL-18,y+8], fill=INK)
    d.text((COL, y-22), title, font=f_cal,  fill=INK, anchor='lm')
    d.text((COL, y+18), sub,   font=f_note, fill=(98,98,108), anchor='lm')

callout((bx+30,by-16), Q(4.35,50.85)[1]-150,
        'RÉGION DE BRUXELLES-CAPITALE', 'Bilingual FR / NL · the federal capital')
gx,gy = Q(6.30,50.42)
callout((gx,gy), gy, 'COMMUNAUTÉ GERMANOPHONE', 'German-speaking · 9 municipalities')

d.text((PADL, FH-34),'Language frontier and community boundary shown approximately.',
       font=f_note, fill=(132,132,142), anchor='ls')
final.save('img/map_belgium_regions.png')
print(final.size)
