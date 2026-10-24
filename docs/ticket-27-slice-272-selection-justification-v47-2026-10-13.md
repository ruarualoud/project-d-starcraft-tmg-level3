# Ticket 27 / Slice 272：基于证据的选表 Teach 要求（v47）

## 本次交付及通过标准

新建从头写表会话采用 modelContextVersion=7、unit_role_comparison_v1；历史付费上下文、回复、军表及计划不自动改写。原有固定表实验不因此获得重新选表权限。

模型需要逐个已选单位实例提交公开论证，而不只是“输出伤害”“提供支援”等角色标签：

1. 实际任务、预设敌人或对抗场景、地图路线和进场时机、独特贡献或有意重复配置。
2. 能力配合：能力名、阶段、实际搭档实例、距离/资源/时机条件、预期效果；没有使用能力时说明理由。英雄同样需要明确自身职责与搭档，不能用“英雄光环”代替能力原文。
3. 至少一个已提供的可选单位、编制或升级包的对照：优势、代价、为什么没有选择它；相同单位的不同编制/升级也是合法比较对象。
4. 引用实际交付的单位规则、Skill 或工具回执标识。单位能力和未选单位必须有对应单位来源，不接受虚构引用。
5. 最终组合为何在本地图、任务和对手条件下更合适；相对哪些替代方案、保留哪些优势、承担哪些代价、哪些观察会推翻选择。

确定性检查负责实例完整覆盖、身份/引用解析、能力名与阶段一致、搭档存在、替代方案及取舍字段完整。来源审核负责能力对象/标签、范围、CP、进场、实际购买升级和计分事实。解析出引用不等于该结论正确；完整论证不等于已经证明策略更强。

Teach 不按主机权重选择策略，不要求全局最优，也不把合法但冒险的方案自动改得更保守。事实错误和关键无依据保证是 High；普通策略风险、条件性意图及非必需补充按原 Medium 规则处理。字段缺失进入既有有界纠错；严重事实错误仍需现有来源纠错，不能软化成“自动通过”。

## 接线与修改文件

- `packages/roster-strategist/roster-selection-justification-v1.mjs`：共享论证合同、来源记录提取、完整性检查、公开 Plan 文本投影。
- `iterative-roster-plan-session-v1.mjs`：新会话策略版本、反馈完成要求及论证留存。
- `iterative-roster-teach-handoff-v1.mjs`：策略版本交接。
- `iterative-roster-flash-model-port-v1.mjs`：选择模型的反馈阶段说明。
- `roster-teach-role-ports-v1.mjs`：教师/挑战者/学生的单位用途、配合、替代论证要求；从头写表的快照只在本轮冻结，之后可回 Builder 改军表和合法进场。
- `roster-strategist-runtime-v1.mjs`：Foundation/深化输入、结构化输出、有界补正、Plan 投影、修复时真实单位规则接线。
- `roster-final-plan-review-v1.mjs`：新论证的来源审核输入包含冻结能力定义及实际选定编制/升级。旧计划没有该论证时不增加这些事实字段。
- `packages/product-composition/roster-planning-product-module-v1.mjs`：同一冻结数据进入运行时和来源审核，不硬编码英雄能力。
- `packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs`：结果/规划经验/导出保留公开论证，来源审核取得冻结能力事实。
- `scripts/verify-ticket-27-slice-272-selection-justification-v1.mjs`：只针对真实 Raynor 回复缺乏配合和替代论证却可通过的具体缺口。

论证原文进入现有 componentPurposes/publicSummaryText，正常来源审核、修复和后续 Plan 阅读能看到；另保留生成时的结构化原始论证。该原始侧车不是后续修订的真值证书，也不代表 Wiki 已完成导入。

## 验证状态：部分完成，不宣称完整通过

只执行本次具体缺口，未重跑旧绿或全量构建；没有真实 Provider 调用或房间写入。

- RED71496：旧付费的空泛英雄回复通过旧合同，复现缺口。
- 首次补验88236：新数组声明超过现有 Schema 子集允许的显式最大值；去掉不必要的数组上限，并补齐可空解释的 minLength，未改共享注册器。
- 第二次89266：此前的合同覆盖、假引用/假能力/不存在搭档拒绝、原有合同兼容、论证保留等断言已越过；停在本地测试夹具修改用途文字却沿用旧嵌套 purposeHash。
- 按既有定点补验授权修正夹具，90626 仅执行尚未通过的 integration 部分，不重复已越过的断言。它已越过正常来源审核请求捕获及冻结能力/所选升级断言，创建隔离目录 `build/selection-justification-bug-tZZkvP`，但未取得脚本末尾的 completed/passed 回执。该目录只有已保存的迭代状态和空 drafts；未证明 Product→Workspace→Foundation 已完成。

补验观察器没有保留 ChildProcess error.signal/killed，错误地以 error.code ?? 0 表示完成；原记录 exitCode=0 且 stdout 为空不足以证明通过。执行设置了55秒超时，退出原因无法从已保存字段确定，按 incomplete 记录，不虚构失败根因。后续只能完成尚未通过的 Foundation 接线验证，不重放已经通过的合同和来源审核部分；达到收敛边界，本轮不继续尝试。

原始记录在原 build 的 `query-contract-audit-v30/roster-deliberation-live-v43/selection-justification-*.private.json`；保留失败记录，不改成绿。

## 前一轮真实产出与尚未解决的事实问题

新真实军表仍为共享 Builder 合法2000分，但 Teach 接受后晋升停在 `AGENT_SELECTED_TEACH_SESSION_NOT_REVIEWABLE`。军表合法不证明最终 Plan 已准入，更不证明通过本次新标准。独立写表 Host48993 已精确停止并确认不存在；原 ABC 未启动，A59/B49/C72 保持封口。

“锁定后不能重排”不是官方规则，是旧 fixed-preset Teach 阶段文字与新可回改写表流程矛盾。v47 新从头写表合同明确区分本轮稳定快照与后续改表/重排，旧付费原文仍保留。

现有新 Plan 未把 Raynor 支援论证到可执行程度：没有明确 Orders 的对象/CP/阶段与动作顺序。冻结官方记录中的 Commander 只增加 Raynor 自己的 Supply，不是友军光环；Freedom Fighters 与 Orders 各有不同范围及适用条件，不能用含糊“英雄支援”推断已经规划了配合。新字段要求纠正这种空泛表达，但本轮未让真实模型重答，不能称已产出更好的英雄方案。

另确认了计分前提错误：此任务自身点每个1VP、敌方点每个2VP；对手控制自身2/4是2VP，不是4VP。“夺取敌方自身点”的相对分差变化是我方+2、对方-1，合计3，不是4。数学工具算对输入数字，不代表它验证了计分主体。该问题仍需实际来源/工具语义修复；本次审核新增明确提醒，但提醒不能替代确定性修复。

## 剩余交付与总进度

1. 完成尚未通过的真实产品 Foundation 接线验证，保留逐阶段完成回执和实际终止原因。
2. 修复已有反馈→晋升身份接线、计分主体前提及全工具 unknown 审计确认的工程问题；新实际模型补齐论证并来源审核后，才声称新的完整表/Plan 合格。
3. 原 ABC 同版续跑及同军表计划对照，之后复盘/Wiki/Skill 实验；不以本地捕获代替实际策略效果验证。

T27/S272 仍5/6；T23/S248 仍33/36；主线剩 S248、S272、S249、S250 四片；有效完整比赛0/12。20图长期范围不变，18图扩展后置。无新代理/K3、刷新、删除、安装、提交或付费请求。
