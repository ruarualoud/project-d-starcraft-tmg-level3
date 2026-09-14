# Ticket 23 / Slice 243 — 全产品 Ability 接线聚合收口

日期：2026-09-15

状态：Complete

## 结果

冻结来源仍为 `units=71/cards=69/rules=48`，本片没有刷新数据。当前官方产品的
`26 Unit + 6 Faction Card + 31 Tactical Card` 共 `252` 条 definition 已全部取得唯一
执行角色与唯一精确 Adapter：

```text
total 252 / recognized 252 / exact 252
pending 0 / unsupported 0 / unclassified 0 / silent omission 0
12 exact adapters + 1 empty pending diagnostic lane
```

执行角色为 `138 action / 24 reaction / 51 automatic_consumer /
39 system_lifecycle`。owner 分母为 Slice232–242：
`28/65/30/42/24/37/12/2/5/3/4`。Delivery Adapter 分母是 selected `20`、
relocation `25`、characteristic/status `60`、ranged `30`、melee `40`、reaction `24`、
battlefield asset `30`、unit lifecycle `11`、match lifecycle `2`、Terran `4`、Zerg `2`、
Protoss `4`，总和精确为 252。

新增 `official-current-product-ability-coverage-release-v1`，把 definition、owner、执行角色、
delivery Adapter、Runtime 和冻结数据身份绑定成一个可验证 Release。Pending Adapter 保留为
空诊断通道，不能产生动作；500 分开发 Factory 的“动作 Runtime 待后续 Slice”已清空，但它
仍只是开发夹具，不是最终产品验收。

## 规则器负责骰子，Agent 只负责选择

本片真实近战验证最初暴露：规则器内部已经根据桌面位置算出 Fighting/Supporting Rank 与
总攻击骰，但 LegalSpace 没有把结果交给 Harness，导致调用夹具只能猜分配总数。现已在
Fight domain 明确输出：

- `declineCloseRanksFightingModelIds`
- `declineCloseRanksSupportingModelIds`
- `declineCloseRanksContributingModelIds`
- `declineCloseRanksEffectiveRateOfAttack`
- `declineCloseRanksAttackDice`

骰子数量始终由 Rules Runtime 根据位置、模型数、武器 RoA 和能力修正计算；Agent 只在合法
目标之间分配这批骰。分配合计与规则器结果不一致仍会拒绝。

## 聚焦聚合门

没有新增测试文件，没有跑历史全量门。只执行本片 aggregate；第 1 轮在真实 Marine Fight
把 2 颗规则骰误填为 1 颗，规则器正确返回 `SELECTED_MELEE_FIGHT_ALLOCATION_INVALID`。
补齐上述 LegalSpace 输出后，第 2 轮通过：

```text
release 018431dbf677141254deadfd0f9f9d0fa110c7f831ec35a028814a741dbb3f5f
252 exact / 0 pending / 0 unsupported / 0 silent omissions
C-14 rifle: real ranged Apply=true / Replay=true
Strike: Rules attack dice=2 / real Fight Apply=true / Replay=true
```

这同时清偿 Slice 234 的规范 `C-14 rifle` 大小写 E2E Medium 债，以及 Slice 235 的冻结
Factory/真实近战 Apply/Replay Medium 债。没有 Critical/High 遗留。

Provider 调用/token/费用：`0 / 0 / ¥0`。数据刷新：`false`。

## Harness / Agent 证据

- `harnessLoopUsed: true`
- `targetGames: [starcraft-tmg]`
- `promptPackRoutes`: 未修改；策略 Skill 不拥有合法性、位置判定或骰池计算。
- `harnessToolsCalled`: 全产品统一 `legal_space`, `preview`, `apply`, `query`, `lifecycle`,
  `open_reaction_window`, `consume_reaction_window`, `replay`。
- `uiTraceEvidence`: 无；2000 分 Web 全旅程属于 Slice 245。
- `agentDecisionEvidence`: Marine 近战示例中 Rules 输出 2 颗骰，Agent 仅选择把 2 颗骰分配
  给 Kerrigan；不存在 Agent 自报骰数的权限。
- `memoryTraceEvidence`: Action/Transition/Log 保存 domain、位置派生 ranks、骰池、目标分配、
  chance reveal、伤亡和 replay hash；本片不产生长期训练记忆。
- `trainingTraceCandidates`: 无；全部回执 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 任一 definition 退回 pending/unsupported、缺唯一 role/owner/
  adapter、Adapter 集合漂移或真实远近战 Replay 不一致，Release 必须失效。
- `userVisibleChecks`: Web 必须直接显示规则器算出的模型 rank、有效 RoA、总骰和剩余可分配骰，
  不能要求用户或 Agent手算；实际 UI 归 Slice 245。

## 下一步与最终验收

Slice 244 创建最终 Standard 2000 Room/军表/任务 Factory：双方各 `2000 Minerals`、每方
`≤200 Vespene`、`54×36`。Slices 245–250 依次做 Web 全旅程、零 Provider 完整局、人机、
机机、合并复盘/反事实/SkillOpt/MuZero、PDF 与机器可读证据。500 分不参与最终验收替代。
