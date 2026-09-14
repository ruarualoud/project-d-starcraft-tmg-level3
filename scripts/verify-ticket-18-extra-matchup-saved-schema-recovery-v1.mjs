import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, hash, seal, verifySeal }
  from '../packages/skill-production/common.mjs';
import { createStrategyRoleContractsV1 }
  from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyEvidenceReviewContractV2,
  normalizeStrategyEvidenceReviewAnchorsV2 }
  from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 }
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { recoverSavedStrategyNotesRoleValueV3,
  materializeSavedNotesRecoveryResponseV3 }
  from '../packages/structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs';
import { recoverAdditionalPropertiesProjectionV1 }
  from '../packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = 'extra-matchup-v1-967d86bea143c6b52aba';
const runRoot = path.join(root, 'build/ticket-18-extra-directed-matchup-v1', runId);
const readSealed = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const capabilities = await readSealed(path.join(runRoot, 'active-capabilities.json'));
const db = new DatabaseSync(path.join(root,
  'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const decode = raw => verifySeal(JSON.parse(raw)).value;
const attempt = (id, selectedRunId = runId) => {
  const row = db.prepare('SELECT response FROM attempts WHERE run=? AND id=?')
    .get(selectedRunId, id);
  if (!row?.response) fail('SAVED_SCHEMA_RECOVERY_FIXTURE_MISSING');
  return decode(row.response);
};
const providerRequest = (wire, outputContractRef) => ({
  requestId: wire.request.requestId,
  roleRef: { id: 'saved-schema-recovery-proof', version: '1.0.0',
    hash: hash(wire.request.requestId) },
  instructions: wire.request.body.instructions,
  input: wire.request.body.input,
  outputContractRef,
  maxOutputUnits: wire.request.body.max_output_tokens,
});
const outputText = wire => wire.response.payload.output[0].content[0].text;

const notesId = 'structured-c1ceb74038332522bdb18973579728f21da5276fe856cee6';
const notesWire = await readSealed(path.join(runRoot, 'daelaam-to-terran',
  'wire', notesId + '.json'));
const notesContract = createStrategyRoleContractsV1().notes;
const notesFailure = attempt(notesId);
const notesRecovery = recoverSavedStrategyNotesRoleValueV3({
  failureReceipt: notesFailure, wire: notesWire, outputContract: notesContract,
  capabilityReceipt: capabilities.notes,
});
const notesResponse = materializeSavedNotesRecoveryResponseV3({
  recovery: notesRecovery, failureReceipt: notesFailure, wire: notesWire,
  providerRequest: providerRequest(notesWire, notesFailure.outputContractRef),
  outputContract: notesContract, capabilityReceipt: capabilities.notes,
});
if (notesRecovery.kind !== 'known_top_level_array_boundary'
  || !validateStarcraftTmgProviderJsonSchemaValueV1(
    notesContract.providerSchema, notesResponse.output).ok) {
  fail('SAVED_NOTES_BOUNDARY_RECOVERY_FAILED');
}

const reviewId = 'structured-62fbdfc5825862f227fc94cf89c20f626b5b2a32817e90c6';
const reviewWire = await readSealed(path.join(runRoot, 'terran-to-daelaam',
  'wire', reviewId + '.json'));
const reviewContract = createStrategyEvidenceReviewContractV2();
const reviewFailure = attempt(reviewId);
const reviewValue = JSON.parse(outputText(reviewWire));
const reviewValidation = validateStarcraftTmgProviderJsonSchemaValueV1(
  reviewContract.providerSchema, reviewValue);
const reviewResponse = recoverAdditionalPropertiesProjectionV1({
  failureReceipt: reviewFailure,
  providerValue: reviewValue,
  validation: reviewValidation,
  wire: reviewWire,
  providerRequest: providerRequest(reviewWire, reviewFailure.outputContractRef),
  outputContract: reviewContract,
  capabilityReceipt: capabilities['evidence-review'],
});
const reviewNormalization = reviewResponse.usageReceipt.responseNormalization;
if (reviewNormalization.schema !== 'structured_bounded_schema_projection_v2'
  || reviewResponse.output.checks[0].sourceSpanIds.length !== 128
  || reviewNormalization.truncatedArrays[0].omitted.length !== 213
  || !validateStarcraftTmgProviderJsonSchemaValueV1(
    reviewContract.providerSchema, reviewResponse.output).ok) {
  fail('SAVED_REVIEW_ARRAY_RECOVERY_FAILED');
}

const anchorId = 'structured-03b69a001b2632c76c3a2be858d51078cca4913cbf189d53';
const anchorRunRoot = path.join(root, 'build/ticket-18-extra-directed-matchup-v1',
  'extra-matchup-v2-2572de465c74893db3db');
const anchorWire = await readSealed(path.join(anchorRunRoot, 'terran-to-daelaam',
  'wire', anchorId + '.json'));
const anchorPayload = JSON.parse(anchorWire.request.body.input);
const anchorProviderValue = JSON.parse(outputText(anchorWire));
const anchorPrepared = seal({
  targets: anchorPayload.authoritativeCurrentSnapshot.targets,
  currentSpans: anchorPayload.authoritativeCurrentSnapshot.currentSpans,
  sourceSpans: anchorPayload.sourceSpanIndex,
  trainingTruth: false,
});
const anchorNormalization = normalizeStrategyEvidenceReviewAnchorsV2(
  anchorPrepared, anchorProviderValue);
if (!anchorNormalization.changed || anchorNormalization.omitted.length !== 2
  || anchorNormalization.omitted.some(row =>
    row.reason !== 'unknown_host_span')
  || anchorNormalization.verdictEdits !== 0
  || anchorNormalization.explanationEdits !== 0) {
  fail('SAVED_REVIEW_ANCHOR_RECOVERY_FAILED');
}

const trailingNotesId = 'structured-fe0ef3d45b021d517c0d7fa08a87f7bc67f070de329ea2c8';
const trailingNotesWire = await readSealed(path.join(anchorRunRoot,
  'daelaam-to-terran', 'wire', trailingNotesId + '.json'));
const trailingCapabilities = await readSealed(path.join(anchorRunRoot,
  'active-capabilities.json'));
const trailingNotesFailure = attempt(trailingNotesId,
  'extra-matchup-v2-2572de465c74893db3db');
const trailingNotesRecovery = recoverSavedStrategyNotesRoleValueV3({
  failureReceipt: trailingNotesFailure, wire: trailingNotesWire,
  outputContract: notesContract,
  capabilityReceipt: trailingCapabilities.notes,
});
if (trailingNotesRecovery.kind !== 'trailing_root_delimiter') {
  fail('SAVED_NOTES_TRAILING_ROOT_RECOVERY_FAILED');
}
const composedRunId = 'extra-matchup-v5-b09bcd36b6b910f3eff6';
const composedRunRoot = path.join(root,
  'build/ticket-18-extra-directed-matchup-v1', composedRunId);
const composedNotesId = 'structured-3130dac3d6eaa67548cb2522a56b672dc8db8cb4b3e92da7';
const [composedWire, composedCapabilities] = await Promise.all([
  readSealed(path.join(composedRunRoot, 'daelaam-to-terran',
    'wire', composedNotesId + '.json')),
  readSealed(path.join(composedRunRoot, 'active-capabilities.json')),
]);
const composedRecovery = recoverSavedStrategyNotesRoleValueV3({
  failureReceipt: attempt(composedNotesId, composedRunId),
  wire: composedWire, outputContract: notesContract,
  capabilityReceipt: composedCapabilities.notes,
});
if (composedRecovery.kind
    !== 'known_top_level_array_boundary_then_schema_projection'
  || composedRecovery.recoveredValue.observations.length !== 8
  || composedRecovery.omitted.length < 2) {
  fail('SAVED_NOTES_COMPOSED_RECOVERY_FAILED');
}
db.close();
console.log(JSON.stringify({ passed: true, concreteFailures: 5,
  notesRecoveryKind: notesRecovery.kind,
  trailingNotesRecoveryKind: trailingNotesRecovery.kind,
  composedNotesRecoveryKind: composedRecovery.kind,
  evidenceReviewRetainedSourceSpans: 128,
  evidenceReviewOmittedSourceSpans: 213,
  evidenceReviewInvalidAnchorsOmitted: anchorNormalization.omitted.length,
  additionalProviderCalls: 0,
  sourceAndStrategyEvaluationStillRequired: true,
  hash: hash({ notes: notesRecovery.hash,
    review: reviewNormalization.hash,
    anchors: anchorNormalization.hash,
    trailingNotes: trailingNotesRecovery.hash,
    composedNotes: composedRecovery.hash }) }));
