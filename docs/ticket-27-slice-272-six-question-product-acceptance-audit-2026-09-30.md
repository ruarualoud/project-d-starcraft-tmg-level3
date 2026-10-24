# Ticket 27 / Slice 272 — 六项产品验收审计

状态：只读审计，不重启或续费任何房间，不把局部 Rules 动作验收扩大为完整产品验收。用户待决定首张最终地图及旧房续跑策略。Ticket 23 为 33/36（S248–250 开放），Ticket 27 为 5/6（S272 开放），Ticket 24 正式地图为 53/75，长期三链仍 0/3。

## 1. 执行可靠性

A 原房第 4 回合 r60 的冲锋队形误判已定点修复，原房 r60→r61 的 `resolve_charge` 签名 Apply/Replay 一致；这证明一项故障恢复，不是稳定率。独立的 E 前端机机房仍在 r50 停止，`autoDrive.status=failed`、`stopReason=provider_transport_failed`、`orchestrator.status=blocked`。player1 当前决策 `provider_failed_requires_explicit_retry`；最后 Action attempt 为 `provider_failed_after_possible_egress`：约 419 ms DNS、622 ms TCP、846 ms TLS、1654 ms 请求写完，等待响应头约 85,065 ms 后失败，未收到用量回执。不得把它记为模型格式错误，亦不得自动重发可能已发出的请求。

另有 Web 新鲜写表来源审核 6→2→5 High 不收敛，这是赛前计划/来源审查链的独立故障。现有问题至少分三类：空间求解与 Rules 合同不全、可能已出站的 Provider 传输歧义、模型计划/来源审查不收敛。共同的产品层缺口是尚无覆盖“写表→计划→最终地图→人机/机机机器席位→终局→复盘”的统一准出门；这是从现有独立入口和未完成门推断的工程结论，不声称它是每个故障的直接原因。

## 2. 机机与人机的机器部分

`serve-ticket-20-human-agent-web-v1.mjs` 的机器席和 `serve-ticket-23-slice-248-agent-agent-web-v1.mjs` 的两机器席均调用 `createStarcraftTmgLiveOpponentProviderStackV1`；A-A 夹具在 `createTicket20HumanAgentDemoFixtureV1` 上加第二席，正式 Standard 路径均使用 `createStarcraftTmgHostedOpponentRuntimeV2`、Room Rules/Preview/Apply/Replay。共享核心不等于产品等价：人机为 `user_vs_agent` / `opponent_prompt`，机机为 `agent_vs_agent` / `selfplay_agent_prompt`；赛前机选表/计划交接、玩家操作与通知、建房入口也不同。尚无相同冻结状态下机器席的跨模式输入/动作/回执对照，亦无最终地图上的真人前端完整路径验收。

## 3. 谁写了表与计划

E Room `t27-72c5bb5295d7d9ce2fca96864429dd16-r2` 的 player1 赛前快照有模型自选 Terran 10 Unit、Builder 2000/2000 和 `active` v1 地图计划；其 r50 TurnPlan 第 15 版保留 `pregamePlanOrigin.rosterMode=agent_built` 和计划来源哈希。player2 为固定 Zerg 表，最新 TurnPlan 第 14 版的 `pregamePlanOrigin=null`。A 房为固定表、无赛前计划。E 证明一次机器写表/计划接入，不证明多次无干预稳定生成；其赛前计划的 `openingDeploymentSchedule.placementAndPathVerified=false`，不是全局位置执行证明。

## 4. 耗时

E 的网页连续驱动从 02:35:12.800Z 到 03:44:12.828Z 运行约 69 分钟，完成 29 个动作，第 30 个作业失败；扣除最后失败作业约 3 分 48 秒，成功动作平均约 2 分 15 秒，未达到一分钟。最后失败作业的四次串行 Provider attempt 分别约 5.8、47.6、40.9、86.9 秒，请求正文约 255、320、367、399 KB；Room 读取约 0.77 秒，故主要可见耗时是逐轮模型/工具材料与传输，而非单次 Room 读取。此处只是一个受阻动作的剖面；性能优化未做最终验收，不承诺所有动作分位数。

## 5. 地图与可见矩形

E Room 冻结 `sc1_lost_temple_v1`，`terrainPresetId=standard_balanced_nine_v1`、`rulesTerrainPieceCount=9`、`backgroundRulesAuthority=false`。截图可见矩形后摆地形；现有地形规则生效，但不是美术岸线/高地/坡道与规则轮廓逐点一致的最终地图。Lost Temple 新语义候选仍隔离、冻结五部署审查 4/5 且视觉楔形不合格；Daybreak v4 候选五部署几何 5/5、正式 Room 三动作 Replay 3/3，但 Room 内坡道移动、多模型和全任务/部署准出未完成，仍隔离。正式总账 53/75；20 图预览不等于 20 图正式房间可用。

