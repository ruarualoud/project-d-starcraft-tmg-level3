# Ticket 27 / Slice 272 — 真实 Room 开局计划交接检查点

Status: **S272 进行中，Ticket 27 仍 5/6。** 本片关闭了已生成 RosterPlan 到当前权威 Room、Hosted Bot Seat 开局 TurnPlan 及同局日志恢复的接线前置；没有声称 Bot 已作出多回合决策，也没有完成写表质量 A/B。Ticket 23 原房未变。

## 复现、修复及唯一对应复验

输入是 S271 真实 Flash 会话 `rws-f3c0b5c7-0b54-4f7f-98c7-68241e7daa84` 的最终 Agent 军表和计划：Terran 六单位、1500/2000 矿，对手为冻结的 Kerrigan's Swarm 八单位。Standard Room Factory 已有 `rules_legal_unspent_lost` 并按双方 Rules audit 创建任意名单，但其消费者 `createOfficialCurrentProductMatchRuntimeV1` 在入口仍要求 `state.pieces.length === 15`。第一次真实构造在这里以 `CURRENT_PRODUCT_MATCH_RUNTIME_INPUT_INVALID` 停下，连 Room 创建都没到；这是工程硬编码，不是模型策略或名单不合法。

运行时入口现按两席权威 `armyCompositionUpgradeAuditsBySide[*].units[*].unitInstanceId` 与实际 `pieces[*].id` 做完整一一对应、非空和去重检查，不再把历史示例的十五单位当规则。Room Factory 自身的 Rules、预算、地形和初始储备门没有放松。产品组合层增加仅服务端调用的 `preparePregamePlanForRoom`：它先从工作台读取 `planned` 且未 stale、当前工作名单 Rules 合法的计划，再使用当前席位凭证从注入的真实 RoomRuntime 重新读取投影，调用已有 RosterPlan→TurnPlan 桥核对席位、房间、规则审查、来源、任务和部署。返回给 Bot 的只有计划、会话回执和来源哈希，不返回席位凭证或 Room 私有状态；Bot attach 仍会在实际使用时再次核验。

上述两处代码修改后的**一次**相同范围复验通过：内存权威 Room 创建成功，初始 revision 0；房间与计划的 player1 Rules audit 均为 `32c0bbd6ed6e08099489dd17ce4cf0024a172e164860811197630f283b43402b`；赛前来源 hash `2192b9e31c094dbb41af8124d02c0f936314b5689fdf1dda1c3daa87e5c42222`；用 player2 的席位凭证冒充 player1 被拒；返回 bundle 不含 token/credential/secret 字段。此检查使用已经付费保存的计划，本次 Provider 调用/units/成本 `0/0/¥0`，没有持久 Room 变更或训练晋升。第一次失败没有被标成通过；第二次是代码改变后的唯一对应复验，没有全量重跑。

## Bot 使用及重启恢复的独立实际观察

针对下游而非重复建房门，另建隔离内存 Room 并把服务端 bundle 传给真实 `HostedBotSeat.attach`，`autoDrive=false`，决策端口安装“若调用即报错”的哨兵。附着返回 `ok=true`；TurnPlan 的 `pregamePlanOrigin.originHash` 与 bundle 同为 `10674782ba1f965c9f332977b7b8f38ba9284d661aca05b18a169815ca8381c4`，当前目标存在，决策端口调用 0、Room 写入 0、训练标记 false。这证明 Bot 在首个决策前真实开出计划，不是只生成了一个没人使用的 bundle。

随后使用隔离的 SQLite WAL 决策日志重复上述**不同验收目的**的附着，并关闭原 Bot/日志，重新打开该日志、创建新的 Continuity 与 TurnPlanRuntime，再 `hydrate`。开局来源哈希与恢复后均为 `8daf13922443b0b0eec6083a0e340fb668abdde64f8f446138130c35fe8ca12a`，恢复目标存在、`restored=true`，原 RosterPlan hash 为 `2a0c5932689e945682e986eda2403140e86beb8dfa403f5e6416ee3efe8de162`。没有模型决策、房间动作或 Provider 费用。SQLite 文件只在本工作树的忽略构建目录；不是生产 PostgreSQL 或跨机器可用性证明。

第三个独立观察专门检查**决策端输入**，不重复宣称计划已影响动作：使用 Standard 2000 产品所用的 `HostedOpponentRuntimeV2` 包装器，附着相同保存计划后让它对 revision 0 的真实 LegalSpace 驱动一次。安装的决策端口只摘录公开字段并以 `INTENTIONAL_STOP_AFTER_PLAN_READ` 主动停止，绝不返回动作。该端口恰好调用 1 次，收到 `opponent_prompt`、`planState.plan.pregamePlanOrigin.originHash=952abd8797579dba45aafc8e9c7588b9df6293ff71e9471269a53136da6732f1`，与交接 bundle 相同；当前目标存在，计划状态为 `reflection_required`，Room/LegalSpace 都是 revision 0（2 个 finite action、0 个参数域）。停止后 Room 仍 revision 0、Provider 调用 0。这证明计划确实越过 Bot 包装器进入下一次决策请求，而不是只在存储中；没有采样真实模型输出，不是策略效果验收。

## 尚未完成的 S272

1. Bot attach、同局 SQLite 重启恢复以及真实 Hosted Opponent 决策请求收到 `planState` 已有实证；下一步才是让真实模型给出可执行动作，跟随对手动作和跨回合反思，比较其选择与无赛前计划控制组。已送达决策输入仍不等于策略影响。
2. 同任务/地图/预算下对照预制 2000 分表、Agent 写表及有无赛前计划，比较合法候选率、资源利用、得分、击杀、动作时间和费用；S271 的 3 候选仅 1 合法、少花 500 矿是明确待检问题。
3. 当前 Web 工作台仍缺从选定名单直接创建 Room/选择席位的用户入口；本次服务端 seam 不能冒充完整产品旅程。设备验收仍属 Ticket 14，需实体 Android/完整 Xcode 与最新产品包。

## Harness/evolution receipt

- `harnessLoopUsed`: true；`targetGames`: StarCraft TMG Standard 2000。
- `promptPackRoutes`: 使用保留的 `agent_teach_v1` 计划，没有新模型调用。
- `harnessToolsCalled`: official source lock、Rules-owned Standard Room Factory、Current Product Match Runtime、真实内存 RoomRuntime seat read、RosterPlan→TurnPlan seed bridge。
- `uiTraceEvidence`: 此片没有新的 UI 操作；S271 的浏览器截图不冒充本片产品交接证明。
- `agentDecisionEvidence`: 保留的公开小计划/最终军表已进入 `opponent_prompt` 决策请求；哨兵端口在读取后停止，无新的模型选择或对局决策。
- `memoryTraceEvidence`: Hosted Bot Seat 实际开局 TurnPlan；SQLite WAL 重建后恢复相同来源 hash 和目标。后续动作、对手反应、跨回合反思仍待验证。
- `trainingTraceCandidates`: none；`rollbackOrDemotionRules`: stale/非法/错席/错 Room/错 audit/来源漂移不得交接。
- `userVisibleChecks`: 此片仅服务端入口；完整建房和计划状态的页面反馈仍待实现。
