# Ticket 23 / Slice 241 — 当前产品 Zerg 独特规则收口

日期：2026-09-15  
状态：Complete  
产品分母：`248 executable_exact / 4 pending_family_adapter / 252 total`

## 本片交付

冻结 `units=71/cards=69/rules=48` 数据不刷新。owner 241 共三条定义，其中 Kerrigan
`Commander` 已由现有房间能力 Adapter 精确执行；本片接入其余两条 pending：

- Queen `Domineering Presence`：Movement 激活窗口，已购买该升级的 Queen 选择完整底座
  6 英寸内另一 Friendly Unit，不需要 LoS；卡面 1 BM，目标在 Marker/Objective 语境
  Supply +1 至 round end。
- Lair `Predation`：Any Phase 的 active Unit 使用并耗竭 Lair，该 Unit 所有 Close Combat
  Weapons 至 round end 获得 INSTANT。

Domineering Presence 复用 Slice 239 的 Psionic Link 支付投影和消费账本。满足 Queen
完整底座 6 英寸内至少 7 个 Friendly models 时，本轮第一次 Queen Special Ability 的
1 BM 降为 0；Apply 同时消费减费机会，不能在另一个 Ability 上再次使用。未满足条件时，
LegalSpace 只枚举能完整支付 1 BM 的单卡最小支付方案，不枚举指数级冗余卡牌组合。

Predation 的效果由 Zerg unique projection 进入近战 Runtime：Fight LegalSpace 与实际
chance plan 均把有效武器 Profile 投影为 INSTANT，Declaration/Resolution 两段都禁止敌方
Reaction。基础武器档案不被改写，效果由 round-end 生命周期删除。

## 聚焦验证

没有新增测试文件、没有运行全量门、没有重跑已通过的旧门。

第 1 轮在导入新 Adapter 时发现卡牌动作多层 `flatMap` 多一个右括号；改成显式循环后，
第 2 轮对变更代码执行同一聚焦门并通过：

```text
248 exact / 4 pending / owner241 pending 0
Domineering: printed BM 1 / effective BM 0 / target Supply 1 -> 2
Predation: Lair exhausted / melee INSTANT true / enemy Reaction false
Domineering transition: e9ad4db104651052a753bb551364abd8470bb1e3ba553547f5161e7b3d0a69cc
Predation transition: dcf343d9bff508603a4a51f4f47d00515a24992d449e8b719f2e663716b27808
```

Provider 调用/token/费用：`0 / 0 / ¥0`。数据刷新：`false`。

## Harness / Agent 证据

- `harnessLoopUsed: true`
- `targetGames: [starcraft-tmg]`
- `promptPackRoutes`: 未修改；General/Faction/Matchup Skill 仍只提供策略，不拥有合法性。
- `harnessToolsCalled`: `legal_space`, `preview`, `apply`, `query`, `replay`；支付、底座距离、
  Supply 与 INSTANT 都由 Rules typed consumers 计算。
- `uiTraceEvidence`: 无；Standard 2000 Web 用户旅程属于 Slice 245。
- `agentDecisionEvidence`: Agent 能选择 Queen 目标、BM 支付来源或 Predation 目标 Unit；不能
  选择 Queen 自己、越过 6 英寸、重复消费 Psionic Link、用 exhausted Lair 或自行宣布
  Close Combat INSTANT。
- `memoryTraceEvidence`: `zergUniqueUseHistory` 保存 round/phase/piece/target/definition/source/
  effect/plan；`matchLifecycleUseHistory` 同时保存 Psionic Link 的实付与减费。
- `trainingTraceCandidates`: 无；所有回执为 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 删除 Zerg Adapter binding 会让两条定义回到 pending；删除
  Predation consumer projection 必须使聚合门失败，不能保留只显示不执行的假阳性。
- `userVisibleChecks`: Web 应显示 Queen 6 英寸目标、原价/实付 BM、Lair Exhaust、INSTANT
  和敌方无 Reaction；实际点击属于 Slice 245。

## 后续与最终口径

Slice 242 接入 Protoss 最后 4 条，Slice 243 聚合 `252/252`。Slices 244–250 最终验收固定
为 Standard 双方各 `2000 Minerals`、每方 `≤200 Vespene`、`54×36`；500 分只作开发夹具。
