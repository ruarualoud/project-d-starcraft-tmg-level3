# Ticket 23 / Slice 248 × Ticket 27 / Slice 272 — E 房间 r10 与传输诊断

2026-09-29。范围是新鲜 Agent 选出的 2000 分军表带计划对局 E；它不是原固定表 A/B 因果对照。原 Room `ticket23-slice248-aa-20260928191935713` 未重建，冻结规则、军表和赛前计划未改变。

## 真实 Web／Rules 证据

- r9 的 Terran Action 在已收到响应头后读取响应体 300 秒超时，未提交动作。一次显式、同房、单动作续跑到 r10：Terran `player1-exact-repair-2` 部署，回执 `c8f830254c7f97d697a8936f0bb5c2108c860c803ca5a7f603a01670cff61a75`，state hash `4695354ebe4519603d549d0fa44fae91dda9e1f2a0d74d5bcf04e4416cd8f68d`；Rules Apply/Replay 通过。`web-action-evidence/r010-top.jpg` 与 `r010-lower.jpg` 已存；截图驱动等待资源解码后的 `mapArtLoad=decoded`，目视首屏背景已显示。此验证只证明这次截图稳定，不能证明所有设备／首绘情境均无空白。
- r10 之后同一房的新 Planner 请求在约 76 秒后报 `provider_transport_failed`，未新增动作；Room 停 r10，High 未解。最后一次调用 Prompt 约 320,016 bytes，最大输出 32,768 units，历史更大或同上限请求曾成功，不能由长度独自解释。底层旧安全回执没有传输阶段，因此不能断言它在 TLS、等待头还是读取响应体中断。
- r10 模型公开理由选择 Marine 向己方 marker 1 进场，给出占点收益与敌方反制风险；一次 `base_edge_distance` 查询因参考模型不在当前可测实体中返回 `MODEL_BASE_GEOMETRY_REFERENCE_INVALID`，模型把精确距离标为 unknown，没有伪造安全结论。此项保留作策略复盘样本，不用提示注入代替 Skill 评估。

## 具体工程缺口与局部修复

低层 `PROVIDER_TRANSPORT_FAILED` 的请求错误、建请求异常和 `end` 异常原先丢掉了已存在的非敏感 `transportProgress`，Supervisor 只转发 timeout 的阶段信息，LiveDecision 也只持久化 timeout。现在同一份安全结构沿 Egress → Supervisor → LiveDecision 传递失败阶段／时间与响应状态；不传端点、凭据、请求正文或原始错误，不改变策略输入、Provider 发送次数、自动重试和实际费用。针对“响应头后请求连接错误”的三个聚焦门各先失败后一次通过：底层安全回执、Supervisor 投影、LiveDecision 持久化，均 0 Provider／0 Room。运行中的旧服务不会热加载此修复；**没有借此再次付费续跑**，所以网络故障本身未宣称修好。

E 独立账本当前 r10、38 次已登记请求、3,342,862 输入／261,762 输出预留 units、保守估费 ¥10.535800。四次可能已出网而用量未知的失败尝试单列；这不是 Provider 最终账单。C 写表重置后仍 0 调用／¥0，A/B/D 均不并入 E 提醒窗口。

## Harness 记录

`harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [selfplay_agent_prompt]`; `harnessToolsCalled: [Web room projection, read-only spatial query, LegalSpace, Preview, Apply, Replay, LiveDecision and Provider attempt stores]`; `uiTraceEvidence: r010-top.jpg/r010-lower.jpg and actions.ndjson`; `agentDecisionEvidence: Marine deploy reason/risk and r10 blocked Planner attempt`; `memoryTraceEvidence: same-seat plan retained in original Room, not revalidated by this transport fix`; `trainingTraceCandidates: none, trainingTruth=false`; `rollbackOrDemotionRules: if stage data is absent/mismatched or any secret appears, reject the diagnostic receipt; do not auto-retry an ambiguous egress`; `userVisibleChecks: same-room r10 deployment and decoded map art verified, complete match still unverified`.

Next: network/transport recovery must be justified by new phase evidence or external stability; no repeat paid request merely to see if it happens to pass. The fixed-roster B r8 Charge geometry remains a separate High after its three nonconvergent focused attempts; its experimental solver changes were reverted.
