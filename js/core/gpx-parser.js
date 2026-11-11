/* GPX-Dokument → { name, points: [{lat, lon, time(ms)}] }; namensraumunabhängig. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).gpxParser = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  const { AppError } = typeof require === 'function' ? require('./errors.js') : root.GpxApp.errors;

  const localName = (el) => el.localName || String(el.nodeName).split(':').pop();

  function childElement(el, name) {
    const nodes = el.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === 1 && localName(nodes[i]) === name) return nodes[i];
    }
    return null;
  }

  function invalid(fileName) {
    return new AppError('invalid-gpx', '„' + fileName + '“ konnte nicht gelesen werden.');
  }

  function parseGpx(doc, fileName) {
    if (!doc || !doc.documentElement) throw invalid(fileName);
    if (doc.getElementsByTagName('parsererror').length > 0) throw invalid(fileName);
    if (localName(doc.documentElement) !== 'gpx') throw invalid(fileName);

    const trkpts = doc.getElementsByTagNameNS('*', 'trkpt');
    if (trkpts.length === 0) throw invalid(fileName);

    const raw = [];
    for (let i = 0; i < trkpts.length; i++) {
      const el = trkpts[i];
      const lat = parseFloat(el.getAttribute('lat'));
      const lon = parseFloat(el.getAttribute('lon'));
      const timeEl = childElement(el, 'time');
      const time = timeEl ? Date.parse(String(timeEl.textContent).trim()) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(time)) continue;
      raw.push({ lat, lon, time });
    }
    if (raw.length === 0) {
      throw new AppError('no-time', '„' + fileName + '“ enthält keine Zeitangaben – Tempo nicht berechenbar.');
    }

    raw.sort((a, b) => a.time - b.time);
    const points = raw.filter((p, i) => i === 0 || p.time !== raw[i - 1].time);

    const trk = doc.getElementsByTagNameNS('*', 'trk')[0];
    const nameEl = trk ? childElement(trk, 'name') : null;
    const trkName = nameEl ? String(nameEl.textContent).trim() : '';
    const name = trkName || String(fileName).replace(/\.[^.]*$/, '');

    return { name, points };
  }

  return { parseGpx };
});
