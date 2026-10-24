// Source failure semantics and local repair permission must agree. This is a
// pure contract, not another scheduler or permission inferred from model prose.
export function projectPregameProbabilityRepairContractV1(value){
  const receipt=value?.receipt,request=value?.request;
  if(value?.operation!=='probability'||receipt?.resultStatus!=='unknown'
    ||receipt.unknownReason!=='PREGAME_LAB_PROBABILITY_DOMAIN_ACTOR_TARGET_MISMATCH'
    ||!request||typeof receipt.baseStateHash!=='string')return null;
  return {correctable:true,sourceContract:'pregame_probability_scene_selection_v1',
    reasonCode:receipt.unknownReason,originalQueryNotAnswered:true,estimateAvailable:false,
    baseWasOmitted:request.base===undefined,requestedBase:structuredClone(request.base??null),
    requestedDomainId:request.domainId??null,attackerUnitId:request.attackerUnitId??null,targetUnitId:request.targetUnitId??null,
    actualScene:{baseStateHash:receipt.baseStateHash,rootSourceStateHash:receipt.sourceStateHash??null,
      isRootSource:receipt.sourceStateHash?receipt.baseStateHash===receipt.sourceStateHash:null},
    automaticSceneSelection:false,
    instruction:'This mismatch is against actualScene.baseStateHash, NOT necessarily the scene from which the supplied domain was read. An omitted base uses the root source; a branch mentioned in prose does not select it. First compare the saved inspect/scenario stateRef with actualScene. If you intended that existing branch, explicitly bind its COMPLETE stateRef to /stateRef or pass base:{kind:"branch",branchStateHash:<saved hash>}; otherwise inspect the actual source and choose its domain. Preserve the intended attacker, target, weapon and comparison conditions; do not guess another weapon, rebuild a completed scene, or repeat the same request without resolving its state. Host has not chosen a branch or proven an attack, and unknown is not zero.'};
}

// Refresh the explanation from the immutable failed query for existing and new
// repair tasks. The request, actual Native receipt and historical work stay put.
export function projectPregameProbabilityRepairInputsV1(inputs){
  const task=inputs?.task?.value,repair=projectPregameProbabilityRepairContractV1(task?.failure);
  if(!repair)return inputs;
  return {...inputs,task:{...inputs.task,value:{...task,failure:{...task.failure,queryRepair:repair}}}};
}

export function projectPregameGeometryRepairContractV1(repair,value){
  if(repair?.correctable!==true||repair.sourceContract!=='pregame_hypothetical_geometry_repair_v1')return null;
  const sceneCompletion=value?.operation==='scenario'&&value.request?.spec?.kind==='hypothetical_geometry'
    ?{originalOperation:'scenario',requiresModelSelectedState:true,preservePositions:true,
      reassessAllOnField:true,replayAnchorPlacements:false,
      phase:value.request.spec.phase??null,activeSideKey:value.request.spec.activeSideKey??null,
      instruction:'Select the actual completed formation_scene stateRef only if it satisfies the original scene assumptions. If its phase and side are the intended ones, submit scenario on that stateRef with kind:hypothetical_geometry, preservePositions:true, reassessAllOnField:true, the original phase/activeSideKey and no placements. This retains every selected model position and checks the whole scene. Do NOT resubmit the original anchor list, which repacks those units. If the intended phase/side is absent or different, return the discrepancy to the owner; no Host-selected phase or assumption change.'}:undefined;
  return {...structuredClone(repair),repairScopeVersion:1,
    ...(sceneCompletion?{repairContractVersion:2,
      inputProblem:{kind:'scene_reconstruction_after_selected_geometry',
        instruction:'The earlier generic retry-original-query instruction is unsafe for a scene constructor: anchor placements overwrite selected formations. Complete by explicit preserved-state reassessment; do not replay construction.'},sceneCompletion}:{}),
    preparationScope:{kind:'same_question_private_geometry',
      operations:['inspect','spatial','formation_scene'],
      spatialQueryKinds:['space.solve_static_formation'],
      allowsNewScenario:false,allowsNativeAction:false,allowsLifecycleAdvance:false},
    instruction:'The requested retained scene has unresolved static geometry; this is not a combat result or proof of impossibility. First read any ALREADY COMPLETED repair/measurement source for this question: if its explicit stateRef and assumptions are suitable, select that saved repaired branch rather than reconstructing it. Otherwise choose and explicitly apply a source-proven static formation option on the failed parent. '+(sceneCompletion?sceneCompletion.instruction:'Then submit the original measurement on the returned stateRef; geometry alone is not its result.')+' Local permission covers inspect, space.solve_static_formation and formation_scene as prerequisites only; completing the original scenario uses the preserve-state contract above, not a new experimental scene. No new scenario, Native action, participant expansion, lifecycle advance or downstream question is authorized. Preserve original facts and label changed assumptions; the Host neither chooses a scene nor declares different conditions equivalent. Candidate queries alone do not move units or complete the original question.'};
}
