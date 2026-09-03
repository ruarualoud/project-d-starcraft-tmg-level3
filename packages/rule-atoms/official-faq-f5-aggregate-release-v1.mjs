import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_FAQ_F5_ATOM_BINDING_V1 } from
  "../../content/official-faq-f5-attack-scoring-template-binding-v1.mjs";
import { evaluateOfficialFaqF3RuleV1 } from
  "./official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs";
import {
  OFFICIAL_FAQ_F3_GRAPH_HASH,
  OFFICIAL_FAQ_F3_RELEASE_HASH,
  verifyOfficialFaqF3ReleaseV1,
} from "./official-faq-f3-movement-battlefield-deployment-release-v1.mjs";
import { evaluateOfficialFaqF4RuleV1 } from
  "./official-faq-f4-ability-tactical-keyword-kernel-v1.mjs";
import {
  OFFICIAL_FAQ_F4_GRAPH_HASH,
  OFFICIAL_FAQ_F4_RELEASE_HASH,
  verifyOfficialFaqF4ReleaseV1,
} from "./official-faq-f4-ability-tactical-keyword-release-v1.mjs";
import {
  OFFICIAL_FAQ_F5_BEHAVIOR_KEYS_V1,
  evaluateOfficialFaqF5RuleV1,
} from "./official-faq-f5-attack-scoring-template-kernel-v1.mjs";
import {
  OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH,
  OFFICIAL_FAQ_V1_BASE_GRAPH_HASH,
  OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH,
  OFFICIAL_FAQ_V1_RULE_RECONCILIATION_HASH,
  verifyOfficialFaqV1RuleReconciliationV1,
} from "./official-faq-v1-rule-reconciliation-v1.mjs";

export const OFFICIAL_FAQ_F5_RELEASE_SCHEMA =
  "starcraft_tmg_official_faq_f5_aggregate_release_v1";
export const OFFICIAL_FAQ_CURRENT_CATALOGUE_SCHEMA =
  "starcraft_tmg_official_faq_current_catalogue_v1";
export const OFFICIAL_FAQ_CURRENT_RUNTIME_SCHEMA =
  "starcraft_tmg_official_faq_current_runtime_v1";
export const OFFICIAL_FAQ_CURRENT_GRAPH_SCHEMA =
  "starcraft_tmg_official_faq_current_relationship_graph_v1";
export const OFFICIAL_PRE_FAQ_SOURCE_LOCK_HASH =
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1";
export const OFFICIAL_FAQ_F5_RELEASE_HASH =
  "1257721414ee269e6b117b41a2734d71e1299dc0b7d411e189a25629a7f1ffa7";
export const OFFICIAL_FAQ_CURRENT_AGGREGATE_HASH =
  "cc3ab3d151d96af101aecb249422c816076ee251f66326659830743fbe6b4d2e";
export const OFFICIAL_FAQ_CURRENT_CATALOGUE_HASH =
  "c2ed9b51482c2d83767fd1e2d41b5cfc5a3f9db97e6c408e4579d7ee2aab208f";
export const OFFICIAL_FAQ_CURRENT_RUNTIME_HASH =
  "82d436a60751a82dfb1a2ad7686cb47d6855883709460128e50baa72c1dbb6fd";
export const OFFICIAL_FAQ_CURRENT_GRAPH_HASH =
  "ac3b6d556cca6ec0ae42bef78c276289954084c248e996a6d00d7d1261d1659a";
