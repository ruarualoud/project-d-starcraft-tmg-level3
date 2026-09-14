import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4 as before,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as after,
  STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1 as binding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { materializeFactionStructuredReviewV1, createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionCatalogueReviewRuntimeV1 } from '../packages/skill-production-v3/faction-catalogue-review-runtime-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createFactionWritingPlanV1, resolveFactionReviewReasonMaximumV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/';
const input = verifySeal(JSON.parse(await readFile(base + 'terran_armed_forces-input.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const run = 'faction-v1-49e1f39e41163c6b0590';
const get = id => verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(run, id).artifact)).value);
const first = get('structured-2e4bcc5599ff0166f9b99d3ab903db1f4136b154cc9222fa.rejected-candidate');
const repeat = get('structured-cf5a1f2f19813d72cf7bf7386ff187d413d6711d44f75929.rejected-candidate');
const draft = get('faction.terran_armed_forces.threat_tradeoffs.1.known-rule-correction').draft;
db.close();
assert.equal(hash(first.providerValue), hash(repeat.providerValue));
assert.deepEqual(validate(before.providerSchema, first.providerValue).issues,
  [{ path: '$.verdicts[0].sourceSlots', code: 'array_too_long', actualItems: 11, minItems: 1, maxItems: 8 }]);
assert.equal(validate(after.providerSchema, first.providerValue).ok, true);
const reset = structuredClone(after.providerSchema);
reset.properties.verdicts.items.properties.sourceSlots.maxItems = 8;
assert.equal(hash(reset), hash(before.providerSchema));
assert.equal(binding.prior.hash, '4f85334c51c68c93dbc191564fecd975ef9e8556545a74c132be2f12137a5124');
const section = createFactionWritingPlanV1(input).sections.find(s => s.axis === 'threat_tradeoffs');
const reviewIndices = [2, 3], requiredSourceRefs = [];
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: reviewIndices });
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section, draft, reviewIndices,
  coverageRequiredSourceRefs: requiredSourceRefs, targets, roleRef: first.roleRef,
  outputContractRef: binding.current, route: 'supportive' });
