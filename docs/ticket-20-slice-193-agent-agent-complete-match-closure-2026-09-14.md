# Ticket 20 / Slice 193：双 Agent 完整局编排收口

日期：2026-09-14。状态：完成。该交付补齐 Slice 193 原始范围中此前缺失的
Agent-Agent 证据，不新增 Slice 196。

## 交付

新增 `agent-agent-experiment-orchestrator-v1` 深模块，外部 Interface 只有
`start / run / pause / resume / recoverSeat / read`。模块内部负责：

- 把同一权威 Room 的两个 Hosted Bot Seat 固定到一个有限实验单元；
- 固定当前官方数据、规则、正式策略包、Hold Position 地图、Marine/Zergling
  有界军表、权威 RNG 记录方案和 160 原子动作预算；
- Terran 路由“总规则 + Terran Armed Forces + Terran→Zerg”，Zerg 路由
  “总规则 + Zerg Swarm + Zerg→Terran”，不存在双方共用错误对抗方向；
- 模型只选择当前 ActionSpace；宿主持有两个席位凭证并执行 Preview、Confirm、
  ControlLease、Apply、Replay；
- 只在已提交原子动作边界暂停，保留双方各自的同局记忆、TurnPlan 和 ActionIntent；
- 记录 Critical/High 阻塞与 Medium 非阻塞失败、有限分母和动作预算；
- 公共轨迹不包含 SeatGrant/API key/Authorization/Secret，也不能自动发布 Skill 或
  进入训练真值。

Hosted Bot Seat 现显式支持两种运行模式：`user_vs_agent` 默认走
`opponent_prompt`，`agent_vs_agent` 走 `selfplay_agent_prompt`。模式写入持久记录和
每条轨迹，重连不能静默换模式。轨迹同时记录实际 Provider 调用数、正式 Skill 引用，
以及模型/宿主的 Confirm/Apply 次数。

## 唯一聚焦门

执行：

```sh
node scripts/verify-ticket-20-agent-agent-complete-match-v1.mjs
```

一次通过：

- 有限分母 `1/1`；五回合自然终局，无投降捷径；
- 共 `80` 个 Apply→Replay 原子动作：Terran/player1 `43`，Zerg/player2 `37`；
- 第 `8` 个动作后原子边界暂停，player2 Hosted Seat 重连 epoch `+1`，随后从同一
  Room/Match/记忆续跑到终局；
- 每条轨迹均为 `agent_vs_agent + selfplay_agent_prompt`，含空间 Observation、
  ActionSpace、连续性上下文、TurnPlan、ActionIntent 与三项定向 Skill 证据；
- 每条动作 Replay 成功，最终 Room Replay 与当前状态一致；
- Critical/High `0`，Medium `0`；模型 Confirm/Apply `0/0`；自动晋升 `false`；
- Provider 调用 `0`，输入/输出 token `0/0`，估算费用 `¥0`。

机器收据：
`build/ticket-20-agent-agent-complete-match-v1/report.json`。

## 诚实边界

这是冻结当前官方绑定下 Marine 对 Zergling、Hold Position 的一个完整有界实验单元。
它证明双 Agent 编排、有限池配对、暂停/恢复、位置/计划/记忆接线、权威执行和安全
轨迹，不证明真实大模型策略强度、任意写表军队、完整 LegalSpace、生产资格或
MuZero 训练数据质量。扩大对手池和统计分母属于后续真实评测，不反写本次 `1/1`。

