# T27 / S272：优先完成“哪个更好”的比较（v693–696）

施工记录，不是最终中文生产报告。T27 5/6、T23 33/36，相关余 S272/S248/S249/S250 四片；正式 Plan 0/6、对局 0/12。

## 当前优先级

用户最新要求：工程问题收口后，重点完成 Teach／假设收集原本要服务的“哪个更好”。当前主线为有效局部对照 → 实际取舍 → 军表／Plan 采纳或有依据保留 → 受影响复审。P6 发布／记忆桥的已实现代码保留，暂不扩展其余房间接线。

## 后续入口：v713新鲜同产品试产

本文件两条旧Run已真实结束且均未准出；不再追加其调查或审核。v712的自然round4一次续行真实生效，请求8327…收到明确阶段和两必要问题，但实际781ff…仍workOrders=[]／未测却answered，随后NO_READY_WORK终态。这证明提示分型不足，不是策略改善。v713已在正常语义纠错增加原件身份信息进展门，真实已付费答复无Provider重放RED→一次GREEN。

**只从[新当前入口](ticket-27-slice-272-product-fresh-debug-v713-2026-10-20.md)继续**：修复版两条新鲜产品生产，保留本文件所有失败／费用／旧轮次，只读参考，不继续续修巨型历史。正式数字仍0。

## 历史 v712：缺事实调查与文字纠错不再同义

**固定PID7212**，日志`build/slice272-product-generation-v712-fixed.log`；89488已经真实网络派发未知终态，不因观察超时重启。当前唯一新未知为第三次来源修订的claim5请求，按既有产品至多一次受控恢复，旧未知费用保留；其余成功审核不重买。现写77605仍第三轮语义停止，不恢复。固定旧map_and_arrival/plan_continuity三轮停点仍保留，不据本次修复宣称放行。

实际问题：`...method:288957f57a0080a9`连续三次source-revision都留下回火必要未知，却仅重写结论／读同一出火回执，workOrders=[]。原工厂虽泛称可做新实验，却把来源矛盾和新增测量缺口同样交成“修订原结论”，缺少角色当前阶段与精确问题集；这不符合P2/P3分工要求。

v712新增纯投影`roster-experiment-source-repair-v1.mjs`，只复制真实审核的dataQuestions分类及来源。necessary_fact进入missing_fact_investigation；answered_fact不重证；future/optional保留；requires_revision的文字矛盾另列待纠正。旧无分类requiredData只作明确遗留必要问题，不靠关键词重新分类。Host不判对手策略、不给战术偏好，审核仍可被原文反驳。

同一个投影接入正常工厂与read-role请求：新工单保存sourceRepairStage；已排队旧修订在下一正常请求同样获得阶段，不重写旧已付费请求。缺事实时当前任务先查已有必要证据或发真实workOrders；不能把“未知／inconclusive”重述当新测量；具体能力缺失可blocked，确需新战略目标可strategy_required。事实齐后再修文字／作原问题结论，仍走独立审核。原必要问题、父目的、场景边界、合法性和输出Schema均不变。

三轮后只允许一次明确来源修复续行：须是同scope/evidence_ready、无pending、当前真实审核仍有必要事实、实际旧作者请求没有source_review_repair_stage，且同experimentGoalId未消费本修复。自然round3→4，controlledSourceRevision记录source-review-fact-routing-v712；不是清零或新三轮，round5不再准许。未完成的网络审核不冒充语义负判／不触发此额度。

门`verify-slice272-source-repair-phase-v712.mjs`使用实际重复文字修订和原审核：普通修订未分型RED→一次GREEN。原工厂和正常请求均收到具体必要回火问题；原必要项和轮数保留，网络pending不当语义重试，0Provider/Native/生产写。没有重跑v710/v711或旧门。该门证明接线，真实是否触发有效反制测量仍须观察；第四次受控修订的正向实际边界尚待网络审核返回后验证，不以本门冒称完整生产成功。

正式Plan0/6、对局0/12、T27 5/6/T23 33/36／余4不变。

## 历史 v711：概率对象不能被“仅标量”投影静默丢失

**固定PID89488**，日志`build/slice272-product-generation-v711-fixed.log`，同原workflow/r12；77606已当前操作后保存paused/failure=null且精确确认终态。现写原77605仍为第三轮语义停止，不重启、不清零。

固定正常自动审查发现真实误报：`...method:288957f57a0080a9:source-review:v2:claim:3`，原件`d89bb69a…`称来源不存在probabilityTargetDestroyed、作者把期望损失误作概率。查同一个Native原件`f3bcd659…`，三个武器的outcomes实际分别有完整probabilityTargetDestroyed对象，percent为0/1.01/0，并含value/successes/denominator=198/uncertainty95。作者此次这组数值本来正确；不能让纠错把正确策略数据删掉。

根因：`roster-experiment-source-facts-v1.mjs`的每攻击outcomes只复制scalars，概率是小对象而被过滤；顶层exchange太大也没有完整内联。当前structureProjectionVersion=1又让旧视图被认为已完整补充，审核没再读原文，误把“没有内联”当“源不存在”。这不是模型效果不足或原生概率算法错误。

v711将现有完整小结构保留规则下沉到每攻击测量字段，不按概率字段逐个补丁：小型对象／数组逐值复制，完整保存概率/分母/置信区间；大字段不丢原件、用逐字段目录暴露所有真实key/type/pointer/inline状态。显示阈值沿用8192字节，不限制执行或数值。sourceFacts版本5／structureProjection版本2，正常read-context会从已注册原件补充旧不可变视图，不改旧付款请求、旧输出或旧视图。Native计算、反应排除、null、单位／武器身份和证据范围不变。

门`verify-slice272-probability-source-projection-v711.mjs`使用实际错误审核输入与Native原件：概率对象undefined真实RED→一次GREEN。完整三组概率／置信区间逐值相等；正常请求构造对实际旧v4视图送达当前补充，原件与旧视图不变；0Provider/Native/生产写。未重跑v710或其他已通过门。真实作者后续确认／必要回火测量仍待，不能据此算军表Plan通过。

