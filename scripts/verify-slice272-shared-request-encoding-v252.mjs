// Actual A Teach revision exceeded context capacity after only B was encoded.
// Exercise the shared secure egress, with a local physical-Worker stand-in.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const base = process.argv[2], report = { providerCalls: 0, originalDraftWrites: 0, localWorkerCalls: 0 };
let secure;
try {
  const request = JSON.parse(gunzipSync(await fs.readFile(base + '/A/fresh-generation-v249/request-006.private.json.gz')).toString());
  let captured; const events = [];
  secure = await createRosterPlanningSecureDeliberationFactoryV1({
    readCredential: async () => ({ credentialBytes: Buffer.from('local-test-not-a-credential') }),
    createWorker: () => ({ attachCredential: async () => ({ ok: true, workerRef: 'local-fixture' }), close: async () => {},
      send: async ({ body }) => { captured = body; report.localWorkerCalls++;
        throw Object.assign(Error('LOCAL_CAPTURE_COMPLETE'), { safeReceipt: { requestDefinitelyNotSent: true, code: 'LOCAL_CAPTURE_COMPLETE' } }); } }),
  });
  const port = await secure.factory.createForRun({ sessionId: 'shared-request-encoding', runKind: 'resume', onEvent: async e => events.push(e) });
  await assert.rejects(port.deliberate(request), { code: 'ROSTER_WORKSPACE_PROVIDER_SEND_FAILED' });
  const original = { promptPack: request.promptPack, promptNodes: request.promptNodes,
    userMessage: request.userMessage, responseContract: request.responseContract };
  const wire = JSON.parse(captured.input);
  report.beforeCharacters = JSON.stringify(original).length; report.afterCharacters = captured.input.length;
  assert.ok(report.afterCharacters < report.beforeCharacters * .75, 'shared A Teach egress still sends duplicate full evidence');
  const at = p => p.slice(1).split('/').reduce((v, k) => v[k.replaceAll('~1', '/').replaceAll('~0', '~')], wire);
  const expand = v => {
    if (!v || typeof v !== 'object') return v;
    if (v.kind === 'same_request_evidence_reference_v1') return expand(at(v.targetJsonPointer));
    return Array.isArray(v) ? v.map(expand) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expand(x)]));
  };
  const { inputEncoding, ...expanded } = expand(wire);
  assert.equal(hash(expanded), hash(original));
  assert.equal(inputEncoding.version, 'same_request_evidence_v1');
  assert.ok(events.filter(e => e.type === 'provider_dispatch').every(e => e.dispatch.contextHash === request.contextHash));
  assert.equal(request.contextHash, events.find(e => e.type === 'provider_dispatch').dispatch.contextHash);
  report.allUniqueValuesAndStrategyPreserved = true; report.semanticContextUnchanged = true;
  report.status = 'pass';
} catch (e) { report.status = 'fail'; report.failure = { code: e.code, message: e.message }; process.exitCode = 1; }
finally { await secure?.close(); }
await fs.writeFile(`${base}/shared-request-encoding-v252-${report.status}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
