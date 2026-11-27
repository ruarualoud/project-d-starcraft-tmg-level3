import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';

// One source selector for navigation and direct role delivery. A saved geometry
// receipt is not a route, joint-arrival witness, or new experiment authority.
export async function selectRosterCurrentMapSourcesV1({directory,scope,readArtifact}){
 const rows=[];
 for(const entry of directory){
  if(entry.kind!=='tool_receipt'||entry.validity&&entry.validity!=='current'
    ||entry.availability&&entry.availability!=='available'
    ||!['army','rules','map','source'].every(key=>scope?.[key]&&entry.bindings?.[key]===scope[key])
    ||!rosterWorkflowBindingsMatchV1(entry.bindings,scope)
    ||!/^(?:map_summary|map_deployment):/u.test(entry.title??''))continue;
  const original=await readArtifact(entry.artifactRef);
  if(original?.status!=='completed'||!['map_summary','map_deployment'].includes(original.operation)
    ||original.receipt?.mapBinding?.sourceStateHash!==scope.source
    ||original.toolProofScope?.operation!==original.operation)continue;
  const pointer=original.operation==='map_deployment'?'/receipt/deploymentGeometry':'/receipt';
  if(original.operation==='map_deployment'&&!original.receipt.deploymentGeometry)continue;
  rows.push({entry,operation:original.operation,pointer,
    geometry:structuredClone(original.operation==='map_deployment'?original.receipt.deploymentGeometry:original.receipt),
    mapBinding:structuredClone(original.receipt.mapBinding),proofScope:structuredClone(original.toolProofScope)});
 }
 return rows;
}
