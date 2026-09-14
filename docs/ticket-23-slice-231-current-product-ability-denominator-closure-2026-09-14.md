# Ticket 23 / Slice 231 — 当前官方产品能力分母与责任账本收口

日期：2026-09-14。状态：完成。Ticket 23 为 `17/36`，剩余 `19` 片。

## 交付结果

Slice 230 的 typed IR 现在具有逐项产品责任账本。冻结版本仍是
`units=71 / cards=69 / rules=48`，本片没有执行来源刷新。

产品来源分母：

| 来源 | 记录 | Definition |
| --- | ---: | ---: |
| Unit | 26 | 183 |
| Faction Card | 6 | 14 |
| Tactical Card | 31 | 55 |
| 合计 | 63 | 252 |

势力/种族 definition 分布为 Protoss `66`、Terran `71`、Zerg（包括 Kerrigan's
Swarm）`115`。激活类型仍精确为 `87 Active / 90 Passive / 24 Reaction / 51 Weapon`；
runtime role 为 `138 Action / 24 Reaction / 51 Consumer / 39 System`。

每条 obligation 都包含：来源、卡名/能力名、势力、激活类型、runtime role、阶段、
主/次 effect family、唯一 planned owner Slice、对应 focused gate、当前 Adapter/版本、
交付 Slice 和 exact/pending 状态。ownership graph 精确有 `252` 条 `planned_for` 边，
保证没有遗漏和双主责；多 family 依赖继续由 Slice 230 的关系图表达。

## 当前覆盖和剩余开发量

当前为 `20 executable_exact + 232 pending_family_adapter + 0 unclassified/explicit
unsupported`。这里的 `unsupported=0` 只表示不存在未识别的静默黑洞；232 条 pending
仍不可执行，只有 Slice 243 的 `252 exact + 0 pending + 0 unsupported` 才是全量接线。

| Owner Slice | 主责 | Definition 总数 | 当前 pending |
| ---: | --- | ---: | ---: |
| 232 | Relocation | 37 | 34 |
| 233 | Characteristic/Status | 65 | 60 |
| 234 | Ranged | 30 | 30 |
| 235 | Melee | 42 | 40 |
| 236 | Reaction/Priority | 24 | 24 |
| 237 | Battlefield Asset | 34 | 26 |
| 238 | Unit Lifecycle | 3 | 3 |
| 239 | Match Lifecycle | 2 | 2 |
| 240 | Terran unique remainder | 6 | 5 |
| 241 | Zerg unique remainder | 3 | 2 |
| 242 | Protoss unique remainder | 6 | 6 |
| 合计 |  | 252 | 232 |

当前 20 条 exact definition 均显式记录 `deliveredBySlice=229`，所以后续 owner slice
不会重复开发它们；owner 只决定 pending 的主关闭位置。

## Room 与 Harness 绑定

500 reference Room Factory 升到 `1.6.0`，Authority state 和 composition evidence 都
绑定同一个 denominator hash。后续 Web/Agent 可以从这个账本查询当前完整产品缺口，
但 pending 条目仍不会进入合法 action candidate。

- `harnessLoopUsed: true`；
- promptPackRoutes：未改动；
- harnessToolsCalled：本片验证只创建 Authority/denominator，没有 Provider 工具调用；
- uiTraceEvidence：无，Slice 245 执行 Web 用户旅程；
- agentDecisionEvidence：definition、runtime role、owner、Adapter 状态可查询；
- memoryTraceEvidence：无 Agent memory 变更；
- trainingTraceCandidates：无，全部 `trainingTruth:false`；
- rollbackOrDemotionRules：semantic version/显式 Adapter 决定兼容；移除 Adapter 会把
  对应 definition 降回 pending，不能保留虚假 exact；
- userVisibleChecks：当前为机器分母/Room 证据，UI 展示延后到 Slice 245。

## 聚焦验证

新增代码后只运行一次 current-product denominator gate，结果通过：

- `63 = 26 Unit + 6 Faction Card + 31 Tactical Card`；
- `252 = 20 exact + 232 pending`；
- 三个种族均有完整 gap projection；
- 每条 definition 恰有一个 Slice 232–242 owner；
- 252 条 ownership edge 与 Room evidence hash 一致；
- Slice 243 closure contract 要求 `252/252 exact`、pending/unsupported 均为零。

没有新增测试文件，没有运行历史规则、战斗或 Web 门。Provider 调用 `0`，token `0`，
费用 `¥0`。
