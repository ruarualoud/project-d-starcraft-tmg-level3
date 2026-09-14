import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail }
  from '../packages/skill-production/common.mjs';
import { openProductionStore }
  from '../packages/skill-production/store.mjs';
import { prepareDshLoop }
  from '../packages/skill-production/loops.mjs';
import { withCheckpointContinuation }
  from '../packages/skill-production/continuation.mjs';
import { createFactionParallelControlV1, renewFactionCapabilityV1,
  runFactionLanesV1 }
  from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { createStrategyRoleContractsV1, inspectStrategyDispatchV1 }
  from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyStructuredWorkflowV2 }
  from '../packages/strategy-skills/strategy-structured-workflow-v2.mjs';
import { createStrategyEvidenceReviewerV2 }
  from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createStrategyEvidenceReviewContractV2 }
  from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { createDirectedMatchupProductionV1,
  renderDirectedMatchupCandidateV1 }
  from '../packages/strategy-skills/directed-matchup-production-v1.mjs';
import { withOpeningFenceRecoveryV1 }
  from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { withStrategyDecisionComparisonRecoveryV1 }
  from '../packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs';
import { recoverAdditionalPropertiesProjectionV1,
  withAdditionalPropertiesProjectionRecoveryV1 }
  from '../packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs';
import { materializeSavedNotesRecoveryResponseV3,
  reconstructStrategyNotesFailureFromWireV2,
  recoverSavedStrategyNotesRoleValueV3, recoverStrategyNotesSchemaResponseV2,
  withStrategyNotesSchemaRecoveryV2 }
  from '../packages/structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs';
import { outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 }
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { ROOT, DB_PATH, json, codeHashes, ledgerSnapshot,
  selectStrategyExecutionV2, providerRegistryV2, attachProviderV2,
  executionPriceV2, safeCode, capabilityProbeSamples }
  from './support/strategy-live-production-support-v2.mjs';

const [mode, fromFlag, parentRunId] = process.argv.slice(2);
const resumeMode = ['--resume-preflight', '--resume'].includes(mode);
if (!['--preflight', '--live', '--resume-preflight', '--resume'].includes(mode)
  || resumeMode && (fromFlag !== '--from'
    || !/^extra-matchup-v[1-9][0-9]*-[a-f0-9]{20}$/u.test(parentRunId || ''))
  || !resumeMode && process.argv.length !== 3
  || resumeMode && process.argv.length !== 5) {
  fail('EXTRA_MATCHUP_RUN_ARGUMENTS_INVALID');
}
const prefix = 'build/ticket-18-extra-directed-matchup-v1/';
const definitions = [
  { id: 'terran-to-daelaam', ownFaction: 'tactical_cards:terran_armed_forces' },
  { id: 'daelaam-to-terran', ownFaction: 'tactical_cards:daelaam' },
  { id: 'terran-to-kerrigan-s-swarm', ownFaction: 'tactical_cards:terran_armed_forces' },
  { id: 'kerrigan-s-swarm-to-terran', ownFaction: 'tactical_cards:kerrigan_s_swarm' },
];
const waves = [definitions.slice(0, 2), definitions.slice(2, 4)];
const putImmutable = async (file, value, raw = false) => {
  const encoded = raw ? value : JSON.stringify(value, null, 2);
  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(file, 'utf8') !== encoded) {
      fail('EXTRA_MATCHUP_IMMUTABLE_ARTIFACT_CONFLICT');
    }
  }
};
const initialLedger = ledgerSnapshot();
if (initialLedger.paymentRequiredCount) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
if (initialLedger.intentCount) fail('AMBIGUOUS_EGRESS_NO_RETRY');
let budgetEpoch;
try { budgetEpoch = await json(prefix + 'budget-epoch-v1.json'); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  budgetEpoch = seal({ version: 'extra_matchup_budget_epoch_v1',
    authority: 'user_2026_09_11_reset_for_new_directed_matchups',
    startedAt: new Date().toISOString(),
    globalBaseline: { attempts: initialLedger.attempts,
      tokens: initialLedger.cumulativeTokens,
      estimateMicros: initialLedger.cumulativeEstimateMicros,
      ledgerHash: initialLedger.ledgerHash },
    notificationStepMicros: 100_000_000,
    epochStartsAtZero: true,
    historicalLedgerPreserved: true,
    accountingReset: false,
    invoice: false,
    paymentRequiredStopsAllWork: true,
    trainingTruth: false });
  await putImmutable(path.join(ROOT, prefix, 'budget-epoch-v1.json'), budgetEpoch);
}
verifySeal(budgetEpoch);
if (budgetEpoch.version !== 'extra_matchup_budget_epoch_v1'
  || budgetEpoch.notificationStepMicros !== 100_000_000
  || budgetEpoch.historicalLedgerPreserved !== true) {
  fail('EXTRA_MATCHUP_BUDGET_EPOCH_INVALID');
}
const stageProgress = (ledger, allowIntents = false) => {
  if (ledger.paymentRequiredCount || ledger.intentCount && !allowIntents) {
    fail(ledger.paymentRequiredCount ? 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK'
      : 'AMBIGUOUS_EGRESS_NO_RETRY');
  }
  const attempts = ledger.attempts - budgetEpoch.globalBaseline.attempts;
  const tokens = ledger.cumulativeTokens - budgetEpoch.globalBaseline.tokens;
  const estimateMicros = ledger.cumulativeEstimateMicros
    - budgetEpoch.globalBaseline.estimateMicros;
  if ([attempts, tokens, estimateMicros].some(value =>
    !Number.isSafeInteger(value) || value < 0)) {
    fail('EXTRA_MATCHUP_BUDGET_BASELINE_DRIFT');
  }
  return { attempts, tokens, estimateMicros,
    estimateCny: estimateMicros / 1e6,
    nextNotificationCny: (Math.floor(estimateMicros / 100_000_000) + 1) * 100 };
};

