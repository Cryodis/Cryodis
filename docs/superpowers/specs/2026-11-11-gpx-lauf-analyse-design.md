# GPX Lauf-Analyse – Konzept

Stand: 2026-11-11 · Status: zur Durchsicht

## 1. Ziel

Eine lokale Single-Page-Anwendung zur Auswertung eigener Läufe aus GPX-Dateien.
Sie zeigt, wie sich das Tempo entlang der Strecke verändert, und vergleicht
mehrere Läufe derselben Strecke, um Trainingsfortschritte sichtbar zu machen.

**Erfolgskriterien**

- `index.html` per Doppelklick öffnen genügt – kein Server, keine Installation.
- Funktioniert offline; nur der Kartenhintergrund benötigt Internet.
- Ein geladener Lauf zeigt Strecke, Balkendiagramm und Tabelle in 100-m-Abschnitten,
  einheitlich eingefärbt und miteinander verknüpft.
- Mehrere Läufe derselben Strecke lassen sich in vier Darstellungen vergleichen.
- Läufe bleiben zwischen Sitzungen erhalten und lassen sich sichern/wiederherstellen.

**Nicht im Umfang (erste Version)**

- Höhe, Herzfrequenz, Schrittfrequenz (später ergänzbar).
- Mehrere Personen, Benutzerkonten, Server, Veröffentlichung im Internet.
- Einstellbares Intervall (fest 100 m) und einstellbare Pausen-Schwellen in der Oberfläche.
- Unterstützung unterschiedlicher Strecken im Vergleich (Abgleich erfolgt nur über die Distanz).

## 2. Oberfläche

```
┌──────────────────────────────────────────────────────────────────┐
│ GPX Lauf-Analyse   [Einzelner Lauf] [Vergleich]   [+ GPX laden]  │
│                                          [Export] [Import]       │
├───────────────┬──────────────────────────────────────────────────┤
│ MEINE LÄUFE   │  Kennzahlen                                       │
│ ☑ 08.11. 5,0km│ ┌──────────────────────────┬───────────────────┐ │
│ ☐ 04.11. 5,0km│ │ KARTE                    │ TABELLE           │ │
│ ☑ 01.11. 5,1km│ │                          │                   │ │
│               │ └──────────────────────────┴───────────────────┘ │
│               │ ┌──────────────────────────────────────────────┐ │
│               │ │ BALKENDIAGRAMM Tempo pro 100 m               │ │
│               │ └──────────────────────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────────┘
```

### 2.1 Kopfleiste

- Umschalter zwischen den Ansichten **Einzelner Lauf** und **Vergleich**.
- **GPX laden**: Dateiauswahl (Mehrfachauswahl). Zusätzlich Drag & Drop von
  GPX-Dateien auf die gesamte Seite.
- **Export**: lädt alle gespeicherten Läufe als JSON-Sicherungsdatei herunter.
- **Import**: liest eine Sicherungsdatei ein.

### 2.2 Seitenleiste „Meine Läufe“

- Liste aller gespeicherten Läufe mit Datum und Distanz, neueste oben.
- Klick auf einen Lauf: zeigt ihn in der Einzelansicht (wechselt dorthin).
- Häkchen: Lauf ist Teil der Vergleichsansicht.
- Löschen-Schaltfläche je Lauf, mit Rückfrage.

### 2.3 Einzelansicht

- **Kennzahlen**: Distanz, reine Laufzeit, Durchschnittstempo, schnellster und
  langsamster Abschnitt (mit Abschnittsbezeichnung), Anzahl der Pausen und
  deren Gesamtdauer.
- **Karte**: Strecke als Linie, je 100-m-Abschnitt in der Tempo-Farbe;
  Pausen als Punkte mit Tooltip (Dauer).
- **Tabelle**: eine Zeile je Abschnitt – Bezeichnung („0–100 m“), Zeit des
  Abschnitts, Tempo in min/km; Zeilen mit Farbmarkierung in Tempo-Farbe.
- **Balkendiagramm**: ein Balken je Abschnitt, Höhe = Geschwindigkeit
  (höherer Balken = schneller), Farbe = Tempo-Farbe; Tooltip mit Tempo in min/km.
