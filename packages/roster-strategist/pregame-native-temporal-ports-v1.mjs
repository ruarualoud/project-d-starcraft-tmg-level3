import {resolveTemporalFormationIntentV1} from './pregame-temporal-formation-intent-v1.mjs';
import {nativeTemporalInvariantErrorV1} from './pregame-native-temporal-invariant-v1.mjs';
// Shared Native boundary for single and joint bounded searches. No Rules or
// simulated receipts here: every menu, geometry option and action uses child.
export function createPregameNativeTemporalPortsV1({child,query,actionAllowed,assertTransition,controlArguments,onStep}){
  let serial=0;const menus=new Map();
  return {
    inspect:(base,seatKey)=>{
      const key=JSON.stringify([base,seatKey]);
      if(menus.has(key)){const saved=menus.get(key);menus.delete(key);menus.set(key,saved);}
      else{while(menus.size>=2)menus.delete(menus.keys().next().value);menus.set(key,child.describeQueryContext({base:base??undefined,seatKey}));}
      return menus.get(key);
    },
    control:(base,q)=>child.querySpatial({base:base??undefined,seatKey:q.seatKey,queryId:query.queryId+':control:'+(serial++),
      queryKind:'mission_marker_control',argumentsJson:JSON.stringify(controlArguments(q))}),
    formations:(base,seatKey,domain,q,search)=>{
      // A geometric candidate horizon, not a promise of future movement speed.
      const intent=resolveTemporalFormationIntentV1({intent:q.formationIntent,
        state:q.formationIntent.preferredAnchorTarget?child.captureNativeTemporalInvariantView({base:base??undefined}).state:null});
      const horizon=Number(domain.constraints?.maxDistanceMilliInches)*search.remainingUnitActions;
      const routeIntent=['move','run'].includes(domain.actionType)&&Number.isSafeInteger(horizon)&&horizon>0?{routePlanningDistanceMilliInches:horizon}:{};
      return child.querySpatial({base:base??undefined,seatKey,queryId:query.queryId+':formation:'+(serial++),queryKind:'space.solve_formation',
        argumentsJson:JSON.stringify({domainId:domain.domainId,...intent,...routeIntent})});
    },
    apply:async(base,selected,q)=>{
      const parent=child.captureNativeTemporalInvariantView({base:base??undefined}).state;
      const receipt=child.runScenarioBranch({branchId:query.queryId+':transition:'+(serial++),base:base??undefined,
        seatKey:selected.sideKey,spec:{kind:'native_action'},argumentsJson:JSON.stringify(selected.action)});
      const nextBase={kind:'branch',branchStateHash:receipt.branchStateHash};
      const successor=child.captureNativeTemporalInvariantView({base:nextBase}).state;
      try{
        if(!actionAllowed({action:receipt.nativeAction},q))throw Error('PREGAME_TEMPORAL_ACTION_OUTSIDE_SCOPE');
        assertTransition({parent,successor,query:q,nativeAction:receipt.nativeAction,nativeEvents:receipt.nativeEvents});
      }catch(error){throw nativeTemporalInvariantErrorV1({causeCode:error.code??error.message,
        parentStateHash:receipt.parentStateHash,successorStateHash:receipt.branchStateHash,nativeReceipt:receipt});}
      const result={base:nextBase,stateHash:receipt.branchStateHash,round:successor.round,phase:successor.phase,
        nativeAction:structuredClone(receipt.nativeAction),nativeEvents:structuredClone(receipt.nativeEvents),
        nativeReceiptHash:receipt.receiptHash,parentStateHash:receipt.parentStateHash,rulesRuntimeHash:receipt.rulesRuntimeHash};
      if(onStep)await onStep(structuredClone(result));return result;
    },
  };
}
