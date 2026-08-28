import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCombatEffectDenominatorV2,
  verifyOfficialCombatEffectDenominatorV2,
} from "./official-combat-effect-denominator-v2.mjs";
import {
  OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_SPECIALIST_RANGED_BATCH_DEPENDENCY_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION,
  OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_TRANSITION_SCHEMA,
} from "./official-specialist-ranged-batch-executor-v1.mjs";
import { createOfficialSpecialistBatchEffectKernelV1 } from
  "./official-specialist-batch-effect-kernel-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_specialist_ranged_batch_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_specialist_loadout_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "08b75feed79463b757da0e6641ac2e44d120746147b0273eef73cd903732c639";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "88c0a7ed430cb703b49e2c993b13e13b8f1769a070f5420b1db08269472b7366";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "fdba261a92b50f35d37b15c727141ff615833dfff0a559993ea1db85f85ee54a";
const EXPECTED_EXECUTABLE_COUNT = 337;
const EXPECTED_REVIEW_COUNT = 575;
const EXPECTED_DISPLAY_COUNT = 114;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "SPECIALIST_BATCH_ACTION_INVALID",
  "SPECIALIST_BATCH_ACTION_MISMATCH",
  "SPECIALIST_BATCH_ACTION_STALE",
  "SPECIALIST_BATCH_ATTACKER_SCOPE_UNSUPPORTED",
  "SPECIALIST_BATCH_ATTACK_POOL_INVALID",
  "SPECIALIST_BATCH_CARRIER_MISMATCH",
  "SPECIALIST_BATCH_COMBAT_PROFILE_DRIFT",
  "SPECIALIST_BATCH_DESTROYED_TARGET_INVALID",
  "SPECIALIST_BATCH_ENGAGEMENT_SCOPE_UNSUPPORTED",
  "SPECIALIST_BATCH_EXACT_UNITS_REQUIRED",
  "SPECIALIST_BATCH_GOLIATH_MODEL_INVALID",
  "SPECIALIST_BATCH_LATEST_OFFICIAL_DATA_REQUIRED",
  "SPECIALIST_BATCH_MARINE_MODEL_INVALID",
  "SPECIALIST_BATCH_MIXED_OR_EXTENDED_RANGE_UNSUPPORTED",
  "SPECIALIST_BATCH_MODEL_WEAPON_SELECTION_INVALID",
  "SPECIALIST_BATCH_OFFICIAL_PROFILE_DRIFT",
  "SPECIALIST_BATCH_PENDING_SEQUENCE_INVALID",
  "SPECIALIST_BATCH_PROFILE_GROUP_DENOMINATOR_INVALID",
  "SPECIALIST_BATCH_PROFILE_VERSION_BINDING_INVALID",
  "SPECIALIST_BATCH_RUNTIME_BINDING_REQUIRED",
  "SPECIALIST_BATCH_SEALED_LOADOUT_INVALID",
  "SPECIALIST_BATCH_STATE_SCOPE_UNSUPPORTED",
  "SPECIALIST_BATCH_TARGET_DAMAGE_INVALID",
  "SPECIALIST_BATCH_TARGET_SCOPE_UNSUPPORTED",
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
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("SPECIALIST_BATCH_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 331
    || audit.counts.byDisposition.review_required !== 581
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("SPECIALIST_BATCH_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("SPECIALIST_BATCH_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "specialist-batch:");
  return {
    positiveFixtureIds: [
      `${slug}:agg12-and-c14-resolve-as-two-complete-batches`,
      `${slug}:either-profile-may-be-declared-first`,
    ],
    negativeFixtureIds: [
      `${slug}:stale-sequence-forged-carrier-and-third-batch-reject`,
    ],
    interactionFixtureIds: [
      `${slug}:profile-target-split-same-target-and-overflow-paths`,
    ],
    lifecycleFixtureIds: [
      `${slug}:first-batch-retains-active-side-second-completes-activation`,
    ],
    replayFixtureIds: [
      `${slug}:two-receipt-ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-versions-marine-goliath-part8-part9-and-pdf-hashes`,
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
    timing: { phase: "assault", window: "sequential_ranged_attack_batch", priority: 62 },
    preconditions: [{
      predicateId: "specialist_batch.sealed_model_profiles_partition_the_unit_once",
      inputSchema: "starcraft_tmg_official_specialist_loadout_plan_v1",
      failureCode: "SPECIALIST_BATCH_SEALED_LOADOUT_INVALID",
    }, {
      predicateId: "specialist_batch.pending_sequence_is_hash_bound_and_exclusive",
      inputSchema: "starcraft_tmg_official_specialist_ranged_sequence_pending_v1",
      failureCode: "SPECIALIST_BATCH_PENDING_SEQUENCE_INVALID",
    }],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE,
      parameterSchema: null,
    },
    effect: {
      executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
      transitionSchema: OFFICIAL_SPECIALIST_RANGED_BATCH_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_fixed_roll_sequence_chance_ticket_v1",
    },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_SPECIALIST_RANGED_BATCH_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialSpecialistRangedBatchRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("SPECIALIST_BATCH_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE],
    transitionSchema: OFFICIAL_SPECIALIST_RANGED_BATCH_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.33.0-official-specialist-ranged-batch",
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
    fail("SPECIALIST_BATCH_CATALOGUE_INVALID");
  }
  const specialistKernel = createOfficialSpecialistBatchEffectKernelV1();
  const effectDenominator = createOfficialCombatEffectDenominatorV2({
    previousSlice: input.previousSlice,
    specialistKernelDescriptor: specialistKernel.descriptor,
  });
  verifyOfficialCombatEffectDenominatorV2(effectDenominator);
  const effectKernel = {
    kernelId: specialistKernel.descriptor.kernelId,
    kernelVersion: specialistKernel.descriptor.kernelVersion,
    kernelHash: specialistKernel.descriptor.kernelHash,
    baseKernel: clone(input.previousSlice.effectKernel),
    profileDenominator: input.previousSlice.effectKernel.profileDenominator,
    profileEffectAtoms: 13,
    contextualEffectAtoms: 1,
    registeredEffectAtoms: 14,
    executableEffectAtomIds: [...effectDenominator.executableEffectAtomIds],
    knownUnimplementedEffectAtomIds: [...effectDenominator.knownUnimplementedEffectAtomIds],
    knownUnimplementedEffectAtoms: 4,
    unknownEffectPolicy: "quarantine_and_fail_closed",
    dataChangeCannotGrantRuleAuthority: true,
    specialistSeparateBatchExecutable: true,
    sidearmExecutable: false,
    indirectFireExecutable: false,
  };
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    combatEffectDenominator: effectDenominator,
    combatEffectDenominatorHash: effectDenominator.denominatorHash,
    combatEffectCorrectionReceiptHash:
      input.previousSlice.combatEffectCorrectionReceiptHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID],
    executableScope:
      "six_model_marine_one_agg12_two_sequential_profile_batches_against_two_single_model_goliaths_normal_range_no_terrain",
    specialistProgress: {
      selectedCurrentProfile: "AGG-12",
      modelLocalAssignmentDependencyFrozen: true,
      multipleProfileBatchesExecutable: true,
      profileTargetSplittingExecutable: true,
      sequentialBatchDeclarationExecutable: true,
      separateAttackBatchExecutable: true,
      sameTargetAcrossBatchesExecutable: true,
      singleVisibleModelCasualtyCapExecutable: true,
      singleVisibleModelOverflowDiscardExecutable: true,
      sidearmExecutable: false,
      indirectFireExecutable: false,
      specialistEffectStatus: "executable_exact_agg12_batch_lifecycle_subset",
    },
    effectKernel,
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
      officialDatasetHash: CURRENT_DATASET_HASH,
      marineSourceRecordHash:
        "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
      marinePayloadHash:
        "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6",
      goliathSourceRecordHash:
        "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16",
      goliathPayloadHash:
        "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d",
      liveGoliathDocumentCanonicalHash:
        "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc",
      c14ProfileHashV1:
        "a58fc5f16efc1096b4db052ad6fe92206a251e8d38c1bff3a4b02cd37fd802ba",
      c14ProfileHashV2:
        "a20160b32f9965e1b23c17b6d0fdbd3995796dedad0277a52fd15bf194cb7229",
      agg12ProfileHashV1:
        "408ec53bd4914dab92dc7816e0f21109187e871fec61229f6251745db74db5be",
      agg12ProfileHashV2:
        "ab0ac32f359ecccf3ae1110c663f475bcff182564d9c138f7c23863bab8ad282",
      coreRuleContentHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pContentHash:
        "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      livePart8DocumentCanonicalHash:
        "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
      livePart9DocumentCanonicalHash:
        "0b7f93150a5c915fb1fe52f2b2a276e5eee2f77fa251b3be583de71837bfd2cb",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 31,
      remainingActionableAtomsBeforeThisSlice: 581,
      completedAfterThisSlice: 32,
      averageAtomsPerSliceAfterThisSlice: 10.5,
      remainingActionableAtomsAfterThisSlice: 575,
      forecastRemainingSlicesAfterThisSlice: 55,
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
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "specialist_two_batch_legal_space",
        "same_and_split_target_damage_lifecycle",
        "pending_sequence_exclusive_action_gate",
        "authority_two_receipt_replay",
      ],
      crossTimeReplayResult: "slice31_loadout_dependency_and_slice32_batch_replay_passed",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "sidearm-indirect-fire-locked-in-and-pinpoint-remain-unimplemented",
        "remaining-575-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 575,
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
        "write_episode_trace",
      ],
      observationContract: [
        "pendingRangedAttackSequenceHash",
        "pendingRangedAttackPieceId",
        "remainingBatchProfileKeys",
      ],
      uiTraceEvidence: [
        "first-batch-locks-out-hold-pass-and-unrelated-attacks",
        "second-batch-exposes-only-remaining-profile-and-live-targets",
      ],
      agentDecisionEvidence: [
        "rules-own-batch-order-target-and-chance-domain",
        "agent-cannot-forge-carrier-profile-or-skip-remaining-batch",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-profile-loadout-or-pending-sequence-drift-demotes-slice-32",
        "cross-batch-replay-or-overflow-failure-demotes-slice-32",
      ],
      userVisibleChecks: [
        "agg12-model-and-five-c14-models-appear-as-two-batches",
        "each-batch-may-select-a-different-live-goliath",
        "assault-activation-completes-only-after-second-batch",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "remaining-combat-effects-and-global-rule-atoms-pending",
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
  if (changedNonTargetAtoms !== 0) fail("SPECIALIST_BATCH_NON_TARGET_MUTATION");
  return slice;
}

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";

export function verifyOfficialSpecialistRangedBatchRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("SPECIALIST_BATCH_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialSpecialistRangedBatchRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("SPECIALIST_BATCH_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, input.previousSlice.catalogue.atoms.find((previous) => (
        previous.atomId === atom.atomId
      )))
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_specialist_ranged_batch_rule_slice_audit_v1",
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
    rulesTruth: "official_specialist_sequential_ranged_batch_exact_subset",
    trainingTruth: false,
  });
}
