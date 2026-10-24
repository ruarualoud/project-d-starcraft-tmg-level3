# T27 / S272 — v203–v204：局部引用纠错与仅汇总恢复

日期：2026-10-15 CST。上轮 v201–v202 是有效进展，本轮在同一工作树继续修复，没有重开原真实试验。

## 已交付

### 1. 引用错误带回同一回执的纠错信息

v200 的控点数值引用写成 `sourceReceipt.result.markerResults[1].supplyTotals.player1`；实际结果处于 `sourceReceipt.queryReceipt.result`。此前只有 unknown，缺少能让下一次汇总局部修复的结构化反馈。

现在数值限定器返回 `pathRepair`：

- 原始 receiptRef/path 原样保留。
- 指明最长成功读取的路径、缺失的下一段，以及该对象实际字段/子对象字段名。
- 本例准确定位到 `sourceReceipt` 下缺 `result`，并显示已有 `queryReceipt` 且其子字段含 `result`。
- 数值仍 unknown；不按同名字段猜值、不替模型选引用，不把别的局面回执挪来支持此结论。
- 无需重新执行规则查询。未知回执不会借用另一份回执的结构。

后续汇总把这些具体错误放入 `numeric_citation_repair_context`，与当前完整证据一同交给模型。在同一次汇总里修引用，不新开一个付费调查循环。

### 2. 完成 Teach 可以只重新汇总

现有工作台方法 `teachPlanFramework` 增加显式请求：

```json
{
  "expectedPlanHash": "当前 Plan hash",
  "resynthesizeSavedEvidence": true
}
```

同一 launcher 新增 `--resynthesize`，不是另起一套模型调用/收费链路。

生命周期：

1. 仅允许当前 Plan 的已完成调查、现有未解回答，且没有待执行调查/选定查询恢复；不允许与其他调查恢复模式混用。
2. 标记 `synthesisReview`，保留旧 raw/qualified synthesis、调查、回执和全部旧账，不先删旧回答。
3. 进入仅汇总路径，跳过场景重建、证据查询和查询纠错。完整当前证据通过既有汇总角色投影交付。
4. 最多一次新的汇总调用；重复入口不能重置次数。格式错误保留旧回答，不另开三轮循环。
5. 已保存的付费回复可按完全相同的上下文直接复用。若真实网络结果不明，仍走现有工作台 dispatch 对账/授权机制；不将观察超时视作“没请求过”。
6. 新回复通过结构/语义限定后，才把旧回复移入 synthesisHistory，并设置新结果；不自动改 Plan 或启动对局。

已移除仅汇总路径中未被使用的完整历史查询索引重建。正常调查路径不改变；规则事实、源数据和房间变更权不下放给模型。

## 定点验证

只新增复现本次两个具体缺口的脚本，没有运行旧绿、全量构建或地图/对局测试。

| 门 | 证据与结果 |
| --- | --- |
| v203 引用反馈 | 使用实际 v200 保存回复 RED→修源后唯一 GREEN；正确指出缺层，假回执无借用结构，原 unresolved 不变。 |
| v204 仅汇总恢复 | 原代码 RED；首次修后运行被测试脚本55秒总时限终止，无通过结论；修掉无用历史索引重建后唯一最终运行 GREEN。 |
| v204 实际覆盖 | 用真实 B 的保存状态和模拟 Provider：一次汇总、零 Native 查询；付费回复保存后中断→精确复用且零重发；畸形回复不会重置一次调用额度，旧回答不丢。 |
| 两处接线语法 | workspace service 与 launcher 各一次 `node --check` 通过。没有宣称完整 HTTP/真实 Provider 验收已完成。 |

v204 最终进程 90708，exit0；多情形总耗时72.422秒，第一种单次汇总情形约17.150秒。这是读取/投影真实大存档并模拟多个恢复情形的**离线门禁时间**，不是带模型的对局性能。

该门总执行三次：原始 RED、55秒观察期限结束、来源修正后的最终 GREEN；没有第四次。失败和中间结果均如实保留。v203 GREEN 没有重复执行。

