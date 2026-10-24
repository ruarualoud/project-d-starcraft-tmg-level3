import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { encodeStarcraftTmgGeometryTableV1 } from
  "./exact-geometry-column-table-v1.mjs";
import { encodeStarcraftTmgGeometryColumnReuseV2 } from
  "./exact-geometry-column-reuse-v2.mjs";
import { encodeExactEvidenceRecordTreeV1 } from
  "./exact-evidence-record-table-v1.mjs";
export { restoreExactEvidenceRecordTreeV1 as
  restoreStarcraftTmgIncomingFireRecordsForPromptV1,
  EXACT_EVIDENCE_RECORD_ROWS_MEANING } from
  "./exact-evidence-record-table-v1.mjs";
export { encodeStarcraftTmgGeometryTableV1,
  decodeStarcraftTmgGeometryTableV1 } from
  "./exact-geometry-column-table-v1.mjs";

export const SPATIAL_QUERY_PROMPT_PROJECTION_V1 =
  "starcraft_tmg_spatial_query_prompt_projection_v1";

// Every reaction/outcome/casualty record remains recoverable in this input.
// Shallow record tables avoid repeating giant flattened schemas when different
// loss states contain different casualty counts. Host truth keeps original rows.
export function projectStarcraftTmgIncomingFireEstimateForPromptV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return encodeExactEvidenceRecordTreeV1(value);
}

const LEGACY_FIRE_FACT_REF = "sharedIncomingFireFactRef";
const FIRE_FACT_REF = "fireFactRef";
const FIRE_ESTIMATES = ["incomingStationaryFireEstimate", "incomingMoveThenFireEstimate"];

// One receipt/one snapshot only. Exact repeated subtrees, not similar states or
// averaged probabilities, share a visible fact. This never touches Host truth.
export function shareStarcraftTmgFormationFireFactsForPromptV1(options) {
  const counts = new Map();
  const exactTexts = new WeakMap();
  const textFor = value => {
    if (!exactTexts.has(value)) exactTexts.set(value, JSON.stringify(value));
    return exactTexts.get(value);
  };
  let reservedFieldSeen = false;
  const count = value => {
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, FIRE_FACT_REF)
      || Object.hasOwn(value, LEGACY_FIRE_FACT_REF)) reservedFieldSeen = true;
    const key = textFor(value);
    if (key.length >= 64) counts.set(key, (counts.get(key) || 0) + 1);
    for (const child of Object.values(value)) count(child);
  };
  for (const option of options) for (const field of FIRE_ESTIMATES) {
    count(option.relationshipComparison?.[field]);
  }
  if (reservedFieldSeen) return { formationOptions: options, sharedIncomingFireFacts: null };
  const factByValue = new Map();
  const facts = [];
  const children = value => Array.isArray(value) ? value.map(encode)
    : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)]));
  const encode = value => {
    if (!value || typeof value !== "object") return value;
    const key = textFor(value);
    if ((counts.get(key) || 0) < 2) return children(value);
    let id = factByValue.get(key);
    if (!id) {
      id = facts.length.toString(36);
      factByValue.set(key, id);
      const fact = { id, value: null };
      facts.push(fact);
      fact.value = children(value);
    }
    return { [FIRE_FACT_REF]: id };
  };
  let formationOptions = options.map(option => {
    if (!option.relationshipComparison) return option;
    const comparison = { ...option.relationshipComparison };
    for (const field of FIRE_ESTIMATES) comparison[field] = encode(comparison[field]);
    return { ...option, relationshipComparison: comparison };
  });
  // A repeated parent is serialized once. Its children therefore may cease to
  // be repeated after encoding: count actual references, not original subtrees.
  // Inlining a sole-use value moves it once and does not change descendant use.
  const references = new Map();
  const countReferences = value => {
    if (!value || typeof value !== "object") return;
    if (Object.keys(value).length === 1 && Object.hasOwn(value, FIRE_FACT_REF)) {
      const id = value[FIRE_FACT_REF];
      references.set(id, (references.get(id) || 0) + 1);
      return;
    }
    for (const child of Object.values(value)) countReferences(child);
  };
  countReferences(formationOptions);
  for (const fact of facts) countReferences(fact.value);
  const byId = new Map(facts.map(fact => [fact.id, fact.value]));
  const inlineSingleUse = value => {
    if (!value || typeof value !== "object") return value;
    if (Object.keys(value).length === 1 && Object.hasOwn(value, FIRE_FACT_REF)) {
      const id = value[FIRE_FACT_REF];
      return (references.get(id) || 0) <= 1 ? inlineSingleUse(byId.get(id)) : value;
    }
    return Array.isArray(value) ? value.map(inlineSingleUse)
      : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, inlineSingleUse(child)]));
  };
  formationOptions = inlineSingleUse(formationOptions);
  const retainedFacts = facts.filter(fact => (references.get(fact.id) || 0) > 1)
    .map(fact => ({ id: fact.id, value: inlineSingleUse(fact.value) }));
  const sharedIncomingFireFacts = {
    encoding: "exact_shared_incoming_fire_facts_v1", referenceField: FIRE_FACT_REF,
    meaning: "Resolve each fireFactRef to the fact with that id in THIS receipt. Reuse is exact; probabilities, casualty model IDs/positions, damage, firepower, Supply and marker consequences remain distinct whenever their values differ. Columns within facts use exact_geometry_columns_v1 or exact_geometry_column_reuse_v2; a reused column restores its source column value in that SAME group and row.",
    facts: retainedFacts, originalFullEstimatesRetainedByHost: true,
  };
  return retainedFacts.length && JSON.stringify({ formationOptions, sharedIncomingFireFacts }).length
    < JSON.stringify({ formationOptions: options }).length
    ? { formationOptions, sharedIncomingFireFacts }
    : { formationOptions: options, sharedIncomingFireFacts: null };
}

