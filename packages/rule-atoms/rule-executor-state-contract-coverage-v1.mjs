import {
  auditRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";

export const RULE_EXECUTOR_STATE_CONTRACT_COVERAGE_V1_SCHEMA =
  "starcraft_tmg_rule_executor_state_contract_coverage_v1";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function executorIdentity(nodeId) {
  const match = /^executor:(.+)@([^@]+)$/u.exec(String(nodeId || ""));
  if (!match) fail("STATE_CONTRACT_EXECUTOR_NODE_INVALID", String(nodeId || ""));
  return { executorId: match[1], executorVersion: match[2] };
}

function atomIdentity(nodeId) {
  const value = String(nodeId || "");
  if (!value.startsWith("rule_atom:")) {
    fail("STATE_CONTRACT_ATOM_NODE_INVALID", value);
  }
  return value.slice("rule_atom:".length);
}

export function auditExecutableAtomStateContractCoverageV1(graph) {
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  if (!relationshipAudit.valid) fail("STATE_CONTRACT_RELATIONSHIP_GRAPH_INVALID");

  const declared = new Set(graph.declaredStateContractExecutorIds);
  const executableAtomNodeIds = new Set(graph.catalogueIndex.executableAtomNodeIds);
  const executorByNodeId = new Map(graph.catalogueIndex.executorNodeIds.map((nodeId) => (
    [nodeId, executorIdentity(nodeId)]
  )));
  const atomsByExecutorNodeId = new Map(
    [...executorByNodeId.keys()].map((nodeId) => [nodeId, new Set()]),
  );
  const executorsByAtomNodeId = new Map(
    [...executableAtomNodeIds].map((nodeId) => [nodeId, new Set()]),
  );

  for (const edge of graph.edges) {
    if (edge.relationship !== "consumed_by"
      || !executableAtomNodeIds.has(edge.from)
      || !executorByNodeId.has(edge.to)) {
      continue;
    }
    atomsByExecutorNodeId.get(edge.to).add(edge.from);
    executorsByAtomNodeId.get(edge.from).add(edge.to);
  }

  const executorCoverage = [...executorByNodeId.entries()].map(([nodeId, identity]) => {
    const atomIds = [...atomsByExecutorNodeId.get(nodeId)].map(atomIdentity).sort();
    return {
      ...identity,
      stateContractDeclared: declared.has(identity.executorId),
      executableAtomCount: atomIds.length,
      executableAtomIds: atomIds,
    };
  }).sort((left, right) => (
    Number(right.stateContractDeclared) - Number(left.stateContractDeclared)
      || right.executableAtomCount - left.executableAtomCount
      || left.executorId.localeCompare(right.executorId)
  ));

  const atomCoverage = [...executorsByAtomNodeId.entries()].map(([nodeId, consumerNodeIds]) => {
    if (consumerNodeIds.size === 0) {
      fail("STATE_CONTRACT_EXECUTABLE_ATOM_WITHOUT_CONSUMER", atomIdentity(nodeId));
    }
    const consumers = [...consumerNodeIds].map((executorNodeId) => {
      const identity = executorByNodeId.get(executorNodeId);
      return {
        ...identity,
        stateContractDeclared: declared.has(identity.executorId),
      };
    }).sort((left, right) => left.executorId.localeCompare(right.executorId));
    const declaredCount = consumers.filter((entry) => entry.stateContractDeclared).length;
    const contractStatus = declaredCount === consumers.length
      ? "strict_complete"
      : declaredCount > 0
        ? "partial"
        : "none";
    return {
      atomId: atomIdentity(nodeId),
      contractStatus,
      consumerCount: consumers.length,
      declaredConsumerCount: declaredCount,
      consumers,
    };
  }).sort((left, right) => left.atomId.localeCompare(right.atomId));

  const strictCompleteAtomIds = atomCoverage
    .filter((entry) => entry.contractStatus === "strict_complete")
    .map((entry) => entry.atomId);
  const partialContractAtomIds = atomCoverage
    .filter((entry) => entry.contractStatus === "partial")
    .map((entry) => entry.atomId);
  const noContractAtomIds = atomCoverage
    .filter((entry) => entry.contractStatus === "none")
    .map((entry) => entry.atomId);
  const missingExecutorIds = executorCoverage
    .filter((entry) => !entry.stateContractDeclared)
    .map((entry) => entry.executorId)
    .sort();

  if (atomCoverage.length !== relationshipAudit.counts.executableRuleAtoms
    || executorCoverage.length !== relationshipAudit.counts.executors
    || missingExecutorIds.length !== relationshipAudit.counts.stateContractMissingExecutors) {
    fail("STATE_CONTRACT_COVERAGE_DENOMINATOR_MISMATCH");
  }

  return freezeDeep({
    schema: RULE_EXECUTOR_STATE_CONTRACT_COVERAGE_V1_SCHEMA,
    graphHash: graph.graphHash,
    counts: {
      executableAtoms: atomCoverage.length,
      strictCompleteAtoms: strictCompleteAtomIds.length,
      partialContractAtoms: partialContractAtomIds.length,
      noContractAtoms: noContractAtomIds.length,
      executors: executorCoverage.length,
      declaredStateContractExecutors:
        relationshipAudit.counts.declaredStateContractExecutors,
      missingStateContractExecutors: missingExecutorIds.length,
    },
    strictCompleteAtomIds,
    partialContractAtomIds,
    noContractAtomIds,
    missingExecutorIds,
    executorCoverage,
    atomCoverage,
    completionDefinition:
      "strict_complete_requires_every_current_executable_consumer_to_have_a_declared_state_contract",
    relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false,
    productionTruth: false,
    trainingTruth: false,
  });
}
