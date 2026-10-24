// Controlled step debug, NOT a continuous generation run. The first new Teach
// checkpoint is a breakpoint: inspect its input before any model/tool is allowed.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createIterativeRosterDraftTeachV1 } from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
import { PREGAME_LAB_DESCRIPTOR_SCHEMA } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const base = path.resolve(process.argv[2]);
const selected = process.argv[3] || 'all';
const directory = path.join(base, 'B/fresh-generation-v264/workspace/iterative-draft/sessions');
const name = (await fs.readdir(directory)).find(x => x.endsWith('.json'));
const original = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8')).value;
const source = original.draftTeachSnapshots.findLast(x => x.status === 'completed');
assert(source);
const sourceHash = hash(source);
const row = original.iterations.find(x => x.planHash === source.sourcePlanHash);
assert(row, 'The fixture must be an actual saved Plan, not a reconstructed strategy');
const plan = structuredClone(row.planSnapshot);
assert.equal(hash(plan), source.sourcePlanHash);
// Keep the actual inputs and published conclusions; omit irrelevant nested
// investigation logs from this boundary fixture, never from the original run.
const completed = {
  ...source,
  context: { ...source.context, previousInquiry: null },
  state: Object.fromEntries(['phase', 'framework', 'agenda', 'coverage', 'synthesis']
    .map(key => [key, structuredClone(source.state[key])])),
  publicOutputs: [], failedOutputs: [], dispatches: [], events: [], usage: [],
};
const seed = () => ({ sessionId: 'single-step-teach-v314', revision: row.revision,
  mineralBudget: 2000, currentCandidate: structuredClone(row.candidateSnapshot),
  plan: structuredClone(plan), frozenContext: structuredClone(source.context.frozenContext),
  observations: source.context.existingEvidence.map(receipt => ({ query: { kind: 'retained_actual_evidence' }, receipt: structuredClone(receipt) })),
  draftTeachSnapshots: [structuredClone(completed)], pendingDecision: null });
