import { DatabaseSync } from 'node:sqlite';
import { createAccountedModel } from '../skill-production/model.mjs';
import { seal, verifySeal, hash, exact, sha256, fail } from '../skill-production/common.mjs';

const reviewStage = id => /^faction\.[a-z_]+\.faction\.[a-z_]+\.[a-z_]+\.[1-9][0-9]*\.review-target-batch-v1\.(supportive|adversarial)\.[0-3]\.[0-9]+$/.test(id);
const bare = output => output && typeof output === 'object' && !Array.isArray(output)
  && Object.keys(output).sort().join(',') === 'coverage,verdicts';
function taskWorkspace(observed) {
  const content = observed.messages[0]?.content;
  const task = typeof content === 'string' ? content : Array.isArray(content) ? content.map(b => b.text || '').join('') : '';
  const split = '\nLOCAL WORKSPACE\n', position = task.indexOf(split);
  if (!task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n') || position < 0) fail('FACTION_COMMAND_SOURCE_CONTEXT_MISSING');
  return JSON.parse(task.slice(position + split.length));
}

export function normalizeFactionReviewCommandEnvelopeV1({ output, stageId, observed }) {
  if (!reviewStage(stageId) || !bare(output)) fail('FACTION_COMMAND_ENVELOPE_SCOPE');
  const workspace = taskWorkspace(observed), targets = workspace.outputRequestAtEnd?.targetContract?.targets;
  if (!Array.isArray(targets) || !targets.length || !Array.isArray(output.verdicts)
    || output.verdicts.length !== targets.length || !Array.isArray(output.coverage)) fail('FACTION_COMMAND_ENVELOPE_TARGETS');
  const pending = new Map(targets.map(t => [t.targetId, t]));
  for (const v of output.verdicts) {
    exact(v, ['targetId', 'title', 'focus', 'verdict', 'reason', 'sourceRefs']);
    const target = pending.get(v.targetId);
    if (!target || v.title !== target.title || !['supported', 'unsupported', 'uncertain'].includes(v.verdict)) fail('FACTION_COMMAND_ENVELOPE_TARGETS');
    pending.delete(v.targetId);
  }
  for (const c of output.coverage) exact(c, ['sourceRef', 'verdict', 'recommendationIndices', 'reason']);
  const command = { action: 'finish', content: output };
  return seal({ version: 'faction_review_command_envelope_v1', stageId, rawOutputHash: hash(output), command,
    normalizedCommandHash: hash(command), normalizedCommandWireHash: sha256(JSON.stringify(command)),
    commandWireHashAlgorithm: 'sha256(JSON.stringify(command))', targetContractHash: workspace.outputRequestAtEnd.targetContract.hash,
    fieldHashes: Object.entries(output).map(([field, value]) => ({ field, before: hash(value), after: hash(command.content[field]) })),
    proseChanged: false, judgmentsChanged: false, semanticReviewPassed: false, trainingTruth: false });
}

// Reuse only the exact already-settled format pair for the observed failed
// review. This is not general retry permission and never copies paid attempts.
export function inspectFactionCommandRecoveryV1({ filename, parentRunId, parent }) {
  verifySeal(parent);
  if (parentRunId !== 'faction-v1-' + parent.hash.slice(0, 20)) fail('FACTION_COMMAND_RECOVERY_RECIPE');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash) fail('FACTION_COMMAND_RECOVERY_RECIPE');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) fail('FACTION_COMMAND_RECOVERY_NOT_SETTLED');
    const all = db.prepare('SELECT id,request_hash,state,usage,response,code FROM attempts WHERE run=?').all(parentRunId);
    const rows = all.filter(r => r.state === 'received' && r.id.endsWith('.call-1.format-1')
      && reviewStage(r.id.slice(0, -'.call-1.format-1'.length)) && bare(verifySeal(JSON.parse(r.response)).value.output));
    if (rows.length !== 1) fail('FACTION_COMMAND_RECOVERY_DENOMINATOR');
    const last = rows[0], first = all.find(r => r.id === last.id.replace('.format-1', '.format-0'));
    if (!first || first.state !== 'failed' || first.code !== 'PROVIDER_RESPONSE_JSON_INVALID' || !first.usage)
      fail('FACTION_COMMAND_RECOVERY_PAIR');
    const attempts = [first, last].map(row => {
      const response = verifySeal(JSON.parse(row.response)).value, usage = verifySeal(JSON.parse(row.usage)).value;
      const receipt = row.state === 'received' ? response.usageReceipt : response;
      const { receiptHash, ...body } = receipt;
      if (hash(body) !== receiptHash || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0)
        fail('FACTION_COMMAND_RECOVERY_RECEIPT');
      if (row.state === 'received' && (receipt.providerProfileRef.hash !== parent.modelHash || receipt.status !== 200
        || receipt.responseFingerprint !== sha256(JSON.stringify(response.output)))) fail('FACTION_COMMAND_RECOVERY_RECEIPT');
      if (row.state === 'failed' && (receipt.responseOutcome.profileHash !== parent.modelHash
        || !receipt.responseOutcome.usageKnown)) fail('FACTION_COMMAND_RECOVERY_RECEIPT');
      return { id: row.id, requestHash: row.request_hash, state: row.state, code: row.code, usage, response,
        responseHash: hash(response), receiptHash };
    });
    const manifest = seal({ version: 'faction_command_recovery_manifest_v1', parentRunId, parentRecipeHash: parent.hash,
      sourceBinding: parent.sourceBinding, modelHash: parent.modelHash, contextHash: parent.contextHash,
      attempts: attempts.map(({ response, usage, ...r }) => r), noAttemptCopy: true, newProviderCalls: 0, trainingTruth: false });
    return { manifest, attempts };
  } finally { db.close(); }
}

