import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  verifyOfficialCombatEffectDenominatorV1,
} from "./official-combat-effect-denominator-v1.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
} from "./official-close-combat-attack-executor-v7.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_TRANSITION_SCHEMA,
} from "./official-close-combat-attack-executor-v8.mjs";
import { createOfficialInstantAttackEffectKernelV1 } from
  "./official-instant-attack-effect-kernel-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_close_combat_attack_rule_slice_v8";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_close_combat_attack_rule_slice_v7";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "985f244a9dafdab218e15e627503bf5feaee8626d7de212bc3d4550a6366e482";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "6f32870d70cd485a12b042de5867bb5211f12e4b2d808e360e3e5cf6760e12e3";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 326;
const EXPECTED_EXECUTABLE_COUNT = 327;
const REJECTION_CODES = Object.freeze([
  "CLOSE_COMBAT_ATTACK_V8_ACTION_INVALID",
  "CLOSE_COMBAT_ATTACK_V8_ACTION_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V8_ACTION_STALE",
  "CLOSE_COMBAT_ATTACK_V8_ALREADY_ACTIVATED",
  "CLOSE_COMBAT_ATTACK_V8_BASE_SCOPE_UNSUPPORTED",
  "CLOSE_COMBAT_ATTACK_V8_CHANCE_REVEALS_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V8_CHANCE_REVEAL_INVALID",
  "CLOSE_COMBAT_ATTACK_V8_DATA_SNAPSHOT_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V8_EXACT_ENGAGEMENT_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V8_EXACT_PAIR_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V8_LATEST_DATA_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V8_NOT_ACTIVE_SIDE",
  "CLOSE_COMBAT_ATTACK_V8_PARAMETER_DOMAIN_INVALID",
  "CLOSE_COMBAT_ATTACK_V8_PROFILE_SOURCE_MISMATCH",
  "CLOSE_COMBAT_ATTACK_V8_RUNTIME_BINDING_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V8_SIDE_PASSED",
  "CLOSE_COMBAT_ATTACK_V8_SIDE_REQUIRED",
  "CLOSE_COMBAT_ATTACK_V8_STATE_INVALID",
  "CLOSE_COMBAT_ATTACK_V8_TARGET_EFFECTS_UNSUPPORTED",
  "CLOSE_COMBAT_ATTACK_V8_TARGET_UNAVAILABLE",
  "CLOSE_COMBAT_ATTACK_V8_UNIT_SCOPE_UNSUPPORTED",
  "CLOSE_COMBAT_ATTACK_V8_UNIT_UNAVAILABLE",
  "CLOSE_COMBAT_ATTACK_V8_WRONG_PHASE",
  "INSTANT_EFFECT_PLAN_INVALID",
  "INSTANT_EFFECT_PROFILE_INVALID",
  "INSTANT_EFFECT_REQUIRED",
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

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(without(previousSlice, ["sliceHash"]))
      !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("official_close_combat_attack_v8_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 586
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_close_combat_attack_v8_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_close_combat_attack_v8_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "close-combat-attack-v8:");
  return {
    positiveFixtureIds: [`${slug}:raptor-claws-instant-blocks-ready-power-field`],
    negativeFixtureIds: [`${slug}:nonlatest-profile-and-tamper-fail-closed`],
    interactionFixtureIds: [`${slug}:instant-surge-armour-damage-order`],
    lifecycleFixtureIds: [`${slug}:instant-scope-expires-at-attack-completion`],
    replayFixtureIds: [`${slug}:ed25519-authority-replay`],
    sourceDriftFixtureIds: [`${slug}:current-core-command-center-and-p2p-binding`],
  };
}

function executableInstantAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: {
      phase: "combat",
      window: "attack_declaration_through_attack_completion",
      priority: 445,
    },
    preconditions: [
      {
        predicateId: "combat.current_official_raptor_claws_profile_is_exact",
        inputSchema: "starcraft_tmg_official_gameplay_data_bundle_v1",
        failureCode: "CLOSE_COMBAT_ATTACK_V8_LATEST_DATA_REQUIRED",
      },
      {
        predicateId: "combat.raptor_and_target_are_exactly_engaged",
        inputSchema: "starcraft_tmg_official_engagement_graph_v2",
        failureCode: "CLOSE_COMBAT_ATTACK_V8_EXACT_ENGAGEMENT_REQUIRED",
      },
      {
        predicateId: "combat.instant_enemy_reaction_declaration_and_resolution_prohibited",
        inputSchema: "starcraft_tmg_official_instant_attack_effect_plan_v1",
        failureCode: "INSTANT_EFFECT_PLAN_INVALID",
      },
    ],
    legalSpace: { kind: "finite", actionType: "fight" },
    effect: {
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

function reassignV7Atom(atom) {
  return {
    ...structuredClone(atom),
    atomVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
    effect: {
      ...structuredClone(atom.effect),
      executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...(atom.rejectionCodes || []),
      ...REJECTION_CODES,
    ])].sort((left, right) => left.localeCompare(right)),
  };
}

