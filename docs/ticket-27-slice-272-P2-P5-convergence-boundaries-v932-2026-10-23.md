# v932：负结果事实、局部关闭审核与执行权交接

T27 / S272，P2/P4/P5。2026-10-23。此文随实际执行补充，不代替正式完成验收。

## 本轮最终结论：工程修复已验证，真实策略收敛验收不通过

**B同一工作流停在event7958/r15，paused、0在途，PID8983已正常退出。** A未启动，军表仍2000分/9单位；正式Plan0/6、新对局0/12，T27 5/6、T23 33/36，余S272/S248/S249/S250四片。不重建/清账/盲重启，不把本轮改引用当策略提升。

实际第三次关闭审核`47091c7b…`给出3项supported、无局部未解；event7937因此写入`optional_comparison_closed`，流程也确实推进到`product:teach:r15:subject-v1`。这证明调度可以离开旧循环，**但不证明理由正确**。逐项核对发现High误放行：作者`3fe809ce…`的`comparisonClosureRequest.whyNoFurtherEvidenceNeeded`仍说“小Marauder未超过足以支持替换的阈值”，而862/809/866实际为2.583333−2.055556=+0.527778，超过0.5。审核认可数值，却漏查其决策理由中的相反解释；“拒绝腾出190分”也没有具体说明牺牲哪个组件和相应收益。保留军表可以成立，但不能用这个错误理由通过。

**High H-CLOSURE-FALSE-POSITIVE-V935，尚未修复/准出**：来源方向和作者理由的逐条对应仍依赖长段模型复核，存在错误肯定。不是网络失败，也不是读不到证据；已核真实请求`cdf0538a…`使用`optional_comparison_closure`且没有旧相反指令。按三轮收敛规则安全停止，不发第四审核，不改写模型原件，不将错误闭合状态当正式验收。已开始的下一Teach读取完成后停下，未启动对局、未发布Skill或最终Plan。

下一修复交付应是：把**被采用的事实断言、证据中的精确主体/配置/指标/方向、战略取舍**分开验证，针对这条真实误放行注入，证明错误理由被返回作者、正确保留与正确换表均能通过；再做一次明确修复后的受控真实验证。不得仅再加“仔细阅读”提示、重写编号、延长轮数或由Host替模型选择军表。

本轮5条定点脚本共15组最终通过，均针对实际故障，已通过的命令不重跑；真实收敛验收不通过仍如上。10次新真实调用：输入1,315,260、输出19,237、合计**1,334,497 provider units**；Provider记录延时合计121.573秒（不是端到端耗时）。账单金额本轮未取得，不以units冒充实付；所有旧账保留。

最终diff范围：10个生产文件（原生负事实、Journey重验、关闭合同、问题分类、角色输入、共享graph、Run同步、比较有效性、周期投影、核心证据绑定），5个具体bug调试脚本；本报告、CURRENT_WORK、根TASKS/PROJECT_MEMORY同步。未安装依赖、删除文件、创建子代理、提交Git或运行全量验证。

## 本次目标

用户要求整体修复后验证收敛，而非再修两个错误码就宣称完成。依序验证：

1. 真实原生拒绝是否可以作为有限范围的事实引用，旧付费回复能否无重买恢复。
2. 局部关闭审核是否只处理本次选择及其必要依赖，全局未解是否仍保留。
3. 作者能否选择有依据保留，审核完成后旧实验不再抢跑/重开。
4. 实际流程能否离开本比较并推进剩余必要问题；修改Plan版本/篇幅不算策略提升。

## 来源与真实失败

