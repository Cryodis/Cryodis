# GPX Lauf-Analyse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lokale Single-Page-Anwendung (`index.html` per Doppelklick), die GPX-Läufe in 100-m-Abschnitte zerlegt, farbig auf Karte/Balkendiagramm/Tabelle verknüpft darstellt und mehrere Läufe derselben Strecke vergleicht.

**Architecture:** Klassische `<script>`-Dateien unter dem globalen Namensraum `window.GpxApp`. Reine Rechenlogik in `js/core/` (läuft auch in Node, dort per `module.exports` für Tests), Anzeige in `js/ui/`. Ein zentraler Zustand (`js/core/state.js`) mit Abonnement verbindet die Ansichten; Läufe liegen als Rohpunkte in IndexedDB und werden beim Laden neu analysiert.

**Tech Stack:** HTML/CSS/JavaScript (ES2020, keine ES-Module), Leaflet 1.9.4, Chart.js 4.4.7 (UMD), Node 22 `node:test`, `@xmldom/xmldom` 0.9.8 (nur Tests), Playwright (vorinstalliert, nur Tests).

**Spec:** `docs/superpowers/specs/2026-11-11-gpx-lauf-analyse-design.md`

## Global Constraints

- App startet per Doppelklick auf `index.html` über `file://`; keine ES-Module, kein Build-Schritt, kein Server.
- Alle Bibliotheken liegen lokal in `vendor/`; einzige Netzwerkanfragen sind OSM-Kacheln `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Sämtliche Oberflächentexte auf Deutsch; Zahlen mit deutschem Dezimalkomma (`5,02 km`).
- Tempo immer als min/km im Format `m:ss` (`5:19`), intern Sekunden pro km (`paceSPerKm`).
- Konstanten: `SEGMENT_LENGTH_M = 100`, `PAUSE_SPEED_KMH = 1`, `PAUSE_MIN_DURATION_S = 10`, `OUTLIER_SPEED_KMH = 30`.
- Farbskala: langsamster Abschnitt `#1e3a8a`, schnellster `#ff4d4d`, lineare RGB-Interpolation; `partial`-Abschnitte zählen nicht für min/max.
- Exportformat: `{ app: "gpx-lauf-analyse", version: 1, exportedAt, runs: [...] }`, Dateiname `lauf-sicherung-JJJJ-MM-TT.json`.
- `package.json` enthält nur devDependencies und Test-Skripte; die App selbst lädt nichts aus `node_modules`.
- Jede Datei in `js/core/` folgt dem Modulmuster aus Task 1.

## Review Focus

1. **GPX-Varianten von Uhren/Apps** (GPX 1.0-Namensraum, Elemente mit Präfix wie `gpx:trkpt`, `<extensions>` in Trackpunkten) – müssen genauso gelesen werden wie GPX 1.1. → Test in Task 2.
2. **Stillstand direkt am Start** (Uhr läuft, Läufer wartet auf GPS) – darf den ersten Abschnitt nicht extrem langsam machen, sondern ist eine Pause. → Test in Task 3.
3. **Lange Läufe mit 1-s-Aufzeichnung** (z. B. 2 h ≈ 7 200 Punkte, 20 km = 200 Abschnitte) – Analyse muss schnell bleiben (< 300 ms für 20 000 Punkte). → Test in Task 3.
4. **Wechsel/Löschen des angezeigten Laufs** – markierter Abschnitt, Referenzlauf und Vergleichsauswahl dürfen nicht auf nicht mehr existierende Läufe/Abschnitte zeigen. → Tests in Task 5 (Zustand) und Task 6 (Löschen).
5. **Mehrere Dateien auf einmal, gemischt gültig/ungültig/Duplikat** – gültige werden geladen, je Fehler ein Hinweis. → E2E-Test in Task 6.

---

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `index.html` | Seitengerüst, Einbindung aller Skripte in fester Reihenfolge |
| `css/style.css` | Layout, Farben, responsives Verhalten |
| `vendor/leaflet/` | `leaflet.js`, `leaflet.css`, `images/` |
| `vendor/chart.js/chart.umd.js` | Chart.js UMD-Build |
| `js/core/errors.js` | `AppError` mit `code` |
| `js/core/format.js` | Formatierung Tempo/Dauer/Distanz/Datum/Abschnitt |
| `js/core/geo.js` | Haversine, Interpolation |
| `js/core/gpx-parser.js` | XML-Dokument → Name + Punkte |
| `js/core/analysis.js` | Bereinigung, Pausen, Abschnitte, Kennzahlen |
| `js/core/color-scale.js` | Tempo → Farbe, Serienfarben |
| `js/core/compare.js` | Abgleich, Vorsprung/Rückstand, Entwicklung, Standard-Referenz |
| `js/core/backup.js` | Rohlauf-Format, Duplikatprüfung, Export/Import-JSON |
| `js/core/state.js` | zentraler Zustand mit `subscribe` |
| `js/storage.js` | IndexedDB mit Arbeitsspeicher-Rückfall |
| `js/ui/toast.js` | Hinweise |
| `js/ui/run-list.js` | Seitenleiste |
| `js/ui/summary.js` | Kennzahlen + Farblegende |
| `js/ui/map-view.js` | Leaflet-Karte, Offline-Rückfall |
| `js/ui/segment-chart.js` | Balkendiagramm |
| `js/ui/segment-table.js` | Abschnittstabelle |
| `js/ui/compare-view.js` | vier Vergleichs-Tabs |
| `js/app.js` | Start, Dateiimport, Verdrahtung |
| `tests/helpers/gpx-builder.js` | erzeugt künstliche GPX-Texte |
| `tests/core/*.test.js` | Node-Tests der Rechenlogik |
| `tests/e2e/*.test.js` | Playwright-Tests über `file://` |
| `README.md` | Start- und Testanleitung (deutsch) |

