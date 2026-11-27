import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialCurrentProductCasualtyDomainV1, resolveOfficialCurrentProductCasualtyDomainV1 }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1 } from '../packages/rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'build/ticket-28-zerg-wave3-20261118-v1/plague-standard-damage/';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const target = state => state.pieces.find(row => row.id === 'marines');
const baseline = await read(base + 'zero-incoming-legacy-baseline.json');
const reproduction = await read(base + 'zero-incoming-reproduction.json');
assert(reproduction.reproduced); assert.equal(reproduction.actualDomain.casualtyCount, 4);
for (const row of baseline.cases) {
  assert.deepEqual(createOfficialCurrentProductCasualtyDomainV1(row.input), row.expected);
  assert.deepEqual(createOfficialCurrentProductCasualtyDomainV1({ ...row.input,
    nonLethalDamagePolicy: reproduction.input.nonLethalDamagePolicy }), row.expected);
}
const repairedInput = { ...reproduction.input, nonLethalStandardDamagePolicy: OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1 };
const result = createOfficialCurrentProductCasualtyDomainV1(repairedInput);
assert.equal(result.casualtyCount, 0); assert.equal(result.postDamageMarker, 8);
assert.equal(result.targetDestroyed, false); assert.equal(result.legalSelections.length, 1);
const selected = resolveOfficialCurrentProductCasualtyDomainV1(result, result.legalSelections[0].selectionHash);
assert.deepEqual(selected.casualtyModelIds, []); assert.equal(selected.remainingModelIds.length, 6);
assert.equal(selected.postDamageMarker, 8);
const positive = [];
for (const incomingDamage of [1, 2, 4]) {
  const input = { ...repairedInput, incomingDamage };
  const oldInput = { ...input }; delete oldInput.nonLethalStandardDamagePolicy;
  const current = createOfficialCurrentProductCasualtyDomainV1(input);
  assert.deepEqual(current, createOfficialCurrentProductCasualtyDomainV1(oldInput));
  const total = 8 + incomingDamage;
  assert.equal(current.casualtyCount, Math.min(6, Math.floor(total / 2)));
  positive.push({ incomingDamage, casualties: current.casualtyCount, remainingMarker: current.postDamageMarker });
}
assert.throws(() => createOfficialCurrentProductCasualtyDomainV1({ ...repairedInput,
  nonLethalStandardDamagePolicy: { ...repairedInput.nonLethalStandardDamagePolicy, version: 'forged' } }),
  /NON_LETHAL_STANDARD_DAMAGE_POLICY_MISMATCH/);

