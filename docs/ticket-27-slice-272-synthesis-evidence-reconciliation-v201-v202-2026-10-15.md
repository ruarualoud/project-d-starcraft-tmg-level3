# T27 / S272 — v201–v202 汇总证据来源修复

日期：2026-10-15。承接 v200 一次真实调查；本轮 **0 新模型调用、0 Native 执行、0 草稿/Plan/房间写入**。

## 修复结果

### v201：数值展示和读取统一

上轮把两条无法绑定的数值路径统称为“模型引用错误”，其中第一条归因不准确。本轮用实际已付费回复复现：

- 模型实际看到的投影视图包含 `nativeActionEvidence[0].nativeEvents[0].resourceCost = 1`。
- 原始回执的相同值位于 `sourceReceipt.nativeEvents[0].resourceCost`。
- 旧限定器只读取原始结构，因而把模型引用的真实展示路径判为 unknown。

已修正 `qualifyRosterTeachFrameworkSynthesisV1`：先读取原始回执/既有显式 child；未命中时读取**同一回执的同一个确定性展示投影**，按完整路径精确绑定。记录 `bindingView`，不改模型原路径、原回执或原答案。每份回执投影在该次限定中缓存。

不是按字段后缀猜值、不是换另一份回执找同名数字。未知回执、缺失路径仍 unknown；绑定一个支付事实也不会改变模型的 whole-question disposition。

具体门禁 `verify-slice272-projected-numeric-evidence-v201.mjs`：

- RED：实际展示路径被旧实现判 unknown。
- 修源后唯一 GREEN：原支付值 1 正确绑定；另一个控点路径、虚构路径和错误回执仍 unknown；原数据与原 unresolved 判断不变。
- 原证据来源：`41bd700e19af5402ff41fb0b6cc1a24a155de7e11b180b1c5117fd811a57aace`。
- 记录：基线 build 下 `common-v201-projected-numeric-{red,green}.private.json`。

### v202：按问题组织当前证据，区分历史模型判断

通过真实 `projectRosterTeachRolePromptV1('teach_framework_synthesis', ...)` 接入，不另建平行生成链路。

旧输入分离摆放“问题与假设”“所有回执”“多轮历史未解理由”；新输入结构为：

1. 保留完整 Plan/context 和 Teach framework/coverage。
2. 每个问题保留原问题全文，明确其原 claim/assumptions 是待检验的模型假设。
3. 同一个包内列出该问题的真实回执和实际查询；未匹配问题的回执/查询也保留，不能静默丢失。
4. 历史调查理由/未解结论单独保留，标记为历史模型判断，不当作当前工具事实。
5. 要求区分已观察事实与具体未测条件；条件实验不证明所有局面，具体支付也不应无故升级为一般支付定理。战略选择和最终 disposition 仍归模型。

没有替模型填“已解决”、没有删除旧失败、没有注入兵种优先级或保守/进攻偏好。这个修改验证了输入组织和证据保真，**尚未验证模型实际采用新输入后的判断效果**。

门禁 `verify-slice272-synthesis-fact-boundary-v202.mjs`：

- RED：旧输入仍是未分类的旧假设/全局证据列表。
- 第一次修后检查：成功支付与错误 Assault 请求均正确归位，但旧通用大对象投影把重复历史转成外部索引，历史 hash 不相同。
- 来源修正：`historical_investigation_claims` 保持完整内联，只有后续同一提示词内的无损引用去重可作用；不要求没有工具轮的汇总角色再查外部档案。
- 最终 GREEN：8 个问题、52 份证据和全部查询/历史/Plan 均保留；真实 CP=1、条件父状态和 `provenArrivalHistory:false` 仍在；错误阶段拒绝没有被成功覆盖；无源修改。
- 实际投影约 2,312,890 bytes，不是新的容量限制或性能达标声明。
- 记录：基线 build 下 `common-v202-synthesis-boundary-{red,green,final}.private.json`；其中名为 green 的中间记录实际 `ok:false`，最终以 final 的 `ok:true` 为准。

本轮没有重复已通过 v201 门，没有跑无关全量测试/构建；两个源文件由上述新门实际导入。v202 总共三次（原始 RED、修后发现真实历史投影问题、来源修正后 GREEN），没有第四轮。

## 仍未完成

1. 第二条控点引用确实缺一层：引用写 `sourceReceipt.result...`，实际查询结果在 `sourceReceipt.queryReceipt.result...`。本轮没有自动猜测/改写该模型引用或认可其数值。后续必须让局部引用纠错使用明确的返回结构；不能再把这件事与第一条展示合同缺陷混为一谈。
2. v200 的保存结果仍为 unresolved，B Plan19 未改。仅修代码不会自动改写旧付费输出，也没有重新购买汇总。
3. 当前 launcher 没有“已完成 Teach 只重新汇总”入口；现有 flags 多是查询/调查恢复。后续若需模型复核，应增加受控的同证据汇总入口，保留旧 synthesis/history、限定次数、不要重放查询/重开调查，不能手动删字段伪装恢复。
4. A 的未解尚未获新证据。四组对局继续停；不得由 B 的单个支付成功推断 A/B Teach 已通过。
5. 对局、地图其余范围和复盘目标不缩减。当前 T27 5/6、T23 33/36、主线剩 272/248/249/250 共4片、完整验收对局0/12。

## 本轮 diff 摘要

- 产品：`roster-teach-framework-v1.mjs` 加同源展示路径绑定、汇总角色归并接线、历史内联保真。
- 产品：`roster-teach-fact-probe-v1.mjs` 加 `reconcileRosterTeachSynthesisNodesV1`；独立事实调查角色与一次性授权逻辑不变。
- 新增两个脚本只复现上述两个具体失败；不改变对局/规则/地图。
- 更新本报告、v200 归因补注、CURRENT_WORK、根 TASKS/PROJECT_MEMORY。
- 无提交、删除、依赖安装、子代理、官方数据更新。

## Harness / 离线 Teach 边界

- harnessLoopUsed: true
- targetGames: starcraft-tmg / 当前冻结源
- promptPackRoutes: teach_framework_synthesis；事实查询角色未重新运行
- harnessToolsCalled: 保存的原生回执只读检查、生产投影/限定器定点执行
- uiTraceEvidence: 无新增网页操作或截图；不是 UI 验收
- agentDecisionEvidence: v200 保存的公开回答，保留原 unresolved
- memoryTraceEvidence: 全部历史调查理由保留，未写策略记忆
- trainingTraceCandidates: 无新晋级；trainingTruth=false
- rollbackOrDemotionRules: 若展示路径解析跨回执取值、把条件事实升级为全局结论、丢历史或改变模型 disposition，则不准出；真实模型效果未证实前不启动对局
- userVisibleChecks: CP 数值可正确读出，但整个 Teach 未假称通过；费用增量为0
