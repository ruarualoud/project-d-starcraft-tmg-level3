# T27 / S272 — B 一次真实 Flash 仅汇总复核 v205

日期：2026-10-15 CST。执行范围来自用户明确答复“允许一次 B 汇总复核”。

## 结论

**仅汇总链路已真实跑通，Orders 原未解项已得到有依据的修订结论；不是整个 B Plan 准出。**

- 原工作台、原 Plan19、全部原调查证据；使用 v206 当前代码。
- 一次真实 `deepseek-flash` 调用。没有调查续跑、Native 查询/动作重放、房间启动或 Plan 自动应用。
- 8 个回答由“7 保留、1 未解”变为“3 保留、5 建议修订、0 未解”。这里的零未解只是模型 disposition，不等于所有引用/战略结论已合格。
- 数值引用从旧回答的 **5 绑定 / 11 unknown**，改善为 **12 绑定 / 3 unknown**；新旧总数不同，因为模型重新选择了引用。
- 原始与限定回答、旧账均保留。B 累计 **256 calls / 36,328,314 units**；A 没有调用或修改，四组对局仍停止。

## 本次真正解决的事

原问题要求说明 Raynor Orders 在具体可用场景里由哪张卡支付、何时使用及其依赖。旧回答已拿到成功回执，却继续要求一个覆盖所有情形的支付证明。

新回答准确使用了原保存的 Movement 条件分支：

1. `ability_resource_paid` 的资源为 CP，实际支付 **1**。
2. 耗尽的卡为 `faction:player1`。
3. `orders_applied` 是 Raynor 对 Marauder 的 `critical_hit_2`。
4. 明确这是该条件分支的成功，不是所有局面都能支付，也不是实际到达历史。
5. 建议把 Plan 的“支付未解”改为该场景已证实，保留实际对局中检查 ready card/阶段/目标的条件。没有把 Orders 变成无条件默认操作。

两条原引用现在均通过实际绑定：

| 引用 | 当前路径 | 读到的值 |
| --- | --- | --- |
| Orders 原生支付 | `sourceReceipt.nativeEvents.0.resourceCost` | 1 CP |
| 原 Assault 条件场景控点 | `sourceReceipt.queryReceipt.result.markerResults.1.supplyTotals.player1` | 2 Supply |

新回答自己修正了路径，没有人工补值、规则查询重放或修改原始回复。

## 其他公开建议与边界

| 议题 | 新处置 | 实际含义 |
| --- | --- | --- |
| 获胜渠道 | 保留 | 任务计分算术仍是对声明控点模式的条件计算，不是实际比分或必胜证明。 |
| 对手分支触发 | 修订 | 把首批部署去哪几个点作为实战可见触发，不声称赛前已观察到对手部署。 |
| 进场次序机会成本 | 保留 | 讨论第二台 Goliath 与第二队 Marauder 交换进场窗口的代价，不改军表。 |
| 能力需求 | 修订 | 把需求绑定到已试算的具体对手；估计为假想场景的 advisory，不是预测保证。 |
| 伤亡后能力 | 修订 | 使用 Marine 缺席后的具体存活名单/摆位控点结果；见下述控制权前态限制。 |
| 地形与队形 | 保留 | 区分路线见证、摆位/连续性、控点、LOS、实际移动合法性，不把距离等同射击合法。 |
| Orders 协同 | 修订 | 具体付款已证实，保留阶段与资源条件。 |
| 失效后替代方案 | 修订 | 提议向 3/5 两点收拢；不能把一次条件静态场景当作所有历史下的掉分结论。 |

`proposedRosterChanges=[]`，5 条 Plan 修改建议，`applicationStatus=proposed_not_applied`。没有军表或计划版本变化，也没有策略/训练晋级。

## 本次检查发现的剩余问题

### 1. 三条数值引用仍不合格，但不是查询无结果

- 两个攻击概率引用写到 `computedOutcomes.0.outcomes.probabilityAnyCasualty`，实际该节点是对象，含 `value/percent/successes/denominator/uncertainty95`。限定器没有把整个对象猜成某个数值，保留 unknown 并给出局部结构反馈。
- 一条控点状态引用到 `...markerResults.0.result`，实际是字符串 `no_contest_sticky_control`。它可以作为定性事实，但不应被当作数值引用。
- 这些都是现有保存证据的类型/引用问题，不需要重执行攻击或控点查询。本轮没有手动改模型原答，也没有开启第二次纠错调用。
- 三条属于需要修正的证据表达，不表示三个查询失败；不以它们伪造 High。整体 Plan 仍未应用/准出，不能用“0 unresolved”替代完整准出判断。

### 2. 伤亡后控点结论必须保留前态条件

模型称“失去 Marine 后得分底线从三个点降到两个”。保存的 `6194aac2...` 回执只证明该假设名单/摆位的结果：

- marker1：`previousControlSideKey=null`，`nextControlSideKey=null`，双方 Supply0，`no_contest_sticky_control`。
- marker3/5：原控制方 null，新控制方 player1，player1 Supply2。

