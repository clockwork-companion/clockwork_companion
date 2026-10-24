# Builds the Mossheart theme CSS (inline SVG art as data URIs) and inserts it into src/app.css.
import math, urllib.parse, sys
def uri(svg): return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe=" =:/'\",;()-.#") .replace('"', "'").replace("#", "%23") + '")'
# Ivy leaf (five lobes), base at (0,0) pointing up, with a short stalk below the base.
IVY = "M0 0 C-3 -1 -8 0 -11 -4 C-9 -6 -8 -8 -8 -11 C-5 -10 -3 -12 -2 -16 C-1 -18 0 -20 0 -22 C0 -20 1 -18 2 -16 C3 -12 5 -10 8 -11 C8 -8 9 -6 11 -4 C8 0 3 -1 0 0Z"
VEINS = "M0 0 L0 -19 M0 -2 L-9 -5 M0 -2 L9 -5 M0 -6 L-5 -12 M0 -6 L5 -12"
K = 1.0
def ivy(x, y, a, s, g="lg"):
    s = s * K
    return (f"<g transform='translate({x} {y}) rotate({a}) scale({s})'><path d='M0 0 L0 6' stroke='#3a3a22' stroke-width='1.3'/>"
            f"<path d='{IVY}' fill='url(#{g})' stroke='#0f1a0c' stroke-width='.7'/><path d='{VEINS}' stroke='#7f9a5c' stroke-opacity='.55' stroke-width='.6' fill='none'/>"
            f"<path d='M-9 -5 C-7 -9 -4 -14 0 -20' stroke='#fff' stroke-opacity='.07' stroke-width='1.6' fill='none'/></g>")
import random
random.seed(7)
def moss(cx, cy, n, r):
    out = []
    for _ in range(n):
        a = random.uniform(0, 2*math.pi); d = random.uniform(0, r); l = random.uniform(1.5, 4.5); t = a + random.uniform(-1, 1)
        x, y = cx + d*math.cos(a), cy + d*math.sin(a)
        col = random.choice(["#2f4a22", "#3d5c2a", "#4f7034", "#26391c"])
        out.append(f"<path d='M{x:.1f} {y:.1f} l{l*math.cos(t):.1f} {l*math.sin(t):.1f}' stroke='{col}' stroke-width='{random.uniform(.7,1.3):.1f}' stroke-linecap='round'/>")
    return "".join(out)
DEFS = ("<defs><linearGradient id='lg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#46683a'/><stop offset='.55' stop-color='#2c4a22'/><stop offset='1' stop-color='#1a2e15'/></linearGradient>"
        "<linearGradient id='lg2' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#3a5a2c'/><stop offset='1' stop-color='#16260f'/></linearGradient></defs>")
def stem(d, w):  # woody stem: dark bark with a faint lit edge
    return (f"<path d='{d}' stroke='#211c12' stroke-width='{w}' fill='none' stroke-linecap='round'/>"
            f"<path d='{d}' stroke='#5a5236' stroke-opacity='.55' stroke-width='{w*.35:.1f}' fill='none' stroke-linecap='round' transform='translate(-.4 -.5)'/>")
