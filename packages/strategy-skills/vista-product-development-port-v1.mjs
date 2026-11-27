import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const need=(v,c)=>{if(!v)throw Error(c)};
// Host owns scenes, state, opponent, random controls and horizon. Programs are
// compiled by Meta's product runtime, never accepted as transport from a model.
export function createVistaProductDevelopmentPortV1({sources,readHistory,executor,readExecutionEvidence}){
 function binding(source,seat){const own=sources[source.handle];need(own&&own.ownerSeat===seat&&own.ancestryGroup===source.ancestryGroup,'VISTA_DEVELOPMENT_BINDING_INVALID');return own}
 return Object.freeze({
  async read({source,ownerSeat}){const own=binding(source,ownerSeat);const record=await readHistory(own);return {...record,status:'complete',sourceHandle:source.handle,ownerSeat,kind:'historical_diagnostic',formalEvaluation:false}},
  async explore({source,ownerSeat,hypothesis,operationId,baselineBundle,comparison,evidencePolicy}){
   const own=binding(source,ownerSeat);need(own.experiment,'VISTA_EXPERIMENT_NOT_AVAILABLE');
   const base=structuredClone(own.experiment);
   async function runArm(name,bundle){
    const input={...base,...(bundle?{strategyBundle:structuredClone(bundle)}:{}),
     executionKey:'vista-development:'+hash(operationId)+(comparison?':'+name:''),...(evidencePolicy?{evidencePolicy}:{})};
    const execution=await executor.run(input);
    need(execution.sourceUnchanged===true&&execution.replayMatchesCurrent===true,'VISTA_NATIVE_DIAGNOSTIC_FAILED');
    return {executionKey:input.executionKey,strategyBundleHash:hash(input.strategyBundle),
     evidence:await readExecutionEvidence(execution),beforeMetrics:execution.beforeMetrics,
     observedMetrics:execution.metrics,beforeOpponentMetrics:execution.beforeOpponentMetrics||null,opponentMetrics:execution.opponentMetrics,
     terminalOutcome:execution.terminalOutcome||null,decisionExposures:execution.decisionExposures||[],
     windowComplete:execution.windowComplete,actualActions:execution.actualActions};
   }
   const common={status:'complete',sourceHandle:source.handle,ownerSeat,kind:'active_native_diagnostic',
    hypothesis,formalEvaluation:false,interpretation:'Development observation only; sample outcomes do not prove expected values or independent improvement.'};
   if(!comparison)return {...common,probeKind:'baseline_diagnostic',...await runArm('baseline',baselineBundle)};
   need(comparison.baselineBundle&&comparison.candidateBundle,'VISTA_COMPARISON_BUNDLES_REQUIRED');
   // Sequential arms avoid CPU contention. Durable executor reuses a completed
   // first arm if the second arm or parent handoff is interrupted.
   const baseline=await runArm('baseline',comparison.baselineBundle);
   const candidate=await runArm('candidate',comparison.candidateBundle);
   return {...common,probeKind:'paired_program_intervention',baseline,candidate,
    windowComplete:baseline.windowComplete&&candidate.windowComplete,
    actualActions:baseline.actualActions+candidate.actualActions,
    controlledConditions:{sameSource:true,sameOpponent:true,sameRandomSeed:true,sameHorizon:true},
    causalLimit:'Program is offered to the decision agent, not a forced action; inspect actual choices before attributing a difference.'};
  }
 });
}
