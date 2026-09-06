import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { prepareDshLoop, LOOP_LIMITS } from '../packages/skill-production/loops.mjs';
import { openReadOnlyProductionReplayV1 } from '../packages/skill-evaluation/read-only-production-replay-v1.mjs';
import { compareFactionFieldReplayLoopsV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { seal, verifySeal, hash, safe, fail } from '../packages/skill-production/common.mjs';

// Reproduce the actual reviewer -> editor -> negative reviewer sequence, not
// a made-up paraphrase. No credential or writable production DB is available.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const runId = 'faction-v1-182042133d7ba5b21c2a';
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const [input, knownRulePolicy, recipe, terminal] = await Promise.all([
  json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy'), json(runId + '/recipe'), json(runId + '/report')]);
assert.equal(terminal.failure.code, 'CHANNEL_SHAPE_INVALID');
const fieldRun = recipe.fieldRepairBinding.runId, phaseRun = recipe.phaseFieldBinding.runId;
const fieldRepairSeed = { sourceSection: await json(fieldRun + '/source-section'), candidate: await json(fieldRun + '/candidate'),
  evidence: await json(fieldRun + '/verified-evidence') };
const phaseFieldSeed = { sourceSection: await json(phaseRun + '/source-section'), candidate: await json(phaseRun + '/candidate'),
  evidence: await json(phaseRun + '/verified-evidence'), capture: await json(phaseRun + '/source-capture') };
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const db = new DatabaseSync(filename, { readOnly: true });
let rows, failedResponses;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(runId).n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(runId).n, 0);
  rows = new Map(db.prepare('SELECT id,input_hash,state,artifact FROM steps WHERE run=?').all(runId).map(r => [r.id, r]));
  failedResponses = db.prepare("SELECT id,request_hash,response FROM attempts WHERE run=? AND id LIKE '%adversarial.3.phase-seed%.0.call-1.%'")
    .all(runId).map(r => ({ id: r.id, requestHash: r.request_hash, response: verifySeal(JSON.parse(r.response)).value }));
} finally { db.close(); }
const value = id => rows.get(id)?.artifact ? verifySeal(verifySeal(JSON.parse(rows.get(id).artifact)).value) : null;
const scratch = new Map(), requests = [], captured = [];
const prefix = 'faction.terran_armed_forces.faction.terran_armed_forces.phase_tempo.1.';
const epoch = '.phase-seed-v1.' + recipe.phaseFieldBinding.hash.slice(0, 20);
const selected = new Set([
  prefix + 'review-target-batch-v1.supportive.2' + epoch + '.0',
  prefix + 'editor.2' + epoch + '.0',
  prefix + 'source-reconstruction.2' + epoch + '.1',
  prefix + 'review-target-batch-v1.supportive.3' + epoch + '.0',
]);
const failedId = prefix + 'review-target-batch-v1.adversarial.3' + epoch + '.0';
const store = {
  acquire(id) { return { id, cached: false }; },
  finish(lease, result) {
    if (value(lease.id)) assert.equal(result.hash, value(lease.id).hash, lease.id);
    scratch.set(lease.id, result); return result;
  },
  artifact(id) { return scratch.get(id) || null; }, release() {},
};
await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed, phaseFieldSeed,
  registeredSourceFieldRepair: true, store, runtime: { async role(request) {
    const id = request.packet.id + '.' + request.roleId, row = rows.get(id);
    const task = compileGlobalTask(input.frozenSources, request.instruction, request.workspace);
    assert.equal(row?.input_hash, hash(safe({ packetHash: request.packet.hash, contextHash: input.frozenSources.hash,
      task, maxOutput: request.maxOutput, arm: 'dsh', limits: LOOP_LIMITS })), id);
    if (selected.has(id) || id === failedId) {
      captured.push(seal({ stageId: id, request, stepInputHash: row.input_hash, output: value(id)?.output || null,
        productionOutputOverwritten: false, trainingTruth: false }));
      if (selected.has(id)) requests.push(request);
    }
    if (id === failedId) fail('REGRESSION_TERMINAL_CAPTURED');
    return value(id);
  } } }), { code: 'REGRESSION_TERMINAL_CAPTURED' });
assert.equal(captured.length, 5);
// Re-enter the pinned DSH for four completed paid roles. Check exact complete
// Provider request hashes and output fingerprints, not just our source file.
const catalogue = await loadFrozenSkillEvidence(root), dsh = await prepareDshLoop(root);
assert.equal(dsh.binding.hash, recipe.dshBindingHash);
const replay = openReadOnlyProductionReplayV1({ filename, runId, recipe, commandPolicy: 'production_tools' });
const loops = []; let prior = 0, delivery;
try {
  const replayStore = { ...replay.store, finish(lease, result) {
    const { hash: ignored, ...body } = replay.evidence();
    loops.push(compareFactionFieldReplayLoopsV1(lease.saved.loop, result.loop,
      seal({ ...body, receiptHashes: body.receiptHashes.slice(prior) })));
    prior = body.receiptHashes.length;
    const { hash: ignoredResult, ...stable } = result;
    return replay.store.finish(lease, seal({ ...stable, loop: lease.saved.loop }));
  } };
  const runtime = createProductionRuntimeV3({ store: replayStore, reader: createEvidenceReader(catalogue),
    context: input.frozenSources, verifier: {}, model: replay.model, dsh });
  for (const request of requests) await runtime.role(request);
  delivery = replay.evidence();
} finally { replay.close(); }
const refs = ['source:tactical_cards:terran_armed_forces', 'core.H3Fn8YSvEvpJZpT57qw1.items.2',
  'core.H3Fn8YSvEvpJZpT57qw1.items.5', 'core.H3Fn8YSvEvpJZpT57qw1.items.5.subItems.1'];
const sources = refs.map(ref => input.frozenSources.prompt.sources.find(s => s.ref === ref));
assert(sources.every(Boolean));
assert(sources[0].passages.map(p => p.text).join('').includes('Terran Tenacity <Active> <Movement Phase>'));
const review = captured[0], editor = captured[1], later = captured[3];
assert(review.output.verdicts.some(v => v.verdict === 'uncertain'));
assert(editor.output.replacements[0].value.procedure[0].includes('卡面未含<Active>标记'));
assert(later.output.verdicts.some(v => v.verdict === 'unsupported' && v.reason.includes('明确标注')));
const focused = new Set(review.request.workspace.outputRequestAtEnd.targetContract.focusedSources.map(s => s.ref));
const report = seal({ version: 'actual_faction_phase_regression_diagnosis_v1', runId, recipeHash: recipe.hash,
  inputHash: input.hash, terminalReportHash: terminal.hash, captured, failedResponses, delivery, loops,
  authoritativeSources: sources, fullContextSourceMissing: false, activeMarkupLostInRequest: false,
  focusDependencyRefsAbsent: refs.filter(ref => !focused.has(ref)),
  observedFailure: 'uncertain_review_induced_false_missing_active_edit_then_both_routes_rejected_it',
  causeBoundary: 'complete_sources_delivered_but_editor_replaced_source_backed_fields_without_regression_guard',
  focusClosureAsContributingCauseProven: false, terminalFailureSeparateFromSemanticRegression: true,
  candidateAccepted: false, actualRepairPerformed: false, newProviderCalls: 0,
  productionJournalMutated: false, sourceRefreshPerformed: false, trainingTruth: false });
await writeFile(path.join(base, runId, 'phase-regression-diagnosis.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, actualRolesReplayed: loops.length, receipts: delivery.receiptHashes.length,
  missingFocusDependencies: report.focusDependencyRefsAbsent, newProviderCalls: 0, hash: report.hash }));
