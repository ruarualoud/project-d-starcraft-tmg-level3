# A 原房续跑：继续策略时不能丢弃未来安排

观察时间：2026-10-09 05:57 UTC。Ticket23 **33/36**、Ticket27 **5/6**；开放
248/249/250/272，共4片。完整终局仍0/3，不把局部修复算作整片验收。

06:00:55 UTC最新小快照：A已继续到r8/R1 Movement/running，游戏估费¥12.473462；
B仍r133/R2 Assault/running、已知¥98.727430。共享build
`ABC-after-A-future-plan-repair-observed-20261009.json`保存这一观察；下文r7为本修复的详细证据点。

## A 是否启动、计划在哪里

A已经真实启动并接受到revision6，R1 Movement；此前停的是Zerg对手的Omega Network规划，
不是Terran赛前v6未生产。军表和模型计划阅读版见
[A v6](ticket-23-A-v6-roster-plan-readable-and-priorities-2026-10-09.md)。
v6原计划/2000分军表/官方地图/两席历史均未重生成。

本次同一SQLite加载新源后，Web49676实际接入Host47200；原房drive0001
05:54:16Z启动，05:55:02Z只读HTTP200确认running；随后实际接受r7 Omega Network，
Receipt `74f37a9de84e8cc6341d7273724c2e7487129eebe370562d3029f69bfc2d7db7`、Replaytrue。
模型continue及为Corpser安排R2从Worm进场的补充随同实际动作保留，原停点已越过。
原房持久记忆sequence11为明确future_action_plan_amendment；后续sequence16/17的TurnPlan v2
均保留Kerrigan既有安排＋Corpser新安排。下一r7激活正在继续；
**一次合法Apply不等于策略有效性或完整对局通过**。
截图`0058-r007-player2-use_active_ability-complete-board-applied.png`已目视：
正式地形、Marine、Kerrigan与新Omega Worm可见；实际r6 Marine仍9模型，未改变军表。

私有恢复资料均在共享build目录、权限0600：
`A-r6-future-plan-source-entry.private.json`为wrapper，显式保存Web根目录、原计划存储目录、
预算和房间目录；`A-r6-future-plan-source-attach.private.json`为inner ready。
不要打印URL/token，不要从默认目录猜测这些恢复配置。

## 原因与修复

三次已付费原`submit_planning`返回全部写了：

- `assessment.verdict=continue`，总体策略继续有效；
- `plan.futureActionPlans`包含绑定**当前**Omega候选的消费者、时机、目标/路线、
  用途、收益/风险、前提、取消条件和后备方案。

旧消费路径在continue时只检查旧TurnPlan，忽略新futureActionPlans，再报MISSING。
不是模型没写、不是候选ID漂移、也不是native工具没返回。

新版Planner30/Prompt37–38允许**有明确单目标协议、当前Rules能力要求、同源当前候选**的
未来安排作为有界补充，不替换总体战略、不改变模型的continue判断、不编造安排。
Hosted Bot把补充交给TurnPlan；后者检查当前authority/basePlanHash/能力绑定，保留无关旧条目，
按model planItemId更新明确新条目，记录plan_revision及原continue评估。
完整内容仍接受既有语义检查，历史旧协议不默默改写。现有16项schema上限未扩大；本案只有1–2项，
本次不证明其它容量场景或所有未来能力均已验证。

## 聚焦验证及原房连续性

仅新增本案回归`verify-ticket-23-slice-248-captured-future-plan-continuation-v1.mjs`。
真实三份返回在submission→持久TurnPlan接缝复现：RED43205；源修后唯一GREEN44336通过。
0 Provider、0原房写入，原Paid全文不变；证明安排持久化、总体objective/strategicApproach保留、
continue保留、旧/缺失/过期绑定不发明安排。**不是完整normalizer、Rules合法性或策略验收**。
不重跑该绿门或旧门禁。

