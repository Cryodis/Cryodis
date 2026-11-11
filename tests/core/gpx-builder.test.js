const test = require('node:test');
const assert = require('node:assert/strict');
const { straightRun, buildGpx } = require('../helpers/gpx-builder.js');

const START = Date.UTC(2026, 10, 8, 7, 0, 0);

test('straightRun: 1 km in 5:00 ergibt 101 Punkte', () => {
  const pts = straightRun({ distanceM: 1000, paceSPerKm: 300 });
  assert.equal(pts.length, 101);
  assert.equal(pts[0].time, START);
  assert.equal(pts[100].time, START + 300000);
});

test('straightRun: Pause fügt Punkte im 1-s-Abstand ein', () => {
  const pts = straightRun({ distanceM: 1000, paceSPerKm: 300, pauses: [{ atM: 500, durationS: 30 }] });
  assert.equal(pts.length, 131);
  assert.equal(pts[130].time, START + 330000);
});

test('buildGpx erzeugt trkpt mit time', () => {
  const xml = buildGpx({ name: 'X', points: [{ lat: 48, lon: 11, time: START }] });
  assert.match(xml, /<trkpt lat="48" lon="11"><time>2026-11-08T07:00:00.000Z<\/time><\/trkpt>/);
  assert.match(xml, /<name>X<\/name>/);
});