成表现已实际得到：marker1/5控制、marker3无contestant；三个互斥武器各自伤害／Supply损失期望，不能求和作同时攻击。来源审核保留必要回火代价问题；已有局部场景工具支持preservePositions并显式切换假设activeSideKey，但尚无模型实际完成的该反制测量。不把条件授分当真实得分，不把unknown改0，也不手工构造测量答案。正式Plan0/6、游戏0/12、T27 5/6/T23 33/36／余4不变。

**v711真实采用观察**：产品正常发布`...return-fire-exchange:v5`，原件`347abe18…`三组完整概率percent=0/1.01/0；原作者请求`02e12754…`的exact_read_results也实际含原生probabilityTargetDestroyed对象，不只是目录／测试捕获。其返回`71b1b08d…`保留正确概率，同时仍承认回火代价未测，未改军表／Plan。随后正常第三轮来源修订明确识别剩余回火必要事实，正在读取实际每攻击子块；精确PID89488仍live/running，旧unknown/审核轮数不清。暂不能声称已经发起或完成新反制测量。

## 历史 v710：完成结果／总体取舍也必须消费同一效度合同

**现写PID77605／固定PID77606**，日志`build/slice272-product-generation-v710-{editable,fixed}.log`。原71641/71642已当前操作后保存、精确确认终态；两journey均paused/failure=null后，同两原workflow/r16/r12续行，未新开实验或清零账／轮数。

实际新证据：v709下现写最终比较`comparison:plan-r16:round3:study-contract-v4`返回`c9930823…`，两个check均supported/requiredData空；它明确承认未测火力／消灭，却按作者“marker不更高”的局部refutesIf认为比较成立。after-study的实际决策也据此retain。该输出不是策略验收证据：原目的要求作用后收益，窄端点不能回答原问题。

检查真实请求`51004988…`发现：原目的正文确实已送达，普通最终判据也在，但v709 helper遇`comparisonResult`提前返回null，并仅覆盖实验／来源角色；完成结果和总体决策反而漏掉更明确的共享合同。这是本次修复的明确来源缺口，不把模型错误直接当新的规则事实。

v710删除上述提前返回、把同一合同覆盖到实际strategy_decision，保留原输出字段/checkIds与同一设计标准。最终比较合同升级5：旧乐观回复不改、不可据旧合同准出；正常产品调度仅对同一旧轮次追加一次修正合同的审核（suffix validity-contract-v5），不重置三轮。新合同真实三轮失败仍停止，不给无限额外循环。

门`verify-slice272-completed-comparison-validity-v710.mjs`用实际r16乐观审核及实际owner输入，经正常请求构造：缺合同RED→一次GREEN；两角色在含comparisonResult时收到共享标准，旧回复保留但不能放行，原轮数保留。0 Provider/Native/生产写；v709或其他已通过门未重跑。下一观察真实新合同审核及原方法是否补到有决策意义的作用后测量，不能把接线通过当策略已提升。

正式Plan0/6、游戏0/12、T27 5/6/T23 33/36、余4仍不变。

### v710真实模型效果与停止边界

真实新合同审核`...comparison:plan-r16:round3:validity-contract-v5`返回`e257a5ec…`：comparison_design=requires_revision、strategy_comparison=needs_evidence，明确指出“X或Y收益，Y即时不变但X未测，结论只能inconclusive”。它不再把作者的refutesIf当权威；还正确区分条件控点查询与真实授分。真实请求和模型行为已证明合同有效影响了判定，不等于比较本身完成。

现写77605已在第三轮负判按正常产品停止：`three_comparison_review_rounds_without_convergence`，不清零、不再追加同一审核。固定77606仍live/running，无failure，继续原方法。此时不允许按旧v4乐观判定进入P6。

再查原生前态：源`e5b796ca…`（原inspect1581）在父态`59e98630…`明确显示Orders目标`player1-branch-815c9d5c7cef`的activatedPhases movement/assault/combat全false。实际Orders回执`d37f65cd…`的stateChanges只包含cardResources/log/identityPolicy/useHistory，没有pieces变化。也就是说本实验未先建立“已激活、移除后可再次行动”的状态；不能把Native接受支付当已形成有效再激活处理。该结论来自精确保存前态与实际变化，不是调低收益权重，也不修改规则合法性。后续有效实验需由模型在正常工具链中形成并检查真正作用前置／后继，不由工程手补已激活状态或伪造火力。

## 历史 v709：设计效度提前交付，不等最终审核才指出观测终点错误

**现写PID71641／固定PID71642**，日志`build/slice272-product-generation-v709-{editable,fixed}.log`。原52968/52288已当前操作后保存并精确确认终态；同两原workflow/r16/r12继续。现写在after-study决策发生一次新请求派发未知，使用既有产品一次受控恢复；保留原请求、未知费用及旧轮次，不重买已成功回复。固定从安全暂停点继续。

实际问题：独立来源核对虽然指出缺少作用后火力／消灭时点，作者修订仍主要换引用；部分审核又仅按作者自己过窄的refutesIf支持局部反驳。这不足以回答原目的。原有最终`comparison_design`判据已要求观测跨过收益实现阶段，但没有在早期实验规划／来源核对请求中直接交付。

v709把既有两项比较义务移到`roster-comparison-purpose-v1.mjs`作为单一来源，原cycle保持导入及再导出接口；正常read-role请求在有当前comparisonPurpose时，把同一个设计效度判据提前交给experiment_planner与final_review。保留各角色原输出字段／checkIds，不新增审核角色，不指定战术选择。作者自己的反驳条件可被质疑；只测Y即时不变、X未测，不能反驳“X或Y有收益”；局部几何方法完成也不能冒领父比较完成。原数据、模型原话、审核轮次和旧pending请求不改。

定点门`verify-slice272-early-comparison-validity-v709.mjs`使用实际弱审核checkpoint及正常请求构造器：缺早期合同RED→修复后一次GREEN；共享最终判据、普通无目的检查不变、无战术偏好／无新增checkIds。0 Provider／Native／生产写。未复跑任何已通过门。它仅证明真实请求构造接线，不能证明模型已采用正确方法或策略已优化；下一观察新请求实际消费及作用后观测。

