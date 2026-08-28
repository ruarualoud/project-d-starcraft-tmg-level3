import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialStimpackMoveV2RelationshipExtensionV1 } from
  "./official-stimpack-move-v2-relationship-contract-v1.mjs";
import { createOfficialMovementV5MedpackV2RelationshipExtensionV1 } from
  "./official-movement-v5-medpack-v2-relationship-contract-v1.mjs";
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
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
} from "./official-start-of-round-executor-v4.mjs";
import {
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V5_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v5.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
} from "./official-reserve-deploy-executor-v4.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_DEPLOY_V5_PARAMETER_KIND,
  OFFICIAL_RESERVE_DEPLOY_V5_TRANSITION_SCHEMA,
} from "./official-reserve-deploy-executor-v5.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
} from "./official-standard-move-executor-v4.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_V5_PARAMETER_KIND,
  OFFICIAL_STANDARD_MOVE_V5_TRANSITION_SCHEMA,
} from "./official-standard-move-executor-v5.mjs";
import {
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
} from "./official-disengage-executor-v4.mjs";
import {
  OFFICIAL_DISENGAGE_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISENGAGE_V5_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V5_EXECUTOR_VERSION,
  OFFICIAL_DISENGAGE_V5_PARAMETER_KIND,
  OFFICIAL_DISENGAGE_V5_TRANSITION_SCHEMA,
} from "./official-disengage-executor-v5.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
} from "./official-stimpack-move-consumer-executor-v2.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_MOVE_V3_PARAMETER_KIND,
  OFFICIAL_STIMPACK_MOVE_V3_TRANSITION_SCHEMA,
} from "./official-stimpack-move-consumer-executor-v3.mjs";
import {
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
} from "./official-medic-medpack-active-executor-v1.mjs";
import {
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_TYPE,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_TRANSITION_SCHEMA,
} from "./official-medic-medpack-active-executor-v2.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_medic_medpack_v2_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_stimpack_move_v2_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "4f92a8afde13bf27cbe8a32c3df1cfd1c02d4b1ca1894969a55eb7722c360b35";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "d378ecc5f91753d80251dbf37ecdee1c17cdf3a36c001f9855cbb896d588faa9";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "51f3d865c2dde8735a8b6f58248d91207d03370b9ac0f0f04a8786c5e7c31241";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "1fbbe7c6f361ed9dceefe5d3d59cba25617f17c399e00a671ccb98018c8dbb7a";
const EXPECTED_SLICE_HASH =
  "7d0fcef7965258264378de98b0bb1820be94638700b55975fa69ed8a440e210b";
const EXPECTED_CATALOGUE_HASH =
  "43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b";
const EXPECTED_RUNTIME_HASH =
  "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41";
const EXPECTED_GRAPH_HASH =
  "488194f777c1b6c00b601b02d07a7aa28c11537bd4535266e465ee687562d23f";

export const OFFICIAL_MOVEMENT_V5_MIGRATED_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_DISENGAGE_V5_EXECUTOR_ATOM_IDS,
  ]),
].sort());
export const OFFICIAL_STIMPACK_MOVE_V3_MIGRATED_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-buff-value:260df1f72f16",
]);
export const OFFICIAL_MEDIC_MEDPACK_V2_MIGRATED_ATOM_IDS = Object.freeze([
  ...OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_NEW_ATOM_IDS,
]);
export const OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MOVEMENT_V5_MIGRATED_ATOM_IDS,
    ...OFFICIAL_STIMPACK_MOVE_V3_MIGRATED_ATOM_IDS,
    ...OFFICIAL_MEDIC_MEDPACK_V2_MIGRATED_ATOM_IDS,
  ]),
].sort());

