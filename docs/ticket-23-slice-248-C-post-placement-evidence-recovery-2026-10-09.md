# S248 — C106 移动后预测事实与同房恢复

## 当前交付，不是整片完成

Ticket23 33/36，Ticket27 5/6；开放248、249、250、272四片，完整终局0/3。
A同房继续到13/R1Movement，B到137/R2Assault（只读SQLite06:22:16–20Z）。
C已实际107/R2Assault Run/Replaytrue，普通Web81153继续同房。
不得因状态接口超时重复派发或重建房间。各组¥200独立累计；B已知费用
在06:05:25Z达到¥100.675578，第一笔¥100通知已发，历史未知费用另保留。

## 实际错误与归因

C原paid Action三次预测Marine1本回合射击Raptor，依据包含移动前距离14821
milli-inches及AGG12/Rocket火力。它选择的18模型Raptor Run队形，原始工具
回执却给出移动后最近底盘边缘距离15431、可见model pair0、未知LOS0；
对手当前回合静止及移动后攻击profile列表均为空，未来回合另有profile。
第三次返回加了条件失效语句，但理由仍使用旧威胁事实。校验器拒绝该
当前回合预测是有来源依据的，不能直接删校验、替模型改时间范围或代选策略。

原纠错只给387字节的类型化失败代码，没有突出所选队形的前/后位置事实。
完整旧Prompt已按留存策略释放，因此**不声称恢复了旧请求全文或证明某行
根本没传**。本次修复的是当前真实Prompt构建器的事实分区与指代方向；
实际模型是否理解仍须原房后续Apply/Replay验收。

## 改动

- `live-flash-decision-port-v1.mjs`：只读导出同一个生产Prompt构建器；
  Prompt37/38→39/40。Action增加`post-placement-prediction-facts`节点，
  转发每个完整队形选项的所有敌我关系行，不截敌军。明确敌军actor是
  `targetId`、受击友军target是`fromUnitId`，当前与未来火力分别列出。
- 同份原始Formation Receipt及五个当前authority字段绑定；过期回执只给
  unknown、不提升为当前事实。缺失字段保留null，已知空列表才是空。
- 指令只说明证据时点与条件状态，原候选、队形、参数、规则语义校验和
  Paid返回保持；不加入策略权重，不修改Planner/Action normalizer版本。
- `verify-ticket-23-slice-248-captured-post-placement-prompt-v1.mjs`：仅复现
  这个捕获bug。使用实际生产构建器和原C106记录，非另一套测试Prompt。

## 唯一对应验证

共享build根：`build/ticket-23-three-arm-official-standard1-20261008-v1/`。

- RED65102：真实构建器缺少移动后事实节点，断言失败；不是夹具启动错误。
- GREEN67257：唯一一次修后验证通过；每选项敌我行逐项一致，方向、15431
  距离、空/未知与过期语义均通过，完整原fixture字节不变。
- 0 Provider、0原房写入、无旧绿/全量构建/子代理/规则或数据刷新。
- 范围仅`captured_prompt_evidence_seam_not_full_historical_prompt_or_model_quality`。

## 原房恢复与安全边界

原Host81004的drive0004已completed/blocked，原房106，双方0inflight。
FULL initial/current与ALL244终态attempt（94+150）保存于
`C-r106-post-placement-source-before-20261009.json`，67258一次完成。
71420正常SIGTERM确认旧Host消失，未取消任何在途调用；71698完成关闭后
快照。新Host71699用**同一原房目录**、原web-export及plan-workspace、预算200
加载新源。79516完成ready快照；唯一完整连续性80407通过，initial/current
及双方ALL244尝试逐值相同，0Provider/无新房。新入口与内层attach文件已保存。
普通Web81153于06:29:35Z启动，原房progress于06:31:25Z记录running/106；
下一实际Apply/Replay仍待观察，不将driver运行等同当前预测已修好。
入口就绪日志mtime测得冷启动411.862秒；先前轮询的约8.5分钟是观察上界，
不是精确启动耗时。该开销不耗Provider，但仍须优化。

## 余项顺序与性能

1. C原停点修后真实决策→合法Receipt/Replay/截图；A/B持续同房。
2. 已有赛前实验室缺口：真实六摆位被canonical projection截成四个；
   Teach单独wrapper的branchIdRef；缺attacker及把charge问题送射击概率工具。
   六摆位现在已修并定点通过，详情如下；Teach分支/概率语义仍未完成。