---

### Task 1: Projektgerüst, Modulmuster, Fehler und Formatierung

**Files:**
- Create: `package.json`, `.gitignore`, `vendor/leaflet/*`, `vendor/chart.js/chart.umd.js`
- Create: `js/core/errors.js`, `js/core/format.js`, `tests/helpers/gpx-builder.js`
- Test: `tests/core/format.test.js`

**Interfaces:**
- Produces:
  - Modulmuster jeder `js/core/*.js`-Datei:
    ```js
    (function (root, factory) {
      const api = factory(root);
      if (typeof module !== 'undefined' && module.exports) module.exports = api;
      else (root.GpxApp = root.GpxApp || {}).<name> = api;
    })(typeof self !== 'undefined' ? self : globalThis, function (root) {
      // Abhängigkeiten: typeof require === 'function' ? require('./geo.js') : root.GpxApp.geo
      return { /* API */ };
    });
    ```
  - `GpxApp.errors`: `class AppError extends Error { constructor(code: string, message: string) }`; Codes: `'invalid-gpx' | 'no-time' | 'too-short' | 'duplicate' | 'invalid-backup'`.
  - `GpxApp.format`:
    - `formatPace(sPerKm: number) -> string` – `319 → "5:19"`, `300 → "5:00"`, gerundet auf ganze Sekunden, `null/NaN/Infinity → "–"`.
    - `formatDuration(s: number) -> string` – `1601 → "26:41"`, `3723 → "1:02:03"`.
    - `formatDistance(m: number) -> string` – `5023 → "5,02 km"`, `850 → "850 m"` (unter 1000 m ganze Meter).
    - `formatDate(ms: number) -> string` – lokales Datum `"08.11.2026"`.
    - `segmentLabel(startM: number, endM: number) -> string` – `(0,100) → "0–100 m"`, `(5000,5023.4) → "5000–5023 m"` (Ende gerundet, Gedankenstrich U+2013).
    - `formatGap(s: number) -> string` – `+12 → "+0:12"`, `-75 → "−1:15"` (Minuszeichen U+2212), `0 → "±0:00"`.
  - `tests/helpers/gpx-builder.js` (CommonJS):
    - `buildGpx({ name?: string, points: {lat,lon,time:number|null}[], version?: '1.0'|'1.1', prefix?: string }) -> string` – `time` in ms, `null` lässt `<time>` weg; `prefix` setzt Elementpräfix (z. B. `'gpx'`) mit passender `xmlns:gpx`-Deklaration.
    - `straightRun({ distanceM, paceSPerKm, stepM = 10, startTime = Date.UTC(2026,10,8,7,0,0), startLat = 48.0, lon = 11.0, pauses = [] as {atM:number, durationS:number}[] }) -> {lat,lon,time}[]` – läuft exakt nach Norden (`1 m = 1 / 111194.93 Grad Breite`); bei `atM` werden `durationS` Punkte im 1-s-Abstand an derselben Position eingefügt.

- [ ] **Step 1: Gerüst anlegen**

`package.json` mit `"private": true`, devDependencies `@xmldom/xmldom@0.9.8`, `leaflet@1.9.4`, `chart.js@4.4.7`, Skripte `"test": "node --test tests/core/"`, `"test:e2e": "node --test --test-concurrency=1 tests/e2e/"`, `"vendor": "node scripts/copy-vendor.js"`. `scripts/copy-vendor.js` kopiert `node_modules/leaflet/dist/{leaflet.js,leaflet.css,images/}` nach `vendor/leaflet/` und `node_modules/chart.js/dist/chart.umd.js` nach `vendor/chart.js/`. `.gitignore`: `node_modules/`. `vendor/` wird eingecheckt.

Run: `npm install && npm run vendor && ls vendor/leaflet vendor/chart.js`
Expected: `images leaflet.css leaflet.js` und `chart.umd.js`

- [ ] **Step 2: Failing test `tests/core/format.test.js`** – je eine Zusicherung für jeden Beispielwert aus der Interfaces-Liste oben (inkl. `formatPace(NaN) === '–'`).

- [ ] **Step 3:** Run `npm test` → FAIL (`Cannot find module '../../js/core/format.js'`)

- [ ] **Step 4:** `js/core/errors.js` und `js/core/format.js` nach Modulmuster implementieren; `formatDate` über `toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'})`.

- [ ] **Step 5:** `tests/helpers/gpx-builder.js` implementieren und in `tests/core/gpx-builder.test.js` absichern: `straightRun({distanceM:1000, paceSPerKm:300})` liefert 101 Punkte, letzter Zeitstempel = Start + 300 000 ms; mit `pauses:[{atM:500,durationS:30}]` 131 Punkte.

