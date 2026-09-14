# Ticket 23 / Slice 218：十张任务统一 Runtime 收口

日期：2026-09-14。状态：完成。Ticket 23 为 `4/15`，剩余 `11` 片。

## 交付

`packages/rule-atoms/official-standard-mission-runtime-v1.mjs` 现在由一个内部深模块驱动
两条显式版本路径：

- `createOfficialStandardMissionRuntimeV1` 保留旧五张 Standard 的 schema、动作名、事件名
  与 descriptor；
- `createOfficialMissionRuntimeV2` 覆盖五张 Standard 加五张 Skirmish，共 `10/10`；
- Divide and Conquer 按 Scale 选择精确世界尺寸：Standard `54×36`，Skirmish `36×36`，
  所有 Quarter 判断仍按完整圆形底座和完整 Unit，而不是中心点或屏幕像素；
- Supply Drop Skirmish 只在第 `2–4` 回合从 Marker `1/2/5` 的当前未激活集合请求
  Rules chance；Standard 保留第 `1–4` 回合 `1/2/3/4` 加第 5 回合 Marker 5；
- `enumerateLifecycle` 按 state/side/round/phase 返回任务候选以及 typed ChanceRequest，供
  后续 Authority Runtime 组合，不允许 UI 或模型自行制造任务后果；
- `packages/rule-atoms/official-mission-runtime-v2.mjs` 提供不带 Standard 历史命名的
  稳定导入入口。

内容 hash 继续只用于身份与 lineage；兼容由显式 V1/V2 版本和 Adapter 决定。旧
Hold Position 执行器、旧规则展示和 Replay 均未删除。

## 聚焦验证

唯一 10-card aggregate 在修正一次验证夹具事务边界后通过。首轮没有进入规则断言：
夹具试图修改 Runtime 返回的深冻结状态；第二轮按真实 Authority 事务先 clone 再写入
后续控制结果，全部通过：

- Standard/Skirmish Divide：各 `3 VP`；
- Standard/Skirmish Frontlines：各 `3 VP`；
- Standard/Skirmish Gather：各 `3 VP`，且两者都实际枚举并执行 Gather；
- Standard/Skirmish Hold Position：各 `3 VP`；
- Standard/Skirmish Supply Drop：Round 2 各 `2 VP` 并移除 cashout Marker；
- 十例均完成 start→可选 action→score→endgame，当前均为 continue；
- V2 runtime hash：`3a47195bbc90befcd15abb13a0135382cbf638430c3edccbff0c32e15d522dbe`；
- 历史 Standard V1 runtime hash 仍为
  `0baae3ed2eaffa8b23802825f62d7c89d69ffaec2e871199d193c4cbf39eb079`。

没有运行已绿色全量门、Provider、网络或来源刷新。

## 产品边界

本片证明 10 张任务的规则子 Runtime 和组合 seam，不证明 Web Room 已经可玩 10 张任务。
现有 Authority Runtime 还需要把 mission candidate 的 Atom lineage、Chance receipt 和
Preview/Apply 接入同一个 LegalSpace；随后才能由 2000 分 Room/Web 验收。这个差异保持
显式，避免再次把“数据已导入”或“子模块可执行”误报成产品端到端完成。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none; exact Rules only
- `harnessToolsCalled`: Mission Effect IR, Mission Runtime V2, EngagementGraph V2, SupplyLossLedger
- `uiTraceEvidence`: none
- `agentDecisionEvidence`: none; lifecycle candidates are Rules-owned ActionSpace
- `memoryTraceEvidence`: scale-bound start/Gather/scoring/endgame histories
- `trainingTraceCandidates`: all transitions remain `trainingTruth=false`
- `rollbackOrDemotionRules`: Standard V1 remains addressable with identical runtime hash
- `userVisibleChecks`: typed lifecycle candidates, chance requests, score and terminal events

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
