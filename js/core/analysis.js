/* Analyse eines Laufs: Ausreißer, Pausen, 100-m-Abschnitte, Kennzahlen. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).analysis = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  const req = typeof require === 'function';
  const geo = req ? require('./geo.js') : root.GpxApp.geo;
  const { AppError } = req ? require('./errors.js') : root.GpxApp.errors;

  const SEGMENT_LENGTH_M = 100;
  const PAUSE_SPEED_KMH = 1;
  const PAUSE_MIN_DURATION_S = 10;
  const OUTLIER_SPEED_KMH = 30;
  /** Toleranz gegen Rundungsfehler der Distanzsumme (1 cm). */
  const EPS_M = 0.01;

  function removeOutliers(points) {
    if (points.length === 0) return [];
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const last = out[out.length - 1];
      const p = points[i];
      const dt = (p.time - last.time) / 1000;
      if (dt <= 0) continue;
      const kmh = (geo.haversine(last.lat, last.lon, p.lat, p.lon) / dt) * 3.6;
      if (kmh > OUTLIER_SPEED_KMH) continue;
      out.push(p);
    }
    return out;
  }

  /** Markiert für jedes Punktpaar (i, i+1), ob es zu einer Pause gehört. */
  function markPauses(points, dists) {
    const n = points.length - 1;
    const isPause = new Array(n).fill(false);
    let i = 0;
    while (i < n) {
      const slow = (k) => {
        const dt = (points[k + 1].time - points[k].time) / 1000;
        return (dists[k] / dt) * 3.6 < PAUSE_SPEED_KMH;
      };
      if (!slow(i)) {
        i++;
        continue;
      }
      let j = i;
      let duration = 0;
      while (j < n && slow(j)) {
        duration += (points[j + 1].time - points[j].time) / 1000;
        j++;
      }
      if (duration >= PAUSE_MIN_DURATION_S) {
        for (let k = i; k < j; k++) isPause[k] = true;
      }
      i = j;
    }
    return isPause;
  }

  function analyzeRun(inputPoints) {
    const tooShort = () => new AppError('too-short', 'Lauf ist zu kurz.');
    if (!inputPoints || inputPoints.length < 2) throw tooShort();
    const points = removeOutliers(inputPoints);
    if (points.length < 2) throw tooShort();

    const n = points.length - 1;
    const dists = new Array(n);
    for (let k = 0; k < n; k++) {
      dists[k] = geo.haversine(points[k].lat, points[k].lon, points[k + 1].lat, points[k + 1].lon);
    }
    const isPause = markPauses(points, dists);

    const pauses = [];
    const segments = [];
    const boundaryTimesS = [0];
    let cumD = 0;
    let cumT = 0;
    let nextBoundary = SEGMENT_LENGTH_M;
    let seg = { startM: 0, startT: 0, coords: [[points[0].lat, points[0].lon]] };

    const closeSegment = (endM, endT, partial) => {
      const len = endM - seg.startM;
      const timeS = endT - seg.startT;
      segments.push({
        index: segments.length,
        startM: seg.startM,
        endM,
        timeS,
        paceSPerKm: timeS / (len / 1000),
        partial,
        coords: seg.coords,
      });
      boundaryTimesS.push(endT);
    };

    for (let k = 0; k < n; k++) {
      const a = points[k];
      const b = points[k + 1];
      const dt = (b.time - a.time) / 1000;
      if (isPause[k]) {
        if (k === 0 || !isPause[k - 1]) {
          pauses.push({ lat: a.lat, lon: a.lon, durationS: 0, atDistanceM: cumD });
        }
        pauses[pauses.length - 1].durationS += dt;
        continue;
      }
      const d = dists[k];
      const pairStartD = cumD;
      const pairStartT = cumT;
      while (d > 0 && nextBoundary <= pairStartD + d + EPS_M) {
        const f = Math.min(1, (nextBoundary - pairStartD) / d);
        const bp = geo.lerpPoint(a, b, f);
        const bT = pairStartT + dt * f;
        seg.coords.push([bp.lat, bp.lon]);
        closeSegment(nextBoundary, bT, false);
        seg = { startM: nextBoundary, startT: bT, coords: [[bp.lat, bp.lon]] };
        nextBoundary += SEGMENT_LENGTH_M;
      }
      const lastCoord = seg.coords[seg.coords.length - 1];
      if (lastCoord[0] !== b.lat || lastCoord[1] !== b.lon) seg.coords.push([b.lat, b.lon]);
      cumD += d;
      cumT += dt;
    }

    if (cumD < SEGMENT_LENGTH_M - EPS_M) throw tooShort();
    if (cumD - seg.startM > EPS_M) {
      closeSegment(cumD, cumT, cumD - seg.startM < SEGMENT_LENGTH_M - EPS_M);
    }

    let fastestIndex = null;
    let slowestIndex = null;
    for (const s of segments) {
      if (s.partial) continue;
      if (fastestIndex === null || s.paceSPerKm < segments[fastestIndex].paceSPerKm) fastestIndex = s.index;
      if (slowestIndex === null || s.paceSPerKm > segments[slowestIndex].paceSPerKm) slowestIndex = s.index;
    }

    return {
      distanceM: cumD,
      movingTimeS: cumT,
      avgPaceSPerKm: cumT / (cumD / 1000),
      pauses,
      totalPauseS: pauses.reduce((sum, p) => sum + p.durationS, 0),
      segments,
      boundaryTimesS,
      fastestIndex,
      slowestIndex,
      fastestPace: fastestIndex === null ? null : segments[fastestIndex].paceSPerKm,
      slowestPace: slowestIndex === null ? null : segments[slowestIndex].paceSPerKm,
    };
  }

  return {
    SEGMENT_LENGTH_M,
    PAUSE_SPEED_KMH,
    PAUSE_MIN_DURATION_S,
    OUTLIER_SPEED_KMH,
    removeOutliers,
    analyzeRun,
  };
});
