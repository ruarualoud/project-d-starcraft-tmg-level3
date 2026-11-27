import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { solveStarcraftTmgHypotheticalFormationV1 } from './legal-formation-search-v1.mjs';
import { evaluateOfficialHypotheticalCoherencySnapshotV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { projectOfficialCharacteristicStatusFamilyModifiersV1 } from '../product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { normalizeExplicitStaticFormationObjectivesV1,STATIC_FORMATION_JOINT_SEARCH_DEFAULTS_V1,STATIC_FORMATION_OBJECTIVES_INPUT_SCHEMA_V1 } from './formation-intent-contract-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1} from './spatial-query-contracts-v1.mjs';
import {prepareStaticFormationAnchorSpaceV1} from './static-formation-anchor-space-v1.mjs';
import {prepareStaticFormationRelationshipsV1,projectStaticFormationPlacementV1,STATIC_FORMATION_RELATIONSHIP_SCHEMA_V1} from './static-formation-relationships-v1.mjs';


// Typed authoring contract for the SAME Native static solver. Coordinates,
// regions, intent, unit order and search budgets are supplied by the caller.
export function staticFormationSemanticParametersV1(){
 const point={type:'object',additionalProperties:false,required:['xInches','yInches'],properties:{xInches:{type:'number'},yInches:{type:'number'}}};
 const region={type:'object',additionalProperties:false,required:['minimumXInches','maximumXInches','minimumYInches','maximumYInches','stepInches'],properties:{minimumXInches:{type:'number'},maximumXInches:{type:'number'},minimumYInches:{type:'number'},maximumYInches:{type:'number'},stepInches:{type:'number',minimum:0.001},preferredAnchor:point}};
 const unit={type:'object',additionalProperties:false,required:['unitId'],properties:{unitId:{type:'string',minLength:1},anchors:{type:'array',items:point},anchorRegions:{type:'array',items:region},formationObjectives:structuredClone(STATIC_FORMATION_OBJECTIVES_INPUT_SCHEMA_V1),modelSpreadInches:{type:'number',minimum:0.001}}};
 return {...unit,properties:{...unit.properties,jointUnits:{type:'array',minItems:1,items:unit},maximumJointOptions:{type:'integer',minimum:1},maximumJointEvaluations:{type:'integer',minimum:1},relationshipConstraints:{...structuredClone(STATIC_FORMATION_RELATIONSHIP_SCHEMA_V1),required:[]}}};
}

const invalid=detail=>{throw Object.assign(Error('STATIC_FORMATION_ARGUMENTS_INVALID:'+detail),{code:'STATIC_FORMATION_ARGUMENTS_INVALID'});};
const inputContract=STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1['space.solve_static_formation'].arguments;
const inputFields=new Set([...inputContract.required,...inputContract.optional]);
// Static projection writes only selected pieces/models. The frozen source
// bundles, terrain and unselected blockers remain read-only Native inputs;
// copying the full multi-MB source at every anchor defeats their shared caches.
function copyStaticFormationPieces(state,ids){
  return {...state,pieces:state.pieces.map(piece=>ids.has(piece.id)?structuredClone(piece):piece)};
}
function searchBudgets(args,anchorCount,joint=false){
  const maximumOptions=args.maximumJointOptions??(joint?STATIC_FORMATION_JOINT_SEARCH_DEFAULTS_V1.maximumOptions:anchorCount);
  const maximumEvaluations=args.maximumJointEvaluations??(joint?STATIC_FORMATION_JOINT_SEARCH_DEFAULTS_V1.maximumEvaluations:anchorCount);
  if(!Number.isSafeInteger(maximumOptions)||maximumOptions<=0
    ||!Number.isSafeInteger(maximumEvaluations)||maximumEvaluations<=0)invalid('positive_search_budgets_required');
  return {maximumOptions,maximumEvaluations};
}

