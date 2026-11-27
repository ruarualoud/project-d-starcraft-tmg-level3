import {STARCRAFT_TMG_DIRECT_SPATIAL_ARGUMENT_CONTRACTS_V1 as directContracts}
  from '../online-agent-session/spatial-action-query-runtime-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1}
  from '../online-agent-session/scene-query-service-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 as contracts,
  STARCRAFT_TMG_MARKER_CONTROL_ARGUMENT_CONTRACT_V1 as markerContract}
  from '../online-agent-session/spatial-query-contracts-v1.mjs';
const kinds=['base_edge_distance','within_and_wholly_within','mission_marker_control','space.inspect_relationships'];
const hostBindingFields=['authority','stateRef','stateHash','stateRevision','roomId','seatKey',
  'currentLegalSpaceDomain','currentLegalSpaceDomains','domainId','candidateId','proposal','parameters'];
export const ACTIVE_SANDBOX_SPATIAL_QUERY_CATALOGUE_V1=Object.freeze([...kinds.map(queryKind=>({
  kind:'spatial',queryKind,contract:contracts[queryKind],
  ...(directContracts[queryKind]?{arguments:directContracts[queryKind]}:{}),
  ...(queryKind==='mission_marker_control'?{arguments:{...markerContract,
    optionalFields:markerContract.optionalFields.filter(k=>!hostBindingFields.includes(k)),
    proposalOptionalFields:[],candidateProjectionAvailable:false}}:{}),
  ...(queryKind==='space.inspect_relationships'?{arguments:{subjectUnitIds:'visible unit IDs',targetIds:'visible unit or objective IDs',intent:'public query purpose'}}:{}),
  scope:'current isolated branch only; no mutation; no action-domain prediction in this adapter',
})),{kind:'attack_probability',arguments:{choice:'current menu choice with a fight parameterContract',
  parameters:'semantic fight parameters from that choice with exactly one target allocation; Host derives the measurement target; optional targetUnitId must match that allocation',
  sampleBudget:'optional positive integer supported by the shared estimator'},
  scope:'current learner action opportunity; Host binds domain; advisory probability, not actual dice or future victory'}]);
export function createActiveSandboxSpatialQueryV1({roomStore,rulesRuntime}){
  const runtimes=new Map();
  function runtime(seat){
    if(!runtimes.has(seat)){
      runtimes.set(seat,createStarcraftTmgSceneQueryServiceV1({roomStore,rulesRuntime,seatKey:seat}));
    }
    return runtimes.get(seat);
  }
  return Object.freeze({catalogue:ACTIVE_SANDBOX_SPATIAL_QUERY_CATALOGUE_V1,
    async query({projection,legalSpace,request,proposals=[]}){
      if(request?.kind==='attack_probability'){
        if(Object.keys(request).some(k=>!['kind','choice','parameters','sampleBudget'].includes(k)))
          throw Error('SANDBOX_PROBABILITY_SEMANTIC_QUERY_REQUIRED');
        const selected=proposals.find(p=>p.choice===request.choice);
        if(selected?.domain?.parameterKind!=='official_selected_roster_fight_v1')
          throw Error('SANDBOX_PROBABILITY_CHOICE_NOT_CURRENT');
        // No invented attacker, target, dice or transport binding. The common
        // runtime validates every semantic fight parameter against this domain.
        return runtime(projection.viewer.seatKey).query({roomProjection:projection,legalSpace,
          sceneScope:{kind:'isolated_exploration'},request:{queryKind:'attack_probability',arguments:{
            domainId:selected.domain.domainId,parameters:request.parameters,
            ...(request.sampleBudget!==undefined?{sampleBudget:request.sampleBudget}:{})}}});
      }
      if(!request||request.kind!=='spatial'||!kinds.includes(request.queryKind)
        ||Object.keys(request).some(k=>!['kind','queryKind','arguments'].includes(k))
        ||!request.arguments||typeof request.arguments!=='object'||Array.isArray(request.arguments))
        throw Error('SANDBOX_SPATIAL_SEMANTIC_QUERY_REQUIRED');
      const args=request.arguments;
      if(hostBindingFields.some(k=>Object.hasOwn(args,k)))
        throw Error('SANDBOX_SPATIAL_HOST_BINDING_FORBIDDEN');
      return runtime(projection.viewer.seatKey).query({roomProjection:projection,legalSpace,
        sceneScope:{kind:'isolated_exploration'},request:{queryKind:request.queryKind,arguments:args}});
    }});
}
