# T27 / S272：真实作者入口与条件经验合同核对

日期：2026-10-23。P1/P2/P5 的实际接线缺陷；不另开旧流程，不授予策略通过。

## 结论

v919 的统一类型化作者投影和分块器已经存在，但产品 `roster-workflow-read-role-v1.mjs` 只在旧 correction / authorDecisionHandoff 标志下调用分块器。来源解释争议能取得正确作者身份，却没有经过背景分块。这是**实际调用入口遗漏**，不是模型未遵循一个已送达的分块合同。

B 的真实请求 `073d03348bf77f7ee210ae6437dfe29db98e0078f1a34cb8aa7bf3fdd9fbad8b` 有 `strategy_owner_assignment`，却无 `strategy_owner_context`。现入口同样接受共享投影器产出的 `incomingAuthor`，覆盖它已识别的四类类型化返回。保留 pending retry / saved reply 的原请求，不追溯改写付费原件。

生产文件仅改 `packages/roster-strategist/roster-workflow-read-role-v1.mjs` 的调用条件与说明。未改变数值、军表、结论、角色权限、审核阈值或策略选择。

## 定点证明与测试局限

脚本：`scripts/debug-slice272-owner-entry-v922.mjs`。实际 Core 调度 → 实际角色请求构造 → 内存证据存储；Provider 只捕获请求后主动返回 not_dispatched。**0 付费请求、0 Native、0 生产状态写入。**

生产停止期间 B 已从 r8 改为 r9。测试只在内存中用真实 r8 提交回执 `d30caf6b…` 和原 assignment 恢复测试版本，不回退生产文件。

1. 首次夹具错误：以空对象而非 null 初始化 operationState，未走到请求捕获。不是产品缺陷，记录保留。
2. 修正夹具后的 [RED](../build/slice272-owner-entry-v922-red2.json)：真实请求缺少 `strategy_owner_context`。
3. 生产修复后，实际入口、类型化来源争议、当前事实 inline、完整当前 Plan inline 均通过；末项错把该请求的 `questionEvidenceDirectory` 写成可选的 `decisionEvidenceDirectory`，因此整条未通过。见 [首轮修复记录](../build/slice272-owner-entry-v922-green.json)。
4. 按用户对明确修正后的一次补验授权，仅补剩余目录与原件保护项，[剩余项 GREEN](../build/slice272-owner-entry-v922-remaining-green.json)。先前通过断言不重跑：真实 Core 发布完整延期请求，原件可读，原生产 workflow 文件逐字节未变。

v919/v920/v921 及其他已通过门未重跑。以上不是新的真实模型策略效果证明。

## 当前跨边合同账

沿用 [v915 合同检查](ticket-27-slice-272-P4-P6-experience-product-read-v915-2026-10-23.md)，不把“函数存在”算成产品验收。

| 边界 | 统一来源／不变量 | 当前证据与未关闭事项 |
|---|---|---|
| 原任务 → 角色输入 | assignment.workId / role / scope；当前任务和历史任务分开 | v919 识别四种返回；本次补上实际产品调用。历史禁止事项不能覆盖新职责 |
| 角色输入 → 请求分块 | 当前 Plan、当前返回事实保留；延期项有准确读柄 | 本次实际 Core/role 捕获通过；待新真实作者请求消费 |
| 请求 → 模型回执 | 已存请求自身的会话、轮次、context、输出合同 | 本次新增交互只读核对 7 份，0 归属错误；不能据此批准内容 |
| 工作单 → Native 参数 | 同源 Native 合同；编码层与规则字段分开 | v921 精确诊断已被 A 实际使用，模型改为 typed queryArguments；后续参数仍须原生验证，语法改正不等于实验成功 |
| 声明实验臂 → 实际配置 | participantConfigurations 对实际候选/状态，不按 prose 猜身份 | v906/v915 有执行前拒绝证据；B 大编成替代尚未正确测量 |
| 工具原件 → 分项审核 | 原件字段、比较方向、作者条件；不能混淆历史/当前事实 | v913 方向投影、v918 条件传递已修；B r9 正确承认 small 实测不等于 large 比较 |
| 局部事实 → 原问题覆盖 | 原问题谓词与证据范围匹配 | 大编成未测仍未解决，不能用一次候选超预算证明所有替代不合法 |
| 作者修订 → 原实验续接 | 真实 commit、同一 owner 或显式后继、当前事实依赖 | v917/v920 已处理嵌套和直接 Plan-only 提交；B r9 已有原问题后继，无新房 |
| 条件观察 → 已审条件结论 | 沿用真实 cycle / 来源审核 / 作者决定 / 比较审核 | 当前 A110/B17 原观察、已审结论各0；不制造成功经验 |
| 已审结论 → 对局 Skill | 条件适用性和独立验证，不改变 Rules 权威 | **未完成**。现有 HTTP 仅可查询原记录；不能声称已经能指导正式对局 |

