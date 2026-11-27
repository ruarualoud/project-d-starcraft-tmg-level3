import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {createRosterPlanningWorkspaceHttpAdapterV1,ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix} from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import {queryRosterConditionalExperienceSnapshotV1} from '../packages/roster-planning-workspace/roster-conditional-experience-reader-v1.mjs';
import {prepareRosterConditionalExperienceImportV1} from '../packages/roster-planning-workspace/roster-conditional-experience-transfer-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const origin=await read('build/slice272-v905-production-experience-observation.json');
const original=origin.selected[0];
const originalDir=path.resolve('build/slice272-product-generation-v645-hsxEYu/workspace/decision-workflows',origin.workflowId,'artifacts');
const observation=await read(path.join(originalDir,original.artifactRef+'.json'));
const {bindings}=observation.actualObservation;
assert(!Object.hasOwn(bindings,'releaseManifest'));
const release=(await read('build/ticket-28-wave3-shared-query-release-v1/result.public.json')).releaseBinding.manifestHash;
const source={id:original.evidenceId,artifactRef:original.artifactRef,bindings};
const storeRecords=new Map();
const store={get:async ref=>structuredClone(storeRecords.has(ref)?storeRecords.get(ref):await read(path.join(originalDir,ref+'.json')))};
const productImport=await prepareRosterConditionalExperienceImportV1({
  sourceWorkflowId:origin.workflowId,evidenceId:source.id,state:{scope:bindings,evidence:[source],work:[]},store});
storeRecords.set('import',productImport.value);
const privateImport=structuredClone(productImport.value);
privateImport.sourceArtifacts.push({value:{schema:'roster_opponent_knowledge_v1',actualRosterKnown:true}});
storeRecords.set('hidden',privateImport);
storeRecords.set('conclusion',{schema:'roster_conditional_experience_conclusion_v1'});
storeRecords.set('deferred',{schema:'roster_deferred_hypothesis_v1'});
storeRecords.set('author',{});storeRecords.set('review',{});
storeRecords.set('closure',{kind:'reviewed_optional_comparison_closure',goalId:'goal',authorWorkId:'write',
  reviewId:'check',authorResultRef:'author',reviewResultRef:'review',comparisonResolutionKind:'reviewed_optional_retention',
  request:{cycleId:'cycle',authorWorkId:'write',authorResultRef:'author',request:{kind:'retain_scoped'}}});
const samples=[source,{id:productImport.id,artifactRef:'import',bindings:productImport.bindings},
  {id:'imported-experience:hidden',artifactRef:'hidden',bindings},
  {id:'conditional-conclusion:example',artifactRef:'conclusion',bindings},
  {id:'deferred-hypothesis:example',artifactRef:'deferred',bindings}];
const goal={id:'goal',bindings,comparisonClosure:{reportRef:'closure',authorWorkId:'write',reviewId:'check',reviewResultRef:'review'}};
const scenarios=new Map();
const destination=path.resolve('build/ticket-28-wave3-experience-release');
const sourceRelease=(scope,releaseManifest)=>releaseManifest?{...scope,releaseManifest}:{...scope};
async function addCase(name,originRelease,targetRelease,{blind=false,otherMap=false}={}) {
  const scope=sourceRelease(bindings,targetRelease);
  if(otherMap)scope.map='changed-map';
  // Four controls inject scope changes into a copy. The archived bytes stay original.
  const state={scope,evidence:samples.map(e=>({...e,bindings:sourceRelease(e.bindings,originRelease)})),
    work:[{...goal,bindings:sourceRelease(goal.bindings,originRelease)}]};
  const seed={setup:{opponentInformationBoundary:blind?'unknown_roster':'known_roster'},candidateInput:{}};
  scenarios.set(name,state);
  const directory=path.join(destination,'jobs',name);
  await fs.mkdir(directory,{recursive:true});
  await atomicWrite(path.join(directory,'journey.json'),JSON.stringify({workflowId:name,status:'paused',seed}));
}
await addCase('legacy',null,null);
await addCase('unbound-to-wave3',null,release);
await addCase('current',release,release);
await addCase('cross-release',release,'different-manifest');
await addCase('different-map',release,release,{otherMap:true});
await addCase('unknown-enemy',null,release,{blind:true});
const journey=await createRosterDecisionProductJourneyV1({directory:path.join(destination,'jobs'),liveAvailable:()=>false,
  readConditionalExperiences:({runId,query,blindOpponent})=>queryRosterConditionalExperienceSnapshotV1({state:scenarios.get(runId),store,query,blindOpponent}),
  openWorkflow:()=>assert.fail('read-only product operation opened a workflow')});
const http=createRosterPlanningWorkspaceHttpAdapterV1({service:{descriptor:()=>({}),
  startPlanning:()=>assert.fail('read-only retrieval started a planner')},decisionJourney:journey});
const results={};
for(const name of scenarios.keys()) {
  const actual=await http.handle({method:'GET',pathname:prefix+'/workflows/'+name+'/conditional-experiences'});
  assert.equal(actual.status,200,JSON.stringify(actual.response));
  const x=actual.response.experiences;
  assert.deepEqual(x.entries[0].record,observation);
  assert.equal(x.strategyApprovalGranted,false);assert.equal(x.trainingTruth,false);
  const expected=['unbound-to-wave3','cross-release','unknown-enemy'].includes(name)?['releaseManifest']:name==='different-map'?['map']:[];
  for(const field of ['entries','conclusions','deferredHypotheses','retainedDecisions','importedExperiences']){
    const rows=x[field];assert(rows.length,field);
    for(const entry of rows){
      assert.deepEqual(entry.bindingDifferences,expected,field+' '+name);
      assert.equal(entry.sourceBindingsMatchCurrent,expected.length===0);
    }
  }
  assert.equal(x.importedExperiences.some(e=>e.artifactRef==='hidden'),name!=='unknown-enemy');
  results[name]={differences:expected,visibleImports:x.importedExperiences.length};
}
assert.deepEqual(await read(path.join(originalDir,original.artifactRef+'.json')),observation);
const result={sourceWorkflowId:origin.workflowId,observation:original.artifactRef,actualReadings:observation.actualObservation.metricValues,
  release,results,categories:5,originalUnchanged:true,providerCalls:0};
await atomicWrite(path.join(destination,'result.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(results));await journey.close();
