import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
} from "./official-close-combat-attack-executor-v6.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_TRANSITION_SCHEMA,
} from "./official-close-combat-attack-executor-v7.mjs";
import { createOfficialCriticalHitResolutionKernelV2 } from
  "./official-critical-hit-resolution-kernel-v2.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
} from "./official-cleanup-refresh-executor-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
  OFFICIAL_CLEANUP_REFRESH_V2_TRANSITION_SCHEMA,
} from "./official-cleanup-refresh-executor-v2.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_close_combat_attack_rule_slice_v7";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_close_combat_attack_rule_slice_v6";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "bac947b8ca453de6dcfbfcc91ac77deef84625e30f66a476b491e38e3bc7515b";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "64a9b9a717ccbbd69384a07aaeb39e56df0849a304094de92075d6177f5bde6c";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 306;
const EXPECTED_EXECUTABLE_COUNT = 326;
const REJECTION_CODES = Object.freeze([
  "CLOSE_COMBAT_ATTACK_V7_ACTION_INVALID",
  "CLOSE_COMBAT_ATTACK_V7_ACTION_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V7_ACTION_STALE",
  "CLOSE_COMBAT_ATTACK_V7_BASE_ACTION_STALE",
  "CLOSE_COMBAT_ATTACK_V7_CHANCE_REVEALS_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V7_CHANCE_REVEAL_INVALID",
  "CLOSE_COMBAT_ATTACK_V7_DATA_SNAPSHOT_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V7_LATEST_DATA_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V7_PARAMETER_DOMAIN_INVALID",
  "CLOSE_COMBAT_ATTACK_V7_RUNTIME_BINDING_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V7_SIDE_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V7_STATE_INVALID",
  "CRITICAL_HIT_ATTACK_POOL_HITS_INVALID",
  "CRITICAL_HIT_ATTACK_POOL_INVALID",
  "CRITICAL_HIT_DODGE_EVIDENCE_REQUIRED",
  "CRITICAL_HIT_PLAN_INVALID",
  "CRITICAL_HIT_PLAN_MISMATCH",
  "DODGE_ARMOUR_POOL_INVALID",
  "DODGE_PLAN_INVALID",
  "DODGE_RECEIPT_INVALID",
  "DODGE_REDUCTION_INVALID",
  "DODGE_SOURCE_RECORD_MISMATCH",
  "DODGE_TRANSFER_EFFECT_UNSUPPORTED",
  "GUARDIAN_SHELL_CARD_NOT_READY",
  "GUARDIAN_SHELL_CARD_SCOPE_INVALID",
  "GUARDIAN_SHELL_CARD_STATE_INVALID",
  "GUARDIAN_SHELL_PENDING_ATTACK_INVALID",
  "GUARDIAN_SHELL_REACTION_NO_LONGER_ELIGIBLE",
  "GUARDIAN_SHELL_REACTION_WINDOW_STALE",
  "GUARDIAN_SHELL_RESOLUTION_WINDOW_STALE",
  "GUARDIAN_SHELL_TARGET_INVALID",
  "REACTION_PER_ACTIVATION_LIMIT_REACHED",
  "REACTION_USAGE_LEDGER_INVALID",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("official_close_combat_attack_v7_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 606
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_close_combat_attack_v7_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_close_combat_attack_v7_source_clause_missing", atom.atomId);
  }
  return ids;
}

function isDodgeResolutionAtom(atomId) {
  return atomId === "rule-atom:singleton:core-11-dodge-surge-reduction:4e101fc93566";
}

function actionTypeForAtom(atomId) {
  if (isDodgeResolutionAtom(atomId)) return "resolve_fight";
  if (/trigger|reaction/iu.test(atomId)) return "use_reaction";
  if (/ready|exhaust|card|ability/iu.test(atomId)) return "use_reaction";
  return "declare_fight";
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "close-combat-attack-v7:");
  return {
    positiveFixtureIds: [`${slug}:guardian-shell-dodge-two-critical-transfer`],
    negativeFixtureIds: [`${slug}:wrong-card-window-side-and-source-fail-closed`],
    interactionFixtureIds: [`${slug}:hit-reaction-critical-dodge-armour-damage-order`],
    lifecycleFixtureIds: [`${slug}:ready-exhausted-cleanup-ready`],
    replayFixtureIds: [`${slug}:three-stage-ed25519-authority-replay`],
    sourceDriftFixtureIds: [`${slug}:current-core-command-center-and-power-field-binding`],
  };
}

