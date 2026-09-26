# Ticket 23 / Slice 248 — Worker 故障分类的聚焦修复

## 原房证据与边界

固定表无计划原房 `20260925021950038` 保留在 revision 51；player2 的最后一次请求从 2026-09-26 10:55:06Z 到 11:00:11Z，结算为 `provider_worker_protocol_rejected`。该次 `usage_known=0`、`provider_may_have_been_called=1`，故原有 `476602` units 仅是保守预留，不是实收。更大的一次相邻请求曾在约 30 秒内成功；不能据此归因为输入过长。Room 没有因此多执行一步。

父进程此前把子进程显式发送的 `worker_failure` 当作未知消息，触发通用 `PROVIDER_WORKER_PROTOCOL_REJECTED`。这个分类丢掉了“子进程处理器已报错”和“真正收到非法 IPC 报文”的区别。原房没有保存原始 IPC 消息，因此这项修复**尚不能证明**该房的具体底层根因就是子进程处理器异常，也不能宣称对局已恢复。

## 本次修改与一次对应验证

- IPC 假 Worker 增加 `child_handler_failure` 模式，保持原有线协议字段。
- 新的聚焦验证走真实父端 Worker Port/独立假子进程，先红：期待 `PROVIDER_WORKER_CHILD_HANDLER_FAILED`，实际为 `PROVIDER_WORKER_PROTOCOL_REJECTED`。
- 父端仅在已有待处理请求、请求 ID 一致、字段与版本严格合法时，把 `worker_failure` 归类为 `PROVIDER_WORKER_CHILD_HANDLER_FAILED`；非法消息仍走原 fail-closed 协议错误。已发出请求的未知计费/禁止自动重试语义不变。
- 同一命令在代码修改后执行一次通过：`node scripts/verify-ticket-23-slice-248-worker-failure-classification-v1.mjs`。`providerCalls=0; roomMutations=0`。相关 `git diff --check` 通过；未运行无关门禁。

## 后续准出

已在核对无同房活跃进程、原 `actions.ndjson` 最后一条 revision 51 的 Replay 成功、旧异步任务完成后，从**同一个**原房显式续跑并只要求 1 个新增动作。保存的已付 Planner/Action 尝试继续复用；新请求成功，Queen 用 Creep Spread 在 mission-marker-4 放置 Creep Tumor，`resolve_battlefield_asset_ability` 被权威 Rules Apply、Replay 一致，Room **51→52**。动作后截图 `screenshots/0356-r052-player2-resolve_battlefield_asset_ability-applied.png`，同目录还保留动作前与控制界面截图。累计 `providerCalls` **126→127**、`totalUnits` **11,493,452→11,630,359**、内部估费约 **¥15.660112→¥15.836400**；未知用量的旧尝试仍只作预留，不能把差额当实际总账。动作行的 `providerCalls:8` 含本决策保存的旧轮次，并非本次新增 8 次。新动作并未再次报 Worker High，但这不证明旧故障底层原因已消失。

后续让原房继续执行；新 High 仍应停止，不自动重发未知计费请求。带计划房仍在 revision 3；同表 A/B 尚不能评估胜负。r52 的公开计划从失败的 Raptor 队形移动转到 Creep Spread，具体队形失败原因与策略价值留待 S249 复盘，不能把策略修正冒充工程验证。

`harnessLoopUsed=true`; `targetGames=[starcraft-tmg]`; `promptPackRoutes=[selfplay_agent_prompt/json_channels_v1]`; `harnessToolsCalled=[Worker Port 本地 IPC 复现, 原房 SQLite 安全回执只读, 同房 Web 驱动, Rules Apply/Replay]`; `uiTraceEvidence=r52 动作前/后与控制界面截图`; `agentDecisionEvidence=Queen Creep Spread 的公开意图、对手预测和放弃选项，策略优劣未证`; `memoryTraceEvidence=旧尝试和局内计划连续保留，r52 明确修订 Raptor 移动路线`; `trainingTraceCandidates=[r52 可审阅候选，trainingTruth=false]`; `rollbackOrDemotionRules=新 High 停止，未知费用不重试`; `userVisibleChecks=原房 51→52、Apply/Replay 一致、截图存在、聚焦复现红转绿`。
