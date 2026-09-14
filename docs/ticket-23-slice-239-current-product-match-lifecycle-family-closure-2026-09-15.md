# Ticket 23 / Slice 239 — 当前官方产品 Match lifecycle family 收口

日期：2026-09-15。状态：完成。Ticket 23 为 `25/36`，剩余 `11` 片。

## 交付结果

玩法数据继续冻结为 `units=71 / cards=69 / rules=48`，本片没有刷新官方玩法数据。
owner 239 的实际 pending 分母不是重复实现任务、计分或 Pass；这些核心生命周期已经由
Mission Runtime 和 Authority 执行。本片接入剩余两条以当前阶段/回合状态为条件的卡面
consumer：

- `Fury of the Nerazim`：只有已购买该升级的 Stalker 使用 Particle Disruptors、攻击本
  Assault Phase 已激活的 Enemy Unit 时获得 `INSTANT`。远程批次据此关闭敌方声明/结算
  Reaction，并排除 Point Defence 的选择域。
- `Psionic Link`：Queen 完整底座到友方模型完整底座的最近边缘距离不超过 6 英寸时逐模型
  计数；至少 7 个友方模型（规则原文未写 `other`，因此包含 Queen 自身模型）即可让 Queen
  本轮第一次 Special Ability 的 BM 消耗减 1、最低为 0。当前已精确接线的 Spawn Creep
  Tumor、Transfusion、Restoration 分别通过 Unit lifecycle 与 Reaction 两条真实支付链
  消费同一每轮使用账本。仍属 Slice 241 pending 的 Domineering Presence 必须在该片接入
  同一减费接口，不能由本片提前宣称可执行。

新 Match lifecycle Adapter 只发布两个 automatic consumer，不伪造玩家动作；阶段激活状态、
完整模型分母、官方底座和支付状态仍由 Rules authority 决定。当前全产品能力分母为：

```text
242 executable_exact + 10 pending_family_adapter = 252
owner 239 pending = 0
```

## 聚焦验证与修复

没有新增测试文件，也没有运行历史全量门。上一轮三次聚焦尝试在 Factory 和 Queen 条件已
通过后，停在合成 Stalker 没有射击域，并依收敛规则报告而未继续重跑。本轮用一次只读
`includeDisabled` 诊断取得精确拒绝码 `SELECTED_RANGED_TARGET_TAG_PROHIBITED`，发现真实
生产缺口：Attack Profile 正确把 `TARGET: All` 编译为 `targetTags:["all"]`，但远程 Runtime
错误地把 `all` 当成目标必须携带的普通标签。

统一 Target 匹配器现将 `all` 解释为通配符。修复后仅运行一次直接相关的 Stalker 门并通过：
认证地形保留、Particle Disruptors 目标域存在、已激活目标触发 `INSTANT`、敌方
Declaration/Resolution Reaction 均为 false，Point Defence 可选来源为 0。此前已通过的
Factory/Queen 断言没有重复执行。该修复适用于所有当前 `TARGET: All` 武器，而不是为 Stalker
硬编码例外。

Provider 调用/token/费用为 `0 / 0 / ¥0`。

## Harness / Agent 证据

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`。
- `promptPackRoutes`: 未修改；Agent 仍加载 General/Faction/Matchup Skill。
- `harnessToolsCalled`: `legal_space`, `query`, `instantiate_parameterized_action`；支付消费者由
  Unit lifecycle、Reaction、Characteristic/Status 的 Preview→Apply→Replay 链调用。
- `uiTraceEvidence`: 无；Web 可操作旅程仍由 Slice 245 完成。
- `agentDecisionEvidence`: Agent 只看 Rules 发布的射击/反应/支付域；不能自行声称目标已激活、
  伪造 7 模型条件、重复使用 Psionic Link 或绕过卡牌支付。
- `memoryTraceEvidence`: `matchLifecycleUseHistory` 保存 round、phase、Queen、definition、
  printed/effective cost 和 plan hash；公开事件可进入同局记忆与复盘，不保存隐藏思维。
- `trainingTraceCandidates`: 无；全部输出仍为 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 移除本 Adapter binding 会把两条定义恢复为 pending；只有
  Slice 243 的 `252/252` 聚合门可声明全卡池接线完成。
- `userVisibleChecks`: Queen 支付提示应显示原价/减免/实付，Stalker 攻击应显示 INSTANT
  与无敌方 Reaction；实际 Web 点击验证属于 Slice 245。

## 后续

Slices 240–242 收口 `4/2/4` 条 Terran/Zerg/Protoss 独特余项；Slice 241 的 Domineering
Presence 必须复用本片 Psionic Link payment seam。Slice 243 完成
`252/252` 聚合。Slices 244–250 始终按最新用户命令完成 Standard 双方各 2000 分 Factory、
Web、零 Provider 演练、正式 H-A/A-A、合并复盘与 PDF 证据；500 分只保留为开发夹具。
