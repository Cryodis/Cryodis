/* Geometrie: Distanz auf der Erdkugel und lineare Interpolation. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).geo = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const EARTH_RADIUS_M = 6371000;
  const rad = (deg) => (deg * Math.PI) / 180;

  function haversine(lat1, lon1, lat2, lon2) {
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function lerpPoint(a, b, f) {
    return {
      lat: a.lat + (b.lat - a.lat) * f,
      lon: a.lon + (b.lon - a.lon) * f,
      time: a.time + (b.time - a.time) * f,
    };
  }

  return { EARTH_RADIUS_M, haversine, lerpPoint };
});
