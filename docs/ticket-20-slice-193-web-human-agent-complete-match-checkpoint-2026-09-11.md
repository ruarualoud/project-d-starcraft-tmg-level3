# Ticket 20 / Slice 193：Web 人机完整局实现检查点

日期：2026-09-11。状态：历史后端检查点；其 Rules/TurnPlan 阻塞已在同日后续修复，
但产品 Web 验收于 2026-09-13 重新打开。当前结果见
`ticket-20-slice-193-web-human-agent-complete-match-closure-2026-09-11.md`，Ticket 20
现为 `7/10`，等待产品入口真人操作通过。

## 已实现

- 当前冻结官方数据绑定下的 Marine 对 Zergling、Hold Position 有界开发房间；加载
  Ticket 18 的总规则策略、Terran、Zerg、T→Z、Z→T 五个正式基础 Skill。
- 人类 `player1` 与 Hosted Bot `player2` 双席，Bot 凭据仅由宿主持有；确定性
  Skill-guided DecisionPort 不调用付费模型。
- 本地 Web 服务、Room HTTP Adapter、只读 Hosted Bot 状态 API 和安全 manifest。
- Battle Lab 仍只公开 `bootstrap/read/dispatch/subscribe`；绑定房间后轮询 Bot 状态，
  当远端 revision 前进时自动刷新 Room、LegalSpace 和 battle workbench。
- Hosted opponent 面板显示动作数、决策理由、计划/意图/连续性/空间 hash、Replay
  状态和模型 Confirm/Apply=`0`，不投影 Bot SeatGrant。
- 浏览器相关四个模块的语法门已一次通过。

以上覆盖被明确标成
`current_official_bounded_complete_match_development`；`legalSpaceComplete=false`、
`productionRoomEligible=false`、任意军表建军与交互式部署仍未完成，不能冒充生产态。

## 三轮收敛记录与当前阻塞

1. Bot 使用 `model` SeatGrant，Room 正确拒绝 Preview/Confirm/Apply。已改为由人类
   当前对局授权的宿主 supervisor 持有席位凭据，模型仍不接触凭据或权威操作。
2. cleanup 用 `activeSideKey=null + firstPlayerSideKey` 表达有效行动方；Hosted Bot
   原先只读前者。其生命周期判断已改为两者的标准回退。
3. TurnPlan `ActionIntent` 仍使用旧的仅 `activeSideKey` 断言，cleanup 报
   `the agent seat is not active for an ActionIntent`。

按“同一 review/audit 最多三轮”的用户规则，第三轮后停止。下一次只需交付一个
共享的 `effectiveActingSideKey = activeSideKey ?? firstPlayerSideKey` 权威绑定，并让
Hosted Bot 与 TurnPlan 共用它，然后只运行这个具体 bug 的完整局复现门一次。门绿
之前不得把 Slice 193、完整人机局或 Ticket 20 `8/10` 标为完成。

## Slice 194 已记录的凯瑞甘助手增量

当前 companion 问答能读取本席位棋盘和规则 Skill，但不会自动读取公开对局事件或
Hosted Bot trace。因此“对手刚才这步的意图”当前只能泛化回答，不能可靠绑定动作。
Slice 194 将注入公开动作事件、动作前后空间差分和可查询同局记忆，并要求凯瑞甘将
回答拆成“观察事实 / 意图推断 / 置信度 / 可能反制”。对手私有 Plan、reasoning 与
隐藏信息不得泄露给 companion。
