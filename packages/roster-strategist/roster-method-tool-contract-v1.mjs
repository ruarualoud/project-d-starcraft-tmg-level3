import {assertPregameScenarioIntentV1} from './pregame-scene-laboratory-v1.mjs';
const clone=structuredClone;
// Only operations explicitly selected by the method. A capability description
// is interface data, never an executed receipt or permission to change strategy.
export function rosterSelectedMethodContractsV1({orders,descriptor,toolSource}){
 if(!toolSource||!Array.isArray(descriptor?.operations))return [];
 const selected=new Set((orders??[]).flatMap(o=>o.steps??[]).map(s=>s.operation));
 return descriptor.operations.flatMap((contract,index)=>selected.has(contract.operation)?[{
  operation:contract.operation,evidenceNumber:toolSource.number,evidenceId:toolSource.id,
  pointer:'/operations/'+index,contract:clone(contract)}]:[]);
}
export function rosterUnreadMethodContractsV1({orders,descriptor,toolSource,isRead}){
 return rosterSelectedMethodContractsV1({orders,descriptor,toolSource})
  .flatMap(row=>missingContractBodies(row,isRead)).map(row=>({
  code:'evidence_not_read',number:row.evidenceNumber,requiredPointer:row.pointer,
  reason:'selected_operation_contract_not_delivered',operation:row.operation,
  instruction:'The selected operation interface has not been delivered. Host reads its exact current contract before any method is submitted. Confirm or revise this unexecuted proposal using that contract; a tool name is not an argument schema.'}));
}
// The reader may deliver an immutable contract as exact JSON children. Compare
// that delivery with the SAME source body, not the requested parent's spelling.
// Empty objects/arrays still require a delivered body; fetched directories and
// children from another source never count. This grants no Native result.
function missingContractBodies(row,isRead){
 if(isRead(row))return [];
 const body=row.contract;
 if(!body||typeof body!=='object'||!Object.keys(body).length)return [row];
 const children=Object.entries(body).map(([key,contract])=>({...row,
  pointer:row.pointer+'/'+key.replaceAll('~','~0').replaceAll('/','~1'),contract}));
 const missing=children.map(child=>missingContractBodies(child,isRead));
 // Nothing within this body was delivered: one exact read suffices. Otherwise
 // request only the missing subtrees; do not repeatedly fetch the same parent.
 if(missing.every((items,index)=>items.length===1&&items[0].pointer===children[index].pointer))return [row];
 return missing.flat();
}
export function rosterCurrentMethodParameterDiagnosticsV1(order){
 const issues=[];
 for(const step of order?.steps??[]){
  if(step.operation!=='scenario')continue;
  let args;try{args=JSON.parse(step.argumentsJson);}catch{continue;}
  if(step.bindings?.some(b=>b.argumentPointer==='/spec'||b.argumentPointer.startsWith('/spec/')))continue;
  try{assertPregameScenarioIntentV1(args.spec);}catch(error){
   if(error.queryRepair?.correctable)issues.push({stepId:step.stepId,operation:step.operation,
    code:error.code,detail:error.detail??null,queryRepair:clone(error.queryRepair),
    diagnosticOrigin:'current_source_validator_on_retained_unexecuted_arguments',
    previousReceiptRewritten:false,nativeExecuted:false});
  }
 }
 return issues;
}
