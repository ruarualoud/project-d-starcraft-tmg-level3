#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createOfficialExecutableRuleRuntimeV1,
} from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialActivationPassRuleSliceV1,
} from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import {
  createOfficialAssaultHoldRuleSliceV1,
} from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import {
  createOfficialCombatPassRuleSliceV1,
} from "../packages/rule-atoms/official-combat-pass-rule-slice-v1.mjs";
import {
  createOfficialCloseCombatAttackRuleSliceV1,
} from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v1.mjs";
import {
  createOfficialCloseRanksCombatRuleSliceV1,
} from "../packages/rule-atoms/official-close-ranks-combat-rule-slice-v1.mjs";
import {
  createOfficialElevatedEngagementRuleSliceV1,
} from "../packages/rule-atoms/official-elevated-engagement-rule-slice-v1.mjs";
import {
  createOfficialEndOfRoundEffectsRuleSliceV1,
} from "../packages/rule-atoms/official-end-of-round-effects-rule-slice-v1.mjs";
import {
  createOfficialCleanupRefreshRuleSliceV1,
} from "../packages/rule-atoms/official-cleanup-refresh-rule-slice-v1.mjs";
import {
  createOfficialDetermineInitiativeRuleSliceV1,
} from "../packages/rule-atoms/official-determine-initiative-rule-slice-v1.mjs";
import {
  createOfficialStartOfRoundRuleSliceV1,
} from "../packages/rule-atoms/official-start-of-round-rule-slice-v1.mjs";
import {
  createOfficialReserveDeployRuleSliceV1,
} from "../packages/rule-atoms/official-reserve-deploy-rule-slice-v1.mjs";
import {
  createOfficialStandardMoveRuleSliceV1,
} from "../packages/rule-atoms/official-standard-move-rule-slice-v1.mjs";
import {
  createOfficialDisengageRuleSliceV1,
} from "../packages/rule-atoms/official-disengage-rule-slice-v1.mjs";
import {
  createOfficialDisengageCasualtyRuleSliceV1,
} from "../packages/rule-atoms/official-disengage-casualty-rule-slice-v1.mjs";
import {
  createOfficialRangedAttackRuleSliceV1,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v1.mjs";
import {
  createOfficialRangedAttackRuleSliceV2,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v2.mjs";
import {
  createOfficialRangedAttackRuleSliceV3,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v3.mjs";
import {
  createOfficialRangedAttackRuleSliceV4,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v4.mjs";
import {
  createOfficialRangedAttackRuleSliceV5,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v5.mjs";
import {
  createOfficialRangedAttackRuleSliceV6,
} from "../packages/rule-atoms/official-ranged-attack-rule-slice-v6.mjs";
import {
  createOfficialCloseCombatAttackRuleSliceV6,
} from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v6.mjs";
import {
  createOfficialCloseCombatAttackRuleSliceV7,
} from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v7.mjs";
import {
  createOfficialHoldPositionEndGameRuleSliceV1,
} from "../packages/rule-atoms/official-hold-position-end-game-rule-slice-v1.mjs";
import {
  createOfficialMissionMarkerControlRuleSliceV1,
} from "../packages/rule-atoms/official-mission-marker-control-rule-slice-v1.mjs";
import {
  createOfficialMovementHoldRuleSliceV1,
} from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import {
  createOfficialMultiModelCloseRanksRuleSliceV1,
} from "../packages/rule-atoms/official-multi-model-close-ranks-rule-slice-v1.mjs";
import {
  createOfficialOutOfCoherencyCloseRanksRuleSliceV1,
} from "../packages/rule-atoms/official-out-of-coherency-close-ranks-rule-slice-v1.mjs";
import {
  createOfficialPhaseInitiativeRuleSliceV1,
} from "../packages/rule-atoms/official-phase-initiative-rule-slice-v1.mjs";
import {
  createOfficialVictoryPointScoringRuleSliceV1,
} from "../packages/rule-atoms/official-victory-point-scoring-rule-slice-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";
const previousSliceReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-close-combat-attack-rule-slice-v8-report.json"),
  "utf8",
));
const specialistLoadoutReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-specialist-loadout-rule-slice-v1-report.json"),
  "utf8",
));
const specialistRangedBatchReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-specialist-ranged-batch-rule-slice-v1-report.json"),
  "utf8",
));
const sidearmPinpointReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-sidearm-pinpoint-rule-slice-v1-report.json"),
  "utf8",
));
const indirectFireLockedInReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-indirect-fire-locked-in-rule-slice-v1-report.json"),
  "utf8",
));
const combatTagShieldedReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-combat-tag-shielded-rule-slice-v1-report.json"),
  "utf8",
));
const medicMedpackReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-medic-medpack-rule-slice-v1-report.json"),
  "utf8",
));
const preContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-executor-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalActivationPassSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-activation-pass-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalMovementHoldSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-movement-hold-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalAssaultHoldSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-assault-hold-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalCombatPassSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-combat-pass-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalMissionMarkerSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-mission-marker-control-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalVictoryPointSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-victory-point-scoring-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalHoldPositionEndGameSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-hold-position-end-game-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalEndOfRoundEffectsSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-end-of-round-effects-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalCleanupRefreshSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-cleanup-refresh-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalDetermineInitiativeSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-determine-initiative-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalStartOfRoundSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-start-of-round-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalReserveDeploySliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-reserve-deploy-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalStandardMoveSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-standard-move-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalMovementV3SliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-movement-v3-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalMovementV4SliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-stimpack-move-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalMedicMedpackV2SliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-medic-medpack-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalRangedAttackV6ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-ranged-attack-v6-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalAcademyMedicV2ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-academy-medic-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalLifeSupportV2ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-life-support-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalGoliathScatterV2ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-goliath-scatter-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalCombatTagShieldedV2ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-combat-tag-shielded-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalSidearmPinpointV2ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-sidearm-pinpoint-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalSpecialistV2ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-specialist-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalStimpackCurrentV2ContractSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-stimpack-current-v2-contract-closure-v1-report.json",
  ),
  "utf8",
));
const historicalMarineChargeV2SliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-marine-charge-v2-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalImpactSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-impact-after-charge-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalAssaultRunSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-assault-run-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalTemplateWeaponSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-template-weapon-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalAttackPoolEdgeSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-attack-pool-edge-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalCloseCombatLifecycleSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-close-combat-lifecycle-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalDirectMovementDisplacementSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-direct-movement-displacement-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalGapPlaceGeometrySliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-gap-place-geometry-rule-slice-v1-report.json",
  ),
  "utf8",
));
const historicalFlyingRulesSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-flying-rules-rule-slice-v1-report.json",
  ),
  "utf8",
));
const latestSliceReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-terrain-los-rules-rule-slice-v1-report.json",
  ),
  "utf8",
));