const [inputReport, priorCapabilities, ...inputs] = await Promise.all([
  json(prefix + 'input-report.json'),
  json('build/ticket-18-extra-faction-v1/'
    + 'extra-faction-v6-9208f4ab2980e290b9bf/active-capabilities.json'),
  ...definitions.map(definition => json(prefix + definition.id + '-input.json')),
]);
if (inputReport.directions.length !== 4 || inputReport.actualRulesCases !== 8
  || inputReport.providerCalls !== 0 || inputReport.sourceRefreshPerformed !== false) {
  fail('EXTRA_MATCHUP_INPUT_REPORT_INVALID');
}
for (const [index, input] of inputs.entries()) {
  if (input.contract.scope.ownFaction !== definitions[index].ownFaction
    || input.hash !== inputReport.directions[index].inputHash) {
    fail('EXTRA_MATCHUP_INPUT_DRIFT');
  }
}
const plans = inputs.map(inspectStrategyDispatchV1);
console.log(JSON.stringify({ event: 'preparation-stage', stage: 'dsh-runtime',
  status: 'started', directions: definitions.length }));
const dsh = await prepareDshLoop(ROOT, { sessionPolicy: 'phased-v1' });
console.log(JSON.stringify({ event: 'preparation-stage', stage: 'dsh-runtime',
  status: 'ready', bindingHash: dsh.binding.hash }));
const execution = selectStrategyExecutionV2();
const { binding } = providerRegistryV2(execution);
const priceUsage = executionPriceV2(execution);
const roleContracts = createStrategyRoleContractsV1();
const reviewContract = createStrategyEvidenceReviewContractV2();
const samples = capabilityProbeSamples().filter(sample =>
  ['notes', 'policy'].includes(sample.kind));
samples.push({ kind: 'evidence-review', contract: reviewContract,
  outputContractRef: outputContractRefStarcraftTmgV1(reviewContract),
  sample: { checks: [{ targetId: 'field.risk', verdict: 'uncertain',
    currentSpanIds: ['risk'], sourceSpanIds: [],
    explanation: 'Synthetic format probe only' }] } });
const limits = { maxCalls: 260, maxTokens: 200_000_000,
  maxCostMicros: 200_000_000, maxWallMs: 36 * 3600_000 };
// The provider profile and strategy workflow use one exact per-call capacity.
// Narrative arrays remain soft-recovered and may span roles/axes; this is not
// a character or whole-Skill length limit.
const executionPolicy = { maxOutputUnits: 4096,
  attemptEstimateMicros: 1_500_000, attemptTokenReserve: 750_000 };
const files = [
  'scripts/run-ticket-18-extra-directed-matchup-production-v1.mjs',
  'scripts/prepare-ticket-18-extra-directed-matchup-inputs-v1.mjs',
  'scripts/support/extra-directed-matchup-case-corpus-v1.mjs',
  'packages/strategy-skills/directed-matchup-input-v1.mjs',
  'packages/strategy-skills/directed-matchup-production-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v2.mjs',
  'packages/strategy-skills/strategy-evidence-production-v1.mjs',
  'packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs',
  'packages/strategy-skills/strategy-evidence-review-v2.mjs',
  'packages/structured-generation/adapters/opening-fence-recovery-v1.mjs',
  'packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs',
  'packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs',
  'packages/structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs',
  'packages/skill-production/continuation.mjs',
  'scripts/support/strategy-live-production-support-v2.mjs',
];
const baseRecipe = seal({ schema: 'ticket18_extra_directed_matchup_recipe_v1',
  ticket: 18, slice: 184,
  directions: definitions.map(definition => definition.id),
  inputReportHash: inputReport.hash,
  inputHashes: inputs.map(input => input.hash),
  planHashes: plans.map(plan => plan.hash),
  codeHashes: await codeHashes(files),
  dshBinding: dsh.binding,
  executionSelection: execution,
  providerProfileRef: binding.providerProfileRef,
  executionPolicy, limits,
  operationalLimits: 'soft_alerts_only',
  resetCallWindowOnProcessStart: true,
  budgetEpochHash: budgetEpoch.hash,
  maximumConcurrentDirections: 2,
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  trainingTruth: false });

