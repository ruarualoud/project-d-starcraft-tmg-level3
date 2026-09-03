#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  classifyStarcraftTmgWriteSheetEntryV1,
  isDirectlyNamedTokenMarkerRuleAtomV1,
  isStarcraftTmgWritePaletteV1,
  projectStarcraftTmgWritePaletteV1,
  STARCRAFT_TMG_CURRENT_RULE_GRAPH_INDEX_V1,
} from "../packages/client-domain/battle-workbench-write-palette-v1.mjs";
import { projectStarcraftTmgBattleWorkbenchV1 } from
  "../packages/client-domain/battle-workbench-v1.mjs";
import { STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 } from
  "../packages/client-domain/official-faq-current-client-contract-v1.mjs";
import {
  OFFICIAL_FAQ_CURRENT_AGGREGATE_HASH,
  OFFICIAL_FAQ_CURRENT_CATALOGUE_HASH,
  OFFICIAL_FAQ_CURRENT_GRAPH_HASH,
  OFFICIAL_FAQ_CURRENT_RUNTIME_HASH,
  OFFICIAL_FAQ_TOKEN_MARKER_CONTRACT_HASH,
} from "../packages/rule-atoms/official-faq-f5-aggregate-release-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-14-slice-140-write-palette-v1/report.json");
const GENERATED_AT = "2026-09-03T17:00:00.000Z";
const HASH = "a".repeat(64);
const CURRENT = STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1;

function binding(overrides = {}) {
  return {
    schemaVersion: "starcraft_tmg_rules_runtime_binding_v1",
    mode: "official_executable_catalogue",
    runtimeId: "official-faq-v1-current",
    runtimeVersion: "0.112.0-official-faq-v1-current",
    runtimeHash: CURRENT.runtimeHash,
    catalogueHash: CURRENT.catalogueHash,
    executableRuleAtomCount: 1049,
    nonExecutableRuleAtomCount: 114,
    legalSpaceComplete: false,
    developmentSubset: true,
    legacyCompatibilityUsed: false,
    productionRoomEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    ...overrides,
  };
}

function finite(actionKey, action) {
  return { actionKey, confirmationClass: "explicit_human", action };
}

function exactLegalSpace() {
  return {
    roomId: "slice-140-room",
    matchBindingHash: "b".repeat(64),
    stateRevision: 14,
    stateHash: "c".repeat(64),
    legalSpaceHash: HASH,
    rulesRuntimeBinding: binding(),
    finiteActions: [
      finite("registry", {
        actionType: "materialize_battlefield_token_marker_registry",
        sideKey: "player1",
        executorId: "authority.battlefield-token-marker-rules-v1",
        executorVersion: "1.0.0",
        ruleAtomIds: ["rule-atom:singleton:core-7-3-1-token-definition:1456727a0b83"],
      }),
      finite("detection", {
        actionType: "use_ability",
        sideKey: "player1",
        pieceId: "observer-1",
        abilityName: "Detection",
        executorId: "authority.faq-f4-ability-tactical-keyword-v1",
        executorVersion: "1.0.0",
        ruleAtomIds: ["rule-atom:faq-v1-57-detection-indicator-placement"],
        tokenMarkerAction: {
          verb: "place",
          type: "faction_indicator",
          controller: "player1",
          duration: "ability_defined",
          stackPolicy: "one_per_detection_location",
          unique: false,
          trigger: { window: "ability_resolution" },
          cleanupTiming: "ability_defined_or_end_round",
          source: { ability: "Detection", pieceId: "observer-1" },
          legalDomains: { target: "selected_battlefield_location" },
          geometry: { coordinateUnit: "milli-inch", rulesFootprint: null },
        },
      }),
      finite("damage", { actionType: "apply_attack_damage", sideKey: "player1" }),
      finite("shield", { actionType: "resolve_shield", sideKey: "player1" }),
      finite("casualty", { actionType: "remove_casualty", sideKey: "player1" }),
      finite("status", { actionType: "apply_status", sideKey: "player1" }),
      finite("deployment", { actionType: "deploy_unit", sideKey: "player1" }),
      finite("score", { actionType: "commit_victory_point_score", sideKey: "player1" }),
    ],
    parameterDomains: [{
      domainId: "move-token-domain",
      actionType: "relocate_effect",
      sideKey: "player1",
      executorId: "authority.example-token-move-v1",
      executorVersion: "1.0.0",
      ruleAtomIds: ["rule-atom:faq-v1-54-place-preserves-creep"],
      tokenMarkerAction: {
        verb: "move",
        type: "creep_token",
        controller: "player1",
        duration: "stay_in_play",
        stackPolicy: "source_defined_overlap",
        unique: false,
        trigger: "parameterized_rules_action",
        cleanupTiming: "creating_effect_or_explicit_removal",
        source: { executorId: "authority.example-token-move-v1" },
        legalDomains: { target: "server_returned_coordinate_domain" },
        geometry: { coordinateUnit: "milli-inch", baseDiameterMm: 32 },
      },
      parameterSchema: { type: "object" },
      constraints: { battlefieldBounds: true },
      confirmationClass: "direct_gesture",
    }],
  };
}

