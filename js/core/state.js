/* Zentraler Zustand der App mit Abonnement und erzwungenen Invarianten. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).state = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  const { defaultReferenceId } = typeof require === 'function' ? require('./compare.js') : root.GpxApp.compare;

  const DEFAULTS = {
    view: 'single',
    runs: {},
    currentRunId: null,
    compareRunIds: [],
    referenceRunId: null,
    compareTab: 'lines',
    selectedSegment: null,
    storageAvailable: true,
  };

  function newestRunId(runs) {
    let best = null;
    for (const id of Object.keys(runs)) {
      if (!best || runs[id].raw.date > runs[best].raw.date) best = id;
    }
    return best;
  }

  function normalize(s) {
    const runs = s.runs;
    if (!(s.currentRunId in runs)) s.currentRunId = newestRunId(runs);

    const filtered = s.compareRunIds.filter((id) => id in runs);
    if (filtered.length !== s.compareRunIds.length) s.compareRunIds = filtered;

    if (!s.compareRunIds.includes(s.referenceRunId)) {
      s.referenceRunId = defaultReferenceId(s.compareRunIds.map((id) => ({ id, analysis: runs[id].analysis })));
    }

    if (s.selectedSegment !== null) {
      const ids = s.view === 'compare' ? s.compareRunIds : s.currentRunId ? [s.currentRunId] : [];
      const max = ids.reduce((m, id) => Math.max(m, runs[id].analysis.segments.length), 0);
      if (s.selectedSegment >= max || s.selectedSegment < 0) s.selectedSegment = null;
    }
    return s;
  }

  function createState(initial) {
    let state = normalize({ ...DEFAULTS, ...(initial || {}) });
    const listeners = new Set();

    function set(partial) {
      const prev = state;
      const next = { ...state, ...partial };
      const explicitSelection = 'selectedSegment' in partial;
      normalize(next);
      if (!explicitSelection && (next.currentRunId !== prev.currentRunId || next.view !== prev.view)) {
        next.selectedSegment = null;
      }
      const changed = Object.keys(next).filter((k) => next[k] !== prev[k]);
      state = next;
      if (changed.length) listeners.forEach((fn) => fn(state, changed));
    }

    return {
      get: () => state,
      set,
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
  }

  return { createState };
});
