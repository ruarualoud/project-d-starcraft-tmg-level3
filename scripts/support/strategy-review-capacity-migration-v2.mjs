import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../../packages/skill-production/common.mjs';
import { createStrategyEvidenceReviewContractV1 } from '../../packages/strategy-skills/strategy-evidence-review-v1.mjs';
import { createStrategyEvidenceReviewContractV2, materializeStrategyEvidenceReviewV2 } from '../../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';
import { normalizeProviderJsonDocumentV1 } from '../../packages/secure-provider-runtime/provider-response-outcome-v1.mjs';
import { PARENT_RUN } from './strategy-opening-fence-continuation-v1.mjs';
import { json, DB_PATH } from './strategy-live-production-support-v1.mjs';

export const REVIEW_CAPACITY_FAILED_ATTEMPT = 'structured-74862dbfa8182a0b0f42da27ccf99716309a9f35b00ee052';
export async function prepareReviewCapacityMigrationV2(fixture) {
  const v1 = createStrategyEvidenceReviewContractV1(), v2 = createStrategyEvidenceReviewContractV2();
  const expected = structuredClone(v1.providerSchema);
  expected.properties.checks.items.properties.currentSpanIds.maxItems = 128;
  expected.properties.checks.items.properties.sourceSpanIds.maxItems = 128;
  if (hash(expected) !== hash(v2.providerSchema) || hash(v1.mapperRef) !== hash(v2.mapperRef)
    || hash(v1.semanticValidatorRef) !== hash(v2.semanticValidatorRef)
    || hash(v1.modelOwnedFields) !== hash(v2.modelOwnedFields) || hash(v1.hostOwnedFields) !== hash(v2.hostOwnedFields)) fail('REVIEW_CAPACITY_DELTA_INVALID');
  const prefix = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/evidence-review-calibration-v1/';
  const oldReport = await json(prefix + 'report.json');
  if (!oldReport.calibrationPassed || oldReport.failure?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID') fail('REVIEW_CAPACITY_PARENT_INVALID');
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const decode = row => verifySeal(JSON.parse(row)).value;
  let rejected, failure, row;
  try {
    for (const group of ['current', 'mutant']) for (const [index, artifact] of oldReport.results[group].entries()) {
      verifySeal(artifact);
      const prepared = fixture[group === 'current' ? 'currentBatches' : 'mutantBatches'][index];
      if (artifact.preparedHash !== prepared.hash || artifact.contractHash !== v1.contractHash) fail('REVIEW_CALIBRATION_BINDING_DRIFT');
      const stored = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(PARENT_RUN, 'evidence-review.' + prepared.hash.slice(0, 48));
      if (decode(stored.artifact).hash !== artifact.hash
        || materializeStrategyEvidenceReviewV2(prepared, artifact.providerValue).hash !== artifact.evidence.hash) fail('REVIEW_CALIBRATION_REPLAY_FAILED');
    }
    row = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(PARENT_RUN, REVIEW_CAPACITY_FAILED_ATTEMPT);
    failure = decode(row.response);
    rejected = decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(PARENT_RUN, REVIEW_CAPACITY_FAILED_ATTEMPT + '.rejected-candidate').artifact);
  } finally { db.close(); }
  verifySeal(rejected);
  if (row.state !== 'failed' || failure.outputContractRef.hash !== v1.contractHash
    || rejected.safeReceiptHash !== failure.receiptHash) fail('REVIEW_CAPACITY_FAILURE_DRIFT');
  const value = rejected.providerValue;
  const oldValidation = validateStarcraftTmgProviderJsonSchemaValueV1(v1.providerSchema, value);
  if (hash(oldValidation.issues) !== hash([{ path: '$.checks[3].sourceSpanIds', code: 'array_too_long', actualItems: 7, minItems: 0, maxItems: 4 }])) fail('REVIEW_CAPACITY_UNEXPECTED_DEFECT');
  const wire = await json(prefix + 'wire/' + REVIEW_CAPACITY_FAILED_ATTEMPT + '.json');
  if (hash(wire.response.payload) !== failure.payloadHash || wire.request.body.input !== fixture.auditBatches[0].payload
    || hash(JSON.parse(normalizeProviderJsonDocumentV1(wire.response.payload.output[0].content[0].text).text)) !== hash(value)) fail('REVIEW_CAPACITY_WIRE_DRIFT');
  const evidence = materializeStrategyEvidenceReviewV2(fixture.auditBatches[0], value);
  const migration = seal({ schema: 'strategy_review_evidence_capacity_migration_v2',
    oldContractHash: v1.contractHash, newContractHash: v2.contractHash,
    allowedSchemaChanges: ['checks.items.currentSpanIds.maxItems:8->128', 'checks.items.sourceSpanIds.maxItems:4->128'],
    oldCalibrationReportHash: oldReport.hash, replayedCalibrationDecisions: 14,
    inheritedModelCalibrationScope: 'only_exact_old_current_and_mutant_decisions_with_identical_materialized_evidence_hashes',
    originalFailedAttempt: REVIEW_CAPACITY_FAILED_ATTEMPT, originalFailureReceiptHash: failure.receiptHash,
    originalRejectedHash: rejected.hash, originalWireHash: wire.hash, originalProviderValueHash: hash(value),
    recoveredEvidenceHash: evidence.hash, originalSourceIds: value.checks[3].sourceSpanIds,
    additionalProviderCalls: 0, sameInputAndMeaning: true, trainingTruth: false });
  return { migration, oldReport, recovered: seal({ schema: 'strategy_review_capacity_import_v2', migrationRef: migration.hash,
    preparedHash: fixture.auditBatches[0].hash, evidence, providerValue: value,
    originalRejectedCandidate: rejected, semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false }) };
}
