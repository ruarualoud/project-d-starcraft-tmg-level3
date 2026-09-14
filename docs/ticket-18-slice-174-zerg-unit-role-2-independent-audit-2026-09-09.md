# T18 / S174：Zerg 单位角色第二节的独立内容审查

2026-09-09 19:09 CST。状态：**发现确定的语义错误，不能直接晋升为可用 Skill**。

这不是生产传输失败，也不是生产已停止。正式 run `faction-v1-ad241fedbb4116a1fcd4` 仍在生成其余章节；本次只读实际已完成结果与原冻结来源，不修改运行代码、不重发模型请求、不刷新数据。

## 被审查的真实产物

- 数据库：`build/ticket-17-production-redesign-v1/production.sqlite`。
- Step：`faction.zerg_swarm.unit_roles.2.result`，共 7 条建议。
- Result hash：`10f928b6c656aa30c99235de8b2edc79b56ba39d6b178cff427f646237109627`。
- Draft hash：`99c33e6d3f25f8618c89899c9d067a4852ecfc4402dc03ced7b4760da015c0ff`。
- Input hash：`0c9b576b1971c61d5f3df8a8300c79968f8aaf285c2e8d5938162f56d7a058ad`。
- Frozen context：`57614d965ae5633550630f6beea5cbab43a149d740e591194c1eea9a3bf350fd`。
- 冻结 core / FAQ / kernel / dataset 与原生产相同，分别为 `1adbdb65…` / `2881adb2…` / `f069451a…` / `b2579b83…`；原 input 中保留完整值。

下列路径相对于 `draft`，数组索引从 0 开始。生产的 `semanticReviewPassed=true` 不能覆盖以下来源反例。

## 已确认的五类问题

| 类型 | 实际字段示例 | 来源反例与正确边界 |
| --- | --- | --- |
| 概率算术 | `recommendations.3.procedure.2` 写 Roach Armour 3+ “约 1/3 被挡” | 冻结 Part 3.7、8.7.4：结果达到目标值即成功，成功的 Armour 骰被移除。D6 的 3/4/5/6 均成功，挡下概率是 **2/3**，失败为 **1/3**。在明确无其他修正、无额外攻击/闪避的简化前提下，2N 个 Hit 4+ 攻击骰的未防住命中期望为 N/3，而非 2N/3。这不是胜率证明。 |
| Army Slot 分支算术 | `recommendations.0.alternatives.2`、`recommendations.1.risk`、`recommendations.4.risk` 把购买 Hydralisk Den 后带小编制 Hydralisk 说成耗尽 Elite 槽位 | Zerg Swarm 基础 Elite=1；Hydralisk Den 增加 2；小编制 Hydralisk 占 2。因此剩余 **1+2−2=1**。Lair 路径才是 **1+1−2=0**。必须区分两条建军分支，不能保留后续“不能带其他 Elite”的无条件结论。 |
| 购买货币与激活成本混淆 | `recommendations.2.procedure.2` 把 Creep Speed 写成 10 瓦斯；`.2.procedure.3` 把 Domineering Presence 写成 “1 BM+10瓦斯”；`.3.alternatives.1/2/3`、`.4.procedure.4`、`.5.alternatives.1`、`.6.procedure.4` 有同类问题 | 冻结 Part 9.1、9.1.7：单位与单位升级在 Army Building 花 **Minerals**；Vespene 购买 Tactical Cards。单位卡 `costS/costL` 是购买费用，不是每次激活费用。Queen 的两个升级均 costS=10；Domineering Presence 激活为 1 Biomass、Movement Phase，目标是 **another** Friendly Unit。Roach 的 Burrow Ambush / Glial Reconstitution / Hydriodic Bile 也须区分购买费与实际能力成本。其余单位按各自卡面再核实，不能只替换一种单位名称。 |
| 将明确规则错放进“不确定” | `recommendations.2.unproven.1`、`.5.procedure.0`、`.5.unproven.1` 称 Brood Instinct “授予 Evade Roll”，然后称 Queen 的交互来源未明确 | 冻结 faction card 只是在 Evade Roll 前给予 +1 Modifier，不是授予新掷骰。Part 3.4 明确 Null Value 不存在该能力，modifier 不能产生 Null 对应的 roll。不能用 `unproven` 标签掩盖来源已经能判定的错误。这里不扩张结论到所有其他特殊授予能力。 |
| 行动阶段与前提丢失 | `recommendations.3.reviseIf.1` 在 Roach 已被先手冲锋且不能撤退时建议 Burrow Ambush 调整位置 | Roach 的 Burrow Ambush 只在 **被指定从 Reserves 部署**时触发，按 Entry Edge PLACE(18)，限制距敌人 10 英寸，随后激活结束。它不是在场已接战单位的脱离手段。应把预部署选位方案与已经接战后的合法应对分开；Glial Reconstitution 也不能单凭加速文字被当作自动脱离。 |

