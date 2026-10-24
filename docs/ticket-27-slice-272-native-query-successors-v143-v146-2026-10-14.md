# Ticket 27 / Slice 272：工具修复进展与后续统一检查

日期：2026-10-14。T27 5/6，T23 33/36；主线剩余 248/272/249/250 共 4 片，完整验收对局 0/12。

## 当前结论

工具能力缺口已有实际修复，但 Teach 尚未收口。已保存的最新汇总仍为 A 三项、B 四项未解；不能用定点工具通过替代模型自动纠错或最终 Plan 验收。四组比赛未重启。本批 v143–v146 新增 Provider 调用 0、真实 Room 动作 0；A 原累计 104 calls / 19,243,652 units 不清零。

## 已完成的改动与一次性验证

| 编号 | 交付 | 实际证据及边界 |
| --- | --- | --- |
| v143 | 区分静态底盘/连续性证据与合法到场；纠错可用已存工具候选 ID 引用完整参数，不再手抄坐标 | 具体失败 RED 29823 → 唯一 GREEN 31726，4 项通过。复用 v142 实际候选；最终 dispatch 使用已保存成功回执作夹具，并非模型自动选取或一次新 Native 执行。 |
| v144 | 指定 Native 动作产生隔离、可继续查询的后继场景；重启从保存后继恢复，不重做动作 | 原 `PREGAME_LAB_BRANCH_KIND_UNKNOWN` 失败 → 唯一 GREEN 42448。1 次真实 Native 克隆态动作，后续控点 exact，原态/父态不变；恢复不增加动作次数。随机伤亡后继尚未实现。 |
| v145 | 写表/Plan 场景入口不再漏掉 Native 动作的 argumentsJson 和 seatKey | 具体失败 RED 47393 → 唯一 GREEN 48045。完整参数/分支/座位保留；仅入口验证，不是完整生产验收。 |
| v146 | 用实际 Omega Network 检验“能力 → 资产出现 → 后继查询” | 进程 51769 已结束；真实 Native 克隆态动作产生 `player2-omega-worm`，后续控点 exact，源态不变。诊断程序选择候选，不代表模型战略合理性或 A Q2 已关闭。 |

v144 RED 的观察接口曾超时；随后以实际失败产物和进程退出确认结果，没有重复提交该次执行。已经通过的门不重跑。

证据目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

- `common-v143-scoped-evidence-candidate-reference-result.private.json`
- `common-v144-native-successor-branch-result.private.json`
- `common-v145-native-action-plan-ingress-result.private.json`
- `common-v146-native-asset-branch.private.json`

产品变更：`pregame-placement-evidence-v1.mjs`（新增）、`pregame-scene-laboratory-v1.mjs`、`roster-teach-framework-v1.mjs`、`roster-teach-query-recovery-v1.mjs`、`roster-teach-evidence-port-v1.mjs`、`roster-strategist-runtime-v1.mjs`、`roster-strategist-output-schemas-v1.mjs`、`roster-teach-output-contracts-v1.mjs`（均位于 `packages/roster-strategist/`），以及 `packages/product-composition/roster-planning-product-module-v1.mjs`。

定点脚本：`scripts/verify-slice272-scoped-evidence-candidate-reference-v143.mjs`、`verify-slice272-native-successor-branch-v144.mjs`、`verify-slice272-native-action-plan-ingress-v145.mjs`、`inspect-slice272-native-asset-branch-v146.mjs`。

## Teach 剩余交付

1. 补足伤亡/随机结果的明确条件后继查询，不能把期望值当成已发生的伤亡；现有 native_action 对 chance 明确拒绝。
2. 让实际纠错流程正确使用前置工具、候选引用及条件证据；机会成本由明确场景比较支持，不能用 budget_fit 冒充。修正旧 Marine 数量叙述，不把未来对手选择要求为真值。
3. A/B 真实未解项关闭并更新、验收最终 Plan。保留原尝试/费用记录，不通过清空问题或无界重试制造通过。

## 用户新增：Teach 完成后的统一工具消费链检查

执行顺序：Teach 修复收口 → 统一消费链及性能检查 → 四组同版新对局。此项纳入现有工作，不虚增 Ticket/Slice 完成数。

- 覆盖固定表计划、从头写表与初始 Plan、Teach、实战 Planner 查询、动作决策及合法性执行、Plan 修改、记忆更新、复盘/Skill 进化中实际使用这些工具的入口。
- 逐入口核对工具标识、版本/冻结数据、参数与结果合同、转接器漏字段、旧实现、失败与纠错反馈，以及计划中保存的旧事实是否失效。
- 统一理解距离/控点、静态可摆放/合法到场、条件推演/未来事实、unknown/确切否定；禁止把 unknown 当零损失或安全。
- 检验查询结论与同场景 Native 执行一致。共享实现已经正确的调用方不要求机械改代码，但必须有消费正确性的证据。
- 仅补受改动影响的定点验证；不重跑无关或已通过的验证。Teach 通过不等于后续决策及 Plan 修改自动通过。

## 用户新增：关注性能变化，排查劣化

本批尚无可比的端到端性能结论，不能宣称“没有劣化”。v146 单次能力探查约 24.843 秒，只是该探查从开始到结束的墙钟时间，不是完整 Agent 行动耗时，也不能与旧队形求解的 6.024 秒直接比较。

修复中保留阶段耗时；Teach 收口后的统一检查使用已有性能 case 和历史记录，对比相同场景/规模/参数/模型配置，区分热运行、冷初始化、离线恢复和并行争用。不覆盖原基线，不因功能修复自动宣布性能通过。

需报告：

1. 模型调用次数、输入/输出 units、等待耗时、纠错轮次及费用。
2. 工具分阶段耗时：队形/路径、攻击概率/火力交换、资产摆放、场景克隆/恢复、序列化与存储；识别重复查询和成功结果重算。
3. 完整行动墙钟时间及各类型中位/长尾/极长 case；样本不足时只报实际个案，不伪造分位数。
4. 并行实验的排队、CPU/内存/磁盘争用；不能把本机额外负载误判为模型或算法劣化。
5. 若变慢，明确属于新增必要计算还是可消除的重复/串行开销，同时核对决策材料和合法性结果未缩水。

不为速度删减策略信息、缩小搜索能力或增设预算硬停；沿用既有性能验收约定。只有影响本次改动的性能检查才执行，先利用现有计时证据定位，不附带重跑全部已过门禁。
