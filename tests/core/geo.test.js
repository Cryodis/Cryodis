const test = require('node:test');
const assert = require('node:assert/strict');
const geo = require('../../js/core/geo.js');

test('haversine: 0,001° Breite ≈ 111,19 m', () => {
  assert.ok(Math.abs(geo.haversine(48, 11, 48.001, 11) - 111.19) < 0.05);
});

test('haversine: gleicher Punkt = 0', () => {
  assert.equal(geo.haversine(48, 11, 48, 11), 0);
});

test('haversine: München–Berlin ≈ 504 km', () => {
  const d = geo.haversine(48.1374, 11.5755, 52.52, 13.405);
  assert.ok(Math.abs(d - 504200) < 1000, String(d));
});

test('lerpPoint interpoliert lat, lon und time', () => {
  const p = geo.lerpPoint({ lat: 0, lon: 10, time: 1000 }, { lat: 4, lon: 14, time: 5000 }, 0.25);
  assert.deepEqual(p, { lat: 1, lon: 11, time: 2000 });
});