### 顶层预期的实际来源（按本次记录核对）

- 初始写表／Plan角色`product:initial-army-and-plan`确实读取了总策略、Terran本族和当前对抗三个Skill正文。
- 本次原Teach及purpose角色没有直接重读这些Skill正文。purpose原件`6cb19b68…`明确引用的是Raynor官方单位源11和当前Plan摘要1462，而非某条Skill已证结论。
- 模型由“当前Plan只把Raynor作被动支援”与“Orders有主动能力”提出可检验替代：同CP条件下主动用法可能提高火力／控点兑现。其expectedBenefit明确是方向性、未测假设；不是工程预设收益、官方保证或已经实测的增益。当前Plan有Skill的间接影响，但不能说这次假设已直接核对Skill。
- 合理的知识来源关系是：Skill提供策略候选，当前Plan／任务／对手限定问题，官方源与Native确定机制及合法性，局部实验判断是否兑现。Skill只作可反驳先验，不能作通过证明；有疑点应按需读取对应段落，不再每次灌入全部Skill。

正式Plan0/6、对局0/12、T27 5/6／T23 33/36、余4不变。P4真实比较／P5收口仍未通过，本节不是最终生产报告。

**v709实际续行观察**：精确PID71641/71642均live，两个journey均running/failure=null。现写原after-study决策已返回evidence_ready，正常进入`comparison:plan-r16:round3:study-contract-v4`，不是新开一轮或最终通过；固定继续原`source-revision:strategy-frontier`。作用后收益和最终比较判定仍须核对，不能据恢复成功增加正式产物数。

## 历史 v706–708：修复实际送达饥饿与晚到修复竞争，同版继续

**现写PID52968／固定PID52288**，日志`build/slice272-product-generation-v708-{editable,fixed}.log`；先精确ps。原19650/19353已各自真实故障终态，过渡现写49320已在作者确认返回后安全保存终态。两个原Run/r16/r12继续，无新房间，无旧审查轮次清零。

### P2/P5：取回不等于送达，旧前缀饿住了新来源

实际父方法`...study:method:9fb3246ac365b292`已成功fetch23个读取，却连续11次调用后因`evidence_not_read 1589`三轮停止。用原读取状态重建正常read-context：11/814/816/1246/1252/1572/1573/1581/1589九个来源均fetched read，却都没有正文实际送达；包括仅2403字节的Raynor源。256KiB窗口按历史顺序反复装前缀，新来源永远在窗口之外。因此校验正确拒绝，缺口是传输调度，不是缺事实、模型完全不读或应放宽引用门。

v706在现有`roster-workflow-read-context-v1.mjs`稳定优先尚无已送内容的来源／新选精确子块，优先容纳小块，再处理重复根上下文。没有改正文、删旧资格、把fetch升为read或给策略加权；大数组仍保持未送达导航。门`verify-slice272-fresh-read-delivery-v706.mjs`用实际父方法：**RED小来源未送达→一次GREEN**，九个原饥饿来源全部有真实交付内容，旧资格/原值保留，未送数组未批准；0Provider/Native/生产写。

v707增加同模块的精确恢复判定，并接入原产品revalidate/recovery流程：仅对已完成的evidence_not_read耗尽、没有pending、当前绑定有效、原请求确未交付但新窗口确可交付且实际fetch成功的源缺陷，按版本/工作ID一次恢复。使用原`resumeRoleCorrection`让作者收到正文后重新确认，不重验旧回复凑通过；原三轮与收费留在failureHistory/calls，仅追加一个无效结果额度，不开启新三轮。门`verify-slice272-read-delivery-recovery-v707.mjs`：缺恢复RED→一次GREEN，策略错误、未取回来源、未知pending不会被当同类恢复，0生产写。未重跑v706或旧门。

**真实采用**：产品已记录`read_delivery_recovery_queued`，精确affected=[1589]。实际新请求`361093266b88c20d4b16447798f2f4f119b7e8326f4eb0849a392a402868962d`的citation_access包含11与1589，exact_read_results也实际包含两者正文。作者12th reply返回`bc64a7f01f1359c1f4d89b7fa1baa47f6154efaf748bc16fb477b53020f90d54`，该work变evidence_ready；没有人工补字段、修改回复或绕过来源门。

**这份返回尚不构成策略通过**：作者按即时A/B控点5:2相同给refuted_under_conditions，同时承认未测攻击／消灭时点，并把这些留成未来另行授权。原目的要求作用后收益，故目前不能据此宣布哪个更好／保留被动定位已获证明。下一由现有独立来源/覆盖、目的绑定比较审核实际驳回/修订；不能人工改其答案或提前算完成。

### P1/P5：同一问题的第二条成功回执晚到，不应停止整个产品

固定表实际终态`ROSTER_WORKFLOW_REPAIR_RESOLUTION_INVALID`：原supply-exchange已由一条成功路径解决，同tick的旧快照又让另一条同问题成功修复尝试resolve。两条回执真实存在，不是新模型格式错误；v702防重复派工没有删除此前已存在的并行历史。

v708在唯一工作流状态机中补幂等竞争处理：仅当先前resolution仍绑定实际第一条成功原件、两者都当前有效且晚到者有明确同题repairFor/choiceFor时，保留第一条绑定并返回lateReplacementWorkId/resolutionChanged=false。晚到原件独立保留，不覆盖、不丢弃、不升为另一种语义，不用它证明原题完成。旧scope／无关来源仍拒绝；没有放宽正常修复准入。

门`verify-slice272-late-repair-result-v708.mjs`：真实两个成功回执重建原子命令，**RED原错误码→一次GREEN**，先绑定不变、晚到事实保留、旧规则/无关题仍拒绝，0Provider/Native/生产写。未重跑v707或旧门。固定同Run已按正常产品启动v708，不手改workflow文件或重放前缀。

