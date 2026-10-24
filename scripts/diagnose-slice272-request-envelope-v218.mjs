// Offline inspection, not another test/retry: real revision builder and secure
// serializer, in-memory workspace, fake credential and a non-network Worker.
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 as profile } from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';

const [base] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
const dest = base + '/common-v218-B-request-diagnostic.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { startedAt: new Date().toISOString(), status: 'reading_saved_workspace',
  providerCalls: 0, nativeCalls: 0, sourceWrites: 0, diagnosisNotAcceptanceGate: true };
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B');
const filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
const original = await fs.readFile(filename), originalHash = hash(original.toString());
const source = JSON.parse(original), plan = JSON.parse(source.planSerialized), failed = source.providerDispatches.at(-1);
let capturedRequest, capturedBody, secure;
try {
  const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
  const noNative = () => { throw Error('DIAGNOSTIC_MUST_NOT_EXECUTE_NATIVE'); };
  const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: noNative, instantiate: noNative, apply: noNative } });
  const strategyPack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } };
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
    strategyPack, selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules });
  secure = await createRosterPlanningSecureDeliberationFactoryV1({ profile,
    readCredential: async () => ({ credentialBytes: Buffer.from('offline-noncredential') }),
    createWorker: () => ({ attachCredential: async () => ({ ok: true, workerRef: 'offline' }), close: async () => {},
      send: async input => { capturedBody = input.body; throw Object.assign(Error('OFFLINE_CAPTURE_NO_SEND'), {
        safeReceipt: { code: 'OFFLINE_CAPTURE_NO_SEND', requestDefinitelyNotSent: true, requestMayHaveBeenSent: false } }); } }),
  });
  const service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
    strategyPack, fixture: source.teachFramework.context.fixture,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore: { loadAll: async () => ({ sessions: [source], quarantined: [] }), save: async () => {} },
    createRunLaboratory: () => laboratory, createStrategist: () => strategist,
    deliberationFactory: { createForRun: async config => {
      const port = await secure.factory.createForRun({ ...config, recoverNetworkDispatch: null });
      return { descriptor: port.descriptor, deliberate: async request => { capturedRequest = request; return port.deliberate(request); } };
    } },
  });
  await service.loadPersisted();
  const request = JSON.parse(await fs.readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8'));
  await service.revisePlan(source.sessionId, request);
  while (!capturedBody && source.status === 'running') await new Promise(r => setTimeout(r, 100));
  if (!capturedBody) throw Error('CAPTURE_FAILED:' + JSON.stringify(source.failure));
  const bodyHash = hash(capturedBody), input = JSON.parse(capturedBody.input);
  const sameContext = capturedRequest.contextHash === failed.contextHash, sameBody = bodyHash === failed.requestBodyHash;
  const strings = new Map();
  const walk = (value, path = '') => {
    if (typeof value === 'string' && Buffer.byteLength(value) >= 512) {
      const h = hash(value), old = strings.get(h) || { hash: h, bytes: Buffer.byteLength(value), occurrences: 0, paths: [] };
      old.occurrences++; if (old.paths.length < 8) old.paths.push(path); strings.set(h, old);
    } else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, path + '/' + k);
  }; walk(input);
  let schemaNodes = 0, maxDepth = 0, enumItems = 0, enumBytes = 0, refs = 0;
  const schemaWalk = (v, depth = 0) => { if (!v || typeof v !== 'object') return; schemaNodes++; maxDepth = Math.max(maxDepth, depth);
    if (Array.isArray(v.enum)) { enumItems += v.enum.length; enumBytes += bytes(v.enum); } if (v.$ref) refs++;
    Object.values(v).forEach(child => schemaWalk(child, depth + 1)); };
  schemaWalk(capturedBody.text.format.schema);
  Object.assign(report, { status: sameBody && sameContext ? 'exact_failed_request_reconstructed' : 'similar_request_not_exact',
    requestId: failed.requestId, requestBodyHash: bodyHash, originalRequestBodyHash: failed.requestBodyHash,
    contextHash: capturedRequest.contextHash, originalContextHash: failed.contextHash,
    sameBody, sameContext, providerModel: capturedBody.model,
    requestBytes: bytes(capturedBody), inputBytes: Buffer.byteLength(capturedBody.input),
    instructionsBytes: Buffer.byteLength(capturedBody.instructions), maxOutputTokens: capturedBody.max_output_tokens,
    schema: { bytes: bytes(capturedBody.text.format.schema), schemaNodes, maxDepth, enumItems, enumBytes, refs },
    nodeBytes: input.promptNodes.map(n => ({ kind: n.nodeType || n.kind, bytes: bytes(n),
      children: Object.entries(n.content || {}).map(([k, v]) => ({ key: k, bytes: bytes(v) })).sort((a,b) => b.bytes-a.bytes) })).sort((a,b) => b.bytes-a.bytes),
    repeatedLargeStrings: [...strings.values()].filter(s => s.occurrences > 1)
      .map(s => ({ ...s, duplicateBytes: s.bytes * (s.occurrences - 1) })).sort((a,b) => b.duplicateBytes-a.duplicateBytes).slice(0,20),
    originalDraftUnchanged: hash((await fs.readFile(filename)).toString()) === originalHash,
  });
  await fs.writeFile(base + '/common-v218-B-captured-request.private.json.gz', gzipSync(JSON.stringify(capturedBody)), { flag: 'wx', mode: 0o600 });
} catch (error) { report.status = 'diagnostic_stopped'; report.failure = error.message.slice(0,1200); process.exitCode = 1; }
finally { await secure?.close(); }
report.finishedAt = new Date().toISOString();
await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
