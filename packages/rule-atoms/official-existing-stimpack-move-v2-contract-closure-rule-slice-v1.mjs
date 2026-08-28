import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementV3RelationshipExtensionV1 } from
  "./official-movement-v3-relationship-contract-v1.mjs";
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
import {
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
} from "./official-stimpack-move-consumer-executor-v1.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
  OFFICIAL_STIMPACK_MOVE_V2_TRANSITION_SCHEMA,
} from "./official-stimpack-move-consumer-executor-v2.mjs";
import {
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
} from "./official-start-of-round-executor-v3.mjs";
import {
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V4_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v4.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
} from "./official-reserve-deploy-executor-v3.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_DEPLOY_V4_PARAMETER_KIND,
  OFFICIAL_RESERVE_DEPLOY_V4_TRANSITION_SCHEMA,
} from "./official-reserve-deploy-executor-v4.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
} from "./official-standard-move-executor-v3.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_V4_PARAMETER_KIND,
  OFFICIAL_STANDARD_MOVE_V4_TRANSITION_SCHEMA,
} from "./official-standard-move-executor-v4.mjs";
import {
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
} from "./official-disengage-executor-v3.mjs";
import {
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
  OFFICIAL_DISENGAGE_V4_PARAMETER_KIND,
  OFFICIAL_DISENGAGE_V4_TRANSITION_SCHEMA,
} from "./official-disengage-executor-v4.mjs";
import { createOfficialStimpackMoveV2RelationshipExtensionV1 } from
  "./official-stimpack-move-v2-relationship-contract-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_stimpack_move_v2_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_movement_v3_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "78b19c6ef0e4565eda951d3a7e955834748a1cdb1b886d8fd4041e75a7ce47f3";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "f19484a581bf48ad3aa574aea7ae17f636d37af9a8eecbce6d2485d7bbb62d25";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "37055400db59c426f8bd5fb20fc23a8e416b9ed7804255c3bf1bc7b6e77d731a";
const EXPECTED_SLICE_HASH =
  "4f92a8afde13bf27cbe8a32c3df1cfd1c02d4b1ca1894969a55eb7722c360b35";
const EXPECTED_CATALOGUE_HASH =
  "d378ecc5f91753d80251dbf37ecdee1c17cdf3a36c001f9855cbb896d588faa9";
const EXPECTED_RUNTIME_HASH =
  "51f3d865c2dde8735a8b6f58248d91207d03370b9ac0f0f04a8786c5e7c31241";
const EXPECTED_GRAPH_HASH =
  "1fbbe7c6f361ed9dceefe5d3d59cba25617f17c399e00a671ccb98018c8dbb7a";

export const OFFICIAL_STIMPACK_MOVE_V2_MIGRATED_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-buff-value:260df1f72f16",
]);
export const OFFICIAL_MOVEMENT_V4_MIGRATED_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_DISENGAGE_V4_EXECUTOR_ATOM_IDS,
  ]),
].sort());
export const OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MOVEMENT_V4_MIGRATED_ATOM_IDS,
    ...OFFICIAL_STIMPACK_MOVE_V2_MIGRATED_ATOM_IDS,
  ]),
].sort());

const EXECUTOR_MIGRATIONS = Object.freeze([
  Object.freeze({
    oldExecutorId: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
    newExecutorId: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_START_OF_ROUND_V4_TRANSITION_SCHEMA,
    parameterSchema: null,
    atomIds: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["resolve_start_of_round"]),
    slug: "start-of-round-v4-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
    newExecutorId: OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_RESERVE_DEPLOY_V4_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_RESERVE_DEPLOY_V4_PARAMETER_KIND,
    atomIds: OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["deploy"]),
    slug: "reserve-deploy-v4-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
    newExecutorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_STANDARD_MOVE_V4_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_STANDARD_MOVE_V4_PARAMETER_KIND,
    atomIds: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["move"]),
    slug: "standard-move-v4-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
    newExecutorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_DISENGAGE_V4_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_DISENGAGE_V4_PARAMETER_KIND,
    atomIds: OFFICIAL_DISENGAGE_V4_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["disengage"]),
    slug: "disengage-v4-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
    newExecutorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_STIMPACK_MOVE_V2_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
    atomIds: OFFICIAL_STIMPACK_MOVE_V2_MIGRATED_ATOM_IDS,
    actionTypes: Object.freeze(["move"]),
    slug: "stimpack-move-v2",
  }),
]);
const MIGRATION_BY_ATOM_ID = new Map(EXECUTOR_MIGRATIONS.flatMap((migration) => (
  migration.atomIds.map((atomId) => [atomId, migration])
)));

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

