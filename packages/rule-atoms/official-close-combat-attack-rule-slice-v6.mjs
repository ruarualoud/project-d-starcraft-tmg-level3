import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V6_TRANSITION_SCHEMA,
} from "./official-close-combat-attack-executor-v6.mjs";
import { createOfficialCriticalHitResolutionKernelV1 } from
  "./official-critical-hit-resolution-kernel-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
} from "./official-supply-loss-combat-executor-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_close_combat_attack_rule_slice_v6";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_ranged_attack_rule_slice_v6";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "56589aa766e66ee68578c8b1c74d21814b5f04e19f75cdcdedbda0b22183ef55";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "21927d9dcd022212d96f974249fba99e618076914076ed6b02e5046245989b3a";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 305;
const EXPECTED_EXECUTABLE_COUNT = 306;
const REJECTION_CODES = Object.freeze([
  "CLOSE_COMBAT_ATTACK_V6_ACTION_INVALID",
  "CLOSE_COMBAT_ATTACK_V6_ACTION_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V6_ACTION_STALE",
  "CLOSE_COMBAT_ATTACK_V6_ALREADY_ACTIVATED",
  "CLOSE_COMBAT_ATTACK_V6_ATTACKER_EFFECTS_UNSUPPORTED",
  "CLOSE_COMBAT_ATTACK_V6_BASE_SCOPE_UNSUPPORTED",
  "CLOSE_COMBAT_ATTACK_V6_CHANCE_REVEALS_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V6_CHANCE_REVEAL_INVALID",
  "CLOSE_COMBAT_ATTACK_V6_DATA_SNAPSHOT_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V6_EXACT_ENGAGEMENT_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V6_EXACT_PAIR_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V6_NOT_ACTIVE_SIDE",
  "CLOSE_COMBAT_ATTACK_V6_PARAMETER_DOMAIN_INVALID",
  "CLOSE_COMBAT_ATTACK_V6_PROFILE_SOURCE_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V6_RUNTIME_BINDING_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V6_SIDE_PASSED",
  "CLOSE_COMBAT_ATTACK_V6_SIDE_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V6_STATE_INVALID",
  "CLOSE_COMBAT_ATTACK_V6_TARGET_EFFECTS_UNSUPPORTED",
  "CLOSE_COMBAT_ATTACK_V6_TARGET_UNAVAILABLE",
  "CLOSE_COMBAT_ATTACK_V6_UNIT_SCOPE_UNSUPPORTED",
  "CLOSE_COMBAT_ATTACK_V6_UNIT_UNAVAILABLE",
  "CLOSE_COMBAT_ATTACK_V6_WRONG_PHASE",
  "CRITICAL_HIT_ATTACK_POOL_HITS_INVALID",
  "CRITICAL_HIT_ATTACK_POOL_INVALID",
  "CRITICAL_HIT_DODGE_EVIDENCE_REQUIRED",
  "CRITICAL_HIT_DODGE_INTERACTION_UNSUPPORTED",
  "CRITICAL_HIT_PLAN_INVALID",
  "CRITICAL_HIT_PLAN_MISMATCH",
  "CRITICAL_HIT_PROFILE_INVALID",
  "CRITICAL_HIT_PROFILE_SCOPE_UNSUPPORTED",
  "SUPPLY_LOSS_LEDGER_AGGREGATE_MISMATCH",
  "SUPPLY_LOSS_LEDGER_ENTRY_INVALID",
  "SUPPLY_LOSS_LEDGER_HASH_MISMATCH",
  "SUPPLY_LOSS_LEDGER_ROUND_MISMATCH",
  "SUPPLY_LOSS_LEDGER_RUNTIME_MISMATCH",
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
    fail("official_close_combat_attack_v6_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 607
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_close_combat_attack_v6_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_close_combat_attack_v6_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "close-combat-attack-v6:");
  return {
    positiveFixtureIds: [`${slug}:kerrigan-blades-two-hit-armour-bypass`],
    negativeFixtureIds: [`${slug}:dodge-and-source-drift-fail-closed`],
    interactionFixtureIds: [`${slug}:hit-critical-armour-damage-supply-ledger-order`],
    lifecycleFixtureIds: [`${slug}:legal-preview-apply-activation-and-casualty`],
    replayFixtureIds: [`${slug}:ed25519-replay-survives-hmac-rotation`],
    sourceDriftFixtureIds: [`${slug}:v1-v2-profile-core-rule-and-current-record-drift`],
  };
}

function executableCriticalHitAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "combat", window: "resolve_surge", priority: 445 },
    preconditions: [
      {
        predicateId: "combat.atomic_attack_profile_v2_matches_frozen_v1_source_data",
        inputSchema: "starcraft_tmg_official_attack_profile_catalogue_v2",
        failureCode: "CLOSE_COMBAT_ATTACK_V6_DATA_SNAPSHOT_MISMATCH",
      },
      {
        predicateId: "combat.exact_kerrigan_blades_profile_is_active",
        inputSchema: "starcraft_tmg_official_attack_profile_v2",
        failureCode: "CLOSE_COMBAT_ATTACK_V6_PROFILE_SOURCE_MISMATCH",
      },
      {
        predicateId: "combat.target_has_no_dodge_keyword_or_effect",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "CRITICAL_HIT_DODGE_INTERACTION_UNSUPPORTED",
      },
      {
        predicateId: "combat.exact_single_model_kerrigan_vs_marine_engagement",
        inputSchema: "starcraft_tmg_official_engagement_graph_v2",
        failureCode: "CLOSE_COMBAT_ATTACK_V6_EXACT_ENGAGEMENT_REQUIRED",
      },
    ],
    legalSpace: { kind: "finite", actionType: "fight" },
    effect: {
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

function reassignV5Atom(atom) {
  return {
    ...structuredClone(atom),
    atomVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
    effect: {
      ...structuredClone(atom.effect),
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...(atom.rejectionCodes || []),
      ...REJECTION_CODES,
    ])].sort((left, right) => left.localeCompare(right)),
  };
}

