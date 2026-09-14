import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_ABILITY_EFFECT_IR_SCHEMA =
  "starcraft_tmg_official_ability_effect_ir_catalogue_v1";
export const OFFICIAL_ABILITY_EFFECT_IR_VERSION = "1.0.0";

export const OFFICIAL_ABILITY_ACTIVATION_KINDS = Object.freeze([
  "active", "passive", "reaction", "weapon",
]);
export const OFFICIAL_ABILITY_RUNTIME_ROLES = Object.freeze([
  "action", "automatic_consumer", "reaction", "system_lifecycle",
]);
export const OFFICIAL_ABILITY_EFFECT_FAMILIES = Object.freeze([
  "battlefield_asset",
  "characteristic_status",
  "match_lifecycle",
  "melee_combat",
  "ranged_combat",
  "reaction_priority",
  "relocation",
  "unit_lifecycle",
]);

const COLLECTIONS = Object.freeze(["army_units", "tactical_cards"]);
const ACTIVATION_KINDS = new Set(OFFICIAL_ABILITY_ACTIVATION_KINDS);
const RUNTIME_ROLES = new Set(OFFICIAL_ABILITY_RUNTIME_ROLES);
const EFFECT_FAMILIES = new Set(OFFICIAL_ABILITY_EFFECT_FAMILIES);
const SYSTEM_TRIGGER = /\b(?:at the (?:start|end)|during (?:army building|deployment|setup)|when (?:this|a|an|the) (?:unit|model|round|phase|card)|after (?:this|a|an|the)|before (?:this|a|an|the)|once per (?:round|game))\b/iu;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function phaseKind(value, description = "") {
  const source = `${value || ""} ${description || ""}`.toLowerCase();
  if (source.includes("movement")) return "movement";
  if (source.includes("assault")) return "assault";
  if (source.includes("combat")) return "combat";
  if (source.includes("cleanup")) return "cleanup";
  return "any";
}
function activationKind(feature) {
  const description = String(feature?.description || "").trim();
  const source = `${feature?.activation || ""} ${description}`;
  if (/^range\s*:/iu.test(description)) return "weapon";
  if (/<\s*reaction\s*>/iu.test(source)) return "reaction";
  if (/<\s*active\s*>/iu.test(source)) return "active";
  if (/<\s*passive\s*>/iu.test(source)) return "passive";
  fail("ABILITY_EFFECT_IR_ACTIVATION_UNCLASSIFIED", String(feature?.name || ""));
}
function timingHooks(feature, kind) {
  const source = `${feature?.activation || ""} ${feature?.description || ""}`;
  const hooks = [];
  const patterns = [
    ["army_building", /during army building/iu],
    ["setup", /\b(?:setup|deployment)\b/iu],
    ["round_start", /(?:at the )?start of (?:the |each )?round/iu],
    ["round_end", /(?:at the )?end of (?:the |each )?round/iu],
    ["phase_start", /(?:at the )?start of (?:the |this )?phase/iu],
    ["phase_end", /(?:at the )?end of (?:the |this )?phase/iu],
    ["activation_start", /(?:when|after|before).{0,28}\bactivat(?:e|es|ed|ing|ion)\b/iu],
    ["attack_declared", /(?:when|after|before).{0,28}\battack(?:s|ed|ing)?\b/iu],
    ["hit_resolved", /(?:when|after|before).{0,28}\b(?:hit|miss)(?:s|es|ed|ing)?\b/iu],
    ["damage_resolved", /(?:when|after|before).{0,28}\b(?:damage|wound|destroy)(?:s|ed|ing)?\b/iu],
  ];
  for (const [hook, pattern] of patterns) if (pattern.test(source)) hooks.push(hook);
  if (kind === "active" && hooks.length === 0) hooks.push("declared_action");
  if (kind === "weapon") hooks.push("declared_attack");
  if (kind === "reaction" && hooks.length === 0) hooks.push("typed_reaction_window");
  if (kind === "passive" && hooks.length === 0) hooks.push("continuous_projection");
  return [...new Set(hooks)].sort();
}
function runtimeRole(feature, kind, hooks) {
  if (kind === "active" || kind === "weapon") return "action";
  if (kind === "reaction") return "reaction";
  const source = `${feature?.activation || ""} ${feature?.description || ""}`;
  return hooks.some((hook) => [
    "army_building", "setup", "round_start", "round_end", "phase_start", "phase_end",
  ].includes(hook)) || SYSTEM_TRIGGER.test(source)
    ? "system_lifecycle" : "automatic_consumer";
}
function effectFamilies(feature, kind, phase) {
  const source = `${feature?.name || ""} ${feature?.activation || ""} ${
    feature?.description || ""}`;
  const families = new Set();
  if (kind === "weapon") families.add(phase === "combat"
    ? "melee_combat" : "ranged_combat");
  if (kind === "reaction") families.add("reaction_priority");
  if (/\b(?:move|advance|place|set|deploy|reserve|displacement|teleport|leap|jump|push|pull)\b/iu.test(source)) {
    families.add("relocation");
  }
  if (/\b(?:buff|debuff|status|heal|damage|armou?r|evade|shield|speed|hit|roa|precision|anti-evade|stun|slow)\b/iu.test(source)) {
    families.add("characteristic_status");
  }
  if (/\b(?:ranged|range|shoot|shot|fire|projectile|missile|cannon|rifle)\b/iu.test(source)) {
    families.add("ranged_combat");
  }
  if (/\b(?:melee|fight|charge|impact|engaged|close ranks)\b/iu.test(source)) {
    families.add("melee_combat");
  }
  if (/\b(?:token|marker|structure|creep|pylon|worm|shade)\b/iu.test(source)) {
    families.add("battlefield_asset");
  }
  if (/\b(?:summon|respawn|morph|replace|return|create|destroyed|removed from play)\b/iu.test(source)) {
    families.add("unit_lifecycle");
  }
  if (/\b(?:round|phase|initiative|pass|victory point|supply|army building|deployment|setup)\b/iu.test(source)) {
    families.add("match_lifecycle");
  }
  if (families.size === 0) families.add("characteristic_status");
  return [...families].sort();
}
function operationRequirements(feature, kind, role, hooks, families) {
  const source = `${feature?.name || ""} ${feature?.activation || ""} ${
    feature?.description || ""}`;
  return freezeDeep({
    declaration: kind === "weapon" ? "attack_action"
      : kind === "active" ? "active_ability_action"
        : kind === "reaction" ? "reaction_choice" : "automatic",
    targetSelectionRequired: /\b(?:target|friendly|enemy|model|unit|point|within)\b/iu
      .test(source),
    resourcePaymentRequired: /\b(?:cp|biomass|psionic energy|resource|exhaust)\b/iu
      .test(source),
    diceResolutionRequired: /\b(?:d3|d6|roll|surge|hit|damage)\b/iu.test(source),
    spatialResolutionRequired: families.some((family) => [
      "battlefield_asset", "melee_combat", "ranged_combat", "relocation",
    ].includes(family)),
    priorityWindowRequired: role === "reaction",
    lifecycleHooks: [...hooks],
    exactParametersAuthority: "bound_runtime_adapter_only",
  });
}
function sourceDefinitions(record) {
  if (record.collectionId === "army_units") return record.payload?.upgrades || [];
  if (record.collectionId === "tactical_cards") return record.payload?.boosts || [];
  return [];
}
function bindingMap(bindings) {
  const map = new Map();
  for (const binding of bindings || []) {
    const sourceFeatureHash = String(binding?.sourceFeatureHash || "");
    if (!sourceFeatureHash || map.has(sourceFeatureHash)) {
      fail("ABILITY_EFFECT_IR_EXECUTION_BINDING_INVALID", sourceFeatureHash);
    }
    map.set(sourceFeatureHash, freezeDeep({
      status: "executable_exact",
      adapterId: String(binding.adapterId || ""),
      adapterVersion: String(binding.adapterVersion || ""),
      capability: String(binding.capability || ""),
    }));
  }
  return map;
}
function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const values = Array.isArray(row[key]) ? row[key] : [row[key]];
    for (const value of values) counts[value] = Number(counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => (
    left.localeCompare(right))));
}

