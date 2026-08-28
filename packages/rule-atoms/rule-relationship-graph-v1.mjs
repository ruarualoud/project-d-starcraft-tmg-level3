import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

export const RULE_RELATIONSHIP_GRAPH_SCHEMA =
  "starcraft_tmg_rule_relationship_graph_v1";

const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const NODE_KINDS = Object.freeze([
  "action_type",
  "action_variant",
  "catalogue",
  "catalogue_release",
  "derived_value",
  "evidence_fixture",
  "executor",
  "judge_test",
  "official_characteristic",
  "parameter_domain",
  "rule_atom",
  "runtime_release",
  "semantic_projection",
  "slice_release",
  "source_clause",
  "source_snapshot",
  "state_event",
  "state_field",
]);
const EDGE_TYPES = Object.freeze([
  "constrains",
  "consumed_by",
  "contains",
  "defines",
  "derives",
  "exposes",
  "gates",
  "includes",
  "invalidates",
  "parameterized_by",
  "projects_to",
  "reads",
  "required_by",
  "retained_by",
  "source_of",
  "superseded_by",
  "verified_by",
  "writes",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function uniqueSortedStrings(values, code, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) fail(code);
  const normalized = values.map((value) => text(value, code));
  if (new Set(normalized).size !== normalized.length) fail(`${code}_DUPLICATE`);
  return normalized.sort((left, right) => left.localeCompare(right));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function graphBody(graph) {
  return without(graph, ["graphHash"]);
}

function nodeId(prefix, value) {
  return `${prefix}:${value}`;
}

function executorNodeId(executor) {
  return nodeId("executor", `${executor.executorId}@${executor.executorVersion}`);
}

function normalizeNode(raw) {
  if (!object(raw)) fail("RULE_RELATIONSHIP_NODE_INVALID");
  const kind = text(raw.kind, "RULE_RELATIONSHIP_NODE_KIND_REQUIRED");
  if (!NODE_KINDS.includes(kind)) fail("RULE_RELATIONSHIP_NODE_KIND_UNKNOWN", kind);
  return {
    nodeId: text(raw.nodeId, "RULE_RELATIONSHIP_NODE_ID_REQUIRED"),
    kind,
    label: text(raw.label || raw.nodeId, "RULE_RELATIONSHIP_NODE_LABEL_REQUIRED"),
    provenance: text(
      raw.provenance || "declared_extension",
      "RULE_RELATIONSHIP_NODE_PROVENANCE_REQUIRED",
    ),
  };
}

function normalizeEdge(raw) {
  if (!object(raw)) fail("RULE_RELATIONSHIP_EDGE_INVALID");
  const relationship = text(
    raw.relationship,
    "RULE_RELATIONSHIP_EDGE_TYPE_REQUIRED",
  );
  if (!EDGE_TYPES.includes(relationship)) {
    fail("RULE_RELATIONSHIP_EDGE_TYPE_UNKNOWN", relationship);
  }
  const body = {
    from: text(raw.from, "RULE_RELATIONSHIP_EDGE_FROM_REQUIRED"),
    relationship,
    to: text(raw.to, "RULE_RELATIONSHIP_EDGE_TO_REQUIRED"),
    scopeId: text(raw.scopeId || "catalogue", "RULE_RELATIONSHIP_EDGE_SCOPE_REQUIRED"),
    provenance: text(
      raw.provenance || "declared_extension",
      "RULE_RELATIONSHIP_EDGE_PROVENANCE_REQUIRED",
    ),
  };
  return {
    edgeId: `relationship-edge:${hashStarcraftTmgContract(body)}`,
    ...body,
  };
}

function normalizePath(raw, code) {
  if (!object(raw)) fail(code);
  const relationships = raw.relationships === undefined
    ? []
    : uniqueSortedStrings(raw.relationships, `${code}_RELATIONSHIPS`, { allowEmpty: true });
  for (const relationship of relationships) {
    if (!EDGE_TYPES.includes(relationship)) fail(`${code}_RELATIONSHIP_UNKNOWN`, relationship);
  }
  const maxDepth = Number(raw.maxDepth ?? 12);
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 32) {
    fail(`${code}_MAX_DEPTH_INVALID`);
  }
  return {
    from: text(raw.from, `${code}_FROM_REQUIRED`),
    to: text(raw.to, `${code}_TO_REQUIRED`),
    relationships,
    maxDepth,
  };
}

function normalizeScope(raw) {
  if (!object(raw)) fail("RULE_RELATIONSHIP_SCOPE_INVALID");
  const requiredEdges = (raw.requiredEdges || []).map(normalizeEdge)
    .sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  const requiredPaths = (raw.requiredPaths || []).map((entry) => (
    normalizePath(entry, "RULE_RELATIONSHIP_REQUIRED_PATH_INVALID")
  )).sort((left, right) => (
    `${left.from}|${left.to}`.localeCompare(`${right.from}|${right.to}`)
  ));
  const forbiddenPaths = (raw.forbiddenPaths || []).map((entry) => (
    normalizePath(entry, "RULE_RELATIONSHIP_FORBIDDEN_PATH_INVALID")
  )).sort((left, right) => (
    `${left.from}|${left.to}`.localeCompare(`${right.from}|${right.to}`)
  ));
  return {
    scopeId: text(raw.scopeId, "RULE_RELATIONSHIP_SCOPE_ID_REQUIRED"),
    executorId: text(raw.executorId, "RULE_RELATIONSHIP_SCOPE_EXECUTOR_REQUIRED"),
    requiredNodeIds: uniqueSortedStrings(
      raw.requiredNodeIds || [],
      "RULE_RELATIONSHIP_SCOPE_REQUIRED_NODES_INVALID",
      { allowEmpty: true },
    ),
    requiredEdges,
    requiredPaths,
    forbiddenPaths,
    evidenceTestNodeIds: uniqueSortedStrings(
      raw.evidenceTestNodeIds || [],
      "RULE_RELATIONSHIP_SCOPE_EVIDENCE_TESTS_INVALID",
      { allowEmpty: true },
    ),
  };
}

function addNode(nodes, raw) {
  const node = normalizeNode(raw);
  const current = nodes.get(node.nodeId);
  if (current && !isDeepStrictEqual(current, node)) {
    fail("RULE_RELATIONSHIP_NODE_CONFLICT", node.nodeId);
  }
  nodes.set(node.nodeId, node);
  return node.nodeId;
}

function addEdge(edges, raw) {
  const edge = normalizeEdge(raw);
  if (edges.has(edge.edgeId)) fail("RULE_RELATIONSHIP_EDGE_DUPLICATE", edge.edgeId);
  edges.set(edge.edgeId, edge);
  return edge.edgeId;
}

function addCatalogueRelationships(catalogue, nodes, edges) {
  const catalogueNodeId = addNode(nodes, {
    nodeId: nodeId("catalogue", catalogue.catalogueHash),
    kind: "catalogue",
    label: catalogue.catalogueVersion,
    provenance: "catalogue",
  });
  const snapshotNodeIds = [];
  const clauseNodeIds = [];
  const atomNodeIds = [];
  const executableAtomNodeIds = [];
  const executorNodeIds = [];
  const evidenceFixtureNodeIds = new Set();

  for (const snapshot of catalogue.sourceSnapshots) {
    const snapshotId = addNode(nodes, {
      nodeId: nodeId("source_snapshot", snapshot.sourceSnapshotId),
      kind: "source_snapshot",
      label: snapshot.immutableLocator,
      provenance: `catalogue:${catalogue.catalogueHash}`,
    });
    snapshotNodeIds.push(snapshotId);
    addEdge(edges, {
      from: catalogueNodeId,
      relationship: "contains",
      to: snapshotId,
      provenance: "catalogue:sourceSnapshots",
    });
  }

  for (const clause of catalogue.sourceClauses) {
    const clauseId = addNode(nodes, {
      nodeId: nodeId("source_clause", clause.clauseId),
      kind: "source_clause",
      label: clause.clauseId,
      provenance: `catalogue:${catalogue.catalogueHash}`,
    });
    clauseNodeIds.push(clauseId);
    addEdge(edges, {
      from: catalogueNodeId,
      relationship: "contains",
      to: clauseId,
      provenance: "catalogue:sourceClauses",
    });
    addEdge(edges, {
      from: nodeId("source_snapshot", clause.sourceSnapshotId),
      relationship: "source_of",
      to: clauseId,
      provenance: `catalogue:clause:${clause.clauseId}`,
    });
  }

  const manifestById = new Map(catalogue.executorManifest.map((executor) => (
    [executor.executorId, executor]
  )));
  for (const executor of catalogue.executorManifest) {
    const executorId = addNode(nodes, {
      nodeId: executorNodeId(executor),
      kind: "executor",
      label: `${executor.executorId}@${executor.executorVersion}`,
      provenance: `catalogue:${catalogue.catalogueHash}`,
    });
    executorNodeIds.push(executorId);
    addEdge(edges, {
      from: catalogueNodeId,
      relationship: "contains",
      to: executorId,
      provenance: "catalogue:executorManifest",
    });
    for (const actionType of executor.actionTypes) {
      const actionNodeId = addNode(nodes, {
        nodeId: nodeId("action_type", actionType),
        kind: "action_type",
        label: actionType,
        provenance: "catalogue:executorManifest.actionTypes",
      });
      addEdge(edges, {
        from: executorId,
        relationship: "exposes",
        to: actionNodeId,
        provenance: `catalogue:executor:${executor.executorId}`,
      });
    }
  }

  for (const atom of catalogue.atoms) {
    const atomId = addNode(nodes, {
      nodeId: nodeId("rule_atom", atom.atomId),
      kind: "rule_atom",
      label: atom.title,
      provenance: `catalogue:${catalogue.catalogueHash}`,
    });
    atomNodeIds.push(atomId);
    if (atom.disposition === "executable") executableAtomNodeIds.push(atomId);
    addEdge(edges, {
      from: catalogueNodeId,
      relationship: "contains",
      to: atomId,
      provenance: "catalogue:atoms",
    });
    for (const clauseId of atom.clauseIds) {
      addEdge(edges, {
        from: nodeId("source_clause", clauseId),
        relationship: "defines",
        to: atomId,
        provenance: `catalogue:atom:${atom.atomId}`,
      });
    }
    if (atom.disposition !== "executable") continue;
    for (const dependencyAtomId of atom.dependencies.atomIds) {
      addEdge(edges, {
        from: nodeId("rule_atom", dependencyAtomId),
        relationship: "required_by",
        to: atomId,
        provenance: `catalogue:atom.dependencies:${atom.atomId}`,
      });
    }
    const directExecutor = manifestById.get(atom.effect.executorId);
    addEdge(edges, {
      from: atomId,
      relationship: "consumed_by",
      to: executorNodeId(directExecutor),
      provenance: `catalogue:atom.effect:${atom.atomId}`,
    });
    if (atom.legalSpace.kind === "parameter_domain") {
      const domainId = addNode(nodes, {
        nodeId: nodeId("parameter_domain", atom.legalSpace.parameterSchema),
        kind: "parameter_domain",
        label: atom.legalSpace.parameterSchema,
        provenance: "catalogue:atom.legalSpace",
      });
      addEdge(edges, {
        from: atomId,
        relationship: "parameterized_by",
        to: domainId,
        provenance: `catalogue:atom.legalSpace:${atom.atomId}`,
      });
    }
    for (const evidenceKey of EVIDENCE_KEYS) {
      for (const fixtureId of atom.evidence[evidenceKey]) {
        const fixtureNodeId = addNode(nodes, {
          nodeId: nodeId("evidence_fixture", fixtureId),
          kind: "evidence_fixture",
          label: fixtureId,
          provenance: "catalogue:atom.evidence",
        });
        evidenceFixtureNodeIds.add(fixtureNodeId);
        addEdge(edges, {
          from: atomId,
          relationship: "verified_by",
          to: fixtureNodeId,
          provenance: `catalogue:evidence:${evidenceKey}`,
        });
      }
    }
  }

  return {
    catalogueNodeId,
    snapshotNodeIds: snapshotNodeIds.sort(),
    clauseNodeIds: clauseNodeIds.sort(),
    atomNodeIds: atomNodeIds.sort(),
    executableAtomNodeIds: executableAtomNodeIds.sort(),
    executorNodeIds: executorNodeIds.sort(),
    evidenceFixtureNodeIds: [...evidenceFixtureNodeIds].sort(),
  };
}

function addExecutorLineages(catalogue, lineages, nodes, edges) {
  const manifestById = new Map(catalogue.executorManifest.map((executor) => (
    [executor.executorId, executor]
  )));
  const atomsById = new Map(catalogue.atoms.map((atom) => [atom.atomId, atom]));
  for (const raw of lineages || []) {
    if (!object(raw)) fail("RULE_RELATIONSHIP_EXECUTOR_LINEAGE_INVALID");
    const executorId = text(raw.executorId, "RULE_RELATIONSHIP_LINEAGE_EXECUTOR_REQUIRED");
    const executor = manifestById.get(executorId);
    if (!executor) fail("RULE_RELATIONSHIP_LINEAGE_EXECUTOR_UNKNOWN", executorId);
    const atomIds = uniqueSortedStrings(
      raw.ruleAtomIds,
      "RULE_RELATIONSHIP_LINEAGE_ATOMS_REQUIRED",
    );
    for (const atomId of atomIds) {
      const atom = atomsById.get(atomId);
      if (!atom || atom.disposition !== "executable") {
        fail("RULE_RELATIONSHIP_LINEAGE_ATOM_NOT_EXECUTABLE", atomId);
      }
      addEdge(edges, {
        from: nodeId("rule_atom", atomId),
        relationship: "consumed_by",
        to: executorNodeId(executor),
        scopeId: text(raw.scopeId || `composition:${executorId}`,
          "RULE_RELATIONSHIP_LINEAGE_SCOPE_REQUIRED"),
        provenance: text(
          raw.provenance || `declared_executor_lineage:${executorId}`,
          "RULE_RELATIONSHIP_LINEAGE_PROVENANCE_REQUIRED",
        ),
      });
    }
  }
}

function verifyEndpoints(nodes, edges, scopes, catalogue) {
  for (const edge of edges.values()) {
    if (!nodes.has(edge.from)) fail("RULE_RELATIONSHIP_EDGE_FROM_UNKNOWN", edge.from);
    if (!nodes.has(edge.to)) fail("RULE_RELATIONSHIP_EDGE_TO_UNKNOWN", edge.to);
  }
  const manifestIds = new Set(catalogue.executorManifest.map((entry) => entry.executorId));
  for (const scope of scopes) {
    if (!manifestIds.has(scope.executorId)) {
      fail("RULE_RELATIONSHIP_SCOPE_EXECUTOR_UNKNOWN", scope.executorId);
    }
    for (const requiredNodeId of scope.requiredNodeIds) {
      if (!nodes.has(requiredNodeId)) {
        fail("RULE_RELATIONSHIP_SCOPE_NODE_UNKNOWN", requiredNodeId);
      }
    }
    for (const nodeIdValue of scope.evidenceTestNodeIds) {
      if (!nodes.has(nodeIdValue)) {
        fail("RULE_RELATIONSHIP_SCOPE_TEST_UNKNOWN", nodeIdValue);
      }
    }
    for (const edge of scope.requiredEdges) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
        fail("RULE_RELATIONSHIP_SCOPE_REQUIRED_EDGE_ENDPOINT_UNKNOWN", edge.edgeId);
      }
    }
    for (const path of [...scope.requiredPaths, ...scope.forbiddenPaths]) {
      if (!nodes.has(path.from) || !nodes.has(path.to)) {
        fail("RULE_RELATIONSHIP_SCOPE_PATH_ENDPOINT_UNKNOWN", `${path.from}->${path.to}`);
      }
    }
  }
}

