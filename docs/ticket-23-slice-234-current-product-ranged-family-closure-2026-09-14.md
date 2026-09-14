# Ticket 23 / Slice 234 — 当前官方产品远程攻击能力族收口

日期：2026-09-14。状态：完成并带一项 Medium 验证债务。Ticket 23 为 `20/36`，
剩余 `16` 片。

## 交付结果

冻结官方来源保持 `units=71 / cards=69 / rules=48`，没有网络刷新或仓库回退。
全产品数据层现可同时容纳 `26` 个 Unit（包括没有 Close Combat 武器的 Omega Worm）和
`51` 个武器 Profile；其中 owner 234 的 `23` 个 Assault 武器及 `7` 个远程能力定义已由
`official-ranged-family-adapter-v1` 接线：

```text
135 executable_exact + 117 pending_family_adapter = 252
owner 234 pending = 0
```

新 Adapter 是一个深 Module。Web、Room 与 Agent 仍通过统一的
`legal_space / preview / apply / query / replay` Interface 使用它；内部复用现有几何、
接战、伤亡、补给和 Ability Consumer，而不让模型或 UI 解释卡面 prose。

## 远程动作语义

- 武器是否入场由当前编成、替换武器和 `SPECIALIST` 指派共同决定；每个模型只为自己
  实际携带的 Profile 贡献骰子。普通武器批次与 `SIDEARM` 批次分开，多个武器按批次
  顺序结算，并可在批次间主动结束本 Unit 的 Assault 激活。
- 目标类型同时读取 Piece 的 `combatTag`（Ground/Flying）和详细 `combatTags`；接战限制、
  `PINPOINT`、`BULKY` 和武器 Target 标签均在 LegalSpace 阶段执行。
- 每个攻击模型独立计算完整底座边缘距离和 LoS；标准射程与 `LONG RANGE` 可在同一批次
  形成不同命中阈值。`INDIRECT FIRE` 只忽略 LoS，不忽略射程。
- 攻击池支持 RoA、`BURST FIRE`、`LOCKED IN`、Guardian reduction、显式防守方
  Point Defense Laser 选源/选骰、Surge、`ANTI-EVADE`、`CRITICAL HIT`、Precision、
  `PIERCE`、Armour、Evade 与 Damage 的固定顺序。
- Point Defense Laser 不再自动牺牲全部可用无人机。动作参数保存防守方选择的无人机和
  被移除骰子；`INSTANT` 武器不开放该选择；Apply 后才移除所选无人机，并写入非计分的
  Rules-owned 自移除 Supply 原因。
- Shielded 为首个受伤模型增加一次容量。状态在累计伤害超过 Shield 值后消失，但已使用
  的额外容量继续留在首模型伤害账中，避免后续攻击错误把伤害提前溢出到下个模型。
- Optical Flare 16 英寸、Stabilizer Medpacks `+1` 模型、Grenades-Frag D6 Surge、
  Grooved Spines/Laser Targeting Systems 16 英寸与首把武器效果都经共享 Consumer Seam
  进入既有能力/战斗执行器。

## 当前剩余分母

| Owner Slice | 当前 pending |
| ---: | ---: |
| 234 | 0 |
| 235 | 40 |
| 236 | 24 |
| 237 | 30 |
| 238 | 11 |
| 239 | 2 |
| 240 | 4 |
| 241 | 2 |
| 242 | 4 |

即当前产品动作化为 `135/252`，剩 `117`。只有 Slice 243 可以声明全产品
`252/252`；Standard 2000 的产品验收仍属于 Slices 244–250。

## 验证与已知 Medium

本片严格在三轮停止：

1. 第 1 轮在全产品 Factory 发现 Omega Worm 无 Close Combat 武器，修复为允许合法空
   Combat weapon 列表，单位属性仍保持强校验。
2. 第 2 轮已通过 Factory、冻结版本、`26 Unit / 51 Profile / 30 route / 135+117`
   断言，随后临时多武器场景找不到测试脚本写死的 `C-14 Rifle`。
3. 第 3 轮在合并 `combatTag + combatTags` 的真实产品修复后仍停在同一查找。静态对照
   冻结原文确认规范名是 `C-14 rifle`（小写 `r`），因此剩余失败属于内联验收脚本的
   大小写错误，不是 Product LegalSpace 抛错。

按“只有 Critical/High 阻断；同一验证最多三轮”的规则，不执行第 4 轮。已证实来源编译、
Factory 和产品分母；本片新增 Adapter 的完整 C-14 Apply→Replay→多武器 Finish 路径
没有取得新的绿色 E2E 回执，登记为 **Medium 验证债务**，不得在后续报告中冒充已通过。
Slice 243 aggregate 必须使用规范 `C-14 rifle` 名称覆盖这一债务。

没有新增测试文件；Provider 调用/token/费用为 `0 / 0 / ¥0`。

## Harness / Agent 证据

- `harnessLoopUsed: true`；`targetGames: [starcraft-tmg]`。
- `promptPackRoutes`: 未修改；本片改变 Rules/Tool contract。
- `harnessToolsCalled`: Ability Runtime LegalSpace、Preview、Apply、Replay 的门禁尝试；
  来源/Factory/分母已执行，新增动作 E2E 因上述 Medium 未到 Apply。
- `uiTraceEvidence`: 无；Web 用户旅程属于 Slice 245。
- `agentDecisionEvidence`: Agent 可见武器/目标/射程/逐模型骰池、可选 PDL、Chance 与伤亡域；
  模型不能改写命中、伤害或几何结果。
- `memoryTraceEvidence`: 权威 ranged history、连续武器 sequence 和 Room log 可供本局记忆查询；
  未改变长期 Skill。
- `trainingTraceCandidates`: 无；所有输出保持 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 移除 Adapter binding 会让 30 条定义回到 pending；语义版本决定
  兼容，内容 hash 只作 lineage。未闭合的 E2E 证据不能升级为训练资格。
- `userVisibleChecks`: 状态、伤亡、Supply、武器批次与防守选择已进入权威 state；具体面板
  在 Slice 245 统一验收。
