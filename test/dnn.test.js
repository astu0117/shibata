const assert = require('node:assert/strict');
const test = require('node:test');
const { DNN } = require('../dnn');

test('feedForward returns one probability per output node', () => {
  const nn = new DNN([3, 4, 2]);
  const prediction = nn.feedForward([0.1, 0.2, 0.3]);

  assert.equal(prediction.length, 2);
  assert.ok(prediction.every(Number.isFinite));
});

test('feedForward softmax output sums to 1', () => {
  const nn = new DNN([3, 4, 4]);
  const prediction = nn.feedForward([0.5, 0.25, 0]);
  const total = prediction.reduce((sum, value) => sum + value, 0);

  assert.ok(Math.abs(total - 1) < 1e-10);
});

test('train returns a finite non-negative loss', () => {
  const nn = new DNN([3, 4, 2], 0.01, 0.5);
  const loss = nn.train([0.1, 0.2, 0.3], [1, 0]);

  assert.ok(Number.isFinite(loss));
  assert.ok(loss >= 0);
});