export function createRuleRelationshipGraphV1(input = {}) {
  if (!object(input.extension)) fail("RULE_RELATIONSHIP_EXTENSION_REQUIRED");
  const catalogueAudit = verifyRuleAtomCatalogue(input.catalogue);
  const nodes = new Map();
  const edges = new Map();
  const catalogueIndex = addCatalogueRelationships(input.catalogue, nodes, edges);

  for (const rawNode of input.extension.nodes || []) addNode(nodes, rawNode);
  for (const rawEdge of input.extension.edges || []) addEdge(edges, rawEdge);
  addExecutorLineages(
    input.catalogue,
    input.extension.executorLineages || [],
    nodes,
    edges,
  );
  const coverageScopes = (input.extension.coverageScopes || []).map(normalizeScope)
    .sort((left, right) => left.scopeId.localeCompare(right.scopeId));
  const declaredStateContractExecutorIds = uniqueSortedStrings(
    input.extension.declaredStateContractExecutorIds || [],
    "RULE_RELATIONSHIP_DECLARED_STATE_EXECUTORS_INVALID",
    { allowEmpty: true },
  );
  verifyEndpoints(nodes, edges, coverageScopes, input.catalogue);
  const manifestIds = new Set(input.catalogue.executorManifest.map((entry) => entry.executorId));
  for (const executorId of declaredStateContractExecutorIds) {
    if (!manifestIds.has(executorId)) {
      fail("RULE_RELATIONSHIP_DECLARED_STATE_EXECUTOR_UNKNOWN", executorId);
    }
  }

  const body = {
    schema: RULE_RELATIONSHIP_GRAPH_SCHEMA,
    gameId: input.catalogue.gameId,
    catalogueHash: input.catalogue.catalogueHash,
    catalogueIndex,
    catalogueDispositionCounts: catalogueAudit.counts.byDisposition,
    nodes: [...nodes.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...edges.values()].sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
    coverageScopes,
    declaredStateContractExecutorIds,
    relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false,
    productionTruth: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, graphHash: hashStarcraftTmgContract(body) });
}