- **Farblegende**: Verlauf dunkelblau → hellrot mit langsamstem und schnellstem Tempo.
- **Verknüpfte Auswahl**: Klick auf Kartenabschnitt, Balken oder Tabellenzeile
  markiert denselben Abschnitt in allen drei Darstellungen. Die Karte zentriert
  den Abschnitt, die Tabelle scrollt zur Zeile. Erneuter Klick auf den markierten
  Abschnitt hebt die Markierung auf.

### 2.4 Vergleichsansicht

- Zeigt alle angehakten Läufe. Jeder Lauf erhält eine feste, unterscheidbare
  Serienfarbe (unabhängig von der Tempo-Skala), mit Legende.
- Tabs:
  1. **Tempo-Linien**: x = Distanz (Abschnitte), y = Tempo; eine Linie je Lauf.
  2. **Vorsprung/Rückstand**: Auswahl des Referenzlaufs (Standard: Lauf mit dem
     besten Durchschnittstempo, damit ein abgebrochener kürzerer Lauf nicht Referenz wird); x = Distanz, y = Zeitdifferenz in Sekunden
     gegenüber der Referenz an jeder 100-m-Grenze; Nulllinie hervorgehoben.
  3. **Tabelle**: Zeilen = Abschnitte, Spalten = Läufe, Werte = Tempo;
     schnellster Wert je Zeile hervorgehoben.
  4. **Entwicklung**: x = Datum, y = Durchschnittstempo; Umschalter auf reine
     Gesamtzeit. Zeigt alle angehakten Läufe.
- Verknüpfte Auswahl: Ein angeklickter Abschnitt wird in den Tabs 1–3 markiert
  (senkrechte Markierung bzw. Tabellenzeile). Tab 4 hat keine Abschnitte.
- Weniger als zwei angehakte Läufe: Hinweis „Mindestens zwei Läufe zum Vergleich anhaken“
  (Tab 4 funktioniert ab einem Lauf).

### 2.5 Leerer Zustand und kleine Bildschirme

- Ohne Läufe: Hinweis mit Aufforderung, GPX-Dateien zu laden bzw. hineinzuziehen.
- Unter ca. 900 px Breite: Seitenleiste oben, Karte/Tabelle/Diagramm untereinander.

## 3. Berechnung

Alle Schwellwerte sind benannte Konstanten in `js/core/analysis.js`:

| Konstante | Wert |
|---|---|
| `SEGMENT_LENGTH_M` | 100 |
| `PAUSE_SPEED_KMH` | 1 |
| `PAUSE_MIN_DURATION_S` | 10 |
| `OUTLIER_SPEED_KMH` | 30 |
| `PAUSE_RADIUS_M` | 5 |
| `OUTLIER_RESET_COUNT` | 5 |

### 3.1 GPX einlesen

- Alle `trkpt` aus allen `trk`/`trkseg` werden zu einem Lauf zusammengefügt;
  je Punkt Breite, Länge, Zeit (`time`).
- Punkte werden nach Zeit sortiert; Punkte mit gleichem Zeitstempel wie der
  Vorgänger werden verworfen; Punkte ohne Zeitstempel werden verworfen.
- Name: `trk/name`, sonst Dateiname ohne Endung. Datum: erster Zeitstempel.

### 3.2 Bereinigung und Distanz

- Distanz zwischen Punkten per Haversine-Formel (Erdradius 6 371 000 m).
- Ausreißer: Ein Punkt, der vom letzten akzeptierten Punkt aus nur mit mehr als
  `OUTLIER_SPEED_KMH` erreichbar wäre, wird verworfen. Werden `OUTLIER_RESET_COUNT`
  Punkte in Folge verworfen, gilt der Anker als fragwürdig: Ist er der erste Punkt,
  wird er verworfen, sonst wird ab dem ersten verworfenen Punkt neu verankert.

### 3.3 Pausen

- Für jedes Punktpaar wird die Geschwindigkeit berechnet. Aufeinanderfolgende
  Paare unter `PAUSE_SPEED_KMH` bilden eine Langsam-Phase.
- Dauert eine Langsam-Phase mindestens `PAUSE_MIN_DURATION_S`, ist sie eine Pause:
  ihre Zeit **und** ihre Distanz zählen nicht zur Laufzeit bzw. Laufstrecke.
