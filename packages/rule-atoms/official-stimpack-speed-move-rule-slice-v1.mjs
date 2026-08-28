import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCharacteristicStatusKernelV2,
} from "./official-characteristic-status-kernel-v2.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_MOVE_NEW_ATOM_IDS,
  OFFICIAL_STIMPACK_MOVE_PARAMETER_KIND,
  OFFICIAL_STIMPACK_MOVE_TRANSITION_SCHEMA,
} from "./official-stimpack-move-consumer-executor-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_stimpack_speed_move_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_marine_stimpack_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "7ae981afe360688f6974a734a938d3bbecd8e68a83acebc394f4995851953322";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "f11ffcd0a8e07bb6fb9be6498fc69b31575ff3176ab7daa55c0ad92bf2f9d2d9";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "d7ae88eb24d20313aebca63a2c43a6a2ae4c5f000ff92a896864f10710fe89fe";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 421;
const EXPECTED_REVIEW_COUNT = 491;
const EXPECTED_DISPLAY_COUNT = 114;
const TARGET_IDS = Object.freeze([...OFFICIAL_STIMPACK_MOVE_NEW_ATOM_IDS]);

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
    fail("STIMPACK_SPEED_MOVE_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 420
    || audit.counts.byDisposition.review_required !== 492
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("STIMPACK_SPEED_MOVE_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("STIMPACK_SPEED_MOVE_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "stimpack-speed-move:");
  return {
    positiveFixtureIds: [
      `${slug}:printed-seven-plus-buff-three-allows-ten-inch-path`,
      `${slug}:ability-resolves-before-the-standard-move`,
    ],
    negativeFixtureIds: [
      `${slug}:base-speed-only-path-rejects-without-stimpack-domain`,
      `${slug}:over-ten-collision-engagement-stale-and-payment-reject`,
    ],
    interactionFixtureIds: [
      `${slug}:non-lethal-two-status-marker-and-move-share-one-transition`,
      `${slug}:post-move-c14-precision-and-cleanup-remain-compatible`,
    ],
    lifecycleFixtureIds: [
      `${slug}:stimpack-persists-after-move-through-eor-until-cleanup`,
    ],
    replayFixtureIds: [
      `${slug}:both-seats-ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-marine-parts-8-10-11-and-core-terran-pdfs`,
    ],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: {
      phase: "movement",
      window: "active_ability_immediately_before_standard_move",
      priority: 63,
    },
    preconditions: [{
      predicateId:
        "stimpack_move.current_single_marine_ready_cp_unactivated_unengaged_and_source_bound",
      inputSchema: "starcraft_tmg_official_stimpack_move_plan_v1",
      failureCode: "STIMPACK_MOVE_BEFORE_ACTION_UNAVAILABLE",
    }],
    legalSpace: {
      kind: "parameter_domain",
      actionType: "move",
      parameterSchema: OFFICIAL_STIMPACK_MOVE_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
      transitionSchema: OFFICIAL_STIMPACK_MOVE_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "STIMPACK_MOVE_ACTION_STALE",
      "STIMPACK_MOVE_BEFORE_ACTION_UNAVAILABLE",
      "STIMPACK_MOVE_EFFECTIVE_SPEED_DRIFT",
      "STIMPACK_MOVE_ENEMY_ENGAGEMENT_RANGE",
      "STIMPACK_LATEST_OFFICIAL_DATA_REQUIRED",
      "STIMPACK_MOVE_PARAMETER_DOMAIN_STALE",
      "STIMPACK_MOVE_PATH_COLLISION",
      "STIMPACK_MOVE_PATH_EXCEEDS_BUFFED_SPEED",
      "STIMPACK_MOVE_PAYMENT_CARD_STALE",
    ],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS.filter((atomId) => (
        !TARGET_IDS.includes(atomId)
      )),
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialStimpackSpeedMoveRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(TARGET_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...TARGET_IDS].sort())) {
    fail("STIMPACK_SPEED_MOVE_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
    actionTypes: ["move"],
    transitionSchema: OFFICIAL_STIMPACK_MOVE_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.42.0-official-stimpack-speed-move",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: clone(base.sourceSnapshots),
    sourceClauses: clone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("STIMPACK_SPEED_MOVE_CATALOGUE_INVALID");
  }
  const characteristicKernel = createOfficialCharacteristicStatusKernelV2();
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
    characteristicStatusKernelV2: clone(characteristicKernel.descriptor),
    newlyExecutableRuleAtomIds: [...TARGET_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID],
    executableScope:
      "current_single_model_marine_stimpack_immediately_before_empty_terrain_standard_move_printed_speed_seven_plus_buff_three_exact_ten_inch_parameter_domain",
    stimpackSpeedMoveProgress: {
      sourceUnit: "Marine",
      activeAbilityWindow: "before_action",
      underlyingAction: "move",
      printedSingleModelSpeedInches: 7,
      valueCharacteristicModifier: 3,
      effectiveSpeedInches: 10,
      exactOneModelPathParameterDomain: true,
      abilityAndMoveShareOneAuthorityTransition: true,
      nonLethalDamageAndPaymentBeforeMovement: true,
      futureRangedPrecisionAndCleanupCompatibilityRetained: true,
      afterMoveActiveWindowExecutable: false,
      stimpackEligibleBaseMoveWithoutAbilityExecutable: false,
      runChargeDeployCloseRanksSpeedConsumersExecutable: false,
      closeCombatPrecisionConsumerExecutable: false,
      unsupportedGeometryFailsClosed: true,
    },
    officialDataPolicy: clone(input.previousSlice.officialDataPolicy),
    sliceForecast: {
      completedBeforeThisSlice: 40,
      remainingActionableAtomsBeforeThisSlice: 492,
      completedAfterThisSlice: 41,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 41).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 48,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      previousEffectDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v11",
      previousActionSchemaVersion: "hybrid_legal_space_v10",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "buff_value_characteristic_addition",
        "stimpack_before_move_ten_inch_parameter_domain",
        "over_ten_collision_engagement_and_stale_domain_reject",
        "post_move_ranged_precision_and_cleanup_compatibility",
        "both_seats_authority_replay_and_tamper_reject",
        "slice40_cross_time_replay",
      ],
      crossTimeReplayResult:
        "slice40_stimpack_hold_and_slice41_stimpack_move_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "close-combat-precision-consumer-remains-review-required",
        "stimpack-eligible-base-move-without-using-the-ability-remains-review-required",
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
        "stimpack-move-domain-shows-printed-seven-buff-three-effective-ten",
        "ability-payment-non-lethal-status-and-move-resolve-in-source-order",
      ],
      agentDecisionEvidence: [
        "agent-can-only-select-a-path-instantiated-by-the-rules-owned-domain",
        "harness-cannot-add-a-speed-modifier-or-insert-an-active-mid-move",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-marine-or-parts-8-10-11-drift-demotes-slice-41",
        "path-domain-source-order-compatibility-authority-or-replay-failure-demotes-slice-41",
      ],
      userVisibleChecks: [
        "player-sees-a-ten-inch-domain-after-electing-to-use-stimpack-before-move",
        "player-sees-one-cp-payment-and-two-non-lethal-damage-before-movement",
        "paths-beyond-ten-inches-or-through-an-enemy-are-rejected",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "close-combat-precision-and-other-speed-consumers-pending",
      "stimpack-eligible-base-move-without-ability-use-pending",
      "production-complete-legal-space-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  if (changedNonTargetAtoms !== 0) fail("STIMPACK_SPEED_MOVE_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialStimpackSpeedMoveRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("STIMPACK_SPEED_MOVE_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialStimpackSpeedMoveRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("STIMPACK_SPEED_MOVE_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(TARGET_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_stimpack_speed_move_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    combatEffectDenominatorHash: input.slice.combatEffectDenominatorHash,
    characteristicStatusKernelV2Hash:
      input.slice.characteristicStatusKernelV2.kernelHash,
    newlyExecutableRuleAtomIds: [...input.slice.newlyExecutableRuleAtomIds],
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: input.slice.newlyExecutableRuleAtomIds.length,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_current_stimpack_speed_move_composition_exact_subset",
    trainingTruth: false,
  });
}
