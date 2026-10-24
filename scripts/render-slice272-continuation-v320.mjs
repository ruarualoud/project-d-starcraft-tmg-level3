// Lossless Chinese evidence viewer; never resumes generation or changes decisions.
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const run=path.resolve(process.argv[2]);
const source=path.dirname(run);
const out=path.resolve('docs/reports/roster-plan-debug-v320');
const read=async(name,dir=run)=>JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
const status=await read('status.json');
const first=await read('model-reply-001.json',source);
const firstStatus=await read('status.json',source);
const trace=(await fs.readFile(path.join(run,'trace.jsonl'),'utf8')).split('\n').filter(Boolean).map(JSON.parse);
const readGz=async name=>JSON.parse(gunzipSync(await fs.readFile(path.join(run,name))));
const experience=status.status==='completed'
  ? await readGz(status.experienceArtifact||'experience.json.gz').catch(e=>{if(e.code==='ENOENT')return null;throw e})
  : null; // A pause export is evidence, never a completed-generation artifact.
const finalTeach=status.status==='completed'&&status.teachSessionArtifact
  ? await readGz(status.teachSessionArtifact) : null;
const statePath=path.join(source,'workspace/iterative-draft/sessions',
  createHash('sha256').update(status.sessionId).digest('hex')+'.json');