- Kürzere Langsam-Phasen zählen normal mit.
- Zusätzlich gilt als Pause: alle Punkte bleiben mindestens `PAUSE_MIN_DURATION_S`
  lang innerhalb von `PAUSE_RADIUS_M` um den ersten Punkt (Stillstand mit GPS-Zittern,
  bei dem einzelne Punktpaare über 1 km/h liegen).
- Je Pause gespeichert: Position (erster Punkt der Phase), Dauer, Distanz vom Start.

### 3.4 100-m-Abschnitte

- Entlang der Laufstrecke (ohne Pausen) wird alle `SEGMENT_LENGTH_M` eine Grenze
  gesetzt. Fällt eine Grenze zwischen zwei Punkte, werden Position und Laufzeit
  dort linear interpoliert.
- Je Abschnitt: Index, Start-/Enddistanz, Laufzeit, Tempo (s/km), Liste der
  Koordinaten (inkl. interpolierter Grenzpunkte) für die Karte.
- Der letzte Abschnitt ist in der Regel kürzer („5000–5023 m“); sein Tempo wird
  auf seine tatsächliche Länge bezogen. Ist er kürzer als 100 m, wird er als
  `partial` markiert und bei schnellstem/langsamstem Abschnitt sowie der
  Farbskala nicht berücksichtigt.

### 3.5 Kennzahlen

- Distanz = Laufstrecke ohne Pausen; Laufzeit = Zeit ohne Pausen;
  Durchschnittstempo = Laufzeit / Distanz.

### 3.6 Farbskala

- Je Lauf: langsamstes Tempo (ohne `partial`) → dunkelblau `#1e3a8a`,
  schnellstes → hellrot `#ff4d4d`, dazwischen lineare Interpolation im
  RGB-Farbraum über das Tempo. Sind alle Tempi gleich: einheitlich Mittelfarbe.
- Eine einzige Funktion `colorForPace(pace, minPace, maxPace)` wird von Karte,
  Diagramm, Tabelle und Legende genutzt.

### 3.7 Vergleich

- Abgleich über den Abschnittsindex (Distanz vom Start). Fehlende Abschnitte
  eines kürzeren Laufs bleiben leer.
- Vorsprung/Rückstand an Grenze k: kumulierte Laufzeit(Lauf, k) −
  kumulierte Laufzeit(Referenz, k). Positiv = Rückstand. Nur für volle
  100-m-Grenzen, die beide Läufe erreichen (Ende eines Reststücks zählt nicht).
- Entwicklung: je Lauf (Datum, Durchschnittstempo, Laufzeit), nach Datum sortiert.

### 3.8 Duplikate

- Ein Lauf gilt als Duplikat, wenn Startzeit und Anzahl Rohpunkte mit einem
  gespeicherten Lauf übereinstimmen. Duplikate werden übersprungen.

## 4. Technik und Aufbau

### 4.1 Grundsätze

- Reines HTML/CSS/JavaScript, klassische `<script>`-Einbindung (keine ES-Module,
  da diese über `file://` blockiert werden). Ein globaler Namensraum
  `window.GpxApp`.
- Bibliotheken lokal in `vendor/`: Leaflet 1.9.4 (Karte), Chart.js 4.x (UMD-Build).
- Rechenlogik (`js/core/`) ohne Browser-Abhängigkeiten; jede Datei registriert
  sich im Browser unter `GpxApp` und exportiert in Node über `module.exports`.
  Der GPX-Parser erhält ein XML-Dokument; im Browser stammt es von `DOMParser`,
  in Tests von `@xmldom/xmldom`.

### 4.2 Struktur

```
index.html
css/style.css
vendor/leaflet/  vendor/chart.js/
js/core/gpx-parser.js    GPX-Dokument → { name, points[] }
js/core/geo.js           Haversine, Interpolation
js/core/analysis.js      Bereinigung, Pausen, Abschnitte, Kennzahlen
js/core/compare.js       Abgleich, Vorsprung/Rückstand, Entwicklung
js/core/color-scale.js   Tempo → Farbe
js/core/format.js        Tempo, Dauer, Datum, Distanz formatieren
js/storage.js            IndexedDB, Export, Import
js/state.js              zentraler Zustand mit Abonnement
js/ui/run-list.js  summary.js  map-view.js  segment-chart.js
js/ui/segment-table.js  compare-view.js  toast.js
js/app.js                Start und Verdrahtung
tests/core/*.test.js     Node-Tests (node:test)
tests/e2e/*.spec.js      Playwright-Oberflächentest
tests/fixtures/          künstliche GPX-Dateien
package.json             nur für Tests (devDependencies)
```

