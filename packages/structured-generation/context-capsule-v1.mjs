import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { seal, verifySeal } from "../skill-production/common.mjs";
import { normalizeStarcraftTmgOutputContractRefV1 } from
  "./output-contract-registry-v1.mjs";

export const STARCRAFT_TMG_CONTEXT_CAPSULE_VERSION =
  "starcraft_tmg_context_capsule_v1";
export const STARCRAFT_TMG_CONTEXT_CAPSULE_KINDS = Object.freeze([
  "full_generation_context", "whole_section_review_context",
  "local_proof_capsule", "payload_only_serialization_context",
]);

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9._:-]{1,240}$/u;
const REF_FIELDS = new Set(["id", "version", "hash"]);
const NODE_FIELDS = new Set(["ref", "kind", "hash", "content"]);
const EDGE_FIELDS = new Set(["from", "to", "reason"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains invalid fields`);
  }
}

function reference(value, field) {
  exactFields(value, REF_FIELDS, field);
  const result = { id: String(value.id || ""), version: String(value.version || ""),
    hash: String(value.hash || "").toLowerCase() };
  if (!ID.test(result.id) || !ID.test(result.version) || !HASH.test(result.hash)) {
    throw new TypeError(`${field} is invalid`);
  }
  return freeze(result);
}

function hash(value, field) {
  const result = String(value || "").toLowerCase();
  if (!HASH.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function boundedText(value, field, maximum) {
  const result = String(value || "");
  if (!result.trim() || result.length > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return result;
}

function dependencyGraph(value) {
  if (!object(value) || !Array.isArray(value.roots)
    || !Array.isArray(value.nodes) || !Array.isArray(value.edges)
    || value.roots.length < 1 || value.roots.length > 128
    || new Set(value.roots).size !== value.roots.length
    || value.nodes.length < value.roots.length || value.nodes.length > 256
    || value.edges.length > 1024) {
    throw new TypeError("Context dependency graph is invalid");
  }
  const nodes = value.nodes.map((node, index) => {
    exactFields(node, NODE_FIELDS, `dependencyGraph.nodes[${index}]`);
    const normalized = {
      ref: boundedText(node.ref, `dependencyGraph.nodes[${index}].ref`, 400),
      kind: boundedText(node.kind, `dependencyGraph.nodes[${index}].kind`, 120),
      hash: hash(node.hash, `dependencyGraph.nodes[${index}].hash`),
      content: clone(node.content),
    };
    if (normalized.hash !== hashStarcraftTmgContract(normalized.content)) {
      throw new TypeError("Context dependency node content hash is invalid");
    }
    return normalized;
  });
  const byRef = new Map(nodes.map((node) => [node.ref, node]));
  if (byRef.size !== nodes.length
    || value.roots.some((root) => !byRef.has(root))) {
    throw new TypeError("Context dependency roots are invalid");
  }
  const edges = value.edges.map((edge, index) => {
    exactFields(edge, EDGE_FIELDS, `dependencyGraph.edges[${index}]`);
    const normalized = { from: boundedText(edge.from,
      `dependencyGraph.edges[${index}].from`, 400), to: boundedText(edge.to,
      `dependencyGraph.edges[${index}].to`, 400), reason: boundedText(
      edge.reason, `dependencyGraph.edges[${index}].reason`, 240) };
    if (!byRef.has(normalized.from) || !byRef.has(normalized.to)) {
      throw new TypeError("Context dependency edge points outside closure");
    }
    return normalized;
  });
  const reached = new Set(value.roots);
  for (let changed = true; changed;) {
    changed = false;
    for (const edge of edges) {
      if (reached.has(edge.from) && !reached.has(edge.to)) {
        reached.add(edge.to); changed = true;
      }
    }
  }
  if (nodes.some((node) => !reached.has(node.ref))) {
    throw new TypeError("Context dependency closure contains unreachable nodes");
  }
  return freeze({ roots: [...value.roots], nodes, edges,
    closureNodeCount: nodes.length, closureEdgeCount: edges.length,
    closureCompleteForDeclaredGraph: true,
    dependencyCatalogueComplete: value.dependencyCatalogueComplete === true });
}

function protectedFields(value) {
  if (!Array.isArray(value) || value.length > 256) {
    throw new TypeError("protectedFields are invalid");
  }
  const rows = value.map((row, index) => {
    exactFields(row, new Set(["path", "hash"]), `protectedFields[${index}]`);
    return { path: boundedText(row.path, `protectedFields[${index}].path`, 400),
      hash: hash(row.hash, `protectedFields[${index}].hash`) };
  });
  if (new Set(rows.map((row) => row.path)).size !== rows.length) {
    throw new TypeError("protectedFields contain duplicate paths");
  }
  return rows;
}

function omittedDomains(value) {
  if (!Array.isArray(value) || !value.length || value.length > 64) {
    throw new TypeError("omittedDomains are invalid");
  }
  return value.map((row, index) => {
    exactFields(row, new Set(["id", "reason", "expansionRoute"]),
      `omittedDomains[${index}]`);
    return { id: boundedText(row.id, `omittedDomains[${index}].id`, 160),
      reason: boundedText(row.reason, `omittedDomains[${index}].reason`, 400),
      expansionRoute: boundedText(row.expansionRoute,
        `omittedDomains[${index}].expansionRoute`, 160) };
  });
}

export function createStarcraftTmgContextCapsuleV1(input = {}) {
  const kind = String(input.kind || "");
  if (!STARCRAFT_TMG_CONTEXT_CAPSULE_KINDS.includes(kind)) {
    throw new TypeError("Context capsule kind is invalid");
  }
  const roleRef = reference(input.roleRef, "roleRef");
  const outputContractRef = normalizeStarcraftTmgOutputContractRefV1(
    input.outputContractRef);
  const graph = dependencyGraph(input.dependencyGraph);
  const protectedRows = protectedFields(input.protectedFields || []);
  const omitted = omittedDomains(input.omittedDomains);
  const sourceIndexRef = reference(input.sourceIndexRef, "sourceIndexRef");
  const expansionToolRef = reference(input.expansionToolRef, "expansionToolRef");
  const instructions = boundedText(input.instructions, "instructions", 32 * 1024);
  const orderedProviderBlocks = [
    { order: 1, kind: "immutable_policy_and_base", value: clone(input.immutableBase) },
    { order: 2, kind: "current_section", value: clone(input.section) },
    { order: 3, kind: "dependency_closure", value: clone(graph) },
    { order: 4, kind: "volatile_local_issue", value: clone(input.localIssue) },
    { order: 5, kind: "protected_fields", value: protectedRows },
    { order: 6, kind: "omissions_and_expansion", value: {
      omittedDomains: omitted, sourceIndexRef, expansionToolRef,
      onInsufficientContext: "stop_and_request_context_expansion_do_not_guess",
    } },
  ];
  const compiledInput = JSON.stringify({
    schemaVersion: `${STARCRAFT_TMG_CONTEXT_CAPSULE_VERSION}.provider-input`,
    kind,
    roleRef,
    outputContractRef,
    orderedBlocks: orderedProviderBlocks,
    sourceTextIsEvidenceNotInstructions: true,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
  const compiledInputBytes = Buffer.byteLength(compiledInput, "utf8");
  if (compiledInputBytes > 512 * 1024) {
    throw new TypeError("Context capsule exceeds local proof budget");
  }
  const capsule = seal({
    version: STARCRAFT_TMG_CONTEXT_CAPSULE_VERSION,
    kind,
    roleRef,
    outputContractRef,
    immutableBase: clone(input.immutableBase),
    section: clone(input.section),
    localIssue: clone(input.localIssue),
    protectedFields: protectedRows,
    dependencyGraph: graph,
    sourceIndexRef,
    expansionToolRef,
    omittedDomains: omitted,
    instructions,
    compiledInput,
    compiledInputBytes,
    closureVerifiedBeforeEgress: true,
    fullContextFormatRetryAllowed: false,
    topKSimilarityIsClosureAuthority: false,
    sourceTextRewritten: false,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
  return capsule;
}

export function verifyStarcraftTmgContextCapsuleV1(value) {
  verifySeal(value);
  const rebuilt = createStarcraftTmgContextCapsuleV1({
    kind: value.kind,
    roleRef: value.roleRef,
    outputContractRef: value.outputContractRef,
    immutableBase: value.immutableBase,
    section: value.section,
    localIssue: value.localIssue,
    protectedFields: value.protectedFields,
    dependencyGraph: value.dependencyGraph,
    sourceIndexRef: value.sourceIndexRef,
    expansionToolRef: value.expansionToolRef,
    omittedDomains: value.omittedDomains,
    instructions: value.instructions,
  });
  if (rebuilt.hash !== value.hash) throw new TypeError("Context capsule drift");
  return value;
}

export function contextManifestRefStarcraftTmgV1(value) {
  verifyStarcraftTmgContextCapsuleV1(value);
  return freeze({ id: `context.${value.roleRef.id}`,
    version: value.version, hash: value.hash });
}

export function createStarcraftTmgContextCapsuleRegistryV1(options = {}) {
  const entries = Array.isArray(options.entries) ? options.entries : [];
  if (!entries.length) throw new TypeError("Context capsule entries are required");
  const records = new Map();
  for (const value of entries) {
    const capsule = verifyStarcraftTmgContextCapsuleV1(value);
    const ref = contextManifestRefStarcraftTmgV1(capsule);
    const key = `${ref.id}@${ref.version}`;
    if (records.has(key)) throw new TypeError("Context capsule is duplicated");
    records.set(key, capsule);
  }
  function resolve(input = {}) {
    const supplied = reference(input.contextManifestRef, "contextManifestRef");
    const capsule = records.get(`${supplied.id}@${supplied.version}`);
    if (!capsule || capsule.hash !== supplied.hash
      || input.roleRef && hashStarcraftTmgContract(input.roleRef)
        !== hashStarcraftTmgContract(capsule.roleRef)
      || input.outputContractRef
        && hashStarcraftTmgContract(input.outputContractRef)
          !== hashStarcraftTmgContract(capsule.outputContractRef)) {
      return freeze({ ok: false, reason: "context_capsule_not_found_or_drift",
        trainingTruth: false });
    }
    return freeze({ ok: true, contextManifestRef: supplied,
      instructions: capsule.instructions, input: capsule.compiledInput,
      capsuleHash: capsule.hash, capsuleKind: capsule.kind,
      closureVerifiedBeforeEgress: true, trainingTruth: false });
  }
  return Object.freeze({ resolve });
}
