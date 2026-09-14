# Ticket 23 / Slice 242 — 当前产品 Protoss 独特规则收口

日期：2026-09-15

状态：Complete
产品分母：`252 executable_exact / 0 pending_family_adapter / 252 total`

## 本片交付

冻结 `units=71/cards=69/rules=48`，未刷新来源。本片把 owner 242 最后四条定义接入
统一 Ability Runtime：

- Nexus `Ancient Pride`：Any Phase 的 active Unit 获得一次“首个实际使用的 Weapon 为
  INSTANT”；远程与近战在规划时关闭敌方 Reaction，第一次真实武器 Apply 后消费，不改写
  原始武器档案。
- Artanis `Commander`：仅在控制/争夺 Mission Marker、完成 Objective、Disengage 三个
  明确语境把自身 Supply 投影为 `base + 1`；Supply Pool 仍使用基础值。
- Warp Gate `Warp In`：Movement Phase 从 Reserve 选择尚未激活的 Friendly Ground Unit，
  复用统一部署几何，在任一非双方 Entry Edge 的桌边 Deploy；完整底座必须在 `54×36` 或
  当前 Room 桌面内、完整编队合法、离每个 Enemy model 严格大于 10 英寸，并保留普通
  Enemy Zone、地形、Supply 与“本轮无另一 Friendly Ground Unit 已部署”限制。
- Khalai `Bound by the Khala`：只在 active Unit 的 `after_action` 窗口枚举另一支本阶段
  尚未激活的 Friendly Unit；Apply 耗竭卡牌并把同一方的激活窗口直接转交为目标 Unit 的
  `before_action`，不会错误切给对手。

新增的非入口边部署描述把模型底座形状/宽深、Deploy 距离、3 英寸编队范围、合法边和
完整底座要求一并暴露给 Web/Harness；Agent 不再只拿到 edge 名称后盲猜坐标。所有卡牌动作
均走 `LegalSpace → Preview → Apply → Replay`，History/Log 保存来源、计划、目标和效果。

## 聚焦验证

没有新增测试文件，没有运行全量或历史门，也没有重复已通过的旧门。

- 静态导入一次通过。
- 工厂基础构建一次达到 `252/0`。
- 行为门第 1 轮在测试夹具把全部 Terrain 标成 removed 后，被 EngagementGraph 的既有
  Terrain Agreement 一致性门挡住；保留权威 Terrain 后 Ancient Pride 真实远程链通过。
- 第 2 轮 Warp In 使用的六模型矩形排列超出“全部模型底座都在 leading model 3 英寸内”
  的精确编队约束；这证明边界按棋子边缘而非中心判断。随后把底座/编队约束加入动作域，
  使用 6 个官方 32mm 圆底的紧凑合法排列。
- 完整第 3 轮超过 30 秒工具输出窗口且未留下失败进程；未重跑已通过项，只对本轮修改的
  Warp In 和尚无独立终态回执的 Khala 做一次窄化终态门，`exit 0`：

```text
252 exact / 0 pending / owner242 pending 0
Artanis: pool 1 / marker 2 / objective 2 / disengage 2
Ancient Pride: INSTANT true / ranged Reaction false / first weapon consumed 1
Warp In: 6 complete 32mm bases / left non-entry edge / after_action / replay equal
Bound by the Khala: Marine-1 after_action -> Marine-2 before_action
```

Provider 调用/token/费用：`0 / 0 / ¥0`。数据刷新：`false`。

## Harness / Agent 证据

- `harnessLoopUsed: true`
- `targetGames: [starcraft-tmg]`
- `promptPackRoutes`: 未修改；General/Faction/Matchup Skill 只提供策略，Rules Runtime 拥有
  合法性、Supply、底座几何、Reaction 与激活权。
- `harnessToolsCalled`: `legal_space`, `preview`, `apply`, `query`, `replay`；真实远程 Runtime
  另消费 Ancient Pride 的一次性效果。
- `uiTraceEvidence`: 无；Standard 2000 Web 用户旅程属于 Slice 245。
- `agentDecisionEvidence`: Agent 可选择 Warp In Unit/非入口边/完整模型坐标、Khala 后继
  Unit 和 Ancient Pride 时机；不能越界、破坏编队、落在敌方 10 英寸内、重复部署 Ground
  Unit、复用 exhausted card 或自报 INSTANT。
- `memoryTraceEvidence`: `protossUniqueUseHistory` 保存 round/phase/side/piece/target/
  definition/card/deployment/effect/plan；战斗事件保存 Ancient Pride 消费结果。
- `trainingTraceCandidates`: 无；全部权威回执为 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 删除 Protoss Adapter binding 会使四条定义回到 pending；缺少
  远程/近战首武器消费、完整底座部署或激活窗口转交时不得保留 exact 状态。
- `userVisibleChecks`: Web 必须显示合法非入口边、各底座尺寸/编队范围/>10 英寸敌距、卡牌
  Exhaust、INSTANT/无 Reaction 和 Khala 激活转交；实际 UI 点击属于 Slice 245。

## 后续与最终口径

Slice 243 只做全产品 `252/252` 聚合、偿还 Slice 234/235 的 Medium 证据债并证明
`unsupported=0`。最终验收不是 500 分：Slices 244–250 固定为 Standard，双方各
`2000 Minerals`、每方 `≤200 Vespene`、`54×36`；500 分仅是开发夹具。
