import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { prepareFactionFieldValueFamilyV1, inspectFactionFieldValueCheckpointV1,
  readFactionFieldValuePaidEvidenceV1 } from './faction-field-value-runtime-v1.mjs';
import { createFactionReviewSourceExpansionV1, FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 } from './faction-review-source-expansion-v1.mjs';

export const FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1 = seal({ version: 'faction_field_value_source_handoff_v1',
  trigger: 'authenticated_field_values_complete_but_known_frozen_source_body_omitted',
  sourceExpansionBindingHash: FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1.hash,
  preservePaidFieldRoundsAndOriginalFailure: true, fieldAttemptBudgetReset: false,
  noAdditionalFieldRequestForContextGap: true, freshWholeBatchSourceReviewRequired: true,
  unknownSourcesMayExpand: false, removeCitationsToPass: false, rosterPermissionGranted: false,
  sourceRefreshPerformed: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
const binding = FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1;

// Current paid journal and complete reconstructed caller context are mandatory.
// A Host error string or a producer-supplied success flag is not sufficient.
export function readFactionFieldValueSourceHandoffV1({ filename, input, prepared, originalEvidence,
  allowedRunIds, dshBindingHash }) {
  const { family } = prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence });
  const controlRunId = 'faction-field-control-' + family.hash.slice(0, 32);
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const owner = db.prepare('SELECT recipe FROM runs WHERE id=?').get(controlRunId);
    if (!owner) return null;
    if (owner.recipe !== family.hash) fail('FACTION_FIELD_SOURCE_CONTROL_DRIFT');
    const records = [];
    for (let round = 0; round < family.maximumNewValueAttempts; round++) {
      const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(controlRunId, 'round.' + round + '.record');
      if (!row) return null;
      const record = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
      if (row.input_hash !== hash({ choiceHash: record.choice.hash })) fail('FACTION_FIELD_SOURCE_RECORD_INPUT_DRIFT');
      const choiceRow = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(controlRunId, 'round.' + round + '.choice');
      const choice = choiceRow && verifySeal(verifySeal(JSON.parse(choiceRow.artifact)).value);
      if (!choice || choice.hash !== record.choice.hash || choiceRow.input_hash !== hash({ familyHash: family.hash, round }))
        fail('FACTION_FIELD_SOURCE_CHOICE_DRIFT');
      records.push(record);
      const inspected = inspectFactionFieldValueCheckpointV1({ input, prepared, originalEvidence, records,
        readPaidEvidence: choice => readFactionFieldValuePaidEvidenceV1({ filename, choice, allowedRunIds }), dshBindingHash });
      if (!inspected.result.feedback) return null;
      if (inspected.result.feedback.class !== 'host_mapping'
        || !inspected.result.feedback.issues.some(i => i.code === 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID')) continue;
      const expansion = createFactionReviewSourceExpansionV1({ input, baseCapsule: prepared.capsule,
        triggerOutput: inspected.completion.value });
      if (!expansion) fail('FACTION_FIELD_SOURCE_GAP_NOT_PROVED');
      return seal({ version: binding.version, bindingHash: binding.hash, familyHash: family.hash,
        fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput), originalContextHash: prepared.capsule.hash,
        originalAttemptId: originalEvidence.attempt.id, originalOwnerRunId: originalEvidence.attempt.run,
        originalRejectedCandidateHash: originalEvidence.rejected.hash, recordHashes: records.map(r => r.hash),
        completion: inspected.completion, providerReceiptHashes: inspected.receiptHashes,
        expansionHash: expansion.hash, expandedSourceRefs: expansion.expandedSources.map(s => s.ref),
        originalReviewAccepted: false, sourceRefreshPerformed: false, rosterPermissionGranted: false,
        providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
    }
    return null;
  } finally { db.close(); }
}

export function verifyFactionFieldValueSourceHandoffV1({ handoff, readAuthenticated }) {
  verifySeal(handoff);
  const fresh = readAuthenticated();
  if (!fresh || verifySeal(fresh).hash !== handoff.hash || handoff.bindingHash !== binding.hash)
    fail('FACTION_FIELD_SOURCE_HANDOFF_DRIFT');
  return fresh;
}