当前正式Plan0/6、对局0/12、T27 5/6／T23 33/36、相关余4。重点仍为收益对照及其真实纠错，不扩P6。上述是施工/故障证据，不是最终中文产物报告。

### v708 已观察到的独立核对

精确ps：现写52968／固定52288均live，两个journey running、无failure。固定已实际越过`REPAIR_RESOLUTION_INVALID`停点，继续marker-control联合场景，不重放旧5条攻击成功回执。

现写bc64…结论已自动进入`...study:method:9fb3246ac365b292:source-review:v2`。原子审核claim0支持即时5:2相同；claim1要求补负向比较的实际依据；假设审核`f2cc4efbd701bdd6a401df9a9dfb9db908c84aa552f5d994da2c3ab15bffd601`虽标签supported，却保留必要requiredData：同CP/几何下是否有更早消灭/退出控制范围时点或更高火力兑现。该条不能算通过；产品仍awaiting_source_review、comparisonExperimentAccepted=false。根覆盖审核在执行，下一应将真实缺口交回方法角色修订；不能由人工清空requiredData、把标签当批准或据此启动对局。原子审查将“局部即时相等”解释为局部refuted存在过窄解释风险，最终目的绑定设计/收益两项仍须独立成立。

## v705：成功的幂等读取不再变成工具失败

当前现写 **PID19650**、固定 **PID19353**，日志`build/slice272-product-generation-v705-{editable,fixed}.log`。旧12486/12524均在当前操作完成后安全保存终态。两原Run/r16/r12继续，不重置旧费、未知、审核或方法计数。现写已真实产生`...study:order0:returned-summary`并返回父实验`...study:method:0f90539a4a2e30c7`（batch1），不是仍只有首条摆放请求；实际比较仍待。

P3/P5新工作流的真实失败原件`d0647b7292261412d85a9d7dcd5c431fad05ce7b95d1eccb7d1d3080e3d763d7`：inspect实际成功，父态/实参/完整返回与原件`2d14e4ea61205ffc4b098fd25f0fd537ce6f84775f23c095dfe60d647bad2491`相同，但Host因`newObservation=false`改为`returned_to_model/repeated_inspection_without_new_information`，又触发多层几何修复。这不是模型读不到状态，也不是该读取非法；是把“没有新增证据”和“操作失败”混用。

在现有workflow executor删除这个误报分支及仅供其使用的旧repair helper（无第二套处理）。仍执行当前只读inspect并比较完整持久化传输，避免仅凭stateHash隐藏新版合同；完全相同则保留`queryReuse.newObservation=false`和原来源身份，成功依赖继续。既有批次progress仍负责告诉父角色本批没有新观察；不据重复读取批准实验。unknown/error、输入错误和真实后置条件失败仍按原链停止。

门`verify-slice272-idempotent-inspection-v705.mjs`用这次真实失败和原成功回执，经正常executor：**RED returned_to_model→一次GREEN**。覆盖原完整读成功、原件相同/无新观察明确、无伪造queryRepair；显式错误phase后置仍失败；同stateHash但capabilities合同改变会作为新信息，不藏新合同。3次只读inspector夹具调用，0Native／Provider／生产写。未重跑v704或其他已通过门。

下一只跟踪父实验的有效实际收益→来源／覆盖→Plan取舍→比较复审，不把此工程修复当策略提升。正式Plan0/6、对局0/12、T27 5/6／T23 33/36／相关余4不变。

### v705 同版实际运行观察

- 精确ps确认现写19650、固定19353仍live，两个journey running、无failure，r16/r12不变。观察超时不是终态，不能再开writer。
- 现写在有效4单位局部场景执行了2CP Orders后，A/B原生marker-5查询均ok，双方合格争点Supply均5:2，awardedVictoryPoints=false；不是旧的敌方不合格5:0。A/B工具结果分别`a8d7aa05aed97b21e27425f93ad137dc2ea6912e0a11792c0a31e3cbf205f07b`、`1747321dce436e669860ee8437b1ebbaa607f5bcc25c71cb42dfec63058a2e48`。没有攻击后的收益观测，不能用即时相等推断Orders不值得。
- 实际汇总`534707acf580a6ed7f7e0759e336667db000fc33f383eddafc6e32e7c4c37c5f`明确说明收据仅证明支付／事件／静态控点，火力兑现、消灭／逼退时点和最终取舍仍needs_evidence。已排入父方法`...study:method:9fb3246ac365b292`，在正常读取/决策中，不是假称比较完成。
- 固定表真实火力交换`b26ec5eb8e9beb00341994aa48acc58933200a4214af5b702ec34038943908ac`已completed/Native ok，包含5条有效攻击估计、0失败；有同一Goliath不同武器备选，不能把5条当5次可同时攻击或直接相加。其场景/控点分支还在收口，不能推出全局VP路线优劣。
- 当前comparisonExperimentAccepted=false，两条都没有发布／实际Plan取舍。无新门禁执行，旧通过门不重跑。

## v704：区域集合格式无损自修复，目的已真实送达

当前现写 **PID12486**、固定 **PID12524**，日志`build/slice272-product-generation-v704-{editable,fixed}.log`。原3266/3268均在当前操作完成后保存终态，两Run/r16/r12继续，不另建房间或实验，不重置旧账／审核／修复代数。

**v703实际采用证据**：真实深层`...apply-joint-wide:observed-choice:order-repair0:order0:solve-joint:input-repair`已发出的请求原件`926281b9d142ad28d3d49c9b8a38226a7660af70bda2c7b02f795f547bd01cef`，包含注册父目的`role:...:purpose:v1`及完整expectedBenefit，局部task仍在，stage实际为`current_scoped_strategy_experiment`。这证明接线已进入生产请求，不是单测结论；不证明模型已完成收益比较。

本次P3具体失败：原`...solve-joint-regions`的失败原件`f9c27d70e4b7c395fa96508ab8f666be052496fefdcc62576e6fabcebdd11709`返回`STATIC_FORMATION_ARGUMENTS_INVALID`。原输入主单位和两个jointUnits各将anchorRegions写成单对象；后续真实模型纠错仅将三个对象各包一层数组，其余参数逐值不变，Native已ok。这种表示层错误不必反复购买模型修复。

