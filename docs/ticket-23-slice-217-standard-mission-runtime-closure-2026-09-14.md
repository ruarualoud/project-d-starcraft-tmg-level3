# Ticket 23 / Slice 217：五张 Standard 任务 runtime 收口

日期：2026-09-14。状态：完成。Ticket 23 为 `3/15`。

## 交付

`packages/rule-atoms/official-standard-mission-runtime-v1.mjs` 提供五张 Standard 任务的
统一 Runtime，并绑定 Slice 216 IR。它不复制五个完整状态机，而是以任务 family 的
typed effects 驱动同一生命周期：

- 初始化五个任务标记及阵营亲和；
- Supply Drop 消费 Rules-owned chance reveal，记录激活轮次；
- Gather 从当前 EngagementGraph、单位激活状态、Marker 控制/亲和和底座边缘距离
  枚举合法任务动作；
- Divide 按 54×36 世界坐标和完整圆形底座判定 Unit 是否 wholly within 一个 Quarter，
  并将实际参与控制标记的单位加 1 Current Supply；
- Frontlines 从当前权威 control receipt 判断本轮是否从对手夺控；
- 五类同时结算本轮敌方 Supply 损失和任务 VP；Supply cashout 后移除标记；
- 每次得分后按任务阈值检查即时胜利，并在任务回合上限按 VP 判胜/平局。

每个动作绑定完整 pre-state、任务 IR 和 resolution hash；旧 Hold Position 执行器没有
被删除，新 Runtime 是版本化新路径。Runtime 不读取屏幕坐标，也不把 LLM 计算当 Rules
事实。

## 聚焦验证

一次五任务生命周期 smoke 通过：

- Divide：P1 本轮任务 VP `3`（一个 Quarter + Marker 5）；
- Frontlines：P1 本轮任务 VP `3`（控制 1 + 从 P2 夺控 2）；
- Gather：合法 Gather `+1`，cleanup 对方亲和 Marker `+2`，总分 `3`；
- Hold Position：Own/Neutral 与 Opponent-affinity 合计 `3`；
- Supply Drop：Round 1 激活 Marker 1、得 `1`、随后 Marker 1 被移除。

五例终局检查均继续，Runtime descriptor 的 Standard denominator 为 `5/5`。未运行任何
既有绿色门或付费模型；该验证证明任务子 Runtime，不证明 Authority Engine/Room/Web
已完成接线，接线与 10-card aggregate 属于 Slice 218。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none; exact Rules lifecycle only
- `harnessToolsCalled`: Mission Effect catalogue, EngagementGraph V2, SupplyLossLedger, five-family Runtime
- `uiTraceEvidence`: none
- `agentDecisionEvidence`: none; Gather candidates are Rules-owned ActionSpace
- `memoryTraceEvidence`: per-round start/Gather/scoring/endgame histories
- `trainingTraceCandidates`: transitions remain `trainingTruth=false`
- `rollbackOrDemotionRules`: V1 remains addressable; new path is explicit by Runtime version
- `userVisibleChecks`: exact marker activation/control/score/removal/endgame events are projection-ready

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
