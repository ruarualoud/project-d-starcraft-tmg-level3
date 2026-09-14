# Ticket 23 / Slice 235 — 当前官方产品近战与 IMPACT 能力族收口

日期：2026-09-14。状态：实现完成，带一项 Medium 验收夹具债务。Ticket 23 为
`21/36`，剩余 `15` 片。

## 交付结果

冻结来源保持 `units=71 / cards=69 / rules=48`，未刷新网络数据。owner 235 的
`40` 条 pending definition 已由 `official-melee-family-adapter-v1` 绑定：

- 28 个 Combat Phase 武器 Profile；
- 11 个此前未接线的 `Devastating Charge`；
- 1 个 `My Life for Aiur` 每合格模型 IMPACT 加骰 Consumer。

按实现后的确定性绑定账本，目标分母为：

```text
175 executable_exact + 77 pending_family_adapter = 252
owner 235 pending = 0
```

该计数在本片三轮门内没有取得新的运行态 Factory 回执，不能作为已通过 E2E 的数字证据；
它来自冻结 252 项责任账本与新增 40 个唯一 source-feature binding。Slice 243 aggregate
必须重新取得运行态 `175/77` 中间检查和最终 `252/252` 回执。

## 规则语义修正

旧 selected runtime 把 `IMPACT (X)` 简化成整支 Unit 固定 X 骰。本片按冻结核心规则改为：

1. 成功 Charge 后重新建立完整 Engagement Graph；
2. 逐模型判定 Fighting Rank 或 Supporting Rank；
3. 每个合格模型各生成 X 枚 IMPACT 骰；
4. 只可分给该模型实际对抗的已声明 Enemy Unit；只对抗一个 Unit 时强制全部给它；
5. `My Life for Aiur` 为每个合格模型再加 1 枚，而不是给整支 Unit 只加 1 枚；
6. Hidden 目标免疫 IMPACT；各目标独立 Hit、Armour、显式 Evade、Damage 1 和伤亡结算。

Charge 同时消费 Speed/IMPACT 修正、2D6 取高 Charge roll 与 Coherency 投影。Fight 可在
同一单位的多个合法 Combat Profile 中选择一件；付费替换武器会移除被替换的基础武器，
Artanis 两个原生 Profile 则保留为两个控制者选择。Close Ranks 后仍保留 Target tag
过滤，不因重建接战图而放宽目标。

攻击解析覆盖 Fighting/Supporting Rank、多个敌方 Unit 的预先分骰、Surge 目标、
Critical Hit、Instant、Pierce、Precision、Anti-Evade、条件 Damage（Titan Killers）、
Armour/Evade、Shielded 首模型容量、多模型伤亡、Supply Loss Ledger 和动作后能力窗口。
首把 Close Combat Weapon 的一次性效果只在 Apply 后消费。

## 深模块与接口

- `official-melee-family-projection-v1`：把来源绑定投影成武器、Devastating Charge 和
  每模型加骰，不让 Room/Web/Agent 解析卡面 prose。
- `official-melee-family-adapter-v1`：编译精确来源 pattern，并复用既有几何、接战、骰池、
  伤亡和 Supply 内核；公开统一 `legal_space / preview / apply / query / replay` seam。
- generalized melee runtime：从五单位白名单扩展到当前 Combat/Action catalogue 内任意
  已绑定 Unit；一个武器对应一个参数域，核心 Charge 与卡面 definition 身份分开记录。
- ranged runtime 的 Shield-aware casualty domain 暴露为共享接口，近战与远程不再各自
  解释首模型 Shield 容量。

所有 Authority 输出仍为 `trainingTruth:false`；策略搜索、模型建议和规则执行继续隔离。

## 三轮验证与 Medium 债务

按用户的最多三轮规则停止：

1. 第 1 轮在模块加载发现本片对 Characteristic projection 修改的一处括号语法错误；已修。
2. 第 2 轮在进入 Slice 235 逻辑前，临时门用未经冻结 delta 装配的原始 Firestore 数据，
   被 `ROSTER_DISCLOSURE_DATASET_INVALID` 正确拒绝。
3. 第 3 轮改用既有两次 faction delta 仍在同一 Factory 前置数据集身份门停止；没有进入
   新 source bundle、LegalSpace 或 Apply。

因此新增模块已通过 ESM 解析，但本片没有新的 Factory/Preview/Apply/Replay 绿色回执。
按 Only Critical/High block，本项作为 **Medium fixture/integration evidence debt** 跟踪，
不得冒充通过，也不进行第 4 轮。Slice 243 用当时的权威冻结数据装配入口统一清偿本项与
Slice 234 的大小写测试债务。

未新增测试文件。Provider 调用/token/费用为 `0 / 0 / ¥0`。

## Harness / Agent 证据

- `harnessLoopUsed: true`；`targetGames: [starcraft-tmg]`。
- `promptPackRoutes`: 未修改；本片修改 Rules/Tool contract。
- `harnessToolsCalled`: 计划中的 melee LegalSpace/Preview/Apply/Replay 门被前置冻结数据集
  身份阻断；没有伪造成功回执。
- `uiTraceEvidence`: 无；Web 用户旅程属于 Slice 245。
- `agentDecisionEvidence`: Agent 可见所选武器、战斗/支援排、逐模型 IMPACT 来源、合法目标、
  分骰、效果和 Chance；不能覆盖几何、骰子与伤亡结果。
- `memoryTraceEvidence`: Charge/Fight/Impact history 和权威 Room log 保留计划连续性；
  未修改长期 Skill。
- `trainingTraceCandidates`: 无；所有结果保持 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 移除 Adapter binding 会把 40 条定义退回 pending；只有
  Slice 243 的聚合绿门能清除本片 Medium 证据债务。
- `userVisibleChecks`: 规则状态、逐模型 IMPACT、伤亡、Shield、Supply 与武器选择已进入
  Authority state 合同；具体 Web 面板统一由 Slice 245 验收。
