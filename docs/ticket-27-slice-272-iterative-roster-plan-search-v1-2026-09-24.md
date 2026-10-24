# Ticket 27 / Slice 272 — 军表与获胜计划共同迭代

状态：设计合同 + 可续暂停的基础接线；**尚未实现计划↔军表迭代搜索**。已有真实 Agent 2000/2000 名单来自旧单体流程，不能冒称本模块产物。固定成表的 v5 Teach/复核是另一条已经生成的证据，不应与从头写表混称。

## 2026-09-25 断网后检查点：Web 写表暂停/续接基础接线

工作台新加 `POST /sessions/:id/pause` 和 Web/App「暂停并保存断点」控件。暂停请求不会中断已经发出的 Flash 请求；安全端口只在下一次发送前拒绝，并把已完成公开回复先持久化。会话随后转 `paused`，保存包含已保留回复 Hash、已结算调用数和未发送下一请求声明的暂停回执；`generate {resume:true}` 继续复用相同上下文/输出合同的已付回复。零回复时从暂停态也可继续实时生成，但不能点「仅本地回放」。取消语义仍独立，Provider 发送结果不明时仍停止、不自动重发。

本次仅改工作台服务、安全发送边界、HTTP、客户端和 Web/App 控件。三处 MJS 和两处 TS/TSX 的聚焦语法门通过；受影响的现有安全适配器门一次通过（假 Worker、0 真实 Provider）。**未做在途付费暂停/恢复实测，也未实现 `IterativeRosterPlanSession` 的模型选查询、分支反证与多轮修表；因此 Slice 272 继续开放**。原 Room Web 驱动与 K3 地图会话不受此修改影响。

## 为什么现有链路不够

当前运行时先生成一次 Foundation，小计划可调用规则、任务、数学、概率、空间和场景实验室，再做一次前置 Teach；随后提出整表候选，交 Rules/Builder 审查，最后比较选择。候选失败后的反馈主要是合法性和矿物差额，不能在同一个持续计划里提出新的查询、试验一个替换分支、因证据推翻得分路线，再修改军表。`maxProposalRounds` 是保护旧流程的临时上限，不是“背包问题搜索三次即可”的策略依据。旧版 9/10 预算合同仅表示最低使用率，不能代替新 Agent 写满 2000 的产品目标。

## 深模块及唯一外部接口

新增一个 `IterativeRosterPlanSession` 模块，外部接口保持 `start/resume/pause/read` 四个操作；Workspace 负责持久化、取消和费用展示，不分别编排每一种工具。模块内部才有 Builder、Skill 只读检索、任务/地图、数学/概率、同场景分支实验与模型适配器这些 seam；它们已经有生产和本地替代 adapter，不复制 Rules 计算。

每个迭代状态保存：不可变任务/来源/地图引用，当前公开胜利路线及反证条件，当前军表及 Rules 审查，预算缺口、Supply/进场和底盘可达摘要，至少一个待查问题或待试替换，已观察分支及其失败原因，模型本轮公开决策，累计费用与已结算调用。所有状态变更产生可回放的 `iterationReceipt`；旧计划与旧回复不覆写。模型不能改 Rules 事实，也不能把未知地图路线升级为“可达”。

一轮允许选择一个或多个互不依赖的只读查询：重读所需 Skill/对抗材料；对军表做添加、删除、组合规模或升级替换的 Builder 审查；用确定性预算组合求解器列出**可行填充/替换候选而不替模型排名**；询问官方任务计分与进场；对指定底盘、指定图和任务点做通路审查；查询伤害概率/火力交换；在同一冻结状态下对明确分支做场景实验。独立查询可并行，Rules 审查必须以当前候选版本为输入，失效旧回执只作历史。模型读回这些回执后须同时提交“保留/推翻哪条计划假设、为什么改表、下一轮要验证什么”。

循环不以固定三轮作成功或失败判据：只在 Rules 合法 **2000/2000**、当前计划绑定该名单、地图/任务未决事项被明确标注、后置复核无 High 时进入 `ready_for_match`。若用户取消、付费上限已到或工具暂不可用，保存断点为 `paused`，下次只续未完成轮；重复相同候选或无进展只告警并请模型换分支，不伪称数学无解。若要证明精确 2000 不可达，必须由完整菜单和限制条件上的确定性可行性/上界证书给出，不能由模型尝试次数推断。