const decodeStored = raw => verifySeal(JSON.parse(raw)).value;
async function inspectContinuation(parentId) {
  const parentRoot = path.join(ROOT, prefix, parentId);
  const [parentRecipe, parentReport, parentCapabilities] = await Promise.all([
    json(prefix + parentId + '/recipe.json'),
    json(prefix + parentId + '/report.json'),
    json(prefix + parentId + '/active-capabilities.json'),
  ]);
  const invariant = value => ({ ticket: value.ticket, slice: value.slice,
    directions: value.directions, inputReportHash: value.inputReportHash,
    inputHashes: value.inputHashes, planHashes: value.planHashes,
    dshBinding: value.dshBinding, providerProfileRef: value.providerProfileRef,
    executionPolicy: value.executionPolicy, limits: value.limits,
    budgetEpochHash: value.budgetEpochHash,
    sourceRefreshPerformed: value.sourceRefreshPerformed,
    runtimeAccepted: value.runtimeAccepted, trainingTruth: value.trainingTruth });
  if (hash(invariant(parentRecipe)) !== hash(invariant(baseRecipe))
    || parentReport.schema !== 'ticket18_extra_directed_matchup_report_v1'
    || parentReport.runId !== parentId || parentReport.recipeHash !== parentRecipe.hash
    || !parentReport.failure || parentReport.runtimeAccepted !== false
    || parentReport.trainingTruth !== false) {
    fail('EXTRA_MATCHUP_CONTINUATION_PARENT_INVALID');
  }
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentId)?.recipe
      !== parentRecipe.hash
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'")
        .get(parentId).n) {
      fail('EXTRA_MATCHUP_CONTINUATION_PARENT_NOT_TERMINAL');
    }
    const attempts = db.prepare(`SELECT id,state,code,response FROM attempts
      WHERE run=? ORDER BY id`).all(parentId);
    if (attempts.some(attempt => attempt.state === 'intent')
      || attempts.some(attempt => attempt.code === 'PROVIDER_PAYMENT_REQUIRED')) {
      fail(attempts.some(attempt => attempt.code === 'PROVIDER_PAYMENT_REQUIRED')
        ? 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' : 'AMBIGUOUS_EGRESS_NO_RETRY');
    }
    const failed = attempts.filter(attempt => attempt.state === 'failed');
    const schemaFailed = failed.filter(attempt =>
      attempt.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
      && attempt.response);
    const wireReconstructable = failed.filter(attempt =>
      attempt.code === 'STRUCTURED_PROVIDER_FAILURE_UNKNOWN'
      && !attempt.response);
    const ambiguous = failed.filter(attempt =>
      attempt.code === 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'
      && attempt.response);
    const definitelyNotSent = attempts.filter(attempt =>
      attempt.state === 'not_sent'
      && attempt.code === 'STRUCTURED_PROVIDER_PRE_EGRESS_FAILED');
    if (failed.length !== schemaFailed.length + wireReconstructable.length
      + ambiguous.length) {
      fail('EXTRA_MATCHUP_CONTINUATION_FAILURE_CLASS_INVALID');
    }
    for (const attempt of definitelyNotSent) {
      const receipt = attempt.response ? decodeStored(attempt.response) : null;
      if (!receipt || receipt.requestDefinitelyNotSent !== true
        || receipt.requestMayHaveBeenSent !== false
        || receipt.usageKnown !== false) {
        fail('EXTRA_MATCHUP_CONTINUATION_NOT_SENT_EVIDENCE_INVALID');
      }
    }
    if (attempts.some(attempt => !['received', 'failed', 'not_sent']
      .includes(attempt.state))
      || attempts.filter(attempt => attempt.state === 'not_sent').length
        !== definitelyNotSent.length) {
      fail('EXTRA_MATCHUP_CONTINUATION_FAILURE_CLASS_INVALID');
    }
    const readWireFromRun = async (wireRunId, attemptId) => {
      for (const definition of definitions) {
        try {
          return await readSealed(path.join(ROOT, prefix, wireRunId,
            definition.id,
            'wire', attemptId + '.json'));
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      fail('EXTRA_MATCHUP_CONTINUATION_WIRE_MISSING');
    };
    const readWire = attemptId => readWireFromRun(parentId, attemptId);
    const readInheritedRecoveryWire = async attemptId => {
      let cursor = parentRecipe;
      for (let depth = 0; depth < 16; depth++) {
        const lineage = cursor.continuation;
        if (!lineage?.parentRunId) break;
        const entry = lineage.savedSchemaRecoveries?.find(row =>
          row.attemptId === attemptId && row.wireHash);
        if (entry) {
          const wire = await readWireFromRun(lineage.parentRunId, attemptId);
          if (wire.hash !== entry.wireHash) {
            fail('EXTRA_MATCHUP_CONTINUATION_ANCESTOR_WIRE_DRIFT');
          }
          return wire;
        }
        cursor = await json(prefix + lineage.parentRunId + '/recipe.json');
      }
      fail('EXTRA_MATCHUP_CONTINUATION_ANCESTOR_WIRE_MISSING');
    };
    const recoveries = new Map();
    for (const attempt of schemaFailed) {
      const failureReceipt = decodeStored(attempt.response);
      const contractId = failureReceipt.outputContractRef?.id;
      if (!['strategy.role.notes', 'strategy.evidence-review'].includes(contractId)) {
        fail('EXTRA_MATCHUP_CONTINUATION_CONTRACT_UNSUPPORTED');
      }
      recoveries.set(attempt.id, {
        kind: contractId === 'strategy.role.notes' ? 'notes' : 'evidence-review',
        failureReceipt,
        wire: await readWire(attempt.id),
      });
    }
    for (const attempt of wireReconstructable) {
      const wire = await readWire(attempt.id);
      if (wire.response?.delivery !== 'response_received'
        || wire.response?.status !== 200
        || wire.request?.outputContractRef?.id !== 'strategy.role.notes') {
        fail('EXTRA_MATCHUP_CONTINUATION_WIRE_RECONSTRUCTION_UNSAFE');
      }
      recoveries.set(attempt.id, { kind: 'notes-wire-reconstructed', wire });
    }
    const ambiguousReissues = ambiguous.map(attempt => {
      const receipt = decodeStored(attempt.response);
      if (receipt.code !== 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'
        || receipt.requestDefinitelyNotSent !== false
        || receipt.requestMayHaveBeenSent !== true
        || receipt.usageKnown !== false || receipt.usage !== null
        || receipt.physicalAttempts !== 1) {
        fail('EXTRA_MATCHUP_CONTINUATION_AMBIGUOUS_EVIDENCE_INVALID');
      }
      return { attemptId: attempt.id, receiptHash: receipt.receiptHash,
        priorReserveMicrosPreserved: true, providerUsageUnknown: true };
    });
    const excluded = [];
    const steps = [];
    const decodedRows = db.prepare(`SELECT id,input_hash,artifact FROM steps
      WHERE run=? AND state='complete' ORDER BY id`).all(parentId)
      .map(row => ({ ...row, decodedArtifact: decodeStored(row.artifact) }));
    for (const row of decodedRows) {
      const artifact = row.decodedArtifact;
      const highLevel = /^(strategy-role|evidence-review|evidence-reviewed-candidate|directed-matchup-result)/u
        .test(row.id);
      const quarantined = artifact?.status === 'quarantined'
        || String(artifact?.schema || '').includes('quarantine');
      if (quarantined && ['STRATEGY_REVIEW_ANCHOR_INVALID',
        'STRATEGY_SOURCE_REF_INVALID'].includes(artifact.code)
        && artifact.outcome?.status === 'accepted') {
        const candidateRow = decodedRows.find(candidate =>
          candidate.id.endsWith('.candidate')
          && candidate.decodedArtifact?.hash === artifact.outcome.candidateRef?.hash
          && candidate.decodedArtifact?.roleRef?.id === row.id);
        const attemptId = candidateRow?.id.replace(/\.candidate$/u, '');
        const acceptedAttempt = attempts.find(attempt =>
          attempt.id === attemptId && attempt.state === 'received'
          && attempt.response);
        if (acceptedAttempt) {
          recoveries.set(attemptId, {
            kind: artifact.code === 'STRATEGY_REVIEW_ANCHOR_INVALID'
              ? 'accepted-anchor-response' : 'accepted-source-ref-response',
            response: decodeStored(acceptedAttempt.response),
            originalCandidateHash: candidateRow.decodedArtifact.hash,
            originalQuarantineHash: artifact.hash,
          });
        } else if (artifact.code === 'STRATEGY_SOURCE_REF_INVALID'
          && candidateRow?.decodedArtifact?.outputContractRef?.id
            === 'strategy.role.notes') {
          recoveries.set(attemptId, { kind: 'notes-wire-reconstructed',
            wire: await readInheritedRecoveryWire(attemptId),
            originalCandidateHash: candidateRow.decodedArtifact.hash,
            originalQuarantineHash: artifact.hash });
        } else {
          fail('EXTRA_MATCHUP_CONTINUATION_ACCEPTED_RESPONSE_MISSING');
        }
      }
      if (!highLevel || quarantined) {
        excluded.push({ id: row.id, reason: quarantined
          ? 'quarantined_parent_artifact' : 'provider_or_nonsemantic_artifact' });
        continue;
      }
      steps.push({ id: row.id, inputHash: row.input_hash, artifact });
    }
    if (!recoveries.size && !definitelyNotSent.length
      && !ambiguousReissues.length) {
      fail('EXTRA_MATCHUP_CONTINUATION_RECOVERY_MISSING');
    }
    const reusable = steps.map(step => ({ id: step.id,
      inputHash: step.inputHash, artifactHash: hash(step.artifact) }));
    const manifest = seal({ schema: 'extra_matchup_typed_continuation_v1',
      parentRunId: parentId, parentRecipeHash: parentRecipe.hash,
      parentReportHash: parentReport.hash,
      reusable, excluded, inheritedSteps: reusable.length,
      savedSchemaRecoveries: [...recoveries].map(([attemptId, recovery]) => ({
        attemptId, kind: recovery.kind,
        ...(recovery.failureReceipt ? {
          failureReceiptHash: recovery.failureReceipt.receiptHash,
          wireHash: recovery.wire.hash,
        } : recovery.wire ? {
          wireHash: recovery.wire.hash,
        } : {
          originalCandidateHash: recovery.originalCandidateHash,
          originalQuarantineHash: recovery.originalQuarantineHash,
        }),
      })),
      definitelyNotSentAttempts: definitelyNotSent.map(attempt => ({
        attemptId: attempt.id, code: attempt.code,
        chargedMicros: 0, usageKnown: false,
      })),
      ambiguousReissues,
      failedAttemptsInherited: 0, attemptsCopied: false,
      additionalProviderCallsForSavedRecoveries: 0,
      exactInputRequiredAtConsumption: true,
      semanticAcceptanceInherited: false,
      sourceRefreshPerformed: false,
      runtimeAccepted: false,
      trainingTruth: false });
    return { manifest, steps, recoveries, parentCapabilities };
  } finally { db.close(); }
}
const readSealed = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
let continuation = null;
let recipe = baseRecipe;
let runId = 'extra-matchup-v1-' + recipe.hash.slice(0, 20);
if (resumeMode) {
  continuation = await inspectContinuation(parentRunId);
  const parentRecipe = await json(prefix + parentRunId + '/recipe.json');
  const { hash: omittedHash, ...body } = baseRecipe;
  const serializeAfterRepeatedDns =
    continuation.manifest.definitelyNotSentAttempts?.length >= 2
    || parentRecipe.maximumConcurrentDirections === 1;
  const priorAmbiguousReissuedAttemptIds = new Set(
    parentRecipe.ambiguousReissuedAttemptIds
      || parentRecipe.continuation?.ambiguousReissues
        ?.map(row => row.attemptId) || []);
  const currentAmbiguousAttemptIds = continuation.manifest.ambiguousReissues
    ?.map(row => row.attemptId) || [];
  if (currentAmbiguousAttemptIds.some(attemptId =>
    priorAmbiguousReissuedAttemptIds.has(attemptId))) {
    fail('EXTRA_MATCHUP_AMBIGUOUS_REISSUE_EXHAUSTED');
  }
  recipe = seal({ ...body,
    schema: 'ticket18_extra_directed_matchup_recipe_v2',
    continuationGeneration: Number(parentRecipe.continuationGeneration || 0) + 1,
    maximumConcurrentDirections: serializeAfterRepeatedDns ? 1
      : body.maximumConcurrentDirections,
    ambiguousReissuedAttemptIds: [...new Set([
      ...priorAmbiguousReissuedAttemptIds, ...currentAmbiguousAttemptIds])],
    automaticConcurrencyFallback: serializeAfterRepeatedDns
      ? (parentRecipe.maximumConcurrentDirections === 1
        ? 'inherited_serial_after_authenticated_not_sent_dns_failures'
        : 'two_or_more_authenticated_not_sent_dns_failures') : null,
    continuation: continuation.manifest });
  runId = `extra-matchup-v${recipe.continuationGeneration + 1}-`
    + recipe.hash.slice(0, 20);
}
const initialProgress = stageProgress(initialLedger);
if (mode.endsWith('preflight')) {
  console.log(JSON.stringify({ ready: true, ticket: 18, slice: 184,
    runId, directions: definitions.map(definition => definition.id),
    axesPerDirection: 5, plannedGenerationCalls: 200,
    actualRulesCases: inputReport.actualRulesCases,
    workspaceBytes: plans.map(plan => plan.fullWorkspaceBytes),
    selectedModel: execution.decision.model,
    selectedModelReason: execution.decision.reason,
    maxOutputUnits: executionPolicy.maxOutputUnits,
    continuationParentRunId: continuation?.manifest.parentRunId || null,
    inheritedSteps: continuation?.manifest.inheritedSteps || 0,
    savedSchemaRecoveries: continuation?.manifest.savedSchemaRecoveries.length || 0,
    maximumConcurrentDirections: recipe.maximumConcurrentDirections,
    stageTokens: initialProgress.tokens,
    stageCostCny: initialProgress.estimateCny,
    nextNotificationCny: initialProgress.nextNotificationCny,
    providerCalls: 0, sourceRefreshPerformed: false }));
  process.exit(0);
}

const out = path.join(ROOT, prefix, runId);
await mkdir(out, { recursive: true });
await putImmutable(path.join(out, 'recipe.json'), recipe);
const softLimitAlerts = [], modelIdentityAlerts = [], notifications = new Set();
const activeCapabilities = {}, completed = [], waveReceipts = [];
const local = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash,
  ...limits, resetCallWindow: true, limitMode: 'alert', onLimitAlert: alert => {
    softLimitAlerts.push(alert);
    console.log(JSON.stringify({ event: 'production-soft-limit-alert', ...alert }));
  } });
