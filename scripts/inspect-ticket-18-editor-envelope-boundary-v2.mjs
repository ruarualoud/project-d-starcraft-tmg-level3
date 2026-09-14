import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as editorContract } from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as binding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { validateFactionDraftV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';

// A counterexample to end-to-end contract closure, not an actual paid editor
// failure. Reuse actual already-paid advice and do not call any Provider.
const base = 'build/ticket-18-faction-production-v1/';
const read = async n => verifySeal(JSON.parse(await readFile(base + n + '.json', 'utf8')));
const component = await read('draft-envelope-recovery-component-v2');
const samples = [];
for (const [ordinal, faction, expectedPath] of [
  [0, 'terran_armed_forces', '$.sourceRefs'], [1, 'zerg_swarm', '$.unproven'],
]) {
  const origin = component.origins[ordinal];
  const input = await read(origin.originRunId + '/' + faction + '-input');
  const evidence = readFactionTeachFailureEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
    runId: origin.originRunId, attemptId: origin.originAttemptId });
  assert.equal(evidence.rejected.hash, origin.rejectedCandidateHash);
  const item = evidence.rejected.providerValue.items[1], advice = item.value;
  const originalHash = hash(advice), original = validate(editorContract.providerSchema, advice);
  assert.equal(original.ok, false);
  assert.equal(original.issues.length, 1);
  assert.equal(original.issues[0].path, expectedPath);
  assert.equal(original.issues[0].code, ordinal === 0 ? 'array_too_long' : 'array_too_short');
  validateFactionDraftV1({ recommendations: [advice] }, input, { draftEnvelopeBinding: binding });
  const proposedSchema = structuredClone(editorContract.providerSchema);
  proposedSchema.properties.sourceRefs.maxItems = binding.maximumAdviceSourceRefs;
  proposedSchema.properties.unproven.minItems = binding.minimumUnprovenItems;
  assert.equal(validate(proposedSchema, advice).ok, true);
  assert.equal(hash(advice), originalHash);
  samples.push({ faction, origin, targetIndex: item.index, originalAdviceHash: originalHash,
    originalAdvice: advice, currentEditorValidation: original, currentHostValidationPassed: true,
    proposedEnvelopeSchemaHash: hash(proposedSchema), proposedEnvelopeValidationPassed: true,
    actualPaidEditorFailure: false, editorProductionRecovered: false, contentChanged: false });
}
const files = ['scripts/inspect-ticket-18-editor-envelope-boundary-v2.mjs',
  'content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs',
  'packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs',
  'packages/skill-production-v3/faction-draft-envelope-v2.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'];
const report = seal({ version: 'faction_editor_envelope_boundary_diagnosis_v2', diagnosisPassed: true,
  endToEndContractClosed: false, samples, originatingComponentHash: component.hash,
  editorContractHash: editorContract.contractHash, draftEnvelopeBindingHash: binding.hash,
  requiredNextAction: 'explicit_editor_envelope_binding_with_failed_receipt_proof_runtime_consumer_and_continuation_wiring',
  providerCalls: 0, actualDshSessions: 0, productionRecovered: false, independentSemanticAcceptance: false,
  officialSourceRefresh: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'editor-envelope-boundary-diagnosis-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ diagnosisPassed: true, endToEndContractClosed: false, actualPaidAdviceSamples: samples.length,
  actualPaidEditorFailures: 0, providerCalls: 0, hash: report.hash }));
