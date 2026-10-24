// Reproduce the actual v68 explicit-position / invalid-scene / citation bugs.
// No Provider call or Room mutation; argv names already retained evidence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { projectRosterTeachPromptEvidenceV1, qualifyRosterTeachFrameworkSynthesisV1,
  readRosterTeachRetainedEvidenceV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';

const state = JSON.parse(await fs.readFile(process.argv[2], 'utf8')).state;
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
let enumerations = 0;
const rulesRuntime = { descriptor: { runtimeHash: 'a'.repeat(64) },
  enumerate() { enumerations++; throw Error('invalid scene must not enumerate'); },
  instantiate() { throw Error('no execution'); }, apply() { throw Error('no mutation'); } };
const lab = createPregameSceneLaboratoryV1({ sourceState: state, rulesRuntime,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) }) });
const piece = state.pieces.find(p => p.id === 'player1-goliath-1');
const spec = x => ({ kind: 'hypothetical_geometry', phase: 'assault', activeSideKey: 'player1',
  clearTerrain: true, isolateToPlacedPieces: true, placements: [{ pieceId: piece.id,
    modelPositions: [{ modelId: piece.models[0].id, xInches: x, yInches: x }] }] });
const good = lab.runScenarioBranch({ branchId: 'explicit-position-no-redundant-origin', spec: spec(10) });
assert.equal(good.hypotheticalPlacementAssessment.units[0].resultStatus, 'ok');
const bad = lab.runScenarioBranch({ branchId: 'invalid-base-boundary', spec: spec(.01) });
assert.equal(bad.hypotheticalPlacementAssessment.units[0].resultStatus, 'unknown');
for (const method of ['queryProbability', 'queryThreatExchange', 'queryScene']) {
  const result = await lab[method]({ queryId: method, base: { kind: 'branch', branchStateHash: bad.branchStateHash },
    queryKind: 'mission_marker_control', attackerUnitId: piece.id, targetUnitId: 'player2-hydralisk' });
  assert.equal(result.resultStatus, 'unknown');
  assert.match(result.unknownReason, /MODEL_BASE_GEOMETRY_/);
}
assert.equal(enumerations, 0);
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({ check: 'explicit-model-layout-and-invalid-scene', status: 'PASS', providerCalls: 0 }));

const draft = JSON.parse(await fs.readFile(process.argv[3], 'utf8'));
const job = draft.teachFramework;
const evidence = [...job.state.evidence, ...job.state.investigation.evidence];
const qualified = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: job.state.synthesisRaw,
  evidence, sourceEvidence: job.context });
const timing = qualified.answers.find(a => a.questionId === 'q-timing-synergy-enabling-order');
assert(timing.quantitativeEvidence.some(e => e.value === 14 && e.status === 'receipt_bound'));
const real = evidence.find(e => e.challengeId === 'sup-scenario-assault-exchange-1');
const archive = new Map();
const projected = projectRosterTeachPromptEvidenceV1(real, archive);
assert.equal(projected.computedOutcomes?.length, 3);
assert(projected.computedOutcomes.some(o => o.outcomes.expectedDamage > 0));
const native = real.followUpReceipts[0].receipt;
projectRosterTeachPromptEvidenceV1(native, archive);
const retrieved = readRosterTeachRetainedEvidenceV1([], { receiptHash: native.receiptHash,
  path: 'exchange.attackEstimates.0.outcomes.expectedDamage' }, archive);
assert.equal(retrieved.value, native.exchange.attackEstimates[0].outcomes.expectedDamage);
console.log(JSON.stringify({ check: 'paid-output-alias-and-combat-evidence-retrieval', status: 'PASS',
  paidMathAliasBound: 14, deliveredAttackEstimates: 3, providerCalls: 0 }));
