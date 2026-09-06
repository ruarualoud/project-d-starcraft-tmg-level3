import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as workflow from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(base, file + '.json'), 'utf8')));
const runId = 'faction-v1-ba2a32dd31a97f909ac4', sectionId = 'faction.terran_armed_forces.phase_tempo.1';
const stageId = 'faction.terran_armed_forces.' + sectionId + '.source-reconstruction.1.0';
const [input, knownRulePolicy, sourceSection, candidate, evidence] = await Promise.all([
  json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy'),
  json('field-repair-d393a7c3884ae5104f96/source-section'), json('field-repair-d393a7c3884ae5104f96/candidate'),
  json('field-repair-d393a7c3884ae5104f96/verified-evidence')]);
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let roles;
try { roles = new Map(db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'").all(runId)
  .map(row => [row.id, verifySeal(JSON.parse(row.artifact)).value])); } finally { db.close(); }
const original = roles.get(stageId), raw = original.output;
const first = roles.get(sectionId + '.known-rule-correction').draft;
const round0 = roles.get(sectionId + '.issue-journal.0');
const replacements = round0.issues.issues.flatMap((_, n) => roles.get('faction.terran_armed_forces.' + sectionId + '.editor.0.' + n).output.replacements);
const draft = workflow.applyFactionStrategyPatchV1({ parentHash: hash(first), replacements, additions: [] }, { input, draft: first, issues: round0.issues });
const journal = roles.get(sectionId + '.issue-journal.1');
assert.equal(hash(draft), journal.draftHash);
const { hash: ignored, ...issueBody } = journal.issues;
const issues = seal({ ...issueBody, issues: [journal.issues.issues[0]], openIssues: 1 });
const args = { input, draft, issues };
// RED: exact actual source-reconstruction output fails only for the omitted
// additions channel. Binding and complete recommendation content are valid.
assert.throws(() => workflow.applyFactionStrategyPatchV1(raw, args), { code: 'OUTPUT_SCHEMA_INVALID' });
assert.equal(Object.hasOwn(raw, 'additions'), false);
const expected = workflow.applyFactionStrategyPatchV1({ ...raw, additions: [] }, args);
assert.equal(hash(raw.replacements[0].value), hash(expected.recommendations[2]));
assert.equal(typeof workflow.normalizeFactionStrategyPatchEnvelopeV1, 'function', 'Actual missing-empty-additions patch needs source-scoped envelope recovery');
let checks = 0;
function check(name, run) { run(); checks++; }
const normalize = value => workflow.normalizeFactionStrategyPatchEnvelopeV1(value, args);
const repaired = normalize(raw);
check('actual shape recovery preserves every authored value and original negative issue', () => {
  assert.equal(hash(repaired.output), hash({ ...raw, additions: [] }));
  assert.equal(repaired.receipt.originalOutputHash, hash(raw));
  assert.equal(repaired.receipt.issuesHash, issues.hash);
  assert.equal(repaired.receipt.semanticAcceptanceInherited, false);
  assert.equal(repaired.receipt.sourceOmissions, 0);
  assert.equal(hash(original.output), hash(raw));
  assert.deepEqual(issues.issues[0].findings.map(row => row.verdict), ['unsupported']);
});
check('all unflagged recommendations survive', () => {
  const next = workflow.applyFactionStrategyPatchV1(repaired.output, args);
  draft.recommendations.forEach((row, n) => { if (n !== 2) assert.equal(hash(row), hash(next.recommendations[n])); });
});
check('repeated normalization never adds another receipt', () => assert.equal(normalize(repaired.output).receipt, null));
check('genuinely omitted sources cannot infer an empty additions channel', () => {
  const omitted = seal({ ...issueBody, issues: [...issues.issues, { kind: 'assigned_source_omission', sourceRef: 'source:army_units:marine' }], openIssues: 2 });
  assert.throws(() => workflow.normalizeFactionStrategyPatchEnvelopeV1(raw, { ...args, issues: omitted }), { code: 'OUTPUT_SCHEMA_INVALID' });
});
check('unknown keys not silently discarded', () => assert.throws(() => normalize({ ...raw, approved: true }), { code: 'OUTPUT_SCHEMA_INVALID' }));
check('missing replacements not inferred', () => assert.throws(() => normalize({ parentHash: raw.parentHash, additions: [] }), { code: 'OUTPUT_SCHEMA_INVALID' }));
check('invalid additions type rejected', () => assert.throws(() => normalize({ ...raw, additions: null }), { code: 'FACTION_PATCH_DENOMINATOR' }));
check('conflicting parent rejected', () => assert.throws(() => normalize({ ...raw, parentHash: hash('other') }), { code: 'FACTION_PATCH_PARENT_DRIFT' }));
check('unmarked target rejected', () => assert.throws(() => normalize({ ...raw, replacements: [{ ...raw.replacements[0], index: 0 }] }), { code: 'FACTION_PATCH_SCOPE_INVALID' }));
check('duplicate target rejected', () => assert.throws(() => normalize({ ...raw, replacements: [...raw.replacements, ...raw.replacements] }), { code: 'FACTION_PATCH_DENOMINATOR' }));
check('unchanged prose still no progress', () => assert.throws(() => normalize({ ...raw, replacements: [{ index: 2, value: draft.recommendations[2] }] }), { code: 'FACTION_PATCH_NO_PROGRESS' }));
check('invalid authored prose still rejected', () => assert.throws(() => normalize({ ...raw, replacements: [{ index: 2, value: { ...raw.replacements[0].value, risk: null } }] }), { code: 'TEXT_INVALID' }));

// Exercise the production call site using exact saved role outputs, stopping
// before the next previously unrequested model role. No new Provider request
// is made and no semantic acceptance is inherited from these raw fixtures.
const temp = await mkdtemp(path.join(base, 'patch-envelope-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'patch-envelope', recipeHash: hash(runId) });
let reached = null;
const runtime = { async role(request) {
  const id = request.packet.id + '.' + request.roleId;
  if (id === 'faction.terran_armed_forces.' + sectionId + '.editor.1.1') { reached = id; fail('NEXT_UNREQUESTED_ROLE_REACHED'); }
  const saved = roles.get(id); assert.equal(saved?.roleId, id); return saved;
} };
try {
  await assert.rejects(() => workflow.produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed: { sourceSection, candidate, evidence },
    registeredSourceFieldRepair: true, runtime, store }), { code: 'NEXT_UNREQUESTED_ROLE_REACHED' });
  assert(reached); checks++;
  const receiptId = stageId + '.patch-envelope-v1';
  const saved = store.acquire(receiptId, { artifactHash: original.hash, normalizationHash: repaired.receipt.hash });
  assert(saved.cached); assert.equal(saved.artifact.normalization.hash, repaired.receipt.hash);
  assert.equal(saved.artifact.rawArtifactHash, original.hash); checks++;
} finally { store.close(); }
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'scripts/verify-ticket-18-faction-patch-envelope-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks, runId, stageId, inputHash: input.hash, codeHashes, actualRawArtifactHash: original.hash,
  actualRawOutputHash: hash(raw), normalizedOutputHash: hash(repaired.output), normalizationReceipt: repaired.receipt,
  oldFailureReproduced: true, rawRoleWorkflowContinued: true, exactDshProviderRequestsReplayed: false,
  originalNegativeJudgmentsPreserved: true, nextUnrequestedRole: reached, sourceSemanticProblemsNotWaived: true,
  generalSemanticCorrectnessProven: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'patch-envelope-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0 }));
