// Operator-stepped observation of the real product entry. No synthetic answer,
// no rewritten production draft, no match launch and no automatic second call.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from '../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs';
import { ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2 as profile } from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const base = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !process.argv.includes('--one-live-call-approved')) {
  throw Error('EXPLICIT_ONE_CALL_APPROVAL_REQUIRED');
}
const output = await fs.mkdtemp(path.join(base, 'walkthrough-v319-'));
await fs.mkdir(path.join(output, 'controls'), { mode: 0o700 });
const status = { version: 319, pid: process.pid, output, startedAt: new Date().toISOString(),
  status: 'initializing', providerSendCount: 0, realModelReplyCount: 0,
  gamesStarted: 0, productionDraftWrites: 0, trainingTruth: false, events: [],
  interpretation: '实际产品单步调试；停点不是产品错误；未执行步骤不算通过。' };
const sensitiveKey = /^(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|credentialBytes|secret)$/i;
function sanitize(value) {
  if (typeof value === 'string') return value.replace(/\b(?:jsk|sk)-[A-Za-z0-9_-]{16,}\b/g, '<REDACTED>');
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, sensitiveKey.test(key) ? '<REDACTED>' : sanitize(child)]));
  return value;
}
async function write(name, value) {
  const dest = path.join(output, name);
  const temp = `${dest}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(sanitize(value), null, 2), { mode: 0o600 });
  await fs.rename(temp, dest);
}
const persist = () => write('status.json', status);
let secure, product, sessionId;
let snapshotBefore;
async function hold(name) {
  status.status = 'debug_breakpoint'; status.breakpoint = name;
  status.nextControlFile = `controls/${name}.json`;
  await persist();
  console.log(JSON.stringify({ status: status.status, breakpoint: name, output, pid: process.pid }));
  for (;;) {
    const control = await fs.readFile(path.join(output, status.nextControlFile), 'utf8')
      .then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (control?.continue === true && control.breakpoint === name) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  status.status = 'continuing'; delete status.breakpoint;
  await persist();
}
try {
  await persist();
  console.log(JSON.stringify({ status: status.status, output, pid: process.pid }));
  const cfg = JSON.parse(await fs.readFile(path.join(base, 'common-v79-plan-recovery-config.private.json'), 'utf8'));
  const old = cfg.rows.find(row => row.arm === 'B');
  if (!old) throw Error('FROZEN_B_SETUP_NOT_FOUND');
  const sourceFile = path.join(old.dataDirectory, 'drafts', `${old.sessionId}.json`);
  const sourceStat = await fs.stat(sourceFile);
  const setupSource = JSON.parse(await fs.readFile(sourceFile, 'utf8')).setup;
  const mapConfiguration = JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8'));
  secure = await createRosterPlanningSecureDeliberationFactoryV1({ profile,
    createWorker(options) {
      const worker = createStarcraftTmgStructuredProviderWorkerPortV1(options);
      return { ...worker, async send(request) {
        if (status.providerSendCount >= 1) {
          await hold('additional_provider_call_requires_new_approval');
          throw Error('ONE_CALL_DEBUG_ALLOWANCE_EXHAUSTED');
        }
        const body = sanitize(request.body);
        await write('prompt-001.json', body);
        status.prompt = { path: 'prompt-001.json', model: body.model,
          originalBodyHash: hash(request.body), displayedBodyHash: hash(body),
          redactionChangedBody: hash(body) !== hash(request.body),
          inputCharacters: JSON.stringify(body.input).length,
          totalBodyBytes: Buffer.byteLength(JSON.stringify(request.body)) };
        status.providerSendCount++; status.status = 'waiting_for_model';
        status.requestStartedAt = new Date().toISOString(); await persist();
        const result = await worker.send(request);
        status.transport = { status: result.status, receipt: result.transportReceipt || null };
        return result;
      } };
    } });
  const factory = { availability: secure.factory.availability,
    async createForRun(config) {
      const port = await secure.factory.createForRun({ ...config, recoverNetworkDispatch: null,
        onEvent: async event => {
          await config.onEvent?.(event);
          const { sanitizedOutputRecord, failedOutputRecord, ...metadata } = event;
          status.events.push(sanitize(metadata));
          if (event.usage) status.usage = event.usage;
          if (event.latencyMs !== undefined) status.providerLatencyMs = event.latencyMs;
          if (sanitizedOutputRecord) await write('retained-public-output-001.json', sanitizedOutputRecord);
          if (failedOutputRecord) status.failedOutputRetainedByProduct = true;
          await persist();
        } });
      return { descriptor: port.descriptor, async deliberate(request) {
        await write('product-request-001.json', request);
        const result = await port.deliberate(request);
        status.realModelReplyCount++;
        await write('model-reply-001.json', result);
        const persisted = await product.iterativeDraft.read(sessionId);
        const retained = await product.iterativeDraft.loadRetainedReply(persisted.pendingDecision?.requestKey);
        status.paidReplyRetainedBeforeBreakpoint = Boolean(retained?.output);
        status.pendingDecision = persisted.pendingDecision;
        status.modelOutputKind = result.output?.kind;
        status.rosterAndPlanNotYetApplied = persisted.revision === snapshotBefore.revision
          && hash(persisted.currentCandidate) === hash(snapshotBefore.currentCandidate)
          && hash(persisted.plan) === hash(snapshotBefore.plan);
        await write('state-at-model-output.json', persisted);
        await hold('after_model_reply_before_execution');
        return result;
      } };
    } };
  product = await createRosterPlanningProductModuleV1({ root: path.resolve('.'),
    fixtureRoot: cfg.fixtureRoot, dataDirectory: path.join(output, 'workspace'),
    mapConfiguration, enableIterativeDraft: true, deliberationFactory: factory });
  const setup = { factionRecordKey: setupSource.factionRecordKey,
    opponentFactionRecordKey: setupSource.opponentFactionRecordKey,
    engagementScale: 'Standard', mineralBudget: 2000,
    teachFeedbackPolicy: 'skill_teach_roster_coevolution_v1' };
  await write('setup.json', { setup, productDescriptor: product.descriptor(),
    mapSummary: product.mapEvidencePort.summarizeMap({ queryId: 'debug-first-step-map' }),
    mission: product.officialMissionScoringProfile(), sourceFile,
    sourceStat: { size: sourceStat.size, mtimeMs: sourceStat.mtimeMs } });
  const created = await product.handle({ method: 'POST', pathname: prefix + '/iterative/sessions', body: { setup } });
  await write('session-created.json', created);
  if (created.status !== 201) throw Error(`PRODUCT_CREATE_STATUS_${created.status}`);
  sessionId = created.response.journey.sessionId; status.sessionId = sessionId;
  snapshotBefore = await product.iterativeDraft.read(sessionId);
  await write('state-before.json', snapshotBefore);
  status.status = 'running_first_product_decision'; await persist();
  const after = await product.iterativeDraft.resume(sessionId);
  await write('state-after-first-decision.json', after);
  await product.iterativeDraft.pause(sessionId);
  status.status = 'first_decision_committed_and_paused';
  status.finalRevision = after.revision;
  status.actualArmy = after.currentCandidate;
  status.actualPlan = after.plan;
  const now = await fs.stat(sourceFile);
  status.originalSourceUnchanged = now.size === sourceStat.size && now.mtimeMs === sourceStat.mtimeMs;
} catch (error) {
  status.status = 'stopped_on_error';
  status.error = { code: String(error.code || error.message), stack: String(error.stack || '').slice(0,2500) };
  process.exitCode = 1;
} finally {
  await secure?.close();
  status.finishedAt = new Date().toISOString(); await persist();
  console.log(JSON.stringify({ status: status.status, output, error: status.error?.code }));
  setImmediate(() => process.exit(process.exitCode || 0));
}
