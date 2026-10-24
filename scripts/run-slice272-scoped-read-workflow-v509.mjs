// Actual new P1/P2 scheduler + role runner on one frozen historical case.
// No old investigation is resumed, no Native actions, army or Plan writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {publishRosterWorkflowPlanBlocksV1} from '../packages/roster-strategist/roster-workflow-plan-blocks-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1}
  from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const root=process.cwd();
const source=path.join(root,'build/slice272-role-workflow-prototype-v502-r5-20261019');
const dir=await fs.mkdtemp(path.join(root,'build/slice272-scoped-read-workflow-v509-'));
const save=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2),{flag:'wx'});
const facts=JSON.parse(await fs.readFile(path.join(source,'facts.request.json'),'utf8'));
const decision=JSON.parse(await fs.readFile(path.join(source,'decision.request.json'),'utf8'));
const catalogue=JSON.parse(await fs.readFile(path.join(source,'evidence-catalogue.json'),'utf8'));
const plan=decision.request.promptNodes.find(n=>n.kind==='current_full_plan_not_validated').plan;
const scope={army:catalogue.source.candidateHash,plan:catalogue.source.planHash,map:'frozen-P0-map',rules:'frozen-P0-rules'};
let adapter,sequence=0;const calls=[];
console.log(JSON.stringify({stage:'started',dir}));
try{
  const store=createRosterDecisionWorkflowStoreV1({directory:path.join(dir,'workflow')});
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const port=await adapter.factory.createForRun({sessionId:path.basename(dir),runKind:'teach-framework',planHash:scope.plan,
    onEvent:e=>fs.appendFile(path.join(dir,'provider-events.jsonl'),JSON.stringify(e)+'\n')});
  const execute=createRosterWorkflowReadRoleExecutorV1({deliberation:port,store,sessionId:path.basename(dir),
    onRequest:async request=>{
      const n=++sequence,encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await save(`${n}.request.json`,{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),
        encodedProviderInput:encoded.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number:n,kind:request.roundKind,inputCharacters:encoded.afterCharacters}));
    },onReply:async reply=>{
      await save(`${sequence}.reply.json`,reply);calls.push({number:sequence,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs,receiptHash:reply.receipt.receiptHash});
      console.log(JSON.stringify({stage:'returned',...calls.at(-1),action:reply.output.action}));
    }});
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  await workflow.dispatch({type:'initialize',scope});
  await workflow.dispatch({type:'publish_evidence',id:'native-catalogue',title:'Actual396 exact Native receipt fields; private conditional experiment',
    kind:'tool_receipt',bindings:{army:scope.army,map:scope.map,rules:scope.rules},conditions:['Saved original exact field catalogue; no additional gameplay has been executed'],value:catalogue});
  await publishRosterWorkflowPlanBlocksV1(workflow,{plan,bindings:{army:scope.army,plan:scope.plan}});
  await workflow.dispatch({type:'enqueue',work:[
    {id:'arrival-evidence-scope',role:'roster_workflow_fact_summary',bindings:scope,inputs:{
      task:{source:'literal',value:{question:facts.request.promptNodes.find(n=>n.kind==='assigned_question').question,
        instruction:'Assess exactly what the saved Native evidence proves about this arrival question and what it does not. You may inspect the current Plan to distinguish its conditional intent from facts. Do not investigate new gameplay or edit anything.'}}}},
    {id:'arrival-local-teach',role:'roster_workflow_local_teach',bindings:scope,inputs:{
      factSummary:{source:'work',id:'arrival-evidence-scope',pointer:''},
      task:{source:'literal',value:'Read the original scoreRoute/deployment claims as needed. Challenge only what the evidence actually contradicts or leaves unproved; preserve valid conditional strategy. Propose specific future work, not applied edits. Do not infer a tool completion field or impose an arrival dependency on independent conditional arithmetic.'}}},
  ]});
  // This is a bounded observation quantum, NOT a production strategy round cap.
  // Every successful read yields a durable continuation. Failure is retained;
  // no HTTP error is retried here. A later P5 owner reconciles unknown dispatches.
  while(sequence<8){
    const before=await workflow.inspect();
    if(before.work.some(w=>w.status==='needs_repair'))break;
    if(before.work.every(w=>w.status==='evidence_ready'))break;
    for(const w of before.work.filter(w=>w.status==='needs_model_choice'))await workflow.dispatch({type:'continue_work',workId:w.id});
    const after=await workflow.dispatch({type:'run_ready',concurrency:1});
    if(!after.length)break;
  }
  const state=await workflow.inspect();
  const outputs=[];for(const work of state.work)if(work.resultRef)outputs.push({workId:work.id,status:work.status,result:await store.get(work.resultRef)});
  await save('outputs.json',outputs);
  await save('result.json',{status:state.work.every(w=>w.status==='evidence_ready')?'completed':'held',dir,calls,
    jobs:state.work.map(w=>({id:w.id,status:w.status,failure:w.failure??null,turns:w.operationState?.turn??0})),
    actualSameCoreSchedulerAndRoleRunner:true,webWorkspaceEndToEnd:false,originalPlanUntouched:true,nativeActions:0,
    actualRosterMutations:0,strategicImprovementProven:false,acceptanceGranted:false});
  console.log(JSON.stringify({stage:'finished',dir,jobs:state.work.map(w=>({id:w.id,status:w.status})),calls:calls.length}));
}catch(error){await save('failure.json',{code:error.code||error.message,calls,unknownCostRetained:true});console.error(error);process.exitCode=1;}
finally{await adapter?.close?.();}
