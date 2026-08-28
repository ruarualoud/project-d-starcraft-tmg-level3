import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCombatEffectDenominatorV4 } from
  "./official-combat-effect-denominator-v4.mjs";
import {
  OFFICIAL_ACADEMY_MEDIC_ABILITY_DEPENDENCY_ATOM_IDS,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_NEW_ATOM_IDS,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_TRANSITION_SCHEMA,
  OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
  OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE,
  OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
  OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
} from "./official-academy-medic-ability-executor-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
  OFFICIAL_CLEANUP_REFRESH_V3_NEW_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_V3_TRANSITION_SCHEMA,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_TRANSITION_SCHEMA,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_academy_optical_flare_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_medic_medpack_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "5ab56efe43938ac9458310be15886309218485f5e551dfdde734b9bf8f2871ec";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "49edf13886590b2539669a5881bab442113166e29edb5e0194d6197f850f2049";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "acead33c1486645a149466848b7d276c54c99c51261c641786e9633dafde815d";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 403;
const EXPECTED_REVIEW_COUNT = 509;
const EXPECTED_DISPLAY_COUNT = 114;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const TARGET_IDS = Object.freeze([
  ...OFFICIAL_ACADEMY_MEDIC_ABILITY_NEW_ATOM_IDS,
  ...OFFICIAL_CLEANUP_REFRESH_V3_NEW_ATOM_IDS,
].sort((left, right) => left.localeCompare(right)));

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
    fail("ACADEMY_OPTICAL_FLARE_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  verifyOfficialCombatEffectDenominatorV4(previousSlice.combatEffectDenominator);
  if (audit.counts.byDisposition.executable !== 394
    || audit.counts.byDisposition.review_required !== 518
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("ACADEMY_OPTICAL_FLARE_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("ACADEMY_OPTICAL_FLARE_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "academy-optical-flare:");
  return {
    positiveFixtureIds: [
      `${slug}:medpack-one-to-zero-cp`,
      `${slug}:optical-flare-two-to-one-cp`,
    ],
    negativeFixtureIds: [
      `${slug}:academy-once-per-round-and-stale-window-rejected`,
      `${slug}:range-target-and-full-payment-fail-closed`,
    ],
    interactionFixtureIds: [
      `${slug}:academy-remains-ready-then-pays-as-tactical-resource`,
      `${slug}:range-twelve-to-eight-and-long-range-disabled`,
    ],
    lifecycleFixtureIds: [
      `${slug}:status-persists-through-end-round-resolution`,
      `${slug}:cleanup-removes-status-marker-and-refreshes-cards`,
    ],
    replayFixtureIds: [
      `${slug}:authority-ed25519-multistep-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-versions-academy-medic-marine-parts-5-10-11-and-pdfs`,
    ],
  };
}

function abilityAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "movement", window: "declared_ability_reaction_then_resolution", priority: 75 },
    preconditions: [{
      predicateId: "academy.reaction_is_ready_unused_and_triggered_by_friendly_support_cp_ability",
      inputSchema: "starcraft_tmg_academy_medic_ability_window_v1",
      failureCode: "ACADEMY_REACTION_ALREADY_USED_THIS_ROUND",
    }, {
      predicateId: "resource.modified_cp_cost_is_paid_exactly_or_zero_cost_uses_no_card",
      inputSchema: "starcraft_tmg_official_academy_medic_ability_resolution_v1",
      failureCode: "ACADEMY_MEDIC_FULL_COST_REQUIRED",
    }, {
      predicateId: "optical_flare_creates_typed_range_debuff_marker_with_zero_floor_and_no_long_range",
      inputSchema: "starcraft_tmg_official_optical_flare_status_v1",
      failureCode: "OPTICAL_FLARE_STATUS_INVALID",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
      transitionSchema: OFFICIAL_ACADEMY_MEDIC_ABILITY_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "ACADEMY_MEDIC_ACTION_STALE",
      "ACADEMY_MEDIC_FULL_COST_REQUIRED",
      "ACADEMY_MEDIC_TARGET_INVALID",
      "ACADEMY_MEDIC_TARGET_OUT_OF_RANGE",
      "ACADEMY_REACTION_ALREADY_USED_THIS_ROUND",
      "OPTICAL_FLARE_STATUS_INVALID",
    ],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_ACADEMY_MEDIC_ABILITY_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

function cleanupAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player" },
    timing: { phase: "cleanup", window: "after_end_round_effect_resolution", priority: 95 },
    preconditions: [{
      predicateId: "optical_flare_status_and_marker_persist_through_end_round_then_leave_during_cleanup",
      inputSchema: "starcraft_tmg_official_optical_flare_cleanup_resolution_v3",
      failureCode: "OPTICAL_FLARE_CLEANUP_DENOMINATOR_INVALID",
    }],
    legalSpace: {
      kind: "finite",
      actionType: "cleanup_and_refresh",
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLEANUP_REFRESH_V3_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "OPTICAL_FLARE_END_OF_ROUND_PROGRESS_INVALID",
      "OPTICAL_FLARE_CLEANUP_PROGRESS_INVALID",
      "OPTICAL_FLARE_CLEANUP_DENOMINATOR_INVALID",
      "OPTICAL_FLARE_CLEANUP_STALE",
    ],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_ACADEMY_MEDIC_ABILITY_NEW_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialAcademyOpticalFlareRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(TARGET_IDS);
  const cleanupIds = new Set(OFFICIAL_CLEANUP_REFRESH_V3_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return cleanupIds.has(atom.atomId)
      ? cleanupAtom(atom, clauseById, base.rulesVersion)
      : abilityAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("ACADEMY_OPTICAL_FLARE_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
      OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE,
      OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
      OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
    ].sort(),
    transitionSchema: OFFICIAL_ACADEMY_MEDIC_ABILITY_TRANSITION_SCHEMA,
  }, {
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
    actionTypes: ["resolve_end_of_round_effects"],
    transitionSchema: OFFICIAL_END_OF_ROUND_EFFECTS_V3_TRANSITION_SCHEMA,
  }, {
    executorId: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
    actionTypes: ["cleanup_and_refresh"],
    transitionSchema: OFFICIAL_CLEANUP_REFRESH_V3_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.38.0-official-academy-optical-flare",
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
    fail("ACADEMY_OPTICAL_FLARE_CATALOGUE_INVALID");
  }
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
    medpackProgress: clone(input.previousSlice.medpackProgress),
    newlyExecutableRuleAtomIds: [...TARGET_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
      OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
      OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
    ],
    executableScope:
      "current_academy_advanced_training_on_medic_medpack_and_optical_flare_with_exact_cp_reduction_typed_range_debuff_marker_and_cleanup_removal",
    academyOpticalFlareProgress: {
      academyReactionOncePerRound: true,
      academyReactionExhaustsCard: false,
      medpackCostBeforeAfter: [1, 0],
      opticalFlareCostBeforeAfter: [2, 1],
      tacticalAcademyCardMayPayReducedOpticalFlareCost: true,
      generatedResourceRetained: 0,
      opticalFlareRangeInches: 12,
      rangeDebuffValue: 4,
      characteristicFloor: 0,
      longRangeAllowedAfterDebuff: false,
      persistsThroughEndRoundResolution: true,
      removedDuringCleanup: true,
      defaultActiveAbilityExpiryPromoted: false,
      defaultActiveAbilityExpiryPolicy:
        "optical_flare_has_explicit_until_end_of_round_text_so_the_generic_default_atom_remains_review_required",
    },
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
      officialDatasetHash: CURRENT_DATASET_HASH,
      gameplayDataBundleHash:
        "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b",
      liveVersionsDocumentCanonicalHash:
        "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
      liveMedicDocumentCanonicalHash:
        "35e272e5aa48b372d982991fe6f182a355d9caa90cc3f4630b34320429465e35",
      liveMarineDocumentCanonicalHash:
        "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
      liveAcademyDocumentCanonicalHash:
        "0a1a205eabe0a9b2989fd879365096e295c31ef3e0f4983018b4249cd00d1695",
      liveTerranArmedForcesDocumentCanonicalHash:
        "832aabd98a5ebad69458c9fd111f0d1fea469634a16cffdcd6ac3d3e86438daa",
      livePart5DocumentCanonicalHash:
        "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
      livePart10DocumentCanonicalHash:
        "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
      livePart11DocumentCanonicalHash:
        "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
      coreRuleContentHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pContentHash:
        "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 36,
      remainingActionableAtomsBeforeThisSlice: 518,
      completedAfterThisSlice: 37,
      averageAtomsPerSliceAfterThisSlice: 10.8919,
      remainingActionableAtomsAfterThisSlice: 509,
      forecastRemainingSlicesAfterThisSlice: 47,
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
      actionSchemaVersion: "hybrid_legal_space_v7",
      previousActionSchemaVersion: "hybrid_legal_space_v6",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "academy_reaction_use_and_pass_windows",
        "medpack_zero_cost_no_card_payment",
        "optical_flare_reduced_cost_tactical_card_payment",
        "range_debuff_floor_and_long_range_prohibition",
        "end_round_persistence_and_cleanup_removal",
        "authority_multistep_replay_and_tamper_reject",
      ],
      crossTimeReplayResult:
        "slice36_medic_medpack_and_slice37_academy_optical_flare_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "generic-default-active-ability-expiry-remains-review-required",
        "remaining-509-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 509,
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
      observationContract: [
        "pendingAbilityHash",
        "reactionCardId",
        "originalResourceCost",
        "modifiedResourceCost",
        "costReduction",
        "cardResourceIds",
        "statusEffectHash",
        "effectiveRangeInches",
        "longRangeAllowed",
      ],
      uiTraceEvidence: [
        "declare-use-or-pass-resolve-stages-are-separate-confirmed-actions",
        "academy-do-not-exhaust-and-later-resource-payment-are-distinct-events",
        "typed-range-debuff-marker-and-cleanup-removal-are-visible",
      ],
      agentDecisionEvidence: [
        "rules-own-reaction-eligibility-cost-floor-payment-and-once-round-ledger",
        "agent-cannot-invent-free-resource-retention-long-range-or-stale-reaction",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-academy-medic-or-parts-5-10-11-drift-demotes-slice-37",
        "cost-status-lifecycle-authority-or-replay-failure-demotes-slice-37",
      ],
      userVisibleChecks: [
        "medpack-cost-reduces-from-one-to-zero-with-no-payment-card",
        "optical-flare-cost-reduces-from-two-to-one-and-academy-can-pay-after-reaction",
        "marine-range-example-reduces-from-twelve-to-eight-and-long-range-is-disabled",
        "optical-flare-persists-through-end-round-resolution-and-leaves-in-cleanup",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
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
  if (changedNonTargetAtoms !== 0) fail("ACADEMY_OPTICAL_FLARE_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialAcademyOpticalFlareRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("ACADEMY_OPTICAL_FLARE_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialAcademyOpticalFlareRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("ACADEMY_OPTICAL_FLARE_SLICE_CONTENT_MISMATCH");
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
    schema: "starcraft_tmg_official_academy_optical_flare_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    combatEffectDenominatorHash: input.slice.combatEffectDenominatorHash,
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
    rulesTruth: "official_current_academy_optical_flare_exact_subset",
    trainingTruth: false,
  });
}