## 两种入口与后续验收

- 从头写表：小计划→查询/替换/反证的持续循环→满额合法名单和最终计划→独立复核。
- 成表写计划：Rules 先锁定名单，不运行替换/填充搜索；保留当前已实测的 Foundation→Teach→深化→复核，地图查询和后续计划修订可共用同一实验室。现有固定表 v5 为 High 0/Medium 0，仍待认证地图路线和真实带计划对局。
- 验收使用真实 Standard-2000、同地图同对手：记录每次候选、Rules 差额、工具证据和计划变更；证明不把 1870 标满额，证明至少一条真实模型路线达到 2000/2000；再与固定表及无赛前计划局比较得分、击杀、行动时间、费用和复盘结论。不要把离线模拟候选当成真实模型产物。

本合同不修改旧 9/10 记录、旧固定表和原 T23 无计划房间；新迭代 session 要单独标版本，旧数据原样可读。下面检查点补入了确定性查询，但**尚未完成**模型持续查询/分支/可恢复暂停模块。

## 2026-09-25 实施缝复核：不能只提高候选轮数

当前 `RosterPlanningWorkspace.startPlanning` 虽能异步开始并保存每轮已付回复，`resume` 也可按上下文/输出合同回放，但其实现仍一次调用单体 `RosterStrategist.planRoster`；`executePlanning` 对 exact-budget 默认传 `maxProposalRounds:3`，运行时在候选循环前就固定 `scoreRoute` 和对手假设。候选之间的预算分支工具仅给下一轮列 Builder 合法替换形状，模型无法用新地图/概率证据正式保留或推翻获胜路线。`cancelPlanning` 把会话标成 `cancelled`，并非用户可查询、可继续的策略暂停。故把上限从 3 改到 12 仍只会重复同一 Foundation 下的整表提案，不能满足“计划↔军表共同迭代”。

实施时以单个深模块 `IterativeRosterPlanSession` 接管新版本会话的 `start/resume/pause/read`；旧三轮流程和旧付费输出不迁移、不静默重解释。该模块在同一版本化状态中原子保存：冻结来源/任务/地图、当前胜利假设与反证条件、已审军表版本、待查问题、Builder/地图/概率/Skill 回执、每轮模型选择、已结算调用与费用。内部每轮先让模型选择查询或换表，互不依赖的只读查询可并行；所有候选重新走完整 Builder，证据返回后模型明确提交 `retain/revise/unresolved` 及下一步，再由宿主写不可变 `iterationReceipt`。外部调用者只需要四个操作，不逐项编排工具。

两种真实 Adapter 已存在或可直接复用：生产的 Keychain→Flash 严格输出与来源绑定的 Builder/地图实验室；本地的保存回复回放与冻结实验室。Provider 发送状态不明时绝不重发；暂停只在已结算轮边界生效，若模型调用在途先收妥或隔离回复，再返回可继续的 checkpoint。`ready_for_match` 必须由当前 Builder 恰好 2000/2000、计划绑定同一候选/地图、进场 Schedule 合法、后置审核零 Critical/High 共同决定，不能从模型自报 `complete` 推断。接口验收应直接从暂停 checkpoint 恢复未结算轮并比较费用/回执，不依赖内部阶段字段。这个缝复核是实施依据，**不是**已完成的新模块或新模型写表证据。

## 2026-09-24 预算分支工具检查点

已在隔离工作树新增 `queryRosterBudgetBranchesV1`，并作为工作台只读 `/sessions/:id/budget-branches` 入口。它从冻结 Builder 菜单生成单步和有界多步候选，以菜单价格距当前矿物缺口的绝对值排序供检索；每个返回的候选仍经过官方完整军表 Builder 审核。`startOffset/nextOffset` 分页同时绑定来源候选和菜单回执哈希，改表或换菜单后的旧游标类型化拒绝；`combinationGenerationTruncated` 与 `exactBudgetImpossibilityClaimed:false` 明确表明局部结果不能证明全局无解。模型策略排序、Plan 修订、Room 改动均不发生。

具体红证：原单步第一页按字母序先返回 `add_unit`，使精确预算升级落到页外；聚焦样本红后修正，绿 `EXACT_BRANCH_FIRST_OK`。真实 Standard-2000 1870/2000 草案由 Marine 多项升级删除形成，单步 Builder 审核前 8 项没有精确候选；多步工具在前 12 项完整 Rules 审核中返回 9 条合法 2000/2000 候选，包括原 5 升级恢复路径。HTTP route 聚焦 `BUDGET_HTTP_ROUTE_OK`。本检查点 0 Provider 调用、0 Room mutation、¥0；不是模型实际写表成功，亦不是组合无解证明。

