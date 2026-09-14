import { DatabaseSync } from 'node:sqlite';
import { readFactionFieldRecoveryEvidenceV1 } from '../skill-production-v3/faction-field-recovery-scope-v1.mjs';
import { readFactionFieldValuePaidEvidenceV1 } from '../skill-production-v3/faction-field-value-runtime-v1.mjs';
import { createFactionFieldSourceReaderV1 } from '../skill-production-v3/faction-field-source-integration-v1.mjs';
import { openFactionMixedReviewEnvironmentV1 } from '../skill-production-v3/faction-mixed-review-environment-v1.mjs';
import { seal, verifySeal, hash, sha256, safe, fail } from '../skill-production/common.mjs';
import { normalizeFactionReviewCommandEnvelopeV1 } from '../skill-production-v3/faction-command-envelope-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from './faction-structured-replay-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from './faction-teach-failure-evidence-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from './faction-structured-success-evidence-v1.mjs';
import { readFactionWireReviewFailureV1 } from '../skill-production-v3/faction-review-decomposition-v1.mjs';
import { auditFactionCheckpointExecutionRowsV1, readFactionCheckpointInventoryV1 }
  from '../skill-production-v3/faction-checkpoint-inventory-v1.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1, FACTION_PARSED_REVIEW_VALUE_BINDING_V2,
  verifyFactionParsedReviewValueRecordV1, verifyFactionParsedReviewValueRecordV2 }
  from '../skill-production-v3/faction-parsed-review-value-v1.mjs';
import { factionExecutionProfileV1 } from '../skill-production-v3/faction-execution-model-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { authenticateFactionStructuralReviewV1 } from '../skill-production-v3/faction-structural-json-environment-v1.mjs';
import { FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1, verifyFactionStructuralReviewRoleV1 } from '../skill-production-v3/faction-structural-json-runtime-v1.mjs';
import { assertFactionStructuralJsonRecipeV1 } from '../skill-production-v3/faction-structural-json-scope-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 } from '../structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2, factionParsedWirePhaseCapsuleV2,
  verifyFactionParsedWireCorrectionRecordV2 } from '../skill-production-v3/faction-structural-json-schema-bridge-v2.mjs';

