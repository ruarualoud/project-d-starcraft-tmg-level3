# T27 / S272：原生伤亡后继与 Teach 可见证据

2026-10-14。T27 5/6、T23 33/36；主线剩余 248/272/249/250 共 4 片；完整验收对局 0/12。

## 实际进展

本轮完成两个真实缺口，未开启对局或付费 Teach。A/B 已保存的未解项仍为 3/4，最终 Plan 未变。上一轮主要补充后续要求记录；本轮有产品改动及原生执行证据，属于实质推进，不是等待或重新描述计划。

### v147：明确随机输入 → 原生分伤 → 可查询幸存状态

赛前 `native_action` 现支持 `argumentsJson={domainId,parameters,outcome?:{chanceReveals,precisionConvertedFailedHitDieIndices?}}`。

- 只透传明确的原生随机输入，不接受调用者自写伤亡、人口或状态补丁。实际值、骰子数量及伤亡结算仍由 Native 处理。
- 随机输入是条件假设，不是期望伤亡、抽样概率、真实对局骰子或对手未来行为。
- 如果 Native 返回防守方分伤选择，后继场景保留该选择；需检查后继动作域、由调用者选择另一步 Native 动作。Host 不替防守方移除模型。
- 保存原生结果供断点恢复，恢复不重新掷骰或重放动作。原 Room 未修改。
- 缺随机输入时提供带 Native 骰池的类型化纠错反馈；确定性动作不接受无效 outcome。

实际三次执行记录，未重跑旧门：

1. RED，PID 70125：合法场景和攻击概率查询成功，Native 提供 33 颗骰子的完整合同；赛前入口以 `PREGAME_LAB_NATIVE_ACTION_ARGUMENTS_INVALID` 拒绝 outcome，0 Native 动作。
2. 第一版补验，PID 73340：发现既有入口解包 `sourceAction`，丢失外层正式动作合同归一化后的射击骰池，误报 `PREGAME_LAB_NATIVE_ACTION_OUTCOME_NOT_APPLICABLE`。这是确切接线问题，不是模型错误。
3. 修成读取正式 Native 动作合同后，PID 75595 单次验证 PASS：2 次克隆态原生动作完成攻击/防守方分伤；Raptor **6 → 5 模型、Supply 1 → 1**，控点查询 exact；源态/父态不变、恢复不重放；缺随机输入保持 unknown 并返回骰池合同。

本例是 A 冻结源中的一组 6 模型 Raptor 的隔离能力测试，不是 18 模型单位，也不是新对局。场景显式清除地形，仅验证战斗/后继能力，不用于实际地图通行或真实任务占点证明。