扩展现有`roster-formation-query-input-v1.mjs`的集合Adapter（不新增求解／规则实现）：formationObjectives之外，静态主/联合单位的anchorRegions也允许单对象→单元素数组；沿用`prepareStaticFormationAnchorSpaceV1`校验真实区域字段、边界、步长和精度。没有补默认坐标、扩大范围、改权重、挑阵型或吞掉错误。原提交与实际canonical请求、三个精确转换均在inputBindings留存；原合法数组幂等不动。已有objective-only记录继续使用原normalization标签，区域转换另有明确标签。

门`verify-slice272-singleton-anchor-region-v704.mjs`：使用本次实际失败输入和随后真实成功输入，经正常workflow executor到同Native参数验证器，**RED returned_to_model→一次GREEN**。canonical参数与成功原件完全相同；非法step=0仍在调用前由原验证器拒绝；原提交不变。1次Adapter夹具调用，0Native求解／Provider／生产写。未重跑v608、v702、v703或其他已通过命令。

当前仍欠有效收益对照→独立来源／覆盖→实际Plan取舍→比较复审。固定新目的本身提出了过宽的多轮VP预期，实际方法已先选固定场景观察；最终不能用条件计分算式、清空地形或一次静态控点证明整场路线优劣，独立设计审核仍要检查其外推边界。正式Plan0/6、对局0/12、T27 5/6／T23 33/36／相关余4不变。

## v703：深层方法实际漏传实验目的，已修源并同版续行

当前现写 **PID3266**、固定 **PID3268**，日志`build/slice272-product-generation-v703-{editable,fixed}.log`。原93264／91533均在当前操作完成后保存退出；两个Run、军表/Plan和全部旧账不变。固定表进入新的目的／限定比较阶段，原map_and_arrival与plan_continuity三轮停点不重跑、不豁免，仍阻止最终发布。

P2/P3/P5实际缺口：深层`...solve-joint-regions:input-repair`的保存输入只有task/repairSource/tools。运行时既有hypothesis-context虽交付了原hypothesisTest，却没有独立`comparisonPurpose`，因而`rosterWorkflowAcceptanceStageV1`退回普通`pre_game_roster_plan`。不是仅仅猜测模型忘记目的；真实保存输入与现有纯投影均已核对。

修改现有`roster-workflow-hypothesis-context-v1.mjs`，沿已经使用的显式控制链取注册目的原件，实际交付精确`/proposals/0/comparisonPurpose`正文、原来源ID/编号/ArtifactRef和“预期未测”标签。局部task不替换、旧来源不重绑、不新增战术评分；同事实绑定下即使方法未内嵌hypothesisTest也能保留目的。当前实验作用范围随之恢复，不允许以赛前可选项逃避本次测量。正常Run也将该投影用于有显式实验祖先的来源审核角色；无关全局审核不据引用串责。

门`verify-slice272-method-purpose-lineage-v703.mjs`：首次夹具把注册的plain正文误当结果value外壳，纠正夹具后真实RED（目的undefined）→源修复后一次GREEN，合计3次。覆盖本次真实方法输入、原目的逐值相同、局部问题保留、当前实验范围、不同army不继承、偶然引用不传责、0Provider／Native／生产写。未重跑v702或旧通过门。真实生产下一请求是否消费新输入仍须跟踪，门通过不等于收益比较已完成。

v702加载后的两条联合静态求解已经实际纠错为数组参数并返回Native ok，仍只是场景几何。其间另一条summary请求HTTP200后0正文、24.677秒发生ECONNRESET，旧未知费保留；对该新dispatch仅经产品受控重试一次（93264），不是再次重发已恢复的前一个请求。原错误代数／历史保留。

### 用户追问：顶层预期是否来自已有Skill

实际现写`product:initial-army-and-plan`读取了general／faction／matchup三份Skill；后续有15个工作单出现实际Skill读取。可是当前具体的`...:teach`和`...:purpose:v1`没有直接读Skill正文。它们基于当前Plan及单位/阵营原文，提出“Raynor主动Orders可能优于被动支援”的未测假设；purpose的四项主动读取是Raynor、Kerrigan阵营源、r16摘要和公开Plan摘要。Skill在这条假设中是经已有Plan间接影响，不能宣称这次假设逐条由Skill检验或已有Skill证明收益。后续正式能力报告须区分可查询／实际读取／间接继承与已测结论。

当前r16/r12、正式Plan0/6、对局0/12、T27 5/6／T23 33/36／相关余4。下一仍是有效A/B实际收益→来源／覆盖→总体取舍→比较复审，未扩P6。

## v702：修复实验方法重复派工，继续原实验

当前现写 **PID87029**，日志`build/slice272-product-generation-v702-editable.log`，同目录／同workflow／r16。旧35223已精确确认终态：一个模型修复请求发生`ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP`，结果和费用未知，不是策略审核否定。按既有授权经产品`recover-provider`受控恢复一次，原记录与费用保留；未重置实验、审核或修复代数。固定表仍原停点，未启动旧审核。

真实观察到两类不同现象，不能混称都由人工修复：

- 模型的`formation_scene`漏父状态，正常修复角色实际读取原回执、补`stateRef`后，Native摆放与inspect都已完成。没有人工补字段或修改产物；这证明该参数错误可以自恢复，但不证明实验收益。
- 三条静态求解已完成、正常summary就绪时，交接器又创建同一`scene-b`的`completed-method-handoff`。它与原`input-repair:order0:repair-choice`同时运行，后续重复提出联合摆放。缺口在Host责任调度，不是可比较假设数量不足。

修改`roster-workflow-completed-method-handoff-v1.mjs`：沿显式`repairOf/choiceOf/orderRepairOf`判断同一问题是否已有可推进的返回角色。ready/running/正常选择角色优先；waiting角色若其工作依赖已ready/running/evidence_ready，也等待原路径消费。不按ID前缀或引用猜归属，不删除工作或伪造完成。真正卡住的依赖仍允许原有交接出口。

