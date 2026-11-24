# Zeitplan: Bühnenzeit (stage.html, seek) -> Videozeit. Abschnitte, in denen die Bühne langsamer
# läuft, damit man lesen kann. RATE = Bühnensekunden pro Videosekunde.
BASIS = 0.9
HALTE = [(0.0, 4.6, 0.85), (8.1, 9.3, 0.45), (12.6, 17.6, 0.6), (21.0, 25.8, 0.6), (32.3, 33.3, 0.4),
         (37.4, 39.6, 0.55), (44.1, 46.1, 0.45), (50.0, 51.8, 0.45), (54.6, 57.8, 0.55),
         (59.6, 65.4, 0.55), (67.8, 71.0, 0.5)]
ENDE = 72.0

def _segmente():
    seg, t = [], 0.0
    for a, b, r in HALTE:
        if a > t: seg.append((t, a, BASIS))
        seg.append((a, b, r)); t = b
    if t < ENDE: seg.append((t, ENDE, BASIS))
    return seg
SEG = _segmente()

def echt(stage):
    """Bühnenzeit -> Videozeit"""
    r = 0.0
    for a, b, rate in SEG:
        if stage <= a: break
        r += (min(stage, b) - a) / rate
    return r

DAUER = echt(ENDE)

def buehne(video):
    """Videozeit -> Bühnenzeit"""
    r = 0.0
    for a, b, rate in SEG:
        d = (b - a) / rate
        if video <= r + d: return a + (video - r) * rate
        r += d
    return ENDE
