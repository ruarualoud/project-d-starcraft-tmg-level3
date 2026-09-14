# Ticket 23 / Slice 236 — 当前官方产品 Reaction family 收口

日期：2026-09-14。状态：完成。Ticket 23 为 `22/36`，剩余 `14` 片。

## 交付结果

冻结来源保持 `units=71 / cards=69 / rules=48`，没有网络刷新。owner 236 的
`24` 条 Reaction definition 已按原文逐项编译为 `18` 个效果原型和 `12` 类触发窗口，
并绑定 `official-reaction-family-adapter-v1`。在既有 Slice 235 确定性账本之上，当前产品
目标分母变为：

```text
199 executable_exact + 53 pending_family_adapter = 252
owner 236 pending = 0
```

本片新增统一 `open_reaction_window → legal_space → preview → apply → query/consume →
replay` 接口。调用方只提交类型化触发上下文和原动作/恢复动作 hash；Reaction 深模块负责：

- Active Player 的 Reaction 先于对手解析；每一方明确选择一条或 Pass；
- 每位玩家每个 Activation 最多一条 Reaction；同一来源 Unit 的同名 Reaction 每回合一次；
- Tactical Card readiness/Exhaust，以及 Unit Reaction 的 CP/BM/PE 完整支付集；
- `INSTANT` 对敌方 Reaction 的禁用；
- 用完整模型底座边缘测量 4/8/10 英寸范围；
- 把结果记录为可查询、可消费的 `triggerHash` 回执，供攻击、移动、部署、能力支付和回放
  消费，而不是让 UI 或 Agent 解释英文卡面。

## 已覆盖效果

`Ground/Infantry/Vehicle Armor`、`Carapace`、`Guardian Shell`；`Hierarch's Stand`、
`Hallucination`、`Debilitating Saliva`；三种 `Restoration`、`Life Support`、`Dae'Uhl`、
`Transfusion`、`Zealous Round`；`Pneumatized Carapace`、`Gravitic Boosters`、
`Concussive Shells`、`Lightning Dash`；以及 `Veil of Shadows`、`Advanced Training`、
`Photon Overcharge`、`Brood Instinct`、`Lunge`。

即时净化/Heal/Activated 状态由 Reaction transition 原子更新；临时护甲、Evade、命中、
速度、冲锋骰、伤害减免、攻击重定向、自动命中和后续 Move/Charge 则保留为精确 effect
receipt，由触发该窗口的 Host consumer 在继续原动作时消费。内容 hash 仅用于 lineage/stale
action，不是跨版本启动门。

## 定向验证

没有新增测试文件，只运行本片一次内联因果门；共两轮，未触及历史已通过门：

1. 第 1 轮复现 `Carapace` 没有 Ground/Biological/Mechanical 修饰词时被源编译器漏接；
   修正为可选修饰词。
2. 第 2 轮通过：`24/24` route、18 个原型计数、24 exact/228 pending 的独立绑定、统一
   Runtime 的 Open/LegalSpace/Preview/Apply/双边 Pass/Close/Projection/Replay 全部成功；
   `Dae'Uhl` 示例投影为减伤 2 且最低伤害 1。

随后只读检查修正 `Debilitating Saliva` 应量到攻击者而非友方目标、Heal 镜像 Damage Marker
不得重复扣除，以及消费回执后重封版本 hash。根据“不重复已通过验证”约束没有重跑门，
这些分支与 Slice 234/235 的既有 Medium 工厂夹具债统一由 Slice 243 aggregate 清偿。

Provider 调用/token/费用为 `0 / 0 / ¥0`。

## Harness / Agent 证据

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`。
- `promptPackRoutes`: 未修改；本片只扩展 Rules/Tool contract。
- `harnessToolsCalled`: `open_reaction_window`, `legal_space`, `preview`, `apply`,
  `query/consume_reaction_window`, `replay`。
- `uiTraceEvidence`: 无；Web 用户旅程在 Slice 245。
- `agentDecisionEvidence`: Agent 只能在当前 priority side 的精确参数域中选一条 Reaction
  或 Pass；公开 effect/目的可记录，隐藏思维不保存。
- `memoryTraceEvidence`: 每个 Reaction 保存 Activation、trigger、来源、支付、效果和 plan
  hash，可与本局计划/动作日志关联。
- `trainingTraceCandidates`: 无；所有输出均 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 移除 Adapter binding 会让 24 条 definition 退回 pending；只有
  Slice 243 的 252/252 聚合门可以授予全产品可用性。
- `userVisibleChecks`: Reaction 窗口、优先方、合法选项、Pass、支付和效果回执都有统一公开
  合同；具体浮层/战桌展示由 Slice 245 验收。

## 后续

Slice 237 接线剩余 `30` 条 battlefield asset：Token、Marker、Indicator、Structure、
Creep、Pylon 及其放置/移除/生命周期。之后 238–243 完成剩余 `53` 条并做 252/252
聚合；244–250 才进行 Standard 2000 分 Room、Web、H-A、A-A、复盘和 PDF 验收。