export function createFactionAccountedModelV1({ store, recovery = null, ...options }) {
  if (recovery) verifySeal(recovery.manifest);
  return async request => {
    let received = null;
    const capture = (id, requestHash, response, originRunId = null) => {
      received = { id, requestHash, response, originRunId };
      if (reviewStage(request.stageId) && bare(response.output)) {
        if (response.usageReceipt?.reportedModel !== 'deepseek-v4-flash') fail('PROVIDER_MODEL_DRIFT');
        fail('FACTION_BARE_REVIEW_CAPTURED');
      }
    };
    const proxy = { ...store,
      reserve(id, providerRequest, ...limits) {
        const requestHash = hash(providerRequest), old = recovery?.attempts.find(a => a.id === id);
        if (old) {
          const permit = recovery.manifest.attempts.find(a => a.id === id);
          if (!permit || old.requestHash !== requestHash || permit.requestHash !== requestHash
            || old.state !== permit.state || old.code !== permit.code || old.receiptHash !== permit.receiptHash
            || hash(old.response) !== permit.responseHash) fail('FACTION_COMMAND_RECOVERY_REQUEST_DRIFT');
          if (old.state === 'failed') return { failed: true, code: old.code, usageKnown: true };
          capture(id, requestHash, old.response, recovery.manifest.parentRunId);
          return { cached: true, response: old.response };
        }
        const lease = store.reserve(id, providerRequest, ...limits);
        if (lease.cached) capture(id, requestHash, lease.response);
        else received = { id, requestHash };
        return lease;
      },
      settle(id, fields) {
        store.settle(id, fields);
        if (fields.response) {
          const requestHash = received?.requestHash;
          // Settlement precedes all structural repair; preserve the original
          // response fingerprint and invoice evidence, including negatives.
          if (reviewStage(request.stageId) && bare(fields.response.output)) options.onUsage?.(store.summary());
          capture(id, requestHash, fields.response);
        }
      } };
    try { return await createAccountedModel({ ...options, store: proxy })(request); }
    catch (error) {
      if (error.code !== 'FACTION_BARE_REVIEW_CAPTURED') throw error;
      const normalized = normalizeFactionReviewCommandEnvelopeV1({ output: received.response.output, stageId: request.stageId, observed: request.observed });
      const receipt = seal({ version: 'faction_command_envelope_receipt_v1', stageId: request.stageId, call: request.call,
        attemptId: received.id, requestHash: received.requestHash, rawReceiptHash: received.response.usageReceipt.receiptHash,
        rawResponseHash: hash(received.response), originRunId: received.originRunId,
        recoveryManifestHash: received.originRunId ? recovery.manifest.hash : null, normalized, trainingTruth: false });
      const lease = store.acquire(request.stageId + '.command-envelope.call-' + request.call, { receiptHash: receipt.hash });
      if (!lease.cached) store.finish(lease, receipt);
      return { command: normalized.command, usage: received.response.usageReceipt.usage, receiptHash: received.response.usageReceipt.receiptHash };
    }
  };
}