- [ ] **Step 6:** Run `npm test` → PASS

- [ ] **Step 7: Commit** – `git add -A && git commit -m "Projektgerüst, Formatierung und Testhilfen"`

---

### Task 2: Geometrie und GPX-Parser

**Files:**
- Create: `js/core/geo.js`, `js/core/gpx-parser.js`
- Test: `tests/core/geo.test.js`, `tests/core/gpx-parser.test.js`

**Interfaces:**
- Consumes: `GpxApp.errors.AppError`, `buildGpx`, `straightRun`
- Produces:
  - `GpxApp.geo.haversine(lat1, lon1, lat2, lon2) -> number` (Meter, Erdradius `6371000`)
  - `GpxApp.geo.lerpPoint(a: {lat,lon,time}, b: {lat,lon,time}, f: number) -> {lat,lon,time}` (lineare Interpolation, `f` ∈ [0,1])
  - `GpxApp.gpxParser.parseGpx(doc: XMLDocument, fileName: string) -> { name: string, points: {lat:number, lon:number, time:number}[] }` (time in ms)

- [ ] **Step 1: Failing tests**
  - `haversine(48,11,48.001,11)` ≈ `111.19` m (±0.05); `haversine` gleicher Punkt = `0`; München→Berlin `(48.1374,11.5755,52.5200,13.4050)` ≈ `504 200` m (±1 000).
  - `lerpPoint` mit `f=0.25` liefert Viertelwerte für lat, lon und time.
  - Parser (Dokument via `new DOMParser().parseFromString(text,'text/xml')` aus `@xmldom/xmldom`):
    - GPX 1.1 mit `trk/name` „Morgenrunde“ → `name === 'Morgenrunde'`, Punktzahl stimmt.
    - Ohne `trk/name`, `fileName = 'lauf-08-11.gpx'` → `name === 'lauf-08-11'`.
    - Zwei `trkseg` und zwei `trk` → alle Punkte in einem Array.
    - Unsortierte Zeitstempel → aufsteigend sortiert; doppelter Zeitstempel → nur einer bleibt.
    - Einzelne Punkte ohne `<time>` → verworfen; **alle** ohne `<time>` → `AppError` code `'no-time'`.
    - `'<html></html>'` und GPX ohne `trkpt` → code `'invalid-gpx'`; Parserfehler (`parsererror`-Element oder geworfener Fehler) → `'invalid-gpx'`.
    - Review Focus 1: GPX 1.0 (`xmlns="http://www.topografix.com/GPX/1/0"`), Präfix `gpx:` und Trackpunkte mit `<extensions><gpxtpx:TrackPointExtension>…` liefern dieselben Punkte wie die 1.1-Variante.

- [ ] **Step 2:** Run `npm test` → FAIL

- [ ] **Step 3:** Implementieren. Elemente namensraumunabhängig über `getElementsByTagNameNS('*', 'trkpt')` bzw. `'name'`/`'time'`; Zeit per `Date.parse`, ungültige Zeit = fehlend. Parserfehler: `doc.getElementsByTagName('parsererror').length > 0` oder Wurzelelement-Lokalname ≠ `gpx` → `'invalid-gpx'`.

- [ ] **Step 4:** Run `npm test` → PASS

- [ ] **Step 5: Commit** – `git commit -am "Geometrie und GPX-Parser"` (neue Dateien vorher `git add`)

---

### Task 3: Analyse – Bereinigung, Pausen, Abschnitte, Kennzahlen

**Files:**
- Create: `js/core/analysis.js`
- Test: `tests/core/analysis.test.js`

**Interfaces:**
- Consumes: `GpxApp.geo.haversine`, `GpxApp.geo.lerpPoint`, `AppError`
- Produces:
  - Konstanten `SEGMENT_LENGTH_M, PAUSE_SPEED_KMH, PAUSE_MIN_DURATION_S, OUTLIER_SPEED_KMH` als Eigenschaften von `GpxApp.analysis`.
  - `removeOutliers(points) -> points`
  - `analyzeRun(points: {lat,lon,time}[]) -> Analysis`, wirft `AppError('too-short')` bei < 2 Punkten oder Laufstrecke < 100 m.
  - `Analysis`:
    ```
    { distanceM, movingTimeS, avgPaceSPerKm,
      pauses: [{ lat, lon, durationS, atDistanceM }],
      totalPauseS,
      segments: [{ index, startM, endM, timeS, paceSPerKm, partial, coords: [[lat,lon], ...] }],
      boundaryTimesS: number[],        // kumulierte Laufzeit an jeder Abschnittsgrenze; [0]=0, Länge = segments.length+1
      fastestIndex, slowestIndex,      // nur nicht-partial; null wenn keiner
      fastestPace, slowestPace }       // s/km, aus nicht-partial Abschnitten
    ```