下一交付仍是 `IterativeRosterPlanSession`：把预算分支、任务/地图/Skill 查询与模型选表和公开 Plan 反证接到同一个可恢复会话，逐轮持久化；停止/重启后只续未结算轮。该模块必须使新鲜真实模型从零产生 Rules 合法 2000/2000 的军表和地图绑定 Plan，再做固定表及无计划对局比较。现有三轮整表流程仍在，**不得将这个工具检查点记为 Slice 272 完成**。

## 2026-09-24 Agent 引导接线（未准出）

新 exact-budget 工作台会话已把确定性多步分支查询接到候选回合之间：当本轮只有欠额合法表时，用完整 Builder 审过的当前候选查询补额/替换，下一轮只给模型与其 `candidate_proposals` 格式兼容的备选形状、价格、步骤与 Rules 回执；模型仍须自行比较对计分路线、单位用途和地图的影响。原始 Builder 输入和内部实例 ID 不进模型的提案模板，算术顺序不构成策略排序。完整分支回执进入会话证据，重放新 exact-budget 会话须匹配当轮上下文哈希；旧会话原样保留。`MAX_PROPOSAL_ROUNDS=12` 只是现有运行时的安全上限，工作台目前仍默认三轮，**不是**本节目标的可暂停持续搜索。

改动文件语法检查通过；一次误选的 269–270 广域门连续运行约八分钟仍未结束，已主动中止，不记作通过且不重复执行。尚未有本引导路径的聚焦模型行为证据、真实 2000/2000 产物、`start/resume/pause/read` 深模块或地图公平准入。因此本节只记录未准出接线，不能把 Ticket 27 记为完成。

## 2026-09-25 真实写表断点：Teach 错层与实验室状态漂移

隔离 `sc1_lost_temple_v1` 样本只验产品写表接线；不是 K3 新语义地图。第一次真实会话 `rws-7d5c35db-6a20-4500-be7c-54983a84f7f8` 完成 Foundation、Challenge、Revision 三次 Flash 调用并保存公开回复，累计估算 ¥0.197140，未产候选。Revision 已付输出根部缺 `answers`，其答案完整地在 `revisedFoundation.answers`；五个 Foundation 字段被放进 `revisedFoundation.scoreRoute`。严格 schema 原样红 12 项；类型化提升器仅在来源唯一且目标缺失时搬运 6 条路径，附原始/归一化输出 hash 和搬运清单，不补文句、不覆盖冲突字段；保存原句聚焦重验 schema 12→0，后续 Teach 语义仍须经过原闸。

同一旧会话零付费重放在 Revision 前先报上下文不匹配：原记录前缀 `7225fc98a2e2`，重放请求 `9a4aa603f47c`。原因是旧产品的共享实验室 core 在 `/catalogue` 与各次运行间累计 `operationCount`/`receiptLog`，Teach 证据证明哈希把历史查询次数带进上下文。新运行改为每次实例化同源只读实验室，最终 mutation-zero proof 也取本次实例；旧付费回复不解除上下文绑定，留为原样故障证据。修后全新会话 `rws-c15ae8e6-c62f-4475-a110-3df80279a6eb` 在第一次 Provider 发送状态不明处停下，未保存可用回复，未自动重试。尚未证明修复链路跑通到候选、2000/2000 或 Plan；此段不是 Slice 272 准出。

随后只对新实验建版本化 240 秒 Flash profile，旧 120 秒 profile 不变。会话 `rws-22880771-f0c9-40af-9b22-4ccd1930ad08` 的 Foundation 与 Teach Challenge 均有完整付费回复（61,199 reported units / 估算 ¥0.103924），但 Challenge 的四个工具 `intent` 长 245/173/219/189，其中两条越过继承自通用工具 schema 的任意叙事长度门，`ROSTER_TEACH_ROLE_OUTPUT_SCHEMA_INVALID`，未进入候选。连同旧会话共两组已知估算 ¥0.301064；中间 ambiguous dispatch 的供应商计费未知。三轮真实生成没有收敛，依用户规定本轮停产。下轮先**离线**系统性处理非语义长度硬门及保存回复恢复，不得只将这两个例子改成特例再继续付费。

