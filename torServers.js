import axios from 'axios';
import { DNN } from './dnn.js';

const TOR_DETAILS_URL = 'https://onionoo.torproject.org/details?running=true&type=relay';

export const sampleRelays = [
  { nickname: 'AlphaRelay', fingerprint: 'A'.repeat(40), country: 'de', flags: ['Fast', 'Guard', 'Running', 'Stable'], observed_bandwidth: 12000000, advertised_bandwidth: 15000000, last_restarted: '2026-05-20 00:00:00' },
  { nickname: 'ExitNodeOne', fingerprint: 'B'.repeat(40), country: 'nl', flags: ['Exit', 'Fast', 'Running', 'Valid'], observed_bandwidth: 25000000, advertised_bandwidth: 30000000, last_restarted: '2026-05-15 00:00:00' },
  { nickname: 'DirectoryHub', fingerprint: 'C'.repeat(40), country: 'us', flags: ['Authority', 'Fast', 'Running', 'V2Dir'], observed_bandwidth: 18000000, advertised_bandwidth: 22000000, last_restarted: '2026-05-01 00:00:00' },
  { nickname: 'MiddleRelay', fingerprint: 'D'.repeat(40), country: 'jp', flags: ['Fast', 'Running', 'Stable'], observed_bandwidth: 9000000, advertised_bandwidth: 11000000, last_restarted: '2026-05-25 00:00:00' }
];

export function getPrimaryClass(flags = []) {
  if (flags.includes('Exit')) return 'exit';
  if (flags.includes('Guard')) return 'guard';
  if (flags.includes('Authority') || flags.includes('V2Dir')) return 'directory';
  return 'relay';
}

function uptimeDays(lastRestarted) {
  if (!lastRestarted) return 0;
  const restarted = new Date(`${lastRestarted.replace(' ', 'T')}Z`);
  if (Number.isNaN(restarted.getTime())) return 0;
  return Math.max(0, (Date.now() - restarted.getTime()) / 86400000);
}

export function normalizeRelay(relay) {
  const observed = Number(relay.observed_bandwidth || 0);
  const advertised = Number(relay.advertised_bandwidth || 0);
  const days = uptimeDays(relay.last_restarted);
  const flags = Array.isArray(relay.flags) ? relay.flags : [];
  const flagScore = ['Fast', 'Stable', 'Guard', 'Exit', 'V2Dir', 'Authority']
    .reduce((sum, flag) => sum + (flags.includes(flag) ? 1 : 0), 0);

  return [
    Math.min(observed / 50000000, 1),
    Math.min(advertised / 50000000, 1),
    Math.min(days / 365, 1),
    flagScore / 6
  ];
}

export function sortRelays(relays, sortBy = 'observed_bandwidth', order = 'desc') {
  const direction = order === 'asc' ? 1 : -1;
  return [...relays].sort((a, b) => {
    const left = a[sortBy] || 0;
    const right = b[sortBy] || 0;
    if (typeof left === 'string' || typeof right === 'string') {
      return String(left).localeCompare(String(right)) * direction;
    }
    return (Number(left) - Number(right)) * direction;
  });
}

function createTorDNN() {
  const labels = ['relay', 'exit', 'guard', 'directory'];
  const nn = new DNN([4, 12, 8, labels.length], 0.01, 0.5);

  for (let epoch = 0; epoch < 1200; epoch++) {
    for (const relay of sampleRelays) {
      const target = new Array(labels.length).fill(0);
      target[labels.indexOf(getPrimaryClass(relay.flags))] = 1;
      nn.train(normalizeRelay(relay), target);
    }
  }

  return { nn, labels };
}

let cachedTorDNN;

function getTorDNN() {
  if (!cachedTorDNN) cachedTorDNN = createTorDNN();
  return cachedTorDNN;
}

function scoreRelay(relay) {
  const { nn, labels } = getTorDNN();
  const scores = nn.feedForward(normalizeRelay(relay));
  const maxIdx = scores.indexOf(Math.max(...scores));
  return {
    predicted_role: labels[maxIdx],
    confidence: Number(scores[maxIdx].toFixed(6)),
    scores
  };
}

export function buildServerData(relays, options = {}) {
  const sortBy = options.sortBy || 'observed_bandwidth';
  const order = options.order || 'desc';
  const limit = Math.max(1, Math.min(Number(options.limit || 25), 100));

  return sortRelays(relays, sortBy, order)
    .slice(0, limit)
    .map((relay, index) => ({
      no: index + 1,
      nickname: relay.nickname || 'unknown',
      fingerprint: relay.fingerprint || '',
      country: relay.country || 'unknown',
      flags: Array.isArray(relay.flags) ? relay.flags : [],
      observed_bandwidth: Number(relay.observed_bandwidth || 0),
      advertised_bandwidth: Number(relay.advertised_bandwidth || 0),
      last_restarted: relay.last_restarted || null,
      primary_role: getPrimaryClass(relay.flags || []),
      dnn: scoreRelay(relay)
    }));
}

async function fetchTorRelays() {
  const response = await axios.get(TOR_DETAILS_URL, { timeout: 10000 });
  return Array.isArray(response.data.relays) ? response.data.relays : [];
}

export async function getTorServers(options = {}) {
  try {
    const relays = await fetchTorRelays();
    return {
      source: TOR_DETAILS_URL,
      fallback: false,
      total: relays.length,
      servers: buildServerData(relays, options)
    };
  } catch (error) {
    return {
      source: 'sample',
      fallback: true,
      error: error.message,
      total: sampleRelays.length,
      servers: buildServerData(sampleRelays, options)
    };
  }
}