// A static layout tool, not an action solver. The Agent supplies exact anchors
// or explicit bounded regions and chooses an option; Native checks all bases.
export function queryStarcraftTmgStaticFormationV1({ state, arguments: args = {} }) {
  const unrecognized=Object.keys(args).filter(key=>!inputFields.has(key));
  if(unrecognized.length)invalid('unrecognized_fields:'+unrecognized.join(','));
  const relationships=prepareStaticFormationRelationshipsV1(state,args);
  if (args.jointUnits !== undefined) return queryJointStaticFormation({ state, args,relationships });
  return querySingleStaticFormation({state,args,relationships});
}
function querySingleStaticFormation({state,args,includeSourceStateHash=true,relationships=null,partialRelationships=false}){
  const fail = detail => { throw Object.assign(Error('STATIC_FORMATION_ARGUMENTS_INVALID:' + detail), { code: 'STATIC_FORMATION_ARGUMENTS_INVALID' }); };
  const formationObjectives = normalizeExplicitStaticFormationObjectivesV1(args.formationObjectives);
  const piece = state.pieces.find(p => p.id === args.unitId);
  if (!piece) fail('existing_unitId_required');
  const anchorSpace=prepareStaticFormationAnchorSpaceV1(args);
  if (piece.isDestroyed === true || Number(piece.currentModels || 0) <= 0) fail('living_unit_required');
  const living = piece.models.filter(m => !m.isDestroyed);
  if (!living.length) fail('living_models_required');
  const formationOptions = [], misses = [],seen=new Set();
  const {maximumOptions,maximumEvaluations}=searchBudgets(args,anchorSpace.count,anchorSpace.usesRegions);
  let evaluations=0,evaluationLimitReached=false,optionLimitReached=false;
  for (const {anchorIndex,anchor,anchorSource} of anchorSpace.candidates()) {
    if(formationOptions.length>=maximumOptions){optionLimitReached=true;break;}
    if(evaluations>=maximumEvaluations){evaluationLimitReached=true;break;}
    evaluations++;
    const provenance=anchorSource?{anchorSource}:{};
    if (!anchor || Object.keys(anchor).some(k => !['xInches', 'yInches'].includes(k))
      || !Number.isFinite(anchor.xInches) || !Number.isFinite(anchor.yInches)) fail('anchor_coordinates_required');
    const diagnostic = { explainAnchorRejection: true, leaderFootprintRejected: 0,
      leaderOutOfBounds: 0, leaderNoSurface: 0, leaderBlockedByModelOrTerrain: 0,
      followerUnplaceable: 0, maxFollowersPlaced: 0 };
    const solved = solveStarcraftTmgHypotheticalFormationV1({ state, pieceId: piece.id,
      anchor: { xMilliInches: Math.round(anchor.xInches * 1000), yMilliInches: Math.round(anchor.yInches * 1000) },
      formationObjectives, modelSpreadInches: args.modelSpreadInches, diagnostic });
    if (!solved) {
      delete diagnostic.explainAnchorRejection;
      misses.push({ anchorIndex, anchor: structuredClone(anchor), ...provenance, reason: 'bounded_packing_miss',
        diagnostic, impossibilityProven: false,
        evidenceScope: diagnostic.anchorRejection ? 'rejected_fixed_anchor_not_all_possible_placements'
          : 'bounded_follower_search_not_impossibility',
        correctionInstruction: diagnostic.anchorRejection
          ? 'This fixed anchor failed the reported base-footprint predicate. Inspect the identified blocker/surface/boundary and choose alternative anchors or a revised joint layout. The Host has not moved a model or selected a tactic.'
          : 'The anchor passed, but this bounded search did not place all followers. Choose other anchors or formation intent; this does not prove no legal formation exists.' });
      continue;
    }
    const canonicalPlacement = { pieceId: piece.id,
      xInches: solved.rows[0].xMilliInches / 1000, yInches: solved.rows[0].yMilliInches / 1000,
      modelPositions: solved.rows.map(row => ({ modelId: row.modelId,
        xInches: row.xMilliInches / 1000, yInches: row.yMilliInches / 1000,
        rotationDegrees: row.rotationDegrees || 0, elevation: row.elevation || 'ground',
        supportTerrainIds: structuredClone(row.supportTerrainIds || []), adjacentAccessPointIds: [] })) };
    const variants=relationships?relationships.variants(state,canonicalPlacement,{anchor,anchorSource,
      region:anchorSource?.kind==='region_grid'?args.anchorRegions[anchorSource.regionIndex]:null})
      :[{placement:canonicalPlacement,anchor,anchorSource,translated:false}];
    for(const candidate of variants){
      if(formationOptions.length>=maximumOptions){optionLimitReached=true;break;}
      const placement=candidate.placement,key=hash(placement);
      if(relationships&&seen.has(key))continue;seen.add(key);
      const projected=projectStaticFormationPlacementV1(state,placement),actor=projected.pieces.find(p=>p.id===piece.id);
      const origin=candidate.anchorSource?{anchorSource:candidate.anchorSource}:{};
      const coherencyRangeMilliInches = projected.officialCharacteristicStatusFamilySourceBundle
        ? projectOfficialCharacteristicStatusFamilyModifiersV1(projected.officialCharacteristicStatusFamilySourceBundle,
          projected, { pieceId: piece.id }).horizontalCoherencyMilliInches : undefined;
      try {
        const native = evaluateOfficialHypotheticalCoherencySnapshotV1({ state: projected, actor,
          dataBundle: projected.officialModelBaseGeometryDataBundle, coherencyRangeMilliInches,
          plan: { planId: `static-formation:${piece.id}:${anchorIndex}`, leadingModelId: solved.rows[0].modelId,
            placements:candidate.translated?placement.modelPositions.map(p=>({...p,xMilliInches:Math.round(p.xInches*1000),yMilliInches:Math.round(p.yInches*1000)})):solved.rows,
            currentlyEngagedEnemyUnitIds: [] } });
        if (!native.inCoherency) { misses.push({ anchorIndex, anchor: candidate.anchor, ...origin, reason: 'out_of_coherency', impossibilityProven: false }); continue; }
        const relationshipAssessment=relationships?.assess(projected,{partial:partialRelationships});
        if(relationshipAssessment&&!relationshipAssessment.passed){misses.push({anchorIndex,anchor:candidate.anchor,...origin,
          reason:'scene_relationship_constraints_not_met',relationshipAssessment,impossibilityProven:false});continue;}
        formationOptions.push({ formationOptionId: 'static-' + key.slice(0, 24),
          pieceId: piece.id, anchorIndex, anchor: structuredClone(candidate.anchor), ...origin, canonicalPlacement:placement,
          tacticalMetrics:candidate.translated?null:solved.metrics,
          ...(candidate.translated?{searchSeedTacticalMetrics:solved.metrics,tacticalMetricsUnavailableReason:'seed_metrics_not_reused_after_constraint_translation'}:{}),
          ...(relationshipAssessment?{relationshipAssessment}:{}),staticGeometryProven: true, rulesAuthority: true,
          nativeGeometryResultHash: native.resultHash, arrivalOrMovementLegalityProven: false,
          trainingTruth: false });
      } catch (error) {
        if (!/^MODEL_BASE_GEOMETRY_/u.test(error.message || '')) throw error;
        misses.push({ anchorIndex, anchor: candidate.anchor, ...origin, reason: error.message, impossibilityProven: false });
      }
    }
  }
  return { queryKind: 'space.solve_static_formation', formationOptions, optionCount: formationOptions.length, misses,
    ...(includeSourceStateHash?{sourceStateHash:hash(state)}:{}),
    agentSuppliedAnchors: !anchorSpace.usesRegions, hostSelectedOption: false,
    ...(anchorSpace.usesRegions?{agentSuppliedAnchorRegions:true,hostExpandedModelChosenRegions:true}:{}),
    search:{evaluations,maximumEvaluations,maximumOptions,evaluationLimitReached,optionLimitReached,
      exhaustiveWithinSuppliedAnchors:!evaluationLimitReached&&!optionLimitReached,
      exhaustiveOverFormations:false,unitOrder:[piece.id],
      ...(anchorSpace.usesRegions?{anchorSpaceKind:anchorSpace.kind,
        regionSamplingScope:'bounded_discrete_leader_grid_not_continuous_feasibility',suppliedGridCandidateCount:anchorSpace.count}: {})},
    ...(relationships?{relationshipConstraints:relationships.constraints,relationshipSearch:relationships.stats}:{}),
    arrivalOrMovementLegalityProven: false, noLegalFormationProven: false, trainingTruth: false };
}