Harness observability for this checkpoint: `harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_strategist.multi_round.v1,ticket27.roster_teach.challenge_revision.v1]`; `harnessToolsCalled:[frozen Army Builder, pregame scene laboratory, map evidence port, retained-reply replay]`; `uiTraceEvidence:null` (isolated HTTP experiment, no browser claim); `agentDecisionEvidence:Foundation/Challenge/Revision public paid outputs, no candidate decision`; `memoryTraceEvidence:contextHash-bound retained replies and shared-lab drift diagnosis`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:ambiguous dispatch, source-context mismatch, or Teach schema/semantic failure keeps the session draft/quarantined and never promotes its reply`; `userVisibleChecks:two explicit HTTP sessions and one saved-output 12→0 shape check, but no 2000-point list or Room action`.

Harness observability: `harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_strategist.multi_round.v1]`（本检查点没有触发模型请求）；`harnessToolsCalled:[official Army Builder complete-army audit, roster budget branch query, workspace HTTP adapter]`; `uiTraceEvidence:null`（尚无浏览器实际 Agent 选表）；`agentDecisionEvidence:null`（候选均非模型选择）；`memoryTraceEvidence:contextHash-bound retained-reply seam, no new replay this checkpoint`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:若分页省略精确候选却宣称无解、Builder 回执与候选哈希不符或模型将算术排序当战略评估，则降级此查询，禁止进入赛前 Plan`; `userVisibleChecks:工作台接口返回合法候选与未完成状态；正式 UI/模型旅程仍待验收`。

## 2026-09-25 离线修复：空间工具意图不是自由叙事

上一轮 Teach Challenge 的问题不是单纯 200 字太短：四个主查询的 `toolRequest.intent` 都填了整句，长度 245/173/219/189；只有空间关系查询真正消费 `intent`，其下游仅识别 `overview/engage/.../retreat` 这十个固定意图。原结构合同把它当 200 字普通字符串，长的两项被硬拦，短的即使过合同也会在关系图中静默退化为 `overview`。完整问题实际已有 `questionText` 字段；非空间查询根本不消费该 `intent`。这属于工具参数类型与生成合同未对齐，不是扩大字符串上限能解决的。

本次仅在隔离工作树完成通用修复：关系图导出单一意图枚举，Roster 与 Teach 的版本化生成合同共同引用；Challenger 提示明确完整问题写 `questionText`，`intent` 只选枚举、非空间留空。Teach 传输归一化只清除下游不消费的多余值；空间意图若不是枚举，则附源文本哈希/长度与归一化回执，置为空并由 Teach Evidence Port 返回 `ROSTER_TEACH_SPATIAL_INTENT_UNTYPED` 的 `unknown`，**不执行伪装的 overview 查询**。Roster 主运行时同样将无类型空间意图标成 failed/unknown。原付费输出仍原样留存，不伪造策略或查询答案。

聚焦已保存 Challenge：新 schema 对原文发现 10 项（含所有非枚举意图），类型化归一化五处后为 0 项；空间挑战被隔离为未知证据，模拟 Evidence Port 证明该情形 0 次实验室空间查询。两个聚焦检查均通过，没有新 Provider、Room 或费用。**没有**重启三轮未收敛的真实付费生产，也没有完成 Student Revision、候选军表、2000/2000、地图计划或浏览器验收。下一步应先离线统审其余结构合同和断点，再决定一次明确上下文的新鲜端到端试产，不能把本段当作 Slice 272 结束。

