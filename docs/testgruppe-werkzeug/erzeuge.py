"""Erzeugt aus der Einsatzliste in docs/testgruppe.md die Rollenbücher
(docs/testgruppe-rollenbuecher.md) und das Formular-Skript (docs/testgruppe-formular.gs) und
prüft dabei die Regeln des Drehbuchs (Stichwörter, Kettenlänge, Schritte pro Akt, Meldungen).
Werkzeug ausserhalb der App, nur Python-Standardbibliothek.

Aufruf im Repo-Ordner: python3 docs/testgruppe-werkzeug/erzeuge.py .
Nach einer Änderung der Einsatzliste neu laufen lassen; nie die erzeugten Dateien von Hand ändern."""
import json
import re
import sys
from pathlib import Path

W = Path(sys.argv[1])
TG = (W / 'docs/testgruppe.md').read_text()

PERSONAS = {  # Kürzel -> (Name, Steckbrief, Gerät, Prio)
    'CM': 'Corinne Meister', 'MV': 'Markus Verwalter', 'DS': 'Daniela Doppel',
    'P': 'Pascal Partner', 'Z': 'Zora Zögerlich', 'S': 'Stefan Spät', 'W': 'Weiteres Mitglied',
}
ROLLE = {
    'CM': 'CM-Leitung', 'MV': 'Mitgliederverwaltung', 'DS': 'Doppel-Sucherin', 'P': 'Partner',
    'Z': 'Zögerin', 'S': 'Spätzünder', 'W': 'Weiteres Mitglied',
}
REIHENFOLGE = ['CM', 'MV', 'DS', 'P', 'Z', 'S', 'W']
PRIO23 = {'Z', 'S'}

# Steckbriefe lesen
steck = {}
for zeile in TG.split('### Steckbriefe')[1].split('###')[0].splitlines():
    teile = [t.strip() for t in zeile.strip().strip('|').split('|')]
    if len(teile) == 5 and teile[0] in PERSONAS.values():
        steck[teile[0]] = teile[1:]
gerate = {}
for zeile in TG.split('## Rollen und Personas')[1].split('**Anzahl')[0].splitlines():
    teile = [t.strip() for t in zeile.strip().strip('|').split('|')]
    if len(teile) == 5 and teile[1] in PERSONAS:
        gerate[teile[1]] = teile[4]

# Einsatzliste lesen
liste = TG.split('## Einsatzliste')[1].split('## Abdeckung')[0]
akte = re.split(r'\n### Akt (\d) – ([^\n]+)\n', liste)
einsaetze = []  # dicts
zusatz = {}  # (kürzel, akt) -> [schritte]
titel = {}
for i in range(1, len(akte), 3):
    akt, name, body = int(akte[i]), akte[i + 1].strip(), akte[i + 2]
    titel[akt] = name
    kopf = None
    for zeile in body.splitlines():
        if zeile.startswith('Zusatz '):
            m = re.match(r'Zusatz (\w+) \(freiwillig[^)]*\): (.*)', zeile + ' ')
            text = zeile
            # Fortsetzungszeilen
            idx = body.splitlines().index(zeile)
            for f in body.splitlines()[idx + 1:]:
                if not f.strip():
                    break
                text += ' ' + f.strip()
            m = re.match(r'Zusatz (\w+) \(freiwillig[^)]*\): (.*)', text)
            schritte = [s.strip().rstrip('.') for s in m.group(2).split(' · ')]
            zusatz[(m.group(1), akt)] = [s[0].upper() + s[1:] for s in schritte]
            continue
        if not zeile.startswith('|'):
            continue
        teile = [t.strip() for t in zeile.strip().strip('|').split('|')]
        if teile[0] == 'Nr':
            kopf = teile
            continue
        if set(teile[0]) <= set('-'):
            continue
        e = dict(zip(kopf, teile))
        e['akt'] = akt
        einsaetze.append(e)

