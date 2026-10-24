# T27 / S272 — v207 类型化证据与原工作台零付费刷新

日期：2026-10-15 CST。继续原长任务；上一轮定位了 v205 保存回答中的三条假 unknown，本轮修来源和实际消费，没有重跑 v205。

## 已交付

**三条引用 unknown 均已消除，且原 B 工作台已持久采用当前结果。** 这是证据读取修复，不是替模型改战略、接受 Plan 或启动对局。

根因有两层：共用读取器只接受数字；生成合同只有数值引用栏。结果是正常的概率对象被当作缺值，正常的文字状态也被当作数值失败。三条错误不是规则查询没算出来。

### 统一类型绑定

新增小接口 `readRosterTeachTypedEvidenceV1(root, path)`，由既有汇总限定器调用：

- 有限数字：原样绑定，0不会变成unknown。
- 原生概率对象：只识别现有 combat-estimation 的完整表示（value、percent、successes、denominator、uncertainty95）；校验一致性后读取标准0–1的value，同时保留原对象、样本数和置信区间。
- 字符串/布尔值：进入独立 `qualitativeEvidence`，不强转数字；`"0.25"`仍是文字，false仍是false。
- 任意 `{value: ...}` 对象不被猜成数值；混合类型/缺字段的通配符结果不偷偷过滤后放行。
- 仍只绑定同一回执、显式sourceReceipt子节点或确实交付的同回执视图；不借其他局面、不按同名字段搜索。
- 不存在的路径、不支持的类型、未解决的源回执分别返回准确原因及局部结构反馈。不能因它们都无法生成数字而统称路径不存在。

新输出合同增加定性证据栏，原公开回答保持不变。旧回答中的文字引用可在派生视图中按真实类型归类，携带 `citationPlacement` 说明原栏、原索引和路径。所有绑定都明确 `interpretationVerified=false`：值可读不代表模型解释正确。

绑定版本5统一新生成、旧工作台完成态刷新、Plan修订消费。没有为三个案例写单位名/场景名补丁，也没有注入战术排名、风险偏好或改规则。

### 本次实际读到的内容

| 保存的条件实验 | 原错误 | 当前正确消费 |
| --- | --- | --- |
| Goliath Autocannon → Raptor | 引用停在概率对象 | value=0.972222…；35/36样本，97.22%；95%区间约85.83%–99.51% |
| Marauder Quad K12 → Hydralisk | 同上 | value=0.916666…；33/36样本，91.67%；95%区间约78.17%–97.13% |
| Marine缺席名单下marker1 | 文字塞入数值栏 | 定性状态 `no_contest_sticky_control` |

前两条是原假想清空地形场景的 advisory 伤亡概率估计，不是通用克制率、必然结果或重算的精确理论概率。这里没有新增采样。

## 定点复现与唯一修后验证

`scripts/verify-slice272-typed-evidence-binding-v207.mjs` 读取真实v205原稿，并从实际 Plan 消费接口进入，而不是只测一个人工数字。

1. 修前一次RED：两条概率在Plan消费中仍unknown，字符串仍在数值栏，准确复现两类问题。
2. 修后唯一GREEN，**1.680秒**：6项检查通过。

覆盖本次实际三条引用、Plan与工作台共用派生结果、旧付费原答/旧限定结果仍可读、重复派生幂等、数值0/布尔false/数字字符串不混淆、任意对象和混合通配符不猜值、错误回执/失败回执不成为证据，以及新Provider合同的定性栏。

没有重跑v201–v206旧绿、全量构建、地图/对局门；导入本次模块/合同的语法也由该唯一修后命令覆盖。0真实Provider、0Native查询、0源稿写入。

证据：

- `build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v207-typed-evidence-red.private.json`
- 同目录 `common-v207-typed-evidence-green.private.json`

## 实际工作台采用，不停留在单测

只读消费通过后，还需要持久化完成态的旧绑定，因为原宿主仍加载v206代码。这是不同的实际操作，不是再跑一次已通过单测。