K = 1.25
O = 16  # padding so leaves can grow past the section's edge
art = (stem(f"M{10+O} {10+O} C{50+O} {13+O} {80+O} {6+O} {118+O} {13+O}", 3.8) + stem(f"M{118+O} {13+O} C{140+O} {17+O} {152+O} {9+O} {170+O} {8+O}", 2.2)
     + stem(f"M{10+O} {10+O} C{13+O} {46+O} {7+O} {74+O} {14+O} {104+O}", 3.8) + stem(f"M{14+O} {104+O} C{17+O} {116+O} {12+O} {126+O} {11+O} {136+O}", 2.2)
     + f"<path d='M{10+O} {12+O} C{28+O} {4+O} {40+O} {20+O} {60+O} {12+O} C{76+O} {5+O} {92+O} {19+O} {108+O} {11+O}' stroke='#2a2617' stroke-width='1.3' fill='none'/>"
     + f"<path d='M{12+O} {10+O} C{4+O} {28+O} {20+O} {40+O} {12+O} {60+O} C{6+O} {74+O} {18+O} {86+O} {12+O} {98+O}' stroke='#2a2617' stroke-width='1.3' fill='none'/>"
     + f"<path d='M{170+O} {8+O} c6 -2 8 5 3 7 c-3 1 -4 -2 -2 -3' stroke='#46583a' stroke-width='.9' fill='none'/>"
     + f"<path d='M{11+O} {136+O} c-3 5 3 9 6 5 c1 -2 -1 -4 -3 -3' stroke='#46583a' stroke-width='.9' fill='none'/>"
     + moss(10+O, 10+O, 70, 11) + moss(60+O, 11+O, 18, 5) + moss(11+O, 62+O, 18, 5)
     + ivy(30+O, 6+O, -14, .78) + ivy(52+O, 18+O, 168, .6, "lg2") + ivy(78+O, 4+O, 12, .72) + ivy(100+O, 18+O, 196, .55, "lg2")
     + ivy(134+O, 8+O, -8, .6) + ivy(156+O, 15+O, 172, .45, "lg2")
     + ivy(4+O, 32+O, -78, .74) + ivy(17+O, 50+O, 96, .56, "lg2") + ivy(5+O, 76+O, -84, .66) + ivy(18+O, 96+O, 100, .5, "lg2") + ivy(8+O, 122+O, -80, .44)
     + ivy(6+O, 4+O, -45, .9)
     + "".join(f"<circle cx='{x+O}' cy='{y+O}' r='2.3' fill='#121218'/><circle cx='{x+O-.7}' cy='{y+O-.7}' r='.6' fill='#9aa0b0' fill-opacity='.5'/>" for x, y in [(92,22),(95,25),(90,26),(94,28)]))
VINE_SVG = 1
VINE = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='204' height='168' viewBox='0 0 204 168'>{DEFS}{art}</svg>")
K = 1.0
ORN = uri("<svg xmlns='http://www.w3.org/2000/svg' width='72' height='18' viewBox='0 0 72 18'>" + DEFS
          + "<path d='M0 10 C12 7 24 12 36 10 S60 7 72 10' stroke='#2a2617' stroke-width='1.5' fill='none'/>"
          + ivy(18, 8, -20, .4) + ivy(52, 12, 160, .36, "lg2") + "<path d='M36 10 c2 -4 6 -3 5 0' stroke='#46583a' stroke-width='.7' fill='none'/></svg>")
SPRIG = uri("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>" + DEFS + ivy(12, 20, 8, .78) + "</svg>")
# The Zhoung: shadow tendrils rising from below.
tend = []
for x, h, w, dx in [(30,120,22,14),(95,190,30,-26),(150,80,14,10),(210,150,26,30),(275,105,18,-12),(330,200,34,22),(395,90,16,-8),(450,165,28,-30),(520,120,22,18),(575,70,14,6)]:
    tend.append(f"<path d='M{x-w} 220 C{x-w*.4:.0f} {220-h*.45:.0f} {x+dx-8} {220-h*.75:.0f} {x+dx} {220-h} C{x+dx+5} {220-h*.72:.0f} {x+w*.5:.0f} {220-h*.4:.0f} {x+w} 220Z'/>")
    tend.append(f"<path d='M{x+dx} {220-h} c{6 if dx<0 else -6} -8 {14 if dx<0 else -14} -4 {10 if dx<0 else -10} 4' stroke='#050308' stroke-width='3' fill='none' stroke-linecap='round'/>")
DARK = uri("<svg xmlns='http://www.w3.org/2000/svg' width='600' height='220' viewBox='0 0 600 220'><g fill='#050308'>" + "".join(tend) + "<rect x='0' y='196' width='600' height='24'/></g></svg>")
# Batbayar's wards: a faint line of runes along the edge of the darkness, holding it back.
glyphs = ["M3 18V2M3 3L9 0M3 8L9 5", "M3 18V2L9 6L3 10L9 18", "M6 18V2M6 8L1 2M6 8L11 2", "M6 0L11 6L6 12L1 6Z M1 18L11 12M11 18L1 12",
          "M3 18V2M9 18V2M3 6L9 12", "M6 18V0M1 5L11 11", "M2 2L10 18M10 2L2 18", "M3 18V2L9 8V18"]
