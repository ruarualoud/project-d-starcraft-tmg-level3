# Ticket 27 / Slice 272 — 真实 Room 开局计划交接检查点

Status: **S272 进行中，Ticket 27 仍 5/6。** 本片只关闭了已生成 RosterPlan 到当前权威 Room 的服务端交接前置；没有声称 Bot 已作出多回合决策，也没有完成写表质量 A/B。Ticket 23 原房未变。

## 复现、修复及唯一对应复验

输入是 S271 真实 Flash 会话 `rws-f3c0b5c7-0b54-4f7f-98c7-68241e7daa84` 的最终 Agent 军表和计划：Terran 六单位、1500/2000 矿，对手为冻结的 Kerrigan's Swarm 八单位。Standard Room Factory 已有 `rules_legal_unspent_lost` 并按双方 Rules audit 创建任意名单，但其消费者 `createOfficialCurrentProductMatchRuntimeV1` 在入口仍要求 `state.pieces.length === 15`。第一次真实构造在这里以 `CURRENT_PRODUCT_MATCH_RUNTIME_INPUT_INVALID` 停下，连 Room 创建都没到；这是工程硬编码，不是模型策略或名单不合法。

运行时入口现按两席权威 `armyCompositionUpgradeAuditsBySide[*].units[*].unitInstanceId` 与实际 `pieces[*].id` 做完整一一对应、非空和去重检查，不再把历史示例的十五单位当规则。Room Factory 自身的 Rules、预算、地形和初始储备门没有放松。产品组合层增加仅服务端调用的 `preparePregamePlanForRoom`：它先从工作台读取 `planned` 且未 stale、当前工作名单 Rules 合法的计划，再使用当前席位凭证从注入的真实 RoomRuntime 重新读取投影，调用已有 RosterPlan→TurnPlan 桥核对席位、房间、规则审查、来源、任务和部署。返回给 Bot 的只有计划、会话回执和来源哈希，不返回席位凭证或 Room 私有状态；Bot attach 仍会在实际使用时再次核验。

上述两处代码修改后的**一次**相同范围复验通过：内存权威 Room 创建成功，初始 revision 0；房间与计划的 player1 Rules audit 均为 `32c0bbd6ed6e08099489dd17ce4cf0024a172e164860811197630f283b43402b`；赛前来源 hash `2192b9e31c094dbb41af8124d02c0f936314b5689fdf1dda1c3daa87e5c42222`；用 player2 的席位凭证冒充 player1 被拒；返回 bundle 不含 token/credential/secret 字段。此检查使用已经付费保存的计划，本次 Provider 调用/units/成本 `0/0/¥0`，没有持久 Room 变更或训练晋升。第一次失败没有被标成通过；第二次是代码改变后的唯一对应复验，没有全量重跑。

## 尚未完成的 S272

1. 在真实 Bot attach 中消费此 bundle，验证开局 TurnPlan、后续对手动作、跨回合反思和重启恢复，检查公开计划是否确实影响选择，不能只凭 seed hash 判断。
2. 同任务/地图/预算下对照预制 2000 分表、Agent 写表及有无赛前计划，比较合法候选率、资源利用、得分、击杀、动作时间和费用；S271 的 3 候选仅 1 合法、少花 500 矿是明确待检问题。
3. 当前 Web 工作台仍缺从选定名单直接创建 Room/选择席位的用户入口；本次服务端 seam 不能冒充完整产品旅程。设备验收仍属 Ticket 14，需实体 Android/完整 Xcode 与最新产品包。

## Harness/evolution receipt

- `harnessLoopUsed`: true；`targetGames`: StarCraft TMG Standard 2000。
- `promptPackRoutes`: 使用保留的 `agent_teach_v1` 计划，没有新模型调用。
- `harnessToolsCalled`: official source lock、Rules-owned Standard Room Factory、Current Product Match Runtime、真实内存 RoomRuntime seat read、RosterPlan→TurnPlan seed bridge。
- `uiTraceEvidence`: 此片没有新的 UI 操作；S271 的浏览器截图不冒充本片产品交接证明。
- `agentDecisionEvidence`: 保留的公开小计划/最终军表；无新的对局决策。
- `memoryTraceEvidence`: 赛前来源 hash 已形成；TurnPlan 开局日志、跨回合延续仍待验证。
- `trainingTraceCandidates`: none；`rollbackOrDemotionRules`: stale/非法/错席/错 Room/错 audit/来源漂移不得交接。
- `userVisibleChecks`: 此片仅服务端入口；完整建房和计划状态的页面反馈仍待实现。
