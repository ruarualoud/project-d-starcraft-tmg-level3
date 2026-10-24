import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reviewRosterFinalPlanV3 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { rosterSelectionUnitRulesV1 } from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 }
  from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const plan = JSON.parse(raw.planSerialized), original = JSON.stringify(raw);
const priorReview = raw.planReviewHistory.findLast(r => r.status === 'completed');
const priorPlan = raw.planVersionHistory.map(s => JSON.parse(s)).find(p => p.planHash === priorReview.planHash);
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg('fixture') });
const pending = raw.providerDispatches.at(-1);
let seen = 0, report, isolated = null, sends = 0, retriedRequest;
const workerOnly = arg('only') === 'worker';
if (workerOnly) isolated = await createRosterPlanningSecureDeliberationFactoryV1({
  readCredential: async () => ({ credentialBytes: Buffer.from('fake-not-a-key') }),
  createWorker: () => ({ attachCredential: async ({ credentialBytes }) => {
    credentialBytes.fill(0); return { ok: true, workerRef: 'local-worker' }; },
    send: async () => { sends += 1; const error = new Error('LOCAL_SEND_REACHED');
      error.safeReceipt = { requestDefinitelyNotSent: true, physicalAttempts: 0 }; throw error; },
    close: async () => {} }),
});
const retryPort = isolated ? await isolated.factory.createForRun({ sessionId: raw.sessionId,
  runKind: 'final-plan-review', planHash: plan.planHash,
  retryDispatch: { ...pending, standingNetworkResumeConsent: true,
    retryAuthorizationId: 'local-captured-interrupted-owner-authorization' }, onEvent: async () => {} }) : null;
try {
  await assert.rejects(reviewRosterFinalPlanV3({ plan, sessionId: raw.sessionId,
    toolReceipts: raw.toolReceipts, selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource.selectionJustificationPolicyVersion,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    incrementalFrom: { plan: priorPlan, review: priorReview.review },
    allowFullReviewOnDependencyChange: true,
    adaptiveReview: true,
    deliberation: { deliberate: async request => {
      seen += 1;
      const retained = raw.publicOutputs.findLast(o => o.roundKind === request.roundKind
        && o.contextHash === request.contextHash && Number(o.roundIndex) === Number(request.roundIndex));
      if (retained) return { output: retained.sanitizedOutput };
      if (workerOnly) { retriedRequest = request; return retryPort.deliberate(request); }
      assert.equal(request.contextHash, pending.contextHash,
        'the unpaid resume must reach exactly the original pending shard context');
      assert.equal(Number(request.roundIndex), Number(pending.roundIndex));
      throw Error('EXPECTED_PENDING_SHARD_REACHED');
    } } }), workerOnly ? /ROSTER_WORKSPACE_PROVIDER_SEND_FAILED/ : /EXPECTED_PENDING_SHARD_REACHED/);
  if (workerOnly) {
    assert.equal(sends, 1, 'authorized interrupted sending reaches the Worker once');
    await assert.rejects(retryPort.deliberate(retriedRequest), /ROSTER_WORKSPACE_RETRY_AUTHORIZATION_CONSUMED/);
    assert.equal(sends, 1);
  }
  assert.equal(seen, 2, 'one retained shard, then only the interrupted shard');
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, retainedFirstShardReused: true, exactPendingContextUnchanged: true,
    localCalls: seen, workerOnly, fakeWorkerSends: sends, providerCalls: 0, originalWrites: 0 };
  console.log(workerOnly ? 'INTERRUPTED_WORKER_RESUME_OK' : 'RETAINED_REVIEW_CONTEXT_OK');
} catch (error) { report = { ok: false, failure: error.message, seen, providerCalls: 0 }; throw error; }
finally { await isolated?.close(); await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
