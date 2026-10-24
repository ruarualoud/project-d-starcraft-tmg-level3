// Only concrete fresh-v264 regressions. Run one named case once per relevant change.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createPresetRosterJourneyV1 } from '../packages/roster-planning-workspace/preset-roster-journey-v1.mjs';
import { createIterativeRosterDraftTeachV1 } from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
import { rosterTeachQueryDeltaBaseV1, applyRosterTeachQueryDeltaV1 } from '../packages/roster-strategist/roster-teach-query-delta-v1.mjs';
import { recoverRosterTeachQueriesV1, assessRosterTeachQueryCorrectionScopeV1, applyRosterTeachCandidateParametersV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { collectRosterTeachScenarioRecordsV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { buildRosterFinalPlanVerifiedFactsV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { rosterSelectionUnitRulesV1 } from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createIterativeRosterToolPortV1 } from '../packages/roster-strategist/iterative-roster-tool-port-v1.mjs';
import { normalizeRosterTeachQueryDispatchV1 } from '../packages/roster-strategist/roster-teach-query-dispatch-v1.mjs';
import { rosterPlanExperimentGroupV274 } from '../content/roster-plan-experiment-matrix-v274.mjs';
import { rosterTeachInvestigationWindowV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base, name] = process.argv.slice(2);
const ar = JSON.parse(await fs.readFile(`${base}/A/fresh-generation-v264/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`, 'utf8'));
const a = ar.value || ar;
const br = JSON.parse(await fs.readFile(`${base}/B/fresh-generation-v264/workspace/iterative-draft/sessions/872007cad4ca7e2bd785f7d8936cc2264d6eb800d55f7f610c0bf8f6a44c7025.json`, 'utf8'));
const b = br.value || br;
if (name === 'E_transport_normalization') {
  const directory = `${base}/roster-plan-matrix-v274/E/fresh-generation-v274/workspace/iterative-draft/sessions`;
  const files = (await fs.readdir(directory)).filter(file => file.endsWith('.json'));
  assert.equal(files.length, 1);
  const raw = JSON.parse(await fs.readFile(`${directory}/${files[0]}`, 'utf8'));
  const state = raw.value || raw;
  const operations = state.draftTeachSnapshots.flatMap(s => s.state.queryRecovery?.operations || []);
  const nested = operations.findLast(o => o.originalRequest?.toolRequest?.kind === 'scenario'
    && o.originalRequest.toolRequest.toolRequest?.spec)?.originalRequest;
  assert(nested, 'Captured paid E nested envelope required');
  const before = hash(nested), result = normalizeRosterTeachQueryDispatchV1(nested);
  assert.deepEqual(result.request.toolRequest.spec, nested.toolRequest.toolRequest.spec,
    'Same-kind redundant envelope must reach the existing scenario constructor');
  assert.equal(result.normalization.unwrappedEnvelopes, 1);
  assert.equal(hash(nested), before);
  const scenario = operations.findLast(o => o.originalRequest?.toolRequest?.followUps?.some(f =>
    f.kind === 'spatial' && f.queryKind === 'space.inspect_relationships'
      && f.subjectUnitIds?.length && f.argumentsJson))?.originalRequest;
  assert(scenario, 'Captured paid E scenario with duplicated follow-up arguments required');
  const original = hash(scenario), normalized = normalizeRosterTeachQueryDispatchV1(scenario);
  assert.deepEqual(normalized.request.toolRequest.spec, scenario.toolRequest.spec);
  const index = scenario.toolRequest.followUps.findIndex(f => f.queryKind === 'space.inspect_relationships');
  const follow = normalized.request.toolRequest.followUps[index];
  assert.equal(follow.subjectUnitIds, undefined, 'Scenario follow-ups use the same coalescing as top-level tools');
  assert.equal(follow.argumentsJson, scenario.toolRequest.followUps[index].argumentsJson);
  assert(normalized.normalization.followUpNormalizations.some(x => x.index === index));
  assert.equal(hash(scenario), original);
  const ambiguous = structuredClone(nested);
  ambiguous.toolRequest.branchIdRef = 'different-parent';
  assert.deepEqual(normalizeRosterTeachQueryDispatchV1(ambiguous).request, ambiguous,
    'Never silently discard an extra outer selector');
  const mismatch = structuredClone(nested);
  mismatch.toolRequest.kind = 'spatial';
  assert.deepEqual(normalizeRosterTeachQueryDispatchV1(mismatch).request, mismatch,
    'Different operation kinds remain for model correction');
} else if (name === 'A_empty_static_search_progress') {
  const original = a.teachFramework.state;
  const evidence = original.investigation.evidence.filter(e => !e.queryNotExecuted
    && e.sourceReceipt?.queryKind === 'space.solve_static_formation'
    && e.sourceReceipt.queryReceipt?.result?.formationOptions?.length === 0).slice(0, 2);
  assert.equal(evidence.length, 2, 'Use two real paid investigation searches, not invented failures');
  const operations = evidence.map(e => original.investigation.operations.find(o => o.queryId === e.challengeId));
  assert(operations.every(Boolean));
  const state = { investigationPolicyVersion: original.investigationPolicyVersion,
    agenda: original.agenda, investigation: { evidence, operations,
      rounds: evidence.map(e => ({ completed: true,
        output: { queries: [{ queryId: e.challengeId, questionId: e.questionId }] } })) } };
  const before = hash(state), result = rosterTeachInvestigationWindowV1(state);
  assert.equal(result.progress.distinctResults, 0,
    'Changing an anchor without obtaining any formation witness must not reset the evidence-progress window');
  assert.equal(result.progress.noProgressBatches, 2);
  assert.equal(result.progress.stopped, true);
  assert.equal(result.progress.nonAdvancingSearches.length, 2);
  assert.equal(hash(state), before, 'Keep bounded misses and unanswered claims, never manufacture impossibility');
} else if (name === 'incremental_review') {
  let state, received;
  const view = { sessionId: a.sessionId, status: 'planned', lockedRoster: {},
    plan: JSON.parse(a.planSerialized), planVersionHistory: a.planVersionHistory.map(JSON.parse),
    planReviewHistory: a.planReviewHistory, providerDispatches: [], claimRepairBacklog: [] };
  const journey = createPresetRosterJourneyV1({ readState: () => state,
    saveState: async (_, s) => { state = structuredClone(s); },
    service: { readSession: () => view, reviewFinalPlan: async (_, request) => {
      received = request; throw Object.assign(Error('fixture boundary'), { code: 'FIXTURE_REVIEW_BOUNDARY' });
    } } });
  await journey.run(a.sessionId);
  for (let i = 0; i < 200 && state?.status === 'running'; i++) await new Promise(r => setImmediate(r));
  assert.equal(received?.scope, 'changed_claims', 'Product Run must select existing incremental review');
  assert.equal(received.baselinePlanHash, a.planVersionHistory.map(JSON.parse).at(-1).planHash);
} else if (name === 'unchanged_teach') {
  const s = structuredClone(b), previous = s.draftTeachSnapshots.find(x => x.createdAtRevision === 3);
  s.draftTeachSnapshots = s.draftTeachSnapshots.filter(x => x.createdAtRevision <= 3);
  let paid = 0, scenes = 0;
  const draft = createIterativeRosterDraftTeachV1({
    createSceneLaboratory: () => { scenes++; throw Error('UNNECESSARY_SCENE_REBUILD'); },
    selectSkillGuidance: () => previous.context.skillGuidance, missionEvidence: previous.context.mission,
    deliberationFactory: { createForRun: async () => { paid++; throw Error('UNNECESSARY_TEACH'); } } });
  const before = structuredClone({ plan: s.plan, army: s.currentCandidate });
  await draft(s, async () => {});
  assert.equal(paid, 0); assert.equal(scenes, 0);
  assert.deepEqual({ plan: s.plan, army: s.currentCandidate }, before);
  assert.equal(s.draftTeachFeedback.finalAcceptance, false);
  assert.equal(s.draftTeachFeedback.sourcePlanHash, previous.sourcePlanHash, 'Never retag evidence');
  assert.equal(s.draftTeachReuse.reason, 'strategy_unchanged');
  assert.ok(s.draftTeachFeedback.synthesis.answers.some(x => x.disposition === 'unresolved'));
} else if (name === 'B_retained_scenarios') {
  const s = structuredClone(b), current = s.draftTeachSnapshots.at(-1);
  const before = structuredClone({ context: current.context, plan: current.plan });
  const draft = createIterativeRosterDraftTeachV1({
    createSceneLaboratory: () => ({}),
    deliberationFactory: { createForRun: async () => { throw Error('FIXTURE_BEFORE_PROVIDER'); } } });
  await assert.rejects(() => draft(s, async () => {}), /FIXTURE_BEFORE_PROVIDER/);
  const refs = current.state.scenarioDependencies?.branchRefs || [];
  for (const id of ['q-opponent-branch-current-source-player2-movement',
    'q-capability-demand-current-source-assault-scene-wide', 'q-post-loss-current-source-two-unit-branch']) {
    assert.ok(refs.includes(id), `Missing retained scenario ${id}`);
  }
  assert.deepEqual({ context: current.context, plan: current.plan }, before, 'Paid context must not drift');
} else if (name === 'F_reference_army_binding') {
  const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
  const rebind = (recipe, from, to) => ({ ...structuredClone(recipe),
    units: recipe.units.map(unit => ({ ...structuredClone(unit), unitInstanceId: unit.unitInstanceId.replace(from, to) })) });
  const referenceArmyRecipes = {
    player1: rebind(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2, 'player2', 'player1'),
    player2: rebind(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1, 'player1', 'player2'),
  };
  const product = await createRosterPlanningProductModuleV1({ root: process.cwd(), fixtureRoot: cfg.fixtureRoot,
    dataDirectory: await fs.mkdtemp(`${base}/v274-reference-binding-`),
    referenceArmyRecipes });
  const catalogue = product.service.readCatalogue();
  assert.equal(catalogue.defaults.factionRecordKey, referenceArmyRecipes.player1.factionRecordKey,
    'Reverse-matchup configuration must change the real product reference, not only model prose');
  assert.equal(catalogue.defaults.opponentFactionRecordKey, referenceArmyRecipes.player2.factionRecordKey);
  const refs = product.descriptor().planningReferenceArmies;
  assert.equal(refs.player1.factionRecordKey, referenceArmyRecipes.player1.factionRecordKey);
  assert.equal(refs.player2.factionRecordKey, referenceArmyRecipes.player2.factionRecordKey);
  assert.equal(refs.player1.mineralSpent, 2000);
  assert.equal(refs.player2.mineralSpent, 2000);
} else if (name === 'F_tool_setup_forwarding') {
  let delivered;
  const port = createIterativeRosterToolPortV1({ armyBuilderPort: {
    evaluateRosterCandidate() {}, enumerateArmyBuildingChoices() {},
  }, mapEvidencePort: { summarizeMap() {}, evaluateRosterRoute() {} },
  createSceneLaboratory: context => { delivered = context; return { describeQueryContext: () => ({}) }; } });
  await port.query({ kind: 'scene_context', candidateHash: b.currentCandidate.candidateHash }, b);
  assert.deepEqual(delivered.setup, b.frozenContext,
    'The scene tool must propagate the same opponent/side/task configuration as the planning state');
} else if (['C_D_reference_runtime_registration', 'D_reference_runtime_roster_count'].includes(name)) {
  const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
  if (name === 'C_D_reference_runtime_registration') {
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
  const { createOfficialSelectedRosterAbilityImplementationBindingsV1 } = await import(
    '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs');
  const { createOfficialSelectedRosterAbilityDefinitionBindingsV1 } = await import(
    '../packages/product-composition/official-ability-effect-runtime-v1.mjs');
  const old = JSON.parse(await fs.readFile(`${base}/query-contract-audit-v30/native-movement-fixture.private.json`, 'utf8'));
  assert.deepEqual(createOfficialSelectedRosterAbilityImplementationBindingsV1(source.dataset),
    createOfficialSelectedRosterAbilityDefinitionBindingsV1(old.state.officialSelectedRosterAbilitySourceBundle),
    'The original full Terran/Kerrigan catalogue registration must remain identical');
  }
  for (const arm of name === 'D_reference_runtime_roster_count' ? ['D'] : ['C', 'D']) {
    const group = rosterPlanExperimentGroupV274(arm);
    const product = await createRosterPlanningProductModuleV1({ root: process.cwd(), fixtureRoot: cfg.fixtureRoot,
      dataDirectory: await fs.mkdtemp(`${base}/v274-${arm}-native-registration-`),
      referenceArmyRecipes: group.referenceArmyRecipes });
    assert.equal(product.service.readCatalogue().defaults.opponentFactionRecordKey, group.opponentFactionRecordKey);
    assert.equal(product.descriptor().planningReferenceArmies.player2.mineralSpent, 2000);
    console.log(JSON.stringify({ case: name, arm, nativeProductInitializationPassed: true }));
  }
} else if (name === 'B_native_duplicate_arguments') {
  const questions = b.draftTeachSnapshots.flatMap(s => s.state.agenda?.questions || []);
  const captured = questions.findLast(q => q.evidenceRequest?.kind === 'spatial'
    && q.evidenceRequest.toolRequest.queryKind === 'space.inspect_relationships'
    && q.evidenceRequest.toolRequest.subjectUnitIds?.length
    && q.evidenceRequest.toolRequest.argumentsJson.includes('subjectUnitIds')).evidenceRequest;
  const before = hash(captured);
  const native = JSON.parse(captured.toolRequest.argumentsJson);
  assert.deepEqual(captured.toolRequest.subjectUnitIds, native.subjectUnitIds);
  const normalized = normalizeRosterTeachQueryDispatchV1(captured);
  assert.equal(normalized.request.toolRequest.subjectUnitIds, undefined,
    'A byte-equivalent selector in the native container must not remain an unbound outer selector');
  assert.deepEqual(JSON.parse(normalized.request.toolRequest.argumentsJson), native);
  assert.equal(hash(captured), before, 'Keep paid output immutable');
  assert.ok(normalized.normalization.omittedIdenticalNativeArgumentFields.includes('subjectUnitIds'));
  const conflicting = structuredClone(captured);
  conflicting.toolRequest.subjectUnitIds = ['different-requested-unit'];
  assert.deepEqual(normalizeRosterTeachQueryDispatchV1(conflicting).request.toolRequest.subjectUnitIds,
    ['different-requested-unit'], 'Do not drop genuinely conflicting selection intent');
  const wrongFamily = { ...conflicting, kind: 'probability' };
  assert.throws(() => normalizeRosterTeachQueryDispatchV1(wrongFamily), /DISPATCH_AMBIGUOUS/);
  const sameAlternativeFamily = { ...captured, kind: 'inspect' };
  assert.equal(normalizeRosterTeachQueryDispatchV1(sameAlternativeFamily).request.kind, 'spatial');
} else if (name === 'A_review_fact_delivery') {
  const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
  const unitRules = rosterSelectionUnitRulesV1(source.dataset);
  const plan = JSON.parse(a.planSerialized);
  const before = structuredClone(plan);
  const { sourceFacts } = buildRosterFinalPlanVerifiedFactsV1({ plan,
    toolReceipts: a.toolReceipts, selectedCandidateInputHash: hash(a.lockedRoster.lock.candidateInput),
    selectionUnitRules: unitRules, teachState: a.teachFramework.state });
  assert.ok(Array.isArray(sourceFacts.selectionUnitRules),
    'Fixed-roster Plan review must receive the same frozen public unit facts; lack of a Builder selection argument is not absence of Rules');
  assert.equal(hash(sourceFacts.selectionUnitRules), hash(unitRules));
  assert.equal(sourceFacts.roundSupplySchedule.isChosenPlanNotUniqueLegalSchedule, true);
  assert(sourceFacts.rosterUnits.every(unit =>
    unit.firstArrivalRoundMeaning === 'scheduled_first_arrival_not_rules_earliest'));
  assert.equal(sourceFacts.unitRuleCatalogueIsObservedEnemyRoster, false);
  assert.deepEqual(plan, before, 'Only input facts change, never the saved Plan or Rules');
} else if (name === 'B_mixed_recovery_action') {
  const snapshot = b.draftTeachSnapshots.at(-1);
  const saved = snapshot.state.queryRecovery.operations.find(x =>
    x.originalQueryId === 'q-reserves-hypothetical-scenario-and-arrival');
  const raw = snapshot.publicOutputs.findLast(x => x.sanitizedOutput?.kind === 'prerequisite_query'
    && x.sanitizedOutput.edits?.length).sanitizedOutput;
  const state = { agenda: { questions: snapshot.state.agenda.questions.filter(q => q.questionId === saved.questionId) },
    evidence: [{ ...saved.originalResult, challengeId: saved.originalQueryId }],
    investigation: { operations: [], evidence: [] },
    queryRecovery: { operations: [structuredClone(saved)] } };
  const before = structuredClone(saved.request);
  let asks = 0, executions = 0;
  await recoverRosterTeachQueriesV1({ state, plan: snapshot.plan, context: snapshot.context,
    sourceHash: snapshot.state.sourceHash, checkpoint: async () => {},
    ask: async (kind, nodes, message, validate) => {
      asks++;
      if (asks === 1) { validate(raw); return structuredClone(raw); }
      assert.equal(asks, 2, 'One local feedback step, not a whole Teach restart');
      const failure = nodes.find(x => x.kind === 'failed_query_to_correct').result;
      assert.equal(failure.unknownReasonCode, 'ROSTER_TEACH_QUERY_DELTA_INSPECT_HAS_EDITS');
      assert.equal(failure.queryNotExecuted, true);
      assert.match(failure.queryRepair.correctionInstruction, /edits=\[\]/);
      return { disposition: 'defer', kind: 'patch', toolRequestJson: '', edits: [],
        publicReason: 'Fixture stops before another paid decision; original question remains unresolved.' };
    }, evidencePort: { describeQueryContext: () => ({}), query: async () => {
      executions++; throw Error('Mixed action must not execute or silently drop edits');
    } } });
  assert.equal(asks, 2); assert.equal(executions, 0);
  assert.equal(state.queryRecovery.operations[0].status, 'model_deferred');
  assert.equal(state.queryRecovery.operations[0].currentFailure.status, 'unknown');
  assert.deepEqual(state.queryRecovery.operations[0].choices.at(-2), raw);
  assert.deepEqual(saved.request, before, 'Never modify persisted model request in a regression');
  assert.equal(state.queryRecovery.operations[0].rejectedContextChoiceIndexes.length, 1);
} else if (name === 'B_combined_candidate') {
  const s = b.draftTeachSnapshots.at(-1);
  const op = s.state.queryRecovery.operations.find(x => x.originalQueryId === 'q-reserves-hypothetical-scenario-and-arrival');
  const reply = s.publicOutputs.findLast(x => x.sanitizedOutput?.kind === 'candidate_parameters').sanitizedOutput;
  const request = op.request || op.originalRequest;
  const corrected = applyRosterTeachCandidateParametersV1({ request, failure: op.currentFailure,
    selection: JSON.parse(reply.toolRequestJson), inspections: op.inspections, edits: reply.edits });
  assert.notDeepEqual(corrected.toolRequest.spec.placements[2], request.toolRequest.spec.placements[2]);
  assert.deepEqual(corrected.toolRequest.followUps, request.toolRequest.followUps);
  assert.deepEqual(corrected.toolRequest.spec.placements.slice(0,2), request.toolRequest.spec.placements.slice(0,2));
} else if (name === 'B_domain_scope') {
  const s = b.draftTeachSnapshots.at(-1), prior = b.draftTeachSnapshots.find(x => x.createdAtRevision === 3);
  const op = s.state.queryRecovery.operations.find(x => x.originalQueryId === 'q-capability-demand-named-targets-and-slogans');
  const domainId = op.originalRequest.toolRequest.domainId;
  const context = prior.state.investigation.evidence.find(e => e.branchQueryContext?.actionSpace?.parameterDomains?.some(d => d.domainId === domainId)).branchQueryContext;
  const resolveQueryContext = branch => { assert.equal(branch, op.request.toolRequest.branchIdRef); return context; };
  assert.equal(assessRosterTeachQueryCorrectionScopeV1(op.originalRequest, op.request, { resolveQueryContext }).sameNamedScope, true);
  const wrong = structuredClone(context);
  wrong.actionSpace.parameterDomains.find(d => d.domainId === domainId).pieceId = 'another-unit';
  assert.equal(assessRosterTeachQueryCorrectionScopeV1(op.originalRequest, op.request, { resolveQueryContext: () => wrong }).sameNamedScope, false);
  const state = { agenda: { questions: s.state.agenda.questions.filter(q => q.questionId === op.questionId) },
    evidence: s.state.evidence.filter(e => e.challengeId === op.originalQueryId),
    investigation: { operations: [], evidence: [] }, queryRecovery: { operations: [structuredClone(op)] } };
  let executions = 0;
  await recoverRosterTeachQueriesV1({ state, plan: s.plan, context: s.context, sourceHash: s.state.sourceHash,
    checkpoint: async () => {}, ask: async () => { throw Error('DO_NOT_REBUY_PAID_CORRECTION'); },
    evidencePort: { describeQueryContext: resolveQueryContext,
      query: async ({ request }) => { executions++; assert.deepEqual(request, op.request); return { status: 'advisory', receiptHash: 'f'.repeat(64) }; } } });
  assert.equal(executions, 1);
  assert.equal(state.queryRecovery.operations[0].choices.length, op.choices.length);
  assert.equal(state.queryRecovery.operations[0].status, 'advisory');
} else if (name === 'A_recovery_scene') {
  const state = a.teachFramework.state, operation = state.queryRecovery.operations[0];
  const ref = operation.currentFailure.queryRepair.scenarioContinuation.branchIdRef;
  const saved = collectRosterTeachScenarioRecordsV1(state).find(row => row.challengeId === ref);
  assert.ok(saved, `Recovery-created branch must survive restart: ${ref}`);
  assert.equal(hash(saved.request), saved.receipt.requestHash);
  assert.equal(saved.receipt.sourceReceipt.branchStateHash, operation.currentFailure.sourceReceipt.branchStateHash);
} else if (name === 'A_delta_preparation') {
  const o = a.teachFramework.state.queryRecovery.operations[0];
  const before = structuredClone(o.originalRequest);
  const v = rosterTeachQueryDeltaBaseV1({ request: o.originalRequest, failure: o.currentFailure });
  assert.deepEqual(v.jsonArgumentPointers, ['/toolRequest/followUps/0/argumentsJson']);
  assert.equal(v.semanticRequest.toolRequest.argumentsJson, '');
  const result = applyRosterTeachQueryDeltaV1({ request: o.originalRequest, failure: o.currentFailure,
    reply: { disposition: 'retry', kind: 'patch', toolRequestJson: '',
      edits: [{ op: 'remove', path: '/toolRequest/followUps/0/sampleBudget', valueJson: '' }] } });
  assert.deepEqual(result.toolRequest.spec, before.toolRequest.spec);
  assert.equal(result.toolRequest.argumentsJson, '');
  assert.deepEqual(o.originalRequest, before);
} else if (name === 'B_dispatch_recovery') {
  const s = b.draftTeachSnapshots.at(-1), id = 'q-capability-demand-named-targets-and-slogans';
  const state = { agenda: { questions: s.state.agenda.questions.filter(q => q.questionId === id) },
    evidence: s.state.evidence.filter(e => e.challengeId === id), investigation: { operations: [], evidence: [] } };
  let asks = 0, executions = 0;
  await recoverRosterTeachQueriesV1({ state, plan: s.plan, context: s.context, sourceHash: s.state.sourceHash,
    checkpoint: async () => {}, ask: async () => { asks++; return { disposition: 'defer', kind: 'patch',
      toolRequestJson: '', edits: [], publicReason: 'Need the exact canonical arguments before execution.' }; },
    evidencePort: { describeQueryContext: () => ({}), query: async () => { executions++; throw Error('wrong execution'); } } });
  assert.equal(asks, 1); assert.equal(executions, 0);
  assert.equal(state.queryRecovery.operations[0].status, 'model_deferred');
  assert.equal(state.queryRecovery.operations[0].currentFailure.status, 'unknown');
} else throw Error('Choose a named concrete regression');
console.log(JSON.stringify({ case: name, pass: true, providerCalls: 0, liveAcceptance: false }));
