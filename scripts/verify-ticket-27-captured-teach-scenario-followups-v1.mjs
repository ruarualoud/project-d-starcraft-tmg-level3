// Actual B Foundation -> Challenger -> evidence -> Student boundary. The
// captured probability request has an independent missing-attacker defect;
// this test proves branch transport without inventing an attacker/probability.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createOfficialStandardRoomInitialStateAuthorityV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as manifest } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from
  "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createPregameSceneLaboratoryV1 } from
  "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { createRosterStrategistRuntimeV1,
  createScriptedRosterDeliberationPortV1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import { createRosterTeachRolePortsV1 } from
  "../packages/roster-strategist/roster-teach-role-ports-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const [sessionPath, mapPath, reportPath] = process.argv.slice(2);
const original = JSON.parse(await fs.readFile(sessionPath, "utf8"));
const originalBytes = JSON.stringify(original);
const candidate = original.lockedRoster.lock.candidateInput;
const foundation = structuredClone(original.publicOutputs.find(x =>
  x.roundKind === "strategy_foundation").sanitizedOutput);
foundation.informationNeeds = foundation.informationNeeds.filter(x =>
  x.needId === "need-round2-scenario");
const challenger = structuredClone(original.publicOutputs.find(x =>
  x.roundKind === "teach_challenge").sanitizedOutput);
challenger.challenges = challenger.challenges.filter(x =>
  x.challengeId === "chal-hyp-creep-charge");
assert.equal(challenger.challenges.length, 1);
const rawRequest = challenger.challenges[0].evidenceRequest;
assert.equal(rawRequest.toolRequest.branchIdRef, "need-round2-scenario");
assert.equal(rawRequest.toolRequest.attackerUnitId, "");
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }),
});
const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
  dataset: source.dataset,
});
const builder = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: bundle,
});
const selectedRecipe = { factionRecordKey: candidate.factionRecordKey,
  tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
  units: candidate.units.map(u => ({ unitInstanceId: u.unitInstanceId,
    recordKey: u.recordKey, compositionKind: u.compositionKind,
    upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
const setup = original.setup;
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ["player1", "player2"].map(seatKey => ({
    label: seatKey, seatKey, roleMode: "supervisor", principalType: "human" })),
  roomId: "ticket27-s271-roster-workspace-lab",
  recipes: { ...structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1),
    [candidate.sideKey]: selectedRecipe },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: setup.missionBinding.missionRecordKey,
  deploymentRecordKey: setup.missionBinding.deploymentRecordKey,
  mapConfiguration: JSON.parse(await fs.readFile(mapPath, "utf8")),
});
const core = createPregameSceneLaboratoryV1({
  laboratoryId: "ticket27-s271-roster-workspace-lab", sourceState: authority.state,
  sourceRoomRef: { roomId: "ticket27-s271-roster-workspace-lab", stateRevision: 0 },
  rulesRuntime: createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: structuredClone(authority.state) }),
  armyBuilderPort: builder, matchBinding: authority.matchBinding,
});

const { createRosterTeachEvidencePortV1 } = await import("../packages/roster-strategist/roster-teach-evidence-port-v1.mjs");
const { normalizeRosterTeachPublicOutputV1 } = await import("../packages/roster-strategist/roster-teach-role-ports-v1.mjs");
const captured = structuredClone(original.publicOutputs.find(x => x.roundKind === "teach_challenge").sanitizedOutput);
captured.challenges = captured.challenges.filter(x => x.challengeId === "chal-inv-loss-budget");
const normalized = normalizeRosterTeachPublicOutputV1("teach_challenge", captured).output;
const request = normalized.challenges[0].evidenceRequest;
assert.deepEqual(request.toolRequest.followUps.map(x => x.intent), ["control_objective", "control_objective"], "Teach must retain actually consumed spatial follow-up selectors");
const spatialCalls = [];
const laboratory = { ...core, querySpatial(input) { spatialCalls.push(structuredClone(input)); return core.querySpatial(input); } };
const port = createRosterTeachEvidencePortV1(laboratory);
const run = () => port.query({challengeId:"chal-inv-loss-budget", request, initialFoundationHash:"a".repeat(64),sourceHashes:["b".repeat(64)],mutationAuthority:false});
const receipt = run();
assert.equal(spatialCalls.length, 2, "both captured scenario follow-ups must actually execute");
assert.equal(receipt.followUpReceipts.length, 2);
for (const [index, call] of spatialCalls.entries()) {
  assert.deepEqual(call.base, {kind:"branch",branchStateHash:receipt.sourceReceipt.branchStateHash});
  assert.deepEqual(call.subjectUnitIds, captured.challenges[0].evidenceRequest.toolRequest.followUps[index].subjectUnitIds);
  assert.deepEqual(call.targetIds, captured.challenges[0].evidenceRequest.toolRequest.followUps[index].targetIds);
  assert.equal(receipt.followUpReceipts[index].receipt.baseStateHash, receipt.sourceReceipt.branchStateHash);
}
const repeated = run();
assert.equal(repeated.sourceReceipt.branchStateHash, receipt.sourceReceipt.branchStateHash);
assert.equal(spatialCalls.length, 4);
assert.equal(core.proveMutationZero().sourceStateMutationCount,0);
assert.equal(JSON.stringify(original),originalBytes);
const report={passed:true,actualCapturedScenarioAndLaboratoryUsed:true,bothConsumedSelectorsPreserved:true,bothSpatialFollowUpsActuallyExecuted:true,followUpsBoundToCreatedBranch:true,sameImmutableBranchReusable:true,providerCalls:0,liveRoomWrites:0,scope:"captured_Teach_scenario_followups_not_charge_outcome_or_complete_plan",trainingTruth:false};
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+"\n",{mode:0o600});
console.log(JSON.stringify(report));
