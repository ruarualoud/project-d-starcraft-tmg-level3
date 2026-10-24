// Concrete bug: original C108 mandatory settlement cannot certify a composite
// wall/base barrier. No model call, original Store write or new room.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1 as evaluate } from
  "../packages/rule-atoms/official-charge-occupied-cross-section-proof-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { enumerateOfficialSelectedRosterMeleeActionsV1, instantiateOfficialSelectedRosterMeleeActionV1 } from
  "../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV4 } from
  "../packages/product-composition/official-current-product-match-runtime-v4.mjs";
import { createOfficialCurrentProductMatchRuntimeV5 } from
  "../packages/product-composition/official-current-product-match-runtime-v5.mjs";
import { createOfficialCurrentProductMatchRuntimeV6 } from
  "../packages/product-composition/official-current-product-match-runtime-v6.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(gunzipSync(await readFile(capturePath)).toString("utf8"));
const state = capture.state;
const report = { schemaVersion: "ticket23_C108_composite_cut_repro_v1",
  stateRevision: capture.stateRevision, stateHash: capture.stateHash,
  providerCalls: 0, originalRoomWrites: 0, performancePromotionAdmitted: false };
const start = performance.now();
try {
  assert.equal(capture.stateRevision, 108);
  assert.equal(hash(state), capture.stateHash);
  assert.equal(state.pendingAction.maxDistanceMilliInches, 13000);
  const proof = evaluate(state);
  report.proof = proof;
  assert.equal(proof.allLegalChargePathsExcluded, true,
    "ACTUAL_C108_COMPOSITE_BARRIER_MISSING_FROM_RULES_SETTLEMENT");
  assert.equal(proof.algorithmVersion, "flat_composite_cross_section_v1");
  assert(proof.targetCertificates.every(row => row.lowerBoundMilliInches > 13002));
  // Removing the actual wall/base barrier must never produce the same proof.
  const open = structuredClone(state);
  open.board.terrain = [];
  for (const piece of open.pieces) if (piece.id !== state.pendingAction.pieceId
    && piece.id !== state.pendingAction.chargePlan.targets[0].unitId) piece.isOnField = false;
  assert.equal(evaluate(open).allLegalChargePathsExcluded, false);
  const long = structuredClone(state);
  long.pendingAction.maxDistanceMilliInches = 50000;
  assert.equal(evaluate(long).allLegalChargePathsExcluded, false);
  const portal = structuredClone(state);
  portal.board.accessPoints = [{ id: "test-access" }];
  assert.equal(evaluate(portal).allLegalChargePathsExcluded, false);
  // The real v4/v5/v6 settlement wrappers, with a minimal selected-roster parent
  // adapter: unit integration, not a claim of full Host/Room admission.
  const body = { runtimeId: "starcraft-tmg-official-current-product-match-runtime-v3",
    runtimeVersion: "1.0.0", catalogueHash: hash({ fixture: "C108" }),
    executableRuleAtomIds: [], executorManifest: [] };
  const parent = { descriptor: { ...body, runtimeHash: hash(body) },
    enumerate: enumerateOfficialSelectedRosterMeleeActionsV1,
    instantiate: instantiateOfficialSelectedRosterMeleeActionV1,
    apply() { throw new Error("UNEXPECTED_PARENT_APPLY"); } };
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV5({ legacyRuntime:
      createOfficialCurrentProductMatchRuntimeV4({ legacyRuntime: parent }) }) });
  const domain = runtime.enumerate(state, { sideKey: "player1" }).parameterDomains
    .find(row => row.actionType === "resolve_charge");
  assert.equal(domain.parameterSchema.outcome.join(","), "failure");
  const parameters = { outcome: "failure", failureProof: { kind:
    "occupied_cross_section_distance_shortfall" } };
  const instance = runtime.instantiate(state, domain, parameters);
  const transition = runtime.apply(state, instance.action, { postRevision: 109 });
  assert.equal(transition.state.pendingAction, undefined);
  for (const piece of state.pieces) {
    const after = transition.state.pieces.find(row => row.id === piece.id);
    assert.deepEqual(after.models, piece.models);
    assert.equal(after.currentSupply, piece.currentSupply);
    if (piece.id !== state.pendingAction.pieceId) assert.deepEqual(after, piece);
    else assert.equal(after.activatedPhases.assault, true);
  }
  assert.equal(instance.action.chargeResolutionPlan.chargeRoll, state.pendingAction.chargeRoll);
  assert.equal(hash(state), capture.stateHash);
  report.domainId = domain.domainId;
  report.action = instance.action;
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.message;
  throw error;
} finally {
  report.elapsedMs = performance.now() - start;
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify({ ...report, action: undefined }));
}
