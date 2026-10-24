// Concrete captured-request reproduction; no Provider, Native execution or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';

const [workflowDirectory,outputPath]=process.argv.slice(2);
if(!workflowDirectory||!outputPath)throw new Error('workflow directory and output required');
const get=async ref=>JSON.parse(await fs.readFile(`${workflowDirectory}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await fs.readFile(`${workflowDirectory}/workflow.json`,'utf8'));
const originalReply='640575eb71a8907dd96d2f2f7222051864c57e31484cea9de87304cefb58bf35';
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.replyRef===originalReply));
assert(work,'captured Assault-only experiment author must exist');
const directory=state.evidence.map((entry,index)=>({number:index+1,...entry}));
const collected=await Promise.all(work.operationState.reads.map(async row=>({
  ...await get(row.resultRef),evidenceNumber:directory.find(e=>e.id===row.evidenceId)?.number})));
const original=JSON.stringify({state,collected});
const result={pass:false,checks:[],actualProviderCalls:0,nativeExecutions:0,productionWrites:0};
try{
  const view=await projectRosterWorkflowReadContextV1({collected,operation:work.operationState,
    directory,store:{get},assignmentScope:state.scope});
  const item=view.sourceReadNavigation.find(row=>row.pointer==='/receipt/actionSpace/actionCapabilityReference/routes');
  assert(item,'actual request must still withhold the large routes body');
  assert(item.nativeActionDirectory,'withheld Native routes need meaningful identities, not just array length');
  const nav=item.nativeActionDirectory;
  const raw=collected.find(row=>row.evidenceId===item.evidenceId&&row.pointer==='/receipt/actionSpace')
    .value.actionCapabilityReference.routes;
  const entries=nav.units.flatMap(unit=>unit.actions.map(action=>({...action,pieceId:unit.pieceId})));
  assert.equal(entries.length,raw.length);
  assert.equal(new Set(entries.map(row=>row.index)).size,raw.length);
  for(const entry of entries){
    const source=raw[entry.index];
    for(const key of ['pieceId','actionType','phase','weaponName','abilityName'])
      assert.deepEqual(entry[key]??null,source[key]??null,`exact Native ${key} at ${entry.index}`);
    assert.equal(nav.itemPointerPattern.replace('{zeroBasedIndex}',entry.index),item.pointer+'/'+entry.index);
  }
  const blades=entries.find(row=>row.pieceId==='player2-kerrigan'&&row.weaponName==='Blades');
  assert.equal(blades?.phase,'combat');
  assert.equal(blades.actionType,'fight');
  const impact=entries.find(row=>row.pieceId==='player2-kerrigan-raptor'&&row.actionType==='resolve_impact');
  assert.equal(impact?.phase,'assault');
  assert.equal(nav.directoryIsBodyRead,false);
  assert.equal(nav.executionEligibilityProven,false);
  assert(JSON.stringify(nav).length<16384,'directory should fit the existing exact-child window');
  assert(view.sourceReadNavigation.filter(row=>row.pointer.includes('/board/')).every(row=>!row.nativeActionDirectory));
  assert.equal(JSON.stringify({state,collected}),original);
  result.checks.push({name:'actual-split-action-read-has-source-owned-unit-phase-index',pass:true,
    routeCount:raw.length,directoryCharacters:JSON.stringify(nav).length,bladesPhase:blades.phase,
    impactPhase:impact.phase,sourceUnchanged:true,bodyAndLegalityNotGranted:true,unrelatedArraysUntouched:true});
  result.pass=true;
}catch(error){result.error={name:error.name,message:error.message};process.exitCode=1;}
await fs.writeFile(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