function clone(value) {
  return structuredClone(value);
}

function unit(id, sideKey, extra = {}) {
  return {
    id,
    sideKey,
    name: id,
    xInches: sideKey === "player1" ? 10 : 30,
    yInches: id.endsWith("2") ? 18 : 12,
    currentModels: 3,
    maxModels: 3,
    isOnField: true,
    isDestroyed: false,
    speed: 6,
    baseMm: 32,
    weapons: [{ name: "Legacy Rifle", range: 12, hit: "4+", roa: 1, damage: 1, phase: "assault" }],
    abilities: [{ id: "legacy-ability", name: "Legacy Ability", effectKind: "status", statusName: "legacy" }],
    statuses: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    ...extra,
  };
}

function stateFixture() {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "1:movement": {
        round: 1,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
    mission: { startingSupply: 20, extraSupply: "2 per round", gameLength: 4 },
    board: { widthInches: 54, heightInches: 36, terrain: [], effectMarkers: [] },
    cardResources: {
      player1: [{ id: "legacy-card", currentResource: 2, maxResource: 2 }],
      player2: [],
    },
    pieces: [
      unit("p1-unit-1", "player1"),
      unit("p1-unit-2", "player1"),
      unit("p1-reserve", "player1", { isOnField: false, xInches: 0, yInches: 0 }),
      unit("p2-unit-1", "player2"),
    ],
    log: [],
  };
}

