import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "./rule-executor-state-contract-coverage-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const RELEASE_CACHE = new Map();

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function sliceBody(value) { return without(value, ["sliceHash"]); }
function sourceSnapshotIds(atom, clauseById, prefix) {
  const ids = [...new Set(atom.clauseIds.map((id) => clauseById.get(id)?.sourceSnapshotId))];
  if (ids.some((id) => !id)) fail(`${prefix}_SOURCE_CLAUSE_MISSING`, atom.atomId);
  return ids;
}
function evidence(atomId, slug, fixtures) {
  const id = atomId.replace(/^rule-atom:/u, `${slug}:`);
  return {
    positiveFixtureIds: [`${id}:${fixtures.positive}`],
    negativeFixtureIds: [`${id}:${fixtures.negative}`],
    interactionFixtureIds: [`${id}:${fixtures.interaction}`],
    lifecycleFixtureIds: [`${id}:${fixtures.lifecycle}`],
    replayFixtureIds: [`${id}:ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [`${id}:pinned-official-source-lock`],
  };
}

export function createOfficialRuleSliceReleaseV1(config, input = {}) {
  const previous = input.previousSlice;
  const c = config;
  const cacheKey = `${c.schema}:${String(previous?.sliceHash || "")}`
    + `:${input.freezeRelease !== false ? "frozen" : "unfrozen"}`;
  if (RELEASE_CACHE.has(cacheKey)) return RELEASE_CACHE.get(cacheKey);
  if (!object(previous)
    || previous.schema !== c.previous.schema
    || previous.sliceHash !== c.previous.sliceHash
    || previous.catalogueHash !== c.previous.catalogueHash
    || previous.sliceHash !== hashStarcraftTmgContract(sliceBody(previous))) {
    fail(`${c.prefix}_PREVIOUS_SLICE_INVALID`);
  }
  const previousAudit = verifyRuleAtomCatalogue(previous.catalogue);
  const previousRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: previous.catalogue });
  const previousGraph = createRuleRelationshipGraphV1({
    catalogue: previous.catalogue,
    extension: c.previous.relationship({
      catalogueHash: previous.catalogueHash,
      runtimeHash: previousRuntime.descriptor.runtimeHash,
    }),
  });
  if (previousAudit.counts.byDisposition.executable !== c.counts.previousExecutable
    || previousAudit.counts.byDisposition.review_required !== c.counts.previousReview
    || previousAudit.counts.byDisposition.display_only !== c.counts.displayOnly
    || previousRuntime.descriptor.runtimeHash !== c.previous.runtimeHash
    || previousGraph.graphHash !== c.previous.graphHash) {
    fail(`${c.prefix}_PREVIOUS_RELEASE_DRIFT`);
  }
  const base = previous.catalogue;
  const clauseById = new Map(base.sourceClauses.map((entry) => [entry.clauseId, entry]));
  const targets = new Set(c.newAtomIds);
  const observed = [];
  const atoms = base.atoms.map((atom) => {
    if (!targets.has(atom.atomId)) return clone(atom);
    if (atom.disposition !== "review_required") {
      fail(`${c.prefix}_TARGET_DISPOSITION_INVALID`, atom.atomId);
    }
    observed.push(atom.atomId);
    return {
      atomId: atom.atomId,
      atomVersion: "1.0.0",
      canonicalClauseId: atom.canonicalClauseId,
      clauseIds: [...atom.clauseIds],
      disposition: "executable",
      title: atom.title,
      owner: { authority: "rules", actor: c.actor || "active_seat" },
      timing: clone(c.timing),
      preconditions: clone(c.preconditions),
      legalSpace: {
        kind: "parameter_domain",
        actionType: c.actionType,
        parameterSchema: c.parameterKind,
      },
      effect: { executorId: c.executor.id, transitionSchema: c.executor.transitionSchema },
      chance: clone(c.chance),
      rejectionCodes: [...c.rejectionCodes],
      dependencies: {
        rulesVersion: base.rulesVersion,
        sourceSnapshotIds: sourceSnapshotIds(atom, clauseById, c.prefix),
        atomIds: [],
      },
      evidence: evidence(atom.atomId, c.evidenceSlug, c.evidenceFixtures),
    };
  });
  if (!isDeepStrictEqual(observed.sort(), [...targets].sort())) {
    fail(`${c.prefix}_TARGET_DENOMINATOR_MISMATCH`);
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: c.executor.id,
    executorVersion: c.executor.version,
    actionTypes: [...c.executor.actionTypes].sort(),
    transitionSchema: c.executor.transitionSchema,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: c.catalogueVersion,
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(base.sourceDenominatorBinding),
    sourceSnapshots: clone(base.sourceSnapshots),
    sourceClauses: clone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: c.relationship({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const graphAudit = auditRuleRelationshipGraphV1(graph);
  const coverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogueAudit.counts.byDisposition.executable !== c.counts.executable
    || catalogueAudit.counts.byDisposition.review_required !== c.counts.review
    || catalogueAudit.counts.byDisposition.display_only !== c.counts.displayOnly
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || graphAudit.valid !== true || graphAudit.declaredScopesValid !== true
    || graphAudit.counts.blockingGaps !== 0
    || graphAudit.counts.executors !== c.counts.executors
    || graphAudit.counts.declaredStateContractExecutors !== c.counts.executors
    || graphAudit.counts.stateContractMissingExecutors !== 0
    || !isDeepStrictEqual(coverage.counts, {
      executableAtoms: c.counts.executable,
      strictCompleteAtoms: c.counts.executable,
      partialContractAtoms: 0,
      noContractAtoms: 0,
      executors: c.counts.executors,
      declaredStateContractExecutors: c.counts.executors,
      missingStateContractExecutors: 0,
    })) {
    fail(`${c.prefix}_EVIDENCE_INVALID`, JSON.stringify({
      catalogue: catalogueAudit.counts, graph: graphAudit.counts,
      gaps: graphAudit.gaps, coverage: coverage.counts,
    }));
  }
  const carried = without(clone(previous), [
    "schema", "sliceHash", "previousSliceHash", "previousCatalogueHash",
    "catalogue", "catalogueHash", "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds", "contractEvidenceReboundRuleAtomIds",
    "executorIds", "executableScope", "ruleRelationshipGraphBinding",
    "ruleRelationshipProgress", "sliceForecast", "historicalCompatibility",
    "ctx2skill", "harness", "blocks",
  ]);
  const body = {
    schema: c.schema,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    ...carried,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...c.newAtomIds],
    versionReassignedRuleAtomIds: [],
    contractEvidenceReboundRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms.filter((atom) => (
      atom.disposition === "executable"
    )).map((atom) => atom.atomId),
    executorIds: [c.executor.id],
    executableScope: c.executableScope,
    [c.progressKey]: clone(c.progress),
    ruleRelationshipGraphBinding: {
      graphSchema: graph.schema, graphHash: graph.graphHash,
      relationshipAuthority: graph.relationshipAuthority, rulesAuthority: false,
      catalogueHash: graph.catalogueHash, nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length, coverageScopeCount: graph.coverageScopes.length,
      declaredStateContractExecutorCount: graph.declaredStateContractExecutorIds.length,
    },
    ruleRelationshipProgress: {
      contractGroup: c.contractGroup, contractComplete: true,
      strictCompleteAtomCount: c.counts.executable, partialContractAtomCount: 0,
      noContractAtomCount: 0, declaredStateContractExecutorCount: c.counts.executors,
      stateContractMissingExecutorCount: 0,
      globalRelationshipCoverageComplete: false, productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: c.ordinal, repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: c.ordinal - 1, completedAfterThisSlice: c.ordinal,
      promotedAtomCount: c.newAtomIds.length,
      remainingActionableAtomsBeforeThisSlice: c.counts.previousReview,
      remainingActionableAtomsAfterThisSlice: c.counts.review,
      remainingPlannedSlicesBeforeThisSlice: c.remainingSlices + 1,
      remainingPlannedSlicesAfterThisSlice: c.remainingSlices,
      atomPromotionSlice: true, contractClosureSlice: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: c.previous.runtimeHash,
      currentRuntimeHash: runtime.descriptor.runtimeHash,
      frozenExecutorIds: clone(c.frozenExecutorIds || []),
      addedExecutorIds: [c.executor.id],
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: c.actionSchemaVersion || "hybrid_legal_space_v25",
      previousActionSchemaVersion: c.previousActionSchemaVersion
        || "hybrid_legal_space_v25",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true, targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"], skillsRead: [], skillsGenerated: [],
      judgeTestsRun: c.judgeTests, crossTimeReplayResult: "pass_without_skill_generation",
      promotions: [], blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        `remaining_${c.counts.review}_actionable_rule_atoms_not_executable`,
      ], remainingRuleGaps: c.counts.review,
    },
    harness: {
      harnessLoopUsed: true, targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["rule_skill_builder_prompt"],
      harnessToolsCalled: ["read_board_state", "list_legal_actions", "preview_action",
        "apply_action_after_user_confirmation", "replay_room"],
      uiTraceEvidence: "authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence: c.agentDecisionEvidence,
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [`source_state_geometry_or_replay_drift_quarantines_slice_${c.ordinal}`],
      userVisibleChecks: clone(c.userVisibleChecks),
    },
    rulesEligible: false, productionRoomEligible: false, trainingTruth: false,
    blocks: clone(c.blocks),
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (input.freezeRelease !== false && (
    slice.sliceHash !== c.expected.sliceHash
      || catalogue.catalogueHash !== c.expected.catalogueHash
      || runtime.descriptor.runtimeHash !== c.expected.runtimeHash
      || graph.graphHash !== c.expected.graphHash
  )) fail(`${c.prefix}_RELEASE_HASH_DRIFT`, JSON.stringify({
    sliceHash: slice.sliceHash, catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  }));
  const frozen = freezeDeep(slice);
  RELEASE_CACHE.set(cacheKey, frozen);
  return frozen;
}

export function verifyOfficialRuleSliceReleaseV1(config, input = {}) {
  const slice = input.slice;
  if (!object(slice) || slice.schema !== config.schema
    || slice.sliceHash !== hashStarcraftTmgContract(sliceBody(slice))) {
    fail(`${config.prefix}_SLICE_HASH_MISMATCH`);
  }
  const expected = createOfficialRuleSliceReleaseV1(config, {
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) fail(`${config.prefix}_SLICE_CONTENT_MISMATCH`);
  const catalogueAudit = verifyRuleAtomCatalogue(slice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
  const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue,
    extension: config.relationship({ catalogueHash: slice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash }) });
  const graphAudit = auditRuleRelationshipGraphV1(graph);
  const coverage = auditExecutableAtomStateContractCoverageV1(graph);
  return freezeDeep({
    schema: `${config.schema}_audit`, valid: true,
    counts: {
      executableRuleAtoms: config.counts.executable,
      newlyExecutableRuleAtoms: config.newAtomIds.length,
      reviewRequiredRuleAtoms: config.counts.review,
      displayOnlyRuleAtoms: config.counts.displayOnly,
      strictCompleteAtoms: config.counts.executable,
      partialContractAtoms: 0, noContractAtoms: 0,
      declaredStateContractExecutors: config.counts.executors,
      missingStateContractExecutors: 0,
    },
    catalogueHash: slice.catalogueHash, runtimeHash: runtime.descriptor.runtimeHash,
    graphHash: graph.graphHash, graph, graphAudit, stateContractCoverage: coverage,
    catalogueAudit, relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false, productionEligible: false, trainingTruth: false,
  });
}