**Algorithmus (verbindlich):**
1. `removeOutliers`: erster Punkt wird akzeptiert; jeder weitere wird verworfen, wenn `haversine(letzterAkzeptierter, p) / Δt * 3.6 > OUTLIER_SPEED_KMH` (Δt in s, Δt = 0 → verwerfen).
2. Für jedes Paar (i, i+1): Geschwindigkeit in km/h. Maximale Folgen von Paaren mit Geschwindigkeit `< PAUSE_SPEED_KMH` bilden Langsam-Phasen; Summe ihrer Δt `>= PAUSE_MIN_DURATION_S` → Pause. Paare in Pausen zählen weder Zeit noch Distanz. Pause-Position = Startpunkt des ersten Paares der Phase; `atDistanceM` = bisherige Laufstrecke.
3. Über die übrigen (Lauf-)Paare Distanz und Zeit aufsummieren; jedes Mal, wenn die kumulierte Strecke ein Vielfaches von 100 m überschreitet, Grenzpunkt per `lerpPoint` mit Anteil innerhalb des Paares setzen (ein Paar kann mehrere Grenzen enthalten). Abschnitts-`coords` enthalten Grenzpunkte und alle Punkte dazwischen; ein Abschnitt, der eine Pause enthält, verbindet die Punkte vor und nach der Pause direkt.
4. Rest nach der letzten vollen Grenze (> 0 m) wird letzter Abschnitt mit `partial = (endM - startM) < 100`.

- [ ] **Step 1: Failing tests**
  - `straightRun({distanceM:1000, paceSPerKm:300})` → `segments.length === 10`, alle `paceSPerKm` ≈ 300 (±0.5), keine `partial`, `distanceM` ≈ 1000 (±1), `movingTimeS` ≈ 300, `pauses.length === 0`, `boundaryTimesS[10]` ≈ 300.
  - Pause 30 s bei 500 m → `pauses.length === 1`, `pauses[0].durationS === 30`, `atDistanceM` ≈ 500 (±10), `movingTimeS` ≈ 300, Abschnitt 5 Tempo ≈ 300.
  - Stillstand 5 s bei 500 m → keine Pause, `movingTimeS` ≈ 305.
  - Review Focus 2: Pause 20 s bei `atM: 0` → als Pause erkannt, Abschnitt 0 Tempo ≈ 300.
  - Interpolation: `stepM: 30`, `distanceM: 300`, Tempo 300 → Grenze bei 100 m liegt zwischen Punkt 3 (90 m) und 4 (120 m); `segments[0].coords` letzter Eintrag hat Breite ≈ `48 + 100/111194.93` (±1e-7), `boundaryTimesS[1]` ≈ 30.
  - `distanceM: 1023` → 11 Abschnitte, letzter `partial === true`, `segmentLabel`-taugliche `startM 1000`, `endM` ≈ 1023; Tempo des letzten ≈ 300.
  - Gemischtes Tempo (erste 500 m bei 330, zweite bei 270, gebaut aus zwei `straightRun`-Teilen mit fortlaufender Zeit) → `fastestPace` ≈ 270, `slowestPace` ≈ 330, `fastestIndex >= 5`, `slowestIndex < 5`.
  - Ausreißer: ein Punkt 1 km seitlich versetzt mitten im Lauf → `removeOutliers` entfernt genau ihn; `analyzeRun` liefert `distanceM` ≈ 1000.
  - `too-short`: 1 Punkt; 80 m Lauf.
  - Review Focus 3: `straightRun({distanceM:20000, paceSPerKm:300, stepM:1})` (20 001 Punkte) → `analyzeRun` dauert < 300 ms, 200 Abschnitte.

- [ ] **Step 2:** Run `npm test` → FAIL
- [ ] **Step 3:** `js/core/analysis.js` gemäß Algorithmus implementieren.
- [ ] **Step 4:** Run `npm test` → PASS
- [ ] **Step 5: Commit** – `"Analyse: Pausen, 100-m-Abschnitte, Kennzahlen"`

---

### Task 4: Farbskala und Vergleich

**Files:**
- Create: `js/core/color-scale.js`, `js/core/compare.js`
- Test: `tests/core/color-scale.test.js`, `tests/core/compare.test.js`

**Interfaces:**
- Consumes: `Analysis` aus Task 3
- Produces:
  - `GpxApp.colorScale.colorForPace(paceSPerKm, fastestPace, slowestPace) -> '#rrggbb'` – `slowestPace → '#1e3a8a'`, `fastestPace → '#ff4d4d'`, Werte außerhalb werden geklemmt, `fastestPace === slowestPace → '#8f4470'` (Mittelwert, gerundet).
  - `GpxApp.colorScale.SLOW_COLOR`, `FAST_COLOR`, `SERIES_COLORS: string[]` (8 gut unterscheidbare Farben, keine reinen Blau-/Rottöne der Skala) und `seriesColor(i) -> string` (zyklisch).
  - `GpxApp.compare.alignSegments(runs: {id, analysis}[]) -> { rows: [{ index, startM, endM, paces: { [id]: number|null }, fastestId: string|null }] }` – Zeilenzahl = längster Lauf; `fastestId` nur aus nicht-`partial` Werten, bei < 2 Werten `null`.
  - `GpxApp.compare.timeGaps(reference: Analysis, other: Analysis) -> [{ boundary: number, distanceM: number, gapS: number }]` – für `k = 1 … min(len)-1` der `boundaryTimesS`; `gapS = other.boundaryTimesS[k] - reference.boundaryTimesS[k]`; `distanceM = reference.segments[k-1].endM`.
  - `GpxApp.compare.development(runs: {id, date, analysis}[]) -> [{ id, date, avgPaceSPerKm, movingTimeS }]` nach `date` aufsteigend.
  - `GpxApp.compare.defaultReferenceId(runs: {id, analysis}[]) -> string|null` – kleinste `movingTimeS`.

