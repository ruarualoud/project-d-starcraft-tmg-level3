// Only a saved local delegation owns these fields. Root method authors still
// select their comparison; no model statement creates delegation authority.
export function rosterDelegatedMethodControlV1(request,{retainedOrder=null}={}){
 const choice=request.promptNodes?.find(n=>n.kind==='pending_operation_choice_contract');
 const delegated=choice?.delegatedComparison,parent=delegated?.binding;
 if(!delegated?.targetWorkId||parent?.schema!=='roster_comparison_observation_binding_v1'
  ||!['supporting_step','observation_candidate'].includes(parent.role)
  ||typeof parent.sourceStepId!=='string'||!Array.isArray(parent.observationStepIds)
  ||!parent.measurements?.length||!Number.isSafeInteger(parent.purposeSource?.evidenceNumber))return null;
 const task=request.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.inputs?.task?.value;
 const original=retainedOrder?.experimentScope??task?.originalWork?.experimentScope??task?.failedOrder?.experimentScope;
 if(!original?.participantUnitIds?.length)return null;
 const experimentScope=structuredClone(original);
 // null invokes resolveRosterComparisonBindingV1's existing inherited path.
 // That resolver alone decides preparation vs matching observation candidate,
 // then checks source/arm/participants and the actual submitted operations.
 experimentScope.comparisonBinding=null;
 return {version:1,targetWorkId:delegated.targetWorkId,experimentScope,
  inheritedIdentity:{purposeEvidenceNumber:parent.purposeSource.evidenceNumber,arm:parent.arm,
   measurementNumbers:parent.measurements.map(m=>m.number)},
  stageResolver:'resolveRosterComparisonBindingV1',
  sourceApproved:false,measurementCompleted:false};
}
export const ROSTER_DELEGATED_METHOD_CONTROL_INSTRUCTION_V1=
 'This is a local delegated method, not a new comparison design. Host retains the fixed experimentScope, purpose identity, arm and metric assignment from the saved delegation. Do not output experimentScope or comparison metadata. Choose the actual tool steps, parameters, bindings and stop boundary. The original compiler derives local prerequisite/observation-candidate identity from those steps; an inherited identity is not a measurement, successful scene, approval or permission to change participants/strategy. Historical parent bindings are context only and must not be copied into this local method.';

export const ROSTER_METHOD_DEPENDENCIES_V1=Object.freeze({version:1,
 stages:[
  {id:'candidate',requires:[],responsibility:'Use the strategic author selected configuration. For an alternative not yet created, candidate_context applies that exact selection and Native audits it; reuse a saved identical audited candidate. No private roster redesign by the method.'},
  {id:'scene',requires:['candidate'],responsibility:'Select the exact saved scene or explicitly construct/project the declared conditions for this candidate. Candidate root is not a combat scene. Comparison arms must carry the declared geometry/phase; no arbitrary placements to manufacture a result.'},
  {id:'legal_measurement',requires:['scene'],responsibility:'Read the actual source-owned query contract and Native menu for this scene. Check initial weapon/target legality and endpoint coverage; declare what happens after casualties remove targets. A future menu is an observation boundary, not permission to invent choices.'},
  {id:'measurement',requires:['legal_measurement'],responsibility:'Run the declared finite measurement once, with its selected chance policy and Native rules. Reuse saved successful arm measurements, never replace unknown by zero. A preparation receipt does not satisfy this stage.'},
  {id:'comparison',requires:['measurement'],responsibility:'Bind both required measured arms under the same criterion and controlled conditions; use the source-owned observable/unit and compiled signed partition. Missing an arm means comparison is pending, not refuted.'},
  {id:'owner_decision',requires:['comparison'],responsibility:'Return the conditional result and limits to the strategic author for its cost/Plan choice. The method does not choose a tactical winner or expand into a whole match.'}
 ],
 instruction:'Account for the whole dependency chain before the first batch. Each stage may reuse a saved matching source, wait for an actual menu, or name a precise unavailable prerequisite. Submit only the currently executable prefix; report the pending tail in unresolvedQuestions/publicReason. This checklist authorizes no extra query or simulation, does not require rerunning passed stages, and does not replace compiler dependencies, Native legality or the current role stop boundary.'});
