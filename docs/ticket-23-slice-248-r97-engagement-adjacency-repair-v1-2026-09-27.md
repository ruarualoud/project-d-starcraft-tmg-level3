# Ticket 23 / Slice 248 — r97 战斗阶段合法空间恢复

2026-09-27。无赛前计划 Standard-2000 A/A 房间 `20260926182512804` 在 revision 97、Round 2 Combat、player1 停止，错误为 `LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`。本次不创建替代比赛、不伪造 Pass，只读还原并修复原房间的规则输入。

## 根因

旧 r93 Hydralisk Run 后，`player2-hydralisk-model-2` 位于 `(23.424,13.630)`。空间动作层缓存该模型与 `ramp-1` 相邻，但权威物理底盘/高差几何得出空邻接；r97 严格 Engagement Graph 因 `ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_MISMATCH` 在枚举前抛错，导致连本来可用的 Combat Pass 也取不到。它不是模型拒绝 Pass，也不是第一轮提示词质量问题。

`official-selected-roster-spatial-action-runtime-v1.mjs` 现从最终旋转后的底盘位置调用权威 surface-placement 派生邻接；`official-engagement-graph-v2.mjs` 继续验证缓存 ID 格式，但以即时物理几何作为相邻与交战规则权威，不让旧缓存成为第二套规则。没有改动 r97 历史状态或规则任务数据。

修改相关的既有 elevated-engagement 聚焦门最终 `13/13` 通过；读原 r97 状态后，`enumerateOfficialCombatPassV3Actions` 返回 `isEnabled:true`，双方当前交战集合为空。随后同一房间断点恢复至第 3 回合；截至本文写入时已到动作 111，未重新初始化比赛。Runner 的终端不会逐动作打印，应读同一目录的 `progress.json`、`actions.ndjson`、`screenshots/` 与 SQLite 回执。完整终局和逐步策略审核仍未完成。

## 观察到的非阻断策略问题

动作 110 的 Zerg 公开计划选 `Lie in Wait` 让 Swarmling 获得 Burrowed，却同时说之后靠它强化 marker-4 控制。空间图只证明底盘 3 英寸/同高几何条件，Rules 的标记控制核明确排除 Burrowed；这是“几何可达”与“规则可争夺”被 Agent 混用的策略证据，保留作后续 Skill/工具反馈修复，不回写原始低策略对照局。

Supply 不是该步的数据错误：本局 18 模型 Swarmling 为 Supply 1，与冻结产品目录及 2026-09-27 可见的 Archon 官方规则书一致。不要擅自改成 Supply 2 或大编制。
