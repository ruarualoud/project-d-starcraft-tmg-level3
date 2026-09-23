# Ticket 27 / Slice 272 — 固定军表逐轮 Supply 修订与写表链路核对

状态：**S272 进行中，Ticket 27 为 5/6**。本片不重启 Ticket 23 的权威房间，也不把军表合法等同于计划或对局可执行。后续还剩真实 Bot 动作及跨回合反思、同条件计划 A/B、Web 建房/交接入口和策略质量判断。

## 写表顺序和 K3 边界

K3 原实现是 `Foundation → 候选军表 → 比较选择`，自身没有 Challenger/Student Teach。主链路已把总规则／本族／定向对抗 Skill 作为**建议**送入 Foundation，Agent 先写公开的小获胜计划与对手假设，随后 Challenger 用只读实验室质询、Student 修订或标未决，再选择模型／升级／卡牌，交 Army Builder 审核候选，最后比较并深化为含得分路线、部署、单位用途、损失预算的 RosterPlan。现有 Web 工作台默认 `agent_teach_v1` 已真实 Flash 走通此顺序；详见 S271 报告。固定预制表则先由 Rules 锁表并生成 `no_pregame_plan` 基线，走小计划→Teach→深化，但**不重新选模型**。Skill 只指导计划，不能更改 Rules；本轮也没有从经验反向晋升 Skill。

当前 Teach 质询的是**初始小计划**，最终模型/名单确定后的深化计划没有再经过一轮专门反证；这不是“最终计划已被 Teach 全面验真”。此次 Medic 时序矛盾表明后置的计划一致性复核仍是 S272 策略质量工作。

## 结构化合同与真实结果

在已付费固定表原计划 `90d328d9…fe03a8` 上增加一次显式、有界的 locked-plan 修订，不重放 Foundation/Teach，也不更改军表、任务、Rules audit 或旧版本。新的 `openingDeploymentSchedule` 由模型选择各单位首次进场轮次，由冻结的 Rules audit 提供每单位 Supply、冻结任务提供逐轮上桌容量；系统要求所有单位恰好出现一次，逐轮累计不超容量，未知的摆放位置及路径不伪称合法。旧 v2 计划仍可读；只有带修订事件的版本 3 能通过单跳来源交接。草稿工作名单的匹配使用原锁定输入，不再受审查输出排序影响。

一次零 Provider 聚焦门先验证修订、Rules 逐轮 Supply、旧计划来源和 Bot 桥；一次真实 Flash 修订随后成功，草稿位于忽略构建目录 `build/ticket-27-slice-272-fixed-preset-live-v1/revision-live-E9OxkC/`。真实计划版本 3 hash `b8b7a713be5824608b50e6e14ae4a9e159b45c7c2112046ebe288730ffedbc4a`，逐轮首次进场为：

| 回合 | 新进场单位 | 累计 Supply / 容量 |
| --- | --- | --- |
| 1 | Marine 1、Marine 2、Jim Raynor | 5 / 6 |
| 2 | Marine 3 | 7 / 8 |
| 3 | Goliath 1 | 9 / 10 |
| 4 | Goliath 2 | 11 / 12 |
| 5 | Medic | 12 / 不限 |

Bot 桥从同一真实计划及原会话回执接受唯一修订事件，形成 7 条跨回合进场计划；行动优先序现在逐项注明“最早进场轮次，执行前核对当前 LegalSpace”，不能再把尚未进场单位当作首轮可行动。该桥只用真实保存产物做一次聚焦门，14 项优先序均有时序说明，未调用模型、未写 Room。

**策略质量未通过最终验收。** 计划正文讨论 Medic 的早期治疗反应，甚至写“若第 3 回合前 Medic 损失”，但结构化计划将 Medic 首次进场设在第 5 回合；模型同时把第 2 回合累计 3 VP 作为路线基线，却没有证明当时可控制对方高分点的空间路径。前者是计划内部时序矛盾，后者是未经几何验证的假设；规则器只证明 Supply，不证明得分或走位。不得把此计划宣传为已验证的高策略对局、更不得晋升 Skill。后续需在模型选择与深化之后加入针对最终名单、部署时序、技能可用窗和任务得分的反证/复核，再以真实对局观测取舍。

本次新增真实 Provider **1 调用，输入 6,443、输出 4,860、合计 11,303 reported units，保守全未命中估算 ¥0.031060**；该固定表会话累计 5 调用、129,290 units、估算 ¥0.261122，非账单实扣。无重跑已通过的全量门，无新测试文件，无 Room mutation、训练真值或 Skill 晋升。

## Harness / Skill 边界

- `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[agent_teach_v1,locked_roster_teach_v1]`，本次修订沿用锁表 prompt pack 的 `revision` 轮次与独立严格输出合同。
- `harnessToolsCalled=[ArmyBuilder, frozen mission scoring, read-only pregame laboratory, planned-preset revision, RosterPlan→TurnPlan seed]`；`uiTraceEvidence=none in this sub-slice`。
- `agentDecisionEvidence=real paid public revision and structured round schedule, no game action`；`memoryTraceEvidence=one-hop pregame revision origin enters TurnPlan seed, cross-round use not yet observed`。
- `trainingTraceCandidates=none`；`rollbackOrDemotionRules=changed locked roster/audit or round Supply overflow rejects; stale/unsupported multi-hop rejects; unresolved Medic timing stays open`。
- `ctx2skillLoopUsed=true` only for reading the existing general/faction/matchup Skill route and reviewing the plan; `skillsGenerated=none`、`judgeTestsRun=focused Rules/bridge checks only`、`promotions=none`。`canAffectRules=false`、`trainingTruth=false`。