`scripts/refresh-slice272-completed-evidence-bindings-v207.mjs`：

1. 检查原B已planned/Teach completed，没有活跃轮次、运行中审核或未对账请求。
2. 精确核对并停止本次已知闲置宿主86721，防止两个写入者；不动任何对局进程或文件。
3. 用原产品组合入口、原冻结配置、原B数据目录加载工作台，**不挂Provider、不挂房间启动能力**。
4. 调现有 `teachPlanFramework` 的completed快速返回路径，而非resynthesize/fact-probe；绑定4→5，旧限定结果进入evidenceBindingHistory。
5. 对比原Plan、全部旧费用/公开回复/dispatch、raw synthesis、初始证据、调查、恢复与旧synthesisHistory：均未改变。

操作进程33885，09:39:24.915–09:39:53.268 CST，实际完成28.353秒，exit0。报告 `common-v207-B-binding-refresh.private.json`。该操作只做原完成态绑定刷新，没有执行新的策略生成、Native查询重放、房间初始化或对局动作。用于读取冻结依赖的隔离实验室初始化，不是新建正式对局。

当前B持久状态：

- Plan19不变、Teach completed、synthesisReview completed。
- evidenceBindingVersion=5，14条数值/1条定性引用，unknown=0。
- 模型判断仍3保留/5修订/0未解；原话没改。
- applicationStatus仍proposed_not_applied，不能据此自动晋级。
- 累计256calls/36,328,314units，新增0calls/0费用。
- 旧绑定历史新增1项。维护进程已退出，没有留下新的运行宿主；后续启动必须读本报告，不能继续向旧86721/旧URL发请求。

## 尚未完成的战略与主线工作

三条引用修复不消除“伤亡后控制权”的解释问题：原回执marker1 previousControl=null、nextControl=null，证明的是该条件前态，而不是“原先已控三点、Marine死亡后必掉点”的完整历史。不能由Host改写模型原文或将这段无条件推论应用到Plan；下一步通过正常Plan修订保留其条件，再做相应准出。

仍须完成：

1. B五项Teach建议的实际Plan修订，明确控点前态/条件证据与历史转移的区别。
2. A原固定军表未解项及Plan准出（本轮未修改/调用A）。
3. Plan/实战/执行消费者同源核对、四组同版续跑及完整对照。
4. 报告和复盘实验；其余18经典图仍按用户顺序后置。

进度未虚增：T27 **5/6**、T23 **33/36**；主线剩 **272/248/249/250共4片**；完整验收对局 **0/12**。本轮是真实工程进展，不是长任务完成，也没有新阻塞/用户暂停。

## Diff摘要

- 新 `roster-teach-typed-evidence-v1.mjs`：单一类型读取模块。
- `roster-teach-framework-v1.mjs`：绑定v5、数值/定性分流、新输出合同、两栏局部纠错反馈；共享旧结果派生接口保持。
- `roster-teach-fact-probe-v1.mjs`：同源类型合同说明与解释适用条件，不改战略偏好。
- 新1个具体bug复现脚本、1个原完成态维护操作脚本。
- 更新本报告、CURRENT_WORK、根TASKS/PROJECT_MEMORY。
- 无依赖安装、网络模型请求、数据更新、子代理、删除或提交。Slice仍未收口。

## Harness / Skill边界

harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=teach_framework_synthesis及Plan revision消费；harnessToolsCalled=保存回执读取/共享绑定/原工作台完成态刷新；uiTraceEvidence=本轮无新UI截图；agentDecisionEvidence=原v205公开判断原样；memoryTraceEvidence=旧绑定和全部旧原答保留；trainingTraceCandidates=无，trainingTruth=false；rollbackOrDemotionRules=跨回执取值、字符串数值化、忽略混合通配符、未经模型修订变更战略均不准；userVisibleChecks=三条假unknown在原工作台消除，未借机宣称Plan或对局准出。

诊断技能促使使用真实失败消费接口复现；模块设计技能促使把类型处理集中到共用接口；Harness/离线Teach技能要求原答、条件及推广状态分离。
