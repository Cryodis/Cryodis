const test = require('node:test');
const assert = require('node:assert/strict');
const { launch, closeAll, writeRun, loadFiles } = require('./helpers.js');

test.after(closeAll);

const RUN = {
  parts: [
    { distanceM: 500, paceSPerKm: 330, pauses: [{ atM: 300, durationS: 30 }] },
    { distanceM: 500, paceSPerKm: 270 },
  ],
};

async function openWithRun(opts) {
  const ctx = await launch(opts);
  await loadFiles(ctx.page, [writeRun('gemischt.gpx', RUN)]);
  await ctx.page.waitForSelector('#segment-table tr[data-index="9"]');
  return ctx;
}

const isSelected = (page, sel) => page.$eval(sel, (el) => el.classList.contains('is-selected'));

async function clickBar(page, index) {
  const pos = await page.evaluate((i) => {
    const canvas = document.getElementById('segment-chart');
    const bar = Chart.getChart(canvas).getDatasetMeta(0).data[i];
    const r = canvas.getBoundingClientRect();
    return { x: r.left + bar.x, y: r.top + (bar.y + bar.base) / 2 };
  }, index);
  await page.mouse.click(pos.x, pos.y);
}

test('Tabelle, Kennzahlen, Karte und Farben', async () => {
  const { page, context, errors } = await openWithRun();
  assert.equal(await page.$$eval('#segment-table tr[data-index]', (r) => r.length), 10);
  const first = await page.textContent('#segment-table tr[data-index="0"]');
  assert.match(first, /0–100 m/);
  assert.match(first, /5:30/);

  const summary = await page.textContent('#summary');
  assert.match(summary, /1,00 km/);
  assert.match(summary, /Pausen\s*1/);

  assert.equal(await page.$$eval('#map path.seg', (p) => p.length), 10);
  assert.equal(await page.$$eval('#map .pause-marker', (p) => p.length), 1);
  assert.equal(await page.getAttribute('#map path.seg-0', 'stroke'), '#1e3a8a');
  assert.equal(await page.getAttribute('#map path.seg-9', 'stroke'), '#ff4d4d');
  const bg0 = await page.evaluate(() => Chart.getChart(document.getElementById('segment-chart')).data.datasets[0].backgroundColor[0]);
  assert.equal(bg0, '#1e3a8a');
  assert.ok(await page.isVisible('#legend'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('verknüpfte Auswahl über Balken, Karte und Tabelle', async () => {
  const { page, context, errors } = await openWithRun();
  await clickBar(page, 3);
  await page.waitForSelector('#segment-table tr[data-index="3"].is-selected');
  assert.ok(await isSelected(page, '#map path.seg-3'));
  const bw = await page.evaluate(() => Chart.getChart(document.getElementById('segment-chart')).data.datasets[0].borderWidth[3]);
  assert.equal(bw, 3);

  await page.click('#map path.seg-6', { force: true });
  await page.waitForSelector('#segment-table tr[data-index="6"].is-selected');
  assert.ok(!(await isSelected(page, '#map path.seg-3')));

  await page.click('#segment-table tr[data-index="6"]');
  await page.waitForFunction(() => !document.querySelector('.is-selected'));
  const bw6 = await page.evaluate(() => Chart.getChart(document.getElementById('segment-chart')).data.datasets[0].borderWidth[6]);
  assert.equal(bw6, 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('offline: Karte ohne Hintergrund, Strecke bleibt', async () => {
  const { page, context } = await openWithRun({ tiles: 'offline' });
  await page.waitForSelector('#map-offline-note', { state: 'visible' });
  assert.equal(await page.textContent('#map-offline-note'), 'Offline – Karte ohne Hintergrund');
  assert.equal(await page.$$eval('#map path.seg', (p) => p.length), 10);
  await context.close();
});