// Isolated in-memory product runtime with only chance values injected. These
// are not Room transitions, signed receipts, or a resume of the paused r3.
const originalR3 = path.join(root, base, 'melee/checkpoint-r3.json');
const beforeOriginal = hash(await fs.readFile(originalR3));
const authority = await read(base + 'melee/authority.json');
const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
const transitions = [];
let finalState;
try {
  resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const legacy = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: [], includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
  assert.deepEqual(legacy.descriptor, await read(base + 'melee/runtime.json'));
  const unit = (unitInstanceId, key, upgrades = []) => ({ unitInstanceId,
    recordKey: 'army_units:' + key, compositionKind: 'small', upgrades });
  const fresh = createOfficialReleaseRosterStateV2({ context, includePlague: true,
    blastTemplateGeometryAsset: authority.state.officialBlastTemplateGeometryAsset,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler', [{ upgradeName: 'Plague' }]), unit('ally', 'defiler')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [unit('enemy', 'goliath'), unit('marines', 'marine', [{ upgradeName: 'Combat Shield' }])] },
    } });
  assert.deepEqual(fresh.state.officialNonLethalStandardDamagePolicy, OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1);
  let state = structuredClone(authority.state);
  state.officialNonLethalStandardDamagePolicy = structuredClone(fresh.state.officialNonLethalStandardDamagePolicy);
  const options = { spatialState: state, definitionIds: [], includeRanged: true, includeMelee: true,
    includePrecisionChoices: true, includeArmourChoices: true };
  const candidate = createOfficialCharacteristicStatusComponentRuntimeV2({ context, ...options });
  assert.equal(candidate.descriptor.runtimeVersion, '3.122.0');
  const runtimeRef = base + 'zero-incoming-runtime-v3122.json';
  await atomicWrite(path.join(root, runtimeRef), JSON.stringify(candidate.descriptor, null, 2) + '\n');
  const m = context.manifest, releaseId = 'wave3-plague-positive-standard-damage-v1';
  resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
    sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
    sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
    components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: candidate.descriptor.runtimeVersion,
      integrity: { field: 'runtimeHash', value: candidate.descriptor.runtimeHash } } } }));
  const updated = await resolver.resolve({ releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context: updated, ...options });
  assert.deepEqual(runtime.descriptor, candidate.descriptor);
  const originalTarget = structuredClone(target(state));
  let action = runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'ally',
    parameters: { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'marines', dice: 4 }],
      surgeTargetUnitId: null, criticalTargetUnitId: null } }).result.action;
  let event;
  for (let step = 0; step < 8; step++) {
    const rolls = Array(action.chance?.count || 0).fill(1);
    const applied = runtime.apply(state, action, { chanceReveals: rolls });
    state = applied.state;
    transitions.push({ actionType: action.actionType, sourceRuntimeKind: action.sourceRuntimeKind,
      injectedChanceReveals: rolls, events: applied.events });
    event = applied.events.find(row => row.type === 'close_combat_attack' && row.pieceId === 'ally');
    if (event) break;
    const menu = runtime.enumerate(state), domain = menu.parameterDomains[0];
    if (domain) {
      const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
      assert(!schema.required.includes('casualtyModelIds'), 'a zero-damage attack must not open casualties');
      action = runtime.instantiate(state, domain, poolParameters(domain)).action;
    } else {
      assert.equal(menu.candidates.length, 1);
      // Runtime.enumerate returns actions directly. Room.legalSpace wraps
      // those actions; this in-memory probe must use the runtime contract.
      action = menu.candidates[0]; assert(action.actionType);
    }
  }
  assert(event, 'full zero-damage attack did not reach its actual product resolution');
  assert.equal(event.stages.totalDamage, 0); assert.deepEqual(event.casualtyModelIds, []);
  assert.equal(event.postDamageMarker, 8);
  assert.equal(target(state).currentModels, 6); assert.equal(target(state).currentSupply, originalTarget.currentSupply);
  assert.equal(target(state).damageMarker, 8);
  const finish = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'finish_activation' && row.pieceId === 'ally');
  assert(finish);
  const applied = runtime.apply(state, runtime.instantiate(state, finish, {}).action, {});
  finalState = applied.state;
  assert.equal(finalState.activeSideKey, 'player2');
  transitions.push({ actionType: 'finish_activation', injectedChanceReveals: [], events: applied.events });
} finally { store.close(); }
assert.equal(hash(await fs.readFile(originalR3)), beforeOriginal);
const output = { status: 'passed', scope: 'shared casualty calculation plus full in-memory product melee continuation',
  actualNativeResume: false, nativeReceipts: 0, injectedChanceOnly: true, originalR3Unchanged: true,
  runtimeVersion: '3.122.0', oldRuntimeDescriptorExact: '3.121.0', defaultPlagueFactoryEnablesCorrection: true,
  reproductionRef: base + 'zero-incoming-reproduction.json', legacyCompleteResultsExact: baseline.cases.length * 2,
  positiveCompleteResultsUnchanged: positive, malformedPolicyRejected: true,
  zeroDamage: { priorMarker: 8, incomingDamage: 0, casualties: 0, remainingMarker: 8, models: 6, supply: target(finalState).currentSupply },
  transitions, modelCalls: 0 };
await atomicWrite(path.join(root, base, 'zero-incoming-verification-v3122.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ status: output.status, runtimeVersion: output.runtimeVersion, legacyExact: baseline.cases.length * 2, positiveExact: positive.length,
  injectedProductSteps: transitions.length, originalR3Unchanged: true, modelCalls: 0 }));
