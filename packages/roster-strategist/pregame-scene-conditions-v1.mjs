// Source-owned, read-only comparison. No allow-list of game conditions: newly
// introduced resources/effects must appear in the difference, not be dropped.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {resolveRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
const copy=structuredClone;
export const PREGAME_SCENE_COMPARISON_ARGUMENTS_V1={
  referenceStateRef:'Required complete saved stateRef for the reference scene. Target is selected by outer stateRef (or explicit legacy contextRef/base). Neither scene is modified.',
};
export function assertPregameSceneComparisonInputV1(args,{allowWorkflowReferences=false,boundArguments=[]}={}){
  const allowed=['referenceStateRef','base','queryId',...(allowWorkflowReferences?['stateRef','contextRef']:[])];
  const unknown=Object.keys(args).filter(k=>!allowed.includes(k));
  let invalidReference=null;
  if(!boundArguments.includes('referenceStateRef'))try{
    resolveRosterWorkflowStateReferenceV1({stateRef:args.referenceStateRef},
      {sourceStateHash:args.referenceStateRef?.sourceStateHash});
  }catch(error){invalidReference=error.code??error.message;}
  if(!unknown.length&&!invalidReference)return;
  const detail={unsupportedArguments:unknown,invalidReference};
  throw Object.assign(Error('PREGAME_SCENE_COMPARISON_INPUT_INVALID'),{
    code:'PREGAME_SCENE_COMPARISON_INPUT_INVALID',detail,dispatchOutcome:'not_dispatched',
    queryRepair:{correctable:true,sourceContract:'pregame_scene_conditions_v1',originalQueryNotAnswered:true,
      inputProblem:detail,inputContract:copy(PREGAME_SCENE_COMPARISON_ARGUMENTS_V1),
      instruction:'Select two exact saved state references: target in stateRef and reference in referenceStateRef. Do not supply ignored-field lists, expected differences, state values or results. The tool compares every persisted Native field, never recreates either scene or edits a roster. Correct only the reported input; preserve the comparison question.'}});
}
const pointerToken=s=>String(s).replaceAll('~','~0').replaceAll('/','~1');
const json=value=>JSON.parse(JSON.stringify(value));
const identity=s=>({sourceStateHash:s.sourceStateHash,baseStateHash:s.baseStateHash,
  rulesRuntimeHash:s.rulesRuntimeHash,builderBundleHash:s.builderBundleHash});
function checkSnapshot(snapshot){
  if(snapshot?.schema!=='pregame_scene_comparison_snapshot_v1'||!snapshot.state
    ||hash(snapshot.state)!==snapshot.baseStateHash||!snapshot.rulesDescriptor
    ||!snapshot.builderBundleHash||!snapshot.rulesRuntimeHash)
    throw Object.assign(Error('PREGAME_SCENE_COMPARISON_SNAPSHOT_IDENTITY'),{
      code:'PREGAME_SCENE_COMPARISON_SNAPSHOT_IDENTITY',dispatchOutcome:'not_dispatched'});
}
export function comparePregameSceneConditionsV1({reference,target}){
  checkSnapshot(reference);checkSnapshot(target);
  // This is explicitly the JSON surface persisted by the product. Undefined
  // optional JS slots are not facts transmitted by that surface.
  const fields=s=>json({state:s.state,rulesDescriptor:s.rulesDescriptor,
    rulesRuntimeHash:s.rulesRuntimeHash,builderBundleHash:s.builderBundleHash});
  const left=fields(reference),right=fields(target),differences=[];
  let comparedNodes=0;
  function visit(a,b,path,hasA=true,hasB=true){
    comparedNodes++;
    if(hasA&&hasB&&isDeepStrictEqual(a,b))return;
    const objectA=a!==null&&typeof a==='object',objectB=b!==null&&typeof b==='object';
    if(hasA&&hasB&&objectA&&objectB&&Array.isArray(a)===Array.isArray(b)){
      for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort())
        visit(a[key],b[key],path+'/'+pointerToken(key),Object.hasOwn(a,key),Object.hasOwn(b,key));
      return;
    }
    differences.push({pointer:path,reference:{present:hasA,...(hasA?{value:copy(a)}:{})},
      target:{present:hasB,...(hasB?{value:copy(b)}:{})}});
  }
  visit(left,right,'');
  const coverage=Object.keys(left).flatMap(group=>group==='state'
    ?[...new Set([...Object.keys(left.state),...Object.keys(right.state)])].sort().map(key=>({
      pointer:'/state/'+pointerToken(key),referencePresent:Object.hasOwn(left.state,key),targetPresent:Object.hasOwn(right.state,key),
      equal:Object.hasOwn(left.state,key)===Object.hasOwn(right.state,key)&&isDeepStrictEqual(left.state[key],right.state[key])}))
    :[{pointer:'/'+group,referencePresent:true,targetPresent:true,equal:isDeepStrictEqual(left[group],right[group])}]);
  return {schema:'pregame_scene_conditions_v1',left:identity(reference),right:identity(target),
    complete:true,comparedNodes,comparisonRepresentation:'entire_persisted_native_json_and_runtime_descriptor',
    stateEqual:isDeepStrictEqual(left.state,right.state),differences,coverage,
    ignoredStatePaths:[],causalAttribution:'not_assessed',trainingTruth:false,
    instruction:'Complete structural comparison of the selected immutable Native states and runtime descriptors. Every unequal persisted field is listed; unlisted fields are equal, not unexamined. Added/removed subtrees retain their full values. Array positions and presence are preserved, not aligned by guessed identity. Source/state/runtime hashes identify content and may change when an upgrade changes; a different hash alone is not another gameplay condition. Interpret actual changed fields alongside the selected factor, query parameters, samples and reaction policy. This read neither proves statistical significance, legal arrival, whole-game utility nor chooses a strategy. No scene, attack, payment or roster change was executed.'};
}
