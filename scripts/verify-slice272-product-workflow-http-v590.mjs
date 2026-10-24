// Reproduce/fix the concrete P6 gap: Web HTTP had no route to the new Run.
// Actual frozen product construction, no Provider. Not a generation proof.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
const root=process.cwd(),sourceRun=path.resolve(process.argv[2]);
const sourceBase=path.join(sourceRun,'workspace/decision-workflows/projection-owner');
const current=JSON.parse(await fs.readFile(path.join(sourceBase,'workflow.json'),'utf8'));
const draft=JSON.parse(await fs.readFile(path.join(sourceBase,'artifacts',current.draftRef+'.json'),'utf8'));
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const directory=await fs.mkdtemp(path.join(root,'build/slice272-product-http-v590-'));
const product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,dataDirectory:directory,
  mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8'))});
const prefix='/starcraft-tmg-level3/roster-planning/v1',call=(method,subpath,body)=>product.handle({method,pathname:prefix+'/'+subpath,body});
const health=await call('GET','health');
assert.equal(health.response.descriptor.decisionJourney.sameDecisionRun,true);
assert.equal(health.response.descriptor.decisionJourney.legacyJourneyCalled,false);
assert.equal(health.response.descriptor.decisionJourney.liveGenerationAvailable,false);
assert.equal((await call('GET','workflows')).status,200,'new product HTTP must expose the new decision workflow');
const c=draft.candidateInput,setup={factionRecordKey:c.factionRecordKey,opponentFactionRecordKey:'tactical_cards:kerrigan_s_swarm',
  engagementScale:c.scaleId,mineralBudget:c.mineralBudget,opponentInformationBoundary:draft.provenance.opponentInformationBoundary};
const empty=await call('POST','workflows',{setup});
assert.equal(empty.status,201,JSON.stringify(empty.response));
assert.equal(empty.response.workflow.mode,'editable');
assert.equal(empty.response.workflow.draft.candidateInput.units.length,0);
assert.equal(empty.response.workflow.draft.plan,null,'do not copy a historical Plan into a new production');
assert.equal(empty.response.workflow.formalPlanAccepted,false);
const fixed=await call('POST','workflows',{setup,candidateInput:c,mode:'fixed'});
assert.equal(fixed.status,201,JSON.stringify(fixed.response));
assert.deepEqual(fixed.response.workflow.draft.candidateInput,c);
assert.equal(fixed.response.workflow.draft.plan,null);
const id=empty.response.workflow.workflowId;
assert.equal((await call('GET','workflows/'+id)).status,200);
assert.equal((await call('POST','workflows/'+id+'/pause',{})).status,200);
const start=await call('POST','workflows/'+id+'/run',{});
assert.equal(start.status,503);
assert.equal(start.response.reason,'ROSTER_DECISION_PROVIDER_UNAVAILABLE');
assert.equal((await call('GET','workflows/'+id)).response.workflow.draftRevision,0);
const trace=await call('GET','workflows/'+id+'/trace');
assert.ok(trace.response.trace.some(row=>row.kind==='created'&&row.initialPlanCopied===false));
const listed=await call('GET','workflows');assert.equal(listed.response.workflows.length,2);
assert.equal((await call('POST','workflows/'+id+'/launch-room',{})).status,404,'no premature battle admission');
assert.equal(current.draftRef,JSON.parse(await fs.readFile(path.join(sourceBase,'workflow.json'),'utf8')).draftRef,
  'test never modifies the active generation draft');
console.log(JSON.stringify({passed:true,directory,actualFrozenProductHttp:true,newEditableAndFixedRuns:2,
  oldPlansNotCopied:true,legacyGenerationNotInvoked:true,missingProviderHonest:true,prematureRoomLaunch:false,
  providerCalls:0,generationProven:false,browserAcceptance:false}));
