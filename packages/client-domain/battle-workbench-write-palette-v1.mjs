import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";
import { STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 } from
  "./official-faq-current-client-contract-v1.mjs";

export const STARCRAFT_TMG_WRITE_PALETTE_VERSION =
  "starcraft_tmg_battle_workbench_write_palette_v1";

const CURRENT = STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1;
const FAQ_TOKEN_ATOMS = new Map(CURRENT.tokenMarker.atoms.map((atom) => [atom.atomId, atom]));
const TOKEN_MARKER_VERBS = new Set(["create", "place", "move", "consume", "remove"]);

export const STARCRAFT_TMG_CURRENT_RULE_GRAPH_INDEX_V1 = Object.freeze({
  rulesVersion: CURRENT.rulesVersion,
  sourceLockHash: CURRENT.sourceLockHash,
  reconciliationHash: CURRENT.reconciliationHash,
  aggregateHash: CURRENT.aggregateHash,
  catalogueHash: CURRENT.catalogueHash,
  runtimeHash: CURRENT.runtimeHash,
  graphHash: CURRENT.graphHash,
  tokenMarkerContractHash: CURRENT.tokenMarkerContractHash,
  atomCount: CURRENT.counts.atomCount,
  executableAtomCount: CURRENT.counts.executableAtomCount,
  displayOnlyAtomCount: CURRENT.counts.displayOnlyAtomCount,
  executorCount: CURRENT.counts.executorCount,
  nodeCount: CURRENT.relationshipGraph.compositionNodeCount,
  edgeCount: CURRENT.relationshipGraph.compositionEdgeCount,
  referencedBaseGraphHash: CURRENT.relationshipGraph.referencedBaseGraphHash,
  referencedBaseNodeCount: CURRENT.relationshipGraph.referencedBaseNodeCount,
  referencedBaseEdgeCount: CURRENT.relationshipGraph.referencedBaseEdgeCount,
  directlyNamedTokenMarkerAtomCount: CURRENT.tokenMarker.directlyNamedBaseAtoms,
  genericTokenMarkerPrimitiveAtomCount: CURRENT.tokenMarker.genericBasePrimitives,
  faqTokenMarkerEntryCount: CURRENT.tokenMarker.entries,
  faqTokenMarkerAtomCount: CURRENT.tokenMarker.faqAtoms,
  source: "official_faq_v1_current_rules_aggregate",
  rulesAuthority: false,
  trainingTruth: false,
});

const WRITE_SHEET_FIELDS = Object.freeze([
  "damage", "shield", "casualty", "status", "deployment", "score", "token_marker",
]);
const WRITE_PATTERN_BY_FIELD = Object.freeze({
  damage: /(^|_)(attack|damage|heal|impact|fight|precision)(_|$)/u,
  shield: /(^|_)(shield|shielded)(_|$)/u,
  casualty: /(^|_)(casualty|casualties|destroy|destruction|remove|removal|disengage)(_|$)/u,
  status: /(^|_)(status|buff|debuff|hidden|burrowed|siege|stimpack|locked_in|mode)(_|$)/u,
  deployment: /(^|_)(deploy|deployment|reserve|summon|respawn|morph|roster)(_|$)/u,
  score: /(^|_)(score|scoring|victory_point|mission_marker_control|end_game)(_|$)/u,
  token_marker: /(^|_)(token|marker|indicator)(_|$)/u,
});
const TOKEN_MARKER_ACTION_TYPES = new Map([
  ["materialize_battlefield_token_marker_registry", "create"],
  ["cleanup_battlefield_tokens_and_markers", "remove"],
]);
const TOKEN_MARKER_CONTENT_PATTERN =
  /(^|[_:\s])(token|marker|faction_indicator|activation_marker|mode_marker|status_marker)([_:\s]|$)/u;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function rows(value) {
  return Array.isArray(value) ? value.filter(object) : [];
}