证据均在 `build/ticket-23-three-arm-performance-baseline-20261010-v1/`：

- `common-v203-citation-repair-red.private.json`
- `common-v203-citation-repair-green.private.json`
- `common-v204-synthesis-only-red.private.json`
- 首次修后进程88939由脚本超时终止（SIGTERM），未写完成回执，不存在可当作通过的 green 文件。
- `common-v204-synthesis-only-final.private.json`：3项行为检查通过；scriptedProviderCalls=3，真实ProviderCalls=0，NativeCalls=0，sourceDraftWrites=0。

## 尚未真实验证 / 待用户选择

v200 的一次真实独立调查授权已执行完。本轮已询问：是否允许**仅 B 一次真实 Flash 汇总复核**，复用现有证据、不再调查/规则查询、不启动对局、旧账保留。

在明确回答前不启动。没有新的 Provider 计费；B 仍累计255calls/35,660,214units、Plan19、1未解；A 仍Plan9/1未解。不能以离线模拟结果声称真实模型已解决问题。

获准后使用原入口一次，先确认目标进度文件不存在且原 v200 为终态；绝不因观察器超时重复提交：

```text
node scripts/run-slice272-current-plan-teach-v149.mjs \
  build/ticket-23-three-arm-performance-baseline-20261010-v1 B \
  build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v200-B-teach-fact-probe-progress.private.json \
  --resynthesize --run-version=205
```

上述路径展示为 worktree 相对路径；正式运行保持此前的绝对 base，避免服务进程工作目录差异。目标报告：`common-v205-B-teach-synthesis-review-progress.private.json`。本轮**尚未创建/运行 v205**。

后续实际交付物：

1. 一次真实新汇总的原回答、引用限定、token/费用/终态记录；若依然未解，明确剩余具体条件，不再加无界循环。
2. A 的真实未解事实补齐及 A/B Plan 准出（尚未完成）。
3. 工具在 Plan/实战/执行消费者的同源核对与四组同版续跑；不重建房间。
4. 完整对局/复盘和其余目标按原排期继续。

进度：T27 **5/6**、T23 **33/36**；主线剩272/248/249/250共**4片**，完整验收对局**0/12**。其余18经典图仍按用户优先级后置，完整目标未缩减。

## Diff 摘要

- `roster-teach-framework-v1.mjs`：同源数值路径反馈；统一提取汇总/完成逻辑；只汇总跳过查询；原已付费回复精确复用；一次调用额度；具体引用反馈入新汇总。
- `roster-teach-fact-probe-v1.mjs`：显式只汇总状态入口/状态判断，不改原一次事实调查窗口。
- `roster-planning-workspace-service-v1.mjs`：现有 API 接线、同 Plan/互斥/未对账请求检查、避免 completed 快速返回吞掉显式复核。
- `run-slice272-current-plan-teach-v149.mjs`：现有启动/观察器支持 `--resynthesize`，保留原账和句柄语义。
- 两个新脚本仅复现具体引用反馈和仅汇总恢复缺口。
- 更新本报告、CURRENT_WORK、根 TASKS/PROJECT_MEMORY；没有提交、删除、安装、子代理、数据刷新。

## Harness / 离线 Teach 边界

- harnessLoopUsed: true
- targetGames: starcraft-tmg / 原冻结数据
- promptPackRoutes: teach_framework_synthesis；本轮未调用真实模型
- harnessToolsCalled: 原存档只读、共享限定器/汇总角色/状态恢复；规则查询为禁止调用的验证桩
- uiTraceEvidence: 无新增 UI 操作/截图，不宣称前端验收
- agentDecisionEvidence: v200 公开回答保留；模拟返回未改变其策略判定
- memoryTraceEvidence: 旧 synthesis/history 与全部调查记录保留
- trainingTraceCandidates: 无晋级，trainingTruth=false
- rollbackOrDemotionRules: 任意重放查询、跨回执补数、旧回复丢失或重复入口重置计费额度，均不得准出
- userVisibleChecks: 引用错误可局部定位、已完成调查无需从头重跑；真实效果等待授权后验证
