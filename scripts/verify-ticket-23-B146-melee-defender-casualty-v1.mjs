// Reproduce the actual B146 paid fight that fails before defender-owned selection.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { createStarcraftTmgPrivatePayloadCodec } from '../packages/room-store/room-store-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { queryOfficialSelectedRosterMeleeActionV1 } from '../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [root, directory, reportPath] = process.argv.slice(2);
assert(root && directory && reportPath);
assert(!path.resolve(reportPath).startsWith(path.resolve(directory) + path.sep));
const report = { schemaVersion: 'ticket23_B146_melee_defender_casualty_regression_v1',
  providerCalls: 0, originalRoomWrites: 0, sourceRefresh: false,
  originalDiceRerolled: false, isolatedFixtureDice: true };
const json = async file => JSON.parse(await readFile(file, 'utf8'));
function payload(dir, id, field) {
  const db = new DatabaseSync(path.join(dir, 'room.sqlite'), { readOnly: true });
  try { return db.prepare(`SELECT ${field} FROM sc_rooms WHERE room_id=?`).get(id)[field]; }
  finally { db.close(); }
}
function decode(cipher, owner, aad) {
  return createStarcraftTmgPrivatePayloadCodec({ key: owner.storeEncryptionKeyBase64,
    keyId: JSON.parse(cipher).keyId }).decode(cipher, aad);
}
function paidChoice(dir) {
  const db = new DatabaseSync(path.join(dir, 'seats/player2/provider/live-decisions.sqlite'), { readOnly: true });
  let wrapper;
  try { wrapper = JSON.parse(db.prepare('SELECT record_json FROM sc_live_decision_records').get().record_json); }
  finally { db.close(); }
  const bytes = Buffer.from(wrapper.payload, 'base64'), header = bytes.subarray(0, 10), offsets = [];
  for (let i = bytes.indexOf(header); i >= 0; i = bytes.indexOf(header, i + 1)) offsets.push(i);
  return Object.values(JSON.parse('{' + gunzipSync(bytes.subarray(offsets.at(-2), offsets.at(-1)),
    { maxOutputLength: 32 * 1024 * 1024 }).toString('utf8') + '}'))[0];
}
try {
  const owner = await json(path.join(directory, 'runner-private.json'));
  const aggregate = decode(payload(directory, owner.roomId, 'aggregate_cipher'), owner,
    'room:' + owner.roomId + ':aggregate');
  const state = aggregate.envelope.state, before = JSON.stringify(state), choice = paidChoice(directory);
  assert.equal(aggregate.stateRevision, 146);
  assert.equal(choice.authority.stateHash, hash(state));
  const submitted = choice.attempts[choice.attemptKeys.at(-1)].safeOutput;
  const parameters = JSON.parse(submitted.selection.parametersJson);
  assert.equal(parameters.allocations[0].dice, 6);
  assert.equal(parameters.surgeTargetUnitId, parameters.allocations[0].targetUnitId);
  let initialDir = directory, initialId = aggregate.roomId;
  for (let depth = 0; depth < 8; depth++) {
    const fork = await json(path.join(initialDir, 'fork-private.json')).catch(e => {
      if (e.code === 'ENOENT') return null; throw e;
    });
    if (!fork) break;
    assert.equal(fork.targetRoomId, initialId);
    initialDir = fork.sourceDirectory; initialId = fork.sourceRoomId;
    assert(depth < 7);
  }
  const initialOwner = await json(path.join(initialDir, 'runner-private.json'));
  const initial = decode(payload(initialDir, initialId, 'initial_envelope_cipher'), initialOwner,
    'room:' + initialId + ':initial-envelope');
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root:
    await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }) });
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: frozen.dataset, state: initial.state }) });
  assert.equal(runtime.descriptor.runtimeHash, aggregate.envelope.matchBinding.rulesRuntimeBinding.runtimeHash);
  const domain = runtime.enumerate(state, { sideKey: 'player2' }).parameterDomains.find(d =>
    d.actionType === 'fight' && d.pieceId === 'player2-kerrigan-raptor');
  assert(domain);
  const attack = runtime.instantiate(state, domain, parameters).action;
  const source = attack.sourceAction || attack, plan = source.meleePlan.fightChancePlan;
  const rolls = plan.targets.flatMap(t => [
    ...Array(t.layout.hit).fill(6), ...Array(t.layout.surge).fill(2),
    ...Array(t.layout.armour).fill(6), ...Array(t.layout.evade).fill(1),
  ]);
  const revealed = queryOfficialSelectedRosterMeleeActionV1({ state, request: {
    queryKind: 'resolve_chance_and_casualty_domains', domainId: source.meleePlan.domainId,
    sideKey: 'player2', parameters, chanceReveals: rolls,
  } });
  const loss = revealed.result.casualtyDomains.find(d => d.legalSelectionCount > 1);
  assert(loss, 'the real six-dice fight must have multiple legal removals in the fixture');
  Object.assign(report, { roomId: owner.roomId, revision: 146, stateHash: hash(state),
    attackHash: hash(attack), rolls, casualtyCount: loss.casualtyCount,
    legalSelectionCount: loss.legalSelectionCount });
  const opened = runtime.apply(state, attack, { chanceReveals: rolls, postRevision: 147 });
  assert.equal(opened.state.activeSideKey, 'player1');
  assert.equal(opened.state.pendingAction?.stage, 'defender_casualty_selection');
  assert.equal(opened.state.pieces.find(p => p.id === parameters.allocations[0].targetUnitId).currentModels,
    state.pieces.find(p => p.id === parameters.allocations[0].targetUnitId).currentModels);
  assert.deepEqual(opened.state.pendingAction.chanceReveals, rolls);
  assert.equal(opened.state.pieces.find(p => p.id === source.pieceId).activatedPhases.combat,
    state.pieces.find(p => p.id === source.pieceId).activatedPhases.combat);
  assert.equal(runtime.enumerate(opened.state, { sideKey: 'player2' }).parameterDomains.length, 0);
  const defender = runtime.enumerate(opened.state, { sideKey: 'player1' }).parameterDomains;
  assert.equal(defender.length, 1);
  const removal = defender[0];
  assert.equal(removal.parameterKind, 'official_selected_roster_melee_casualty_selection_v1');
  assert.equal(removal.constraints.defenderOwnsSelection, true);
  assert.equal(removal.constraints.strategicLossOptions.length, loss.legalSelections.length);
  const selection = { casualtySelectionHash: removal.constraints.legalSelections[0].selectionHash };
  assert.throws(() => runtime.instantiate(opened.state, removal,
    { casualtySelectionHash: 'wrong-selection' }));
  const resolve = runtime.instantiate(opened.state, removal, selection).action;
  const settled = runtime.apply(opened.state, resolve, { postRevision: 148 });
  assert.equal(settled.state.pendingAction, undefined);
  const damage = settled.events.find(e => e.type === 'close_combat_attack');
  assert(damage);
  assert.deepEqual(damage.casualtyModelIds, loss.legalSelections[0].casualtyModelIds);
  assert.deepEqual(damage.stages.hitRolls, revealed.result.resolutions[0].hitRolls);
  assert.equal(settled.state.pieces.find(p => p.id === source.pieceId).activatedPhases.combat, true);
  assert.equal(settled.state.pieces.find(p => p.id === parameters.allocations[0].targetUnitId).activatedPhases.combat,
    state.pieces.find(p => p.id === parameters.allocations[0].targetUnitId).activatedPhases.combat);
  assert.equal(JSON.stringify(state), before);
  Object.assign(report, { ok: true, defenderDomainId: removal.domainId,
    casualtyModelIds: damage.casualtyModelIds, originalInputUnchanged: true,
    isolatedApplyCount: 2, nativeDamageAndSupplySettlement: true });
} catch (error) {
  Object.assign(report, { ok: false, error: { name: error.name, message: error.message } });
  process.exitCode = 1;
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(report));
