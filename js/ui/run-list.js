/* Seitenleiste „Meine Läufe“: Auswahl, Vergleichs-Häkchen, Löschen. */
(function (root) {
  const G = root.GpxApp;

  function mount(el, state, { onDelete }) {
    function render() {
      const s = state.get();
      const runs = Object.values(s.runs).sort((a, b) => b.raw.date - a.raw.date);
      el.innerHTML = '';
      for (const { raw, analysis } of runs) {
        const li = document.createElement('li');
        li.dataset.runId = raw.id;
        li.title = raw.name;
        if (raw.id === s.currentRunId && s.view === 'single') li.classList.add('is-current');

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'run-compare';
        check.checked = s.compareRunIds.includes(raw.id);
        check.setAttribute('aria-label', 'Im Vergleich anzeigen');
        check.addEventListener('change', () => {
          const ids = state.get().compareRunIds.filter((id) => id !== raw.id);
          if (check.checked) ids.push(raw.id);
          state.set({ compareRunIds: ids });
        });

        const sel = document.createElement('button');
        sel.type = 'button';
        sel.className = 'run-select';
        sel.innerHTML = '';
        const date = document.createElement('span');
        date.className = 'run-date';
        date.textContent = G.format.formatDate(raw.date) + ' · ' + G.format.formatDistance(analysis.distanceM);
        const name = document.createElement('span');
        name.className = 'run-name';
        name.textContent = raw.name;
        sel.append(date, name);
        sel.addEventListener('click', () => state.set({ currentRunId: raw.id, view: 'single' }));

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'run-delete';
        del.title = 'Lauf löschen';
        del.setAttribute('aria-label', 'Lauf löschen');
        del.textContent = '×';
        del.addEventListener('click', () => {
          if (root.confirm('Lauf „' + raw.name + '“ löschen?')) onDelete(raw.id);
        });

        li.append(check, sel, del);
        el.appendChild(li);
      }
    }
    function updateChecks() {
      const ids = state.get().compareRunIds;
      el.querySelectorAll('li[data-run-id]').forEach((li) => {
        li.querySelector('.run-compare').checked = ids.includes(li.dataset.runId);
      });
    }

    state.subscribe((s, keys) => {
      if (keys.some((k) => ['runs', 'currentRunId', 'view'].includes(k))) render();
      else if (keys.includes('compareRunIds')) updateChecks(); // in place, damit der Fokus erhalten bleibt
    });
    render();
  }

  (root.GpxApp = root.GpxApp || {}).runList = { mount };
})(window);