- [ ] **Step 1: Failing tests** – alle Beispielwerte oben; `colorForPace(315, 300, 330)` liegt zwischen den Endfarben (jeder Kanal zwischen den Kanalwerten); Vergleich zweier synthetischer Läufe 1000 m @300 und 900 m @330: `rows.length === 10`, Zeile 9 `paces` des kürzeren `null`, `fastestId` überall der schnellere; `timeGaps(schnell, langsam)` liefert 9 Einträge, `gapS` bei k=5 ≈ 15; `development` sortiert; `defaultReferenceId` liefert den schnelleren.
- [ ] **Step 2:** Run `npm test` → FAIL
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Run `npm test` → PASS
- [ ] **Step 5: Commit** – `"Farbskala und Vergleichsberechnung"`

---

### Task 5: Zustand und Sicherungsformat

**Files:**
- Create: `js/core/state.js`, `js/core/backup.js`
- Test: `tests/core/state.test.js`, `tests/core/backup.test.js`

**Interfaces:**
- Produces:
  - `RawRun = { id: string, name: string, fileName: string, date: number, importedAt: number, lat: number[], lon: number[], time: number[] }`
  - `GpxApp.backup.toRawRun(parsed: {name, points}, fileName: string, now: number) -> RawRun` – `id` = `'run-' + date + '-' + points.length`, `date = points[0].time`.
  - `GpxApp.backup.rawToPoints(raw: RawRun) -> {lat,lon,time}[]`
  - `GpxApp.backup.isDuplicate(raw: RawRun, existing: RawRun[]) -> boolean` – gleiche `date` und gleiche `time.length`.
  - `GpxApp.backup.exportJson(runs: RawRun[], now: number) -> string` (Format siehe Global Constraints, `exportedAt` ISO-String)
  - `GpxApp.backup.exportFileName(now: number) -> string` → `lauf-sicherung-2026-11-11.json`
  - `GpxApp.backup.parseImport(text: string) -> RawRun[]` – wirft `AppError('invalid-backup')` bei ungültigem JSON, `app` ≠ `"gpx-lauf-analyse"`, `version` ≠ `1` oder Läufen ohne gleich lange `lat/lon/time`-Arrays.
  - `GpxApp.state.createState(initial) -> { get(): State, set(partial): void, subscribe(fn: (state, changedKeys: string[]) => void): () => void }`
  - `State = { view: 'single'|'compare', runs: { [id]: { raw: RawRun, analysis: Analysis } }, currentRunId, compareRunIds: string[], referenceRunId, compareTab: 'lines'|'gaps'|'table'|'development', selectedSegment: number|null, storageAvailable: boolean }`
  - Invarianten, die `set` nach jedem Aufruf erzwingt (Review Focus 4):
    - `currentRunId` existiert in `runs`, sonst neuester Lauf (größtes `date`) oder `null`.
    - `compareRunIds` enthält nur existierende IDs.
    - `referenceRunId` ist in `compareRunIds`, sonst `defaultReferenceId` der Vergleichsläufe.
    - Ändert sich `currentRunId` oder `view`, wird `selectedSegment` auf `null` gesetzt (sofern nicht im selben `set` explizit gesetzt).
    - `selectedSegment` größer als die maximale Abschnittszahl der relevanten Läufe → `null`.

- [ ] **Step 1: Failing tests** – Rundlauf `exportJson` → `parseImport` liefert identische Läufe; jeder `invalid-backup`-Fall; `isDuplicate`; `exportFileName(Date.UTC(2026,10,11,12))`; `subscribe` erhält `changedKeys`, Abmelden wirkt; jede Invariante oben einzeln (u. a. Lauf aus `runs` entfernen, der `currentRunId`, Referenz und in `compareRunIds` ist).
- [ ] **Step 2:** Run `npm test` → FAIL
- [ ] **Step 3:** Implementieren (`state.js` benötigt `GpxApp.compare.defaultReferenceId`).
- [ ] **Step 4:** Run `npm test` → PASS
- [ ] **Step 5: Commit** – `"Zentraler Zustand und Sicherungsformat"`

---

### Task 6: App-Gerüst – Laden, Speichern, Seitenleiste, Hinweise

**Files:**
- Create: `index.html`, `css/style.css`, `js/storage.js`, `js/ui/toast.js`, `js/ui/run-list.js`, `js/app.js`
- Test: `tests/e2e/helpers.js`, `tests/e2e/app-shell.test.js`