export function createOfficialCloseCombatAttackRuleSliceV8(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const denominator = verifyOfficialCombatEffectDenominatorV1(
    input.combatEffectDenominator,
  );
  if (denominator.correction?.previousSliceHash !== input.previousSlice.sliceHash) {
    fail("official_close_combat_attack_v8_effect_denominator_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const newIds = new Set(OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS);
  const reassignedIds = new Set(OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS);
  const observedNewIds = [];
  const observedReassignedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableInstantAtom(atom, clauseById, base.rulesVersion);
    }
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return reassignV7Atom(atom);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())
    || !isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())) {
    fail("official_close_combat_attack_v8_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
    actionTypes: [
      "declare_fight",
      "fight",
      "pass_reaction",
      "resolve_fight",
      "use_reaction",
    ],
    transitionSchema: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.31.0-official-instant-raptor-claws",
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
    || catalogueAudit.counts.byDisposition.review_required !== 585
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_close_combat_attack_v8_catalogue_invalid");
  }
  const instantKernel = createOfficialInstantAttackEffectKernelV1();
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    combatEffectDenominatorHash: denominator.denominatorHash,
    combatEffectCorrectionReceiptHash:
      denominator.correction.correctionReceiptHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID],
    effectKernel: {
      kernelId: instantKernel.descriptor.kernelId,
      kernelVersion: instantKernel.descriptor.kernelVersion,
      kernelHash: instantKernel.descriptor.kernelHash,
      profileDenominator: 51,
      profileEffectAtoms: denominator.counts.profileEffectAtoms,
      contextualEffectAtoms: denominator.counts.contextualEffectAtoms,
      registeredEffectAtoms: denominator.counts.registeredEffectAtoms,
      executableEffectAtomIds: [...denominator.executableEffectAtomIds],
      knownUnimplementedEffectAtomIds: [...denominator.knownUnimplementedEffectAtomIds],
      knownUnimplementedEffectAtoms: denominator.counts.knownUnimplementedEffectAtoms,
      unknownEffectPolicy: denominator.unknownEffectPolicy,
      dataChangeCannotGrantRuleAuthority: true,
      instantReactionDeclarationAndResolutionProhibitionExecutable: true,
    },
    executableScope:
      "frozen_v7_subset_plus_current_one_remaining_raptor_claws_instant_vs_single_model_marine",
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
      officialDatasetHash: CURRENT_DATASET_HASH,
      sameVersionDisplayOnlyDriftReceiptHash:
        "46c7e82f34f6a666ebe2b51f0f5b8ff44c20a518ee1b115e19d2a5f446d5b5a4",
      raptorSourceRecordHash:
        "d224df3320b658d3561dfb7c8c155dad267865eeabf18d657d7c41f14f597b5e",
      raptorPayloadHash:
        "92a658a9e569ed15fcd82a70a94cdcaa3b3563bcc6eabf3c495fbc9e62dabaaa",
      raptorClawsProfileHash:
        "bde03b02cbf30fbda84d03e406f9937060a1d97f8c24992f77e6b9e351efc21f",
      instantRuleTextHash:
        "553b151fdb23ffffc94091bededce1faa82f926dbed0a37ceb4e0340df625f99",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      zergP2pAuthority:
        "official_zerg_p2p_pdf_sha256_6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    effectDenominatorCorrection: {
      correctionReceiptHash: denominator.correction.correctionReceiptHash,
      defect: denominator.correction.defect,
      correctedRegisteredEffectAtoms:
        denominator.correction.correctedRegisteredEffectAtoms,
      correctedBeforeInstantExecutableEffectAtoms:
        denominator.correction.correctedBeforeInstantExecutableEffectAtoms,
      postInstantExecutableEffectAtoms: denominator.counts.executableEffectAtoms,
      historicalSliceMutationAllowed: false,
      silentCompatibilityAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 29,
      remainingActionableAtomsBeforeThisSlice: 586,
      completedAfterThisSlice: 30,
      averageAtomsPerSliceAfterThisSlice: 327 / 30,
      remainingActionableAtomsAfterThisSlice: 585,
      forecastRemainingSlicesAfterThisSlice: 54,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousExecutorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      v7ActionsDelegatedWithoutChangingV7Implementation: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "official_instant_kernel",
        "official_raptor_claws_executor",
        "official_instant_authority_replay",
        "historical_v7_cross_time_replay",
      ],
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "five-known-attack-effect-atoms-remain-quarantined",
        "remaining-585-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 585,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["opponent_prompt", "referee_prompt"],
      harnessToolsCalled: [
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "write_episode_trace",
      ],
      uiTraceEvidence: [
        "ready-power-field-is-visible-but-no-reaction-action-is-legal-for-instant",
      ],
      agentDecisionEvidence: [
        "raptor-owner-sees-one-hash-bound-claws-fight-action",
        "marine-owner-sees-no-instant-reaction-window",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "reaction-window-profile-lineage-or-replay-drift-demotes-slice-30",
      ],
      userVisibleChecks: [
        "ready-power-field-remains-ready-after-instant-attack",
        "historical-guardian-shell-window-still-uses-v7-delegate",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "five-known-attack-effect-kinds-not-yet-executable",
      "multiple-model-target-splitting-close-ranks-and-casualty-choice-pending",
      "shields-damage-reduction-and-non-round-base-combat-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";

export function verifyOfficialCloseCombatAttackRuleSliceV8(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(without(input.slice, ["sliceHash"]))
      !== input.slice.sliceHash) {
    fail("official_close_combat_attack_v8_slice_hash_mismatch");
  }
  const expected = createOfficialCloseCombatAttackRuleSliceV8(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_close_combat_attack_v8_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const changedIds = new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS,
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS,
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
    OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS.includes(atom.atomId)
      && atom.effect?.executorId === OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID
      && atom.atomVersion === OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION
  )).length;
  if (changedNonTargetAtoms !== 0
    || versionReassignedRuleAtoms
      !== OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS.length
    || OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ATOM_IDS.length
      !== OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS.length
        + OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS.length) {
    fail("official_close_combat_attack_v8_reassignment_invalid");
  }
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    combatEffectDenominatorHash: input.slice.combatEffectDenominatorHash,
    combatEffectCorrectionReceiptHash:
      input.slice.combatEffectCorrectionReceiptHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [...OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ATOM_IDS],
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_CLOSE_COMBAT_ATTACK_V8_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_instant_raptor_claws_close_combat_subset",
    trainingTruth: false,
  });
}
