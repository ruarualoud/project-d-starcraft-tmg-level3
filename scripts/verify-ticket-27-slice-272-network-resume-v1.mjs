import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reconcileStarcraftTmgProviderDispatchV1 }
  from '../packages/secure-provider-runtime/provider-dispatch-recovery-v1.mjs';
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const record = raw.providerDispatches.at(-1);
assert.equal(record.status, 'sending');
const original = JSON.stringify(raw);
const consent = { requestId: record.requestId, contextHash: record.contextHash,
  requestBodyHash: record.requestBodyHash, standingNetworkResumeConsent: true };
let report;
try {
  const recovery = reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord: record,
    retainedOutputs: raw.publicOutputs, processInterrupted: true, resumeAuthorization: consent });
  assert.equal(recovery.action, 'retry_authorized_unknown',
    'an interrupted sending wrapper must be recoverable under the owner standing consent');
  assert.equal(recovery.costStatus, 'unknown');
  assert.equal(recovery.maximumPhysicalRetries, 1);
  assert.equal(recovery.originalAttemptPreserved, true);
  assert.equal(reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord: record,
    processInterrupted: false, resumeAuthorization: consent }).action, 'needs_attention');
  assert.equal(reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord: record,
    processInterrupted: true, resumeAuthorization: { ...consent, requestId: 'foreign' } }).action, 'needs_attention');
  assert.equal(reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord: record,
    processInterrupted: true, resumeAuthorization: consent,
    retryAuthorizations: [{ requestId: record.requestId, status: 'consumed' }] }).action, 'needs_attention');
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, interruptedSendingRecovered: true, liveRequestNotDuplicated: true,
    consumedConsentNotReused: true, unknownFeesAndAttemptPreserved: true, realProviderCalls: 0 };
  console.log('NETWORK_RESUME_OK');
} catch (error) { report = { ok: false, failure: error.message, realProviderCalls: 0 }; throw error; }
finally { await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
