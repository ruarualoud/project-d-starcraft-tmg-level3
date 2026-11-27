import {ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1} from './army-builder-query-port-v1.mjs';
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCompetitiveMapRoomFreezeV1 } from
  "../product-composition/official-competitive-map-two-layer-compiler-v1.mjs";
import { OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_SCHEMA,
  verifyOfficialCompetitiveMapSemanticRoomFreezeV1 } from
  "../product-composition/official-competitive-map-semantic-room-freeze-v1.mjs";

export const PREGAME_MAP_EVIDENCE_PORT_V1 =
  "starcraft_tmg_pregame_map_evidence_port_v1";
export const PREGAME_TARGET_REACHABILITY_INTERPRETATION_V1 =
  "grid_witness_not_negative_route_proof_v1";

// One source-owned catalogue for new workflow callers. The frozen map is
// already bound; a model never supplies a made-up mapRef or objectiveRef.
export const PREGAME_MAP_WORKFLOW_CONTRACTS_V1=Object.freeze({
  map_summary:{method:'summarizeMap',fields:[],required:[],
    investigationProof:{observation:'map_geometry',proofRequirement:'source_fact',roundKinds:['not_applicable','current_state']},
    purpose:'Read actual terrain, access points, missionMarkers and baseProfileIds of the bound map. Returns mapBinding, not mapRef. layoutMaterialization distinguishes frozen Native geometry from an unverified layout; terrain cells retain group IDs and placement semantics, and are not separate physical terrain pieces.'},
  map_deployment:{method:'deploymentGeometry',fields:[],required:[],
    investigationProof:{observation:'map_geometry',proofRequirement:'source_fact',roundKinds:['not_applicable','current_state']},
    purpose:'Read the exact frozen materialized deployment binding: player/colour assignment, coordinate axes, entry-edge segments and Zone of Influence rectangles. This returns deploymentGeometry, not a baseId: baseId is a physical model footprint, NOT a deployment zone. These already-executable source fields do not require OCR of the card image. No per-unit deployment/movement/route legality is inferred.'},
  map_route:{method:'routeToObjective',fields:['sideId','seatKey','baseId','targetId','unitId'],required:['targetId'],
    investigationProof:{observation:'route_feasibility',proofRequirement:'conditional_witness',roundKinds:['not_applicable','current_state']},
    alternatives:[['unitId','targetId'],['sideId','baseId','targetId'],['seatKey','baseId','targetId']],
    parameterSemantics:{baseId:'Official physical model footprint profile from mapQueries.selectors.baseIds, NOT a deployment zone or starting location. Do not obtain it from map_deployment.',
      unitId:'Exact mapQueries.selectors.unitBindings unitId; resolves that unit\'s side and official footprint without choosing a different base.',
      sideId:'Player whose frozen deployment entry is used. seatKey is an alias; supplied aliases must agree.',
      targetId:'Exact mission/task target from mapQueries.selectors.targetIds. The result is a footprint-clearance route witness, not a unit arrival time or control proof.'},
    purpose:'One exact official base/side/target route witness, or one unitId plus targetId. Not full unit arrival, deployment or earliest-round proof.'},
  map_access:{method:'compareObjectiveAccess',fields:['baseId','targetId'],required:['baseId','targetId'],
    investigationProof:{observation:'route_feasibility',proofRequirement:'conditional_witness',roundKinds:['not_applicable','current_state']},
    purpose:'Compare BOTH sides for ONE exact baseId and targetId; no mapRef and no score-timing inference.'},
  roster_route:{method:'evaluateRosterRoute',fields:['sideId','candidateInput'],required:['sideId','candidateInput'],
    investigationProof:{observation:'route_feasibility',proofRequirement:'conditional_witness',roundKinds:['not_applicable','current_state']},
    purpose:'Audit routes for a supplied complete Builder candidate whose sideKey equals sideId. NOT an opponent-roster lookup; inspect exposes frozen source subjects.'},
});