export function restoreStarcraftTmgFormationFireFactsForPromptV1(options, table) {
  if (!table) return structuredClone(options);
  if (table.encoding !== "exact_shared_incoming_fire_facts_v1"
    || ![FIRE_FACT_REF, LEGACY_FIRE_FACT_REF].includes(table.referenceField)
    || !Array.isArray(table.facts)) {
    throw new TypeError("Unsupported incoming-fire fact table");
  }
  const facts = new Map(table.facts.map(fact => [fact.id, fact.value]));
  const referenceField = table.referenceField;
  const active = new Set();
  const restore = value => {
    if (!value || typeof value !== "object") return value;
    if (Object.keys(value).length === 1 && Object.hasOwn(value, referenceField)) {
      const id = value[referenceField];
      if (!facts.has(id) || active.has(id)) throw new TypeError("Invalid incoming-fire fact reference");
      active.add(id);
      const restored = restore(facts.get(id));
      active.delete(id);
      return restored;
    }
    return Array.isArray(value) ? value.map(restore)
      : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, restore(child)]));
  };
  return restore(options);
}

// Terrain proof hashes are checked against the full durable receipt by Host,
// not interpreted by the model. Keep every geometry/property leaf and identity;
// the generic exact codec below still retains all fields passed to it.
export function projectStarcraftTmgTerrainFactsForPromptV1(records) {
  if (!Array.isArray(records)) return records;
  return records.map((record) => {
    const footprint = record?.footprint;
    if (!footprint || typeof footprint !== "object"
      || Array.isArray(footprint)
      || !Object.hasOwn(footprint, "footprintHash")) return record;
    const geometry = { ...footprint };
    delete geometry.footprintHash;
    return { ...record, footprint: geometry };
  });
}

// Only the model-facing projection is reduced. The full, individually
// hashed tool receipts stay in the decision journal and semantic verifier.
// Exact duplicate edges in a later, narrower query carry no new position,
// weapon or threat fact; its scoped aggregates and own receipt ID remain.
export function deduplicateStarcraftTmgSpatialPromptReceiptsV1(
  receipts = []) {
  const sourceByEdgeHash = new Map();
  const sourceByTerrainHash = new Map();
  return receipts.map((receipt) => {
    if (receipt?.queryKind !== "space.inspect_relationships"
      || !Array.isArray(receipt.result?.relationships)
      || typeof receipt.queryReceiptHash !== "string") return receipt;
    const relationships = [];
    const relationshipReuseRefs = [];
    for (const edge of receipt.result.relationships) {
      if (!edge?.edgeId) {
        relationships.push(edge);
        continue;
      }
      const edgeHash = hashStarcraftTmgContract(edge);
      const sourceReceiptHash = sourceByEdgeHash.get(edgeHash);
      if (sourceReceiptHash) {
        relationshipReuseRefs.push({ edgeId: edge.edgeId,
          sourceReceiptHash });
      } else {
        sourceByEdgeHash.set(edgeHash, receipt.queryReceiptHash);
        relationships.push(edge);
      }
    }
    const terrain = receipt.result.nodes?.terrain;
    const encodedTerrain = encodeStarcraftTmgGeometryColumnReuseV2(terrain);
    let terrainNodesFromReceiptHash = null;
    if (terrain && (!Array.isArray(terrain) || terrain.length)) {
      const terrainHash = hashStarcraftTmgContract(encodedTerrain);
      terrainNodesFromReceiptHash = sourceByTerrainHash.get(terrainHash) || null;
      if (!terrainNodesFromReceiptHash) sourceByTerrainHash.set(terrainHash,
        receipt.queryReceiptHash);
    }
    if (!relationshipReuseRefs.length && !terrainNodesFromReceiptHash
      && encodedTerrain === terrain) return receipt;
    return { ...receipt, result: { ...receipt.result,
      relationships,
      ...(relationshipReuseRefs.length ? { relationshipReuseRefs } : {}),
      ...(terrain !== undefined ? { nodes: { ...receipt.result.nodes,
        terrain: terrainNodesFromReceiptHash ? [] : encodedTerrain } } : {}),
      ...(terrainNodesFromReceiptHash ? { terrainNodesFromReceiptHash,
        terrainCollectionMeaning: "Use the exact terrain collection in the referenced receipt; only this duplicate copy is omitted." } : {}),
      fullReceiptRetainedByHost: true } };
  });
}