// Joint intent is explicit: only these units' old footprints are withdrawn.
// Search branches reuse the single-unit Native solver, retaining each earlier
// placement as a blocker. No anchor, unit order or tactical objective is chosen
// by the Host. Every returned option is checked again with the entire group.
function queryJointStaticFormation({ state, args,relationships=null }) {
  const fail = detail => { throw Object.assign(Error('STATIC_FORMATION_ARGUMENTS_INVALID:' + detail), { code: 'STATIC_FORMATION_ARGUMENTS_INVALID' }); };
  const unitFields = ['unitId', 'anchors', 'anchorRegions', 'formationObjectives', 'modelSpreadInches'];
  if (!Array.isArray(args.jointUnits) || !args.jointUnits.length) fail('jointUnits_nonempty_array_required');
  const units = [Object.fromEntries(unitFields.filter(key => args[key] !== undefined).map(key => [key, args[key]])), ...args.jointUnits];
  const ids = new Set(),anchorSpaces=[];
  for (const unit of units) {
    if (!unit || typeof unit !== 'object' || Array.isArray(unit)
      || Object.keys(unit).some(key => !unitFields.includes(key))) fail('joint_unit_fields_invalid');
    const piece = state.pieces.find(p => p.id === unit.unitId);
    if (!piece || ids.has(piece.id)) fail('joint_units_must_be_distinct_existing_units');
    if (piece.isDestroyed === true || Number(piece.currentModels || 0) <= 0 || !piece.models.some(m => !m.isDestroyed)) fail('living_unit_required');
    anchorSpaces.push(prepareStaticFormationAnchorSpaceV1(unit));
    normalizeExplicitStaticFormationObjectivesV1(unit.formationObjectives);
    if (unit.modelSpreadInches !== undefined && (!Number.isFinite(unit.modelSpreadInches) || unit.modelSpreadInches <= 0)) fail('modelSpreadInches_positive_number_required');
    ids.add(piece.id);
  }
  const {maximumOptions,maximumEvaluations}=searchBudgets(args,anchorSpaces[0].count,true);
  const usesRegions=anchorSpaces.some(space=>space.usesRegions);
  const initial = copyStaticFormationPieces(state,ids);
  for (const piece of initial.pieces.filter(p => ids.has(p.id))) {
    piece.isOnField = false;
    for (const model of piece.models) model.isOnField = false;
  }
  const formationOptions = [], misses = [], seen = new Set();
  let evaluations = 0, evaluationLimitReached = false, optionLimitReached = false;
  function project(projected, placement) {
    const actor = projected.pieces.find(p => p.id === placement.pieceId);
    Object.assign(actor, { isOnField: true, xInches: placement.xInches, yInches: placement.yInches });
    for (const position of placement.modelPositions) Object.assign(actor.models.find(m => m.id === position.modelId), position,
      { isOnField: true, baseRotationDegrees: position.rotationDegrees });
  }
  function checkGroup(projected, selected) {
    return selected.map(option => {
      const placement = option.canonicalPlacement, actor = projected.pieces.find(p => p.id === placement.pieceId);
      const coherencyRangeMilliInches = projected.officialCharacteristicStatusFamilySourceBundle
        ? projectOfficialCharacteristicStatusFamilyModifiersV1(projected.officialCharacteristicStatusFamilySourceBundle,
          projected, { pieceId: actor.id }).horizontalCoherencyMilliInches : undefined;
      const native = evaluateOfficialHypotheticalCoherencySnapshotV1({ state: projected, actor,
        dataBundle: projected.officialModelBaseGeometryDataBundle, coherencyRangeMilliInches,
        plan: { planId: `joint-static-formation:${actor.id}`, leadingModelId: placement.modelPositions[0].modelId,
          placements: placement.modelPositions.map(row => ({ ...row,
            xMilliInches: Math.round(row.xInches * 1000), yMilliInches: Math.round(row.yInches * 1000) })),
          currentlyEngagedEnemyUnitIds: [] } });
      if (!native.inCoherency) throw Error('MODEL_BASE_GEOMETRY_JOINT_OUT_OF_COHERENCY');
      return { pieceId: actor.id, resultHash: native.resultHash };
    });
  }
  function search(index, projected, selected) {
    if (formationOptions.length >= maximumOptions) { optionLimitReached = true; return; }
    if (index === units.length) {
      let checks;
      try { checks = checkGroup(projected, selected); }
      catch (error) {
        if (!/^MODEL_BASE_GEOMETRY_/u.test(error.message || '')) throw error;
        misses.push({ unitIds: [...ids], reason: error.message, impossibilityProven: false }); return;
      }
      const relationshipAssessment=relationships?.assess(projected);
      if(relationshipAssessment&&!relationshipAssessment.passed){misses.push({unitIds:[...ids],reason:'scene_relationship_constraints_not_met',relationshipAssessment,impossibilityProven:false});return;}
      const canonicalPlacements = selected.map(option => option.canonicalPlacement), key = hash(canonicalPlacements);
      if (seen.has(key)) return;
      seen.add(key);
      formationOptions.push({ formationOptionId: 'static-group-' + key.slice(0, 24), pieceId: units[0].unitId,
        canonicalPlacement: structuredClone(canonicalPlacements[0]), canonicalPlacements: structuredClone(canonicalPlacements),
        jointUnitIds: [...ids], jointGeometryProven: true, geometryScope: 'selected_units_and_unchanged_blockers',
        unitOptions: selected.map(option => ({ pieceId: option.pieceId, anchorIndex: option.anchorIndex,
          anchor: option.anchor, ...(option.anchorSource?{anchorSource:option.anchorSource}:{}),tacticalMetrics: option.tacticalMetrics })),
        nativeGeometryResults: checks, nativeGeometryResultHash: hash(checks), staticGeometryProven: true,
        ...(relationshipAssessment?{relationshipAssessment}:{}),
        rulesAuthority: true, arrivalOrMovementLegalityProven: false, trainingTruth: false });
      return;
    }
    for (const {anchorIndex,anchor,anchorSource} of anchorSpaces[index].candidates()) {
      if (formationOptions.length >= maximumOptions) { optionLimitReached = true; return; }
      if (evaluations >= maximumEvaluations) { evaluationLimitReached = true; return; }
      evaluations += 1;
      const {anchorRegions,...unitArgs}=units[index];
      // The inner result's complete-state hash is discarded by joint search.
      // Hash only the public result's unchanged source once, not every prefix.
      // Preserve the caller's region for optional relationship refinement, while
      // evaluating only this chosen lattice seed. Exact anchors remain exact.
      const result = querySingleStaticFormation({state:projected,args:{...unitArgs,
        ...(relationships&&anchorSource?{anchors:[],anchorRegions:[{...anchorRegions[anchorSource.regionIndex],preferredAnchor:anchor}],
          maximumJointEvaluations:1,maximumJointOptions:maximumOptions}: {anchors:[anchor]})},
        includeSourceStateHash:false,relationships,partialRelationships:true});
      misses.push(...result.misses.map(miss => ({ ...miss, unitId: units[index].unitId, anchorIndex,...(anchorSource?{anchorSource}:{}),
        selectedPrefix: selected.map(option => ({ pieceId: option.pieceId, anchor: option.anchor })) })));
      for (const option of result.formationOptions) {
        const next = copyStaticFormationPieces(projected,new Set([option.canonicalPlacement.pieceId]));
        project(next, option.canonicalPlacement);
        search(index + 1, next, [...selected, { ...option, anchorIndex,...(option.anchorSource?{anchorSource:option.anchorSource}:anchorSource?{anchorSource}: {}) }]);
      }
    }
  }
  search(0, initial, []);
  return { queryKind: 'space.solve_static_formation', formationOptions, optionCount: formationOptions.length, misses,
    sourceStateHash: hash(state), jointUnitIds: [...ids], agentSuppliedAnchors: !usesRegions, hostSelectedOption: false,
    ...(usesRegions?{agentSuppliedAnchorRegions:true,hostExpandedModelChosenRegions:true}:{}),
    search: { evaluations, maximumEvaluations, maximumOptions, evaluationLimitReached, optionLimitReached,
      exhaustiveWithinSuppliedAnchors: !evaluationLimitReached && !optionLimitReached,
      exhaustiveOverFormations: false, unitOrder: [...ids],
      ...(usesRegions?{anchorSpaceKind:anchorSpaces.some(space=>space.hasExactAnchors)?'mixed_model_points_and_regions':'model_supplied_regions',
        regionSamplingScope:'bounded_discrete_leader_grid_not_continuous_feasibility',
        suppliedGridCandidateCounts:anchorSpaces.map((space,index)=>({unitId:units[index].unitId,count:space.count}))}: {}) },
    ...(relationships?{relationshipConstraints:relationships.constraints,relationshipSearch:relationships.stats}:{}),
    arrivalOrMovementLegalityProven: false, noLegalFormationProven: false, trainingTruth: false };
}
