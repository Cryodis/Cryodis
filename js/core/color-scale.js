/* Tempo → Farbe (dunkelblau = langsam, hellrot = schnell) und Serienfarben für Vergleiche. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).colorScale = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const SLOW_COLOR = '#1e3a8a';
  const FAST_COLOR = '#ff4d4d';
  const SERIES_COLORS = ['#0f766e', '#d97706', '#7c3aed', '#059669', '#db2777', '#0891b2', '#65a30d', '#78716c'];

  const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const SLOW = toRgb(SLOW_COLOR);
  const FAST = toRgb(FAST_COLOR);

  /** t = 0 → langsam, t = 1 → schnell */
  function mix(t) {
    return toHex(SLOW.map((s, i) => s + (FAST[i] - s) * t));
  }

  function colorForPace(paceSPerKm, fastestPace, slowestPace) {
    if (slowestPace === fastestPace) return mix(0.5);
    const t = (slowestPace - paceSPerKm) / (slowestPace - fastestPace);
    return mix(Math.max(0, Math.min(1, t)));
  }

  function seriesColor(i) {
    return SERIES_COLORS[i % SERIES_COLORS.length];
  }

  return { SLOW_COLOR, FAST_COLOR, SERIES_COLORS, colorForPace, seriesColor };
});
