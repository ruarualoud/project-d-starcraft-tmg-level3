# Ticket 23 / Slice 216：Mission Effect IR 收口

日期：2026-09-14。状态：完成。Ticket 23 为 `2/15`。

## 交付

`packages/source-data/official-mission-effect-ir-v1.mjs` 将冻结官方 10 张任务 profile
编译为同一 typed IR：任务准备、回合开始触发、任务动作、同时计分、即时领先胜利、
回合上限和所需 Rules facts。编译器只接受上游已验证的 10-card bundle，并按当前
record identity 使用经审阅的语义模板，不宣称能从任意英文规则文本自动推导执行器。

IR 覆盖五个任务家族及 Standard/Skirmish 差异：Divide and Conquer 的四象限，
Frontlines 的夺控加分，Gather the Resources 的任务动作，Hold Position 的阵营亲和
计分，以及 Supply Drop 的随机激活、激活轮次价值和移除。

旧 `official_mission_scoring_profile_v1` Standard Hold Position 通过显式版本 Adapter
映射到新 IR。内容 hash 只作 lineage；兼容由语义版本与 Adapter 决定。

## 聚焦验证

只运行一次内联只读 smoke；结果：10 个 IR、5 Standard、5 Skirmish、5 个任务家族，
Supply/Gather/Divide 关键结构和旧 Adapter 全部通过。没有运行 Ticket 11、浏览器、
Skill、Provider 或全量门。IR 的 runtime binding 仍为 `0/10`，不越权声称可执行。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none; Rules/data slice
- `harnessToolsCalled`: frozen official source fixture, Mission Effect compiler, legacy Adapter
- `uiTraceEvidence`: none
- `agentDecisionEvidence`: none
- `memoryTraceEvidence`: none
- `trainingTraceCandidates`: none
- `rollbackOrDemotionRules`: retain legacy profile through explicit Adapter; unsupported versions isolate
- `userVisibleChecks`: 10 imported profiles remain distinct from 0/10 runtime-bound status

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
