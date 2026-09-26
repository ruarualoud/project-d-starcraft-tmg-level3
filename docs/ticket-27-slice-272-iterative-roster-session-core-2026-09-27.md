# Ticket 27 / Slice 272 — 可恢复计划↔军表会话内核

本片只交付 `IterativeRosterPlanSession` 的深模块内核，**不是**新的正式写表结果，也未替换现有三轮生产入口。旧已付回复、固定表计划、原 A/B 房间不改。

外部接口为 `start/resume/pause/read`。每次 `resume` 只处理一个模型决策，状态持久化后调用外部模型 Adapter；没有以三轮为全局成功/失败依据。一个决策可以提出整表、并行只读查询或请求完成。Builder 始终决定合法性和真实矿物消耗；不足额会要求预算分支证据，但算术顺序不等于策略排序。模型必须说明是否保留/修改胜利路线，新的路线要绑定已经观察到的地图查询回执。仅当 Builder 判精确 2000/2000、进场日程为合法、地图回执来自 `map_route`、计划绑定当前名单且最终复核零阻塞，宿主才可进入 `ready_for_match`。

模型请求前保存确定性 `requestKey`。若发送结果不明，状态转 `requires_reconciliation`；后续只能让 Adapter 用同一 key 取回已保存回复，不能重新发送。当前 Workspace 已有已付回复保留与 pause 基础设施，但还**没有**接到这个新模块；生产 Adapter 的 `recover`、真实 Builder/地图/Skill 接入、版本迁移、Web 旅程与实际 Flash 2000 分军表仍待下片。

针对已有“1870 被当作差不多完成”和“三轮内无法真正修改路线”的缺口，聚焦验证先因缺模块失败，再在本地假模型/假 Builder Adapter 下完成：1870 合法草案→预算分支→暂停→地图查询→修改计划与合法 2000 草案→最终复核→ready；四轮决定、两次 Builder、一次预算/一次地图查询，零 Provider/Room。另以具体故障注入先红再修：未知发送结果不能在续跑时重复调用 `decide`，必须用 `recover`；预算回执不能冒充地图可达证据。最终对应命令 `node scripts/verify-ticket-27-slice-272-iterative-session-v1.mjs` 一次通过。没有运行无关全量门禁。

模块级结论仅是“正确的会话 seam 可承载持续查询与计划修订”；真实从头写表仍不稳定，Ticket 27 保持 **5/6**。下一片把新版本会话接入正式 Workspace 的持久草稿和 Keychain→Flash Adapter，用原冻结 Standard-2000/地图作一次新鲜生成，观察真实查询、Builder 军表、复核与成本；失败时只从已结算轮续接。

## 同日增量：正式 Builder 判定接线

在上述内核之后，用冻结官方 Standard-2000 recipe 做真实 Builder 回执复现。迭代会话原先只接受假 Adapter 的 `{legal,mineralSpent}`，正式 `evaluateRosterCandidate` 返回已签合法判定或类型化拒绝，聚焦命令先红 `ITERATIVE_ROSTER_RULES_VERDICT_INVALID`。新增 `iterative-roster-builder-adapter-v1.mjs`：对正式合法回执验证内容 hash 与 Rules audit，对拒绝回执验证 receipt hash；拒绝时不伪造 mineralSpent，保留 `rejectionKind` 与规则/寻址错误码供下一轮模型查询。会话仅把 `legal` 且精确预算的候选存作当前名单，拒绝不是完成也不是训练真值。冻结真实 Terran 2000 recipe 和错误势力候选的唯一聚焦门通过；旧内核假 Adapter 门因合同字段直接受影响，各跑一次也通过。两门均 0 Provider/Room。

这只关闭真实 Builder 的 seam；会话尚未接 Workspace 的持久草稿、Flash、地图/预算工具与最终计划产物，不能声称正式 2000 分新鲜写表已经成功。

`harnessLoopUsed=true`; `targetGames=[starcraft-tmg]`; `promptPackRoutes=[ticket27.roster_strategist.iterative.v1（待正式接线）]`; `harnessToolsCalled=[假模型 Adapter, 假 Builder Adapter, 假地图/预算工具, 最终复核 Adapter]`; `uiTraceEvidence=null`; `agentDecisionEvidence=四轮合成公开决策，非真实模型`; `memoryTraceEvidence=持久会话、不可变迭代收据和同 requestKey 恢复`; `trainingTraceCandidates=[]`; `rollbackOrDemotionRules=未知发送禁重发、非地图证据拒绝、未满 2000 或最终 High 禁晋升`; `userVisibleChecks=模块级聚焦通过，正式 Web/模型未验`。