nach_nr = {e['Nr']: e for e in einsaetze}
for e in einsaetze:
    s = e['Schritte']
    m = re.fullmatch(r'wie (\d\.\d+)', s)
    if m:
        s = nach_nr[m.group(1)]['Schritte']
    e['liste'] = [x.strip()[0].upper() + x.strip()[1:] for x in s.split(' · ')]
    p = e['Persona']
    e['wer'] = REIHENFOLGE if p == 'alle' else [x.strip() for x in p.split(',')]

fehler = []
def nrkey(n):
    a, b = n.split('.')
    return (int(a), int(b))

for e in einsaetze:
    if e['akt'] == 0:
        continue
    for w in e['wer']:
        if w not in PERSONAS:
            fehler.append(f"{e['Nr']}: unbekannte Persona {w}")
    for ref in re.findall(r'✅ (\d\.\d+)', e['Stichwort']):
        if ref not in nach_nr or nrkey(ref) >= nrkey(e['Nr']):
            fehler.append(f"{e['Nr']}: Stichwort {ref} nicht früher")
    m = e['Meldung'].strip('`')
    if m not in ('keine',) and not m.startswith(f"✅ {e['Nr']}") and m != '✅ fertig':
        fehler.append(f"{e['Nr']}: Meldung beginnt nicht mit eigener Nr")
    if any(w in PRIO23 for w in e['wer']) and e.get('ohne', '–') in ('', None):
        fehler.append(f"{e['Nr']}: ohne-Eintrag fehlt")

# Kettenlänge je Akt
for akt in range(1, 9):
    tiefe = {}
    for e in [x for x in einsaetze if x['akt'] == akt]:
        refs = re.findall(r'✅ (\d\.\d+)', e['Stichwort'])
        tiefe[e['Nr']] = 1 + max([tiefe.get(r, 0) for r in refs], default=0) if refs else 0
    if tiefe and max(tiefe.values()) > 3:
        fehler.append(f'Akt {akt}: Kette länger als drei Übergaben')

# Schritte je Persona und Akt
schritte = {}  # kürzel -> akt -> [(nr, text)]
for e in einsaetze:
    if e['akt'] == 0:
        continue
    for w in e['wer']:
        schritte.setdefault(w, {}).setdefault(e['akt'], []).extend((e['Nr'], s) for s in e['liste'])
for w, akte_w in schritte.items():
    for akt, l in akte_w.items():
        if len(l) > 8:
            fehler.append(f'{w} Akt {akt}: {len(l)} Schritte')
for e in einsaetze:
    if 'W' in e['wer'] and e['akt'] and not (
        e['Stichwort'] == 'Akt-Beginn' or e['Stichwort'] == 'ab 18 Uhr'
        or all(nach_nr[r]['Persona'] in ('CM', 'MV') for r in re.findall(r'✅ (\d\.\d+)', e['Stichwort']))):
        fehler.append(f"{e['Nr']}: W wartet auf ein Mitglied")

if fehler:
    print('\n'.join(fehler))
    sys.exit(1)

# Rollenbücher schreiben
def stichwort(e):
    s = e['Stichwort']
    if s == 'Akt-Beginn':
        return 'Sobald d Regie de Akt eröffnet het.'
    if s == 'ab 18 Uhr':
        return 'Ab 18 Uhr.'
    refs = re.findall(r'✅ (\d\.\d+)', s)
    texte = ' und '.join('«' + nach_nr[r]['Meldung'].strip('`') + '»' for r in refs)
    return f'Du bisch dra, sobald im Chat {texte} stoht.'

def meldung(e, w):
    m = e['Meldung'].strip('`')
    if m == 'keine':
        return None
    return m.replace('<Kürzel>', w)

out = ['[← Übersicht](index.md)', '', '# Rollenbücher der Testgruppe', '',
       'Ein Rollenbuch pro Persona für den [Probelauf](testgruppe.md). Erzeugt aus der',
       '[Einsatzliste](testgruppe.md#einsatzliste) mit `python3 docs/testgruppe-werkzeug/erzeuge.py .`',
       '(nicht von Hand ändern); die Schritte stehen wörtlich so im',
       '[Formular](testgruppe.md#formular). Jedes Rollenbuch ist ein eigener Abschnitt, damit der',
       'Projektleiter es einzeln als PDF oder Google-Dokument verschicken kann. Platzhalter `[…]`',
       'vor dem Versand ersetzen.', '']
