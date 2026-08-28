import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialRuleRelationshipExtensionV1 } from
  "./official-rule-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_rule_relationship_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_marine_optional_stimpack_move_rule_slice_v2";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "b9e6fc60ba92f75dc1b0467e9599c2b392dfb28da1b07f23a4ece794f4fa3434";
const EXPECTED_CATALOGUE_HASH =
  "7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede";
const EXPECTED_RUNTIME_HASH =
  "6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c";
const EXPECTED_EFFECT_DENOMINATOR_HASH =
  "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b";
const EXPECTED_EXECUTABLE_COUNT = 421;
const EXPECTED_REVIEW_COUNT = 491;
const EXPECTED_DISPLAY_COUNT = 114;

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
    || previousSlice.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || previousSlice.combatEffectDenominatorHash !== EXPECTED_EFFECT_DENOMINATOR_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("RULE_RELATIONSHIP_SLICE_PREVIOUS_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("RULE_RELATIONSHIP_SLICE_PREVIOUS_CATALOGUE_INVALID");
  }
  return catalogueAudit;
}

function buildRelationshipEvidence(previousSlice) {
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("RULE_RELATIONSHIP_SLICE_RUNTIME_DRIFT");
  }
  const graph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialRuleRelationshipExtensionV1(),
  });
  const audit = auditRuleRelationshipGraphV1(graph);
  if (!audit.valid
    || !audit.declaredScopesValid
    || audit.globalRelationshipCoverageComplete !== false
    || audit.productionEligible !== false
    || audit.counts.sourceClauses !== 1093
    || audit.counts.ruleAtoms !== 1026
    || audit.counts.executableRuleAtoms !== EXPECTED_EXECUTABLE_COUNT
    || audit.counts.executors !== 35
    || audit.counts.declaredStateContractExecutors !== 1
    || audit.counts.stateContractMissingExecutors !== 34
    || audit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || audit.counts.blockingGaps !== 0
    || audit.gaps.executorConsumerGaps.length !== 0) {
    fail("RULE_RELATIONSHIP_SLICE_GRAPH_AUDIT_INVALID");
  }
  return { runtime: runtime.descriptor, graph, audit };
}

export function createOfficialRuleRelationshipRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const { runtime, graph, audit } = buildRelationshipEvidence(input.previousSlice);
  const previous = input.previousSlice;
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    catalogue: clone(previous.catalogue),
    catalogueHash: previous.catalogueHash,
    combatEffectDenominator: clone(previous.combatEffectDenominator),
    combatEffectDenominatorHash: previous.combatEffectDenominatorHash,
    combatEffectCorrectionReceiptHash: previous.combatEffectCorrectionReceiptHash,
    effectKernel: clone(previous.effectKernel),
    healResolutionKernel: clone(previous.healResolutionKernel),
    totalDamageReactionKernel: clone(previous.totalDamageReactionKernel),
    medpackProgress: clone(previous.medpackProgress),
    academyOpticalFlareProgress: clone(previous.academyOpticalFlareProgress),
    restorationRangeProgress: clone(previous.restorationRangeProgress),
    lifeSupportProgress: clone(previous.lifeSupportProgress),
    marineStimpackKernel: clone(previous.marineStimpackKernel),
    characteristicStatusKernelV2: clone(previous.characteristicStatusKernelV2),
    marineMoveGeometryKernelV2: clone(previous.marineMoveGeometryKernelV2),
    optionalStimpackMoveProgress: clone(previous.optionalStimpackMoveProgress),
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: previous.catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [],
    executableScope:
      "derived_cross_layer_rule_relationship_audit_without_rules_authority",
    ruleRelationshipGraphBinding: {
      graphSchema: graph.schema,
      graphHash: graph.graphHash,
      relationshipAuthority: graph.relationshipAuthority,
      rulesAuthority: false,
      catalogueHash: graph.catalogueHash,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      coverageScopeCount: graph.coverageScopes.length,
      declaredStateContractExecutorCount:
        graph.declaredStateContractExecutorIds.length,
    },
    ruleRelationshipProgress: {
      sourceClauseToAtomCoverageComplete: true,
      executableAtomToConsumerCoverageComplete: true,
      executableAtomSixKindEvidenceCoverageComplete: true,
      compositionExecutorLineageCoverageComplete: true,
      casualtyCurrentModelsSplitSpeedInvalidationChainExecutable: true,
      baseSizeGeometrySeparatedFromPrintedSizeVisibilityHeight: true,
      declaredMoveStateScopeValid: true,
      declaredStateContractExecutorCount: audit.counts.declaredStateContractExecutors,
      stateContractMissingExecutorCount: audit.counts.stateContractMissingExecutors,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    officialDataPolicy: clone(previous.officialDataPolicy),
    sliceForecast: {
      completedBeforeThisSlice: 42,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 43,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 43).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 51,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
      auditOnlySlice: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: runtime.runtimeHash,
      previousEffectDenominatorHash: previous.combatEffectDenominatorHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v12",
      previousActionSchemaVersion: "hybrid_legal_space_v12",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "source_clause_atom_executor_and_six_kind_evidence_graph_audit",
        "composition_executor_lineage_graph_audit",
        "casualty_current_models_split_speed_invalidation_four_grid_impact_query",
        "base_size_geometry_and_printed_size_visibility_negative_path_audit",
        "missing_consumer_test_invalidation_and_version_edges_fail_closed",
        "slice42_catalogue_runtime_and_rules_display_cross_time_freeze",
      ],
      crossTimeReplayResult:
        "slice42_catalogue_runtime_action_schema_and_rules_display_remain_exact",
      promotions: [],
      blocks: [
        "relationship-graph-is-derived-audit-not-a-rule-skill",
        "34-executors-still-lack-declared-state-read-write-contracts",
        "remaining-491-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 491,
    },
    harness: {
      harnessLoopUsed: false,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [],
      harnessToolsCalled: [],
      uiTraceEvidence: [],
      agentDecisionEvidence: [],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "graph-content-or-catalogue-hash-drift-invalidates-slice-43",
        "required-source-consumer-test-invalidation-or-version-edge-gap-invalidates-slice-43",
      ],
      userVisibleChecks: [
        "impact-query-can-show-casualty-to-four-grid-move-tests",
        "coverage-audit-shows-34-state-contract-debts-without-claiming-production-readiness",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "global-executor-state-relationship-coverage-remains-partial",
      "terrain-access-elevation-flying-and-other-unit-movement-pending",
      "production-complete-legal-space-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedAtoms = slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    previous.catalogue.atoms.find((previousAtom) => previousAtom.atomId === atom.atomId),
  )).length;
  if (changedAtoms !== 0) fail("RULE_RELATIONSHIP_SLICE_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialRuleRelationshipRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("RULE_RELATIONSHIP_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialRuleRelationshipRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("RULE_RELATIONSHIP_SLICE_CONTENT_MISMATCH");
  }
  const { runtime, graph, audit } = buildRelationshipEvidence(input.previousSlice);
  const catalogueAudit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const changedAtoms = input.slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    input.previousSlice.catalogue.atoms.find((previousAtom) => (
      previousAtom.atomId === atom.atomId
    )),
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_rule_relationship_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    runtimeHash: runtime.runtimeHash,
    graphHash: graph.graphHash,
    relationshipGraphAudit: clone(audit),
    counts: {
      sourceClauses: catalogueAudit.counts.sourceClauses,
      ruleAtoms: catalogueAudit.counts.atoms,
      executableRuleAtoms: catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: catalogueAudit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: 0,
      changedAtoms,
      executableContractGaps: catalogueAudit.executableContractGaps.length,
      evidenceGaps: catalogueAudit.evidenceGaps.length,
      relationshipBlockingGaps: audit.counts.blockingGaps,
      stateContractMissingExecutors: audit.counts.stateContractMissingExecutors,
    },
    rulesTruth:
      "derived_cross_layer_relationship_audit_for_current_exact_rules_subset",
    productionRoomEligible: false,
    trainingTruth: false,
  });
}
