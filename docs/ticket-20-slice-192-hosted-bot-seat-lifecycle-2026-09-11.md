# Ticket 20 / Slice 192：Hosted Bot Seat 生命周期

日期：2026-09-11。状态：完成。Ticket 20：`7/10`。

## 交付结果

`hosted-bot-seat-runtime-v1.mjs` 以一个深模块封装 `attach / drive / read /
close` 四个操作。人类先授权“当前对局 Bot 席位自动化”，宿主持有 SeatGrant；
DecisionPort 只收到玩家视角 Room、当前 LegalSpace、空间 Observation/ActionSpace、
本局记忆与 TurnPlan，不收到任何凭据，也没有 Confirm/Apply 权限。

每次轮到 Bot 时，宿主执行：

```text
Room + LegalSpace
  -> Spatial Observation / ActionSpace
  -> same-match memory + TurnPlan reflection
  -> opponent_prompt decision
  -> current ActionSpace membership
  -> Preview
  -> host confirmation under current-match consent
  -> ControlLease
  -> Apply
  -> Replay verification
  -> intent/outcome/trace persistence
```

相同 room/match/seat 只有一个 drive 在途。Apply 请求在发出前完整持久化；若权威
Apply 已成功但响应中断，新进程重连后会重发同一个 idempotency request，并以 Room
返回的同一结果继续 Replay，而不会重新调用 DecisionPort。Provider 在同一快照上的
失败不自动重试；Critical/High 阻断，Medium 留档并暂停等待显式 drive。

安全投影只公开生命周期、动作数、回放状态、决策摘要、计划/意图/空间/记忆 hash、
安全问题与工具轨迹。SeatGrant、原始 Prompt、私有 reasoning 和 Provider 凭据均不
进入投影。模型 Confirm=`0`、Apply=`0`；宿主 Confirm/Apply 可审计。

## 聚焦门

唯一 S192 门通过：DecisionPort 只调用 `1` 次；第一次 Apply 在权威成功后模拟网络
中断；新的 runtime 使用同一 store 重连并以相同幂等请求恢复，Room Apply 调用共
`2` 次但权威动作只发生一次；Replay=`1` 次且匹配当前状态；模型 Confirm/Apply 都
为 `0`。未调用 Provider、未刷新来源、费用 `0`。

本 Slice 证明 Bot 席位生命周期和幂等恢复，不证明任意军表规则空间、真实模型策略
强度或 Web 完整局；这些属于 Slice 193 及后续。

## Harness 证据

- `harnessLoopUsed: true`
- `targetGames: [starcraft-tmg]`
- `promptPackRoutes: [opponent_prompt]`
- tools：board、LegalSpace、spatial observation/action space、same-match memory、
  Preview、host confirmation、ControlLease、Apply、Replay、episode trace
- UI/decision/memory：安全 projection、decision receipt、continuity/plan/intent hashes
- `trainingTraceCandidates: []`
- 回滚/降级：关闭 Bot、显式重连；Critical/High block，Medium pause；同状态 Provider
  失败不自动重试

