/* Rohlauf-Format, Duplikatprüfung, Export und Import der Sicherungsdatei. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).backup = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  const { AppError } = typeof require === 'function' ? require('./errors.js') : root.GpxApp.errors;

  const APP_ID = 'gpx-lauf-analyse';
  const VERSION = 1;

  function toRawRun(parsed, fileName, now) {
    const pts = parsed.points;
    const date = pts[0].time;
    return {
      id: 'run-' + date + '-' + pts.length,
      name: parsed.name,
      fileName,
      date,
      importedAt: now,
      lat: pts.map((p) => p.lat),
      lon: pts.map((p) => p.lon),
      time: pts.map((p) => p.time),
    };
  }

  function rawToPoints(raw) {
    return raw.time.map((time, i) => ({ lat: raw.lat[i], lon: raw.lon[i], time }));
  }

  function isDuplicate(raw, existing) {
    return existing.some((r) => r.date === raw.date && r.time.length === raw.time.length);
  }

  function exportJson(runs, now) {
    return JSON.stringify({ app: APP_ID, version: VERSION, exportedAt: new Date(now).toISOString(), runs });
  }

  function exportFileName(now) {
    return 'lauf-sicherung-' + new Date(now).toISOString().slice(0, 10) + '.json';
  }

  const isNumArray = (a) => Array.isArray(a) && a.every((v) => typeof v === 'number' && Number.isFinite(v));

  function validRun(r) {
    return (
      r && typeof r === 'object' &&
      typeof r.id === 'string' && typeof r.name === 'string' && typeof r.date === 'number' &&
      isNumArray(r.lat) && isNumArray(r.lon) && isNumArray(r.time) &&
      r.lat.length >= 2 && r.lat.length === r.lon.length && r.lat.length === r.time.length
    );
  }

  function parseImport(text) {
    const invalid = () => new AppError('invalid-backup', 'Die Sicherungsdatei ist ungültig. Es wurde nichts geändert.');
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      throw invalid();
    }
    if (!obj || obj.app !== APP_ID || obj.version !== VERSION || !Array.isArray(obj.runs)) throw invalid();
    if (!obj.runs.every(validRun)) throw invalid();
    return obj.runs.map((r) => ({
      id: r.id,
      name: r.name,
      fileName: typeof r.fileName === 'string' ? r.fileName : '',
      date: r.date,
      importedAt: typeof r.importedAt === 'number' ? r.importedAt : r.date,
      lat: r.lat,
      lon: r.lon,
      time: r.time,
    }));
  }

  return { toRawRun, rawToPoints, isDuplicate, exportJson, exportFileName, parseImport };
});
