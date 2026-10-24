# T27 / S272 P1/P3：原件与视图合同一致性 v913

## 实际发现

B r5 作者最后一份请求 `b3dbec0eee4ca581b41189e4bc4dd031e7e7e8c5ea079604318f526ca76439e2` 已包含正确的配置投影：#862 的 `marauder-2` 为 `small`，来源为军表 #696。模型仍把两个贡献模型解释成 large，属于错误推断；不是工程返回 large。

同一请求直接读取旧原件 #866，而非视图。旧原件本身没有新加入的 `comparisonMeaning`。已有读适配器只给旧视图升级，未给旧原件升级，因此两个合法读取入口交付不同合同信息。

实际数字：reference/left 为 Marauder 2.583333，candidate/right 为 Goliath 2.055556；difference 为 right-left=-0.527778。`satisfied=false` 回答的是“Goliath 是否高出 Marauder 0.5”，不能说成“Marauder 没高出 Goliath 0.5”。这也不证明两个配置符合原实验意图，或哪一军表整体更优。

在修复前，B 已将错误解释用于草案 r6 的一处 purpose 修订。这不是合格 Plan，也不算已证明策略提升。A 则把当前菜单不支持测量列为场景限制，未完成生存轴。

## 根因排查与修改

按 Harness/diagnose 分开判断三个假设：

1. 新合同未经过某种读取路径：**比较方向部分成立**；实际请求和原件可复现。
2. 配置投影关联错误：本次实际配置投影仍是正确的 small；未发现支持改成 large 的事实。
3. 作者覆写争议：草案允许作者提交修订，但不等于来源或正式准出；这轮仍须观察独立审核和争议回交的收敛，不能宣称已解决。

生产修改只有 `roster-workflow-read-context-v1.mjs`：旧比较原件、原件局部字段读取也通过现有同一个 `projectRosterMeasuredComparisonMeaningV1` 获得当前方向解释，走已有补充数据通道。当前视图不额外重复。原始文件和旧付费请求不改；不改变原数字、比较方向、策略权重、军表、规则或审核轮次。

## 本次直接相关验证

`scripts/debug-slice272-raw-comparison-delivery-v913.mjs` 使用上述实际 B 请求与 #866 原件。

- RED：实际 raw-root 读取没有当前方向解释。
- 一次 GREEN：实际 raw-root、predicate 子字段、assigned raw 三路均给出相同 named operands 与正反算术；子字段不冒充完整原件已读；未读来源不自动注入；历史原件不变。
- 证据：`build/slice272-raw-comparison-delivery-v913-red.json` 与 `...-green.json`。
- 0 Provider、0 Native、0 生产写。未重跑 v903 别名、v910/911/912 等已通过门。

这是传递修复，不是保证模型必然正确解释。配置错误仍须用新的真实回复和来源审查验证；不以字段存在或门禁通过替代真实策略产出。

## 恢复点

旧 A87859/B87866 收到 TERM 后完成当前操作并退出，两组无在途请求：A6079/r3、B5843/r6。随后原目录同版启动：

- A98625，`build/slice272-v913-source-delivery-fixed-1792703948547.log`
- B98632，`build/slice272-v913-source-delivery-editable-1792703948550.log`

不重建房间、不重放成功工具、不清费用。下一步检查新请求是否包含方向补充、新回复是否正确处理 small 配置及原问题。正式 Plan 0/6、对局0/12；T27 5/6、T23 33/36、余4片不变。

## Harness 记录

- harnessLoopUsed: true
- targetGames: starcraft-tmg
- promptPackRoutes: workflow strategy decision / experiment planner / source review
- harnessToolsCalled: 已存原件、请求、共享读取投影；未调用新战斗工具
- uiTraceEvidence: 本轮未操作 UI
- agentDecisionEvidence: B `30d3b62c…`；A `709c3425…`，均非最终批准
- memoryTraceEvidence: 未发布条件结论或 Skill；v912 归档门仍不允许未通过结果进入已审层
- trainingTraceCandidates: false
- rollbackOrDemotionRules: 若补充改变原数字/对象或授予额外来源权限，停止使用该读取补充；若真实解释仍错误，继续来源/状态机定位，不伪称收敛
- userVisibleChecks: 中文明确区分草案推进、工程修复与合格策略产出