需要同步修订同一建议的 alternatives / risk / reviseIf / unproven；只修正文一句会留下矛盾。上述表是本次已证实的例子清单，不是对整个章节的穷尽审计。

## 原始来源定位

- `core.OszqexisUrSOKMW6TzA5.items.7`：Tests。
- `core.OszqexisUrSOKMW6TzA5.items.4`：Modifiers / Null Value。Source hash `ff6dcdd7e715696c31cc40ce9f352893c2ad2e055945b1633908ba3d72b0f92b`。
- `core.iuUyObNTQ2M8xK4IUqzC.items.7.subItems.3`：Ranged Attack Resolution / Armour Pool。
- `core.FuahgilWtc8nccVSp2Vv.items.0.subItems.3`：Army Slot。Source hash `dc0d8613f40f0a29de27a43e7bc5d73862162cf8691865dd4eb66163724d4609`。
- `core.Rj6sMyNODPQ8OHUc9Clp.items.1`：Army Building 的资源分类。Source hash `c6ba27253fa5e91ceb901de2f4d1753897a01b581d227d1287d15065bc4ce068`。
- `core.Rj6sMyNODPQ8OHUc9Clp.items.1.subItems.6`：Upgrades。Source hash `95c3dd8525fe510af73715d193ffea5945fbe7f9f5a7167dfbf46501929370a6`。
- `source:tactical_cards:zerg_swarm`、`source:tactical_cards:hydralisk_den`、`source:army_units:hydralisk`：真实 Elite 数据及 Brood Instinct 文本。
- `source:army_units:queen`、`source:army_units:roach`：真实 `costS/costL`、`activation`、`phase`、触发对象及空间限制。

D6 概率和两个槽位分支已用枚举/算术只读计算确认；没有依赖另一个模型投票。来源由原 input 的 `frozenSources.prompt.sources` 读取，JSON 单位记录由完整 passages 拼接后解析。

## 对生产与验收的影响

1. 当前传输/结构纠错可继续工作；这几类错误要求**语义与数学验证**，不能再用格式成功当作规则正确。
2. 现有 `inspectFactionZergUnitTimingDebtV1` 对这份真实 draft 返回 0 finding。它明确仅匹配已登记历史原句，不能支持“没有其他语义问题”的结论。不要无限增加同义句正则来宣称通用解决。
3. 在本份内容最终验收前，用完整章节与冻结来源驱动局部修订；费用、槽位、概率、阶段/前提作为不同类型的事实分别验证，并检查所有受影响建议字段。保持原付费产物可审计，不覆盖原结果、不整章重新抽样。
4. 必须将上述五类真实反例接入独立验收/修订证据后，才能 finalization。**此文是已确认的操作员晋升阻断，不代表机器门禁已经接好，也不代表修复已完成。** 后续不能忽略该阻断直接调用 finalizer。
5. 即使修完上述错误，仍需独立消费测试、真实位置/动作 Harness 和策略效果证据；本次不证明胜率。

## 本轮 Ctx2Skill 记录

```text
ctx2skillLoopUsed: true
targetGames: [starcraft_tmg]
roleRoutes: [rule_skill_builder]
skillsRead: [actual Zerg unit_roles.2 production section]
skillsGenerated: 0 by this audit
judgeTestsRun: source comparisons; D6 enumeration; two Army Slot arithmetic branches
crossTimeReplayResult: not performed by this audit; live production remains running
promotions: []
blocks: [draft 99c33e6d… requires semantic correction before finalization]
remainingRuleGaps: the five confirmed classes above; non-exhaustive
canAffectRules: false
trainingTruth: false
```
