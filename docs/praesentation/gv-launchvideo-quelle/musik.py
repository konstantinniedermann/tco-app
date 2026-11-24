import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from zeitplan import echt as F, DAUER
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = round(DAUER + 0.5, 2)
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
BEAT = 0.5  # 120 BPM


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def tt(d): return np.arange(int(SR * d)) / SR


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def saw(f, t, ph=0.0):
    return 2 * ((f * t + ph) % 1.0) - 1


def env_adsr(n, a, r):
    e = np.ones(n); ia = int(a * SR); ir = int(r * SR)
    e[:ia] = np.linspace(0, 1, ia) ** 2
    e[-ir:] *= np.linspace(1, 0, ir) ** 2
    return e


def pad(notes, d, cutoff=1800):
    t = tt(d); x = np.zeros_like(t)
    for n in notes:
        for det in (-0.09, 0.0, 0.11):
            x += saw(midi(n + det), t, rng.random())
    x = lp(x / (len(notes) * 3), cutoff, 2)
    return x * env_adsr(len(t), 0.8, 1.2)


def pluck(n, d=0.6, bright=4000):
    t = tt(d)
    x = saw(midi(n), t) * 0.6 + np.sin(2 * np.pi * midi(n) * t)
    x = lp(x, bright, 2)
    return x * np.exp(-t * 7) * env_adsr(len(t), 0.003, 0.05)


def bell(n, d=1.6):
    t = tt(d); f = midi(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)
    return x * np.exp(-t * 2.2) * env_adsr(len(t), 0.004, 0.1)


def kick(g=1.0):
    t = tt(0.45)
    f = 50 + 120 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 8) * g


def clap():
    t = tt(0.3)
    x = hp(rng.standard_normal(len(t)), 900)
    x = lp(x, 5000)
    return x * np.exp(-t * 18) * 0.5


def hat():
    t = tt(0.08)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 60) * 0.25


def tick():
    t = tt(0.06)
    return (np.sin(2 * np.pi * 2400 * t) * 0.5 + hp(rng.standard_normal(len(t)), 3000) * 0.3) * np.exp(-t * 90)


def impact():
    t = tt(4.0)
    f = 34 + 60 * np.exp(-t * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.3)
    nz = lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 2.5) * 0.35
    return sub + nz


def riser(d):
    t = tt(d)
    x = rng.standard_normal(len(t))
    out = np.zeros_like(x)
    # gleitender Bandpass über Segmente
    seg = int(0.05 * SR)
    for i in range(0, len(t), seg):
        fc = 300 + 7000 * (i / len(t)) ** 2
        s = x[i:i + seg]
        out[i:i + seg] = sosfilt(butter(2, [fc * 0.7, fc * 1.3], 'band', fs=SR, output='sos'), s)
    return out * (t / d) ** 2 * 0.6


# Akkorde: Cmaj9 · G/B · Am7 · Fmaj7 (je 4 s)
prog = [[48, 55, 59, 62, 64], [47, 55, 59, 62, 67], [45, 52, 57, 60, 64], [41, 53, 57, 60, 64]]
roots = [36, 35, 33, 29]

# Pads durchgehend
for k, t0 in enumerate(np.arange(0, F(66), 4.0)):
    c = prog[k % 4]
    g = 0.22 if t0 < F(6) else 0.30
    if F(58) <= t0: g = 0.26
    cut = 900 if t0 < F(6) else (2600 if F(10) <= t0 < F(58) else 1600)
    add(pad(c, 5.0, cut), t0, g, pan=0)

# Intro-Wörter: Glocken
for i, t0 in enumerate([F(x) for x in [0.25, 1.35, 2.45, 3.55]]):
    add(bell([76, 79, 81, 83][i]), t0, 0.16, pan=[-0.4, 0.4, -0.2, 0.2][i])
add(bell(84, 2.5), F(4.65), 0.14)
add(riser(1.5), F(6.0) - 1.5, 0.5)
add(impact(), F(6.0), 0.9)
add(pad([60, 64, 67, 71, 74], 5.5, 4000), F(6.0), 0.18)

# Bass + Beat ab 10 s
B0, B1, A0 = F(10), F(58), F(18)
for k, t0 in enumerate(np.arange(B0, B1 - 0.01, 4.0)):
    r = roots[k % 4]
    for b in range(8):
        tb = t0 + b * BEAT
        t = tt(0.45)
        bs = lp(saw(midi(r), t), 400) * np.exp(-t * 3) * env_adsr(len(t), 0.005, 0.08)
        add(bs, tb + 0.25, 0.22)
for tb in np.arange(B0, B1, BEAT):
    add(kick(), tb, 0.55 if tb >= A0 else 0.35)
A0 = B0 + round((A0 - B0) / 2) * 2
for tb in np.arange(A0, B1, BEAT * 2):
    add(clap(), tb + BEAT, 0.5, pan=0.1)
for tb in np.arange(A0, B1, BEAT / 2):
    add(hat(), tb + BEAT / 4, 0.8, pan=-0.3 if int(tb * 4) % 2 else 0.3)

# Arpeggio (16tel) 18–58 s
arp_pat = [0, 2, 3, 4, 3, 2, 1, 2]
for i, tb in enumerate(np.arange(A0, B1, BEAT / 2)):
    c = prog[int((tb - B0) / 4) % 4]
    n = c[1:][arp_pat[i % 8] % 4] + 12
    add(pluck(n, 0.4, 3200), tb, 0.07, pan=np.sin(i * 0.7) * 0.5)

# kleiner Riser vor den Szenen
for t0 in [18.6, 34.6, 52.4]:
    add(riser(1.0), F(t0) - 1.0, 0.22)

# UI-Sounds
for t0 in [19.8, 26.9, 29.95, 41.3, 43.3, 46.9, 47.9]:
    add(tick(), F(t0), 0.35)
for t0 in [27.95, 28.35, 28.85, 29.25]:
    add(tick(), F(t0), 0.15)
add(bell(88, 1.0), F(31.75), 0.12, pan=0.3); add(bell(93, 1.2), F(31.88), 0.12, pan=0.3)
add(bell(91, 1.0), F(43.6), 0.10)

# Fahrplan-Töne
for i in range(5):
    add(bell([72, 74, 76, 79, 84][i], 2.0), F(59.6 + i * 1.05), 0.15, pan=-0.6 + i * 0.3)
add(riser(1.4), F(66.0) - 1.4, 0.45)
add(impact(), F(66.0), 0.85)
add(pad([48, 55, 60, 64, 67, 71], DUR - F(66.0), 3000), F(66.0), 0.32)
add(bell(84, 3.0), F(66.0), 0.14)

# Hall
ir_t = tt(2.2)
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2)
ir = lp(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
wetL = fftconvolve(L, ir)[:N]; wetR = fftconvolve(R, ir[::-1].copy() * 0 + np.roll(ir, 120))[:N]
L2 = L + 0.28 * wetL; R2 = R + 0.28 * wetR

# Schluss-Fade
fade = np.ones(N)
a = int((F(72) - 3.0) * SR); fade[a:] = np.linspace(1, 0, N - a) ** 1.5
fi = int(0.05 * SR); fade[:fi] = np.linspace(0, 1, fi)
L2 *= fade; R2 *= fade
st = np.stack([L2, R2], 1)
st = np.tanh(st * 1.1)
st /= np.max(np.abs(st)) / 0.89
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'), exist_ok=True)
wavfile.write(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'music.wav'), SR, (st * 32767).astype(np.int16))
print('ok')
