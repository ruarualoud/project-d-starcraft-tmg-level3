# Ticket 23 / Slice 238 — 当前官方产品 Unit lifecycle family 收口

日期：2026-09-14。状态：完成。Ticket 23 为 `24/36`，剩余 `12` 片。

## 交付结果

玩法数据继续冻结为 `units=71 / cards=69 / rules=48`，本片没有刷新官方玩法数据。
owner 238 实际包含 `12` 条 definition；其中战术卡版 `Omega Network` 已由 Slice 229
绑定，因此本片从 pending 分母接入其余 `11` 条，形成八类共享生命周期语义：

- `Phase Prism`：Artanis 从 Reserve 部署时以另一个友方 Unit 为 PLACE(0) 锚点，后者
  回到 Reserve，Artanis 激活结束。
- `Pylon Warp-In` 与 `Rapid Ingress`：创建非军表 Pylon/PDD Unit，使用当前官方模型数、
  底座、战斗档案和敌方距离；Pylon 本轮仅保留 Structure，PDD 回合末移除。
- `Mass Recall`：一次/局放置 Faction Indicator，把 6 英寸内全部友方 Protoss Unit
  返回 Reserve。
- `Roachling Infestation`：支付 2 Biomass、一次/局 SUMMON 三模型 Roachling，完整编队、
  母体底座接触、敌方间距和同阶段激活锁均由 Rules 处理。
- 三条 `Strategic Recall / Strap in!`：仅允许当前 active、未接战、Ground Unit 代替动作
  回到 Reserve。
- `Zergling Reconstitution`：复用现有 Respawn 内核，普通返回 2 个模型、ON CREEP 返回
  3 个；只返回已毁模型，要求现存模型底座接触，不能提高 Supply 档。
- `Spawn Creep Tumor`：支付 1 Biomass，以 Queen 为底座接触锚点创建圆形 28mm Tumor。
- Unit 版 `Omega Network`：Omega Worm 是 Entry Edge；每轮可部署合计 Current Supply
  不超过 2 的 Ground Unit，Move/Run/Disengage 后底座接触可选择回 Reserve。

统一 Adapter 暴露 `LegalSpace → parameterized Preview → Apply → Query/Lifecycle → Replay`，
并承接 Slice 237 的三类跨 family 机会：Shade 回合末队形重设、Reserve Indicator 部署、
Pylon Warp Conduit 部署。所有 Unit 放置都使用完整圆/矩形底座、完整模型分母、3/4 英寸
编队和 Rules-owned 世界坐标；Reserve 保留伤害、装备、状态和当前阶段激活记录。

当前全产品能力分母为：

```text
240 executable_exact + 12 pending_family_adapter = 252
owner 238 pending = 0
```

## 聚焦验证

没有新增测试文件，也没有运行历史全量门。唯一内联聚焦门在两轮内收敛：

1. 第 1 轮先通过 Factory、11-route 与 `240/12` 分母，随后正确拒绝召唤动作夹具：旧
   500 分参考军表只有 1 Biomass，而 `Roachling Infestation` 需要 2。该失败不是生产路由
   缺失。同时代码审查发现 Unit 版 `Omega Network` 不能在部署首个 Unit 后整轮锁死，
   因为原文允许多个 Unit，只限制合计 Supply ≤2；已改为累计 Supply ledger。
2. 第 2 轮给测试场景加入合法的第二张 Biomass 来源后通过：`11/11` route、
   `240 exact / 12 pending / owner238 pending 0`，实际支付三张卡形成 2 Biomass，部署三模型
   Roachling、设置 movement 激活锁，并从同一 pre-state/action 得到完全一致 Replay。

绿色门后的局部代码审阅只修正本片直接影响的三个 lifecycle seam：生成 Pylon 的非
Structure 能力在创建回合确实不进入消费者、Unit 回 Reserve 时同步移除非 STAY IN PLAY
资产绑定、Queen Tumor 继承 Living Glob 的 STAY IN PLAY/DISPLACEMENT。没有重跑已通过
门；两份受影响模块只执行一次 `node --check`，通过。

Slice 234/235 的既有 Medium 证据债和 Slice 236 后置只读修正仍由 Slice 243 聚合门清偿；
本片未重复它们。Provider 调用/token/费用为 `0 / 0 / ¥0`。

## Harness / Agent 证据

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`。
- `promptPackRoutes`: 未修改；Agent 仍加载 General/Faction/Matchup Skill。
- `harnessToolsCalled`: `legal_space`, `instantiate_parameterized_action`, `preview`, `apply`,
  `reserve_inventory`, `lifecycle`, `replay`。
- `uiTraceEvidence`: 无；Web 可操作旅程仍由 Slice 245 完成。
- `agentDecisionEvidence`: Agent 只能从 Rules 发布的 Unit/目标/支付/完整放置域选择；
  召唤身份、Current Supply、Reserve 保留状态、敌方距离、编队和回合限制均不可由模型改写。
- `memoryTraceEvidence`: use/lifecycle history 保存来源、目标、支付、Current Supply、回合、
  plan hash 与公开事件，可进入同局记忆和复盘，不保存隐藏思维。
- `trainingTraceCandidates`: 无；全部输出仍为 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 移除 Adapter binding 会把 11 条 definition 恢复成 pending；
  只有 Slice 243 的 `252/252` 聚合门能声明全卡池动作接线完成。
- `userVisibleChecks`: Reserve inventory、被创建 Unit、召回、重生、回合末机会和实体变化
  均有投影合同；实际 Web 点击/拖放由 Slice 245 验收。

## 后续

Slice 239 接线剩余两条 Match lifecycle 定义；Slices 240–242 收口 `4/2/4` 条三族独特
余项，Slice 243 完成 `252/252` 聚合。Slices 244–250 按最新用户命令完成 Standard
双方各 2000 分的 Factory、Web、零 Provider 演练、正式 H-A/A-A、合并复盘与 PDF 证据。
