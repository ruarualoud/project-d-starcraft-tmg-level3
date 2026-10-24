# v929–931：独立比较控制与真实关闭交接

2026-10-23，T27 / S272 / P2、P4、P5。不是正式策略完成报告。

## 本轮目标与边界

修复v928真实三次返回仍只改Goliath用途的控制缺口，从B原断点实际验证。保留原军表、Plan、事实、模型原件、费用与错误计数；不重建、不重算Native、不运行对局。A未启动。

T27 5/6、T23 33/36；正式Plan 0/6，对局0/12；剩余S272/S248/S249/S250共4片。以下局部证据不能替代这些最终验收。

## v929：选择操作与整段改写分开

实际失败先复现于[RED](../build/slice272-v929-comparison-control-red.json)。旧作者命令虽然有新字段，仍让模型自由输出`decide + revise`，三个后继全部null；约18.6万输入units中还重复携带全局审核历史和逐字段来源元数据。

新命令显式选择`investigate / redesign / request_closure / revise_strategy / block`，或只读取/搜索。所选操作必须携带对应参数，其他控制参数必须为空；关闭申请可同时纠正Plan，但仍需真实提交与独立审核。模型选择什么仍由模型决定，不由Host把自然语言转换成批准。

- 当前完整Plan、军表、比较目标、配置和真实读值保留。
- 全局审核队列与历史移至同一证据读取器的精确地址，未删原件。
- 295条exact-read结果按来源共享重复元数据；所有值、Pointer、状态、条件和顺序无损恢复，不把子字段读等同整个来源读。
- 编号问题只按模型的显式更新修改，其他必要未知原样保留。
- 新协议只对实际旧控制停点给一次具名恢复；不清零计数，不开放无限次数。格式与战略错误的全面计数重构本轮未实施。

首次GREEN入口暴露新action schema漏继承本项目字符串边界，尚未调用模型；已修正并保留[失败记录](../build/slice272-v929-comparison-control-green.json)。[补验通过](../build/slice272-v929-comparison-control-fixed.json)：6项定点检查，原输入不变、完整Plan保留、所有已读字段往返一致、互斥操作/未知/错源/在途/一次恢复检查通过。旧门禁未重跑。

## v929真实执行