// Read-only replay of the production program's host role inputs and derived
// issue/patch/section artifacts. This is NOT full DSH prompt replay: raw role
// outputs are reused only after checking the real paid response lineage.
export function openFactionProductionReplayV1({ filename, runId, recipe, ancestors = [], input = null, editorImport = null,
  openingFenceRecovery = null }) {
  [recipe, ...ancestors].forEach(verifySeal);
  if (recipe.version !== 'faction_strategy_production_v1' || runId !== 'faction-v1-' + recipe.hash.slice(0, 20))
    fail('FACTION_REPLAY_RECIPE_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  const decoded = raw => verifySeal(JSON.parse(raw)).value;
  const readStep = id => {
    const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
    return row ? { inputHash: row.input_hash, value: decoded(row.artifact) } : null;
  };
  const recipes = new Map([recipe, ...ancestors].map(r => ['faction-v1-' + r.hash.slice(0, 20), r]));
  const responses = new Map(), capabilities = new Map(), chain = [], steps = new Set(), roleHashes = new Set(), receiptHashes = new Set();
  const requests = new Map(), artifactCache = new Map(), importedCanaryHashes = new Set();
  const structuralAuthentications = new Map();
  const parsedWireAuthentications = new Map();
  const resolveArtifact = identity => {
    const lookup = typeof identity === 'string' ? identity
      : identity?.kind === 'rejected_candidate_by_context'
        && /^[a-f0-9]{64}$/u.test(identity.contextHash || '')
        && typeof identity.roleId === 'string'
        ? `context:${identity.contextHash}:${identity.roleId}` : null;
    if (!lookup || typeof identity === 'string'
      && !/^[a-f0-9]{64}$/u.test(identity))
      fail('FACTION_STRUCTURED_REPLAY_ARTIFACT_MISSING');
    if (!artifactCache.has(lookup)) {
      for (const owner of chain) {
        const rows = typeof identity === 'string'
          ? db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.hash')=?")
            .all(owner, identity)
          : db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.contextManifestRef.hash')=? AND json_extract(artifact,'$.value.roleRef.id')=? AND json_extract(artifact,'$.value.version') LIKE '%rejected-candidate'")
            .all(owner, identity.contextHash, identity.roleId);
        if (rows.length > 1) fail('FACTION_STRUCTURED_REPLAY_ARTIFACT_AMBIGUOUS');
        if (rows.length === 1) {
          artifactCache.set(lookup,
            verifySeal(decoded(rows[0].artifact))); break;
        }
      }
    }
    if (!artifactCache.has(lookup)) fail('FACTION_STRUCTURED_REPLAY_ARTIFACT_MISSING');
    return artifactCache.get(lookup);
  };
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    let id = runId;
    while (id) {
      const r = recipes.get(id);
      const journal = db.prepare('SELECT recipe FROM runs WHERE id=?').get(id);
      if (!r || chain.includes(id) || journal && journal.recipe !== r.hash
        || !journal && (id === runId || !r.continuation
          || db.prepare('SELECT count(*) n FROM attempts WHERE run=?').get(id).n
          || db.prepare('SELECT count(*) n FROM steps WHERE run=?').get(id).n)
        || r.modelHash !== recipe.modelHash || r.contextHash !== recipe.contextHash
        || hash(r.sourceBinding) !== hash(recipe.sourceBinding)) fail('FACTION_REPLAY_LINEAGE_INVALID');
      if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(id).n
        || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(id).n) fail('FACTION_REPLAY_RUN_NOT_TERMINAL');
      chain.push(id);
      auditFactionCheckpointExecutionRowsV1({ recipe: r,
        readInventory: () => readFactionCheckpointInventoryV1({ filename,
          parentRunId: r.continuation.parentRunId, parentRecipe: recipes.get(r.continuation.parentRunId),
          lanePrefixes: r.continuation.checkpointInventory.lanePrefixes,
          restorationWindows: r.continuation.checkpointInventory.restorationWindows, readRecipe: owner => recipes.get(owner) }),
        rows: db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(id)
          .map(row => ({ id: row.id, inputHash: row.input_hash, artifact: decoded(row.artifact) })),
        readInheritedRow: (owner, stepId) => {
          const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(owner, stepId);
          return row ? { inputHash: row.input_hash, artifact: decoded(row.artifact) } : null;
        } });
      for (const row of db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(id)) {
        const response = decoded(row.response), h = response?.usageReceipt?.receiptHash;
        // Capability probes are actual paid attempts but are not role results.
        // No role may use their receipts as semantic/model-output provenance.
        if (!h && response?.capabilityReceipt && response.ok === true) {
          const capability = response.capabilityReceipt;
          capabilities.set(capability.receiptHash, capability); continue;
        }
        if (!h || responses.has(h)) fail('FACTION_REPLAY_DUPLICATE_OR_MISSING_RECEIPT');
        responses.set(h, { response, originRunId: id, originRecipe:r });
      }
      if (r.continuation) {
        verifySeal(r.continuation);
        id = r.continuation.parentRunId;
        if (recipes.get(id)?.hash !== r.continuation.parentRecipeHash) fail('FACTION_REPLAY_LINEAGE_INVALID');
      } else id = null;
    }
    if (chain.length !== recipes.size) fail('FACTION_REPLAY_FOREIGN_ANCESTOR');
    for (const proof of openingFenceRecovery?.proofs || [])
      if (!chain.includes(proof.originRunId)) fail('FACTION_OPENING_FENCE_FOREIGN_ANCESTOR');
    if (editorImport) {
      verifySeal(editorImport);
      if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(editorImport.originRunId)?.recipe !== editorImport.originRecipeHash) fail('FACTION_STRUCTURED_REPLAY_IMPORT_ORIGIN_INVALID');
      const paid = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(editorImport.originRunId)
        .map(row => decoded(row.response)).filter(row => row?.usageReceipt && hash(row.output) === editorImport.rawAdviceHash);
      if (paid.length !== 1) fail('FACTION_STRUCTURED_REPLAY_IMPORT_PAYMENT_MISSING');
      const { receiptHash, ...body } = paid[0].usageReceipt;
      if (hash(body) !== receiptHash || body.physicalAttempts !== 1 || body.automaticRetries !== 0
        || body.responseFingerprint !== editorImport.rawAdviceHash || body.reportedModel !== 'deepseek-v4-flash') fail('FACTION_STRUCTURED_REPLAY_IMPORT_RECEIPT_INVALID');
      receiptHashes.add(receiptHash);
    }
  } catch (error) { db.close(); throw error; }
  function verifyRole(value, id, expectedContextHash, expectedInputHash, expectedTask) {
    verifySeal(value); verifySeal(value.loop);
    if (value.roleId !== id || value.contextHash !== expectedContextHash || value.contextHash !== recipe.contextHash
      || value.sourceDelivery !== 'host_materialized_in_every_role_prompt'
      || value.loop.runtimeBinding?.hash !== recipe.dshBindingHash || !value.loop.sandboxReceipt
      || value.loop.directNetworkUsed !== false || value.loop.trainingTruth !== false || value.trainingTruth !== false
      || !value.loop.transcript.length || value.loop.calls !== value.loop.transcript.length
      || hash(value.loop.final) !== hash(value.output)) fail('FACTION_REPLAY_ROLE_INVALID');
    value.loop.transcript.forEach((t, index) => {
      const origin = responses.get(t.receiptHash), response = origin?.response, receipt = response?.usageReceipt;
      if (!receipt) fail('FACTION_REPLAY_RECEIPT_MISSING');
      let roleOriginRunId = origin.originRunId;
      let command = response.output?.channels?.skill;
      if (!command) {
        const envelopes = chain.flatMap(ownerRunId => {
          const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
            .get(ownerRunId, id + '.command-envelope.call-' + t.call);
          if (!row) return [];
          const envelope = verifySeal(decoded(row.artifact));
          return envelope.rawReceiptHash === t.receiptHash ? [{ ownerRunId, envelope }] : [];
        });
        if (envelopes.length !== 1) fail('FACTION_REPLAY_COMMAND_ENVELOPE_MISSING');
        const { ownerRunId, envelope } = envelopes[0];
        const normalized = normalizeFactionReviewCommandEnvelopeV1({ output: response.output, stageId: id,
          observed: { messages: [{ role: 'user', content: expectedTask }] } });
        const originalAttempt = db.prepare("SELECT request_hash FROM attempts WHERE run=? AND id=? AND state='received'")
          .get(origin.originRunId, envelope.attemptId);
        if (normalized.hash !== envelope.normalized.hash || envelope.stageId !== id || envelope.call !== t.call
          || envelope.rawResponseHash !== hash(response) || originalAttempt?.request_hash !== envelope.requestHash
          || (envelope.originRunId || ownerRunId) !== origin.originRunId) fail('FACTION_REPLAY_COMMAND_ENVELOPE_DRIFT');
        if (envelope.originRunId) {
          const owner = recipes.get(ownerRunId);
          const binding = [owner?.commandRecoveryBinding, ...(owner?.additionalCommandRecoveryBindings || [])]
            .find(row => row?.hash === envelope.recoveryManifestHash);
          if (!binding || binding.hash !== envelope.recoveryManifestHash || binding.parentRunId !== origin.originRunId
            || !binding.attempts.some(a => a.id === envelope.attemptId && a.requestHash === envelope.requestHash && a.receiptHash === t.receiptHash))
            fail('FACTION_REPLAY_COMMAND_RECOVERY_BINDING_DRIFT');
        }
        roleOriginRunId = ownerRunId; command = normalized.command;
      }
      const originRow = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(roleOriginRunId, id);
      if (!originRow || originRow.input_hash !== expectedInputHash || verifySeal(decoded(originRow.artifact)).hash !== value.hash)
        fail('FACTION_REPLAY_ROLE_ORIGIN_DRIFT');
      const { receiptHash, ...body } = receipt;
      const paidProfile = factionExecutionProfileV1({binding:origin.originRecipe.executionModelBinding || null});
      if (hash(body) !== receiptHash || body.schemaVersion !== 'starcraft_tmg_provider_egress_transport_v1.success'
        || body.providerProfileRef?.hash !== paidProfile.integrity.hash || body.status !== 200
        || body.physicalAttempts !== 1 || body.automaticRetries !== 0
        || body.responseFingerprint !== sha256(JSON.stringify(response.output)) || !command
        || t.call !== index + 1 || t.action !== command.action || t.commandHash !== sha256(JSON.stringify(command))) fail('FACTION_REPLAY_RECEIPT_INVALID');
      if (index === value.loop.transcript.length - 1 && (command.action !== 'finish' || hash(command.content) !== hash(value.output)))
        fail('FACTION_REPLAY_FINAL_OUTPUT_DRIFT');
      receiptHashes.add(receiptHash);
    });
    roleHashes.add(value.hash);
  }
  const store = Object.freeze({
    acquire(id, input) {
      const row = readStep(id);
      if (!row || row.inputHash !== hash(safe(input)) || steps.has(id)) fail('FACTION_REPLAY_STEP_INPUT_DRIFT', { stepId: id });
      steps.add(id);
      if (row.value?.roleId === id && row.value?.structuredDecodePassed === true) {
        const proof = verifyFactionStructuredRoleReplayV1({ value: row.value, roleInput: input,
          request: requests.get(id), input: factionInput, recipe, resolveArtifact, openingFenceRecovery,
          resolveFieldRecoveryEvidence: ({ value, prepared }) => readFactionFieldRecoveryEvidenceV1({
            filename, recipe, ancestors, prepared, currentRunId: runId, expectedMaterialization: value.materialization }),
          resolveFieldValuePaidEvidence: choice => readFactionFieldValuePaidEvidenceV1({ filename, choice, allowedRunIds: chain }),
          resolveFieldValueSourceHandoff: ({ prepared }) => createFactionFieldSourceReaderV1({ filename, recipe, ancestors,
            runId, input: factionInput })(prepared),
          resolveMixedReviewEnvironment: args => openFactionMixedReviewEnvironmentV1({ filename, recipe,
            parentRunId: recipe.continuation?.parentRunId, parentRecipe: recipes.get(recipe.continuation?.parentRunId),
            args, openingFenceRecovery, readManifest: owner => recipes.get(owner) }),
          resolveStructuralReviewAuthentication: value => {
            const authenticated = structuralAuthentications.get(value.hash);
            if (!authenticated) fail('FACTION_STRUCTURAL_JSON_CONSUMER_AUTHENTICATION_REQUIRED');
            return authenticated;
          },
          resolveParsedWireRecoveryAuthentication: (value, contextHash) => {
            const authenticated = parsedWireAuthentications.get(value.hash + '/' + contextHash);
            if (!authenticated) fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_AUTHENTICATION_REQUIRED');
            return authenticated;
          },
          resolveNativeReviewAmbiguousOrigin: replacement => {
            const grant = verifySeal(replacement).grant;
            if (!chain.includes(grant.originRunId))
              fail('FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_FOREIGN_ORIGIN');
            const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?')
              .get(grant.originRunId, grant.originAttemptId);
            const read = suffix => {
              const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
                .get(grant.originRunId, grant.originAttemptId + suffix);
              if (!row) fail('FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_EVIDENCE_MISSING');
              return decoded(row.artifact);
            };
            const failureReceipt = attempt ? decoded(attempt.response) : null;
            const capability = capabilities.get(failureReceipt?.capabilityReceiptHash);
            if (!attempt || !capability)
              fail('FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_EVIDENCE_MISSING');
            return { attempt, failureReceipt, issue: read('.issue'),
              runtimeReceipt: read('.runtime-receipt'),
              ownerRecipe: recipes.get(grant.originRunId), capability };
          },
          resolveResponse: identity => responses.get(identity), resolveCapabilityReceipt: identity => capabilities.get(identity), editorImport,
          resolveReviewWireEvidence: ({ value, capsule }) => {
            const origin = value.wireFailureEvidence;
            if (!chain.includes(origin.runId)) fail('FACTION_REVIEW_WIRE_FOREIGN_ANCESTOR');
            return readFactionWireReviewFailureV1({ filename, runId: origin.runId, attemptId: origin.attemptId,
              capsule, invocation: origin.originalInvocation, providerRequest: {
                schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: origin.attemptId,
                roleRef: capsule.roleRef, instructions: capsule.instructions, input: capsule.compiledInput,
                outputContractRef: capsule.outputContractRef, maxOutputUnits: 4096 } });
          },
          resolveStructuredSuccessEvidence: ({ runId: owner, attemptId }) => {
            if (!chain.includes(owner)) fail('FACTION_REVIEW_FRAGMENT_FOREIGN_ANCESTOR');
            return readFactionStructuredSuccessEvidenceV1({ filename, runId: owner, attemptId });
          },
          resolveStructuredSchemaFailureEvidence: rejectedHash => {
            const candidates = [];
            for (const owner of chain) {
              const rows = db.prepare("SELECT id FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.hash')=?")
                .all(owner, rejectedHash).filter(r => r.id.endsWith('.rejected-candidate'));
              for (const row of rows) {
                const attemptId = row.id.slice(0, -'.rejected-candidate'.length);
                if (db.prepare('SELECT 1 FROM attempts WHERE run=? AND id=?').get(owner, attemptId))
                  candidates.push({ owner, attemptId });
              }
            }
            if (candidates.length !== 1) fail('FACTION_REVIEW_SOURCE_EXPANSION_SCHEMA_OWNER_NOT_UNIQUE');
            const { owner, attemptId } = candidates[0];
            return { ...readFactionTeachFailureEvidenceV1({ filename, runId: owner, attemptId }), ownerRecipe: recipes.get(owner) };
          },
          resolveTeachFailureEvidence: materialization => {
            if (!chain.includes(materialization.originRunId)) fail('FACTION_TEACH_FAILURE_FOREIGN_ANCESTOR');
            return readFactionTeachFailureEvidenceV1({ filename, runId: materialization.originRunId,
              attemptId: materialization.originAttemptId });
          },
          resolveCompleteReviewImportEvidence: proof => {
            if (!chain.includes(proof.originRunId)) fail('FACTION_REVIEW_COMPLETE_IMPORT_FOREIGN_ANCESTOR');
            return readFactionStructuredSuccessEvidenceV1({ filename, runId: proof.originRunId, attemptId: proof.originAttemptId });
          } });
        proof.providerReceiptHashes.forEach(identity => receiptHashes.add(identity));
        if (proof.importedCanaryHash) importedCanaryHashes.add(proof.importedCanaryHash);
        roleHashes.add(row.value.hash);
        return { cached: true, artifact: row.value };
      }
      if (row.value?.roleId === id) {
        verifyRole(row.value, id, input.contextHash, row.inputHash, input.task);
        return { cached: true, artifact: row.value };
      }
      return { cached: false, id, saved: verifySeal(row.value) };
    },
    finish(lease, value) {
      if (verifySeal(value).hash !== lease.saved.hash) fail('FACTION_REPLAY_DERIVED_OUTPUT_DRIFT');
      return lease.saved;
    },
    release() {},
    reserve() { fail('FACTION_REPLAY_EGRESS_FORBIDDEN'); },
    settle() { fail('FACTION_REPLAY_MUTATION_FORBIDDEN'); },
  });
  const factionInput = input;
  return { store,
    async authenticateRoleRequest(request) {
      const row = readStep(request.packet.id + '.' + request.roleId), value = row?.value;
      if (value?.parsedWireRecoveries || value?.parsedReviewValues) {
        const records = [...(value.parsedWireRecoveries || []), ...(value.parsedReviewValues || [])];
        const parsedV1 = (value.parsedReviewValues || []).filter(record =>
          record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.version);
        const parsedV2 = (value.parsedReviewValues || []).filter(record =>
          record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version);
        if (value.parsedReviewValues && (!Array.isArray(value.parsedReviewValues)
          || !value.parsedReviewValues.length
          || parsedV1.length + parsedV2.length !== value.parsedReviewValues.length
          || parsedV1.length && recipe.parsedReviewValueBinding?.hash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V1.hash
          || parsedV2.length && value.parsedReviewNarrativeBindingHash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash
          || !parsedV2.length && value.parsedReviewNarrativeBindingHash))
          fail('FACTION_PARSED_REVIEW_VALUE_CONSUMER_BINDING_REQUIRED');
        if (recipe.parsedWireSchemaBridgeBinding?.hash !== FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2.hash
          || !assertFactionStructuralJsonRecipeV1(recipe) || records.length > 4
          || new Set(records.map(r => r.originalContextHash)).size !== records.length)
          fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_BINDING_REQUIRED');
        const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
          allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
          idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
        const prepared = prepareFactionSlotReviewRoleV1({ input: factionInput, request, executionPolicy });
        if (!prepared || row.inputHash !== hash(safe(prepared.roleInput))) fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_INPUT_DRIFT');
        for (const record of records) {
          verifySeal(record);
          const origin = { runId: record.authenticatedProof.originRunId, attemptId: record.authenticatedProof.originAttemptId,
            issueHash: record.authenticatedProof.originalWireIssueHash };
          if (!chain.includes(origin.runId) || origin.runId !== runId
            && !recipe.structuralJsonReviewOrigins.some(o => hash(o) === hash(origin)))
            fail('FACTION_PARSED_WIRE_SCHEMA_CONSUMER_FOREIGN_ORIGIN');
          const capsule = factionParsedWirePhaseCapsuleV2({ input: factionInput, baseCapsule: prepared.capsule, value, record, resolveArtifact });
          const phasePrepared = { ...prepared, capsule, roleInput: { ...prepared.roleInput,
            roleRef: capsule.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(capsule) } };
          const { proof } = await authenticateFactionStructuralReviewV1({ filename, origin,
            ownerRecipe: recipes.get(origin.runId), prepared: phasePrepared, executionPolicy,
            helperRef: recipe.wireKeyHelperRef, parsedRecoveryBinding: AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 });
          if (record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.version)
            verifyFactionParsedReviewValueRecordV1({ record, capsule, authenticated: proof, dshBindingHash: recipe.dshBindingHash });
          else if (record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version)
            verifyFactionParsedReviewValueRecordV2({ record, capsule, authenticated: proof,
              dshBindingHash: recipe.dshBindingHash });
          else verifyFactionParsedWireCorrectionRecordV2({ record, capsule, authenticated: proof, dshBindingHash: recipe.dshBindingHash,
            parsedReviewValue: value.parsedReviewValues?.find(r => r.hash === record.correctedParsedReviewValueRef?.hash) });
          parsedWireAuthentications.set(value.hash + '/' + capsule.hash, proof);
        }
      }
      if (value?.protocol !== FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1.version) return;
      if (!assertFactionStructuralJsonRecipeV1(recipe)) fail('FACTION_STRUCTURAL_JSON_CONSUMER_BINDING_REQUIRED');
      const origin = value.structuralJsonRecoveryOrigin;
      if (!chain.includes(origin.runId) || origin.runId !== runId
        && !recipe.structuralJsonReviewOrigins.some(o => hash(o) === hash(origin)))
        fail('FACTION_STRUCTURAL_JSON_CONSUMER_FOREIGN_ORIGIN');
      const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
        allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
        idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
      const prepared = prepareFactionSlotReviewRoleV1({ input: factionInput, request, executionPolicy });
      if (!prepared || row.inputHash !== hash(safe(prepared.roleInput))) fail('FACTION_STRUCTURAL_JSON_CONSUMER_INPUT_DRIFT');
      const { proof } = await authenticateFactionStructuralReviewV1({ filename, origin, ownerRecipe: recipes.get(origin.runId),
        prepared, executionPolicy, helperRef: recipe.wireKeyHelperRef });
      verifyFactionStructuralReviewRoleV1({ value, prepared, authenticated: proof,
        dshBindingHash: recipe.dshBindingHash, selectedBinding: recipe.structuralJsonReviewBinding });
      structuralAuthentications.set(value.hash, proof);
    },
    bindRoleRequest: request => requests.set(request.packet.id + '.' + request.roleId, request),
    readRoleSteps: () => db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.roleId')=id").all(runId)
      .map(row => ({ id: row.id, inputHash: row.input_hash, artifact: decoded(row.artifact) })),
    close: () => db.close(), evidence: () => seal({ runId, recipeHash: recipe.hash, ancestorRunIds: chain.slice(1),
    matchedStepIds: [...steps], rawRoleHashes: [...roleHashes], actualProviderReceiptHashes: [...receiptHashes],
    hostRoleInputsRebuilt: true, derivedArtifactsRebuilt: true, actualRawResponsesMatched: true,
    exactDshProviderRequestsReplayed: false, independentSemanticReviewPerformed: false,
    structuredRoleMappingRebuilt: requests.size > 0, actualCanaryImportHashes: [...importedCanaryHashes],
    ...(structuralAuthentications.size ? { structuralJsonAuthentications: [...structuralAuthentications.values()].map(p => ({ originRunId: p.originRunId,
      originAttemptId: p.originAttemptId, proofHash: p.hash })) } : {}),
    ...(parsedWireAuthentications.size ? { parsedWireAuthentications: [...parsedWireAuthentications.values()].map(p => ({
      originRunId: p.originRunId, originAttemptId: p.originAttemptId, proofHash: p.hash })) } : {}),
    newProviderCalls: 0, runtimeAccepted: false, trainingTruth: false }) };
}
