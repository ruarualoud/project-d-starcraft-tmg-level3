import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { classifyStarcraftTmgCurrentFaqRoomBindingV1 } from
  "../client-domain/official-faq-current-client-contract-v1.mjs";

export const STARCRAFT_TMG_SCORE_FORECAST_VERSION =
  "starcraft_tmg_score_forecast_v1";
export const STARCRAFT_TMG_RULES_QUICK_VIEW_VERSION =
  "starcraft_tmg_rules_quick_view_v1";

const SCORE_ACTION_TYPES = new Set([
  "score_victory_points",
  "resolve_scoring_finalization_rules_procedure",
]);
const COVERAGE = new Set(["exact", "partial", "unknown", "quarantined", "not_loaded"]);

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
  return Array.isArray(value) ? value.map((entry) => text(entry)).filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function safeScore(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function roomBinding(input) {
  const projection = object(input.roomProjection) ? input.roomProjection : {};
  const room = object(projection.room) ? projection.room : {};
  const match = object(projection.matchBinding) ? projection.matchBinding : {};
  const legal = object(input.legalSpace) ? input.legalSpace : null;
  const projectionRuntime = object(match.rulesRuntimeBinding) ? match.rulesRuntimeBinding : null;
  const legalRuntime = object(legal?.rulesRuntimeBinding) ? legal.rulesRuntimeBinding : null;
  const observed = legalRuntime || projectionRuntime || {};
  const classified = classifyStarcraftTmgCurrentFaqRoomBindingV1(observed);
  const mismatches = [];
  if (legal) {
    if (text(legal.roomId) !== text(room.roomId)) mismatches.push("room_id");
    if (text(legal.matchBindingHash) !== text(match.bindingHash)) {
      mismatches.push("match_binding_hash");
    }
    if (legal.stateRevision !== room.stateRevision) mismatches.push("state_revision");
    if (text(legal.stateHash) !== text(room.stateHash)) mismatches.push("state_hash");
  }
  if (projectionRuntime && legalRuntime
    && (projectionRuntime.catalogueHash !== legalRuntime.catalogueHash
      || projectionRuntime.runtimeHash !== legalRuntime.runtimeHash)) {
    mismatches.push("rules_runtime_binding");
  }
  return {
    ...clone(classified),
    status: mismatches.length ? "quarantined" : classified.status,
    executable: mismatches.length ? false : classified.executable,
    mutationAllowed: mismatches.length ? false : classified.mutationAllowed,
    displayAllowed: mismatches.length ? false : classified.displayAllowed,
    replayAllowed: mismatches.length ? false : classified.replayAllowed,
    reasonCode: mismatches.length ? "ROOM_QUERY_BINDING_MISMATCH" : classified.reasonCode,
    mismatches,
  };
}

function queryIdentity(input, binding) {
  const projection = input.roomProjection || {};
  const room = projection.room || {};
  const match = projection.matchBinding || {};
  const legal = input.legalSpace || {};
  return {
    roomId: text(room.roomId) || null,
    matchBindingHash: text(match.bindingHash) || null,
    stateRevision: Number.isSafeInteger(room.stateRevision) ? room.stateRevision : null,
    stateHash: text(room.stateHash) || null,
    legalSpaceHash: text(legal.legalSpaceHash) || null,
    rulesVersion: text(match.rulesVersion) || null,
    binding,
  };
}

function currentScores(state) {
  const players = object(state?.players) ? state.players : {};
  const scores = object(state?.scores) ? state.scores : {};
  return unique([...Object.keys(players), ...Object.keys(scores)]).sort()
    .map((sideKey) => ({ sideKey, score: safeScore(scores[sideKey]
      ?? players[sideKey]?.score) }))
    .filter((entry) => entry.score !== null);
}

function legalEntries(legalSpace) {
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

function ruleAtomIds(action) {
  return unique([...stringRows(action?.ruleAtomIds), ...stringRows(action?.atomIds)]).sort();
}

function actionReference(entry) {
  return {
    entryKind: entry.entryKind,
    entryId: entry.entryId,
    actionKey: entry.actionKey,
    domainId: entry.domainId,
    actionType: text(entry.action.actionType) || null,
    pieceId: text(entry.action.pieceId ?? entry.action.sourcePieceId) || null,
    targetId: text(entry.action.targetId ?? entry.action.targetPieceId) || null,
    abilityName: text(entry.action.abilityName ?? entry.action.abilityId) || null,
    weaponName: text(entry.action.weaponName) || null,
    executorId: text(entry.action.executorId) || null,
    executorVersion: text(entry.action.executorVersion) || null,
    ruleAtomIds: ruleAtomIds(entry.action),
    confirmationClass: entry.confirmationClass,
  };
}

function scoresObject(scoreRows) {
  return Object.fromEntries(scoreRows.map((entry) => [entry.sideKey, entry.score]));
}

function exactResolution(entry, beforeRows) {
  const resolution = entry?.action?.scoringResolution;
  const actionHash = text(entry?.action?.scoringResolutionHash);
  if (!object(resolution) || !object(resolution.breakdowns)
    || !object(resolution.simultaneousBeforeScores)
    || !/^[a-f0-9]{64}$/u.test(actionHash)
    || resolution.scoringResolutionHash !== actionHash) return null;
  const { scoringResolutionHash, ...body } = resolution;
  if (hashStarcraftTmgContract(body) !== scoringResolutionHash) return null;
  const observed = scoresObject(beforeRows);
  const sideKeys = Object.keys(resolution.breakdowns).sort();
  if (!sideKeys.length || sideKeys.some((sideKey) => (
    safeScore(resolution.simultaneousBeforeScores[sideKey]) === null
      || safeScore(resolution.breakdowns[sideKey]?.roundVp) === null
      || observed[sideKey] !== resolution.simultaneousBeforeScores[sideKey]
  ))) return null;
  const deterministicDelta = {};
  const projectedScores = {};
  for (const sideKey of sideKeys) {
    deterministicDelta[sideKey] = resolution.breakdowns[sideKey].roundVp;
    projectedScores[sideKey] = resolution.simultaneousBeforeScores[sideKey]
      + deterministicDelta[sideKey];
  }
  return {
    deterministicDelta,
    projectedScores,
    breakdowns: clone(resolution.breakdowns),
    resolutionHash: scoringResolutionHash,
  };
}

function provisionalMarkerBranch(state, scoreRows) {
  const profile = state?.officialGameplayDataBundle?.missionScoringProfile;
  const affinity = state?.officialMissionSetupBinding?.markerAffinityByNumber;
  const markers = rows(state?.board?.missionMarkers);
  const sideKeys = scoreRows.map((entry) => entry.sideKey);
  if (!object(profile) || !object(affinity) || markers.length !== 5
    || sideKeys.length !== 2
    || safeScore(profile.neutralOrOwnAffinityMarkerVp) === null
    || safeScore(profile.opponentAffinityMarkerVp) === null) return null;
  const controlled = Object.fromEntries(sideKeys.map((sideKey) => [sideKey, []]));
  for (const marker of markers) {
    const number = Number(marker.number);
    const controlSideKey = text(marker.controlSideKey);
    if (!Number.isSafeInteger(number) || number < 1 || number > 5
      || (controlSideKey && !sideKeys.includes(controlSideKey))) return null;
    if (!controlSideKey) continue;
    const affinitySideKey = affinity[number] ?? affinity[String(number)] ?? null;
    if (affinitySideKey !== null && !sideKeys.includes(affinitySideKey)) return null;
    const vp = affinitySideKey === null || affinitySideKey === controlSideKey
      ? profile.neutralOrOwnAffinityMarkerVp : profile.opponentAffinityMarkerVp;
    controlled[controlSideKey].push({
      markerId: text(marker.id) || `mission-marker-${number}`,
      markerNumber: number,
      affinitySideKey,
      vp,
    });
  }
  const before = scoresObject(scoreRows);
  const deterministicDelta = {};
  const projectedScores = {};
  const breakdowns = {};
  for (const sideKey of sideKeys) {
    const markerVp = controlled[sideKey].reduce((sum, marker) => sum + marker.vp, 0);
    deterministicDelta[sideKey] = markerVp;
    projectedScores[sideKey] = before[sideKey] + markerVp;
    breakdowns[sideKey] = {
      markerVp,
      controlledMarkerVp: controlled[sideKey],
      unresolvedSupplyVp: true,
      unresolvedFinalReserveVp: Number(state.round) >= 5,
    };
  }
  return {
    branchId: "visible_marker_control_held_constant",
    classification: "conditional",
    label: "Visible marker control held constant until authoritative scoring",
    deterministicDelta,
    projectedScores,
    breakdowns,
    conditions: [
      "visible_marker_control_does_not_change_before_scoring",
      "no_unprojected_end_of_round_effect_changes_control",
      "supply_and_final_reserve_vp_are_not_included_without_a_legal_scoring_resolution",
    ],
    sourceRuleAtomIds: [],
  };
}

function scenarioObjectives(state) {
  const mission = object(state?.selectedMission) ? state.selectedMission
    : object(state?.mission) ? state.mission : null;
  const profile = state?.officialGameplayDataBundle?.missionScoringProfile;
  return {
    missionId: text(mission?.id ?? mission?.recordKey ?? profile?.recordKey) || null,
    missionName: text(mission?.name) || null,
    gameLengthRounds: Number.isSafeInteger(Number(profile?.gameLengthRounds))
      ? Number(profile.gameLengthRounds) : null,
    neutralOrOwnAffinityMarkerVp: safeScore(profile?.neutralOrOwnAffinityMarkerVp),
    opponentAffinityMarkerVp: safeScore(profile?.opponentAffinityMarkerVp),
    finalTiebreaker: profile?.finalTiebreaker ?? null,
    visibleMissionMarkerCount: rows(state?.board?.missionMarkers).length,
  };
}

export function projectStarcraftTmgScoreForecastV1(input = {}) {
  const projection = object(input.roomProjection) ? input.roomProjection : {};
  const state = object(projection.state) ? projection.state : {};
  const legal = object(input.legalSpace) ? input.legalSpace : null;
  const binding = roomBinding({ ...input, roomProjection: projection, legalSpace: legal });
  const identity = queryIdentity({ ...input, roomProjection: projection,
    legalSpace: legal }, binding);
  const scoreRows = currentScores(state);
  const entries = legalEntries(legal);
  const scoringEntries = entries.filter((entry) => SCORE_ACTION_TYPES.has(
    text(entry.action.actionType)));
  const exactEntry = scoringEntries.find((entry) => object(entry.action.scoringResolution));
  const exact = exactResolution(exactEntry, scoreRows);
  const terminal = state.terminal === true || state.gameOver === true;
  const provisional = terminal ? null : provisionalMarkerBranch(state, scoreRows);
  const currentScoreObject = scoresObject(scoreRows);
  let coverage = "unknown";
  let forecastMode = "unknown";
  let deterministicDelta = Object.fromEntries(scoreRows.map((entry) => [entry.sideKey, 0]));
  let projectedScores = clone(currentScoreObject);
  let breakdowns = null;
  let branches = [];
  let unresolved = [];
  if (binding.status === "quarantined") {
    coverage = "quarantined";
    unresolved = [binding.reasonCode || "ROOM_RULE_BINDING_HASH_MISMATCH"];
  } else if (terminal) {
    coverage = binding.current ? "exact" : "partial";
    forecastMode = "exact";
    branches = [{ branchId: "terminal_snapshot", classification: "exact",
      label: "Match is already terminal; no further round score is projected",
      deterministicDelta: clone(deterministicDelta),
      projectedScores: clone(projectedScores), sourceRuleAtomIds: [] }];
  } else if (exact) {
    coverage = binding.current ? "exact" : "partial";
    forecastMode = "exact";
    deterministicDelta = exact.deterministicDelta;
    projectedScores = exact.projectedScores;
    breakdowns = exact.breakdowns;
    branches = [{ branchId: "current_legal_scoring_resolution", classification: "exact",
      label: "Current LegalSpace contains a hash-valid scoring resolution",
      deterministicDelta: clone(deterministicDelta), projectedScores: clone(projectedScores),
      sourceRuleAtomIds: ruleAtomIds(exactEntry.action),
      resolutionHash: exact.resolutionHash }];
  } else if (exactEntry) {
    coverage = "quarantined";
    unresolved = ["LEGAL_SCORING_RESOLUTION_INTEGRITY_INVALID"];
  } else if (provisional) {
    coverage = "partial";
    forecastMode = "conditional";
    deterministicDelta = provisional.deterministicDelta;
    projectedScores = provisional.projectedScores;
    breakdowns = provisional.breakdowns;
    branches = [provisional];
    unresolved = ["future_actions_before_scoring", "authoritative_scoring_resolution_not_yet_legal",
      "supply_or_final_reserve_vp_not_included"];
  } else {
    unresolved = [legal ? "authoritative_scoring_resolution_not_available"
      : "viewer_has_no_legal_space_capability", "scenario_objective_inputs_incomplete"];
    branches = [{ branchId: "unresolved", classification: "unknown",
      label: "No complete rules-owned scoring projection is available at this revision",
      deterministicDelta: null, projectedScores: null, sourceRuleAtomIds: [] }];
  }
  const scoreEntry = scoringEntries[0] || null;
  const core = {
    schemaVersion: STARCRAFT_TMG_SCORE_FORECAST_VERSION,
    coverage,
    forecastMode,
    ...identity,
    round: Number.isSafeInteger(Number(state.round)) ? Number(state.round) : null,
    phase: text(state.phase) || null,
    currentScores: scoreRows,
    scenarioObjectives: scenarioObjectives(state),
    deterministicDelta,
    projectedScores,
    breakdowns,
    branches,
    unresolved,
    scoreWriteEntry: scoreEntry ? {
      ...actionReference(scoreEntry),
      enabledForProposal: binding.current && scoreEntry.entryKind === "finite",
      proposalRoute: scoreEntry.entryKind === "finite" ? "preview_finite"
        : "edit_parameter_domain_in_actions",
      writeRoute: "legal_space_preview_human_confirm_apply_receipt_replay",
    } : null,
    authority: {
      serverOwnedQuery: true,
      readOnly: true,
      nonMutating: true,
      directScoreEditAllowed: false,
      rollsChance: false,
      advancesPhase: false,
      onlyLegalSpaceScoreEntriesMayReachPreview: true,
    },
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return freeze({ ...core, forecastHash: hashStarcraftTmgContract(core) });
}

function explicitNames(action) {
  return unique([
    text(action.abilityName), text(action.abilityId), text(action.effectKeyword),
    text(action.keyword), ...stringRows(action.keywords),
  ]).map((entry) => entry.toLocaleLowerCase("en-US"));
}

function pieceIdentifiers(piece) {
  return unique([text(piece.id), text(piece.unitId),
    ...rows(piece.models).map((model) => text(model.id))]);
}

function actionPieceIdentifiers(action) {
  return unique([
    text(action.pieceId), text(action.unitId), text(action.sourcePieceId),
    text(action.actingPieceId), text(action.targetId), text(action.targetPieceId),
    text(action.targetUnitId), text(action.targetModelId),
  ]);
}

function rulesDisplayReference(match) {
  const display = object(match?.rulesDisplayBinding) ? match.rulesDisplayBinding : null;
  if (!display || !text(display.artifactId)
    || !/^[a-f0-9]{64}$/u.test(text(display.artifactHash))) return null;
  return {
    artifactId: text(display.artifactId),
    artifactHash: text(display.artifactHash),
    mediaType: text(display.mediaType) || null,
    locale: text(display.locale) || null,
    rulesVersion: text(display.rulesVersion) || text(match.rulesVersion) || null,
    route: "read_historical_rules",
    exactRoomPinnedArtifactRequired: true,
    silentCompatibilityFallbackAllowed: false,
  };
}

export function projectStarcraftTmgRulesQuickViewV1(input = {}) {
  const projection = object(input.roomProjection) ? input.roomProjection : {};
  const state = object(projection.state) ? projection.state : {};
  const match = object(projection.matchBinding) ? projection.matchBinding : {};
  const legal = object(input.legalSpace) ? input.legalSpace : null;
  const binding = roomBinding({ ...input, roomProjection: projection, legalSpace: legal });
  const identity = queryIdentity({ ...input, roomProjection: projection,
    legalSpace: legal }, binding);
  const displayRef = rulesDisplayReference(match);
  const entries = legalEntries(legal);
  const actionRefs = entries.map(actionReference);
  const unitContexts = rows(state.pieces).map((piece) => {
    const ids = pieceIdentifiers(piece);
    const related = entries.filter((entry) => actionPieceIdentifiers(entry.action)
      .some((id) => ids.includes(id)));
    const keywords = unique([
      ...stringRows(piece.keywords), ...stringRows(piece.derivedKeywords),
      ...stringRows(piece.tags), ...rows(piece.abilities).map((ability) => (
        text(ability.name ?? ability.id ?? ability.effect))),
    ]);
    const keywordContexts = keywords.map((name) => {
      const lower = name.toLocaleLowerCase("en-US");
      const explicit = related.filter((entry) => explicitNames(entry.action).includes(lower));
      const refs = explicit.map(actionReference);
      return {
        name,
        coverage: refs.length && refs.every((entry) => entry.ruleAtomIds.length > 0)
          ? "exact" : "unknown",
        actionRefs: refs,
        unresolvedReason: refs.length ? null : "no_explicit_legal_space_lineage_at_revision",
        rulesDisplayRef: clone(displayRef),
      };
    });
    const refs = related.map(actionReference);
    return {
      pieceId: text(piece.id) || null,
      unitId: text(piece.unitId) || null,
      name: text(piece.name ?? piece.unitName) || text(piece.id) || "Unknown unit",
      sideKey: text(piece.sideKey ?? piece.controllerSideKey) || null,
      actionRefs: refs,
      keywords: keywordContexts,
      coverage: refs.some((entry) => entry.ruleAtomIds.length > 0) ? "exact" : "unknown",
      rulesDisplayRef: clone(displayRef),
    };
  });
  const unresolvedKeywords = unitContexts.flatMap((unit) => unit.keywords
    .filter((entry) => entry.coverage === "unknown")
    .map((entry) => ({ pieceId: unit.pieceId, keyword: entry.name,
      reason: entry.unresolvedReason })));
  const coverage = binding.status === "quarantined" ? "quarantined"
    : !displayRef ? "unknown"
      : legal && binding.current && unresolvedKeywords.length === 0 ? "exact" : "partial";
  const core = {
    schemaVersion: STARCRAFT_TMG_RULES_QUICK_VIEW_VERSION,
    coverage,
    coverageReason: binding.status === "quarantined"
      ? binding.reasonCode || "room_rule_binding_is_unknown_or_mixed"
      : !displayRef ? "room_pinned_rules_display_artifact_missing"
        : !legal ? "rules_artifact_is_exact_but_viewer_has_no_legal_space_capability"
          : binding.historical ? "exact_historical_room_rules_retained_read_only"
            : unresolvedKeywords.length
              ? "current_room_rules_exact_but_some_context_has_no_explicit_legal_space_lineage"
              : "exact_current_room_rules_and_legal_space_lineage",
    ...identity,
    rulesIdentity: {
      sourceSnapshotHash: text(match.sourceSnapshotHash) || null,
      dataSnapshotHash: text(match.dataSnapshotHash) || null,
      rulesArtifactHash: text(match.rulesArtifactHash) || null,
      catalogueHash: binding.observedCatalogueHash,
      runtimeHash: binding.observedRuntimeHash,
      rulesDisplayRef: displayRef,
    },
    actionContexts: actionRefs,
    unitContexts,
    unresolvedKeywords,
    authority: {
      serverOwnedQuery: true,
      readOnly: true,
      clientMutationAllowed: false,
      exactRoomPinnedArtifactRequired: true,
      silentCompatibilityFallbackAllowed: false,
      legalSpaceOnlyActionLineage: true,
    },
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return freeze({ ...core, quickViewHash: hashStarcraftTmgContract(core) });
}

function validHashedProjection(value, schemaVersion, hashField, expected = {}) {
  if (!object(value) || value.schemaVersion !== schemaVersion
    || !COVERAGE.has(value.coverage) || !object(value.binding)
    || !object(value.authority) || value.authority.readOnly !== true
    || value.trainingTruth !== false || value.eligibleForTraining !== false
    || !/^[a-f0-9]{64}$/u.test(text(value[hashField]))) return false;
  const core = clone(value);
  delete core[hashField];
  if (hashStarcraftTmgContract(core) !== value[hashField]) return false;
  if (expected.roomId && value.roomId !== expected.roomId) return false;
  if (expected.matchBindingHash && value.matchBindingHash !== expected.matchBindingHash) return false;
  if (Number.isSafeInteger(expected.stateRevision)
    && value.stateRevision !== expected.stateRevision) return false;
  if (expected.stateHash && value.stateHash !== expected.stateHash) return false;
  if (expected.legalSpaceHash && value.legalSpaceHash !== expected.legalSpaceHash) return false;
  return true;
}

export function isStarcraftTmgScoreForecastV1(value, expected = {}) {
  return validHashedProjection(value, STARCRAFT_TMG_SCORE_FORECAST_VERSION,
    "forecastHash", expected)
    && ["exact", "conditional", "unknown"].includes(value.forecastMode)
    && Array.isArray(value.currentScores) && Array.isArray(value.branches)
    && Array.isArray(value.unresolved)
    && value.authority.nonMutating === true
    && value.authority.directScoreEditAllowed === false;
}

export function isStarcraftTmgRulesQuickViewV1(value, expected = {}) {
  return validHashedProjection(value, STARCRAFT_TMG_RULES_QUICK_VIEW_VERSION,
    "quickViewHash", expected)
    && object(value.rulesIdentity) && Array.isArray(value.actionContexts)
    && Array.isArray(value.unitContexts) && Array.isArray(value.unresolvedKeywords)
    && value.authority.silentCompatibilityFallbackAllowed === false;
}
