# Ticket 23 / Slice 248 — A 原房 r22→r23 火力圈语义与策略检查点

日期：2026-09-28。A 是预制 2000 分、无赛前 RosterPlan 的对局；与 B 的军表不同，不作仅有计划差异的因果对照。

原房第 4 回合 Movement、player2，r22 的 Planner 因 `PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION` 三次停止。保留的付费原句说“选择一个**未来移动后**留在火力圈外的落点”，又把 Corpser “没有本轮主动火力圈、不能到达争夺点”并列说明；旧审查把未来条件当成否认**当前**射程，还跨 `and` 把 Corpser 的主动火力和目标可达性解释成敌军对 Corpser 的威胁。没有放宽所选队形的落点事实审查。

从原 r22 的三份付费回复做只读重验，具体短句先红；限定未来条件的作用域、按并列分句拆解否定后，唯一相关语义门通过。Planner 本地归一化版本升到 v17，使显式恢复优先重验已付费回复。原房 Web 只续一步：Hydralisk Move 被权威 Apply 为 r23，回执 `4dc6ec010658c474c9c76b9dce3a4acc794c3f4111aa0e426e0ba8489dd964f7`，Replay 一致，[完整棋盘截图](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF/screenshots/0137-r023-player2-move-complete-board-applied.png)。本步新增 2 次 Action Provider 调用；A 独立窗口自基线累计新增估费 ¥10.425727，未跨 ¥100。

动作合法不代表策略判断正确。该动作的 `selectedReason` 声称 Hydralisk 移动后清出了本回合敌军静止火力圈；r23 权威位置关系仍给 Marine 1、Marine 2 的当前回合静止射击可达，底座间距分别为 2,812、11,258 milli-inch。所选队形投影也有两支 Marine 的威胁计数。已把“所选落点清出火力圈”的声明绑定到所选队形权威投影：针对真实 r23 原句的聚焦检查先红后绿，真实原句现被拒绝。该防线仅约束未来动作，不撤销已经合法执行的 r23；保留此步作负面策略复盘样本，不能标为高策略成功或训练真值。

后续：原房继续同一 Room；复盘应区分“模型对未来落点的合理假设”和“最终选中落点的错误火力圈判断”，同时观察是否因此过度畏缩。完整对局未完成。

Harness 记录：`harnessLoopUsed=true`；`targetGames=StarCraft TMG`；`promptPackRoutes=selfplay_agent_prompt`（未改策略 Skill）；`harnessToolsCalled=空间关系查询、LegalSpace、Preview、Apply、Replay`；`uiTraceEvidence=r23 Web 截图`；`agentDecisionEvidence=三份保留 Planner 答案、r23 selectedReason、权威关系投影`；`memoryTraceEvidence=此步未单独验记忆`；`trainingTraceCandidates=false`；`rollbackOrDemotionRules=错误策略声明不得晋升 Skill/训练真值，合法 r23 不回滚`；`userVisibleChecks=回执、Replay 和棋盘可见，火力圈结论以权威关系查询为准`。
