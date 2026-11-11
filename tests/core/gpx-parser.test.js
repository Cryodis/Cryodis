const test = require('node:test');
const assert = require('node:assert/strict');
const { DOMParser } = require('@xmldom/xmldom');
const { parseGpx } = require('../../js/core/gpx-parser.js');
const { buildGpx, straightRun, DEFAULT_START } = require('../helpers/gpx-builder.js');

const doc = (text) => {
  try {
    return new DOMParser({ onError: () => {} }).parseFromString(text, 'text/xml');
  } catch (e) {
    return null;
  }
};
const parse = (text, file = 'lauf.gpx') => parseGpx(doc(text), file);
const pts = straightRun({ distanceM: 200, paceSPerKm: 300 });

function assertCode(fn, code) {
  assert.throws(fn, (e) => e.code === code);
}

test('GPX 1.1 mit Name', () => {
  const r = parse(buildGpx({ name: 'Morgenrunde', points: pts }));
  assert.equal(r.name, 'Morgenrunde');
  assert.equal(r.points.length, pts.length);
  assert.deepEqual(r.points[0], { lat: pts[0].lat, lon: pts[0].lon, time: DEFAULT_START });
});

test('ohne trk/name wird der Dateiname ohne Endung genutzt', () => {
  assert.equal(parse(buildGpx({ points: pts }), 'lauf-08-11.gpx').name, 'lauf-08-11');
});

test('mehrere trk und trkseg werden zusammengefügt', () => {
  const p = (x) => `<trkpt lat="${x.lat}" lon="${x.lon}"><time>${new Date(x.time).toISOString()}</time></trkpt>`;
  const text = `<gpx xmlns="http://www.topografix.com/GPX/1/1">
    <trk><trkseg>${p(pts[0])}${p(pts[1])}</trkseg><trkseg>${p(pts[2])}</trkseg></trk>
    <trk><trkseg>${p(pts[3])}</trkseg></trk></gpx>`;
  assert.equal(parse(text).points.length, 4);
});

test('unsortierte Zeitstempel werden sortiert, doppelte verworfen', () => {
  const shuffled = [pts[2], pts[0], pts[1], pts[1]];
  const r = parse(buildGpx({ points: shuffled }));
  assert.deepEqual(r.points.map((p) => p.time), [pts[0].time, pts[1].time, pts[2].time]);
});

test('Punkte ohne Zeit werden verworfen', () => {
  const r = parse(buildGpx({ points: [pts[0], { ...pts[1], time: null }, pts[2]] }));
  assert.equal(r.points.length, 2);
});

test('ganz ohne Zeitstempel → no-time', () => {
  assertCode(() => parse(buildGpx({ points: pts.map((p) => ({ ...p, time: null })) })), 'no-time');
});

test('kein GPX → invalid-gpx', () => {
  assertCode(() => parse('<html></html>'), 'invalid-gpx');
  assertCode(() => parse('<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk></trk></gpx>'), 'invalid-gpx');
  assertCode(() => parse('<gpx'), 'invalid-gpx');
  assertCode(() => parseGpx(null, 'x.gpx'), 'invalid-gpx');
});

test('GPX 1.0, Präfix und Extensions liefern dieselben Punkte', () => {
  const ref = parse(buildGpx({ points: pts })).points;
  const ext = '<extensions><gpxtpx:TrackPointExtension xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><gpxtpx:hr>140</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>';
  assert.deepEqual(parse(buildGpx({ points: pts, version: '1.0' })).points, ref);
  assert.deepEqual(parse(buildGpx({ points: pts, prefix: 'gpx' })).points, ref);
  assert.deepEqual(parse(buildGpx({ points: pts.map((p) => ({ ...p, extensions: ext })) })).points, ref);
});
