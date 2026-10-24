// Temporary Kimi Code validation through the original B revision service.
// Original draft/fees remain read-only; only an isolated candidate is exported.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createKimiCodeShadowDeliberationV1 } from '../packages/roster-planning-workspace/kimi-code-shadow-deliberation-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createInterruptedRosterRevisionV1 } from '../packages/roster-strategist/roster-interrupted-revision-v1.mjs';

const [base, trial = 'v221'] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
if (!['v221', 'v221r2', 'v221r3', 'v223', 'v224'].includes(trial)) throw Error('UNKNOWN_TRIAL');
const dest = base + '/common-' + trial + '-B-kimi-shadow-progress.private.json';
const shadowDirectory = base + '/B/kimi-code-revision-shadow-' + trial;
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { startedAt: new Date().toISOString(), pid: process.pid, status: 'reading_original',
  shadowOnly: true, originalWrites: 0, nativeCalls: 0, noGames: true,
  accountingLane: 'K3_temporary_shadow_separate_from_B', events: [] };
let saveQueue = Promise.resolve();
const save = () => { report.updatedAt = new Date().toISOString(); const text = JSON.stringify(report, null, 2);
  const next = saveQueue.then(async () => {
    await fs.writeFile(dest + '.tmp', text, { mode: 0o600 }); await fs.rename(dest + '.tmp', dest);
  }); saveQueue = next.catch(() => {}); return next; };