export function createOfficialAbilityEffectIrCatalogueV1(input = {}) {
  const { dataset } = input;
  if (!object(dataset) || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) {
    fail("ABILITY_EFFECT_IR_DATASET_REQUIRED");
  }
  const executions = bindingMap(input.executionBindings);
  const definitions = [];
  const sourceRecordCounts = {};
  for (const collectionId of COLLECTIONS) {
    const indexes = dataset.recordIndex.filter((entry) => (
      entry.collectionId === collectionId));
    sourceRecordCounts[collectionId] = indexes.length;
    for (const indexEntry of indexes) {
      const record = dataset.recordsByKey[indexEntry.recordKey];
      if (!object(record) || record.collectionId !== collectionId) {
        fail("ABILITY_EFFECT_IR_SOURCE_RECORD_MISSING", indexEntry.recordKey);
      }
      for (const [sourceIndex, feature] of sourceDefinitions(record).entries()) {
        const sourceFeatureHash = hashStarcraftTmgContract({
          recordKey: record.recordKey,
          sourceRecordHash: record.sourceRecordHash,
          payloadHash: record.payloadHash,
          index: sourceIndex,
          feature,
        });
        const kind = activationKind(feature);
        const phase = phaseKind(feature.phase, feature.description);
        const hooks = timingHooks(feature, kind);
        const role = runtimeRole(feature, kind, hooks);
        const families = effectFamilies(feature, kind, phase);
        const execution = executions.get(sourceFeatureHash) || freezeDeep({
          status: "pending_family_adapter",
          adapterId: "official-ability-pending-family-adapter-v1",
          adapterVersion: "1.0.0",
          capability: "typed_non_executable_diagnostic",
        });
        const body = {
          schema: "starcraft_tmg_official_ability_effect_definition_ir_v1",
          semanticVersion: OFFICIAL_ABILITY_EFFECT_IR_VERSION,
          definitionId: `ability:${sourceFeatureHash.slice(0, 24)}`,
          sourceKind: collectionId === "army_units" ? "unit_feature" : "card_feature",
          collectionId,
          recordKey: record.recordKey,
          sourceIndex,
          sourceName: String(record.payload?.name || ""),
          faction: String(record.payload?.faction || ""),
          definitionName: String(feature?.name || "").trim(),
          activationKind: kind,
          runtimeRole: role,
          phase,
          timingHooks: hooks,
          effectFamilies: families,
          operationRequirements: operationRequirements(
            feature, kind, role, hooks, families),
          costByComposition: collectionId === "army_units"
            ? { small: Number(feature?.costS || 0), large: Number(feature?.costL || 0) }
            : null,
          activationText: String(feature?.activation || ""),
          sourceText: String(feature?.description || ""),
          sourceRecordHash: record.sourceRecordHash,
          payloadHash: record.payloadHash,
          sourceFeatureHash,
          execution,
          rulesTruth: "official_source_definition_compiled_to_typed_role",
          trainingTruth: false,
        };
        definitions.push(seal(body, "definitionHash"));
      }
    }
  }
  definitions.sort((left, right) => left.definitionId.localeCompare(right.definitionId));
  const exact = definitions.filter((entry) => (
    entry.execution.status === "executable_exact")).length;
  const denominator = freezeDeep({
    sourceRecordCounts,
    totalDefinitions: definitions.length,
    executableExact: exact,
    pendingFamilyAdapter: definitions.length - exact,
    byActivationKind: countBy(definitions, "activationKind"),
    byRuntimeRole: countBy(definitions, "runtimeRole"),
    byEffectFamily: countBy(definitions, "effectFamilies"),
  });
  const relationshipEdges = definitions.flatMap((definition) => [
    { from: definition.definitionId, relation: "defined_by",
      to: `record:${definition.recordKey}` },
    { from: definition.definitionId, relation: "routes_as",
      to: `runtime-role:${definition.runtimeRole}` },
    { from: definition.definitionId, relation: "available_in",
      to: `phase:${definition.phase}` },
    { from: definition.definitionId, relation: "bound_to",
      to: `adapter:${definition.execution.adapterId}` },
    ...definition.timingHooks.map((hook) => ({
      from: definition.definitionId, relation: "observes",
      to: `timing-hook:${hook}`,
    })),
    ...definition.effectFamilies.map((family) => ({
      from: definition.definitionId, relation: "requires_family",
      to: `effect-family:${family}`,
    })),
  ]).map((edge) => freezeDeep({
    ...edge,
    edgeId: hashStarcraftTmgContract(edge).slice(0, 24),
  })).sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  const relationshipGraph = freezeDeep({
    schema: "starcraft_tmg_official_ability_relationship_graph_v1",
    definitionNodeCount: definitions.length,
    edgeCount: relationshipEdges.length,
    edges: relationshipEdges,
    automaticallyUpdatedByCompiler: true,
    trainingTruth: false,
  });
  const body = {
    schema: OFFICIAL_ABILITY_EFFECT_IR_SCHEMA,
    semanticVersion: OFFICIAL_ABILITY_EFFECT_IR_VERSION,
    sourceSnapshotHash: dataset.sourceSnapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: { ...dataset.dataVersions },
    definitions,
    denominator,
    relationshipGraph,
    compatibilityAuthority: "semantic_versions_and_explicit_adapters",
    contentHashesAreLineageNotRuntimeCompatibilityGates: true,
    arbitraryProseExecutionClaimed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_ability_effect_ir_catalogue",
    trainingTruth: false,
  };
  const catalogue = seal(body, "catalogueHash");
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  return catalogue;
}