function verifyGraph(graph) {
  if (!object(graph) || graph.schema !== RULE_RELATIONSHIP_GRAPH_SCHEMA) {
    fail("RULE_RELATIONSHIP_GRAPH_SCHEMA_INVALID");
  }
  if (!HASH_PATTERN.test(String(graph.graphHash || ""))
    || hashStarcraftTmgContract(graphBody(graph)) !== graph.graphHash) {
    fail("RULE_RELATIONSHIP_GRAPH_HASH_MISMATCH");
  }
  if (graph.relationshipAuthority !== "derived_audit_evidence_only"
    || graph.rulesAuthority !== false
    || graph.productionTruth !== false
    || graph.trainingTruth !== false) {
    fail("RULE_RELATIONSHIP_GRAPH_AUTHORITY_ESCALATION_FORBIDDEN");
  }
  const nodes = new Map();
  for (const rawNode of graph.nodes || []) addNode(nodes, rawNode);
  const edges = new Map();
  for (const rawEdge of graph.edges || []) {
    const edge = normalizeEdge(rawEdge);
    if (edge.edgeId !== rawEdge.edgeId) fail("RULE_RELATIONSHIP_EDGE_HASH_MISMATCH");
    if (edges.has(edge.edgeId)) fail("RULE_RELATIONSHIP_EDGE_DUPLICATE", edge.edgeId);
    edges.set(edge.edgeId, edge);
  }
  for (const edge of edges.values()) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
      fail("RULE_RELATIONSHIP_EDGE_ENDPOINT_UNKNOWN", edge.edgeId);
    }
  }
  return { nodes, edges };
}

