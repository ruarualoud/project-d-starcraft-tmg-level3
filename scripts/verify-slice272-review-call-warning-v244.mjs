// Actual A source review exceeded a task-wide 12-call cap across distinct
// shards. A task budget is observability, not the per-error convergence gate.
import assert from 'node:assert/strict';
import {createRosterPlanningSecureDeliberationFactoryV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2 as profile} from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
let sends=0,paused=false;const events=[];
const secure=await createRosterPlanningSecureDeliberationFactoryV1({profile,
  readCredential:async()=>({credentialBytes:Buffer.from('not-a-key-local-fixture')}),
  createWorker:()=>({attachCredential:async()=>({ok:true,workerRef:'local'}),close:async()=>{},send:async()=>{
    sends++;return {status:200,payload:{status:'completed',model:profile.model,
      usage:{input_tokens:1,output_tokens:1,total_tokens:2},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'{"schemaVersion":"test.v1","roundKind":"final_plan_review"}'}]}]}};
  }})});
try{
  const port=await secure.factory.createForRun({sessionId:'review-cap-repro',runKind:'final-plan-review',control:{paused:()=>paused},onEvent:e=>events.push(e)});
  const request={roundKind:'final_plan_review',promptPack:'local-repro',promptNodes:[],userMessage:'fixture',responseContract:{},
    responseFormat:{kind:'provider_strict_json_schema',schemaName:'local_repro',outputContractRef:{id:'local',version:'1',hash:'a'.repeat(64)},
      schema:{type:'object',properties:{schemaVersion:{type:'string',minLength:1,maxLength:30,enum:['test.v1']},roundKind:{type:'string',minLength:1,maxLength:30,enum:['final_plan_review']}},required:['schemaVersion','roundKind'],additionalProperties:false}}};
  for(let index=1;index<=13;index++)await port.deliberate({...request,roundIndex:index,contextHash:index.toString(16).padStart(64,'0')});
  assert.equal(sends,13);
  assert.equal(events.filter(e=>e.type==='run_call_warning').length,1);
  paused=true;await assert.rejects(port.deliberate({...request,roundIndex:14,contextHash:'f'.repeat(64)}),/ROSTER_WORKSPACE_PAUSED/);
  assert.equal(sends,13);console.log(JSON.stringify({status:'pass',distinctShards:13,providerCalls:0,localWorkerCalls:sends,pauseStillStops:true}));
}finally{await secure.close();}
