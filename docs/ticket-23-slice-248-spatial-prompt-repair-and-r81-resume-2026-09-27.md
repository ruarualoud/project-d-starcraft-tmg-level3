# Ticket 23 / Slice 248 — r80 决策恢复到 r81

## 原失败与范围

同一无赛前计划 Standard-2000 房间 `20260926182512804` 在 r80、第 2 回合 Assault、player2 停于 `LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`。旧 Planner 五次付费回复中有三轮语义纠错：先忽略 Pass 机会成本，随后混淆 Goliath 的当前/未来火力，最后明知 Raptor 到 Marine 最近底盘边缘 `18361` milli-inch、当前最大冲锋移动 `12000` milli-inch，却再次推荐该冲锋。规则/宿主校验正确拒绝；不能放宽冲锋规则。

保存的十份 `space.inspect_relationships` 回执含 121 条边、91 条不同的完整边，旧 Planning 提示约 919377 字节。新版本只缩减模型可见的概览边和重复边，完整带哈希回执仍在持久记录、语义校验仍读原件。六个当前 Charge 域都有精确底盘边缘数据，六个均确定超过最大接敌距离；该事实单列为 Host 派生、非 Rules 裁定的 `current-charge-reachability` 节点，未知仍是未知。

三轮耗尽后仅在**显式续跑、当前选择尚未完成、最后付费输出已落盘、提示词策略版本改变**时允许一次新的纠错 epoch。原五次尝试、查询、警告和费用保留，新的三轮计数单独开始；同一策略版本、非显式重试或第二次修复 epoch 都拒绝。当前 JSON-channel 策略由 v26 升 v27。

首次真实续跑在模型前暴露 Web 验收驱动竞态：浏览器 `POST /__ticket23/a2a/ui-drive` 返回 202，但两秒后的状态读取先于后台 job 登记，Runner 错报 `SLICE248_DRIVE_SUBMISSION_NOT_OBSERVED`。修正为最多 20 秒只读轮询同一次提交，不再次点击、不重复发动作。此轮新增模型调用 0，房间仍 r80。

## 同房真实结果

第二次续跑未重建房间。新的 Planning 提示 `702767` 字节，比旧约少 23.6%；其一次模型回复通过 Planner 语义校验，选择 `player2-swarmling` Run 指向任务标记 4，并明确引用六个不可达冲锋中的 Swarmling 结论。Action 再一次回复选择 Host 提供的队形，Rules Preview→Apply→Replay 通过，房间 **r80→r81**，无新语义纠错。总 Provider 调用 **218→220**，整局估费 **¥31.727751→¥32.344679**（新增约 ¥0.616928；模型使用量为输入 `216273+250645`、输出 `7891+3906` units）。旧纠错三轮仍留在 journal；新 epoch 为零轮纠错。

逐动作与完整棋盘截图：`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260926182512804/screenshots/0429-r081-player2-run-applied.png`、`screenshots/0430-r081-player2-run-complete-board-applied.png`。动作回执在同目录 `actions.ndjson` 第 81 条，`postStateRevision=81`、`actionType=run`、`receiptHash=5831db8e…2ef223`；Runner 的 `additional_action_count` 检查点成功。这只证明当前动作合法且链路恢复，不证明整局胜负或策略质量。

## 后续观察与回退条件

- 无计划房已从 r81 同目录继续后台长跑；任何新 Critical/High、实际不合法动作或失效的 Apply/Replay 仍需停下，不因旧修复自动忽略。
- 模型公开计划把 18 模型 Swarmling 的当前 Supply 写为 1。当前 Skill 快照也有这一说法，但应以冻结官方单位记录、Builder 与本房 Rules `supplyControl` 三者核对；不能仅凭模型正文或此前对 Raptor 的结论改数据。若不一致，阻断其策略评价并追取数链。
- 本轮提示压缩把 Planning 降到约 703 KB，Action 仍约 827 KB；不得只凭字节缩小宣称端到端时延变快，后续按真实调用阶段测量。
- `harnessLoopUsed=true`；目标 StarCraft TMG；路由 `selfplay_agent_prompt`；使用 `space.inspect_relationships`、LegalSpace、Host 冲锋距离派生、队形求解、Rules Preview/Apply/Replay；UI 证据为 r81 双截图，决策证据为选择 Run 与放弃确定不可达 Charge；同局计划/预测保留在 seat journal；未晋升训练样本。若后续新提示导致计划更保守、事实遗漏或相同失败重现，应回退 v27 投影，而不改 Rules 真值。