function playerCredentials(engine, envelope, sideKey = "player1") {
  const authority = engine.issueSeatAuthority({
    grantId: `runtime-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `runtime-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const denominatorReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  "utf8",
));
const denominator = denominatorReport.denominator;
const holdSlice = createOfficialMovementHoldRuleSliceV1({ denominator });
const passSlice = createOfficialActivationPassRuleSliceV1({ denominator, previousSlice: holdSlice });
const assaultHoldSlice = createOfficialAssaultHoldRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  previousSlice: passSlice,
});
const phaseInitiativeSlice = createOfficialPhaseInitiativeRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  previousSlice: assaultHoldSlice,
});
const combatPassSlice = createOfficialCombatPassRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  previousSlice: phaseInitiativeSlice,
});
const elevatedEngagementSlice = createOfficialElevatedEngagementRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  previousSlice: combatPassSlice,
});
const closeCombatSlice = createOfficialCloseCombatAttackRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  previousSlice: elevatedEngagementSlice,
});
const closeRanksSlice = createOfficialCloseRanksCombatRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice: elevatedEngagementSlice,
  previousSlice: closeCombatSlice,
});
const multiModelSlice = createOfficialMultiModelCloseRanksRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice: elevatedEngagementSlice,
  closeCombatSlice,
  previousSlice: closeRanksSlice,
});
const outOfCoherencySlice = createOfficialOutOfCoherencyCloseRanksRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice: elevatedEngagementSlice,
  closeCombatSlice,
  closeRanksSlice,
  previousSlice: multiModelSlice,
});
const missionMarkerControlSlice = createOfficialMissionMarkerControlRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice: elevatedEngagementSlice,
  closeCombatSlice,
  closeRanksSlice,
  multiModelSlice,
  previousSlice: outOfCoherencySlice,
});
const victoryPointScoringSlice = createOfficialVictoryPointScoringRuleSliceV1({
  denominator,
  movementHoldSlice: holdSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice: elevatedEngagementSlice,
  closeCombatSlice,
  closeRanksSlice,
  multiModelSlice,
  outOfCoherencySlice,
  previousSlice: missionMarkerControlSlice,
});
const holdPositionEndGameSlice = createOfficialHoldPositionEndGameRuleSliceV1({
  previousSlice: victoryPointScoringSlice,
});
const endOfRoundEffectsSlice = createOfficialEndOfRoundEffectsRuleSliceV1({
  previousSlice: holdPositionEndGameSlice,
});
const cleanupRefreshSlice = createOfficialCleanupRefreshRuleSliceV1({
  previousSlice: endOfRoundEffectsSlice,
});
const determineInitiativeSlice = createOfficialDetermineInitiativeRuleSliceV1({
  previousSlice: cleanupRefreshSlice,
});
const startOfRoundSlice = createOfficialStartOfRoundRuleSliceV1({
  previousSlice: determineInitiativeSlice,
});
const reserveDeploySlice = createOfficialReserveDeployRuleSliceV1({
  previousSlice: startOfRoundSlice,
});
const standardMoveSlice = createOfficialStandardMoveRuleSliceV1({
  previousSlice: reserveDeploySlice,
});
const disengageSlice = createOfficialDisengageRuleSliceV1({
  previousSlice: standardMoveSlice,
});
const disengageCasualtySlice = createOfficialDisengageCasualtyRuleSliceV1({
  previousSlice: disengageSlice,
});
const rangedAttackSlice = createOfficialRangedAttackRuleSliceV1({
  previousSlice: disengageCasualtySlice,
});
const rangedAttackV2Slice = createOfficialRangedAttackRuleSliceV2({
  previousSlice: rangedAttackSlice,
});
const rangedAttackV3Slice = createOfficialRangedAttackRuleSliceV3({
  previousSlice: rangedAttackV2Slice,
});
const rangedAttackV4Slice = createOfficialRangedAttackRuleSliceV4({
  previousSlice: rangedAttackV3Slice,
});
const rangedAttackV5Slice = createOfficialRangedAttackRuleSliceV5({
  previousSlice: rangedAttackV4Slice,
});
const rangedAttackV6Slice = createOfficialRangedAttackRuleSliceV6({
  previousSlice: rangedAttackV5Slice,
});
const closeCombatAttackV6Slice = createOfficialCloseCombatAttackRuleSliceV6({
  previousSlice: rangedAttackV6Slice,
});
const closeCombatAttackV7Slice = createOfficialCloseCombatAttackRuleSliceV7({
  previousSlice: closeCombatAttackV6Slice,
});
const previousSlice = previousSliceReport.slice;
assert.equal(previousSlice.previousSliceHash, closeCombatAttackV7Slice.sliceHash);
const specialistLoadoutSlice = specialistLoadoutReport.slice;
assert.equal(specialistLoadoutSlice.previousSliceHash, previousSlice.sliceHash);
const specialistRangedBatchSlice = specialistRangedBatchReport.slice;
assert.equal(specialistRangedBatchSlice.previousSliceHash, specialistLoadoutSlice.sliceHash);
const sidearmPinpointSlice = sidearmPinpointReport.slice;
assert.equal(sidearmPinpointSlice.previousSliceHash, specialistRangedBatchSlice.sliceHash);
const indirectFireLockedInSlice = indirectFireLockedInReport.slice;
assert.equal(indirectFireLockedInSlice.previousSliceHash, sidearmPinpointSlice.sliceHash);
const combatTagShieldedSlice = combatTagShieldedReport.slice;
assert.equal(combatTagShieldedSlice.previousSliceHash, indirectFireLockedInSlice.sliceHash);
const medicMedpackSlice = medicMedpackReport.slice;
assert.equal(medicMedpackSlice.previousSliceHash, combatTagShieldedSlice.sliceHash);
const historicalActivationPassSlice = historicalActivationPassSliceReport.slice;
const historicalMovementHoldSlice = historicalMovementHoldSliceReport.slice;
const historicalAssaultHoldSlice = historicalAssaultHoldSliceReport.slice;
const historicalCombatPassSlice = historicalCombatPassSliceReport.slice;
const historicalMissionMarkerSlice = historicalMissionMarkerSliceReport.slice;
const historicalVictoryPointSlice = historicalVictoryPointSliceReport.slice;
const historicalHoldPositionEndGameSlice = historicalHoldPositionEndGameSliceReport.slice;
const historicalCleanupRefreshSlice = historicalCleanupRefreshSliceReport.slice;
const historicalDetermineInitiativeSlice = historicalDetermineInitiativeSliceReport.slice;
const historicalStartOfRoundSlice = historicalStartOfRoundSliceReport.slice;
const historicalReserveDeploySlice = historicalReserveDeploySliceReport.slice;
const historicalStandardMoveSlice = historicalStandardMoveSliceReport.slice;
const historicalMovementV3Slice = historicalMovementV3SliceReport.slice;
const historicalMovementV4Slice = historicalMovementV4SliceReport.slice;
const historicalMedicMedpackV2Slice = historicalMedicMedpackV2SliceReport.slice;
const historicalRangedAttackV6ContractSlice = historicalRangedAttackV6ContractSliceReport.slice;
const historicalAcademyMedicV2ContractSlice = historicalAcademyMedicV2ContractSliceReport.slice;
const historicalLifeSupportV2ContractSlice = historicalLifeSupportV2ContractSliceReport.slice;
const historicalGoliathScatterV2ContractSlice =
  historicalGoliathScatterV2ContractSliceReport.slice;
const historicalCombatTagShieldedV2ContractSlice =
  historicalCombatTagShieldedV2ContractSliceReport.slice;
const historicalSidearmPinpointV2ContractSlice =
  historicalSidearmPinpointV2ContractSliceReport.slice;
const historicalSpecialistV2ContractSlice =
  historicalSpecialistV2ContractSliceReport.slice;
const historicalStimpackCurrentV2ContractSlice =
  historicalStimpackCurrentV2ContractSliceReport.slice;
const historicalMarineChargeV2Slice = historicalMarineChargeV2SliceReport.slice;
const historicalImpactSlice = historicalImpactSliceReport.slice;
const historicalAssaultRunSlice = historicalAssaultRunSliceReport.slice;
const historicalTemplateWeaponSlice = historicalTemplateWeaponSliceReport.slice;
const historicalAttackPoolEdgeSlice = historicalAttackPoolEdgeSliceReport.slice;
const historicalCloseCombatLifecycleSlice = historicalCloseCombatLifecycleSliceReport.slice;
const historicalDirectMovementDisplacementSlice =
  historicalDirectMovementDisplacementSliceReport.slice;
const historicalGapPlaceGeometrySlice = historicalGapPlaceGeometrySliceReport.slice;
const historicalFlyingRulesSlice = historicalFlyingRulesSliceReport.slice;
const latestSlice = latestSliceReport.slice;
assert.equal(latestSlice.previousSliceHash,
  historicalFlyingRulesSlice.sliceHash);
