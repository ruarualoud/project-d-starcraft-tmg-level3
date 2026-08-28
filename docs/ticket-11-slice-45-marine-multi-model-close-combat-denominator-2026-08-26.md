# Ticket 11 Slice 45 — Marine 多模型近战分母与关联审计

日期：2026-08-26  
状态：已冻结；仅分母/关系审计，未晋级运行时

## 结果

Slice 45 把当前官方 Marine 的多模型 Close Combat 有限分母冻结为一个深模块，并把关键语义加入派生 Rule Relationship Graph。它没有把 Slice 44 的单模型证明静默外推，也没有宣称多模型 Authority 已完成。

- 初始编制只能是 6 或 9 个模型。
- 战中 `currentModels` 可为 `1..maxModels`；Supply 按 `1–3 → 0`、`4–6 → 1`、`7–9 → 2` 重算。
- Fighting Rank 只含当前存活且与目标 Unit 接战的模型。
- Supporting Rank 只含当前存活、未处于 Fighting Rank、且与同 Unit 的存活 Fighting Rank 模型 Base-to-Base 的模型。
- 攻击池固定为 `(Fighting + Supporting) × 全 Unit 当前近战武器 RoA`。
- Strike 的 RoA 为 1；Bayonet 的 RoA 为 2，并替换全 Unit 所有模型的 Strike。
- Bayonet 不是 `SPECIALIST`。逐模型混合 Strike/Bayonet carrier 是禁止路径，不是待玩家选择的合法批次。
- 伤亡、位置、接战图、载荷、Stimpack 状态/标记/历史任一变化都会让旧 plan 失效并重算。
- 本切片把防守方限制为“只剩一个存活 Marine 模型”，避免在尚未冻结完整伤亡选择域前假装支持多模型防守方。

## 官方当前数据绑定

在线重新读取 Firestore，仍为：

- `unitsVersion=71`
- `cardsVersion=69`
- `rulesVersion=48`
- repository fallback：`false`

冻结来源：

- Marine document：`32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1`
- Part 8 document `iuUyObNTQ2M8xK4IUqzC`：`35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b`
- Part 9 document `Rj6sMyNODPQ8OHUc9Clp`：`0b7f93150a5c915fb1fe52f2b2a276e5eee2f77fa251b3be583de71837bfd2cb`
- Part 12 document `gMXfLyHJfnGYKw2rmoPS`：`153cb27295dfa4bfa2069aa1617836d81a2d4a3f15d19568de497ce19fd16868`

Part 9 明确规定非 Specialist upgrade 应用于 Unit 每个模型，replacement 使所有携带被替换武器的模型失去旧武器并获得新武器。当前 Marine 表中 Bayonet 的 Type 为 `-`，而 AGG-12 与 Rocket Launcher 才是 Specialist。因此原先计划中的“mixed Strike/Bayonet carrier”假设被关系审计否决并改为失败关闭测试。

## 关系路径

关系图仍是 `derived_audit_evidence_only`，不是第二套 Rules 权威。Slice 45 增加三条必须可查询的路径：

1. `Part 9 → unit-wide replacement → Bayonet carrier set → RoA → attack pool → Judge`
2. `Part 8 → Fighting/Supporting Rank → eligible model IDs → attack pool → Judge`
3. `casualty/geometry → model ledger/engagement graph → ranks → attack pool → old domain invalid`

禁止路径：

- `Bayonet → Specialist assignment`
- `Bayonet → per-model mixed Strike/Bayonet carrier selection`

关联图从 Slice 44 的 `5,087` 节点 / `19,667` 边扩展到 `5,118` 节点 / `19,710` 边。Catalogue 仍有 37 个 executor，3 个声明统一状态合同，34 个状态合同债务。全局关系覆盖、production 与 training 仍为 false。

## 可验证示例

- 6 模型 Strike：1 个 Fighting + 1 个 Supporting，RoA1，攻击池 2。
- 9 模型 Stimpack + Bayonet：1 个 Fighting + 1 个 Supporting，RoA2，攻击池 4；Bayonet carrier set 包含全 9 个 roster 模型。
- 9 模型编制减员到 7 个存活时 Supply2；Supporting 模型再伤亡后变为 6 个存活、Supply1，Bayonet 攻击池从 4 重算为 2，旧 plan hash 被拒绝。
- Supporting 模型离开 Base-to-Base 后，Strike 攻击池从 2 重算为 1，旧 plan 被拒绝。
- 篡改 Stimpack marker/history 或提交逐模型 Strike/Bayonet 字段均失败关闭。

## 冻结身份

- Slice：`0a5c8cc51b1369b13666aa1efbe1ccbe056c4b457f980979036b8833468e60ab`
- Catalogue：`732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649`
- Runtime：`7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc`
- Relationship graph：`d7d780318144c4f774fdbfc7e9b75c7cf689615c9ed42d46abfe4303822b39c2`
- Denominator：`2a08ec8d05ab105d5d86444375a8b40e295a83ad9b084e75dac9deb4abf77025`
- Action schema：仍为 `hybrid_legal_space_v13`

Catalogue、Runtime、RuleAtom 和历史 executor 均未改写。旧版本规则展示继续保留，缺少依赖时隔离，不做静默兼容。

## 验证

- Slice 45 专项：`10/10`
- 通用 executable runtime：`10/10`
- 历史 Slice 44：`15/15`
- Ticket 11 foundations：107 份基础报告 / 1,094 assertions
- 含 aggregate：108 份报告 / 1,103 assertions
- `verify:all`：通过

## 明确未完成

Slice 46 才负责：

- 多模型 Marine Stimpack Active Authority；
- 多模型 Strike/Bayonet 普通与 Stimpack Close Combat consumer；
- Supporting Rank 可参与的 Precision pending-choice 域；
- Authority Preview/确认 Apply/双席 Replay；
- 伤亡/几何/载荷/状态变化后的旧 action 与 pending domain 拒绝；
- 更广防守方伤亡选择域仍需后续独立分母。

本切片没有生成或晋级 Skill，没有运行 DSH，没有写 memory、MuZero 或训练候选。`rulesEligible=false`、`productionRoomEligible=false`、`trainingTruth=false`。

## Harness / ctx2skill 记录

- `ctx2skillLoopUsed=true`
- `targetGames=[starcraft-tmg]`
- `roleRoutes=[rule_skill_builder,referee,opponent]`
- `skillsRead=[]`
- `skillsGenerated=[]`
- `judgeTestsRun=9`
- `crossTimeReplayResult=slice44_catalogue_runtime_and_single_model_authority_remain_exact`
- `promotions=[]`
- `remainingRuleGaps=491`
- `harnessLoopUsed=true`
- `promptPackRoutes=[referee_prompt,opponent_prompt]`
- `harnessToolsCalled=[relationship_impact_query,verify_rule_denominator]`
- `uiTraceEvidence=[]`
- `memoryTraceEvidence=no-memory-write-or-promotion-attempted`
- `trainingTraceCandidates=[]`