Harness observability: `harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_teach.challenge_revision.v1,ticket27.roster_strategist.multi_round.v1]`; `harnessToolsCalled:[saved paid public output, schema validator, typed spatial-intent interface, simulated Teach evidence port]`; `uiTraceEvidence:null`; `agentDecisionEvidence:原 Challenge 的四个查询意图与独立 questionText，尚无选表动作`; `memoryTraceEvidence:原始/归一化哈希回执与已保存会话继续隔离`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:若无类型空间意图被当成 overview 或未知证据被当作已证策略，则拒绝计划晋升`; `userVisibleChecks:离线 10→0 结构问题和 unknown/0 空间查询，正式对局/写表未验收`。

## 2026-09-25 赛前地图路线查询接入 Teach（非计划准出）

保存的 Challenge 要求判断某底盘从部署区到任务点是否通路，却选择了 `spatial`。旧空间关系图查询场上已摆单位，赛前全员预备队会返回 `no_active_relationships_in_base_state`，无法回答地图通路；产品实验室其实已暴露 Rules 冻结地图的 `routeToObjective`，只是 Foundation/Teach 的查询种类漏了它。最小调用缝红证：`map_route(player1,round_32mm,marker-5)` 在 Teach Evidence Port 原报 `ROSTER_TEACH_EVIDENCE_REQUEST_INVALID`。

现新增版本化 `map_route` 种类和独立 `sideId/baseId/targetId` 字段；不把地图路线混进战场单位的 `spatial` 意图。Foundation 和 Teach 共用产品实验室原有的只读 `routeToObjective`，回执要求来源 state hash 一致；认证结果还要求正式 room-freeze hash 且 `exactMoveOrDeploymentLegality=false`，否则拒绝采信。没有地图口或缺目标时只给 unknown；认证路线仅为半英寸网格近似，不推断确切移动、编队终点或得分时机。旧合同版与已付回复仍保留历史，不静默重绑新字段。

聚焦接口红→绿 `MAP_ROUTE_TEACH_EVIDENCE_OK`，并验证错来源、缺 room-freeze、缺地图口三条失败/未知分支。真实产品门 `node scripts/verify-ticket-27-slice-272-map-evidence-v1.mjs <主仓只读缓存路径>` 一次通过：旧 Lost Temple 工程图有 9 件地形、5 任务点、5 底盘档；选定表路线 `certified_base_clearance_audit`，同冻结图 Teach 路线 `advisory`，缺目标 unknown，mapless 计划仍 draft，Provider 0。隔离工作树默认缓存缺失的首启在进入被测逻辑前 ENOENT，随后以主仓已存在缓存作只读参数运行通过；未重拉官方数据。此证据不覆盖 K3 新 20 图的正式 Room 接线、公平缺陷，也不证明模型真的选用了路线或完成 2000/2000。Slice 272 继续开放。

Harness observability: `harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_strategist.multi_round.v1,ticket27.roster_teach.challenge_revision.v1]`; `harnessToolsCalled:[Rules-frozen pregame map summary, routeToObjective, Teach evidence port, complete-army route audit]`; `uiTraceEvidence:null`（聚焦服务门，无 Web 实操）；`agentDecisionEvidence:保存 Challenge 暴露地图路线问题，尚无新模型选表/计划`; `memoryTraceEvidence:来源 state hash 与 room-freeze hash 绑定回执，历史付费输出不重绑`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:跨地图回执、未认证路线、把网格通路当精确移动或计分均不得晋升计划`; `userVisibleChecks:同图路线 advisory/缺目标 unknown/旧图数据实例，正式 2000 分 Web 对局待验`。

## 2026-09-25 已付回复按输出合同版本隔离

旧工作台的实时 Provider 回执有 `outputContractRef`，但保存到 `publicOutputs` 的可重放回复漏了它。恢复端只比较轮次、上下文哈希与回复哈希；输出合同从 1.5.1/1.0.1 升级后，历史付费回复可能在相同上下文下被误当成当前严格合同的生成结果。这与“旧版冻结、缺依赖隔离”的要求冲突。

现在新付费回复在保存时同时保留精确输出合同引用；重放要求合同 `id/version/hash` 与当前请求完全一致。旧记录仍可展示和审计，但无合同或不一致时零 Provider 重放返回类型化 409，不静默套新合同；若显式接了实时端口，则只从该端口生成新的当前版本回复。不同合同下即使正文与上下文相同，也分别留存，不相互覆盖。具体 bug 门先红（旧无版本回复被误重放），修后一次绿 `RETAINED_CONTRACT_BOUND_REPLAY_OK`；两个改动模块语法门各一次通过。Provider/Room/费用均为 0，已有付费输出原样保存。尚未证明模型能在新合同下生成完整 2000/2000 表，Slice 272 不准出。

