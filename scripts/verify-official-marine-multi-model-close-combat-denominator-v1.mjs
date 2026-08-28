#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV1,
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING,
} from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorRuleSliceV1,
  verifyOfficialMarineMultiModelCloseCombatDenominatorRuleSliceV1,
} from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-denominator-rule-slice-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatRelationshipExtensionV1,
} from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-relationship-contract-v1.mjs";
import { createOfficialMarineStimpackKernelV1 } from
  "../packages/rule-atoms/official-marine-stimpack-kernel-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  part8: `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part8DocumentId}`,
  part9: `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part9DocumentId}`,
  part12: `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part12DocumentId}`,
});
const acceptance = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function documentHash(document) {
  return sha256(`${canonicalStarcraftTmgJson(document)}\n`);
}

async function fetchOfficial(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response.json();
      lastError = new Error(`${kind} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const basePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const driftReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-v2-report.json"),
  "utf8",
));
const firstFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const secondFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: firstFactionApplication.firestorePayload,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1,
});
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({
  snapshot,
  firestorePayloads: {
    ...basePayloads,
    faction_cards: secondFactionApplication.firestorePayload,
  },
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:medic", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: ["tactical_cards:academy", "tactical_cards:terran_armed_forces"],
});
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
};
const marineRecord = getOfficialCurrentProductRecord(dataset, "army_units:marine");
const kernel = createOfficialMarineStimpackKernelV1();
const denominator = createOfficialMarineMultiModelCloseCombatDenominatorV1();
const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-stimpack-close-combat-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialMarineMultiModelCloseCombatDenominatorRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialMarineMultiModelCloseCombatDenominatorRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
const relationshipGraph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: createOfficialMarineMultiModelCloseCombatRelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: sliceAudit.runtimeHash,
  }),
});
const relationshipGraphAudit = auditRuleRelationshipGraphV1(relationshipGraph);

function model(id, xInches, yInches, active = true) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: active,
    isDestroyed: !active,
  };
}

function supplyAt(count) {
  if (count <= 3) return 0;
  if (count <= 6) return 1;
  return 2;
}

function marine(input) {
  const maxModels = input.maxModels;
  const currentModels = input.currentModels;
  const destroyedCount = maxModels - currentModels;
  const models = Array.from({ length: maxModels }, (_, index) => {
    const active = index < currentModels;
    const position = input.positions?.[index] || {
      xInches: input.baseX + (index * 3),
      yInches: input.baseY,
    };
    return model(`${input.id}-m${index + 1}`, position.xInches, position.yInches, active);
  });
  const destroyedModelIds = models.slice(maxModels - destroyedCount).map((entry) => entry.id);
  return {
    id: input.id,
    name: marineRecord.payload.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash: marineRecord.sourceRecordHash,
    officialPayloadHash: marineRecord.payloadHash,
    currentModels,
    maxModels,
    currentSupply: supplyAt(currentModels),
    destroyedModelIds,
    isOnField: true,
    isInReserves: false,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: [...(input.selectedUpgradeNames || [])],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models,
  };
}

function baseState(input = {}) {
  const sideKey = input.sideKey || "player1";
  const otherSideKey = sideKey === "player1" ? "player2" : "player1";
  const maxModels = input.maxModels || 6;
  const currentModels = input.currentModels || maxModels;
  const attackerPositions = Array.from({ length: maxModels }, (_, index) => ({
    xInches: index === 0 ? 18.74 : index === 1 ? 17.48 : 5 + (index * 3),
    yInches: index < 2 ? 10 : 20,
  }));
  const targetMaxModels = input.targetMaxModels || 6;
  const targetPositions = Array.from({ length: targetMaxModels }, (_, index) => ({
    xInches: 20 + (index * 3),
    yInches: 10,
  }));
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "combat",
    activeSideKey: sideKey,
    firstPlayerSideKey: sideKey,
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {},
    players: {
      player1: { sideKey: "player1", faction: "Terran", passedPhases: {} },
      player2: { sideKey: "player2", faction: "Terran", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    activeAbilityUseHistory: [],
    board: {
      widthInches: 54,
      heightInches: 36,
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
    },
    pieces: [
      marine({
        id: `${sideKey}-attacker`,
        sideKey,
        maxModels,
        currentModels,
        baseX: 10,
        baseY: 10,
        positions: attackerPositions,
        selectedUpgradeNames: input.selectedUpgradeNames || [],
      }),
      marine({
        id: `${otherSideKey}-target`,
        sideKey: otherSideKey,
        maxModels: targetMaxModels,
        currentModels: 1,
        baseX: 20,
        baseY: 10,
        positions: targetPositions,
      }),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
  if ((input.selectedUpgradeNames || []).includes("Stimpack")) {
    const attacker = state.pieces[0];
    const abilityResolutionHash = hashStarcraftTmgContract({
      slice: 45,
      pieceId: attacker.id,
      modelLedger: attacker.models.map((entry) => entry.id),
    });
    const pair = kernel.createStatus({
      round: state.round,
      sourceSideKey: sideKey,
      sourcePieceId: attacker.id,
      abilityResolutionHash,
    });
    attacker.damageMarker = 2;
    attacker.statuses = [structuredClone(pair.status)];
    state.board.effectMarkers = [structuredClone(pair.marker)];
    const historyBody = {
      schema: "starcraft_tmg_official_active_ability_use_history_entry_v1",
      round: state.round,
      phase: "movement",
      sideKey,
      pieceId: attacker.id,
      targetId: attacker.id,
      abilityId: "stimpack",
      abilityName: "Stimpack",
      abilityWindow: "before_action",
      cardResourceId: `${sideKey}-ta-faction-card`,
      stimpackPlanHash: abilityResolutionHash,
      nonLethalResolutionHash: hashStarcraftTmgContract({ abilityResolutionHash, amount: 2 }),
      statusEffectHash: pair.status.statusEffectHash,
      markerHash: pair.marker.markerHash,
      trainingTruth: false,
    };
    state.activeAbilityUseHistory = [{
      ...historyBody,
      abilityUseHash: hashStarcraftTmgContract(historyBody),
    }];
  }
  return state;
}

function derive(state) {
  return denominator.plan({
    state,
    sideKey: state.activeSideKey,
    attackerPieceId: state.pieces[0].id,
    targetPieceId: state.pieces[1].id,
    matchBinding,
  });
}

assert.deepEqual(denominator.descriptor.initialCompositionOptions, [6, 9]);
assert.equal(denominator.descriptor.mixedStrikeBayonetCarriersAllowed, false);
assert.equal(
  denominator.descriptor.attackPoolFormula,
  "(fighting_rank_count + supporting_rank_count) * unit_wide_weapon_roa",
);
acceptance.push("denominator_separates_initial_composition_live_models_ranks_and_weapon_roa");

assert.equal(slice.sliceHash,
  "0a5c8cc51b1369b13666aa1efbe1ccbe056c4b457f980979036b8833468e60ab");
assert.equal(slice.catalogueHash,
  "732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649");
assert.equal(sliceAudit.runtimeHash,
  "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc");
assert.equal(sliceAudit.graphHash,
  "d7d780318144c4f774fdbfc7e9b75c7cf689615c9ed42d46abfe4303822b39c2");
assert.equal(sliceAudit.counts.relationshipNodes, 5118);
assert.equal(sliceAudit.counts.relationshipEdges, 19710);
assert.equal(sliceAudit.counts.executableRuleAtoms, 421);
assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 491);
assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
assert.equal(sliceAudit.runtimePromotion, false);
acceptance.push("slice45_freezes_the_denominator_and_relationship_paths_without_runtime_promotion");

const sixStrikeState = baseState({ maxModels: 6, currentModels: 6 });
const sixStrikePlan = derive(sixStrikeState);
assert.deepEqual(sixStrikePlan.fightingModelIds, ["player1-attacker-m1"]);
assert.deepEqual(sixStrikePlan.supportingModelIds, ["player1-attacker-m2"]);
assert.equal(sixStrikePlan.eligibleModelCount, 2);
assert.equal(sixStrikePlan.rateOfAttack, 1);
assert.equal(sixStrikePlan.attackDice, 2);
assert.equal(sixStrikePlan.attackerLedger.currentSupply, 1);
assert.equal(denominator.verifyPlan({
  state: sixStrikeState,
  plan: sixStrikePlan,
  matchBinding,
}), true);
acceptance.push("six_model_strike_pool_counts_only_live_fighting_and_supporting_models");

const nineBayonetState = baseState({
  maxModels: 9,
  currentModels: 9,
  selectedUpgradeNames: ["Bayonet", "Stimpack"],
});
const nineBayonetPlan = derive(nineBayonetState);
assert.equal(nineBayonetPlan.weapon.weaponName, "Bayonet");
assert.equal(nineBayonetPlan.unitWideLoadout.replacedWeaponName, "Strike");
assert.equal(nineBayonetPlan.unitWideLoadout.appliesToRosterModelIds.length, 9);
assert.equal(nineBayonetPlan.unitWideLoadout.activeCarrierModelIds.length, 9);
assert.equal(nineBayonetPlan.unitWideLoadout.perModelCarrierSelectionAllowed, false);
assert.equal(nineBayonetPlan.eligibleModelCount, 2);
assert.equal(nineBayonetPlan.rateOfAttack, 2);
assert.equal(nineBayonetPlan.attackDice, 4);
assert.equal(nineBayonetPlan.precisionValue, 3);
assert.equal(nineBayonetPlan.attackerLedger.currentSupply, 2);
acceptance.push("nine_model_bayonet_replaces_strike_unit_wide_and_scales_the_exact_pool");

const mixedCarrier = structuredClone(nineBayonetState);
mixedCarrier.pieces[0].models[0].combatWeaponName = "Bayonet";
mixedCarrier.pieces[0].models[1].combatWeaponName = "Strike";
assert.throws(
  () => derive(mixedCarrier),
  /MARINE_MULTI_MODEL_PER_MODEL_CLOSE_COMBAT_LOADOUT_FORBIDDEN/u,
);
acceptance.push("bayonet_mixed_per_model_carriers_are_an_explicit_forbidden_path");

const casualtyState = baseState({
  maxModels: 9,
  currentModels: 7,
  selectedUpgradeNames: ["Bayonet", "Stimpack"],
});
const beforeCasualty = derive(casualtyState);
assert.equal(beforeCasualty.attackDice, 4);
assert.equal(beforeCasualty.attackerLedger.currentSupply, 2);
const casualtyAttacker = casualtyState.pieces[0];
const lostSupport = casualtyAttacker.models.find((entry) => entry.id.endsWith("-m2"));
lostSupport.isDestroyed = true;
lostSupport.isOnField = false;
casualtyAttacker.currentModels = 6;
casualtyAttacker.currentSupply = 1;
casualtyAttacker.destroyedModelIds = casualtyAttacker.models
  .filter((entry) => entry.isDestroyed)
  .map((entry) => entry.id)
  .sort();
assert.throws(
  () => denominator.verifyPlan({ state: casualtyState, plan: beforeCasualty, matchBinding }),
  /MARINE_MULTI_MODEL_PLAN_STALE/u,
);
const afterCasualty = derive(casualtyState);
assert.equal(afterCasualty.attackDice, 2);
assert.equal(afterCasualty.eligibleModelCount, 1);
assert.equal(afterCasualty.attackerLedger.currentSupply, 1);
assert.notEqual(afterCasualty.attackerLedger.modelLedgerHash,
  beforeCasualty.attackerLedger.modelLedgerHash);
assert.notEqual(afterCasualty.planHash, beforeCasualty.planHash);
acceptance.push("casualty_rederives_supply_rank_attack_pool_and_invalidates_the_old_plan");

const movedSupportState = structuredClone(sixStrikeState);
movedSupportState.pieces[0].models[1].xInches = 12;
assert.throws(
  () => denominator.verifyPlan({
    state: movedSupportState,
    plan: sixStrikePlan,
    matchBinding,
  }),
  /MARINE_MULTI_MODEL_PLAN_STALE/u,
);
assert.equal(derive(movedSupportState).attackDice, 1);
acceptance.push("geometry_or_rank_change_rederives_the_pool_and_rejects_stale_domains");

const corruptedHistory = structuredClone(nineBayonetState);
corruptedHistory.activeAbilityUseHistory[0].markerHash = "0".repeat(64);
assert.throws(
  () => derive(corruptedHistory),
  /MARINE_MULTI_MODEL_ABILITY_HISTORY_INVALID/u,
);
acceptance.push("status_marker_and_history_must_form_one_hash_bound_stimpack_chain");

const invalidComposition = baseState({ maxModels: 6, currentModels: 6 });
invalidComposition.pieces[0].maxModels = 8;
assert.throws(
  () => derive(invalidComposition),
  /MARINE_MULTI_MODEL_UNIT_SCOPE_UNSUPPORTED/u,
);
acceptance.push("arbitrary_live_counts_are_supported_only_under_an_official_six_or_nine_roster");

const liveDocuments = Object.fromEntries(await Promise.all(Object.entries(URLS).map(
  async ([kind, url]) => [kind, await fetchOfficial(url, kind)],
)));
const versions = liveDocuments.versions.fields;
assert.equal(versions.unitsVersion.integerValue, "71");
assert.equal(versions.cardsVersion.integerValue, "69");
assert.equal(versions.rulesVersion.integerValue, "48");
assert.equal(
  documentHash(liveDocuments.marine),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.marineDocumentHash,
);
assert.equal(
  documentHash(liveDocuments.part8),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part8DocumentHash,
);
assert.equal(
  documentHash(liveDocuments.part9),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part9DocumentHash,
);
assert.equal(
  documentHash(liveDocuments.part12),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part12DocumentHash,
);
acceptance.push("live_official_marine_part8_part9_part12_and_versions_match_the_frozen_binding");

const report = {
  schema: "starcraft_tmg_official_marine_multi_model_close_combat_denominator_report_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  officialSourceBinding: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING,
  denominator: denominator.descriptor,
  slice,
  audit: sliceAudit,
  runtime: previousReport.runtime,
  relationshipGraph: {
    graphHash: relationshipGraph.graphHash,
    audit: relationshipGraphAudit,
  },
  authorityFixture: {
    actionSchemaVersion: "hybrid_legal_space_v13",
    runtimeAuthorityPromotion: false,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: previousReport.runtime.runtimeHash,
  examples: {
    sixModelStrike: sixStrikePlan,
    nineModelStimpackBayonet: nineBayonetPlan,
    casualtyBefore: beforeCasualty,
    casualtyAfter: afterCasualty,
  },
  relationshipSemantics: {
    rulesAuthority: false,
    relationshipGraphRole: "derived_omission_and_impact_audit_only",
    requiredPath:
      "part9_unit_wide_replacement -> model_ledger -> fighting_supporting_ranks -> attack_pool -> precision_domain",
    forbiddenPath: "bayonet -> specialist_or_per_model_strike_bayonet_carrier_assignment",
    staleInvalidationPath:
      "casualty_or_geometry -> model_ledger_or_engagement_graph -> ranks -> attack_pool -> old_domain_invalid",
  },
  runtimePromotion: false,
  skillGeneration: false,
  dshUsed: false,
  muzeroTrainingTruth: false,
  rulesTruth: "official_current_marine_multi_model_close_combat_denominator_frozen",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-marine-multi-model-close-combat-denominator-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  acceptancePassed: report.acceptancePassed,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: sliceAudit.runtimeHash,
  graphHash: sliceAudit.graphHash,
  denominatorHash: denominator.descriptor.denominatorHash,
  sixModelStrikeDice: sixStrikePlan.attackDice,
  nineModelBayonetDice: nineBayonetPlan.attackDice,
  casualtyBeforeDice: beforeCasualty.attackDice,
  casualtyAfterDice: afterCasualty.attackDice,
  officialVersions: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.dataVersions,
}, null, 2));
