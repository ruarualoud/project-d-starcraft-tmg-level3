// One user-authorized minimal probe, not a Teach retry or a game launch.
// Uses the production secure factory/credential/transport; never logs credentials.
import fs from 'node:fs/promises';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 as profile } from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';

const [base, mode = 'original-v219'] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
if (!['original-v219', 'recovery-v233'].includes(mode)) throw Error('UNKNOWN_DIAGNOSTIC_MODE');
const version = mode === 'recovery-v233' ? 'v233' : 'v219';
const dest = base + '/common-' + version + '-minimal-provider-diagnostic.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { startedAt: new Date().toISOString(), pid: process.pid,
  status: 'preparing', diagnosticOnly: true, authorization: mode === 'recovery-v233'
    ? 'user_2026_10_15_check_deepseek_recovered_after_status_page_normal'
    : 'call_da2ae23f55bf44d2a1f0a201f84e724c',
  model: profile.model, baseUrl: profile.baseUrl, timeoutMs: profile.timeoutMs,
  maximumLogicalCalls: 1, noAutomaticRetry: true, noTeachOrRoomMutation: true,
  oldUnknownFeesPreserved: true, events: [] };
const save = async () => { report.updatedAt = new Date().toISOString();
  await fs.writeFile(dest + '.tmp', JSON.stringify(report, null, 2), { mode: 0o600 });
  await fs.rename(dest + '.tmp', dest); };
let secure;
try {
  await save();
  secure = await createRosterPlanningSecureDeliberationFactoryV1({ profile });
  const schema = { type: 'object', properties: {
    schemaVersion: { type: 'string', minLength: 1, maxLength: 80, enum: ['minimal_probe_v1'] },
    roundKind: { type: 'string', minLength: 1, maxLength: 80, enum: ['connectivity_probe'] },
    ok: { type: 'boolean' },
  }, required: ['schemaVersion', 'roundKind', 'ok'], additionalProperties: false };
  const request = { roundKind: 'connectivity_probe', roundIndex: 1,
    promptPack: 'provider_connectivity_diagnostic_v1', promptNodes: [],
    userMessage: 'Connectivity diagnostic only. No game task. Return exactly this JSON: {"schemaVersion":"minimal_probe_v1","roundKind":"connectivity_probe","ok":true}',
    responseContract: { diagnosticOnly: true }, maxOutputUnits: 512,
    responseFormat: { kind: 'provider_strict_json_schema', schemaName: 'minimal_probe_v1',
      schema, outputContractRef: { id: 'minimal-provider-probe', version: '1', hash: hash(schema) } },
  };
  request.contextHash = hash(request);
  report.promptInputBytes = Buffer.byteLength(JSON.stringify({ promptPack: request.promptPack,
    promptNodes: request.promptNodes, userMessage: request.userMessage, responseContract: request.responseContract }));
  report.outputLimit = request.maxOutputUnits;
  const port = await secure.factory.createForRun({ sessionId: 'slice272-minimal-probe-' + version,
    runKind: 'connectivity-probe', recoverNetworkDispatch: null,
    onEvent: async event => { report.events.push(event); report.status = event.type;
      if (event.type === 'provider_dispatch') report.dispatch = event.dispatch; await save(); },
  });
  // Deliberate exactly once. No loop and no recovery callback.
  const result = await port.deliberate(request);
  report.result = result;
  report.status = result.output?.ok === true && result.receipt?.providerSchemaValid === true
    ? 'minimal_request_succeeded' : 'minimal_request_returned_unexpected_output';
} catch (error) {
  report.status = 'minimal_request_failed'; report.failure = String(error.code || error.message).slice(0, 500);
  process.exitCode = 1;
} finally { await secure?.close(); }
report.finishedAt = new Date().toISOString(); await save();
console.log(JSON.stringify({ status: report.status, failure: report.failure,
  usage: report.result?.receipt?.usage, latencyMs: report.result?.receipt?.latencyMs }));