function findPath(graph, from, to, relationships, maxDepth) {
  const allowed = new Set(relationships || []);
  const adjacency = new Map();
  for (const edge of graph.edges) {
    if (allowed.size > 0 && !allowed.has(edge.relationship)) continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge);
  }
  for (const rows of adjacency.values()) rows.sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  const queue = [{ nodeId: from, nodeIds: [from], edgeIds: [], relationships: [] }];
  const bestDepth = new Map([[from, 0]]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.nodeId === to) return current;
    if (current.edgeIds.length >= maxDepth) continue;
    for (const edge of adjacency.get(current.nodeId) || []) {
      const depth = current.edgeIds.length + 1;
      if ((bestDepth.get(edge.to) ?? Number.POSITIVE_INFINITY) <= depth) continue;
      bestDepth.set(edge.to, depth);
      queue.push({
        nodeId: edge.to,
        nodeIds: [...current.nodeIds, edge.to],
        edgeIds: [...current.edgeIds, edge.edgeId],
        relationships: [...current.relationships, edge.relationship],
      });
    }
  }
  return null;
}

export function queryRuleRelationshipImpactV1(graph, query = {}) {
  const { nodes } = verifyGraph(graph);
  const startNodeId = text(query.startNodeId, "RULE_RELATIONSHIP_QUERY_START_REQUIRED");
  if (!nodes.has(startNodeId)) fail("RULE_RELATIONSHIP_QUERY_START_UNKNOWN", startNodeId);
  const direction = String(query.direction || "outbound").trim();
  if (!["inbound", "outbound"].includes(direction)) {
    fail("RULE_RELATIONSHIP_QUERY_DIRECTION_INVALID");
  }
  const maxDepth = Number(query.maxDepth ?? 12);
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 32) {
    fail("RULE_RELATIONSHIP_QUERY_MAX_DEPTH_INVALID");
  }
  const relationships = query.relationships === undefined
    ? []
    : uniqueSortedStrings(
      query.relationships,
      "RULE_RELATIONSHIP_QUERY_TYPES_INVALID",
      { allowEmpty: true },
    );
  for (const relationship of relationships) {
    if (!EDGE_TYPES.includes(relationship)) {
      fail("RULE_RELATIONSHIP_QUERY_TYPE_UNKNOWN", relationship);
    }
  }
  const targetNodeIds = query.targetNodeIds === undefined
    ? []
    : uniqueSortedStrings(
      query.targetNodeIds,
      "RULE_RELATIONSHIP_QUERY_TARGETS_INVALID",
      { allowEmpty: true },
    );
  for (const targetNodeId of targetNodeIds) {
    if (!nodes.has(targetNodeId)) fail("RULE_RELATIONSHIP_QUERY_TARGET_UNKNOWN", targetNodeId);
  }
  const queryGraph = direction === "outbound" ? graph : {
    ...graph,
    edges: graph.edges.map((edge) => ({ ...edge, from: edge.to, to: edge.from })),
  };
  const targets = targetNodeIds.length > 0
    ? targetNodeIds
    : graph.nodes.map((node) => node.nodeId).filter((id) => id !== startNodeId);
  const paths = targets.map((targetNodeId) => {
    const path = findPath(queryGraph, startNodeId, targetNodeId, relationships, maxDepth);
    return path
      ? {
        targetNodeId,
        reached: true,
        depth: path.edgeIds.length,
        nodeIds: path.nodeIds,
        edgeIds: path.edgeIds,
        relationships: path.relationships,
      }
      : {
        targetNodeId,
        reached: false,
        depth: null,
        nodeIds: [],
        edgeIds: [],
        relationships: [],
      };
  });
  return freezeDeep({
    schema: "starcraft_tmg_rule_relationship_impact_query_v1",
    graphHash: graph.graphHash,
    startNodeId,
    direction,
    maxDepth,
    relationships,
    targetNodeIds: targets,
    reachedNodeIds: paths.filter((path) => path.reached).map((path) => path.targetNodeId),
    paths,
    rulesAuthority: false,
    trainingTruth: false,
  });
}

