# Ticket 23 / Slice 248 — A 房 r60 冲锋队形恢复

状态：局部故障已修复，原房间从 revision 60 推进到 61；完整对局及同表有／无计划对照未完成。此记录不是策略效果或整局准出证明。

## 故障与修复

- 原房间：`build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF`。第 4 回合 Assault、player2 的双模型 Hydralisk 已宣告对 Marine 1 冲锋，掷骰后的最大移动为 7000 milli-inch。
- 保存的 Planner 选择唯一的 `resolve_charge` 参数域；旧 `space.solve_formation` 回执为 `RULES_QUERY_NO_LEGAL_FORMATION_OPTION`，导致 `LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE`。旧求解器生成的十个候选中，八个因跨高地而缺少坡道 `elevationTransitions` 被 Rules 拒绝，另两个不满足完整底盘几何；没有 Rules 认证的必然失败证明，不得把搜索失败说成冲锋失败。
- `legal-formation-search-v1.mjs` 的求解版本升至 v2：跨海拔的直接冲锋路径仅在确实穿过权威 access point 时附带该点的 transition，候选仍交 Rules 实例化。相同冻结房间的无费用诊断由旧版付费意图／中性意图均 0 个候选，变为新版分别 4／3 个 Rules 合法候选。
- `live-flash-decision-port-v1.mjs` 只允许同一 Room、state/hash/LegalSpace、单一不可用候选、已完成且已处理的原 Planner attempt 做一次版本化本地重验。它保留旧未知回执作为审计，撤销该候选的暂时不可用标记，复用已保存的 Planner 输出；版本 warning 防止同版本循环。没有伪造位置或直接改房间。

## 聚焦验证及真实续跑

- 该具体故障的保存选择验证在修复前因恢复规划函数缺失而红；代码变更后仅运行相关门禁一次：`node scripts/verify-ticket-23-slice-248-a-r60-formation-recovery-v1.mjs --run-directory=<A 房目录>`，结果 `oneLocalSolverReplay=true`、`alteredAuthorityRejected=true`、`providerCalls=0`、`roomMutations=0`。
- 同一 A 房通过现行 Web 对局运行器 `--resume-directory=<A 房目录> --checkpoint-after-additional-actions=1` 续行，未重建房间。保存的 Planner 重新进入查询，`space.solve_formation` 返回四个合法选项；Agent 选 `requested-left` 队形，`instantiate_parameterized_action` 为 exact。Rules 应用 `resolve_charge` 到 revision 61；动作 60 的签名回执 `fa98e81b4e3339f5eabaa257f83d15a188e006b15c9f04ce098552a9f4215628`，`replayMatchesCurrent=true`。
- 新模型调用发生在随后行动阶段：总调用 193→195，不是重新付费生成旧 Planner。A 分账自本轮基线的内部估费为 ¥45.323199，下一提醒阈值 ¥100；该估算不是 Provider 账单。房间分支自身累计估费 ¥40.108517，含祖先的成本流为 ¥113.539322，不能与 A 的新增窗口或 E 的费用混称。
- 截图：[冲锋前完整棋盘](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF/screenshots/0384-r060-room-next-agent-decision-complete-board-before.png)、[冲锋后完整棋盘](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF/screenshots/0387-r061-player2-resolve_charge-complete-board-applied.png)、[Agent 控制面板](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF/screenshots/0388-r061-player2-resolve_charge-agent-control-applied.png)。逐动作原始记录在同目录 `actions.ndjson`。

## Harness 记录与边界

- `harnessLoopUsed`: true；`targetGames`: StarCraft TMG；`promptPackRoutes`: `selfplay_agent_prompt`，同房 player2 决策。
- `harnessToolsCalled`: `space.solve_formation`、`space.inspect_relationships`、`instantiate_parameterized_action`、Room Rules Apply/Replay；前端运行器读取并截图。
- `uiTraceEvidence`: 上述前后桌面和控制面板截图；`agentDecisionEvidence`: `actions.ndjson` 动作 60 的队形选项、公开理由、Rules 回执和 replay 一致性。
- `memoryTraceEvidence`: 沿用同房已保存的 Planner attempt；本轮未证明长期计划改进，也未晋升记忆。
- `trainingTraceCandidates`: 动作 60 的记录仅为原始候选，需在整局及策略复盘后审核；`rollbackOrDemotionRules`: 若同权威状态重验无法稳定产生合法选项、Room Apply/Replay 不一致或后续发现规则冲突，撤回求解器 v2 的准入，不把本动作当训练真值。
- `userVisibleChecks`: 真实 Web 棋盘可见冲锋后两模型的落点；地图文本和图标仍有视觉拥挤，属于独立 UI 问题；合法动作和策略优势不能仅由截图推断。

下一步：A 房从 r61 后续行至终局；E 前端发起的 AI 写表对局独立继续。两局和正式地图的完整验收仍开放。