export function verifyOfficialAbilityEffectIrCatalogueV1(catalogue) {
  const definitions = catalogue?.definitions;
  const denominator = catalogue?.denominator;
  const graph = catalogue?.relationshipGraph;
  if (!object(catalogue) || catalogue.schema !== OFFICIAL_ABILITY_EFFECT_IR_SCHEMA
    || catalogue.semanticVersion !== OFFICIAL_ABILITY_EFFECT_IR_VERSION
    || !Array.isArray(definitions) || definitions.length === 0
    || !object(denominator) || denominator.totalDefinitions !== definitions.length
    || denominator.executableExact + denominator.pendingFamilyAdapter
      !== definitions.length
    || new Set(definitions.map((entry) => entry.definitionId)).size !== definitions.length
    || !object(graph) || graph.definitionNodeCount !== definitions.length
    || graph.edgeCount !== graph.edges?.length
    || graph.automaticallyUpdatedByCompiler !== true
    || new Set(graph.edges?.map((entry) => entry.edgeId)).size !== graph.edgeCount
    || graph.edges?.some((edge) => !definitions.some((definition) => (
      definition.definitionId === edge.from)))
    || definitions.some((entry) => entry.schema
      !== "starcraft_tmg_official_ability_effect_definition_ir_v1"
      || !ACTIVATION_KINDS.has(entry.activationKind)
      || !RUNTIME_ROLES.has(entry.runtimeRole)
      || !Array.isArray(entry.timingHooks) || entry.timingHooks.length === 0
      || !Array.isArray(entry.effectFamilies) || entry.effectFamilies.length === 0
      || !object(entry.operationRequirements)
      || entry.operationRequirements.exactParametersAuthority
        !== "bound_runtime_adapter_only"
      || entry.effectFamilies.some((family) => !EFFECT_FAMILIES.has(family))
      || !["executable_exact", "pending_family_adapter"].includes(
        entry.execution?.status)
      || entry.definitionHash !== hashStarcraftTmgContract(without(entry,
        ["definitionHash"])) || entry.trainingTruth !== false)
    || catalogue.contentHashesAreLineageNotRuntimeCompatibilityGates !== true
    || catalogue.arbitraryProseExecutionClaimed !== false
    || catalogue.sourceRefreshPerformed !== false || catalogue.trainingTruth !== false
    || catalogue.catalogueHash !== hashStarcraftTmgContract(without(catalogue,
      ["catalogueHash"]))) {
    fail("ABILITY_EFFECT_IR_CATALOGUE_INVALID");
  }
  return true;
}

export function listOfficialAbilityEffectDefinitionsV1(catalogue, filter = {}) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  return catalogue.definitions.filter((entry) => (
    (!filter.recordKey || entry.recordKey === filter.recordKey)
    && (!filter.runtimeRole || entry.runtimeRole === filter.runtimeRole)
    && (!filter.activationKind || entry.activationKind === filter.activationKind)
    && (!filter.executionStatus || entry.execution.status === filter.executionStatus)
    && (!filter.effectFamily || entry.effectFamilies.includes(filter.effectFamily))
  ));
}
