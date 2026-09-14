# Ticket 23 / Slice 221：Hosted Opponent V2 与实体操作任务收口

日期：2026-09-14。状态：完成；Ticket 23 为 `7/15`，剩余 `8` 片。

## 交付物

- `physical-operation-task-runtime-v1.mjs` 从权威动作前后玩家可见状态 diff 出
  `place/move/remove model`、Unit 血量/状态记录以及 Token/Marker 放置、移动、移除和
  状态更新。只有被配置为 human/agent custody 的实体才创建任务；digital-only 不建。
- 动作前状态在权威 Apply 之前以 idempotency key 写入可注入 CAS store。若 Apply 已
  提交但网络或进程中断，恢复进程使用同一 request key、权威 receipt 和动作后状态
  重建任务，不重新调用模型，也不漏掉实体同步义务。
- `hosted-opponent-runtime-v2.mjs` 组合现有 Hosted Bot V1 自动事务、共享 physical-sync
  mutation gate、用户通知与可选 Physical Agent port。机器合法动作仍由 Host 自动
  Preview/Confirm/Lease/Apply/Replay；模型不持有凭据、Confirm 或 Apply 权限。
- 普通“不同意”不是 API，不能否决已接受的合法对手动作。用户可本人完成、委托 Agent，
  或开启规则争议；争议和未完成任务暂停后续依赖 mutation，但不回滚数字权威事实。

## 唯一聚焦验收

一次门通过，覆盖：

- 第一次 Apply 在权威提交后模拟网络中断；新 V2 runtime 重连后幂等恢复；
- DecisionPort `1` 次、Host confirm `1` 次、Apply transport `2` 次、模型 Confirm/Apply
  均为 `0`；
- 动作前 observation 从共享 CAS store 恢复，产生唯一 `move_model` 任务；
- task pending 时得到 `waiting_physical_sync`，规则争议时得到
  `waiting_rules_dispute`；
- 裁判确认原动作后，任务回到 pending，可委托 Physical Agent 并完成；
- 独立 casualty 示例产生 `remove_model + record_unit_damage_or_status`，由人类完成；
- 通知顺序包含机器动作、实体任务、争议开启/裁决与 Agent 委托；
- 没有普通拒绝对手动作的入口，没有 Provider 调用。

## 边界

CAS store 与 Notification/Physical Agent 均为可注入端口；本次验收使用进程内开发
Adapter，所以 `productionRoomEligible=false`。共享 gated Room port 已可供人类和机器
入口共同使用；它在 Slice 225 Web 产品组合前不宣称所有 HTTP mutation 已完成接线。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `opponent_prompt`（注入确定性 DecisionPort，Provider 0）
- `harnessToolsCalled`: read Room/LegalSpace, decision, Preview, host Confirm, Lease, Apply, Replay, stage/finalize PhysicalOperationTask, notify, delegate, dispute/resolve
- `uiTraceEvidence`: none；Web 任务面板属于 Slice 225
- `agentDecisionEvidence`: 一次合法 move 决策，断网恢复不重复决策
- `memoryTraceEvidence`: V1 outcome trace + durable pre-Apply physical observation
- `trainingTraceCandidates`: none；全部 `trainingTruth=false`
- `rollbackOrDemotionRules`: pending/dispute 阻挡新 mutation；High 阻断，Medium 通知故障不撤销权威动作；任务恢复使用同一 idempotency key
- `userVisibleChecks`: 自动动作通知、实体任务、本人完成、Agent 委托、规则争议与恢复

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
