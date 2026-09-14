import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { readFactionWireReviewFailureV1, prepareFactionReviewDecompositionV1,
  createFactionReviewFragmentCapsuleV1, assembleFactionReviewFragmentsV1,
  FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as originalContract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const read = async name => verifySeal(JSON.parse(await readFile(base + name, 'utf8')));
const diagnosis = await read('terran-wire-context-diagnosis-v2.json');
const input = await read(diagnosis.originRunId + '/terran_armed_forces-input.json');
const mapping = { section: diagnosis.request.workspace.section, draft: diagnosis.request.workspace.draft,
  reviewIndices: diagnosis.request.workspace.reviewIndices,
  requiredSourceRefs: diagnosis.request.workspace.coverageRequiredSourceRefs,
  targets: diagnosis.request.workspace.outputRequestAtEnd.targetContract };
const evidenceArgs = { filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId,
  capsule: diagnosis.capsule, invocation: diagnosis.invocation, providerRequest: diagnosis.providerRequest };
const evidence = readFactionWireReviewFailureV1(evidenceArgs);
const args = { input, capsule: diagnosis.capsule, evidence, originalContract, mapping };
const plan = prepareFactionReviewDecompositionV1(args);
let checks = 0;
const eq = (a, b) => { assert.equal(a, b); checks++; };
const ok = a => { assert(a); checks++; };
const rejects = (fn, code) => { assert.throws(fn, { code }); checks++; };
eq(plan.jobs.length, 3);
eq(plan.jobs.filter(j => j.kind === 'target').length, 2);
eq(plan.jobs.filter(j => j.kind === 'coverage').length, 1);
eq(plan.origin.originalReceiptHash, diagnosis.originalReceiptHash);
eq(plan.originalProviderCallsReplayed, 0);
eq(plan.originalRawRecovered, false);
eq(plan.maximumNewProviderCalls, 3);
eq(plan.semanticAcceptanceInherited, false);
const parts = plan.jobs.map(job => {
  const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
  eq(hash(prepared.capsule.dependencyGraph), hash(diagnosis.capsule.dependencyGraph));
  eq(hash(prepared.capsule.section), hash(diagnosis.capsule.section));
  eq(hash(prepared.capsule.immutableBase), hash(diagnosis.capsule.immutableBase));
  eq(hash(prepared.capsule.localIssue.reviewTask), hash(diagnosis.capsule.localIssue.reviewTask));
  ok(prepared.capsule.compiledInputBytes < 512 * 1024);
  ok(prepared.capsule.roleRef.hash !== diagnosis.capsule.roleRef.hash);
  ok(prepared.contract.contractHash !== originalContract.contractHash);
  eq(prepared.capsule.section.completeCurrentDraft.recommendations.length, 8);
  const task = prepared.capsule.localIssue.fragmentTask;
  const value = job.kind === 'target' ? {
    focusPaths: [task.target.fields[0].path],
    verdict: job.slot === 0 ? 'unsupported' : 'uncertain',
    reason: 'Injected negative review to verify preservation, not a model judgment.',
    sourceSlots: [diagnosis.capsule.localIssue.reviewTask.sourceCatalogue.find(s =>
      s.ref === task.target.recommendation.sourceRefs[0]).slot],
  } : { verdict: 'covered', recommendationSlots: [mapping.draft.recommendations.findIndex(r =>
    r.sourceRefs.includes(job.sourceRef))], reason: 'Injected coverage, not independent semantic evidence.' };
  ok(validateStarcraftTmgProviderJsonSchemaValueV1(prepared.contract.providerSchema, value).ok);
  return seal({ jobId: job.id, planHash: plan.hash, contextHash: prepared.capsule.hash,
    outputContractHash: prepared.contract.contractHash, value, semanticAcceptance: false, trainingTruth: false });
});
const assembled = assembleFactionReviewFragmentsV1({ ...args, plan, parts });
eq(assembled.output.verdicts[0].verdict, 'unsupported');
eq(assembled.output.verdicts[1].verdict, 'uncertain');
eq(assembled.output.verdicts[0].reason, parts[0].value.reason);
eq(assembled.output.coverage[0].reason, parts[2].value.reason);
eq(assembled.semanticAcceptanceInherited, false);
eq(assembled.quoteOrigin, 'host_exact_prefix_of_model_selected_candidate_field');
eq(assembleFactionReviewFragmentsV1({ ...args, plan, parts: [...parts].reverse() }).hash, assembled.hash);
rejects(() => assembleFactionReviewFragmentsV1({ ...args, plan, parts: parts.slice(1) }), 'FACTION_REVIEW_FRAGMENT_DENOMINATOR');
rejects(() => assembleFactionReviewFragmentsV1({ ...args, plan, parts: [parts[0], parts[0], parts[2]] }), 'FACTION_REVIEW_FRAGMENT_DENOMINATOR');
const reseal = (value, changes) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...changes }); };
const changed = (ordinal, value) => parts.map((p, i) => i === ordinal ? reseal(p, { value }) : p);
rejects(() => assembleFactionReviewFragmentsV1({ ...args, plan, parts: changed(0,
  { ...parts[0].value, focusPaths: ['procedure.999'] }) }), 'FACTION_REVIEW_FRAGMENT_FOCUS_INVALID');
