/* Fehlerklasse mit maschinenlesbarem Code. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GpxApp = root.GpxApp || {}).errors = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  /** Codes: 'invalid-gpx' | 'no-time' | 'too-short' | 'duplicate' | 'invalid-backup' */
  class AppError extends Error {
    constructor(code, message) {
      super(message || code);
      this.name = 'AppError';
      this.code = code;
    }
  }
  return { AppError };
});
