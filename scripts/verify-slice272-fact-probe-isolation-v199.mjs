// Reproduce B's feedback contamination at the actual Prompt projection seam:
// its previous unsupported availability conclusion was fed back as current input.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { projectRosterTeachRolePromptV1, readRosterTeachRetainedEvidenceV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { projectRosterTeachCapabilityGuideV1, projectRosterTeachDecisionScopeV1 }
  from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base, output] = process.argv.slice(2);
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
const report = { providerCalls: 0, nativeQueryExecutions: 0, sourceDraftWrites: 0 };
try {
  const state = draft.teachFramework.state, context = draft.teachFramework.context;
  const ids = state.investigation.dependencyContinuation.questionIds;
  const focus = new Set(ids), plan = JSON.parse(draft.planSerialized);
  const recovered = state.queryRecovery.operations.map(o => ({ questionId: o.questionId,
    originalQueryId: o.originalQueryId, queryId: o.queryId, status: o.status,
    request: o.request, result: o.result || o.currentFailure }));
  const nodes = [projectRosterTeachDecisionScopeV1(context),
    projectRosterTeachCapabilityGuideV1(context.queryContext, context),
    { kind: 'current_investigation_assignment', pendingQuestionIds: ids },
    { kind: 'frozen_plan_and_method', plan, framework: state.framework, context },
    { kind: 'canonical_current_query_context', context: context.queryContext },
    { kind: 'latest_completed_teach_findings', synthesis: state.synthesis, recoveredQueries: recovered },
    { kind: 'questions_and_results', agenda: { ...state.agenda,
      questions: state.agenda.questions.filter(q => focus.has(q.questionId)) },
      evidence: state.evidence.filter(e => focus.has(e.questionId || e.challengeId)),
      investigation: { operations: state.investigation.operations.filter(o => focus.has(o.questionId)),
        evidence: state.investigation.evidence.filter(e => focus.has(e.questionId)) } },
  ];
  const savedCorrection = state.replyCorrections.findLast(row => row.correction?.previousOutput)?.correction;
  assert(savedCorrection, 'Use a real retained protocol correction to check the current feedback lane');
  nodes.push({ kind: 'repair_completed_public_reply', ...savedCorrection });
  const oldReason = state.synthesis.answers.find(a => focus.has(a.questionId)).publicReason;
  const original = JSON.stringify(nodes), archive = new Map();
  const projected = projectRosterTeachRolePromptV1('teach_framework_investigate', nodes, archive,
    { factProbe: true });
  const text = JSON.stringify(projected);
  assert(!text.includes(JSON.stringify(oldReason).slice(1, -1)),
    'The old model capability-gap conclusion is still being repeated inside the current fact-probe prompt');
  const assignment = projected.find(n => n.kind === 'fact_probe_assignment');
  assert.equal(assignment?.mode, 'fact_probe');
  assert.deepEqual(assignment.pendingQuestionIds, ids);
  const history = projected.find(n => n.kind === 'fact_probe_history_access');
  const fullHistoryRequest = JSON.parse(history.fullPriorInput.retrieval.toolRequestJson);
  assert.equal(hash(archive.get(fullHistoryRequest.receiptHash)), hash(nodes),
    'The complete original context/history must remain archived without alteration');
  // The existing reader deliberately returns a child index for large objects.
  // Verify a real leaf through that interface instead of comparing its index
  // with the full multi-megabyte history and formatting an enormous diff.
  const priorNodeIndex = nodes.findIndex(n => n.kind === 'latest_completed_teach_findings');
  const answerIndex = state.synthesis.answers.findIndex(a => focus.has(a.questionId));
  const retained = readRosterTeachRetainedEvidenceV1([], { ...fullHistoryRequest,
    path: `${priorNodeIndex}.synthesis.answers.${answerIndex}.publicReason` }, archive);
  assert.equal(retained.value, oldReason);
  const source = projected.find(n => n.kind === 'fact_probe_source_material');
  assert.equal(source.context.rosterEditAuthority, context.rosterEditAuthority);
  assert.deepEqual(source.context.skillRefs, context.skillRefs);
  const executions = projected.find(n => n.kind === 'fact_probe_tool_executions');
  const questionsAndResults = nodes.find(n => n.kind === 'questions_and_results');
  const expected = [...questionsAndResults.evidence, ...questionsAndResults.investigation.evidence,
    ...recovered.filter(o => focus.has(o.questionId)).map(o => o.result).filter(Boolean)];
  assert.equal(executions.receiptCount, expected.length);
  const receiptRequest = JSON.parse(executions.fullReceipts.retrieval.toolRequestJson);
  assert.equal(hash(archive.get(receiptRequest.receiptHash)), hash(expected),
    'Raw successful and failed Native evidence must not be rewritten or discarded');
  assert.equal(projected.find(n => n.kind === 'repair_completed_public_reply').code, savedCorrection.code);
  assert.equal(JSON.stringify(nodes), original);
  report.pendingQuestionIds = ids;
  report.receiptCount = expected.length;
  report.projectedChars = text.length;
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
