# T27 / S272：纠错与战略决策的职责交接（v797–798）

## 目标与边界

继续新 P0–P6，不恢复旧实验。当前 T27 5/6、T23 33/36，余 S272/S248/S249/S250 四片；最终 Plan 0/6、对局 0/12。
这次解决 P1/P2/P4/P5 的职责交接，不把协议通过记为策略通过。

## 实际故障

原产品 Run `slice272-product-generation-v645-lqMWaS` 在 e5652 / r3 停止。
真实请求 `60b0473e02565b68d9e3855276b2dc1c01099cd4779f362d7494393df8dacc0f`，
回复 `18f4ef83f3fa633fb178610e86ab052b692186f05cf81f7824e7b32b66138ec3`。
模型已经使用局部修改接口，却把“依据新证据是否保留当前方案”继续列为 `author_decision`，要求战略所有者作决定。

旧接口只有“尚待作者决定”和“当前 Plan 已有声明”，没有“作者在本回合根据新证据决定保留”的表达。
实验角色已有交回作者的出口，局部纠错没有：于是职责问题不断进入格式／语义纠错。
同时，旧回复错误地引用了未采用的 2000 分候选；正式表仍为 1490、余 510。交接不得继承这条错误为事实。

## 实现

1. `roster-workflow-author-handoff-v1.mjs` 是唯一交接判据与状态转换。
   只接受实际保存回复经原 Schema/补片投影校验后，仅剩 `author_choice_requires_author_action` 的情况；有其它错误、事实未知、在途请求或已经交接过，均不转换。
2. 同一任务保存 `authorDecisionHandoff`：原请求／回复、原 7 问题、被拒方案、原错误、原计数和旧恢复记录均保留。
   新的作者阶段重新计自己的准备与格式次数，旧阶段没有被清零或被判成功。每任务只允许一次职责交接。
3. 新作者输入明确“你就是战略作者”；当前正式军表、完整 Plan、已读证据仍保留。
   大段历史背景仍由同一按需读取工具访问。旧回复是被拒提案，不是事实权威。
4. 策略输出增加仅限作者的 `decided_here`：本次明确决定保留／修改，必须给出具体理由和证据。
   原 `authored_choice` 仍必须引用当前 Plan；事实未知仍保持 `necessary_fact`；审核角色不能使用作者的新增分类。
5. 每个原问题必须原文保留一次。改意图仍须实际结构化 mutation；保留不需要无意义改表。
   独立来源、策略、预算审核不变；`decided_here` 不是事实通过、Plan 已应用或最终验收。
6. 实时执行器和 Web/App 产品冷恢复共用这个接口。不是实验脚本另行修状态、补模型字段或伪造回执。

## 一次定点红绿验证

脚本：`scripts/verify-slice272-author-handoff-v797.mjs`，读取实际 e5652，在内存 Store 中运行同一工作流与执行器。

- RED：旧代码报 `ROSTER_WORKFLOW_COMMAND_UNKNOWN: handoff_strategy_author`。
- 修复后 GREEN：一次执行通过；未重跑 v796 或其它已通过门禁。
- 验证了交接后冷恢复、原 7 问题／旧调用／错误保留、不能重复交接、不能带其它错误绕过、作者和审核分类权限隔离、正式军表未改、最终验收未授予。
- 0 真实 Provider、0 Native 调用、0 生产状态写。模拟作者选择只证明结构可用，不证明战略质量。

## 真实续行

使用原 Web/App 产品入口恢复原 Run，不重建房间，不改军表，不重新做实验测量。
PID 40070；日志 `build/slice272-product-generation-v797-author-handoff.log`。
启动前 r3 / w557、0 在途。后续应核对实际请求、作者选择、独立审核与预算，而不能凭进程启动判通过。

## Harness 记录

- harnessLoopUsed：是；具体故障 → 同接口红灯 → 共享状态与协议修复 → 一次绿灯 → 原产品真实续行。
- targetGames：StarCraft TMG。
- promptPackRoutes：P2 strategy_decision / P5 semantic repair → strategy_author_handoff。
- harnessToolsCalled：同 workflow dispatch/run_ready、证据读取、产品 `/workflows/:id/run`。
- uiTraceEvidence：本项验证服务流程，未声称 UI 验收。
- agentDecisionEvidence：旧真实回复见上；新真实结果待记录。
- memoryTraceEvidence：持久 authorDecisionHandoff、原 calls/reads/correction/failureHistory 不删除。
- trainingTraceCandidates：只有后续经独立审核的显式选择及其条件可作候选，当前测试不晋升 Skill。
- rollbackOrDemotionRules：新作者仍可失败；不再次自动交接，不自动批准当前事实或策略。最终预算目标保持 2000。
- userVisibleChecks：7 问题追踪、正式 1490/余 510、同产品链路、不重启对局。

## v797 的真实结果：职责成功移交，但不是最终验收

实际请求 `e7efb66611f64dca0dc38f1d11a6a1ce010e0538d918185d5d2d43a78dbfd964`，
回复 `74d5975638eb7471eddd5cb9267c2d994eba29e5baf7ee77746238a35d190832`。