for w in REIHENFOLGE:
    name = PERSONAS[w]
    out += [f'## Rollenbuch {ROLLE[w]}', '']
    if w == 'W':
        out += ['Du spielst **[Name von der Regie]**, ein weiteres Mitglied. Geschlecht, Jahrgang und',
                'Klassierung bekommst du von der Regie. Gerät: dein eigenes Handy.', '']
    else:
        g, j, k, eig = steck[name]
        out += [f'Du spielst **{name}** ({ROLLE[w]}): {g}, Jahrgang {j}, Klassierung {k}.',
                f'Eigenheit: {eig}. Gerät: {gerate[w]}.', '']
    out += ['**So gaht\'s**', '',
            '- 8 Täg, jede Tag en Akt, öppe 15 Minute. Tag 1 = Akt 1 … Tag 8 = Akt 8, Date: [Kalender].',
            '- Zerscht allei probiere, mit dem Rollebuech und de Hilfe in MyTCO (Fusszeile «Hilfe»).',
            '- Nur dini eigeti Persona bruuche. Adresse und Telefon erfindsch du sälber.',
            '- Nach jedem Isatz dini Meldig in Chat kopiere. Kei Code und kei Adresse in Chat.',
            '- Wenn öppis nöd gaht: `⏭ <Nr> ausgelassen` in Chat, und im Formular verzelle.',
            '- Am Abig s Formular, Abschnitt «' + (name if w != 'W' else 'Weiteres Mitglied') + ' – Akt N»: [Formular-Link]', '']
    for akt in range(1, 9):
        eig_e = [e for e in einsaetze if e['akt'] == akt and w in e['wer']]
        if not eig_e and (w, akt) not in zusatz:
            continue
        out += [f'### Akt {akt} – {titel[akt]} (Tag {akt})', '']
        if not eig_e:
            out += ['Heute nur der Zusatz.', '']
        for e in eig_e:
            out += [f'#### {e["Nr"]}', '', stichwort(e), '']
            out += [f'{i}. {s}' for i, s in enumerate(e['liste'], 1)] + ['']
            m = meldung(e, w)
            if m:
                out += ['Meldung:', '', '```text', m, '```', '']
            else:
                out += ['Keine Meldung nötig.', '']
            ohne = e.get('ohne', '–') or '–'
            teile = [t.strip() for t in ohne.split(';') if t.strip() not in ('–', 'entfällt')
                     and not t.strip().startswith(f'ohne {w}:')]
            if teile:
                out += ['Falls jemand fehlt: ' + '; '.join(teile) + '.', '']
        if (w, akt) in zusatz:
            out += [f'#### Zusatz Akt {akt} (freiwillig)', '']
            out += [f'{i}. {s}' for i, s in enumerate(zusatz[(w, akt)], 1)] + ['']
        out += [f'Am Abig: Formular, Abschnitt «{name if w != "W" else "Weiteres Mitglied"} – Akt {akt}».', '']
(W / 'docs/testgruppe-rollenbuecher.md').write_text('\n'.join(out).rstrip() + '\n')

# Daten fürs Formular
daten = {'PERSONAS': [], 'SCHRITTE': {}, 'ZUSATZ': {}}
for w in REIHENFOLGE:
    n = PERSONAS[w]
    daten['PERSONAS'].append(n)
    daten['SCHRITTE'][n] = {str(a): [f'{nr} · {s}' for nr, s in l] for a, l in sorted(schritte.get(w, {}).items())}
    z = {str(a): l for (k, a), l in zusatz.items() if k == w}
    if z:
        daten['ZUSATZ'][n] = z
vorlage = (Path(__file__).parent / 'formular-vorlage.gs').read_text()
for k in ('PERSONAS', 'SCHRITTE', 'ZUSATZ'):
    vorlage = vorlage.replace(f'__{k}__', json.dumps(daten[k], ensure_ascii=False, indent=2))
(W / 'docs/testgruppe-formular.gs').write_text(vorlage)
print('ok: Rollenbücher und Formular-Skript erzeugt')
