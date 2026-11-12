const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { launch, closeAll, writeFile, writeRun, loadFiles } = require('./helpers.js');

test.after(closeAll);

const toastTexts = (page) => page.$$eval('#toasts .toast', (els) => els.map((e) => e.textContent.trim()));
const runCount = (page) => page.$$eval('#run-list li', (l) => l.length);

async function waitToast(page, text) {
  await page.waitForFunction((t) => [...document.querySelectorAll('#toasts .toast')].some((e) => e.textContent.trim() === t), text);
}

test('Export, Import in leeren Browser, erneuter Import, ungültige Datei', async () => {
  const first = await launch();
  await loadFiles(first.page, [writeRun('x1.gpx', { dayOffset: 0 }), writeRun('x2.gpx', { dayOffset: 1, paceSPerKm: 320 })]);
  await first.page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 2);

  const [download] = await Promise.all([first.page.waitForEvent('download'), first.page.click('#btn-export')]);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(download.suggestedFilename(), 'lauf-sicherung-' + today + '.json');
  const backupPath = await download.path();
  const content = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  assert.equal(content.app, 'gpx-lauf-analyse');
  assert.equal(content.runs.length, 2);
  const saved = writeFile('sicherung.json', fs.readFileSync(backupPath, 'utf8'));
  await first.context.close();

  const second = await launch();
  const { page, errors } = second;
  assert.equal(await runCount(page), 0);
  await page.setInputFiles('#import-input', saved);
  await waitToast(page, '2 Läufe importiert, 0 bereits vorhanden.');
  assert.equal(await runCount(page), 2);

  await page.setInputFiles('#import-input', saved);
  await waitToast(page, '0 Läufe importiert, 2 bereits vorhanden.');
  assert.equal(await runCount(page), 2);

  await page.setInputFiles('#import-input', writeFile('kaputt.json', '{"foo":1}'));
  await waitToast(page, 'Die Sicherungsdatei ist ungültig. Es wurde nichts geändert.');
  assert.equal(await runCount(page), 2);

  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 2);
  assert.deepEqual(errors, []);
  await second.context.close();
});

test('Export ohne Läufe meldet Hinweis', async () => {
  const { page, context } = await launch();
  await page.click('#btn-export');
  await waitToast(page, 'Keine Läufe zum Exportieren.');
  assert.ok((await toastTexts(page)).includes('Keine Läufe zum Exportieren.'));
  await context.close();
});

test('ohne IndexedDB: Banner und Arbeitsspeicher-Modus', async () => {
  const { page, context, errors } = await launch({ initScript: () => { delete window.indexedDB; } });
  await page.waitForSelector('#storage-banner', { state: 'visible' });
  assert.equal(
    (await page.textContent('#storage-banner')).trim(),
    'Speichern im Browser ist hier nicht möglich. Läufe bleiben nur bis zum Schließen erhalten – bitte über „Export“ sichern.'
  );
  await loadFiles(page, [writeRun('mem.gpx')]);
  await page.waitForFunction(() => document.querySelectorAll('#run-list li').length === 1);
  assert.deepEqual(errors, []);
  await context.close();
});
