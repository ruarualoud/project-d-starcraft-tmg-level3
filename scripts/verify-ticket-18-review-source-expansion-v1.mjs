import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionReviewSourceExpansionV1, verifyFactionReviewSourceExpansionV1,
  FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-review-source-expansion-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-e35baf291d46af687809';
const input = verifySeal(JSON.parse(await readFile(base + runId + '/zerg_swarm-input.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let draft, candidate, originHash, rejected;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  const artifact = id => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id).artifact)).value;
  draft = artifact('faction.zerg_swarm.unit_roles.2.known-rule-correction').draft;
  candidate = artifact('structured-6b514c78ccc815d4224adb4add808188556301ad932efdcc.candidate');
  rejected = artifact('structured-67644acbf8b1391d43179cf89cae2bd7a23ee30ee2248748.rejected-candidate');
  originHash = hash(db.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(runId));
} finally { db.close(); }
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.2');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 4);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
const prepared = prepareFactionSlotReviewRoleV1({ input, request: { packet, roleId: rejected.roleRef.id,
  workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
    coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } },
  executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
    encryptedRawQuarantineAvailable: false } });
assert.equal(prepared.capsule.hash, rejected.contextManifestRef.hash);
const options = { input, baseCapsule: prepared.capsule, triggerOutput: candidate.providerValue };
const before = hash(options), expanded = createFactionReviewSourceExpansionV1(options);
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
eq(hash(options), before);
eq(expanded.expandedSources.map(r => r.ref), ['source:tactical_cards:supply_depot']);
eq(expanded.context.localIssue.reviewTask.includedSourceSlots.includes(365), true);
const body = expanded.context.dependencyGraph.nodes.find(n => n.ref === expanded.expandedSources[0].ref).content;
eq(hash(body), expanded.expandedSources[0].sourceHash);
eq(JSON.parse(body.passages.map(p => p.text).join('')).faction, 'Terran');
eq(expanded.context.section, prepared.capsule.section);
eq(expanded.context.immutableBase, prepared.capsule.immutableBase);
eq(expanded.context.localIssue.reviewTask.targetContract, targets);
eq(expanded.context.localIssue.sourceContextExpansion.triggerOutput, candidate.providerValue);
eq(expanded.context.localIssue.schemaRepair, undefined);
eq(expanded.rosterPermissionGranted, false);
eq(expanded.originalReviewAccepted, false);
eq(expanded.freshWholeBatchReviewRequired, true);
eq(expanded.originalPaidContextClaimChanged, false);
eq(JSON.parse(expanded.context.compiledInput).orderedBlocks.find(b => b.kind === 'dependency_closure')
  .value.nodes.find(n => n.ref === expanded.expandedSources[0].ref).content, body);
eq(expanded.context.compiledInputBytes <= 512 * 1024, true);
for (const node of prepared.capsule.dependencyGraph.nodes)
  eq(expanded.context.dependencyGraph.nodes.find(n => n.ref === node.ref), node);
eq(verifyFactionReviewSourceExpansionV1({ ...options, expansion: expanded }).hash, expanded.hash);
const reseal = (v, patch) => { const { hash: ignored, ...rest } = v; return seal({ ...rest, ...patch }); };
for (const change of [e => { e.originalReviewAccepted = true; }, e => { e.rosterPermissionGranted = true; },
  e => { e.expandedSources[0].sourceHash = hash('wrong'); }, e => { e.context = reseal(e.context, { instructions: 'discard prior findings' }); }]) {
  const altered = structuredClone(expanded); change(altered);
  assert.throws(() => verifyFactionReviewSourceExpansionV1({ ...options, expansion: reseal(altered, {}) })); checks++;
}
const unknown = structuredClone(candidate.providerValue); unknown.verdicts[0].sourceSlots[0] = 511;
assert.throws(() => createFactionReviewSourceExpansionV1({ ...options, triggerOutput: unknown }),
  { code: 'FACTION_REVIEW_SOURCE_EXPANSION_UNKNOWN_SLOT' }); checks++;
const missing = structuredClone(candidate.providerValue); delete missing.verdicts[0].sourceSlots;
assert.throws(() => createFactionReviewSourceExpansionV1({ ...options, triggerOutput: missing }),
  { code: 'FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_SCHEMA' }); checks++;
for (const mutate of [v => { v.verdicts.pop(); }, v => { v.verdicts[1].targetSlot = 0; }]) {
  const wrongTargets = structuredClone(candidate.providerValue); mutate(wrongTargets);
  assert.throws(() => createFactionReviewSourceExpansionV1({ ...options, triggerOutput: wrongTargets }),
    { code: 'FACTION_REVIEW_SOURCE_EXPANSION_TARGET_SET' }); checks++;
}
const noGap = structuredClone(candidate.providerValue);
noGap.verdicts[0].sourceSlots = noGap.verdicts[0].sourceSlots.filter(n => n !== 365);
eq(createFactionReviewSourceExpansionV1({ ...options, triggerOutput: noGap }), null);
assert.throws(() => createFactionReviewSourceExpansionV1({ ...options, baseCapsule: expanded.context }),
  { code: 'FACTION_REVIEW_SOURCE_EXPANSION_ALREADY_EXPANDED' }); checks++;
// A second frozen omitted product proves this is not a Supply Depot exception.
const other = prepared.capsule.localIssue.reviewTask.sourceCatalogue.find(s => s.slot !== 365 && s.includedAs === 'not_in_current_faction_scope');
const syntheticTrigger = structuredClone(noGap); syntheticTrigger.verdicts[0].sourceSlots.push(other.slot);
eq(createFactionReviewSourceExpansionV1({ ...options, triggerOutput: syntheticTrigger }).expandedSources.map(s => s.ref), [other.ref]);
const readback = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try { eq(hash(readback.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(runId)), originHash); }
finally { readback.close(); }
const files = ['packages/skill-production-v3/faction-review-source-expansion-v1.mjs',
  'scripts/verify-ticket-18-review-source-expansion-v1.mjs'];
const report = seal({ version: 'faction_review_source_expansion_component_v1', passed: true, checks, binding,
  actualOriginRunId: runId, actualCandidateHash: candidate.hash, originalAttemptsHash: originHash,
  originalContextHash: prepared.capsule.hash, expansionHash: expanded.hash,
  expandedContextHash: expanded.context.hash, contextBytes: expanded.context.compiledInputBytes,
  exactSourceBodiesExpanded: expanded.expandedSources.length,
  originalVerdictsAndReasonsPreservedAsUnqualifiedEvidence: true,
  providerCalls: 0, actualDshSessions: 0, productionWired: false, freshReviewPerformed: false,
  originalReviewAccepted: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'review-source-expansion-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, productionWired: false,
  contextBytes: report.contextBytes, hash: report.hash }));