const draft=(await read(path.basename(statePath),path.dirname(statePath))).value;
const teachSnapshots=(draft.draftTeachSnapshots||[]).map(snapshot=>({
  snapshotId:snapshot.snapshotId,revision:snapshot.createdAtRevision,status:snapshot.status,
  candidateHash:snapshot.candidateHash,sourcePlanHash:snapshot.sourcePlanHash,
  phase:snapshot.state?.phase,agenda:snapshot.state?.agenda,
  initialEvidence:snapshot.state?.evidence||[],investigation:snapshot.state?.investigation,
  queryRecovery:snapshot.state?.queryRecovery,repairs:snapshot.state?.repairs,
  synthesisReader:snapshot.state?.synthesisReader,synthesis:snapshot.state?.synthesis,
  issueLedger:snapshot.state?.issueLedger,coverage:snapshot.state?.coverage,
  failure:snapshot.failure,events:snapshot.events,publicOutputs:snapshot.publicOutputs
}));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=x=>JSON.stringify(x,null,2);
const pre=x=>`<pre>${esc(typeof x==='string'?x:pretty(x))}</pre>`;
const details=(label,x)=>`<details><summary>${esc(label)}</summary>${pre(x)}</details>`;
const table=(headers,rows)=>`<div class="table-scroll"><table><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const labels={iterative_roster_decision:'军表与临时 Plan 共同决策',teach_framework_learn:'建立 Teach 质疑框架',teach_framework_agenda:'为当前方案提出具体质疑',teach_framework_investigate:'针对质疑查询事实／构建假设实验',teach_framework_query_recovery:'修复工具请求',teach_framework_query_delta_recovery:'按失败位置修正请求／求解合法摆放',teach_framework_synthesis_step:'读取已存证据／汇总／修正引用',teach_framework_synthesize:'汇总证据与取舍',initial_plan:'生成正式 Plan',teach:'计划 Teach',final_plan_review:'来源审核'};
const rows=[{number:0,roundKind:first.receipt.roundKind,publicOutput:first.output,receipt:first.receipt,at:firstStatus.requestStartedAt}];
rows.push(...trace.filter(e=>e.kind==='model_output_boundary'));
const phaseMetrics=new Map();
for(const r of rows){
  const metric=phaseMetrics.get(r.roundKind)||{calls:0,input:0,output:0,latencyMs:0};
  metric.calls++;metric.input+=r.receipt.usage?.inputUnits||0;metric.output+=r.receipt.usage?.outputUnits||0;metric.latencyMs+=r.receipt.latencyMs||0;
  phaseMetrics.set(r.roundKind,metric);
}
const checkpoints=trace.filter(e=>e.kind==='product_checkpoint');
const providers=trace.filter(e=>e.kind==='actual_provider_request');
const errors=trace.filter(e=>e.kind.endsWith('_error')||e.kind==='observer_stop'||e.event?.type==='round_failed');
const blobEntries=[{key:'first',body:gzipSync(JSON.stringify(await read('prompt-001.json',source))).toString('base64')}];
for(const p of providers)blobEntries.push({key:'p'+p.physical,body:(await fs.readFile(path.join(run,p.file))).toString('base64')});
const blobMap=Object.fromEntries(blobEntries.map(e=>[e.key,e.body]));
const changes=[];let previous=null;
for(const {at,view} of checkpoints){
  if(previous?.revision===view.revision&&JSON.stringify(previous.publicPlan)===JSON.stringify(view.publicPlan))continue;
  const oldUnits=new Map((previous?.selectedUnits||[]).map(u=>[u.unitInstanceId,u]));
  const newUnits=new Map(view.selectedUnits.map(u=>[u.unitInstanceId,u]));
  const added=[...newUnits].filter(([id])=>!oldUnits.has(id)).map(([,u])=>u);
  const removed=[...oldUnits].filter(([id])=>!newUnits.has(id)).map(([,u])=>u);
  const modified=[...newUnits].filter(([id,u])=>oldUnits.has(id)&&JSON.stringify(oldUnits.get(id))!==JSON.stringify(u)).map(([id,u])=>({before:oldUnits.get(id),after:u}));
  const fields=Object.keys(view.publicPlan?.strategy||{}).filter(k=>JSON.stringify(previous?.publicPlan?.strategy?.[k])!==JSON.stringify(view.publicPlan.strategy[k]));
  changes.push({at,revision:view.revision,stage:view.stage,mineralSpent:view.mineralSpent,
    previousMineralSpent:previous?.mineralSpent??null,added,removed,modified,changedStrategyFields:fields,
    publicPlan:view.publicPlan,decisions:view.decisions,blockingFinding:view.blockingFinding});
  previous=view;
}
const state=status.journey||checkpoints.at(-1)?.view||{};
const stageNames={selecting_roster:'军表与初步计划共同形成',arrival_schedule_required:'等待进场审计（暂停投影）',
  auditing_arrival:'用规则器审计分回合进场',checking_public_arrival:'将实际进场结果回填计划',
  starting_locked_teach:'形成正式 Plan',teaching:'正式计划质疑与修订',promoting_agent_plan:'保存完整正式计划',
  reviewing_source:'核对规则来源与事实',qualifying_source_review:'裁定审核问题是否成立',
  quantitative_framework_teach:'逐项定量质疑与证据调查',evaluating_reviewed_teach_feedback:'选择器处理已审核的质疑',
  replanning_from_source_findings:'依据来源问题重新规划',source_review_completed_clean:'完整流程通过最终门禁'};
const fieldNames={scoreRoute:'得分与取胜路线',rosterRationale:'单位、升级和替代方案的取舍',mapRationale:'地图路线与控制资格',
  openingSequence:'开局顺序与支付窗口',opponentHypotheses:'对手假设',counterPlans:'应对与改计划条件',revisionReason:'本轮公开修订理由'};
const revisionOverview=changes.filter(c=>c.revision>0).map(c=>{
  const actions=c.decisions?.filter(d=>d.revision===c.revision).map(d=>d.decisionKind)||[];
  const explanation=c.added.length||c.removed.length||c.modified.length
    ? `本步提交军表变化，规则器记录 ${c.mineralSpent}/2000 分；同步修改计划。`
    : c.changedStrategyFields.length ? `军表不变；修改${c.changedStrategyFields.map(k=>fieldNames[k]||k).join('、')}。`
    : actions.includes('query') ? '执行查询，结果进入同一会话；本步没有提交新的军表或计划。'
    : actions.includes('repair_needed') ? '本次返回未获提交，进入产品自身的结构化纠错；不算策略进展。'
    : '保留当前军表与计划，进入下一产品阶段。';
  return [c.revision,actions.join(' / '),`${c.previousMineralSpent??0} → ${c.mineralSpent??0}`,explanation];
});
const fixes=[
  ['观察器续跑文件重名','恢复时再次写不可覆盖的初始快照，观察器报 EEXIST；发生在新模型请求之前。','每次恢复使用独立分段文件；原快照、请求、费用不覆盖。','同会话续行记录保留全部计数。'],
  ['预备队静态摆放错误（v321）','存活但尚未进场的 Marauder 被连续性检查当作非活动棋子，返回输入错误，模型误解释成间距不够。','只读假设场景投影上场状态；实际进场规则不放宽，已摧毁棋子仍拒绝。','真实源 RED→GREEN；真实 Teach 随后取得 3 个摆放候选、0 miss。'],
  ['早期 Teach 重入（v322）','相同军表每次改计划或查资料，都可能再次调查全部八个轴；11轮未知数反复而不收敛。','早期反馈留作修订依据；同军表继续选择流程，改军表才重新早期调查。最终当前计划 Teach／来源审核不跳过。','实际 r13→r14 重现失败后定点通过，旧问题没有被自动关闭。'],
  ['汇总读取丢当前 Plan（v322）','无状态请求中，读下一批回执后，先前读过的 Plan 被 latestPages 替换，模型容易沿用旧批评。','每次汇总固定携带当前 Plan 原文，明确其为模型意图而非规则事实。','真实 Plan 在下一次回执读取后仍逐字保留；单次定点检查通过。'],
];
const rawStyles=(await fs.readFile(path.resolve('docs/reports/roster-plan-debug-v319/index.html'),'utf8')).match(/<style>([\s\S]*?)<\/style>/)[1];
const fmt=n=>Number(n||0).toLocaleString('en-US');
const verdict=status.status==='completed'?'本次生成流程已到干净审核终态':status.status==='running'?'生成仍在进行：不是最终验收版':'本轮已停止：尚未完成生成';
const toolEvents=experience?.events?.filter(e=>e.kind==='tool_observation')||[];
const teachDetails=teachSnapshots.map((t,i)=>{
  const receipts=[...t.initialEvidence,...(t.investigation?.evidence||[])];
  return `<article><h3>Teach ${i+1} · 对应军表 revision ${t.revision} · ${esc(t.status)}</h3>
  <p>实际阶段：${esc(t.phase)}；初始查询 ${t.initialEvidence.length} 条；调查补充回执 ${t.investigation?.evidence?.length||0} 条。完成 Teach 不等于所有战略假设已证实，以下逐项保留未知及修订意见。</p>
  ${table(['问题','首次查询状态','当前处理','公开结论／修改依据'],(t.agenda?.questions||[]).map(q=>{
    const initial=t.initialEvidence.find(e=>e.challengeId===q.questionId);
    const answer=t.synthesis?.answers?.find(a=>a.questionId===q.questionId);
    const ledger=t.issueLedger?.questions?.find(a=>a.questionId===q.questionId);
    return [q.question||q.claim||q.questionId,initial?.unknownReasonCode||initial?.status||'未执行',ledger?.status||answer?.disposition||'进行中',answer?.publicReason||ledger?.publicReason||'尚未汇总'];
  }))}
  ${details('每条工具回执的状态与不可用原因',receipts.map(e=>({questionId:e.questionId||e.challengeId,
    requestKind:e.requestKind,status:e.status,unknownReason:e.unknownReasonCode,
    usableForClaim:e.evidenceReadiness?.usableForClaim,receiptHash:e.receiptHash})))}
  ${details('模型提出的 Plan／军表修改',t.synthesis?{plan:t.synthesis.proposedPlanChanges,roster:t.synthesis.proposedRosterChanges}:'尚未形成汇总')}
  <p><a href="teach-${i+1}.json.gz">下载本轮完整查询、回执、公开回答与纠错记录（JSON.gz）</a></p></article>`;
}).join('');
const stageLines=checkpoints.filter((e,i,a)=>i===0||e.view.stage!==a[i-1].view.stage||e.view.stoppedReason!==a[i-1].view.stoppedReason);
const calls=rows.map(r=>{
  const ps=r.number===0?[{physical:0}]:providers.filter(p=>p.number===r.number);
  const promptButtons=ps.map(p=>`<button data-prompt="${p.physical===0?'first':'p'+p.physical}">展开完整实际 Prompt${ps.length>1?' · 派发 '+p.physical:''}</button>`).join(' ');
  return `<details class="call"><summary>模型请求 ${r.number+1} · ${esc(labels[r.roundKind]||r.roundKind)} · ${(r.receipt.latencyMs/1000).toFixed(2)} 秒${r.publicOutput.kind?' · '+esc(r.publicOutput.kind):''}</summary><p>时间 ${esc(r.at)}；输入 ${fmt(r.receipt.usage.inputUnits)} / 输出 ${fmt(r.receipt.usage.outputUnits)} tokens。以下是模型公开原文，不等于其结论已被规则器确认。</p>${promptButtons}<div class="prompt-view"></div>${details('完整公开回复与理由',r.publicOutput)}${details('响应回执',r.receipt)}</details>`;
}).join('');
const evidence={status,source,run,modelRequestCountIncludingFirst:status.physicalRequests+1,
  publicResponseCountIncludingFirst:rows.length,changes,stageChanges:stageLines.map(e=>({at:e.at,stage:e.view.stage,revision:e.view.revision,stoppedReason:e.view.stoppedReason})),errors,
  harnessLoopUsed:true,targetGames:['starcraft-tmg'],promptPackRoutes:[...new Set(rows.map(r=>r.roundKind))],
  harnessToolsCalled:toolEvents.map(e=>e.query?.kind),uiTraceEvidence:'本轮通过Web/App共用产品HTTP入口；未宣称有游戏UI操作截图',
  agentDecisionEvidence:'每次实际Provider请求、公开回复和版本变化；不展示隐藏思维链',memoryTraceEvidence:'当前会话的observations/iterations/Teach证据',
  trainingTraceCandidates:[],rollbackOrDemotionRules:'未解事实与未执行步骤不标通过；旧A–F不启动',
  userVisibleChecks:'可展开完整实际Prompt、公开回复、落盘变化和错误；代码流程图复用已验收原件',
  teachSnapshots:teachSnapshots.map((t,i)=>({snapshotId:t.snapshotId,revision:t.revision,status:t.status,phase:t.phase,file:`teach-${i+1}.json.gz`}))};
evidence.finalPlan=finalTeach?.plan||null;
evidence.finalSourceReview=finalTeach?.planReview||null;
evidence.engineeringFixes=fixes;
let html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>写表与 Plan · 连续单步实录 v320</title><style>${rawStyles}.call{margin:18px 0}.prompt-view:empty{display:none}.prompt-view a{display:block;margin:10px 0}.timeline{border-left:3px solid #90becf;padding-left:18px}.timeline article{padding:14px 0;border-bottom:1px solid #dce5ee}</style></head><body>
<header><div class="eyebrow">TICKET 27 / SLICE 272 · 同一会话连续单步实录</div><h1>从空军表到 Plan：实际执行记录</h1><p>${esc(verdict)}。每一条记录来自本次真实执行，保留首次调用和后续输入／输出，不重新购买第一个答案。</p><span class="badge pending">${esc(status.status)} · revision ${state.revision??'—'} · ${state.mineralSpent??0}/2000 分</span></header>
<nav><a href="#state">当前结论</a><a href="#journey">执行路线</a><a href="#changes">军表与计划变化</a><a href="#calls">逐次 Prompt / 回复</a><a href="#tools">工具与错误</a></nav><main>
<section id="state"><h2>${esc(verdict)}</h2><p>Terran Armed Forces 对 Kerrigan's Swarm；同一冻结 Standard 2000 分与 standard-d6-1 地图；原 A–F 保持暂停，没有启动对局。</p><div class="stats"><div class="stat"><b>${status.physicalRequests+1}</b><span>实际派发总次数，含第一环节</span></div><div class="stat"><b>${state.mineralSpent??0} / 2000</b><span>当前已提交军表分数</span></div><div class="stat"><b>${fmt(status.usage.inputUnits+first.receipt.usage.inputUnits)}</b><span>已返回的累计输入 tokens</span></div><div class="stat"><b>$${(status.estimatedCostUsd+0.030978126).toFixed(4)}</b><span>冻结价表估计；未知费用另留，不是发票</span></div></div>
<p>当前阶段：<code>${esc(state.stage)}</code>。停止原因：<code>${esc(status.failure||state.stoppedReason||'无')}</code>。报告快照时间：${esc(new Date().toISOString())}。费用与已返回数量不包含仍在等待的未知答案。</p><div class="notice">T27 5/6；T23 33/36；余 S272 / S248 / S249 / S250 共 4 Slice。模型说“合法”不是规则器裁决，初步 Plan 不是正式验收。报告不会把尚未运行的后续步骤标成成功。</div>${details('当前产品旅程状态',state)}</section>
<section id="journey"><h2>本次真正走过的路线</h2><div class="timeline">${stageLines.map(e=>`<article><b>${esc(e.view.stage)}</b><p>revision ${e.view.revision} · ${e.view.mineralSpent??0}/2000 分 · ${esc(e.at)}</p>${e.view.stoppedReason?`<p>停止：${esc(e.view.stoppedReason)}</p>`:''}</article>`).join('')}</div><p><a href="../roster-plan-debug-v319/workflow.html">查看完整代码流程图（复用已经验收的原图，未重跑图形检查）</a> · <a href="../roster-plan-debug-v319/index.html">查看第一环节原始报告</a></p><p>图是系统完整流程；上方时间线才是此次真实经过的阶段。每一轮公开解释在下方逐次请求中可查。</p></section>
<section id="changes"><h2>军表与 Plan：先写了什么，后来改了什么</h2>${changes.map(c=>`<details><summary>revision ${c.revision} · ${c.previousMineralSpent??0} → ${c.mineralSpent??0} 分 · 新增 ${c.added.length} / 移除 ${c.removed.length} / 修改 ${c.modified.length} 个单位</summary>${table(['变化','实际内容'],[['新增单位',c.added.map(u=>u.unitInstanceId+' / '+u.recordKey+' / '+u.compositionKind).join('\n')||'无'],['移除单位',c.removed.map(u=>u.unitInstanceId).join('\n')||'无'],['修改单位',c.modified.map(u=>u.after.unitInstanceId).join('\n')||'无'],['策略字段变化',c.changedStrategyFields.join(', ')||'无'],['模型公开修订理由',c.publicPlan?.strategy?.revisionReason||'本步没有新计划']])}${details('本版本完整 Plan（模型公开原文）',c.publicPlan)}${details('单位、升级与动作详情',c)}</details>`).join('')}${experience?details('终态军表／选择计划', {candidate:experience.finalCandidate,plan:experience.finalSelectionPlan}):'<p>运行尚未结束，暂未导出终态军表和经验。不会用中间候选冒充最终成品。</p>'}</section>
<section id="calls"><h2>每次实际请求：完整 Prompt、公开回答与理由</h2><p>按钮在浏览器本地解压已经保存的请求，不访问模型或网络。原 prompt 与模型原文保留；中文用于解释步骤，不伪造翻译后的“原始输入”。这里没有隐藏思维链。</p>${table(['阶段','已返回次数','累计输入 tokens','累计输出 tokens','响应耗时合计（秒）'],[...phaseMetrics].map(([kind,m])=>[labels[kind]||kind,m.calls,fmt(m.input),fmt(m.output),(m.latencyMs/1000).toFixed(1)]))}<p>响应耗时不包括本地查询、暂停及记录器重启时间；不同阶段的请求可能交错，不等于整段墙钟时间。</p>${calls}${providers.length>rows.length-1?'<p class="notice">还有请求未取得完整公开回复；具体派发状态见当前运行状态和错误记录。</p>':''}</section>
<section id="tools"><h2>工具结果、工程错误与自修复</h2><p>下方直接读取产品已保存的 Teach 快照，区分初次查询失败、后续调查和最终意见；历史失败不隐藏。每轮完整查询与结果另附压缩档。外层写表工具来自最近一次经验导出，可能早于当前运行状态。</p>${teachDetails}${toolEvents.map((t,i)=>details('外层工具 '+(i+1)+' · '+t.query?.kind+' · '+(t.receipt?.status||t.receipt?.resultStatus||'查看回执'),t)).join('')}${errors.length?errors.map((e,i)=>details('边界错误记录 '+(i+1)+' · '+(e.code||e.event?.code||e.kind),e)).join(''):'<p>截至此快照尚无捕获的传输／模型边界失败；不代表工具没有返回未知或失败。</p>'}${details('已知费用、未知费用与阶段索引',evidence)}<p><a href="evidence.json">下载结构化报告索引</a> · 原始运行目录：<code>${esc(run)}</code></p></section>
</main><footer>仅观察同一产品流程；没有手工补军表、Plan、证据或审核答案。所有原费用与回复保留。生成仍须通过实际规则和来源／Teach 准出。</footer>
<script type="application/json" id="prompts">${JSON.stringify(blobMap)}</script><script>
const prompts=JSON.parse(document.getElementById('prompts').textContent);document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',async()=>{const panel=b.parentElement.querySelector('.prompt-view');if(panel.dataset.loaded===b.dataset.prompt){panel.hidden=!panel.hidden;return}try{const bytes=Uint8Array.from(atob(prompts[b.dataset.prompt]),c=>c.charCodeAt(0));const decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();const parsed=JSON.parse(decoded);const p=document.createElement('pre');p.textContent=JSON.stringify(parsed,null,2);const a=document.createElement('a');a.textContent='下载此完整 Prompt JSON';a.href=URL.createObjectURL(new Blob([p.textContent],{type:'application/json'}));a.download=b.dataset.prompt+'.json';panel.replaceChildren(a,p);panel.dataset.loaded=b.dataset.prompt;panel.hidden=false}catch(e){panel.textContent='本地解压失败：'+e.message}}));
</script></body></html>`;
html=html.replace('<main>',`<main><section id="chinese-overview"><h2>先看中文逐步总览</h2>
<p>这是实际执行记录，不是设计草图。每一行对应一次已落盘版本；点开后面的同版本详情可看完整军表、Plan 和公开理由，再到逐次请求核对原始 Prompt。</p>
${table(['版本','实际操作','矿分变化','本步做了什么'],revisionOverview)}
<h3>哪些错误已经修复，依据是什么</h3>${table(['问题','真实表现','改了什么','验证依据'],fixes)}
<h3>完整产品阶段</h3><div class="timeline">${stageLines.map(e=>`<article><b>${esc(stageNames[e.view.stage]||e.view.stage)}</b><p>版本 ${e.view.revision}；${esc(e.at)}；${esc(e.view.stoppedReason||'无停止原因')}。</p></article>`).join('')}</div>
<p>早期 Teach 完成只表示质疑与证据交接完成，不能代替最终验收。旧失败保留在历史中，只有对应的新事实才能解决问题；不把旧记录中的 unknown 改成成功。未来骰子／对手选择是条件假设，不是尚未修好的规则接口。</p>
${finalTeach?`<h3>最终正式 Plan 与审核</h3>${details('正式 Plan（不是选择阶段临时 Plan）',finalTeach.plan)}${details('最终来源审核原始结果',finalTeach.planReview)}<p><a href="final-plan.json">下载完整正式 Plan</a></p>`:'<p>尚无最终正式 Plan，通过前不会展示“完成”标识。</p>'}</section>`);
await fs.mkdir(out,{recursive:true});
if(finalTeach?.plan)await fs.writeFile(path.join(out,'final-plan.json'),pretty(finalTeach.plan));
for(const [i,snapshot] of teachSnapshots.entries())await fs.writeFile(path.join(out,`teach-${i+1}.json.gz`),gzipSync(JSON.stringify(snapshot)));
await fs.writeFile(path.join(out,'index.html'),html);
await fs.writeFile(path.join(out,'evidence.json'),pretty(evidence));
await fs.writeFile(path.join(out,'artifact.json'),pretty({generatedAt:new Date().toISOString(),run,
  reportSha256:createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html),
  completedGeneration:status.status==='completed',unchangedMacroDiagram:'../roster-plan-debug-v319/workflow.html'}));
console.log(JSON.stringify({report:path.join(out,'index.html'),status:status.status,requests:status.physicalRequests+1,responses:rows.length,changes:changes.length,errors:errors.length,bytes:Buffer.byteLength(html)}));
