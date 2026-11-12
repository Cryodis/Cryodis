const test = require('node:test');
const assert = require('node:assert/strict');
const { launch, closeAll, writeRun, loadFiles } = require('./helpers.js');

test.after(closeAll);

async function openCompare() {
  const ctx = await launch();
  await loadFiles(ctx.page, [
    writeRun('r300.gpx', { distanceM: 1000, paceSPerKm: 300, dayOffset: 0 }),
    writeRun('r315.gpx', { distanceM: 1000, paceSPerKm: 315, dayOffset: 1 }),
    writeRun('r330.gpx', { distanceM: 900, paceSPerKm: 330, dayOffset: 2 }),
  ]);
  await ctx.page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 3);
  await ctx.page.click('#btn-view-compare');
  await ctx.page.waitForSelector('#view-compare:not([hidden])');
  return ctx;
}

/** Wertet fn(chart) im Browser für das Chart im Canvas sel aus. */
function chartOf(page, sel, fn) {
  return page.evaluate(
    ({ s, src }) => {
      const chart = Chart.getChart(document.querySelector(s));
      return (0, eval)('(' + src + ')')(chart);
    },
    { s: sel, src: fn.toString() }
  );
}

test('Tempo-Linien: ein Datensatz je Lauf', async () => {
  const { page, context, errors } = await openCompare();
  assert.equal(await page.getAttribute('button[data-tab="lines"]', 'aria-selected'), 'true');
  assert.equal(await chartOf(page, '#compare-lines canvas', (c) => c.data.datasets.length), 3);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Vergleichstabelle: fehlende Werte und schnellster Wert', async () => {
  const { page, context } = await openCompare();
  await page.click('button[data-tab="table"]');
  const rows = await page.$$eval('#compare-table tbody tr', (trs) =>
    trs.map((tr) => {
      const tds = [...tr.querySelectorAll('td')];
      return { cells: tds.map((td) => td.textContent.trim()), fastest: tds.map((td) => td.classList.contains('is-fastest')) };
    })
  );
  assert.equal(rows.length, 10);
  const headers = await page.$$eval('#compare-table thead th', (ths) => ths.map((t) => t.textContent));
  const col300 = headers.findIndex((h) => h.includes('r300'));
  const col330 = headers.findIndex((h) => h.includes('r330'));
  assert.ok(col300 > 0 && col330 > 0);
  assert.equal(rows[9].cells[col330], '–');
  for (const r of rows) {
    assert.equal(r.fastest.filter(Boolean).length, 1);
    assert.equal(r.fastest[col300], true);
  }
  await context.close();
});

test('Vorsprung/Rückstand mit wählbarer Referenz', async () => {
  const { page, context } = await openCompare();
  await page.click('button[data-tab="gaps"]');
  const ref = await page.$eval('#reference-select', (s) => s.options[s.selectedIndex].textContent);
  assert.match(ref, /r300/);
  const gap = await chartOf(page, '#compare-gaps canvas', (c) => c.data.datasets.find((d) => d.label.includes('r315')).data[4]);
  assert.ok(Math.abs(gap - 7.5) < 0.5, String(gap));
  const optionValue = await page.$eval('#reference-select', (s) => [...s.options].find((o) => o.textContent.includes('r315')).value);
  await page.selectOption('#reference-select', optionValue);
  const gap300 = await chartOf(page, '#compare-gaps canvas', (c) => c.data.datasets.find((d) => d.label.includes('r300')).data[4]);
  assert.ok(Math.abs(gap300 + 7.5) < 0.5, String(gap300));
  await context.close();
});

test('Entwicklung: Punkte nach Datum', async () => {
  const { page, context } = await openCompare();
  await page.click('button[data-tab="development"]');
  const xs = await chartOf(page, '#compare-development canvas', (c) => c.data.datasets[0].data.map((p) => p.x));
  assert.equal(xs.length, 3);
  assert.deepEqual([...xs].sort((a, b) => a - b), xs);
  await page.selectOption('#dev-metric', 'time');
  const ys = await chartOf(page, '#compare-development canvas', (c) => c.data.datasets[0].data.map((p) => p.y));
  assert.ok(Math.abs(ys[0] - 300) < 1, String(ys));
  await context.close();
});

test('Auswahl wirkt über Tabs hinweg; Hinweis bei weniger als zwei Läufen', async () => {
  const { page, context, errors } = await openCompare();
  await page.click('button[data-tab="table"]');
  await page.click('#compare-table tbody tr[data-index="4"]');
  await page.waitForSelector('#compare-table tr[data-index="4"].is-selected');
  await page.click('button[data-tab="lines"]');
  const radius = await chartOf(page, '#compare-lines canvas', (c) => c.data.datasets[0].pointRadius[4]);
  assert.equal(radius, 6);

  const boxes = await page.$$('#run-list .run-compare');
  await boxes[0].uncheck();
  await boxes[1].uncheck();
  await page.waitForSelector('#compare-hint', { state: 'visible' });
  assert.equal(await page.textContent('#compare-hint'), 'Mindestens zwei Läufe zum Vergleich anhaken.');
  assert.deepEqual(errors, []);
  await context.close();
});