门`verify-slice272-single-method-return-v702.mjs`以本次真实原件、实际三条solver结果，明确隔离重建观察到的派工边界：**RED 1!==0 → 来源修复后一次GREEN**。同时覆盖正常就绪／运行／选择角色不重复派工、真实等待停点仍可交接、无关所有者不阻止返回，0Provider／Native／生产写。不是当前生产已经无重复的证明：恢复前已派出的两条路径与原件仍保留，也未重跑v589或其他已通过门。

尚欠：实际有效A/B场景、作用后收益测量、来源／覆盖审核、after-study取舍和比较复审。不得把静态场景成功、目的齐全或定点门通过计作策略改善。正式Plan0/6、对局0/12、T27 5/6／T23 33/36、相关余4不变。

## 当前 v701：修正阶段，不再问“是否开展已经授权的实验”

**原现写PID35223**，日志`build/slice272-product-generation-v701-editable.log`；26639已在当前操作边界安全终态。固定仍保留原停点，不新建房间、Run或目的。

v700真实目的绑定审核已正确判`comparison_design=needs_evidence`：814/816只有合法性/支付，缺作用后的攻击／有效争点收益。但其后总体所有者再次retain，理由是净收益属于“未来可选测量，不阻塞赛前Plan”，requiredData=[]。原回复完整保留，不据此算实验成功。这是阶段设计错误：用户已授权当前局部实验，却把它再次交给通用“是否值得实验／是否改Plan”的角色投票；generic pre_game范围又给了它把当前测量降级成未来未知的出口。

v701流程改为 **目的定义 → 现有Run.requestExperiment直接做限定实验／复用充分旧对照 → 独立来源及原问题覆盖 → 总体决定是否改军表/Plan → 目的绑定比较复审**。没有新增实验引擎／模型接口。设计后不再先问通用owner要不要做；只有经现有`assessRosterExperimentConclusionV1`真正接受的局部事实结果，才能开启after-study决策。旧两个retain缺该结果输入，不能冒领为完成新阶段。

新阶段`current_scoped_strategy_experiment`与普通`pre_game_roster_plan`明确分开，作者／方法／原子来源／覆盖共用同一目的输入。假设场景仍是条件性的，不要求整场／未来VP历史；但本次明确授权的测量是当前任务，不能因Plan未采用备选就标未来可选。实验阶段的策略回交只决定方法/条件；结果回来之后才判断是否优化真实军表/Plan。已有充分原件可复用，不重演成功Native或购买同回复；无效前置不算零收益，具体工具缺口诚实blocked。

`verify-slice272-authorized-comparison-study-v701.mjs`：以实际提前retain及目的为断点，RED（缺独立study接受状态）→一次GREEN。覆盖目的与retain不算当前实验已完成、先调同Run实验端口、范围不是未来整局、普通Plan范围不变，0Provider／Native／生产写。实际有效对照尚未完成，不用门禁冒充。

当前需观察`...:purpose:v1:study`真实方法角色是否声明有效单一技能分臂、参与者、同条件控制与收益终点，正常工具产出后经独立核对；`comparisonExperimentAccepted=false`期间不能发布或跳到最终优化结论。正式Plan0/6、对局0/12、T27 5/6/T23 33/36、相关余4不变。

## 最新 v700：目的已被真实所有者消费，净收益仍未完成

原现写 **PID26639**，日志`build/slice272-product-generation-v700-editable.log`；旧18880已安全终态，固定仍在原三轮停点、未恢复。后续先精确ps，不创建新writer。

v699实际目的就绪后，旧无目的子调查又获唯一决策位并继续展开，新的purpose-owner没有排入。v700把当前目的的工作单与显式控制后继优先选择：沿experimentOwner／investigationFor／methodContinuation／source-review／repair等真实父关系作线性图遍历；普通引用不转移所有权。只改变下一量子选择，旧任务／事实／问题／费用全部保留，不删除或伪装完成。写军表／Plan仍独占单个写者；正常ready/依赖/held/pending保护不变。

门`verify-slice272-purpose-priority-v700.mjs`：实际缺选择器RED→一次GREEN，真实已完成目的作为根、调度分支为明确受控夹具；单写者、工具子树、偶然引用不串责、旧工作保留，0 Provider／Native／生产写。没有重跑v699或旧通过命令。

**实际采用**：同产品已执行`...:purpose:v1:decision`，不是只增加报告。目的所有者读原文／已有回执后实际retain，产物`8a5b8c461a9195f4f691ff2c9d413e286a8bc3091c41f9c746a70abd3e5f1e27`；`comparisonPurposeAdopted=true`，r16军表/Plan未改。其公开理由正确承认814/816只证明2CP合法性/费用、没有净火力或控点对照，但仍用“无已证增益”作为暂时保留原方案理由。

**这不是哪个更好已解决。** 暂不采用尚未证明的备选可以是临时取舍，但不能代替本轮要求的有效比较；产品仍`comparisonResolved=false`。已实际排入同目的`...:comparison:plan-r16:round1:purpose-contract-v3`独立审核，须按目的原件验证收益终点／对照，必要时通过正常owner→有界实验补测。旧乐观审核不冒领新目的，不能因requiredData=[]或retain就通过。

两条当前workflow累计用量本次读值：现写724份回复／53,927,109 Tokens／可定价USD8.590970976／12份未定价；固定758份／58,104,715／USD7.802190876／7份未定价。合计112,031,824 Tokens、可定价部分USD16.393161852，另2笔ambiguous dispatch。按项目既有预算粗估8元/美元约¥131，已发送一次¥100档提醒；不是本轮单独费用、不是完整账单，未知不算0，未因此停机。

## 当前 v699：先声明实验目的与预期收益，再执行和决定是否优化

原现写同workflow **PID18880**，日志`build/slice272-product-generation-v699-editable.log`；旧6156已安全终态。固定6157已终态，两域第三次实质审核未收敛，保留原停点，尚未续跑。不要把旧负面审核清零或假装已通过。

