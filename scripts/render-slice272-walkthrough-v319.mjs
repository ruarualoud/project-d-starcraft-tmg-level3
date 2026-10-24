// Read-only evidence rendering. Does not call a Provider, execute queries or release a breakpoint.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from '../packages/secure-provider-runtime/provider-pricing-v2.mjs';

const source = path.resolve(process.argv[2]);
const out = path.resolve('docs/reports/roster-plan-debug-v319');
const read = async name => JSON.parse(await fs.readFile(path.join(source, name), 'utf8'));
const [status, setup, request, prompt, reply, before, after] = await Promise.all([
  'status.json', 'setup.json', 'product-request-001.json', 'prompt-001.json',
  'model-reply-001.json', 'state-before.json', 'state-at-model-output.json',
].map(read));
if (status.providerSendCount !== 1 || status.realModelReplyCount !== 1
  || status.breakpoint !== 'after_model_reply_before_execution') throw Error('NOT_THE_APPROVED_FIRST_STEP');
const ctx = request.promptNodes.find(n => n.role === 'frozen_context').content;
const price = priceStarcraftTmgDeepSeekCurrentUsageV2({
  providerId: 'deepseek-openai-compatible-direct', requestedModel: prompt.model,
  reportedModel: reply.receipt.modelVersion, startedAt: status.requestStartedAt, usage: reply.receipt.usage,
});
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty = value => JSON.stringify(value, null, 2);
const nf = value => Number(value).toLocaleString('en-US');
const pre = value => `<pre>${esc(typeof value === 'string' ? value : pretty(value))}</pre>`;
const details = (title, value) => `<details><summary>${esc(title)}</summary>${pre(value)}</details>`;
const table = (head, rows) => `<div class="table-scroll"><table><thead><tr>${head.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const parts = Object.entries(ctx).map(([field,value]) => ({field,characters:JSON.stringify(value).length})).sort((a,b)=>b.characters-a.characters);
const contextTotal = parts.reduce((n,p)=>n+p.characters,0);
const terrainChars = JSON.stringify(ctx.missionEvidence.map.terrain).length;
const ratio = (terrainChars / contextTotal * 100).toFixed(1);
const transport = status.transport.receipt;
const bodyBytes = Buffer.byteLength(JSON.stringify(prompt));
const allPromptText = pretty(prompt);
if (/\b(?:jsk|sk)-[A-Za-z0-9_-]{16,}\b/.test(allPromptText)
  || /"(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|credentialBytes|secret)"\s*:\s*"(?!<REDACTED>)/i.test(allPromptText)) {
  throw Error('REPORT_CONTAINS_A_CREDENTIAL_FIELD');
}
const snapshot = state => ({revision:state.revision,status:state.status,currentCandidate:state.currentCandidate,plan:state.plan,observations:state.observations,pendingDecision:state.pendingDecision});
const evidence = {
  version:319, sourceDirectory:source, generatedAt:new Date().toISOString(),
  scope:'一次真实产品调用；查询执行前停止；不是完整写表验收',
  sessionId:status.sessionId, breakpoint:status.breakpoint, providerSendCount:status.providerSendCount,
  realModelReplyCount:status.realModelReplyCount, promptMetadata:status.prompt,
  responseReceipt:reply.receipt, transportReceipt:transport, frozenPricingEstimate:price,
  rawInputStringCharacters:prompt.input.length, serializedInputValueCharacters:JSON.stringify(prompt.input).length,
  bodyBytes, contextParts:parts, terrainCellCount:ctx.missionEvidence.map.terrain.length,
  terrainCharacters:terrainChars, terrainContextCharacterPercent:Number(ratio),
  before:snapshot(before), after:snapshot(after),
  paidReplyRetainedBeforeBreakpoint:status.paidReplyRetainedBeforeBreakpoint,
  rosterAndPlanNotYetApplied:status.rosterAndPlanNotYetApplied,
  originalAFResumed:false, gamesStarted:status.gamesStarted,
};
const future = [
  ['03 工具与规则','候选菜单与地图摘要；之后可查预算替换、路径、场景／概率等。工具返回事实或明确边界，不代替模型选择策略。','本次已选两项工具，尚未执行。工具结果、修复反馈及下一轮如何消费，留到下一环节。'],
  ['04 草稿共演／早期 Teach','模型提案可同时修改军表和临时 Plan；Rules Builder 验表；合法草稿进入早期 Teach。未满 2000 分可继续，不是最终军表。','后续逐次记录：改了哪些单位、价格差、用途、替代方案、Plan 修订、证据与否决原因。当前没有提案。'],
  ['05 进场安排','满分候选通过草稿阶段后，proposeSchedule → reviseSchedulePublicPlan → prepareTeachHandoff。复核补给、进场与计划对应。','尚未执行；不能把路线见证当作已经合法进场或已经控制目标点。'],
  ['06 正式 Plan','starting_locked_teach → teaching → promoting_agent_plan：把当前候选交接到正式计划流程。阶段冻结用于证据一致性，不意味着 B 永远不能改表。','尚未执行；后续必须展示初稿、Teach 反馈、正式 Plan 的字段差异，不能只展示最终文件。'],
  ['07 来源审核','reviewing_source：把规则／地图／战斗事实声明与来源对应；事实缺口进入调查、证据读取或定点修订。','尚未执行；不把模型自称已证明当成规则回执；不把旧版本资格挪给新版本。'],
  ['08 定量 Teach','quantitative_framework_teach：检验用途、对手假设、取舍与可执行场景；工具负责事实，模型负责战略判断。','尚未执行；必须说明哪些是原生执行证据、哪些是条件假设、哪些仍未解决。'],
  ['09 取舍与修订','evaluating_reviewed_teach_feedback：模型决定保留并论证、改 Plan，或重新打开军表与 Plan；不是质疑一次就必须改策略。','尚未执行；未来逐项跟踪反馈是否真正影响下一决策，原地重复不算进展。'],
  ['10 发布资格','当前军表／Plan／来源与 Teach 版本一致，无阻塞事实缺口；进入 source_review_completed_clean 等实际资格状态后才可对局。','尚未执行；本报告不是最终准出、没有证明策略优于旧版，也没有启动任何对局。'],
];
const localTime = new Date(status.requestStartedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>写表与 Plan 单步调试 · 第一环节</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f3f6fb;color:#18283e;font:16px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}a{color:#086da0;text-underline-offset:3px}header{background:#10273c;color:#fff;padding:38px max(24px,calc((100vw - 1180px)/2)) 32px}header .eyebrow{color:#82dcec;font-size:13px;letter-spacing:2px}h1{font-size:32px;line-height:1.3;margin:12px 0}header p{color:#c8d9e7;max-width:960px;margin:14px 0}nav{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid #d9e2ed;display:flex;gap:22px;flex-wrap:wrap;padding:12px max(24px,calc((100vw - 1180px)/2));font-size:14px}main{max-width:1228px;margin:auto;padding:24px}section{background:white;border:1px solid #dce5ee;border-radius:14px;padding:26px;margin-bottom:22px;scroll-margin-top:90px}h2{font-size:23px;line-height:1.4;margin:0 0 17px}h3{font-size:18px;margin:22px 0 8px}p{margin:10px 0}.muted,small{color:#5f7284}.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:13px;background:#e4f3ee;color:#206451}.pending{background:#fff0d8;color:#865810}.notice{background:#fff5e5;border-left:4px solid #d59831;padding:14px 18px;border-radius:5px;margin:18px 0}.info{background:#eaf5fb;border-left-color:#1683b1}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:22px 0}.stat{padding:18px;border:1px solid #dce5ee;border-radius:10px;background:#f8fafc}.stat b{display:block;font-size:26px;line-height:1.4;color:#125c7c}.stat span{font-size:13px;color:#52677b}.rail{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:0;list-style:none}.rail li{border-top:4px solid #188d86;background:#edf7f6;border-radius:6px;padding:14px;position:relative}.rail li:last-child{border-color:#d59831;background:#fff5e5}.rail strong{display:block}.rail small{display:block;margin-top:8px}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e0e7ee;padding:11px 12px;overflow-wrap:anywhere}th{background:#edf3f8;color:#334f65}pre{background:#102336;color:#deedf8;padding:18px;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:560px;overflow:auto}details{border:1px solid #dae5ee;border-radius:8px;padding:12px 16px;margin:12px 0}summary{cursor:pointer;font-weight:600;color:#1d5777}details pre{margin-bottom:0}code{font:13px ui-monospace,SFMono-Regular,monospace;overflow-wrap:anywhere}figure{margin:15px 0}figure img{display:block;width:100%;height:auto;border:1px solid #dbe4ed;border-radius:8px}figcaption{font-size:13px;color:#5f7284;margin:8px 0}.question{font-size:18px;font-weight:600}.bar{height:12px;background:#e0e9f0;border-radius:8px;overflow:hidden}.bar span{display:block;height:100%;background:#2795b1}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:18px}.links{display:flex;gap:16px;flex-wrap:wrap}.future{border-left:3px solid #b6c5d5;padding-left:18px;margin:22px 0}footer{max-width:1180px;margin:20px auto 45px;font-size:13px;color:#5f7284;padding:0 24px}button{border:1px solid #92adbf;background:white;color:#1d5777;padding:8px 14px;border-radius:6px;cursor:pointer}#prompt-search{width:min(100%,360px);padding:9px;border:1px solid #9cafbe;border-radius:5px}mark{background:#f1d381;color:#15283c}@media(max-width:800px){.stats{grid-template-columns:1fr 1fr}.rail{grid-template-columns:1fr}.twocol{grid-template-columns:1fr}main{padding:12px}section{padding:18px}h1{font-size:26px}nav{gap:12px;padding:10px 16px}header{padding:28px 22px}}@media print{nav,button{display:none}section{break-inside:avoid}pre{max-height:none}header{background:#fff;color:#123}header p{color:#345}}
body{overflow-wrap:anywhere}.twocol>*,.stat{min-width:0}
</style></head><body>
<header><div class="eyebrow">PROJECT D · TICKET 27 / SLICE 272 · DEBUG v319</div><h1>写表与 Plan：第一环节实录</h1><p>一次真实 Flash 请求 → 原始回复保存 → 停在查询执行前。这里分开呈现完整代码流程与已经发生的事实；未执行的环节不标通过。</p><span class="badge pending">按用户要求暂停 · 不自动进入下一环节</span></header>
<nav><a href="#first">本轮结果</a><a href="#trace">逐步实录</a><a href="#prompt">完整 Prompt</a><a href="#issues">发现与讨论</a><a href="#flow">完整流程</a><a href="#evidence">证据文件</a></nav>
<main><section id="first"><h2>先看结论：模型先查资料，还没有选单位</h2><p>它提出：先查人族可用单位、升级、战术卡的价格与槽位要求，再查看地图摘要，用于形成符合 Builder 规则的临时军表。两个查询都属于当前声明可用的工具。</p>
<div class="stats"><div class="stat"><b>1 / 1</b><span>授权请求 / 实际完成</span></div><div class="stat"><b>${(reply.receipt.latencyMs/1000).toFixed(3)} 秒</b><span>Provider 回执耗时；不含初始化与人工停点</span></div><div class="stat"><b>${nf(reply.receipt.usage.inputUnits)}</b><span>输入 tokens / 输出 ${nf(reply.receipt.usage.outputUnits)}</span></div><div class="stat"><b>$${Number(price.calculatedCostUsd).toFixed(5)}</b><span>冻结价表估计；非账单最终费用</span></div></div>
<ol class="rail"><li><strong>① 冻结输入</strong><small>Standard · 2000 分<br>人族 Armed Forces 对凯瑞甘虫群</small></li><li><strong>② 拼装 Prompt</strong><small>当前空表／空计划<br>Skill、任务、地图、工具能力</small></li><li><strong>③ 真实 Flash</strong><small>HTTP ${status.transport.status}<br>没有重发或自动重试</small></li><li><strong>④ 保存回复</strong><small>query：候选菜单＋地图摘要<br>付费结果已在产品存储保留</small></li><li><strong>⑤ 当前停点</strong><small>尚未执行这两项查询<br>军表与 Plan 都没有改变</small></li></ol>
<div class="notice">这不是“生成了 0 分军表”，也不是“Plan 生成失败”：本次动作是 <code>query</code>，空军表／空 Plan 字段是非当前分支的结构化占位。尚未得到完整军表、战略计划或对局资格。</div>
<p class="muted">实际发送时间：${esc(localTime)}（北京时间）。A–F 原任务继续暂停；本次为独立调试数据目录，调用同一产品模块与安全 Provider 路径，不新开对局。T27 5/6；T23 33/36；剩余 S272 / S248 / S249 / S250 共 4 片。最终合格 Plan 0/6，完整实验 0/12。</p></section>

<section id="trace"><h2>第一环节：输入 → 输出 → 落盘 → 下一消费者</h2>
${table(['检查点','实际输入／操作','实际输出／状态','本次判定'],[
['0. 产品创建','POST /iterative/sessions；Standard，2000 分；使用冻结数据和地图','revision 0；currentCandidate=null；plan=null；无历史查询','已实际执行'],
['1. 提示装配','从产品 decisionState、Skill 和 missionEvidence 组成实际 Provider 请求','地图 standard-d6-1，54×36 英寸；任务 Hold Position；工具能力表已送入','已记录完整请求体，不含认证头'],
['2. 网络与模型','deepseek-flash；1 次物理请求；不允许第二次自动请求','HTTP 200；结构化回执 providerSchemaValid=true；322 输出 tokens','本环节无请求或格式错误'],
['3. 模型选择','询问合法候选菜单和地图摘要','kind=query；2 个只读查询请求；尚未返回查询结果','不是候选军表，不是最终 Plan'],
['4. 付费结果保留','产品原生 onEvent 保存原始公开输出与回执','paidReplyRetainedBeforeBreakpoint=true；pendingDecision 指向下一 revision 1','已保存；不是手工伪造或补字段'],
['5. 状态核对','比较模型调用前和回复后的当前军表／Plan','revision 仍为 0；军表和 Plan 均 null；observations 仍空','没有提前应用模型内容'],
['6. 下一消费者','产品的动作解码与 query 执行器','尚未收到调试放行；两个工具尚未执行','待讨论后继续；不能提前标通过'],
])}
<h3>模型实际选择（中文说明）</h3><p>“在 Standard、2000 矿物预算下，Terran Armed Forces 可以使用哪些单位、升级与战术卡？需要其印刷费用和槽位要求，以便为 Hold Position 构造一个符合 Builder 规则的临时方案。”</p>
${table(['查询','实际参数重点','为什么当前可用'],reply.output.queries.map(q=>[q.kind,q.kind==='candidate_menu'?'Terran Armed Forces / Standard；startOffset=0；maximumEvaluations=64':'同一冻结地图；无假设场景',ctx.decisionState.queryCapabilities.queries[q.kind]?.scope]))}
${details('展开：模型原始公开回复（完整，不是人工润色版本）',reply.output)}
<div class="twocol"><div>${details('展开：调用前状态',snapshot(before))}</div><div>${details('展开：回复后、执行前状态',snapshot(after))}</div></div>
<p>本次没有发生产品纠错，军表和计划也没有产生修订。公开回复仅说明查询目标，没有提供完整战略理由；不能替它编造“思考过程”。服务商回执 reasoningOutputUnits=${reply.receipt.usage.reasoningOutputUnits}；本报告记录可审查理由和动作，不展示隐藏思维链。</p>
</section>

<section id="prompt"><h2>实际发送的 Prompt：原文可展开</h2><p>以下内容来自本次已发送的请求体，不是报告另写的理想 prompt。完整输入仍保留原来的英文协议。中文说明仅帮助阅读，不改变原文。</p>
${table(['部分','作用','是否本次确实送入'],[
['instructions','模型角色、JSON 协议、规则器权威、Skill 只作策略建议、允许军表与 Plan 共演','是'],
['decisionState','空军表和 Plan、2000 分目标、冻结上下文、查询能力／前置条件','是；当前 availableQueryKinds 只有 candidate_menu、map_summary'],
['skillGuidance','总规则／通用策略、Terran Armed Forces 本族、Terran→Kerrigan Swarm 对抗方向','是；提供的是策略建议，不能修改规则或等同最终运行资格'],
['missionEvidence','任务计分证据与地图详细几何','是；含 1,804 条编译地形细分记录'],
['userMessage','形成军表与 Plan，查缺失事实，解释选择与替代；只在最终发布要求恰好 2000 分','是'],
['text.format','所有可选动作对应的严格 JSON schema','是；当前 query 分支使用占位空字段'],
])}
${details('01 系统指令原文（instructions）',prompt.instructions)}
${details('02 当前产品任务原文（userMessage）',request.userMessage)}
${details('03 工具能力清单原文（queryCapabilities）',ctx.decisionState.queryCapabilities)}
${details('04 本轮 Skill 选择与版本',ctx.skillGuidance.selection)}
${details('05 输出结构化协议（text）',prompt.text)}
<details id="full-prompt"><summary>06 完整 Provider 请求体：所有 Prompt、模型参数与 schema（约 ${Math.round(bodyBytes/1024)} KiB）</summary><p>可用下方搜索定位内容；完整文件也可直接打开。</p><label for="prompt-search">查找：</label> <input id="prompt-search" placeholder="例如：map_route 或 currentCandidate"><button id="find-prompt" type="button">定位下一处</button><span id="search-result" role="status"></span><pre id="prompt-body">${esc(allPromptText)}</pre></details>
<p class="links"><a href="prompt-001.json">打开完整脱敏请求 JSON</a><a href="model-reply-001.json">打开完整模型回复＋回执</a></p>
<p class="muted">请求体脱敏前后 hash 一致：${esc(status.prompt.originalBodyHash)}。本次请求体没有需要替换的 key；认证头从未进入报告。hash 仅用于核对报告是否为同一请求，不是新增生产拦截条件。</p>
</section>

<section id="issues"><h2>这一环节发现什么，需要讨论什么</h2><h3>发现 1：第一请求就携带了很大的地图明细</h3><p>实际输入 ${nf(reply.receipt.usage.inputUnits)} tokens，其中缓存命中 ${nf(reply.receipt.usage.inputCacheHitUnits)}、未命中 ${nf(reply.receipt.usage.inputCacheMissUnits)}。应用上下文中地形细分列表有 ${nf(terrainChars)} 个 JSON 字符，占各内容字段字符合计的 <strong>${ratio}%</strong>。这不是各字段 token 精确占比，服务商没有逐字段账单。</p><div class="bar" aria-label="地形占上下文字符比例"><span style="width:${ratio}%"></span></div>
${table(['应用上下文字段','JSON 字符数','占字段合计'],parts.map(p=>[p.field,nf(p.characters),(p.characters/contextTotal*100).toFixed(2)+'%']))}
<p>原始 input 字符串 ${nf(prompt.input.length)} 字符；JSON 转义后的 input 字段 ${nf(JSON.stringify(prompt.input).length)} 字符；完整序列化请求体 ${nf(bodyBytes)} 字节。三者口径不同，不应混作 token 数。</p>
<div class="notice info"><strong>判断：</strong>这为后续“地图摘要先给、精确几何按工具查询”的优化提供了具体证据，但一轮不足以证明它导致幻觉或策略退化。本轮没有删几何、没有改 prompt，也没有重跑做对比。</div>
<h3>发现 2：输入已有地图证据，模型又选了 map_summary</h3><p>这是已观察到的查询意图；结果还没有执行，所以暂不能认定它是无用重复。下一环节应比较：工具是否返回与已给内容相同的材料，模型是否利用结果推进军表，而不是重复查询。</p>
<h3>本次没有发现的错误，不补写成错误</h3><p>无 HTTP 失败、无 schema 异常、无未保存回复；没有发生规则调用，不能声称规则调用正确或错误。记录里的 <code>arrivalScheduleStatus: unknown</code> 属于未启用的 Plan 占位，不是已提交计划中尚未解决的进场判断。</p>
<p class="question">先讨论这一环节：先查合法候选再形成初步表／Plan 的顺序是否合理？地图明细应在何处按需进入？</p><p>我的建议是保留“先查候选”的行为，下一步逐项看这两个工具的实际返回与下游消费；地图体积优化单列，不在本次已授权请求中偷偷替换。</p></section>

<section id="flow"><h2>完整流程图：代码地图，不是本轮完成清单</h2><p><a href="workflow.html">单独打开可缩放流程图</a>。图上只有 01 与 02 的首次调用在本次实际走过；03 以后没有新运行证据。下面细化每段应产生的内容和验证边界。</p><figure><a href="workflow.html"><img src="workflow.visual-check.1440x900.light.png" alt="军表与Plan完整代码流程：从冻结输入、共同迭代、工具规则、Teach、进场、正式计划、审核到发布；含恢复分支"></a><figcaption>完整宏观流程，包含早期反馈回路与异常恢复。A 固定军表走 preset 分支，只生成／修订计划；B 走可编辑军表分支。不是把 A 强行套入 B 的选表入口。</figcaption></figure>
${future.map(([name,action,verification])=>`<div class="future"><h3>${esc(name)} <span class="badge pending">待实际逐步观察</span></h3><p>${esc(action)}</p><p class="muted">${esc(verification)}</p></div>`).join('')}
<h3>异常分开处理，不混成一段“再试一次”</h3>${table(['类别','要保留什么','恢复／判定原则'],[
['网络／服务异常','请求派发状态、已收到内容、费用是否未知','区分未派发与结果不确定；不能因为本地超时就假定未计费'],
['格式／结构异常','原始付费回复、具体字段诊断','纠错只针对输出协议；不能手工编造策略或规则回执'],
['工具输入／能力异常','查询、参数、原生反馈、能力前置条件','交给模型可操作的修复反馈；不把无结果变成“不可达／不可能”'],
['证据／来源异常','原场景和绑定、请求与结果、声明归属','引用要对应当前场景及版本；事实 unknown 不得改标通过'],
['存储／消费者异常','已完成回复、旧提交、未提交新状态','先落盘再发布；恢复复用已完成结果，不重新购买同一答案'],
])}<p>以上是代码与此前定点测试的工作边界；本轮尚未触发这些恢复分支。此前累计 49 个受控案例通过，不等于本轮端到端或所有异常都已证明。</p>
</section>

<section id="evidence"><h2>证据、验证与交付范围</h2><p class="links"><a href="evidence.json">本轮证据索引＋状态差异</a><a href="prompt-001.json">完整 Prompt</a><a href="model-reply-001.json">实际回复</a><a href="workflow.json">流程图源文件</a><a href="workflow.visual-check.html">流程图多尺寸截图</a></p>
${details('费用估计：仓库冻结价表，不代表今日报价或服务商发票',price)}
${details('实际网络阶段耗时（仅本次请求）',transport.transportProgress)}
${details('实际代码入口与证据位置',{sourceDirectory:source,sessionId:status.sessionId,breakpoint:status.breakpoint,entry:'packages/product-composition/roster-planning-product-module-v1.mjs',http:'packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs',draft:'packages/roster-strategist/iterative-roster-plan-session-v1.mjs',provider:'packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs',agentJourney:'packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs',presetJourney:'packages/roster-planning-workspace/preset-roster-journey-v1.mjs'})}
<p>本轮修改仅增加单步观测脚本、证据报告与流程图；没有修改生产策略、规则或模型 prompt。Archify 用于生成并检查流程图，调试技能要求逐项区分实际事实、未执行步骤与推断。</p><p>图形结构验收 9/9，showcase 排版无错误或警告，四种桌面尺寸自动浏览器检查通过。图形检查只证明报告可读，不证明对局或写表业务通过。</p><div class="notice">当前断点保持。不会自动执行查询、继续 Teach、恢复原 A–F 或启动对局。下一次讨论应从本报告第一环节继续，而不是重新初始化。</div></section>
</main><footer>Project D · 2026-10-17 · 第一环节实际报告 v319。全文仅包含公开输出与脱敏请求。未发生的策略、修复和最终结果不补写。</footer>
<script>
let offset=0,last='';document.getElementById('find-prompt').addEventListener('click',()=>{const q=document.getElementById('prompt-search').value;const el=document.getElementById('prompt-body');const node=el.firstChild;if(!q||!node)return;const text=node.textContent;if(q!==last){offset=0;last=q}let at=text.indexOf(q,offset);if(at<0)at=text.indexOf(q);const status=document.getElementById('search-result');if(at<0){status.textContent=' 未找到';return}const r=document.createRange();r.setStart(node,at);r.setEnd(node,at+q.length);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);const rect=r.getBoundingClientRect();el.scrollTop+=rect.top-el.getBoundingClientRect().top-70;offset=at+q.length;status.textContent=' 已定位字符 '+at;});
</script></body></html>`;
await fs.mkdir(out,{recursive:true});
await Promise.all([
  fs.writeFile(path.join(out,'index.html'),html),
  fs.writeFile(path.join(out,'evidence.json'),pretty(evidence)+'\n'),
  fs.writeFile(path.join(out,'prompt-001.json'),allPromptText+'\n'),
  fs.writeFile(path.join(out,'model-reply-001.json'),pretty(reply)+'\n'),
]);
const manifest={generatedAt:new Date().toISOString(),source,files:await Promise.all(['index.html','evidence.json','prompt-001.json','model-reply-001.json','workflow.html','workflow.json'].map(async name=>{const b=await fs.readFile(path.join(out,name));return {name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}))};
await fs.writeFile(path.join(out,'artifact-manifest.json'),pretty(manifest)+'\n');
console.log(JSON.stringify({report:path.join(out,'index.html'),physicalCalls:status.providerSendCount,breakpoint:status.breakpoint,promptBodyBytes:bodyBytes,terrainContextCharacterPercent:Number(ratio),costEstimateUsd:price.calculatedCostUsd}));
