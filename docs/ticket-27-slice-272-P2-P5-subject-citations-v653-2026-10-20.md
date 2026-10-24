# P2／P5 v651–653：Teach必须读当前Plan，来源引用不能被合同误拒

2026-10-20。T27／S272，新P0–P6主线。施工与真实恢复记录，不是最终中文生成报告。

## 先发生了什么

v649冻结正文检索实际被模型采用：固定表读到来源34／43等Zone of Influence原文，经总体决定实际提交Plan r2→r3，部署概念改为有规则支持的条件约束，军表2000矿／120气／9单位、army hash `29d12ca7…`保持不变。提交回执 `d653aef92dc194807c2bb826ad389a938221b7322fcfcec962d6a92d0ff26b11`。

这证明“查到原文→模型修订Plan→真实提交”，但不是已证战略优越性。特别是旧 `reinforcementPolicyText` 的“无增援；preset_immutable…”仍被保留，不能说已纠正全部矛盾。

v650也实际解除了从头写表的调度死锁，`product:teach:r1`已执行，后续真实查询并解释任务／地图／Builder事实。军表仍960矿，非最终满分。

## v651 P2：Teach审的不是当前Plan

### 具体失败

固定表 `product:teach:r3`实际读取草案摘要、单位／战术卡、规则与地图，却**没有读取任何 `draft:r3:plan:*` 正文**。它给六个Plan区域retain/investigate提案，甚至说“当前草案摘要尚未写入具体主张”；实际摘要非空，增援错误也未被发现。

- 实际最终请求 `186c9e22…`，付费回复 `c30ce7d3…` 原样保留。
- 草案摘要只有军表／完整性元数据，不等于Plan正文。规则读取也不能替代被审视对象的读取。

### 修改与自动恢复边界

- `roster-workflow-plan-blocks-v1.mjs`投影当前Plan题目索引：每个claimPath、稳定来源号及读取位置；不把Plan变成Rules。
- `roster-workflow-read-role-v1.mjs`把索引交给Teach。finish提案涉及未交付的当前Plan段落时，走已有 `evidence_not_read → 并行读取 → evidence_reads_pending_recheck`，必须作者确认／修订后才能接受。
- 只读模型实际选择审视的段落。部分叶读取不能冒充完整段落读取；数组总项质疑需要相应实际成员原文。读取不算纠错失败，不清除原记录、不自动采纳原提案。
- 产品Teach阶段显式升级为 `product:teach:rN:subject-v1`／`product:after-teach:rN:subject-v1`。旧未读正文的Teach保留历史，不能代替新阶段通过；仍同当前草案、同事实和同工作流，不从空表重来。

### 具体准出

`verify-slice272-teach-current-plan-subject-v651.mjs`：真实付费回复在实际角色接缝离线回放，RED8984复现“未读也可完成”，修后一次GREEN9897：自动交付22个被审视块，包括真实摘要与包含错误增援句的deploymentConcept，原提案尚未接受，等待作者确认；0真实Provider／Native／生产写，1个Provider替身调用。旧付费回复／生产状态不变。日志 `build/slice272-teach-current-plan-subject-v651-{red,green}.log`。

这证明错误提案不会因只读规则就直接完成；**不证明模型已经自行修好增援计划**。

## v652 P1：逐问题来源被三字段合同误拒

从头写表实际来源审核 `product:after-teach:r1:investigation:method:8b75d9da6c2dc9b6:source-review:v2`连续三轮结束于同一Schema错误：

`$.checks[0].dataQuestions[0].evidenceNumbers / additional_property_forbidden`

原回复 `b66a94f8…`给 answered_fact 附 `[187,189]`，对应已读mission_scoring与map_summary，父check也引用同两项。删除它会损失有用绑定，不是正确纠错方向。

