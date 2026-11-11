const test = require('node:test');
const assert = require('node:assert/strict');
const { createState } = require('../../js/core/state.js');
const { analyzeRun } = require('../../js/core/analysis.js');
const { straightRun } = require('../helpers/gpx-builder.js');

function run(id, date, distanceM, pace) {
  return { raw: { id, date }, analysis: analyzeRun(straightRun({ distanceM, paceSPerKm: pace })) };
}
const runs = { a: run('a', 1000, 1000, 300), b: run('b', 2000, 500, 280), c: run('c', 3000, 1000, 330) };

test('Standardzustand ohne Läufe', () => {
  const s = createState().get();
  assert.equal(s.view, 'single');
  assert.equal(s.currentRunId, null);
  assert.deepEqual(s.compareRunIds, []);
  assert.equal(s.referenceRunId, null);
  assert.equal(s.compareTab, 'lines');
  assert.equal(s.selectedSegment, null);
});

test('subscribe meldet geänderte Schlüssel, Abmelden wirkt', () => {
  const st = createState({ runs });
  const calls = [];
  const off = st.subscribe((state, keys) => calls.push(keys));
  st.set({ compareTab: 'table' });
  assert.deepEqual(calls[0], ['compareTab']);
  st.set({ compareTab: 'table' });
  assert.equal(calls.length, 1, 'keine Meldung ohne Änderung');
  off();
  st.set({ compareTab: 'gaps' });
  assert.equal(calls.length, 1);
});

test('currentRunId fällt auf den neuesten Lauf zurück', () => {
  const st = createState({ runs, currentRunId: 'gibt-es-nicht' });
  assert.equal(st.get().currentRunId, 'c');
});

test('compareRunIds enthält nur existierende Läufe', () => {
  const st = createState({ runs, compareRunIds: ['a', 'x', 'c'] });
  assert.deepEqual(st.get().compareRunIds, ['a', 'c']);
});

test('referenceRunId ist Standardreferenz der Vergleichsläufe', () => {
  const st = createState({ runs, compareRunIds: ['a', 'c'] });
  assert.equal(st.get().referenceRunId, 'a');
  st.set({ referenceRunId: 'c' });
  assert.equal(st.get().referenceRunId, 'c');
  st.set({ referenceRunId: 'b' });
  assert.equal(st.get().referenceRunId, 'a', 'b ist nicht im Vergleich');
});

test('Lauf entfernen bereinigt current, compare und Referenz', () => {
  const st = createState({ runs, currentRunId: 'a', compareRunIds: ['a', 'c'], referenceRunId: 'a', selectedSegment: 3 });
  const { a, ...rest } = runs;
  st.set({ runs: rest });
  const s = st.get();
  assert.equal(s.currentRunId, 'c');
  assert.deepEqual(s.compareRunIds, ['c']);
  assert.equal(s.referenceRunId, 'c');
  assert.equal(s.selectedSegment, null);
});

test('Laufwechsel oder Ansichtswechsel setzt die Auswahl zurück', () => {
  const st = createState({ runs, currentRunId: 'a', selectedSegment: 3 });
  st.set({ currentRunId: 'c' });
  assert.equal(st.get().selectedSegment, null);
  st.set({ selectedSegment: 2 });
  st.set({ view: 'compare' });
  assert.equal(st.get().selectedSegment, null);
  st.set({ view: 'single', currentRunId: 'a', selectedSegment: 4 });
  assert.equal(st.get().selectedSegment, 4, 'explizit gesetzt bleibt erhalten');
});

test('Auswahl außerhalb der Abschnitte wird verworfen', () => {
  const st = createState({ runs, currentRunId: 'b' });
  st.set({ selectedSegment: 7 });
  assert.equal(st.get().selectedSegment, null, 'b hat nur 5 Abschnitte');
  st.set({ view: 'compare', compareRunIds: ['a', 'b'], selectedSegment: 7 });
  assert.equal(st.get().selectedSegment, 7, 'im Vergleich zählt der längste Lauf');
});
