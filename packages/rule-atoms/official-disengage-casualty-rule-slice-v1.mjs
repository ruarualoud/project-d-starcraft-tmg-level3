import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
  OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS,
  OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND,
  OFFICIAL_DISENGAGE_CASUALTY_TRANSITION_SCHEMA,
} from "./official-disengage-casualty-executor-v1.mjs";
import {
  OFFICIAL_DISENGAGE_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_NEW_ATOM_IDS,
} from "./official-disengage-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_disengage_casualty_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_disengage_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "b323a7bd016cf4eb9452b94dbe8db7d3264c797138b8c888e026ec35a354e67f";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "908bba33a920c88ddff5b42a88d82f96f9583b05176ec8bff755a293fff6bb3b";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 237;
const EXPECTED_EXECUTABLE_COUNT = 239;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "DISENGAGE_ACTION_INVALID",
  "DISENGAGE_ACTION_STALE",
  "DISENGAGE_CASUALTY_NOT_REQUIRED",
  "DISENGAGE_CASUALTY_PROOF_SCOPE_UNSUPPORTED",
  "DISENGAGE_CASUALTY_SUPPLY_LEDGER_REQUIRED",
  "DISENGAGE_LEADING_FAILURE_NOT_PROVED",
  "DISENGAGE_LEADING_OUTCOME_INVALID",
  "DISENGAGE_PLACEMENT_OUTCOME_INVALID",
  "DISENGAGE_SUPPLY_STATE_STALE",
  "SUPPLY_LOSS_LEDGER_HASH_MISMATCH",
  "SUPPLY_LOSS_LEDGER_RUNTIME_MISMATCH",
  "SUPPLY_LOSS_TRANSITION_INVALID",
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
    fail("official_disengage_casualty_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 675
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_disengage_casualty_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_disengage_casualty_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId, family = "disengage-casualty") {
  const slug = atomId.replace(/^rule-atom:/u, `${family}:`);
  return {
    positiveFixtureIds: [`${slug}:proved-removal-and-leading-failure`],
    negativeFixtureIds: [`${slug}:unproved-casualty-and-state-drift-rejected`],
    interactionFixtureIds: [`${slug}:supply-ledger-round-supply-and-alternation`],
    lifecycleFixtureIds: [`${slug}:destroyed-model-current-supply-and-assault-restriction`],
    replayFixtureIds: [`${slug}:ed25519-casualty-replay`],
    sourceDriftFixtureIds: [`${slug}:core-command-center-runtime-drift`],
  };
}