## 6. 为什么有计划/无计划画面相似

当前不是严格 A/B：A 为 15 Unit 固定表、第 4 回合 r61；E 为 18 Unit 总配置、第 1 回合 r50，player1 又换成机器自选 10 Unit。所谓“无赛前 plan”的 A 仍有局中 TurnPlan（player1 第 41 版，`pregamePlanOrigin=null`）；E player1 的赛前计划明确选择守 markers 1/3/5、击杀机会收益，其局中 TurnPlan 保留这一方向。因此同一 Hold Position 任务下视觉收敛是合理的，但不能据此证明赛前计划有效或无效。策略因果对照须同军表、同最终地图/任务/规则/可比随机条件，唯一变量为赛前计划，分别记录决策、分数与反事实。

## 尚待用户决定的执行顺序

### 只读性能剖面补充

从 E 房两席保存的 completed 决策逐条读取 `createdAt/completedAt`、attempt 时间戳、查询数与请求体积；不发送模型请求。player1 的 19 条中有一条 r21 跨断线恢复、墙钟约 59 分钟，不可当作单个连续动作耗时，单列并从下面的分位数剔除。余下 player1 18 条：墙钟 p50 **84.442 秒**、p90 **157.345 秒**，Provider 耗时 p50 73.787 秒，非 Provider 差额 p50 10.834 秒，调用数 p50 4、查询回执数 p50 5，按总墙钟加权的 Provider 占比 84.0%。player2 14 条：墙钟 p50 **93.030 秒**、p90 **123.121 秒**，Provider p50 61.244 秒，差额 p50 17.114 秒，调用数 p50 5、查询数 p50 5，Provider 占比 74.6%。原始集合中每个决策最大提示体积的 p50 分别约 330 KB／355 KB，p90 约 425 KB／466 KB。

这比单个 r50 失败作业更有代表性：当前模型决策的中位数本身就超过 60 秒。初步排除“只要加速开房/Room 读取就达标”；对 60 秒目标要压缩串行请求和重复注入的证据体积，同时保留 Planner 查询权与 Action 的规则实例化，不允许用一次性盲猜替换。性能改动必须用保存的多个合法局面做决策等价/策略负效应对照，再测真实 Web 墙钟；尚未实施或声称达标。

建议现有 A/E 回执保留为工程故障与低策略样本，暂不以其作为最终产品验收；在未决定前不续费 E 的模糊出站尝试，也不热替换旧房地图。先准出一张最终地图，再对齐人机与机机机器席位的输入/动作/回执合同，建立前端 AI 写表→计划→正式 Room→对局→复盘的一条产品路径；在完整付费重跑前先针对 60 秒/动作目标做剖面与定点性能优化。地图先选 Daybreak（现有规则证据较多）或 Lost Temple（现有计划主题，但视觉/通路缺口较多）由用户确定；旧房是否继续到终局亦由用户确定。无论选择哪图，旧计划若地图冻结绑定变化须重新审查/生成，不能静默迁移。

## Harness 证据

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [selfplay_agent_prompt, opponent_prompt]`。
- `harnessToolsCalled`: 只读 Web Room manifest、SQLite Room revision、保存的 Provider attempt/TurnPlan、代码入口和地图候选报告；本轮无模型调用、无 Room mutation。
- `uiTraceEvidence`: A r61 完整棋盘截图见 `ticket-23-slice-248-a-r60-charge-formation-recovery-2026-09-30.md`；E 当前状态来自服务 manifest，未新拍 UI 截图。
- `agentDecisionEvidence`: E player1 r50 TurnPlan 与保存的四次 Provider attempt；A 动作 60 的 Rules receipt/replay。`memoryTraceEvidence`: E player1 机选赛前来源、player2 无来源，A 局中计划而无赛前来源。
- `trainingTraceCandidates`: 均为待审原始样本，未晋升。`rollbackOrDemotionRules`: E 模糊出站停点不得盲重发，A/E 不作为最终地图策略有效性证据；最终地图/跨模式合同未通过前不提升训练真值。
- `userVisibleChecks`: 矩形地形与地图美术不一致、前端完整人机链路/一分钟门仍未验收；只读 manifest 不能替代浏览器全流程。

E 当前内部累计估费 ¥39.194982／157 Provider calls，最后传输 attempt 用量未知；A 独立新增窗口 ¥45.323199。两线均未达各自新增 ¥100 通知线，数字不是 Provider 发票。
