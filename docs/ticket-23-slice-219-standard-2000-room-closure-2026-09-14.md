# Ticket 23 / Slice 219：Standard 2000 Room 组合收口

日期：2026-09-14。状态：完成；Ticket 23 为 `5/15`，剩余 `10` 片。

## 交付物

- `packages/product-composition/official-standard-room-factory-v1.mjs` 是唯一的本片
  Server Factory。它从冻结官方 Command Center 数据经 Rules-owned 编成、升级、资源、
  roster、任务 Draft、几何、Mission Runtime V2 与 Reserve 内核生成 Room 初始权威状态。
- 默认两份 Standard 名单均精确为 `2000 Minerals`：Terran Armed Forces 为 `7` Unit，
  Kerrigan's Swarm 为 `8` Unit；包含战术卡、升级、Specialist 分配、槽位与 Vespene 审计。
- Hold Position + Gauntlet 绑定 `54×36` Battlefield、五个任务 Marker；`15/15` Unit
  以完整模型、底座和 loadout 进入 Reserve。
- `packages/client-domain/viewer-projection-v3.mjs` 新增 roster 与 Mission Runtime 专用
  投影。公共观察者能读取两边公开 roster，不能读取私有 roster；玩家只在 V2 权限裁剪
  后读取自己队伍的完整编成/升级汇总。动态 `player1/player2` 不再被 generic projector
  静默删除。

## 唯一聚焦验收

最终 factory→Room→observer/player projection 验收通过：

- `2000 + 2000 Minerals`
- `15` Unit，全部 `isInReserves=true`、`isOnField=false`
- Battlefield `54×36`，任务 Marker `5`
- observer public roster `player1=7`、`player2=8`
- player1 private roster `7` Unit，且看不到 player2 private roster
- Room 内 `officialMissionRuntimeState.engagementScale=Standard`
- `stateRevision=0`

本收敛轮第一遍已通过全部 roster 断言，只暴露 Mission Runtime 内部字段仍被 generic
投影裁剪；新增其显式顶层合同后第二遍通过。没有运行任何历史绿色门。

## 冻结身份

```text
factory receipt        8fe154e51d84bba42f9b3fbb4ff331ea61147585faa70a41f4cffc026ddf4029
Terran roster          800a01b4021322ebdb7f7858a535988eaf32ef94be576e1ee421c640d311cc2a
Kerrigan roster        30b3de35a66c24d6908fade8a935333523f42900fbc89c753b2ccbd9a5e29a9e
Mission Runtime V2     3a47195bbc90befcd15abb13a0135382cbf638430c3edccbff0c32e15d522dbe
Mission Effect IR      1637a10841f90a1dc5c10b2e7c830bbde6eeca8f54ed072749cbd22079e581f8
source snapshot        8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105
normalized dataset     b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067
```

## 边界与下一步

本片证明 2000 分军表能够作为可读的权威 Room 初态，不证明任意单位已经可完整执行全部
动作。旧 Reserve Deploy executor 仍只覆盖 Marine；`genericDeploymentExecutorReady=false`
继续显式指向 Slice 220。下一片交付任意入局单位的 Deploy/动作/能力通用路由、明确的
unsupported 队列，以及两份近 2000 军表的全程 LegalSpace dry-run。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none；本片没有 Agent 决策
- `harnessToolsCalled`: composition/upgrade/resource/roster/draft/geometry/mission/reserve kernels；Room create/read
- `uiTraceEvidence`: none；本片是产品 Room 网络投影，Web 用户旅程属于 Slice 225
- `agentDecisionEvidence`: none
- `memoryTraceEvidence`: Mission Runtime state 与 Reserve lifecycle 初态已进入 Room
- `trainingTraceCandidates`: none；全部 `trainingTruth=false`
- `rollbackOrDemotionRules`: roster 与 Mission Runtime 专用 projector 失败即回退本片，旧窄执行器不得冒充通用覆盖
- `userVisibleChecks`: observer 7/8 public roster、player1-only private roster、Standard Mission Runtime 均可读

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