function stringRows(value) {
  return Array.isArray(value)
    ? value.map((entry) => text(entry)).filter(Boolean)
    : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizedSearchText(value) {
  return JSON.stringify(value || {}).toLowerCase().replaceAll(/[^a-z0-9]+/gu, "_");
}

function fieldValue(action, names) {
  for (const name of names) {
    const value = action?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeLegalEntries(legalSpace) {
  const finite = rows(legalSpace?.finiteActions).map((entry) => ({
    entryKind: "finite",
    entryId: text(entry.actionKey),
    actionKey: text(entry.actionKey),
    domainId: null,
    confirmationClass: text(entry.confirmationClass) || null,
    action: object(entry.action) ? clone(entry.action) : {},
  }));
  const domains = rows(legalSpace?.parameterDomains).map((entry) => ({
    entryKind: "parameter_domain",
    entryId: text(entry.domainId),
    actionKey: null,
    domainId: text(entry.domainId),
    confirmationClass: text(entry.confirmationClass) || null,
    action: clone(entry),
  }));
  return [...finite, ...domains].filter((entry) => entry.entryId);
}

function actionTypeFor(entry) {
  return text(entry.action?.actionType);
}

function ruleAtomIdsFor(entry) {
  return unique([
    ...stringRows(entry.action?.ruleAtomIds),
    ...stringRows(entry.action?.atomIds),
  ]).sort();
}

function faqTokenMarkerAtomsFor(entry) {
  return ruleAtomIdsFor(entry).map((atomId) => FAQ_TOKEN_ATOMS.get(atomId)).filter(Boolean);
}

function tokenMarkerCandidate(entry) {
  const actionType = actionTypeFor(entry);
  if (TOKEN_MARKER_ACTION_TYPES.has(actionType)) return true;
  if (object(entry.action?.tokenMarkerAction)) return true;
  if (faqTokenMarkerAtomsFor(entry).length > 0) return true;
  const actionText = normalizedSearchText(entry.action);
  return TOKEN_MARKER_CONTENT_PATTERN.test(actionText);
}

function tokenMarkerVerb(entry) {
  const explicit = text(entry.action?.tokenMarkerAction?.verb
    ?? entry.action?.tokenMarkerVerb);
  if (TOKEN_MARKER_VERBS.has(explicit)) return explicit;
  const actionType = actionTypeFor(entry);
  if (TOKEN_MARKER_ACTION_TYPES.has(actionType)) return TOKEN_MARKER_ACTION_TYPES.get(actionType);
  const value = normalizedSearchText(entry.action);
  if (/(^|_)(consume|spend|exhaust)(_|$)/u.test(value)) return "consume";
  if (/(^|_)(remove|cleanup|expire|destroy)(_|$)/u.test(value)) return "remove";
  if (/(^|_)(move|relocate|displace)(_|$)/u.test(value)) return "move";
  if (/(^|_)(place|set)(_|$)/u.test(value)) return "place";
  if (/(^|_)(create|materialize|spawn|summon|apply|grant)(_|$)/u.test(value)) return "create";
  return null;
}

function knownActionDefaults(entry) {
  const actionType = actionTypeFor(entry);
  if (actionType === "materialize_battlefield_token_marker_registry") {
    return {
      verb: "create",
      type: "rules_owned_registry",
      duration: "registry_lifetime_with_per_object_expiry",
      stackPolicy: "one_registry_per_match",
      unique: true,
      trigger: "pre_game_after_terrain_and_mission_markers",
      cleanupTiming: "per_object_rules_timing",
      legalDomains: { subject: "authoritative_match" },
      geometry: { rulesFootprint: "defined_per_registry_object", visualOnly: false },
    };
  }
  if (actionType === "cleanup_battlefield_tokens_and_markers") {
    return {
      verb: "remove",
      type: "round_cleanup_tokens_and_markers",
      duration: "end_of_current_game_round_unless_retained",
      stackPolicy: "deterministic_registry_cleanup",
      unique: true,
      trigger: "cleanup_phase",
      cleanupTiming: "before_cleanup_refresh",
      legalDomains: { subject: "registry_owned_tokens_and_markers" },
      geometry: { preservesRetainedObjectGeometry: true, visualOnly: false },
    };
  }
  return {};
}

function sourceFor(entry) {
  const action = entry.action;
  return {
    pieceId: fieldValue(action, ["pieceId", "sourcePieceId", "actingPieceId"]),
    unitId: fieldValue(action, ["unitId", "sourceUnitId", "actingUnitId"]),
    cardId: fieldValue(action, ["cardId", "sourceCardId", "resourceCardId"]),
    ability: fieldValue(action, ["abilityName", "abilityId", "sourceAbilityName"]),
    executorId: fieldValue(action, ["executorId"]),
    executorVersion: fieldValue(action, ["executorVersion"]),
    ruleAtomIds: ruleAtomIdsFor(entry),
  };
}

function targetFor(entry) {
  const action = entry.action;
  return {
    subjectId: fieldValue(action, ["pieceId", "unitId", "sourcePieceId", "actingPieceId"]),
    targetId: fieldValue(action, ["targetId", "targetPieceId", "targetUnitId", "targetModelId"]),
    subjectDomain: clone(action.subjectDomain ?? action.sourceDomain ?? null),
    targetDomain: clone(action.targetDomain ?? action.legalTargetDomain ?? null),
  };
}

function geometryFor(entry) {
  const action = entry.action;
  return {
    parameterSchema: clone(action.parameterSchema ?? null),
    constraints: clone(action.constraints ?? null),
    coordinate: clone(action.coordinate ?? action.destination ?? action.position ?? null),
    baseDiameterMm: action.baseDiameterMm ?? action.tokenBaseDiameterMm ?? null,
    rangeInches: action.rangeInches ?? action.range ?? null,
    measurement: fieldValue(action, ["measurement", "measurementMode"]),
  };
}

function classifyTokenMarker(entry) {
  if (!tokenMarkerCandidate(entry)) return null;
  const action = entry.action;
  const explicit = object(action.tokenMarkerAction) ? action.tokenMarkerAction : {};
  const defaults = knownActionDefaults(entry);
  const relatedFaqAtoms = faqTokenMarkerAtomsFor(entry);
  const verb = text(explicit.verb) || defaults.verb || tokenMarkerVerb(entry);
  const type = text(explicit.type) || defaults.type || fieldValue(action, [
    "tokenKind", "markerKind", "markerType", "markerRole", "statusKind", "mode",
  ]) || (actionTypeFor(entry) === "materialize_battlefield_token_marker_registry"
    ? "rules_owned_registry" : null);
  const source = {
    ...sourceFor(entry),
    ...(object(explicit.source) ? clone(explicit.source) : {}),
  };
  const controller = text(explicit.controller) || fieldValue(action,
    ["controllerSideKey", "sideKey", "ownerSideKey"]);
  const duration = text(explicit.duration) || defaults.duration
    || fieldValue(action, ["duration", "expiry", "expiresAt", "cleanupDisposition"]);
  const stackPolicy = text(explicit.stackPolicy) || defaults.stackPolicy
    || fieldValue(action, ["stackPolicy", "stacking", "uniquePolicy"]);
  const trigger = clone(explicit.trigger ?? defaults.trigger
    ?? action.trigger ?? action.triggerWindow ?? null);
  const cleanupTiming = text(explicit.cleanupTiming) || defaults.cleanupTiming
    || fieldValue(action, ["cleanupTiming", "cleanupWindow", "expiry"]);
  const legalDomains = clone(explicit.legalDomains ?? defaults.legalDomains
    ?? targetFor(entry));
  const geometry = clone(explicit.geometry ?? defaults.geometry ?? geometryFor(entry));
  const missing = [
    !TOKEN_MARKER_VERBS.has(verb) ? "verb" : null,
    !type ? "type" : null,
    !Object.values(source).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value))
      ? "source" : null,
    !controller ? "controller" : null,
    !duration ? "duration" : null,
    !stackPolicy ? "stackPolicy" : null,
    trigger === null ? "trigger" : null,
    !cleanupTiming ? "cleanupTiming" : null,
    !object(legalDomains) ? "legalDomains" : null,
    !object(geometry) ? "geometry" : null,
  ].filter(Boolean);
  const coverage = missing.length === 0 ? "exact" : "unsupported";
  return {
    entryId: entry.entryId,
    entryKind: entry.entryKind,
    actionKey: entry.actionKey,
    domainId: entry.domainId,
    actionType: actionTypeFor(entry),
    verb,
    type,
    label: fieldValue(action, ["label", "name", "abilityName"])
      || `${verb || "unclassified"} ${type || "token_or_marker"}`,
    source,
    legalDomains,
    geometry,
    controller,
    duration,
    stackPolicy,
    unique: typeof explicit.unique === "boolean" ? explicit.unique
      : typeof defaults.unique === "boolean" ? defaults.unique
        : typeof action.unique === "boolean" ? action.unique : null,
    trigger,
    cleanupTiming,
    faqRuleRefs: relatedFaqAtoms.map((atom) => ({ atomId: atom.atomId,
      entryId: atom.entryId, primitive: atom.primitive })),
    confirmationClass: entry.confirmationClass,
    coverage,
    missingFields: missing,
    enabledForProposal: coverage === "exact",
    proposalRoute: entry.entryKind === "finite" ? "preview_finite" : "edit_parameter_domain_in_actions",
  };
}

function writeFamiliesFor(entry) {
  const actionType = actionTypeFor(entry);
  const value = `${normalizedSearchText(entry.action)}_${actionType}`;
  const families = WRITE_SHEET_FIELDS.filter((field) => WRITE_PATTERN_BY_FIELD[field].test(value));
  const tokenEntry = classifyTokenMarker(entry);
  if (tokenEntry && !families.includes("token_marker")) families.push("token_marker");
  return unique(families);
}

function writeSheetProjection(entries) {
  const byField = Object.fromEntries(WRITE_SHEET_FIELDS.map((field) => [field, []]));
  for (const entry of entries) {
    for (const field of writeFamiliesFor(entry)) byField[field].push(entry.entryId);
  }
  const fields = Object.fromEntries(WRITE_SHEET_FIELDS.map((field) => [field, {
    field,
    currentLegalActionCount: byField[field].length,
    currentLegalEntryIds: byField[field],
    writeMode: "rules_action_effect_only",
    directNumericEditAllowed: false,
    route: "legal_space_preview_human_confirm_apply_receipt_replay",
    emptyReason: byField[field].length === 0 ? "no_current_legal_action_for_frozen_revision" : null,
  }]));
  return {
    schemaVersion: "starcraft_tmg_authoritative_battle_write_sheet_v1",
    fields,
    fieldCount: WRITE_SHEET_FIELDS.length,
    currentLegalWriteEntryCount: new Set(Object.values(byField).flat()).size,
    directClientMutationAllowed: false,
    manualCorrectionAuthority: "not_implemented_arbitrary_number_overwrite",
    sharedWithBattleActions: true,
    route: "legal_space_preview_human_confirm_apply_receipt_replay",
    trainingTruth: false,
  };
}

function bindingMatches(observed, expected) {
  return observed.catalogueHash === expected.catalogueHash
    && observed.runtimeHash === expected.runtimeHash
    && observed.executableRuleAtomCount === expected.executableRuleAtomCount
    && observed.nonExecutableRuleAtomCount === expected.nonExecutableRuleAtomCount
    && observed.legacyCompatibilityUsed === false;
}

function graphBinding(legalSpace) {
  const binding = object(legalSpace?.rulesRuntimeBinding) ? legalSpace.rulesRuntimeBinding : {};
  const current = bindingMatches(binding, CURRENT.roomBindings.current);
  const historical = bindingMatches(binding, CURRENT.roomBindings.historicalPreFaq);
  const status = current ? "current_faq_v1"
    : historical ? "historical_pre_faq" : "quarantined";
  return {
    status,
    executable: current,
    historical,
    mutationAllowed: current,
    observedCatalogueHash: text(binding.catalogueHash) || null,
    observedRuntimeHash: text(binding.runtimeHash) || null,
    observedExecutableRuleAtomCount: Number.isSafeInteger(binding.executableRuleAtomCount)
      ? binding.executableRuleAtomCount : null,
    legalSpaceComplete: binding.legalSpaceComplete === true,
    legacyCompatibilityUsed: binding.legacyCompatibilityUsed === true,
    actionsRemainBoundToObservedLegalSpace: current,
    reasonCode: current || historical ? null : "ROOM_RULE_BINDING_HASH_MISMATCH",
  };
}

function lifecycleRows() {
  return [
    ["create", "materialize or grant a rules-owned Token/Marker"],
    ["place", "place a rules-owned Token/Marker using its projected geometry domain"],
    ["move", "move or relocate an existing rules-owned Token"],
    ["consume", "spend, exhaust or consume a rules-owned Token/Marker"],
    ["remove", "expire, clean up or remove a rules-owned Token/Marker"],
  ].map(([verb, description]) => ({
    verb,
    description,
    availability: "current_legal_space_only",
  }));
}

export function isDirectlyNamedTokenMarkerRuleAtomV1(atom) {
  if (!object(atom) || atom.disposition !== "executable") return false;
  return /\b(token|tokens|marker|markers)\b/iu.test(`${text(atom.atomId)} ${text(atom.title)}`);
}

export function classifyStarcraftTmgWriteSheetEntryV1(entry) {
  if (!object(entry)) return freeze({ writeFamilies: [], tokenMarker: null });
  const normalized = entry.entryKind ? clone(entry) : {
    entryKind: object(entry.action) ? "finite" : "parameter_domain",
    entryId: text(entry.actionKey ?? entry.domainId),
    actionKey: text(entry.actionKey) || null,
    domainId: text(entry.domainId) || null,
    confirmationClass: text(entry.confirmationClass) || null,
    action: object(entry.action) ? clone(entry.action) : clone(entry),
  };
  return freeze({
    writeFamilies: writeFamiliesFor(normalized),
    tokenMarker: classifyTokenMarker(normalized),
  });
}

export function projectStarcraftTmgWritePaletteV1(input = {}) {
  const legalSpace = object(input.legalSpace) ? input.legalSpace : null;
  const entries = normalizeLegalEntries(legalSpace);
  const candidates = entries.map(classifyTokenMarker).filter(Boolean);
  const classified = candidates.filter((entry) => entry.coverage === "exact");
  const unsupported = candidates.filter((entry) => entry.coverage === "unsupported");
  const binding = graphBinding(legalSpace);
  const actions = classified.map((entry) => ({ ...entry,
    enabledForProposal: binding.executable && entry.enabledForProposal,
    bindingStatus: binding.status,
  }));
  const coverage = !legalSpace ? "not_loaded"
    : binding.status === "quarantined" ? "quarantined"
      : unsupported.length > 0 || binding.historical ? "partial" : "exact";
  const core = {
    schemaVersion: STARCRAFT_TMG_WRITE_PALETTE_VERSION,
    coverage,
    coverageReason: !legalSpace ? "viewer_has_no_legal_space_capability"
      : binding.status === "quarantined" ? "room_rule_binding_is_unknown_or_mixes_frozen_versions"
        : binding.historical ? "historical_pre_faq_room_uses_its_frozen_rules_and_current_faq_is_display_only"
        : unsupported.length > 0 ? "token_or_marker_candidates_require_additional_rules_metadata"
          : "complete_current_legal_space_classification",
    roomId: text(legalSpace?.roomId) || null,
    matchBindingHash: text(legalSpace?.matchBindingHash) || null,
    stateRevision: Number.isSafeInteger(legalSpace?.stateRevision) ? legalSpace.stateRevision : null,
    stateHash: text(legalSpace?.stateHash) || null,
    legalSpaceHash: text(legalSpace?.legalSpaceHash) || null,
    ruleGraphIndex: {
      ...STARCRAFT_TMG_CURRENT_RULE_GRAPH_INDEX_V1,
      binding,
      denominatorMeaning: "complete_ticket_11_rule_graph_not_current_clickable_actions",
      tokenMarkerMeaning:
        "base_named_atoms_generic_primitives_and_faq_impacts_are_overlapping_rule_denominators_not_clickable_action_counts",
      faqTokenMarkerEntryIds: [...CURRENT.tokenMarker.entryIds],
      faqTokenMarkerAtomIds: [...CURRENT.tokenMarker.atomIds],
      faqTokenMarkerAtoms: clone(CURRENT.tokenMarker.atoms),
    },
    lifecycle: lifecycleRows(),
    actions,
    unsupported,
    currentLegalSpace: {
      totalEntryCount: entries.length,
      tokenMarkerCandidateCount: candidates.length,
      classifiedCount: classified.length,
      enabledForProposalCount: actions.filter((entry) => entry.enabledForProposal).length,
      unclassifiedCount: unsupported.length,
      unsupportedCount: unsupported.length,
      nonTokenMarkerEntryCount: entries.length - candidates.length,
      denominatorMeaning: "finite_actions_plus_parameter_domains_for_this_viewer_and_revision",
    },
    writeSheet: {
      ...writeSheetProjection(entries),
      coverage,
      bindingStatus: binding.status,
    },
    authority: {
      readOnlyProjection: true,
      directClientMutationAllowed: false,
      onlyObservedFrozenLegalSpaceEntriesMayReachPreview: true,
      currentFaqBindingRequiredForCurrentRulesLabel: true,
      parameterizedEntriesRequireActionsEditor: true,
    },
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return freeze({ ...core, paletteHash: hashStarcraftTmgClientContract(core) });
}

export function isStarcraftTmgWritePaletteV1(value, expected = {}) {
  if (!object(value) || value.schemaVersion !== STARCRAFT_TMG_WRITE_PALETTE_VERSION
    || !["exact", "partial", "quarantined", "not_loaded"].includes(value.coverage)
    || !object(value.currentLegalSpace) || !Array.isArray(value.actions)
    || !Array.isArray(value.unsupported) || !object(value.writeSheet)
    || !object(value.authority) || value.authority.directClientMutationAllowed !== false
    || value.trainingTruth !== false || value.eligibleForTraining !== false
    || typeof value.paletteHash !== "string" || !/^[a-f0-9]{64}$/u.test(value.paletteHash)) return false;
  const { paletteHash, ...core } = value;
  if (hashStarcraftTmgClientContract(core) !== paletteHash) return false;
  if (expected.roomId && value.roomId !== expected.roomId) return false;
  if (expected.legalSpaceHash && value.legalSpaceHash !== expected.legalSpaceHash) return false;
  return WRITE_SHEET_FIELDS.every((field) => object(value.writeSheet.fields?.[field]));
}
