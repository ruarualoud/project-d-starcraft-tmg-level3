// One vocabulary for model tools, Host binding and Rules adapters. A contract
// describes what is computed, not a strategic instruction or future guarantee.
import { STATIC_FORMATION_OBJECTIVE_CONTRACT_V1, STATIC_FORMATION_OBJECTIVES_CONTRACT_V1,
  STATIC_FORMATION_JOINT_SEARCH_DEFAULTS_V1 } from './formation-intent-contract-v1.mjs';
import {STATIC_FORMATION_ANCHOR_REGION_CONTRACT_V1} from './static-formation-anchor-space-v1.mjs';
export const STARCRAFT_TMG_CURRENT_ACTION_REFERENCE_CONTRACT_V1=Object.freeze({
  referenceRequired:true,currentSeatOnly:true,unitFiltersSelectAction:false,
  acceptedReferences:['domainId','proposal.domainId','candidateId'],
  expectedArguments:{domainId:'One exact observed current Rules domain ID (candidateId/proposal.domainId are transport aliases)',
    parameters:"Explicit parameters declared by that domain's parameterSchema; queries such as formation search may instead construct them"},
  instruction:'This validates ONE selected action on the exact current state/seat, not arbitrary unit-vs-unit future threat. Unit filters cannot choose an action. Read the matching menu first; never substitute another side, weapon or unrelated domain. A hypothetical response needs an explicitly declared local scenario or a supported forecast query, not playing an entire match to reach it.',
});
export function inspectStarcraftTmgCurrentActionReferenceV1(args={}){
  const issue=reason=>({domainId:null,issue:{reason,repairContext:{
    expectedArguments:STARCRAFT_TMG_CURRENT_ACTION_REFERENCE_CONTRACT_V1.expectedArguments,
    suggestionExecuted:false,
    guidance:'Use one matching current-domain reference and its declared parameters. Conflicting references are not automatically resolved.',
  }}});
  const references=[args.domainId,args.proposal?.domainId,args.candidateId]
    .filter(value=>value!==undefined&&value!==null);
  if(!references.length||references.some(value=>typeof value!=='string'||!value.length))
    return issue('CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
  if(new Set(references).size!==1)return issue('CURRENT_ACTION_QUERY_DOMAIN_REFERENCES_CONFLICT');
  return {domainId:references[0],issue:null};
}
const contract = (delivery, domain, precision, proves, doesNotProve) => Object.freeze({
  delivery, domain, precision, proves, doesNotProve,
  ...(domain===true?{domainReferenceContract:STARCRAFT_TMG_CURRENT_ACTION_REFERENCE_CONTRACT_V1}:{}),
});
export const STARCRAFT_TMG_MARKER_CONTROL_ARGUMENT_CONTRACT_V1 = Object.freeze({
  optionalFields: ['markerIds', 'unitIds', 'domainId', 'candidateId', 'parameters', 'proposal'],
  proposalOptionalFields: ['domainId', 'parameters'],
  unitIdsMeaning: 'Focus labels only; all competing units remain in the native control calculation',
  markerIdsMeaning: 'Filter returned marker rows using exact current marker IDs',
  unrecognizedFields: 'Return correctable unknown; never silently ignore or translate relationship selectors',
});

export function inspectStarcraftTmgMarkerControlArgumentsV1(args = {}) {
  const schema = STARCRAFT_TMG_MARKER_CONTROL_ARGUMENT_CONTRACT_V1;
  // currentLegalSpaceDomain is bound by the shared runtime, never by the model.
  const allowed = new Set([...schema.optionalFields, 'currentLegalSpaceDomain']);
  const unrecognizedFields = Object.keys(args).filter(key => !allowed.has(key));
  if (args.proposal && typeof args.proposal === 'object' && !Array.isArray(args.proposal)) {
    unrecognizedFields.push(...Object.keys(args.proposal)
      .filter(key => !schema.proposalOptionalFields.includes(key)).map(key => `proposal.${key}`));
  }
  if (!unrecognizedFields.length) return null;
  return { unrecognizedFields, expectedArguments: schema, suggestionExecuted: false,
    guidance: 'Correct the named fields using the native control contract. Do not broaden a filtered request to {}. Relationship selectors are not control selectors; all competing units must remain in the calculation.' };
}
export const STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 = Object.freeze({
  base_edge_distance: contract("direct", false, "exact", "One physical base-edge distance", "LOS, control, path or attack legality"),
  within_and_wholly_within: contract("direct", false, "exact", "Requested physical within/wholly-within geometry", "LOS, control or action legality"),
  "space.inspect_relationships": contract("delegated", false, "advisory_estimate", "Current-board geometry; native marker eligibility/control separately labelled exact or unknown", "Move/charge legality; forecasts are not executable actions"),
  "space.solve_formation": Object.freeze({ ...contract("delegated", true, "exact", "Current-domain legal complete placements; comparisons retain their own precision", "Global optimality or future enemy decisions"),
    arguments: { required: ['domainId'], domainId: 'Exact current action domain from this branch',
      preferredAnchor: { xMilliInches: 'optional integer', yMilliInches: 'optional integer' },
      formationObjectives: { acceptedForms: ['single_object', 'array_of_objects'],
        kind: STATIC_FORMATION_OBJECTIVE_CONTRACT_V1.kind,
        weight: 'optional integer 1..5', targetIds: 'optional exact target IDs' },
      optional: ['preferredAnchor', 'formationObjectives', 'tacticalPurpose', 'maximumOptions'],
      resultUse: 'Select a whole formationOptions entry by its formationOptionId. canonicalParameters belong to its domainId and frozen scene. Static canonicalPlacement is not an action.' } }),
  "space.solve_static_formation": Object.freeze({ ...contract('delegated', false, 'advisory_estimate',
    'Conditional static snapshot footprint/coherency witnesses at Agent-supplied points or bounded anchor regions; already-engaged combat positions are allowed if bases do not overlap',
    'Arrival, path, action legality, global optimality or future enemy decisions'),
    arguments: { required: ['unitId'], anchors: [{ xInches: 'number', yInches: 'number' }],
      anchorRegions: STATIC_FORMATION_ANCHOR_REGION_CONTRACT_V1,
      anchorRequirement:'Supply nonempty anchors OR nonempty anchorRegions (or both). Regions express flexible leader position without asking the model to guess obstacle-free exact coordinates. Never expand beyond the declared regions.',
      formationObjectives: STATIC_FORMATION_OBJECTIVES_CONTRACT_V1,
      jointUnits: 'Optional nonempty [{unitId,anchors?,anchorRegions?,formationObjectives?,modelSpreadInches?}] with the SAME point/region contract for each explicitly chosen additional unit. Each needs nonempty points or regions. All declared units are jointly repacked in supplied order against unchanged other units/terrain; the final whole group is checked.',
      maximumJointOptions: `Optional positive integer, honored for single and joint queries. Joint or regional default ${STATIC_FORMATION_JOINT_SEARCH_DEFAULTS_V1.maximumOptions}; exact-point-only single default all supplied anchors (legacy behavior). Result count budget, not an impossibility claim.`,
      maximumJointEvaluations: `Optional positive integer, honored for single and joint queries. Joint or regional default ${STATIC_FORMATION_JOINT_SEARCH_DEFAULTS_V1.maximumEvaluations}; exact-point-only single default all supplied anchors (legacy behavior). Inspect result.search for truncation.`,
      optional: ['anchors', 'anchorRegions', 'formationObjectives', 'modelSpreadInches', 'jointUnits', 'maximumJointOptions', 'maximumJointEvaluations'], noActionDomain: true,
      use: 'For hypothetical snapshot repair, including already-engaged combat; select or reject whole formationOptions. A single option has canonicalPlacement; a joint option has canonicalPlacements for ALL jointUnitIds and must be applied as one group via formation_scene. Independent options can collide when combined; use jointUnits for a mutually compatible group. Native checks final group bases/coherency but does not prove arrival/path or permit a real move into engagement. Use space.solve_formation with an actual action domain for movement/charge legality.' } }),
  legal_formation_options: contract("delegated", true, "exact", "Same complete-placement solver as space.solve_formation", "Global optimality or future enemy decisions"),
  legal_asset_placement_options: contract("delegated", true, "exact", "Current-domain legal asset placements", "Future safety or strategic value"),
  instantiate_parameterized_action: contract("delegated", true, "exact", "Exactly the supplied current-domain action and native prepared plans", "Unqueried action, future result or control"),
  legal_full_path_movement: contract("delegated", true, "exact", "Supplied spatial action's native validated path and complete placement", "Other paths, optimality or future control"),
  coherency_after_candidate_placement: contract("delegated", true, "exact", "Native complete spatial placement's coherency", "Other units or future control"),
  action_specific_threat: contract("delegated", true, "exact", "Selected ranged/melee/charge action's native prepared plan; charge retains path evidence", "Guaranteed damage, charge roll success or all future threats"),
  attack_probability: contract("delegated", true, "advisory_estimate",
    "One current ranged or explicit single-target melee attack: damage, casualties, currentSupplyBefore/After and survivor/loss distributions belong to targetUnitId, NOT attackerUnitId. To measure my unit surviving an enemy attack, choose the enemy as attacker and my unit as target on an explicitly selected legal conditional scene/domain. The reverse direction measures a different question. Optional melee reactions are excluded",
    "The attacker's own survival, automatic mutual melee exchange, charge reach/probability, multi-target melee Precision policy, automatic return-fire, sequential combined volleys, guaranteed casualties or future enemy choice"),
  fire_zone_exchange: contract("delegated", false, "advisory_estimate",
    "Separate current ranged attacks plus scoped movement forecasts; each attack has its own conditional damage/loss distribution",
    "Return-fire damage/survival, joint or sequential combined attack losses, whole-game utility or current action legality. Received-damage fields are unmeasured, not zero. Use an explicitly selected response scene and attack_probability for a single conditional enemy attack"),
  mission_marker_control: Object.freeze({ ...contract("delegated", "optional_candidate", "exact",
    "Native control at the selected snapshot: returns contestRangeMilliInches, markerRadiusMilliInches, lineOfSightPolicy and markerResults with eligible/ineligible units, current Supply totals and sticky-control outcome. These are computed outputs, not caller-supplied thresholds. Query {} for the selected state even without a current action domain; an optional supplied spatial candidate projects its successor only",
    "Awarded VP; future arrival or enemy actions; candidate has not been applied"),
    arguments: STARCRAFT_TMG_MARKER_CONTROL_ARGUMENT_CONTRACT_V1,
    // Field descriptions only: thresholds and per-scene qualifications remain
    // owned by the same Native mission-control kernel used in live play.
    resultFields: Object.freeze({
      contestRangeMilliInches: { type: 'number', unit: 'milli-inch', meaning: 'Native base-edge contest distance threshold, not center-to-center distance' },
      markerRadiusMilliInches: { type: 'number', unit: 'milli-inch', meaning: 'Native mission-marker footprint radius used by the distance calculation' },
      lineOfSightPolicy: { type: 'string', meaning: 'Native terrain/elevation/LOS policy applied to qualification' },
      scope: { type: 'string', meaning: 'Conditional cleanup control if current positions, statuses and Supply stay unchanged; not an awarded outcome' },
      markerResults: { type: 'array', itemFields: ['markerId', 'previousControlSideKey', 'nextControlSideKey', 'result', 'supplyTotals', 'contestingUnitsBySide', 'ineligibleUnits'],
        meaning: 'Per marker: Native qualification, eligible model IDs and current Supply by competing side, ineligible reasons, prior/next control and result. unitIds focuses labels; competitors are not removed' },
      awardedVictoryPoints: { type: 'boolean', meaning: 'False: inspection awards no VP' },
    }) }),
  contextual_supply_projection: Object.freeze({...contract('delegated',false,'exact',
    'Per-unit current Native Supply by explicitly named context, including applied replacements, bonuses and floors',
    'Marker eligibility/control, future arrival, different casualties or a different aura geometry'),
    arguments:{required:['unitIds'],unitIds:'Nonempty unique exact current unit IDs',
      contexts:'Optional nonempty subset: supply_pool_calculation, mission_marker_control, objective_completion, disengage_check. Omit for all four.',
      noManualValues:'Do not supply a guessed Supply or aura result. Native computes from the selected state.'}}),
  "map.inspect": contract("delegated", false, "exact", "Frozen native map footprints, surfaces, openings, access and task identities", "An individual move, deployment or objective control"),
  "map.route_access": Object.freeze({ ...contract("delegated", false, "advisory_estimate", "Frozen base-profile route witness with explicit grid precision and unknowns", "An exact current action path, negative route proof or objective control"),
    arguments: { preferred: { unitId: 'exact available unit ID', targetId: 'frozen map target ID' },
      genericProfileQuery: { sideId: 'player1|player2', baseId: 'frozen base profile ID', targetId: 'frozen map target ID' },
      identity: 'For an actual unit use unitId; the Host derives side and base from its official frozen record. Explicit conflicting sideId/baseId is rejected. Generic base queries label applicableUnitIds and do not establish a different chassis route.' } }),
});
export const STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1 = Object.freeze(Object.keys(
  STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1));
export const STARCRAFT_TMG_DELEGATED_SPATIAL_QUERY_KINDS_V1 = Object.freeze(
  STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1.filter(kind =>
    STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[kind].delivery === "delegated"));
export const STARCRAFT_TMG_RETIRED_SPATIAL_QUERY_KINDS_V1 = Object.freeze({
  intervening_model_or_terrain_blocking: "No dedicated evaluator; use native action plan or scoped relationship LOS",
  line_of_sight_cover_and_elevation: "No dedicated evaluator; use native action plan or scoped relationship LOS",
  objective_score_after_candidate_action: "No general candidate VP evaluator; mission_marker_control provides qualification/control, not awarded VP",
});
export function starcraftTmgSpatialQueryRequiresDomainV1(kind, args = {}) {
  const domain = STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[kind]?.domain;
  return domain === true || (domain === "optional_candidate" &&
    [args.domainId, args.candidateId, args.proposal].some(value => value != null));
}
export function inspectStarcraftTmgSpatialQueryResultV1(kind, response) {
  const c = STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[kind];
  if (!c) return "unsupported_query_kind";
  if (response.queryKind !== kind) return "rules_query_kind_mismatch";
  const precision = response.precision || response.status;
  if (precision === "unknown") return null;
  if (precision !== c.precision) return "rules_query_contract_precision_mismatch";
  const r = response.result;
  if (!r || typeof r !== "object" || Array.isArray(r)) return "rules_query_result_missing";
  if (kind === "space.inspect_relationships" && !Array.isArray(r.relationships)) return "relationship_query_result_invalid";
  if (["space.solve_formation", "legal_formation_options", "legal_asset_placement_options"].includes(kind)) {
    const options = kind === "legal_asset_placement_options" ? r.placementOptions : r.formationOptions;
    if (!Array.isArray(options) || r.optionCount !== options.length) return "placement_query_result_invalid";
  }
  if (["instantiate_parameterized_action", "legal_full_path_movement", "coherency_after_candidate_placement", "action_specific_threat"].includes(kind)
    && (r.proposalAccepted !== true || !r.domainId || !r.actionHash || !r.action)) return "action_query_result_invalid";
  if (kind === "mission_marker_control" && (r.schemaVersion !== "starcraft_tmg_mission_marker_control_inspection_v1"
    || !Array.isArray(r.markerResults) || r.mutationAuthority !== false || r.awardedVictoryPoints !== false)) return "marker_control_query_result_invalid";
  if(kind==='contextual_supply_projection'&&(r.schema!=='starcraft_tmg_contextual_supply_inspection_v1'
    ||!Array.isArray(r.units)||!r.units.length||r.markerControlProven!==false||r.mutationAuthority!==false))
    return 'contextual_supply_query_result_invalid';
  if (kind === 'space.solve_static_formation' && (!Array.isArray(r.formationOptions)
    || r.optionCount !== r.formationOptions.length || r.arrivalOrMovementLegalityProven !== false
    || r.noLegalFormationProven !== false)) return 'static_formation_query_result_invalid';
  if (kind === 'space.solve_static_formation' && r.formationOptions.some(option =>
    (option.jointGeometryProven === true || option.canonicalPlacements !== undefined || r.jointUnitIds !== undefined)
      && (option.jointGeometryProven !== true || !Array.isArray(option.jointUnitIds) || option.jointUnitIds.length < 2
        || new Set(option.jointUnitIds).size !== option.jointUnitIds.length
        || JSON.stringify(option.jointUnitIds) !== JSON.stringify(r.jointUnitIds)
        || !Array.isArray(option.canonicalPlacements) || option.canonicalPlacements.length !== option.jointUnitIds.length
        || option.canonicalPlacements.some((placement, index) => placement.pieceId !== option.jointUnitIds[index]
          || !Array.isArray(placement.modelPositions) || !placement.modelPositions.length)
        || JSON.stringify(option.canonicalPlacement) !== JSON.stringify(option.canonicalPlacements[0])))) return 'static_formation_joint_result_invalid';
  if (kind === "map.inspect" && (r.resultStatus !== "certified_map_summary"
    || !r.mapBinding || !Array.isArray(r.terrain))) return "map_query_result_invalid";
  if (kind === "map.route_access" && (r.resultStatus !== "certified_reachability_audit"
    || r.exactMoveOrDeploymentLegality !== false || !r.mapBinding)) return "map_route_query_result_invalid";
  if (kind === "attack_probability" && (r.queryKind !== kind || !r.domainId || !r.attackPlanHash
    || !r.outcomes || !r.estimateHash)) return "attack_probability_query_result_invalid";
  if (kind === "fire_zone_exchange" && (r.queryKind !== kind || !Array.isArray(r.attackEstimates)
    || !Array.isArray(r.attackEstimateFailures) || !r.comparisonPolicy?.unknownValuesNeverPromotedToZero
    || !r.estimateHash)) return "fire_zone_query_result_invalid";
  if (kind === "legal_full_path_movement" && !r.pathQualification?.completeNativePathChecked) return "path_query_result_invalid";
  if (kind === "coherency_after_candidate_placement" && !r.coherencyQualification?.completeNativePlacementChecked) return "coherency_query_result_invalid";
  if (kind === "action_specific_threat" && !r.actionThreatScope?.nativePlanKind) return "threat_query_result_invalid";
  return null;
}
