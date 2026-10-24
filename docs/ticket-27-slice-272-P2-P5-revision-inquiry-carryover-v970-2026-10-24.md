# P2/P5：Plan修订后继承真正导致修订的调查

2026-10-24，T27/S272。T27 5/6、T23 33/36，余4片；正式Plan0/6、新局0/12。

## 失败与原因

B/r22的Teach和后续作者重新提出marine-1到达轮次、标记控制调查，却没有明确收到导致r22的原调查结论/来源控制争议。原调查曾实际执行初始化、部署、Go!Go!Go!，最后只证明限定移动与后继菜单，未证明最早到达。它的来源审核认可已测事实但拒绝“能力不可用”的解释，已交回战略作者。

原继承器只沿调查→决策→调查关系走；全新revision的Teach没有调查根，直接返回null。Plan旧绑定还会过滤掉该版本之前的责任链。已提交的Plan确实保存了引用目录，但目录不等于传递了原问题、停止原因和结论。三种原因中，本轮证实的是跨提交因果边缺失及历史读取范围不完整；模型是否仍会重复，另用真实请求验证。

## 修改现有共享实现

- `roster-workflow-investigation-evidence-v1.mjs`：沿当前真实`draft_committed`事件、对应作者及提交回执增加只读因果边，复用原责任图；不按关键词/相似问题猜关系，不扫描所有同军表实验。携原问题、未解项、来源控制争议和已保存工具索引。
- 军表/规则/地图/场景源相同的前序记录可被发现；原Plan绑定、状态和可证明范围保留。工具索引不重执行，不自动确认成功或当前适用性。单操作选择/纠错角色不扩权。
- `roster-workflow-evidence-lineage-v1.mjs`：Teach、作者、普通调查共用该继承器；将原结果与原已发布证据逐值核对后，直接交付准确`experimentConclusion`及来源审核`checks`。它们仍是历史解释/审核，不升级成Native事实或当前Plan批准。

没有新的平行生成流程、Host策略选择或模型输出改写。v969的关闭回执合同修复一并载入，但未复跑其验证。

## 单步验证

`scripts/verify-slice272-revision-investigation-carryover-v970.mjs`：

- RED56489：真实当前Teach丢失导致当前Plan的原调查。
- 一次GREEN57450：同冻结r22的真实Teach/作者输入经实际角色executor构造，发出请求确实含原未解结论、原问题与来源审核；新调查也继承同链来源。错地图、错当前提交事件、单操作选择角色均不会获得该扩展。
- 0Provider/Native/生产写，原状态不变；没有重跑已通过门。
- 日志：`build/slice272-v970-red.log`、`build/slice272-v970-green.log`。

## 原产品恢复观察

确认43040不存在，原B event11220/r22、0running/0pending后，使用同HTTP产品runner的`--resume`启动 **PID57943**，日志`build/slice272-v970-causal-inquiry-1792776619840.log`。没有重建房间、重买旧成功回复或追加实验轮数。

准出观察：实际新角色应消费原结论及停止边界，复用已保存状态；如需继续，应指出新的可观测差异或改变方法，不能原样重做已停止的初始化/部署/移动链。发现无新增证据/决策的重复即停。工程交付已证，真实策略收敛和最终产物仍待。

### 已发生的真实推进

同PID57943、同B/r22：

1. v969关闭请求进入独立审核。三次实际调用（读取、初次结论、补读引用后的确认）得到结果`ed1a52b102a192bf71462aca458fde5901db2bc52aa52e90829b13efab4d9fb3`：三个关闭条件及20条理由检查支持。
2. **event11257实际保存optional_comparison_closed**，报告`b1689547412d3ffc0494aa2a1215620397e01653c1acd0856b38a90b3aa1a966`。这是保留取舍后的可选比较关闭，不是测完未测配置，也不是全Plan通过。没有新火力实验。
3. 原地图调查第一次新请求`8a78c48de1a34fc3b0f70abcfffe3f889cb4842f4f6d324bc1ffd2b7156899fa`已实际包含3条控制返回、16个原工具入口，以及原结论/来源审核正文。共499586字符的promptNodes，不能宣称整体输入已足够小或策略无损提速。
4. 回复`4243f38406496cad6c82af2887b378b723bb4764ffe3432e5959ff37d1c4617a`选择读取当前部署/得分章节、已有计分权威、工具参数合同及旧到达结论；尚未提交新workOrders，没有重做初始化或动作。此处证明真实交付/主动读旧材料，不证明最终未知已解决。

截至该回复4次真实调用共710307units，Provider延迟合计55.008秒；全链路耗时明显更长，不能混用。原账保留，无新Native/新房。最新event11267/r22仍同进程继续，下一观察读取后的具体方法或控制结论，发现无进展重复立即停。

## Harness边界

harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=local_teach/strategy_decision/experiment_planner；harnessToolsCalled=原件读取与同产品角色执行器；uiTraceEvidence=无新UI。agentDecisionEvidence=原r22重复调查与后续真实观察分开；memoryTraceEvidence=提交因果链、历史绑定及未解项保留；trainingTraceCandidates=无。rollbackOrDemotionRules=错误因果链接/原件错配/越权/同题无进展重复即停；userVisibleChecks=报告能区分“已查但未知”“未查”“历史来源”和“当前已证”。
