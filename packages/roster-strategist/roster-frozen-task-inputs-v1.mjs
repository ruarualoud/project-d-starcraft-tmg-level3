// One selection of current task/participant evidence for authors and reviewers.
// These are the configured experimental inputs, not inferred enemy knowledge.
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
// Shared by request projection and scheduling. These receipts are bound to
// the underlying army/Rules/map/scene, so a Plan-only edit may reuse them.
export function selectRosterCurrentDiscoveryReceiptsV1({evidence,scope}){
  const latest=suffix=>evidence.findLast(entry=>entry.id.startsWith('tool:discovery:')
    &&entry.id.endsWith(suffix)&&rosterWorkflowBindingsMatchV1(entry.bindings,scope)
    &&(!entry.availability||entry.availability==='available'));
  return {mission:latest(':scoring'),snapshot:latest(':context')};
}
export function rosterFrozenTaskInputsV1(current){
  const source=current.evidence.findLast(entry=>/^tool:discovery:r\d+:scoring$/u.test(entry.id)
    &&rosterWorkflowBindingsMatchV1(entry.bindings,current.scope));
  const participants=current.evidence.findLast(entry=>entry.id.startsWith('participant-source:')
    &&rosterWorkflowBindingsMatchV1(entry.bindings,current.scope));
  return {...(source?{frozenTaskAuthority:{source:'evidence',id:source.id,pointer:'/receipt'}}:{}),
    ...(participants?{frozenParticipantSource:{source:'evidence',id:participants.id,pointer:''}}:{})};
}
