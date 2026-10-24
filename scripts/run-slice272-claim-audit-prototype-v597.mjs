// P5 feasibility, not a fourth whole-domain audit or a production release.
// Same secure Provider boundary, role executor and exact evidence reader;
// original616 and its sources remain read-only. No Native/game actions.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterWorkflowProviderBoundaryV1} from '../packages/roster-planning-workspace/roster-workflow-provider-boundary-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
if(!process.argv.includes('--live'))throw Error('EXPLICIT_LIVE_PROTOTYPE_FLAG_REQUIRED');
const root=process.cwd(),source=path.join(root,'build/slice272-projection-owner-v565-inlKbk');
const originalRoot=path.join(source,'workspace/decision-workflows/projection-owner');
const bytes=await fs.readFile(path.join(originalRoot,'workflow.json'));
const digest=b=>createHash('sha256').update(b).digest('hex'),before=digest(bytes);
const originalState=JSON.parse(bytes),reply=JSON.parse(await fs.readFile(path.join(source,'616.reply.json'),'utf8'));
if(originalState.work.some(w=>w.status==='running'))throw Error('SOURCE_MUST_BE_AT_SAFE_BOUNDARY');
const answer=reply.output.conclusion.answer,paragraphs=answer.split(/\n\n+/u);
const aggregate=paragraphs.find(p=>p.startsWith('3)'));
const abilities=paragraphs.find(p=>p.startsWith('1)'));
const control=answer.match(/Marauder_2自身单独期望伤害[^。]+/u)?.[0];
if(!aggregate||!abilities||!control)throw Error('EXACT_SAVED_CLAIM_EXCERPTS_REQUIRED');
const atomic=process.argv.includes('--atomic'),sessionId='p5-claim-prototype-v597'+(atomic?'-atomic':'');
const sentences=text=>Array.from(new Intl.Segmenter('zh',{granularity:'sentence'}).segment(text),s=>s.segment);
const output=await fs.mkdtemp(path.join(root,atomic?'build/slice272-claim-atoms-v597-':'build/slice272-claim-audit-v597-'));
console.log(JSON.stringify({stage:'created',output,sourceBefore:before,originalRunMutated:false}));
const local=createRosterDecisionWorkflowStoreV1({directory:path.join(output,'workflow')});
const original=createRosterDecisionWorkflowStoreV1({directory:originalRoot});
// Metadata preserves original stable numbers. Payloads are fetched read-only
// from original storage; new requests/replies/checkpoints use local storage.
const seed={schema:originalState.schema,scope:originalState.scope,evidence:originalState.evidence,
  work:[],reads:[],events:[],acceptanceGranted:false};
const store={...local,load:async()=>await local.load()??structuredClone(seed),
  get:async ref=>{try{return await local.get(ref);}catch(error){if(error.code!=='ENOENT')throw error;return original.get(ref);}}};
const cases=atomic?[
  {id:'atom-aggregate',text:sentences(aggregate)[0],sourceNumber:1168,pointer:'/receipt/exchange/attackEstimates'},
  {id:'atom-ability',text:sentences(abilities).find(s=>s.includes('Medic官方能力')),sourceNumber:31,pointer:''},
]:[
  {id:'aggregate-claim',text:aggregate,sourceNumber:1168,pointer:'/receipt/exchange/attackEstimates'},
  {id:'ability-claim',text:abilities,sourceNumber:31,pointer:''},
  {id:'correct-single-attacker',text:control,sourceNumber:1151,pointer:'/receipt/exchange/attackEstimates'},
];
await fs.writeFile(path.join(output,'case-manifest.json'),JSON.stringify({sourceReply:616,cases,prototype:true,
  originalScope:originalState.scope,canAffectRules:false,trainingTruth:false},null,2),{flag:'wx'});
