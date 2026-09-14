import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { FACTION_DUAL_COORDINATE_REVIEW_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-dual-coordinate-review-binding-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-6d345a142fa24636bab7';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name, 'utf8')));
const source = new DatabaseSync(filename, { readOnly: true });
const ledger = () => source.prepare('SELECT * FROM attempts ORDER BY run,id').all();
const beforeHash = hash(ledger());
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const diagnosis = await json(runId + '/actual-resume-diagnosis-7fb9531534ff84cd30f0.json');
const component = await json('dual-coordinate-coverage-component-v1.json');
for (const row of component.codeHashes) assert.equal(row.hash, sha256(await readFile(row.file)));
const input = await json(runId + '/zerg_swarm-input.json');
const recipe = await json(runId + '/recipe.json'), capabilities = await json(runId + '/active-capabilities.json');
const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId, attemptId: diagnosis.zerg.attemptId });
assert.equal(evidence.candidate.hash, diagnosis.zerg.originalCandidateHash);
const request = diagnosis.zerg.request;
const directory = await mkdtemp(base + 'dual-coordinate-runtime-'), testDb = directory + '/journal.sqlite';
const storeOptions = { runId: 'dual-coordinate-fixture-' + hash(directory).slice(0, 16), recipeHash: hash({ recipe: recipe.hash, binding }) };
let journal = openProductionStore(testDb, storeOptions), value, roleInput, checks = 0;
const store = { acquire(id, body) {
  assert.equal(id, request.packet.id + '.' + request.roleId);
  if (roleInput) assert.deepEqual(body, roleInput); else roleInput = body;
  return journal.acquire(id, body);
}, finish(lease, saved) { return value = journal.finish(lease, saved); }, release(lease) { journal.release(lease); } };
const nativeDsh = await prepareDshLoop(process.cwd()); let dshCalls = 0;
const dsh = { ...nativeDsh, run: q => { dshCalls++; return nativeDsh.run(q); } };
const forbidden = () => assert.fail('No regeneration, new Provider call or billing during saved-output recovery');
const runtime = () => createFactionStructuredReviewRuntimeV1({ input, store, dsh, outputContract: contract,
  executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false },
  runtime: { role: forbidden }, providerAdapter: { complete: forbidden }, priceUsage: forbidden, egressBinding: {},
  capabilityReceipt: capabilities.catalogueReview, includeSharedScenarioSources: true,
  completeReviewImports: [evidence], coverageAddressBinding: binding.coverageAddress, completeReviewImportBinding: binding.reviewImport });
try {
  await runtime().role(request);
  assert.deepEqual(value.output.coverage.map(r => r.recommendationIndices), [[5], [5]]); checks++;
  assert.equal(value.completeReviewImportProof.candidateHash, evidence.candidate.hash); checks++;
  assert.equal(value.completeReviewImportProof.providerCalls, 0); checks++;
  assert.equal(value.hostMaterializationReceipt.coverageAddressResolution.bindingHash, binding.coverageAddress.hash); checks++;
  for (let i = 0; i < 2; i++) {
    assert.equal(value.output.coverage[i].reason, evidence.candidate.providerValue.coverage[i].reason); checks++;
    assert.equal(value.output.coverage[i].verdict, evidence.candidate.providerValue.coverage[i].verdict); checks++;
    assert.equal(value.output.verdicts[i].reason, evidence.candidate.providerValue.verdicts[i].reason); checks++;
    assert.equal(value.output.verdicts[i].verdict, evidence.candidate.providerValue.verdicts[i].verdict); checks++;
  }
  assert.equal(journal.summary().calls, 0); checks++;
} finally { journal.close(); }
journal = openProductionStore(testDb, storeOptions);
try {
  assert.equal((await runtime().role(request)).hash, value.hash); checks++;
  assert.equal(dshCalls, 1); checks++;
  assert.equal(journal.summary().calls, 0); checks++;
} finally { journal.close(); }
const reseal = v => { const { hash: ignored, ...body } = v; return seal(body); };
const proofArgs = { value, roleInput, request, input, recipe: reseal({ ...recipe, dualCoordinateReviewBinding: binding }),
  resolveArtifact: h => [evidence.candidate, evidence.runtimeReceipt].find(a => a.hash === h),
  resolveResponse: h => h === evidence.candidate.providerReceiptHash ? { response: verifySeal(JSON.parse(evidence.attempt.response)).value } : null,
  resolveCompleteReviewImportEvidence: () => evidence };
const proof = verifyFactionStructuredRoleReplayV1(proofArgs);
assert.deepEqual(proof.providerReceiptHashes, [evidence.candidate.providerReceiptHash]); checks++;
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, recipe }),
  { code: 'FACTION_REVIEW_COMPLETE_IMPORT_CONSUMER_BINDING_REQUIRED' }); checks++;
const changed = structuredClone(value); changed.output.coverage[0].reason += ' fabricated source';
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, value: reseal(changed) }),
  { code: 'FACTION_STRUCTURED_REPLAY_HOST_MAPPING_DRIFT' }); checks++;
const wrongIndex = structuredClone(value); wrongIndex.output.coverage[0].recommendationIndices = [4];
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, value: reseal(wrongIndex) }),
  { code: 'FACTION_STRUCTURED_REPLAY_HOST_MAPPING_DRIFT' }); checks++;
assert.equal(hash(ledger()), beforeHash); checks++; source.close();
const files = ['packages/skill-production-v3/faction-review-coverage-address-v5.mjs',
  'packages/skill-production-v3/faction-dual-coordinate-review-binding-v1.mjs',
  'packages/skill-production-v3/faction-review-complete-output-import-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/verify-ticket-18-dual-coordinate-review-runtime-v1.mjs'];
const report = seal({ version: 'faction_dual_coordinate_review_runtime_component_v1', passed: true, checks, binding,
  componentHash: component.hash, originRunId: runId, originAttemptId: evidence.attempt.id, inputHash: input.hash,
  originalCandidateHash: evidence.candidate.hash, originalReceiptHash: evidence.candidate.providerReceiptHash,
  recoveredRole: value, consumerProof: proof, originalJudgmentsPreserved: true, actualContextRebuilt: true,
  sqliteRestartPassed: true, consumerReplayPassed: true, actualDshSessions: dshCalls,
  providerCalls: 0, originalAttemptsUnchanged: true, mainProductionWired: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'dual-coordinate-review-runtime-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: dshCalls, providerCalls: 0, hash: report.hash }));