当前A两席全部28条terminal记录和完整初现态，before/closed/ready三快照保存。
6077零在途正常SIGTERM后，连续性49487唯一一次通过：完整初现态及两席19/9条记录严格一致，
0 Provider、无重建。启动准备曾错误使用默认Web目录及默认计划目录，两次均在模型发送前失败；
恢复原绑定目录后47200正常ready。失败原记录保留，不能称“无配置错误”或按失败次数算模型费。

## 当前三组与费用

| 组 | 当前观察 | 费用边界 |
| --- | --- | --- |
| A 固定表＋v6计划 | r7、R1 Movement，Omega Network Apply/Replay后持续running | 游戏已知¥10.636821；原规划¥5.054991另计 |
| B 从头写表＋计划 | r133、R2 Assault，同16909/Web20693持续running | 最近已知¥98.727430，另保留旧未知费用 |
| C 同固定表、无赛前计划 | r106、R2 Assault，原81004保留停点 | 已知¥88.929399，预测纠错仍待处理 |

三组各¥200、分别累计。达到每¥100通知，不清零旧账，不将未知usage算0。
本记录数字是有时点的快照；续行先观察原handle和progress，不据旧快照重复派发。
线上续跑不是零调用：A由28→33尝试，新增5个实际请求/1,642,180 units/估¥1.999107。
现有恢复器在Prompt版本更新时优先开启显式修复循环，先进行了新Planner请求；
不能把它描述为三份旧Planner全部本地重验、0线上Planner。原付费内容及赛前v6仍完整保留。
优先复用当前已合法旧Paid而非仅因Prompt版本差异重购的次序，是后续恢复效率排查项。

## 性能与遗留优先级

最近成功Agent动作A213.292s、B218.471s；C一次队形backend894.654s、整Agent1199.617s。
仍未达到整动作一分钟要求，也不是同case旧/新控制变量对比。
新增r6→7实测Agent93.140s、Preview4.549s、Apply6.546s、Replay30.397s，
四个核心阶段合计134.632s，尚未包含全部页面读回。资产求解8.835s；此动作同样不达标。
不能将它与不同动作的213秒记录直接当作受控加速比例。
现代码的队形后态比较已接并行worker，不能重复以“再加并行”作为无证据解法。
正式Room adapter尚未向生成/worker分段observer传入回调，所以当前只有整个query时长；
下一步应补可观测接缝并定位候选生成、Rules实例化、后态关系/伤亡及Replay，保留完整结果。

1. P0：A已越过原停点并持续；C动作前/后事实及条件预测边界修复。B持续原房产生数据。
2. P0：赛前请求完整转发（实际6个placement不应截4）、正确Teach分支、射击概率与冲锋工具语义。
   选定表进入实验室源已修，不重复旧绿。
3. P0：上述实际耗时来源与保持完整结果的性能优化；新真实动作计时而非重跑旧已过案例。
4. P1：用户新增统一排查——计划→执行闭环、概率unknown来源、计划不足如何Teach补全、
   检查器/模型共同协议；在已有修复之后完成，不用prompt塞预定策略。
5. P2：三组终局后统一工程/策略复核、截图报告、场景限定复盘、WikiSkill/EvoTest实验。
6. P3：其余18经典图、完整任务/规模矩阵、App真机，范围保留。官方9＋优先经典2不冒称全部20图。

## Diff与Harness边界

生产改动：`live-flash-decision-port-v1.mjs`、`hosted-bot-seat-runtime-v1.mjs`、
`turn-plan-runtime-v1.mjs`；一项具体回归、本文及工作/阅读记录。无全量构建、无安装/删除/刷新、
无代理/K3、无旧绿重跑、无提交（整片仍开放）。

`harnessLoopUsed=true`；game=starcraft_tmg；路由=harness_optimizer_prompt/selfplay_agent_prompt。
工具=原Paid只读、当前候选、普通Planner提交映射、持久TurnPlan/日志、同房Web drive。
原回执/每动作截图由既有runner继续留存。保留公开理由而非隐藏思维链；训练候选0、trainingTruth=false。
若新安排不能进入真实后续动作或authority绑定不齐，不能由这条局部门宣称生产闭环完成。