const EXECUTOR_MIGRATIONS = Object.freeze([
  Object.freeze({
    oldExecutorId: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
    newExecutorId: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_START_OF_ROUND_V5_TRANSITION_SCHEMA,
    parameterSchema: null,
    atomIds: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["resolve_start_of_round"]),
    slug: "start-of-round-v5-marine-medic-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
    newExecutorId: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_RESERVE_DEPLOY_V5_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_RESERVE_DEPLOY_V5_PARAMETER_KIND,
    atomIds: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["deploy"]),
    slug: "reserve-deploy-v5-marine-medic-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
    newExecutorId: OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_STANDARD_MOVE_V5_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_STANDARD_MOVE_V5_PARAMETER_KIND,
    atomIds: OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["move"]),
    slug: "standard-move-v5-marine-medic-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
    newExecutorId: OFFICIAL_DISENGAGE_V5_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_DISENGAGE_V5_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_DISENGAGE_V5_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_DISENGAGE_V5_PARAMETER_KIND,
    atomIds: OFFICIAL_DISENGAGE_V5_EXECUTOR_ATOM_IDS,
    actionTypes: Object.freeze(["disengage"]),
    slug: "disengage-v5-marine-medic-loadout",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    newExecutorId: OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_STIMPACK_MOVE_V3_TRANSITION_SCHEMA,
    parameterSchema: OFFICIAL_STIMPACK_MOVE_V3_PARAMETER_KIND,
    atomIds: OFFICIAL_STIMPACK_MOVE_V3_MIGRATED_ATOM_IDS,
    actionTypes: Object.freeze(["move"]),
    slug: "stimpack-move-v3-current-lineage",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
    newExecutorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_TRANSITION_SCHEMA,
    parameterSchema: null,
    atomIds: OFFICIAL_MEDIC_MEDPACK_V2_MIGRATED_ATOM_IDS,
    actionTypes: Object.freeze([OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_TYPE]),
    slug: "medic-medpack-v2-current-lineage",
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
    fail("MEDPACK_V2_CONTRACT_ATOM_VERSION_INVALID");
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
    fail("MEDPACK_V2_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  const previousGraph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialStimpackMoveV2RelationshipExtensionV1({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || previousGraph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("MEDPACK_V2_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId, migration) {
  const slug = atomId.replace(/^rule-atom:/u, `${migration.slug}:`);
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:current-start-v5-loadout-legal-space-apply-success`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-current-lineage-domain-action-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:movement-v5-stimpack-v3-medpack-v2-composition`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:selected-loadout-and-protected-supply-persist`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-previous-and-live-official-71-69-48`],
  };
}

