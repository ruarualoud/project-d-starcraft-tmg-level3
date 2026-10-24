// Concrete v226 wiring regression: reconciliation referenced an unbound `plan`.
// Use the completed v229 review itself; never construct review acceptance.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red', 'red2', 'red3', 'green'].includes(phase));
const dest = base + '/common-v230-qualification-plan-' + phase + '.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { ok: false, phase, modelCalls: 0, nativeCalls: 0, originalWrites: 0 };
let filename, original;
try {
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const row = cfg.rows.find(r => r.arm === 'B'); filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  original = await fs.readFile(filename, 'utf8'); const source = JSON.parse(original);
  source.planSerialized = await fs.readFile(base + '/B/kimi-code-revision-shadow-v224/candidate-plan.private.json', 'utf8');
  const plan = JSON.parse(source.planSerialized);
  const review = JSON.parse(await fs.readFile(base + '/B/kimi-code-candidate-review-v229/candidate-review.private.json', 'utf8'));
  const { reviewHash: parentReviewHash, ...body } = review;
  assert.equal(hash(body), parentReviewHash);
  assert.equal(review.planHash, plan.planHash);
  assert.ok(review.findings.some(f => f.severity === 'high'));
  source.planReview = { status: 'completed', planHash: plan.planHash,
    reviewContextVersion: review.reviewContextVersion, review };
  report.fixtureBoundary = 'actual_completed_v229_review_no_constructed_findings';
  source.status = 'planned'; source.failure = null;
  const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
  const noNative = () => { report.nativeCalls++; throw Error('NO_NATIVE_IN_QUALIFICATION_WIRING_REPRO'); };
  const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: noNative, instantiate: noNative, apply: noNative } });
  const strategyPack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } };
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory, strategyPack,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules });
  let captured, saved = source, thrown;
  const service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
    strategyPack, fixture: source.teachFramework.context.fixture,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore: { loadAll: async () => ({ sessions: [source], quarantined: [] }), save: async value => { saved = value; } },
    createRunLaboratory: () => laboratory, createStrategist: () => strategist,
    deliberationFactory: { availability: () => ({ available: true }), createForRun: async () => ({
      descriptor: () => ({ kind: 'read_only_request_capture' }),
      deliberate: async request => { captured = request; throw Error('REQUEST_CAPTURED_NO_MODEL'); },
    }) },
  });
  await service.loadPersisted();
  try { await service.reconcileReviewFindings(source.sessionId); } catch (e) { thrown = e; }
  assert.ok(captured, String(thrown?.stack || saved.reviewReconciliation?.failure));
  assert.equal(thrown.message, 'REQUEST_CAPTURED_NO_MODEL');
  assert.equal(captured.roundKind, 'final_review_reconciliation');
  assert.ok(JSON.stringify(captured).includes('37240b195db67681df81519506e4c0b9dc2b688556ff09a98b501166ed19ed92'),
    'same still-cited historical original must reach the qualification consumer');
  assert.equal(saved.planSerialized, source.planSerialized);
  report.ok = true; report.planHash = plan.planHash;
  report.contextHash = captured.contextHash; report.parentReviewHash = parentReviewHash;
  report.capturedBytes = Buffer.byteLength(JSON.stringify(captured));
} catch (e) { report.failure = String(e.stack || e).slice(0, 1800); process.exitCode = 1; }
if (filename && original) report.originalDraftUnchanged = hash(await fs.readFile(filename, 'utf8')) === hash(original);
await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
