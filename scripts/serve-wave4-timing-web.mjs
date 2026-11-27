// Local acceptance host for signed native timing prefixes. Uses the existing
// product Web bundle and Room HTTP adapter; never registers a production setup.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TimingInputs, bindWave4TimingRoom } from './support/wave4-timing-room-v1.mjs';
import { createStarcraftTmgLevel3HttpAdapter } from '../packages/http-adapter/handler-v1.mjs';
import { createRosterWorkspaceServerV1 } from './serve-ticket-27-slice-271-roster-workspace-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => process.argv.find(v => v.startsWith('--' + name + '='))?.slice(name.length + 3);
const allowedRoot = path.join(root, 'build/wave4-web') + path.sep;
const scopedPath = value => {
  assert.equal(typeof value, 'string', 'WAVE4_RUN_ARGUMENT_REQUIRED');
  const p = path.resolve(value); assert.ok(p.startsWith(allowedRoot), 'WAVE4_ISOLATED_PATH_REQUIRED'); return p;
};
const armourRun = scopedPath(arg('armour-run'));
const otherRun = scopedPath(arg('other-run'));
const directory = scopedPath(arg('data-directory'));
await fs.mkdir(directory, { recursive: true });
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const armour = await read(path.join(armourRun, 'result.public.json'));
const other = await read(path.join(otherRun, 'result.public.json'));
assert.equal(armour.status, 'passed'); assert.equal(other.status, 'passed');
const inputs = await loadWave4TimingInputs(root);
assert.equal(inputs.inventory.denominator.sourceHeldDefinitions, 39);
const options = { observer: { includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includeReleaseOverseerChargeReaction: true },
  overseer: { includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includeReleaseOverseerChargeReaction: true },
  'veil-of-shadows': { includeMelee: false, includeArmourReactions: false,
    sourceDefinitionIds: ['card:twilight_council/veil-of-shadows-any@2', 'unit:stalker/blink-movement-phase@1'] },
  'brood-instinct': { includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includeMelee: false, includeBeforeRangedEvadeReaction: true } };
