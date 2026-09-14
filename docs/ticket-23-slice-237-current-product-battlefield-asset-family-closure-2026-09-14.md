# Ticket 23 / Slice 237 — 当前官方产品 Battlefield Asset family 收口

日期：2026-09-14。状态：完成。Ticket 23 为 `23/36`，剩余 `13` 片。

## 交付结果

冻结玩法数据继续保持 `units=71 / cards=69 / rules=48`，没有执行玩法数据刷新。本片把
owner 237 的 `30` 条 definition 编译为 `19` 个共享效果原型，并绑定统一的
`official-battlefield-asset-family-adapter-v1`。当前产品动作分母为：

```text
229 executable_exact + 23 pending_family_adapter = 252
owner 237 pending = 0
```

Adapter 提供统一 `LegalSpace → parameterized Preview → Apply → Query/Lifecycle → Replay`
入口，覆盖 Creep Tumor、Force Field、Shade、Faction Indicator、Reserve Indicator、
Structure、Orders、Pylon、ON CREEP 与任务 Marker 相关修饰。连续坐标只能由 Rules 实例化；
客户端像素、缩放、DPR 和中心点均不能替代完整实体底座检查。

## 实体尺寸与几何

- Creep Tumor：用户依据官方商品确认是直径 `28 mm` 的圆形实体；规则状态明确保存
  `baseShape=round` 和 `baseDiameterMm=28`。
- Force Field：官方 Sentry 商品/组装信息把 Sentry 和 Force Field 分别对应到 50 mm 与
  80 mm 底座，因此 Force Field 是直径 `80 mm` 的圆形实体：
  <https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-sentry>。
- Shade：官方 Adept 商品包含 4 个 Adept 与 1 个 Shade，并提供 5 个 40 mm 底座，因此
  Shade 是直径 `40 mm` 的圆形实体：
  <https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-adepts>。
- Creep Tumor 的官方组装件身份由 Zergling 说明书中的 sprue 809 绑定：
  <https://archon-studio.com/files/manuals/sc/StarCraft-Zerg-Zergling_EN.pdf>；尺寸值采用本轮
  用户确认，不用 Queen 的 80 mm 底座代替。

三种实体均要求完整圆底留在战场内、不能与模型/Token/阻挡地形重叠，并以底座边缘量距。
现有 Token 原语同时能表达圆形/方形实体，但本片三个官方组件全部为圆形。

## 规则消费者

- Creep 放置从友方 Entry Edge 或既有友方 Tumor 的底座边缘量 6 英寸；Tumor 可提供
  ON CREEP，FAQ 的动作开始快照由移动/冲锋消费者读取，敌方结束指定动作后才执行 1 英寸
  移除。Living Glob 令其 STAY IN PLAY 与 DISPLACEMENT。
- Force Field 放置于 8 英寸内的空位；Size 2 或以下完整移动底座不得穿越，Size 3 或以上
  穿越后移除该 Field。
- Shade 在 12 英寸 wholly-within 约束下放置并携带 DISPLACEMENT；4 英寸目标邻域的友方
  武器获得 Precision 1，回合末换位机会交给 Slice 238 的 Unit lifecycle 执行。
- Detection Indicator 移除 6 英寸内敌方 Hidden；Veteran of Tarsonis、Lurking、
  Malevolent Matriarch 与 Creep Speed 已接入远程、近战、冲锋和移动投影。
- Structure 由 Server Factory 从官方 `Structure` 定义直接标记，不能激活/行动、Supply
  视为 0、不能控制/争夺 Marker，也不能作为普通能力目标。
- Orders 的三种选择、CP 支付与首件武器消费进入确定性日志；Pylon 的一次/回合 PE-1
  由能力支付层自动消费，不由 UI 或 Agent 自行扣费。
- `Zerg Creep` 的写表约束继续由既有 Server Army Audit 执行：Kerrigan's Swarm 必须购买
  且只能购买一张规定的 Creep Card；本片 Route 为该已有 Rules 行为提供统一 IR 身份。

## 聚焦验证

没有新增测试文件，也没有运行历史全量门。唯一聚焦内联门在三轮内收敛：

1. 第 1 轮发现总分母尚未登记新 Adapter 的交付 Slice；补充 `adapter → 237` 版本映射。
2. 第 2 轮 Factory、`229/23` 和组件尺寸均已通过；额外场景错误地要求默认 500 分军表
   产生 Creep Spread 域，但该军表只携带 Accelerating Creep，不含 Hatchery。
3. 第 3 轮按真实 500 roster 边界验证 Route Query，而不伪造未购买卡牌；通过 `30/30`
   Route、`3` 条 Creep placement 来源、`229/23` 分母、圆形 `28/80/40 mm` 组件、Token
   校验及 Tumor ON CREEP 完整底座投影。

Slice 234/235 既有 Medium 工厂证据债和 Slice 236 后置只读修正仍统一留给 Slice 243；
本片没有把它们重跑或冒充已清偿。Provider 调用/token/费用为 `0 / 0 / ¥0`。

## Harness / Agent 证据

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`。
- `promptPackRoutes`: 未修改；Agent 继续读取既有 General/Faction/Matchup Skill。
- `harnessToolsCalled`: `legal_space`, `instantiate_parameterized_action`, `preview`, `apply`,
  `battlefield_asset_projection`, `asset_inventory`, `lifecycle`, `replay`。
- `uiTraceEvidence`: 无；战桌 Token/范围/资产面板的用户旅程由 Slice 245 完成。
- `agentDecisionEvidence`: Agent 只能选择 Rules 发布的能力/支付域并提交世界坐标；合法性、
  实体尺寸、碰撞、支付、自动消费和生命周期均由 Host/Rules 决定。
- `memoryTraceEvidence`: asset/use/lifecycle history 保存来源、坐标、回合、消费、目的动作与
  plan hash，可进入本局记忆和复盘，但不保存隐藏思维。
- `trainingTraceCandidates`: 无；所有新增输出仍为 `trainingTruth:false`。
- `rollbackOrDemotionRules`: 移除 Adapter binding 会让 30 条 definition 回到 pending；只有
  Slice 243 的 252/252 聚合门可授予全产品动作接线完成状态。
- `userVisibleChecks`: 组件 Inventory、完整圆底、Creep/Detection/Threat 修饰、Structure
  禁用、Orders/Pylon 支付和生命周期都有可投影合同；实际 Web 可操作性由 Slice 245 验收。

## 后续

Slice 238 接线剩余 `11` 条 Unit lifecycle：Summon、Morph、Respawn、Return to Reserve、
Set/Create/Replace Unit/Model 与 Supply 变更。之后 Slice 239–243 完成剩余 `12` 条并跑
252/252 聚合；Slices 244–250 完成 Standard 2000 Factory、Web、零 Provider 全局演练、
真实 H-A/A-A、合并复盘与 PDF 证据。
