# T27/S272：真实空表生产与计划构建前自动纠错 v44

## 当前状态与范围

T27 **5/6**（S272未关闭），T23 **33/36**；主线剩S248完整对局、S272写表比较、S249复盘、S250进化验证，共4片。完整有效对局仍 **0/12**。20张经典地图目标保留；18张扩展图仍在最后阶段，不能以已验收的官方9个/优先经典2个选定配置冒充全20张、全任务通过。

A固定Terran表＋Plan，B从空表生成Terran表＋Plan，C同A表但无开局Plan；三组完整Zerg表/初始配置一致，不独立生成Zerg开局Plan。本次另开的空表生产不替换正在比较的B军表，不创建第四个正式对局。

## 真实网页生产证据

从Web `/army` 新建Terran、2000分、公开对手Kerrigan's Swarm的空表会话；使用与现B相同冻结官方任务/部署及地图配置，不导入旧军表或人工Plan。

- 会话：`iterative-web-7b9fda78-964c-4053-8ee7-caade60a6b8e`。
- 新上下文v5实际生效：合法欠预算候选仍可查询战术/地图，未放宽2000分完成条件。
- 初始模型通过menu/map查询提出990分合法表，再选择补满后的2000分合法表。
- 模型在锁表前没有使用可选scene查询。只能证明查询机会恢复，**不能证明模型策略改进或新工具导致选表差异**。
- 实际进场审核及公开计划修订完成，自动转入Teach。
- Teach会话：`rws-0230ad87-258a-4c33-8eaf-25d3109fe5d4`。
- 已完成四条真实付费回复：Foundation、Teach challenge、Teach revision、preset plan deepening。尚未完成最终来源审核、正式Plan准入和新表完整对局。