- Flash 一次返回：85837 输入 + 1659 输出 = **87496 units**，Provider 11.067 秒，不是整个产品墙钟耗时。费用回执没有人民币金额，不估造实际费用；原账保留。
- 实际使用 `decided_here`，明确决定保留 `componentPurposes/2` 与 `counterResponses/0,2`，说明 Goliath / Marine 生存比较、Ares / 导弹替换比较和条件边界；没有再要求“别的作者”做决定。
- 7 个原问题保留，结果 `evidence_ready`、`submitted_for_review`。没有编辑正式军表，未授予最终验收。
- **仍有真实错误**：模型继续把 472 的未采用 2000 候选认作正式表。真实输入的 currentArmyAuthority 和 draft.requestedEndState 正确地包含 1490/余510；但当前 Plan 的 publicSummaryText 自身已有错误的“恰好2000”文字，模型重复了它。不是当前 Builder 数值漏传。应由原独立审核／结构化修订纠正，不能把错误文字当权威或手改模型原件。
- 产品预算门实际仍报 `requested_mineral_target_unmet`，未错误发布。

## v798：继续追踪发现并修复返回链的另一半

v797 随后停在 e5663：`ROSTER_DECISION_NO_READY_WORK`。PID40070 已退出，0 在途。
现有 `roster-workflow-frontier-return-v1.mjs` 只识别“作者先启动子调查、再收到该子调查回复”的返回；没有“当前作者直接依据已到手事实选择保留”的返回。因此原事实任务仍 held，没有负责人继续汇总／审核。

修复内容：

- 在共享 graph 接口统一识别 `direct_owner` 和 `child_response`，返回构造器与 enqueue 校验使用同一判断。
- 直接返回只沿已登记的 `investigationFrontierOf` / `investigationOwnerId`，交回原问题和真实批次来源；不按长 ID 文本猜父子关系。
- 保留实际作者结果、旧错误、其它未解分支。作者解释不是事实通过；原问题还要自己汇总并走来源审核。
- 返回任务 ID 绑定实际决定，冷恢复去重；没有补一次纠错额度，没有重买 v797 的决定，没有改军表或假装旧工具成功。

新具体门：`scripts/verify-slice272-direct-author-return-v798.mjs`。
实际 e5663 RED（直接作者没有返回工作）→ 修复后一次 GREEN（原问题解 held、同源父子校验、子调查兼容、冷恢复无重复、未改军表和最终状态）。0 真实 Provider / Native / 生产写；未重跑 v797 及其它已过门。

PID47570 已从同原 Run 载入 v798，日志 `build/slice272-product-generation-v798-direct-author-return.log`。
启动点仍 r3 / e5663。下一观察真正上层汇总与审核，不把该进程启动记为收敛。

v798 实际已推进到 **e5677 / w558**：原问题负责人通过正式返回任务生成真实回复
`98a459617ea6cd40820661967c5aab24d4997900ce012adf08080c9e038e3a89`，
选择 `conclude/answered`，逐项报告同场景的 Goliath 与 Marine 生存估计，明确它只是单目标条件实验，不证明整体组合、到达或得分；也明确战略作者的保留决定不是规则事实。
这证明真实父任务已拿回控制，不只是离线调度门通过。
它引用了本角色尚未实际读取的原件，因此既有系统自动补读后要求确认（`confirmation_after_evidence_reads`），没有直接放行。
该次 79127 输入 + 861 输出 = 79988 units、Provider 11.214 秒；截至此步本轮两次付费请求合计 167484 units，后续续行费用继续追加，非最终总账。

最新 **e5694 / w562 / r3**：补读后的真实确认回复
`fd45aca459eb06b306a0b336d9353184fe17fac78590bf6c9c992d3c684481a4` 已保存，
原事实负责人 `evidence_ready`，产品自动排入三条具体来源主张审核和一个依赖汇总审核。
新增确认 133364 units / 9.265 秒；本轮截至 e5694 三次已完成调用 **300848 units**，后续审核继续记账。
仍在运行，无最终验收；正式军表未改。故这次已真实走通“纠错→作者选择→原问题负责人→补读确认→独立审核入队”，不是只停在进程启动。

## 本轮 diff 摘要

- 新增 `roster-workflow-author-handoff-v1.mjs`：类型化纠错→作者交接、作者本次决定约束。
- 调整 `roster-review-data-questions-v1.mjs`、`roster-workflow-read-role-v1.mjs`、`roster-decision-role-instructions-v1.mjs`、`roster-workflow-correction-context-v1.mjs`：作者协议、持久阶段、问题保全、分块输入与明确角色。
- 调整 `roster-decision-workflow-v1.mjs`、`roster-workflow-graph-v1.mjs`、`roster-workflow-frontier-return-v1.mjs`：交接命令、共享直接／子调查返回关系、持久去重。
- 调整产品 `roster-decision-workspace-run-v1.mjs`、`roster-decision-product-journey-v1.mjs`：Web/App 同入口冷恢复。
- 新增两个具体 bug 的定点复现脚本与本报告；更新 CURRENT_WORK、根 TASKS/PROJECT_MEMORY。未提交 Git，未修改其它项目。