export function createOfficialCloseCombatAttackRuleSliceV6(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableCriticalHitAtom(atom, clauseById, base.rulesVersion);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return reassignV5Atom(atom);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_close_combat_attack_v6_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION,
    actionTypes: ["fight"],
    transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.29.0-official-critical-hit-kerrigan-blades",
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
    || catalogueAudit.counts.byDisposition.review_required !== 606
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_close_combat_attack_v6_catalogue_invalid");
  }
  const kernel = createOfficialCriticalHitResolutionKernelV1();
  const executableEffectAtomIds = [
    "attack-effect:anti-evade-v1",
    "attack-effect:bulky-v1",
    "attack-effect:burst-fire-v1",
    "attack-effect:critical-hit-v1",
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
    versionReassignedRuleAtomIds: [...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID],
    effectKernel: {
      kernelId: kernel.descriptor.kernelId,
      kernelVersion: kernel.descriptor.kernelVersion,
      kernelHash: kernel.descriptor.kernelHash,
      stageOrder: [...kernel.descriptor.stages],
      profileDenominator: 51,
      registeredEffectAtoms: 13,
      executableEffectAtomIds,
      knownUnimplementedEffectAtoms: 6,
      unknownEffectPolicy: "quarantine_and_fail_closed",
      dataChangeCannotGrantRuleAuthority: true,
      dodgeInteractionExecutable: false,
    },
    executableScope:
      "frozen_v5_close_combat_subset_plus_single_model_kerrigan_blades_vs_unmodified_single_model_marine_without_dodge_terrain_or_shield",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash:
        "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c",
      officialDatasetHash:
        "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      livePart11DocumentHash:
        "166211e672cd724617d500a1dbb8b61fec6540729a97670729513a15e52c2d28",
      liveKerriganDocumentHash:
        "02835d513bad6a263b4e5091b05187be7162af414dfcf9c1f5bc87d9badcf4fe",
      normalizedKerriganSourceRecordHash:
        "9555e809c6f8f6a764a6469ba8911fa76224f4fc4147e637a9146f8f9de7c7b0",
      liveGameplayCollectionsUnchanged: [
        "army_units",
        "rules_sections",
        "tactical_cards",
      ],
      communityMissionUpvoteOnlyDriftCount: 10,
      communityMetadataCannotAffectGameplayProjection: true,
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    semanticCorrection: {
      legacyProfileSchema: "starcraft_tmg_official_attack_profile_v1",
      currentProfileSchema: "starcraft_tmg_official_attack_profile_v2",
      legacyParameterName: "additionalHits",
      currentParameterName: "bypassArmourDice",
      previousProfileAndCatalogueRetained: true,
      silentCompatibilityAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 27,
      remainingActionableAtomsBeforeThisSlice: 607,
      completedAfterThisSlice: 28,
      averageAtomsPerSliceAfterThisSlice: 306 / 28,
      remainingActionableAtomsAfterThisSlice: 606,
      forecastRemainingSlicesAfterThisSlice: 56,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousExecutorId: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      v5ActionsDelegatedWithoutChangingV5Implementation: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "official_critical_hit_profile_v2",
        "official_critical_hit_kernel",
        "official_kerrigan_blades_authority_replay",
        "historical_v5_cross_time_replay",
      ],
      crossTimeReplayResult: "historical_slice_27_runtime_hash_preserved",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "dodge-critical-hit-interaction-remains-fail-closed",
        "six-known-attack-effect-atoms-remain-quarantined",
        "remaining-606-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 606,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      uiTraceEvidence: [],
      agentDecisionEvidence:
        "legal-action-binds-current-kerrigan-profile-engagement-critical-transfer-armour-damage-and-chance-layout",
      memoryTraceEvidence: "no-memory-skill-or-training-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "profile-core-dodge-stage-order-supply-ledger-or-replay-drift-demotes-current-slice",
      ],
      userVisibleChecks: [],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "dodge-critical-hit-interaction-not-yet-executable",
      "six-known-attack-effect-kinds-not-yet-executable",
      "multiple-model-target-splitting-close-ranks-and-non-round-base-critical-hit-pending",
      "shields-damage-reduction-and-casualty-choice-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCloseCombatAttackRuleSliceV6(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_close_combat_attack_v6_slice_hash_mismatch");
  }
  const expected = createOfficialCloseCombatAttackRuleSliceV6(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_close_combat_attack_v6_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const changedIds = new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS,
    ...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
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
    OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS.includes(atom.atomId)
      && atom.effect?.executorId === OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_ID
      && atom.atomVersion === OFFICIAL_CLOSE_COMBAT_ATTACK_V6_EXECUTOR_VERSION
  )).length;
  if (changedNonTargetAtoms !== 0
    || versionReassignedRuleAtoms !== OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS.length) {
    fail("official_close_combat_attack_v6_reassignment_invalid");
  }
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS],
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_CLOSE_COMBAT_ATTACK_V6_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_critical_hit_kerrigan_blades_close_combat_subset",
    trainingTruth: false,
  });
}