assert.equal(historicalFlyingRulesSlice.previousSliceHash,
  historicalGapPlaceGeometrySlice.sliceHash);
assert.equal(historicalGapPlaceGeometrySlice.previousSliceHash,
  historicalDirectMovementDisplacementSlice.sliceHash);
assert.equal(historicalDirectMovementDisplacementSlice.previousSliceHash,
  historicalCloseCombatLifecycleSlice.sliceHash);
assert.equal(historicalCloseCombatLifecycleSlice.previousSliceHash,
  historicalAttackPoolEdgeSlice.sliceHash);
assert.equal(historicalAttackPoolEdgeSlice.previousSliceHash,
  historicalTemplateWeaponSlice.sliceHash);
assert.equal(historicalTemplateWeaponSlice.previousSliceHash,
  historicalAssaultRunSlice.sliceHash);
assert.equal(historicalAssaultRunSlice.previousSliceHash,
  historicalImpactSlice.sliceHash);
assert.equal(historicalImpactSlice.previousSliceHash,
  historicalMarineChargeV2Slice.sliceHash);
assert.equal(historicalMarineChargeV2Slice.previousSliceHash,
  historicalStimpackCurrentV2ContractSlice.sliceHash);
assert.equal(historicalStimpackCurrentV2ContractSlice.previousSliceHash,
  historicalSpecialistV2ContractSlice.sliceHash);
assert.equal(historicalSpecialistV2ContractSlice.previousSliceHash,
  historicalSidearmPinpointV2ContractSlice.sliceHash);
assert.equal(historicalSidearmPinpointV2ContractSlice.previousSliceHash,
  historicalCombatTagShieldedV2ContractSlice.sliceHash);
assert.equal(historicalCombatTagShieldedV2ContractSlice.previousSliceHash,
  historicalGoliathScatterV2ContractSlice.sliceHash);
assert.equal(historicalGoliathScatterV2ContractSlice.previousSliceHash,
  historicalLifeSupportV2ContractSlice.sliceHash);
assert.equal(historicalLifeSupportV2ContractSlice.previousSliceHash,
  historicalAcademyMedicV2ContractSlice.sliceHash);
assert.equal(historicalAcademyMedicV2ContractSlice.previousSliceHash,
  historicalRangedAttackV6ContractSlice.sliceHash);
assert.equal(historicalRangedAttackV6ContractSlice.previousSliceHash,
  historicalMedicMedpackV2Slice.sliceHash);
assert.equal(historicalMedicMedpackV2Slice.previousSliceHash,
  historicalMovementV4Slice.sliceHash);
assert.equal(historicalMovementV4Slice.previousSliceHash,
  historicalMovementV3Slice.sliceHash);
assert.equal(historicalMovementV3Slice.previousSliceHash,
  historicalStandardMoveSlice.sliceHash);
assert.equal(historicalStandardMoveSlice.previousSliceHash,
  historicalReserveDeploySlice.sliceHash);
assert.equal(historicalReserveDeploySlice.previousSliceHash,
  historicalStartOfRoundSlice.sliceHash);
assert.equal(historicalStartOfRoundSlice.previousSliceHash,
  historicalDetermineInitiativeSlice.sliceHash);
assert.equal(historicalDetermineInitiativeSlice.previousSliceHash,
  historicalCleanupRefreshSlice.sliceHash);
assert.equal(historicalCleanupRefreshSlice.previousSliceHash,
  historicalEndOfRoundEffectsSliceReport.slice.sliceHash);
assert.equal(
  historicalHoldPositionEndGameSlice.previousSliceHash,
  historicalVictoryPointSlice.sliceHash,
);
assert.equal(
  historicalVictoryPointSlice.previousSliceHash,
  historicalMissionMarkerSlice.sliceHash,
);
assert.equal(
  historicalMissionMarkerSlice.previousSliceHash,
  historicalCombatPassSlice.sliceHash,
);
assert.equal(
  historicalCombatPassSlice.previousSliceHash,
  historicalAssaultHoldSlice.sliceHash,
);
assert.equal(
  historicalAssaultHoldSlice.previousSliceHash,
  historicalMovementHoldSlice.sliceHash,
);
assert.equal(
  historicalMovementHoldSlice.previousSliceHash,
  historicalActivationPassSlice.sliceHash,
);
assert.equal(
  historicalActivationPassSlice.previousSliceHash,
  preContractSliceReport.slice.sliceHash,
);
assert.notEqual(latestSlice.catalogueHash, historicalAssaultHoldSlice.catalogueHash);
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: latestSlice.catalogue });
const historicalVictoryPointRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: historicalVictoryPointSlice.catalogue,
});
const historicalMissionMarkerRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: historicalMissionMarkerSlice.catalogue,
});
const historicalCombatPassRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: historicalCombatPassSlice.catalogue,
});
const historicalMedicMedpackRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: medicMedpackSlice.catalogue,
});
const historicalCombatTagShieldedRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: combatTagShieldedSlice.catalogue,
});
const historicalIndirectFireLockedInRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: indirectFireLockedInSlice.catalogue,
});
const historicalSidearmPinpointRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: sidearmPinpointSlice.catalogue,
});
const historicalSpecialistRangedBatchRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: specialistRangedBatchSlice.catalogue,
});
const historicalCloseCombatAttackV6Runtime = createOfficialExecutableRuleRuntimeV1({
  catalogue: closeCombatAttackV6Slice.catalogue,
});
const historicalRangedAttackV6Runtime = createOfficialExecutableRuleRuntimeV1({
  catalogue: rangedAttackV6Slice.catalogue,
});
const historicalRangedAttackRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: rangedAttackSlice.catalogue,
});
const historicalRangedAttackV2Runtime = createOfficialExecutableRuleRuntimeV1({
  catalogue: rangedAttackV2Slice.catalogue,
});
const historicalRangedAttackV3Runtime = createOfficialExecutableRuleRuntimeV1({
  catalogue: rangedAttackV3Slice.catalogue,
});
const historicalRangedAttackV4Runtime = createOfficialExecutableRuleRuntimeV1({
  catalogue: rangedAttackV4Slice.catalogue,
});
const historicalRangedAttackV5Runtime = createOfficialExecutableRuleRuntimeV1({
  catalogue: rangedAttackV5Slice.catalogue,
});
const historicalDisengageRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: disengageSlice.catalogue,
});
const historicalDisengageCasualtyRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: disengageCasualtySlice.catalogue,
});
const strictEngine = createStarcraftTmgAuthoritativeEngine({ rulesRuntime, now: () => OCCURRED_AT });
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
});
const acceptance = [];

