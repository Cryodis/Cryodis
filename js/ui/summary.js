/* Kennzahlen-Leiste und Farblegende der Einzelansicht. */
(function (root) {
  const G = root.GpxApp;

  function item(label, value, sub) {
    const el = document.createElement('div');
    el.className = 'kpi';
    const l = document.createElement('div');
    l.className = 'kpi-label';
    l.textContent = label;
    const v = document.createElement('div');
    v.className = 'kpi-value';
    v.textContent = value;
    el.append(l, v);
    if (sub) {
      const s = document.createElement('div');
      s.className = 'kpi-sub';
      s.textContent = sub;
      el.appendChild(s);
    }
    return el;
  }

  function mount(state) {
    const box = document.getElementById('summary');
    const legend = document.getElementById('legend');
    const f = G.format;

    function render() {
      const s = state.get();
      const run = s.runs[s.currentRunId];
      box.innerHTML = '';
      legend.innerHTML = '';
      if (!run) return;
      const a = run.analysis;
      const segLabel = (i) => f.segmentLabel(a.segments[i].startM, a.segments[i].endM);

      const title = document.createElement('div');
      title.className = 'run-title';
      title.textContent = run.raw.name + ' · ' + f.formatDate(run.raw.date);
      box.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'kpis';
      grid.append(
        item('Distanz', f.formatDistance(a.distanceM)),
        item('Laufzeit', f.formatDuration(a.movingTimeS)),
        item('Ø Tempo', f.formatPace(a.avgPaceSPerKm) + ' /km'),
        item('Schnellster 100 m', f.formatPace(a.fastestPace) + ' /km', a.fastestIndex == null ? '' : segLabel(a.fastestIndex)),
        item('Langsamster 100 m', f.formatPace(a.slowestPace) + ' /km', a.slowestIndex == null ? '' : segLabel(a.slowestIndex)),
        item('Pausen', String(a.pauses.length), a.pauses.length ? f.formatDuration(a.totalPauseS) + ' gesamt' : '')
      );
      box.appendChild(grid);

      const slow = document.createElement('span');
      slow.textContent = 'langsam ' + f.formatPace(a.slowestPace) + ' /km';
      const bar = document.createElement('span');
      bar.className = 'legend-bar';
      bar.style.background = 'linear-gradient(to right, ' + G.colorScale.SLOW_COLOR + ', ' + G.colorScale.FAST_COLOR + ')';
      const fast = document.createElement('span');
      fast.textContent = f.formatPace(a.fastestPace) + ' /km schnell';
      legend.append(slow, bar, fast);
    }

    state.subscribe((s, keys) => {
      if (keys.includes('currentRunId') || keys.includes('runs')) render();
    });
    render();
  }

  (root.GpxApp = root.GpxApp || {}).summary = { mount };
})(window);
