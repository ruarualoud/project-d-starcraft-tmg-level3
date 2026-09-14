import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { validateFactionProductionTargetReviewV1, resolveFactionReviewReasonMaximumV1,
  createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_CATALOGUE_BINDING_V1 as catalogueReviewBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as reviewSlotNamespaceBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-8262a9a7181f3ec25c06';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const proof = await json('slot-review-dsh-runtime-v1'), input = await json(runId + '/zerg_swarm-input'), recipe = await json(runId + '/recipe');
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let draft;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  draft = verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, 'faction.zerg_swarm.unit_roles.1.zerg-unit-timing-correction-v1.0').artifact)).value.correction.proposedDraft;
} finally { db.close(); }
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.1');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const structuredReviewValidationBinding = seal({ version: 'faction_review_validation_binding_v1',
  outputContractRef: recipe.structuredReviewBinding.outputContractRef,
  reviewReasonMaximum: 16384, legacyReasonMaximum: 1200, trainingTruth: false });
const scope = { targets, input, section, draft, reviewIndices: batch.reviewIndices, requiredSourceRefs: batch.requiredSourceRefs,
  structuredReviewValidationBinding, catalogueReviewBinding, reviewSlotNamespaceBinding };
const checks = [];
for (const row of proof.roles) {
  const artifact = row.value;
  assert.equal(artifact.output.verdicts[0].sourceRefs.length, 11);
  const bound = validateFactionProductionTargetReviewV1(artifact.output, { ...scope, artifact });
  assert.equal(resolveFactionReviewReasonMaximumV1(artifact, structuredReviewValidationBinding, catalogueReviewBinding,
    reviewSlotNamespaceBinding), 16384);
  assert.equal(bound.review.verdicts[0].sourceRefs.length, 11);
  assert.deepEqual(bound.review.coverage[0].recommendationIndices, [2]);
  checks.push({ mode: row.mode, actualElevenSourceRefsRetained: true, passed: true });
  if (row.mode === 'legacy_recovery') continue;
  for (const delta of [{ reviewSlotNamespaceBinding: null },
    { artifact: seal({ ...artifact, hash: undefined, reviewSlotNamespaceBindingHash: hash('foreign') }) }])
    assert.throws(() => validateFactionProductionTargetReviewV1(artifact.output, { ...scope, artifact, ...delta }),
      { code: 'FACTION_REVIEW_VALIDATION_BINDING_INVALID' });
}
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs',
  'scripts/verify-ticket-18-slot-review-workflow-boundary-v1.mjs'];
const report = seal({ version: 'faction_slot_review_workflow_boundary_v1', passed: true, checks,
  dshProofHash: proof.hash, providerCalls: 0, actualDshSessions: 0,
  actualFullReviewWithElevenSourcesPassed: true, productionCallbackTested: true,
  candidateAcceptance: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'slot-review-workflow-boundary-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, modes: checks.length, providerCalls: 0, hash: report.hash }));
