# Ticket 27 / Slice 272 — AI 自选军表的 Teach 提升重启断点

状态：局部修复，Slice 272 仍开放。前端一键写表并开局尚未验收。

## 具体故障与修复

第二份真实 C 会话的合法 2000/2000 名单及 D Teach 计划，复制到隔离目录后执行正式产品提升。首次提升成功；重建产品模块后，同一 `prepareAgentSelectedTeachPromotion` 把已提升的 AgentScheduled 计划误当作原始锁表 Teach 计划，报 `PLANNED_PRESET_PLAN_INVALID`。这是产品断点，不是模型选表错误，也不是换表。

工作台现在在提升时原样保留锁表 Teach 计划序列化文本与当时的 Teach 会话回执。重启后桥接仍从这两份原始证据和原 C handoff 推导，并比较原计划 hash 与 `sourcePlanHash`；缺原始材料的旧实验记录明确拒绝，不能以已提升的计划伪装来源。原始名单、Builder 审计、地图回执及进场时序不变。

聚焦命令 `node scripts/verify-ticket-27-slice-272-web-agent-promotion-restart-v1.mjs` 先红（上述 `PLANNED_PRESET_PLAN_INVALID`），修后同命令一次通过。它确认重启前后 bridge/会话回执 hash 相同、原 Teach 计划与回执仍可读、再次提升幂等。两次运行均只用已保存的真实 C/D 产物；0 Provider、0 Room mutation、费用增量 ¥0。修后离线验证约 7 分钟，提示产品模块初始化性能仍需单独优化。

## 边界与下一交付

Web 已能建立 AI 自选写表会话、显示进度和计划，并接至来源审查；本检查没有重新验收 Web UI，也没有新截图。真实 D 来源审查仍只有 4/7 已保存付费片，第 5 片有模糊发送状态；不能重发冒充稳定生产。来源审查后自动修订、正式准入并以该名单建 Room、Bot Seat 接收计划，以及多样本稳定性与整局质量比较均未通过。因此 T27 仍 5/6，剩 S272；T23 33/36，剩 S248–S250；T24 正式 53/75，剩 22 个组合；长期三链 0/3。

现有 T20 Web 演示服务在启动时用固定军表建立唯一房间；其通用 Room HTTP adapter 没有传入 `initialStateFactory`，所以不能把通用 `POST /rooms` 视作“AI 新表开局”。真正的下一产品交付须先裁定当前生成计划，再用原 Agent 名单、同版地图和正式 Builder/Rules 建新 Room，将精确计划交给 Bot Seat，并让网页进入该房间。

## Harness 记录

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`
- `promptPackRoutes: [roster-strategist iterative, locked-roster Teach, final source review V3]`；本次不发送 Prompt。
- `harnessToolsCalled: [persisted C session read, Builder/Rules-backed Teach handoff, workspace plan promotion, product restart]`
- `uiTraceEvidence: none this check; prior Web setup/session screenshots remain separate evidence`
- `agentDecisionEvidence: frozen C r4 2000/2000 selection retained; no new decision`
- `memoryTraceEvidence: original locked Teach plan/receipt and promoted Agent plan survive restart with equal bridge hashes`
- `trainingTraceCandidates: none`
- `rollbackOrDemotionRules: missing/mismatched original Teach source rejects promotion and Room handoff; no fallback to generic plan bridge`
- `userVisibleChecks: no end-to-end Web-to-Room claim; pending actual reviewed plan and generated-roster match`
