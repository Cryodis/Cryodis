// Kopiert die Browser-Bibliotheken aus node_modules nach vendor/ (wird eingecheckt).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const nm = path.join(root, 'node_modules');
const vendor = path.join(root, 'vendor');

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

copy(path.join(nm, 'leaflet/dist/leaflet.js'), path.join(vendor, 'leaflet/leaflet.js'));
copy(path.join(nm, 'leaflet/dist/leaflet.css'), path.join(vendor, 'leaflet/leaflet.css'));
copy(path.join(nm, 'leaflet/dist/images'), path.join(vendor, 'leaflet/images'));
copy(path.join(nm, 'chart.js/dist/chart.umd.js'), path.join(vendor, 'chart.js/chart.umd.js'));
console.log('vendor aktualisiert');