**Interfaces:**
- Consumes: alle `GpxApp`-Module aus Task 1–5
- Produces:
  - `GpxApp.storage.open() -> Promise<{ available: boolean, list(): Promise<RawRun[]>, put(run): Promise<void>, remove(id): Promise<void> }>` – IndexedDB `gpx-lauf-analyse`, Store `runs`, keyPath `id`; schlägt `indexedDB.open` fehl oder fehlt `indexedDB` → Arbeitsspeicher-Implementierung mit `available: false`.
  - `GpxApp.toast.show(message: string, kind: 'info'|'error' = 'info')` – Container `#toasts`, Eintrag `.toast`, verschwindet nach 6 s.
  - `GpxApp.runList.mount(el, state)`
  - `GpxApp.app.importFiles(files: File[]) -> Promise<void>` – je Datei lesen, parsen (`DOMParser`), `toRawRun`, Duplikatprüfung gegen gespeicherte Läufe **und** bereits in diesem Aufruf importierte, `analyzeRun`, speichern; danach `currentRunId` = zuletzt importierter Lauf.
  - DOM-IDs/Klassen, die spätere Tasks und Tests nutzen: `#btn-view-single`, `#btn-view-compare`, `#file-input` (`type=file multiple accept=".gpx"`), `#btn-export`, `#btn-import`, `#import-input`, `#run-list` mit `li[data-run-id]` (enthält `.run-select`, `input.run-compare[type=checkbox]`, `.run-delete`), `#view-single`, `#view-compare`, `#empty-state`, `#storage-banner`, `#toasts`.
  - Hinweistexte (exakt):
    - `invalid-gpx` → `„{Datei}“ konnte nicht gelesen werden.`
    - `no-time` → `„{Datei}“ enthält keine Zeitangaben – Tempo nicht berechenbar.`
    - `too-short` → `„{Datei}“ ist zu kurz.`
    - `duplicate` → `„{Datei}“ ist bereits gespeichert.`
    - Banner: `Speichern im Browser ist hier nicht möglich. Läufe bleiben nur bis zum Schließen erhalten – bitte über „Export“ sichern.`
    - Leerer Zustand: `Noch keine Läufe. GPX-Dateien über „+ GPX laden“ auswählen oder hierher ziehen.`

`index.html` bindet in dieser Reihenfolge ein: `vendor/leaflet/leaflet.js`, `vendor/chart.js/chart.umd.js`, `js/core/errors.js`, `format.js`, `geo.js`, `gpx-parser.js`, `analysis.js`, `color-scale.js`, `compare.js`, `backup.js`, `state.js`, `js/storage.js`, `js/ui/*.js`, `js/app.js`. Layout gemäß Spec 2 (Kopfleiste, Seitenleiste, Inhaltsbereich; < 900 px gestapelt). Drag & Drop: `dragover`/`drop` auf `document`, nur Dateien mit Endung `.gpx` werden an `importFiles` übergeben. Löschen fragt mit `confirm('Lauf „{Name}“ löschen?')`. Läufe in der Liste nach `date` absteigend, Text `"{Datum} · {Distanz}"`, Titel-Attribut = Name. Neu importierte Läufe werden automatisch in `compareRunIds` aufgenommen.

- [ ] **Step 1: E2E-Helfer** `tests/e2e/helpers.js`: `launch()` startet Chromium (`require('playwright').chromium`), neuer Kontext, leitet `**/tile.openstreetmap.org/**` auf eine 1×1-PNG um, öffnet `file://<repo>/index.html`; `writeGpx(dir, name, gpxText) -> path` schreibt in ein `fs.mkdtempSync`-Verzeichnis; nutzt `buildGpx`/`straightRun`.

- [ ] **Step 2: Failing tests** `tests/e2e/app-shell.test.js`:
  - Leerer Start: `#empty-state` sichtbar mit obigem Text.
  - Review Focus 5: `setInputFiles` mit vier Dateien – `a.gpx` (1 km @300), `b.gpx` (1 km @330, anderes Datum), `kaputt.gpx` (`'<gpx'`), Duplikat von `a.gpx` unter `a-kopie.gpx` → `#run-list li` zählt 2; Toasts mit den exakten Texten für `kaputt.gpx` und `a-kopie.gpx` vorhanden.
  - Neuladen der Seite (`page.reload()`) → weiterhin 2 Läufe.
  - Löschen des angezeigten Laufs (Dialog akzeptieren) → 1 Lauf, kein Fehler in der Konsole (`page.on('pageerror')` sammelt nichts).

- [ ] **Step 3:** Run `npm run test:e2e` → FAIL
- [ ] **Step 4:** Implementieren.
- [ ] **Step 5:** Run `npm run test:e2e` und `npm test` → PASS
- [ ] **Step 6: Commit** – `"App-Gerüst: Laden, Speichern, Seitenleiste"`

---

### Task 7: Einzelansicht – Kennzahlen, Karte, Balken, Tabelle, verknüpfte Auswahl

**Files:**
- Create: `js/ui/summary.js`, `js/ui/map-view.js`, `js/ui/segment-chart.js`, `js/ui/segment-table.js`
- Modify: `index.html` (Container), `css/style.css`, `js/app.js` (mount)
- Test: `tests/e2e/single-view.test.js`

