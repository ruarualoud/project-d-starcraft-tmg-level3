import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCombatEffectDenominatorV4 } from
  "./official-combat-effect-denominator-v4.mjs";
import { createOfficialHealResolutionKernelV1 } from
  "./official-heal-resolution-kernel-v1.mjs";
import {
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_TYPE,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_DEPENDENCY_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_TRANSITION_SCHEMA,
} from "./official-medic-medpack-active-executor-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_medic_medpack_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_combat_tag_shielded_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "7264c7cf282dfd74416662f9735ba552559a8e4ef503e428f66f6f442fc4cc4c";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "43f0064e299b6b03fc99111cfe4dc2ec132cc52ee06bc09f7b9b1dff86ad4b4b";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "4c72c2953a71db039e0391c2643a2228ba36cfd727cf1b105b6ffacdae20ca93";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 394;
const EXPECTED_REVIEW_COUNT = 518;
const EXPECTED_DISPLAY_COUNT = 114;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const REJECTION_CODES = Object.freeze([
  "HEAL_CURRENT_MODELS_INVALID",
  "HEAL_DAMAGE_MARKER_INVALID",
  "HEAL_DESTROYED_MODEL_DENOMINATOR_INVALID",
  "HEAL_LIFECYCLE_INVARIANT_BROKEN",
  "MEDPACK_ACTION_INVALID",
  "MEDPACK_ACTION_MISMATCH",
  "MEDPACK_ACTION_STALE",
  "MEDPACK_ACTION_WINDOW_INVALID",
  "MEDPACK_ALREADY_ACTIVATED",
  "MEDPACK_FULL_COST_UNAVAILABLE",
  "MEDPACK_LATEST_OFFICIAL_DATA_REQUIRED",
  "MEDPACK_LINE_OF_SIGHT_SCOPE_UNSUPPORTED",
  "MEDPACK_MATCHING_RESOURCE_REQUIRED",
  "MEDPACK_MID_ACTION_PROHIBITED",
  "MEDPACK_NAMED_ABILITY_ALREADY_USED_THIS_ROUND",
  "MEDPACK_NOT_ACTIVE_SIDE",
  "MEDPACK_OFFICIAL_PROFILE_DRIFT",
  "MEDPACK_RESERVE_PROHIBITED",
  "MEDPACK_TARGET_NOT_ANOTHER_FRIENDLY_UNIT",
  "MEDPACK_TARGET_OUT_OF_RANGE",
  "MEDPACK_UNIT_SCOPE_UNSUPPORTED",
  "MEDPACK_WRONG_PHASE",
]);

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
    fail("MEDPACK_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  verifyOfficialCombatEffectDenominatorV4(previousSlice.combatEffectDenominator);
  if (audit.counts.byDisposition.executable !== 365
    || audit.counts.byDisposition.review_required !== 547
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("MEDPACK_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) fail("MEDPACK_SOURCE_CLAUSE_MISSING", atom.atomId);
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "medic-medpack:");
  return {
    positiveFixtureIds: [
      `${slug}:before-action-medpack-pays-one-cp-and-heals`,
      `${slug}:after-action-medpack-preserves-event-order`,
    ],
    negativeFixtureIds: [
      `${slug}:no-ready-cp-card-no-activation`,
      `${slug}:enemy-reserve-mid-action-out-of-range-and-repeat-fail-closed`,
    ],
    interactionFixtureIds: [
      `${slug}:within-count-drives-heal-x-and-hold-completes-activation`,
      `${slug}:friendly-biological-range-los-payment-and-heal-compose`,
    ],
    lifecycleFixtureIds: [
      `${slug}:destroyed-models-never-return`,
      `${slug}:heal-below-shield-threshold-does-not-restore-lost-shielded`,
    ],
    replayFixtureIds: [
      `${slug}:authority-ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-versions-medic-marine-cards-parts-2-4-5-10-11-and-pdfs`,
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
    timing: { phase: "movement", window: "before_or_after_hold_action", priority: 70 },
    preconditions: [{
      predicateId: "active_ability.source_is_currently_activating_on_battlefield",
      inputSchema: "starcraft_tmg_official_medic_medpack_plan_v1",
      failureCode: "MEDPACK_RESERVE_PROHIBITED",
    }, {
      predicateId: "ability.target_is_another_friendly_biological_unit_within_four_and_los",
      inputSchema: "starcraft_tmg_official_medpack_within_receipt_v1",
      failureCode: "MEDPACK_TARGET_OUT_OF_RANGE",
    }, {
      predicateId: "resource.full_matching_cp_cost_is_paid_before_resolution",
      inputSchema: "starcraft_tmg_official_card_resource_payment_v1",
      failureCode: "MEDPACK_FULL_COST_UNAVAILABLE",
    }, {
      predicateId: "heal.reduces_damage_without_respawn_or_shielded_restoration",
      inputSchema: "starcraft_tmg_official_heal_resolution_v1",
      failureCode: "HEAL_LIFECYCLE_INVARIANT_BROKEN",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MEDIC_MEDPACK_ACTIVE_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_MEDIC_MEDPACK_ACTIVE_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialMedicMedpackRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("MEDPACK_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_TYPE],
    transitionSchema: OFFICIAL_MEDIC_MEDPACK_ACTIVE_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.37.0-official-medic-medpack-active",
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
    fail("MEDPACK_CATALOGUE_INVALID");
  }
  const healKernel = createOfficialHealResolutionKernelV1();
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
    newlyExecutableRuleAtomIds: [...OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID],
    executableScope:
      "current_terran_medic_medpack_before_or_after_hold_into_another_friendly_marine_with_exact_cp_payment_clear_los_and_round_bases",
    medpackProgress: {
      currentOfficialCarrier: "Medic",
      currentOfficialTarget: "Marine",
      phase: "movement",
      windowsExecutable: ["before_action", "after_action"],
      underlyingAction: "hold",
      resourceType: "CP",
      resourceCost: 1,
      paymentCard: "Terran Armed Forces",
      targetRequirement: "another_friendly_biological_unit_within_4_and_los",
      healXSource: "medic_models_within_4_of_target_unit",
      destroyedModelReturnProhibited: true,
      shieldedRestorationProhibited: true,
      namedAbilityOncePerUnitPerRound: true,
      reserveAndMidActionUseProhibited: true,
      academyReductionReactionResolved: false,
      academyReductionPolicy:
        "fixture_card_is_exhausted_and_reaction_execution_remains_review_required",
    },
    healResolutionKernel: clone(healKernel.descriptor),
    effectKernel: clone(input.previousSlice.effectKernel),
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
      livePart2DocumentCanonicalHash:
        "32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929",
      livePart4DocumentCanonicalHash:
        "bd4ad276a2ea528824be4501faedf0249fc164ab8918c0c240f692a1a0a98424",
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
      completedBeforeThisSlice: 35,
      remainingActionableAtomsBeforeThisSlice: 547,
      completedAfterThisSlice: 36,
      averageAtomsPerSliceAfterThisSlice: 10.9444,
      remainingActionableAtomsAfterThisSlice: 518,
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
      actionSchemaVersion: "hybrid_legal_space_v6",
      previousActionSchemaVersion: "hybrid_legal_space_v5",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "active_before_and_after_action_windows",
        "cp_payment_and_exhausted_lockout",
        "friendly_biological_within_and_clear_los",
        "heal_damage_no_respawn_and_no_shielded_restore",
        "authority_replay_and_tamper_reject",
      ],
      crossTimeReplayResult:
        "slice35_combat_tag_shielded_and_slice36_medic_medpack_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "academy-cost-reduction-reaction-remains-review-required",
        "remaining-518-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 518,
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
        "abilityWindow",
        "cardResourceId",
        "resourceType",
        "resourceCost",
        "contributingModelIds",
        "amount",
        "lineOfSightStatus",
        "targetRangeMilliInches",
        "targetDistanceMilliInches",
        "abilityPlanHash",
      ],
      uiTraceEvidence: [
        "before-and-after-hold-medpack-actions-are-distinct-before-confirmation",
        "cp-card-heal-x-distance-and-los-are-preview-visible",
        "exhausted-payment-card-removes-repeat-action-from-legal-space",
      ],
      agentDecisionEvidence: [
        "rules-own-timing-target-payment-heal-and-once-per-round-eligibility",
        "agent-cannot-invent-free-out-of-range-enemy-reserve-or-mid-action-medpack",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-medic-card-or-parts-2-4-5-10-11-drift-demotes-slice-36",
        "payment-heal-authority-or-replay-failure-demotes-slice-36",
      ],
      userVisibleChecks: [
        "medpack-may-resolve-before-or-after-the-units-hold-action",
        "one-ready-terran-armed-forces-card-pays-one-cp-and-becomes-exhausted",
        "heal-x-equals-medic-models-within-four-inches-of-the-target-unit",
        "heal-reduces-damage-but-never-returns-models-or-restores-lost-shielded",
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
  if (changedNonTargetAtoms !== 0) fail("MEDPACK_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialMedicMedpackRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("MEDPACK_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMedicMedpackRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("MEDPACK_SLICE_CONTENT_MISMATCH");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_medic_medpack_rule_slice_audit_v1",
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
    rulesTruth: "official_current_medic_medpack_exact_subset",
    trainingTruth: false,
  });
}
