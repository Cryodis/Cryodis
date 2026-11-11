const test = require('node:test');
const assert = require('node:assert/strict');
const { launch, closeAll, writeFile, writeRun, loadFiles } = require('./helpers.js');
const fs = require('fs');

test.after(closeAll);

test('leerer Start zeigt Hinweis', async () => {
  const { page, context, errors } = await launch();
  const text = await page.textContent('#empty-state');
  assert.equal(text.trim(), 'Noch keine Läufe. GPX-Dateien über „+ GPX laden“ auswählen oder hierher ziehen.');
  assert.ok(await page.isVisible('#empty-state'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('mehrere Dateien: gültige laden, Fehler und Duplikate melden, Speichern, Löschen', async () => {
  const { page, context, errors } = await launch();
  const a = writeRun('a.gpx', { paceSPerKm: 300, dayOffset: 0 });
  const b = writeRun('b.gpx', { paceSPerKm: 330, dayOffset: 1 });
  const kaputt = writeFile('kaputt.gpx', '<gpx');
  const kopie = writeFile('a-kopie.gpx', fs.readFileSync(a, 'utf8'));
  await loadFiles(page, [a, b, kaputt, kopie]);

  await page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 2);
  const toasts = await page.$$eval('#toasts .toast', (els) => els.map((e) => e.textContent.trim()));
  assert.ok(toasts.includes('„kaputt.gpx“ konnte nicht gelesen werden.'), JSON.stringify(toasts));
  assert.ok(toasts.includes('„a-kopie.gpx“ ist bereits gespeichert.'), JSON.stringify(toasts));
  assert.ok(!(await page.isVisible('#empty-state')));

  // Neuester Lauf (b) steht oben und ist angezeigt
  const firstId = await page.getAttribute('#run-list li:first-child', 'data-run-id');
  assert.ok(firstId);

  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 2);

  page.on('dialog', (d) => d.accept());
  await page.click('#run-list li:first-child .run-delete');
  await page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 1);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 1);
  assert.deepEqual(errors, []);
  await context.close();
});