**Interfaces:**
- Consumes: `State`, `Analysis`, `colorForPace`, `format.*`
- Produces: je Modul `mount(el, state)`; jede Ansicht abonniert den Zustand und rendert bei Änderung von `currentRunId`/`runs` neu, bei `selectedSegment` nur die Hervorhebung. Klick auf einen Abschnitt: `state.set({ selectedSegment: i === aktuell ? null : i })`.
  - **summary** (`#summary`): Distanz, `Laufzeit`, `Ø Tempo` (`5:19 /km`), `Schnellster 100 m` und `Langsamster 100 m` jeweils mit Tempo und Abschnittsbezeichnung, `Pausen` (Anzahl und Gesamtdauer). Legende `#legend`: CSS-Verlauf `linear-gradient(to right, #1e3a8a, #ff4d4d)` mit `slowestPace` links und `fastestPace` rechts beschriftet.
  - **map-view** (`#map`): Leaflet-Karte, OSM-Kachelebene mit Attribution `© OpenStreetMap-Mitwirkende`; je Abschnitt eine `L.polyline(coords, { color, weight: 5, className: 'seg seg-' + index })`; ausgewählter Abschnitt: Klasse `is-selected` auf `layer.getElement()`, `weight: 9`, `bringToFront()`, `map.panTo` auf Abschnittsmitte; Pausen als `L.circleMarker` mit Klasse `pause-marker` und Tooltip `Pause {formatDuration}`; beim Laufwechsel `fitBounds`. Offline-Rückfall: beim ersten `tileerror` Kachelebene entfernen, Karte erhält Klasse `map-offline` (neutraler Hintergrund), Element `#map-offline-note` mit Text `Offline – Karte ohne Hintergrund` wird sichtbar.
  - **segment-chart** (`#segment-chart` canvas): Chart.js `bar`, Labels = `segmentLabel`, Werte = Geschwindigkeit km/h (`3600 / paceSPerKm`), `backgroundColor` je Balken aus `colorForPace`; Tooltip zeigt `{Tempo} /km`; y-Achse Titel `km/h`; ausgewählter Balken `borderWidth[i] = 3`, `borderColor[i] = '#111'`, sonst `0`; `onClick` → Auswahl über `getElementsAtEventForMode(evt,'index',{intersect:false})`.
  - **segment-table** (`#segment-table`): Spalten `Abschnitt`, `Zeit`, `Tempo /km`; `tr[data-index]`, linke Randfarbe = Abschnittsfarbe; ausgewählte Zeile Klasse `is-selected` und `scrollIntoView({block:'nearest'})`; `partial`-Zeile mit Zusatz `(Rest)`.

- [ ] **Step 1: Failing tests** `tests/e2e/single-view.test.js` mit einem 1 km-Lauf (erste 500 m @330, zweite @270, Pause 30 s bei 300 m):
  - `#segment-table tr[data-index]` zählt 10; erste Zeile Text enthält `0–100 m` und `5:30`.
  - `#summary` enthält `1,00 km`, `Pausen` und `1`.
  - `#map path.seg` zählt 10; `#map .pause-marker` zählt 1.
  - Farbe: `#map path.seg-0` `stroke` = `#1e3a8a`, `path.seg-9` `stroke` = `#ff4d4d`; Hintergrund Balken 0 (`Chart.getChart(canvas).data.datasets[0].backgroundColor[0]`) = `#1e3a8a`.
  - Klick auf Balken 3 (Koordinaten aus `Chart.getChart(canvas).getDatasetMeta(0).data[3]`) → `tr[data-index="3"]` hat `is-selected`, `path.seg-3` hat `is-selected`, `borderWidth[3] === 3`.
  - Klick auf `path.seg-6` → Tabellenzeile 6 markiert; Klick auf `tr[data-index="6"]` → Markierung überall aufgehoben.
  - Offline: Kontext ohne Kachel-Umleitung, stattdessen `route.abort()` → `#map-offline-note` sichtbar, `#map path.seg` zählt weiterhin 10.
- [ ] **Step 2:** Run `npm run test:e2e` → FAIL
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Run `npm run test:e2e` und `npm test` → PASS
- [ ] **Step 5: Commit** – `"Einzelansicht mit verknüpfter Karte, Balken und Tabelle"`

---

### Task 8: Vergleichsansicht mit vier Tabs

**Files:**
- Create: `js/ui/compare-view.js`
- Modify: `index.html`, `css/style.css`, `js/app.js`
- Test: `tests/e2e/compare-view.test.js`

