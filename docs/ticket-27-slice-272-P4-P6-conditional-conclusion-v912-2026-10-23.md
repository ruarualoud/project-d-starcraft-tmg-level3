# T27 / S272：条件经验与合同检查 v912

## 本次交付和未完成边界

用户要求：条件性实验保存；最终有效假设详细记录条件与结论，未来作为对局 Skill 检索；工程传递与状态合同系统检查。

本次补齐的是**已经通过现有来源审核、比较审核和作者采纳的局部结论归档出口**，不是另一轮模型审核，也不是把当前 A/B 宣布合格。

- 原观察继续使用 `roster_conditional_experience_observation_v1`，不覆盖原件。
- 新结论使用 `roster_conditional_experience_conclusion_v1`：原比较目的、双方选择、指标、失效条件、相关实际观察、原结论、作者取舍及全部审核引用。
- 相关观察列表不是所有内容都被批准；哪些事实支持结论由原结论及其来源审核确定。未测量不变成零，原实验描述不冒充实际配置。
- 产品调度及正式接受出口共用 `archiveConditionalConclusion()`；通过既有 cycle assessor 获取资格，无外部 `passed=true` 入参。
- `conditionalExperiences(query)` 保持原观察 `entries`，新增独立 `conclusions`，防止原始观察和已审结论混淆。
- 规则、地图、军表或来源不匹配时，检索明确返回 `sourceBindingsMatchCurrent:false`，不得静默套用。
- 仍须适用性及 held-out 评估才能发布 Skill。没有接入线上对局自动检索，没有写入真实对局记忆，没有规则修改权限。
- 归档额外引用只在 `includeArchiveSources:true` 的工程读取中出现，普通角色 prompt 不增加这些字段。

## 本轮合同检查矩阵

| 边界 | 单一事实来源／检查方式 | 实际结论 |
|---|---|---|
| 产品恢复通知 → 核心入队 | v910 同一个完整输入构造器，完整 inputs 比对 | 已修复；A 实际收到一次新通知，不再因产品后补 tools/readiness 被拒 |
| Native 能力 → 当前动作菜单 | v909 同源 actionAvailability，区分能力和当前禁用原因 | 原 A Raptor 已接战的原因不能再在快照层丢失；实际模型已撤回旧能力缺失判断，后续诊断仍在进行 |
| Native 候选非法 → 持久化失败 → 纠错角色 | v911 同一个候选失败分类器 | 两份 Core 容量拒绝不再被实例级通用分支覆盖成输入格式错误；不是战斗测量完成 |
| 申明配置 → 实际测量配置 | 既有 measurement configuration 投影按实际 source/context 读取 | B 仍把两个 contributing models 当作 large 的依据，和保存配置审核存在争议。模型推断不是配置证明，当前没有批准该结论 |
| 数值比较 → 文字结论 | 既有 measured-comparison 合同记录左右对象、差值方向和阈值 | 负 predicate 只回答该方向，不能自动翻译成某方案胜出；B 仍待来源修订，未作为有效经验 |
| 来源审核 → 作者采纳 → 归档 | v912 复用同一 cycle/handoff，不新增审核 | 已实现；未审／未解／过期输入不能归档成已审结论 |
| 归档 → 冷恢复／检索 | 现有 workflow evidence store，稳定的 outcome+review 标识 | 定点通过：可查原件、幂等、不重复执行；规则变更不静默沿用 |
| 已审经验 → 发布 Skill → 对局应用 | 独立适用性与 held-out 评估 | **未完成**；不能把代码出口通过写成实战已经使用 |

这是上述边界的检查结果，不是全体规则原子、所有工具参数组合或整场对局的全面认证。继续调查必须定位明确的生产者／存储／消费者差异，不能只靠给模型再加一段纠错文字。

## 定点验证

只针对本次缺失出口新增回归，没有重跑 v905、v909、v910 或 v911 的已过门。

1. `scripts/debug-slice272-conditional-conclusion-v912.mjs red`：实际观察＋注入已审交接，复现缺少归档投影。
2. 同脚本一次 `green`：3 组通过——完整条件结论保存；6 类未审／未解／过期交接隔离；同核心持久化、冷恢复、幂等和变更规则查询。
3. 实际 A6039/r3、B5741/r5 的只读产品出口：均返回 null，无不当发布。证据 `build/slice272-conditional-conclusion-v912-product.json`。

正向归档的“已审”状态是注入夹具，不是生产 A/B 已通过。真实 A/B 尚无合格最终结论，不能伪造一个来演示成功。上述验证 0 Provider、0 Native 执行、0 生产状态写入。

## 同版续行

旧 A75529/B75536 已按 TERM 完成当前操作后退出，两组 0 在途；随后同原目录、同代码、同费用账恢复：

- A87859：`build/slice272-v912-experience-fixed-1792703322387.log`
- B87866：`build/slice272-v912-experience-editable-1792703322390.log`

A 原目录 `build/slice272-product-generation-v645-hsxEYu`；B 原目录 `build/slice272-product-generation-v645-8aBuEV`。未新建房间、未重放成功 Native 动作、未清账。

仍为 T27 5/6、T23 33/36、剩 S272/S248/S249/S250 共 4 片；正式 Plan 0/6、对局 0/12。下一步检查真实 owner 是否解决现有配置/来源争议，再完成真正的结论准出；不以归档测试代替最终军表与 Plan。

## Diff 摘要

- 新增 `roster-conditional-conclusion-v1.mjs`：归档和查询。
- `roster-hypothesis-cycle-v1.mjs`：现有比较完成后归档；仅归档读取时补全原目的和审核引用。
- `roster-decision-workspace-run-v1.mjs`：统一产品方法与分开的结论查询。
- `roster-decision-product-journey-v1.mjs`：正式接受出口同一归档方法。
- 新增一个具体缺口的回归脚本；本报告及 TASKS/MEMORY/CURRENT_WORK 更新。

无提交、安装、清理或子代理；未改模型、军表、Plan、规则数值或审核轮次。
