import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionCommandRecoveryV1, normalizeFactionReviewCommandEnvelopeV1, createFactionAccountedModelV1 } from '../packages/skill-production-v3/faction-command-envelope-v1.mjs';
import { normalizeFactionCoverageMetadataV1, validateTargetedFactionReviewV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { validateFactionReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext, compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, exact, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const parentRunId = 'faction-v1-228b8989edaaba791753', primaryRunId = 'faction-v1-907961cf3b449dd64c64';
const [parent, primaryParent, captured, input] = await Promise.all([
  json(parentRunId + '/recipe'), json(primaryRunId + '/recipe'), json(parentRunId + '/failed-review-role-input'), json('terran_armed_forces-input')]);
assert.equal(captured.recipeHash, parent.hash);
const primary = inspectFactionCommandRecoveryV1({ filename, parentRunId: primaryRunId, parent: primaryParent });
const recovery = inspectFactionCommandRecoveryV1({ filename, parentRunId, parent });
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const task = compileGlobalTask(context, captured.request.instruction, captured.request.workspace);
const output = recovery.attempts[1].response.output, targets = captured.request.workspace.outputRequestAtEnd.targetContract;
const normalizeArgs = { stageId: captured.stageId, output, observed: { messages: [{ role: 'user', content: task }], tools: [] } };
let checks = 0;
function check(name, run) { run(); checks++; }
check('old closed coverage schema reproduces exact paid failure', () => {
  assert.throws(() => exact(output.coverage[0], ['sourceRef', 'verdict', 'recommendationIndices', 'reason']), { code: 'OUTPUT_SCHEMA_INVALID' });
  assert.deepEqual(output.coverage[0].sourceRefs, []);
});
const normalized = normalizeFactionReviewCommandEnvelopeV1(normalizeArgs), bound = validateTargetedFactionReviewV1(output, targets);
check('command envelope retains entire paid response including redundant metadata', () => {
  assert.equal(hash(normalized.command.content), hash(output));
  assert.equal(normalized.command.content.verdicts.filter(row => row.verdict === 'unsupported').length, 1);
  assert(!normalized.proseChanged && !normalized.judgmentsChanged && !normalized.semanticReviewPassed);
});
check('coverage projection removes only known empty metadata and records it', () => {
  assert.equal(bound.coverageMetadataRepairs.length, 1);
  assert.deepEqual(bound.coverageMetadataRepairs[0].ignoredEmptyMetadata, { sourceRefs: [] });
  assert.equal(bound.coverageMetadataRepairs[0].originalRowHash, hash(output.coverage[0]));
  assert(!bound.coverageMetadataRepairs[0].coverageJudgmentChanged);
  const { sourceRefs, ...expected } = output.coverage[0];
  assert.deepEqual(bound.review.coverage[0], expected);
});
check('real target references and complete downstream review validation pass', () => {
  const w = captured.request.workspace;
  validateFactionReviewV1(bound.review, { input, section: w.section, draft: w.draft,
    reviewIndices: w.reviewIndices, requiredSourceRefs: w.coverageRequiredSourceRefs });
  assert.equal(bound.review.verdicts[0].verdict, 'unsupported');
  assert.equal(bound.review.verdicts[0].reason, output.verdicts[0].reason);
});
check('projection is idempotent and returns no extra receipt for standard rows', () => assert.deepEqual(normalizeFactionCoverageMetadataV1(bound.review.coverage).repairs, []));
check('preexisting identical source alias stays byte-for-byte without a new receipt', () => {
  const row = { ...bound.review.coverage[0], sourceRefs: [bound.review.coverage[0].sourceRef] };
  assert.deepEqual(normalizeFactionCoverageMetadataV1([row]), { coverage: [row], repairs: [] });
});
for (const sourceRefs of [['source:invented'], null, {}, '']) check('nonempty or malformed metadata rejected', () => {
  const coverage = output.coverage.map((row, n) => n ? row : { ...row, sourceRefs });
  assert.throws(() => normalizeFactionCoverageMetadataV1(coverage), { code: 'FACTION_REVIEW_COVERAGE_METADATA_INVALID' });
  assert.throws(() => normalizeFactionReviewCommandEnvelopeV1({ ...normalizeArgs, output: { ...output, coverage } }), { code: 'OUTPUT_SCHEMA_INVALID' });
});
check('unknown fields are never silently dropped', () => assert.throws(() => normalizeFactionCoverageMetadataV1([{ ...output.coverage[0], approved: true }]), { code: 'OUTPUT_SCHEMA_INVALID' }));
check('primary exact recovery manifest is unchanged', () => assert.equal(primary.manifest.hash, parent.commandRecoveryBinding.hash));
check('duplicate recovery declarations rejected', () => assert.throws(() => createFactionAccountedModelV1({ store: {}, recovery: primary, additionalRecoveries: [primary] }), { code: 'FACTION_COMMAND_RECOVERY_SET_DUPLICATE' }));
const { hash: ignored, ...recoveryBody } = recovery.manifest;
check('foreign source binding cannot enter recovery set', () => assert.throws(() => createFactionAccountedModelV1({ store: {}, recovery: primary,
  additionalRecoveries: [{ ...recovery, manifest: seal({ ...recoveryBody, modelHash: hash('other') }) }] }), { code: 'FACTION_COMMAND_RECOVERY_SET_DRIFT' }));

const temp = await mkdtemp(path.join(base, 'review-metadata-recovery-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'review-metadata', recipeHash: hash(recovery.manifest) });
let paidCalls = 0;
try {
  const dsh = await prepareDshLoop(root);
  const model = createFactionAccountedModelV1({ store, recovery: primary, additionalRecoveries: [recovery],
    maxInputBytes: 1_000_000, outputRecoveryLimit: 4096, complete: () => { paidCalls++; fail('FORBIDDEN_NEW_PROVIDER_CALL'); } });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh });
  const result = await runtime.role(captured.request);
  check('exact failed and successful old requests replayed through real DSH without any send', () => {
    assert.equal(paidCalls, 0); assert.equal(store.summary().calls, 0); assert.equal(result.loop.calls, 1);
    assert.equal(hash(result.output), hash(output));
    assert.equal(result.loop.transcript[0].receiptHash, recovery.attempts[1].receiptHash);
  });
  const receipt = store.artifact(captured.stageId + '.command-envelope.call-1');
  check('receipt selects additional origin rather than rewriting primary origin', () => {
    assert.equal(receipt.originRunId, parentRunId); assert.equal(receipt.recoveryManifestHash, recovery.manifest.hash);
    assert.equal(receipt.requestHash, recovery.attempts[1].requestHash);
    assert.equal(receipt.rawReceiptHash, recovery.attempts[1].receiptHash);
    assert.equal(receipt.normalized.normalizedCommandWireHash, result.loop.transcript[0].commandHash);
  });
  assert.equal((await runtime.role(captured.request)).hash, result.hash); assert.equal(paidCalls, 0); checks++;
  const files = ['packages/skill-production-v3/faction-command-envelope-v1.mjs', 'packages/skill-production-v3/faction-review-targets-v1.mjs',
    'packages/skill-production/model.mjs', 'packages/skill-production-v3/runtime.mjs', 'scripts/verify-ticket-18-faction-review-metadata-recovery-v1.mjs'];
  const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
  const report = seal({ passed: true, checks, codeHashes, inputHash: input.hash, parentRunId,
    primaryRecoveryManifestHash: primary.manifest.hash, recoveryManifest: recovery.manifest, capturedRoleHash: captured.hash,
    actualRoleReplayHash: result.hash, envelopeReceipt: receipt, coverageBinding: bound,
    dshBinding: dsh.binding, actualDshSessions: 1, exactPriorProviderRequestsMatched: true,
    rawOutputPreserved: true, originalNegativeJudgmentsPreserved: 1, nonemptyMetadataRejected: true,
    prefixRecoveryRetained: true, attemptsCopied: 0, providerCalls: 0,
    semanticAcceptanceInherited: false, generalSemanticCorrectnessProven: false, trainingTruth: false });
  await writeFile(path.join(base, parentRunId, 'review-metadata-recovery-readiness.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0, hash: report.hash }));
} finally { store.close(); }
