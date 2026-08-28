import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialMarineMoveGeometryKernelV2,
} from "./official-marine-move-geometry-kernel-v2.mjs";
import {
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_TRANSITION_SCHEMA,
} from "./official-marine-optional-stimpack-move-executor-v2.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_marine_optional_stimpack_move_rule_slice_v2";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_stimpack_speed_move_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "e02af2917e9100144242c26d5410251742d84d508b01d639401cbc720c2ab5e7";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "d3edd16def3f9ba7a5035800ff1285233cece3144c047ff74ad3e79f56f96712";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "6206a3058aec4ec9750a27465b5c203049b50a9cb7bafb7763be39810a3ece86";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 421;
const EXPECTED_REVIEW_COUNT = 491;
const EXPECTED_DISPLAY_COUNT = 114;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || previousSlice.combatEffectDenominatorHash !== EXPECTED_EFFECT_DENOMINATOR_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("OPTIONAL_STIMPACK_MOVE_SLICE_PREVIOUS_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("OPTIONAL_STIMPACK_MOVE_SLICE_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

export function createOfficialMarineOptionalStimpackMoveRuleSliceV2(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    actionTypes: ["move"],
    transitionSchema: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.43.0-official-marine-optional-stimpack-move",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: clone(base.sourceSnapshots),
    sourceClauses: clone(base.sourceClauses),
    atoms: clone(base.atoms),
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("OPTIONAL_STIMPACK_MOVE_SLICE_CATALOGUE_INVALID");
  }
  const geometryKernel = createOfficialMarineMoveGeometryKernelV2();
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    combatEffectDenominator: clone(input.previousSlice.combatEffectDenominator),
    combatEffectDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
    combatEffectCorrectionReceiptHash:
      input.previousSlice.combatEffectCorrectionReceiptHash,
    effectKernel: clone(input.previousSlice.effectKernel),
    healResolutionKernel: clone(input.previousSlice.healResolutionKernel),
    totalDamageReactionKernel: clone(input.previousSlice.totalDamageReactionKernel),
    medpackProgress: clone(input.previousSlice.medpackProgress),
    academyOpticalFlareProgress: clone(input.previousSlice.academyOpticalFlareProgress),
    restorationRangeProgress: clone(input.previousSlice.restorationRangeProgress),
    lifeSupportProgress: clone(input.previousSlice.lifeSupportProgress),
    marineStimpackKernel: clone(input.previousSlice.marineStimpackKernel),
    characteristicStatusKernelV2: clone(input.previousSlice.characteristicStatusKernelV2),
    marineMoveGeometryKernelV2: clone(geometryKernel),
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID],
    executableScope:
      "current_official_marine_one_to_nine_models_split_speed_base_or_stimpack_before_move_empty_terrain_round_base_exact_composition",
    optionalStimpackMoveProgress: {
      sourceUnit: "Marine",
      sourceSplitSpeed: "4/7",
      splitSpeedSelectionUsesCurrentRemainingModelCount: true,
      initiallySingleModelUsesSecondValue: true,
      multiModelBaseMoveInches: 4,
      multiModelStimpackMoveInches: 7,
      singleModelBaseMoveInches: 7,
      singleModelStimpackMoveInches: 10,
      baseAndStimpackDomainsCoexistWhenPaymentAvailable: true,
      baseDomainSurvivesWhenPaymentUnavailable: true,
      casualtiesForceFreshSplitSpeedDomain: true,
      multiModelOrderedPlacementAndCoherencyExecutable: true,
      abilityPaymentDamageAndStatusAbsentFromBaseBranch: true,
      abilityPaymentDamageAndStatusResolveBeforeStimpackMove: true,
      oldSingleModelStimpackMoveV1Frozen: true,
      terrainAccessElevationFlyingAndOtherUnitsExecutable: false,
      afterMoveActiveWindowExecutable: false,
      runChargeDeployCloseRanksSpeedConsumersExecutable: false,
      closeCombatPrecisionConsumerExecutable: false,
    },
    officialDataPolicy: clone(input.previousSlice.officialDataPolicy),
    sliceForecast: {
      completedBeforeThisSlice: 41,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 42,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 42).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 49,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
      compositionOnlySlice: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      previousEffectDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v12",
      previousActionSchemaVersion: "hybrid_legal_space_v11",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "multi_model_base_four_and_stimpack_seven_domains",
        "single_model_base_seven_and_stimpack_ten_domains",
        "reduced_to_single_model_rederives_second_speed_value",
        "payment_unavailable_removes_only_stimpack_domain",
        "base_branch_preserves_card_damage_status_marker_and_ability_history",
        "multi_model_path_placement_overlap_engagement_coherency_and_stale_reject",
        "both_seats_authority_replay_hmac_rotation_and_tamper_reject",
        "slice41_cross_time_replay",
      ],
      crossTimeReplayResult:
        "slice41_single_model_v1_and_slice42_optional_scale_v2_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "close-combat-precision-consumer-remains-review-required",
        "remaining-speed-consumers-remain-review-required",
        "remaining-491-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 491,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt"],
      harnessToolsCalled: [
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
      ],
      uiTraceEvidence: [
        "same-state-shows-base-and-stimpack-move-domains-with-distinct-costs",
        "multi-model-shows-four-or-seven-and-single-model-shows-seven-or-ten",
      ],
      agentDecisionEvidence: [
        "opponent-can-compare-but-not-invent-base-versus-stimpack-domain",
        "resource-unavailable-state-keeps-legal-base-move-visible",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-marine-speed-stimpack-core-or-p2p-drift-demotes-slice-42",
        "scale-choice-geometry-authority-or-replay-failure-demotes-slice-42",
      ],
      userVisibleChecks: [
        "multi-model-player-sees-four-inch-base-and-seven-inch-stimpack-options",
        "single-model-player-sees-seven-inch-base-and-ten-inch-stimpack-options",
        "exhausted-payment-card-removes-only-the-stimpack-option",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "close-combat-precision-and-other-speed-consumers-pending",
      "terrain-access-elevation-flying-and-other-unit-movement-pending",
      "production-complete-legal-space-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedAtoms = slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
  )).length;
  if (changedAtoms !== 0) fail("OPTIONAL_STIMPACK_MOVE_SLICE_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialMarineOptionalStimpackMoveRuleSliceV2(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("OPTIONAL_STIMPACK_MOVE_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineOptionalStimpackMoveRuleSliceV2(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("OPTIONAL_STIMPACK_MOVE_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const changedAtoms = input.slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_marine_optional_stimpack_move_rule_slice_audit_v2",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    combatEffectDenominatorHash: input.slice.combatEffectDenominatorHash,
    marineMoveGeometryKernelV2Hash: input.slice.marineMoveGeometryKernelV2.kernelHash,
    newlyExecutableRuleAtomIds: [],
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: 0,
      changedAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth:
      "official_current_marine_scale_and_optional_stimpack_move_composition_exact_subset",
    trainingTruth: false,
  });
}
