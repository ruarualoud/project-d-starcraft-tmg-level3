import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { assertFactionWireAddressRecipeScopeV1, FACTION_WIRE_ADDRESS_RECOVERY_RECIPE_FIELDS_V1 as fields } from './faction-wire-address-recovery-v1.mjs';

export function validateFactionWireAddressRecoveryMigrationV1({ filename, parentRunId, parent, next, gate, prepared }) {
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (gate || prepared) fail('FACTION_WIRE_ADDRESS_MIGRATION_UNSCOPED');
    return null;
  }
  [parent, next, gate].forEach(verifySeal);
  if (!assertFactionWireAddressRecipeScopeV1(next) || !prepared?.openingFenceRecovery
    || gate.version !== 'faction_wire_address_recovery_readiness_v1' || !gate.passed || gate.providerCalls !== 0
    || next.wireAddressRecoveryReadinessHash !== gate.hash
    || hash(parent.inputHashes) !== hash(next.inputHashes) || !factionLimitsCompatibleV1(parent, next)
    || gate.recipeFieldsHash !== hash(prepared.recipeFields)
    || !gate.actualOuterWrapperPassed || !gate.independentOuterConsumerPassed || !gate.productionReplayConsumerPassed
    || !gate.sqliteRestartPassed || !gate.crossRunFragmentContinuationPassed || !gate.exactOriginalAttemptsPreserved
    || !gate.runnerParametersBound || !gate.negativeReviewPreserved || !gate.expiredRawAndPaymentStopPassed)
    fail('FACTION_WIRE_ADDRESS_MIGRATION_INVALID');
  const hasParent = assertFactionWireAddressRecipeScopeV1(parent);
  if (!hasParent && (parentRunId !== gate.originRunId
    || prepared.recipeFields.openingFenceRecoveryOrigins.some(o => o.runId !== parentRunId)
    || prepared.recipeFields.dualCoordinateReviewOrigins.some(o => o.runId !== parentRunId)))
    fail('FACTION_WIRE_ADDRESS_FIRST_ACTIVATION_PARENT');
  for (const f of fields.filter(f => f !== 'wireAddressRecoveryReadinessHash')) {
    if (hash(next[f]) !== hash(prepared.recipeFields[f]) || hasParent && hash(parent[f]) !== hash(next[f]))
      fail('FACTION_WIRE_ADDRESS_MIGRATION_ORIGIN_DRIFT');
  }
  const source = prepared.completeReviewImports[0]?.evidence;
  if (!source || source.candidate.hash !== gate.originalReviewCandidateHash
    || source.candidate.providerReceiptHash !== gate.originalReviewReceiptHash
    || prepared.openingFenceRecovery.proofs[0].hash !== gate.authenticatedOpeningFenceProofHash)
    fail('FACTION_WIRE_ADDRESS_MIGRATION_EVIDENCE_DRIFT');
  for (const c of gate.codeHashes)
    if (next.codeHashes.find(r => r.file === c.file)?.hash !== c.hash) fail('FACTION_WIRE_ADDRESS_MIGRATION_CODE_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n)
      fail('FACTION_WIRE_ADDRESS_MIGRATION_PARENT_NOT_TERMINAL');
  } finally { db.close(); }
  return seal({ version: 'faction_wire_address_recovery_migration_v1', parentRunId,
    readinessHash: gate.hash, recipeFieldsHash: gate.recipeFieldsHash,
    authenticatedOpeningFenceProofHash: gate.authenticatedOpeningFenceProofHash,
    originalReviewCandidateHash: source.candidate.hash, files: gate.codeHashes.map(c => c.file),
    originalAttemptsCopied: 0, accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false });
}
