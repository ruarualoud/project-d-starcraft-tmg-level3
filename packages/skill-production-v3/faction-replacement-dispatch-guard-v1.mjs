import { DatabaseSync } from 'node:sqlite';
import { openProductionStore } from '../skill-production/store.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 as binding } from './faction-ambiguous-replacement-v1.mjs';

const invalid = suffix => fail('FACTION_REPLACEMENT_DISPATCH_' + suffix);
const decode = raw => raw == null ? null : verifySeal(JSON.parse(raw)).value;

// A separate zero-egress coordinator journal uses the EXISTING schema. The
// original paid run/attempt is never edited. The shared CAS lease closes the
// two-coordinator race; the actual production store still owns budget+attempt.
// Do not expose cached.response without also consuming its actual originRunId.
export function openFactionReplacementDispatchGuardV1({ filename, prepared, store, authenticate,
  allowedRunIds, now = () => Date.now() }) {
  const { grant } = prepared;
  verifySeal(grant);
  if (grant.version !== 'faction_ambiguous_replacement_grant_v1' || grant.bindingHash !== binding.hash
    || grant.maximumReplacementAttempts !== 1 || prepared.dispatchPermittedWithoutDurableClaim !== false
    || typeof authenticate !== 'function' || !Array.isArray(allowedRunIds)
    || new Set(allowedRunIds).size !== allowedRunIds.length || !store?.reserve || !store?.summary) invalid('DEPENDENCIES');
  const controlRunId = 'faction-replacement-control-' + grant.hash.slice(0, 24);
  const db = new DatabaseSync(filename, { readOnly: true });
  let control;
  try {
    if (db.prepare('SELECT count(*) n FROM attempts WHERE code=?').get('PROVIDER_PAYMENT_REQUIRED').n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    control = openProductionStore(filename, { runId: controlRunId, recipeHash: grant.hash,
      maxCalls: 1, maxCostMicros: 1, maxTokens: 1, now });
  } catch (error) { db.close(); throw error; }
  const choiceInput = { grantHash: grant.hash };
  const identity = () => ({ grantHash: grant.hash, requestId: prepared.request.requestId,
    requestHash: hash(prepared.request), invocationHash: hash(prepared.invocation),
    selectionHash: prepared.selection.hash, capabilityReceiptHash: prepared.capability.receiptHash });
  return Object.freeze({ controlRunId,
    reserve(id, request, estimateMicros, tokenReserve) {
      if (db.prepare('SELECT count(*) n FROM attempts WHERE code=?').get('PROVIDER_PAYMENT_REQUIRED').n)
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
      if (id !== prepared.request.requestId || hash(request) !== hash(prepared.request)) invalid('REQUEST_SCOPE');
      const fresh = authenticate();
      if (!fresh || verifySeal(fresh.grant).hash !== grant.hash || hash(fresh.request) !== hash(request)
        || hash(fresh.invocation) !== hash(prepared.invocation) || fresh.selection.hash !== prepared.selection.hash
        || fresh.capability.receiptHash !== prepared.capability.receiptHash) invalid('AUTHENTICATION_DRIFT');
      const lock = control.acquire('dispatch-mutex', choiceInput, 60000);
      if (lock.cached) invalid('MUTEX_CORRUPT');
      try {
        // Choice survives a crash before reserve(). Another version may resume
        // this exact request, but cannot exploit new model/capability IDs to buy
        // a second sample. A retirement transition needs its separate route.
        const chosen = control.acquire('dispatch-choice', choiceInput);
        const choice = chosen.cached ? verifySeal(chosen.artifact)
          : control.finish(chosen, seal({ version: 'faction_replacement_dispatch_choice_v1', ...identity(), trainingTruth: false }));
        if (hash(Object.fromEntries(Object.keys(identity()).map(k => [k, choice[k]]))) !== hash(identity())) invalid('CHOICE_CHANGED');
        const rows = db.prepare('SELECT * FROM attempts WHERE id=?').all(id);
        if (rows.length > 1) invalid('DUPLICATE_OWNER');
        const existing = rows[0], currentRunId = store.summary().runId;
        const dispatchRef = { controlRunId, choiceHash: choice.hash, grantHash: grant.hash };
        if (existing) {
          if (existing.request_hash !== choice.requestHash) invalid('SAVED_REQUEST_DRIFT');
          if (existing.run !== currentRunId && !allowedRunIds.includes(existing.run)) invalid('FOREIGN_OWNER');
          if (existing.state === 'intent') fail('AMBIGUOUS_EGRESS_NO_RETRY');
          if (existing.state === 'received') return { cached: true, response: decode(existing.response),
            originRunId: existing.run, originAttemptId: existing.id, dispatchRef };
          if (['failed', 'not_sent'].includes(existing.state)) return { failed: true, code: existing.code,
            originRunId: existing.run, originAttemptId: existing.id, dispatchRef };
          invalid('SAVED_STATE');
        }
        const reserved = store.reserve(id, request, estimateMicros, tokenReserve);
        if (reserved.cached || reserved.failed) invalid('UNOBSERVED_ATTEMPT');
        return { ...reserved, originRunId: currentRunId, originAttemptId: id, dispatchRef };
      } finally { control.release(lock); }
    },
    close() { db.close(); control.close(); },
  });
}
