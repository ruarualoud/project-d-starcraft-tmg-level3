# T18 / S174：Zerg 正式续跑的来源抽查

状态：初始候选的人工来源核验，不是后续实战反思或用户要求延期的三组设计研究。生产仍在运行，本文只记录问题，没有修改生产代码、付费产物或冻结来源，也没有触发额外模型调用。问题未修复前，不得把该章的模型审核通过当作独立来源、策略效果或对战可用性通过。

## 对象及已证实进展

- 当前 run：`faction-v1-0a2eb5fe91b8ae51677a`，父 run：`faction-v1-8262a9a7181f3ec25c06`。
- 原 `structured-76698661eced0d83008fc72ceecbeceb256367eb15b6105f` 编号故障已在正式 DSH 路径恢复，新增 Provider 调用为 0，原判断不变。
- Zerg 第二章 `faction.zerg_swarm.unit_roles.1.result` 实际 hash：`1957927023ce163056ac8dda2aaa34aaa85d818f6b2e1286de34f66ba9308bf3`。
- 实际结果自带 `semanticReviewPassed=true`，但 `rulesApplicationPassed=false`、`strategyEffectivenessProven=false`、`runtimeAccepted=false`。当前生产审核进度 2/8，不是独立来源验收 2/8。
- 六条建议确实有 `when / procedure / alternatives / risk / reviseIf / unproven`，并非只有规则摘录；存在策略结构，不等于策略中的每一步均合法或有效。

## 已定位的语义问题

以下索引均从 0 开始，来自实际完整第二章 draft，不是另造的模型样本。

### 1. 冲锋失败后的后续动作没有合法时机边界

`recommendations[3].procedure[4]`：

> 5. 若冲锋失败或预期伤害不足，考虑以 Run 行动 reposition 或改用 Roach 的远程 Acid Saliva（RoA 3、Hit 3+、Range 8）从安全距离射击 Zergling。

冻结来源 `core.iuUyObNTQ2M8xK4IUqzC.items.7.subItems.6`，p2 明确规定冲锋失败不移动、激活立即结束；p3 的 Move/Run 建议是**声明高风险冲锋之前**考虑，并为下一 Round 的冲锋做准备。

当前步骤把“已失败”与“尚未决定、预期不足”合在一个分支，没有区分当前激活已结束、之后合法激活的重新规划，以及其他单位另行激活。按即时行动指令读取会产生非法续行动。不能仅因同条 risk 提过“浪费整个激活”就视为已消除矛盾。对抗对象还从 Roach 切换为 Zergling，需要在局部修复时明确己方/敌方与目标，不能以模糊措辞替代正确身份。

验收需要分开检查：声明前选择替代动作；失败后当前激活无后续动作；另一个单位或下一合法时机的计划必须显式标注。未在本文执行修复或证明 Rules case 已通过。

### 2. Supply 阈值及 Supply 0 控点结论不正确

`recommendations[3].risk` 末句：

> 若 Zergling 单位减至 6 模型以下，其 Supply 降至 0，失去标记控制力。

冻结来源 `source:army_units:zergling` 的 `squadProfile` 为 **1–6 模型 Supply 0、7–12 模型 Supply 1**。当前“6 模型以下”漏掉恰好 6 模型的边界。

冻结来源 `core.iuUyObNTQ2M8xK4IUqzC.items.9.subItems.0`，p1/p2 要求在场、至少一模型在 3 英寸内且有 LoS/同高度、单位保持 Coherency，Flying 不可争夺；并明确 **没有敌方单位争夺时，Supply 0 单位仍可控制标记**。p2 的 sticky control 也不能被概括为“降至 0 即失去控制”。

验收需要至少覆盖 7→6 的边界、Supply 0 无敌方争夺、敌方正 Supply 争夺，以及既有粘性控制，不以单一“Supply 0 无用”策略指导移动或牺牲。

## 后续处理边界

2026-09-09 06:44 CST 只读复核：直接从原生产 SQLite 读取上述第二章结果，并对完整 `draft` 调用现有 `inspectFactionZergUnitTimingDebtV1`，返回 `findings.length=0`，结果 hash 仍为 `1957927023ce163056ac8dda2aaa34aaa85d818f6b2e1286de34f66ba9308bf3`。V1 明确只匹配先前记录的完整字段原文；本章的新表述不在其匹配集合中。因此零命中不能解除本文两项独立来源反例，不能证明本章正确。此次检查没有修改原产物或调用 Provider。后续局部修复须显式接收本章的实际反例及来源，保留完整上下文并重新审核；不能仅重复运行旧修复器后标为已解决。

继续完成已启动的独立章节生产，不在运行中改它的来源、合同或代码。以上原始内容和模型通过意见保留为审计证据；基础候选正式验收前，用现有证据驱动的局部修复及重新审核路径处理问题，并加入独立规则/决策验证。不要只重抽一份完整章节，也不要通过手改旧产物或把本报告标为通过来消除问题。

这只是对第二章两条建议的抽查，不代表其余四条或其余章节已完成独立审计；其它可疑表述尚未逐条来源核验，不能先记为确定错误或确定正确。本文不是新的技能版本、对战回放、训练真值或已验证的升级。

技能记录：`ctx2skillLoopUsed=true`，`harnessLoopUsed=true`，`targetGames=[starcraft-tmg]`，角色为 `rule_skill_builder_prompt / harness_optimizer_prompt`。本抽查 `skillsGenerated=0`、`promotions=0`、`newProviderCalls=0`；仅使用冻结来源与实际 SQLite 完成产物。UI、记忆、训练轨迹为空，完整对战尚未验收。
