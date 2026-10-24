import assert from 'node:assert/strict';
import {createStarcraftTmgSpatialActionQueryRuntimeV1} from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
// Reproduces paid call170's invented domain. No Rules execution may occur for
// an invalid reference; all consumers must receive the same typed repair verdict.
let delegated=0;
const runtime=createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:()=>{delegated++;throw Error('INVALID_QUERY_REACHED_RULES');}});
const input={roomProjection:{room:{roomId:'domain-repair',stateRevision:1,stateHash:'s'},matchBinding:{bindingHash:'b'},viewer:{seatKey:'player1',visibilityScope:'seat'}},
  legalSpace:{roomId:'domain-repair',matchBindingHash:'b',stateRevision:1,stateHash:'s',legalSpaceHash:'l',
    parameterDomains:[{domainId:'actual-domain',sideKey:'player1',pieceId:'marine-1',actionType:'move',parameterSchema:{}}]}};
const cases=[
  [{domainId:'sc-domain-3dcb7637-current-movement-domain'},'DOMAIN_UNKNOWN'],
  [{},'DOMAIN_REFERENCE_REQUIRED'],
  [{domainId:'actual-domain',candidateId:'other-domain'},'DOMAIN_REFERENCES_CONFLICT'],
  [{domainId:'actual-domain',parameters:[]},'PARAMETERS_OBJECT_REQUIRED'],
  [{domainId:'actual-domain',parameters:{x:1},proposal:{parameters:{x:2}}},'PARAMETERS_CONFLICT'],
  [{domainId:'actual-domain',attackerUnitId:'invented-unit'},'IDENTITY_CONFLICT'],
];
for(const [args,reason] of cases){
  const result=await runtime.query({...input,request:{queryKind:'legal_full_path_movement',arguments:args}});
  assert.equal(result.reason,'CURRENT_ACTION_QUERY_'+reason);
  assert.equal(result.status,'unknown');
  assert.equal(result.mayRepairSameChoice,true,'Native argument failures must reach typed recovery');
  assert.equal(result.safeFailureClass,'parameter_contract_invalid');
  assert.equal(result.failureStage,'validate_query_arguments');
  assert.equal(result.rulesEvaluationAttempted,false);
  assert.equal(result.repairContext.suggestionExecuted,false);
  assert.equal(result.mayApply,false);
}
assert.equal(delegated,0);
console.log(JSON.stringify({passed:true,invalidArgumentVariants:cases.length,nativeExecutions:0,providerCalls:0}));
