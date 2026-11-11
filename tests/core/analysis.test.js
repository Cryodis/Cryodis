const test = require('node:test');
const assert = require('node:assert/strict');
const a = require('../../js/core/analysis.js');
const { straightRun, M_PER_DEG_LAT, DEFAULT_START } = require('../helpers/gpx-builder.js');

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg || ''} erwartet ${expected}±${tol}, erhalten ${actual}`);

function mixedRun() {
  const first = straightRun({ distanceM: 500, paceSPerKm: 330 });
  const last = first[first.length - 1];
  const second = straightRun({ distanceM: 500, paceSPerKm: 270, startLat: last.lat, startTime: last.time });
  return first.concat(second.slice(1));
}

test('Konstanten', () => {
  assert.equal(a.SEGMENT_LENGTH_M, 100);
  assert.equal(a.PAUSE_SPEED_KMH, 1);
  assert.equal(a.PAUSE_MIN_DURATION_S, 10);
  assert.equal(a.OUTLIER_SPEED_KMH, 30);
});

test('1 km in 5:00 → 10 Abschnitte à 5:00 /km', () => {
  const r = a.analyzeRun(straightRun({ distanceM: 1000, paceSPerKm: 300 }));
  assert.equal(r.segments.length, 10);
  r.segments.forEach((s, i) => {
    assert.equal(s.index, i);
    near(s.paceSPerKm, 300, 0.5, 'Tempo');
    assert.equal(s.partial, false);
  });
  near(r.distanceM, 1000, 1);
  near(r.movingTimeS, 300, 0.5);
  near(r.avgPaceSPerKm, 300, 0.5);
  assert.equal(r.pauses.length, 0);
  assert.equal(r.totalPauseS, 0);
  assert.equal(r.boundaryTimesS.length, 11);
  assert.equal(r.boundaryTimesS[0], 0);
  near(r.boundaryTimesS[10], 300, 0.5);
});

test('Pause von 30 s wird erkannt und herausgerechnet', () => {
  const r = a.analyzeRun(straightRun({ distanceM: 1000, paceSPerKm: 300, pauses: [{ atM: 500, durationS: 30 }] }));
  assert.equal(r.pauses.length, 1);
  assert.equal(r.pauses[0].durationS, 30);
  near(r.pauses[0].atDistanceM, 500, 10);
  near(r.pauses[0].lat, 48 + 500 / M_PER_DEG_LAT, 1e-6);
  near(r.movingTimeS, 300, 0.5);
  assert.equal(r.totalPauseS, 30);
  near(r.segments[5].paceSPerKm, 300, 0.5);
  near(r.segments[4].paceSPerKm, 300, 0.5);
});

test('Stillstand von 5 s ist keine Pause', () => {
  const r = a.analyzeRun(straightRun({ distanceM: 1000, paceSPerKm: 300, pauses: [{ atM: 500, durationS: 5 }] }));
  assert.equal(r.pauses.length, 0);
  near(r.movingTimeS, 305, 0.5);
});

test('Stillstand direkt am Start ist eine Pause', () => {
  const r = a.analyzeRun(straightRun({ distanceM: 1000, paceSPerKm: 300, pauses: [{ atM: 0, durationS: 20 }] }));
  assert.equal(r.pauses.length, 1);
  near(r.segments[0].paceSPerKm, 300, 0.5);
});

test('Abschnittsgrenze wird zwischen zwei Punkten interpoliert', () => {
  const r = a.analyzeRun(straightRun({ distanceM: 300, paceSPerKm: 300, stepM: 30 }));
  const coords = r.segments[0].coords;
  near(coords[coords.length - 1][0], 48 + 100 / M_PER_DEG_LAT, 1e-7);
  assert.equal(r.segments[1].coords[0][0], coords[coords.length - 1][0]);
  near(r.boundaryTimesS[1], 30, 0.01);
});

test('kurzer Rest wird als partial-Abschnitt geführt', () => {
  const r = a.analyzeRun(straightRun({ distanceM: 1023, paceSPerKm: 300 }));
  assert.equal(r.segments.length, 11);
  const last = r.segments[10];
  assert.equal(last.partial, true);
  assert.equal(last.startM, 1000);
  near(last.endM, 1023, 0.5);
  near(last.paceSPerKm, 300, 1);
});

test('schnellster und langsamster Abschnitt', () => {
  const r = a.analyzeRun(mixedRun());
  near(r.fastestPace, 270, 0.5);
  near(r.slowestPace, 330, 0.5);
  assert.ok(r.fastestIndex >= 5);
  assert.ok(r.slowestIndex < 5);
});

test('partial-Abschnitt zählt nicht für schnellsten Abschnitt', () => {
  const pts = straightRun({ distanceM: 1000, paceSPerKm: 300 });
  const last = pts[pts.length - 1];
  pts.push({ lat: last.lat + 20 / M_PER_DEG_LAT, lon: last.lon, time: last.time + 4000 }); // 20 m in 4 s = 3:20 /km
  const r = a.analyzeRun(pts);
  assert.equal(r.segments[10].partial, true);
  near(r.fastestPace, 300, 0.5);
  assert.ok(r.fastestIndex < 10);
});

test('GPS-Ausreißer wird verworfen', () => {
  const pts = straightRun({ distanceM: 1000, paceSPerKm: 300 });
  const p = pts[50];
  const outlier = { lat: p.lat, lon: p.lon + 1000 / (M_PER_DEG_LAT * Math.cos((48 * Math.PI) / 180)), time: p.time + 1500 };
  const withOutlier = pts.slice(0, 51).concat([outlier], pts.slice(51));
  const cleaned = a.removeOutliers(withOutlier);
  assert.equal(cleaned.length, pts.length);
  assert.ok(!cleaned.includes(outlier));
  near(a.analyzeRun(withOutlier).distanceM, 1000, 1);
});

test('zu kurze Läufe → too-short', () => {
  assert.throws(() => a.analyzeRun([{ lat: 48, lon: 11, time: DEFAULT_START }]), (e) => e.code === 'too-short');
  assert.throws(() => a.analyzeRun(straightRun({ distanceM: 80, paceSPerKm: 300 })), (e) => e.code === 'too-short');
});

test('20 000 Punkte werden in unter 300 ms analysiert', () => {
  const pts = straightRun({ distanceM: 20000, paceSPerKm: 300, stepM: 1 });
  const t0 = performance.now();
  const r = a.analyzeRun(pts);
  const ms = performance.now() - t0;
  assert.equal(r.segments.length, 200);
  assert.ok(ms < 300, `${ms} ms`);
});