let adapter, filename, originalHash, lastSaved;
try {
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const row = cfg.rows.find(r => r.arm === 'B'); filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  const original = await fs.readFile(filename, 'utf8'); originalHash = hash(original);
  const source = JSON.parse(original), plan = JSON.parse(source.planSerialized); lastSaved = source;
  assert.equal(plan.planVersion, 19);
  const body = JSON.parse(gunzipSync(await fs.readFile(base + '/common-v218-B-captured-request.private.json.gz')));
  const expected = JSON.parse(await fs.readFile(base + '/common-v218-B-request-diagnostic.private.json', 'utf8'));
  assert.equal(hash(body), expected.originalRequestBodyHash);
  const indexedTrial = ['v223', 'v224'].includes(trial);
  let continuation;
  if (trial === 'v224') {
    const sourceRequest = JSON.parse(await fs.readFile(base + '/B/kimi-code-revision-shadow-v223/turn-01.request.private.json', 'utf8'));
    const prefix = JSON.parse(await fs.readFile(base + '/B/kimi-code-revision-shadow-v223/turn-01.complete-prefix.private.json', 'utf8'));
    const publicText = await fs.readFile(base + '/B/kimi-code-revision-shadow-v223/turn-01.public-interrupted.private.txt', 'utf8');
    assert.equal(hash(publicText), prefix.publicTextHash);
    continuation = createInterruptedRosterRevisionV1({ sourceRequest, prefix, sourcePlanHash: plan.planHash });
    report.continuation = continuation.metadata;
  }
  if (indexedTrial) {
    const gate = JSON.parse(await fs.readFile(base + '/common-v222-revision-retained-green.private.json', 'utf8'));
    assert.equal(gate.ok, true);
    report.previousTrial = { version: 'v221r3', status: 'timeout_cancelled', chargeStatus: 'unknown_retained',
      originalInputBytes: gate.oldInputBytes, verifiedIndexedInputBytes: gate.newInputBytes };
  }
  const baselineUsage = structuredClone(source.usage), oldDispatches = hash(source.providerDispatches);
  const baselineDispatchCount = source.providerDispatches.length;
  Object.assign(report, { sourcePlanHash: plan.planHash, sourcePlanVersion: plan.planVersion,
    sourceDraftHash: originalHash, baselineUsage: { calls: baselineUsage.calls,
      inputUnits: baselineUsage.inputUnits, outputUnits: baselineUsage.outputUnits,
      totalUnits: baselineUsage.totalUnits }, sourceContextHash: expected.contextHash }); await save();
  const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
  const noNative = () => { report.nativeCalls++; throw Error('SHADOW_REVISION_MUST_NOT_EXECUTE_NATIVE'); };
  const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: noNative, instantiate: noNative, apply: noNative } });
  // These revision paths use the real retained Plan/Skill-derived claims; the
  // generation-only pack placeholder is never enumerated or sent to the model.
  const strategyPack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } };
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
    strategyPack, selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules });
  adapter = await createKimiCodeShadowDeliberationV1({ directory: shadowDirectory,
    instructions: body.instructions, maxCalls: 4,
    onProgress: async event => { report.events.push(event); report.status = event.type; await save(); } });
  let requestCount = 0;
  const service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
    strategyPack, fixture: source.teachFramework.context.fixture,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore: { loadAll: async () => ({ sessions: [source], quarantined: [] }), save: async value => { lastSaved = value; } },
    createRunLaboratory: () => laboratory, createStrategist: () => strategist,
    deliberationFactory: { availability: adapter.factory.availability, createForRun: async config => {
      const port = await adapter.factory.createForRun(config);
      return { descriptor: port.descriptor, deliberate: async request => {
        if (++requestCount === 1) {
          if (indexedTrial) {
            const oldInput = JSON.parse(body.input);
            assert.notEqual(request.contextHash, expected.contextHash);
            assert.equal(request.promptNodes.find(n => n.nodeType === 'teach-framework-experience')
              .content.experience.evidenceDelivery.mode, 'retained_index_v1');
            for (const oldNode of oldInput.promptNodes.filter(n => n.nodeType !== 'teach-framework-experience')) {
              assert.deepEqual(request.promptNodes.find(n => n.nodeType === oldNode.nodeType).content, oldNode.content);
            }
            report.nonTeachInputUnchanged = true;
            report.indexedInputBytes = Buffer.byteLength(JSON.stringify({ promptPack: request.promptPack,
              promptNodes: request.promptNodes, userMessage: request.userMessage, responseContract: request.responseContract }));
          } else {
            assert.equal(request.contextHash, expected.contextHash);
            assert.equal(JSON.stringify({ promptPack: request.promptPack, promptNodes: request.promptNodes,
              userMessage: request.userMessage, responseContract: request.responseContract }), body.input);
          }
          assert.deepEqual(request.responseFormat.schema, body.text.format.schema);
          report.originalOutputSchemaUnchanged = true;
          report.originalInputAndSchemaUnchanged = !indexedTrial; await save();
        }
        if (!continuation) return port.deliberate(request);
        const physicalRequest = continuation.prepare(request);
        report.recoveryDispatch = { logicalContextHash: request.contextHash, physicalContextHash: physicalRequest.contextHash,
          pendingPaths: continuation.metadata.missingPaths, retainedCount: continuation.metadata.retainedPaths.length };
        await save();
        const response = await port.deliberate(physicalRequest);
        const combined = continuation.merge({ request, physicalRequest, response });
        await fs.writeFile(shadowDirectory + '/turn-' + String(requestCount).padStart(2, '0') + '.assembled.private.json',
          JSON.stringify(combined), { flag: 'wx', mode: 0o600 });
        report.assembled = { originalContextHash: request.contextHash, physicalContextHash: physicalRequest.contextHash,
          repairedCount: combined.output.repairs.length, pendingIndependentReview: true };
        await save(); return combined;
      } };
    } },
  });
  await service.loadPersisted();
  const request = JSON.parse(await fs.readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8'));
  await service.revisePlan(source.sessionId, request);
  while (lastSaved.status === 'running') { await new Promise(r => setTimeout(r, 1000)); }
  const updated = JSON.parse(lastSaved.planSerialized);
  Object.assign(report, { status: lastSaved.status, failure: lastSaved.failure,
    candidatePlanHash: updated.planHash, candidatePlanVersion: updated.planVersion,
    originalArmyUnchanged: hash(updated.rosterCandidate) === hash(plan.rosterCandidate),
    originalScheduleUnchanged: hash(updated.openingDeploymentSchedule) === hash(plan.openingDeploymentSchedule),
    oldDispatchesUnchangedInShadow: hash(lastSaved.providerDispatches.slice(0, baselineDispatchCount)) === oldDispatches,
    newUsage: { calls: lastSaved.usage.calls - baselineUsage.calls,
      units: lastSaved.usage.totalUnits - baselineUsage.totalUnits,
      scope: 'settled_usage_only_missing_usage_is_not_free' },
    shadowReceipt: adapter.metadata(),
    claimRepairCoverage: updated.planHash !== plan.planHash ? lastSaved.claimRepairHistory?.at(-1) || null : null,
    teachDelivery: updated.planHash !== plan.planHash ? lastSaved.revisionTeachEvidenceHistory?.at(-1) || null : null });
  if (lastSaved.status === 'planned' && updated.planVersion !== plan.planVersion) {
    assert.ok(report.originalArmyUnchanged); assert.ok(report.originalScheduleUnchanged);
    await fs.writeFile(shadowDirectory + '/candidate-plan.private.json', lastSaved.planSerialized, { flag: 'wx', mode: 0o600 });
    report.candidateSaved = true; report.pendingIndependentReview = true;
  }
} catch (error) { report.status = 'shadow_stopped'; report.failure = String(error.stack || error.message).slice(0, 1800); process.exitCode = 1; }
finally {
  if (adapter) { report.shadowReceipt = adapter.metadata(); await adapter.close(); }
  if (filename && originalHash) report.originalDraftUnchanged = hash(await fs.readFile(filename, 'utf8')) === originalHash;
  report.finishedAt = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ status: report.status, candidatePlanVersion: report.candidatePlanVersion,
  failure: report.failure, originalDraftUnchanged: report.originalDraftUnchanged, newUsage: report.newUsage }));
