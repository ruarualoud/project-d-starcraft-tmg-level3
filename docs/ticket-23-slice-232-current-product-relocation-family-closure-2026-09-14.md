# Ticket 23 / Slice 232 — 当前官方产品位移能力族收口

日期：2026-09-14。状态：完成。Ticket 23 为 `18/36`，剩余 `18` 片。

## 交付结果

冻结官方来源仍为 `units=71 / cards=69 / rules=48`，本片没有刷新数据。Slice 231
预账本中的 34 条 pending relocation 在实现前经过逐条原文复核：6 条实际以 Indicator
为战场资产，3 条实际创建、设置或送回 Unit，已分别转交 Slice 237/238。加上原本由
Slice 229 完成的 3 条 selected exact，位移主责分母现为 `28 = 3 existing + 25 new`。

新增 `official-relocation-family-adapter-v1` 是一个深模块：外部仍只看到统一的
`legal_space / preview / apply / query / lifecycle / replay` Adapter Interface，内部把 25
条冻结原文编译为 10 个语义族，而不是创建 25 个相互分叉的执行器。

| 语义族 | Definition | 执行含义 |
| --- | ---: | --- |
| Burrow movement permission | 3 | Burrowed Move/Run 保持状态并允许穿过其他 Unit 底座 |
| Deployment edge lock | 1 | ComSat 选择非 Entry Edge，锁定敌方部署直到 round end |
| Deployment Stimpack discount | 1 | Reserve nomination 时 Stimpack 费用减 1，最低 0 |
| Direct PLACE | 3 | PLACE 3/6/12、完整编队重放、敌方 Engagement gap、once-per-game/替代动作 |
| DISPLACEMENT | 1 | 为位移消费者提供精确特征查询 |
| Entry-edge PLACE | 7 | Burrow Ambush PLACE 18、Entry segment、敌方 10 英寸排除、激活结束 |
| Extra Move | 5 | 额外 2 英寸 Move，不消耗正常 action limit |
| Friendly-anchor PLACE | 1 | Rapid Reinforcements PLACE 10、友军 anchor、敌方 8 英寸排除 |
| Non-entry-edge Deploy | 2 | Armed and Ready / Timing Push，Speed、Supply、Zone、敌方 10 英寸与边锁 |
| Raptor terrain permission | 1 | Size ≤4 impassable 与免 Access Point 的消费者查询 |

每条路线只能由当前冻结原文的确切模式编译；未知文本会停止编译，不能把任意 prose
当成规则。Unit 路线按编成规模读取 upgrade 成本和实际购买项，零成本固有能力仍可用；
Card 路线绑定实际 Ready card instance，并在 Apply 时 Exhaust。

## 空间与生命周期

- PLACE 不伪造移动路径；Leading Model 距离、Entry segment、非 Entry Edge、友军 anchor
  与敌方排除距离分别按对应能力检查。
- 最终位置复用已完成的 Model Base Geometry Module，支持 25 个圆底和 Hydralisk 的
  40×100mm 旋转矩形底：完整底座必须在桌面内，所有模型必须合法、不重叠并保持
  3 英寸 coherency。
- 额外 Move 检查 Leading Model 的完整圆底扫掠、路径总长、单位/地形碰撞、Grass、
  elevation 与 Access Point；PLACE 只检查合法终点。
- Deploy 同时检查当前 Supply、敌方 Zone of Influence、敌方 base-edge gap 和当前
  ComSat edge lock。Armed and Ready 的同回合另一 Friendly Biological Deploy 限制同时
  查询普通 Deploy 与本 Adapter 历史。
- Apply 写入模型位置、Reserve manifest、card exhaustion、激活窗口、公开事件和可 Replay
  历史。统一 Ability Runtime 新增 `round_end` 生命周期并让每个 Adapter 都收到事件，
  因此 ComSat 锁不会依赖 UI 自行清除。

统一 Router 同时修复一个被本片首次触发的真实集成缺陷：Preview/Apply 现在从
`request.domain.executorId` 或 `request.action.executorId` 选择 Adapter。旧代码只读取顶层
字段，在多 Adapter 时会错误落到 selected Adapter；这也是聚焦门第 1 轮失败的原因。

## 当前全产品分母

当前为 `45 executable_exact + 207 pending_family_adapter = 252`。其中 Slice 229 交付
20 条、Slice 232 新交付 25 条；位移 owner 已无 pending。

| Owner Slice | Definition 总数 | 当前 pending |
| ---: | ---: | ---: |
| 232 | 28 | 0 |
| 233 | 65 | 60 |
| 234 | 30 | 30 |
| 235 | 42 | 40 |
| 236 | 24 | 24 |
| 237 | 37 | 30 |
| 238 | 12 | 11 |
| 239 | 2 | 2 |
| 240 | 5 | 4 |
| 241 | 3 | 2 |
| 242 | 4 | 4 |

这些数字是编译器按 effect family 优先级重建的现状，不是手工改表。Slice 243 之前仍不
声称产品 Room 可完整对战；Standard 2000 最终 Room/Web/整局门仍在 Slices 244–250。

## Harness / Agent 证据

- `harnessLoopUsed: true`；本片维护的是 Rules/Tool contract，不改变 Prompt Pack。
- targetGames：StarCraft TMG；promptPackRoutes：未修改。
- harnessToolsCalled：统一 Ability Runtime 的 LegalSpace、Preview、Apply、Query、
  Lifecycle、Replay；没有 Provider 工具调用。
- uiTraceEvidence：无；产品 Web 用户旅程在 Slice 245。
- agentDecisionEvidence：Agent 可读取 25 条位移 domain、完整空间参数和四类 query-only
  modifier；搜索/策略不得改写 Rules 结果。
- memoryTraceEvidence：只增加权威 relocation history，不改变 Agent 工作记忆。
- trainingTraceCandidates：无，所有输出保持 `trainingTruth:false`。
- rollbackOrDemotionRules：移除/降级 Adapter binding 会把对应 definition 恢复为 pending；
  semantic version 和显式 Adapter 决定兼容，内容 hash 只作 lineage。
- userVisibleChecks：本片是产品能力与 Room 机器证据，UI 展示与真实用户操作仍待 Slice 245。

## 聚焦验证

同一 causal gate 在 `2/3` 轮内收敛：

1. 第 1 轮发现多 Adapter Router 没有读取嵌套 request 的 executor，Preview 被误送到旧
   selected Adapter；这是集成缺陷，不是路线/原文生成失败。
2. 修复 Router Seam 后第 2 轮通过，不再重跑。

通过项包括：25 条精确来源编译、10 个 archetype、`45/207` 总账、Hydralisk 矩形底
Burrow Ambush、Zealot 2 英寸额外 Move 且不消耗 action limit、ComSat 左/右边锁与
round-end expiry、Roach Tunneling Claws query，以及统一 Preview→Apply→Replay。

没有新增测试文件，没有运行历史规则、战斗、Web 或全量门。Provider 调用/token/费用为
`0 / 0 / ¥0`。
