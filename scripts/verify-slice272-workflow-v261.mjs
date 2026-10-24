// One aggregate regression for the observed r6 stale Plan, partial-scene restart,
// A/B unknown acceptance discrepancy, and pause closing an in-flight child.
// Product HTTP + coordinators/session are real. Provider/arrival are fixtures;
// this report must NOT be advertised as real-model strategy or Room acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { createAgentSelectedRosterJourneyV1, hasAcceptedCurrentRosterTeachV1 } from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
import { createPresetRosterJourneyV1, isPresetRosterJourneyAcceptedV1 } from '../packages/roster-planning-workspace/preset-roster-journey-v1.mjs';
import { createRosterPlanningWorkspaceHttpAdapterV1, ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import { AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA } from '../packages/roster-strategist/agent-scheduled-roster-plan-v1.mjs';
import { rosterTeachReadinessV1 } from '../packages/roster-strategist/roster-planning-workflow-v1.mjs';
const base = process.argv[2];
const output = await fs.mkdtemp(base + '/workflow-v261-');
const bFile = base + '/B/fresh-generation-v249/workspace/iterative-draft/sessions/000b494bcc4efb11a17dcc7cb02fb3b47806481b87b93dd4fb10c28fe5a92f57.json';
const previousReport = process.argv[3] ? JSON.parse(await fs.readFile(process.argv[3] + '/report.json', 'utf8')) : null;
const results = [], traces = previousReport ? JSON.parse(await fs.readFile(process.argv[3] + '/traces.json', 'utf8')) : {};
const check = async (name, fn) => {
  const passed = previousReport?.results.find(r => r.name === name && r.status === 'pass');
  if (passed) { results.push({ ...passed, reusedFrom: process.argv[3] }); return; }
  try { const detail = await fn(); results.push({ name, status: 'pass', detail }); }
  catch (e) { results.push({ name, status: 'fail', code: e.code, error: e.message, stack: e.stack }); }
};
const spin = async predicate => {
  for (let i = 0; i < 2000; i++) { if (await predicate()) return; await new Promise(r => setImmediate(r)); }
  throw Error('Fixture did not converge; trace retained');
};
for (const [name, script, arg] of [
  ['r6_plan_alignment', 'scripts/verify-slice272-roster-plan-handoff-v260.mjs', bFile],
  ['partial_scene_restart', 'scripts/verify-slice272-partial-branch-restore-v260.mjs', base],
]) await check(name, async () => {
  const r = await promisify(execFile)(process.execPath, [script, arg], { timeout: 55000 });
  return JSON.parse(r.stdout.trim());
});

await check('A_http_unknown_revise_reteach_accept_and_restart', async () => {
  const calls = traces.A = []; let state = null, teaching = 0, revisions = 0;
  const view = { sessionId: 'v261-A', lockedRoster: { modelSelectionLocked: true },
    status: 'draft', retainedReplyCount: 0, plan: null, providerDispatches: [], claimRepairBacklog: [] };
  const service = {
    descriptor: () => ({}), readSession: () => structuredClone({ ...view, presetJourney: state }),
    startPlanning: async () => { calls.push('generate'); view.status = 'planned';
      view.plan = { planHash: 'a1', openingDeploymentSchedule: {} }; },
    reviewFinalPlan: async () => { calls.push('source-review'); view.planReview = {
      status: 'completed', planHash: view.plan.planHash, stale: false, review: { findings: [] } }; },
    reconcileReviewFindings: async () => { throw Error('Unexpected reconciliation'); },
    teachPlanFramework: async (_id, request) => {
      calls.push(request.recoverFailedQueryIds ? 'query-recovery' : 'teach');
      if (!request.recoverFailedQueryIds) teaching++;
      view.teachFramework = { status: 'completed', planHash: view.plan.planHash,
        investigationCompleted: true, coverage: [{ unresolvedQuestionIds: teaching === 1 ? ['same-question'] : [] }] };
    },
    revisePlan: async (_id, request) => {
      calls.push(request.reasonText.includes('unanswered questions') ? 'revise-unknown' : 'apply-teach');
      if (teaching === 1) assert.equal(isPresetRosterJourneyAcceptedV1({ ...view, presetJourney: state }), false);
      view.plan = { ...view.plan, planHash: `a${++revisions + 1}` };
      view.teachFramework.appliedToPlanHash = view.plan.planHash;
    },
  };
  const make = () => createPresetRosterJourneyV1({ service,
    readState: () => structuredClone(state), saveState: async (_id, s) => { state = structuredClone(s); },
    sleep: async () => new Promise(r => setImmediate(r)) });
  service.runPresetJourney = make().run;
  const http = createRosterPlanningWorkspaceHttpAdapterV1({ service });
  assert.equal((await http.handle({ method: 'POST', pathname: `${prefix}/sessions/${view.sessionId}/run` })).status, 202);
  await spin(() => state && state.status !== 'running');
  assert.equal(state.status, 'completed', JSON.stringify(state.failure));
  assert.deepEqual(calls, ['generate', 'source-review', 'teach', 'query-recovery', 'revise-unknown',
    'source-review', 'teach', 'apply-teach', 'source-review']);
  assert.equal(isPresetRosterJourneyAcceptedV1({ ...view, presetJourney: state }), true);
  assert(state.workflow.transitions.some(t => t.detail.stage === 'revising_unresolved_plan'));
  const count = calls.length;
  service.runPresetJourney = make().run;
  await http.handle({ method: 'POST', pathname: `${prefix}/sessions/${view.sessionId}/run` });
  assert.equal(calls.length, count, 'Restart must not re-run accepted work');
  traces.ACheckpoint = state;
  return { revisions, teaching, restartAdditionalCalls: calls.length - count };
});

await check('A_pause_drains_child_before_outer_terminal', async () => {
  let state = null;
  const view = { sessionId: 'v261-pause', lockedRoster: {}, status: 'planned',
    plan: { planHash: 'pause-plan', openingDeploymentSchedule: {} },
    planReview: { status: 'completed', planHash: 'pause-plan', review: { findings: [] } },
    providerDispatches: [], claimRepairBacklog: [] };
  const service = { readSession: () => structuredClone({ ...view, presetJourney: state }),
    teachPlanFramework: async () => { view.teachFramework = { status: 'running', planHash: 'pause-plan' }; } };
  const journey = createPresetRosterJourneyV1({ service, readState: () => state,
    saveState: async (_id, s) => { state = structuredClone(s); },
    sleep: async () => new Promise(r => setImmediate(r)) });
  await journey.run(view.sessionId); await spin(() => view.teachFramework?.status === 'running');
  journey.stop(view.sessionId);
  await new Promise(r => setImmediate(r));
  assert.equal(state.status, 'running', 'Outer job must not let its caller close an in-flight Worker');
  view.teachFramework.status = 'paused';
  await spin(() => state.status !== 'running');
  assert.equal(state.status, 'paused'); assert.equal(state.failure, null);
  return { paidBodyInterrupted: false, outerTerminalAfterChild: true };
});

await check('B_http_stale_plan_to_unknown_revision_to_current_acceptance', async () => {
  const original = JSON.parse(await fs.readFile(bFile, 'utf8')).value;
  const rows = original.iterations.filter(r => [2, 6].includes(r.revision));
  const r6 = rows.find(r => r.revision === 6);
  let saved = { sessionId: 'v261-B-flow', schema: original.schema, contextHash: original.contextHash,
    frozenContext: original.frozenContext, mineralBudget: 2000, modelContextVersion: 14,
    teachFeedbackPolicy: 'skill_teach_roster_coevolution_v1', selectionJustificationPolicyVersion: 'unit_role_comparison_v1',
    modelDecisionReceiptCount: 0, currentCandidate: structuredClone(r6.candidateSnapshot),
    plan: structuredClone(r6.planSnapshot), revision: 6, iterations: rows, status: 'active',
    observations: original.observations.filter(r => r.query.kind === 'map_summary'
      || r.query.kind === 'map_route' && r.query.candidateHash === r6.currentCandidateHash) };
  const events = traces.B = []; let deciding = 0;
  const core = createIterativeRosterPlanSessionV1({
    store: { load: async () => structuredClone(saved), save: async (_id, s) => { saved = structuredClone(s); } },
    builder: { evaluate: async () => { throw Error('No requested roster replacement in this fixture'); } },
    tools: { query: async () => { throw Error('All unchanged current map evidence is retained'); } },
    review: { draft: async s => { events.push('draft-teach'); return s; },
      final: async () => ({ reviewHash: hash('arrival-and-formal-teach-required'), blockingFindings: ['arrival_required'] }) },
    model: { decide: async ({ state }) => {
      deciding++; const plan = structuredClone(state.plan);
      let decision;
      if (state.planAlignment) {
        events.push('align-plan'); plan.strategy.rosterRationale = 'Current eight-unit diagnostic army rationale.';
        plan.strategy.revisionReason = 'Account for the actual four added units; final Teach must still check strategy.';
        decision = { kind: 'revise_plan', plan, assumptionDisposition: 'revise' };
      } else if (state.teachFeedback?.disposition === 'pending') {
        if (state.teachFeedback.acceptanceBlocked) {
          events.push('revise-unresolved');
          assert(state.teachFeedback.acceptanceIssues.some(i => i.code === 'TEACH_UNRESOLVED'));
          plan.strategy.revisionReason = 'Revise the actual unsupported assertion; conditional strategy remains allowed.';
          plan.strategy.counterPlans = ['Diagnostic alternative that no longer relies on the unanswered query.'];
          decision = { kind: 'revise_plan', plan, assumptionDisposition: 'revise' };
        } else { events.push('accept-current'); decision = { kind: 'accept_teach', publicReason: 'Current conditional evidence and revised Plan accepted.' }; }
      } else {
        events.push('finish-draft');
        plan.mapEvidenceHash = state.observations.find(r => r.query.kind === 'map_route').receipt.receiptHash;
        decision = { kind: 'finish', plan, assumptionDisposition: 'retain' };
      }
      return { outcome: 'completed', receiptHash: hash({ deciding, decision }), decision };
    } },
  });
  const drafts = { ...core, listSessions: async () => [saved],
    proposeSchedule: async () => { events.push('arrival'); saved.openingDeploymentSchedule = { audited: true }; return { status: 'rules_audited' }; },
    reviseSchedulePublicPlan: async () => { saved.arrivalPublicRevision = { publicAudit: { status: 'unit_references_verified' } }; return { status: 'unit_references_verified' }; },
    prepareTeachHandoff: async () => ({ source: 'fixture-only' }) };
  const teaches = [];
  const workspace = { descriptor: () => ({}), listSessions: () => ({ sessions: teaches }),
    readSession: id => structuredClone(teaches.find(t => t.sessionId === id)),
    createAgentSelectedTeachSession: async ({ setup }) => {
      const t = { sessionId: `v261-teach-${teaches.length}`, planningMode: 'locked_roster_teach_v1', setup,
        status: 'draft', agentSelectedCandidateHash: saved.currentCandidate.candidateHash,
        agentSelectedStrategySource: { planHash: hash(saved.plan), iterativeSessionId: saved.sessionId },
        plan: { schema: AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA, planId: `agent-selected-${saved.sessionId}`,
          planHash: hash({ source: saved.plan, index: teaches.length }) },
        claimRepairBacklog: [], selectionJustification: { coverageComplete: true, referencesResolved: true } };
      teaches.push(t); return structuredClone(t);
    },
    startPlanning: async id => { teaches.find(t => t.sessionId === id).status = 'planned'; },
    reviewFinalPlan: async id => { const t = teaches.find(t => t.sessionId === id);
      t.planReview = { status: 'completed', planHash: t.plan.planHash, review: { planHash: t.plan.planHash, findings: [] } }; },
    teachPlanFramework: async id => { const t = teaches.find(t => t.sessionId === id);
      events.push('formal-teach'); t.teachFramework = { status: 'completed', planHash: t.plan.planHash,
        investigationCompleted: true, policyVersion: 'fixture', state: { phase: 'completed', investigation: { completed: true },
          coverage: [{ unresolvedQuestionIds: teaches.length === 1 ? ['missing-fact'] : [] }],
          synthesis: { answers: teaches.length === 1 ? [{ questionId: 'missing-fact', disposition: 'unresolved' }] : [] } } };
      t.teachFramework.coverage = t.teachFramework.state.coverage;
    },
    readPlanningExperience: id => ({ teachFramework: structuredClone(teaches.find(t => t.sessionId === id).teachFramework), publicRounds: [] }),
    revisePlan: async () => { throw Error('B must return changes to the selecting author'); },
  };
  const journey = createAgentSelectedRosterJourneyV1({ iterativeDraft: drafts, workspaceService: workspace,
    promoteTeachPlan: async () => { throw Error('Fixture Plan already in promoted shape'); } });
  const http = createRosterPlanningWorkspaceHttpAdapterV1({ service: workspace, iterativeJourney: journey });
  const started = await http.handle({ method: 'POST', pathname: `${prefix}/iterative/sessions/${saved.sessionId}/run` });
  traces.BStart = started;
  assert.equal(started.status, 202, JSON.stringify(started.response));
  await spin(async () => !(await journey.read(saved.sessionId)).running);
  const view = await journey.read(saved.sessionId);
  assert.equal(view.stage, 'source_review_completed_clean', JSON.stringify(view));
  assert.deepEqual(saved.currentCandidate, r6.candidateSnapshot);
  assert.equal(teaches.length, 2); assert(events.indexOf('align-plan') < events.indexOf('draft-teach'));
  assert(events.includes('revise-unresolved')); assert.equal(events.filter(e => e === 'accept-current').length, 1);
  assert.equal(hasAcceptedCurrentRosterTeachV1(saved, teaches.at(-1)), true);
  const bad = structuredClone(teaches.at(-1)); bad.teachFramework.state.coverage = [{ unresolvedQuestionIds: ['regression'] }];
  assert.equal(hasAcceptedCurrentRosterTeachV1(saved, bad), false, 'A completed badge must not bypass unknown evidence');
  assert.equal(rosterTeachReadinessV1(bad).ready, false);
  traces.BCheckpoint = { workflow: saved.workflow, journey: saved.journeyCheckpoint, feedback: saved.teachFeedbackHistory };
  const prior = deciding; await journey.run(saved.sessionId); assert.equal(deciding, prior);
  return { modelFixtureDecisions: deciding, formalTeachSnapshots: teaches.length, originalArmyUnchanged: true,
    resumeAdditionalDecisions: deciding - prior };
});

const report = { status: results.every(r => r.status === 'pass') ? 'pass' : 'fail', results,
  scope: 'actual saved B handoff + native partial branch + product HTTP/coordinator/session control; Provider and arrival fixtures',
  providerCalls: 0, realModelAcceptance: false, roomWrites: 0, harnessLoopUsed: true,
  targetGames: ['starcraft-tmg'], trainingTruth: false, output };
await fs.writeFile(output + '/traces.json', JSON.stringify(traces, null, 2));
await fs.writeFile(output + '/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.status === 'pass' ? 0 : 1;
