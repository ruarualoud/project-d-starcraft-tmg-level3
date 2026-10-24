// Actual B146 missing Surge target: read-only frozen Room and paid response.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { createStarcraftTmgPrivatePayloadCodec } from '../packages/room-store/room-store-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { getOfficialAttackProfileV2 } from '../packages/source-data/official-attack-profile-catalogue-v2.mjs';
import { compileStarcraftTmgActionParameterContractV1,
  inspectStarcraftTmgActionParametersV1 } from '../packages/online-agent-session/action-parameter-contract-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [root, directory, reportPath] = process.argv.slice(2);
assert(root && directory && reportPath);
assert(!path.resolve(reportPath).startsWith(path.resolve(directory) + path.sep));
const report = { schemaVersion: 'ticket23_B146_fight_effect_contract_regression_v1',
  providerCalls: 0, originalRoomWrites: 0, rulesApply: 0, sourceRefresh: false };
const json = async file => JSON.parse(await readFile(file, 'utf8'));
function roomPayload(dir, roomId, field) {
  assert(['aggregate_cipher', 'initial_envelope_cipher'].includes(field));
  const db = new DatabaseSync(path.join(dir, 'room.sqlite'), { readOnly: true });
  try { return db.prepare(`SELECT ${field} FROM sc_rooms WHERE room_id=?`).get(roomId)[field]; }
  finally { db.close(); }
}
function decode(cipher, privateState, aad) {
  return createStarcraftTmgPrivatePayloadCodec({ key: privateState.storeEncryptionKeyBase64,
    keyId: JSON.parse(cipher).keyId }).decode(cipher, aad);
}
function paidChoice(dir) {
  const db = new DatabaseSync(path.join(dir, 'seats/player2/provider/live-decisions.sqlite'), { readOnly: true });
  let wrapper;
  try { wrapper = JSON.parse(db.prepare('SELECT record_json FROM sc_live_decision_records').get().record_json); }
  finally { db.close(); }
  assert.equal(wrapper.encoding, 'gzip-base64');
  const bytes = Buffer.from(wrapper.payload, 'base64');
  const header = bytes.subarray(0, 10);
  const offsets = [];
  for (let offset = bytes.indexOf(header); offset >= 0;
    offset = bytes.indexOf(header, offset + 1)) offsets.push(offset);
  assert(offsets.length > 2);
  const fragment = gunzipSync(bytes.subarray(offsets.at(-2), offsets.at(-1)),
    { maxOutputLength: 32 * 1024 * 1024 }).toString('utf8');
  const choices = Object.values(JSON.parse('{' + fragment + '}'));
  assert.equal(choices.length, 1);
  return choices[0];
}
try {
  const privateState = await json(path.join(directory, 'runner-private.json'));
  const original = decode(roomPayload(directory, privateState.roomId, 'aggregate_cipher'),
    privateState, 'room:' + privateState.roomId + ':aggregate');
  const state = original.envelope.state;
  const choice = paidChoice(directory);
  assert.equal(original.stateRevision, 146);
  assert.equal(choice.authority.stateRevision, 146);
  assert.equal(hash(state), original.envelope.stateHash);
  const submitted = choice.attempts[choice.attemptKeys.at(-1)].safeOutput;
  const parameters = JSON.parse(submitted.selection.parametersJson);
  assert.equal(parameters.allocations[0].dice, 6);
  assert.equal(parameters.surgeTargetUnitId, undefined);
  const before = JSON.stringify(state);
  let initialDirectory = directory;
  let initialRoomId = original.roomId;
  const projectRoot = path.resolve(root, '../..');
  for (let depth = 0; depth < 8; depth++) {
    assert([root, projectRoot].some(base => initialDirectory.startsWith(path.join(base, 'build') + path.sep)));
    const fork = await json(path.join(initialDirectory, 'fork-private.json'))
      .catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!fork) break;
    assert.equal(fork.targetRoomId, initialRoomId);
    initialDirectory = fork.sourceDirectory;
    initialRoomId = fork.sourceRoomId;
    assert(depth < 7);
  }
  const initialPrivate = await json(path.join(initialDirectory, 'runner-private.json'));
  const initial = decode(roomPayload(initialDirectory, initialRoomId, 'initial_envelope_cipher'),
    initialPrivate, 'room:' + initialRoomId + ':initial-envelope');
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root:
    await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }) });
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: frozen.dataset, state: initial.state }) });
  assert.equal(runtime.descriptor.runtimeHash, original.envelope.matchBinding.rulesRuntimeBinding.runtimeHash);
  const domain = runtime.enumerate(state, { sideKey: 'player2' }).parameterDomains.find(value =>
    value.actionType === 'fight' && value.pieceId === 'player2-kerrigan-raptor');
  assert(domain);
  const profile = getOfficialAttackProfileV2(state.officialAttackProfileCatalogueV2, domain.profileKey);
  assert(profile.effects.some(value => value.effectAtomId === 'attack-effect:surge-armour-bypass-v1'));
  Object.assign(report, { roomId: original.roomId, revision: 146,
    stateHash: original.envelope.stateHash, runtimeHash: runtime.descriptor.runtimeHash,
    originalDomainId: submitted.candidateId, currentDomainId: domain.domainId,
    profileHash: profile.profileHash, parameters });
  assert.throws(() => runtime.instantiate(state, domain, parameters), /SELECTED_MELEE_EFFECT_TARGET_REQUIRED/);
  report.originalRulesRejectionReproduced = true;
  const contract = compileStarcraftTmgActionParameterContractV1(domain);
  assert(contract.requiredFields.includes('surgeTargetUnitId'),
    'actual required Surge target must be in the current public submission contract');
  const issue = inspectStarcraftTmgActionParametersV1(domain, parameters);
  assert.equal(issue.valid, false);
  assert(issue.fieldIssues.some(value => value.fieldPath === 'parameters.surgeTargetUnitId'
    && value.code === 'required_field_missing'));
  const repaired = { ...parameters, surgeTargetUnitId: parameters.allocations[0].targetUnitId };
  if (contract.requiredFields.includes('criticalTargetUnitId')) repaired.criticalTargetUnitId = repaired.surgeTargetUnitId;
  assert.equal(inspectStarcraftTmgActionParametersV1(domain, repaired).valid, true);
  const instantiated = runtime.instantiate(state, domain, repaired);
  const action = instantiated.action.sourceAction || instantiated.action;
  assert.equal(action.meleePlan.attackDice, 6);
  assert.equal(action.meleePlan.fightChancePlan.chance.layout.surge, 1);
  assert.equal(action.meleePlan.canonicalParameters.surgeTargetUnitId, repaired.surgeTargetUnitId);
  const canonical = instantiated.canonicalParameters ?? action.meleePlan.canonicalParameters;
  assert.equal(inspectStarcraftTmgActionParametersV1(domain, canonical).valid, true,
    'canonical null for an absent effect remains accepted');
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    { ...repaired, criticalTargetUnitId: 'not-a-target' }).valid, false);
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    { ...repaired, closeRanksMode: 'move' }).valid, false,
    'move must request the current required relocation fields');
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    { ...repaired, allocations: [{ ...repaired.allocations[0], dice: 5 }] }).valid, false,
    'decline dice total uses the actual canonical allocation owner');
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    { ...repaired, allocations: [{ ...repaired.allocations[0], dice: 3 },
      { ...repaired.allocations[0], dice: 3 }] }).valid, false,
    'duplicate targets are caught before Rules execution');
  assert.equal(inspectStarcraftTmgActionParametersV1(domain,
    { ...repaired, unexpectedField: true }).valid, false);
  assert.equal(JSON.stringify(state), before);
  Object.assign(report, { ok: true, fieldIssues: issue.fieldIssues,
    attackDice: 6, surgeDice: 1, fightPlanHash: action.meleePlan.fightPlanHash,
    originalInputUnchanged: true, completeCurrentRulesInstantiation: true });
} catch (error) {
  Object.assign(report, { ok: false, error: { name: error.name, message: error.message } });
  process.exitCode = 1;
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify(report));