function reassignedAtom(atom) {
  return {
    ...structuredClone(atom),
    atomVersion: "2.0.0",
    legalSpace: {
      ...structuredClone(atom.legalSpace),
      parameterSchema: OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
      transitionSchema: OFFICIAL_DISENGAGE_CASUALTY_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...(atom.rejectionCodes || []),
      ...REJECTION_CODES,
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: evidence(atom.atomId, "disengage-v2"),
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
    owner: { authority: "rules", actor: "active_seat" },
    timing: { phase: "movement", window: "disengage", priority: 123 },
    preconditions: [
      {
        predicateId: "movement.unit_is_on_table_unactivated_and_engaged",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "DISENGAGE_UNIT_NOT_ENGAGED",
      },
      {
        predicateId: "movement.failed_model_has_no_legal_integer_lattice_endpoint",
        inputSchema: "starcraft_tmg_disengage_endpoint_feasibility_receipt_v1",
        failureCode: "DISENGAGE_CASUALTY_NOT_REQUIRED",
      },
      {
        predicateId: "movement.disengage_casualty_updates_supply_immediately",
        inputSchema: "starcraft_tmg_official_supply_loss_ledger_v1",
        failureCode: "DISENGAGE_CASUALTY_SUPPLY_LEDGER_REQUIRED",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: "disengage",
      parameterSchema: OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
      transitionSchema: OFFICIAL_DISENGAGE_CASUALTY_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_DISENGAGE_NEW_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialDisengageCasualtyRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const reassignedIds = new Set(OFFICIAL_DISENGAGE_NEW_ATOM_IDS);
  const newIds = new Set(OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS);
  const changedIds = new Set([...reassignedIds, ...newIds]);
  const observedReassignedIds = [];
  const observedNewIds = [];
  const atoms = base.atoms.map((atom) => {
    if (reassignedIds.has(atom.atomId)) {
      observedReassignedIds.push(atom.atomId);
      return reassignedAtom(atom);
    }
    if (newIds.has(atom.atomId)) {
      observedNewIds.push(atom.atomId);
      return executableAtom(atom, clauseById, base.rulesVersion);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedReassignedIds.sort(), [...reassignedIds].sort())
    || !isDeepStrictEqual(observedNewIds.sort(), [...newIds].sort())) {
    fail("official_disengage_casualty_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_DISENGAGE_EXECUTOR_ID
  ));
  executorManifest.push({
    executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
    actionTypes: ["disengage"],
    transitionSchema: OFFICIAL_DISENGAGE_CASUALTY_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.22.0-official-disengage-casualty",
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
    || catalogueAudit.counts.byDisposition.review_required !== 673
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_disengage_casualty_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_DISENGAGE_NEW_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID],
    executableScope:
      "gauntlet_marine_no_terrain_disengage_casualty_with_conservative_complete_endpoint_proof",
    casualtyScope: {
      supported: [
        "explicit-leading-and-remaining-model-placed-or-casualty-outcomes",
        "complete-bounded-milli-inch-endpoint-interval-union-proof",
        "ordinary-model-removal-while-successfully-cleared-models-remain",
        "leading-model-removal-with-whole-unit-position-rollback-and-activation-end",
        "immediate-current-supply-and-round-supply-recalculation",
        "hash-chained-disengage-removal-supply-loss-witness-with-unresolved-scoring-attribution",
        "declaration-time-tactical-mass-and-following-assault-restriction",
      ],
      unsupported: [
        "casualty-claim-when-any-broader-physical-endpoint-exists",
        "curved-path-exhaustion-proof-for-leading-model",
        "terrain-grass-gap-ramp-access-elevation-flying-or-burrowed",
        "non-marine-non-round-base-and-special-movement",
        "victory-point-credit-for-self-caused-disengage-loss",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      currentValueAuthority: "current_official_command_center_71_69_48",
      coreRuleAuthority:
        "official_core_pdf_sha256_27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      missingBaseFieldAuthority: "latest_official_terran_p2p_may_2026_page_1",
      repositoryFallbackAllowed: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 20,
      historicalAverageAtomsPerSlice: 237 / 20,
      remainingActionableAtomsBeforeThisSlice: 675,
      forecastRemainingSlicesBeforeThisSlice: 57,
      completedAfterThisSlice: 21,
      averageAtomsPerSliceAfterThisSlice: 239 / 21,
      remainingActionableAtomsAfterThisSlice: 673,
      forecastRemainingSlicesAfterThisSlice: 60,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousRuntimeHash:
        "92b5d5f6c7d56e03ffdf3728712ddd98cfb1a956256e31e76ce32c6dc4a0dbe5",
      replacedExecutorId: OFFICIAL_DISENGAGE_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "disengage_casualty_replay_required_no_promotion",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "broader-disengage-terrain-flying-and-scoring-attribution-remain-fail-closed",
        "remaining-673-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 673,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      uiTraceEvidence: "disengage-casualty-preview-contract-only-device-ui-pending",
      agentDecisionEvidence:
        "rules-owned-endpoint-impossibility-proof-no-model-or-client-casualty-authority",
      memoryTraceEvidence: "no-memory-or-skill-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-source-runtime-or-proof-hash-drift-quarantines-the-slice",
        "unproved-casualty-supply-ledger-or-replay-failure-demotes-the-slice",
      ],
      userVisibleChecks: [
        "legal-space-requires-explicit-leading-and-model-outcomes",
        "preview-exposes-casualty-models-current-supply-and-proof-receipts",
        "unnecessary-casualty-is-rejected-instead-of-freeing-supply",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "complete-movement-terrain-units-assault-consumers-device-ui-and-production-pending",
      "complete-rules-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !changedIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  if (changedNonTargetAtoms !== 0) fail("official_disengage_casualty_non_target_mutation");
  return slice;
}

export function verifyOfficialDisengageCasualtyRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_disengage_casualty_slice_hash_mismatch");
  }
  const expected = createOfficialDisengageCasualtyRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_disengage_casualty_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set([
    ...OFFICIAL_DISENGAGE_NEW_ATOM_IDS,
    ...OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS,
  ]);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    schema: "starcraft_tmg_official_disengage_casualty_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      executableRuleAtoms: audit.counts.byDisposition.executable,
      newlyExecutableRuleAtoms: OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS.length,
      versionReassignedRuleAtoms: OFFICIAL_DISENGAGE_NEW_ATOM_IDS.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
    },
    executableContractGaps: audit.executableContractGaps,
    evidenceGaps: audit.evidenceGaps,
    rulesEligible: false,
    trainingTruth: false,
  });
}
