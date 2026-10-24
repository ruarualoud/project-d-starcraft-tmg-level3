// Actual workspace review/revision consumers must retain a still-cited historic
// Teach receipt. Model seam captures requests only; no Provider/Native/room call.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red', 'red2', 'green', 'green2'].includes(phase));
const dest = base + '/common-v226-historical-facts-' + phase + '.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { ok: false, phase, modelCalls: 0, nativeCalls: 0, originalWrites: 0 };
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B'), filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
const original = await fs.readFile(filename, 'utf8'), source = JSON.parse(original), oldPlan = JSON.parse(source.planSerialized);
const candidateText = await fs.readFile(base + '/B/kimi-code-revision-shadow-v224/candidate-plan.private.json', 'utf8');
const nativeState = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(nativeState.officialUnitCompositionUpgradeDataBundle) });
const noNative = () => { report.nativeCalls++; throw Error('NO_NATIVE_IN_FACT_WIRING_CHECK'); };
const laboratory = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: noNative, instantiate: noNative, apply: noNative } });
const strategyPack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } };
const receiptHash = '37240b195db67681df81519506e4c0b9dc2b688556ff09a98b501166ed19ed92';
async function capture(kind) {
  const draft = structuredClone(source); draft.status = 'planned';
  if (kind === 'review') { draft.planVersionHistory.push(draft.planSerialized); draft.planSerialized = candidateText; }
  let saved = draft, request;
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory, strategyPack,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules });
  const service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
    strategyPack, fixture: source.teachFramework.context.fixture,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore: { loadAll: async () => ({ sessions: [draft], quarantined: [] }), save: async value => { saved = value; } },
    createRunLaboratory: () => laboratory, createStrategist: () => strategist,
    deliberationFactory: { availability: () => ({ available: true }), createForRun: async () => ({
      descriptor: () => ({ kind: 'read_only_request_capture' }),
      deliberate: async value => { request = value; throw Error('REQUEST_CAPTURED_NO_MODEL'); },
    }) },
  });
  await service.loadPersisted();
  if (kind === 'review') await service.reviewFinalPlan(source.sessionId, { scope: 'changed_claims', baselinePlanHash: oldPlan.planHash });
  else await service.revisePlan(source.sessionId, JSON.parse(await fs.readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8')));
  for (let i = 0; i < 300 && (kind === 'review' ? saved.planReview.status === 'running' : saved.status === 'running'); i++) {
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(request, JSON.stringify(kind === 'review' ? saved.planReview.failure : saved.failure));
  return request;
}
try {
  const review = await capture('review');
  const facts = review.promptNodes.find(n => n.kind === 'verified-structured-facts').sourceFacts;
  assert.ok(facts.citedTeachQueryEvidence?.some(e => e.receiptHash === receiptHash), 'historical receipt must reach actual review consumer');
  const boundary = review.promptNodes.find(n => n.kind === 'review-boundary');
  report.reviewRootShards = boundary.shardCount;
  const fullCount = review.promptNodes.find(n => n.kind === 'frozen-plan-cross-claim-index').sources.length;
  const firstBatch = review.promptNodes.find(n => n.kind === 'frozen-plan-claims').sources.length;
  assert.ok(boundary.shardCount < Math.ceil(fullCount / firstBatch), 'do not silently re-review all claims');
  const revision = await capture('revision');
  const priorFacts = revision.promptNodes.find(n => n.nodeType === 'verified-plan-facts').content.sourceFacts;
  const { planHash, ...dependencies } = priorFacts;
  assert.equal(hash(dependencies), source.planReview.review.verifiedFactsHash, 'restored source facts exactly equal the paid prior review');
  const experience = revision.promptNodes.find(n => n.nodeType === 'teach-framework-experience').content.experience;
  assert.ok(experience.evidence.some(e => e.receiptHash === receiptHash), 'the same historic original must be available to revision reads');
  report.restoredReceiptHash = receiptHash; report.restoredPriorFactsHash = hash(dependencies);
  report.revisionIndexedReceipts = experience.evidence.length;
  report.ok = true;
} catch (error) { report.failure = String(error.message).slice(0, 1000); process.exitCode = 1; }
report.originalDraftUnchanged = hash(await fs.readFile(filename, 'utf8')) === hash(original);
await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