function nextMajor(version) {
  const major = Number(String(version || "").split(".")[0]);
  if (!Number.isSafeInteger(major) || major < 1) {
    fail("STIMPACK_MOVE_V2_CONTRACT_ATOM_VERSION_INVALID");
  }
  return `${major + 1}.0.0`;
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || previousSlice.catalogue?.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash) {
    fail("STIMPACK_MOVE_V2_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  const previousGraph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialMovementV3RelationshipExtensionV1({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || previousGraph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("STIMPACK_MOVE_V2_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId, migration) {
  const slug = atomId.replace(/^rule-atom:/u, `${migration.slug}:`);
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:current-start-v4-loadout-phase-supply-ledger-success`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-loadout-start-phase-supply-ledger-domain-action-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:current-movement-v4-and-stimpack-v2-composition`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:selected-loadout-persists-across-current-movement-transition`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-previous-current-replacement-and-live-official-71-69-48`],
  };
}

function rejectionCodes(migration) {
  if (migration.newExecutorId === OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID) {
    return [
      "START_OF_ROUND_V4_ACTION_INVALID",
      "START_OF_ROUND_V4_ACTION_MISMATCH",
      "START_OF_ROUND_V4_LOADOUT_SCOPE_INVALID",
      "START_OF_ROUND_V4_LOADOUT_RESTORE_INVALID",
    ];
  }
  if (migration.newExecutorId === OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID) {
    return ["RESERVE_DEPLOY_V4_ACTION_INVALID", "RESERVE_DEPLOY_V4_ACTION_MISMATCH",
      "RESERVE_DEPLOY_V4_PARAMETER_DOMAIN_INVALID", "RESERVE_DEPLOY_V4_PARAMETER_DOMAIN_STALE",
      "RESERVE_DEPLOY_V4_START_OF_ROUND_HANDOFF_INVALID",
      "RESERVE_DEPLOY_V4_PHASE_HANDOFF_INVALID", "RESERVE_DEPLOY_V4_SUPPLY_LINEAGE_INVALID"];
  }
  if (migration.newExecutorId === OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID) {
    return ["STANDARD_MOVE_V4_ACTION_INVALID", "STANDARD_MOVE_V4_ACTION_MISMATCH",
      "STANDARD_MOVE_V4_PARAMETER_DOMAIN_INVALID", "STANDARD_MOVE_V4_PARAMETER_DOMAIN_STALE",
      "STANDARD_MOVE_V4_START_OF_ROUND_HANDOFF_INVALID",
      "STANDARD_MOVE_V4_PHASE_HANDOFF_INVALID", "STANDARD_MOVE_V4_SUPPLY_LINEAGE_INVALID"];
  }
  if (migration.newExecutorId === OFFICIAL_DISENGAGE_V4_EXECUTOR_ID) {
    return ["DISENGAGE_V4_ACTION_INVALID", "DISENGAGE_V4_ACTION_MISMATCH",
      "DISENGAGE_V4_PARAMETER_DOMAIN_INVALID", "DISENGAGE_V4_PARAMETER_DOMAIN_STALE",
      "DISENGAGE_V4_START_OF_ROUND_HANDOFF_INVALID",
      "DISENGAGE_V4_PHASE_HANDOFF_INVALID", "DISENGAGE_V4_SUPPLY_LINEAGE_INVALID"];
  }
  return [
    "STIMPACK_MOVE_V2_ACTION_INVALID",
    "STIMPACK_MOVE_V2_ACTION_MISMATCH",
    "STIMPACK_MOVE_V2_PARAMETER_DOMAIN_INVALID",
    "STIMPACK_MOVE_V2_PARAMETER_DOMAIN_STALE",
    "STIMPACK_MOVE_V2_START_OF_ROUND_HANDOFF_INVALID",
    "STIMPACK_MOVE_V2_PHASE_HANDOFF_INVALID",
    "STIMPACK_MOVE_V2_SUPPLY_LINEAGE_INVALID",
  ];
}

function reboundAtom(atom, migration) {
  const rebound = {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: migration.newExecutorId,
      transitionSchema: migration.transitionSchema,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      ...rejectionCodes(migration),
      "CURRENT_MOVEMENT_LOADOUT_HASH_MISMATCH",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId, migration),
  };
  if (migration.parameterSchema !== null) {
    rebound.legalSpace = {
      ...clone(atom.legalSpace),
      parameterSchema: migration.parameterSchema,
    };
  }
  return rebound;
}