### 4.3 Zustand

`state.js` hält: `view` (`single`|`compare`), `currentRunId`, `compareRunIds`,
`referenceRunId`, `compareTab`, `selectedSegment` (Index oder `null`), sowie die
geladenen Läufe mit ihrer Analyse. Ansichten melden Änderungen über
`state.set(...)` und abonnieren Änderungen über `state.subscribe(fn)`; keine
Ansicht ruft eine andere direkt auf.

### 4.4 Speicherung

- IndexedDB, Datenbank `gpx-lauf-analyse`, Objektspeicher `runs`
  (Schlüssel: generierte ID).
- Gespeichert je Lauf: `id`, `name`, `date`, `fileName`, `importedAt`,
  Rohpunkte als kompakte Arrays `lat[]`, `lon[]`, `time[]` (ms seit Epoche).
- Analysen werden beim Laden neu berechnet, nicht gespeichert.
- Export: JSON `{ app: "gpx-lauf-analyse", version: 1, exportedAt, runs: [...] }`,
  Dateiname `lauf-sicherung-JJJJ-MM-TT.json`.
- Import: Prüfung von `app` und `version`; Zusammenführung mit Duplikatprüfung.
- Ist IndexedDB nicht verfügbar, läuft die App nur im Arbeitsspeicher und zeigt
  dauerhaft ein Banner mit Hinweis auf den Export.

### 4.5 Karte offline

- OpenStreetMap-Kacheln über Leaflet mit Quellenangabe.
- Schlagen Kacheln fehl (`tileerror`), wird die Kachelebene entfernt und der
  Hinweis „Offline – Karte ohne Hintergrund“ angezeigt; Strecke, Pausen und
  Klicks funktionieren weiter.

## 5. Fehlerbehandlung

Meldungen erscheinen als nicht-blockierende Hinweise (Toasts). Beim Laden
mehrerer Dateien wird jede einzeln behandelt.

| Situation | Verhalten |
|---|---|
| Kein gültiges XML/GPX | „Datei X konnte nicht gelesen werden“, übersprungen |
| Keine Zeitstempel | „X enthält keine Zeitangaben“, übersprungen |
| < 2 Punkte oder Laufstrecke < 100 m | „X ist zu kurz“, übersprungen |
| Ungeordnete/doppelte Zeitstempel | sortieren bzw. verwerfen (3.1) |
| GPS-Ausreißer | Punkt verwerfen (3.2) |
| Duplikat | „X ist bereits gespeichert“, übersprungen |
| IndexedDB nicht verfügbar | Arbeitsspeicher-Modus mit Banner (4.4) |
| Ungültige Sicherungsdatei | Hinweis, Bestand unverändert |
| Offline | Karte ohne Hintergrund (4.5) |

## 6. Tests

- **Rechenlogik** (`node --test`), mit künstlichen GPX-Fixtures:
  Haversine gegen bekannte Distanzen; 1 km in 5:00 min → 10 Abschnitte à 5:00 /km;
  30-s-Pause erkannt und herausgerechnet, 5-s-Stillstand nicht; Interpolation an
  Abschnittsgrenzen; kurzer letzter Abschnitt als `partial`; Ausreißer verworfen;
  Farbskala (Endpunkte, Mitte, Gleichstand); Vorsprung/Rückstand und
  unterschiedlich lange Läufe; Entwicklung sortiert; alle Fehlerfälle aus Abschnitt 5;
  Export → Import ergibt identische Läufe.
- **Oberfläche** (Playwright über `file://`): Beispiel-GPX laden; Karte, Balken,
  Tabelle sichtbar; Klick auf Balken markiert Tabellenzeile und Kartenabschnitt;
  Vergleichs-Tabs umschaltbar; Lauf nach Neuladen weiterhin vorhanden.
- **Echte Daten**: Prüfung mit den GPX-Dateien des Nutzers, insbesondere Pausen-
  und Ausreißer-Schwellen.

## 7. Start für Nutzer

Ordner herunterladen (GitHub „Code → Download ZIP“ oder `git clone`), an festen
Ort legen, `index.html` per Doppelklick öffnen. Empfohlen: Chrome, Edge, Firefox.