export function auditRuleRelationshipGraphV1(graph) {
  const { nodes } = verifyGraph(graph);
  const edges = graph.edges;
  const outgoingIndex = new Map();
  const incomingIndex = new Map();
  function indexRow(index, nodeIdValue, relationship, edge) {
    const key = `${nodeIdValue}\u0000${relationship}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(edge);
  }
  for (const edge of edges) {
    indexRow(outgoingIndex, edge.from, edge.relationship, edge);
    indexRow(incomingIndex, edge.to, edge.relationship, edge);
  }
  function outgoing(from, relationship) {
    return outgoingIndex.get(`${from}\u0000${relationship}`) || [];
  }
  function incoming(to, relationship) {
    return incomingIndex.get(`${to}\u0000${relationship}`) || [];
  }
  const sourceClauseGaps = graph.catalogueIndex.clauseNodeIds.filter((clauseNodeId) => (
    incoming(clauseNodeId, "source_of").length !== 1
  ));
  const atomSourceGaps = graph.catalogueIndex.atomNodeIds.filter((atomNodeIdValue) => (
    incoming(atomNodeIdValue, "defines").length === 0
  ));
  const executableAtomConsumerGaps = graph.catalogueIndex.executableAtomNodeIds
    .filter((atomNodeIdValue) => outgoing(atomNodeIdValue, "consumed_by").length === 0);
  const executorConsumerGaps = graph.catalogueIndex.executorNodeIds.filter((executorId) => (
    incoming(executorId, "consumed_by").length === 0
  ));
  const executableAtomEvidenceGaps = graph.catalogueIndex.executableAtomNodeIds.filter((atomId) => {
    const evidenceKinds = new Set(outgoing(atomId, "verified_by").map((edge) => (
      edge.provenance.replace(/^catalogue:evidence:/u, "")
    )));
    return EVIDENCE_KEYS.some((key) => !evidenceKinds.has(key));
  });
  const requiredNodeGaps = [];
  const requiredEdgeGaps = [];
  const requiredPathGaps = [];
  const forbiddenPathViolations = [];
  const evidenceTestGaps = [];
  for (const scope of graph.coverageScopes) {
    for (const requiredNodeId of scope.requiredNodeIds) {
      if (!nodes.has(requiredNodeId)) requiredNodeGaps.push(`${scope.scopeId}:${requiredNodeId}`);
    }
    for (const expected of scope.requiredEdges) {
      if (!edges.some((edge) => edge.edgeId === expected.edgeId)) {
        requiredEdgeGaps.push(`${scope.scopeId}:${expected.from}|${expected.relationship}|${expected.to}`);
      }
    }
    for (const required of scope.requiredPaths) {
      if (!findPath(graph, required.from, required.to, required.relationships, required.maxDepth)) {
        requiredPathGaps.push(`${scope.scopeId}:${required.from}->${required.to}`);
      }
    }
    for (const forbidden of scope.forbiddenPaths) {
      if (findPath(graph, forbidden.from, forbidden.to, forbidden.relationships, forbidden.maxDepth)) {
        forbiddenPathViolations.push(`${scope.scopeId}:${forbidden.from}->${forbidden.to}`);
      }
    }
    for (const evidenceTestNodeId of scope.evidenceTestNodeIds) {
      if (incoming(evidenceTestNodeId, "verified_by").length === 0) {
        evidenceTestGaps.push(`${scope.scopeId}:${evidenceTestNodeId}`);
      }
    }
  }
  const declaredState = new Set(graph.declaredStateContractExecutorIds);
  const stateContractMissingExecutorIds = graph.catalogueIndex.executorNodeIds
    .map((id) => id.replace(/^executor:/u, "").replace(/@[^@]+$/u, ""))
    .filter((executorId) => !declaredState.has(executorId))
    .sort();
  const blockingGapCount = [
    sourceClauseGaps,
    atomSourceGaps,
    executableAtomConsumerGaps,
    executorConsumerGaps,
    executableAtomEvidenceGaps,
    requiredNodeGaps,
    requiredEdgeGaps,
    requiredPathGaps,
    forbiddenPathViolations,
    evidenceTestGaps,
  ].reduce((sum, rows) => sum + rows.length, 0);
  const remainingActionableRuleAtoms = Number(
    graph.catalogueDispositionCounts.review_required || 0,
  );
  const globalRelationshipCoverageComplete = blockingGapCount === 0
    && stateContractMissingExecutorIds.length === 0
    && remainingActionableRuleAtoms === 0;
  return freezeDeep({
    schema: "starcraft_tmg_rule_relationship_graph_audit_v1",
    graphHash: graph.graphHash,
    valid: blockingGapCount === 0,
    declaredScopesValid: requiredNodeGaps.length === 0
      && requiredEdgeGaps.length === 0
      && requiredPathGaps.length === 0
      && forbiddenPathViolations.length === 0
      && evidenceTestGaps.length === 0,
    globalRelationshipCoverageComplete,
    productionEligible: false,
    trainingTruth: false,
    counts: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      sourceSnapshots: graph.catalogueIndex.snapshotNodeIds.length,
      sourceClauses: graph.catalogueIndex.clauseNodeIds.length,
      ruleAtoms: graph.catalogueIndex.atomNodeIds.length,
      executableRuleAtoms: graph.catalogueIndex.executableAtomNodeIds.length,
      executors: graph.catalogueIndex.executorNodeIds.length,
      evidenceFixtures: graph.catalogueIndex.evidenceFixtureNodeIds.length,
      coverageScopes: graph.coverageScopes.length,
      declaredStateContractExecutors: graph.declaredStateContractExecutorIds.length,
      stateContractMissingExecutors: stateContractMissingExecutorIds.length,
      remainingActionableRuleAtoms,
      blockingGaps: blockingGapCount,
    },
    gaps: {
      sourceClauseGaps,
      atomSourceGaps,
      executableAtomConsumerGaps,
      executorConsumerGaps,
      executableAtomEvidenceGaps,
      requiredNodeGaps,
      requiredEdgeGaps,
      requiredPathGaps,
      forbiddenPathViolations,
      evidenceTestGaps,
      stateContractMissingExecutorIds,
    },
    coverageDebtCodes: [
      ...(stateContractMissingExecutorIds.length > 0 ? ["STATE_CONTRACTS_PARTIAL"] : []),
      ...(remainingActionableRuleAtoms > 0 ? ["ACTIONABLE_RULE_ATOMS_REMAIN"] : []),
    ],
    relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false,
  });
}