实际追溯：原现写Teach提出Marauder large／Marine small谁更适合担当主控点，后续多层方法逐渐转成Raynor Orders合法性／即时控点。问题不是缺少可比较假设，而是目的与具体收益终点没有作为独立、可追踪的模型产物保留。

新设计角色仍用同Run的`roster_workflow_local_teach`，但仅这个专门工作单使用`roster.workflow_local_comparison_design`合同；普通Teach、旧付费回复和实验工作单Schema不改。输出一个`comparisonPurpose`，包括：决策问题／当前选择／可信备选、实验目的、未测预期收益、观测指标、机制步骤、观测终点、何种差异会改变选择、支持／反驳的实际军表或Plan影响、无效前置。没有来源不编数值。角色只设计，不执行／决定胜负。

目的以army/rules/map/source事实上下文保存，不绑定完整Plan散文版本，避免另一条Plan措辞修订取消正在进行的只读设计。随后总体所有者必须实际读取这份目的和当前Plan；旧owner决定不能冒领新目的。事实窗口沿明确控制关系保留comparisonPurpose，后续比较审核绑定实际目的原件。旧无目的实验保留只读可用事实，不自动晋级为已完成新比较。

产品最终发布仍要求所有当前审核／当前比较通过。旧三轮审查本身不重跑、不解除；新的独立比较设计和草案修订可以继续修复方案，其已停止域明确保存在`deferredStoppedReviewDomains`，不构成集成／对战放行。这个修复阶段也受自己的工具／格式／三轮比较停止保护。固定表是否重进新设计阶段尚未操作。

门`verify-slice272-comparison-purpose-v699.mjs`：真实缺少目的状态RED；首次修复后受控非strategy记录缺inputs暴露筛选顺序问题，已先按role筛选／可选访问后一次GREEN。0 Provider／Native／生产写。证明目的先于审核、指标／终点保留、旧决定不能冒领；不证明策略更优。未复跑旧通过门。

**实际模型证据**：原现写目的工作单`product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1`已`evidence_ready`，2次真实回复／4次资料读取。实际请求使用专门合同，最后请求原始234,294字符（不是编码后Tokens）；原件`6cb19b68a9e782edd6661fcff5efc56e8f9edd93722b93e1029179dbb37390d9`。

- 模型选择固定局部场景下Raynor被动支援与主动Orders路线，声明预期提高火力／控点，明确“未测假设”。
- 指标包括伤害期望、消灭／逼退时点、CP消耗；机制从进入范围／使用Orders推进到后续攻击及控点结果，不再只测即时标记变化。
- 声明同CP预算／射程等条件，无效前置不算零收益；两种结果分别改写deploymentConcept／componentPurpose或据证保留。
- 仍是设计提案：1CP暴击与2CP移除标记应在具体方法中明确分臂／支付、时序和实际目标；“逼退／控制时长”若无明确可测反制不能冒充已测结果。此设计尚未独立证明规则或净收益。

同源Raynor原文确认Orders是Movement Phase主动：1CP首个使用武器CRITICAL HIT(2)、1CP忽略Disengage惩罚至轮末、2CP移除Activation Marker。不能由这份设计推出Assault额外射击等未经Native验证的效果。

当前r16，`comparisonPurposeReady=true`但`comparisonPurposeAdopted=false`、`comparisonResolved=false`。原有事实frontier仍在完成；下一步由总体所有者读目的／精确规则，选择可测分臂，正常工具执行，再真实决定是否优化。正式Plan0/6、对局0/12不变。

## 最新 v697–698：不能用窄指标替代方案价值

**下一次恢复只查现写6156／固定6157**，同两原workflow，日志`build/slice272-product-generation-v698-{editable,fixed}.log`。旧95961/95962已精确确认终态；原目录／费用／回执／军表／Plan不清零。现写r15、固定r12；正式产物数字不变。

v696真实首审：现写r14实际比较审核给了supported，依据954/963即时控点均5:0、Raptor不合格争点，以及959/961花费2CP。该结果只测到即时控点，不包括启用后续行动的收益，不能推出Orders引擎相比被动支援不值得。本记录不把这一乐观回复计作策略比较验收。固定r12则明确要求同条件站点主线vs击杀Supply主线的预期得分/损失成本，以及实际可攻击目标；这些是有价值的比较缺口，尚未证明任一主线更好。

v697在同一只读角色中分开两个逐项义务：`comparison_design`（控制条件／处理是否实际生效／观测是否跨过收益实现阶段／无效前置与争点者）和`strategy_comparison`（净收益／代价／反制／实际取舍）。两项都须有据通过，设计失败不能由另一项乐观结论盖过。旧合同只有单项时，最多一次类型化设计合同复审，保留原审核／原轮数；不是重置三轮或强改旧回复。比较修订后通过显式`strategicHypothesisCycle.id`回收最新实际所有者，后续读其真实决定，不固定引用最初retain。

定点门`verify-slice272-comparison-design-validity-v697.mjs`：使用实际付费r14乐观判定和原r14草稿，在明确隔离的历史评估接缝重建中复现 **true!==false** → 来源修复后一次GREEN。保留实际生产r14 superseded状态；成功分支为受控设计审核，不是新模型证明。0 Provider／Native／生产写。不能以此声称模型已设计出有效对照。

v698另一个真实停点：fixed标作两域三轮失败，但两条round3其实都`review_not_completed`、尚未执行。修最终审核停止判定：只有当前真实完成回执的第三次负判才计三轮未收敛；排队、网络和格式故障不冒充负面语义审核。定点门`verify-slice272-third-review-dispatch-v698.mjs`实际 **2!==0** RED→一次GREEN，覆盖待执行不算失败、仍不能发布、真实完成三轮失败仍停止。0 Provider／Native／生产写。此修复不扩大审核额度。

上述两个新门均只跑一次修复后验证，未重跑v693–696或其他通过门。现在需要观察v698原流程中真实设计审查、总体修订和局部实验，不再扩展P6入口工作。

## v696：战略回交不等于比较已经成立