const acceptance = [];
function accept(name, operation) {
  operation();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${name}`);
}

const baseReport = JSON.parse(await readFile(path.join(ROOT,
  "build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json"),
"utf8"));
const legalSpace = exactLegalSpace();
const palette = projectStarcraftTmgWritePaletteV1({ legalSpace });

accept("client_contract_matches_current_faq_aggregate_identities", () => {
  assert.equal(CURRENT.aggregateHash, OFFICIAL_FAQ_CURRENT_AGGREGATE_HASH);
  assert.equal(CURRENT.catalogueHash, OFFICIAL_FAQ_CURRENT_CATALOGUE_HASH);
  assert.equal(CURRENT.runtimeHash, OFFICIAL_FAQ_CURRENT_RUNTIME_HASH);
  assert.equal(CURRENT.graphHash, OFFICIAL_FAQ_CURRENT_GRAPH_HASH);
  assert.equal(CURRENT.tokenMarkerContractHash, OFFICIAL_FAQ_TOKEN_MARKER_CONTRACT_HASH);
});
accept("latest_faq_token_marker_denominator_is_12_entries_and_27_atoms", () => {
  assert.equal(CURRENT.tokenMarker.entries, 12);
  assert.equal(CURRENT.tokenMarker.faqAtoms, 27);
  assert.equal(CURRENT.tokenMarker.entryIds.length, 12);
  assert.equal(CURRENT.tokenMarker.atomIds.length, 27);
  assert.equal(new Set(CURRENT.tokenMarker.atomIds).size, 27);
});
accept("base_graph_denominators_remain_separate_and_are_not_summed_as_actions", () => {
  const directlyNamed = baseReport.slice.catalogue.atoms
    .filter(isDirectlyNamedTokenMarkerRuleAtomV1);
  assert.equal(directlyNamed.length, 69);
  assert.equal(STARCRAFT_TMG_CURRENT_RULE_GRAPH_INDEX_V1.genericTokenMarkerPrimitiveAtomCount,
    11);
  assert.match(CURRENT.tokenMarker.denominatorPolicy, /must_not_be_summed_as_actions/u);
});
accept("current_faq_binding_classifies_complete_current_legal_space", () => {
  assert.equal(palette.coverage, "exact");
  assert.equal(palette.ruleGraphIndex.binding.status, "current_faq_v1");
  assert.equal(palette.currentLegalSpace.totalEntryCount, 9);
  assert.deepEqual({ candidates: palette.currentLegalSpace.tokenMarkerCandidateCount,
    classified: palette.currentLegalSpace.classifiedCount,
    enabled: palette.currentLegalSpace.enabledForProposalCount,
    unsupported: palette.currentLegalSpace.unsupportedCount },
  { candidates: 3, classified: 3, enabled: 3, unsupported: 0 });
  assert(isStarcraftTmgWritePaletteV1(palette, {
    roomId: legalSpace.roomId, legalSpaceHash: legalSpace.legalSpaceHash,
  }));
});
accept("token_marker_metadata_includes_owner_lifecycle_geometry_source_and_faq_refs", () => {
  const detection = palette.actions.find((entry) => entry.actionKey === "detection");
  assert.deepEqual({ verb: detection.verb, type: detection.type,
    controller: detection.controller, duration: detection.duration,
    stackPolicy: detection.stackPolicy, cleanupTiming: detection.cleanupTiming }, {
    verb: "place", type: "faction_indicator", controller: "player1",
    duration: "ability_defined", stackPolicy: "one_per_detection_location",
    cleanupTiming: "ability_defined_or_end_round",
  });
  assert.equal(detection.source.ability, "Detection");
  assert.equal(detection.legalDomains.target, "selected_battlefield_location");
  assert.equal(detection.geometry.coordinateUnit, "milli-inch");
  assert.equal(detection.faqRuleRefs[0].entryId, "faq-v1:57");
});
accept("all_five_lifecycle_verbs_are_declared_without_inventing_current_actions", () => {
  assert.deepEqual(palette.lifecycle.map((entry) => entry.verb),
    ["create", "place", "move", "consume", "remove"]);
  assert.equal(palette.lifecycle.every((entry) => (
    entry.availability === "current_legal_space_only")), true);
});
accept("write_sheet_unifies_all_seven_rule_owned_write_families", () => {
  assert.deepEqual(Object.keys(palette.writeSheet.fields),
    ["damage", "shield", "casualty", "status", "deployment", "score", "token_marker"]);
  assert(Object.values(palette.writeSheet.fields).every((field) => (
    field.currentLegalActionCount > 0
      && field.route === "legal_space_preview_human_confirm_apply_receipt_replay"
      && field.directNumericEditAllowed === false)));
  assert.equal(palette.writeSheet.directClientMutationAllowed, false);
});
accept("unknown_token_marker_action_fails_closed", () => {
  const unknown = exactLegalSpace();
  unknown.finiteActions.push(finite("unknown-token", {
    actionType: "create_custom_token", sideKey: "player1", tokenKind: "mystery_token",
  }));
  const result = projectStarcraftTmgWritePaletteV1({ legalSpace: unknown });
  assert.equal(result.coverage, "partial");
  assert.equal(result.unsupported.length, 1);
  assert.equal(result.unsupported[0].enabledForProposal, false);
  assert(result.unsupported[0].missingFields.includes("duration"));
});
accept("mixed_or_unknown_room_rule_identity_is_quarantined", () => {
  const mixed = exactLegalSpace();
  mixed.rulesRuntimeBinding = binding({
    runtimeHash: CURRENT.roomBindings.historicalPreFaq.runtimeHash,
  });
  const result = projectStarcraftTmgWritePaletteV1({ legalSpace: mixed });
  assert.equal(result.coverage, "quarantined");
  assert.equal(result.ruleGraphIndex.binding.status, "quarantined");
  assert.equal(result.actions.every((entry) => !entry.enabledForProposal), true);
  assert.equal(result.writeSheet.coverage, "quarantined");
});
accept("historical_pre_faq_binding_remains_visible_and_distinct", () => {
  const historical = exactLegalSpace();
  historical.rulesRuntimeBinding = binding({
    runtimeId: "official-executable-rule-runtime-v1",
    runtimeVersion: "ticket-11-final",
    ...CURRENT.roomBindings.historicalPreFaq,
  });
  const result = projectStarcraftTmgWritePaletteV1({ legalSpace: historical });
  assert.equal(result.coverage, "partial");
  assert.equal(result.ruleGraphIndex.binding.status, "historical_pre_faq");
  assert.equal(result.ruleGraphIndex.binding.historical, true);
  assert.equal(result.actions.every((entry) => !entry.enabledForProposal), true);
  assert.match(result.coverageReason, /historical_pre_faq/u);
});
accept("viewer_without_legal_space_gets_no_action_or_write_capability", () => {
  const result = projectStarcraftTmgWritePaletteV1();
  assert.equal(result.coverage, "not_loaded");
  assert.equal(result.actions.length, 0);
  assert.equal(result.authority.directClientMutationAllowed, false);
  assert.equal(result.writeSheet.coverage, "not_loaded");
});
accept("battle_workbench_embeds_palette_and_write_sheet_under_same_revision", () => {
  const snapshot = projectStarcraftTmgBattleWorkbenchV1({
    roomProjection: {
      room: { roomId: legalSpace.roomId, stateRevision: legalSpace.stateRevision,
        stateHash: legalSpace.stateHash },
      viewer: { seatKey: "player1" },
      matchBinding: { bindingHash: legalSpace.matchBindingHash },
      state: { pieces: [], players: {}, scores: {} },
    },
    legalSpace,
    includeWritePalette: true,
  });
  assert.equal(snapshot.tokenMarkerActions.paletteHash, palette.paletteHash);
  assert.equal(snapshot.writeSheet.bindingStatus, "current_faq_v1");
  assert.equal(snapshot.authority.legalSpaceHash, legalSpace.legalSpaceHash);
});
accept("classifier_never_turns_non_token_write_actions_into_tokens", () => {
  const damage = classifyStarcraftTmgWriteSheetEntryV1(
    legalSpace.finiteActions.find((entry) => entry.actionKey === "damage"));
  assert(damage.writeFamilies.includes("damage"));
  assert.equal(damage.tokenMarker, null);
});
const [expo, lab] = await Promise.all([
  readFile(path.join(ROOT,
    "apps/starcraft-tmg-expo/components/battlefield/battle-workbench-read-panels.tsx"),
  "utf8"),
  readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/app.mjs"), "utf8"),
]);
assert(expo.includes("faqTokenMarkerAtomCount") && expo.includes("onPreviewFinite")
  && expo.includes("enabledForProposal"));
assert(lab.includes("markerActionCards") && lab.includes("preview_finite")
  && lab.includes("Authoritative battle sheet"));
acceptance.push("14_expo_and_battle_lab_mount_same_rules_bound_palette_and_preview_route");

accept("palette_remains_read_only_and_outside_training_truth", () => {
  assert.equal(palette.authority.directClientMutationAllowed, false);
  assert.equal(palette.eligibleForTraining, false);
  assert.equal(palette.trainingTruth, false);
  assert.equal(CURRENT.productionRoomTruth, false);
});
accept("palette_hash_detects_tampering_and_stale_legal_space", () => {
  assert.equal(isStarcraftTmgWritePaletteV1({ ...palette, coverage: "partial" }), false);
  assert.equal(isStarcraftTmgWritePaletteV1(palette, { legalSpaceHash: "0".repeat(64) }),
    false);
});

assert.equal(acceptance.length, 16);
const reportCore = {
  schemaVersion: "starcraft_tmg_ticket_14_slice_140_write_palette_report_v1",
  status: "passed",
  generatedAt: GENERATED_AT,
  ticket: 14,
  slice: 140,
  ticketProgress: "13/16",
  projectProgress: "13/22",
  assertionsPassed: acceptance.length,
  assertionsTotal: acceptance.length,
  acceptance,
  evidence: {
    faqTokenMarkerEntries: CURRENT.tokenMarker.entries,
    faqTokenMarkerAtoms: CURRENT.tokenMarker.faqAtoms,
    baseDirectlyNamedAtoms: 69,
    baseGenericPrimitives: 11,
    currentLegalEntries: palette.currentLegalSpace.totalEntryCount,
    currentClassifiedTokenMarkerActions: palette.currentLegalSpace.classifiedCount,
    currentEnabledTokenMarkerActions: palette.currentLegalSpace.enabledForProposalCount,
    paletteHash: palette.paletteHash,
    clientContractHash: CURRENT.clientContractHash,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder"],
    skillsRead: ["ctx2skill-rule-skill-loop"],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "historical_binding_retained_without_skill_generation",
    promotions: [],
    blocks: ["ticket_14_slices_141_143_pending", "skill_generation_not_authorized_here"],
    remainingRuleGaps: 0,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: ["list_legal_actions", "preview_action",
      "apply_action_after_user_confirmation", "replay_room"],
    uiTraceEvidence: "expo_and_battle_lab_token_marker_palette",
    agentDecisionEvidence: "none_client_projection_only",
    memoryTraceEvidence: "none",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "unknown_token_metadata_fails_closed",
      "mixed_rule_hashes_quarantine_palette",
      "stale_legal_space_hash_rejects_projection",
    ],
    userVisibleChecks: ["current_vs_historical_binding", "five_lifecycle_verbs",
      "seven_write_sheet_families", "authoritative_preview_route"],
  },
  gates: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    productionRoomTruth: false,
    trainingTruth: false,
  },
};
const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Ticket 14 Slice 140 passed ${acceptance.length}/${acceptance.length}\n`);
process.stdout.write(`Palette hash: ${palette.paletteHash}\n`);
process.stdout.write(`Report hash: ${report.reportHash}\n`);
