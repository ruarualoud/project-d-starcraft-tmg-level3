import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_ACTION_TYPE,
  OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND,
  OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
  OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
  OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS,
  OFFICIAL_MARINE_CHARGE_TRANSITION_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_CHARGE_ACTION_TYPE,
} from "./official-marine-charge-executor-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

export {
  OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND,
  OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS,
};

const SLICE_SCHEMA = "starcraft_tmg_official_marine_charge_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_enemy_stimpack_casualty_rule_slice_v5";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "03daff75c35c1686074cec94a070554385d3f2a27ad55aa9c696305ad0179b45";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e";

const REJECTION_CODES = Object.freeze([
  "CHARGE_ACTION_STALE",
  "CHARGE_ALREADY_ACTIVATED",
  "CHARGE_ASSAULT_INITIATIVE_UNRESOLVED",
  "CHARGE_DATA_BUNDLE_REQUIRED",
  "CHARGE_DATA_SNAPSHOT_MISMATCH",
  "CHARGE_GEOMETRY_SCOPE_UNSUPPORTED",
  "CHARGE_NO_GROUND_TARGETS",
  "CHARGE_NOT_ACTIVE_SIDE",
  "CHARGE_SIDE_PASSED",
  "CHARGE_UNIT_DENOMINATOR_UNSUPPORTED",
  "CHARGE_UNIT_ENGAGED",
  "CHARGE_UNIT_NOT_FOUND",
  "CHARGE_WRONG_PHASE",
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

function bodyOf(slice) {
  return without(slice, ["sliceHash"]);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function verifyPrevious(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(bodyOf(previousSlice)) !== previousSlice.sliceHash) {
    fail("MARINE_CHARGE_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== 421
    || audit.counts.byDisposition.review_required !== 491
    || audit.counts.byDisposition.display_only !== 114) {
    fail("MARINE_CHARGE_PREVIOUS_CATALOGUE_INVALID");
  }
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((entry) => !entry)) fail("MARINE_CHARGE_SOURCE_CLAUSE_MISSING", atom.atomId);
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "charge:");
  return {
    positiveFixtureIds: [`${slug}:single-and-multi-target-success`],
    negativeFixtureIds: [`${slug}:ground-target-distance-overlap-and-undeclared-rejects`],
    interactionFixtureIds: [`${slug}:speed-roll-path-placement-and-engagement-chain`],
    lifecycleFixtureIds: [`${slug}:success-or-failure-consumes-assault-activation`],
    replayFixtureIds: [`${slug}:ed25519-two-stage-charge-replay`],
    sourceDriftFixtureIds: [`${slug}:official-core-and-command-center-drift`],
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
    timing: { phase: "assault", window: "charge", priority: 171 },
    preconditions: [
      {
        predicateId: "assault.unit_is_unengaged_ground_and_unactivated",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "CHARGE_UNIT_ENGAGED",
      },
      {
        predicateId: "assault.charge_targets_are_declared_before_chance",
        inputSchema: OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND,
        failureCode: "CHARGE_ACTION_STALE",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: OFFICIAL_MARINE_CHARGE_ACTION_TYPE,
      parameterSchema: OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MARINE_CHARGE_TRANSITION_SCHEMA,
    },
    chance: {
      kind: "chance_ticket",
      ticketSchema: "starcraft_tmg_chance_bundle_v1",
    },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialMarineChargeRuleSliceV1(input = {}) {
  verifyPrevious(input.previousSlice);
  const previous = input.previousSlice;
  const base = previous.catalogue;
  const clauseById = new Map(base.sourceClauses.map((entry) => [entry.clauseId, entry]));
  const targets = new Set(OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS);
  const observed = [];
  const atoms = base.atoms.map((atom) => {
    if (!targets.has(atom.atomId)) return structuredClone(atom);
    observed.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observed.sort(), [...targets].sort())) {
    fail("MARINE_CHARGE_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = structuredClone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_MARINE_CHARGE_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_CHARGE_ACTION_TYPE,
    ],
    transitionSchema: OFFICIAL_MARINE_CHARGE_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.49.0-official-marine-charge",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== 438
    || catalogueAudit.counts.byDisposition.review_required !== 474
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("MARINE_CHARGE_CATALOGUE_INVALID");
  }
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MARINE_CHARGE_EXECUTOR_ID],
    executableScope:
      "current_official_marine_ground_round_base_no_terrain_charge_declare_roll_move_and_place",
    chargeProgress: {
      officialPart877AtomCount: 17,
      declarationDomainExecutable: true,
      arbitraryDeclaredTargetUnitCount: true,
      currentModelCountSplitSpeedBound: true,
      chanceResolutionExecutable: false,
      successfulMoveAndPlacementExecutable: false,
      failedChargeSettlementExecutable: false,
    },
    officialDataPolicy: structuredClone(previous.officialDataPolicy),
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: ["charge_declaration_domain_red_green_tracer"],
      crossTimeReplayResult: "pending_full_slice_verification",
      promotions: [],
      blocks: ["no-skill-promotion-in-rule-executor-slice"],
      remainingRuleGaps: 474,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt"],
      harnessToolsCalled: ["list_legal_actions"],
      uiTraceEvidence: ["charge-declaration-domain-exposes-leading-model-and-targets"],
      agentDecisionEvidence: ["target-count-is-unbounded-by-ui-slot-count"],
      memoryTraceEvidence: "no-memory-write",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: ["full-charge-judge-or-replay-failure-demotes-slice50"],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: ["charge-resolution-and-global-rule-denominator-incomplete"],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedNonTargets = slice.catalogue.atoms.filter((atom) => (
    !targets.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        previous.catalogue.atoms.find((entry) => entry.atomId === atom.atomId),
      )
  ));
  if (changedNonTargets.length !== 0) fail("MARINE_CHARGE_NON_TARGET_MUTATION");
  return slice;
}

export function verifyOfficialMarineChargeRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(bodyOf(input.slice)) !== input.slice.sliceHash) {
    fail("MARINE_CHARGE_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineChargeRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("MARINE_CHARGE_SLICE_CONTENT_MISMATCH");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  return freezeDeep({
    schema: "starcraft_tmg_official_marine_charge_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      executableRuleAtoms: audit.counts.byDisposition.executable,
      newlyExecutableRuleAtoms: input.slice.newlyExecutableRuleAtomIds.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms: 0,
    },
    executableContractGaps: audit.executableContractGaps,
    evidenceGaps: audit.evidenceGaps,
    rulesEligible: false,
    trainingTruth: false,
  });
}
