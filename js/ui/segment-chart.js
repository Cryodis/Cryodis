/* Balkendiagramm: Geschwindigkeit je 100-m-Abschnitt in Tempo-Farbe. */
(function (root) {
  const G = root.GpxApp;

  function mount(state) {
    const canvas = document.getElementById('segment-chart');
    let chart = null;
    let renderedRunId = null;

    function create() {
      chart = new root.Chart(canvas, {
        type: 'bar',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: [], paces: [] }] },
        options: {
          animation: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => G.format.formatPace(ctx.dataset.paces[ctx.dataIndex]) + ' /km',
              },
            },
          },
          scales: {
            x: { ticks: { autoSkip: true, maxRotation: 0 }, grid: { display: false } },
            y: { title: { display: true, text: 'km/h' }, beginAtZero: true },
          },
          onClick: (evt) => {
            const hits = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
            if (!hits.length) return;
            const i = hits[0].index;
            const cur = state.get().selectedSegment;
            state.set({ selectedSegment: cur === i ? null : i });
          },
        },
      });
    }

    function renderRun() {
      const s = state.get();
      const run = s.runs[s.currentRunId];
      if (!run) return;
      if (!chart) create();
      if (renderedRunId === run.raw.id) return;
      renderedRunId = run.raw.id;
      const a = run.analysis;
      const ds = chart.data.datasets[0];
      chart.data.labels = a.segments.map((seg) => G.format.segmentLabel(seg.startM, seg.endM));
      ds.data = a.segments.map((seg) => 3600 / seg.paceSPerKm);
      ds.paces = a.segments.map((seg) => seg.paceSPerKm);
      ds.backgroundColor = a.segments.map((seg) => G.colorScale.colorForPace(seg.paceSPerKm, a.fastestPace, a.slowestPace));
      applySelection(false);
      chart.update();
    }

    function applySelection(update = true) {
      if (!chart) return;
      const i = state.get().selectedSegment;
      const ds = chart.data.datasets[0];
      ds.borderWidth = ds.data.map((_, k) => (k === i ? 3 : 0));
      ds.borderColor = ds.data.map(() => '#111111');
      if (update) chart.update();
    }

    state.subscribe((s, keys) => {
      if (keys.includes('currentRunId') || keys.includes('runs')) renderRun();
      else if (keys.includes('selectedSegment')) applySelection();
    });
    renderRun();
  }

  (root.GpxApp = root.GpxApp || {}).segmentChart = { mount };
})(window);