本次新增工作核对（A 从事件6631后、B从6920后）：A 3份完成请求/回复、2个输入引用；B 4份完成请求/回复、18个输入引用；均未发现缺件、错角色或回执身份不匹配。只检查这些新增记录，不重复旧通过验证，也不宣称穷尽全部可能异常。

## 条件经验保存约定

已有观察和已审结论分开存储，不能合并成一批“成功 Skill”。详细保留：

- 规则/数据/地图版本与军表配置，实际实验场景/阶段、参与者和几何来源；
- 原假设、参考臂和替代臂、比较指标和判断方向；
- 实际参数、工具结果、测量身份及不可用/未知原因；
- 支持、反驳或未能判定的结论，适用条件和失效条件；
- 作者最终取舍、审核引用，以及是否获准进入后续 Skill 评估。

当前 `roster_conditional_experience_conclusion_v1` 已能保存这些类别的已审聚合；`advisorySkillEligible:false` 仍正确。没有真实已审结论时不会凭空创建“已证明经验”。后续检索是建议来源，不能代替实时合法性和适用条件核对。

## 同版恢复与实际进展

旧 A27378/B27392 均已退出，A6645/r3、B6994/r9，0 pending。

同目录启动 **A38543/B38556**：

- `build/slice272-v922-owner-entry-fixed-1792712202614.log`
- `build/slice272-v922-owner-entry-editable-1792712203083.log`

没有新房、历史清零、费用重置或成功请求重放。最新核对 A6651/r3、B7021/r9，运行中。

B 的 `11bc70c0…` 实际修订已正确记录 Marauder-small − Goliath = +0.5278 > 0.5，并承认 large/双升级臂未测；仍把当前超预算候选和总体替代可行性讨论在一起，**没有通过最终审核**，不算已证明策略提升。

A 的 `20048a65…` 已根据准确错误改用 typed queryArguments，但新的完整工作单还要通过原生参数和执行检查，不能据声明算生存比较完成。

## 进度

T27 5/6，T23 33/36。剩余 S272/S248/S249/S250 共4片。正式 Plan 0/6、新对局0/12。

下一项是实际实验闭环、正确作者处置与条件结论归档，随后才有 Skill 适用性/对局检索和最终中文流程报告。报告与局部测试不代替最终产物。

## v923：普通事实返回遗漏，不能只覆盖特殊纠错分支

继续看真实请求 `f63d7ea79f715b34e8c85126171c1a9c908ed027bf0eaf9c6d4ac1cbeae22fbf`，发现它是 `fact_owner_strategy_required`，不是 v919 覆盖的四类特殊 coordination。实际 `createRosterExperimentOwnerContinuationV1` 生产的正常返回也应该进入同一作者职责投影；此前缺少该分支，原任务限制仍 inline。这是第二个明确接线缺口，不能把 v922 的局部修复扩大称为所有返回都通过。

统一入口 `roster-workflow-strategy-owner-context-v1.mjs` 现按**真实 Host frontier + 同一 owner 的当前 evidence**识别正常返回：

- `fact_owner_strategy_required` / `fact_owner_blocked` 必须与原结论状态一致；
- 普通决策窗口结束和仅重复既有观察的检查点，同样交给作者，不当成事实批准；
- 过期来源、不同 owner、错误角色、伪通过标志、不匹配状态、未知原因和伪 coordination 均不走此入口；
- 当前 Plan、返回事实、未解问题原样保留，旧角色任务进入可读历史。没有新改表权、执行权、事实通过或重试权。

具体 bug 脚本 `scripts/debug-slice272-owner-normal-return-v923.mjs` 使用原 assignment `4fdf0e22…`：[RED](../build/slice272-owner-normal-return-v923-red.json) → 修改后[一次 GREEN](../build/slice272-owner-normal-return-v923-green.json)。1 个真实正常返回、3 个明确注入的同类检查点、8 个错误归属/状态反例；0 Provider/Native/生产写。v922及此前通过门未重跑。

旧 A38543/B38556 已退出，A6675/r3、B7059/r9，均0 pending。原目录同版 **A46665/B46672**：

- `build/slice272-v923-normal-owner-fixed-1792712691801.log`
- `build/slice272-v923-normal-owner-editable-1792712692187.log`

以上新句柄取代本文件前面的 v922 运行句柄。真实新请求消费仍需观察；正式通过数量不变。
