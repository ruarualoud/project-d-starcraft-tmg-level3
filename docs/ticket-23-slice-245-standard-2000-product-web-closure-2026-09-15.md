# Ticket 23 / Slice 245：Standard 2000 产品 Web 旅程收口

日期：2026-09-15。状态：完成；Ticket 23 为 `31/36`，剩余 `5` 片。

## 交付结果

- 正式产品 Web 旅程绑定 Standard `54×36` 权威房间，而不是 500 分开发夹具。双方军表
  各为 `2000 Minerals`，Vespene 为 `115/140`，均不超过 `200`；15 个 Unit 从
  Reserve 开始，战场包含 9 件 Rules-certified 地形。
- Database、军表创建/保存/持久化、Damage/Matchup/Versus/Roster/骰子计算器、官方来源
  与语言设置、全局悬浮凯瑞甘副官均通过同一真实 Web 产品入口完成检查。
- 对战页聚焦战场并收拢右侧动作工作台；部署 UI 暴露入口边、沿边位置、完整模型落点和
  队形参数。用户完成 Goliath 部署的 LegalSpace→参数提案→sealed Preview→Apply→Replay，
  随后 Hosted Opponent 自动部署 Queen，不要求逐动作人工批准。
- 机器动作公开计划、目的、预期反制、自身反制与风险，但不索取或展示隐藏思维链。涉及
  Reserve 模型实际上桌时生成 `place_model` 物理任务；玩家可自行完成、委托 Agent 或提出
  争议。通知、任务状态、动作/回放 hash 和模型调用成本在产品 UI 可见。
- 机器对手可在客户端提交人类动作后异步推进同一 Room。客户端保存本方精确 Apply receipt，
  并只接受相同 Room/Match 下严格更晚的权威 projection，避免把合法并发推进误报为 receipt
  mismatch。
- Viewer 保留双方资源预算，Round 1 Supply 可执行；Rules transition 在 Authority 写入
  日志/时钟前克隆冻结状态；LegalSpace 与 Preview 共享精确 confirmation class。
- 多局复盘控制台读取 4 局并生成 2 个隔离、待审核的 SkillOpt 候选；没有自动晋升，也没有
  把复盘候选冒充训练真值。

## Rules、Agent 与骰子边界

Rules/Authority 是资源、底座几何、部署合法性、攻击池、骰子数量、修正、随机结果、伤害和
状态变化的唯一权威。Agent 只能从 LegalSpace 选择动作、目标、合法参数和规则允许的骰池
分配，不能自报骰子数量或结算结果。RNG/裁判生成骰子并写入回执，Web 只展示权威结果。

## 唯一产品旅程门

本片最后一次受影响 Web 旅程门通过；没有重复运行已经绿色的 Web export 或历史全量门：

```json
{
  "ok": true,
  "checks": [
    "database_catalogue_search_and_detail",
    "army_create_add_save_and_persist",
    "all_calculator_tabs_and_dice_history",
    "settings_source_and_language",
    "persistent_floating_adjutant",
    "standard_2000_deploy_bot_auto_apply_physical_sync_replay",
    "manual_multigame_skillopt_and_incremental_freshness"
  ],
  "consoleErrors": [],
  "pageErrors": [],
  "developmentTransportNoise": [],
  "screenshotCount": 11,
  "modelCalls": 0,
  "costCny": 0
}
```

成功旅程的 10 个编号里程碑截图和最终态截图位于
`build/ticket-23-slice-245-product-web-v1/`。该目录中的 `failure.png` 是前序诊断产物，
不属于最终验收证据。

## 边界与下一步

本片证明 2000 分产品初态能够通过真实 Web 完成人类部署、机器自动动作、物理任务、回放和
复盘控制台旅程，但不声称整场比赛已经打完。当前探索性 Room 仍显式保留
`fullMatchLifecycleSupported=false`、`legalSpaceComplete=false` 和
`productionRoomEligible=false`；Slice 246 必须用产品 Runtime 总组合完成一场双方各
2000 分的零 Provider deterministic full-match dry-run，覆盖任务全生命周期、计分和终局，
才能放行 Slice 247 的正式 live-model 人机局。

500 分 Skirmish 只保留为快速开发/参考夹具，不能替代 Slice 246–250 的任何正式验收。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `opponent_prompt`；本片机器动作由确定性 Decision Port 执行，未调用模型
- `harnessToolsCalled`: `LegalSpace`、`Preview`、`Apply`、`Replay`、Hosted Opponent action、PhysicalOperationTask delegate/complete/dispute、episode review、Skill freshness
- `uiTraceEvidence`: `build/ticket-23-slice-245-product-web-v1/` 中 11 张成功旅程截图
- `agentDecisionEvidence`: Bot 面板公开 plan/purpose/opponentResponse/counter/risk，动作回执与 Replay hash 可见
- `memoryTraceEvidence`: 动作目的/计划进入 Episode trace；复盘控制台读取 4 局并保留隔离候选
- `trainingTraceCandidates`: 2 个 quarantined SkillOpt candidates；均未批准、未晋升、`trainingTruth=false`
- `rollbackOrDemotionRules`: Critical/High 阻断；Medium 跟踪；Room/Match/版本/回执不一致立即冻结动作；复盘候选不得自动晋升
- `userVisibleChecks`: 上述 7 项产品旅程检查，console/page error 均为 0

Provider/model/source refresh/token/cost：`0 calls / 0 tokens / false / ¥0`。
