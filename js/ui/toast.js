/* Nicht-blockierende Hinweise am Seitenrand. */
(function (root) {
  const DURATION_MS = 6000;
  function show(message, kind = 'info') {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast toast-' + kind;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), DURATION_MS);
  }
  (root.GpxApp = root.GpxApp || {}).toast = { show };
})(window);
