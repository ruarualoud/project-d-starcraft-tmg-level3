import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCombatEffectDenominatorV4 } from
  "./official-combat-effect-denominator-v4.mjs";
import {
  OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS,
  OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
  OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_RESTORATION_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_RESTORATION_TRANSITION_SCHEMA,
  OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
  OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
} from "./official-medic-restoration-reaction-executor-v1.mjs";
import {
  OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE,
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION,
  OFFICIAL_OPTICAL_FLARE_RANGED_TRANSITION_SCHEMA,
} from "./official-optical-flare-ranged-consumer-executor-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_restoration_range_consumer_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_academy_optical_flare_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "9e1fef200fda7faaac81faca0a945be7470e5f91ad56a7e95c526306a611e26e";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "3900f94952042d1b9fa44b7147fee81ac138079d0c7ae28021e14c05113a8a57";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "27437fb6976ce3d4ead8b2257123f3d61d320e6a52c87bcb165b17add1238673";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 407;
const EXPECTED_REVIEW_COUNT = 505;
const EXPECTED_DISPLAY_COUNT = 114;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const TARGET_IDS = Object.freeze([...OFFICIAL_MEDIC_RESTORATION_NEW_ATOM_IDS]);

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
    fail("RESTORATION_RANGE_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  verifyOfficialCombatEffectDenominatorV4(previousSlice.combatEffectDenominator);
  if (audit.counts.byDisposition.executable !== 403
    || audit.counts.byDisposition.review_required !== 509
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("RESTORATION_RANGE_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("RESTORATION_RANGE_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "restoration-range:");
  return {
    positiveFixtureIds: [
      `${slug}:friendly-marine-receives-optical-flare-within-four`,
      `${slug}:restoration-pays-one-cp-and-removes-all-exact-debuffs`,
    ],
    negativeFixtureIds: [
      `${slug}:reserve-medic-and-used-same-name-reaction-suppressed`,
      `${slug}:stale-window-unknown-debuff-and-unpayable-cost-fail-closed`,
    ],
    interactionFixtureIds: [
      `${slug}:pass-keeps-range-minus-four-for-ranged-legal-space`,
      `${slug}:marine-c14-legal-at-eight-and-illegal-beyond-eight`,
    ],
    lifecycleFixtureIds: [
      `${slug}:restoration-removes-marker-immediately`,
      `${slug}:passed-status-remains-cleanup-owned`,
    ],
    replayFixtureIds: [
      `${slug}:authority-ed25519-reaction-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-versions-medic-marine-parts-2-10-11-and-pdfs`,
    ],
  };
}

function restorationAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "reacting_player" },
    timing: {
      phase: "any",
      window: "immediately_after_friendly_unit_receives_debuff",
      priority: 82,
    },
    preconditions: [{
      predicateId: "restoration.source_unit_is_on_field_within_four_and_unused_this_round",
      inputSchema: "starcraft_tmg_medic_restoration_reaction_window_v1",
      failureCode: "RESTORATION_REACTION_ALREADY_USED_THIS_ROUND",
    }, {
      predicateId: "restoration.exact_cp_payment_and_known_debuff_material_are_required",
      inputSchema: "starcraft_tmg_official_medic_restoration_transition_v1",
      failureCode: "RESTORATION_FULL_COST_REQUIRED",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MEDIC_RESTORATION_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "RESTORATION_ACTION_STALE",
      "RESTORATION_FULL_COST_REQUIRED",
      "RESTORATION_NESTED_ACADEMY_REACTION_UNSUPPORTED",
      "RESTORATION_REACTION_ALREADY_USED_THIS_ROUND",
      "RESTORATION_SIMULTANEOUS_REACTION_UNSUPPORTED",
      "RESTORATION_UNKNOWN_DEBUFF_FAIL_CLOSED",
    ],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS.filter((atomId) => (
        !TARGET_IDS.includes(atomId)
      ))],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialRestorationRangeConsumerRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(TARGET_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return restorationAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...TARGET_IDS].sort())) {
    fail("RESTORATION_RANGE_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
      OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
    ].sort(),
    transitionSchema: OFFICIAL_MEDIC_RESTORATION_TRANSITION_SCHEMA,
  }, {
    executorId: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE],
    transitionSchema: OFFICIAL_OPTICAL_FLARE_RANGED_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.39.0-official-restoration-range-consumer",
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
    fail("RESTORATION_RANGE_CATALOGUE_INVALID");
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
    academyOpticalFlareProgress: clone(input.previousSlice.academyOpticalFlareProgress),
    newlyExecutableRuleAtomIds: [...TARGET_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
      OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
    ],
    executableScope:
      "current_medic_restoration_after_optical_flare_with_exact_cp_payment_same_name_per_unit_round_ledger_and_marine_c14_range_status_consumption",
    restorationRangeProgress: {
      restorationTrigger: "friendly_unit_within_4_receives_debuff",
      restorationCostCp: 1,
      removesAllKnownExactDebuffsImmediately: true,
      reserveMedicReactionAvailable: false,
      sameNameReactionPerUnitPerRound: true,
      simultaneousMultipleRestorationSourcesExecutable: false,
      nestedAcademyReactionExecutable: false,
      passedOpticalFlareStatusPersists: true,
      marineC14PrintedRangeInches: 12,
      marineC14EffectiveRangeInches: 8,
      longRangeAllowedAfterOpticalFlare: false,
      rangedLegalAtEightInches: true,
      rangedLegalBeyondEightInches: false,
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
      livePart2DocumentCanonicalHash:
        "32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929",
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
      completedBeforeThisSlice: 37,
      remainingActionableAtomsBeforeThisSlice: 509,
      completedAfterThisSlice: 38,
      averageAtomsPerSliceAfterThisSlice: 10.7105,
      remainingActionableAtomsAfterThisSlice: 505,
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
      actionSchemaVersion: "hybrid_legal_space_v8",
      previousActionSchemaVersion: "hybrid_legal_space_v7",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "restoration_use_and_pass_trigger_window",
        "restoration_exact_cp_payment_and_all_known_debuff_removal",
        "same_name_per_unit_round_ledger_and_reserve_prohibition",
        "marine_c14_optical_flare_range_eight_boundary",
        "unknown_debuff_nested_and_simultaneous_reactions_fail_closed",
        "authority_multistep_replay_and_tamper_reject",
      ],
      crossTimeReplayResult:
        "slice37_academy_optical_flare_and_slice38_restoration_range_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "simultaneous-reaction-priority-remains-review-required",
        "nested-academy-on-restoration-remains-fail-closed",
        "remaining-505-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 505,
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
        "pendingReactionHash",
        "sourcePieceId",
        "targetPieceId",
        "cardResourceIds",
        "removedStatusEffectHashes",
        "statusEffectHash",
        "effectiveRangeInches",
        "effectiveMaximumRangeInches",
        "longRangeAllowed",
      ],
      uiTraceEvidence: [
        "optical-flare-resolution-opens-separate-restoration-use-or-pass-confirmation",
        "restoration-payment-and-immediate-status-marker-removal-are-visible",
        "passed-status-changes-visible-ranged-legal-space-at-eight-inch-boundary",
      ],
      agentDecisionEvidence: [
        "rules-own-trigger-range-payment-reserve-and-same-name-round-ledger",
        "agent-cannot-invent-long-range-or-attack-beyond-effective-eight-inch-range",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-medic-marine-or-parts-2-10-11-drift-demotes-slice-38",
        "reaction-range-authority-or-replay-failure-demotes-slice-38",
      ],
      userVisibleChecks: [
        "restoration-use-pays-one-cp-and-removes-optical-flare-status-and-marker",
        "restoration-pass-leaves-optical-flare-status-in-place",
        "debuffed-marine-c14-is-legal-at-eight-and-illegal-beyond-eight-inches",
        "reserve-or-already-used-medic-cannot-offer-restoration",
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
  if (changedNonTargetAtoms !== 0) fail("RESTORATION_RANGE_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialRestorationRangeConsumerRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("RESTORATION_RANGE_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialRestorationRangeConsumerRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("RESTORATION_RANGE_SLICE_CONTENT_MISMATCH");
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
    schema: "starcraft_tmg_official_restoration_range_consumer_rule_slice_audit_v1",
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
    rulesTruth: "official_current_restoration_range_consumer_exact_subset",
    trainingTruth: false,
  });
}
