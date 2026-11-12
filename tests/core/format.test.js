const test = require('node:test');
const assert = require('node:assert/strict');
const f = require('../../js/core/format.js');

test('formatPace formatiert Sekunden pro km als m:ss', () => {
  assert.equal(f.formatPace(319), '5:19');
  assert.equal(f.formatPace(300), '5:00');
  assert.equal(f.formatPace(299.6), '5:00');
});

test('formatPace liefert Gedankenstrich für ungültige Werte', () => {
  assert.equal(f.formatPace(null), '–');
  assert.equal(f.formatPace(NaN), '–');
  assert.equal(f.formatPace(Infinity), '–');
});

test('formatDuration', () => {
  assert.equal(f.formatDuration(1601), '26:41');
  assert.equal(f.formatDuration(3723), '1:02:03');
});

test('formatDistance', () => {
  assert.equal(f.formatDistance(5023), '5,02 km');
  assert.equal(f.formatDistance(1000), '1,00 km');
  assert.equal(f.formatDistance(850), '850 m');
  assert.equal(f.formatDistance(999.996), '1,00 km');
  assert.equal(f.formatDistance(999.4), '999 m');
});

test('formatDate liefert TT.MM.JJJJ', () => {
  assert.equal(f.formatDate(new Date(2026, 10, 8, 9, 0).getTime()), '08.11.2026');
});

test('segmentLabel', () => {
  assert.equal(f.segmentLabel(0, 100), '0–100 m');
  assert.equal(f.segmentLabel(5000, 5023.4), '5000–5023 m');
});

test('formatGap', () => {
  assert.equal(f.formatGap(12), '+0:12');
  assert.equal(f.formatGap(-75), '−1:15');
  assert.equal(f.formatGap(0), '±0:00');
});
