// Gemeinsame Helfer für Playwright-Tests über file://
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { buildGpx, straightRun, DEFAULT_START } = require('../helpers/gpx-builder.js');

const INDEX_URL = 'file://' + path.join(__dirname, '..', '..', 'index.html');
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

let browser;
async function getBrowser() {
  if (!browser) browser = await chromium.launch();
  return browser;
}

/** Öffnet die App in einem neuen Kontext. tiles: 'ok' | 'offline' */
async function launch({ tiles = 'ok', initScript } = {}) {
  const b = await getBrowser();
  const context = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  await context.route(/tile\.openstreetmap\.org/, (route) =>
    tiles === 'ok' ? route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1x1 }) : route.abort()
  );
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto(INDEX_URL);
  return { context, page, errors };
}

async function closeAll() {
  if (browser) await browser.close();
  browser = null;
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpx-e2e-'));
function writeFile(name, text) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, text);
  return p;
}

/** Schreibt einen geraden Lauf als GPX-Datei. dayOffset verschiebt das Datum. */
function writeRun(name, { distanceM = 1000, paceSPerKm = 300, dayOffset = 0, pauses = [], parts } = {}) {
  const startTime = DEFAULT_START + dayOffset * 86400000;
  let points;
  if (parts) {
    points = [];
    let t = startTime;
    let lat = 48.0;
    for (const part of parts) {
      const p = straightRun({ ...part, startTime: t, startLat: lat });
      points = points.length ? points.concat(p.slice(1)) : p;
      t = p[p.length - 1].time;
      lat = p[p.length - 1].lat;
    }
  } else {
    points = straightRun({ distanceM, paceSPerKm, startTime, pauses });
  }
  return writeFile(name, buildGpx({ name: name.replace(/\.gpx$/, ''), points }));
}

async function loadFiles(page, paths) {
  await page.setInputFiles('#file-input', paths);
}

module.exports = { launch, closeAll, writeFile, writeRun, loadFiles, INDEX_URL };