3. 分段定位/修性能：既有worker批比较已并行，不能把未接内部观测或
   同步候选生成当作已优化。A最近Agent93.140+Preview4.549+Apply6.546+
   Replay30.397=134.632秒，仍不达1分钟；C此前队形894.654秒更未达标。
4. 上述既有修复后，做计划→实际动作闭环归因、概率unknown与计划补全、
   检查器/模型同语义协议排查。工程High同步修，Medium记录继续。
5. 完整终局后做场景限定复盘/策略对比/WikiSkill/EvoTest；后置地图及App
   范围不删除、不因为优先图通过就计全部完成。

harnessLoopUsed=true；targetGames=starcraft_tmg；路由harness_optimizer_prompt/
selfplay_agent_prompt；仅公开决策理由，hiddenChainOfThoughtStored=false，
trainingTruth=false。回退条件：新事实分区与同份当前原始回执不一致，或同房
完整连续性不通过；保留原停点，不替模型制造安全策略。

## 修后真实对局补证（06:46Z读取）

原C106→107：18模型Raptor Run，Receipt `f89e8ec65bb2caa1…`，Replaytrue。
网页证据`C-r107-post-placement-actual-web-receipt-20261009.json`由95693只读
从原actions.ndjson抽取，无重新执行动作。全桌截图已目视检查：

![C107 原房实际 Run](../build/ticket-23-slice-248-standard-2000-aa-live-v1/official-standard1-C-no-opening-plan-20261008-v2/screenshots/0681-r107-player2-run-complete-board-applied.png)

89906原生Paid观察表明：模型这次明确引用post-placement节点，并自主改选
`0a1c8a3522445209…`队形，其当前Marine静止射击列表非空；模型愿为M4方向
及中央路线接受这份真实暴露。原失败选项及旧Paid全文不改。它不是被Host
强行改选安全策略，但此事也不证明该选择战略最优。原10个完整query receipts
保留，prompt-repair一次记录36→40。新增模型调用1（P2终态150→151），C总
调用244→245、估88.929399→90.213217，增量1.283818。动作trace内providerCalls7、
input2966301/output27968是该选择全部旧/新尝试累计，**不是本轮新增7次**。

实际阶段Agent100.526、Preview41.272、Apply60.536、Replay134.826秒，四段
合337.160秒，不含全部网页/读回；instantiate13.535秒已在Agent中，不重复相加。
三组并行下的实测，不冒称可控新旧性能AB。性能仍不达1分钟，尤其规则后处理
及完整历史Replay不是模型调用时间，后续按真实阶段来源优化。

## S272 六摆位具体修复

原B的`need-round2-scenario`含六个真实摆位，Runtime的canonical投影静默
`slice(0,4)`，把第五个Goliath与第六个Marauder丢掉，却仍给完整问题attached。
Schema已声明容量由实际场景piece分母决定，问题在运行时截断，不需改模型策略。

仅新增具体回归`verify-ticket-27-captured-scenario-placement-transfer-v1.mjs`，
用原B Foundation/锁定表/同冻结官方地图/真实Roster Runtime和实验室，停止
于Teach开始；不重跑先前已绿的selected-roster-lab门，不生成完成计划。
84215夹具把loader根对象误用为versionPins，提前失败，不算有效RED；修为
生产bundle字段后88216精确复现四对六且到达真实Teach入口。生产只取消
placements的slice4（跟随实验室自己的分母及校验，保留followUps合同）。
唯一GREEN92629通过：输入6→实际转发6→实际实验室摆位6，顺序/坐标逐值相同，
原保存输出不变，source0mutation/0Provider/0liveRoomWrites。

旧B计划及历史来源引用保持原样，不因为此修复自动改写它或全量付费重生成。
后续Teach补全要用新正确场景取得明确新证据和新计划版本；分支引用与射击/
冲锋类型仍是下一P0，不将这一步包装成完整计划/写表功能验收。

最新持久progress（06:46Z读）：A17/R1Movement/running/游戏37.803476＋原规划
5.054991；B139/R2Assault/running/已知103.629838＋历史未知；C107/R2Assault/
running/90.213217。快照是各自文件最新更新时间，不假称三者同时完成读回；
三组继续原房，无新房/重置/代理/全量/旧绿/提交。计数33/36+5/6/开放4/full0of3。

本批diff摘要：生产Action新增来源绑定的post-placement事实分区及现有构建器
只读别名；生产Roster Runtime删除一次场景摆位截断；两份具体捕获回归；
本记录、A中文计划及CURRENT_WORK/根TASKS/持久知识更新。片未关闭，不提交。