function createStimpackMoveV2Catalogue(previousCatalogue) {
  if (OFFICIAL_MOVEMENT_V4_MIGRATED_ATOM_IDS.length !== 63
    || OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS.length !== 64
    || MIGRATION_BY_ATOM_ID.size !== 64) {
    fail("STIMPACK_MOVE_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const targetIds = new Set(OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    const migration = MIGRATION_BY_ATOM_ID.get(atom.atomId);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || !migration
      || atom.effect?.executorId !== migration.oldExecutorId) {
      fail("STIMPACK_MOVE_V2_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return reboundAtom(atom, migration);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS].sort(),
  )) {
    fail("STIMPACK_MOVE_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const oldExecutorIds = new Set(EXECUTOR_MIGRATIONS.map((entry) => entry.oldExecutorId));
  for (const migration of EXECUTOR_MIGRATIONS) {
    const previousEntries = previousCatalogue.executorManifest.filter((entry) => (
      entry.executorId === migration.oldExecutorId
    ));
    if (previousEntries.length !== 1) {
      fail("STIMPACK_MOVE_V2_CONTRACT_PREVIOUS_MANIFEST_INVALID", migration.oldExecutorId);
    }
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => !oldExecutorIds.has(entry.executorId))
    .map(clone);
  executorManifest.push(...EXECUTOR_MIGRATIONS.map((migration) => ({
    executorId: migration.newExecutorId,
    executorVersion: migration.newExecutorVersion,
    actionTypes: [...migration.actionTypes],
    transitionSchema: migration.transitionSchema,
  })));
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.60.0-official-current-stimpack-move-v2",
    rulesVersion: previousCatalogue.rulesVersion,
    sourceDenominatorStatus: previousCatalogue.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(previousCatalogue.sourceDenominatorBinding),
    sourceSnapshots: clone(previousCatalogue.sourceSnapshots),
    sourceClauses: clone(previousCatalogue.sourceClauses),
    atoms,
    executorManifest,
  });
}

function buildEvidence(catalogue, { freezeRelease = true } = {}) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const extension = createOfficialStimpackMoveV2RelationshipExtensionV1({
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
  const graph = createRuleRelationshipGraphV1({ catalogue, extension });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if ((freezeRelease && (
    catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
      || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
      || graph.graphHash !== EXPECTED_GRAPH_HASH
  ))
    || catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || !relationshipAudit.valid
    || !relationshipAudit.declaredScopesValid
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 42
    || relationshipAudit.counts.declaredStateContractExecutors !== 29
    || relationshipAudit.counts.stateContractMissingExecutors !== 13
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 236,
      partialContractAtoms: 57,
      noContractAtoms: 128,
      executors: 42,
      declaredStateContractExecutors: 29,
      missingStateContractExecutors: 13,
    })) {
    fail("STIMPACK_MOVE_V2_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
      graphHash: graph.graphHash,
      relationship: relationshipAudit.counts,
      gaps: relationshipAudit.gaps,
      coverage: stateContractCoverage.counts,
    }));
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    stateContractCoverage,
  };
}

