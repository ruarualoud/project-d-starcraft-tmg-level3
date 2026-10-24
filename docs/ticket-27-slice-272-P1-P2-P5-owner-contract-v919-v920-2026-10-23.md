# T27/S272：统一事实回交与 Plan-only 提交后的负责人（v919–920）

## 产物和范围

本轮针对 P1/P2/P5 的实际失败修复三个生产文件，不是另外一个 Ticket。正式 Plan 仍 0/6，对局 0/12；T27 5/6、T23 33/36，剩 S272/S248/S249/S250。

| 实际缺陷 | 来源修正 | 实证边界 |
|---|---|---|
| B 的 source_interpretation_challenge 没有进入已有作者职责隔离 | 四种已定义 control return 使用同一来源/负责人检查，明确旧角色指令只是历史 | 实际 B 请求经生产 projector，正常/八类错误身份注入；未证明模型不再误判 |
| 作者分块器把最新 batchFacts/Native 补充也延期，且原地修改原请求目录 | 当前事实、原生测量解释及当前 Plan 保留；背景原文归档可查询；目录使用独立副本 | 原请求不变、每个延期指针可解析；不重写任何付费回复 |
| B r8 Plan-only 直接提交后 NO_READY_WORK | 负责人续接同时允许 frontier 本人和显式后继提交；原版本/军表/事实检查不变 | 实际 r8 checkpoint 经核心新建一次 reader，冷恢复不重复，旧任务不复活 |

## v919：正常合同与异常合同

真实请求：`cca0424f73fa351e41f9fda7ed31816f8a04ffd9bf3a363f49907fbe12b8adb1`。

原输入确实已经包含正确的比较方向，因此不能说模型没收到新事实。问题在于回交种类处理不一致：只有 `author_decision_return` 被识别为新的作者职责，`source_interpretation_challenge` 仍混入旧事实角色的“不可选择/不可改表”等任务指令。修复不预先判断事实角色或审核者谁正确。

四种来源均按已有生成器的合同接入：

1. `author_decision_return` / `deterministic_task_router`。
2. `source_interpretation_challenge` / `deterministic_material_router`。
3. `work_order_capability_return` / `deterministic_compiler_router`。
4. `work_order_delegation_return` / `deterministic_compiler_router`。

共同要求：已解析 evidence 身份与当前 frontier 的 owner 完全一致、版本正确、不得声称事实/Plan 已批准。后面三类也不能自带 Native 重试权限；未知 kind/origin 不会被接受。

最新返回事实仍是待核对证据，当前 Plan 仍是待修改草案，两者原文不变。旧角色禁止事项移入历史，不删除原问题或扩大私有实验范围。延期背景目录可以按精确指针读取；不是把没读的资料当已读。此处没有新增模型审核轮次，没有手工指定军表取舍。

验证：`scripts/debug-slice272-owner-handoff-v919.mjs`。

- RED 复现真实 source dispute 未被识别。
- 第一次修复验证通过职责识别，随后发现原请求目录被分块器原地修改，停止该门并修源头复制行为。
- 仅继承已过第一项，补验尚未通过部分；最终 GREEN。
- 包含四类正常、八类错误角色/来源/负责人/权限，以及当前事实保留、历史精确可读、普通非回交请求不变。
- 该保存请求序列化长度 1,032,982 → 922,635 字符，少 110,347。仅输入表示指标，不是模型实测 Token/时延或策略质量提升。

证据：`build/slice272-owner-handoff-v919-red.json`、`...-green.json`（第一次发现的目录变异）、`...-green2.json`（最终通过）。零 Provider/Native/生产状态写。

## v920：实际系统停止与自动恢复

B171 不是网络断连：日志明确 `ROSTER_DECISION_NO_READY_WORK`，退出时 r8/event6843，pending=0。A107 经 TERM 停在 r3/event6612，pending=0。

原续接器使用严格 `isAncestor(frontier, writer)`，它不包含节点自己。因此上一轮嵌套提交可以继续，实际 r8 由 frontier 本人提交却被漏掉。现在只把这条负责人关系改为“本人或显式后继”，没有全局放松版本校验或把所有 superseded 任务当成有效。

验证：`scripts/debug-slice272-direct-plan-return-v920.mjs`，实际 r8 RED → 一次 GREEN。旧 r7 嵌套门不重跑。新 reader 接收当前 r8，原问题、sourceReview、failedSourceClaim、rejectedConclusion、历史结果和计数保留；没有批准错误 Plan。冷恢复幂等，无关 peer 不得借权限。

观察接口在 10 秒时超时并重置，但原测试已正常完成；随后只读到 `build/slice272-direct-plan-return-v920-green.json` 的真实通过结果，且对应进程已退出，没有重新执行测试命令。

## 原产品流程续行

原目录不变，不重新生成军表、不重建房间、不清旧账。

- A PID15382：`build/slice272-product-generation-v645-hsxEYu`；日志 `build/slice272-v919-v920-owner-fixed-1792710784636.log`。
- B PID15403：`build/slice272-product-generation-v645-8aBuEV`；日志 `build/slice272-v919-v920-owner-editable-1792710785050.log`。

后继真实模型是否正确消费新回交、是否修正 B 的方向及未测项、是否完成 A 的生存比较，仍须从实际事件证明。本轮定点合同测试不能替代 P4 策略改善或 P6 正式产物。

实际续行已观察：B 事件6844 `plan_revision_returned_to_experiment` 将原问题交给 r8 新 reader，明确 historyReset/providerReplayed/nativeReplayed/planApproved 均 false；到6860该 reader 正在实际运行。A到6614/r3仍在现有场景输入纠错，两进程15382/15403均存活。此证据证明恢复接线真正执行，不证明比较或Plan已通过。

变更文件：`roster-workflow-strategy-owner-context-v1.mjs`、`roster-workflow-correction-context-v1.mjs`、`roster-plan-revision-return-v1.mjs`；两个上述具体回归脚本及施工记录。未提交、无新增依赖、无子代理、无删除。