function executableReactionAtom(atom, clauseById, rulesVersion) {
  const actionType = actionTypeForAtom(atom.atomId);
  const chance = actionType === "resolve_fight"
    ? { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" }
    : { kind: "none" };
  return {
    atomId: atom.atomId,
    atomVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player_or_reaction_owner" },
    timing: {
      phase: "combat",
      window: isDodgeResolutionAtom(atom.atomId)
        ? "resolve_surge_before_armour_roll"
        : "guardian_shell_before_friendly_ground_unit_armour_roll",
      priority: isDodgeResolutionAtom(atom.atomId) ? 450 : 440,
    },
    preconditions: [
      {
        predicateId: "combat.current_official_power_field_guardian_shell_is_exact",
        inputSchema: "starcraft_tmg_official_gameplay_data_bundle_v1",
        failureCode: "CLOSE_COMBAT_ATTACK_V7_LATEST_DATA_REQUIRED",
      },
      {
        predicateId: "combat.guardian_shell_exact_reaction_window_is_pending",
        inputSchema: "starcraft_tmg_guardian_shell_attack_window_v1",
        failureCode: "GUARDIAN_SHELL_REACTION_WINDOW_STALE",
      },
      {
        predicateId: "combat.reaction_card_state_side_trigger_and_activation_limit_match",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "GUARDIAN_SHELL_CARD_STATE_INVALID",
      },
    ],
    legalSpace: { kind: "finite", actionType },
    effect: {
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_TRANSITION_SCHEMA,
    },
    chance,
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

function reassignV6Atom(atom) {
  return {
    ...structuredClone(atom),
    atomVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    effect: {
      ...structuredClone(atom.effect),
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...(atom.rejectionCodes || []),
      ...REJECTION_CODES,
    ])].sort((left, right) => left.localeCompare(right)),
  };
}

function reassignCleanupAtom(atom) {
  return {
    ...structuredClone(atom),
    atomVersion: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
    effect: {
      ...structuredClone(atom.effect),
      executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLEANUP_REFRESH_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...(atom.rejectionCodes || []),
      "CLEANUP_REFRESH_V2_ACTION_INVALID",
      "CLEANUP_REFRESH_V2_DATA_SNAPSHOT_MISMATCH",
      "CLEANUP_REFRESH_V2_FIRST_PLAYER_ONLY",
      "CLEANUP_REFRESH_V2_LATEST_DATA_REQUIRED",
      "CLEANUP_REFRESH_V2_POWER_FIELD_STATE_INVALID",
      "CLEANUP_REFRESH_V2_PROGRESS_INVALID",
      "CLEANUP_REFRESH_V2_REACTION_LEDGER_INVALID",
      "CLEANUP_REFRESH_V2_RESOLUTION_STALE",
      "CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED",
    ])].sort((left, right) => left.localeCompare(right)),
  };
}