export function createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createStimpackMoveV2Catalogue(previous.catalogue);
  const freezeRelease = input.freezeRelease !== false;
  const evidence = buildEvidence(catalogue, { freezeRelease });
  const carried = without(clone(previous), [
    "schema",
    "sliceHash",
    "previousSliceHash",
    "previousCatalogueHash",
    "catalogue",
    "catalogueHash",
    "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds",
    "contractEvidenceReboundRuleAtomIds",
    "executorIds",
    "executableScope",
    "existingExecutorContractClosureProgress",
    "ruleRelationshipGraphBinding",
    "ruleRelationshipProgress",
    "sliceForecast",
    "historicalCompatibility",
    "ctx2skill",
    "harness",
    "blocks",
  ]);
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    ...carried,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [...OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: EXECUTOR_MIGRATIONS.map((migration) => migration.newExecutorId),
    executableScope:
      "current_start_v4_loadout_movement_v4_lineage_and_single_marine_stimpack_move_v2",
    existingExecutorContractClosureProgress: {
      contractId: `${OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      frozenMovementV3ExecutorSourcesChanged: false,
      currentMovementV4AuthorityAndLoadoutLineageRequired: true,
      coordinatedExistingMovementAtomMigrationCount: 63,
      stimpackContractAtomMigrationCount: 1,
      exactParameterDomainAndActionDeclared: true,
      paymentDamageStatusMarkerAndMoveAtomicWritesDeclared: true,
      supplyAndLedgerProtectedWritesDeclared: true,
      forgedStartPhaseSupplyLedgerFailsClosed: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 235,
      strictCompleteAtomCountAfter: 236,
      partialContractAtomCountBefore: 58,
      partialContractAtomCountAfter: 57,
      noContractAtomCountBefore: 128,
      noContractAtomCountAfter: 128,
      declaredStateContractExecutorCountBefore: 28,
      declaredStateContractExecutorCountAfter: 29,
      stateContractMissingExecutorCountBefore: 14,
      stateContractMissingExecutorCountAfter: 13,
    },
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
      stimpackMoveV2ContractComplete: true,
      historicalV1RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 236,
      partialContractAtomCount: 57,
      noContractAtomCount: 128,
      nonStrictAtomCount: 185,
      declaredStateContractExecutorCount: 29,
      stateContractMissingExecutorCount: 13,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 65,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 64,
      completedAfterThisSlice: 65,
      migratedExistingAtomCount: 64,
      compatibilityOnlyMigratedExistingAtomCount: 63,
      newlyStrictAtomCount: 1,
      existingNonStrictAtomsBeforeThisSlice: 186,
      existingNonStrictAtomsAfterThisSlice: 185,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 14,
      stateContractMissingExecutorsAfterThisSlice: 13,
      atomPromotionSlice: false,
      executorVersionCorrectionSlice: true,
      contractClosureSlice: true,
      nextSlicePlanningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      frozenExecutorIds: EXECUTOR_MIGRATIONS.map((migration) => migration.oldExecutorId),
      replacementExecutorIds: EXECUTOR_MIGRATIONS.map((migration) => migration.newExecutorId),
      frozenV1SourceSha256:
        "62ea6efe7b3b6c77df284fc0ede25e8d6e919940bdddf585c4271fa48669a3f6",
      frozenMovementV3SourceSha256: {
        startOfRound: "17513af588bc785f2701a3ebaee4b2735430f589784e4dee8cf53ae1fe8e51e7",
        reserveDeploy: "941894cd17903d011992dc20ef5f6a922a394ea6f360f469b701fd51aa9acbe7",
        standardMove: "269287263a780ab5bd914bc358ea108e9d75e58b0baa20c57567a05548b041df",
        disengage: "85f1a6a37467ceb31cbcd8a40e3105a8576ed4cf51d593d075630c76aad83072",
      },
      currentSourceSha256: {
        startOfRoundV4: "c6740381da68a6ab641cc9c91c320f1f0da6579e1c0fde897a2471f071239d9d",
        reserveDeployV4: "ddb810797b93748b9c01ae4fec11a9ff03acf4ed62a037bd4260603d96e6381a",
        standardMoveV4: "ee183fe4311e4eb9972b360ba526afc8042aa623f03482727add5b2bfb8eb3b8",
        disengageV4: "baa16b33c8e71ae6342b323ce953f43d9b934ebd5737994ca4bbe6a67026c81d",
        stimpackMoveV2: "d8007bf3b955d59aa406481c55e88d2feb3495628bddf5cd5b9cc21c21596198",
        movementLineageV2: "6a99bea3a199b1924aa3c53e38f331aa2430a769258fb7d838cc04156d7b850d",
        frozenLoadoutAdapterV1: "c6e99c9d3d12a92f97b77fd64f82cfd2165da712d74b090505dd5005561e421d",
      },
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v23",
      previousActionSchemaVersion: "hybrid_legal_space_v22",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 6,
      crossTimeReplayResult:
        "current_start_v4_movement_v4_stimpack_v2_plus_frozen_v1_v2_v3_replay_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_thirteen_executor_contracts_open",
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
      uiTraceEvidence: "stimpack_move_v2_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_current_lineage_payment_damage_status_and_exact_move_action",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "movement lineage source payment status geometry or exact-action drift quarantines v2",
        "replay signature relationship or historical-display failure demotes runtime",
      ],
      userVisibleChecks: [
        "legal space hides Stimpack Move when current authority lineage is absent",
        "preview shows CP payment non-lethal damage speed buff and exact path",
        "frozen v1-v3 identities remain visible only in historical rules and replay",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "thirteen_existing_executor_contracts_remain",
      "one_hundred_eighty_five_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "remaining_attack_trigger_priority_and_contracts_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (freezeRelease && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("STIMPACK_MOVE_V2_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("STIMPACK_MOVE_V2_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("STIMPACK_MOVE_V2_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => (
    [atom.atomId, atom]
  )));
  const targetIds = new Set(OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue, { freezeRelease: true });
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS].sort(),
    )) {
    fail("STIMPACK_MOVE_V2_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_stimpack_move_v2_contract_closure_audit_v1",
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    graphNodes: evidence.graph.nodes.length,
    graphEdges: evidence.graph.edges.length,
    counts: {
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      changedAtoms: OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "movement_v4_loadout_and_stimpack_move_v2_authority_lineage_contract",
    productionTruth: false,
    trainingTruth: false,
  });
}
