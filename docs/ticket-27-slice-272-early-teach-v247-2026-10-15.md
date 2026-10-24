# S272 v247：部分军表的提前 Teach 与独立 Plan 修订

## 本轮交付

复用现有 `runRosterTeachFrameworkSessionV1`（八维方法、议题、原生查询、调查、汇总），把它接进迭代选型的**下一次决策之前**。合法的部分军表和初步 Plan 即可进入，不再必须先达到 2000 分。

流程是：当前合法草案 → 独立 Teach 调查 → 保存带条件与未解项的反馈 → 选型 Agent 查询、保留或修订军表/Plan。调查完成不是战略通过；它不会把未知当成已证实，也不会把所有不确定性变成禁止继续选型的理由。

发现并补齐了另一个真实工具缺口：以前部分军表阶段不能只改 Plan，只能改军表时附带改 Plan，或者到足额后 `finish`。新 v12 结构化 `revise_plan` 只写 Plan，保留当前 Builder 合法军表；`propose` 仍允许两者共同改变。

正式 2000 分、地图证据、进场审核和最终来源审核门没有放宽。没有新规则器，没有把本地夹具作为真实模型策略成绩。

## 验证证据

使用同一生产 `createRosterPlanningProductModuleV1` 和 `iterativeDraft.resume`，冻结官方数据、地图及当前 B 的 1020 分军表；只把 Provider 换成明确标注的本地输出夹具。原 B r29 文件未写，测试独立存储不建正式对局。

有效 RED：`early-teach-v247-ui2qi0/result.json`。旧代码直接进入选型，没有 Teach；`revise_plan` 被拒绝为格式错误。

修改后一次主验证：`early-teach-v247-HFNJvn/result.json`：

1. 方法学习 → 议题 → 调查 → 汇总，在下一次选型前完成；军表仍为 1020 分。
2. 未解的草案反馈交回选型，没有被冒充最终接受。
3. 同一草案第二次决策复用已完成 Teach，无再次方法/议题/汇总调用。
4. `revise_plan` 真正改变 `openingSequence`，完整 `currentCandidate` 不变。

这四项当次通过，不重跑。原生查询断言当次读错了提示投影位置（完整回执由归档引用承载），不是原生执行失败。定点改断言后，仅用 `--inspect-saved-evidence` 读取同一保存回执，证明：

- `integer_sum` 实际返回 `total=3`，完整原生回执散列匹配；这是模型声明输入的算术，不是得分预测或策略证明。
- 零变更证明引用了该回执，`sourceStateMutationCount=0`。
- `saved-native-evidence-check.json` 通过；0 新原生执行、0 新模型调用。

首次复现曾被外部 55 秒观察上限停止，保留在 `early-teach-v247-uMzOa2`，不计通过。之后使用同一后台句柄等到真实结束。没有因观察超时重复生产请求。

### 失败记账的定点补充

检查新 Adapter 时发现其遗漏 `round_failed.failedOutputRecord` 和失败用量，还把 `paidProviderCall:null` 转为 false。另一个具体 RED→一次 GREEN 已修：保留失败原文、已知用量、未知费用三态；不能把未知收费写成零。证据：

- `draft-failure-ledger-v247-fail.json`
- `draft-failure-ledger-v247-pass.json`

上述证据均位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/`。本轮 **0 Provider 调用、0 新费用、0 正式房间动作**。不能把合并后的证据描述成一条从未失败过的全绿运行。

## Diff 摘要

- 新 `iterative-roster-draft-teach-v1.mjs`：现有 Teach 的草案 Adapter；按草案保留检查点、已付费输出、派发状态、用量、失败和公开反馈；相同草案复用；未确认的派发不自动重发。
- `iterative-roster-product-port-v1.mjs`：实际装配同一场景实验室、Skill 路由和地图/任务证据。
- `iterative-roster-plan-session-v1.mjs`：无待结算请求时才升级 v12；决策前运行草案调查；支持结构化 Plan-only 修改；暂停请求仍保留。
- `iterative-roster-flash-model-port-v1.mjs`：v12 的 `revise_plan` 闭合合同、草案反馈/历史投影；旧付费合同不改。
- `iterative-roster-capabilities-v1.mjs`：草案 Teach 证据也可通过现有检索工具读取。
- 两个仅针对实际缺口的验证脚本；没有重跑 v246 或其他历史绿门。

## 明确未完成的部分

1. **动态推进监督**尚未接好：当前内部调查/纠错仍有历史固定轮数。要按相关新证据、前置条件、实质修订和重复失败区分推进，不能简单无限重试。
2. **最终来源 High 回流到选型**仍待：早期已可改表，但晚期来源审核发现需要重选军表的问题，还应进入同一纠错/重选分流，不能只做文本修补。A 保持固定表且 Plan 同等审视。
3. **真实 A/B 恢复与生产验收**尚未开始：A 新 Plan3 未接受，B 原 r29 / 1020 分 / `requires_reconciliation` 不变。不能直接重启旧 runner 绕过停点。
4. 本地完整定点运行约 **245.9 秒**，包括产品/场景初始化、原生查询、旧大记录的投影与保存，模型耗时为零。这不是实际对局动作延迟，也尚不能证明新增开销的分段来源。先保正确性，后续需记录草案快照与上下文处理耗时；不宣称性能已达标。

主线保持 T27/S272 5/6、T23 33/36，剩 272/248/249/250 共 4 片，完整实验 0/12，四局停止。长期目标未完成。

## Harness / Teach 记录

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`
- 路由：现有 `strategy_inquiry_v2` / `fact_probe` / `iterative_roster_decision`。
- 工具：同一 Builder、场景实验室的只读算术、草案 Plan 修改；无规则和房间变更。
- 决策/记忆：公开调查、取舍、未解项、草案版本与修改结果保留；没有保存私有思维链。
- `uiTraceEvidence: none`：本轮是同产品接口验证，不冒称浏览器验收。
- `trainingTraceCandidates: not_promoted`；`trainingTruth:false`。
- 回退条件：草案绑定错位、重复付费、假证据、军表被 Plan-only 修改时不得用于正式生成；旧付费记录始终保留原合同。