// Machine fields are derived from the SAME catalogue used by argument validation.
export function describePregameMapParameterSchemaV1(operation){
 const contract=PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation];
 if(!contract)throw new TypeError('PREGAME_MAP_OPERATION_UNKNOWN');
 return {type:'object',additionalProperties:false,required:[...contract.required],
  properties:Object.fromEntries(contract.fields.map(field=>[field,field==='candidateInput'
   ?structuredClone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1)
   :['sideId','seatKey'].includes(field)?{type:'string',enum:['player1','player2']}:{type:'string',minLength:1}])),
  ...(contract.alternatives?{anyOf:contract.alternatives.map(required=>({required}))}:{}),
  description:contract.purpose};
}

// One argument-presence contract at compilation AND after dependency binding.
// A declared dependency supplies a parameter; it is not proof that its source
// pointer exists or that the selected physical route is reachable.
export function inspectPregameMapWorkflowArgumentsV1(operation,args,{boundArguments=[]}={}){
  const contract=PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation];if(!contract)return null;
  const has=key=>Object.hasOwn(args,key)||boundArguments.includes(key);
  const unknownFields=Object.keys(args).filter(key=>key!=='contextRef'&&!contract.fields.includes(key));
  const missingFields=contract.required.filter(key=>!has(key));
  const missingAlternative=Boolean(contract.alternatives&&!contract.alternatives.some(keys=>keys.every(has)));
  return unknownFields.length||missingFields.length||missingAlternative
    ?{unknownFields,missingFields,alternatives:contract.alternatives??null,contract}:null;
}

// Shared wire boundary for the strategist and direct map-query callers.
export function projectPregameMapRouteRequestV1(raw = {}) {
  const sideId = String(raw.sideId ?? "").trim();
  const seatKey = String(raw.seatKey ?? "").trim();
  if (sideId && seatKey && sideId !== seatKey) {
    throw new Error("PREGAME_MAP_ROUTE_SIDE_IDENTITY_CONFLICT");
  }
  if ([sideId, seatKey].some(value => value && !/^player[12]$/u.test(value))) {
    throw new Error("PREGAME_MAP_ROUTE_SIDE_IDENTITY_INVALID");
  }
  return Object.fromEntries(["sideId", "baseId", "targetId", "unitId"]
    .map(key => [key, key === "sideId" ? sideId || seatKey : raw[key]])
    .map(([key, value]) => [key, String(value ?? "").trim()])
    .filter(([, value]) => value));
}

// One frozen source identity for roster audits, current-unit queries and tool
// discovery. Never infer a base from a unit name or rounded inch measurements.
export function projectPregameOfficialBaseIdentityV1(sourceState, recordKey) {
  const geometry = sourceState.officialModelBaseGeometryDataBundle?.profiles
    ?.find(profile => profile.recordKey === recordKey);
  const width = geometry?.baseWidthMillimetres, depth = geometry?.baseDepthMillimetres;
  const baseId = geometry?.baseShape === 'round' ? `round_${width}mm`
    : geometry?.baseShape === 'rectangle' ? `rectangle_${width}x${depth}mm` : null;
  return { recordKey, baseId, geometrySourceRecordHash: geometry?.sourceRecordHash || null };
}

// A failed finite same-elevation witness search is not a proof that no
// legal route exists (ramps, abilities and exact moves are not exhausted).
// Also use this projection when reading historical, signed false rows;
// their original receipt bytes and hashes must remain unchanged.
export function projectPregameTargetReachabilityV1(target) {
  const witnessed = target?.reachable === true && !target.failureCode;
  return {
    reachable: witnessed ? true : null,
    reachabilityStatus: witnessed ? "certified_witness" : "unknown",
    unreachabilityProven: false,
  };
}

