import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE,
  OFFICIAL_SPECIALIST_LOADOUT_DEPENDENCY_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION,
  OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
  OFFICIAL_SPECIALIST_LOADOUT_TRANSITION_SCHEMA,
} from "./official-specialist-loadout-executor-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_specialist_loadout_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_close_combat_attack_rule_slice_v8";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "b1fc80fc4c3b74e045f961e5b2279eb8a6fead74ca0ca2c947c3185a532921c8";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "e289a3b7120eaed2bb282a1f261607300c2f15441b42f81a2c468a77cd078476";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "28dd32c0b27bda8573171b4ed7008bebde9f919bf954688d0fe30d7f154915fc";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "d564e91dabcc2017ff603fab3f999fd797c70f6834c99f1939d8aefc62d63961";
const EXPECTED_EFFECT_CORRECTION_HASH =
  "2047a73d600bc2749939a7f15474d212058efc9a8c99cc26abcd7debe8279e71";
const EXPECTED_EXECUTABLE_COUNT = 331;
const EXPECTED_REVIEW_COUNT = 581;
const EXPECTED_DISPLAY_COUNT = 114;
const DEFERRED_BATCH_ATOM_ID =
  "rule-atom:singleton:core-9-1-7-specialist-separate-attack-batch:85e56fc370d2";
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "SPECIALIST_ACTION_INVALID",
  "SPECIALIST_ACTION_STALE",
  "SPECIALIST_ARMY_BUILDING_STATE_REQUIRED",
  "SPECIALIST_ASSIGNMENT_DENOMINATOR_MISMATCH",
  "SPECIALIST_ASSIGNMENT_MODEL_REQUIRED",
  "SPECIALIST_ASSIGNMENT_WEAPON_REQUIRED",
  "SPECIALIST_ASSIGNMENTS_REQUIRED",
  "SPECIALIST_ATTACK_PROFILE_CATALOGUE_REQUIRED",
  "SPECIALIST_CARRIER_MODEL_UNKNOWN",
  "SPECIALIST_CURRENT_SUPPLY_MISMATCH",
  "SPECIALIST_DATA_SNAPSHOT_MISMATCH",
  "SPECIALIST_DISTINCT_CARRIER_REQUIRED",
  "SPECIALIST_DUPLICATE_UPGRADE_FORBIDDEN",
  "SPECIALIST_EFFECT_PROFILE_INVALID",
  "SPECIALIST_LATEST_OFFICIAL_DATA_REQUIRED",
  "SPECIALIST_MARINE_PROFILE_DRIFT",
  "SPECIALIST_MODEL_DENOMINATOR_INVALID",
  "SPECIALIST_MODEL_ID_REQUIRED",
  "SPECIALIST_MODEL_LOADOUT_MISSING",
  "SPECIALIST_OFFICIAL_PROFILE_DRIFT",
  "SPECIALIST_PARAMETER_DOMAIN_INVALID",
  "SPECIALIST_PARAMETER_DOMAIN_STALE",
  "SPECIALIST_REPLACED_WEAPON_MISSING",
  "SPECIALIST_RUNTIME_BINDING_REQUIRED",
  "SPECIALIST_SELECTED_UPGRADE_INVALID",
  "SPECIALIST_SELECTED_UPGRADE_SCOPE_UNSUPPORTED",
  "SPECIALIST_SELECTED_UPGRADES_REQUIRED",
  "SPECIALIST_UNIT_NOT_FOUND",
  "SPECIALIST_UNIT_SCOPE_UNSUPPORTED",
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
    || previousSlice.combatEffectCorrectionReceiptHash !== EXPECTED_EFFECT_CORRECTION_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("SPECIALIST_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 327
    || audit.counts.byDisposition.review_required !== 585
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("SPECIALIST_PREVIOUS_CATALOGUE_INVALID");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("SPECIALIST_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "specialist-loadout:");
  return {
    positiveFixtureIds: [
      `${slug}:six-marine-agg12-and-rocket-distinct-carriers`,
      `${slug}:nine-marine-single-specialist-carrier`,
    ],
    negativeFixtureIds: [
      `${slug}:duplicate-upgrade-same-carrier-missing-and-unknown-model-reject`,
    ],
    interactionFixtureIds: [
      `${slug}:model-local-replacement-versus-non-replacement-addition`,
    ],
    lifecycleFixtureIds: [
      `${slug}:army-building-nomination-seals-model-loadout-once`,
    ],
    replayFixtureIds: [
      `${slug}:ed25519-replay-survives-hmac-rotation`,
    ],
    sourceDriftFixtureIds: [
      `${slug}:live-versions-marine-core-and-terran-p2p-hash-bound`,
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
    owner: { authority: "rules", actor: "roster_owner" },
    timing: { phase: "army_building", window: "specialist_nomination", priority: 40 },
    preconditions: [
      {
        predicateId: "specialist.current_profile_and_purchase_are_source_bound",
        inputSchema: "starcraft_tmg_official_attack_profile_catalogue_v2",
        failureCode: "SPECIALIST_OFFICIAL_PROFILE_DRIFT",
      },
      {
        predicateId: "specialist.each_selected_upgrade_has_one_distinct_carrier",
        inputSchema: OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
        failureCode: "SPECIALIST_DISTINCT_CARRIER_REQUIRED",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE,
      parameterSchema: OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
      transitionSchema: OFFICIAL_SPECIALIST_LOADOUT_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_SPECIALIST_LOADOUT_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialSpecialistLoadoutRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("SPECIALIST_TARGET_DENOMINATOR_MISMATCH");
  }
  const deferredAtom = atoms.find((atom) => atom.atomId === DEFERRED_BATCH_ATOM_ID);
  if (deferredAtom?.disposition !== "review_required") {
    fail("SPECIALIST_BATCH_ATOM_MUST_REMAIN_DEFERRED");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE],
    transitionSchema: OFFICIAL_SPECIALIST_LOADOUT_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.32.0-official-specialist-loadout",
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
    fail("SPECIALIST_CATALOGUE_INVALID");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    combatEffectDenominatorHash: input.previousSlice.combatEffectDenominatorHash,
    combatEffectCorrectionReceiptHash:
      input.previousSlice.combatEffectCorrectionReceiptHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID],
    executableScope:
      "current_six_or_nine_model_marine_specialist_assignment_during_army_building",
    specialistProgress: {
      selectedCurrentProfiles: ["AGG-12", "Rocket Launcher"],
      assignmentRuleAtomsExecutable: 4,
      modelLocalReplacementExecutable: true,
      modelLocalNonReplacementAdditionExecutable: true,
      separateAttackBatchAtomId: DEFERRED_BATCH_ATOM_ID,
      separateAttackBatchExecutable: false,
      sidearmExecutable: false,
      indirectFireExecutable: false,
      attackEffectDenominatorChanged: false,
      specialistEffectStatus: "known_unimplemented_until_attack_batch_lifecycle_closes",
    },
    effectKernel: clone(input.previousSlice.effectKernel),
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      officialSourceSnapshotHash:
        "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78",
      officialDatasetHash:
        "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a",
      marineSourceRecordHash:
        "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
      marinePayloadHash:
        "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6",
      liveMarineDocumentCanonicalHash:
        "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
      c14ProfileHash:
        "a20160b32f9965e1b23c17b6d0fdbd3995796dedad0277a52fd15bf194cb7229",
      agg12ProfileHash:
        "ab0ac32f359ecccf3ae1110c663f475bcff182564d9c138f7c23863bab8ad282",
      rocketLauncherProfileHash:
        "bf67c07fba458f4cca9487d63befe57dd8b905d97d01f53dcb24f661a49ceef0",
      coreRuleContentHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      terranP2pContentHash:
        "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
      liveRevalidatedAt: "2026-08-26",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 30,
      remainingActionableAtomsBeforeThisSlice: 585,
      completedAfterThisSlice: 31,
      averageAtomsPerSliceAfterThisSlice: 10.7,
      remainingActionableAtomsAfterThisSlice: 581,
      forecastRemainingSlicesAfterThisSlice: 55,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
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
        "official_specialist_parameter_domain",
        "model_local_replacement_and_addition",
        "negative_assignment_matrix",
        "authority_replay_and_historical_cross_time_replay",
      ],
      crossTimeReplayResult: "assignment_replay_passed_no_skill_promotion",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "specialist-separate-attack-batch-remains-review-required",
        "five-known-attack-effect-atoms-remain-quarantined",
        "remaining-581-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 581,
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
      uiTraceEvidence: [
        "model-id-parameter-domain-exposes-only-current-roster-models",
        "configured-model-loadout-is-returned-by-authority-receipt",
      ],
      agentDecisionEvidence: [
        "rules-own-specialist-carrier-legality-not-model-generated-text",
        "attack-tools-remain-closed-until-batch-sidearm-and-indirect-fire-atoms-pass",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-profile-or-model-assignment-drift-demotes-slice-31",
        "loadout-replay-or-distinct-carrier-failure-demotes-slice-31",
      ],
      userVisibleChecks: [
        "agg12-replaces-c14-only-on-nominated-model",
        "rocket-launcher-carrier-retains-c14",
        "duplicate-upgrade-or-shared-carrier-is-rejected-before-apply",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "specialist-attack-batch-sidearm-and-indirect-fire-execution-pending",
      "remaining-combat-composition-and-global-rule-atoms-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({
    ...body,
    sliceHash: hashStarcraftTmgContract(body),
  });
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => (
          previous.atomId === atom.atomId
        )),
      )
  )).length;
  if (changedNonTargetAtoms !== 0) fail("SPECIALIST_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialSpecialistLoadoutRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("SPECIALIST_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialSpecialistLoadoutRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("SPECIALIST_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => (
          previous.atomId === atom.atomId
        )),
      )
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_specialist_loadout_rule_slice_audit_v1",
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
    rulesTruth: "official_marine_specialist_assignment_exact_subset",
    trainingTruth: false,
  });
}