const BREAK = 'DEBUG_STOP_BEFORE_TEACH_EXECUTION';
const results = [];
async function scenario(id, mutate, expectNew, verify = () => {}) {
  if (selected !== 'all' && selected !== id) return;
  const state = seed();
  let skill = structuredClone(source.context.skillGuidance);
  let mission = structuredClone(source.context.mission);
  const env = { state, setSkill: value => { skill = value; }, setMission: value => { mission = value; } };
  mutate(env);
  const before = { plan: structuredClone(state.plan), candidate: structuredClone(state.currentCandidate),
    evidence: state.observations.map(x => structuredClone(x.receipt)), snapshotCount: state.draftTeachSnapshots.length };
  const checkpoints = [];
  let providerCalls = 0, sceneCalls = 0, stopped = false;
  const teach = createIterativeRosterDraftTeachV1({
    selectSkillGuidance: () => skill, missionEvidence: mission,
    deliberationFactory: { createForRun() { providerCalls++; throw Error('PROVIDER_MUST_NOT_RUN'); } },
    createSceneLaboratory() { sceneCalls++; throw Error('SCENE_MUST_NOT_RUN'); },
  });
  try {
    try {
      await teach(state, async next => {
        checkpoints.push({ count: next.draftTeachSnapshots.length,
          snapshot: structuredClone(next.draftTeachSnapshots.at(-1)) });
        if (next.draftTeachSnapshots.length > before.snapshotCount) {
          stopped = true;
          throw Object.assign(Error(BREAK), { code: BREAK });
        }
      });
    } catch (error) { if (error.code !== BREAK) throw error; }
    assert.equal(stopped, expectNew, `${id}: changed Teach inputs must not silently consume an old completed result`);
    assert.equal(providerCalls, 0); assert.equal(sceneCalls, 0);
    assert.deepEqual(state.plan, before.plan, 'Debugger/Teach must not author a Plan');
    assert.deepEqual(state.currentCandidate, before.candidate);
    if (expectNew) {
      const next = checkpoints.at(-1).snapshot;
      assert.deepEqual(next.context.existingEvidence, before.evidence, 'Every new fact must enter the exact next Teach input');
      assert.deepEqual(next.candidateInput, before.candidate.input);
      assert.equal(next.sourcePlanHash, hash(before.plan));
      assert.deepEqual(next.context.skillGuidance, skill);
      assert.deepEqual(next.context.mission, mission);
      assert.deepEqual(next.context.frozenContext, state.frozenContext);
      assert.equal(next.plan.finalPlan, false);
      assert.equal(state.draftTeachSnapshots[0].status, 'completed', 'Old result remains historical, not overwritten');
    } else {
      assert.equal(state.draftTeachSnapshots.length, 1);
      assert.equal(state.draftTeachFeedback.finalAcceptance, false);
      assert.equal(state.draftTeachFeedback.advisoryOnly, true);
      assert.deepEqual(state.draftTeachFeedback.synthesis, completed.state.synthesis,
        'Reused critique must retain its actual wording, not be rewritten by the host');
    }
    verify({ state, checkpoints, before });
    results.push({ id, pass: true, stoppedBeforeExecution: stopped,
      newSnapshotCount: state.draftTeachSnapshots.length - before.snapshotCount,
      providerCalls, sceneCalls,
      input: { planHash: hash(before.plan), candidateHash: before.candidate.candidateHash,
        evidenceCount: before.evidence.length, evidenceHashes: before.evidence.map(hash) },
      output: { sourcePlanHash: state.draftTeachSnapshots.at(-1).sourcePlanHash,
        feedbackSourcePlanHash: state.draftTeachFeedback?.sourcePlanHash || null },
      strategyImprovementProved: false });
  } catch (error) { results.push({ id, pass: false, error: error.message, code: error.code || null,
    stoppedBeforeExecution: stopped, providerCalls, sceneCalls }); }
}
await scenario('new_evidence_same_plan', ({ state }) => {
  const body = { status: 'advisory', questionAnswered: true, scopedFact: 'fault-injection sentinel; not a game fact' };
  state.observations.push({ query: { kind: 'debug_fact' }, receipt: { ...body, receiptHash: hash(body) } });
}, true);
await scenario('same_inputs_reuse_historical_critique', () => {}, false);
await scenario('changed_skill_same_plan', ({ setSkill }) => setSkill({ diagnosticSkillVersion: 'changed' }), true);
await scenario('removed_evidence_same_plan', ({ state }) => { state.observations = []; }, true);
await scenario('unknown_evidence_is_not_known_fact', ({ state }) => {
  const body = { status: 'unknown', questionAnswered: false, reason: 'injected_missing_capability' };
  state.observations.push({ query: { kind: 'debug_unknown' }, receipt: { ...body, receiptHash: hash(body) } });
}, true, ({ checkpoints }) => {
  assert.equal(checkpoints.at(-1).snapshot.context.existingEvidence.at(-1).status, 'unknown');
  assert.equal(checkpoints.at(-1).snapshot.context.existingEvidence.at(-1).questionAnswered, false);
});
await scenario('changed_mission_same_plan', ({ setMission }) => setMission({ diagnosticMissionVersion: 'changed' }), true);
await scenario('changed_map_same_plan', ({ state }) => { state.frozenContext.mapHash = hash('other-map'); }, true);
await scenario('changed_army_same_plan', ({ state }) => {
  state.currentCandidate.input.units[0].unitInstanceId += '-different';
  state.currentCandidate.candidateHash = hash(state.currentCandidate.input);
}, true);
await scenario('changed_strategy_full_army', ({ state }) => {
  state.plan.strategy.counterPlans = ['Explicit changed strategic branch for boundary test; not a production Plan.'];
}, true);
await scenario('metadata_change_does_not_claim_strategy_review', ({ state }) => {
  state.plan.strategy.revisionReason = 'Binding-only explanation changed; strategy retained.';
}, false, ({ state }) => {
  assert.equal(state.draftTeachReuse.currentPlanReviewed, false);
  assert.equal(state.draftTeachFeedback.sourcePlanHash, source.sourcePlanHash);
  assert.notEqual(state.draftTeachReuse.currentPlanHash, source.sourcePlanHash);
});
await scenario('partial_army_critique_stays_provisional', ({ state }) => {
  state.currentCandidate.mineralSpent = 920;
  state.plan.strategy.counterPlans = ['Partial-army hypothesis; final army not decided.'];
}, false, ({ state }) => {
  assert.equal(state.draftTeachReuse.reason, 'partial_army_plan_continuation');
  assert.equal(state.draftTeachReuse.finalAcceptance, false);
});
if (selected === 'all' || selected === 'unfinished_paid_input_immutable') {
  const state = seed();
  const old = state.draftTeachSnapshots[0];
  old.status = 'paused';
  old.state.phase = 'question_agenda';
  state.observations.push({ query: { kind: 'debug_new_evidence' }, receipt: { status: 'advisory', receiptHash: hash('new evidence') } });
  const oldInput = structuredClone(old.context);
  let calls = 0, checkpoints = 0;
  const teach = createIterativeRosterDraftTeachV1({ selectSkillGuidance: () => source.context.skillGuidance,
    missionEvidence: source.context.mission,
    deliberationFactory: { createForRun() { calls++; throw Error('MUST_STOP_BEFORE_PROVIDER'); } },
    createSceneLaboratory() { calls++; throw Error('MUST_STOP_BEFORE_LABORATORY'); } });
  try {
    await assert.rejects(teach(state, async next => {
      checkpoints++;
      assert.equal(next.draftTeachSnapshots.length, 1);
      assert.equal(next.draftTeachSnapshots[0].snapshotId, completed.snapshotId);
      assert.deepEqual(next.draftTeachSnapshots[0].context, oldInput,
        'An in-flight paid request must retain its original context; new facts wait for a new inquiry');
      throw Object.assign(Error(BREAK), { code: BREAK });
    }), { code: BREAK });
    assert.equal(calls, 0); assert.equal(checkpoints, 1);
    results.push({ id: 'unfinished_paid_input_immutable', pass: true, providerCalls: 0,
      stoppedBeforeExecution: true, originalRequestInputUnchanged: true });
  } catch (error) { results.push({ id: 'unfinished_paid_input_immutable', pass: false, error: error.message }); }
}
if (selected === 'all' || selected === 'new_evidence_reaches_next_model_input') {
  const state = seed();
  const body = { status: 'advisory', scopedFact: 'V314_INPUT_CONSUMER_SENTINEL_NOT_A_GAME_FACT', questionAnswered: true };
  const evidence = { ...body, receiptHash: hash(body) };
  state.observations.push({ query: { kind: 'debug_fact' }, receipt: evidence });
  let delivered = null, nativeCalls = 0, saved = null;
  const descriptorBody = { schema: PREGAME_LAB_DESCRIPTOR_SCHEMA,
    sourceStateHash: hash('non-executing-debug-source'), builderBundleHash: hash('non-executing-debug-builder'),
    readOnly: true, mutatesRoomState: false, mutatesBuilderState: false, mutatesSourceData: false,
    reimplementsRules: false, resultsBoundToSourceState: true, unknownStaysUnknown: true,
    hostPreferenceWeightsApplied: false, sameStateABComparisonSupported: true,
    scenarioBranchesOperateOnClonesOnly: true, hypotheticalPlacementsAreAdvisoryNotRulesLegality: true,
    providerCalls: 0, trainingTruth: false };
  const forbidden = () => { nativeCalls++; throw Error('NO_NATIVE_QUERY_BEFORE_MODEL_INPUT'); };
  const laboratory = { labDescriptor: () => ({ ...descriptorBody, descriptorHash: hash(descriptorBody) }),
    describeQueryContext: () => ({ sourceStateHash: descriptorBody.sourceStateHash }),
    proveMutationZero: forbidden, queryProbability: forbidden, querySpatial: forbidden,
    queryMath: forbidden, queryThreatExchange: forbidden, runScenarioBranch: forbidden };
  const teach = createIterativeRosterDraftTeachV1({ selectSkillGuidance: () => source.context.skillGuidance,
    missionEvidence: source.context.mission, createSceneLaboratory: () => laboratory,
    deliberationFactory: { descriptor: () => ({ modelVersion: 'debug-no-network' }),
      async createForRun() { return { async deliberate(request) {
        delivered = structuredClone(request);
        // Stop at the actual next model input, without generating a response.
        throw Object.assign(Error('ITERATIVE_DRAFT_TEACH_PAUSED'), { code: 'ITERATIVE_DRAFT_TEACH_PAUSED' });
      } }; } } });
  try {
    await teach(state, async next => { saved = structuredClone(next); });
    assert(delivered, 'The next real Teach engine request must be reached');
    const payload = JSON.stringify(delivered.promptNodes);
    assert(payload.includes(evidence.receiptHash), 'New receipt must reach the next model input');
    assert(payload.includes(body.scopedFact), 'New fact content must not be reduced to a naked hash');
    assert.equal(delivered.roundKind, 'teach_framework_agenda');
    assert.equal(nativeCalls, 0); assert.equal(saved.draftTeachSnapshots.at(-1).status, 'paused');
    assert.deepEqual(saved.draftTeachSnapshots.at(-1).context.existingEvidence.at(-1), evidence);
    assert.equal(saved.draftTeachSnapshots[0].status, 'completed');
    results.push({ id: 'new_evidence_reaches_next_model_input', pass: true, consumer: delivered.roundKind,
      exactFactContentDelivered: true, newStatePersisted: true, providerCalls: 0, nativeCalls,
      strategyEffectEvaluated: false });
  } catch (error) { results.push({ id: 'new_evidence_reaches_next_model_input', pass: false,
    error: error.message, code: error.code || null, reachedModelInput: Boolean(delivered), nativeCalls }); }
}
assert.equal(hash(original.draftTeachSnapshots.findLast(x => x.status === 'completed')), sourceHash);
const report = { scope: 'actual completed B Teach inputs -> exact next Teach input checkpoint; no model/native execution',
  selected, sourcePlanHash: source.sourcePlanHash, sourceRecordHash: sourceHash, results,
  pass: results.length > 0 && results.every(x => x.pass), finalAdmission: false,
  originalSessionWritten: false, providerCalls: 0, nativeActions: 0, trainingTruth: false };
const output = await fs.mkdtemp(path.join(base, 'step-debug-v314-'));
await fs.writeFile(path.join(output, 'teach-input-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, output }));
process.exitCode = report.pass ? 0 : 1;
