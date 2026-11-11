const test = require('node:test');
const assert = require('node:assert/strict');
const b = require('../../js/core/backup.js');
const { straightRun } = require('../helpers/gpx-builder.js');

const NOW = Date.UTC(2026, 10, 11, 12);
const points = straightRun({ distanceM: 200, paceSPerKm: 300 });
const raw = b.toRawRun({ name: 'Morgenrunde', points }, 'morgen.gpx', NOW);

test('toRawRun speichert Rohpunkte kompakt', () => {
  assert.equal(raw.id, 'run-' + points[0].time + '-' + points.length);
  assert.equal(raw.name, 'Morgenrunde');
  assert.equal(raw.fileName, 'morgen.gpx');
  assert.equal(raw.date, points[0].time);
  assert.equal(raw.importedAt, NOW);
  assert.equal(raw.lat.length, points.length);
  assert.deepEqual(b.rawToPoints(raw), points);
});

test('isDuplicate: gleiche Startzeit und Punktzahl', () => {
  assert.equal(b.isDuplicate(raw, [raw]), true);
  assert.equal(b.isDuplicate(raw, []), false);
  assert.equal(b.isDuplicate(raw, [{ ...raw, time: raw.time.slice(1) }]), false);
  assert.equal(b.isDuplicate(raw, [{ ...raw, date: raw.date + 1 }]), false);
});

test('Export → Import ergibt identische Läufe', () => {
  const json = b.exportJson([raw], NOW);
  const obj = JSON.parse(json);
  assert.equal(obj.app, 'gpx-lauf-analyse');
  assert.equal(obj.version, 1);
  assert.equal(obj.exportedAt, new Date(NOW).toISOString());
  assert.deepEqual(b.parseImport(json), [raw]);
});

test('exportFileName', () => {
  assert.equal(b.exportFileName(NOW), 'lauf-sicherung-2026-11-11.json');
});

test('ungültige Sicherungen → invalid-backup', () => {
  const bad = (text) => assert.throws(() => b.parseImport(text), (e) => e.code === 'invalid-backup');
  bad('kein json');
  bad('{"foo":1}');
  bad(JSON.stringify({ app: 'anders', version: 1, runs: [] }));
  bad(JSON.stringify({ app: 'gpx-lauf-analyse', version: 2, runs: [] }));
  bad(JSON.stringify({ app: 'gpx-lauf-analyse', version: 1, runs: [{ ...raw, lat: raw.lat.slice(1) }] }));
  bad(JSON.stringify({ app: 'gpx-lauf-analyse', version: 1 }));
});
