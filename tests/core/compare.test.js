const test = require('node:test');
const assert = require('node:assert/strict');
const cmp = require('../../js/core/compare.js');
const { analyzeRun } = require('../../js/core/analysis.js');
const { straightRun } = require('../helpers/gpx-builder.js');

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `erwartet ${b}±${tol}, erhalten ${a}`);
const fast = { id: 'fast', date: 2000, analysis: analyzeRun(straightRun({ distanceM: 1000, paceSPerKm: 300 })) };
const slow = { id: 'slow', date: 1000, analysis: analyzeRun(straightRun({ distanceM: 900, paceSPerKm: 330 })) };

test('alignSegments: Zeilen nach längstem Lauf, fehlende Werte null', () => {
  const { rows } = cmp.alignSegments([slow, fast]);
  assert.equal(rows.length, 10);
  assert.equal(rows[9].paces.slow, null);
  near(rows[9].paces.fast, 300, 0.5);
  assert.equal(rows[0].startM, 0);
  assert.equal(rows[0].endM, 100);
});

test('alignSegments: fastestId', () => {
  const { rows } = cmp.alignSegments([slow, fast]);
  rows.slice(0, 9).forEach((r) => assert.equal(r.fastestId, 'fast'));
  assert.equal(rows[9].fastestId, null);
});

test('timeGaps: Rückstand an jeder gemeinsamen Grenze', () => {
  const gaps = cmp.timeGaps(fast.analysis, slow.analysis);
  assert.equal(gaps.length, 9);
  assert.equal(gaps[4].boundary, 5);
  near(gaps[4].distanceM, 500, 0.01);
  near(gaps[4].gapS, 15, 0.5);
  near(cmp.timeGaps(slow.analysis, fast.analysis)[4].gapS, -15, 0.5);
});

test('development: nach Datum sortiert', () => {
  const dev = cmp.development([fast, slow]);
  assert.deepEqual(dev.map((d) => d.id), ['slow', 'fast']);
  near(dev[1].avgPaceSPerKm, 300, 0.5);
  near(dev[1].movingTimeS, 300, 0.5);
  assert.equal(dev[1].date, 2000);
});

test('defaultReferenceId: bestes Durchschnittstempo (kürzere Läufe gewinnen nicht automatisch)', () => {
  assert.equal(cmp.defaultReferenceId([slow, fast]), 'fast'); // slow: 297 s, aber 5:30 /km
  const fast2 = { id: 'f2', analysis: analyzeRun(straightRun({ distanceM: 1000, paceSPerKm: 280 })) };
  assert.equal(cmp.defaultReferenceId([fast, fast2]), 'f2');
  assert.equal(cmp.defaultReferenceId([]), null);
});

test('timeGaps: kein Scheinsprung bei unterschiedlich langen Reststücken', () => {
  const r1 = analyzeRun(straightRun({ distanceM: 5020, paceSPerKm: 300 }));
  const r2 = analyzeRun(straightRun({ distanceM: 5060, paceSPerKm: 300 }));
  const gaps = cmp.timeGaps(r1, r2);
  assert.equal(gaps.length, 50);
  gaps.forEach((g) => near(g.gapS, 0, 0.5));
});
