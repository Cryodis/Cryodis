const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../../js/core/color-scale.js');

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test('Endfarben der Skala', () => {
  assert.equal(c.SLOW_COLOR, '#1e3a8a');
  assert.equal(c.FAST_COLOR, '#ff4d4d');
  assert.equal(c.colorForPace(330, 300, 330), '#1e3a8a');
  assert.equal(c.colorForPace(300, 300, 330), '#ff4d4d');
});

test('Werte dazwischen liegen kanalweise zwischen den Endfarben', () => {
  const mid = rgb(c.colorForPace(315, 300, 330));
  const slow = rgb('#1e3a8a');
  const fast = rgb('#ff4d4d');
  mid.forEach((v, i) => {
    assert.ok(v >= Math.min(slow[i], fast[i]) && v <= Math.max(slow[i], fast[i]));
  });
  assert.notEqual(c.colorForPace(315, 300, 330), '#1e3a8a');
});

test('Werte außerhalb werden geklemmt', () => {
  assert.equal(c.colorForPace(400, 300, 330), '#1e3a8a');
  assert.equal(c.colorForPace(250, 300, 330), '#ff4d4d');
});

test('gleiche Tempi ergeben die Mittelfarbe', () => {
  assert.equal(c.colorForPace(300, 300, 300), '#8f446c');
});

test('Serienfarben', () => {
  assert.equal(c.SERIES_COLORS.length, 8);
  assert.equal(new Set(c.SERIES_COLORS).size, 8);
  assert.ok(!c.SERIES_COLORS.includes('#1e3a8a') && !c.SERIES_COLORS.includes('#ff4d4d'));
  assert.equal(c.seriesColor(0), c.SERIES_COLORS[0]);
  assert.equal(c.seriesColor(9), c.SERIES_COLORS[1]);
});
