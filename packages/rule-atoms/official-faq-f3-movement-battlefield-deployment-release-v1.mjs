import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_FAQ_F3_ATOM_BINDING_V1 } from
  "../../content/official-faq-f3-movement-battlefield-deployment-binding-v1.mjs";
import { OFFICIAL_FAQ_F3_BEHAVIOR_KEYS_V1 } from
  "./official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs";
import {
  OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH,
  OFFICIAL_FAQ_V1_BASE_GRAPH_HASH,
  OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH,
  OFFICIAL_FAQ_V1_RULE_RECONCILIATION_HASH,
  verifyOfficialFaqV1RuleReconciliationV1,
} from "./official-faq-v1-rule-reconciliation-v1.mjs";

export const OFFICIAL_FAQ_F3_RELEASE_SCHEMA =
  "starcraft_tmg_official_faq_f3_movement_battlefield_deployment_release_v1";
export const OFFICIAL_FAQ_F3_GRAPH_SCHEMA =
  "starcraft_tmg_official_faq_rule_overlay_graph_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

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

function graphFor({ sourceLockHash, reconciliationHash, baseGraphHash, entries, atoms }) {
  const nodes = new Map();
  const edges = new Map();
  const addNode = (nodeId, kind, label) => {
    const row = { nodeId, kind, label };
    const prior = nodes.get(nodeId);
    if (prior && hashStarcraftTmgContract(prior) !== hashStarcraftTmgContract(row)) {
      fail("FAQ_F3_GRAPH_NODE_COLLISION", nodeId);
    }
    nodes.set(nodeId, row);
  };
  const addEdge = (from, relationship, to) => {
    const body = { from, relationship, to };
    const edge = { edgeId: `faq-edge:${hashStarcraftTmgContract(body)}`, ...body };
    edges.set(edge.edgeId, edge);
  };
  addNode(`source_lock:${sourceLockHash}`, "source_lock", "Official FAQ V1.0 source lock");
  addNode(`reconciliation:${reconciliationHash}`, "reconciliation", "FAQ V1.0 68-entry reconciliation");
  addNode(`base_graph:${baseGraphHash}`, "base_graph", "Frozen Ticket 11 relationship graph");
  addEdge(`source_lock:${sourceLockHash}`, "indexed_by", `reconciliation:${reconciliationHash}`);
  addEdge(`reconciliation:${reconciliationHash}`, "extends", `base_graph:${baseGraphHash}`);
  for (const entry of entries) {
    const entryNode = `faq_source_entry:${entry.entryId}`;
    addNode(entryNode, "faq_source_entry", entry.entryId);
    addEdge(`source_lock:${sourceLockHash}`, "contains", entryNode);
    addEdge(entryNode, "classified_by", `reconciliation:${reconciliationHash}`);
  }
  for (const atom of atoms) {
    const atomNode = `rule_atom:${atom.atomId}`;
    const entryNode = `faq_source_entry:${atom.entryId}`;
    const behaviorNode = `behavior:${atom.behaviorKey}`;
    addNode(atomNode, "faq_rule_atom", atom.primitive);
    addNode(behaviorNode, "behavior", atom.behaviorKey);
    addEdge(entryNode, "defines", atomNode);
    addEdge(atomNode, "executes", behaviorNode);
    for (const baseAtomId of atom.baseAtomIds) {
      const baseNode = `base_rule_atom:${baseAtomId}`;
      addNode(baseNode, "base_rule_atom", baseAtomId);
      addEdge(atomNode, atom.disposition === "supersede" ? "supersedes" : "relates_to",
        baseNode);
    }
    for (const field of atom.reads) {
      const stateNode = `state_field:${field}`;
      addNode(stateNode, "state_field", field);
      addEdge(atomNode, "reads", stateNode);
    }
    for (const field of atom.writes) {
      const stateNode = `state_field:${field}`;
      addNode(stateNode, "state_field", field);
      addEdge(atomNode, "writes", stateNode);
    }
  }
  const body = {
    schema: OFFICIAL_FAQ_F3_GRAPH_SCHEMA,
    sourceLockHash,
    reconciliationHash,
    baseGraphHash,
    nodes: [...nodes.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...edges.values()].sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
  };
  return { ...body, graphHash: hashStarcraftTmgContract(body) };
}

function validateGraph(graph, atoms, entries) {
  const nodes = new Set(graph.nodes.map((node) => node.nodeId));
  const edges = new Set(graph.edges.map((edge) => (
    `${edge.from}|${edge.relationship}|${edge.to}`
  )));
  if (nodes.size !== graph.nodes.length || new Set(graph.edges.map((edge) => edge.edgeId)).size
    !== graph.edges.length || hashStarcraftTmgContract(without(graph, ["graphHash"]))
    !== graph.graphHash) {
    fail("FAQ_F3_GRAPH_INTEGRITY_INVALID");
  }
  for (const entry of entries) {
    const entryNode = `faq_source_entry:${entry.entryId}`;
    if (!nodes.has(entryNode) || !atoms.some((atom) => atom.entryId === entry.entryId)) {
      fail("FAQ_F3_GRAPH_ENTRY_COVERAGE_INVALID", entry.entryId);
    }
  }
  for (const atom of atoms) {
    const atomNode = `rule_atom:${atom.atomId}`;
    if (!nodes.has(atomNode)
      || !edges.has(`faq_source_entry:${atom.entryId}|defines|${atomNode}`)
      || !edges.has(`${atomNode}|executes|behavior:${atom.behaviorKey}`)
      || atom.reads.some((field) => !edges.has(`${atomNode}|reads|state_field:${field}`))
      || atom.writes.some((field) => !edges.has(`${atomNode}|writes|state_field:${field}`))) {
      fail("FAQ_F3_GRAPH_ATOM_COVERAGE_INVALID", atom.atomId);
    }
  }
}

