/* Start der App: Speicher laden, Ansichten verdrahten, Dateien importieren. */
(function (root) {
  const G = root.GpxApp;
  const $ = (id) => document.getElementById(id);

  const MESSAGES = {
    'invalid-gpx': (f) => '„' + f + '“ konnte nicht gelesen werden.',
    'no-time': (f) => '„' + f + '“ enthält keine Zeitangaben – Tempo nicht berechenbar.',
    'too-short': (f) => '„' + f + '“ ist zu kurz.',
    duplicate: (f) => '„' + f + '“ ist bereits gespeichert.',
  };

  function analyze(raw) {
    return { raw, analysis: G.analysis.analyzeRun(G.backup.rawToPoints(raw)) };
  }

  async function start() {
    const storage = await G.storage.open();
    const runs = {};
    for (const raw of await storage.list()) {
      try {
        runs[raw.id] = analyze(raw);
      } catch (e) {
        console.warn('Gespeicherter Lauf konnte nicht analysiert werden', raw.id, e);
      }
    }
    const state = G.state.createState({
      runs,
      compareRunIds: Object.keys(runs),
      storageAvailable: storage.available,
    });
    G.appState = state;
    G.app.storage = storage;

    async function deleteRun(id) {
      await storage.remove(id);
      const { [id]: _removed, ...rest } = state.get().runs;
      state.set({ runs: rest });
    }

    async function importFiles(files) {
      const known = Object.values(state.get().runs).map((r) => r.raw);
      const added = {};
      let lastId = null;
      for (const file of files) {
        try {
          const text = await file.text();
          let doc = null;
          try {
            doc = new DOMParser().parseFromString(text, 'application/xml');
          } catch (e) {
            doc = null;
          }
          const parsed = G.gpxParser.parseGpx(doc, file.name);
          const raw = G.backup.toRawRun(parsed, file.name, Date.now());
          if (G.backup.isDuplicate(raw, known)) throw new G.errors.AppError('duplicate');
          const entry = analyze(raw);
          await storage.put(raw);
          known.push(raw);
          added[raw.id] = entry;
          lastId = raw.id;
        } catch (e) {
          const msg = e && MESSAGES[e.code];
          G.toast.show(msg ? msg(file.name) : MESSAGES['invalid-gpx'](file.name), 'error');
          if (!msg) console.error(e);
        }
      }
      if (lastId) {
        const s = state.get();
        state.set({
          runs: { ...s.runs, ...added },
          compareRunIds: s.compareRunIds.concat(Object.keys(added)),
          currentRunId: lastId,
          view: 'single',
        });
      }
    }
    G.app.importFiles = importFiles;

    // Layout zuerst abonnieren, damit Container sichtbar sind, bevor Ansichten rendern
    state.subscribe(renderLayout);
    renderLayout();

    // Ansichten
    G.runList.mount($('run-list'), state, { onDelete: deleteRun });
    for (const mod of ['summary', 'mapView', 'segmentChart', 'segmentTable']) {
      if (G[mod]) G[mod].mount(state);
    }
    if (G.compareView) G.compareView.mount($('view-compare'), state);

    function renderLayout() {
      const s = state.get();
      const hasRuns = Object.keys(s.runs).length > 0;
      $('empty-state').hidden = hasRuns;
      $('view-single').hidden = !hasRuns || s.view !== 'single';
      $('view-compare').hidden = !hasRuns || s.view !== 'compare';
      $('storage-banner').hidden = s.storageAvailable;
      for (const [id, view] of [['btn-view-single', 'single'], ['btn-view-compare', 'compare']]) {
        $(id).classList.toggle('is-active', s.view === view);
        $(id).setAttribute('aria-pressed', String(s.view === view));
      }
    }
    $('btn-view-single').addEventListener('click', () => state.set({ view: 'single' }));
    $('btn-view-compare').addEventListener('click', () => state.set({ view: 'compare' }));
    $('file-input').addEventListener('change', async (e) => {
      await importFiles(Array.from(e.target.files));
      e.target.value = '';
    });

    // Drag & Drop
    let dragDepth = 0;
    const overlay = $('drop-overlay');
    document.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
      dragDepth++;
      overlay.hidden = false;
    });
    document.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) overlay.hidden = true;
    });
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      overlay.hidden = true;
      const files = Array.from(e.dataTransfer ? e.dataTransfer.files : []).filter((f) => /\.gpx$/i.test(f.name));
      if (files.length) importFiles(files);
    });

    // Export und Import
    $('btn-export').addEventListener('click', () => {
      const raws = Object.values(state.get().runs).map((r) => r.raw);
      if (!raws.length) {
        G.toast.show('Keine Läufe zum Exportieren.');
        return;
      }
      const now = Date.now();
      const blob = new Blob([G.backup.exportJson(raws, now)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = G.backup.exportFileName(now);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    $('btn-import').addEventListener('click', () => $('import-input').click());
    $('import-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      let imported;
      try {
        imported = G.backup.parseImport(await file.text());
      } catch (err) {
        G.toast.show('Die Sicherungsdatei ist ungültig. Es wurde nichts geändert.', 'error');
        return;
      }
      const known = Object.values(state.get().runs).map((r) => r.raw);
      const added = {};
      let skipped = 0;
      for (const raw of imported) {
        if (G.backup.isDuplicate(raw, known)) {
          skipped++;
          continue;
        }
        try {
          added[raw.id] = analyze(raw);
        } catch (err) {
          skipped++;
          continue;
        }
        await storage.put(raw);
        known.push(raw);
      }
      const n = Object.keys(added).length;
      G.toast.show(n + ' Läufe importiert, ' + skipped + ' bereits vorhanden.');
      if (n) {
        const s = state.get();
        state.set({ runs: { ...s.runs, ...added }, compareRunIds: s.compareRunIds.concat(Object.keys(added)) });
      }
    });

    document.body.dataset.ready = 'true';
  }

  G.app = { start };
  document.addEventListener('DOMContentLoaded', () => {
    start().catch((e) => {
      console.error(e);
      G.toast.show('Die App konnte nicht gestartet werden.', 'error');
    });
  });
})(window);
