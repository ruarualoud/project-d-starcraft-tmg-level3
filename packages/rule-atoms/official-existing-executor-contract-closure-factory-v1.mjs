import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1, createRuleRelationshipGraphV1 } from
  "./rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "./rule-executor-state-contract-coverage-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
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

function nextMajor(version, codePrefix) {
  const major = Number(String(version || "").split(".")[0]);
  if (!Number.isSafeInteger(major) || major < 1) {
    fail(`${codePrefix}_ATOM_VERSION_INVALID`);
  }
  return `${major + 1}.0.0`;
}

function releaseHash(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function validateConfig(config) {
  if (!object(config)
    || !String(config.codePrefix || "").match(/^[A-Z0-9_]+$/u)
    || !String(config.sliceSchema || "").startsWith("starcraft_tmg_")
    || !String(config.auditSchema || "").startsWith("starcraft_tmg_")
    || !String(config.previousSliceSchema || "").startsWith("starcraft_tmg_")
    || !releaseHash(config.previousSliceHash)
    || !releaseHash(config.previousCatalogueHash)
    || !releaseHash(config.previousRuntimeHash)
    || !releaseHash(config.previousGraphHash)
    || !releaseHash(config.expectedSliceHash)
    || !releaseHash(config.expectedCatalogueHash)
    || !releaseHash(config.expectedRuntimeHash)
    || !releaseHash(config.expectedGraphHash)
    || typeof config.previousRelationshipExtension !== "function"
    || typeof config.currentRelationshipExtension !== "function"
    || !Array.isArray(config.migrations)
    || config.migrations.length < 1
    || !object(config.expectedCoverage)) {
    fail("EXECUTOR_CONTRACT_CLOSURE_CONFIG_INVALID");
  }
}

function verifyPreviousSlice(config, previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== config.previousSliceSchema
    || previousSlice.sliceHash !== config.previousSliceHash
    || previousSlice.catalogueHash !== config.previousCatalogueHash
    || previousSlice.catalogue?.catalogueHash !== config.previousCatalogueHash
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash) {
    fail(`${config.codePrefix}_PREVIOUS_SLICE_INVALID`);
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: config.previousRelationshipExtension({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || runtime.descriptor.runtimeHash !== config.previousRuntimeHash
    || graph.graphHash !== config.previousGraphHash) {
    fail(`${config.codePrefix}_PREVIOUS_RELEASE_DRIFT`);
  }
}

function migrationAtomIds(config) {
  return [...new Set(config.migrations.flatMap((migration) => migration.atomIds))]
    .sort((left, right) => left.localeCompare(right));
}

function reboundAtom(config, migration, atom) {
  const slug = atom.atomId.replace(/^rule-atom:/u, `${migration.evidenceSlug}:`);
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion, config.codePrefix),
    effect: {
      ...clone(atom.effect),
      executorId: migration.toExecutorId,
      transitionSchema: migration.transitionSchema,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      ...migration.rejectionCodes,
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: {
      positiveFixtureIds: [...atom.evidence.positiveFixtureIds,
        `${slug}:latest-official-public-contract-success`],
      negativeFixtureIds: [...atom.evidence.negativeFixtureIds,
        `${slug}:stale-source-adapter-and-action-rejection`],
      interactionFixtureIds: [...atom.evidence.interactionFixtureIds,
        `${slug}:declared-cross-rule-interaction`],
      lifecycleFixtureIds: [...atom.evidence.lifecycleFixtureIds,
        `${slug}:exact-state-lifecycle`],
      replayFixtureIds: [...atom.evidence.replayFixtureIds,
        `${slug}:authority-ed25519-replay-after-hmac-rotation`],
      sourceDriftFixtureIds: [...atom.evidence.sourceDriftFixtureIds,
        `${slug}:frozen-v1-and-live-official-71-69-48`],
    },
  };
}

function createCurrentCatalogue(config, previousCatalogue) {
  const allTargetIds = migrationAtomIds(config);
  if (allTargetIds.length !== config.expectedMigratedAtomCount) {
    fail(`${config.codePrefix}_TARGET_DENOMINATOR_MISMATCH`);
  }
  const migrationByAtomId = new Map();
  for (const migration of config.migrations) {
    for (const atomId of migration.atomIds) {
      if (migrationByAtomId.has(atomId)) {
        fail(`${config.codePrefix}_TARGET_OVERLAP`, atomId);
      }
      migrationByAtomId.set(atomId, migration);
    }
  }
  const observed = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    const migration = migrationByAtomId.get(atom.atomId);
    if (!migration) return clone(atom);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== migration.fromExecutorId) {
      fail(`${config.codePrefix}_TARGET_ASSIGNMENT_INVALID`, atom.atomId);
    }
    observed.push(atom.atomId);
    return reboundAtom(config, migration, atom);
  });
  if (!isDeepStrictEqual(observed.sort(), allTargetIds)) {
    fail(`${config.codePrefix}_TARGET_DENOMINATOR_MISMATCH`);
  }
  const oldIds = new Set(config.migrations.map((migration) => migration.fromExecutorId));
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => !oldIds.has(entry.executorId))
    .map(clone);
  for (const migration of config.migrations) {
    executorManifest.push({
      executorId: migration.toExecutorId,
      executorVersion: migration.toExecutorVersion,
      actionTypes: [...migration.actionTypes],
      transitionSchema: migration.transitionSchema,
    });
  }
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: config.catalogueVersion,
    rulesVersion: previousCatalogue.rulesVersion,
    sourceDenominatorStatus: previousCatalogue.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(previousCatalogue.sourceDenominatorBinding),
    sourceSnapshots: clone(previousCatalogue.sourceSnapshots),
    sourceClauses: clone(previousCatalogue.sourceClauses),
    atoms,
    executorManifest,
  });
}

