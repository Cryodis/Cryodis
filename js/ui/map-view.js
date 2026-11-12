/* Leaflet-Karte: Abschnitte in Tempo-Farbe, Pausen-Punkte, Offline-Rückfall. */
(function (root) {
  const G = root.GpxApp;
  const L = root.L;

  function mount(state) {
    const el = document.getElementById('map');
    const note = document.getElementById('map-offline-note');
    let map = null;
    let tiles = null;
    let layerGroup = null;
    let segLayers = [];
    let renderedRunId = null;
    let selected = null;

    function ensureMap() {
      if (map) return;
      map = L.map(el, { zoomControl: true });
      tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap-Mitwirkende',
      });
      tiles.once('tileerror', () => {
        map.removeLayer(tiles);
        el.classList.add('map-offline');
        note.hidden = false;
      });
      tiles.addTo(map);
      layerGroup = L.layerGroup().addTo(map);
    }

    function setLayerSelected(i, on) {
      const layer = segLayers[i];
      if (!layer) return;
      layer.setStyle({ weight: on ? 9 : 5 });
      const path = layer.getElement();
      if (path) path.classList.toggle('is-selected', on);
      if (on) layer.bringToFront();
    }

    function renderRun() {
      const s = state.get();
      const run = s.runs[s.currentRunId];
      if (!run || el.offsetParent === null) return;
      ensureMap();
      map.invalidateSize();
      if (renderedRunId === run.raw.id) return;
      renderedRunId = run.raw.id;
      selected = null;
      layerGroup.clearLayers();
      const a = run.analysis;
      segLayers = a.segments.map((seg) => {
        const color = G.colorScale.colorForPace(seg.paceSPerKm, a.fastestPace, a.slowestPace);
        const line = L.polyline(seg.coords, { color, weight: 5, opacity: 0.95, className: 'seg seg-' + seg.index });
        line.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          const cur = state.get().selectedSegment;
          state.set({ selectedSegment: cur === seg.index ? null : seg.index });
        });
        line.bindTooltip(G.format.segmentLabel(seg.startM, seg.endM) + ' · ' + G.format.formatPace(seg.paceSPerKm) + ' /km', { sticky: true });
        line.addTo(layerGroup);
        return line;
      });
      for (const p of a.pauses) {
        L.circleMarker([p.lat, p.lon], { radius: 7, color: '#111', weight: 2, fillColor: '#ffffff', fillOpacity: 1, className: 'pause-marker' })
          .bindTooltip('Pause ' + G.format.formatDuration(p.durationS))
          .addTo(layerGroup);
      }
      const all = a.segments.flatMap((s) => s.coords);
      if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [20, 20] });
      renderSelection();
    }

    function renderSelection() {
      const i = state.get().selectedSegment;
      if (selected !== null) setLayerSelected(selected, false);
      selected = i;
      if (i === null || !segLayers[i]) return;
      setLayerSelected(i, true);
      map.panTo(segLayers[i].getBounds().getCenter());
    }

    state.subscribe((s, keys) => {
      if (keys.some((k) => ['currentRunId', 'runs', 'view'].includes(k))) renderRun();
      if (keys.includes('selectedSegment') && map && renderedRunId === s.currentRunId) renderSelection();
    });
    renderRun();
  }

  (root.GpxApp = root.GpxApp || {}).mapView = { mount };
})(window);