let adapter,sequence=0;const numbers=new Map(),usage=[];
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const port=await createRosterWorkflowProviderBoundaryV1({factory:adapter.factory,sessionId,
    runKind:'teach-framework',planHash:originalState.scope.plan,
    onEvent:e=>fs.appendFile(path.join(output,'provider-events.jsonl'),JSON.stringify(e)+'\n')});
  const execute=createRosterWorkflowReadRoleExecutorV1({store,deliberation:port,sessionId,
    onRequest:async request=>{const n=++sequence;numbers.set(request.contextHash,n);
      const encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await fs.writeFile(path.join(output,n+'.request.json'),JSON.stringify({request,
        providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),
        encodedProviderInput:encoded.input,isExactPromptContent:true},null,2),{flag:'wx'});
      console.log(JSON.stringify({stage:'dispatching',number:n,workId:request.promptNodes[0].workId,inputCharacters:encoded.afterCharacters}));},
    onReply:async response=>{const n=numbers.get(response.receipt.contextHash);if(!n)throw Error('REPLY_NOT_BOUND');
      await fs.writeFile(path.join(output,n+'.reply.json'),JSON.stringify(response,null,2),{flag:'wx'});
      usage.push({number:n,...response.receipt.usage,latencyMs:response.receipt.latencyMs});
      console.log(JSON.stringify({stage:'returned',...usage.at(-1)}));}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  await workflow.dispatch({type:'enqueue',work:cases.map(c=>({id:c.id,role:'roster_workflow_final_review',
    bindings:originalState.scope,inputs:{claim:{source:'literal',value:{
      originalReply:616,exactExcerpt:c.text,scope:'Review only this excerpt; it is a proposal, not source truth. Original experiment numbers inside the excerpt are retained for audit; cite the actual source numbers in this workflow directory.'}},
      actualSource:{source:'evidence',id:originalState.evidence[c.sourceNumber-1].id,pointer:c.pointer},
      review:{source:'literal',value:{experimentalSourceReviewVersion:3,obligations:[{checkId:'source_fidelity',
        criterion:'Check EACH material assertion in this exact excerpt against the supplied original source. Verify numeric ownership, single-attacker versus combined results, ability phase/trigger/target/payment, and causal scope. A disclaimer does not erase a contradictory positive statement in the same excerpt. Match approximate displayed values to the actual source precision; do not demand unrelated global optimality or strategy evidence. Explain a concrete mismatch, or retain a genuinely supported statement. Do not edit the army, Plan or original reply.'}]}}}}))});
  // Feasibility scale only: up to three model quanta per case. This is NOT a
  // new production round cap or reset of any existing convergence counter.
  for(let turn=0;turn<3;turn++){
    for(const work of (await workflow.inspect()).work)if(work.status==='needs_model_choice')
      await workflow.dispatch({type:'continue_work',workId:work.id});
    const ran=await workflow.dispatch({type:'run_ready',concurrency:2});
    console.log(JSON.stringify({stage:'step',turn,ran}));
    const state=await workflow.inspect();
    if(state.work.every(w=>w.status==='evidence_ready')||state.work.some(w=>w.status==='needs_repair'))break;
  }
  const state=await workflow.inspect(),results=[];
  for(const c of cases){const work=state.work.find(w=>w.id===c.id);
    results.push({id:c.id,status:work.status,resultRef:work.resultRef,
      result:work.resultRef?await store.get(work.resultRef):null,failure:work.failure??null});}
  const after=digest(await fs.readFile(path.join(originalRoot,'workflow.json')));
  const report={prototype:true,sourceReply:616,sourceBefore:before,sourceAfter:after,sourceUnchanged:before===after,
    results,usage,totalTokens:usage.reduce((n,u)=>n+u.totalUnits,0),providerCalls:usage.length,
    nativeActions:0,formalPlanAccepted:false,trainingTruth:false};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});
  console.log(JSON.stringify({stage:'complete',output,sourceUnchanged:report.sourceUnchanged,
    results:results.map(r=>({id:r.id,status:r.status,checks:r.result?.value?.checks})),tokens:report.totalTokens}));
  if(!report.sourceUnchanged)throw Error('SOURCE_CHANGED_DURING_ISOLATED_PROTOTYPE');
}finally{await adapter?.close();}
