// One explicit question-ownership graph for discovery and execution control.
// Work ID prefixes, global-latest records and model prose are not ownership.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
export function createRosterWorkflowOwnershipIndexV1(state){
  return createRosterWorkflowGraphV1(state).owner;
}

// Scheduling priority only: no work/result/status is rewritten. A named
// comparison purpose and explicit control descendants get the next quantum.
// Citation/read dependencies alone never transfer strategic ownership.
export function selectRosterPurposePriorityV1({state,purposeWorkId}){
  return createRosterWorkflowGraphV1(state).priority(purposeWorkId);
}