因此它不是“我方已控三点→Marine 被击毁→必掉一个点”的完整历史验证。原控制权不一样时不能直接套用这个降分结论。Plan 修订必须把它写成这个前态下的条件分支，不得把控制范围没有存活模型误当成所有情况都立即失去控制。若作为无条件计分推理写入 Plan，会影响战略，准出前必须处理；本轮未应用该建议。

阶段与能力时机的公开论述也仍是模型提出的计划条件，本轮没有额外执行所有协同/晚激活/阵亡分支，不宣称全规则证明。

## 调用、费用与时间

| 项目 | 实际值 |
| --- | --- |
| 新真实调用 | 1，`deepseek-flash` |
| 输入 | 659,796 units |
| 输出 | 8,304 units |
| 合计 | **668,100 units** |
| 输入缓存命中 / 未命中 | 279,808 / 379,988 |
| 冻结价格估算 | **US$0.062820024**；不是服务商账单，不作汇率换算 |
| Provider latency | 67.512 秒 |
| 已记录模型轮次起止 | 08:32:29.503–08:33:39.460 CST，69.957 秒 |
| 启动至观察器确认完成 | 08:31:02.615–08:34:07.259 CST，184.644 秒 |

启动总时长含旧离线工作台宿主替换/加载、上下文准备、保存及观察轮询；不能把184.644秒称为一次实战动作耗时。上下文仍较大，本轮只有汇总试验，未做性能改动或新性能准出。

计费按现有 `provider-pricing-v2.mjs` 冻结快照/cache-aware off-peak 计算，price receipt `49fe34906627b0eabb65e492ae7a6a9bc1b4a1d062165bfc0b4c26fcf982f918`。没有新增账本清零或费用上限。

## 无重放与保留证据

启动前与完成后的只读比较：

- Plan hash/版本、完整初始 evidence、investigation、queryRecovery、framework 均一致。
- `synthesisHistory` 12→13，新增一项中的 raw/qualified hash 分别等于启动前原回答；没有覆盖旧回答。
- state calls55→56、dispatches269→270、publicOutputs253→254、累计收费255→256：均只新增一次。
- `synthesisReview.status=completed`、`maximumProviderCalls=1`、`queryExecutionAllowed=false`、`historyReset=false`、`automaticallyAppliedToPlan=false`。
- 输出结构校验通过、schema issue0；这不替代上面的语义与引用检查。
- 本轮没有新测试、旧绿门重跑、全量构建、子代理、安装、删除、提交或官方数据更新。

两次只读检查脚本输出失败（可选字段 undefined 的摘要 hash、过大的摘要输出触发 maxBuffer）均发生在观察代码，不是模型/工作台失败；没有因此重复 Provider 调用或重启试验。修正摘要选择后读取原记录即可。

## 权威恢复与下一交付物

基线目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

- `common-v205-B-teach-synthesis-review-progress.private.json`：completed、1call、668100units、failure=null。
- B 原 draft：`query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json`。
- 现有公开输出 contextHash `b91d4e011f08ff8ba5c9ab683d823ad13bcd06e1a62a0e1a48405b29f1f3696e`，outputHash `2b59ca34f80b06baf5fccc9223806a37039f9e282c4870b68981546a45759054`。
- 原 v200 回答仍在 history，不删除旧账/旧证据。v205 已消费本次一次真实复核许可，不可换编号盲目重试。

剩余交付物：

1. 完整可消费的 B Teach/Plan 修订：数值对象与定性引用分开，保留原控制权/阶段/条件边界；不能仅凭零 unresolved 自动准入。
2. A 固定表的独立未解项及最终 Plan 准出；本轮未执行 A。
3. Plan/实战/执行工具消费者的同源检查与四组同版续跑，不重新初始化房间。
4. 完整对照/报告与复盘；其余18经典图继续按用户优先级后置。

进度：T27 **5/6**、T23 **33/36**，主线剩 **272/248/249/250 共4片**，完整验收对局 **0/12**。本次完成的是 S272 内一个有界真实复核，不是关闭该 Slice。

## Harness 与离线 Teach 记录

- harnessLoopUsed: true
- targetGames: starcraft-tmg，原冻结数据
- promptPackRoutes: teach_framework_synthesis
- harnessToolsCalled: 既有工作台 Teach API、保存证据投影/数值限定；本轮新增 Native 查询0
- uiTraceEvidence: 无新增UI操作/截图，不宣称前端验收
- agentDecisionEvidence: 新旧公开回答、5项建议、原条件事实与数值绑定结果
- memoryTraceEvidence: 原 raw/qualified 回答归档，原调查/恢复证据不变
- trainingTraceCandidates: 未晋级，trainingTruth=false
- rollbackOrDemotionRules: 不应用越出条件前态的控点结论；不以unknown造数；不以零未解自动晋级
- userVisibleChecks: 原Orders未解已解决、引用明显改善、剩余问题明确区分；无调查重放和额外收费循环

## Diff 摘要

生产代码 **0 改动**。运行原启动器一次，真实结果由现有工作台持久化；新增本报告，更新 CURRENT_WORK 与根 TASKS。没有因为本次局部成功而修改全局完成度。
