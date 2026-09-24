# Ticket 27 / Slice 272 — 最终 RosterPlan 的后置 Teach 质询

状态：**S272 进行中，Ticket 27 为 5/6；Ticket 23 为 33/36。** 本轮不重生军表、不刷新数据、不重启 T23 原房，也不宣称完成实战或 A/B。

## 写表顺序与 K3 边界

K3 原写表工作台仅有 Foundation → 候选军表 → 比较选择，不包含独立 Challenger/Student Teach。主链路现有 Web 默认模式已真实走通：读取总规则／本族／定向对抗 Skill（策略建议）及任务、Rules 合法菜单 → Agent 公布小获胜计划 → Challenger 只读质询 → Student 修订或标未决 → Agent 选择模型、升级、卡牌 → Army Builder 逐候选审查 → 比较并深化为完整 RosterPlan。预制表先由 Rules 锁定现有名单，再做小计划 → Teach → 固定名单深化，绝不重新选模型。小计划发生在选模之前，这与你提出的顺序一致。Teach 不能修改 Rules，也不自动晋升 Skill。

该前置 Teach **不覆盖最终计划**。保存的真实 Standard-2000 固定表 v3 计划在 Rules 校验的首次进场日程中安排 Medic 第 5 轮进场，却有“第 3 轮前损失 Medic”及未限定轮次的 Life Support/Medpack 策略。这是最终深化和后续修订产生的语义矛盾，军表合法、Supply 合法、哈希一致均不足以发现。

## 本轮交付

- 新增独立 `roster-final-plan-review-v1`：以已验证 RosterPlan、逐单位首轮进场和逐轮 Supply 为冻结事实，读取最终得分路线、部署、威胁、增援、目标控制及单位用途文字；独立 Flash Challenger 最多输出 6 条问题。每条必须引用来源字段的**原文子串**，否则丢弃并计数。输出只作公开、可追溯的策略质询，绝不改军表、计划、Rules 或训练真值。
- Workspace 新增显式 `POST /sessions/:id/review` 和会话投影；已付公开回复在每轮边界保留，同一计划可原样重放；显式 `fresh:true` 才产生新付费复核，旧复核进 history。断线后运行状态标失败但保存旧回复；不自动重试。高严重度待修发现会阻止此产品入口再把该计划交给新 Room，原保存计划仍可读；这个保守隔离不是规则裁决或自动修复。
- 聚焦门：保留的真实计划＋脚本化复核证明第 5 轮进场事实可见、Medic 原句可精确定位、伪造引用被丢弃、计划字节未变。之后真实高发现的交接门证明在读取 Room 前拒绝，原计划 hash 未变；HTTP 适配器的单路由调用也通过。没有新测试文件、全量门或无关回归。

## 真实 Flash 对照与人工判读

仍用已付 v3 计划 `b8b7a713…edbc4a`、日程 `28233dd7…9f63847`；未重生 Foundation/Teach/军表。首次后置复核 11 条问题，包含第 2 轮 3 VP 基线缺少对方高分点执行单位及 Medic 过早守点，但遗漏最直接的“第 3 轮前损失 Medic”，且把部分明确为未验证的几何目标误报为问题。因此收紧为“最多六条、先找实际矛盾、不对正确时序和已声明未知反复提醒”，只对同一计划显式重审一次。

第二次复核 6 条：3 High、2 Medium、1 Low。High 中精确引用“`If the Medic is lost before round 3`”，与 Medic `firstArrivalRound=5` 明确冲突；未限定轮次的 Life Support/Medpack 也不能作为第 1–4 轮防御能力。另指出第 2 轮 3 VP 基线缺少当轮已指定去争对方高分点的单位；这是策略依据缺口，并非 Rules 已证明不可能。Medium 关于早期 Goliath 反制需要限定进场时机；Low 关于已正确说明的晚到 Goliath 覆盖仍是过度挑错，**不作为阻塞**。模型发现有精确引文不等于其推论自动成立；这里的 High 先保守隔离，并待有界修订及独立规则/实战复核。

本轮新增 2 个真实调用、17,333 reported units、保守全未命中增量约 **¥0.037388**；固定表会话累计 7 调用、146,623 units、估算 **¥0.298510**。首个本地检验命令有脚本括号失误、随后发现严格 schema 需显式 `minLength`/`minItems`，逐项修正；第一次服务启动缺本工作树被忽略的官方冻结快照，改用原主树的同一份快照，以上均在 Provider 发出前失败且未收费。旧复核 hash `fdf5565d…9961e943`，新复核 hash `c7282902…8b2617c`，两份公开回复和旧复核记录均保留。

## 剩余 S272 交付

1. 在相同 Rules 锁表上做**显式、可追溯的再次计划修订**：纠正 Medic 时序，给第 2 轮得分基线明确可行单位或标为条件性目标；不能改旧计划或静默重生军表。当前 v3 只支持首个单跳 Supply 修订，多跳版本合同尚未完成。
2. 对修正计划实际执行 Bot 动作→对手回应→计划反思，并对比无赛前计划、固定表 Teach 计划和 Agent 写表计划的同条件策略结果；观察得分、击杀、成本、动作时间及低策略行为。
3. 补 Web 建房/写表计划交接的用户路径及截图。当前后置质询有 API、持久证据和服务端交接隔离，**尚无页面按钮/展示验收**。

## Harness / ctx2skill 记录

`harnessLoopUsed=true`; `targetGames=[starcraft-tmg]`; `promptPackRoutes=[ticket27.roster_final_plan_review.v1]`; `harnessToolsCalled=[RosterWorkspace.reviewFinalPlan, secure structured Flash Worker, preparePregamePlanForRoom focused gate]`; `uiTraceEvidence=none`; `agentDecisionEvidence=two actual public review outputs, not battle actions`; `memoryTraceEvidence=retained replies and prior review history in the saved draft`; `trainingTraceCandidates=none`; `rollbackOrDemotionRules=high review findings quarantine new Room handoff pending explicit correction, no automatic Skill promotion`; `userVisibleChecks=API projection only, no Web review UI`.

`ctx2skillLoopUsed=true`; `roleRoutes=[general, Terran faction, Terran→Kerrigan Swarm matchup]`; `skillsRead=existing accepted advisory route`; `skillsGenerated=none`; `judgeTestsRun=focused mock review, high-handoff gate and HTTP route gate`; `crossTimeReplayResult=same-plan public paid review retained, no strategy replay yet`; `promotions=none`; `blocks=Medic temporal contradiction and unresolved round-2 scoring assumption`; `remainingRuleGaps=none newly asserted; placement/path and tactical feasibility still unknown`.
