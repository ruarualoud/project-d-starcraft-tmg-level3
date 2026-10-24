// Concrete P3 gap: a legal Raptor response exists, but shared probability
// supports ranged only. Frozen source; isolated contact hypothesis, no match.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {enumerateOfficialSelectedRosterMeleeActionsV1 as enumerate,
  instantiateOfficialSelectedRosterMeleeActionV1 as instantiate,
  previewOfficialSelectedRosterMeleeActionV1 as preview,
  queryOfficialSelectedRosterMeleeActionV1 as nativeQuery} from '../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs';
import {estimateStarcraftTmgAttackProbabilityV1 as estimate} from '../packages/online-agent-session/combat-estimation-runtime-v1.mjs';
import {createStarcraftTmgSnapshotSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 as contracts} from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';

const source = process.argv[2];
const queryOnly = process.argv.includes('--query-only');
assert(source, 'frozen laboratory source .json.gz required');
const bytes = await fs.readFile(source);
const state = JSON.parse(gunzipSync(bytes)).authority.state;
state.phase = 'combat'; state.stage = 'unit_activation'; state.activeSideKey = 'player2';
state.pendingAction = null; state.selectedRosterActivationWindow = null;
state.terrain = []; // Explicit open-field fixture, not acceptance of the real map.
state.phaseFirstActorByRound = {[`${state.round}:combat`]: {
  round: state.round, phase: 'combat', chosenFirstActorSideKey: 'player2',
}};
for (const id of ['player2-kerrigan-raptor', 'marine-1']) {
  const piece = state.pieces.find(p => p.id === id);
  assert(piece);
  piece.isOnField = true; piece.isInReserves = false;
  piece.coherencyStatus = {status: 'coherent', isOutOfCoherency: false};
  piece.models.forEach((model, i) => Object.assign(model, {isOnField: true,
    xInches: 10 + (i % 3) * 1.3,
    yInches: id === 'marine-1' ? 15 + Math.floor(i / 3) * 1.3
      : 13.7 - Math.floor(i / 3) * 1.3,
    elevation: 'ground_level', supportTerrainIds: [], adjacentAccessPointIds: [],
  }));
}
const before = hash(state);
const domain = enumerate(state, {sideKey: 'player2'}).parameterDomains
  .find(d => d.pieceId === 'player2-kerrigan-raptor' && d.actionType === 'fight');
assert(domain, 'Native must independently establish a current legal fight');
const parameters = {closeRanksMode: 'decline',
  allocations: [{targetUnitId: 'marine-1', dice: domain.constraints.declineCloseRanksAttackDice}],
  ...Object.fromEntries(['surgeTargetUnitId', 'criticalTargetUnitId']
    .filter(k => domain.parameterSchema.required.includes(k)).map(k => [k, 'marine-1'])),
};
const nativePreview = preview(state, domain, parameters);
assert(nativePreview.action.meleePlan.attackDice > 0);
const input = {state, domain, parameters: {...parameters, targetUnitId: 'marine-1'}, sampleBudget: 36};
let result;
if (!queryOnly) {
result = estimate(input); // Before repair: CURRENT_RANGED_DOMAIN_REQUIRED.
assert.equal(result.attackKind, 'melee');
assert.equal(result.attackPlanHash, nativePreview.action.meleePlan.fightPlanHash);
assert(result.outcomes.expectedDamage > 0);
assert(result.outcomes.lossStateDistribution.length > 0);
assert.equal(result.assumptions.some(s => s.includes('Optional reactions are excluded')), true);
assert.equal(result.mayMutateRoom, false);
assert.throws(() => estimate({...input, damageReactionChoices: []}),
  /MELEE_PROBABILITY_REACTION_POLICY_NOT_SUPPORTED/);
assert.throws(() => estimate({...input, parameters: {...input.parameters, targetUnitId: 'goliath-1'}}),
  /MELEE_PROBABILITY_TARGET_ALLOCATION_REQUIRED/);
}
// Independent Native query retains the exact target and original dice path.
if (!queryOnly) {
const targets = nativePreview.action.meleePlan.fightChancePlan.targets;
assert.equal(targets.length, 1);
const receipt = nativeQuery({state, request: {queryKind: 'resolve_chance_and_casualty_domains',
  sideKey: 'player2', domainId: domain.domainId, parameters,
  chanceReveals: Array(nativePreview.chance.count).fill(6)}});
assert.equal(receipt.result.resolutions[0].targetUnitId, 'marine-1');
}

const service = createStarcraftTmgSnapshotSceneQueryServiceV1({state,
  rulesRuntime: {enumerate, instantiate}, seatKey: 'player2',
  sceneScope: {kind: 'hypothetical_branch', sourceStateHash: before, baseStateHash: before}});
const response = await service.query({queryKind: 'attack_probability',
  arguments: {domainId: domain.domainId, parameters: input.parameters, sampleBudget: 36}});
assert.notEqual(response.status, 'unknown', JSON.stringify(response));
if (result) assert.deepEqual(response.result.outcomes, result.outcomes);
result = response.result;
assert.equal(result.attackPlanHash, nativePreview.action.meleePlan.fightPlanHash);
assert.equal(result.attackKind, 'melee');
assert(result.outcomes.expectedDamage > 0 && result.outcomes.lossStateDistribution.length > 0);
assert.match(contracts.attack_probability.proves, /melee/);
assert.match(contracts.fire_zone_exchange.doesNotProve, /return.fire/i);
assert.equal(hash(state), before);
assert.deepEqual(await fs.readFile(source), bytes);
console.log(JSON.stringify({passed: true, actualNativeFight: true,
  queryOnly, priorCoreAssertionsNotRepeated: queryOnly,
  attackDice: nativePreview.action.meleePlan.attackDice,
  expectedDamage: result.outcomes.expectedDamage,
  expectedCasualties: result.outcomes.expectedCasualties,
  expectedSupplyAfter: result.outcomes.expectedSupplyAfter,
  lossStates: result.outcomes.lossStateDistribution.length,
  sameLiveAndPregameQueryAdapter: true, providerCalls: 0, productionWrites: 0,
  actionsApplied: 0, originalUnchanged: true,
  scope: 'one conditional single-target melee response; no optional reactions or whole-match simulation'}));