// A map hash or a terrain summary is not proof that the selected army can
// approach the mission objectives. Keep this decision separate from the
// Rules-owned receipt so old, mapless plans remain readable but cannot be
// promoted as map-grounded plans.
export function evaluatePregameMapReadinessV1({ mapSummary,
  candidateMapAccess = [], selectedCandidateId } = {}) {
  const selected = candidateMapAccess.find((entry) =>
    entry?.candidateId === selectedCandidateId)?.receipt || null;
  const summaryFreezeHash = mapSummary?.mapBinding?.roomFreezeHash || null;
  const routeFreezeHash = selected?.mapBinding?.roomFreezeHash || null;
  const reason = !mapSummary
    ? "map_summary_missing"
    : mapSummary.resultStatus !== "certified_map_summary"
      ? mapSummary.unknownReason || "map_summary_not_certified"
      : !selected
        ? "selected_roster_route_missing"
        : selected.resultStatus !== "certified_base_clearance_audit"
          ? selected.unknownReason || "selected_roster_route_not_certified"
          : !summaryFreezeHash || summaryFreezeHash !== routeFreezeHash
            ? "map_binding_mismatch" : null;
  return Object.freeze({
    status: reason ? "draft_map_evidence_missing" : "certified_route_evidence",
    reason,
    roomFreezeHash: reason ? null : summaryFreezeHash,
    mapSummaryReceiptHash: mapSummary?.receiptHash || null,
    selectedRouteReceiptHash: selected?.receiptHash || null,
  });
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function seal(body) {
  return Object.freeze({ ...body,
    receiptHash: hashStarcraftTmgContract(body) });
}

function terrainSummary(piece) {
  return {
    terrainPieceId: piece.terrainPieceId || piece.terrainId || piece.id,
    ...Object.fromEntries(['terrainGroupId','terrainInstanceIds','sourceRegionIds',
      'semanticClass','overlayRole','blocksPlacement','impassable','isRemoved']
      .filter(key=>piece[key]!==undefined).map(key=>[key,clone(piece[key])])),
    terrainKind: piece.terrainKind,
    size: piece.size,
    footprint: clone(piece.footprint),
    heightTier: piece.heightTier ?? piece.elevation ?? null,
    standableHorizontalSurface: piece.standableHorizontalSurface === true,
    openings: clone(piece.openings || []),
    accessPointIds: (piece.accessPoints || []).map((point) =>
      point.accessPointId || point.id),
  };
}

// Cross-room identity is physical map/task/source data, not a route search's
// approximate witness length. Project the same fields the strategist actually
// received; old receipt bytes stay untouched. Missing physical evidence cannot
// be upgraded to an identity match.
export function projectPregameMapPhysicalFactsV1(summary) {
  const binding = summary?.mapBinding;
  if (summary?.resultStatus !== "certified_map_summary"
    || !binding?.seedId || !binding.compilationHash
    || !binding.missionRecordKey || !binding.deploymentRecordKey
    || !binding.officialSourceSnapshotHash
    || !Number.isFinite(summary.battlefield?.widthInches)
    || !Number.isFinite(summary.battlefield?.heightInches)
    || ![summary.terrain, summary.accessPoints, summary.missionMarkers,
      summary.baseProfileIds].every(Array.isArray)) return null;
  const sorted = (rows, key) => clone(rows).sort((a, b) =>
    String(a[key]).localeCompare(String(b[key])));
  return {
    seedId: binding.seedId, compilationHash: binding.compilationHash,
    missionRecordKey: binding.missionRecordKey,
    deploymentRecordKey: binding.deploymentRecordKey,
    officialSourceSnapshotHash: binding.officialSourceSnapshotHash,
    battlefield: clone(summary.battlefield),
    terrain: sorted(summary.terrain, "terrainPieceId"),
    accessPoints: sorted(summary.accessPoints, "accessPointId"),
    missionMarkers: sorted(summary.missionMarkers, "targetId"),
    baseProfileIds: [...summary.baseProfileIds].sort(),
  };
}

export function createPregameMapEvidencePortV1({ sourceState,
  sourceStateHash = null, releaseBinding = null } = {}) {
  if (!sourceState?.board || !Array.isArray(sourceState.board.terrain)) {
    throw new TypeError("PREGAME_MAP_SOURCE_STATE_REQUIRED");
  }
  const board = sourceState.board;
  const freeze = sourceState.officialCompetitiveMapRoomFreeze || null;
  const semanticFreeze = freeze?.schema
    === OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_SCHEMA;
  const summary = board.competitiveMapRoomFreezeSummary || null;
  const manifest = board.battlefieldMapManifest || null;
  const sourceHash = sourceStateHash || hashStarcraftTmgContract(sourceState);
  let unknownReason = freeze ? null : "abstract_fixture_no_certified_map";
  if (freeze && (freeze.roomFreezeHash !== summary?.roomFreezeHash
    || freeze.compilationHash !== summary?.compilationHash
    || freeze.seedId !== summary?.seedId
    || freeze.missionSpatialReachabilityAuditHash
      !== summary?.missionSpatialReachabilityAuditHash
    || freeze.seedId !== manifest?.mapSeedId
    || freeze.compilationHash !== manifest?.mapCompilationHash)) {
    unknownReason = "map_variant_mismatch";
  }
  if (freeze && !unknownReason) {
    if (semanticFreeze) {
      // The Room factory already distinguishes authored semantic maps from
      // generic balanced layouts. Keep the same verifier and policy here;
      // large chassis may have blocked routes without invalidating the map.
      verifyOfficialCompetitiveMapSemanticRoomFreezeV1(freeze, {
        deploymentGeometryBinding:
          sourceState.officialDeploymentGeometryBinding,
        deploymentGeometryDataBundle:
          sourceState.officialDeploymentGeometryDataBundle,
      });
    } else {
      verifyOfficialCompetitiveMapRoomFreezeV1(freeze, {
        deploymentGeometryBinding:
          sourceState.officialDeploymentGeometryBinding,
        balancedTerrainRulesDataBundle:
          sourceState.officialBalancedTerrainRulesDataBundle,
      });
    }
  }
  const audit = unknownReason ? null
    : freeze.missionSpatialReachabilityAudit;
  const unitBindings = (sourceState.pieces || []).map(piece => ({ unitId: piece.id,
    sideId: piece.sideKey,
    ...projectPregameOfficialBaseIdentityV1(sourceState, piece.officialUnitRecordKey) }));
  const mapBinding = Object.freeze({
    sourceStateHash: sourceHash,
    seedId: freeze?.seedId || null,
    compilationHash: freeze?.compilationHash || null,
    roomFreezeHash: freeze?.roomFreezeHash || null,
    rulesReachabilityAuditHash: audit?.auditHash || null,
    missionRecordKey: sourceState.mission?.recordKey || null,
    deploymentRecordKey: sourceState.board.deploymentId || null,
    officialSourceSnapshotHash:
      sourceState.officialMissionRuntimeState?.sourceSnapshotHash || null,
  });
  const layoutMaterialization=Object.freeze({
    schema:'pregame_map_layout_materialization_v1',
    status:!unknownReason&&freeze?'frozen_native_geometry':'unverified_source_geometry',
    sourceStateHash:sourceHash,roomFreezeHash:mapBinding.roomFreezeHash,
    compilationHash:mapBinding.compilationHash,
    terrainCellCount:board.terrain.length,
    terrainGroupCount:new Set(board.terrain.map(piece=>piece.terrainGroupId??piece.terrainPieceId??piece.terrainId??piece.id)).size,
    missionMarkerCount:(board.missionMarkers??[]).length,
    sourceSetupScheduleIsCurrentExecutionState:false,
    exactActionLegalityProven:false,
    interpretation:!unknownReason&&freeze
      ?'This private Native source already contains the frozen terrain and marker geometry used by its Rules queries. Terrain rows may be compiled cells of one terrainGroupId, not separate tabletop pieces. deploymentGeometry.setupSequence is the original binding-construction schedule, not current execution state: its legacy pending labels do not make this frozen layout unknown or future. No live setup action, unit arrival, legal path or future score is proved; use the corresponding Native query/action.'
      :'Geometry is present in the source but has no verified matching frozen-map authority. Do not infer that setup is complete, the map is certified or any unit route/action is legal.',
  });

  function receipt(queryId, queryKind, result) {
    const id = String(queryId || "").trim();
    if (!id) throw new TypeError("PREGAME_MAP_QUERY_ID_REQUIRED");
    return seal({ schemaVersion: PREGAME_MAP_EVIDENCE_PORT_V1,
      queryId: id, queryKind, mapBinding: clone(mapBinding),
      ...(releaseBinding ? {releaseBinding: clone(releaseBinding)} : {}),
      reachabilityInterpretationVersion:
        PREGAME_TARGET_REACHABILITY_INTERPRETATION_V1,
      ...result, sourcePixelsUsedAsRulesGeometry: false,
      mutatesRoomState: false, trainingTruth: false });
  }

  function deploymentGeometry(query = {}) {
    const geometry=sourceState.officialDeploymentGeometryBinding;
    const available=!unknownReason&&geometry?.geometryExecutionReady===true
      &&geometry.deploymentRecordKey===mapBinding.deploymentRecordKey;
    return receipt(query.queryId,'deployment_geometry',{
      resultStatus:available?'certified_deployment_geometry':'unknown',
      unknownReason:available?null:unknownReason||'materialized_deployment_binding_unavailable',
      sourceField:'/officialDeploymentGeometryBinding',
      deploymentGeometry:clone(geometry??null),
      layoutMaterialization:clone(layoutMaterialization),
      exactMoveOrDeploymentLegality:false,
      interpretation:'Exact fields of this frozen Native source, not a card-image guess or a strategy ranking. Entry edges/colour belong to the named players and coordinate system. Terrain accessPoints are a different concept; an empty accessPoints array does not remove these entry edges. Use Native deployment/formation/path queries for an actual unit, footprint, state and supply window.'});
  }

  function summarizeMap(query = {}) {
    return receipt(query.queryId, "summarize_map", {
      resultStatus: audit ? "certified_map_summary" : "unknown",
      unknownReason,
      layoutMaterialization:clone(layoutMaterialization),
      battlefield: { widthInches: board.widthInches,
        heightInches: board.heightInches },
      terrain: board.terrain.map(terrainSummary),
      accessPoints: (board.accessPoints || []).map((point) => ({
        accessPointId: point.accessPointId || point.id,
        terrainId: point.terrainId,
        footprint: clone(point.footprint),
        connectsElevations: clone(point.connectsElevations || point.connects),
      })),
      missionMarkers: (board.missionMarkers || []).map((marker) => ({
        targetId: marker.id, coordinate: {
          xInches: marker.xInches, yInches: marker.yInches },
        diameterInches: marker.diameterInches,
        elevation: marker.elevation,
        supportTerrainPieceId: marker.supportTerrainPieceId,
      })),
      baseProfileIds: audit?.baseProfileIds || [],
      entryAndTaskReachabilityCertified:
        audit?.spatialReachabilityCertified === true,
      ...(semanticFreeze && audit ? { reachabilityCertification: {
        policy: "semantic_selected_recipe_not_universal_chassis_connectivity",
        everySideEnterableByAtLeastOneCurrentBase:
          freeze.everySideEnterableByAtLeastOneCurrentBase === true,
        everyMarkerAndQuarterReachableByAtLeastOneCurrentBase:
          freeze.everyMarkerAndQuarterReachableByAtLeastOneCurrentBase === true,
        opposingSidesConnectedByAtLeastOneCurrentBase:
          freeze.opposingSidesConnectedByAtLeastOneCurrentBase === true,
        strictUniversalConnectivityForEveryCurrentBase:
          freeze.strictUniversalConnectivityForEveryCurrentBase === true,
        perBaseRouteFailuresRemainVisible: true,
      } } : {}),
      routeDetailPolicy: "query_per_side_base_and_target; grid_audit_is_not_an_exact_move",
    });
  }

  function routeToObjective(query = {}) {
    const request = projectPregameMapRouteRequestV1(query);
    const unitBinding = request.unitId ? unitBindings.find(unit => unit.unitId === request.unitId) : null;
    const bindingError = !request.unitId ? null : !unitBinding ? 'unit_identity_unknown'
      : !unitBinding.baseId ? 'unit_base_identity_unavailable'
        : request.sideId && request.sideId !== unitBinding.sideId ? 'unit_side_identity_conflict'
          : request.baseId && request.baseId !== unitBinding.baseId ? 'unit_base_identity_conflict' : null;
    const sideId = unitBinding?.sideId || request.sideId || "";
    const baseId = unitBinding?.baseId || request.baseId || "";
    const targetId = request.targetId || "";
    const base = audit?.baseProfileAudits?.find((row) => row.baseId === baseId);
    const side = base?.sideAudits?.find((row) => row.sideId === sideId);
    const target = side?.targetAudits?.find((row) => row.targetId === targetId);
    const reason = unknownReason || bindingError || (!sideId ? "side_identity_required"
      : !base ? "base_profile_not_audited"
      : !side ? "side_not_audited"
        : !target ? "target_not_audited" : null);
    // Selector mistakes can be corrected against this SAME frozen audit.
    // Missing certification or a failed route search is not a selector mistake
    // and must remain unknown, rather than inviting an arbitrary substitute.
    const invalidArguments = !unknownReason ? [
      ...(bindingError ? ['unitId', ...(request.baseId ? ['baseId'] : []), ...(request.sideId ? ['sideId'] : [])] : []),
      ...(!sideId || (base && !side) ? ["sideId"] : []),
      ...(!base ? ["baseId"] : []),
      ...(side && !target ? ["targetId"] : []),
    ] : [];
    const reachability = projectPregameTargetReachabilityV1(reason ? null : target);
    return receipt(query.queryId, "route_to_objective", {
      resultStatus: reason || reachability.reachable !== true
        ? "unknown" : "certified_reachability_audit",
      unknownReason: reason || (reachability.reachable !== true
        ? target?.failureCode || "certified_route_witness_unavailable" : null),
      sideId, baseId, targetId,
      ...(request.unitId ? { unitId: request.unitId, unitBinding: clone(unitBinding),
        requestedSideId: request.sideId || null, requestedBaseId: request.baseId || null } : {}),
      applicableUnitIds: unitBindings.filter(unit => unit.sideId === sideId && unit.baseId === baseId)
        .map(unit => unit.unitId),
      unitApplicabilityScope: 'Only units with this exact official base identity; not all units named in model prose. Does not prove complete unit formation or arrival.',
      ...(invalidArguments.length ? {
        mayRepairSameChoice: true,
        failureStage: "validate_map_route_selectors",
        safeFailureClass: "query_arguments",
        repairContext: {
          sourceContract: "frozen_map_route_selectors_v1",
          requiredArguments: request.unitId ? ["unitId", "targetId"] : ["sideId", "baseId", "targetId"],
          invalidArguments,
          availableSelectors: {
            sideIds: clone(audit.sideIds), baseIds: clone(audit.baseProfileIds),
            targetIds: clone(audit.targetIds),
            unitBindings: clone(unitBindings),
          },
          suggestionExecuted: false,
          guidance: "Supply the identifiers for the originally intended side, base and target. Do not substitute a different chassis or objective merely to obtain a route. If that original selection has no audited entry, retain unknown. A grid witness is not an exact move or legal arrival.",
        },
      } : {}),
      ...reachability,
      failureCode: reason ? null : target.failureCode,
      witness: reason ? null : clone(target.witness),
      blockingTerrainPieceIds: reason ? []
        : clone(target.blockingTerrainPieceIds),
      alternateRoutes: "unknown_not_computed",
      exactMoveOrDeploymentLegality: false,
      routeLengthPrecision: "frozen_audit_grid_approximation",
      gridStepInches: audit?.gridStepInches ?? null,
    });
  }

  function compareObjectiveAccess(query = {}) {
    const targetId = String(query.targetId || "");
    const baseId = String(query.baseId || "");
    const sides = audit?.sideIds || [];
    const rows = sides.map((sideId) => {
      const receiptValue = routeToObjective({
        queryId: `${query.queryId}:${sideId}`, sideId, baseId, targetId,
      });
      return { sideId, ...projectPregameTargetReachabilityV1(receiptValue),
        approximateRouteLengthInches:
          receiptValue.witness?.approximateRouteLengthInches ?? null,
        receiptHash: receiptValue.receiptHash };
    });
    return receipt(query.queryId, "compare_objective_access", {
      resultStatus: unknownReason || rows.length !== 2
        || rows.some((row) => row.reachable === null)
        ? "unknown" : "advisory_map_comparison",
      unknownReason: unknownReason || (rows.length !== 2
        ? "two_side_audit_unavailable"
        : rows.some((row) => row.reachable === null)
          ? "certified_route_witness_unavailable" : null),
      baseId, targetId, sides: rows,
      playerSwapDeltaInches: rows.length === 2
        && rows.every((row) => row.approximateRouteLengthInches !== null)
        ? Number((rows[0].approximateRouteLengthInches
          - rows[1].approximateRouteLengthInches).toFixed(3)) : null,
      scoreTimingDerived: false,
      exactMoveOrDeploymentLegality: false,
    });
  }

  function evaluateRosterRoute(query = {}) {
    const sideId = String(query.sideId || "");
    const candidateInput = query.candidateInput;
    if (!Array.isArray(candidateInput?.units)
      || candidateInput.units.length === 0
      || candidateInput.sideKey !== sideId) {
      throw new TypeError("PREGAME_MAP_ROSTER_CANDIDATE_REQUIRED");
    }
    const units = candidateInput.units.map((unit) => {
      const identity = projectPregameOfficialBaseIdentityV1(sourceState, unit.recordKey);
      const baseId = identity.baseId;
      return { unitInstanceId: unit.unitInstanceId,
        recordKey: unit.recordKey,
        compositionKind: unit.compositionKind,
        baseId: audit?.baseProfileIds.includes(baseId) ? baseId : null,
        geometrySourceRecordHash: identity.geometrySourceRecordHash };
    });
    const uniqueBases = [...new Set(units.map((unit) => unit.baseId)
      .filter(Boolean))];
    const targetIds = audit?.targetIds || [];
    const accessByBase = uniqueBases.map((baseId) => {
      const sideAudit = audit.baseProfileAudits
        .find((row) => row.baseId === baseId)?.sideAudits
        .find((row) => row.sideId === sideId);
      return { baseId, targets: targetIds.map((targetId) => {
        const target = sideAudit?.targetAudits.find((row) =>
          row.targetId === targetId);
        return { targetId, ...projectPregameTargetReachabilityV1(target),
          failureCode: target?.failureCode || null,
          approximateRouteLengthInches:
            target?.witness?.approximateRouteLengthInches ?? null,
          accessPointId: target?.witness?.accessPointId || null,
          witnessCoordinate: clone(target?.witness?.coordinate || null) };
      }) };
    });
    const unresolvedUnits = units.filter((unit) => !unit.baseId)
      .map((unit) => unit.unitInstanceId);
    return receipt(query.queryId, "evaluate_roster_route", {
      resultStatus: unknownReason || unresolvedUnits.length
        ? "unknown" : "certified_base_clearance_audit",
      unknownReason: unknownReason || (unresolvedUnits.length
        ? "unit_base_profile_not_audited" : null),
      sideId,
      candidateInputHash: hashStarcraftTmgContract(candidateInput),
      units,
      accessByBase,
      unresolvedUnits,
      formationCoherencyAndEndingFitChecked: false,
      flyingAndAbilityTransitChecked: false,
      exactMoveOrDeploymentLegality: false,
    });
  }

  function describeMapQueries(){
    return {schema:'pregame_map_query_contracts_v1',mapBinding:clone(mapBinding),
      contracts:clone(PREGAME_MAP_WORKFLOW_CONTRACTS_V1),
      selectors:{sideIds:clone(audit?.sideIds||[]),baseIds:clone(audit?.baseProfileIds||[]),
        targetIds:clone(audit?.targetIds||[]),unitBindings:clone(unitBindings)},
      instruction:'Use the originally intended unit/base and target, not a substitute to get a positive answer. Map is bound by this product source. queryId is Host-owned. A missing route witness does not prove impossibility.'};
  }
  return Object.freeze({ mapBinding, summarizeMap, deploymentGeometry, routeToObjective, describeMapQueries,
    compareObjectiveAccess, evaluateRosterRoute });
}