证据目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/`。

网页截图已观察，不是占位图：

![空表配置](../build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/02-terran-2000-empty-roster-setup.png)

![2000分及进场审核](../build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/04-exact-2000-arrival-audit.png)

## 自动纠错为什么没有触发

第四条付费回复重复了两种组件身份：`unit:player1-exact-repair-3`及`upgrade:player1-exact-repair-3-upgrade-1`。两条追加叙述本身称它们是重复条目。不是父身份别名转换造成，也不是读取旧Plan；当时Plan尚未构建，版本历史为空。

旧最终Plan校验发现第一个重复后抛`ROSTER_PLAN_COMPONENT_PURPOSE_DUPLICATE`。工作台保存`automaticRetry:false`；Journey在Teach非planned时退出。后面的来源审核High→定点修正只接受已经建立的Plan，接不到更早的构建错误。四条Teach是生成轮次，不是四次纠错。

## 本次源头修复

仅两个运行源变化：

1. `roster-plan-contracts-v1.mjs`抽出共享组件集合校验；生成预检和最终Plan执行同一身份规则，一次返回全部重复键及索引。不静默去重、不改写模型策略。
2. `roster-strategist-runtime-v1.mjs`在comparison/preset deepening阶段加入已知输出合同错误的有界反馈：原回复、合法组件身份、错误详情、锁定军表/进场条件回传给模型，使用相同输出schema。最多三次总尝试；拒绝回复和修正回复各自保留。原付费请求/上下文保持不变，修正有独立确定性上下文，重启复用已有修正而不清零尝试数。

网络、凭证、未知出网结算、Rules/不可变锁漂移不进入这条文本修正通道。来源规则审核仍单独执行，校验与准入条件没有放宽。没有增加Skill、偏好权重或隐藏策略注入。

## 聚焦验证

唯一新门禁`verify-ticket-27-slice-272-precompile-correction-v1.mjs`使用这份真实失败草稿及四条付费回复，在实际Product→Workspace→Strategist恢复入口复现。模型修正答复使用本地假端口，不调用真实Provider或Room写入。

- RED PID50688：成功复现原`ROSTER_PLAN_COMPONENT_PURPOSE_DUPLICATE`，没有发出修正。
- 首次修复验收PID53646：测试答复只去掉单位重复，剩余升级重复进入下一次修正；夹具不完整，未计通过。
- 针对同一原回复补齐全部重复反馈后，唯一补验PID57023通过：一次本地修正、原四条回复保持原样、军表/进场哈希不变、再次恢复零新增修正请求。实际结果`precompile-green-v2.private.json`；真实Provider及Room写均0。

不运行旧绿、全量测试、无关审核或构建。这里的假端口通过也不等于真实Flash修正成功；仍须从原Web会话续接生产并观察最终审核。

### 真实Flash续接结果

原Web会话仅点击一次续接，02:36:41.020Z实际POST返回202；没有新建会话或重复run。只读观察器PID64403不会发起生成/重试，超时不会当作停止。

四条原付费回复全部原样回放、零新增付费。真实Flash一次纠错同时消除两处重复，输出37个唯一组件用途，成功构建Plan。模型纠错26.777秒，输入21,342/输出6,993/总28,335 units，缓存命中12,928；估算¥0.043973–0.087947。证据`actual-precompile-correction-v44.private.json`。

锁表Teach产物的军表/进场哈希与原锁完全相同。随后既有Agent晋升桥将`locked-preset-*`技术候选身份重绑回`terran-hold-position-2000-v2`，因此候选ID及其依赖哈希改变；已逐字段确认单位/升级/卡牌/Rules审计及进场事实均不变。这是既有显式身份晋升，不是模型重写军表或哈希漂移阻塞。

后置来源审核正常接通：第一轮发现Marine单位规模被写成大底盘，自动修正这一用途；第二轮要求战术卡用途明确第二Marauder/第二Goliath的进场时间，自动修正两处。两次修正覆盖所有当轮High路径，军表和进场安排未动，无人工策略补写。第三轮02:46:11.974Z完成，仍有1 High；按三轮规则停止，没有买第四轮，不能正式准入。

### 独立停止报告：来源审核仍未收敛

02:46:13.683Z Journey终态`source_review_nonconvergent`，`canEnterRoom=false`。剩余路径`componentPurposes.player1-tactical-2`：单个Goliath“answers … any Omega Worm flank”且生物主力保持marker1/3/5，被审核视为未获准确位置/编队证据支持的确定承诺。这是后续来源审核的停点，**不是重复字段修复失败**。下一步先核对整段语义、工具unknown来源及High分级是否正确，不盲目加第四轮，也不人工改写模型策略。没有因此停止使用既有已审核Plan的ABC。

终态证据`production-terminal-v44.private.json`，网页`07-source-review-three-round-stop.png`。新空表生产累计34条完整保留付费回复，3,484,623 units，估算¥4.394093–8.788186，仍非服务商最终账单；其中本次结构纠错只占一次/28,335 units。三次审查各6分片、两次来源定点修正由同一Web Journey自动完成。

![真实纠错后进入来源审核](../build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/06-real-correction-source-review.png)

## 原三房安全停点

v43r1同源网络恢复后实际推进；本次为统一源版本主动请求全停。2026-10-13 02:21:42.778Z完全封口：Native A r38、B r31、C r51，均第一回合Assault。C网页最后进度r50，但Native已封口r51，以Native为准，不从头重跑或回退合法动作。

仅原房Host先安全退出，再关闭本次挂起的A/B浏览器清理PID；PID出生时间/脚本/原房目录已绑定。无房间、骰子、记忆或历史删除。门通过后已启动v44同版原房Hosts A61154/B61155/C61156、startup61158；写表原会话Host61159。配置/manifest59源及启动/监控文件均使用`common-v44-*`；真实Web准入、下一Apply和真实模型修正另补证，不把启动当通过。

02:35:23.691Z原房Web A62315/B62316/C62317与monitor62318实际准入。02:43:24Z已推进A43/B35/C57，C进入第一回合Combat，A/B仍Assault；无新未解决High停止。最后观察累计估算A262.844102/B335.200876/C280.155077，未知usage仍保留；不将启动/早期动作算完整对局。

02:51:49.795Z最新Web进度A52/R1Cleanup、B41/R1Assault、C67/R2Movement，三组持续运行，未出现新的High全停。观察累计估算A263.942252/B339.808380/C280.701745，没有跨下一¥100提醒点。新生产的未审核Plan没有注入当前B；完整对局仍0/12。

## 费用

新空表生产已有13条完整保留付费回复（初始迭代/进场9条＋Teach4条），输入3,073,992、输出38,951、合计3,112,943 units，缓存命中输入28,800。按原冻结价格估算约 **¥3.841886–7.683773**，不是服务商账单；不含未来修正/审核或ABC费用。

ABC旧账分别累计、未知usage保留，无费用硬限；原费用偏移不重置，下一提醒A300/B400/C300。聚焦修复测试真实Provider增量0。

harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=roster_strategy/teach；harnessToolsCalled=Web写表、Builder、冻结地图/进场审核、实际断点恢复；agentDecisionEvidence=真实13条付费回复；trainingTraceCandidates=0；trainingTruth=false。无子代理/K3、官方数据刷新、删除、提交或推送。
