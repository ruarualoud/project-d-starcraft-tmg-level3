// Read-only export of one paused Run. Does not execute product workflows or Providers.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const W = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = path.join(W, 'build/slice272-product-generation-v645-lqMWaS');
const runId = 'decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c';
const root = path.join(D, 'workspace/decision-workflows', runId);
const journey = path.join(D, 'workspace/decision-product-journeys', runId);
const out = path.join(W, 'docs/model-interactions-e9981-2026-10-22');
await fs.mkdir(out, {recursive:true});
const json = p => fs.readFile(p, 'utf8').then(JSON.parse);
const w = await json(path.join(root, 'workflow.json'));
if (w.events.at(-1)?.sequence !== 9981) throw new Error('Run changed: expected paused e9981');
if (w.work.some(x => x.status === 'running' || x.operationState?.pending)) throw new Error('Run has in-flight work');
const trace = (await fs.readFile(path.join(journey,'trace.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
let redactions=0;
function redact(s) {
  return s.replace(/\b(?:sk|jsk)-[A-Za-z0-9_-]{16,}\b/g, () => {redactions++;return '[API_KEY_REDACTED]';})
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]{16,}/gi, (_,a)=>{redactions++;return a+'[REDACTED]';});
}
const pack = value => {
  const raw=redact(JSON.stringify(value));
  const gz=gzipSync(raw,{level:6});
  if(gunzipSync(gz).toString()!==raw)throw new Error('Export roundtrip mismatch');
  return {data:gz.toString('base64'),sha256:hash(raw),bytes:Buffer.byteLength(raw)};
};
const calls = new Map();
function findCalls(x,workId){
  if(!x||typeof x!=='object')return;
  if(x.requestRef&&x.replyRef&&x.receipt){
    const key=x.requestRef+':'+x.replyRef;
    if(!calls.has(key))calls.set(key,{...x,workId});
  }
  if(Array.isArray(x))for(const v of x)findCalls(v,workId);
  else for(const [k,v]of Object.entries(x))if(k!=='inputs'&&k!=='receipt'&&k!=='bindings')findCalls(v,workId);
}
for(const work of w.work)findCalls(work,work.id);
const byContext=new Map();
for(const c of calls.values()){
  const key=c.receipt.contextHash;
  if(!byContext.has(key))byContext.set(key,[]);
  byContext.get(key).push(c);
}
const records=[], queues=new Map();
let orphanReplies=[];
for(const event of trace){
  if(event.kind==='request'){
    const row={index:records.length+1,event,replyEvent:null};records.push(row);
    if(!queues.has(event.contextHash))queues.set(event.contextHash,[]);
    queues.get(event.contextHash).push(row);
  }else if(event.kind==='reply'){
    // Same-context transport recovery creates a new request attempt. The three
    // observed successful recoveries reply seconds after that newer dispatch,
    // not to the earlier timed-out attempt tens of minutes before it.
    const row=queues.get(event.contextHash)?.pop();
    if(row)row.replyEvent=event;else orphanReplies.push(event);
  }
}
const dispatches=new Map();
for(const e of trace){const d=e.value?.dispatch;if(d?.contextHash){if(!dispatches.has(d.contextHash))dispatches.set(d.contextHash,[]);dispatches.get(d.contextHash).push({at:e.at,...d});}}
const workEvents=new Map();
for(const e of w.events){const id=e.workId??e.consumer;if(id){if(!workEvents.has(id))workEvents.set(id,[]);workEvents.get(id).push(e);}}
const draftEvents=w.events.filter(e=>e.type==='draft_committed');
const drafts=[];
for(const e of draftEvents){const value=await json(path.join(root,'artifacts',e.draftRef+'.json'));drafts.push({...e,value});}
const roleNames={roster_workflow_strategy_decision:'战略／军表与 Plan',roster_workflow_experiment_planner:'实验设计／工具输入修复',roster_workflow_local_teach:'局部 Teach',roster_workflow_fact_summary:'事实汇总',roster_workflow_final_review:'来源／覆盖审核'};
const roleStats={}, revisionStats={}, errors={}, payloads=[];
const usage={inputUnits:0,outputUnits:0,totalUnits:0,inputCacheHitUnits:0,inputCacheMissUnits:0};
const seenReceipts=new Set();
let latencyMs=0, recovered=0, exact=0, rawBytes=0;
function collectErrors(x,result=[]){
  if(!x||typeof x!=='object')return result;
  if(Array.isArray(x)){for(const a of x)collectErrors(a,result);return result;}
  if(x.code&&typeof x.code==='string')result.push(x.code);
  for(const [k,v]of Object.entries(x))if(k==='errors'||k==='issues'||k==='correction'||k==='failure')collectErrors(v,result);
  return result;
}
for(const row of records){
  const req=await json(path.join(journey,row.event.traceId+'.json'));
  const request=req.request??req;
  const nodes=request.promptNodes??[];
  const assignment=nodes.find(x=>x.kind==='workflow_role_assignment')??{};
  const candidates=byContext.get(row.event.contextHash)??[];
  let reply=row.replyEvent?await json(path.join(journey,row.replyEvent.traceId+'.json')):null;
  let call=reply?candidates.find(x=>x.receipt.receiptHash===reply.receipt?.receiptHash||x.receipt.outputHash===reply.receipt?.outputHash):null;
  let replyOrigin=reply?'journey_trace':'missing';
  if(!reply&&candidates.length===1&&records.filter(x=>x.event.contextHash===row.event.contextHash).length===1){
    call=candidates[0];reply=await json(path.join(root,'artifacts',call.replyRef+'.json'));replyOrigin='workflow_artifact';recovered++;
  }
  const workId=assignment.workId??call?.workId??null;
  const output=reply?.output??null;
  const correctionNodes=nodes.filter(x=>x.kind==='local_contract_feedback'||Array.isArray(x.errors)&&x.errors.length>0||/correction|repair_feedback|feedback_repair/.test(x.kind??''));
  const corrections=correctionNodes.flatMap(x=>collectErrors(x));
  const stage=w.work.find(x=>x.id===workId)?.draftRevision;
  const matchingDraft=[...draftEvents].reverse().find(e=>e.scope?.army===assignment.scope?.army&&e.scope?.plan===assignment.scope?.plan);
  const revision=matchingDraft?.revision??assignment.draftRevision??stage??null;
  const receipt=reply?.receipt;
  const receiptKey=receipt?.receiptHash??(reply?hash(JSON.stringify(reply)):null);
  if(receipt&&!seenReceipts.has(receiptKey)){
    seenReceipts.add(receiptKey);for(const k of Object.keys(usage))usage[k]+=Number(receipt.usage?.[k]??0);latencyMs+=Number(receipt.latencyMs??0);
  }
  const action=output?.action??output?.kind??'无可解析回复';
  const summary=output?.publicReason??output?.reason??output?.summary??output?.value?.publicReason??'';
  const stat=roleStats[row.event.role]??={label:roleNames[row.event.role]??row.event.role,requests:0,replies:0,corrections:0,units:0};
  stat.requests++;if(reply)stat.replies++;if(correctionNodes.length)stat.corrections++;stat.units+=receipt?.usage?.totalUnits??0;
  const rev=revisionStats[String(revision)]??={requests:0,corrections:0};rev.requests++;if(correctionNodes.length)rev.corrections++;
  for(const code of corrections)errors[code]=(errors[code]??0)+1;
  const chain=records.filter(x=>x.meta?.workId===workId);
  const meta={n:row.index,at:row.event.at,replyAt:row.replyEvent?.at??null,role:row.event.role,roleLabel:roleNames[row.event.role]??row.event.role,workId,revision,action,summary:typeof summary==='string'?summary:JSON.stringify(summary),correction:correctionNodes.length>0,errorCodes:[...new Set(corrections)],requestTraceId:row.event.traceId,replyTraceId:row.replyEvent?.traceId??null,requestRef:call?.requestRef??null,replyRef:call?.replyRef??null,contextHash:row.event.contextHash,replyOrigin,exactPrompt:req.isExactPromptContent===true,inputCharacters:row.event.inputCharacters,latencyMs:receipt?.latencyMs??null,usage:receipt?.usage??null,model:receipt?.modelVersion??null,previousSameWork:chain.at(-1)?.index??null,nodeKinds:nodes.map(x=>x.kind)};
  row.meta=meta;
  if(meta.previousSameWork)records[meta.previousSameWork-1].meta.nextSameWork=row.index;
  if(meta.exactPrompt)exact++;
  const detail={meta,providerInstructions:req.providerInstructions??null,encodedProviderInput:req.encodedProviderInput??null,request,reply,correctionNodes,providerDispatch:dispatches.get(row.event.contextHash)??[],workflowEvents:workEvents.get(workId)??[]};
  const packed=pack(detail);rawBytes+=packed.bytes;payloads.push(packed);
  if(row.index%100===0)console.log(JSON.stringify({exported:row.index,total:records.length}));
}
const coveredContext=new Set(records.map(x=>x.event.contextHash));
const untracedCalls=[];
for(const call of calls.values())if(!coveredContext.has(call.receipt.contextHash)){
  untracedCalls.push({...call,request:await json(path.join(root,'artifacts',call.requestRef+'.json')),reply:await json(path.join(root,'artifacts',call.replyRef+'.json'))});
}
const failureEvents=w.events.filter(x=>x.type==='work_failed');
const controlEvents=w.events.filter(x=>!['evidence_read','dispatch','result_saved','evidence_published','work_enqueued','continued','receipt_view_resolved'].includes(x.type));
const audit={schema:'paused_model_interaction_report_v1',generatedAt:new Date().toISOString(),runId,scope:'Only this current Run, from creation to e9981; no old runs.',paused:true,acceptanceGranted:w.acceptanceGranted,draftRevision:w.draftRevision,firstAt:records[0].event.at,lastAt:records.at(-1).event.at,requestTraceCount:records.length,replyTraceCount:trace.filter(x=>x.kind==='reply').length,recoveredWorkflowReplies:recovered,unpairedRequestCount:records.filter(x=>x.meta.replyOrigin==='missing').length,orphanReplies:orphanReplies.length,untracedCalls:untracedCalls.length,exactPromptCount:exact,workflowCallPairs:calls.size,uniqueReceiptCount:seenReceipts.size,usage,latencyMs,roleStats,revisionStats,errorCodes:errors,failureEventCount:failureEvents.length,workflowEventCount:w.events.length,redactions,rawPayloadBytes:rawBytes,sourceWorkflowSha256:hash(await fs.readFile(path.join(root,'workflow.json'))),sourceTraceSha256:hash(await fs.readFile(path.join(journey,'trace.jsonl'))),missingReplies:records.filter(x=>x.meta.replyOrigin==='missing').map(x=>x.meta),artifactNotes:['Request trace counts are not automatically paid HTTP counts.','Usage totals deduplicate receipts; unknown or missing costs remain unknown.','Prompt content is exact when marked, except explicit credential redaction; not the authenticated HTTP envelope.','Public reasons are model outputs, not verified facts or private chain of thought.','Work events are grouped by workId, not assumed to correspond one-to-one to each call.','Diagram folds repeated stages; call ledger does not omit them.']};
const bundle={audit,records:records.map(x=>x.meta),controlEvents,failureEvents,drafts,allEvents:w.events,traceEvents:trace,untracedCalls,orphanReplies};
const bundlePack=pack(bundle);
const template=await fs.readFile(path.join(W,'scripts/model-interactions-report-template.html'),'utf8');
const html=template.replace('/*__DATA__*/',`const BUNDLE=${JSON.stringify(bundlePack.data)};const PAYLOADS=${JSON.stringify(payloads.map(x=>x.data))};`);
await fs.writeFile(path.join(out,'index.html'),html);
await fs.writeFile(path.join(out,'audit.json'),JSON.stringify(audit,null,2)+'\n');
await fs.writeFile(path.join(out,'request-index.json'),JSON.stringify(records.map(x=>x.meta),null,2)+'\n');
await fs.writeFile(path.join(out,'payload-integrity.json'),JSON.stringify(payloads.map((x,i)=>({request:i+1,sha256:x.sha256,uncompressedBytes:x.bytes})),null,2)+'\n');
const roleTable=Object.values(roleStats).map(x=>`| ${x.label} | ${x.requests} | ${x.corrections} |`).join('\n');
const doc=`# 当前 Run 模型交互记录（暂停快照 e9981）\n\n[打开交互报告](index.html) · [流程总览](overview.html)\n\n本报告只整理 decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c，从 ${audit.firstAt} 至 ${audit.lastAt}（原时间为 UTC，网页显示上海时间）。不包含更早的旧实验，也未重新调用模型。\n\n## 完整性\n\n- 请求轨迹：${audit.requestTraceCount} 条；回复轨迹：${audit.replyTraceCount} 条。\n- 从工作流原件找回回复：${recovered} 条；仍无可配对回复：${audit.unpairedRequestCount} 条，逐条列于报告，不能假称成功。\n- 完整实际 prompt 快照：${exact} 条。保存 Provider instructions、编码输入、结构化请求、模型输出和纠错节点；凭据脱敏，其余不截断。\n- ${w.events.length} 个流程事件；${failureEvents.length} 次 work_failed 事件（不是所有模型错误的总数）。\n- 回执去重用量：${usage.totalUnits.toLocaleString('en-US')} units；不推算未知费用。\n- 草稿 r0→r4，有四次正式提交；最终验收未通过，不能据此宣称稳定产出或策略提升。\n\n## 请求分工\n\n| 角色 | 请求数 | 显式带纠错节点的请求 |\n|---|---:|---:|\n${roleTable}\n\n## 读图方法\n\n总览折叠重复阶段，交互报告保留全部请求。点击彩色请求格或左侧列表，可以查看实际任务、输入、回复及纠错；通过同任务上一请求／下一请求追踪循环。原始 prompt 页签保留英文原文，不冒充中文转述为实际发送内容。事件页能核对工具执行与职责交接，草稿页查看各版完整内容。\n\n## 当前未解决点\n\n最后任务在三次纠错后以 ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED 停止。输入边界已送达，但作者仍用旧问题的 false 前提解释当前证据，随后被 necessary_fact_has_no_new_material_evidence 拒绝。本报告不修写这些历史输出，也不将审核意见视为规则真值。\n\n暂停继续有效。T27/S272：T27 5/6，T23 33/36；剩余 S272/S248/S249/S250 共4片；最终 Plan 0/6、对局 0/12。\n`;
await fs.writeFile(path.join(out,'README.md'),doc);
console.log(JSON.stringify({audit:{...audit,missingReplies:audit.missingReplies.map(x=>({n:x.n,at:x.at,contextHash:x.contextHash})),errorCodes:errors},htmlBytes:Buffer.byteLength(html),out},null,2));