- 共用dataQuestions新合同明确携带evidenceNumbers；无引用用空数组，answered_fact须有实际来源，并纳入父check／decision引用供独立审核。
- 作者合同1.6.0、分类／域审合同1.2.0同步。每个问题引用检查实际读取，不能只借同check另一问题的引用混过。
- 旧精确pending请求按保存原Schema验证，不补写旧引用／改旧回复；没有字段的旧记录不被假装升级成逐问题绑定。
- `verify-slice272-question-source-binding-v652.mjs`：实际接缝RED11494→一次GREEN12096，原问题／引用／回复字节保持，0真实Provider／Native／生产写。

来源编号匹配和实读不等于内容正确，独立来源／覆盖审核继续存在。

## v653 P5：产品自动复用已付费结果重验

仅改Schema还不够，原产品作业会停在needs_repair。新增受控的已保存回复重验：

1. 必须是已完成的纯Schema错误，无pending请求。
2. 真实旧回复必须**不符合其保存旧Schema，但符合当前角色的新Schema**；同Schema、不支持的旧输出或语义错误均不进入此通道。
3. 正式journey在同一writer lease内调用已有核心 `revalidateRoleReply`，不另造生成器。旧失败、原回复、读取、费用与计数历史保留。
4. 同一原回复／旧新Schema对最多排一次。之后仍走完整正常语义／引用检查；未知、错误结论不会因格式恢复获批。
5. `metadata.schemaRevalidations`和trace保存原replyRef、Schema哈希、旧失败及“不重发Provider／Native、不授最终批准”记录。

`verify-slice272-product-saved-schema-recovery-v653.mjs`：正常journey启动的具体缺口RED13937（0次恢复）→一次GREEN14556（精确一次排入核心重验端口）。隔离临时job、核心重验port替身，0真实Provider／Native／生产写，不据此冒称完整生产。

### 实际生产不是只过替身门

同两原HTTP工作流载新码：editable PID15211，fixed PID15212，日志 `build/slice272-product-generation-v653-{editable,fixed}.log`。旧4191／4192均已确认终态，不是观察超时就重建；没有再次调用v647 Provider恢复。

从头写表已实际记录 `schemaRevalidations[0]`，原回复仍 `b66a94f8…`，新classified_review1.2.0；核心 `revalidations`及 `completedCorrectionRecoveries`均保存同一原ref，`historyReset=false`，对应work已为 `evidence_ready`、无pending。它没有重新生成一条替代回复，也没有删原来源字段；后续继续正常总体决策。

当前仍须观察新subject-v1 Teach、完整军表／Plan、受影响复审与P6最终发布／对战交接。**正式Plan0/6、游戏0/12，T27 5/6／T23 33/36，相关余4Slice不变。**

### 后续实际提交截点

同PID15211运行3分19秒时，从头写表已真实r1→r2，仍5单位／960矿：这是消费任务／地图事实后修改Plan，不是满分军表。r2 discovery与预算工具正在执行。PID15212同截点仍r3／2000矿，刚完成的新事实进入来源审核。两精确PID均存活，不能因为等待模型而重建；subject-v1 Teach尚未据此观察为通过，最终数字不变。

## 两条新工作流用量截点（不重置旧账）

按同目录trace中的唯一replyId计已知usage，按固定Flash配置和仓库冻结单价估算，非服务商账单：

| 工作流 | 已知回复 | 已知Tokens | 冻结单价估USD | UTC截点 |
|---|---:|---:|---:|---|
| editable／M86Cg9 | 70 | 3,388,881 | 0.436919238 | 2026-10-19 21:10:35.524 |
| fixed／I7zekC | 190 | 14,231,927 | 1.875165192 | 2026-10-19 21:10:32.373 |

这只是两条新流程的累计截点，不是全项目总账。原超时未知费不计为0，也没有包含进上述有usage估算；旧Run及旧未计价项保留。后续请求继续累计。v648–653定点验证均0真实Provider，不重复运行已通过门禁。
