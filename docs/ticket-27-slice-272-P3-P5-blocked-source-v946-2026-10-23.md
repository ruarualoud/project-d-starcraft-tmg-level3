# T27 / S272 — v946：能力缺失结论的来源复核

## 结论与范围

已修复一个已复现的产品职责缺口：调查者提交 `blocked` 时，原流程直接把能力缺失解释交给战略作者；只有 `answered` 才接受独立来源核对。错误的“工具没有这个能力”因此可能被继续沿用。

本次不改军表、Plan、规则或实验结果，不将未知自动改成通过；不恢复 A、不启动对局。T27 5/6、T23 33/36，剩余 S272/S248/S249/S250 四片；正式 Plan 0/6、新对局 0/12。局部检查通过不等于真实 Teach 收敛。

## 真实反例：不是这次输入漏传

B 原工作流 `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，r19：

- 调查者：`product:after-teach:r19:subject-v1:investigation`。
- 实际请求：`46c1cbe4ca5b2270841c50934d3a8819798fc4d7b6da55631db26a2e8706be41`。
- 实际原回复：`6ee1aae00d7fae2845739310c7ced35cc00289387c816127a631145dd4d4e9a2`。
- 保存结论：`08c9adc66eb1f70d6a7b9f0d2428b7b6a71a68e830b98795aca40ebfa04c0e4b`。
- 后继作者沿用能力缺失：`90510d77fc1b00e95ec59d529ee05ec05c115f5f3f7d5afb18c72bca16e95047`。

证据 940 的工具合同原件 `2a76205ae51e63dc2737e8f3d21c36b9fde0a007716e38f912af1403c7262b2e` 明确含：

1. `/operations/7/specContract/capabilityContracts/firstRoundInitialization`：共享首轮初始化，可保留军表、地图、任务及预备队，进入原生首轮流程。
2. `/operations/4/queryContracts/mission_marker_control`：`domain` 为 `optional_candidate`，相关参数为可选，不是每次必有已有 domain 才能查询。

实际请求 `promptNodes[17].results[33]` 已交付完整首轮初始化对象。因此本次不能再归因于漏传，也不能接受“能力不存在”的解释。另一方面，这些能力本身不证明任意未来回合最早到达或必得 VP；具体条件性路线仍需实际论证。

## 修改后的职责顺序

`调查者 blocked → 精确原件来源核对 → 原调查者修正 / 经核实的阻塞 → 战略作者`

- `strategy_required` 仍是战略选择的控制返回，不混成事实回答。
- `blocked` 新增同一调查者、同一作用域、同一不可变结果绑定的两项来源核对：
  - `source_fidelity`：真实能力、可选/必选参数、初始化路径、原生失败；未读、路径读错、尚未初始化不等于能力缺失。
  - `question_coverage`：该限制是否确实妨碍被授权的精确问题；不能将条件性局部可行性扩大成整场历史或全局最优。
- 未核对、错原件或错作用域，不向作者返回已核实阻塞。
- 驳回复用现有来源修订通道：准确反馈交原事实调查者，保留原结论、有效证据、轮次和费用。
- 核实属实仍为 `blocked`，`acceptedForStrategy=false`，不批准事实答案或 Plan。
- 公共 Run 的普通交接与分域联合交接共用这一门，不新增实验旁路。
- 不回写已经交接的历史工作；当前后继的新调查使用新规则。旧 r19 错误解释和最终审核记录保留。

## 单步故障注入与验证

复现脚本：`scripts/debug-slice272-blocked-source-v946.mjs`。读取真实 r19，工作流、注入审核、恢复均在内存；Provider=0、Native=0、生产写=0。

| 阶段 | 证据 | 结果 |
| --- | --- | --- |
| 修改前 RED | `build/slice272-v946-blocked-source-red.json` | 复现 blocked 跳过独立来源核对 |
| 首次修改后 | `build/slice272-v946-blocked-source-green.json` | 四项通过；最后一项夹具漏 `conditions`，真实发布器拒绝该不完整回执 |
| 只补剩余项 | `build/slice272-v946-blocked-source-remaining-green.json` | 补齐正常回执外围字段后，准确反馈交回事实调查者通过；未重跑前四项 |

五项实际证明：创建负面结论审核、公共 Run 等待、核实阻塞仍不批准、错原件不复用、驳回准确返回且不改 Plan/原结论。首次验证观察器超时并重置 REPL，但子进程已落盘退出；读取落盘结果，未重复执行测试命令。未运行无关全量门。

## 真实恢复边界

旧 PID3533 已接收安全停止、写入 `finished/stopRequested=true` 后退出。检查到 B event9159/r19，0 在途请求：四域审核完成，反制与计划延续仍在多轮读取。

同目录、同产品入口恢复：PID28061，日志 `build/slice272-v946-blocked-source-live-1792741723547.log`。不重建房间、不重算实验、不重置旧账、未再次消费 v941 的单次作者修订授权。

后续验收：六域完成后由 v945 唯一联合作者接收；出现新的能力缺失声明时检查 v946 的来源核对、自动事实修订及真实语义结果。尚不能声明路线问题已解决、Plan 已收敛或策略已改善。

### 真实续行追加：event9182/r19

六域审核现已返回，自动创建五个 `review-resolution:r19:*`：组件选择、地图到达、战斗损失、对手反制、计划延续；计分时机域无需本轮修订。这是五个待处理域，不是五张新军表或五次重新生成。尚无新草案提交。

- 计划延续审核 `02089381b727d86f10080e36168a9c394055bed2ed6611d265015a142fd00501` 已认可合法 2000/2000、12 项升级、已有 scoreRoute/lossResourceBudget/deploymentConcept，以及关闭的可选替换比较。v943 当前声明/关闭上下文已有真实消费证据。
- 它明确发现公开摘要仍为旧 1980/2000、11 项升级，且把已经声明的章节列成未定。此项需作者修订，不能由 Host 改原文。
- 路线到达与任务控点条件仍需证据；不能将“存在初始化工具”当这些结论已证明。
- 反制审核 `6fe2808bd21f915974eb9ebac6cf0e511ff9124be0a1172acca741062c56ef44` 认可真实 Kerrigan/Omega Worm 能力，但要求具体反制单位/行动/时机。它同时说未定义损失上限，与延续审核已读的当前 lossResourceBudget 不一致；这是待联合作者核对的审核争议，不把所有审核文字当事实。

本次恢复后完成的最后两次审核请求：`825a29fc…`、`acb945cb…`，原回复 `9a1819da…`、`cf77fb5a…`；输入 324,561、输出 5,961，合计 **330,522 units**，Provider 累计 33.028 秒。此为这两次调用，不是整个流程总账、墙钟时间或供应商账单；全部旧账保留。其后新调查费用继续由原产品账本记录。

当前真实结论：既有部分错误前提已在最终审核被纠正；v946 的新能力阻塞核对仍待后继实际触发，不能以注入验证替代真实收敛。

## 修改文件

- `packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs`：blocked 审核构造、绑定和评估，复用已有修订链。
- `packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs`：普通/联合交接在能力声明核对前等待。
- `scripts/debug-slice272-blocked-source-v946.mjs`：真实反例和定点异常注入。
- 当前入口、根 TASKS/PROJECT_MEMORY：恢复点、已验证范围与未完成项。
