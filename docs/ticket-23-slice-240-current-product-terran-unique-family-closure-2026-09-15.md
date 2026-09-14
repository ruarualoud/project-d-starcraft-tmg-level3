# Ticket 23 / Slice 240 — 当前产品 Terran 独特 Supply 规则收口

日期：2026-09-15  
状态：Complete  
产品分母：`246 executable_exact / 6 pending_family_adapter / 252 total`

## 本片交付

冻结 `units=71/cards=69/rules=48` 数据不刷新，把 owner 240 的四条定义接入同一个
上下文 Supply 投影内核：

- Medic `Advanced Medic Facilities`：仅计算 Supply Pool/Available Supply 时按 0；
- Jim Raynor `Commander`：自身控制/争夺 Marker、完成 Objective、Disengage 时 +1；
- Jim Raynor `Freedom Fighters`：完整底座 8 英寸内友方 Unit 在 Marker/Objective
  语境的 Supply 下限为 1；原文是 Friendly 而非 another，Raynor 自身也属于范围；
- Supply Depot `Additional Supply Depots`：Movement 激活窗口中的 active Unit 获得
  Marker/Objective Supply +1，Card Exhaust，按 Active Ability 通则在 round end 失效，
  同一 Unit/具名能力每轮一次。

`currentSupply` 始终保存由模型数量决定的基础值。Supply Pool、Mission Marker、Objective、
Disengage 四个消费者按明确 context 请求投影，避免 Medic 的建军效果污染计分，也避免
Freedom Fighters 误用于 Disengage 或部署。投影回执保留 base、replacement、modifier、
floor、适用 definition 和 hash，供 Web、Agent 解释与复盘。

Commander 与 Additional Supply Depots 是两个不同具名来源的 `+1` characteristic modifier，
当前投影按加法组合；核心规则只明确禁止同一 numeric keyword 重复叠加，这两条并非同一
keyword。该解释作为 Medium 规则解释记录；若官方 FAQ 明确非叠加，修改投影组合策略即可，
不需要改基础状态或四个消费者。

## 消费者接线

- 标准 Deploy 与 relocation Deploy 共用 `supply_pool_calculation`；
- Marker control kernel 共用 `mission_marker_control`，并在争夺回执显示 base/effective；
- Standard mission quarter/objective 计分共用 `objective_completion`；
- Disengage Tactical Mass 共用 `disengage_check`；
- Unit lifecycle 的 Omega Supply cap 不在卡面列出的语境内，保持基础 Supply，不被误改。

## 聚焦验证

没有新增测试文件，没有运行全量门，也没有重复已通过的历史门。

第 1 轮在导入本片新 Adapter 时发现 LegalSpace `flatMap/map/seal` 多一个右括号，属于本片
新代码语法阻塞；修复后因代码已变化，对同一条聚焦门再执行一次。第 2 轮通过：

```text
246 exact / 6 pending / owner240 pending 0
Medic: pool 0, marker 1
Raynor: disengage 2
Raynor + Additional Supply Depots: objective 3, base currentSupply remains 1
Preview -> Apply deterministic transition hash:
e51397779f43ba582143c40aa5b9b2ee9c2731ab2f12c6546f8cc1b155fac2ee
```

Provider 调用/token/费用：`0 / 0 / ¥0`。数据刷新：`false`。

## Harness / Agent 证据

- `harnessLoopUsed: true`
- `targetGames: [starcraft-tmg]`
- `promptPackRoutes`: 未修改；Agent 继续加载 General/Faction/Matchup Skill。
- `harnessToolsCalled`: `legal_space`, `preview`, `apply`, `query`, `replay`；Supply consumers
  通过 typed context projection，不解析自然语言卡面。
- `uiTraceEvidence`: 无；Standard 2000 Web 用户旅程属于 Slice 245。
- `agentDecisionEvidence`: Agent 可读 base/effective Supply、适用来源和持续时间，不能修改
  `currentSupply`、伪造光环距离、复用 exhausted card 或把 bonus 用到错误语境。
- `memoryTraceEvidence`: `terranUniqueUseHistory` 保存 round/phase/side/piece/definition/card/
  effect/plan；公开事件可进入本局摘要与复盘。
- `trainingTraceCandidates`: 无；输出均为 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 删除本 Adapter binding 会让这四条回到 pending；官方 FAQ 若改变
  叠加或范围，只版本化投影策略并重新验证受影响语境。
- `userVisibleChecks`: Web 应显示基础/有效 Supply、Raynor 8 英寸覆盖、Supply Depot 的
  Exhaust/round-end 到期；实际点击验收属于 Slice 245。

## 后续与最终口径

Slices 241–242 完成 Zerg/Protoss 的 6 条余项，Slice 243 聚合 `252/252`。Slices 244–250
最终验收固定为 Standard：双方各 `2000 Minerals`、每方 `≤200 Vespene`、`54×36`；
500 分 Skirmish 只保留为快速开发夹具，不能替代最终 H-A/A-A、复盘或 PDF 验收。