const materialize = providerOutput => materializeFactionStructuredReviewV1({ providerOutput, capsule,
  input, section, draft, reviewIndices, requiredSourceRefs, targets,
  reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
const rebuilt = materialize(first.providerValue);
assert.equal(rebuilt.output.verdicts[0].sourceRefs.length, 11);
assert.equal(rebuilt.receipt.judgmentsChanged, false);
assert.equal(rebuilt.receipt.semanticAcceptanceInherited, false);
const negative = structuredClone(first.providerValue); negative.verdicts[0].verdict = 'unsupported';
assert.equal(materialize(negative).output.verdicts[0].verdict, 'unsupported');
const foreign = structuredClone(first.providerValue); foreign.verdicts[0].sourceSlots.push(9999);
assert.throws(() => materialize(foreign), { code: 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID' });
const duplicate = structuredClone(first.providerValue); duplicate.verdicts[0].sourceSlots.push(duplicate.verdicts[0].sourceSlots[0]);
assert.equal(validate(after.providerSchema, duplicate).ok, false);
const artifact = seal({ structuredDecodePassed: true, outputContractRef: binding.current });
assert.equal(resolveFactionReviewReasonMaximumV1(artifact, null, binding), 16384);
assert.throws(() => resolveFactionReviewReasonMaximumV1(artifact, null, null));
// Synthetic capability is confined to this no-egress request-hash test. It is
// never persisted as a production capability or passed to a live Provider.
const capabilityReport = verifySeal(JSON.parse(await readFile('build/ticket-18-structured-generation-v1/r6-structured-review-capability-report.json', 'utf8')));
const real = JSON.parse(await readFile('build/ticket-18-structured-generation-v1/' + capabilityReport.runId + '/capability-receipt.json', 'utf8'));
const { schemaVersion, trainingTruth, receiptHash, ...capabilityBody } = real;
const syntheticCapability = createStarcraftTmgProviderCapabilityReceiptV1({ ...capabilityBody,
  outputContractRef: binding.current, probeInputHash: hash('fixture-input'), probeOutputHash: hash('fixture-output') });
const request = { packet: seal({ id: 'faction.terran_armed_forces', inputHash: input.hash, sourceBinding: input.sourceBinding }),
  roleId: first.roleRef.id, workspace: { inputHash: input.hash, section, draft, reviewIndices,
    coverageRequiredSourceRefs: requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
  encryptedRawQuarantineAvailable: false };
const captured = [];
const noEgress = () => { throw new Error('test forbids egress'); };
const store = { acquire: (id, value) => { captured.push({ id, value }); return { cached: true, artifact }; } };
const legacyRuntime = { role: async () => ({ fixture: 'frozen-legacy-route' }) };
const native = createFactionStructuredReviewRuntimeV1({ input, runtime: legacyRuntime, store,
  dsh: { run: noEgress }, providerAdapter: { complete: noEgress }, egressBinding: {},
  capabilityReceipt: syntheticCapability, outputContract: after, executionPolicy: policy, priceUsage: noEgress });
await native.role(request);
await createFactionCatalogueReviewRuntimeV1({ input, legacyRuntime, store,
  executionPolicy: policy, legacyRoleIds: [] }).role(request);
assert.equal(hash(captured[0]), hash(captured[1]));
const legacy = await createFactionCatalogueReviewRuntimeV1({ input, legacyRuntime, store,
  executionPolicy: policy, legacyRoleIds: [request.packet.id + '.' + request.roleId] }).role(request);
assert.equal(legacy.fixture, 'frozen-legacy-route');
const currentDb = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const scopeRun = 'faction-v1-332edf18bf75e7aa8cc3';
const scopeCandidate = verifySeal(verifySeal(JSON.parse(currentDb.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
  .get(scopeRun, 'structured-0eabce888712143ca359029886031cf3f72c668917b84d9f.candidate').artifact)).value);
currentDb.close();
const scopeTargets = createFactionReviewTargetsV1({ input, section, draft, indices: [0, 1] });
const scopeInput = { factionInput: input, section, draft, reviewIndices: [0, 1],
  coverageRequiredSourceRefs: section.requiredSourceRefs, targets: scopeTargets,
  roleRef: scopeCandidate.roleRef, outputContractRef: binding.current, route: 'adversarial' };
const omitted = createFactionReviewContextCapsuleV1(scopeInput);
const included = createFactionReviewContextCapsuleV1({ ...scopeInput, includeSharedScenarioSources: true });
const inspectScope = capsule => materializeFactionStructuredReviewV1({ providerOutput: scopeCandidate.providerValue,
  capsule, input, section, draft, reviewIndices: [0, 1], requiredSourceRefs: section.requiredSourceRefs,
  targets: scopeTargets, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
assert.throws(() => inspectScope(omitted), { code: 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID' });
assert.equal(inspectScope(included).output.verdicts[0].verdict, 'unsupported');
assert.equal(included.localIssue.reviewTask.sourceCatalogue.find(row => row.slot === 321).ref, 'source:faction_cards:mission_divide_and_conquer');
assert.equal(included.localIssue.reviewTask.sourceCatalogue.find(row => row.slot === 321).includedAs, 'relevant_product_node');
assert.notEqual(omitted.hash, included.hash);
// Shared-scenario context is versioned independently of output schema.
// The old paid V5 role still compiles its exact original request.
await createFactionCatalogueReviewRuntimeV1({ input, legacyRuntime, store, executionPolicy: policy,
  legacyRoleIds: [], frozenCurrentRoleIds: [request.packet.id + '.' + request.roleId], includeSharedScenarioSources: true }).role(request);
assert.equal(hash(captured[0]), hash(captured.at(-1)));
const files = ['content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs',
  'packages/skill-production-v3/faction-catalogue-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-context-capsule-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'scripts/verify-ticket-18-faction-catalogue-review-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const report = seal({ passed: true, binding, actualFailureRunId: run,
  originalCandidateHash: first.hash, redundantRepairCandidateHash: repeat.hash,
  preservedSourceCount: 11, oldContractStillRejects: true, exactSchemaChangeTested: true,
  unknownSourcesRejected: true, negativeJudgmentsPreserved: true,
  dryAndNativeRoleInputHashesMatch: true, exactLegacyRouteRetained: true,
  sharedScenarioSourceFailureReproduced: true, sharedScenarioContextRepairPassed: true,
  sharedScenarioNegativeJudgmentPreserved: true, oldV5ContextRetained: true,
  sourceSemanticTruthProven: false, providerCalls: 0, codeHashes, trainingTruth: false });
await writeFile(base + 'catalogue-review-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, sourcesPreserved: 11, providerCalls: 0, hash: report.hash }));
