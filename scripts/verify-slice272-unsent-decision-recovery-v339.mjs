import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { describeIterativeRosterCapabilitiesV1 } from '../packages/roster-strategist/iterative-roster-capabilities-v1.mjs';
const [directory] = process.argv.slice(2);
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-043.product-request.json.gz`)));
const original = JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-042.reply.json.gz`)));
const source = request.promptNodes[0].content.decisionState;
const requestKey = 'verified-unsent-request';
const state = { sessionId: source.sessionId, revision: source.revision, modelContextVersion: 19,
  mineralBudget: source.mineralBudget, frozenContext: source.frozenContext,
  currentCandidate: source.currentCandidate, plan: source.plan, observations: [], iterations: [],
  pendingDecision: { requestKey, nextRevision: source.revision + 1 } };
function fixture(proof) {
  const saved = new Map(); let calls = 0, inspections = 0;
  const port = createIterativeRosterFlashModelPortV1({ skillGuidance: {}, missionEvidence: {},
    queryCapabilities: s => describeIterativeRosterCapabilitiesV1(s, { sceneAvailable: true }),
    replyStore: { loadRetainedReply: async key => saved.get(key), retainReply: async (key, v) => saved.set(key, v) },
    deliberationFactory: {
      confirmUnsentRequest: async input => { inspections++; return typeof proof === 'function' ? proof(input) : proof; },
      createForRun: async ({ onEvent }) => ({ deliberate: async () => {
        calls++;
        return onEvent({ type: 'round_completed', receiptHash: original.receipt.receiptHash,
          sanitizedOutputRecord: { sanitizedOutput: original.output }, usage: {}, paidProviderCall: false });
      } }),
    },
  });
  return { port, counts: () => ({ calls, inspections }) };
}
const safe = fixture(input => ({ status: 'not_dispatched', ...input }));
const preserved = JSON.stringify(state);
const result = await safe.port.recover({ requestKey, state });
assert.equal(result.outcome, 'completed');
assert.equal(result.decision.kind, 'query');
assert.equal(safe.counts().calls, 1, 'Known unsent reservation invokes the normal decision path once');
assert.equal(JSON.stringify(state), preserved, 'No manual reservation or Plan rewrite');
await safe.port.recover({ requestKey, state });
assert.equal(safe.counts().calls, 1, 'Saved reply recovery cannot buy another request');
const ambiguous = fixture({ status: 'unknown' });
await assert.rejects(ambiguous.port.recover({ requestKey, state }), /RETAINED_REPLY_UNAVAILABLE/);
assert.equal(ambiguous.counts().calls, 0);
const wrongIdentity = fixture({ status: 'not_dispatched', requestKey: 'another', sessionId: state.sessionId,
  nextRevision: state.pendingDecision.nextRevision });
await assert.rejects(wrongIdentity.port.recover({ requestKey, state }), /RETAINED_REPLY_UNAVAILABLE/);
assert.equal(wrongIdentity.counts().calls, 0);
console.log(JSON.stringify({ pass: true, checks: 4, knownUnsentRecovered: true,
  ambiguousAndWrongIdentityStillBlocked: true, savedReplyNeverRepurchased: true,
  providerCalls: 0, nativeCalls: 0 }));
