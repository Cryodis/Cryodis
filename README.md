# GPX Lauf-Analyse

Lokale Single-Page-Anwendung zur Auswertung deiner Läufe aus GPX-Dateien. Sie zeigt, wie sich dein Tempo entlang der Strecke verändert, und vergleicht mehrere Läufe derselben Strecke, um Trainingsfortschritte sichtbar zu machen.

Alles läuft im Browser auf deinem Rechner. Deine Daten verlassen den Rechner nicht; nur die Kartenbilder werden von OpenStreetMap geladen.

## Starten

1. Projekt herunterladen: auf GitHub **Code → Download ZIP** und entpacken – oder
   `git clone https://github.com/Cryodis/Cryodis.git`
2. Den Ordner an einen festen Ort legen (z. B. „Dokumente“). Gespeicherte Läufe gehören zum Speicherort des Ordners.
3. **`index.html` per Doppelklick öffnen.** Keine Installation, kein Server.

Empfohlene Browser: Chrome, Edge, Firefox. Safari kann bei lokal geöffneten Dateien das Speichern verweigern – die App zeigt dann einen Hinweis; sichere deine Läufe in dem Fall über **Export**.

## Bedienung

- **+ GPX laden** oder GPX-Dateien ins Fenster ziehen (mehrere auf einmal möglich). Doppelte Läufe werden erkannt.
- **Meine Läufe** (links): Klick zeigt den Lauf, Häkchen nimmt ihn in den Vergleich auf, × löscht ihn.
- **Einzelner Lauf**: Kennzahlen, Karte, Tabelle und Balkendiagramm in 100-m-Abschnitten.
  Farben: dunkelblau = langsam, hellrot = schnell. Ein Klick auf Abschnitt, Balken oder Tabellenzeile markiert ihn überall.
- **Vergleich**: Tabs *Tempo-Linien*, *Vorsprung/Rückstand* (Referenzlauf wählbar), *Tabelle* und *Entwicklung*.
- **Pausen** (unter 1 km/h für mindestens 10 s) werden herausgerechnet und als Punkt auf der Karte gezeigt.
- **Ohne Internet** wird die Strecke ohne Kartenhintergrund gezeichnet.
- **Export / Import**: alle Läufe als Sicherungsdatei `lauf-sicherung-JJJJ-MM-TT.json` speichern bzw. wieder einlesen.

## Entwicklung

Nur für Änderungen am Code nötig (Node.js 22):

```bash
npm install
```

```bash
npm test
```

```bash
npm run test:e2e
```

`npm run vendor` kopiert Leaflet und Chart.js aus `node_modules` nach `vendor/` (eingecheckt, damit die App ohne Installation läuft).

Aufbau: reine Rechenlogik in `js/core/` (auch in Node testbar), Anzeige in `js/ui/`, Start und Verdrahtung in `js/app.js`. Konzept und Plan liegen unter `docs/superpowers/`.