实际回执位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/`：

- `common-v147-native-chance-successor-red.private.json`
- `common-v147-native-chance-successor-green.private.json`（失败，不覆盖）
- `common-v147-native-chance-successor-green2.private.json`（最终 PASS，含实际请求/原生回执/阶段耗时）
- `common-v148-native-evidence-projection-red.private.json`
- `common-v148-native-evidence-projection-green.private.json`

### v148：修复最终 Teach 汇总看不到原生结果

检查刚保存的实际伤亡回执发现：大回执精简投影只保留档案链接，丢失原生伤亡事件、幸存单位状态及后续控点结果。最终汇总角色不能再查档，因此“工具已经执行”仍不足以支持它的结论。

新增原生动作证据投影：保留原回执/父子场景引用、条件性质、完整原生事件、动作参数及原生结果中的模型数/人口/损伤/移除模型；保留后续查询回执。未重写原回执或补签，也不计算第二套伤亡规则。重复引用仍带关键证据，完整状态补丁留在原档案中。

仅用 v147 保存结果执行纯投影：RED PID 84528 → 唯一 GREEN PID 85379。验证实际伤亡事件、5 模型/Supply1 与控点结果进入输入，原数据不变，未冒充完整战略问题已回答。0 Provider、0 Native、0 Room。

## 本轮文件变化

产品：

- `packages/roster-strategist/pregame-scene-laboratory-v1.mjs`：随机输入入口、正式动作骰池、条件回执与错误反馈，版本 1.4.5。
- `packages/roster-strategist/roster-strategist-output-schemas-v1.mjs`：相同入口的模型可见用法。
- `packages/roster-strategist/pregame-native-action-evidence-v1.mjs`：新增原生结果精简投影，不执行规则。
- `packages/roster-strategist/roster-teach-framework-v1.mjs`：汇总/重复引用保留上述结果与后续查询。

具体 bug 的验证脚本：`scripts/verify-slice272-native-chance-successor-v147.mjs`、`scripts/verify-slice272-native-evidence-projection-v148.mjs`。另更新 CURRENT_WORK、根 TASKS/PROJECT_MEMORY。本轮无提交、安装、清理、数据刷新、子代理或 K3。

## 性能及费用：当前能证明的范围

v147 最终一次总墙钟 **58.43 秒**，其中离线冻结夹具初始化 **35.63 秒**，不应混入线上单动作时间。主要阶段：

| 阶段 | 耗时 |
| --- | ---: |
| 构造合法隔离场景 | 0.71 秒 |
| 攻击概率查询 | 2.08 秒 |
| 攻击条件后继完整工具调用 | 3.89 秒，其中 Native apply 1.21 秒 |
| 防守方分伤及后续控点完整工具调用 | 5.96 秒，其中 Native apply 2.60 秒 |
| 缺骰子输入的负向检查 | 2.56 秒 |

其余时间含场景/动作上下文读取、恢复和断言。不能把两次不同决策动作当作可并行的一步，也不能把离线初始化归到实际人机行动。

同场景攻击概率三次观测 2.00 / 1.74 / 2.08 秒；该算法未修改，单样本波动不足以认证是否性能劣化。新伤亡后继过去不能执行，没有成功旧耗时可供速度比值。

v148 输入 379,444 bytes；旧错误投影 6,665 bytes，修复后 30,783 bytes，新增的是原先丢失的实际结果。完整验证分别 36/83 ms，但后者多执行了通过后的断言与重复引用检查，**不能把差值直接称为投影劣化**。未进行新的端到端模型耗时对比，不宣称性能通过。

本轮 Provider 调用 **0**、新增模型 units **0**、真实 Room 动作 **0**；A 既有累计 104 calls / 19,243,652 units 不变，不清零。未读取或输出 API key。

## 后续交付与准入

1. 下一步是实际 Teach 工作流消费已具备的工具：对错误工具分解进行重新调查，正确使用前置查询/求解候选，不再盲修同一错误参数。当前工具能力通过不等于模型自动纠错成功。
2. 明确条件场景证据与未来行为的区别；机会成本用模型提出的可比情景支撑，不能要求 Rules 给出统一战略分；修正旧 Marine 数量叙述。保留原问题及失败记录，不能清空 unknown 冒充完成。
3. A/B 未解项真实关闭、最终 Plan 更新验收后，执行用户新增的统一消费者及性能检查（后续决策、Plan 修改/记忆、复盘等）。四组同版且按最新要求新开正式实验，不恢复旧错误局作为最终对照。

本轮只证明一条真实射击/分伤后继和其 Teach 证据可见性，不声称所有随机动作、全部战略场景、四组完整流程已通过。已通过的 v142–v148 对应门不重复执行；后续只测具体新改动。

## Harness/Teach 记录

- harnessLoopUsed: true；targetGames: starcraft-tmg；promptPackRoutes: Teach evidence query/recovery/synthesis。
- harnessToolsCalled: 实际攻击概率、条件 Native 动作、分伤动作、控点查询；纯投影补验复用原回执。
- uiTraceEvidence: 本轮无 UI，隔离工具修复不冒充用户页面验收。
- agentDecisionEvidence: 无新增模型选择；测试候选不是策略优劣结论。
- memoryTraceEvidence: 仅任务/持久工程知识更新，无在线游戏记忆晋升。
- trainingTraceCandidates: 无，trainingTruth=false。
- rollbackOrDemotionRules: 若后继与 Native 结果不一致、结果投影遗失或混淆条件/事实，停止采用该接入，保留原回执定位；不以旧错误结果继续实验。
- userVisibleChecks: A/B 未解数和停局状态不被这些工具门虚假提升。
