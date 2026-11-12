/* Vergleich mehrerer Läufe derselben Strecke über die Distanz vom Start. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).compare = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  function alignSegments(runs) {
    const longest = runs.reduce((best, r) => (!best || r.analysis.segments.length > best.analysis.segments.length ? r : best), null);
    if (!longest) return { rows: [] };
    const rows = longest.analysis.segments.map((seg, index) => {
      const paces = {};
      let fastestId = null;
      let fastestPace = Infinity;
      let fullCount = 0;
      for (const r of runs) {
        const s = r.analysis.segments[index];
        paces[r.id] = s ? s.paceSPerKm : null;
        if (s && !s.partial) {
          fullCount++;
          if (s.paceSPerKm < fastestPace) {
            fastestPace = s.paceSPerKm;
            fastestId = r.id;
          }
        }
      }
      return { index, startM: seg.startM, endM: seg.endM, paces, fastestId: fullCount >= 2 ? fastestId : null };
    });
    return { rows };
  }

  function timeGaps(reference, other) {
    const len = Math.min(reference.boundaryTimesS.length, other.boundaryTimesS.length);
    const gaps = [];
    for (let k = 1; k < len; k++) {
      gaps.push({
        boundary: k,
        distanceM: reference.segments[k - 1].endM,
        gapS: other.boundaryTimesS[k] - reference.boundaryTimesS[k],
      });
    }
    return gaps;
  }

  function development(runs) {
    return runs
      .map((r) => ({ id: r.id, date: r.date, avgPaceSPerKm: r.analysis.avgPaceSPerKm, movingTimeS: r.analysis.movingTimeS }))
      .sort((a, b) => a.date - b.date);
  }

  function defaultReferenceId(runs) {
    let best = null;
    for (const r of runs) {
      if (!best || r.analysis.avgPaceSPerKm < best.analysis.avgPaceSPerKm) best = r;
    }
    return best ? best.id : null;
  }

  return { alignSegments, timeGaps, development, defaultReferenceId };
});
