# T27 / S272：局部审核纠错与实验方法职责交接

所属 P2 / P3 / P5。沿用 P0–P6 新流程；不恢复旧 A–F，不启动对局，不更新官方数据。T27 5/6，T23 33/36，相关剩余4片；最终 Plan 0/6、对局0/12。

## 真实失败与原因

同一产品 Run `slice272-product-generation-v645-lqMWaS`，正式 r4/2000矿170气。v3设计已纠正旧测量冒充当前三升级基线的问题，但预审在e6581停止。

1. `7fb5a680798d3bac825ffe878753fb0476b95af17ed3a3317b22a41306ff751f` 的q3通过；错误只指向q2漏评1017/1049。
2. 补读后，旧执行器清掉待修任务（v809已修）；同时审核没有局部补丁接口，仍要求重写全部checks。
3. `76f4ccb6e0182c1a2712641c7f756826c4a4bdba0ec8b3016ddcb679335d8023` 在纠错中又把q3改成缺少range/坐标/sample budget。最终q2已过，但q3阻塞。
4. 实际`pregame-scene-laboratory-v1.mjs` probability/threat_exchange合同明确sampleBudget可选，并在执行时采用默认值。设计声明“有效射程内、目标有掩护、各臂相同条件、具体坐标/阶段委托Native方法”；方法角色本就可提交结构化场景工作单。共享流程却没有明确区分“设计边界”和“边界内的执行参数”，审核分类说明也混在一起。

不把所有未知当作误报：缺真正的参与者、比较边界、工具能力或必要来源仍需退回；是否足够由真实模型基于来源复审。旧q3不被Host手工改回通过。

## 实现

- 新`roster-workflow-review-repair-v1.mjs`：可定位到检查项的语义错误改用`checkPatches`。未列检查逐字保留；无关检查若发现真实新问题，必须显式`new_finding`＋理由。所有补丁仍通过原schema、来源、语义与发布门；不是自动批准。
- 复用既有纠错入口及不可变请求/回复存储；短q句柄对错误checkId与回复使用同一映射。补读沿用v809，不清待修任务/计数。
- 新`roster-comparison-stage-ownership-v1.mjs`：设计作者负责比较目标/分臂/条件边界/指标/终点；方法角色负责边界内的确切合法场景、阶段、域与查询设置，并在测量前提交结构化工作单；最终取舍留给战略作者。
- 同一来源投影把合同交付设计、预审和方法角色。已有`authored_choice`可表示引用设计的有界委托，不等于已测事实；未改变最终准出标准。
- 只有实际旧请求缺少此合同且返回author_decision时，允许对同一不可变设计受控复审一次；旧轮次、费用、原答案与设计版本均保留。当前合同失败不再自动获得本次恢复。

## 定点验证

命令：`node scripts/verify-slice272-review-handoff-v810.mjs <原Run工作流目录>`。

- RED：实际共享执行器重放原q2纠错，确认没有逐检查补丁接口。
- 首次修后失败：新增schema的字符串属性漏minLength/maxLength，未到Provider；已采用现有合同属性修正。这是本次实现错误，不是模型异常。
- 修正后一次GREEN（退出0，约5.9秒）：实际来源素材、共享执行器、补读连续性、局部q2补丁不改q1/q3、显式新问题允许保留、混合读取/写入拒绝、审核/方法共享合同、同设计一次恢复、旧失败不自动批准、当前合同不再重复恢复。
- 真实Provider调用0、Native调用0、生产写入0。未跑旧通过门或全量测试。

这些证明接口正确，不证明真实模型会完成方法、产生策略改进或最终Plan通过。

## 实际运行

2026-10-21：确认原76347退出、无pending/running，余盘13.49GiB后，PID97956用v809＋v810恢复同一Run。

日志：`build/slice272-v810-live-1792561512104.log`。

入口仍是`run-slice272-product-generation-v645.mjs --resume … --mode editable`，使用Web/App同一产品组合与HTTP接口；不修改军表/Plan答案、不重置费用、不新建房间。实际结果待后续记录。

### 真实准入与局部纠错已完成（e6616）