runes = "".join(f"<path transform='translate({k*30+8} 1)' d='{g}'/>" + f"<circle cx='{k*30+26}' cy='10' r='1'/>" for k, g in enumerate(glyphs))
WARD = uri("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='20' viewBox='0 0 240 20'><g stroke='#b9e39a' stroke-opacity='.26' stroke-width='1.1' fill='#b9e39a' fill-opacity='.0' stroke-linecap='round' stroke-linejoin='round'>"
           + runes.replace("<circle", "<circle fill-opacity='.22' stroke='none'") + "</g></svg>")
CSS = f'''/* ----- Mossheart (extended): Batbayar's theme. A dark, old forest: ivy with woody stems and moss creeping round the
   sections, a carved-stone title face, slow drifting spores. Below it all rises the Zhoung, the corrupting darkness: a
   violet-black shadow of roots that breathes and sometimes opens its eyes, held back by a faint line of warding runes ----- */
:root[data-skin="moss"] {{
  --paper: #070c08; --card: #0d1510; --sunk: #050806; --ink: #dde4d0; --ink-2: #a9b69a; --ink-3: #6f7f66;
  --rule: #6c8f4a; --bracket: #3f5a2c; --hair: #1f2e22; --brass: #9cba5e; --brass-ink: #0a120b; --brass-soft: #18241a;
  --seal: #050308; --seal-2: #6a3f96; --blood: #c9654f; --blood-soft: #2e1611; --tox: #86b85a; --tox-soft: #15240f;
  --hunger: #c9a64e; --hunger-soft: #2a220d; --life: #5fae9c; --life-soft: #0f2722; --warn: #c9a64e; --bad: #c9654f; --good: #86b85a; --forge: #c9804a;
  --shadow: #6a3f96; --moss: #3f5a2c; --leaf: #8fae62;
  --f-display: "Marcellus SC", "Palatino Linotype", serif; --f-head: "Cormorant Garamond", "Palatino Linotype", serif; --f-body: "Crimson Pro", Georgia, serif; --f-mono: "Crimson Pro", Georgia, serif;
  --vine: {VINE}; --vine-rule: {ORN}; --sprig: {SPRIG}; --tendrils: {DARK}; --ward: {WARD};
  --leafy: 14px 4px 14px 4px; --leafy-s: 8px 3px 8px 3px;
  --menu-bg: #0d1510; --menu-ink: #dde4d0;
  color-scheme: dark;
}}
[data-skin="moss"] body {{ font-size: 16.5px; background:
  radial-gradient(800px 420px at 20% -8%, rgb(120 150 110 / .07), transparent 70%),
  radial-gradient(1200px 600px at 50% 125%, rgb(48 14 70 / .5), transparent 70%), #070c08; background-attachment: fixed; }}
[data-skin="moss"] :is(.tabpane, .stat b, .fact b, .meter .v, .loadnum b, .attr .val, .wstats b, .d100, .statin) {{ font-variant-numeric: lining-nums tabular-nums; }}
/* spores drifting in the dark */
:root[data-skin="moss"]::before {{ content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(circle at 16% 24%, rgb(190 215 150 / .45) 0 1px, transparent 3px),
    radial-gradient(circle at 74% 18%, rgb(190 215 150 / .35) 0 1px, transparent 3px),
    radial-gradient(circle at 58% 52%, rgb(190 215 150 / .3) 0 .9px, transparent 3px),
    radial-gradient(circle at 31% 66%, rgb(190 215 150 / .4) 0 1px, transparent 3px),
    radial-gradient(circle at 88% 61%, rgb(190 215 150 / .3) 0 .9px, transparent 3px);
  animation: mhFly 40s ease-in-out infinite alternate; }}
@keyframes mhFly {{ 0% {{ transform: translate(0, 0); opacity: .6; }} 50% {{ transform: translate(-18px, -40px); opacity: 1; }} 100% {{ transform: translate(12px, -70px); opacity: .5; }} }}
/* the Zhoung: root-like tendrils rising from the bottom, breathing; a faint line of warding runes along its edge holds it back */
[data-skin="moss"] body::after {{ content: ""; position: fixed; left: 0; right: 0; bottom: 0; height: 34vh; z-index: -1; pointer-events: none;
  background: var(--ward) 0 0 / 200px 17px repeat-x, var(--tendrils) 0 100% / 600px 220px repeat-x, var(--tendrils) 280px 100% / 420px 154px repeat-x,
    linear-gradient(0deg, rgb(5 3 8 / .97), rgb(34 12 50 / .5) 45%, transparent);
  filter: drop-shadow(0 -6px 16px rgb(106 63 150 / .3)); opacity: .9; transform-origin: 50% 100%;
  animation: mhBreathe 11s ease-in-out infinite; }}
@keyframes mhBreathe {{ 0%, 100% {{ opacity: .74; transform: scaleY(.95); }} 50% {{ opacity: 1; transform: scaleY(1.04); }} 52% {{ opacity: .86; }} 54% {{ opacity: 1; }} }}
/* now and then, two eyes open in the dark */
[data-skin="moss"] #app::after {{ content: ""; position: fixed; z-index: 0; pointer-events: none; left: 14%; bottom: 8vh; width: 64px; height: 16px;
  background: radial-gradient(ellipse 8px 4px at 12px 8px, #e6d6ff, #9a6ae0 45%, rgb(106 63 150 / .6) 70%, transparent 85%),
    radial-gradient(ellipse 8px 4px at 52px 8px, #e6d6ff, #9a6ae0 45%, rgb(106 63 150 / .6) 70%, transparent 85%);
  filter: drop-shadow(0 0 9px rgb(150 90 220 / .85)) drop-shadow(0 0 20px rgb(106 63 150 / .6)); opacity: 0; mix-blend-mode: screen; animation: mhEyes 21s ease-in-out infinite; }}
@keyframes mhEyes {{ 0%, 62% {{ opacity: 0; transform: scaleY(.2); }} 68% {{ opacity: .6; transform: scaleY(1); }} 80% {{ opacity: .6; transform: scaleY(1); }}
  81.5% {{ opacity: .6; transform: scaleY(.1); }} 83% {{ opacity: .6; transform: scaleY(1); }} 90%, 100% {{ opacity: 0; transform: scaleY(.2); }} }}

:root[data-skin="moss"] .sigil {{ display: none; }}
:root[data-skin="moss"] .top {{ border-bottom: 0; padding-bottom: 20px; background: var(--vine-rule) 0 100% / 72px 18px repeat-x; }}
:root[data-skin="moss"] .brand {{ font: 400 30px/1 var(--f-display); letter-spacing: .04em; color: var(--ink); }}
:root[data-skin="moss"] .brand small {{ font: 500 15px var(--f-head); letter-spacing: .12em; text-transform: none; color: var(--rule); }}
:root[data-skin="moss"] .brand small::after {{ content: " · Mossheart"; color: var(--ink-3); }}
:root[data-skin="moss"] .namefield {{ font: 400 30px var(--f-display); letter-spacing: .04em; text-transform: none; border-bottom: 1px solid var(--moss); }}
:root[data-skin="moss"] :is(.lbl, .field label, .mini label, .stat span, .fact span, .wstats span, .legend b, th, .seg button, .btn, .pbox small) {{ font-family: var(--f-display); font-weight: 400; letter-spacing: .07em; }}
:root[data-skin="moss"] :is(.field label, .mini label, .fact span, .stat span, th) {{ color: var(--rule); }}
:root[data-skin="moss"] :is(.attr .nm, .gx-title, .ornate, .sphead h2) {{ font-family: var(--f-display); font-weight: 400; text-transform: none; letter-spacing: .04em; }}
:root[data-skin="moss"] :is(.sgroup h3, .spgroup h3, .perkgroup h3, .rulebody h3, .meter .t, .ptpickh, .ptbig, .ptstep b, .craftnav button span, .pttypes button) {{ font-family: var(--f-head); font-weight: 600; text-transform: none; letter-spacing: .02em; }}
:root[data-skin="moss"] :is(.sgroup h3, .spgroup h3, .perkgroup h3, .rulebody h3) {{ border-bottom: 0; padding-bottom: 10px; background: var(--vine-rule) 0 100% / 54px 14px repeat-x; font-size: 1.15em; }}
:root[data-skin="moss"] :is(.attr .val, .stat b, .meter .v, .loadnum b, .wound .cnt, .gx-sum b, .gx-slot b, .gx-av b, .gx-fa b, .wstats b, .statin, .fact b, .srow .m, .d100) {{ font-family: var(--f-body); font-weight: 600; }}

/* headings: one ivy leaf (it replaces the rules book icon, CLAUDE.md), then an ivy rule */
:root[data-skin="moss"] .h {{ font: 600 27px var(--f-head); text-transform: none; letter-spacing: .01em; color: var(--ink); }}
:root[data-skin="moss"] .h > span:not(.orn)::before {{ content: ""; display: inline-block; width: 24px; height: 24px; margin-right: 8px; vertical-align: -3px; background: var(--sprig) 0 0 / contain no-repeat; }}
:root[data-skin="moss"] .hlink .hbook {{ display: none; }}
:root[data-skin="moss"] .h > span:has(.hlink)::before {{ transform-origin: 50% 90%; transition: filter .2s; }}
:root[data-skin="moss"] .h > span:has(.hlink:hover)::before, :root[data-skin="moss"] .h > span:has(.hlink:focus-visible)::before {{ animation: mhSway 1.2s ease-in-out infinite alternate; filter: brightness(1.4); }}
@keyframes mhSway {{ from {{ transform: rotate(-7deg); }} to {{ transform: rotate(8deg); }} }}
:root[data-skin="moss"] .orn::before {{ border: 0; height: 18px; top: -1px; right: 22px; background: var(--vine-rule) 0 0 / 72px 18px repeat-x; }}
:root[data-skin="moss"] .orn::after, :root[data-skin="moss"] .diamond::before {{ width: 10px; height: 10px; top: 3px; border: 0; border-radius: 0 80% 0 80%; background: var(--rule); transform: rotate(-45deg); }}
:root[data-skin="moss"] .diamond::before {{ inset: 3px; width: auto; height: auto; top: 3px; background: transparent; border: 1.5px solid var(--rule); }}
:root[data-skin="moss"] .diamond.on::before {{ background: var(--leaf); border-color: var(--leaf); }}

/* sections: ivy creeping round two corners (alternating), rooted in moss */
:root[data-skin="moss"] .frame {{ border: 1px solid rgb(108 143 74 / .18); border-radius: var(--leafy); padding: 34px 26px 28px;
  background: linear-gradient(165deg, rgb(30 48 30 / .5), rgb(8 13 9 / .9) 55%); box-shadow: inset 0 0 50px rgb(0 0 0 / .45), 0 14px 34px -22px #000; }}
:root[data-skin="moss"] .frame::before, :root[data-skin="moss"] .frame::after {{ width: 204px; height: 168px; left: -26px; top: -26px; bottom: auto; border: 0; z-index: 2; pointer-events: none;
  background: var(--vine) 0 0 / 204px 168px no-repeat; }}
:root[data-skin="moss"] .frame::after {{ left: auto; top: auto; right: -26px; bottom: -26px; transform: rotate(180deg); }}
:root[data-skin="moss"] .frame:nth-of-type(even)::before {{ left: auto; right: -26px; transform: scaleX(-1); }}
:root[data-skin="moss"] .frame:nth-of-type(even)::after {{ right: auto; left: -26px; transform: scaleY(-1); }}
:root[data-skin="moss"] .frame:nth-of-type(3n)::after {{ display: none; }}
/* the living ivy (fx-moss.js) grows its own longer vines, moss and hide patches; the CSS vines above are its stand-in */
.mh-ivy-layer {{ position: absolute; left: 0; top: 0; z-index: 2; overflow: hidden; pointer-events: none; }}
.mh-ivy {{ position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; will-change: transform; }}
/* switching sections: a gust of leaves wipes the old section away and the new one appears in its wake (fx-moss.js) */
:root.has-ivy[data-skin="moss"] .tabswap[data-dir]:not(.mh-wipe-in) {{ animation: none; }}
.mh-ghost {{ position: absolute; z-index: 3; margin: 0; padding: 0; max-width: none; overflow: hidden; pointer-events: none; }}
.mh-ghost :is(.tabswap, .viewswap) {{ animation: none; }}
.mh-ghost.mh-wipe-out, :root :is(.tabswap, .viewswap).mh-wipe-in {{ -webkit-mask-size: 300% 100%; mask-size: 300% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; animation: mhWipe .95s cubic-bezier(.4, .05, .35, 1) both; }}
.mh-ghost.mh-wipe-out.wind-l {{ -webkit-mask-image: linear-gradient(90deg, #000 45%, transparent 55%); mask-image: linear-gradient(90deg, #000 45%, transparent 55%); --m0: 20%; --m1: 82%; }}
:root :is(.tabswap, .viewswap).mh-wipe-in.wind-l {{ -webkit-mask-image: linear-gradient(90deg, transparent 45%, #000 55%); mask-image: linear-gradient(90deg, transparent 45%, #000 55%); --m0: 20%; --m1: 82%; }}
.mh-ghost.mh-wipe-out.wind-r {{ -webkit-mask-image: linear-gradient(90deg, transparent 45%, #000 55%); mask-image: linear-gradient(90deg, transparent 45%, #000 55%); --m0: 82%; --m1: 20%; }}
:root :is(.tabswap, .viewswap).mh-wipe-in.wind-r {{ -webkit-mask-image: linear-gradient(90deg, #000 45%, transparent 55%); mask-image: linear-gradient(90deg, #000 45%, transparent 55%); --m0: 82%; --m1: 20%; }}
.mh-wipe-out {{ filter: saturate(.7); }}
@keyframes mhWipe {{ from {{ -webkit-mask-position: var(--m0) 0; mask-position: var(--m0) 0; }} to {{ -webkit-mask-position: var(--m1) 0; mask-position: var(--m1) 0; }} }}
.mh-gust {{ position: fixed; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; }}
.mh-gust svg {{ position: absolute; left: 0; top: 0; overflow: visible; filter: drop-shadow(0 2px 2px rgb(0 0 0 / .45)); }}
.mh-ivy.mh-leave {{ animation: mhLeave .7s ease-in forwards; }}
.mh-ivy.mh-grow {{ animation: mhGrow .7s .38s cubic-bezier(.2, .7, .3, 1) both; }}
@keyframes mhLeave {{ to {{ opacity: 0; translate: calc(var(--wind, -1) * 70px) -14px; }} }}
@keyframes mhGrow {{ from {{ opacity: 0; scale: .97; }} }}
@media (prefers-reduced-motion: reduce) {{ .mh-ivy.mh-leave, .mh-ivy.mh-grow, .mh-ghost.mh-wipe-out, :root :is(.tabswap, .viewswap).mh-wipe-in {{ animation: none; }} .mh-gust {{ display: none; }} }}
:root.has-ivy[data-skin="moss"] .frame::before, :root.has-ivy[data-skin="moss"] .frame::after {{ display: none; }}

:root[data-skin="moss"] :is(.panel, .meter, .wcard, .wound, .pcard, .icard, .legend, .addpanel, .exrow, .perkcard, .spbox, .sptable, .rnow, .rcard, .rpanel, .member, .gx-attr, .gx-road, .gx-pick, .ptread, .pled, .ptopt, .ptel, .ptstage, .ptlabel) {{
  border-radius: var(--leafy-s); }}
:root[data-skin="moss"] :is(.panel, .meter, .wcard, .wound, .pcard, .icard, .legend, .addpanel, .perkcard, .spbox, .rcard, .member, .ptread, .pled) {{ background: rgb(13 21 16 / .92); border-color: var(--hair); }}

/* tabs */
:root[data-skin="moss"] .tabs {{ border-bottom: 2px solid var(--moss); gap: 6px; }}
:root[data-skin="moss"] .tabs button {{ border: 1px solid var(--hair); border-bottom: 0; border-radius: 12px 3px 0 0; background: linear-gradient(180deg, color-mix(in srgb, var(--ts) 25%, #0f1812), #0a110c);
  font: 600 16px var(--f-head); text-transform: none; letter-spacing: .02em; color: var(--ink-2); box-shadow: inset 0 2px 0 color-mix(in srgb, var(--tc) 55%, transparent); }}
:root[data-skin="moss"] .tabs button:hover {{ color: var(--ink); background: #132017; }}
:root[data-skin="moss"] .tabs button[aria-selected="true"] {{ color: #0a120b; border-color: var(--leaf); background: linear-gradient(180deg, #a4c07a, #6c8f4a); }}
:root[data-skin="moss"] .tabicon {{ stroke: currentColor; }}

:root[data-skin="moss"] .stat {{ background: rgb(108 143 74 / .05); border: 1px solid var(--hair); border-radius: var(--leafy-s); }}
:root[data-skin="moss"] .pbox {{ background: #080d09; border: 1px solid var(--moss); border-radius: 8px; }}
:root[data-skin="moss"] .pbox b {{ color: var(--leaf); }}

/* attribute cells: natural points are moss, bought points are amber sap, broken ones belong to the Zhoung */
:root[data-skin="moss"] .cell {{ border: 1px solid #18251b; background: #050806; border-radius: 4px; }}
:root[data-skin="moss"] .cell.up {{ background: linear-gradient(180deg, #7ea25a, #46672f); border-color: #587c3c; }}
:root[data-skin="moss"] .cell.bought {{ background: linear-gradient(180deg, #d9b763, #9a772c); border-color: #b08c3c; }}
:root[data-skin="moss"] .cell.miss {{ background: linear-gradient(180deg, #74479f, #2e1745); border-color: #5c3a82; box-shadow: 0 0 8px rgb(106 63 150 / .45); }}
:root[data-skin="moss"] .cell.have {{ background: #213422; }}
:root[data-skin="moss"] .cell.sealed {{ background: repeating-linear-gradient(135deg, rgb(106 63 150 / .5) 0 2px, transparent 2px 6px), #050308; border-color: #4a2e6a; }}
:root[data-skin="moss"] .skull {{ color: var(--shadow); --sk-eye: #050308; }}
:root[data-skin="moss"] .skullcell.miss .skull {{ color: #050308; --sk-eye: #c9a8ff; }}
:root[data-skin="moss"] .mid {{ border-radius: 50%; width: 36px; height: 36px; border: 1px solid var(--rule); background: radial-gradient(circle, #0d1510 55%, rgb(108 143 74 / .18)); color: var(--ink); }}
:root[data-skin="moss"] .mid.at {{ background: var(--rule); color: #0a120b; }}
:root[data-skin="moss"] .pip {{ border: 1.5px solid #3f5a2c; background: transparent; }}
:root[data-skin="moss"] .pip.on {{ border-color: #6c8f4a; background: radial-gradient(circle at 35% 30%, #c4d99a, #7fa552 45%, #2f4a22); }}
:root[data-skin="moss"] .pip.capped {{ border-color: #162219; }}
:root[data-skin="moss"] .usetick {{ border-color: var(--rule); border-radius: 50%; }}
:root[data-skin="moss"] .usetick.spent {{ background: var(--shadow); border-color: var(--shadow); }}
:root[data-skin="moss"] .track, :root[data-skin="moss"] .mtrack {{ background: #050806 !important; border: 1px solid #18251b; border-radius: 4px; overflow: hidden; }}
:root[data-skin="moss"] .track i, :root[data-skin="moss"] .mtrack i {{ border-radius: 4px; }}

:root[data-skin="moss"] .btn {{ border: 1px solid rgb(108 143 74 / .5); border-radius: 6px; background: rgb(108 143 74 / .05); color: var(--ink); font-size: 13px; }}
:root[data-skin="moss"] .btn:hover {{ background: rgb(108 143 74 / .14); }}
:root[data-skin="moss"] .btn.primary, :root[data-skin="moss"] .seg button[aria-pressed="true"] {{ background: linear-gradient(180deg, #a4c07a, #6c8f4a); border-color: var(--leaf); color: #0a120b; }}
:root[data-skin="moss"] .btn.danger {{ border-color: var(--bad); color: var(--bad); }}
:root[data-skin="moss"] .seg {{ border: 1px solid rgb(108 143 74 / .5); border-radius: 6px; overflow: hidden; }}
:root[data-skin="moss"] .seg button {{ color: var(--ink-2); }}
:root[data-skin="moss"] :is(.field input, .field select, .mini input, .mini select, .inp, .autotext, .field textarea) {{ background: rgb(5 8 6 / .75); border: 0; border-bottom: 1px solid rgb(108 143 74 / .4); border-radius: 4px 4px 0 0; color: var(--ink); }}
:root[data-skin="moss"] :is(.field input, .mini input, .inp, .autotext, .field textarea):focus {{ outline: none; border-bottom-color: var(--leaf); box-shadow: 0 1px 0 var(--leaf); }}
:root[data-skin="moss"] .portrait {{ border: 2px solid var(--moss); border-radius: 46% 54% 50% 50% / 52% 48% 52% 48%; overflow: hidden; box-shadow: 0 0 0 5px #0a110c, 0 0 0 6px rgb(108 143 74 / .35), 0 10px 30px -10px #000; }}
:root[data-skin="moss"] .hovercard {{ background: #080d09; color: var(--ink); border: 1px solid var(--moss); border-radius: 8px 3px 8px 3px; }}
:root[data-skin="moss"] .hovercard em {{ color: var(--leaf); }}
:root[data-skin="moss"] .d8::before {{ background: linear-gradient(160deg, #a4c07a 0%, #4f7034 55%, #142410 100%); }}
:root[data-skin="moss"] .banner {{ background: rgb(106 63 150 / .09); border-left: 2px solid var(--shadow); color: var(--ink); }}
:root[data-skin="moss"] .spanel {{ border-left: 1px solid var(--moss); background: linear-gradient(180deg, #0c1510, #070c08); box-shadow: -12px 0 40px rgb(0 0 0 / .55); }}
:root[data-skin="moss"] .craftnav button {{ border-radius: var(--leafy-s); }}
:root[data-skin="moss"] .craftnav button[aria-pressed="true"] {{ background: linear-gradient(180deg, #a4c07a, #6c8f4a); border-color: var(--leaf); color: #0a120b; box-shadow: none; }}
:root[data-skin="moss"] .ptstage {{ background: radial-gradient(ellipse at 50% 40%, rgb(40 64 36 / .35), transparent 70%), #080d09; border-color: var(--hair); }}
@media (max-width: 560px) {{
  [data-skin="moss"] .tabs button {{ padding: 9px 6px 8px; font-size: 14px; }}
  [data-skin="moss"] .h {{ font-size: 23px; }} [data-skin="moss"] .frame {{ padding: 30px 14px 22px; }} [data-skin="moss"] .namefield {{ font-size: 24px; }}
  [data-skin="moss"] .frame::before, [data-skin="moss"] .frame::after {{ width: 143px; height: 118px; background-size: 143px 118px; left: -18px; top: -18px; }}
  [data-skin="moss"] .frame::after {{ left: auto; top: auto; right: -18px; bottom: -18px; }}
  [data-skin="moss"] .frame:nth-of-type(even)::before {{ left: auto; right: -18px; }}
  [data-skin="moss"] .frame:nth-of-type(even)::after {{ right: auto; left: -18px; }}
  [data-skin="moss"] body::after {{ height: 26vh; background-size: 170px 14px, 420px 154px, 300px 110px, auto; }}
  [data-skin="moss"] #app::after {{ left: 10%; }}
}}
'''
p = sys.argv[1]; s = open(p).read()
start, end = "/* ----- Mossheart (extended)", "/* ----- end Mossheart ----- */\n"
if start in s:
    a = s.index(start); b = s.index(end) + len(end); s = s[:a] + s[b:]
anchor = "/* ---------- website build: players panel, companions ---------- */"
assert anchor in s
s = s.replace(anchor, CSS + end + anchor, 1)
open(p, "w").write(s); print("inserted", len(CSS), "chars")