const resumable = continuation ? withCheckpointContinuation(local, continuation) : local;
const control = createFactionParallelControlV1(resumable);
const controlled = control.store;
const recoveredResponseIds = new Set();
const recoveryNormalizations = [];
const store = Object.freeze({ ...controlled,
  reserve(id, providerRequest, ...rest) {
    const saved = continuation?.recoveries.get(id);
    if (!saved) return controlled.reserve(id, providerRequest, ...rest);
    const acceptedContractId = saved.response?.usageReceipt?.outputContractRef?.id;
    const capabilityKey = saved.kind.startsWith('notes') ? 'notes'
      : saved.kind.startsWith('accepted-')
        ? (acceptedContractId === 'strategy.evidence-review'
          ? 'evidence-review'
          : acceptedContractId?.replace(/^strategy\.role\./u, ''))
        : 'evidence-review';
    const capabilityReceipt = activeCapabilities[capabilityKey];
    if (!capabilityReceipt
      || capabilityReceipt.receiptHash
        !== continuation.parentCapabilities[capabilityKey]?.receiptHash) {
      fail('EXTRA_MATCHUP_SAVED_RECOVERY_CAPABILITY_DRIFT');
    }
    let response;
    if (saved.kind.startsWith('accepted-')) {
      response = saved.response;
      if (response?.usageReceipt?.capabilityReceiptHash
        !== capabilityReceipt.receiptHash
        || hash(response.output) !== response.localValidationReceipt?.valueHash) {
        fail('EXTRA_MATCHUP_SAVED_ACCEPTED_RESPONSE_DRIFT');
      }
    } else if (saved.kind === 'notes') {
      const recovery = recoverSavedStrategyNotesRoleValueV3({
        failureReceipt: saved.failureReceipt, wire: saved.wire,
        outputContract: roleContracts.notes, capabilityReceipt,
      });
      response = materializeSavedNotesRecoveryResponseV3({ recovery,
        failureReceipt: saved.failureReceipt, wire: saved.wire,
        providerRequest, outputContract: roleContracts.notes,
        capabilityReceipt });
    } else if (saved.kind === 'notes-wire-reconstructed') {
      const reconstructed = reconstructStrategyNotesFailureFromWireV2({
        wire: saved.wire, providerRequest,
        outputContract: roleContracts.notes, capabilityReceipt,
      });
      response = recoverStrategyNotesSchemaResponseV2({ ...reconstructed,
        wire: saved.wire, providerRequest,
        outputContract: roleContracts.notes, capabilityReceipt,
      });
    } else {
      const part = saved.wire.response?.payload?.output?.[0]?.content?.[0];
      if (part?.type !== 'output_text') {
        fail('EXTRA_MATCHUP_SAVED_REVIEW_TEXT_MISSING');
      }
      const providerValue = JSON.parse(part.text);
      const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
        reviewContract.providerSchema, providerValue);
      response = recoverAdditionalPropertiesProjectionV1({
        failureReceipt: saved.failureReceipt, providerValue, validation,
        wire: saved.wire, providerRequest,
        outputContract: reviewContract, capabilityReceipt,
      });
    }
    if (!recoveredResponseIds.has(id)) {
      recoveredResponseIds.add(id);
      if (response.usageReceipt.responseNormalization?.hash) {
        recoveryNormalizations.push(response.usageReceipt.responseNormalization);
      }
      console.log(JSON.stringify({ event: 'saved-schema-response-recovered',
        requestId: id, kind: saved.kind,
        normalizationHash: response.usageReceipt.responseNormalization.hash,
        additionalProviderCalls: 0 }));
    }
    return { cached: true, response };
  },
  settle(id, outcome) {
  if (recoveredResponseIds.has(id)) {
    const saved = continuation.recoveries.get(id);
    return { recoveredFromParentResponse: true, kind: saved.kind,
      normalizationHash: saved.failureReceipt ? recoveryNormalizations.find(row =>
        row.originalFailureReceiptHash === saved.failureReceipt.receiptHash)?.hash
        : null };
  }
  const result = controlled.settle(id, outcome);
  const cumulative = ledgerSnapshot();
  const progress = stageProgress(cumulative, true);
  const crossed = Math.floor(progress.estimateMicros / 100_000_000) * 100;
  if (crossed > 0 && !notifications.has(crossed)) {
    notifications.add(crossed);
    console.log(JSON.stringify({ event: 'extra-matchup-budget-notification',
      thresholdCny: crossed, stageCostCny: progress.estimateCny,
      cumulativeTokens: cumulative.cumulativeTokens,
      cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
  }
  console.log(JSON.stringify({ event: 'usage', requestId: id,
    code: outcome.code || null, stageTokens: progress.tokens,
    stageCostCny: progress.estimateCny,
    cumulativeTokens: cumulative.cumulativeTokens,
    cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
  return result;
} });

async function runDirection({ definition, input }) {
  const directory = path.join(out, definition.id);
  await mkdir(path.join(directory, 'wire'), { recursive: true });
  const save = (name, value, raw = false) => putImmutable(
    path.join(directory, name + (raw ? '' : '.json')), value, raw);
  await save('input', input);
  const port = await attachProviderV2({ execution,
    beforeSend: control.assertActive,
    captureWire: value => save('wire/' + value.request.requestId, seal(value)),
    onModelIdentityAlert: alert => {
      modelIdentityAlerts.push(alert);
      console.log(JSON.stringify({ event: 'provider-model-identity-alert', ...alert }));
    } });
  try {
    const readWire = id => json(path.relative(ROOT,
      path.join(directory, 'wire', id + '.json')));
    const opened = withOpeningFenceRecoveryV1({ adapter: port.adapter, readWire });
    const decision = withStrategyDecisionComparisonRecoveryV1(opened);
    const projected = withAdditionalPropertiesProjectionRecoveryV1({
      adapter: decision, readWire });
    const adapter = withStrategyNotesSchemaRecoveryV2({
      adapter: projected, readWire });
    const observedDsh = { ...dsh, async run(request) {
      const result = await dsh.run(request);
      await save('dsh/' + hash({ task: request.task, result }),
        seal({ task: request.task, result, runtimeAccepted: false,
          trainingTruth: false }));
      return result;
    } };
    const byHash = new Map(Object.values(activeCapabilities)
      .map(capability => [capability.outputContractRef.hash, capability]));
    const generator = createStrategyStructuredWorkflowV2({ input, store,
      dsh: observedDsh, providerAdapter: adapter, egressBinding: binding,
      executionPolicy, priceUsage,
      capabilityReceiptRegistry: { resolve: request => ({
        ok: byHash.has(request.outputContractRef.hash),
        capabilityReceipt: byHash.get(request.outputContractRef.hash),
      }) } });
    const reviewer = createStrategyEvidenceReviewerV2({ store,
      dsh: observedDsh, providerAdapter: adapter, egressBinding: binding,
      capabilityReceipt: activeCapabilities['evidence-review'],
      executionPolicy, priceUsage });
    const result = await createDirectedMatchupProductionV1({ input,
      generator, reviewer, store,
      onProgress: event => console.log(JSON.stringify({
        event: 'extra-matchup-progress', ticket: 18, slice: 184,
        directionId: definition.id, ...event })) }).produce();
    await save('candidate', result);
    await save('candidate.md', renderDirectedMatchupCandidateV1(result), true);
    completed.push(result);
    return result;
  } finally { await port.close(); }
}

async function runSerialWave(wave) {
  const results = [];
  for (const definition of wave) {
    const lane = { factionRecordKey: definition.ownFaction, definition,
      input: inputs[definitions.indexOf(definition)] };
    console.log(JSON.stringify({ event: 'extra-matchup-lane', ticket: 18,
      slice: 184, faction: lane.factionRecordKey, stage: 'lane_started',
      active: 1, concurrencyFallback: true }));
    try {
      const value = await runDirection(lane);
      results.push({ status: 'fulfilled', value });
    } catch (error) {
      control.noteFailure(error);
      const code = safeCode(error);
      console.log(JSON.stringify({ event: 'extra-matchup-lane', ticket: 18,
        slice: 184, faction: lane.factionRecordKey, stage: 'lane_failed',
        code, messageHash: hash(String(error.message)), errorType: error.name }));
      results.push({ status: 'rejected', reason: error });
    } finally {
      console.log(JSON.stringify({ event: 'extra-matchup-lane', ticket: 18,
        slice: 184, faction: lane.factionRecordKey, stage: 'lane_settled',
        active: 0, concurrencyFallback: true }));
    }
  }
  return { results, receipt: seal({
    version: 'extra_matchup_serial_execution_v1',
    maximumConcurrentLanes: 1,
    lanes: results.map((result, index) => ({
      faction: wave[index].ownFaction, status: result.status,
      ...(result.status === 'fulfilled' ? { resultHash: hash(result.value) }
        : { failureCode: safeCode(result.reason) }),
    })),
    concurrencyFallback: 'repeated_authenticated_not_sent_dns_failures',
    trainingTruth: false,
  }) };
}

let renewalPort = null, failure = null;
try {
  for (const sample of samples) {
    control.assertActive();
    renewalPort ||= await attachProviderV2({ execution,
      beforeSend: control.assertActive,
      onModelIdentityAlert: alert => {
        modelIdentityAlerts.push(alert);
        console.log(JSON.stringify({ event: 'provider-model-identity-alert', ...alert }));
      } });
    const prior = priorCapabilities[sample.kind];
    if (!prior?.receiptHash) fail('EXTRA_MATCHUP_PRIOR_CAPABILITY_MISSING');
    activeCapabilities[sample.kind] = await renewFactionCapabilityV1({
      store, adapter: renewalPort.adapter, binding, contract: sample.contract,
      prior, priceUsage, probeSample: sample.sample });
  }
  await putImmutable(path.join(out, 'active-capabilities.json'),
    seal(activeCapabilities));
  await renewalPort.close(); renewalPort = null;
  for (const wave of waves) {
    const lanes = recipe.maximumConcurrentDirections === 1
      ? await runSerialWave(wave)
      : await runFactionLanesV1({ control,
        inputs: wave.map(definition => ({ factionRecordKey: definition.ownFaction,
          definition, input: inputs[definitions.indexOf(definition)] })),
        onProgress: event => console.log(JSON.stringify({
          event: 'extra-matchup-lane', ticket: 18, slice: 184, ...event })),
        runLane: runDirection,
      });
    waveReceipts.push(lanes.receipt);
    const rejected = lanes.results.find(result => result.status === 'rejected');
    if (rejected) throw rejected.reason;
  }
} catch (error) {
  failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) };
} finally { await renewalPort?.close(); }
const finalLedger = local.summary();
const cumulative = ledgerSnapshot();
const progress = stageProgress(cumulative);
const report = seal({ schema: 'ticket18_extra_directed_matchup_report_v1',
  ticket: 18, slice: 184, runId, recipeHash: recipe.hash,
  continuation: continuation ? {
    parentRunId: continuation.manifest.parentRunId,
    manifestHash: continuation.manifest.hash,
    inheritedSteps: continuation.manifest.inheritedSteps,
    recoveredResponseIds: [...recoveredResponseIds],
    savedSchemaRecoveries: recoveryNormalizations.map(row => row.hash),
    additionalProviderCallsForSavedRecoveries: 0,
  } : null,
  candidates: completed.map(candidate => ({ scope: candidate.scope,
    hash: candidate.hash, status: candidate.status,
    sourceReviewedAxes: candidate.sourceReviewedAxes,
    modelReportedClearAxes: candidate.modelReportedClearAxes,
    pendingFindings: candidate.pending.length })),
  parallelWaves: waveReceipts,
  failure, ledger: finalLedger, stageAccounting: progress, cumulative,
  softLimitAlerts, modelIdentityAlerts,
  formalSkillsAccepted: 0,
  independentDecisionValidationRequired: true,
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  trainingTruth: false });
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2),
  { mode: 0o600 });
local.close();
console.log(JSON.stringify({ event: 'report', ticket: 18, slice: 184,
  runId, directionsGenerated: completed.length, failure,
  stageTokens: progress.tokens, stageCostCny: progress.estimateCny,
  cumulativeTokens: cumulative.cumulativeTokens,
  cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6,
  reportHash: report.hash }));
if (failure) process.exitCode = 1;
