# Ticket 23 / Slice 244：Standard 2000 最终 Room Factory 收口

日期：2026-09-15。状态：完成；Ticket 23 为 `30/36`，剩余 `6` 片。

## 交付结果

- `official-standard-room-factory-v1` 升至 `2.0.0`。最终验收初态固定为双方各
  `2000 Minerals`、每方 `≤200 Vespene`、Standard `54×36`，不再复用 500 分
  Skirmish 夹具。
- 当前默认军表为 Terran Armed Forces `7` Unit 对 Kerrigan's Swarm `8` Unit；
  实际资源结果为 `2000/115` 对 `2000/140`（Minerals/Vespene），15 个 Unit 全部从
  Reserve 开始。
- 新增 9 件 Standard 平衡地形方案，并由既有 Rules kernel 认证总数、Size、Grass、
  四象限、中央显著地形、机动通道、两条对向火力通道和高地 Access Point。地图不是
  UI 装饰，而是 Room 权威状态中的完整几何。
- 新增 `official-current-product-action-runtime-composition-v1`，把空间、远程、近战、
  当前名单基础能力以及 11 个全产品语义能力族组合到同一 2000 分状态；它复用
  Slice 243 的 252/252 Coverage Release，不复制或重新解释规则文本。
- 旧 500 夹具校验常量已参数化：Runtime descriptor 的 Unit、路线、无远程单位和
  主动/被动能力数量由当前权威军表推导；Standard/Skirmish 世界尺寸由 engagement
  scale 决定。规则器仍负责攻击池和总骰，Agent 只消费 LegalSpace。

## 聚焦门结果

只运行本片 Standard 2000 Factory 门，三轮内收敛：

1. 第一轮在 30 秒工具执行窗口内未完成且没有规则错误；确认无遗留进程后，删除
   composition 内部与 Factory verifier 的重复全树复验，保留单一最终验证边界。
2. 第二轮定位到旧 verifier 虽已参数化声明数，唯一 route/binding ID 基数仍写死
   `13/9`；改为与当前 bundle 自报分母一致。
3. 第三轮通过，并由 Factory 自身完成最终 verifier：

```text
Factory receipt       88025f550362a15f06e582590fc7b0af78a1604ca5fc93034efbb92790c2831b
Runtime composition   6dc7fec9327821b72980f2305cf22df84de65407a299bb9554fe98bee4797cb2
Minerals              player1=2000 / player2=2000
Vespene               player1=115 / player2=140
Battlefield           Standard 54×36
Terrain               9 certified pieces
Units                 15 (7 Terran / 8 Kerrigan's Swarm), all Reserve
Spatial routes        60
Ranged routes         25
Melee routes          32
Selected active       15
Ability coverage      252 exact / 0 pending / 0 unsupported
```

没有运行历史绿色门，没有刷新官方数据，也没有调用 Provider。

## 边界与下一步

本片证明最终规模的军表、任务、地形和完整当前产品 Runtime 能组成一个可验证 Room
初态。`completeMatchDryRunPassed=false` 仍显式保留：全阶段 LegalSpace、真实动作序列、
任务计分和终局的零 Provider 完整局属于 Slice 246；在此之前不能把 Factory 成功冒充为
整场对局成功。Slice 245 先通过真实 Web 用户旅程修复写表、数据库、对战桌、悬浮副官、
物理任务、计划、日志、成本和截图面板。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none；本片没有 Agent 决策
- `harnessToolsCalled`: Standard army/upgrade/resource/roster/draft/mission/terrain/reserve kernels；current-product spatial/ranged/melee/ability composition
- `uiTraceEvidence`: none；产品 Web 用户旅程属于 Slice 245
- `agentDecisionEvidence`: none
- `memoryTraceEvidence`: Mission Runtime、Reserve lifecycle、Rules Runtime descriptor 均进入同一 Room 初态
- `trainingTraceCandidates`: none；`trainingTruth=false`
- `rollbackOrDemotionRules`: 任一 2000/≤200/54×36、terrain certificate、252/0 或 Runtime hash 校验失败即拒绝 Factory；500 夹具不能替代
- `userVisibleChecks`: 双方军表/资源、地图地形、15 Unit Reserve 和完整 Runtime 均可由后续 Web Room 投影读取

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