真实缺口：`assessRosterProductHypothesisCycleV1` 只检查 owner 是否实际 revise／有来源 retain。现写的 Orders 支付／移除标记有真实原生结果，净收益比较未完成；有理由 retain 仍可能使产品进入最后审核。因此增加独立、只读的 `strategy_comparison` 审核，不改变规则或替模型选择军表。

- 比较角色读取原 Teach 提案、实际所有者决定、当前 Plan 和可按需读取的真实决策证据目录。
- 检查选择与可信备选、限定场景、控制条件、真实收益与代价、反制、观察是否在能力产生收益之后，以及结论能否支撑取舍。
- 前置失败不算收益为零；支付／合法性不算收益。缺失必要测量仍阻塞，不能标 optional 后视作已完成比较。
- 比较失败通过现有 `requestDecision` 回总体所有者，允许改表／Plan、据证保留，或授权精确缺口实验。没有第二套实验／决策实现。
- 只读首审可与其他事实工作重叠；写入决定等原有安全决策边界。最多三轮同版比较审核，三轮未收敛明确停止，不无限静默追加。
- 发布要求 `comparisonResolved`，但仍保留 `strategyImprovementProven:false`：条件比较不等于实战胜率提升。

定点门 `scripts/verify-slice272-strategy-comparison-closure-v696.mjs`：真实 RED（`comparisonResolved` 缺失）→一次 GREEN。使用真实 fixed r12 owner-returned 状态，成功／缺测分支为明确受控审核夹具；0 Provider／Native／生产写。不据此声称真实比较已通过。

## v695：来源审核遗漏赛前证明范围

fixed r12 原进程65793实际终止 `ROSTER_DECISION_NO_READY_WORK`。原子来源 claim0 的“支持”结论附带“逐单位路径／到达是否合法”的必要问题，作者已三次重述条件计划。

首次诊断把问题称为“没有分类”，不准确：实际付费输出已有 necessary_fact／future_condition。第一次补验因此仍失败。核对正常读角色后确认：所有 reviewer 已使用分类 Schema，**原子来源审查没有收到与作者／六域审核相同的 pre_game_roster_plan 证明范围**，这才是输入接线差异。

修复：来源合同 v5显式同阶段／单主张职责，原子来源和能力／假设审核也接赛前范围。仅对具体“支持但有未解决问题、旧输入缺该范围”的已完成来源审查创建一次类型化复审；真实1条重排、8条已通过复用。所有原问题（包括已分类未来问题）原样交回；逐项完整性由确定性检查保证，模型仍负责分类并解释，Host 不按关键词删问题或认定已证。必要事实照常阻塞。旧来源、结果、费用、三轮历史保留；明确来源修复后最多一次额外作者修订沿既有授权，非重置三轮。

门 `scripts/verify-slice272-source-question-scope-v695.mjs`：实际 RED → 初次修复因诊断条件错误仍失败 → 核对付费原件并修源后一次 GREEN。0 Provider／Native／生产写；真实分类复审尚须观察，不是源端自动批准。

## 已实现但未完成 P6 验收的两个接口

1. v693：同产品 HTTP `POST workflows/:id/accept`，只接受当前已审核军表／Plan；保存不可变接受产物，支持幂等／冷读取／旧草稿失效，不改模型策略文本。`readAccepted` 是后续房间的服务器取件入口。
2. v694：既有 `createStarcraftTmgRosterTurnPlanSeedV1` 可接受新产品服务器接受回执，作为条件战略意图，不再强迫生成旧式全军逐轮已执行进场日程。仍核对本席、任务、部署、原生军表审计与官方源；旧未接受无日程 Plan 仍拒绝。

`verify-slice272-product-acceptance-v693.mjs`：实际404 RED80969 → 一次 GREEN82085；产物测试目录 `build/slice272-acceptance-v693-e9vXdU`。`verify-slice272-accepted-intent-bridge-v694.mjs`：旧schedule门 RED85087 → 一次 GREEN85531。两者都使用明确受控准出／房间夹具，0 Provider／Native，生产接受和真实房间导入均0。v696又增加比较准出条件，旧门不能当最终新版完整发布证明；最终真实流程仍需满足新条件。没有重跑这些已通过命令。

尚欠：服务器房间创建入口到新接受产物的组合接线、真实同地图／同表房间导入、完整最终生产和报告。因此 P6 未通过。

## 实际恢复与首轮证据

旧65793、65795均已由精确 ps 确认终态；65795先收到当前操作后保存退出的 SIGTERM。两原流程同载v696：

| 流程 | PID | 原目录 | 原 workflow |
|---|---:|---|---|
| 现写 | 95961 | `build/slice272-product-generation-v645-M86Cg9` | `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1` |
| 固定 | 95962 | `build/slice272-product-generation-v645-I7zekC` | `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34` |

日志 `build/slice272-product-generation-v696-{editable,fixed}.log`。每次先查这两个精确 PID；观察超时不重启。

实际首轮已排入两条 `:comparison:plan-r14:round1`／`:comparison:plan-r12:round1`，不只是受控门。现写公开理由要读 baseline marker control、Orders后态与Raynor原文，判断 retain 是否由观察支持；固定表要读记分、部署几何和当前scoreRoute/lossResourceBudget，判断站点主线 vs 击杀Supply后备到底是比较还是前提。均仍在取证，未形成最终比较判定。fixed 单条source-context-v5也实际入队，8旧通过不重买。

没有新建房间或生成任务，不恢复旧 A–F，不开子代理／安装／刷新数据／删除／提交。费用仍在两原 trace 中累计，未清零；本记录的四个定点门均0 Provider。

## 下一检查点

1. 实际比较审查指出的具体选择／收益缺口，是否回到总体所有者。
2. 有缺口时是否设计有效、有界的对照；不是重复同一合法性验证。
3. 量化或有来源的条件比较如何导致实际改表／Plan或据证保留，并经受影响复审。
4. 上述实际成立后再收口 P5／P6，最终中文逐步报告据真实事件生成，不以本施工记录替代。