export const OFFICIAL_FAQ_TOKEN_MARKER_CONTRACT_HASH =
  "f42f79c57d7fda3581a678b14a9d603d9630c1f7178aecf9f08acbb40f912c49";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const F5_ENTRY_IDS = Object.freeze([
  "faq-v1:01", "faq-v1:02", "faq-v1:03", "faq-v1:04",
  "faq-v1:28", "faq-v1:29", "faq-v1:30", "faq-v1:31", "faq-v1:32", "faq-v1:33",
  "faq-v1:60", "faq-v1:61", "faq-v1:62", "faq-v1:63",
  "faq-v1:65", "faq-v1:66", "faq-v1:67", "faq-v1:68",
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
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function addNode(nodes, row) {
  const prior = nodes.get(row.nodeId);
  if (prior && hashStarcraftTmgContract(prior) !== hashStarcraftTmgContract(row)) {
    fail("FAQ_AGGREGATE_GRAPH_NODE_COLLISION", row.nodeId);
  }
  nodes.set(row.nodeId, row);
}
function addEdge(edges, row) {
  const body = without(row, ["edgeId"]);
  const normalized = { edgeId: `faq-edge:${hashStarcraftTmgContract(body)}`, ...body };
  const prior = edges.get(normalized.edgeId);
  if (prior && hashStarcraftTmgContract(prior) !== hashStarcraftTmgContract(normalized)) {
    fail("FAQ_AGGREGATE_GRAPH_EDGE_COLLISION", normalized.edgeId);
  }
  edges.set(normalized.edgeId, normalized);
}

function f5Graph({ sourceLockHash, reconciliationHash, baseGraphHash,
  previousOverlayGraphHash, entries, atoms }) {
  const nodes = new Map();
  const edges = new Map();
  addNode(nodes, { nodeId: `source_lock:${sourceLockHash}`, kind: "source_lock",
    label: "Official FAQ V1.0 source lock" });
  addNode(nodes, { nodeId: `reconciliation:${reconciliationHash}`, kind: "reconciliation",
    label: "FAQ V1.0 68-entry reconciliation" });
  addNode(nodes, { nodeId: `base_graph:${baseGraphHash}`, kind: "base_graph",
    label: "Frozen Ticket 11 relationship graph" });
  addNode(nodes, { nodeId: `previous_overlay_graph:${previousOverlayGraphHash}`,
    kind: "previous_overlay_graph", label: "FAQ F4 relationship overlay" });
  addEdge(edges, { from: `source_lock:${sourceLockHash}`, relationship: "indexed_by",
    to: `reconciliation:${reconciliationHash}` });
  addEdge(edges, { from: `reconciliation:${reconciliationHash}`, relationship: "extends",
    to: `base_graph:${baseGraphHash}` });
  addEdge(edges, { from: `previous_overlay_graph:${previousOverlayGraphHash}`,
    relationship: "extends", to: `base_graph:${baseGraphHash}` });
  for (const entry of entries) {
    const entryNode = `faq_source_entry:${entry.entryId}`;
    addNode(nodes, { nodeId: entryNode, kind: "faq_source_entry", label: entry.entryId });
    addEdge(edges, { from: `source_lock:${sourceLockHash}`, relationship: "contains",
      to: entryNode });
    addEdge(edges, { from: entryNode, relationship: "classified_by",
      to: `reconciliation:${reconciliationHash}` });
  }
  for (const atom of atoms) {
    const atomNode = `rule_atom:${atom.atomId}`;
    const behaviorNode = `behavior:${atom.behaviorKey}`;
    addNode(nodes, { nodeId: atomNode, kind: "faq_rule_atom", label: atom.primitive });
    addNode(nodes, { nodeId: behaviorNode, kind: "behavior", label: atom.behaviorKey });
    addEdge(edges, { from: `faq_source_entry:${atom.entryId}`, relationship: "defines",
      to: atomNode });
    addEdge(edges, { from: atomNode, relationship: "executes", to: behaviorNode });
    for (const baseAtomId of atom.baseAtomIds) {
      const baseNode = `base_rule_atom:${baseAtomId}`;
      addNode(nodes, { nodeId: baseNode, kind: "base_rule_atom", label: baseAtomId });
      addEdge(edges, { from: atomNode, relationship: "relates_to", to: baseNode });
    }
    for (const field of atom.reads) {
      const stateNode = `state_field:${field}`;
      addNode(nodes, { nodeId: stateNode, kind: "state_field", label: field });
      addEdge(edges, { from: atomNode, relationship: "reads", to: stateNode });
    }
    for (const field of atom.writes) {
      const stateNode = `state_field:${field}`;
      addNode(nodes, { nodeId: stateNode, kind: "state_field", label: field });
      addEdge(edges, { from: atomNode, relationship: "writes", to: stateNode });
    }
  }
  const body = {
    schema: "starcraft_tmg_official_faq_rule_overlay_graph_v1",
    sourceLockHash,
    reconciliationHash,
    baseGraphHash,
    previousOverlayGraphHash,
    nodes: [...nodes.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...edges.values()].sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
  };
  return { ...body, graphHash: hashStarcraftTmgContract(body) };
}

function mergedOverlayGraph(releases) {
  const nodes = new Map();
  const edges = new Map();
  for (const release of releases) {
    for (const node of release.graph.nodes) addNode(nodes, node);
    for (const edge of release.graph.edges) addEdge(edges, edge);
  }
  for (const release of releases) {
    const releaseNode = `overlay_release:${release.releaseHash}`;
    addNode(nodes, { nodeId: releaseNode, kind: "overlay_release",
      label: release.releaseVersion });
    for (const atom of release.atoms) {
      addEdge(edges, { from: releaseNode, relationship: "contains",
        to: `rule_atom:${atom.atomId}` });
    }
  }
  const body = {
    schema: "starcraft_tmg_official_faq_merged_overlay_graph_v1",
    releaseHashes: releases.map((release) => release.releaseHash),
    nodes: [...nodes.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...edges.values()].sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
  };
  return { ...body, graphHash: hashStarcraftTmgContract(body) };
}

function currentCatalogue({ sourceLock, reconciliation, baseCatalogue, releases,
  overlayGraph }) {
  const atomIndex = releases.flatMap((release) => release.atoms.map((atom) => ({
    atomId: atom.atomId,
    entryId: atom.entryId,
    releaseHash: release.releaseHash,
    atomHash: hashStarcraftTmgContract(atom),
  }))).sort((left, right) => left.atomId.localeCompare(right.atomId));
  if (atomIndex.length !== 137 || new Set(atomIndex.map((atom) => atom.atomId)).size !== 137) {
    fail("FAQ_CURRENT_CATALOGUE_ATOM_DENOMINATOR_INVALID");
  }
  const body = {
    schema: OFFICIAL_FAQ_CURRENT_CATALOGUE_SCHEMA,
    gameId: "starcraft-tmg",
    catalogueVersion: "0.112.0-official-faq-v1-current",
    sourceLockHash: sourceLock.lockHash,
    reconciliationHash: reconciliation.reconciliationHash,
    baseCatalogueHash: baseCatalogue.catalogueHash,
    overlayGraphHash: overlayGraph.graphHash,
    baseAtomCount: 1026,
    faqAtomCount: atomIndex.length,
    atomCount: 1163,
    executableAtomCount: 1049,
    displayOnlyAtomCount: 114,
    reviewRequiredAtomCount: 0,
    atomIndex,
  };
  return { ...body, catalogueHash: hashStarcraftTmgContract(body) };
}

function currentRuntime({ catalogue, sourceLock, reconciliation, baseRuntimeHash,
  overlayGraph, releases }) {
  const body = {
    schema: OFFICIAL_FAQ_CURRENT_RUNTIME_SCHEMA,
    gameId: "starcraft-tmg",
    rulesVersion: "official-faq-v1.0-current",
    catalogueHash: catalogue.catalogueHash,
    sourceLockHash: sourceLock.lockHash,
    reconciliationHash: reconciliation.reconciliationHash,
    baseRuntimeHash,
    overlayGraphHash: overlayGraph.graphHash,
    baseExecutorCount: 80,
    faqExecutorManifest: [
      { executorId: "authority.faq-f3-movement-battlefield-deployment-v1",
        executorVersion: "1.0.0", releaseHash: releases[0].releaseHash,
        behaviorKeys: releases[0].behaviorKeys },
      { executorId: "authority.faq-f4-ability-tactical-keyword-v1",
        executorVersion: "1.0.0", releaseHash: releases[1].releaseHash,
        behaviorKeys: releases[1].behaviorKeys },
      { executorId: "authority.faq-f5-attack-scoring-template-v1",
        executorVersion: "1.0.0", releaseHash: releases[2].releaseHash,
        behaviorKeys: releases[2].behaviorKeys },
    ],
    executorCount: 83,
    faqEntryCount: 68,
    faqAtomCount: 137,
    unknownEntryPolicy: "fail_closed",
    silentCompatibilityAllowed: false,
  };
  return { ...body, runtimeHash: hashStarcraftTmgContract(body) };
}

function currentGraph({ overlayGraph, catalogue, runtime }) {
  const nodes = new Map(overlayGraph.nodes.map((node) => [node.nodeId, node]));
  const edges = new Map(overlayGraph.edges.map((edge) => [edge.edgeId, edge]));
  const catalogueNode = `catalogue:${catalogue.catalogueHash}`;
  const runtimeNode = `runtime:${runtime.runtimeHash}`;
  addNode(nodes, { nodeId: catalogueNode, kind: "current_catalogue",
    label: catalogue.catalogueVersion });
  addNode(nodes, { nodeId: runtimeNode, kind: "current_runtime", label: runtime.rulesVersion });
  addEdge(edges, { from: runtimeNode, relationship: "consumes", to: catalogueNode });
  addEdge(edges, { from: catalogueNode, relationship: "extends",
    to: `base_graph:${OFFICIAL_FAQ_V1_BASE_GRAPH_HASH}` });
  for (const atom of catalogue.atomIndex) {
    addEdge(edges, { from: catalogueNode, relationship: "contains",
      to: `rule_atom:${atom.atomId}` });
    addEdge(edges, { from: `rule_atom:${atom.atomId}`, relationship: "consumed_by",
      to: runtimeNode });
  }
  const body = {
    schema: OFFICIAL_FAQ_CURRENT_GRAPH_SCHEMA,
    sourceOverlayGraphHash: overlayGraph.graphHash,
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.runtimeHash,
    nodes: [...nodes.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...edges.values()].sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
  };
  return { ...body, graphHash: hashStarcraftTmgContract(body) };
}

function roomBindingShape(binding) {
  const keys = ["rulesVersion", "sourceLockHash", "reconciliationHash",
    "catalogueHash", "runtimeHash", "graphHash"];
  if (!object(binding) || Object.keys(binding).some((key) => !keys.includes(key))) return false;
  return keys.every((key) => Object.hasOwn(binding, key));
}

export function classifyOfficialFaqRoomBindingV1(aggregate, binding) {
  if (!object(aggregate) || !roomBindingShape(binding)) {
    return freeze({ status: "quarantined", executable: false, historical: false,
      reasonCode: "ROOM_RULE_BINDING_INVALID" });
  }
  const current = binding.rulesVersion === aggregate.runtime.rulesVersion
    && binding.sourceLockHash === aggregate.sourceLockHash
    && binding.reconciliationHash === aggregate.reconciliationHash
    && binding.catalogueHash === aggregate.catalogue.catalogueHash
    && binding.runtimeHash === aggregate.runtime.runtimeHash
    && binding.graphHash === aggregate.graph.graphHash;
  if (current) return freeze({ status: "current_faq_v1", executable: true,
    historical: false, reasonCode: null });
  const historical = binding.rulesVersion === "official-pre-faq-ticket11"
    && binding.sourceLockHash === OFFICIAL_PRE_FAQ_SOURCE_LOCK_HASH
    && binding.reconciliationHash === null
    && binding.catalogueHash === OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH
    && binding.runtimeHash === OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH
    && binding.graphHash === OFFICIAL_FAQ_V1_BASE_GRAPH_HASH;
  if (historical) return freeze({ status: "historical_pre_faq", executable: true,
    historical: true, reasonCode: null });
  return freeze({ status: "quarantined", executable: false, historical: false,
    reasonCode: "ROOM_RULE_BINDING_HASH_MISMATCH" });
}

export function evaluateOfficialFaqCurrentRuleV1(runtime, entryId, input = {}) {
  if (!object(runtime) || runtime.schema !== OFFICIAL_FAQ_CURRENT_RUNTIME_SCHEMA
    || hashStarcraftTmgContract(without(runtime, ["runtimeHash"])) !== runtime.runtimeHash) {
    fail("FAQ_CURRENT_RUNTIME_INVALID");
  }
  if (entryId >= "faq-v1:05" && entryId <= "faq-v1:27") {
    return evaluateOfficialFaqF3RuleV1(entryId, input);
  }
  if ((entryId >= "faq-v1:34" && entryId <= "faq-v1:59") || entryId === "faq-v1:64") {
    return evaluateOfficialFaqF4RuleV1(entryId, input);
  }
  if (F5_ENTRY_IDS.includes(entryId)) return evaluateOfficialFaqF5RuleV1(entryId, input);
  fail("FAQ_CURRENT_ENTRY_NOT_EXECUTABLE", String(entryId));
}

export function createOfficialFaqF5AggregateReleaseV1(input = {}) {
  const reconciliationInput = { sourceLock: input.sourceLock,
    currentCatalogue: input.baseCatalogue, currentGraph: input.baseGraph,
    currentRuntimeHash: input.baseRuntimeHash };
  verifyOfficialFaqV1RuleReconciliationV1(input.reconciliation, reconciliationInput);
  const shared = { sourceLock: input.sourceLock, reconciliation: input.reconciliation,
    baseCatalogue: input.baseCatalogue, baseGraph: input.baseGraph,
    baseRuntimeHash: input.baseRuntimeHash };
  verifyOfficialFaqF3ReleaseV1(input.f3Release, shared);
  verifyOfficialFaqF4ReleaseV1(input.f4Release, { ...shared, f3Release: input.f3Release });
  if (input.reconciliation.reconciliationHash !== OFFICIAL_FAQ_V1_RULE_RECONCILIATION_HASH
    || input.baseCatalogue.catalogueHash !== OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH
    || input.baseRuntimeHash !== OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH
    || input.baseGraph.graphHash !== OFFICIAL_FAQ_V1_BASE_GRAPH_HASH
    || input.f3Release.releaseHash !== OFFICIAL_FAQ_F3_RELEASE_HASH
    || input.f3Release.graph.graphHash !== OFFICIAL_FAQ_F3_GRAPH_HASH
    || input.f4Release.releaseHash !== OFFICIAL_FAQ_F4_RELEASE_HASH
    || input.f4Release.graph.graphHash !== OFFICIAL_FAQ_F4_GRAPH_HASH) {
    fail("FAQ_F5_UPSTREAM_IDENTITY_INVALID");
  }
  const entries = input.reconciliation.entries.filter((entry) => (
    entry.implementationSlice === "F5"
  ));
  if (entries.length !== 18
    || entries.some((entry, index) => entry.entryId !== F5_ENTRY_IDS[index])) {
    fail("FAQ_F5_ENTRY_DENOMINATOR_INVALID");
  }
  const entryById = new Map(entries.map((entry) => [entry.entryId, entry]));
  const seenAtoms = new Set();
  const atoms = OFFICIAL_FAQ_F5_ATOM_BINDING_V1.map((binding) => {
    const entry = entryById.get(binding.entryId);
    if (!entry || seenAtoms.has(binding.atomId)
      || OFFICIAL_FAQ_F5_BEHAVIOR_KEYS_V1[binding.behaviorKey] !== binding.entryId
      || binding.tokenMarkerImpact !== false || !Array.isArray(binding.reads)
      || binding.reads.length === 0 || !Array.isArray(binding.writes)) {
      fail("FAQ_F5_ATOM_BINDING_INVALID", binding.atomId);
    }
    seenAtoms.add(binding.atomId);
    return {
      ...binding,
      disposition: entry.disposition,
      sourceEvidence: { questionHash: entry.questionHash, answerHash: entry.answerHash },
      baseAtomIds: [...entry.atomIds],
      owner: { authority: "rules", actor: "active_seat_or_timing_owner" },
      execution: { kernel: "official-faq-f5-attack-scoring-template-kernel-v1",
        behaviorKey: binding.behaviorKey, failClosed: true },
      evidence: { positive: `${binding.atomId}:positive`,
        negative: `${binding.atomId}:negative`,
        interaction: `${binding.atomId}:interaction`,
        crossTime: `${binding.atomId}:pre-faq-runtime-retained` },
      executable: true,
    };
  });
  if (atoms.length !== 40 || entries.some((entry) => (
    !atoms.some((atom) => atom.entryId === entry.entryId)))) {
    fail("FAQ_F5_ATOM_DENOMINATOR_INVALID");
  }
  const graph = f5Graph({ sourceLockHash: input.sourceLock.lockHash,
    reconciliationHash: input.reconciliation.reconciliationHash,
    baseGraphHash: input.baseGraph.graphHash,
    previousOverlayGraphHash: input.f4Release.graph.graphHash, entries, atoms });
  const releaseSeed = {
    schema: "starcraft_tmg_official_faq_f5_attack_scoring_template_release_v1",
    releaseVersion: "faq-v1.0-f5",
    sourceLockHash: input.sourceLock.lockHash,
    reconciliationHash: input.reconciliation.reconciliationHash,
    previousOverlayGraphHash: input.f4Release.graph.graphHash,
    entryIds: entries.map((entry) => entry.entryId),
    entryCount: entries.length,
    atomCount: atoms.length,
    executableAtomCount: atoms.length,
    tokenMarkerEntryIds: [],
    tokenMarkerAtomIds: [],
    behaviorKeys: [...new Set(atoms.map((atom) => atom.behaviorKey))].sort(),
    atoms,
    graph,
  };
  const f5Release = { ...releaseSeed, releaseHash: hashStarcraftTmgContract(releaseSeed) };
  const releases = [input.f3Release, input.f4Release, f5Release];
  const overlayGraph = mergedOverlayGraph(releases);
  const catalogue = currentCatalogue({ sourceLock: input.sourceLock,
    reconciliation: input.reconciliation, baseCatalogue: input.baseCatalogue,
    releases, overlayGraph });
  const runtime = currentRuntime({ catalogue, sourceLock: input.sourceLock,
    reconciliation: input.reconciliation, baseRuntimeHash: input.baseRuntimeHash,
    overlayGraph, releases });
  const aggregateGraph = currentGraph({ overlayGraph, catalogue, runtime });
  const tokenMarkerEntryIds = [...input.f3Release.tokenMarkerEntryIds,
    ...input.f4Release.tokenMarkerEntryIds].sort();
  const tokenMarkerAtomIds = [...input.f3Release.tokenMarkerAtomIds,
    ...input.f4Release.tokenMarkerAtomIds].sort();
  const tokenMarkerContractBody = {
    schema: "starcraft_tmg_official_faq_token_marker_contract_v1",
    sourceLockHash: input.sourceLock.lockHash,
    reconciliationHash: input.reconciliation.reconciliationHash,
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.runtimeHash,
    graphHash: aggregateGraph.graphHash,
    entryIds: tokenMarkerEntryIds,
    atomIds: tokenMarkerAtomIds,
    rulesOwnedWriteOnly: true,
    unclassifiedActionPolicy: "fail_closed",
  };
  const tokenMarkerContract = { ...tokenMarkerContractBody,
    contractHash: hashStarcraftTmgContract(tokenMarkerContractBody) };
  const aggregate = {
    schema: "starcraft_tmg_official_faq_v1_current_rules_aggregate_v1",
    rulesVersion: runtime.rulesVersion,
    sourceLockHash: input.sourceLock.lockHash,
    reconciliationHash: input.reconciliation.reconciliationHash,
    catalogue,
    runtime,
    graph: aggregateGraph,
    overlayGraphHash: overlayGraph.graphHash,
    releaseHashes: releases.map((release) => release.releaseHash),
    faqEntryCount: 68,
    faqAtomCount: 137,
    baseAtomCount: 1026,
    totalAtomCount: 1163,
    executableAtomCount: 1049,
    displayOnlyAtomCount: 114,
    executorCount: 83,
    tokenMarkerContract,
    oldRules: { rulesVersion: "official-pre-faq-ticket11",
      sourceLockHash: OFFICIAL_PRE_FAQ_SOURCE_LOCK_HASH,
      reconciliationHash: null,
      catalogueHash: OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH,
      runtimeHash: OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH,
      graphHash: OFFICIAL_FAQ_V1_BASE_GRAPH_HASH,
      displayRetained: true, replayRetained: true, mutationAllowed: false },
    rulesEligible: true,
    ticket14RebindEligible: true,
    productionRoomEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  };
  const aggregateWithHash = { ...aggregate,
    aggregateHash: hashStarcraftTmgContract(aggregate) };
  const body = {
    schema: OFFICIAL_FAQ_F5_RELEASE_SCHEMA,
    gameId: "starcraft-tmg",
    releaseVersion: "faq-v1.0-complete",
    f5Release,
    aggregate: aggregateWithHash,
    rulesEligible: true,
    ticket14RebindEligible: true,
    productionRoomEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    blocks: [
      "ticket_14_slice_140_143_rebind_and_client_evidence_pending",
      "production_signing_deployment_and_live_device_evidence_pending",
      "skill_dsh_muzero_selfplay_and_training_promotion_not_run",
    ],
  };
  return freeze({ ...body, releaseHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialFaqF5AggregateReleaseV1(release, input = {}) {
  if (!object(release) || release.schema !== OFFICIAL_FAQ_F5_RELEASE_SCHEMA
    || !HASH_PATTERN.test(String(release.releaseHash || ""))) {
    fail("FAQ_F5_RELEASE_INVALID");
  }
  const expected = createOfficialFaqF5AggregateReleaseV1(input);
  if (hashStarcraftTmgContract(release) !== hashStarcraftTmgContract(expected)) {
    fail("FAQ_F5_RELEASE_MISMATCH");
  }
  return true;
}
