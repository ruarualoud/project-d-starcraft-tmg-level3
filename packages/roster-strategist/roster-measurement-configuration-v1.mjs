// Actual configuration behind a measurement, not its model-authored arm name.
// The same read-only projection serves authors, methods, Teach and reviewers.
import {isDeepStrictEqual} from 'node:util';
import {projectRosterMeasurementSceneInputsV1} from './roster-measurement-scenes-v1.mjs';
import {rosterMeasurementAssessmentScopeV1 as assessmentScope} from './roster-measurement-assessment-scope-v1.mjs';
const clone=structuredClone;
const unwrap=v=>v?.kind&&v.value?v.value:v;
const keysEqual=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
function measuredParticipants(value){
  const rows=value.operation==='threat_exchange'?value.receipt?.exchange?.attackEstimates
    :value.receipt?.estimate?[value.receipt.estimate]:[];
  const valid=value.status==='completed'&&value.receipt?.resultStatus==='ok'
    &&Array.isArray(rows)&&rows.length>0&&rows.every(row=>
      typeof row.attackerUnitId==='string'&&row.attackerUnitId.trim()
      &&typeof row.targetUnitId==='string'&&row.targetUnitId.trim());
  return {participantSource:'native_attack_estimates',participantStatus:valid?'resolved':'unavailable',
    subjectUnitIds:valid?[...new Set(rows.map(row=>row.attackerUnitId))].sort():[],
    targetIds:valid?[...new Set(rows.map(row=>row.targetUnitId))].sort():[],
    requestedFilters:{subjectUnitIds:clone(value.request?.subjectUnitIds??[]),targetIds:clone(value.request?.targetIds??[])},
    instruction:'Participants identify actual Native attack rows, not the requested search scope. Omitted filters do not mean no observations; ignored legacy aliases are not relabelled as consumed filters. Missing Native row identities remain unavailable, never inferred from a request or arm label.'};
}
function checkedConfigurations(value,participants){
  const check=value.participantConfigurationCheck;
  if(!check)return null;
  // This check was made by the laboratory against BOTH selected armies at
  // execution. Its actual selections, not the model's expected selections or
  // the current friendly draft, describe this measured scene.
  const identities=check.schema==='roster_participant_configuration_check_v1'
    &&check.status==='matched'&&check.configurationScope==='both_selected_armies'
    &&check.source==='selected_and_frozen_reference_inputs'
    &&check.contextRef===value.contextRef
    &&typeof check.sourceStateHash==='string'&&check.sourceStateHash===value.receipt.sourceStateHash
    &&typeof check.baseStateHash==='string'&&check.baseStateHash===value.receipt.baseStateHash;
  const actual=check.actualConfigurations;
  const unique=Array.isArray(actual)&&actual.every(u=>typeof u.unitInstanceId==='string'&&u.unitInstanceId.trim())
    &&new Set(actual.map(u=>u.unitInstanceId)).size===actual.length;
  const ids=[...new Set([...participants.subjectUnitIds,...participants.targetIds])];
  const selected=identities&&unique?actual.filter(u=>ids.includes(u.unitInstanceId)):[];
  return {check,selected,status:!identities||!unique?'conflicting_sources':
    participants.participantStatus==='resolved'&&selected.length===ids.length?'resolved':'missing_participant'};
}
export async function projectRosterMeasurementConfigurationInputsV1({assignment,state,readArtifact,resolveReferences,compareSceneConditions}){
  const roots=new Set((assignment.inputs.sourceDirectory?.value?.entries??[]).map(e=>e.sourceEvidenceId));
  // A directory is discovery metadata, not an exhaustive replacement for
  // explicitly assigned results (in particular newly corrected facts).
  for(const [key,input]of Object.entries(assignment.inputs??{})){
    // Global Plan/catalogue roots are not evidence newly assigned to this local
    // task. Actual saved reads remain eligible regardless of the input name.
    if(['draft','menu','teach','requirements','frozenTaskAuthority','currentArmyAuthority','currentArmyConfiguration'].includes(key))continue;
    if(input.source==='evidence')roots.add(input.id??input.evidenceId);
    if(input.source==='work'){
      const w=state.work.find(w=>w.id===(input.workId??input.id));if(w)roots.add((w.role==='roster_workflow_tool'?'tool:':'role:')+w.id);
    }
  }
  const current=state.work.find(w=>w.id===(assignment.workId??assignment.id));
  for(const r of current?.operationState?.reads??[])if(r.evidenceId)roots.add(r.evidenceId);
  if(!roots.size)return {};
  const cache=new Map(),get=async ref=>{if(!cache.has(ref))cache.set(ref,await readArtifact(ref));return cache.get(ref);};
  const graph=await resolveReferences({state,readArtifact:get,rootIds:[...roots].filter(Boolean),includeSourceFacts:true});
  const sources=new Map(graph.entries.map(row=>[row.sourceEvidenceId,{row,e:state.evidence[row.evidenceNumber-1]}]));
  const measurements=[],configurationSources=[],inputs={};
  const addSource=(source,pointer,value)=>{
    if(configurationSources.some(s=>s.evidenceNumber===source.number&&s.pointer===pointer))return;
    configurationSources.push({evidenceNumber:source.number,sourceEvidenceId:source.e.id,artifactRef:source.e.artifactRef,pointer});
    inputs['measurementConfiguration'+configurationSources.length]={source:'evidence',evidenceId:source.e.id,
      evidenceNumber:source.number,artifactRef:source.e.artifactRef,pointer,status:'read',
      ...(source.e.bindings?.army!==state.scope.army?{scopeUsage:'historical_reference'}:{}),value:clone(value)};
  };
  for(const {row,e}of sources.values()){
    const value=unwrap(await get(e.artifactRef));
    if(!['threat_exchange','probability'].includes(value?.operation)||!value.receipt)continue;
    const participants=measuredParticipants(value),units=[...new Set([...participants.subjectUnitIds,...participants.targetIds])];
    const checked=checkedConfigurations(value,participants);
    if(checked){
      const source={e,number:row.evidenceNumber};
      addSource(source,'/participantConfigurationCheck',checked.check);
      measurements.push({evidenceNumber:row.evidenceNumber,sourceEvidenceId:e.id,artifactRef:e.artifactRef,
        contextRef:value.contextRef??null,sourceStateHash:value.receipt.sourceStateHash??null,...participants,
        configurationStatus:checked.status,configurationScope:'measured_attackers_and_targets',
        configurationSource:{evidenceNumber:row.evidenceNumber,artifactRef:e.artifactRef,pointer:'/participantConfigurationCheck/actualConfigurations'},
        units:clone(checked.selected),declaredLabel:value.experimentOrigin?.comparisonBinding?.arm??null,labelIsConfigurationProof:false});
      // A mismatched or incomplete Native check is not permission to silently
      // substitute a friendly draft, a request label or expected declarations.
      continue;
    }
    const candidates=[];
    if(value.contextRef){
      // A model may supply a complete saved stateRef rather than a parameter
      // binding. Its candidate can then be a co-assigned source, not a graph
      // descendant of the measurement. Resolve by BOTH Native identities among
      // this role's assigned/read source closure; never scan unrelated global
      // candidates, infer from an arm label, or prefer one conflicting config.
      for(const source of sources.values()){
        const body=unwrap(await get(source.e.artifactRef)),receipt=body?.receipt;
        if(body?.operation!=='candidate_context'||receipt?.resultStatus!=='ok'
          ||receipt.contextRef!==value.contextRef||receipt.laboratory?.sourceStateHash!==value.receipt.sourceStateHash
          ||!receipt.candidateInput)continue;
        candidates.push({e:source.e,number:source.row.evidenceNumber,pointer:'/receipt/candidateInput',candidate:receipt.candidateInput});
      }
    }else if(value.contextRef===null&&typeof e.bindings?.army==='string'){
      // Null means the formal laboratory, not "use whichever draft is current".
      // Resolve ONLY saved formal configurations with this observation's army.
      for(const [index,source]of state.evidence.entries()){
        if(!/^draft:r\d+:summary$/u.test(source.id)||source.bindings?.army!==e.bindings.army)continue;
        const body=await get(source.artifactRef);if(body.candidateInput)candidates.push({e:source,number:index+1,pointer:'/candidateInput',candidate:body.candidateInput});
      }
    }
    const distinct=[];for(const c of candidates)if(!distinct.some(p=>isDeepStrictEqual(p.candidate,c.candidate)))distinct.push(c);
    const config=distinct.length===1?distinct[0]:null;
    const selected=config?(config.candidate.units??[]).filter(u=>units.includes(u.unitInstanceId)):[];
    const complete=participants.participantStatus==='resolved'&&config&&selected.length===new Set(units).size;
    if(config)addSource(config,config.pointer,config.candidate);
    measurements.push({evidenceNumber:row.evidenceNumber,sourceEvidenceId:e.id,artifactRef:e.artifactRef,
      contextRef:value.contextRef??null,sourceStateHash:value.receipt.sourceStateHash??null,
      ...participants,
      configurationStatus:distinct.length>1?'conflicting_sources':complete?'resolved':config?'missing_participant':'unknown',
      configurationSource:config?{evidenceNumber:config.number,artifactRef:config.e.artifactRef,pointer:config.pointer}:null,
      units:clone(selected),
      declaredLabel:value.experimentOrigin?.comparisonBinding?.arm??null,labelIsConfigurationProof:false});
  }
  if(!measurements.length)return {};
  const comparisons=[];
  for(let i=0;i<measurements.length;i++)for(let j=i+1;j<measurements.length;j++){
    const left=measurements[i],right=measurements[j];
    if(left.configurationStatus!=='resolved'||right.configurationStatus!=='resolved'
      ||!keysEqual(left.subjectUnitIds,right.subjectUnitIds)||!keysEqual(left.targetIds,right.targetIds))continue;
    const unitChanges=left.units.map(a=>{const b=right.units.find(u=>u.unitInstanceId===a.unitInstanceId);
      const au=a.upgrades??[],bu=b.upgrades??[];
      return {unitInstanceId:a.unitInstanceId,
        roles:[...(left.subjectUnitIds.includes(a.unitInstanceId)?['attacker']:[]),...(left.targetIds.includes(a.unitInstanceId)?['target']:[])],
        configurationEqual:isDeepStrictEqual(a,b),
        changedFields:[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>!isDeepStrictEqual(a[k],b[k])),
        sharedUpgrades:clone(au.filter(x=>bu.some(y=>isDeepStrictEqual(x,y)))),
        onlyLeftUpgrades:clone(au.filter(x=>!bu.some(y=>isDeepStrictEqual(x,y)))),
        onlyRightUpgrades:clone(bu.filter(x=>!au.some(y=>isDeepStrictEqual(x,y))))};});
    comparisons.push({left:left.evidenceNumber,right:right.evidenceNumber,unitChanges,
      geometryAssessment:'separate_scene_evidence'});
  }
  const sceneInputs=await projectRosterMeasurementSceneInputsV1({sources,measurements,readArtifact:get,compareSceneConditions});
  return {...inputs,...sceneInputs,measurementConfigurations:{source:'literal',value:{schema:'roster_measurement_configurations_v1',version:3,
    measurements,configurationSources,comparisons,unresolvedReferences:graph.unresolvedReferences,
    assessmentScope:assessmentScope('saved_configuration_differences'),originalArtifactsUnchanged:true,
    instruction:'These are exact saved configurations of BOTH measured attackers and targets and deterministic field differences, not arm-name interpretations or strategy approval. The accompanying measurementConfiguration inputs deliver the original Native participant check (actualConfigurations, not expected declarations) or saved candidateInput with source number/pointer. Attacker/target roles come from Native attack rows, not army ownership. Shared upgrades are held constant in those two records; their marginal effect is not measured by merely changing another upgrade. Compare the ORIGINAL authorized alternatives and changed factors to these actual configurations. Unknown/conflicting/missing participant is not an empty loadout or zero effect. Geometry, payment, effect timing and outcome aggregation require their separate evidence. Do not infer upgrade superiority or a preferred roster from this matrix; the model still owns scoped interpretation and the strategic choice.'}}};
}