function rejectionCodes(migration) {
  if (migration.newExecutorId === OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID) {
    return ["START_OF_ROUND_V5_ACTION_INVALID", "START_OF_ROUND_V5_ACTION_MISMATCH",
      "START_OF_ROUND_V5_LOADOUT_SCOPE_INVALID", "START_OF_ROUND_V5_LATEST_OFFICIAL_DATA_REQUIRED"];
  }
  if (migration.newExecutorId === OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID) {
    return ["RESERVE_DEPLOY_V5_ACTION_INVALID", "RESERVE_DEPLOY_V5_ACTION_MISMATCH",
      "RESERVE_DEPLOY_V5_PARAMETER_DOMAIN_INVALID", "RESERVE_DEPLOY_V5_PARAMETER_DOMAIN_STALE"];
  }
  if (migration.newExecutorId === OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID) {
    return ["STANDARD_MOVE_V5_ACTION_INVALID", "STANDARD_MOVE_V5_ACTION_MISMATCH",
      "STANDARD_MOVE_V5_PARAMETER_DOMAIN_INVALID", "STANDARD_MOVE_V5_PARAMETER_DOMAIN_STALE"];
  }
  if (migration.newExecutorId === OFFICIAL_DISENGAGE_V5_EXECUTOR_ID) {
    return ["DISENGAGE_V5_ACTION_INVALID", "DISENGAGE_V5_ACTION_MISMATCH",
      "DISENGAGE_V5_PARAMETER_DOMAIN_INVALID", "DISENGAGE_V5_PARAMETER_DOMAIN_STALE"];
  }
  if (migration.newExecutorId === OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID) {
    return ["STIMPACK_MOVE_V3_ACTION_INVALID", "STIMPACK_MOVE_V3_ACTION_MISMATCH",
      "STIMPACK_MOVE_V3_PARAMETER_DOMAIN_INVALID", "STIMPACK_MOVE_V3_PARAMETER_DOMAIN_STALE",
      "STIMPACK_MOVE_V3_LATEST_OFFICIAL_DATA_REQUIRED"];
  }
  return ["MEDPACK_V2_ACTION_INVALID", "MEDPACK_V2_ACTION_MISMATCH",
    "MEDPACK_V2_ACTION_STALE", "MEDPACK_V2_LATEST_OFFICIAL_DATA_REQUIRED",
    "MEDPACK_V2_SUPPLY_PROTECTED_WRITE_VIOLATION"];
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
      "CURRENT_MOVEMENT_V2_LOADOUT_HASH_MISMATCH",
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

function createMedpackV2Catalogue(previousCatalogue) {
  if (OFFICIAL_MOVEMENT_V5_MIGRATED_ATOM_IDS.length !== 63
    || OFFICIAL_STIMPACK_MOVE_V3_MIGRATED_ATOM_IDS.length !== 1
    || OFFICIAL_MEDIC_MEDPACK_V2_MIGRATED_ATOM_IDS.length !== 29
    || OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS.length !== 93
    || MIGRATION_BY_ATOM_ID.size !== 93) {
    fail("MEDPACK_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH", JSON.stringify({
      movement: OFFICIAL_MOVEMENT_V5_MIGRATED_ATOM_IDS.length,
      stimpack: OFFICIAL_STIMPACK_MOVE_V3_MIGRATED_ATOM_IDS.length,
      medpack: OFFICIAL_MEDIC_MEDPACK_V2_MIGRATED_ATOM_IDS.length,
      total: OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS.length,
      mapped: MIGRATION_BY_ATOM_ID.size,
    }));
  }
  const targetIds = new Set(OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    const migration = MIGRATION_BY_ATOM_ID.get(atom.atomId);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || !migration
      || atom.effect?.executorId !== migration.oldExecutorId) {
      fail("MEDPACK_V2_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return reboundAtom(atom, migration);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS].sort())) {
    fail("MEDPACK_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const oldExecutorIds = new Set(EXECUTOR_MIGRATIONS.map((entry) => entry.oldExecutorId));
  for (const migration of EXECUTOR_MIGRATIONS) {
    if (previousCatalogue.executorManifest.filter((entry) => (
      entry.executorId === migration.oldExecutorId
    )).length !== 1) {
      fail("MEDPACK_V2_CONTRACT_PREVIOUS_MANIFEST_INVALID", migration.oldExecutorId);
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
    catalogueVersion: "0.61.0-official-current-medic-medpack-v2",
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
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialMovementV5MedpackV2RelationshipExtensionV1({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 30
    || relationshipAudit.counts.stateContractMissingExecutors !== 12
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 265,
      partialContractAtoms: 40,
      noContractAtoms: 116,
      executors: 42,
      declaredStateContractExecutors: 30,
      missingStateContractExecutors: 12,
    })) {
    fail("MEDPACK_V2_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createMedpackV2Catalogue(previous.catalogue);
  const freezeRelease = input.freezeRelease !== false;
  const evidence = buildEvidence(catalogue, { freezeRelease });
  const carried = without(clone(previous), [
    "schema", "sliceHash", "previousSliceHash", "previousCatalogueHash",
    "catalogue", "catalogueHash", "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds", "contractEvidenceReboundRuleAtomIds",
    "executorIds", "executableScope", "existingExecutorContractClosureProgress",
    "ruleRelationshipGraphBinding", "ruleRelationshipProgress", "sliceForecast",
    "historicalCompatibility", "ctx2skill", "harness", "blocks",
  ]);
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    ...carried,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [...OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: EXECUTOR_MIGRATIONS.map((migration) => migration.newExecutorId),
    executableScope:
      "current_start_v5_marine_medic_loadout_movement_v5_stimpack_v3_and_medpack_v2",
    existingExecutorContractClosureProgress: {
      contractId: `${OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION}`,
      frozenMedpackV1ExecutorSourceChanged: false,
      frozenMovementV4AndStimpackV2ExecutorSourcesChanged: false,
      currentMovementV5AuthorityAndMedicLoadoutLineageRequired: true,
      coordinatedExistingMovementAndStimpackAtomMigrationCount: 64,
      medpackContractAtomMigrationCount: 29,
      exactLegalSpaceAndActionDeclared: true,
      cpHealActivationAndHistoryAtomicWritesDeclared: true,
      supplyAndLedgerProtectedWritesDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 236,
      strictCompleteAtomCountAfter: 265,
      partialContractAtomCountBefore: 57,
      partialContractAtomCountAfter: 40,
      noContractAtomCountBefore: 128,
      noContractAtomCountAfter: 116,
      declaredStateContractExecutorCountBefore: 29,
      declaredStateContractExecutorCountAfter: 30,
      stateContractMissingExecutorCountBefore: 13,
      stateContractMissingExecutorCountAfter: 12,
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
      medicMedpackV2ContractComplete: true,
      historicalV1V2V4RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 265,
      partialContractAtomCount: 40,
      noContractAtomCount: 116,
      nonStrictAtomCount: 156,
      declaredStateContractExecutorCount: 30,
      stateContractMissingExecutorCount: 12,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 66,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 65,
      completedAfterThisSlice: 66,
      migratedExistingAtomCount: 93,
      compatibilityOnlyMigratedExistingAtomCount: 64,
      newlyStrictAtomCount: 29,
      existingNonStrictAtomsBeforeThisSlice: 185,
      existingNonStrictAtomsAfterThisSlice: 156,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 13,
      stateContractMissingExecutorsAfterThisSlice: 12,
      atomPromotionSlice: false,
      executorVersionCorrectionSlice: true,
      contractClosureSlice: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      frozenExecutorIds: EXECUTOR_MIGRATIONS.map((migration) => migration.oldExecutorId),
      replacementExecutorIds: EXECUTOR_MIGRATIONS.map((migration) => migration.newExecutorId),
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v24",
      previousActionSchemaVersion: "hybrid_legal_space_v23",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 6,
      crossTimeReplayResult:
        "current_start_v5_movement_v5_stimpack_v3_medpack_v2_plus_frozen_history_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_twelve_executor_contracts_open",
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
      uiTraceEvidence: "medpack_v2_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_current_lineage_payment_heal_activation_and_exact_action",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_lineage_payment_heal_or_exact_action_drift_quarantines_v2",
        "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
      ],
      userVisibleChecks: [
        "legal space exposes Medpack only in the two official action windows",
        "preview shows target range heal amount and one CP payment",
        "frozen v1 v2 v4 identities remain visible only in historical rules and replay",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "twelve_existing_executor_contracts_remain",
      "one_hundred_fifty_six_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (freezeRelease && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("MEDPACK_V2_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("MEDPACK_V2_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("MEDPACK_V2_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => (
    [atom.atomId, atom]
  )));
  const targetIds = new Set(OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue, { freezeRelease: true });
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS].sort(),
    )) {
    fail("MEDPACK_V2_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_medic_medpack_v2_contract_closure_audit_v1",
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
      changedAtoms: OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "movement_v5_stimpack_v3_and_medic_medpack_v2_current_authority_contract",
    productionTruth: false,
    trainingTruth: false,
  });
}
