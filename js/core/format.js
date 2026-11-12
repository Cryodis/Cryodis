/* Formatierung von Tempo, Dauer, Distanz, Datum und Abschnitten (deutsch). */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).format = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const pad2 = (n) => String(n).padStart(2, '0');

  function formatPace(sPerKm) {
    if (sPerKm == null || !Number.isFinite(sPerKm)) return '–';
    const total = Math.round(sPerKm);
    return Math.floor(total / 60) + ':' + pad2(total % 60);
  }

  function formatDuration(s) {
    const total = Math.round(s);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return h > 0 ? h + ':' + pad2(m) + ':' + pad2(sec) : m + ':' + pad2(sec);
  }

  function formatDistance(m) {
    if (Math.round(m) < 1000) return Math.round(m) + ' m';
    return (m / 1000).toFixed(2).replace('.', ',') + ' km';
  }

  function formatDate(ms) {
    return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function segmentLabel(startM, endM) {
    return Math.round(startM) + '–' + Math.round(endM) + ' m';
  }

  function formatGap(s) {
    const total = Math.round(s);
    const sign = total > 0 ? '+' : total < 0 ? '−' : '±';
    const abs = Math.abs(total);
    return sign + Math.floor(abs / 60) + ':' + pad2(abs % 60);
  }

  return { formatPace, formatDuration, formatDistance, formatDate, segmentLabel, formatGap };
});