function buildEvidence(config, catalogue, { freezeRelease = true } = {}) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: config.currentRelationshipExtension({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  const expected = config.expectedCoverage;
  if ((freezeRelease && (
    catalogue.catalogueHash !== config.expectedCatalogueHash
      || runtime.descriptor.runtimeHash !== config.expectedRuntimeHash
      || graph.graphHash !== config.expectedGraphHash
  ))
    || catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || relationshipAudit.valid !== true
    || relationshipAudit.declaredScopesValid !== true
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 42
    || relationshipAudit.counts.declaredStateContractExecutors
      !== expected.declaredStateContractExecutors
    || relationshipAudit.counts.stateContractMissingExecutors
      !== expected.missingStateContractExecutors
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: expected.strictCompleteAtoms,
      partialContractAtoms: expected.partialContractAtoms,
      noContractAtoms: expected.noContractAtoms,
      executors: 42,
      declaredStateContractExecutors: expected.declaredStateContractExecutors,
      missingStateContractExecutors: expected.missingStateContractExecutors,
    })) {
    fail(`${config.codePrefix}_EVIDENCE_INVALID`, JSON.stringify({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
      graphHash: graph.graphHash,
      relationship: relationshipAudit.counts,
      gaps: relationshipAudit.gaps,
      coverage: stateContractCoverage.counts,
    }));
  }
  return { catalogueAudit, runtime: runtime.descriptor, graph,
    relationshipAudit, stateContractCoverage };
}