B原工作流`decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，目录`build/slice272-product-generation-v645-8aBuEV`。从事件7500/r12恢复，真实请求确为`roster.workflow_comparison_control@1.0.0`。

- request：`d45f69962ef7162b6eec1429d1a1d657b76d0729dd5bea8e599ff871a63fc84d`
- reply：`2f9b40187302422a14f631cb2108ef4fbda5c0990a20af48afad685c7ff502fb`
- 模型首次明确选择`request_closure`，不是全null后继。提出保留现表、拒绝为大Marauder腾预算，并保留未测边界/重开条件。
- 同时仅把Goliath用途里的Builder引用1287改为1334，实际提交事件7510，Plan r12→r13；军表不变。**这是事实引用修正与关闭申请，不是战略改善。**
- 输入82,528、输出3,002、合计85,530 units；Provider19.975秒。相较上一作者命令185,605输入units减少55.5%；输出不同，不能当策略等价或整链性能基线。
- 论述仍存在“已决定／替换选择仍未决”、阈值方向与机会成本不足，尚不能批准。

[运行日志](../build/slice272-v929-control-live-editable-1792724335175.log)。PID17399已停止，不能当当前进程。

## v930：实际下游接线缺口

跟踪发现关闭申请已保存，但调度器没有排审核，又创建了r13事实返回任务。已安全停止原进程，保留该额外模型调用与费用，不删除记录冒充零浪费。

根因：冻结比较作者只绑定army/rules/map/source，故`author.bindings.plan`合法缺省；关闭恢复器却无条件把它与真实提交的`planBeforeHash`比较，错拒有效申请。此前注入测试未覆盖真实的缺省Plan绑定，不能据其绿灯宣称生产可靠。

修复：有显式Plan绑定时沿用；缺省时从**该作者实际收到的完整草案及revision**取提交前Plan身份，仍核对真实提交事件、前后revision、军表不变、当前Plan、地图/规则/来源。没有手补旧绑定、修改模型回复或批准关闭。

[实际RED](../build/slice272-v930-closure-plan-source-red.json)→[一次GREEN](../build/slice272-v930-closure-plan-source-green.json)：真实关闭申请可解析；错作者、错Plan、错revision、缺提交、地图变化均拒绝。之前已过检查未重跑。

从事件7580/r13同产品入口续行，复用原已付费申请，日志`build/slice272-v930-closure-review-live-1792724750040.log`，启动PID25306。审核实际结果另附；启动本身不代表完成。

## 修改文件

- 新增`roster-comparison-control-command-v1.mjs`：互斥控制命令、显式模型操作映射、精简上下文、无损来源元数据分组。
- `roster-workflow-semantic-repair-v1.mjs`：新命令构造/冷恢复解码，同原语义验证。
- `roster-workflow-correction-context-v1.mjs`：从实际原件发布精确背景地址，不截断事实。
- `roster-workflow-read-context-v1.mjs`：新旧读取编码共同记账，保持已读/未读语义。
- `roster-workflow-read-role-v1.mjs`、`roster-decision-product-journey-v1.mjs`：旧协议停点一次来源明确的产品恢复，不重发成功调用。
- `roster-comparison-closure-v1.mjs`：依实际作者输入和提交识别Plan-only关闭申请。
- 两个针对本轮真实bug的debug脚本、此报告及入口/任务记录。无全量构建、依赖安装、旧测试重跑、删除、子代理或提交。

Harness：同产品Run→独立控制→实际Plan提交→关闭申请解析→独立审核。仅记录公开理由；没有训练真值/已审经验晋级。若审核仍不通过，保留准确错误与来源，不用篇幅、字段或版本增长冒充收敛。

## v930真实结果：推进了操作，尚未收敛

真实关闭审核已读资料并返回，不是只有启动日志。结果`4f700c1ca59e082c170676dca09e07dd7adb623bc4860927b078bd36b2bbdbdd`，原回复`ecf62c2379d75f291d0d71287d3d371c76cf773f6cda781b4a990f233621db41`。

- 三项检查文字都标supported，但每项又包含两个necessary_fact和两个author_decision。核心`rosterReviewCheckPassedV1`不会把它们当通过，关闭没有获准，Plan没有发布。
- 审核复述了一个实质矛盾：小Marauder实测2.5833、Goliath 2.0556，反向比较+0.5278且satisfied=true，却又声称小Marauder未达到支持替换方向的0.5阈值。该单场景差值不强制换表，但不能被解释为未过同方向阈值。
- 预算满额只说明需要替换其他组件，不是选择保留Goliath的充分机会成本论证。不能因模型写了supported就批准战略结论。
- 全局的路线到达轮次、控制范围和其他未决选择被重复塞入局部关闭审核；应保留它们的全局职责，但局部审核必须明确它们与本次取舍的依赖，不能自动扩大审核义务。

同时旧r13实验续接仍获调度：事件7592/7603与7695/7706显示审核和旧分支同轮派发。旧分支最终连续三次被`native_fact_requires_current_executed_receipt`拒绝（证据1061，`/queryRepair/nativeRejection/rulesErrorCode`），事件7727自动blocked。它试图引用的是保存的Native失败信息，不可直接等同成功执行事实；需检查该类失败事实的来源合同，不能手改旧回复或把失败当成功。

**当前真实停点：B event7727/r13、2000分军表不变、0在途；PID25306已退出。A未启动。正式Plan0/6，对局0/12。** 未追加盲重试，没有把局部关闭当作全局通过。

## v931：审核与旧实验不能抢跑

新增定点复现`scripts/debug-slice272-closure-priority-v931.mjs`，直接读上述真实队列。第一次RED定位审核反馈决策不在显式优先队列；补齐事件7663/7706时旧分支ready状态的内存夹具后，[派发RED](../build/slice272-v931-closure-priority-dispatch-red.json)明确得到“审核＋旧实验”两个并行候选，而非只有审核。旧原件和生产状态未改。

修复`roster-workflow-graph-v1.mjs`：按当前比较cycle、purpose结果、作者结果、Plan/revision与显式关联，先单独派发关闭审核；完成后优先派发引用该审核的战略决策。不按长ID猜归属，不改变历史失败、不退休任务、不授予事实或Plan通过。

[一次GREEN](../build/slice272-v931-closure-priority-green.json)通过4组检查：真实审核独占、明确反馈接收者优先、错来源/Plan/revision/cycle不获取优先、完成角色不重放且原状态不变。0新模型/Native/生产写；已过测试未重跑。此修复尚未新一轮真实消费，不能声称它已经解决全部收敛问题。

## 本轮用量与后续交付物

从事件7500之后计11次真实Flash调用（含错误调度造成的额外旧分支）：输入1,806,992、输出23,095、总计1,830,087 units；Provider响应耗时合计153.495秒（非墙钟时间）。所有原回执与费用账保留；没有从units臆造人民币实付。v929单次输入减少55.5%不代表全链总成本已下降。

下一轮按以下具体交付物推进，不恢复用途文案循环：

1. **比较审核的结构化事实及范围合同**：明确左右候选、指标、差值方向、阈值结果，区分“允许保留的战略取舍”与“数值比较不成立”；局部关闭与全局必要问题分开路由，保留真实依赖。
2. **失败来源合同检查结论**：区分实际Native拒绝的原因证据与成功执行证据，复现1061为何被误用/拒绝后定点修复；禁止把失败候选当有效伤害数据。
3. **同产品断点的一次受控消费记录**：确认v931调度生效，再观察作者处理审核结果；只有实际收敛才推进正式验收。保留三次停止记录，不用新版本清零。

另应覆盖“无Plan绑定、retain不产生提交”的关闭申请路径：v930真实正例只证明Plan-only修订后的申请，不应把它外推成所有保留路径均已验证。
