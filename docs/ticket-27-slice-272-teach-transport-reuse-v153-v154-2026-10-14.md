# T27 / S272 — 策略优先；Teach 参数与付费回复复用 v153–v154

## 最新优先级（用户明确指示）

先证明 A/B Teach 与后续实战策略流程正确。查询确实补齐策略依据时，必要耗时可接受。
性能主要关注**实战行动**是否显著劣化；不以离线 Teach 总时间或新增必要工作阻止策略修复。
仍记录模型/工具/纠错/本地开销和已知/未知费用，恢复时间单列；不以删除策略信息换速度。

顺序不变：A/B 当前 Teach 真正闭环 → 最终 Plan 验收 → 受影响工具在决策、执行、Plan修订、记忆/复盘的统一检查 → 四组同版新局。
T27 **5/6**，T23 **33/36**，主线余 **248/272/249/250**，完整验收 **0/12**。

## v152 生产修复证据

B 已越过此前 `RETRY_AUTHORIZATION_CONSUMED` 假拦截，第二、三次调查真实返回：
675331units/44.532秒、984200units/43.372秒。不能把已发送/返回当 Teach 完成。
随后两次聚焦恢复返回3311units/13.960秒、3769units/15.201秒；本轮已知新增合计
4calls/1666611units，B累计 **205calls/24599578units**，原不确定费用仍保留。

06:29:18Z B 因 `ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID` 明确终止，不是断网，也非服务商未返回。
实际付费原文已经落盘，原Plan19未变。A原host73039/observer72697仍执行，未因B重启而中断。

## v153：同一控点假设的两种传输形式

实际 B 将完整 `{sideKey,windows}` 放在 `inputs`；工具只解析 `argumentsJson`，在规则计算前失败。
修复共享实验室入口，完整等价的 typed inputs 可无损进入同一任务计分器；写表参数规范化保留此对象，不再提前抹掉。

- 不改变回合、玩家、控点集合或金额，不产生缺失假设。
- 两个输入容器都存在时必须一致；明确 JSON 错误不会被另一个容器静默覆盖。
- 实际结果与 canonical JSON 输入逐项一致；计分仍为有条件的规则算术，不是到场/实际控制/胜负证据。
- 缺失回合仍 unknown，双方冲突控制仍 unknown。
- 回执记录转换，原请求/付费记录不修改。

同时发现中间层只接收 `pregame_scene_scenario_input_v1` 的纠错说明，遗漏数学合同。
改为接收本地拒绝方拥有的结构化说明（来源合同、同错误码、correctable、非空failureTargets），
不再逐个添加错误名；权限/来源错误不会因此转成可纠错策略输入。

定点验证 `verify-slice272-control-schedule-transport-v153.mjs`：

1. 首次调用漏传base参数（84087），未进入产品；正确调用的旧夹具把诊断时空间枚举也禁止（84356）。
2. 仅隔离无关的错误上下文枚举，真实数学/证据入口复现 `CONTROL_SCHEDULE_JSON_INVALID`（85012）。
3. 修后85991前两项通过：实际B请求、Teach/直接/写表计算完全一致；随后发现上游数学纠错说明被吞。
4. 修正传递后，仅跑尚未通过的反馈/unknown边界（87389），PASS；前两项不重跑。

证据：`common-v153-control-schedule-red.private.json`、
`common-v153-control-schedule-green.private.json`（保留部分通过/失败记录，文件名不代表通过）、
`common-v153-control-schedule-feedback-green.private.json`。
0 Provider/真实Native动作/Room/原工作台写入。这不是模型策略成功证明。

## v154：嵌套查询字符串使用既有容错，而非重购答案

实际 B 的已付费回复包含多余闭合括号，且在 `toolRequestJson` 再包一层同名
`prerequisite_query` 外壳。外层结构化JSON通过，内层原先直接 `JSON.parse`，所以终止。

复用已有 `normalizeProviderJsonDocumentV1`，不另写语法修复算法；仅剥离明确重复的同名传输外壳。
非空 edits/未知兄弟字段不丢弃，未完整的值不补造。验证和执行使用同一解码函数，
保存原始付费回复及转换记录；不增加查询选择/重试额度，不把辅助读当原战略问题的答案。

真实纠错回调和执行交接缝隙：`verify-slice272-nested-query-reply-v154.mjs`，
真实原错误 RED →唯一 GREEN，均0 Provider/Native/Room。
证据文件 `common-v154-nested-query-{red,green}.private.json`。

唯一GREEN证明：原付费回复可通过真实语义校验并交接**相同**辅助查询；原失败问题仍未回答；
非空额外编辑/不完整文本拒绝。测试替身只返回辅助查询回执，不证明真实场景战略。

## 运行交接（动态，以实时文件+进程为准）

- A仍v152：observer72697 / host73039；06:38Z running/read_only_queries，持续自动纠错，不重发/不重启。
- B v154：observer92799 / host92886；使用原离线工作台，计划先本地重验已付费回复，再继续尚未完成的查询。
- 进度：`common-v152-A-teach-fix-resume-progress.private.json`、`common-v154-B-teach-fix-resume-progress.private.json`。
- 未启动任何Room或Plan apply。正在运行的A未热换模块；下一自然边界再加载修复，不能称两离线host已全量同版。
- 06:41Z四句柄实活；A119calls/20690702units，B205/24599578，均running/read_only_queries。
  06:42Z B存盘pending回复还未标记重验完成，不能把本地门通过冒充实际工作台已复用；
  保留 `common-v154-B-retained-reply-observation.private.json`，继续观察同一host。

## 尚未闭环的实际战略问题

A当前恢复已暴露：机会成本误用budget_fit后模型defer；部分场景修复仍重复包装；
控点follow-up工具family写错，即使辅助读得到Native控点结果，原问题尚未合格关闭。
这些保留为未解，不用成功查询数代替战略证据。新解码能处理重复外壳，但不保证模型选择正确查询或几何位置。
需继续观察当前流程，最终检查Teach回答和Plan是否真实消费、对手假设/取舍/重规划依据是否完整。

## 本轮变更与边界

四产品文件：实验室参数解析、写表参数保留、Teach纠错反馈转交、查询恢复复用既有语法容错。
两个具体bug复现脚本；既有launcher允许明确的已存付费格式错误从断点恢复。
文档/进度更新；无代理、安装、源更新、删除、提交、无关测试或通过门重跑。
`harnessLoopUsed:true`；StarCraft Teach/query recovery；`trainingTruth:false`；无Skill晋升或策略成功宣称。
