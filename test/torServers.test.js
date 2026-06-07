import assert from 'node:assert/strict';
import test from 'node:test';
import { buildServerData, getPrimaryClass, sampleRelays } from '../torServers.js';

test('buildServerData sorts relays and assigns sequential numbers', () => {
  const servers = buildServerData(sampleRelays, {
    sortBy: 'observed_bandwidth',
    order: 'desc',
    limit: 3
  });

  assert.equal(servers.length, 3);
  assert.deepEqual(servers.map(server => server.no), [1, 2, 3]);
  assert.ok(servers[0].observed_bandwidth >= servers[1].observed_bandwidth);
  assert.ok(servers[1].observed_bandwidth >= servers[2].observed_bandwidth);
});

test('getPrimaryClass prefers exit before other relay roles', () => {
  assert.equal(getPrimaryClass(['Running', 'Exit', 'Guard']), 'exit');
});

test('buildServerData adds DNN role scores', () => {
  const [server] = buildServerData(sampleRelays, { limit: 1 });

  assert.ok(['relay', 'exit', 'guard', 'directory'].includes(server.dnn.predicted_role));
  assert.ok(Number.isFinite(server.dnn.confidence));
  assert.equal(server.dnn.scores.length, 4);
});