const rooms = new Map();
const service = { liveEnabled: false, scope: 'signed native prefixes; existing product Web UI; conditional scenes', rooms: [] };
const reply = (response, status = 200) => ({ status, headers: { 'content-type': 'application/json' }, response });
for (const proof of [...armour.results, ...new Map(other.results.filter(r => r.branch === 'use').map(r => [r.definitionId, r])).values()]) {
  const record = proof.definitionId.split('/')[0].split(':')[1];
  const kind = proof.kind || record;
  assert.ok(inputs.inventory.timingReactionDefinitionIds.includes(proof.definitionId), 'REVIEWED_TIMING_DEFINITION_REQUIRED');
  assert.match(kind, /^[a-z0-9_-]+$/u);
  let sourceDirectory = path.join(armourRun, record);
  const runtimeOptions = options[kind] || {};
  if (proof.kind) {
    sourceDirectory = path.join(otherRun, kind + '-use-' + proof.caseHash.slice(0, 8));
    try { await fs.access(sourceDirectory); } catch { sourceDirectory = path.join(otherRun, kind + '-use'); }
  }
  const sourceAuthority = await read(path.join(sourceDirectory, 'authority.json'));
  const source = await bindWave4TimingRoom({ inputs, state: sourceAuthority.state, definitionId: proof.definitionId,
    directory: path.join(directory, 'source-bindings', kind), runtimeOptions });
  // The source SQLite is opened only for read/replay. No source Room is advanced.
  const sourceRoom = openWave3EngineeringRoomV1({ directory: sourceDirectory, filename: 'room.sqlite', readOnly: true,
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: source.context, runtime: source.runtime }) });
  let prefix, prefixReceipts;
  try {
    await sourceRoom.restoreDependencies(proof.roomId, sourceAuthority);
    const bundle = await sourceRoom.store.loadReplayBundle(proof.roomId);
    const receipts = bundle.privateJournal.filter(r => r.payload.type === 'accepted_transition').map(r => r.payload.payload.receipt);
    for (let count = 1; count <= receipts.length; count++) {
      const replay = sourceRoom.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, count) });
      assert.equal(replay.ok, true);
      const s = replay.envelope.state;
      if (source.runtime.enumerate(s).parameterDomains.some(d => d.definitionId === proof.definitionId || d.sourceDomain?.definitionId === proof.definitionId)) {
        prefix = replay.envelope; prefixReceipts = count; break;
      }
    }
  } finally { sourceRoom.close(); }
  assert.ok(prefix, 'SIGNED_NATIVE_PREFIX_REQUIRED:' + proof.definitionId);
  const roomId = 'product-wave4-web-' + kind;
  const bound = await bindWave4TimingRoom({ inputs, state: prefix.state, definitionId: proof.definitionId,
    directory: path.join(directory, 'rooms', kind), runtimeOptions, humanConfirmed: true,
    scenario: { kind: 'web_acceptance_of_signed_native_prefix', sourceRoomId: proof.roomId,
      sourceStateHash: prefix.stateHash, sourceBindingHash: prefix.matchBindingHash, sourcePrefixReceipts: prefixReceipts } });
  const native = bound.open();
  const credentials = await native.create(roomId, bound.authority, { matchId: roomId + '-v1' });
  const adapter = createStarcraftTmgLevel3HttpAdapter({ roomRuntime: native.room, assetRoot: root });
  const item = { native, adapter, credentials, definitionId: proof.definitionId, kind, roomId };
  rooms.set(roomId, item);
  const links = {};
  for (const side of ['player1', 'player2']) {
    const issued = await native.room.issueSeatRecovery({ roomId, seatToken: credentials[side].seatToken });
    assert.equal(issued.ok, true); links[side] = '/room/' + roomId + '#recovery=' + encodeURIComponent(issued.recovery.recoveryToken);
  }
  service.rooms.push({ roomId, kind, definitionId: proof.definitionId, links, sourcePrefixReceipts: prefixReceipts,
    sourceRoomId: proof.roomId, sourceStateHash: prefix.stateHash, sourceBindingHash: prefix.matchBindingHash });
}
const server = await createRosterWorkspaceServerV1({ root, webRoot: path.join(root, 'apps/starcraft-tmg-expo/dist-product'),
  dataDirectory: directory, lazyWorkspace: true, liveEnabled: false, port: 5484,
  productHandler: async request => {
    const roomId = request.pathname.match(/\/rooms\/([^/]+)/)?.[1];
    const item = rooms.get(roomId);
    if (request.pathname.endsWith('/product/v1/catalogue')) return reply({ ok: true, presets: [], setups: [], modes: ['human_vs_human'], map: {} });
    if (request.pathname.endsWith('/product/v1/rooms')) return reply({ ok: true, rooms: [] });
    if (!item) return request.pathname.startsWith('/starcraft-tmg-level3/') || request.pathname.startsWith('/__')
      ? reply({ ok: false, reason: 'OFFLINE_TIMING_SCOPE_ONLY' }, 404) : null;
    if (request.pathname.endsWith('/revision')) {
      const current = await item.native.store.loadRoom(roomId);
      return reply({ ok: true, roomId, stateRevision: current.stateRevision, stateHash: current.envelope.stateHash });
    }
    if (request.pathname.endsWith('/provider-key')) return request.method === 'GET'
      ? reply({ ok: true, provider: { configured: false, usedFor: [], liveEnabled: false } })
      : reply({ ok: false, reason: 'LIVE_PROVIDER_DISABLED' }, 409);
    if (request.pathname.startsWith('/starcraft-tmg-level3/api/v1/')) return item.adapter.handle(request);
    return reply({ ok: false, reason: 'OFFLINE_TIMING_SCOPE_ONLY' }, 404);
  } });
service.origin = server.origin;
service.url = server.origin + '/match';
await atomicWrite(path.join(directory, 'service.private.json'), JSON.stringify(service, null, 2));
console.log(JSON.stringify({ origin: server.origin, rooms: rooms.size, liveEnabled: false, directory }));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void server.close().finally(() => {
  for (const item of rooms.values()) item.native.close(); process.exit(0);
}));
