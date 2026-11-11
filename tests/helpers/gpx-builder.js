// Erzeugt künstliche GPX-Texte und Punktfolgen für Tests.
const M_PER_DEG_LAT = 111194.93;
const DEFAULT_START = Date.UTC(2026, 10, 8, 7, 0, 0);

function buildGpx({ name, points, version = '1.1', prefix } = {}) {
  const ns = version === '1.0' ? 'http://www.topografix.com/GPX/1/0' : 'http://www.topografix.com/GPX/1/1';
  const p = prefix ? prefix + ':' : '';
  const nsAttr = prefix ? `xmlns:${prefix}="${ns}"` : `xmlns="${ns}"`;
  const pts = points
    .map((pt) => {
      const time = pt.time == null ? '' : `<${p}time>${new Date(pt.time).toISOString()}</${p}time>`;
      const ext = pt.extensions || '';
      return `<${p}trkpt lat="${pt.lat}" lon="${pt.lon}">${time}${ext}</${p}trkpt>`;
    })
    .join('\n');
  const nameEl = name ? `<${p}name>${name}</${p}name>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<${p}gpx version="${version}" creator="test" ${nsAttr}>
<${p}trk>${nameEl}<${p}trkseg>
${pts}
</${p}trkseg></${p}trk>
</${p}gpx>`;
}

function straightRun({
  distanceM,
  paceSPerKm,
  stepM = 10,
  startTime = DEFAULT_START,
  startLat = 48.0,
  lon = 11.0,
  pauses = [],
}) {
  const points = [];
  const steps = Math.round(distanceM / stepM);
  const secPerStep = (paceSPerKm * stepM) / 1000;
  let t = startTime;
  for (let i = 0; i <= steps; i++) {
    const d = Math.min(i * stepM, distanceM);
    const lat = startLat + d / M_PER_DEG_LAT;
    if (i > 0) {
      const prevD = Math.min((i - 1) * stepM, distanceM);
      t += ((d - prevD) / stepM) * secPerStep * 1000;
    }
    points.push({ lat, lon, time: Math.round(t) });
    for (const p of pauses) {
      if (Math.abs(p.atM - d) < 1e-9) {
        for (let s = 0; s < p.durationS; s++) {
          t += 1000;
          points.push({ lat, lon, time: Math.round(t) });
        }
      }
    }
  }
  if (steps * stepM < distanceM - 1e-9) {
    // Rest unter einem Schritt
    const rest = distanceM - steps * stepM;
    t += (rest / 1000) * paceSPerKm * 1000;
    points.push({ lat: startLat + distanceM / M_PER_DEG_LAT, lon, time: Math.round(t) });
  }
  return points;
}

module.exports = { buildGpx, straightRun, M_PER_DEG_LAT, DEFAULT_START };