async function check(id, fn) {
  try {
    await fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

await check("runtime_binds_the_exact_cumulative_catalogue_and_known_executors", () => {
  assert.equal(rulesRuntime.descriptor.catalogueHash, latestSlice.catalogueHash);
  assert.equal(rulesRuntime.descriptor.rulesVersion, latestSlice.catalogue.rulesVersion);
  assert.equal(rulesRuntime.descriptor.executableRuleAtomCount, 568);
  assert.equal(rulesRuntime.descriptor.nonExecutableRuleAtomCount, 458);
  assert.equal(rulesRuntime.descriptor.legalSpaceComplete, false);
  assert.equal(rulesRuntime.descriptor.legacyCompatibilityUsed, false);
  assert.equal(rulesRuntime.descriptor.productionRoomEligible, false);
  assert.deepEqual(latestSliceReport.sliceAudit.counts, {
    executableRuleAtoms: 568,
    newlyExecutableRuleAtoms: 19,
    reviewRequiredRuleAtoms: 344,
    displayOnlyRuleAtoms: 114,
    strictCompleteAtoms: 568,
    partialContractAtoms: 0,
    noContractAtoms: 0,
    declaredStateContractExecutors: 53,
    missingStateContractExecutors: 0,
  });
  assert.match(rulesRuntime.descriptor.runtimeHash, /^[a-f0-9]{64}$/u);
  assert.equal(
    rulesRuntime.descriptor.runtimeHash,
    "b61a6aacfc7db4ac6670cb08c57d35ead90758fe28c3e559237acfe2b253e324",
  );
  assert.equal(
    historicalVictoryPointRuntime.descriptor.runtimeHash,
    "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe",
  );
  assert.equal(
    historicalMissionMarkerRuntime.descriptor.runtimeHash,
    "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55",
  );
  assert.equal(
    historicalCombatPassRuntime.descriptor.runtimeHash,
    "1d6b06dd12b6eae1c0471d9a5a38073c316a4835018f0c8fc47112344226e26c",
  );
  assert.equal(
    historicalMedicMedpackRuntime.descriptor.runtimeHash,
    "acead33c1486645a149466848b7d276c54c99c51261c641786e9633dafde815d",
  );
  assert.equal(historicalMedicMedpackRuntime.descriptor.executableRuleAtomCount, 394);
  assert.equal(
    historicalCombatTagShieldedRuntime.descriptor.runtimeHash,
    "4c72c2953a71db039e0391c2643a2228ba36cfd727cf1b105b6ffacdae20ca93",
  );
  assert.equal(historicalCombatTagShieldedRuntime.descriptor.executableRuleAtomCount, 365);
  assert.equal(
    historicalIndirectFireLockedInRuntime.descriptor.runtimeHash,
    "a6f1264ecee7adb0ce99d2ff8357d137bc44c14031c2663ed6e1609d31037258",
  );
  assert.equal(historicalIndirectFireLockedInRuntime.descriptor.executableRuleAtomCount, 355);
  assert.equal(
    historicalSidearmPinpointRuntime.descriptor.runtimeHash,
    "ad6ede455d3da1ad0532361d96810325934025ab3ba2ee31f77f7438dc5bc794",
  );
  assert.equal(historicalSidearmPinpointRuntime.descriptor.executableRuleAtomCount, 343);
  assert.equal(
    historicalSpecialistRangedBatchRuntime.descriptor.runtimeHash,
    "888b4340397e9b504444b0d8094c75b13bb04f50f3766ce325911a5bd893735d",
  );
  assert.equal(historicalSpecialistRangedBatchRuntime.descriptor.executableRuleAtomCount, 337);
  assert.equal(
    historicalDisengageRuntime.descriptor.runtimeHash,
    "92b5d5f6c7d56e03ffdf3728712ddd98cfb1a956256e31e76ce32c6dc4a0dbe5",
  );
  assert.equal(historicalDisengageRuntime.descriptor.executableRuleAtomCount, 237);
  assert.equal(
    historicalDisengageCasualtyRuntime.descriptor.runtimeHash,
    "e94bd5d6ef839fb96c1077da532c5d4314c1c0d7c60754523a410613aaea4541",
  );
  assert.equal(historicalDisengageCasualtyRuntime.descriptor.executableRuleAtomCount, 239);
  assert.equal(
    historicalRangedAttackRuntime.descriptor.runtimeHash,
    "01ed2a06eb361059f598f5e60cab0791065acc7409c60ef6cf333f50d5f54b79",
  );
  assert.equal(historicalRangedAttackRuntime.descriptor.executableRuleAtomCount, 278);
  assert.equal(
    historicalRangedAttackV2Runtime.descriptor.runtimeHash,
    "dd3f3bc9e8832a47069ee75aa1c258072d55d2797b36bd429288c265b1b6cf5f",
  );
  assert.equal(historicalRangedAttackV2Runtime.descriptor.executableRuleAtomCount, 282);
  assert.equal(
    historicalRangedAttackV3Runtime.descriptor.runtimeHash,
    "bdb88261239e1041b30a27ff556046f5648399f411c98dd965e22b17e506b19a",
  );
  assert.equal(historicalRangedAttackV3Runtime.descriptor.executableRuleAtomCount, 283);
  assert.equal(
    historicalRangedAttackV4Runtime.descriptor.runtimeHash,
    "99510a4d31ccfe8f84f7ec97df35c85d758111a2fed283cd6bcd51c79f0c7683",
  );
  assert.equal(historicalRangedAttackV4Runtime.descriptor.executableRuleAtomCount, 299);
  assert.equal(
    historicalRangedAttackV5Runtime.descriptor.runtimeHash,
    "36aa2c6d931f3002fb5ca2651f727da6f47b348b186b4edbfdb64b7fd6dbd388",
  );
  assert.equal(historicalRangedAttackV5Runtime.descriptor.executableRuleAtomCount, 304);
  assert.equal(
    historicalRangedAttackV6Runtime.descriptor.runtimeHash,
    "17c91887a32c1e8b76aeafbea5f65c7ac2f5b0f4234caf7b468521621f012562",
  );
  assert.equal(historicalRangedAttackV6Runtime.descriptor.executableRuleAtomCount, 305);
  assert.equal(
    historicalCloseCombatAttackV6Runtime.descriptor.runtimeHash,
    "ee255eee5aa16cdccb2ef2ce3ea3b49ae190862419e76a061e0824e7c3405eb6",
  );
  assert.equal(historicalCloseCombatAttackV6Runtime.descriptor.executableRuleAtomCount, 306);
  const manifestById = new Map(rulesRuntime.descriptor.executorManifest.map((entry) => [
    entry.executorId,
    entry,
  ]));
  assert.deepEqual(
    manifestById.get("authority.mission-marker-control-v3").actionTypes,
    ["determine_mission_marker_control"],
  );
  assert.deepEqual(
    manifestById.get("authority.victory-point-scoring-v2").actionTypes,
    ["score_victory_points"],
  );
  assert.deepEqual(
    manifestById.get("authority.hold-position-end-game-check-v2").actionTypes,
    ["check_end_game_conditions"],
  );
  assert.deepEqual(manifestById.get("authority.close-combat-attack-v8").actionTypes, [
    "declare_fight",
    "fight",
    "pass_reaction",
    "resolve_fight",
    "use_reaction",
  ]);
  assert.deepEqual(manifestById.get("authority.cleanup-refresh-v2").actionTypes, [
    "cleanup_and_refresh",
  ]);
  assert.deepEqual(manifestById.get("authority.cleanup-refresh-v3").actionTypes, [
    "cleanup_and_refresh",
  ]);
  assert.deepEqual(manifestById.get("authority.end-of-round-effects-v3").actionTypes, [
    "resolve_end_of_round_effects",
  ]);
  assert.deepEqual(
    manifestById.get("authority.sidearm-pinpoint-ranged-batch-v2").actionTypes,
    ["ranged_attack"],
  );
  assert.deepEqual(
    manifestById.get("authority.specialist-loadout-v2").actionTypes,
    ["configure_specialist_loadout"],
  );
  assert.deepEqual(
    manifestById.get("authority.specialist-ranged-batch-v2").actionTypes,
    ["ranged_attack"],
  );
  assert.deepEqual(
    manifestById.get("authority.goliath-scatter-ranged-batch-v2").actionTypes,
    ["ranged_attack"],
  );
  assert.deepEqual(
    manifestById.get("authority.combat-tag-shielded-ranged-v2").actionTypes,
    ["ranged_attack"],
  );
  assert.deepEqual(
    manifestById.get("authority.medic-medpack-active-v2").actionTypes,
    ["use_ability"],
  );
  assert.deepEqual(
    manifestById.get("authority.academy-medic-ability-v2").actionTypes,
    ["declare_ability", "pass_ability_reaction", "resolve_ability", "use_ability_reaction"],
  );
  assert.deepEqual(
    manifestById.get("authority.medic-restoration-reaction-v2").actionTypes,
    ["pass_restoration_reaction", "use_restoration_reaction"],
  );
  assert.deepEqual(
    manifestById.get("authority.optical-flare-ranged-consumer-v2").actionTypes,
    ["ranged_attack"],
  );
  assert.deepEqual(
    manifestById.get("authority.medic-life-support-reaction-v2").actionTypes,
    ["pass_life_support_reaction", "use_life_support_reaction"],
  );
  assert.deepEqual(
    manifestById.get("authority.marine-stimpack-active-v3").actionTypes,
    ["use_ability"],
  );
  assert.deepEqual(
    manifestById.get("authority.stimpack-ranged-consumer-v2").actionTypes,
    ["ranged_attack", "resolve_precision"],
  );
  assert.deepEqual(
    manifestById.get("authority.stimpack-move-consumer-v3").actionTypes,
    ["move"],
  );
  assert.deepEqual(
    manifestById.get("authority.marine-optional-stimpack-move-v2").actionTypes,
    ["move"],
  );
  assert.deepEqual(
    manifestById.get("authority.marine-multi-enemy-casualty-close-combat-v4").actionTypes,
    ["fight", "resolve_multi_enemy_close_combat_casualties"],
  );
  assert.deepEqual(
    manifestById.get(
      "authority.marine-multi-enemy-stimpack-casualty-close-combat-v5",
    ).actionTypes,
    [
      "fight",
      "resolve_multi_enemy_stimpack_close_combat_casualties",
      "resolve_multi_enemy_stimpack_close_combat_precision",
    ],
  );
  assert.deepEqual(
    manifestById.get("authority.end-of-round-effects-v5").actionTypes,
    ["resolve_end_of_round_effects"],
  );
  assert.deepEqual(
    manifestById.get("authority.cleanup-refresh-v5").actionTypes,
    ["cleanup_and_refresh"],
  );
  assert.deepEqual(
    manifestById.get("authority.determine-initiative-v2").actionTypes,
    ["determine_initiative"],
  );
  assert.deepEqual(
    manifestById.get("authority.start-of-round-v5").actionTypes,
    ["resolve_start_of_round"],
  );
  assert.deepEqual(
    manifestById.get("authority.reserve-deploy-v5").actionTypes,
    ["deploy"],
  );
  assert.deepEqual(
    manifestById.get("authority.standard-move-v5").actionTypes,
    ["move"],
  );
  assert.deepEqual(
    manifestById.get("authority.disengage-v5").actionTypes,
    ["disengage"],
  );
  assert.deepEqual(
    manifestById.get("authority.marine-charge-v2").actionTypes,
    ["charge", "resolve_charge"],
  );
  assert.deepEqual(
    manifestById.get("authority.goliath-charge-v1").actionTypes,
    ["charge", "resolve_charge"],
  );
  assert.deepEqual(
    manifestById.get("authority.impact-v1").actionTypes,
    ["resolve_impact"],
  );
  assert.deepEqual(
    manifestById.get("authority.assault-run-v1").actionTypes,
    ["run"],
  );
  assert.deepEqual(
    manifestById.get("authority.template-weapon-v1").actionTypes,
    ["resolve_template_weapon_procedure"],
  );
  assert.deepEqual(
    manifestById.get("authority.attack-pool-edge-v1").actionTypes,
    ["resolve_attack_pool_edge_procedure"],
  );
  assert.deepEqual(
    manifestById.get("authority.gap-place-geometry-v1").actionTypes,
    ["resolve_gap_place_geometry_procedure"],
  );
  assert.deepEqual(
    manifestById.get("authority.flying-rules-v1").actionTypes,
    ["resolve_flying_rules_procedure"],
  );
  assert.deepEqual(
    manifestById.get("authority.terrain-los-rules-v1").actionTypes,
    ["resolve_terrain_los_rules_procedure"],
  );
});

await check("authority_health_and_match_binding_expose_the_runtime_identity", () => {
  const health = engine.health();
  assert.equal(health.rulesRuntimeMode, "official_executable_catalogue");
  assert.equal(health.rulesRuntime.runtimeHash, rulesRuntime.descriptor.runtimeHash);
  assert.equal(health.legacyCompatibilityUsed, false);
  assert.equal(health.developmentSubsetEnabled, true);
  const envelope = engine.createEnvelope({
    roomId: "official-runtime-binding-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-runtime-fixture",
    state: stateFixture(),
  });
  assert.equal(envelope.matchBinding.rulesVersion, latestSlice.catalogue.rulesVersion);
  assert.equal(envelope.matchBinding.rulesRuntimeBinding.runtimeHash, rulesRuntime.descriptor.runtimeHash);
  assert.equal(envelope.matchBinding.rulesRuntimeBinding.catalogueHash, latestSlice.catalogueHash);
  assert.equal(envelope.matchBinding.rulesRuntimeBinding.legacyCompatibilityUsed, false);
  assert.equal(
    envelope.matchBinding.dependencies.actionSchema.contentHash,
    hashStarcraftTmgContract({
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v25",
    }),
  );
  assert.equal(envelope.matchBinding.productionReady, false);
});

await check("incomplete_catalogue_fails_closed_without_explicit_development_subset", () => {
  const envelope = strictEngine.createEnvelope({
    roomId: "strict-incomplete-runtime-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-runtime-fixture",
    state: stateFixture(),
  });
  const credentials = playerCredentials(strictEngine, envelope);
  assert.throws(
    () => strictEngine.legalSpace(envelope, { seatAuthority: credentials.authority }),
    /RULE_RUNTIME_INCOMPLETE/u,
  );
  assert.equal(strictEngine.health().developmentSubsetEnabled, false);
});

await check("official_legal_space_contains_only_promoted_hold_and_pass_actions", () => {
  const envelope = engine.createEnvelope({
    roomId: "official-runtime-legal-space-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-runtime-fixture",
    state: stateFixture(),
  });
  const credentials = playerCredentials(engine, envelope);
  const legal = engine.legalSpace(envelope, { seatAuthority: credentials.authority });
  assert.deepEqual(
    [...new Set(legal.finiteActions.map((row) => row.action.actionType))].sort(),
    ["hold", "pass"],
  );
  assert.equal(legal.parameterDomains.length, 0);
  assert.equal(legal.searchSuggestions.length, 0);
  assert.equal(legal.rulesRuntimeBinding.runtimeHash, rulesRuntime.descriptor.runtimeHash);
  assert.equal(legal.rulesRuntimeBinding.legalSpaceComplete, false);
  assert.equal(legal.rulesRuntimeBinding.developmentSubset, true);
  const executableIds = new Set(latestSlice.executableRuleAtomIds);
  assert(legal.finiteActions.every((row) => (
    row.action.ruleAtomIds.length > 0
      && row.action.ruleAtomIds.every((atomId) => executableIds.has(atomId))
  )));
  assert.equal(legal.finiteActions.some((row) => [
    "move", "deploy", "disengage", "advance_phase", "use_card_resource", "use_ability",
  ].includes(row.action.actionType)), false);
});

await check("fabricated_or_legacy_actions_cannot_cross_preview", () => {
  const envelope = engine.createEnvelope({
    roomId: "official-runtime-rejection-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-runtime-fixture",
    state: stateFixture(),
  });
  const credentials = playerCredentials(engine, envelope);
  const rejected = engine.preview({
    envelope,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: "fabricated-legacy-move" },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "LEGAL_SPACE_STALE");
});

await check("promoted_hold_still_previews_applies_and_replays_under_the_runtime", () => {
  const initial = engine.createEnvelope({
    roomId: "official-runtime-replay-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-runtime-fixture",
    state: stateFixture(),
  });
  const credentials = playerCredentials(engine, initial);
  const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
  const hold = legal.finiteActions.find((row) => (
    row.action.actionType === "hold" && row.action.pieceId === "p1-unit-1"
  ));
  assert(hold);
  const previewed = engine.preview({
    envelope: initial,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: hold.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(previewed.ok, true);
  const applied = engine.apply({
    envelope: initial,
    preview: previewed.preview,
    expectedStateRevision: 0,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey: "official-runtime-hold-1",
    occurredAt: OCCURRED_AT,
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.receipt.action.executorId, "authority.movement-hold-v1");
  assert.equal(applied.envelope.state.pieces.find((row) => row.id === "p1-unit-1")
    .activatedPhases.movement, true);
  const replayed = engine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
  assert.equal(replayed.ok, true);
  assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
});

await check("catalogue_source_and_executor_drift_fail_before_runtime_creation", () => {
  const catalogueHashTamper = clone(latestSlice.catalogue);
  catalogueHashTamper.catalogueHash = "f".repeat(64);
  assert.throws(
    () => createOfficialExecutableRuleRuntimeV1({ catalogue: catalogueHashTamper }),
    /catalogue_hash_mismatch/u,
  );
  const executorTamper = clone(latestSlice.catalogue);
  executorTamper.executorManifest[0].executorVersion = "tampered";
  assert.throws(
    () => createOfficialExecutableRuleRuntimeV1({ catalogue: executorTamper }),
    /catalogue_hash_mismatch/u,
  );
  assert.throws(
    () => createStarcraftTmgAuthoritativeEngine({ rulesRuntime, rulesVersion: "wrong-rules" }),
    /RULE_RUNTIME_VERSION_MISMATCH/u,
  );
});

await check("legacy_engine_is_explicitly_non_production_compatibility", () => {
  const legacyHealth = createStarcraftTmgAuthoritativeEngine().health();
  assert.equal(legacyHealth.rulesRuntimeMode, "legacy_compatibility_fixture");
  assert.equal(legacyHealth.legacyCompatibilityUsed, true);
  assert.equal(legacyHealth.productionReady, false);
});

await check("production_room_rejects_the_partial_runtime_while_development_room_records_it", async () => {
  const rooms = createStarcraftTmgRoomRuntime({ authorityEngine: engine, now: () => OCCURRED_AT });
  const roomInput = {
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state: stateFixture(),
      receiptHash: "official-runtime-state-factory-receipt",
      dataVersion: "official-runtime-fixture",
    },
    serverSeatPlan: [{
      label: "host",
      seatKey: "player1",
      roleMode: "player",
      principalType: "human",
    }],
  };
  const rejected = await rooms.createRoom({
    ...roomInput,
    roomId: "official-runtime-production-room",
    productionRoom: true,
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "PRODUCTION_RULE_RUNTIME_REQUIRED");
  const created = await rooms.createRoom({
    ...roomInput,
    roomId: "official-runtime-development-room",
  });
  assert.equal(created.ok, true);
  assert.equal(created.room.rulesRuntimeBinding.runtimeHash, rulesRuntime.descriptor.runtimeHash);
  assert.equal(created.room.productionReady, false);
});

await check("runtime_gate_emits_no_skill_or_training_promotion", () => {
  assert.equal(rulesRuntime.descriptor.ctx2skillPromotionEligible, false);
  assert.equal(rulesRuntime.descriptor.trainingTruth, false);
  assert.equal(rulesRuntime.descriptor.productionRoomEligible, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_executable_rule_runtime_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  runtimeDescriptor: rulesRuntime.descriptor,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length ? "failed" : "official_runtime_receipt_replay_passed",
    promotions: [],
    blocks: [
      "remaining_344_actionable_rule_atoms_not_executable",
      "114_display_only_rule_atoms_preserved",
      "production_room_runtime_incomplete",
    ],
    remainingRuleGaps: 344,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "rule_skill_builder_prompt"],
    harnessToolsCalled: ["list_legal_actions", "preview_action", "apply_action", "replay_room"],
    uiTraceEvidence: "contract_only_device_ui_pending",
    agentDecisionEvidence:
      "only_catalogue_promoted_actions_are_model_visible_and_pending_reaction_windows_are_seat_scoped",
    memoryTraceEvidence: "no_memory_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "catalogue_or_executor_drift_prevents_runtime_creation",
      "receipt_replay_failure_quarantines_the_runtime",
    ],
    userVisibleChecks: [
      "legacy_actions_absent_from_official_legal_space",
      "runtime_identity_visible_in_match_legal_space_and_room",
    ],
  },
  rulesTruth: "catalogue_promoted_actions_only",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-executable-rule-runtime-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  runtimeHash: rulesRuntime.descriptor.runtimeHash,
  catalogueHash: rulesRuntime.descriptor.catalogueHash,
  executableRuleAtomCount: rulesRuntime.descriptor.executableRuleAtomCount,
  legacyCompatibilityUsed: rulesRuntime.descriptor.legacyCompatibilityUsed,
  productionRoomEligible: rulesRuntime.descriptor.productionRoomEligible,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