export function createOfficialFaqF3ReleaseV1(input = {}) {
  verifyOfficialFaqV1RuleReconciliationV1(input.reconciliation, {
    sourceLock: input.sourceLock,
    currentCatalogue: input.baseCatalogue,
    currentGraph: input.baseGraph,
    currentRuntimeHash: input.baseRuntimeHash,
  });
  if (input.reconciliation.reconciliationHash !== OFFICIAL_FAQ_V1_RULE_RECONCILIATION_HASH
    || input.baseCatalogue.catalogueHash !== OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH
    || input.baseRuntimeHash !== OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH
    || input.baseGraph.graphHash !== OFFICIAL_FAQ_V1_BASE_GRAPH_HASH) {
    fail("FAQ_F3_UPSTREAM_IDENTITY_INVALID");
  }
  const entries = input.reconciliation.entries.filter((entry) => (
    entry.implementationSlice === "F3"
  ));
  if (entries.length !== 23 || entries[0]?.entryId !== "faq-v1:05"
    || entries.at(-1)?.entryId !== "faq-v1:27") {
    fail("FAQ_F3_ENTRY_DENOMINATOR_INVALID");
  }
  const entryById = new Map(entries.map((entry) => [entry.entryId, entry]));
  const seenAtoms = new Set();
  const atoms = OFFICIAL_FAQ_F3_ATOM_BINDING_V1.map((binding) => {
    const entry = entryById.get(binding.entryId);
    if (!entry || seenAtoms.has(binding.atomId)
      || OFFICIAL_FAQ_F3_BEHAVIOR_KEYS_V1[binding.behaviorKey] !== binding.entryId
      || binding.tokenMarkerImpact !== entry.tokenMarkerImpact
      || !Array.isArray(binding.reads) || binding.reads.length === 0
      || !Array.isArray(binding.writes)) {
      fail("FAQ_F3_ATOM_BINDING_INVALID", binding.atomId);
    }
    seenAtoms.add(binding.atomId);
    return {
      ...binding,
      disposition: entry.disposition,
      sourceEvidence: {
        questionHash: entry.questionHash,
        answerHash: entry.answerHash,
      },
      baseAtomIds: [...entry.atomIds],
      owner: { authority: "rules", actor: "active_seat_or_timing_owner" },
      execution: {
        kernel: "official-faq-f3-movement-battlefield-deployment-kernel-v1",
        behaviorKey: binding.behaviorKey,
        failClosed: true,
      },
      evidence: {
        positive: `${binding.atomId}:positive`,
        negative: `${binding.atomId}:negative`,
        interaction: `${binding.atomId}:interaction`,
        crossTime: `${binding.atomId}:pre-faq-runtime-retained`,
      },
      executable: true,
    };
  });
  if (atoms.length !== 40 || entryById.size !== 23
    || entries.some((entry) => !atoms.some((atom) => atom.entryId === entry.entryId))) {
    fail("FAQ_F3_ATOM_DENOMINATOR_INVALID");
  }
  const graph = graphFor({
    sourceLockHash: input.sourceLock.lockHash,
    reconciliationHash: input.reconciliation.reconciliationHash,
    baseGraphHash: input.baseGraph.graphHash,
    entries,
    atoms,
  });
  validateGraph(graph, atoms, entries);
  const body = {
    schema: OFFICIAL_FAQ_F3_RELEASE_SCHEMA,
    gameId: "starcraft-tmg",
    releaseVersion: "faq-v1.0-f3",
    sourceLockHash: input.sourceLock.lockHash,
    reconciliationHash: input.reconciliation.reconciliationHash,
    immutableBase: {
      catalogueHash: input.baseCatalogue.catalogueHash,
      runtimeHash: input.baseRuntimeHash,
      graphHash: input.baseGraph.graphHash,
      mutationAllowed: false,
      historicalRoomDisplayRetained: true,
      historicalReplayRetained: true,
    },
    entryIds: entries.map((entry) => entry.entryId),
    entryCount: entries.length,
    atomCount: atoms.length,
    executableAtomCount: atoms.length,
    tokenMarkerEntryIds: entries.filter((entry) => entry.tokenMarkerImpact)
      .map((entry) => entry.entryId),
    tokenMarkerAtomIds: atoms.filter((atom) => atom.tokenMarkerImpact)
      .map((atom) => atom.atomId),
    behaviorKeys: [...new Set(atoms.map((atom) => atom.behaviorKey))].sort(),
    atoms,
    graph,
    rulesEligible: false,
    productionRoomEligible: false,
    aggregateCurrentRuntimeEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    blocks: [
      "faq_f4_and_f5_not_complete",
      "faq_aggregate_current_runtime_not_built",
      "ticket_14_token_write_palette_rebind_pending",
      "skill_dsh_muzero_selfplay_and_training_promotion_not_run",
    ],
  };
  return freeze({ ...body, releaseHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialFaqF3ReleaseV1(release, input = {}) {
  if (!object(release) || release.schema !== OFFICIAL_FAQ_F3_RELEASE_SCHEMA
    || !HASH_PATTERN.test(String(release.releaseHash || ""))) {
    fail("FAQ_F3_RELEASE_INVALID");
  }
  const expected = createOfficialFaqF3ReleaseV1(input);
  if (hashStarcraftTmgContract(release) !== hashStarcraftTmgContract(expected)) {
    fail("FAQ_F3_RELEASE_MISMATCH");
  }
  return true;
}
