# Ticket 27 / Slice 272 — A 自动定点纠错与增量验收

## 为什么先前没有继续纠错

不是A v5的两条修订没写进去。历史修复回执列出两条替换，第四次完整审核也确认这两条旧High已消除；第四次审核另外将原来未修的Supply Depot用途句判为High："keeps this 12-supply opening legal"。原生进场日程是R1容量6/实际投入6，累计投入6/8/9/11/12，到R5才为12。

代码接线的缺口：Agent-selected journey具有审核→High入队→修订的循环；固定表A仅使用独立revise/review接口，新High只成为阻塞结果，没有自动接续修订。已有三轮停机约定也禁止继续无界请求。此前停下是在执行上限，不是同一句反复修却没有写入。用户本轮明确授权一次定点修正及相关验收。

## 本次修复

1. 新增共用 `repair-reviewed` 产品接口，固定表和Agent-selected的已审核计划均可进入同一个自动流程。读取当前High及历史未闭合欠账；模型只改命名文字；自动等待修订、再调用增量审核、最后检查High/欠账。默认仍遵守原三轮总审上限；本次额外授权只增加一次修订/验收周期，不清零历史。
2. 增量审核从服务端保存的父计划/完整审核取基线，而不是接受调用者注入的“通过证明”。非文字依赖、当前资料/回执事实、全量主张身份及既有覆盖不变时，只送发生变化的主张；仍携带完整跨主张索引和权威事实。未变主张保留旧发现及父审核出处，不能把部分检查改名成全量新检查。
3. 已有完整V3审核可通过原保存的本地请求context恢复事实依赖；新审核显式保留事实依赖摘要。只在计划纠错边界使用，不增加每个对局动作的全量hash扫描或规则查询。资料/军表/日程等变化则在付费前拒绝不合法复用；不会悄悄改成全量付费重审。
4. 自动任务、阶段、次数与完成/阻塞原因持久化并投影。取消/暂停或模型/传输失败不无限重发；断电留下明确中断。"可能已收费但结果未知"不属于可以盲重试的语义纠错。

此接口解决本次A的完整自动纠错过程；不是宣称所有UI按钮已切换到它，或所有幻觉/传输错误从此都能自动消除。S272完整产品/对局比较仍未收口。

## 唯一门禁

使用实际A v5的私有捕获，不改原草稿。诊断v6只在测试内构造，没有写入产品计划：原代码单句变化仍发7片/50条审核，RED一次exit1；修后只发1目标/复用49条，GREEN一次exit0，保留未改发现、旧审核hash及原三轮限额。事实依赖漂移在任何发送前拒绝。同期验证自动修订→增量审核的接续并导入受影响服务/HTTP模块。没有另跑语法、旧绿或全量。

## 真实验收结果

只发一次 `POST /sessions/:id/repair-reviewed`，返回202；任务 `cc7b1e4e-960e-4cee-8f30-cc16ff804669` 自动完成1周期。实际模型生成Plan **v6**，hash `badb2eb6…e545874`，随后自动审核1个Supply目的主张，复用49条；全索引50条的来源保持可追踪。原4份审核完整留在历史；当前新审核 `16e440ae…f1b5459`，**有效High=false，修复欠账0**。没有开发者手写计划或人为降级这条High。

模型实际修订中保留了用途，并明确写出："round 1 capacity 6 with committedSupply 6"、"cumulative committed supply reaching 12 only at round 5"，不再称R1为12供给开局。军表、完整进场日程、preset绑定、资料版本、资源预算、对手假设、反制、触发条件和引用列表逐值不变。其他Medium/Low仍记录，不以本次修正证明策略一定优良。

从2026-10-10T16:25:27.824Z至16:26:12.455Z，真实任务约 **44.631秒**；2次模型调用，35,640输入+1,515输出=**37,155units**，模型回执延迟合计12.897秒（不是完整任务墙钟）。新增保守估费 **¥0.050040**，A累计 **¥97.210048**；B **¥157.089339**、C **¥137.766074**，每组¥200继续累计，旧未知费用预留不清零。

## Diff 与证据

- 新增 `packages/roster-planning-workspace/reviewed-plan-auto-repair-v1.mjs`：共享有界自动纠错。
- `roster-planning-workspace-service-v1.mjs`：持久化自动任务、读取原生父计划、接增量审核、重启中断留档。
- `roster-planning-workspace-http-v1.mjs`：新增自动修复202接口。
- `roster-final-plan-review-v1.mjs`：原完整审核路径保留，增量目标及父覆盖复用。
- 新增一个具体bug脚本；更新CURRENT_WORK、TASKS和耐久记忆。C只补录驱动属于本轮另一已交付项，不重复验证。
- 私有捕获/RED/GREEN、授权/开始/完成及费用：共同baseline的 `A/auto-plan-repair-{red,green}.private.json`、`A/auto-repair-v5-{before,authorization,start,result}.private.json`。

共同源码升至 `s248-s272-auto-plan-repair-v5-20261011`，9个累计生产模块的出处见 `shared-code-auto-plan-repair-v5.private.json`；B/C后续从同一个集成工作树恢复，不能只改A。前端未改，不重建Web v2；旧房/旧paid回执/历史审查未覆盖。正式对局尚未在本页验收时推进。

T23 **33/36**、T27 **5/6**，余S248/272/249/250四片；新12整局0/12、旧0/3不变。接下来用v5共同源启动A带计划房、原B r26已付输出恢复、原C r37继续；任何停止仍全组安全暂停，修后再同版一起运行。原20图范围不缩减，官方9选定9/9不扩称所有配置通过。

harnessLoopUsed=true；routes=harness_optimizer/fact_probe；tools=实际产品修订/审核API、持久任务和paid回执；uiTraceEvidence=原C补录截图（A本次后台计划纠错无新网页截图）；agentDecisionEvidence=模型实际Supply修订及独立审核；memory unchanged；training candidates=none/trainingTruth=false。依赖变化、不完整覆盖及未知出网结果不得被解释为通过。