export function createOfficialCloseCombatAttackRuleSliceV7(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS);
  const cleanupReassignedIds = new Set(OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const observedCleanupReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableReactionAtom(atom, clauseById, base.rulesVersion);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return reassignV6Atom(atom);
    }
    if (cleanupReassignedIds.has(atom.atomId)) {
      observedCleanupReassignedIds.push(atom.atomId);
      return reassignCleanupAtom(atom);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())
    || !isDeepStrictEqual(
      observedCleanupReassignedIds.sort(),
      [...cleanupReassignedIds].sort(),
    )) {
    fail("official_close_combat_attack_v7_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID
      && entry.executorId !== OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION,
    actionTypes: [
      "declare_fight",
      "fight",
      "pass_reaction",
      "resolve_fight",
      "use_reaction",
    ],
    transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_TRANSITION_SCHEMA,
  });
  executorManifest.push({
    executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
    actionTypes: ["cleanup_and_refresh"],
    transitionSchema: OFFICIAL_CLEANUP_REFRESH_V2_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.30.0-official-guardian-shell-dodge-reaction",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== 586
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_close_combat_attack_v7_catalogue_invalid");
  }
  const kernel = createOfficialCriticalHitResolutionKernelV2();
  const executableEffectAtomIds = [
    "attack-effect:anti-evade-v1",
    "attack-effect:bulky-v1",
    "attack-effect:burst-fire-v1",
    "attack-effect:critical-hit-v1",
    "attack-effect:dodge-v1",
    "attack-effect:long-range-v1",
    "attack-effect:pierce-v1",
    "attack-effect:surge-armour-bypass-v1",
  ];
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [
      ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS,
      ...OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
    ].sort((left, right) => left.localeCompare(right)),
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
      OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
    ],
    effectKernel: {
      kernelId: kernel.descriptor.kernelId,
      kernelVersion: kernel.descriptor.kernelVersion,
      kernelHash: kernel.descriptor.kernelHash,
      criticalHitKernelV1Hash: kernel.descriptor.previousKernelHash,
      dodgeKernelHash: kernel.descriptor.dodgeKernelHash,
      stageOrder: [...kernel.descriptor.stages],
      profileDenominator: 51,
      registeredEffectAtoms: 13,
      executableEffectAtomIds,
      knownUnimplementedEffectAtoms: 5,
      unknownEffectPolicy: "quarantine_and_fail_closed",
      dataChangeCannotGrantRuleAuthority: true,
      dodgeInteractionExecutable: true,
      dodgeTransferInterpretation:
        "one_shared_reduction_budget_over_surge_and_critical_hit_transfer",
    },
    executableScope:
      "frozen_v6_subset_plus_current_power_field_guardian_shell_on_single_model_kerrigan_blades_vs_single_model_marine",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash:
        "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78",
      officialDatasetHash:
        "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a",
      sameVersionDisplayOnlyDriftReceiptHash:
        "46c7e82f34f6a666ebe2b51f0f5b8ff44c20a518ee1b115e19d2a5f446d5b5a4",
      powerFieldSourceRecordHash:
        "65bc452416df2ab8c4275810e8333d5557e990de1ce9ae88bc135771637bdc58",
      powerFieldPayloadHash:
        "3c4248dc497f5a3c71d18543f7141790374aff7f5c1855ec9ea49013700620a2",
      guardianShellText:
        "Guardian Shell <Reaction> <Any Phase>: Use before a Friendly Ground Unit makes an Armour Roll. That Unit gains DODGE (2) for this roll.",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      communityMissionUpvoteOnlyDriftCount: 19,
      communityMetadataCannotAffectGameplayProjection: true,
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    interpretationBoundary: {
      officialDodgeText:
        "When this Unit is targeted by an attack, reduce the number of dice moved from the Armour Pool to the Damage Pool by Surge or CRITICAL HIT by X (minimum 0). Apply during the Resolve Surge step.",
      officialClarificationFound: false,
      boundedInference:
        "cap_total_requested_transfer_at_armour_pool_then_reduce_the_combined_total_by_x_once",
      subtractPerTransferSourceAllowed: false,
      inferenceAffectsOnlySurgeAndCriticalHitSharedTransferBudget: true,
      trainingTruth: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 28,
      remainingActionableAtomsBeforeThisSlice: 606,
      completedAfterThisSlice: 29,
      averageAtomsPerSliceAfterThisSlice: 326 / 29,
      remainingActionableAtomsAfterThisSlice: 586,
      forecastRemainingSlicesAfterThisSlice: 53,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousExecutorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      v6ActionsDelegatedWithoutChangingV6Implementation: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "official_dodge_kernel",
        "official_guardian_shell_staged_executor",
        "official_reaction_authority_replay",
        "historical_v6_cross_time_replay",
      ],
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "five-known-attack-effect-atoms-remain-quarantined",
        "remaining-586-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 586,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["opponent_prompt", "referee_prompt"],
      harnessToolsCalled: [
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
      ],
      uiTraceEvidence: [],
      agentDecisionEvidence: [
        "pending-reaction-window-exposes-only-responder-use-or-pass-actions",
        "reaction-decided-window-exposes-only-attacker-resolve-action",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "seat-window-action-field-or-replay-drift-demotes-slice-29",
      ],
      userVisibleChecks: [
        "attacker-cannot-act-during-defender-reaction-window",
        "defender-cannot-resolve-attacker-armour-stage",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "five-known-attack-effect-kinds-not-yet-executable",
      "multiple-model-target-splitting-close-ranks-and-non-round-base-reactions-pending",
      "shields-damage-reduction-and-casualty-choice-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCloseCombatAttackRuleSliceV7(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_close_combat_attack_v7_slice_hash_mismatch");
  }
  const expected = createOfficialCloseCombatAttackRuleSliceV7(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_close_combat_attack_v7_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const changedIds = new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
  ]);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !changedIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const versionReassignedRuleAtoms = input.slice.catalogue.atoms.filter((atom) => (
    (OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS.includes(atom.atomId)
      && atom.effect?.executorId === OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID
      && atom.atomVersion === OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_VERSION)
    || (OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS.includes(atom.atomId)
      && atom.effect?.executorId === OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID
      && atom.atomVersion === OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION)
  )).length;
  if (changedNonTargetAtoms !== 0
    || versionReassignedRuleAtoms !== OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS.length
      + OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS.length
    || OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS.length
      !== OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS.length
        + OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS.length) {
    fail("official_close_combat_attack_v7_reassignment_invalid");
  }
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [
      ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS,
      ...OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
    ].sort((left, right) => left.localeCompare(right)),
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_guardian_shell_dodge_reaction_close_combat_subset",
    trainingTruth: false,
  });
}
