/* Vergleichsansicht: Tempo-Linien, Vorsprung/Rückstand, Tabelle, Entwicklung. */
(function (root) {
  const G = root.GpxApp;
  const TABS = [
    ['lines', 'Tempo-Linien'],
    ['gaps', 'Vorsprung/Rückstand'],
    ['table', 'Tabelle'],
    ['development', 'Entwicklung'],
  ];
  const NEEDS_TWO = ['lines', 'gaps', 'table'];
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  /** Laufnamen und IDs stammen aus Dateien – vor dem Einfügen als HTML maskieren. */
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESC[c]);

  function mount(el, state) {
    const f = G.format;
    el.innerHTML =
      '<div id="compare-hint" class="empty" hidden>Mindestens zwei Läufe zum Vergleich anhaken.</div>' +
      '<div class="tabs" role="tablist">' +
      TABS.map(([id, label]) => '<button type="button" role="tab" data-tab="' + id + '" aria-selected="false">' + label + '</button>').join('') +
      '</div>' +
      '<div id="compare-legend" class="series-legend"></div>' +
      '<div id="compare-lines" class="card tab-panel chart-panel"><canvas></canvas></div>' +
      '<div id="compare-gaps" class="card tab-panel">' +
      '<label class="panel-control">Referenzlauf <select id="reference-select"></select></label>' +
      '<div class="chart-panel"><canvas></canvas></div></div>' +
      '<div id="compare-table" class="card tab-panel table-panel"><table class="data-table"></table></div>' +
      '<div id="compare-development" class="card tab-panel">' +
      '<label class="panel-control">Anzeigen <select id="dev-metric"><option value="pace">Ø Tempo</option><option value="time">Laufzeit</option></select></label>' +
      '<div class="chart-panel"><canvas></canvas></div></div>';

    const $ = (sel) => el.querySelector(sel);
    const charts = {};
    let devMetric = 'pace';

    el.querySelectorAll('[data-tab]').forEach((btn) =>
      btn.addEventListener('click', () => state.set({ compareTab: btn.dataset.tab }))
    );
    $('#reference-select').addEventListener('change', (e) => state.set({ referenceRunId: e.target.value }));
    $('#dev-metric').addEventListener('change', (e) => {
      devMetric = e.target.value;
      renderDevelopment(compareRuns());
    });
    $('#compare-table table').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-index]');
      if (tr) toggleSelection(Number(tr.dataset.index));
    });

    function toggleSelection(i) {
      const cur = state.get().selectedSegment;
      state.set({ selectedSegment: cur === i ? null : i });
    }

    /** Vergleichsläufe nach Datum, jeweils mit fester Serienfarbe. */
    function compareRuns() {
      const s = state.get();
      return s.compareRunIds
        .map((id) => s.runs[id])
        .sort((a, b) => a.raw.date - b.raw.date)
        .map((r, i) => ({
          id: r.raw.id,
          date: r.raw.date,
          name: r.raw.name,
          label: f.formatDate(r.raw.date) + ' · ' + r.raw.name,
          color: G.colorScale.seriesColor(i),
          analysis: r.analysis,
        }));
    }

    function lineChart(key, canvas, options) {
      if (charts[key]) return charts[key];
      charts[key] = new root.Chart(canvas, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: Object.assign(
          {
            animation: false,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
          },
          options
        ),
      });
      return charts[key];
    }

    function onChartClick(key) {
      return (evt) => {
        const hits = charts[key].getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
        if (hits.length) toggleSelection(hits[0].index);
      };
    }

    const pointRadii = (n) => {
      const sel = state.get().selectedSegment;
      return Array.from({ length: n }, (_, k) => (k === sel ? 6 : 2));
    };

    function renderLines(runs, rows) {
      const chart = lineChart('lines', $('#compare-lines canvas'), {
        onClick: onChartClick('lines'),
        scales: {
          y: { reverse: true, title: { display: true, text: 'Tempo /km' }, ticks: { callback: (v) => f.formatPace(v) } },
          x: { ticks: { autoSkip: true, autoSkipPadding: 24, maxRotation: 0 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + f.formatPace(c.parsed.y) + ' /km' } },
        },
      });
      chart.data.labels = rows.map((r) => f.segmentLabel(r.startM, r.endM));
      chart.data.datasets = runs.map((r) => ({
        label: r.label,
        data: rows.map((row) => row.paces[r.id]),
        borderColor: r.color,
        backgroundColor: r.color,
        pointRadius: pointRadii(rows.length),
        spanGaps: false,
        tension: 0.2,
      }));
      chart.update();
    }

    function renderGaps(runs) {
      const s = state.get();
      const select = $('#reference-select');
      select.innerHTML = runs.map((r) => '<option value="' + esc(r.id) + '">' + esc(r.label) + '</option>').join('');
      select.value = s.referenceRunId || '';
      const ref = runs.find((r) => r.id === s.referenceRunId);
      const chart = lineChart('gaps', $('#compare-gaps canvas'), {
        onClick: onChartClick('gaps'),
        scales: {
          y: { title: { display: true, text: 'Rückstand (+) / Vorsprung (−)' }, ticks: { callback: (v) => f.formatGap(v) } },
          x: { ticks: { autoSkip: true, autoSkipPadding: 24, maxRotation: 0 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + f.formatGap(c.parsed.y) } },
        },
      });
      if (!ref) {
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update();
        return;
      }
      const n = ref.analysis.segments.length;
      chart.data.labels = ref.analysis.segments.map((seg) => Math.round(seg.endM) + ' m');
      chart.data.datasets = runs.map((r) => {
        const data = new Array(n).fill(null);
        if (r.id === ref.id) data.fill(0);
        else G.compare.timeGaps(ref.analysis, r.analysis).forEach((g) => (data[g.boundary - 1] = g.gapS));
        return {
          label: r.id === ref.id ? r.label + ' (Referenz)' : r.label,
          data,
          borderColor: r.color,
          backgroundColor: r.color,
          borderDash: r.id === ref.id ? [6, 4] : [],
          pointRadius: pointRadii(n),
          spanGaps: false,
          tension: 0.2,
        };
      });
      chart.update();
    }

    function renderTable(runs, rows) {
      const head =
        '<thead><tr><th>Abschnitt</th>' +
        runs.map((r) => '<th><span class="dot" style="background:' + r.color + '"></span>' + esc(r.label) + '</th>').join('') +
        '</tr></thead>';
      const body = rows
        .map(
          (row) =>
            '<tr data-index="' + row.index + '"><td>' + f.segmentLabel(row.startM, row.endM) + '</td>' +
            runs
              .map((r) => '<td' + (row.fastestId === r.id ? ' class="is-fastest"' : '') + '>' + f.formatPace(row.paces[r.id]) + '</td>')
              .join('') +
            '</tr>'
        )
        .join('');
      $('#compare-table table').innerHTML = head + '<tbody>' + body + '</tbody>';
      applyTableSelection();
    }

    function renderDevelopment(runs) {
      const metric = devMetric;
      const chart = lineChart('development', $('#compare-development canvas'), {
        interaction: { mode: 'nearest', intersect: true },
        scales: {
          x: { type: 'linear', ticks: { callback: (v) => f.formatDate(v), maxRotation: 0 } },
          y: {},
        },
      });
      const dev = G.compare.development(runs);
      const byId = Object.fromEntries(runs.map((r) => [r.id, r]));
      chart.options.scales.y = {
        reverse: metric === 'pace',
        title: { display: true, text: metric === 'pace' ? 'Ø Tempo /km' : 'Laufzeit' },
        ticks: { callback: (v) => (metric === 'pace' ? f.formatPace(v) : f.formatDuration(v)) },
      };
      chart.options.plugins.tooltip = {
        callbacks: {
          title: (items) => (items.length ? byId[dev[items[0].dataIndex].id].label : ''),
          label: (c) => (metric === 'pace' ? f.formatPace(c.parsed.y) + ' /km' : f.formatDuration(c.parsed.y)),
        },
      };
      chart.data.datasets = [
        {
          label: metric === 'pace' ? 'Ø Tempo' : 'Laufzeit',
          data: dev.map((d) => ({ x: d.date, y: metric === 'pace' ? d.avgPaceSPerKm : d.movingTimeS })),
          borderColor: '#64748b',
          pointBackgroundColor: dev.map((d) => byId[d.id].color),
          pointBorderColor: dev.map((d) => byId[d.id].color),
          pointRadius: 6,
          tension: 0,
        },
      ];
      chart.update();
    }

    function renderLegend(runs) {
      $('#compare-legend').innerHTML = runs
        .map((r) => '<span class="series-item"><span class="dot" style="background:' + r.color + '"></span>' + esc(r.label) + '</span>')
        .join('');
    }

    function applyTableSelection() {
      const i = state.get().selectedSegment;
      el.querySelectorAll('#compare-table tr.is-selected').forEach((tr) => tr.classList.remove('is-selected'));
      if (i === null) return;
      const tr = el.querySelector('#compare-table tr[data-index="' + i + '"]');
      if (tr) {
        tr.classList.add('is-selected');
        tr.scrollIntoView({ block: 'nearest' });
      }
    }

    function applySelection() {
      for (const key of ['lines', 'gaps']) {
        const chart = charts[key];
        if (!chart) continue;
        chart.data.datasets.forEach((ds) => (ds.pointRadius = pointRadii(ds.data.length)));
        chart.update();
      }
      applyTableSelection();
    }

    function showTab() {
      const s = state.get();
      const enough = s.compareRunIds.length >= 2;
      const tab = s.compareTab;
      $('#compare-hint').hidden = enough;
      el.querySelectorAll('[data-tab]').forEach((btn) => {
        btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
        btn.classList.toggle('is-active', btn.dataset.tab === tab);
      });
      for (const [id] of TABS) {
        const visible = id === tab && (enough || !NEEDS_TWO.includes(id)) && s.compareRunIds.length >= 1;
        $('#compare-' + id).hidden = !visible;
      }
      $('#compare-legend').hidden = s.compareRunIds.length === 0;
    }

    function renderAll() {
      if (state.get().view !== 'compare') return;
      const runs = compareRuns();
      const { rows } = G.compare.alignSegments(runs);
      showTab();
      renderLegend(runs);
      renderLines(runs, rows);
      renderGaps(runs);
      renderTable(runs, rows);
      renderDevelopment(runs);
    }

    state.subscribe((s, keys) => {
      if (s.view !== 'compare') return;
      if (keys.some((k) => ['view', 'runs', 'compareRunIds', 'referenceRunId'].includes(k))) renderAll();
      else if (keys.includes('compareTab')) showTab();
      if (keys.includes('selectedSegment')) applySelection();
    });
    renderAll();
  }

  (root.GpxApp = root.GpxApp || {}).compareView = { mount };
})(window);