同一B目录`build/slice272-product-generation-v645-8aBuEV`，同产品工作流`decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，从event7727/r13恢复；2000分、9支单位。A与对局未启动。

最后三次事实角色均返回`conclude / answered`、0新workOrders、0unresolvedQuestions，仍因证据1061的`/queryRepair/nativeRejection/rulesErrorCode`被同一个校验拒绝。不是这三次又发起新的实验。

1061的外层是失败tool-attempt/interpretation，但内部保存了原生Builder的`starcraft_tmg_army_builder_rejection_receipt_v1`，精确候选因`ARMY_MINERAL_BUDGET_EXCEEDED`被拒绝，原件`084b503b…`。旧事实通道只允许成功tool_receipt，导致真实负结果无法在相应字段提交；纠错又未交代这种来源的正确使用范围。

另一已证根因：旧关闭审核的**真实请求**`acceptance_stage_contract.stage=current_scoped_strategy_experiment`且`currentAuthorizedMeasurementsRequired=true`。通用入口仅因存在`comparisonPurpose`就要求完成原实验全部测量，与本阶段“审核是否可以选择不继续测量”冲突。全局问题随后被复制到每条局部检查。

## 实施

- `roster-native-fact-claims-v1.mjs`：复用原Builder拒绝回执验证器，核对原生正文与保留副本一致，只允许当前、实际已读、值匹配的候选身份/拒绝原因字段；记录`observationKind=rules_rejection`、`combatResultProduced=false`。不把整份失败数据改成成功，不接受unknown/传输错误为非法事实，不证明所有替换不可行。
- 同模块与`roster-decision-product-journey-v1.mjs`：只对这类实际旧失败、无在途、精确来源和值符合的新合同，排一次原付费回复语义重验；所有读/Schema/来源/覆盖门照常执行。保留旧失败、回复、费用和次数，0重复模型/Native调用。
- `roster-comparison-closure-v1.mjs`：把本次选定问题与全局未决分开交付。旧队列的下一新请求也使用同一运行时合同，旧请求原件不改。数值方向复用原`projectRosterMeasuredComparisonMeaningV1`，显式保留双方单位/武器、目标、差值和阈值，不另造算术或自动选策略。
- `roster-review-data-questions-v1.mjs`、`roster-workflow-read-role-v1.mjs`：关闭审核/反馈作者使用`optional_comparison_closure`阶段，先于一般实验验收路由；只审当前取舍所依赖的主张，不自动把全局未解当局部障碍，也不自动消除任何全局问题。仅满预算仍不是充分取舍理由。
- 无Plan绑定且选择retain的真实合同路径：去掉提前要求必须有新提交的判断，保留后续实际作者输入、当前Plan/revision和retain回执一致性检查。保留不应强迫制造一次文案提交。
- v931已通过的独占审核/明确反馈优先调度直接复用，未重跑其门禁。

## 验证边界

`scripts/debug-slice272-convergence-boundaries-v932.mjs`使用当前真实失败原件与内存异常注入，生产状态不写。

- [RED](../build/slice272-v932-boundaries-red.json)：真实拒绝字段被拒绝；retain无提交路径被误拒；新的恢复与局部范围接口尚缺（这两项RED是接口缺失，不冒充完整行为复现）。
- [一次GREEN](../build/slice272-v932-boundaries-green.json)：四组通过；包含错值、伪造回执、过期来源、未实际读、越界读取战斗结果、在途恢复拒绝和错误Plan身份拒绝。
- 0模型/Native/生产状态写。无全量构建、依赖安装、删除、旧门重跑、子代理或提交。此处不证明真实模型已收敛。

## 实际执行与 v933 调度修复（进行中）

PID64149，同产品命令`run-slice272-product-generation-v645.mjs --mode editable --resume <原B目录>`，日志`build/slice272-v932-convergence-live-1792726857494.log`。

事件7728已排原付费回复重验，明确不重买；事件7733先派发关闭审核的作者反馈角色，旧事实分支未抢跑。真实新请求已收到`comparisonAdjudication.version=2`与`optional_comparison_closure`、关闭操作仍可用。首轮返回申请关闭并修改用途，但仍有算术解释/取舍论述问题，目前处于实际读取后确认，**未判通过**。

v932实际到event7793/r14后自动停止：`ROSTER_WORKFLOW_INVESTIGATION_HANDOFF_INVALID`。提交只改`componentPurposes`里的当前Builder引用，军表未改，不是策略提升；负事实旧回复重验尚未完成就被新Plan退休，不能声称已真实通过。作者仍把小Marauder胜出0.5278的结果写成未达到有利替换阈值，关闭请求尚不合格。

**v933根因与修复**：同步器先过滤superseded调查者，再选“最后一个”，退回了仍保留事实的旧`frontier-return:84a959e0465098db`。其对应战略frontier已被Plan更新退休，却再次被交接。`roster-workflow-graph-v1.mjs`现统一先选最新负责人，再判断状态/依赖；`roster-decision-workspace-run-v1.mjs`的同步、内部返回、显式返回三处共用。保留事实可读，不等于恢复旧任务执行权，不放宽核心身份/新鲜度校验。

新增仅复现本错误的`scripts/debug-slice272-retired-owner-v933.mjs`。两次夹具错误（误选历史目标、未排除无关Native恢复）如实保留；修夹具后真实产品同步复现旧分支重发导致的`question-directory`身份冲突，与线上交接错误同源。生产修复首轮出现局部变量重名，定点改名后**一次GREEN三项**：实际r14同步不重启旧调查、显式返回同边界、冷恢复不复活旧frontier。内存检查点，0Provider/Native/生产写。结果`build/slice272-v933-retired-owner-{red,green}.json`；v932已过门未重跑。

原B **PID81336**，`build/slice272-v933-convergence-live-1792727798943.log`同产品续行；不重建房间或军表，不重发已成功请求，不清历史/费用。最终真实收敛与新增用量待观察。T27 5/6、T23 33/36，正式Plan0/6、对局0/12；剩余S272/S248/S249/S250共4片。

## 后续真实验证

### v934：真实请求中残留的相反指令

v933确实越过r14旧交接错误，event7817的真实审核原件`329cb363…`已生成。但它仍错读“未超过阈值”作为保留理由，并把两个全局necessary_fact、两个author_decision放回第三项局部检查，故未通过。检查真实请求`00be22cf…`发现，虽然已交付v2局部合同，末尾通用userMessage仍包含`A specifically authorized experiment still needs its promised measurements`和保留所有未知的要求；另一个`current_comparison_validity_contract`还禁止把原测量转为可选。不是新合同完全未送达，而是多层指令相互冲突。

已在来源统一修正：`roster-review-data-questions-v1.mjs`按已验证adjudication生成局部问题指令；`roster-comparison-purpose-v1.mjs`同阶段只检查本选择依赖的已测事实和未测边界；`roster-workflow-read-role-v1.mjs`不再给关闭审核通用全局/实验完结指令，作者反馈同用范围解释。未删全局账、不修改旧回复、不通过文字关键词代替事实审核。

实际角色请求捕获RED→**一次GREEN三项**，结果`build/slice272-v934-closure-prompt-{red,green}.json`；真实输入不变、输出Schema/来源门不旁路。另从同断点发现周期投影也先过滤旧owner，并仅统计evidence_ready审核，Plan更新可能清零三轮上限。`roster-hypothesis-cycle-v1.mjs`改用同一最新owner，累计实际完成审核包括已退休版本，读资料轮次不计为审核；实际状态/注入第三审核RED→**一次GREEN两项**，`build/slice272-v934-cycle-{red,green}.json`。无已过门重跑。

原PID81336已在一次已开始的作者读取完成后安全停到event7832/r14，0在途。现原目录同产品 **PID99820**，`build/slice272-v934-convergence-live-1792728863945.log`继续，旧成功请求不重发。真实作者/审核结果待，本轮不因测试通过宣称收敛。

### v935：消除 Builder 引用追赶循环

新作者提交r15仍只把Builder编号1385改1439，没有军表/部署/路线/行动顺序变化。对比r13/r14/r15发现三份Builder原件都为同一`545fe4c0…`，候选也是同一`219675ec…`；但证据注册绑定了Plan，导致旧编号在每次Plan更新后又成historical，诱发下一轮“更新引用”。这是事实依赖建模错误，不是新规则或军表变化。

`roster-decision-workflow-v1.mjs`在唯一发布入口与冷恢复入口共用`builderFactScope`：只对原生、完整可验的Builder合法回执且candidateHash与army绑定完全一致，移除无关Plan依赖；保留`planningBindings`作为原发布来历，所有内容/编号/其余依赖原样保留。伪造/不同军表或规则来源不获得当前事实资格，旧Plan叙述本身也不会变成当前Plan。复用现有原生回执验证，不增加新的模型批准。

实际r13审计RED→**一次GREEN三项**：旧编号跨Plan保持current；新发布/重复发布同规则；军表变化、篡改回执和错误候选不放行。`scripts/debug-slice272-builder-fact-scope-v935.mjs`及`build/slice272-v935-builder-{red,green}.json`，0Provider/Native/生产写。v934已过门不重跑。

PID99820在event7885/r15、0在途安全退出。原B **PID8983**／`build/slice272-v935-convergence-live-1792729337214.log`续行，实际已完成事实范围保留并开始第三次关闭审核。审核结果待；不把r15当策略改善或正式准出。

## Harness记录

- harnessLoopUsed：true；targetGames：StarCraft TMG。
- promptPackRoutes：事实实验、战略决策、局部独立审核；同产品Run/Provider。
- harnessToolsCalled：保存证据读取、原回复重验；未为验收制造新战斗回执。
- uiTraceEvidence：本轮走同产品后端恢复入口，未新增浏览器验收，不能算新Web验收。
- agentDecisionEvidence：原件保存于本B工作流；仅公开理由，不导出隐含思维链。
- memoryTraceEvidence：全局必要问题与条件实验分离，未写入真实对局记忆。
- trainingTraceCandidates：未晋级，trainingTruth=false。
- rollbackOrDemotionRules：负结果被误当战斗成功、全局必要问题被删除、错源或在途被重复执行、局部选择缺有效理由，均不准出。
- userVisibleChecks：真实原表/Plan连续性、闭合比较后的下一个任务及剩余必要未知，不能仅以字段/版本增长计完成。