Harness observability: `harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_teach.challenge_revision.v1,ticket27.roster_strategist.multi_round.v1]`; `harnessToolsCalled:[retained public reply, exact output-contract reference, read-only replay port]`; `uiTraceEvidence:null`; `agentDecisionEvidence:null`（不进行新决策）；`memoryTraceEvidence:同上下文旧版回复可读但不可冒充新版`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:缺失或漂移的合同引用阻止重放和计划晋升`; `userVisibleChecks:旧版隔离、新版重放一次聚焦通过；正式 Web 写表未验`。

## 2026-09-25 新鲜生成与三轮收敛停止

同一冻结 Lost Temple / Standard-2000 的新鲜会话先在 Foundation 完整返回 8,192 output units 后被判 `ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE`；该调用已返回 32,072 reported units、估算 ¥0.067978。原因是已版本化 Flash Profile 允许 32,768，但 Foundation/候选的请求仍另设 8,192 硬上限。移除 Strategist、Teach、最终复核三处逐轮覆盖，让 Profile 管容量、按实际 usage 计费；受影响模块语法检查各一次通过，旧不完整回复原样留档。

独立新会话 `rws-58722117-8734-4e1e-bd2d-5d7cb98e5061` 完成 Foundation、Teach Challenge/Revision、首轮候选，证明容量修复跨过旧故障。第二轮候选已付回复把同一 `terran-marker-anchor-screen-exact-2000` 行逐字段完整复制两份；原验证器以重复 ID 拒绝整轮。新增独立、带原/结果 hash 的完全同内容去重边界；不同内容共用 ID 仍拒绝，不补策略。具体 bug 门先红→一次绿。服务从同一持久会话重启后，前 **5 轮全部零费用重放**，下一轮比较模型才新计费。该会话累计 **6 次已返回调用、165,862 reported units、估算 ¥0.316233**。

第 6 轮比较输出的 `basisTexts` 明确说选择唯一 Rules 合法且矿物 **2000/2000** 的候选，并给出候选 ID/Hash及地图半英寸路线局限；但结构化 `comparison.selectedCandidateId` 缺失，原严格闸返回 `ROSTER_STRATEGIST_COMPARISON_INVALID:basisTexts,tradeoffTexts`。这是当前 **High 阻塞**，不是模型已成功交付最终计划。已保存原始公开回复、输出合同引用和 Builder 证据；不从叙事文字静默猜 ID、不改写旧答。依三轮收敛规则，本轮在此停下，**不做第四次付费生成或验证循环**。下一轮应设计可核验的唯一原句+候选哈希抽取或独立模型定点纠错，并先以已保存回复零费用复验；任何 ID/Hash 不一致继续隔离。真正可暂停的迭代 `start/resume/pause/read`、K3 正式地图、最终地图计划及 Web A/B 仍未完成，T27 保持 5/6。

本次两条新会话合计 **7 次已返回调用、197,934 reported units、估算 ¥0.384211**；旧轮次已知估算 ¥0.301064 仍保留，另一次历史 ambiguous dispatch 供应商计费未知，不记零。`harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_strategist.multi_round.v1,ticket27.roster_teach.challenge_revision.v1]`; `harnessToolsCalled:[frozen Builder, same-map laboratory, budget branch query, exact-contract retained replay]`; `uiTraceEvidence:null`; `agentDecisionEvidence:六轮公开回复，比较候选尚未形成通过闸的 Plan`; `memoryTraceEvidence:前五轮上下文/合同绑定零费用重放`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:缺失结构化选择、候选哈希冲突或地图来源漂移均禁止晋升`; `userVisibleChecks:容量越界与重复候选两故障已复现并聚焦修复，最终计划/浏览器未通过`。

## 2026-09-25 原句与候选哈希绑定，六轮零付费重放

上一节的唯一选择原句精确写为 `Selected candidate: terran-marker-anchor-screen-exact-2000 (candidateHash c2b03821…008fc64f)`，而结构字段缺失。新恢复器只在该结构键**完全不存在**、`basisTexts` 中恰好一处出现完整 ID+64 位 Hash 引句、且 ID/Hash 唯一匹配 Builder 已评为合法的本轮候选时，补出同一 ID；原付费回复不变，来源路径、原/结果 Hash、候选 Hash 写入类型化恢复回执。多个引句、Hash 错、候选不合法、原字段已存在均不自动修。后续原 `validateComparison` 的预算、组件绑定及其它语义检查照常运行。