rejects(() => assembleFactionReviewFragmentsV1({ ...args, plan, parts: changed(0,
  { ...parts[0].value, targetSlot: 1 }) }), 'FACTION_REVIEW_FRAGMENT_SCHEMA_INVALID');
rejects(() => assembleFactionReviewFragmentsV1({ ...args, plan, parts: changed(0,
  { ...parts[0].value, sourceSlots: [511] }) }), 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID');
rejects(() => assembleFactionReviewFragmentsV1({ ...args, plan, parts: parts.map((p, i) => i ? p : reseal(p,
  { contextHash: hash('other context') })) }), 'FACTION_REVIEW_FRAGMENT_BINDING_INVALID');
rejects(() => prepareFactionReviewDecompositionV1({ ...args, capsule: reseal(diagnosis.capsule,
  { section: { ...diagnosis.capsule.section, parentDraftHash: hash('drift') } }) }), 'FACTION_REVIEW_DECOMPOSITION_ORIGIN_DRIFT');
rejects(() => readFactionWireReviewFailureV1({ ...evidenceArgs, providerRequest:
  { ...diagnosis.providerRequest, maxOutputUnits: 8192 } }), 'FACTION_WIRE_REVIEW_FAILURE_REQUEST_DRIFT');
const badMapping = structuredClone(mapping);
badMapping.draft.recommendations[0].risk += ' changed';
rejects(() => prepareFactionReviewDecompositionV1({ ...args, mapping: badMapping }), 'FACTION_REVIEW_DECOMPOSITION_MAPPING_DRIFT');
const report = seal({ version: 'faction_review_decomposition_component_v1', passed: true, checks, binding,
  actualFailureUsed: true, originRunId: evidence.runId, originAttemptId: evidence.attemptId,
  originalReceiptHash: evidence.originalReceiptHash, plan, actualOriginalContextBytes: diagnosis.capsule.compiledInputBytes,
  completeDraftAndSourcesRetained: true, hostIdentityAndQuoteMaterialization: true,
  allReviewOutputsInjected: true, providerCalls: 0, productionRuntimeWired: false,
  actualLostPayloadRecovered: false, independentQualification: false, trainingTruth: false,
  codeHashes: await Promise.all(['scripts/verify-ticket-18-review-decomposition-v1.mjs',
    'packages/skill-production-v3/faction-review-decomposition-v1.mjs',
    'content/skill-generation/ticket-18-faction-review-fragment-contracts-v1.mjs'].map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'review-decomposition-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualFailureUsed: true, fragmentJobs: plan.jobs.length,
  providerCalls: 0, productionRuntimeWired: false, hash: report.hash }));