export function createOfficialExistingExecutorContractClosureSliceV1(
  config,
  input = {},
) {
  validateConfig(config);
  verifyPreviousSlice(config, input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCurrentCatalogue(config, previous.catalogue);
  const freezeRelease = input.freezeRelease !== false;
  const evidence = buildEvidence(config, catalogue, { freezeRelease });
  const migratedAtomIds = migrationAtomIds(config);
  const carried = without(clone(previous), [
    "schema", "sliceHash", "previousSliceHash", "previousCatalogueHash",
    "catalogue", "catalogueHash", "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds", "contractEvidenceReboundRuleAtomIds",
    "executorIds", "executableScope", "existingExecutorContractClosureProgress",
    "ruleRelationshipGraphBinding", "ruleRelationshipProgress", "sliceForecast",
    "historicalCompatibility", "ctx2skill", "harness", "blocks",
  ]);
  const expected = config.expectedCoverage;
  const body = {
    schema: config.sliceSchema,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    ...carried,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: migratedAtomIds,
    contractEvidenceReboundRuleAtomIds: migratedAtomIds,
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: config.migrations.map((migration) => migration.toExecutorId),
    executableScope: config.executableScope,
    existingExecutorContractClosureProgress: clone(config.contractProgress),
    ruleRelationshipGraphBinding: {
      graphSchema: evidence.graph.schema,
      graphHash: evidence.graph.graphHash,
      relationshipAuthority: evidence.graph.relationshipAuthority,
      rulesAuthority: false,
      catalogueHash: evidence.graph.catalogueHash,
      nodeCount: evidence.graph.nodes.length,
      edgeCount: evidence.graph.edges.length,
      coverageScopeCount: evidence.graph.coverageScopes.length,
      declaredStateContractExecutorCount:
        evidence.graph.declaredStateContractExecutorIds.length,
    },
    ruleRelationshipProgress: {
      contractGroup: config.contractGroup,
      contractComplete: true,
      historicalV1RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: expected.strictCompleteAtoms,
      partialContractAtomCount: expected.partialContractAtoms,
      noContractAtomCount: expected.noContractAtoms,
      nonStrictAtomCount: expected.partialContractAtoms + expected.noContractAtoms,
      declaredStateContractExecutorCount: expected.declaredStateContractExecutors,
      stateContractMissingExecutorCount: expected.missingStateContractExecutors,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: clone(config.sliceForecast),
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: config.previousRuntimeHash,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      frozenExecutorIds: config.migrations.map((migration) => migration.fromExecutorId),
      replacementExecutorIds: config.migrations.map((migration) => migration.toExecutorId),
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v25",
      previousActionSchemaVersion: "hybrid_legal_space_v25",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: config.judgeTestsRun,
      crossTimeReplayResult: config.crossTimeReplayResult,
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        `${expected.missingStateContractExecutors}_executor_contracts_open`,
        "remaining_491_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 491,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
      harnessToolsCalled: ["read_board_state", "list_legal_actions", "preview_action",
        "apply_action_after_user_confirmation", "replay_room"],
      uiTraceEvidence: config.uiTraceEvidence,
      agentDecisionEvidence: config.agentDecisionEvidence,
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [...config.rollbackOrDemotionRules],
      userVisibleChecks: [...config.userVisibleChecks],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      `${expected.missingStateContractExecutors}_existing_executor_contracts_remain`,
      `${expected.partialContractAtoms + expected.noContractAtoms}_existing_atoms_remain_non_strict`,
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (freezeRelease && slice.sliceHash !== config.expectedSliceHash) {
    fail(`${config.codePrefix}_SLICE_HASH_DRIFT`, slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingExecutorContractClosureSliceV1(
  config,
  input = {},
) {
  validateConfig(config);
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== config.sliceSchema
    || slice.sliceHash !== config.expectedSliceHash
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail(`${config.codePrefix}_SLICE_HASH_MISMATCH`);
  }
  const expectedSlice = createOfficialExistingExecutorContractClosureSliceV1(config, {
    previousSlice: input.previousSlice,
  });
  const migratedAtomIds = migrationAtomIds(config);
  if (!isDeepStrictEqual(slice, expectedSlice)
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(slice.versionReassignedRuleAtomIds, migratedAtomIds)) {
    fail(`${config.codePrefix}_CONTENT_INVALID`);
  }
  const evidence = buildEvidence(config, slice.catalogue, { freezeRelease: true });
  return freezeDeep({
    schema: config.auditSchema,
    valid: true,
    counts: {
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      changedAtoms: migratedAtomIds.length,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      missingStateContractExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
    },
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    graphAudit: evidence.relationshipAudit,
    stateContractCoverage: evidence.stateContractCoverage,
    relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false,
    productionEligible: false,
    trainingTruth: false,
  });
}
