import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256, safe, fail } from '../skill-production/common.mjs';
import { normalizeFactionReviewCommandEnvelopeV1 } from '../skill-production-v3/faction-command-envelope-v1.mjs';

// Read-only replay of the production program's host role inputs and derived
// issue/patch/section artifacts. This is NOT full DSH prompt replay: raw role
// outputs are reused only after checking the real paid response lineage.
export function openFactionProductionReplayV1({ filename, runId, recipe, ancestors = [] }) {
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
  const responses = new Map(), chain = [], steps = new Set(), roleHashes = new Set(), receiptHashes = new Set();
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    let id = runId;
    while (id) {
      const r = recipes.get(id);
      if (!r || chain.includes(id) || db.prepare('SELECT recipe FROM runs WHERE id=?').get(id)?.recipe !== r.hash
        || r.modelHash !== recipe.modelHash || r.contextHash !== recipe.contextHash
        || hash(r.sourceBinding) !== hash(recipe.sourceBinding)) fail('FACTION_REPLAY_LINEAGE_INVALID');
      if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(id).n
        || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(id).n) fail('FACTION_REPLAY_RUN_NOT_TERMINAL');
      chain.push(id);
      for (const row of db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(id)) {
        const response = decoded(row.response), h = response?.usageReceipt?.receiptHash;
        if (!h || responses.has(h)) fail('FACTION_REPLAY_DUPLICATE_OR_MISSING_RECEIPT');
        responses.set(h, { response, originRunId: id });
      }
      if (r.continuation) {
        verifySeal(r.continuation);
        id = r.continuation.parentRunId;
        if (recipes.get(id)?.hash !== r.continuation.parentRecipeHash) fail('FACTION_REPLAY_LINEAGE_INVALID');
      } else id = null;
    }
    if (chain.length !== recipes.size) fail('FACTION_REPLAY_FOREIGN_ANCESTOR');
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
          const binding = recipes.get(ownerRunId)?.commandRecoveryBinding;
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
      if (hash(body) !== receiptHash || body.schemaVersion !== 'starcraft_tmg_provider_egress_transport_v1.success'
        || body.providerProfileRef?.hash !== recipe.modelHash || body.status !== 200
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
  return { store, close: () => db.close(), evidence: () => seal({ runId, recipeHash: recipe.hash, ancestorRunIds: chain.slice(1),
    matchedStepIds: [...steps], rawRoleHashes: [...roleHashes], actualProviderReceiptHashes: [...receiptHashes],
    hostRoleInputsRebuilt: true, derivedArtifactsRebuilt: true, actualRawResponsesMatched: true,
    exactDshProviderRequestsReplayed: false, independentSemanticReviewPerformed: false,
    newProviderCalls: 0, runtimeAccepted: false, trainingTruth: false }) };
}