**Interfaces:**
- Consumes: `State`, `alignSegments`, `timeGaps`, `development`, `seriesColor`, `format.*`
- Produces: `GpxApp.compareView.mount(el, state)`. DOM: Tab-Schaltflächen `button[data-tab="lines"|"gaps"|"table"|"development"]` (aktive mit `aria-selected="true"`), Panels `#compare-lines` (canvas), `#compare-gaps` (Auswahl `#reference-select` + canvas), `#compare-table` (table), `#compare-development` (Umschalter `#dev-metric` mit `pace`/`time` + canvas), Hinweis `#compare-hint`.
  - Läufe in Reihenfolge von `compareRunIds` nach `date`; Lauf `i` erhält `seriesColor(i)`; Legenden-Text `"{Datum} · {Name}"`.
  - **lines:** Chart.js `line`, x = Abschnittslabel, y = Tempo s/km mit Tick-Format `formatPace`, y-Achse umgekehrt (`reverse: true`, schneller = oben), fehlende Werte `null` (`spanGaps: false`).
  - **gaps:** `line`, x = `segmentLabel`-Ende der Grenze, y = `gapS` mit `formatGap`-Ticks, y-Achse **nicht** umgekehrt, Referenzlauf als waagrechte Nulllinie; `#reference-select` listet Vergleichsläufe, Änderung → `state.set({referenceRunId})`.
  - **table:** Zeilen `tr[data-index]`, Spalten je Lauf, Zellen `formatPace` oder `–`; Zelle des `fastestId` Klasse `is-fastest`.
  - **development:** `line` mit Punkten, x = `type: 'linear'` über `date` (Ticks via `formatDate`), y = Ø Tempo (umgekehrt) bzw. Laufzeit (`formatDuration`).
  - Verknüpfte Auswahl: Klick auf Punkt (lines/gaps) bzw. Zeile (table) setzt `selectedSegment`; Markierung: in Linien-Diagrammen vergrößerte Punkte (`pointRadius[i] = 6`, sonst 2) am Index, in der Tabelle `is-selected`.
  - Hinweis `#compare-hint` = `Mindestens zwei Läufe zum Vergleich anhaken.` wenn < 2 Läufe; dann sind lines/gaps/table ausgeblendet, development bleibt bei ≥ 1 Lauf nutzbar.
  - Häkchen in `#run-list` steuern `compareRunIds`.

- [ ] **Step 1: Failing tests** mit drei Läufen (1 km @300, 1 km @315, 0,9 km @330, verschiedene Daten):
  - `#btn-view-compare` → Tab `lines` aktiv; `Chart.getChart('#compare-lines canvas').data.datasets.length === 3`.
  - Tab `table`: 10 Zeilen, letzte Zeile hat für den 0,9-km-Lauf `–`; jede Zeile hat genau eine `.is-fastest`-Zelle in der Spalte des @300-Laufs.
  - Tab `gaps`: Standard-Referenz = @300-Lauf (`#reference-select` Wert); Datensatz des @315-Laufs hat bei Grenze 5 den Wert ≈ 7,5 (±0,5); Referenz auf @315 wechseln → Werte ändern sich.
  - Tab `development`: 3 Punkte, aufsteigend nach Datum.
  - Klick auf Tabellenzeile 4 → Wechsel zu `lines` zeigt `pointRadius[4] === 6`.
  - Zwei Häkchen entfernen → `#compare-hint` sichtbar.
- [ ] **Step 2:** Run `npm run test:e2e` → FAIL
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Run `npm run test:e2e` und `npm test` → PASS
- [ ] **Step 5: Commit** – `"Vergleichsansicht mit vier Tabs"`

---

### Task 9: Export/Import, Speicher-Rückfall und README

**Files:**
- Modify: `js/app.js`, `index.html`
- Create: `README.md`
- Test: `tests/e2e/backup.test.js`

**Interfaces:**
- Consumes: `exportJson`, `exportFileName`, `parseImport`, `isDuplicate`, `storage`, `toast`
- Produces:
  - `#btn-export`: Blob-Download über temporären `<a download>`; bei 0 Läufen Hinweis `Keine Läufe zum Exportieren.`
  - `#btn-import` öffnet `#import-input` (`accept=".json"`); importiert nicht vorhandene Läufe, Hinweis `{n} Läufe importiert, {m} bereits vorhanden.`; bei `invalid-backup`: `Die Sicherungsdatei ist ungültig. Es wurde nichts geändert.`
  - `#storage-banner` sichtbar genau dann, wenn `storage.available === false`.
  - `README.md` (deutsch): Start (ZIP-Download bzw. `git clone`, Doppelklick auf `index.html`, empfohlene Browser, Hinweis zum festen Ordnerort und Export), Bedienung in Stichpunkten, Entwicklung (`npm install`, `npm test`, `npm run test:e2e`, `npm run vendor`).

- [ ] **Step 1: Failing tests:**
  - Zwei Läufe laden → Export-Download; Dateiname `lauf-sicherung-JJJJ-MM-TT.json` (heutiges Datum); Inhalt `app === 'gpx-lauf-analyse'`, 2 Läufe.
  - Neuer Browser-Kontext (leerer Speicher) → Import dieser Datei → 2 Läufe, Hinweis `2 Läufe importiert, 0 bereits vorhanden.`; erneuter Import → `0 Läufe importiert, 2 bereits vorhanden.`
  - Import von `{"foo":1}` → exakter Fehlertext, Laufanzahl unverändert.
  - Speicher-Rückfall: `context.addInitScript(() => { delete window.indexedDB; })` → `#storage-banner` sichtbar mit exaktem Text, GPX laden funktioniert.
- [ ] **Step 2:** Run `npm run test:e2e` → FAIL
- [ ] **Step 3:** Implementieren, README schreiben.
- [ ] **Step 4:** Run `npm test && npm run test:e2e` → alle PASS
- [ ] **Step 5: Manuelle Sichtprüfung:** Screenshot von Einzel- und Vergleichsansicht (Desktop 1400×900 und Mobil 390×844) per Playwright erzeugen und ansehen: keine überlappenden Elemente, Legende lesbar.
- [ ] **Step 6: Commit** – `"Export/Import, Speicher-Rückfall und README"`