具体已保存第六轮复现先红（恢复器尚不存在），改后聚焦门一次绿；变更模块语法检查与 `git diff --check` 各一次通过。独立工作台**不连接 Provider**，用同一草稿、同一旧 Lost Temple 冻结地图执行 `replayOnly=true`；六轮全部为 `replayed`，状态由 failed 到 `planned`，计划 Hash `b2580b24…eb2ec888`，选中候选 Hash 与原句一致，Builder 合法，矿物 **2000/2000**、瓦斯 **170/200**、8 单位／30 模型、总 Supply **13**。`usage` 保留历史 **6 calls / 165,862 reported units / 估算 ¥0.316233**，此次新调用／新费用 **0**，无 Room 动作、无训练晋升。`sessionReceipt.mapEvidenceStatus=certified_route_evidence` 仅证明同冻结旧图的底盘通路网格证据，不证明真实单位移动或地形公平；K3 新图未接入。

这仍不是 S272 准出。计划的公开 Round-1 部署叙述列出两支大 Marine、大 Marauder、Medic、两支 Goliath 与 Raynor，且行动顺序给 8 支单位 Movement，却没有逐轮首次进场的结构化排程；本任务此前真实冻结容量证据为第 1 回合 **6 Supply**，全表 13 不可能同轮进场。需 Agent 明确选择逐轮进场子集，由 Rules 校验容量，并以后置 Teach/一致性复核检查得分、地形路径及可用时间窗，才可向 Room 交接或进行有计划 A/B。当前 `planStatus=active` 只表示现有生成合同通过，**不作为开局可执行或高策略证明**。另缺可暂停的长迭代 `start/resume/pause/read`、正式地图、Web 建房与实战 A/B；Ticket 27 仍 **5/6**。

Harness 本轮：`harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_strategist.multi_round.v1,ticket27.roster_teach.challenge_revision.v1]`; `harnessToolsCalled:[saved paid reply, exact-contract retained replay, Rules-owned Builder, old-map route audit]`; `uiTraceEvidence:null`; `agentDecisionEvidence:原句绑定的模型选择与最终名单，尚无对局动作`; `memoryTraceEvidence:六轮同上下文与合同零付费重放，原文不变`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:引句非唯一、Hash/合法性不符、逐轮 Supply 未证或地图冻结漂移时不得交接/晋升`; `userVisibleChecks:真实原会话已形成 2000/2000 名单，开局排程与浏览器旅程未验`。

## 2026-09-25 最终 Teach 复核的地图路线证据补接线

真实 Standard-2000 草稿已经保存选中军表的 `evaluate_roster_route` 回执，并有相同冻结地图的 `summarize_map` 回执；此前最终 Teach 复核只读取进场日程与计分算术，未读取这些地图证据。对已保存草稿的零 Provider 聚焦门先红：`selectedMapRouteEvidence` 为 `undefined`。现复核仅接纳来源哈希自洽、被计划引用、选中名单哈希与阵营匹配、任务/部署和冻结地图一致、每支单位有底盘档的唯一回执；逐单位交付首次进场回合及对应底盘到任务点的可达性。半寸网格长度只是近似，明确不证明精确移动、部署、编队完整性或当回合得分。缺证据则返回 `unknown`，不从其它候选借路线。

聚焦门改后一次通过 `FINAL_REVIEW_SELECTED_MAP_ROUTE_CONTEXT_OK`，无新模型调用、无 Room 变更、费用 ¥0。复核上下文另立版本；旧付费复核保留为历史并在投影中标旧，不以旧回复静默冒充新复核。当前**尚未**付费运行新版最终 Teach，因此不能声称路线策略审核已经 0 High；也不能声称 K3 新美术地图已接入。下一步在地图来源稳定后执行真实新版复核，并继续 S272 可暂停的 Plan↔军表迭代及 A/B 对局。

Harness observability: `harnessLoopUsed:true`; `targetGames:[starcraft-tmg]`; `promptPackRoutes:[ticket27.roster_final_plan_review.v2]`; `harnessToolsCalled:[保存的选中名单, Rules 冻结地图回执, 最终 Teach 请求捕获]`; `uiTraceEvidence:null`（本聚焦门无 Web 操作）；`agentDecisionEvidence:尚无新版 Teach 输出`; `memoryTraceEvidence:旧复核保留但版本不等时不复用`; `trainingTraceCandidates:false`; `rollbackOrDemotionRules:来源/名单/地图不匹配或近似路线被当作精确行动时禁止晋升`; `userVisibleChecks:真实已付草稿的选中军表逐单位路线进入新版复核输入`。
