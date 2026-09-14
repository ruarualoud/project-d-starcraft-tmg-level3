import { DatabaseSync } from 'node:sqlite';
import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { recoverSavedStrategyNotesRoleValueV3 }
  from '../structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs';

const AMBIGUOUS = 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND';
const SCHEMA_INVALID = 'STRUCTURED_PROVIDER_SCHEMA_INVALID';
const INCOMPLETE = 'STRUCTURED_PROVIDER_INCOMPLETE';

const decode = raw => verifySeal(JSON.parse(raw)).value;

// A provider failure never resumes inside the same run.  This inspector turns
// a terminal production run into a versioned child-run inventory: only exact-
// input, successfully completed high-level work is reusable.  Provider wire
// artifacts and quarantined roles stay in the parent, so the child cannot
// accidentally treat a failed response as accepted work.
export async function inspectExtraFactionContinuationV1({ filename, parentRunId,
  parentRecipe, parentReport, readWire, notesContract, capabilityReceipt,
  allowLegacyRecipeHashDrift = false }) {
  verifySeal(parentReport);
  let parentRecipeIntegrity = 'verified';
  try { verifySeal(parentRecipe); }
  catch (error) {
    if (!allowLegacyRecipeHashDrift || error.code !== 'ARTIFACT_HASH_MISMATCH'
      || parentRecipe.schema !== 'ticket18_extra_faction_recipe_v2') throw error;
    parentRecipeIntegrity = 'legacy_v2_spread_hash_bug_recorded';
  }
  if (!/^extra-faction-v\d+-[a-f0-9]{20}$/u.test(parentRunId)
    || parentReport.schema !== 'ticket18_extra_faction_report_v1'
    || parentReport.runId !== parentRunId
    || parentReport.recipeHash !== parentRecipe.hash
    || !parentReport.failure
    || parentReport.runtimeAccepted !== false
    || parentReport.trainingTruth !== false) {
    fail('EXTRA_FACTION_CONTINUATION_PARENT_INVALID');
  }
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const run = db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId);
    const attempts = db.prepare(`SELECT id,state,code,reserve,settled,usage,response
      FROM attempts WHERE run=? ORDER BY id`).all(parentRunId);
    const running = db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'")
      .get(parentRunId).n;
    if (run?.recipe !== parentRecipe.hash || running
      || attempts.some(attempt => attempt.state === 'intent')
      || attempts.some(attempt => attempt.code === 'PROVIDER_PAYMENT_REQUIRED')) {
      fail('EXTRA_FACTION_CONTINUATION_PARENT_NOT_TERMINAL');
    }
    const ambiguous = attempts.filter(attempt =>
      attempt.state === 'failed' && attempt.code === AMBIGUOUS);
    const schemaInvalid = attempts.filter(attempt =>
      attempt.state === 'failed' && attempt.code === SCHEMA_INVALID);
    const incomplete = attempts.filter(attempt =>
      attempt.state === 'failed' && attempt.code === INCOMPLETE);
    const notSent = attempts.filter(attempt => attempt.state === 'not_sent');
    const unsupported = attempts.filter(attempt => attempt.state === 'failed'
      && ![AMBIGUOUS, SCHEMA_INVALID, INCOMPLETE].includes(attempt.code));
    if (!ambiguous.length && !schemaInvalid.length && !incomplete.length
      && !notSent.length
      || unsupported.length
      || ambiguous.some(attempt => attempt.usage !== null
        || attempt.settled !== null)
      || notSent.some(attempt => attempt.settled !== 0
        || attempt.usage !== null)) {
      fail('EXTRA_FACTION_CONTINUATION_FAILURE_CLASS_INVALID');
    }
    const rows = db.prepare(`SELECT id,input_hash,artifact FROM steps
      WHERE run=? AND state='complete' ORDER BY id`).all(parentRunId);
    const excluded = [], localRecoveries = [];
    const steps = [];
    for (const row of rows) {
      const artifact = decode(row.artifact);
      const highLevel = /^(strategy-|evidence-review)/u.test(row.id);
      const quarantined = artifact?.status === 'quarantined'
        || String(artifact?.schema || '').includes('quarantine');
      if (quarantined && artifact?.schema === 'strategy_role_quarantine_v1'
        && [SCHEMA_INVALID, INCOMPLETE].includes(artifact.code)
        && artifact.kind === 'notes') {
        if (typeof readWire !== 'function' || notesContract?.id !== 'strategy.role.notes'
          || !capabilityReceipt?.receiptHash) {
          fail('EXTRA_FACTION_CONTINUATION_RECOVERY_PORTS_REQUIRED');
        }
        const attemptId = String(artifact.outcome?.issueRef?.id || '')
          .replace(/\.issue$/u, '');
        const attempt = attempts.find(entry => entry.id === attemptId);
        if (!attempt || attempt.state !== 'failed'
          || ![SCHEMA_INVALID, INCOMPLETE].includes(attempt.code)) {
          fail('EXTRA_FACTION_CONTINUATION_RECOVERY_ATTEMPT_INVALID');
        }
        const recovery = recoverSavedStrategyNotesRoleValueV3({
          failureReceipt: decode(attempt.response),
          wire: await readWire(attemptId),
          outputContract: notesContract,
          capabilityReceipt,
        });
        const recoveredArtifact = seal({
          schema: 'strategy_role_local_recovery_artifact_v1',
          inputHash: artifact.inputHash,
          axis: artifact.axis,
          stage: artifact.stage,
          round: artifact.round,
          kind: artifact.kind,
          payloadHash: artifact.payloadHash,
          contractHash: artifact.contractHash,
          executionPolicyHash: artifact.executionPolicyHash,
          capabilityReceiptHash: artifact.capabilityReceiptHash,
          value: recovery.recoveredValue,
          recoveredQuarantineHash: artifact.hash,
          originalRuntimeReceiptRef: artifact.outcome.receiptRef,
          localRecoveryHash: recovery.hash,
          additionalProviderCalls: 0,
          semanticAcceptanceInherited: false,
          runtimeAccepted: false,
          trainingTruth: false,
        });
        steps.push({ id: row.id, inputHash: row.input_hash,
          artifact: recoveredArtifact });
        localRecoveries.push({ stepId: row.id, attemptId,
          quarantineHash: artifact.hash, recoveryHash: recovery.hash,
          kind: recovery.kind, omittedItems: recovery.omitted.length,
          additionalProviderCalls: 0 });
        continue;
      }
      if (!highLevel || quarantined) {
        excluded.push({ id: row.id, reason: quarantined
          ? 'quarantined_parent_artifact' : 'provider_or_nonsemantic_artifact' });
        continue;
      }
      steps.push({ id: row.id, inputHash: row.input_hash, artifact });
    }
    if (localRecoveries.length !== schemaInvalid.length + incomplete.length) {
      fail('EXTRA_FACTION_CONTINUATION_SCHEMA_RECOVERY_INCOMPLETE');
    }
    const reusable = steps.map(step => ({ id: step.id,
      inputHash: step.inputHash, artifactHash: hash(step.artifact) }));
    const manifest = seal({ schema: 'extra_faction_typed_continuation_v1',
      parentRunId, parentRecipeHash: parentRecipe.hash,
      parentReportHash: parentReport.hash,
      parentRecipeIntegrity,
      ambiguousAttempts: ambiguous.map(attempt => ({ id: attempt.id,
        reservationMicros: attempt.reserve,
        chargedAtFullReservation: true })),
      definitelyNotSentAttempts: notSent.map(attempt => ({ id: attempt.id,
        code: attempt.code, chargedMicros: 0 })),
      reusable, excluded,
      inheritedSteps: reusable.length,
      localRecoveries,
      inheritedProviderCalls: 0,
      automaticProviderRetries: 0,
      attemptsCopied: false,
      failedRolesInherited: 0,
      exactInputRequiredAtConsumption: true,
      sourceRefreshPerformed: false,
      semanticAcceptanceInherited: false,
      runtimeAccepted: false,
      trainingTruth: false });
    return { manifest, steps };
  } finally {
    db.close();
  }
}
