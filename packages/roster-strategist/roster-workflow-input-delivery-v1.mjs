// Transport projection identity shared by request assembly and recovery.
// It is not a fact/strategy version and grants no semantic retry or approval.
export const ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1='source_directories_v2';
const versions=['exact_json_children_v1',ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1];
export function rosterWorkflowCanReflowInputV1({operationState,request,inputDeliveryVersion}){
  const requested=versions.indexOf(inputDeliveryVersion);
  const delivered=versions.indexOf(request?.promptNodes?.find(n=>n.kind==='workflow_input_delivery')?.version);
  return requested>=0&&requested>delivered
    &&!operationState?.contextReflows?.some(row=>row.inputDeliveryVersion===inputDeliveryVersion);
}
