import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_MEDIC_LIFE_SUPPORT_ACTION_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_TRANSITION_SCHEMA,
  OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
} from "./official-medic-life-support-reaction-executor-v1.mjs";
import { createOfficialTotalDamageReactionKernelV1 } from
  "./official-total-damage-reaction-kernel-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_life_support_damage_reaction_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_restoration_range_consumer_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "a7857e66c575afe7943202e862f0555054f2cdcb02bddd4a864746ea0e153384";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "9f7169d25eface1913c8cfbe6fca8d1557c8e20efe2ae213442e9905348c864a";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "4260abf38957d9bbcb307171a346d35408778c446905306eefc8404de76edda4";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 414;
const EXPECTED_REVIEW_COUNT = 498;
const EXPECTED_DISPLAY_COUNT = 114;
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const TARGET_IDS = Object.freeze([...OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS]);

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
    fail("LIFE_SUPPORT_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 407
    || audit.counts.byDisposition.review_required !== 505
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("LIFE_SUPPORT_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("LIFE_SUPPORT_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "life-support:");
  return {
    positiveFixtureIds: [
      `${slug}:attack-pauses-after-total-damage-before-casualty-allocation`,
      `${slug}:stabilizer-passive-adds-one-model-to-life-support-reduction`,
    ],
    negativeFixtureIds: [
      `${slug}:reserve-and-out-of-range-medic-not-offered`,
      `${slug}:stale-payment-plan-and-second-reaction-in-activation-reject`,
    ],
    interactionFixtureIds: [
      `${slug}:multiple-medics-are-alternative-use-actions-plus-one-pass`,
      `${slug}:pass-destroys-target-while-stabilized-use-preserves-it`,
    ],
    lifecycleFixtureIds: [
      `${slug}:reaction-finishes-original-attacker-assault-activation`,
      `${slug}:passive-is-continuous-on-field-and-inactive-in-reserve`,
    ],
    replayFixtureIds: [
      `${slug}:cross-seat-ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-medic-marine-parts-2-8-10-11-and-pdfs`,
    ],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const passive = atom.atomId.includes("passive")
    || atom.atomId === "rule-atom:all-ability-types-reserve-inactivity";
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "reacting_player" },
    timing: {
      phase: "assault",
      window: passive
        ? "continuous_while_source_unit_is_on_battlefield"
        : "after_total_damage_before_casualty_allocation",
      priority: passive ? 34 : 84,
    },
    preconditions: [{
      predicateId: passive
        ? "life_support.stabilizer_is_selected_and_source_is_on_battlefield"
        : "life_support.exact_damage_plan_source_range_payment_and_activation_limit",
      inputSchema: passive
        ? "starcraft_tmg_official_life_support_reduction_source_v1"
        : "starcraft_tmg_medic_life_support_reaction_window_v1",
      failureCode: passive
        ? "LIFE_SUPPORT_MEDIC_LOADOUT_UNSUPPORTED"
        : "LIFE_SUPPORT_ACTION_STALE",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MEDIC_LIFE_SUPPORT_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "LIFE_SUPPORT_ACTION_STALE",
      "LIFE_SUPPORT_FULL_COST_REQUIRED",
      "LIFE_SUPPORT_NAMED_REACTION_ALREADY_USED_THIS_ROUND",
      "LIFE_SUPPORT_NESTED_ACADEMY_REACTION_UNSUPPORTED",
      "LIFE_SUPPORT_REACTION_ALREADY_USED_THIS_ACTIVATION",
      "LIFE_SUPPORT_TARGET_SCOPE_UNSUPPORTED",
    ],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: OFFICIAL_MEDIC_LIFE_SUPPORT_ACTION_ATOM_IDS.filter((atomId) => (
        !TARGET_IDS.includes(atomId)
      )),
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialLifeSupportDamageReactionRuleSliceV1(input = {}) {
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
    fail("LIFE_SUPPORT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
      OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
    ].sort(),
    transitionSchema: OFFICIAL_MEDIC_LIFE_SUPPORT_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.40.0-official-life-support-damage-reaction",
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
    fail("LIFE_SUPPORT_CATALOGUE_INVALID");
  }
  const totalDamageKernel = createOfficialTotalDamageReactionKernelV1();
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
    restorationRangeProgress: clone(input.previousSlice.restorationRangeProgress),
    totalDamageReactionKernel: clone(totalDamageKernel.descriptor),
    newlyExecutableRuleAtomIds: [...TARGET_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID],
    executableScope:
      "current_optical_flare_debuffed_marine_c14_damage_against_current_marine_with_any_finite_eligible_current_medic_life_support_source_and_optional_stabilizer_passive",
    lifeSupportProgress: {
      damageWindow: "after_total_damage_before_casualty_allocation",
      sourceUnit: "Medic",
      targetUnit: "another_friendly_biological_marine",
      rangeInches: 4,
      exactCostCp: 1,
      arbitraryFiniteEligibleMedicCount: true,
      oneReactionResolvedPerActivation: true,
      sameNamedReactionPerSourceUnitRound: true,
      stabilizerPassiveAdditionalModel: 1,
      passiveActiveOnBattlefield: true,
      passiveActiveInReserve: false,
      nestedAcademyReactionExecutable: false,
      nonTerranLifeSupportResourceCarriersExecutable: false,
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
      livePart8DocumentCanonicalHash:
        "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
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
      completedBeforeThisSlice: 38,
      remainingActionableAtomsBeforeThisSlice: 505,
      completedAfterThisSlice: 39,
      averageAtomsPerSliceAfterThisSlice: 10.6154,
      remainingActionableAtomsAfterThisSlice: 498,
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
      actionSchemaVersion: "hybrid_legal_space_v9",
      previousActionSchemaVersion: "hybrid_legal_space_v8",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "total_damage_deferred_before_casualty_allocation",
        "life_support_use_pass_and_exact_cp_payment",
        "arbitrary_finite_medic_source_choice_and_single_reaction_limit",
        "stabilizer_passive_battlefield_and_reserve_lifecycle",
        "damage_reduction_then_original_assault_settlement",
        "authority_cross_seat_replay_and_tamper_reject",
      ],
      crossTimeReplayResult:
        "slice38_restoration_range_and_slice39_life_support_damage_replays_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "nested-academy-on-life-support-remains-fail-closed",
        "queen-transfusion-and-non-cp-resource-carriers-remain-review-required",
        "remaining-498-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 498,
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
        "attack-damage-pauses-and-seat-switches-to-life-support-use-or-pass",
        "multiple-medic-source-and-payment-alternatives-are-visible",
        "passive-bonus-reduction-and-post-reaction-damage-result-are-visible",
      ],
      agentDecisionEvidence: [
        "rules-own-total-damage-window-source-range-payment-and-reaction-limit",
        "agent-cannot-allocate-casualties-before-the-reaction-decision",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-medic-marine-or-parts-2-8-10-11-drift-demotes-slice-39",
        "damage-window-seat-projection-authority-or-replay-failure-demotes-slice-39",
      ],
      userVisibleChecks: [
        "attack-pauses-before-casualty-and-defender-sees-life-support-use-pass",
        "stabilized-medic-reduces-total-damage-by-one-more",
        "pass-resolves-unreduced-damage-and-can-destroy-target",
        "reserve-out-of-range-or-used-medic-is-not-offered",
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
  if (changedNonTargetAtoms !== 0) fail("LIFE_SUPPORT_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialLifeSupportDamageReactionRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("LIFE_SUPPORT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialLifeSupportDamageReactionRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("LIFE_SUPPORT_SLICE_CONTENT_MISMATCH");
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
    schema: "starcraft_tmg_official_life_support_damage_reaction_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    combatEffectDenominatorHash: input.slice.combatEffectDenominatorHash,
    totalDamageReactionKernelHash: input.slice.totalDamageReactionKernel.kernelHash,
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
    rulesTruth: "official_current_life_support_damage_reaction_exact_subset",
    trainingTruth: false,
  });
}
