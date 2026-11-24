[← Übersicht](../index.md)

# Präsentationen

Material, mit dem MyTCO im Verein vorgestellt wird. Momentaufnahmen, nicht nachgeführt: Was in
der App gilt, steht im [UI-Leitbild](../ui-leitbild.md), in der [Roadmap](../roadmap.md) und in
den Anforderungen.

| Datum | Anlass | Datei |
|-------|--------|-------|
| 23.11.2026 | **Launchvideo für die ao. GV (Ende November 2026):** 1 Minute 43, 1920 × 1080, 30 fps, mit Musik. Stellt MyTCO im Stil einer Produktvorstellung vor: Startseite, Clubmeisterschaft mit Rangliste, Resultat melden mit Push, Interclub, GV-Anmeldung, Dokumente und Lizenzen, Handy und PC, Fahrplan ohne Daten, Aufruf an Tester | [`2026-11-gv-launchvideo.mp4`](2026-11-gv-launchvideo.mp4) |

## Launchvideo GV 2026

**Inhalt:** Alle Bildschirme sind Entwürfe aus dem Design-System (Tokens, `basis.css`, Wappen),
keine Aufnahmen der laufenden App. Personen sind erfunden (Luca Beispiel, Marco Muster, Jonas
und Timo Probst, Nico Beispiel); die Interclub-Teams sind öffentliche Daten ohne Personennamen.
Die Rangliste ist für die Geschichte im Video angepasst (Luca rückt von Platz 3 auf Platz 2) und
weicht darum vom Onepager ab. Die Musik ist selbst erzeugt, ohne fremde Lizenzen.

**Ablauf:**

| Zeit | Szene |
|------|-------|
| 0:00 | «Spiele. Resultate. Anmeldungen. Dokumente.» → «Alles an einem Ort.» |
| 0:07 | Wappen und MyTCO, «Die Mitglieder-App des TC Olten» |
| 0:13 | iPhone mit Startseite, «TCO in der Hosentasche.» |
| 0:25 | Clubmeisterschaft: Rangliste, Resultat melden, Rangliste rechnet neu, Push |
| 0:47 | Interclub: alle 17 Teams der Saison 2026 (10 Interclub, 7 Junioren-Interclub, wie in `scripts/beispiel-interclub/2026/`) |
| 0:55 | GV-Anmeldung mit einem Tipp |
| 1:04 | Dokumente und Lizenzen in der App |
| 1:13 | Handy und PC, Barrierefreiheit |
| 1:22 | Fahrplan «Schritt für Schritt»: Jetzt, Als Nächstes, Dann, Danach, Später; bewusst ohne Daten |
| 1:34 | «Bald für alle Mitglieder.», Aufruf an Tester |

**Neu erzeugen** (Ordner [`gv-launchvideo-quelle/`](gv-launchvideo-quelle/)): Die Bühne ist eine
HTML-Seite (`stage.html`), deren Funktion `seek(t)` jedes Bild aus der Zeit berechnet. `zeitplan.py`
legt fest, wo die Bühne langsamer läuft, damit man lesen kann (Bühnenzeit 72 s → Video 1:43);
Render und Musik richten sich danach; die
Stylesheets unter `mytco/` sind eine Kopie aus dem Design-System vom 23.11.2026. Gebraucht werden
Python 3 mit `playwright` (Chromium), `numpy` und `scipy`, `ffmpeg` und die Schrift Inter.

```bash
cd docs/praesentation/gv-launchvideo-quelle
python3 musik.py            # out/music.wav
python3 render.py           # out/p00.mp4 … p10.mp4, eine Datei je Szene
(cd out && ls p*.mp4 | sed "s/^/file '/;s/$/'/" > liste.txt)
ffmpeg -f concat -safe 0 -i out/liste.txt -c copy out/video.mp4
ffmpeg -i out/video.mp4 -i out/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest out/launchvideo.mp4
```

Eine einzelne Szene neu rendern: `python3 render.py 4` (Nummern 0–10, Schnitte in `render.py`),
dann die zwei `ffmpeg`-Zeilen wiederholen. Texte und Zeiten stehen in `stage.html`.
