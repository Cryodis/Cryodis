/* Tabelle der 100-m-Abschnitte mit Zeit und Tempo. */
(function (root) {
  const G = root.GpxApp;

  function mount(state) {
    const table = document.getElementById('segment-table');
    let renderedRunId = null;

    table.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-index]');
      if (!tr) return;
      const i = Number(tr.dataset.index);
      const cur = state.get().selectedSegment;
      state.set({ selectedSegment: cur === i ? null : i });
    });

    function renderRun() {
      const s = state.get();
      const run = s.runs[s.currentRunId];
      if (!run || renderedRunId === run.raw.id) return;
      renderedRunId = run.raw.id;
      const a = run.analysis;
      const f = G.format;
      const rows = a.segments
        .map((seg) => {
          const color = G.colorScale.colorForPace(seg.paceSPerKm, a.fastestPace, a.slowestPace);
          const label = f.segmentLabel(seg.startM, seg.endM) + (seg.partial ? ' (Rest)' : '');
          return (
            '<tr data-index="' + seg.index + '" style="--seg-color:' + color + '">' +
            '<td><span class="swatch"></span>' + label + '</td>' +
            '<td>' + f.formatDuration(seg.timeS) + '</td>' +
            '<td>' + f.formatPace(seg.paceSPerKm) + '</td></tr>'
          );
        })
        .join('');
      table.innerHTML = '<thead><tr><th>Abschnitt</th><th>Zeit</th><th>Tempo /km</th></tr></thead><tbody>' + rows + '</tbody>';
      applySelection();
    }

    function applySelection() {
      const i = state.get().selectedSegment;
      table.querySelectorAll('tr.is-selected').forEach((tr) => tr.classList.remove('is-selected'));
      if (i === null) return;
      const tr = table.querySelector('tr[data-index="' + i + '"]');
      if (tr) {
        tr.classList.add('is-selected');
        tr.scrollIntoView({ block: 'nearest' });
      }
    }

    state.subscribe((s, keys) => {
      if (keys.includes('currentRunId') || keys.includes('runs')) renderRun();
      if (keys.includes('selectedSegment')) applySelection();
    });
    renderRun();
  }

  (root.GpxApp = root.GpxApp || {}).segmentTable = { mount };
})(window);