- 第2次真实返回`c255d65b87fef31c09bda930a2be6c6a6c84bb2d95c4262bb863aa261b97d863`：q3明确把具体坐标/阶段归为设计中的有界委托，`authored_choice`引用1159；仍要求实际Native验证，没有假称坐标已合法。唯一局部错误是q2漏逐来源评估历史观测。
- 模型补读原件后，第4次请求`0dbce4a7449b91818a44cecc81b24d004587181db1aac3f97fd474510c78015e`，真实回复`4aeb519c92ad79e18a7f9bf33c8eea331b88e853a9d138bfcf64fbf752b0b7fc`选`action=repair`，只提交q2一个`reported_error`补丁；明确604/687/708/1017/1049是旧配置背景而非当前三升级测量。
- 真实最终结果`52d770cde5171d4519229f5106e1be70a3b56c33bb51e4897056b1079ffec9fa`：frozen_context/army_baseline supported，bounded_executable_design conditional；三项requiredData/requiredDecisions均空，条件仍保留。投影仅`/checks/1`与公开纠错理由，未重写q1/q3。
- 同Run自动入队`…:purpose:v3:study`，事件e6616。方法阶段仍须真实完成同条件观测，未人工改表或Plan。
- 本次复审4calls、309,560 units、Provider合计33.199秒；不是总墙钟耗时，也不是整个Run累计费用。所有旧账另保留；其中最后补丁请求190,488 units，原始历史回执造成较大输入，先保策略正确性，后续性能项不能据此省略来源。

结论：P2/P3/P5此次职责交接已获真实模型使用证据；不等于整个子项目完成，也不等于策略提升已证。最终Plan仍0/6。

### 方法阶段后续停点（e6692，仍运行）

- 方法实际提交当前三升级基线工作单，先构造固定8英寸附近的假设场景，再测threat_exchange；两个候选去升级方案尚未执行。
- Native场景回执`dbec26cfb5c5366be83b39f5c7ab0bdd7fa3488a1aba8b9a8c3173cd9f008ab0`：两个固定锚点均`PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND`，`placementLegalityProven=false`，下游伤害查询因此等待。不是零伤害、不是全局不可摆放，也不是已完成的比较。
- 系统自动交回输入修复角色；模型改选两个有界区域，随后出现工作单比较绑定缺失，再出现static formation缺unitId。原编译错误均保存并进入局部修复，尚未得出“已自动修好”的结论。最新e6692正执行第二个order-repair子工作，下一轮先观察它是否收敛，不手填参数或重演成功工作。
- 调试观察器Node REPL自身触及4GiB内存上限退出；已重建轻量观察器并确认正式PID97956仍在运行，未重复启动。后续读取整份workflow仅在局部函数中保留，不长期持有多个大快照。没有因此停止/重启正式生成。

本轮代码差异：新增审核补丁模块、共享阶段职责模块、一个实际bug复现脚本；接入原语义纠错、句柄映射、来源投影、审核说明、同设计恢复与预审版本标记。未修改Native规则、军表/Plan原文、费用账或既有测试结论。当前未知仍明确挡在实际测量之前。

## 可观测边界

- harnessLoopUsed: true；targetGames: StarCraft TMG。
- promptPackRoutes：comparison design → preflight → bounded experiment method → strategic owner。
- harnessToolsCalled：定点门禁为共享审核执行器/内存读源；当前真实段先读现有来源，不重演Native。
- agentDecisionEvidence：上述不可变回复与后续原Run请求/回复。
- uiTraceEvidence：本次没有新增UI验收；同产品HTTP运行不冒称浏览器验收。
- memoryTraceEvidence：保留原工作流/纠错/原问题；不写真实对局记忆。
- trainingTraceCandidates：false；未晋升Skill、规则或训练真值。
- rollbackOrDemotionRules：如果越过设计边界、静默丢问题、旧观测冒充新结果或当前合同重复恢复，停止本次准出并修来源；不伪造通过。
- userVisibleChecks：最终表/Plan尚未交付；下一真实目标为设计正确交给方法、完成当前三升级与备选的同条件测量，再实际取舍。
