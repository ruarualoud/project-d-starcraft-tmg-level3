# S272 实验／Teach 编排修复与验收清单

2026-10-22。用户已批准按调研修复。归属 Ticket 27 / Slice 272，沿用 P0–P6，不恢复 e9981 旧纠错循环。

## 执行边界

### v891 增量：已完成前置不得被旧步骤引用迫使重做（P2/P3/P5）

真实A输出`500bdcbf028ab5bc0e453599c410bc6bb39eb1a96d69f9dcecb42c6441143e6c`与其前序连续出现：两次static solver已返回同父态合法选项，下一选择角色仍继承模型旧提案中“仅fromStepId，不得sourceEvidenceNumber”，重建两个solver再选择。实际formation_scene接口本来支持`{sourceEvidenceNumber,optionIndex}`，不是缺工具；交接未明确已完成来源的当前引用作用域，不能靠继续查证解决。

仅修改共享`roster-workflow-graph-v1.mjs`的choice合同：沿显式sourceReadContract核对真实完成结果、无在途及当前源绑定，生成已保存工具视图的编号/读取地址。原未确认提案、公开理由和全部候选保持不变；source编号不含任何预选optionIndex，不授正文已读或执行许可。未完成、过期、结果替换和无关角色不获错误选择引用；同一个投影进入新选择、嵌套格式修复及冷恢复的角色输入。

定点脚本`debug-slice272-observed-selection-v891.mjs`：真实失败请求注入先RED，修后唯一GREEN；生产角色构造器在内存中实际交付603/605，4负例，0真实Provider/Native/生产写，不重跑v890或其他已过门。`build/slice272-observed-selection-v891-green.json`。测试只证明工程交接，实际选择和最终策略产物仍待。

旧A3693/B3700正常exit0且0在途后，原目录A19585/B19598同版续行，activeRuns892；A2000/r2，B1980/r3未满，正式Plan0/6、对局0/12不变。

### v890 增量：分块后的原生动作仍须可发现（P2/P3）

实际A付费请求`5f6a0800563345f87f158c28bca1866e343c28cb430cc1f5dd8c3e51ad9294ed`已取`/receipt/actionSpace`，但119条`actionCapabilityReference/routes`（42866字符）被正确标成未交付，却只给长度和下标模板。原生inspect实际包含Kerrigan Blades的Combat阶段、Raptor冲击的Assault阶段；不是规则器没有近战。模型随后仍设计Assault中的Blades实验，未获得所需结果。

仅修改`roster-workflow-read-context-v1.mjs`的共享大数组导航：对原生能力、参数域、有限动作复制单位/动作/阶段/武器身份并按单位分组，保留全部原索引与精确读取地址。不改变原子、场景、菜单或模型旧回复，不自动选择阶段/动作，不把导航算正文已读或合法性证据。无关数组沿用原语义。

`scripts/debug-slice272-action-discovery-v890.mjs`使用同一实际工作项/读取记录/产品分块组装：先RED确认缺导航，再唯一GREEN检查119项逐值与原件一致、无重无漏，Blades=combat、impact=assault，8607字符可在既有子块预算内，原输入不变、其他地图数组无新增导航。结果`build/slice272-action-discovery-v890-green.json`；0真实模型/Native执行/生产写，未重跑已过门。它只证明交付接口，不证明策略收敛。

旧A71390/B71405正常退出且各0在途，原目录同版A3693/B3700续行，activeRuns891。真实模型是否使用该导航、最终军表/Plan验收仍待；正式0/6、对局0/12不变。

先整体离线单步调试，注入正常／异常模型回复，逐步检查真实生产模块的输入、输出、状态和下一责任角色；发现失败后修实现。离线通过才从产品入口新鲜调用模型。旧运行只读，正常回复夹具不是真实战略证明。固定表与从头写表同链路、不同编辑权限。不开对局，不改冻结官方数据，不安装依赖，不创建子代理，不提交历史脏工作树。

本轮状态：**6条完整离线产品流程通过，既有通过门不重跑。v869新发现真实A的来源审核把错误Supply推导放过，已补原生查询和事实标量准出，4项累计通过；同产品Native实际计算，不是注入数值。新鲜A/B已按同版重新初始化，旧停点只读。** 七项尚未全部最终验收；早期完整离线流程的Provider／Builder／Native观察为注入，不是真实军表或战略优越性证明。v869的真实原子值也不等于正式Plan、问题语义覆盖或策略提升。

## 七个独立交付物

| 子项 | 修复内容 | 可验收产物／准出 | 当前状态 |
|---|---|---|---|
| P0 单步诊断基线 | 对旧失败建立可重复的整链路观察，不仅检查最终结果 | 正常写表→Plan→Teach→实验→取舍→联合提交→审核的逐步输入输出；注入缺字段、错对象、负结果、不支持、恢复、重复等；明确每项实际生产接缝与替身边界 | 六条完整离线路径已通，包含每步实际prompt/回复/状态 |
| P1 统一事实与实验合同 | 区分设计、观测、判定、选择、正式提交；执行错误不再等同反驳 | 合同与能力目录；必要字段唯一所有者；缺指标／错基线在执行前拒绝；未知保留明确原因而非false／零 | 单攻击指标合同已接通；实际trace的12个设计消费者同源，终点与指标由同一绑定传递；真实语义是否守界待验 |
| P2 角色与调度 | 读取走正常工具往返；只向责任角色交付当前必要材料；避免按每句话另开审核 | 已读取同版本资料不重复确认；真实语义错误计数不被读取清零；审核义务覆盖不丢；每次派发有明确用途 | 读取、同源批处理、历史/当前失败分离及决策返回图边已通；领域主张真实性仍由来源审核，而非程序猜测 |
| P3 可执行局部实验 | 固定场景、对照、受控条件、指标、终点，工程计算比较 | 单行不冒充齐射；原生结果绑定正确对象；支持／反驳／不足均有确定出口；同条件复用、不重演完成步骤 | 实际编译/工具/作者消费闭环已通；负结果retain，解释核对不重测；真实策略价值待验 |
| P4 军表／Plan联合提交 | 作者据证据作选择，通过工具变更；不可用“我采纳了”替代提交 | 固定表只改Plan；可编辑表同步更新Plan；候选真实成本与提交回执一致；过期版本不部分写入 | 两种模式整链路确有联合提交回执；Builder成本仍注入，真实策略生成待验 |
| P5 分类恢复与收敛 | 参数、传输、工具缺口、解释争议、战略选择各自恢复；冻结本次准出 | 正常补读不计失败；同材料解释修正不要求新实验；不支持不盲重试；冷恢复不重复副作用；必要High不放行 | 三种异常及负结果全链路闭环通过，尚不保证任意模型错误均收敛 |
| P6 新鲜生产与中文报告 | 离线全链路通过后，以同一产品接口生成固定表Plan和新表＋Plan | 无人工补字段；必要未知已解决或撤回依赖该未知的主张并重新审查；中文逐步prompt／回复／工具／修正／最终表Plan；真实比较才可称策略改善 | 已新建真实A/B，旧Run只读，不启动对局；报告待真实产物 |

## 单步记录格式与失败归属

每步保存：前状态、实际角色输入／prompt、注入回复、实际工具操作、实际结果、状态差异、下一角色、断言结果。输入输出原件保留可追踪引用，不复制旧巨型运行。

优先复现四个已有机制：①逐句审核造成调用放大；②所需指标超出工具能力；③证据读取被混记为纠错；④采纳文字与实际提交不一致。其他异常由这些输入输出边界扩展，不添加无关测试。

一次失败只交给一个责任层。测试采用红→修复→一次对应绿；已通过项目保留证据、不重复跑。若第三轮仍不收敛，报告阻塞，不把调试伪装为继续生产。

## 不降低的验收边界

- 不删必要审查换取通过，不靠更多提示或轮次掩盖接线问题。
- 不要求一切未来对手行为确定；要求工具事实、引用、当前对象和工程结果正确。
- 失败、反例、无提升是正常实验结论，不证明策略优劣，也不自动生成新阻塞义务。
- 多指标取舍仍归作者；程序不设置隐含战略权重。
- 总体仍 T27 5/6、T23 33/36，剩余 S272/S248/S249/S250 共4片；正式Plan 0/6、对局0/12。

## 本轮证据

### 第一批：读取、审核调度和联合提交（8项）

脚本：`scripts/debug-slice272-orchestration-v856.mjs`。

- RED：`build/slice272-orchestration-v856-red.json`。真实复现正常读取被标纠错、读取重置语义计数、5句产生5任务。另一个失败是测试夹具用了非合同格式的Builder回执，单独纠正，不归因产品。
- GREEN：`build/slice272-orchestration-v856-green.json`。3个产品失败点修复通过；新增批处理夹具遗漏conditions，只有该项未通过。
- 最终：`build/slice272-orchestration-v856-final.json`。只补验新增夹具，继承其他7项通过证据；8/8。没有重新运行旧已通过命令。
- 单步记录含实际角色prompt、注入回复、调度前态／后态、审核任务和联合提交回执；均为脱离生产状态的内存存储。
- 同源5项→1任务；25项→3任务；每项仍独立判定。漏判、重复checkId、自引自证、任一失败均不能被整批pass覆盖。数字是任务数，不是实测Token或策略收益。
- 读到新证据仍需模型消费后作决定；取消的是错误标签，不是自动批准或取消这次必要决策。

### 第二批：能力／指标与实际工具执行（4项）

脚本：`scripts/debug-slice272-measurement-v857.mjs`；RED／GREEN：`build/slice272-measurement-v857-{red,green}.json`。

新增 `compare_observations` 接入现有实验编译器、工具目录和同一执行器的依赖／结果／断点流程，不另建实验执行链。模型选择已有回执、参与者、指标与阈值；工程读取原件并计算，拒绝模型填写伤亡数。首版支持单攻击伤害／伤亡／Supply后值与损失的点估计差。明确不支持联合齐射总损失、统计显著性或策略优越性推断。

4/4通过：正确两行比较；不支持的联合指标在编译前拒绝；源unknown／目标错配不变成零或false；手写值和非法阈值拒绝。各执行结果还检查冷读取不重放、0次新原生攻击。

### 实际修改范围

- `roster-workflow-read-role-v1.mjs`：证据交付状态与语义纠错分离，保留消费和恢复记录。
- `roster-source-check-batches-v1.mjs`（新增）、`roster-workflow-source-claims-v1.mjs`、`roster-review-proof-context-v1.mjs`：同源主张批处理，逐项身份／结果／来源门保留，父任务不再重复注入同一批结果。
- `roster-measured-comparison-v1.mjs`（新增）、`roster-workflow-laboratory-v1.mjs`、`roster-tool-proof-scope-v1.mjs`：可执行单攻击比较、原件绑定、能力声明及同执行器接线。
- 两个上述debug脚本；本清单、CURRENT_WORK与根TASKS。

### 下一步及明确未完成项

1. 已完成定点验证：编译时“不支持”保留分类诊断并转交设计／战略责任者，不同参数进入一般三轮格式纠错。整链路中还须验证负责人如何处理该返回。
2. 把当前实验目标、指标、控制条件、依赖和修改影响完整固化；修复同材料解释争议被迫寻找新事实、审核新增义务倒灌的问题。
3. 新测量工具需进入策略／Teach／条件经验的完整消费链，不能只证明它可以单独调用；先整体单步串联固定表与新表两种路径，包含反例及冷恢复。
4. 上述离线门通过后，从产品入口新鲜生成，不续旧Run。真实策略收益与最终Plan报告在此后评估。

本轮 **12/12是定点工程检查，不是12组对局，也不是七项全部完成**。0真实Provider、0新原生攻击、0生产写入、0新增正式Plan。没有安装依赖、删历史、提交或创建子代理。

### 第三批：真实工作区的失败分类与责任交接（v858，2项）

脚本：`scripts/debug-slice272-capability-handoff-v858.mjs`。完整路径为注入Provider回复→真实角色校验→实验编译器→真实产品工作区调度→控制返回→战略负责人入队，不直接修改调度状态。

- RED `build/slice272-capability-v858-red.json`：两类编译失败均丢失 `queryRepair`，下游分不清“参数错”与“不支持”。
- 第一次修复验证 `build/slice272-capability-v858-green.json`：参数纠错通过；能力返回进入下一真实阶段后，暴露未审核草稿读取缺项时崩溃。
- 根因：readiness给 `legalityStatus=unknown` 构造了非空 `{auditResultHash:null}`，违反候选合同。修复为unknown无回执、明确保留待审核阻塞，未伪造合法性。
- 最终 `build/slice272-capability-v858-final.json`：只执行尚未通过能力路径，继承参数路径通过证据，2/2。
- 能力缺口不再调用模型来“纠正参数”，不消耗格式纠错轮次；原目标、失败细节、来源与未完成状态送到战略负责人。没有执行工具或批准任何结论。冷恢复工作状态一致。

### 第四批：同材料争议不再被当成格式错误（v859，3项）

脚本：`scripts/debug-slice272-interpretation-handoff-v859.mjs`；RED/GREEN `build/slice272-interpretation-v859-{red,green}.json`。

- 两个注入分别为“原件已含指标，但审核解释有争议”和“原件确实缺指标，但模型误称answered”。旧实现都进入 `needs_local_correction`，付费请求可能只是在反复要求另一种结束语。
- 修复后，这两种情况均保留原回复和原未解问题，形成明确 `source_interpretation_challenge`，交回战略负责人。**系统没有判断作者或审核谁正确，也没有放过缺失指标。** 负责人后续须选择限定的来源复核、必要测量或修改依赖该事实的主张；本批尚未验证这个后继决策闭环。
- 真正的格式非法仍留在局部纠错，不被控制返回吞掉。该项RED时已经通过，GREEN未重跑。
- 3/3；2个返回路径各1次注入回复，0真实模型／新实验。实际prompt、注入回复、前后状态保存在报告。

### 当前完整diff范围与下一准出

本次新增共享 `roster-workflow-order-failure-v1.mjs`，修改 `roster-measured-comparison-v1.mjs`、`roster-workflow-read-role-v1.mjs`、`roster-decision-workspace-run-v1.mjs`、`roster-workflow-readiness-v1.mjs`、`roster-experiment-source-repair-v1.mjs`，并增加上述两个定点debug脚本。只涉及新编排失败分类与交接。

累计 **17/17定点工程检查**，不是完整流程通过。下一步按原七项继续：

1. 将实验目标、两方案、控制条件、测量终点和固定审核义务串联核对；明确范围变更必须返回设计作者，不能审核时悄然追加。
2. 整体单步串联“初步表/Plan→Teach→有界实验→比较/反例→作者取舍→联合提交→受影响审核”，同时覆盖固定表和可编辑表、恢复与失败分支。当前接缝脚本不能替代这一交付物。
3. 上述通过后再从产品入口新鲜模型生成，记录中文逐步prompt/回复/工具/每版表Plan。策略性比较需真实材料与真实取舍，不能用注入pass证明。

T27 5/6、T23 33/36、正式Plan0/6、对局0/12、剩余4片保持。未恢复旧Run／A–F，未调用真实模型、安装、删除或提交。

### 第五批：完整产品串联、失效修复和异常恢复（v860/v861）

使用 `createRosterDecisionProductJourneyV1` 自动决定下一个阶段，沿同一 `createRosterDecisionWorkspaceRunV1` 的真实角色输入、实验编译、工具执行、草稿提交和审核调度前进。不是测试脚本手工排阶段。注入边界是Provider回复、Builder判定和Native观测；所有策略支持判定均为夹具，不能用于生产验收。

| 路径 | 实际结果 | 原件目录（相对工作树） |
|---|---|---|
| 固定表正常流程 | 20步，23次脚本回复；8单位军表不变，Plan r0→r1→r2；ready_for_release | `build/slice272-product-chain-v860-fixed-Bbbs0L/` |
| 从空表正常流程 | 32步，34次脚本回复；空表→7单位／夹具1700分＋Plan→8单位／夹具2000分＋Plan；ready_for_release | `build/slice272-product-chain-v860-editable-udcADE/` |
| 汇总格式异常 | 21步，24次脚本回复；第10步发现findings类型错误，第11步同角色纠正；之后同流程完成 | `build/slice272-product-chain-v860-fixed-9hpSQj/` |
| 冷恢复与失效范围 | 6项通过；0执行调用，0旧工作重放 | `build/slice272-comparison-retention-v861.json` |

每条完整流程目录含 `single-steps.jsonl`（实际生成的完整prompt、脚本回复、每步前后修订和工作状态）、`fixture-checkpoint.json`（真实存储态及内容寻址原件）、`report.json`。没有调用正式发布accept，正式Plan计数不增加。

#### 完整单步发现的真实产品缺陷

RED：`build/slice272-product-chain-v860-fixed-u8Y30r/` 第15步已消费比较并修改Plan，第19步却停止 `ROSTER_DECISION_NO_READY_WORK`。实验、续问与来源审核都绑定了旧Plan；仅修改Plan便被统一置为superseded，周期又误判实验not_started，但相同ID已存在，既不能复用也不会再派发。

来源修复在 `roster-decision-workspace-run-v1.mjs::requestExperiment`：只有明确绑定同一设计及其预检的限定比较，使用军表／地图／规则／来源依赖，起始草稿作为历史上下文；其派生方法、摘要与来源审核继承同一范围。普通Plan依赖查询不变。没有复活历史生产Run、改写付费回执或自动批准战略。

GREEN为上述20步固定表。32步可编辑路径中，军表改变后启动新事实周期是预期行为，不把旧军表的实验冒充新军表结论。6项边界还验证：Plan改变保留已完成测量／来源判断，但独立战略比较审核失效；army/map/rules/source任一改变均使旧实验及审核失效；冷读取零重放。

#### 夹具错误单独归类

先前试验出现Provider回调重入串行Run造成等待、Builder缺合同字段／候选数组、手工发布观测却缺实际工具工作身份，以及用observer投影冒充持久状态。均为此次调试夹具错误，不是模型或产品故障。现使用存储原态、精确Builder形状，并由真实工具工作返回注入观测再经fromStepId比较。失败原件保留，不将这些失败计入产品修复数或费用。

#### 下一工作清单（仍先离线）

1. 固定实验设计／指标／条件与审核义务的完整交接：范围改变需明确返回设计者，不得静默增加当前准出要求。
2. 补完能力不可用、同材料解释争议和负比较结果的后继闭环；此前v858/v859只证明返回正确负责人，不证明负责人消费后能完成决策。
3. 上述通过后才从产品入口新鲜执行固定表Plan和新表＋Plan，用真实冻结数据、真实Builder/Native与真实模型；不续e9981。
4. 最后交付中文逐步报告与策略比较：各轮原始prompt、选项、工具结果、修改理由、最终表/Plan及未优化对照。不能用脚本的4−3=1冒充真实策略改善。

本次diff：产品工作区一处实验依赖生命周期修复；新增 `debug-slice272-product-chain-v860.mjs` 和 `debug-slice272-comparison-retention-v861.mjs`；本清单、CURRENT_WORK、根TASKS/PROJECT_MEMORY记录。未提交、安装、删除、创建子代理或运行无关门禁。此前已通过的17项不重跑。

### 第六批：能力缺口完整返回与负结果取舍（v862）

- `build/slice272-product-chain-v860-fixed-DHghFt/`：32步、34次脚本回复。方法误选联合齐射指标→编译器拒绝并返负责人→负责人明确采用原设计的单攻击指标→两条工具观察及比较→来源审核→负责人消费→实际Plan修订→最终fixture ready。
- `build/slice272-product-chain-v860-fixed-xPSBhy/`：21步、24次脚本回复。备选2、参照3，真实比较程序给false；作者retain，Plan仍r1，没有为了完成流程强迫修改。数值是注入，不代表实际游戏策略。
- 第一次完整能力路径 `...fixed-IAxf4q/` 暴露两个真实接缝缺陷：成功子调查后，父作者仍继承旧失败字段为当前任务；工作图缺前一作者关系，重复授权识别失去祖先。改为历史上下文、原作者决定、当前返回身份、明确未自动解决原问题，并加入非所有权的strategyContinuationOf关系。
- `build/slice272-investigation-return-v862-red.json` 两断言失败；修复后 `...green.json` 2/2，使用已完成完整trace，没有再次执行流程。先前夹具未读来源导致空引用，明确只修夹具，没有放宽产品引用要求。

实际diff：`roster-decision-workspace-run-v1.mjs` 调查完成的输入生命周期；`roster-workflow-graph-v1.mjs` 决策返回关系；完整注入脚本新增能力与负结果；定点trace断言脚本。原始模型记录不改、旧运行不续。

验证器说明：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=strategy_decision/local_teach/experiment_planner/fact_summary/final_review；harnessToolsCalled=threat_exchange/compare_observations及Builder接口（外部结果注入）；uiTraceEvidence=本离线门不含UI；agentDecisionEvidence=实际构建prompt＋脚本回复；memoryTraceEvidence=无改变；trainingTraceCandidates=0；rollbackOrDemotionRules=问题丢失、过期事实或重复调查均阻止真实生产；userVisibleChecks=同产品入口到fixture ready，不是正式发布。

### 第七批：解释争议完整回交（v863）

完整RED `build/slice272-product-chain-v860-fixed-ansscf/`：注入一次错误来源审核后，子调查已独立复核同一原件，父任务仍按旧“必须新材料”规则退回，形成重复解释循环。已停止这条离线夹具；中断时最新checkpoint未完整落盘，使用完整的 `before-last-step.json` 和逐步JSONL保留复现，不影响任何生产存储。

修复 `roster-workflow-frontier-return-v1.mjs` 与 `roster-experiment-source-repair-v1.mjs`：从真实授权子调查及独立来源/问题覆盖审核派生 `sourceReconciliation`。仅匹配的原问题不再被材料身份门重复退回；原问题、旧判断、子结论与复核身份全保留。直接作者retain、待完成/过期子审核、另一个问题均不能触发。父答案仍须独立审核，不自动批准事实或Plan。

- 定点脚本 `debug-slice272-reconciliation-return-v863.mjs`。首次夹具截断工作列表却保留后轮frontier指针，所得三个负断言不作为有效通过；修正历史控制指针后获得有效RED `...v863-red2.json`。最终有效GREEN `build/slice272-reconciliation-return-v863-green.json`，5/5。没有重跑既有已通过门。
- 完整GREEN `build/slice272-product-chain-v860-fixed-8ogM8L/`：38步、41次脚本回复；最终fixture ready、Plan r2。仍只有2条threat_exchange及1条compare_observations，不为解释争议重购测量；旧错误审核原件保留。
- 只读trace核对：12个comparisonPurpose消费者均指向同一设计；工具比较绑定保留原指标、两方来源、终点和范围，预检/来源/战略审核各使用原分工义务。现有v726观察绑定和v668审核义务机制未重写、未重跑旧门。本轮只证明身份/范围传递，真实模型可能仍误解语义，需要下一真实运行观察。

#### 新鲜真实验证已启动

同一 `scripts/run-slice272-product-generation-v645.mjs` → ProductModule HTTP入口，固定表9单位仅导入军表、不导入旧Plan；从空表同时生成军表/Plan。两组均Terran Armed Forces对Kerrigan's Swarm、Standard 2000分、冻结 `standard-d6-1` 54×36英寸地图及同一显式电子地形约定，deepseek-flash。

启动日志 `build/slice272-v863-fresh-fixed-1792643496365.log`（PID39199）、`...editable-1792643496371.log`（PID39200）。PID仅为此刻记录，恢复前必须查状态。真实结果未完成，正式Plan0/6、对局0/12；不续e9981、不启动旧A–F或对局，不改模型答案或手补军表/Plan。

本阶段diff合计：实验及调查生命周期、决策返回图边、父级争议复核交接；两个针对具体失败的trace断言脚本；完整注入夹具新增三分支；本清单/CURRENT_WORK/TASKS/PROJECT_MEMORY。没有提交、依赖安装、删除或子代理。

#### v863最后范围保护及真实恢复点

代码核对发现同一句话若出现在后续新审核，旧reconciliation按文字匹配会错误适用。新增这一具体反例先RED `build/slice272-reconciliation-origin-v863-red.json`，修成同时匹配原review/checkId，唯一GREEN `...green.json`（继承之前5项，不重跑），累计6项。完整38步已通过路径没有重跑。父级新事实问题仍阻塞。

两组新鲜真实进程安全结束当前操作，确认running0/pending0；未丢成功回复。原新任务同版接续：A目录 `build/slice272-product-generation-v645-hLRxtE`，workflow `decision-52830efd-f84f-4246-926e-0a4c7575603c`，PID42889；B `...xc2pIk`，workflow `decision-86236b28-77ba-48de-b11f-a4f932194b05`，PID42890。新日志 `build/slice272-v863-origin-scope-fixed-1792643728133.log`、`...editable-1792643728136.log`。这不是恢复旧e9981。

首段实际观察：A7回复、231724units；B22回复、533562units。两者r0，A9单位固定军表/B空表，尚无初步Plan；模型正在读取Skill、任务/地图与对手来源，B已进入必要事实来源核对。这不是最终产物或收敛结论；后续应检查它们是否真正形成并据证修订Plan，不把读取/调查次数当作策略提升。完整实际请求/回复在各新Run的artifacts，费用继续累计。

### 第八批：真实初稿与地图信息修复（v864）

上述首次新鲜尝试已各自提交r1：A固定9单位且Builder为2000矿，B从空表提交4单位及初步Plan，尚非满分成品。两组进入真实Teach与局部实验。不能记为最终Plan或稳定收敛。

实际B把1804个编译地形小格当成大量独立地形，并据旧deploymentBinding.setupSequence的pending标签判断地图未落定。原Native已有30组地形、5任务标记和冻结布局；共享摘要遗漏terrainGroupId、blocksPlacement等字段。`pregame-map-evidence-port-v1.mjs`现保留原生语义字段，在地图摘要和部署查询统一交付layoutMaterialization，区分1804格/30组、已核冻结布局/原始构建日程。原始来源不改；未认证地图不变成已冻结；不推断某单位路线或动作已合法。

脚本 `scripts/debug-slice272-map-fact-contract-v864.mjs`，RED `build/slice272-map-fact-contract-v864-red.json`，GREEN `...green.json`：4项累计通过（继承一项，不重跑）。使用真实压缩Native源，0Provider、0房间变更。

### 第九批：局部补查身份（v865）

先逐项对照真实失败与其后继：B缺外层攻击者/目标、错误菜单路径均由原流程自动纠正，已获得两条Native攻击查询结果；这些不另加补丁。A概率子任务试图新建场景超权限仍应返回上层，不放开权限。

真实缺口：A在概率输入修复中只要求inspect现有来源，operation在授权内，但继承器仅识别父role=supporting_step，漏掉observation_candidate的准备性子查询。更严重的对照反例：显式更换arm时反而能通过。修复 `roster-workflow-graph-v1.mjs`（委派原操作、统一合同）与 `roster-comparison-observation-v1.mjs`（准备性查询继承准确原身份且检查冲突）。纯准备阶段不产生观测终点、sourceApproved仍false；真正执行测量仍需明确本地观测步骤，越权操作不放行。

脚本 `scripts/debug-slice272-delegated-read-v865.mjs` 注入实际A付费结果22e3e03d…至生产prepare→compiler接缝，保留原始order和state。RED `build/slice272-delegated-read-v865-red.json`确认上述两项失败；GREEN `...green.json`只执行两项失败、继承三项已过，累计5/5。包含实际正常补查、显式换arm、匹配测量不继承、越权场景、错误来源；0Provider/Native/生产写。旧六完整路径、其他旧门没有重跑。

旧新鲜A/B已安全结束（PID42889/42890退出0，running0/pending0）。最终计账A66回复/3651753units，B62回复/2540764units；只汇总实际receipt.usage，不擅自换算货币或清账。两者r1及全部原始记录保留只读，不人工改Plan。因首轮初始地图输入有缺项，后续从当前修复版本新鲜走产品入口，不能把旧初稿视为无干预新验证。

验证器：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/fact_summary/strategy_decision；harnessToolsCalled=产品map_summary/deploymentGeometry与订单编译器，实际Native源只读；uiTraceEvidence=无新增UI实验；agentDecisionEvidence=首次真实A/B原始请求/回复及r1；memoryTraceEvidence=没有写入本局记忆；trainingTraceCandidates=0；rollbackOrDemotionRules=准备性读取升格观测、错arm放行、地形事实丢失均阻止准出；userVisibleChecks=最终Plan未验收，不把初稿和定点通过当成策略更优。T27 5/6、T23 33/36、余4片、正式Plan0/6、对局0/12。

### 第十批：真实B联合修订的局部调查授权（v866）

第二次A `...B4OTWv` 已实际提交r1，23次回复；地图查询原件ee93f2e9…/d683996e…已实际包含v864冻结布局/30组/5标记。安全停后无需重买这些成功步骤。第二次B `...qg6kSc` 在初始角色6次回复后按3次纠错上限停止，r0、0在途，没有继续计费盲重试。

逐轮定位：B先缺联合修改字段；随后交付了结构完整军表/Plan，但necessary_fact未配nextInvestigation，正常语义门拒绝。最后局部修补输出questionRepairs=null违反数组合同，且选择authorize_inquiry会丢弃其原联合修订，原保护正确拒绝。根本能力缺口是：现有局部命令只能授权单独调查；若要保留联合修订再补一项授权，只能重写整份大决策，违背分块纠错。

`roster-workflow-semantic-repair-v1.mjs`修复：仅在已存在真实revise/mutation/strategicChanges时提供`authorize_revision_followup`。模型显式选择后，Host只增加其nextInvestigation，保留原mutation/Plan/战略变化/问题，仍跑原语义、来源、Builder和最终审核；不伪造问答或宣称提交成功。questionRepairs的null/[]统一为显式“没有问题修改”，非空对象/坏补丁仍拒绝；新合同1.2.0，旧请求原件不改。单独authorize_inquiry仍不得丢弃已有修订。

具体实际回复注入脚本 `scripts/debug-slice272-revision-inquiry-v866.mjs`：RED `build/slice272-revision-inquiry-v866-red.json`；修后四项过，角色消费夹具未携Provider身份，明确为夹具问题，不放宽生产门；仅补齐模拟回执身份后，唯一余门 `...v866-final.json`通过。累计5/5：正常局部授权、禁止丢修订、缺授权/错问题拒绝、空补丁与非法补丁、原角色实际dispatch消费。保存真实构建prompt、注入回复与结果；0真实Provider/Native/生产写。Builder尚未执行，不能称军表合法或已提交。其余门未重跑。

当前同版真实运行：A继续第二次新鲜目录 `build/slice272-product-generation-v645-B4OTWv` / decision-f0bc8c61-3ac6-4f40-8868-447f29e42927，PID78610；B从空表新建 `build/slice272-product-generation-v645-2gjhFQ`，PID78617。日志 `build/slice272-v866-fixed-1792645703012.log`、`...editable-1792645703014.log`。启动时为initializing，尚不能声称新B创建或完成；恢复前核实际状态，不恢复已停qg6kSc/hLRxtE/xc2pIk/e9981。所有旧账保留，用户要求的真实收敛与最终中文报告仍待。T27 5/6、T23 33/36、余4片；正式Plan0/6、游戏0/12。

本续轮diff摘要：地图共享事实投影；实验委派操作与准备性身份继承/冲突检查；局部联合修订后续授权合同；三个具体异常debug脚本；本清单及CURRENT_WORK/TASKS/PROJECT_MEMORY。没有测试无关模块，没有子代理、安装、删文件、提交或改官方数据。

### 第十一批：局部权限拒绝不再格式纠错（v867）

真实A `...B4OTWv` 的编译器正确拒绝局部角色调用 `formation_scene`，但调度器把 `operation_not_delegated` 当作参数错误，要求模型不断改订单。模型随后试图把求解候选当作已应用场景，造成错误方法循环。权限本身没有丢失；错误在拒绝后的责任转交，不应简单放开权限。

- 保留真实订单和编译失败，判定未派发、明确委派合同、原步骤身份后，确定性返回 `work_order_delegation_return`。
- 负责人得到 `delegationBoundaryRequests`，区别于全局不支持能力；可决定有界方法或明确未解，不自动获得权限、不批准事实/Plan，不重购格式回复。
- 新调查返回后，旧权限失败转入历史上下文，避免再次当作当前失败。
- `scripts/debug-slice272-delegation-return-v867.mjs`：真实订单编译RED；产品接收边界夹具最初未重建内存实例，明确为夹具错误。修正冷恢复后仅补余门；最终 `build/slice272-delegation-return-v867-final.json` 累计3/3，前项继承、不重跑。含正常转交、原订单保留、无额外Provider/Native、独立负责人、冷恢复及非适用错误不误放行。

### 第十二批：预检缺事实进入调查，不改写设计（v868）

真实B `...2gjhFQ` 已在v866正常提交4单位/610矿的中间表和Plan r1。随后三个设计版本及三次预检始终缺两条规则事实：Creep Token移除与PLACE关系、Crushing Grip的Activated影响。设计作者只反复保留未知，系统没有事实调查分支，最后三轮停止。不是网络，也不是已完成2000分产品。

修复公共P2编排：显式 `necessary_fact` 且没有未定作者选择/不支持设计时，冻结同一实验设计，交事实角色查原问题；独立来源/覆盖审核通过后，再审核同一设计。原检查、问题、费用、designReviewRound全部保留。事实调查不承担整个比较，不编辑表/Plan，不靠清除未知通过。事实真的blocked或三轮前置查证仍不收敛时保留明确停点，不无限循环。

- 新模块 `roster-comparison-prerequisites-v1.mjs`：必要事实状态、范围及后继；`roster-hypothesis-cycle-v1.mjs` 接公共调度；`roster-decision-workspace-run-v1.mjs` 校验返回身份并把实际事实和独立审核交给原预检。事实绑定army/map/rules/source，不因无关Plan文字修改重做。
- `scripts/debug-slice272-preflight-facts-v868.mjs` 使用实际B停点先RED，修后 `build/slice272-preflight-facts-v868-green.json` 2/2：必要事实确实改走调查；注入回答没有独立审核不能通过，独立审核后经真实Run API创建同设计预检，错来源返回拒绝，表/Plan无变更。没有真实Provider/Native，不把注入来源审核计作真实规则证明。

#### 本次真实证据与下一验收

v866 B的真实局部授权请求 `12b4ac7aad6eb85ca5c0ffa3ba2ceca85a8935e171fbf077e22a4ec9eddb9099`，回复 `502c8d0ed35b1dd65e8583b79b7436a230c35b676d411a044fa89a6f3e205c49`：明确 `authorize_revision_followup`，保留联合修订，实际提交r1；该请求51835 units/5287ms。只证明该修复真实被使用，不是成品或策略提升。原件在 `...2gjhFQ/workspace/decision-workflows/decision-b7df2f50-605c-46d9-954e-341272632c00/artifacts/`。

旧A/B都退出0且running0/pending0，原表、Plan、回复、失败、费用只读保留。本次按用户“离线调通后从头验证”要求，通过同一ProductModule HTTP入口从头启动：

- A固定表9单位，不导入旧Plan：`build/slice272-product-generation-v645-uVeVt8`，PID6864，日志 `build/slice272-v868-fresh-fixed-1792647329747.log`。
- B空表＋Plan：`build/slice272-product-generation-v645-U7wSTP`，PID6871，日志 `build/slice272-v868-fresh-editable-1792647329759.log`。

记录时两者initializing，不能称生成成功。恢复先查实际状态，不重复启动。冻结数据/地图、2000分、Flash、产品链路不变，历史账不清零，不启动对局。下一检查真实查证/方法交接、联合修改、Teach与最终准出，再交中文完整报告。正式Plan0/6、对局0/12；T27 5/6、T23 33/36、余4片不变。

随后观察：新B已创建 `decision-3a62815c-4bc5-4665-8ff2-a32edbdb050e`，r0、空军表，进入首轮必要资料调查，尚未提交Plan；A仍initializing，不能误报已有模型输出。旧A B4OTWv的唯一回复49次、1789653units，旧B 2gjhFQ为34次、1043139units，来自去重replyRef的实际usage；这是这两个Run的账，不覆盖更早历史，也不清零旧账。无服务商结算金额时不杜撰人民币费用。

本批diff：两个公共调度文件、错误分类模块、新前置事实模块、两个具体bug注入脚本与本清单/入口/任务/持久规则。未提交、安装、删文件、创建子代理或刷新数据。

验证器：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/strategy_decision/final_review；harnessToolsCalled=真实订单编译器、产品Run调度/预检API（模型/来源答案注入）；uiTraceEvidence=无新增UI证据；agentDecisionEvidence=实际A拒绝订单、实际B三轮预检及v866授权原件；memoryTraceEvidence=无记忆改动；trainingTraceCandidates=0；rollbackOrDemotionRules=权限自动扩大、候选假充已执行、事实未审即预检放行、错来源返回均拒绝准出；userVisibleChecks=只签工程边界，不签正式Plan/策略优越性。

### 第十三批：原生可计算事实不能由文字审核代算（v869）

归属 P1/P2/P5，P6真实调用发现。不是更改Medic规则，也没有为某个单位写Prompt特判。

#### 真实问题与归因

A uVeVt8固定9单位的Plan已r1→r2，实际联合提交只改scoreRoute/lossResourceBudget。新v868调查→独立来源审核→原设计预检确已走通，然而调查者从AMF及Freedom Fighters两段能力文字推导“光环外Medic占点Supply=0”，来源审核也放过。实际审核只读取`/abilities`，没读取规模/基础Supply；同一原生场景inspect返回三队三模型Medic的currentSupply均为1。

原件在 `build/slice272-product-generation-v645-uVeVt8/workspace/decision-workflows/decision-16b1c052-1ded-4903-8287-63ce58d20f5c/artifacts/`：

- 错误事实请求 `889be7159115775c562aa69d6313f386fd4ea1cba2beb8f093c3a28ecbee1a10`，回复 `6236e95f33471ca014dbd2aa46217f65223f5b1a3f4f44adce9f77f7ec8efbcf`。
- 来源审核请求 `431686eebd22d27699c549e123b3d509d4220eb9cb634030c0fa62eb637d1624`，回复 `39dcf36fd2cae577287f78cb28afc7519386ba49f7f6590dcad341650c0a34b1`，其中source_fidelity_6再次接受错误的0。
- 原生inspect结果 `853d9126cf6326cf6130b2eb266120fd33979b25d4ba6bd40b1a3cfb6f114401`。

排名假设：①原文读取遗漏基础规模字段（已证实实际只读abilities）；②模型把Pool值推广为其他用途（实际回复证实）；③原子计算本身错误（当前定点实测否定：同一原子Pool=0、mission=1）。根因是工具暴露与事实准出不完整，不能以“模型常见错误”结案。

#### 来源修复

1. `official-contextual-supply-projection-v1.mjs` 增只读批量门面，逐单位逐context直接调用已有原子；不添加第二套公式。
2. `spatial-query-contracts-v1.mjs`、`room-backed-spatial-rules-query-adapter-v1.mjs` 暴露`contextual_supply_projection`，写表实验与线上对战均走共享适配器。只接收unitIds/contexts；手填Supply、过期权威态、无效单位/用途拒绝。结果保留基值、replacement/modifier/floor及适用定义，明确不证明占点资格/未来进场。
3. 新`roster-native-fact-claims-v1.mjs`：模型选择实际工具回执编号、标量pointer、声明值和用途；程序检查当前tool_receipt、实际读取、值相等、unknown非零。Host保存原件ref/实际值，模型不能手写权威回执。
4. 实验角色合同2.6.0提供nativeFacts；当前预检necessary_fact调查不能只交文字解释就answered。缺证据返回原事实角色，允许最小查询或明确能力返回，不改Plan。正确字段引用仍需独立来源/问题覆盖审核；未声称程序能判断所有自然语言推论或战略优劣。

#### 单步验收（不重复旧通过项）

脚本 `scripts/debug-slice272-native-facts-v869.mjs`：

| 门 | 结果与边界 |
|---|---|
| 同一原生Supply | 实际冻结状态：Pool0、mission1，逐context等于原有原子输出；状态不变，错误字段和过期态拒绝 |
| 原付费错误答复注入 | 真实角色调度拒绝没有原生事实的answered，原问题、军表/Plan保留 |
| 数值冲突自动纠正 | 真实原生回执值1，注入模型值0被工程发现；同一角色第二次脚本回复改为1后提交待独立审核，无人工修改生产数据 |
| 实际产品lab通路 | 真实冻结数据/Builder/Native runtime，目录包含该查询，lab→共享对战adapter→原子实际返回0/1，0来源变更 |

有效RED `build/slice272-native-facts-v869-red2.json`；前三门GREEN `...-green2.json`；最后一门仅补验，前三门继承，累计 `build/slice272-native-facts-v869-final.json` 4/4。原始 `...-red.json` 的第二门因夹具删除continuation所需resultRef导致无效，已把夹具还原到ready调用前态；首次GREEN又发现新增Schema漏项目要求的min/max声明，属本次代码错误，修正后唯一对应验证。所有失败明确保留，不把它们记作产品策略失败。

后两门Provider回复仍为脚本注入，原生数值真实。0真实Provider、0生产写、0正式Plan、0对局；报告保留实际生成prompt、注入回复、查询原件和修订状态。

#### 新鲜实际生成

旧A/B均退出0、running0/pending0。B U7wSTP停于r0：实际Builder分支搜索已完成第二批、后继audit待执行，不是网络/失联；不是合法最终2000分产物。未重写它的候选或Plan。

按用户从头验证要求，同一薄HTTP客户端启动新A/B：A `build/slice272-product-generation-v645-hsxEYu` PID41095，B `...8aBuEV` PID41102；日志`build/slice272-v869-fresh-fixed-1792649433358.log`及`...editable-1792649433375.log`。此处记录初始化状态，不冒充模型已使用新接口。冻结数据/地图/2000分/Flash不变，旧费用不清零。

本批diff：上述5个生产文件、1个具体bug脚本、本清单/CURRENT_WORK/TASKS/PROJECT_MEMORY。剩余：实际查询消费、独立审核语义收敛、正式表Plan、策略比较与中文最终逐步报告，再按约定分组开对局。T27 5/6/T23 33/36、正式Plan0/6、余4片不变。

随后实际观察：B已创建`decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，7个去重付费回复、291171units，r0无正式Plan；Builder分支参数问题经实际纠错后在执行原生搜索。A仍初始化。启动4分55秒时两进程ps均为R且CPU约50%/56%，是活跃计算，不把等待当崩溃、不重复启动。此处usage只覆盖新B当时的已收回复，旧账全部保留，未取得结算金额不估作实付人民币。

验证器：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/final_review；harnessToolsCalled=contextual_supply_projection/真实Product laboratory与角色执行器；uiTraceEvidence=无新增UI；agentDecisionEvidence=原付费错误答复与本轮实际prompt/注入纠正；memoryTraceEvidence=无记忆改动；trainingTraceCandidates=0；rollbackOrDemotionRules=文字冒充计算、错值/过期/unknown当零均拒绝；userVisibleChecks=三模型MedicPool0/mission1明确区分，最终产品尚未验收。

### 第十四批：同一待执行操作继承已保存的比较身份（v870）

归属P1/P2/P5，来自当前新鲜A hsxEYu的P6真实执行，不恢复旧调查。

**实际进展与问题**：A固定9单位已提交Plan草稿r1，经历Teach、设计修订与预检，正在Marauder/Goliath的限定比较。两个formation_scene局部选择的父purpose/arm/measurements完整存在；编译器却只准准备步骤继承，实际执行父操作时要求模型重填。模型按“准备性操作可null”提示连续返回null，三轮后停止。另一显式改arm的候选甚至未被旧身份层拒绝。原单、失败、费用均保留，未把草稿当最终Plan。

**修复**：`roster-comparison-observation-v1.mjs`按已保存父操作继承身份，映射本地观察step；`roster-workflow-graph-v1.mjs`提供spatial的精确queryKind并统一提示。相同名字的不同空间查询不能继承为同一观察；准备步骤仍prerequisite；显式改purpose/arm/metrics拒绝。工具真实proofScope、endpointReached=null、sourceApproved=false均保留：选出队形不等于做了火力测量。旧v865测试中相反断言改为新名字、新语义，没有将旧通过记录冒充新验证。

**单步证据**：`scripts/debug-slice272-delegated-operation-v870.mjs`读取当前A实际付费失败订单，经真实产品编译上下文和编译器执行，0Provider/Native/生产写。

| 检查 | 结果与边界 |
|---|---|
| 原失败订单 | 同一formation_scene可编译，原purpose/arm/measurements不变，只映射本地s1，几何证明范围不提升 |
| 显式改换比较对象 | 拒绝子订单改arm/measurements；不是让模型自行宣布另一实验 |
| 越权/过期来源 | 原RED阶段此项已通过，GREEN继承，不重跑 |
| spatial同名分发 | 保存attack_probability的queryKind；相同查询继承候选，改为静态队形仅是准备，不算原测量 |

RED `build/slice272-delegated-operation-v870-red.json`两条真实失败、一条已通过；累计GREEN `...-green2.json` 4/4。第一次GREEN因脚本把完整request打印到1500字节缓冲而中断、未完成报告，属于验证可观测性错误；改为每项先保存报告、只打印摘要后完成。没有重新调用模型或工具。该检查不证明实验已经完成或策略更好。

**恢复**：A/B旧句柄已exit0；B实际搜索与摘要已完成，r0下一方法ready，原生搜索慢不等于网络失败。原Run同产品HTTP入口续行：B70480/8aBuEV、A71806/hsxEYu，日志见CURRENT_WORK。使用原有“未派发订单经新编译器通过后一次确认”恢复，不重置旧次数/费用、不修改付费原文、不新建房间。当前实际收敛尚待，正式Plan0/6、对局0/12；T27 5/6、T23 33/36、余4片不变。

Harness记录：promptPackRoutes=experiment_planner；harnessToolsCalled=实际产品method compiler/choice contract；uiTraceEvidence=本批无UI；agentDecisionEvidence=真实付费局部订单与父身份；memoryTraceEvidence=无本局记忆改动；trainingTraceCandidates=0；rollbackOrDemotionRules=身份冲突/来源过期/非同查询不得继承测量身份；userVisibleChecks=工程不再要求模型重复编写身份，但最终产品尚未验收。

### 第十五批：Builder原生回执不能因包装不同被拒绝（v871）

归属P1/P5/P6。v870恢复A时，`product:initial-army-and-plan:followup:r1`成为needs_repair；真实模型已经读对当前Builder审核，但v869检查器硬要求operation/receipt包装，把真实直接Builder结果的/status、/summary与/audit误拒绝了三次。此项是新增代码适配错误，不能归责模型效果或规则原子。

**原始证据**：A hsxEYu工作流的Builder原件`2f667029a6e9a5433a6b05aeef653a966aeedf3f5b9237e371edada8915c409e`，真实请求`3f349710c05ab956491e402dabb5a2d17e0b11d75f9dc735851aa3f524606c8f`，回复`4e1b058dfcc57fb3b387dcb626910a619d92ad8d57473da71c26069afad24c9e`。12条错误均是native_fact_requires_receipt_result_pointer，不是数值不符。

**修复**：统一识别已知官方Builder schema/port及非客户端合法性声明，允许其实际/status、/summary、/audit标量；原实验/receipt保持。当前证据身份、实际读取、标量相等和unknown处理不变。给错误提供实际来源合同说明，不要求模型制造包装。旧误拒绝通过产品原有已付费回复重验入口恢复一次，正常角色仍作全部验证；新诊断码不能重复触发旧合同恢复。

**单步验证**：`scripts/debug-slice272-builder-native-facts-v871.mjs`使用实际原件/原请求/原回复，在内存副本中走真实角色。RED四门失败，修复后一次GREEN四门通过，文件`build/slice272-builder-native-facts-v871-green.json`。

1. 原12个事实不改值通过，真实矿物2000；各值仍待独立问题覆盖审核。
2. 产品识别一次原付费重验，不重新请求Provider/Native，不批准Plan。
3. 伪造值、过期证据、模型解释、假schema和producer元信息仍拒绝。
4. 完整原角色重验evidence_ready、12个verified facts，Provider0、calls不增、军表/Plan不变。

**真实消费**：A PID78796加载后，原Builder事实evidence_ready，12值保存，调用数仍5、lastReply仍`4e1b058d...`；随后独立来源审核要求一次事实文字修订，正常修订与复审完成后已交战略作者。重验没有代替语义审核，也没有人工改Plan。B70480等当前搜索与摘要保存、exit0/0在途后，同目录由79965加载同版继续。地图/数据/军表目标不变，旧账全保留，无新对局。

**未完事项，不隐藏**：A限定比较的局部确认仍受历史error/expectedSchema影响，显式选择更窄的prerequisite标签，与父effect_endpoint候选身份冲突；需统一历史与当前错误、身份归属与证据范围，不用继续随机重试解决。B第三候选1160矿、有界64次邻域全槽位拒绝，模型负责人选择另一方法；仍没有正式表或Plan。当前两进程活跃不代表最终收敛。T27 5/6、T23 33/36、Plan0/6、对局0/12、余四片。

本批diff：native-fact-claims、read-role的原答复重验选择器、product-journey恢复理由三个生产文件；一个具体bug脚本；CURRENT_WORK/TASKS/PROJECT_MEMORY和本清单。无安装/代理/删除/提交/数据更新。Harness：experiment_planner→真实工具原件→独立source review→战略作者；无新增UI或训练真值；明确拒绝错误来源/值，不把本修复计为策略更优。

### 第十六批：精确 JSON 事实不等于未知（v872）

P1/P5，真实A hsxEYu r2的地图必要事实误拒。原回复`1ecfdc3cdcec00f583c6e3484ad30e9f9d58f6be2d64e56f4260bc3ba7b985a0`引用实际地图尺寸对象、5标记数组、双方进场矩形、可达布尔值、中立标记affinityPlayerId=null；旧检查器仅认可标量，把有值对象/数组/null误作unknown。不是模型坐标错，也没有重算地图。

统一原生事实检查递归识别JSON，按实际子树深相等；缺路径、未知/失败来源、被篡改坐标仍拒绝。显式null保留中立含义，不转换成零或战略证明。产品原有保存回复重验入口识别旧误拒一次，新错误码不重复授权。

`debug-slice272-native-json-facts-v872.mjs`有效RED→一次GREEN3/3：6事实原答不变、三类反例拒绝、真实角色重验0Provider/Native且军表Plan不变。`build/slice272-native-json-facts-v872-green.json`。这是原生值/接线验证，独立语义覆盖与真实生成仍另验。

### 第十七批：局部方法归属、证明范围及补读回交（v873）

P1/P2/P5。当前新流程A的r1局部formation选择，在父身份完整保存时被要求重复声明同样的effect_endpoint；模型缩小为shared/prerequisite及一个测量，被误认新身份。父测量三项不能因此被删除，几何也不能证明火力。另一个实际局部订单用sourceEvidenceNumber/optionIndex直接写单一选项；含糊/冲突情况不能随意重选。旧编译错误仍作为当前task.error送给模型，也是错误纠错来源。

修正为：同purpose/arm、原测量子集的prerequisite允许，保留parentMeasurementStillUnproven；直接单选对无损转数组，冲突仍拒绝；当前通过但尚未执行的编译状态与历史错误分开。准确旧付费订单现可通过原角色派生重验，而非改写原件。派生重验补读后增加明确author_confirmation状态，回同角色正常有界确认；源回复/调用/错误计数不清零，提交后状态为submitted_for_review，不自动批准或派发实验。

验收`debug-slice272-method-revalidation-v873.mjs`：

| 检查 | 实际证据 |
|---|---|
| 同身份缩小前置范围 | 编译通过，endpoint/sourceApproval不提升 |
| 换arm/扩大证明身份 | 仍拒绝 |
| 实际单选写法 | 原编号157/选项0保持，没有替模型换队形 |
| 历史错误分离 | 当前有效订单不再携带旧错误作修复指令；真实剩余错误仍送达 |
| 原答重验→补读→作者确认 | 保存回复不重买；1脚本作者确认后返回一条有效待执行订单，军表Plan不变，不能再次获得同重验 |
| 父义务保留 | 子测量仅1，父三项仍完整；新增第4项拒绝 |

累计结果`build/slice272-method-revalidation-v873-final3.json`6/6。五项继承前次通过，最后一次只执行作者交接失败项；0真实Provider/Native/生产写。使用的r1冻结快照`build/slice272-method-revalidation-v873-frozen-r1.json`是此前真实保存状态；生产已r2，旧r1比较superseded，不复活。

失败透明记录：初始夹具误从r2找旧evidence_ready而找不到；修为真实冻结r1后得到有效RED。第一轮实现只允许全测量相等，未处理同身份子集，后修；另一夹具遗漏产品shared hypothesis输入，补同产品投影后才暴露真实补读状态机缺口。该缺口补完后按用户明确修复可追加一次的授权，仅补验未通过项。未把夹具错误算模型策略失败，也未把5/6当完成后继续生产。

6763/6770曾在初始化时被安全停止（exit0/0在途）；完成上述修复后A19916/B19923同新鲜Run同产品HTTP恢复，真实消费仍待。无新房间/新对局/旧Plan手补/费用重置。T27 5/6、T23 33/36、余4片、正式Plan0/6、对局0/12。最终中文全流程报告仍待真实正式产物，不用本施工记录代替。

本两批diff：native-fact-claims、read-role、experiment contract、product-journey恢复理由、comparison-observation、laboratory参数投影、workspace-run方法/历史交接；两个具体失败脚本与本清单/CURRENT_WORK/TASKS/MEMORY。Harness：harnessLoopUsed=true，targetGames=starcraft_tmg，promptPackRoutes=experiment_planner→source_review→strategy，harnessToolsCalled=实际原件读值/方法编译/角色调度；uiTraceEvidence=本批无UI；agentDecisionEvidence=原付费答案与脚本作者确认；memoryTraceEvidence=未修改本局记忆；trainingTraceCandidates=0；rollbackOrDemotionRules=错源/身份冲突/把前置证据当完整实验仍拒绝；userVisibleChecks=后继可继续但最终产物未验收。

### 第十八批：当前 Plan 来源导航，而非反复要求猜编号（v874）

P1/P2/P5，来自最新A实际P6路径。v872原地图答复已实际恢复且6事实保存；后续来源审核认为地图连通性声明过宽，作者补读仍争议，已正常按职责交战略负责人，不在JSON纠错中强迫认同。地图policy是不要求所有底盘均连通，不等于实际诊断true必为false；没有因审核文字改写Native值。

新的实际停点：战略负责人三轮均把r1的scoreRoute115/deploymentConcept126当当前r2声明。错误码`authored_choice_requires_current_plan_source`正确拒绝，但反馈没有精确当前入口，后两次仍照抄旧编号。末次请求`feeec9d2a003c74aad717a7b3b46833ce2ca3802462d94b516605d6b657e0c6e`、回复`0c081610a0b110628453d7c1ae5c3e4c1b59f78c33f8d528ce1e96bc99e3d12e`，A正常exit0，Plan r2未放行。

修复共享来源检查器：旧结构块精确匹配当前同路径块，提供当前编号184/195与原件是否相同。原115/184原件相同，126/195已不同；两者都不自动替换旧回复引用，不把导航当事实/策略审核通过。新鲜校验与冷恢复的反馈同源；模型必须读当前内容、显式确认或修订。现有产品恢复入口仅为没有收到新导航的旧失败提供一次有界纠错，已收到sourceNavigation v1不能再领。

具体bug脚本`debug-slice272-current-plan-navigation-v874.mjs`使用真实A停点/付费请求回复。有效RED两项失败；第一次GREEN导航及错源边界通过，但角色构造时新增代码引用尚未声明的decisionField而失败，属于本次实现错误。增加诊断后定位，改为直接枚举现有role记录数组；按用户明确修复可补一次的授权，仅重跑未过恢复门，通过。累计`build/slice272-current-plan-navigation-v874-final.json`2/2，1项继承旧绿。真实角色执行两条脚本回复：先读184/195，再显式引用当前块，evidence_ready且原军表/Plan/历史调用保留。0真实Provider/Native/生产写，不代表公开理由已语义审核或策略提升。

改动：`roster-review-data-questions-v1.mjs`来源导航、`roster-workflow-read-role-v1.mjs`新鲜/冷反馈与一次旧合同检测、`roster-decision-product-journey-v1.mjs`恢复理由；一个具体bug脚本及工作记录。无部署/提交/删除/数据刷新。A19916已停；B19923请求当前操作后停，最后仍在从1760合法候选执行256评估的Builder查询，有句柄/CPU/在途证据，不因观察超时重启。正式0/6、对局0/12、余4片；真实加载及战略效果待。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=strategy_decision；harnessToolsCalled=同源Plan原件读取/真实角色与workflow；uiTraceEvidence=无UI新增；agentDecisionEvidence=三次实际错引用＋两次脚本读后确认；memoryTraceEvidence=无本局记忆修改；trainingTraceCandidates=0；rollbackOrDemotionRules=旧块不能自动批准当前选择、原源/费用/未知保留；userVisibleChecks=准确告诉作者从哪读，不替作者做选择。

### 第十九批：Builder已选内容从权威审核读取（v875）

P3/P5，来自本次B真实合法1650矿候选。Builder接受compositionProfileId/purchasableUpgradeProfileId及kind/name两类输入，但邻域搜索只识别后者，错误提出已有规模/升级、槽位容量缺失。不是Builder合法性原子误放行，而是搜索适配层重复解释输入出错。

新搜索策略breadth_first_v3直接读取同一baseline.audit.units的unitCompositionResult及selectedUpgrades，按unitInstanceId/recordKey核对，缺失即明确错误，不自行猜测；槽位/当前规模/已有升级统一用该结果。原candidateInput/sourceCandidateHash不变。v1/v2保留原种群与游标；新鲜工具说明及自动发现订单推荐v3。未加入删单位、换战术卡邻域，仍明确有限搜索不证明全局无解，不声称解决B最后一次name式256项查询的耗时。

具体bug脚本`scripts/debug-slice272-builder-selection-v875.mjs`读取B原Native baseline回执e141d48a…和菜单0b46d7cb…，用实际审核规范值构造等价name输入，捕获候选而不伪造合法性。RED的两处实际失败已保存，但断言输出过大使execFile maxBuffer中断，第三项未执行；不能写成完整三项RED。改仅摘要打印（完整错误落盘）后，源修复GREEN一次3/3：ID/name候选与顺序/容量一致、缺失Native选择明确拒绝、旧v2种群/新v3分页边界保留。结果`build/slice272-builder-selection-v875-green.json`，256候选捕获、0真实Provider/新Native审核/生产写。实际产品v3候选合法性及战略消费仍待，不拿这个结果算最终Plan。

改动4个生产文件：budget-branch-query、pregame-scene-laboratory、workflow-laboratory、workspace-run；一个具体bug脚本与工作记录。A19916/B19923现均exit0/0在途，B已完成保存最后搜索a37797eb…，汇总ready。下一同原目录同版续行，保留该搜索，不重放；A按v874一次当前Plan导航恢复。正式Plan0/6、对局0/12、余4片。无提交/删除/数据更新。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/strategy_decision；harnessToolsCalled=Builder规范选择及候选生成；uiTraceEvidence=本批无UI；agentDecisionEvidence=实际候选输入、原生审核与注入候选捕获；memoryTraceEvidence=无本局记忆变化；trainingTraceCandidates=0；rollbackOrDemotionRules=新旧分页不可混用、无Native选择不可臆造、有限搜索不可作全局无解；userVisibleChecks=同一合法军表两种输入表达不再导致不同搜索。

#### v874/v875实际产品消费（非脚本回复）

A56364/B56377同原新鲜目录加载。A战略负责人实际引用当前184/195而非旧115/126，原停点成为evidence_ready；保留固定军表与r2条件性Plan，进入同场景Marauder/Goliath火力调查。地图摘要不提升为逐单位路径或未来计分证明。v874实际恢复有效，不等于最终策略充分。

B原最后搜索回执a37797eb…的实际sourceMineralSpent为1650，256合法候选最高1920，无2000；此前进度根据方法意图称1760起点不准确，应以回执为准，1760只是另一已审核候选。恢复不重算该查询。事实角色`method:0997b9577ea24d1c`真实读取175/176，指出searchScope排除remove_unit/remove_upgrade/replace_tactical_card；以strategy_required交作者，而非擅自改表或宣布2000无解。Native fact引用同时保留合法1760与原搜索1650的差异。后继战略作者实际补读7项，等待确认。这证明本次能力缺口交接有真实消费，不证明已产出最终表/Plan。原prompt/reply均在hsxEYu/8aBuEV原工作流artifacts，费用不重置。

### 第二十批：读取与事实校验共用原件定位（v876）

P1/P3/P5。本次B真实方法e0ce9c658fc836e1先由现有流程自动纠正map_summary多余method参数，地图查询成功；事实阶段三次错误`native_fact_receipt_path_invalid`却不是数据错误。模型186/188引用产品注册的精简视图，原件185/187为Native结果。倒数第二次真实答复c4f0f8df…的6个/receipt值逐项与原件相同（任务标记、战场、通道、底盘目录、连通性证据范围、部署几何）；校验器只识别原生包装，未使用reader已有视图解析。旧报错又诱使末次42000642…改引/sections整体，后者确实只是导航元数据，不应通过。

修复：从receipt-view抽出共享pointer映射，workflow reader及native-fact verifier同时使用。事实验证沿注册view.evidenceId读取current tool_receipt，防循环/缺源/过期，按原件精确值比较；记录模型引用身份和真实源路径，不改模型原文。/sections整体与状态元数据不作为Native值；错误给出原件与精确字段入口。冷纠错由同一投影生成新导航；旧包装错误仅一次受控作者确认，经现有产品恢复通路，不买重复工具查询、清次数或自动准出语义。

`scripts/debug-slice272-view-native-facts-v876.mjs`直接用真实B停点。有效RED三项失败；源修复后唯一GREEN3/3：6事实正确定位且原答不变；元数据/错值/过期/缺源/循环/unknown六反例拒绝；真实workflow reader＋角色读取/校验＋一次脚本作者确认成为evidence_ready，原军表/Plan/历史调用保留、同合同不能再获恢复。证据`build/slice272-view-native-facts-v876-{red,green}.json`，0真实Provider/Native/生产写。测试构建期间发现workflow没有直接read方法，GREEN前使用其真实read_evidence命令；没有无效重跑或把脚本确认当真实生产证明。

修改5生产文件：receipt-view共享映射、decision-workflow reader、native-fact-claims原件核对/导航、read-role新鲜/冷接线、product-journey一次恢复理由；一个具体bug脚本与工作记录。A56364安全退出0、B56377错误边界退出0，均0在途，下一原目录同版加载。A当前无可攻击domain并未被伪造为攻击结果，原方法继续处理场景前提；完整策略/正式生成仍未完成，0/6/0/12/余4片。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/source_review；harnessToolsCalled=同源证据读取及原生事实核验；uiTraceEvidence=无新增UI；agentDecisionEvidence=真实三次错拒与原件六值、脚本确认；memoryTraceEvidence=无本局记忆写入；trainingTraceCandidates=0；rollbackOrDemotionRules=metadata不可当原生值/错源未知不放行；userVisibleChecks=正确工具结果不因展示包装不同被反复退回。

#### v876实际产品消费

B原方法e0ce9c658fc836e1经一次真实作者确认，calls4→5、六条verifiedNativeFacts同时保留视图186/188与原件185/187，结果a0dae40e00b3d44d6ed38f6f4a9c24dbad2a5cf4617da6e2386c2de1c8ab01e5。独立来源/覆盖审核通过后交战略角色，没有重放地图工具。作者之后再授权相同武器调查被既有unchanged_investigation_authorization拒绝，下一回复实际选择1760临时军表＋初步Plan并继续补足2000，说明已产生取舍；但该回复JSON错误，尚未提交，不能将意图计为联合修订成功。地图标记颜色的个别叙述顺序与Native序号不一致，精确六事实与路线坐标相符；作为最终语义审核注意项保留，不静默改模型原文。

### 第二十一批：已完成错误正文归内容纠错，不归网络未知（v877）

归属P1/P5。B请求d07813314f22b9ebbf8210414086d94228786ea860387a653606045879ed12d3、回复76c5eba6d3c55d9353051355f70cafdaab93f7351e9eccf8e10e9cc47284b13f已完成，79857units（输入74691/输出5166）、25.873秒。rawText是错误JSON，Secure Adapter保留了failedOutputRecord的正确strategy_decision身份、轮次3和合同；provider-boundary包装漏roundKind，通信检查报ROSTER_WORKFLOW_REPLY_IDENTITY_MISMATCH，保留pending并停止。不是网络请求未通，不是未知费用，也不能手写修复1760表/Plan。

源修复三处：provider-boundary从原失败记录复制身份；对旧已保存失败原件作严格无冲突投影（核request上下文/轮次/合同、rawText完整性、已付费与usage），经现有reconcile_provider_reply命令进入provider_output_invalid纠错；workspace-run的共同synchronize先执行该协调，Web/App与脚本使用同一入口。协调命令补通信校验，不新建重试链。原reply不改，失败历史、费用和consecutiveCorrections保留；无法确认源身份的记录不获豁免。

脚本`scripts/debug-slice272-failed-output-identity-v877.mjs`直接用B真实停止快照：已有RED三项失败，修复后唯一GREEN3/3。包含10个错身份/原文/合同/费用反例；真实workflow dispatch冷恢复后pending清除、仅追加保存回复、needs_model_choice且内容纠错明确、次数加1而非清零，再次协调为空；0Provider/Native/生产写，军表Plan逐值保留。证据`build/slice272-failed-output-identity-v877-{red,green}.json`。仅证明这个恢复边界，真实内容重答、Builder提交及最终产物仍待。

改动：3生产文件（provider-boundary、decision-workflow、workspace-run）、1具体bug脚本与工作记录。A70080/B70087均exit0；A0在途，B唯一pending为上述已完成错误回复。下一同原目录同版续行，不重新初始化房间、不重买已保存响应。正式Plan0/6、对局0/12、T27 5/6/T23 33/36、余S272/S248/S249/S250四片。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=strategy_decision/content_correction；harnessToolsCalled=原件读取及已有reconcile命令；uiTraceEvidence=无新增UI；agentDecisionEvidence=真实1760联合修订意图但未提交；memoryTraceEvidence=无本局记忆变化；trainingTraceCandidates=0；rollbackOrDemotionRules=身份冲突不恢复/格式错误不算战略通过；userVisibleChecks=已收到的错误格式能回原角色纠错而非卡成断网。

### 第二十二批：精确冗余字段不重复付费纠错（v878）

P1/P4/P5。v877已实际冷恢复，原错误正文进calls且新两次模型回复修好了JSON。后继仍在同一处schema失败：`/decisions/0/mutation/plan/invalidationTriggers/1/triggerTrigger`多余，而合法`triggerText`已存在、内容都是“补给损失超过计划上限”。最新真实请求66a87d7969824e5bef705b01ecc73a1b37ac3a2ade1b2bec591f9d885bd2e295，回复fb6831fce3515aae4528b02e4230e92c197c0c64ed62899c6a04631abaac1dc0；已收完、费用已知，不能作为网络重发，也无需重写整套战略。

在既有schema-owned-field-projection模块增加通用精确冗余剔除：只对additionalProperties=false且无patternProperties的明确对象生效；未知非空字符串必须与唯一合法同级字段完全相等；联合schema必须只有一个可用类型分支。保留原件及from/retainedAt投影，不新增默认值、不改数值/规则/选择。不匹配、冲突、独有内容、空字符串、多目标歧义、开放对象均不动。共同read-role的新鲜输出与旧付费答复重验使用同一函数，后续完整语义和来源门保持；不注入策略prompt、不按trigger拼写做特判。

具体bug脚本`scripts/debug-slice272-schema-duplicate-v878.mjs`，RED三失败→唯一GREEN3/3：实际原答仅删除这一完全重复字段后符合合同，合法Plan所有值不变；6类负例不丢弃；原停止工作通过正常revalidate_role_reply/run_ready成为evidence_ready、0Provider/Native/生产写、原调用数和军表Plan不变。最终Builder联合提交不是这个离线证明范围。证据`build/slice272-schema-duplicate-v878-{red,green}.json`。改动2生产文件、1具体bug脚本及工作记录。

A91197/B91204均exit0/0在途后，同原目录同产品代码启动A98695/B98708（activeRuns879）。A已有Goliath→Kerrigan实测期望伤害4.083（36样本、advisory_estimate、不证明互击/进场/存活），正在补其他对照臂；不能再描述为零火力结果，也不能算完整对照。B仍r0待Builder实际提交。正式0/6、对局0/12、余4片。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=strategy_decision；harnessToolsCalled=共享合同投影/既有原答重验；uiTraceEvidence=无新增UI；agentDecisionEvidence=原作者1760临时表＋Plan选择不改；memoryTraceEvidence=无本局记忆变更；trainingTraceCandidates=0；rollbackOrDemotionRules=独有或冲突语义不能自动删；userVisibleChecks=无损格式重复不再要求重写全Plan。

### 第二十三批：合法候选到Plan不能要求模型再转写（v879）

P1/P4/P5。v878真实原答重验后仍在apply处报ROSTER_CANDIDATE_UNIT_INVALID，产物ac8b1b689f855ff61cece955ca2c6d988909f364c9de8303e29483386dbedf97。候选本身Native合法；Builder支持compositionProfileId，而Plan createRosterCandidateV1仅认compositionKind。旧apply直接复制输入，没取同次审核已解析的规范选择。模型随后通过原修复角色读取audit、重建名称式单位，实际提交r0→r1（结果30e13160…，Plan hash793b1bf6…）。此时真实军表1760矿145气、9单位32模型、12起始Supply、7升级，剩240矿，非2000最终产物。选择与计划由模型提出，不是Host代写；但因工程输入形状迫使模型重抄显然应消除。

修复仅draft apply：Native合法后，按候选unitInstanceId/recordKey与当前audit.units一一对应，用unitCompositionResult.compositionKind和selectedUpgrades的实际名称/profileId/专员模型建立Plan内的标准军表视图。原candidateInput、卡牌、候选选择、模型Plan原文全部保留；receipt记录current_native_builder_audit来源。缺Native单位/错身份/重复单位返回adapter_contract_error、correctionOwner=engineering，不诱导模型改战略来解决工程字段。

`scripts/debug-slice272-native-plan-candidate-v879.mjs`复用真实候选原件96b9b846…、原付费答复fb6831fc…及原r0草稿d8f2306f…。RED两项均复现旧ROSTER_CANDIDATE_UNIT_INVALID；修复后唯一GREEN2/2，原ID候选经完整apply得到同1760表＋模型Plan联合草稿，9单位/所有升级逐项等于Native审核，输入和原文不变；3类坏Native来源明确归工程。使用已保存Native结果的内存Adapter，不重放已成功规则查询；0真实Provider/Native/生产写。证据`build/slice272-native-plan-candidate-v879-{red,green}.json`。1生产文件、1具体bug脚本及工作记录。

不回退真实B r1、不重验其已提交旧表。A98695/B98708均exit0/0在途后，A9491/B9498同原目录载v879，继续A限定对照和B Teach。下一次真正新修订才观察本次规范投影的生产消费；不得据离线联合提交重复计算正式生成。最终Plan0/6、对局0/12、余4片。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=strategy_decision/local_teach；harnessToolsCalled=当前Builder审核→Plan标准投影；uiTraceEvidence=无新增UI；agentDecisionEvidence=真实1760表和Plan联合提交/对应公开取舍；memoryTraceEvidence=仅工作流草稿、非本局记忆；trainingTraceCandidates=0；rollbackOrDemotionRules=单位身份不匹配不得构造Plan；userVisibleChecks=Native已接受的两种候选地址均能进入联合草稿，不需模型充当转换器。

### 第二十四批：概率错误要报告实际查询场景（v880）

P3/P5。A方法7fe5f74e6c244223的四个probability实际请求都有attacker/target/domain，却省略base。模型publicReason明确沿用b47f8da9…假设接战分支，而四张原生回执baseStateHash均为根源8ef7e555…；在根源上使用另一分支domain导致PREGAME_LAB_PROBABILITY_DOMAIN_ACTOR_TARGET_MISMATCH。原反馈归通用unresolved read method，模型随后多次读取同一个武器/目标列表，说“在保存分支上却不匹配”，忽略实际查的是根源。这是工具反馈缺少准确上下文导致的可解释纠错低效，不是已证明攻击原子计算错误，也不能由Host偷偷替换场景。

新增pregame_probability_scene_selection_v1同源投影，直接取失败request.base、receipt.baseStateHash/sourceStateHash和domain/双方ID，明确是否省略base、实际是否根源、estimate仍未知；给完整stateRef或base的显式输入方式，不选武器/场景、不授权新模拟、不重放成功场景。workflow-laboratory的错误解释与read-role旧task.failure的当前输入共用同一纯函数；保留原request/receipt/历史，不靠旧报错字符串猜原件。改3生产文件与1具体bug脚本。

`debug-slice272-probability-scene-v880.mjs`读取实际A错误：首次RED来源合同仍通用、角色未调用；源码修复后来源门（实际根源、显式branch保留、成功回执不转错误）通过。角色项仍0调用，查明夹具复用了已branchReturnRef退役的调度节点，不是新生产回归；改成完全相同输入/角色的隔离注入任务，只补未通过项，真实read-role生成请求收到新source feedback且保留原请求/回执、1脚本读取、无战略改动。累计2/2，`build/slice272-probability-scene-v880-final.json`继承来源门，0真实Provider/Native/生产写。只证明反馈传递，模型是否正确选分支并测量仍需后继实测。

A9491/B9498正常退出且0在途后，同原目录A28606/B28613加载v880；A仍r2固定表，B已r1/1760表，不回退或复活已返回的旧子任务。正式Plan0/6、对局0/12、T27 5/6/T23 33/36、余4片；无删除/提交/代理/数据更新。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner；harnessToolsCalled=原失败request/receipt投影与同角色读取；uiTraceEvidence=无新增UI；agentDecisionEvidence=真实错误场景解释与脚本精确读取；memoryTraceEvidence=不写本局记忆；trainingTraceCandidates=0；rollbackOrDemotionRules=不得自动换场景/武器或把unknown变0；userVisibleChecks=用户选择的场景与实际执行场景能直接对照。

#### 后继真实测量（B r1）

B同产品方法551549c19c4aea25在已明确的假设场景12e1224d01b4604bf052adc6e03d28c13b5d254c12c40c8312414d03a5979a6c完成两个probability：order0:marine-light-prob的期望伤害/伤亡均5.6666666667；order1:marauder-armoured-prob期望伤害4.75、伤亡0.8055555556，均resultStatus=ok、unknownReason=null。两摘要均evidence_ready。它们是不同攻击者/目标的条件测量，不足以单独推导哪种军表更优、实际计分或胜率；后继Teach/总体选择仍在途。A28606/B28613最后句柄核实仍live，B仍r1/1760，A仍r2/2000；不重算这两项已成功事实，不增加最终Plan计数。

#### 后继真实测量（A r2）

A在同一明确分支b47f8da9abc24fd9adafd50a7c7be4d434fe8d724774f4fc000b73be16a77a74完成四个单攻击测量，均ok/unknown=null。Marauder→Kerrigan：期望伤害5.6111111111、伤亡0.1111111111，原件5b21213702e811f839d4d77720b9d81b25b027bdf6c62a6bda25748ab78aaa76；Goliath→Kerrigan：3.1666666667/0，原件fc447537d368b18513f0b787f6da417abe6bff673ecba6022ef2e3d0aa92e998；Marauder→Raptor：4.9166666667/2.25，原件a9119c70e5213382454ca9ac532b7b5a357517d9e9d33e36bea51512bd4ee157；Goliath→Raptor：3.3055555556/1.3888888889，原件880050f06deb24474cabebeeadaf38ce5985bbf3820fc4c51a7f6ba492e4e9ff。不能把不同单位配置的单攻击差值称为总体优越性、联合齐射或最终Plan验收；后继来源/取舍仍需观察。

### 第二十五批：作者接管不应永久关闭结构化纠错（v881）

P2/P4/P5。B r1的两个条件火力事实及独立来源审核已经返回，但总体作者反复保留1760表，把满2000、得分路线、损失预算、激活顺序再次交给“作者”。最后请求ed884d90b3829fb636ca9af1aa0f0c0bcc0ccecab875f6325153ec5daac33cf9、回复602566c6df1c608ee8ea27a553aba6efb118770f77ad63e593d444e9e8424364，错误author_choice_requires_author_action。不是网络失败，也不应无限加轮次。

实际工程接线有两处不一致：read-role只要operation.authorDecisionHandoff存在，就永久跳过prepareRosterStrategyRepairRequestV1；既有作者command只识别strategy_owner_assignment，不识别另一条合法作者交接路径。于是新阶段的后续错误仍收到巨大旧完整答复，旧选择又在feedback/handoff/evidence-delivery多处作为模板重复出现。观察支持其为重复输出的重要诱因，不声称仅凭代码能证明全部模型行为因果。

修复：作者首轮没有反馈时保持正常合同；后续反馈统一经过既有纠错编译器，两条owner入口共用read/catalogue/decide命令，问题更新按编号、未修改项保留。旧完整答复仅留原件及Host投影状态，当前prompt保留来源和问题，不自动选择军表、清未知或批准Plan。显式说明已完成子调查只限定证据范围，不剥夺总体作者作下一选择的权限；固定/可编辑军表权限原样保留。产品自动识别旧合同仅一次定点恢复，新command不能再次触发同恢复。改3生产文件，未改规则/数据/房间。

验证脚本`debug-slice272-owner-command-continuity-v881.mjs`：实际停点RED两项分别证明旧合同不提供decide、完整角色执行器仍跳过转换；修复后唯一GREEN2/2。包含6负例、7问题原样保留、显式Plan修改参数投影无改变、Host状态不发Provider、同角色冷恢复、原调用/交接/草稿/费用保留；故意注入原未决选择仍被原语义门拒绝，不以格式修复放行。证据`build/slice272-owner-command-v881-{red,green}.json`，1脚本Provider回复、0真实Provider/Native/生产写。该验证证明接口可用/恢复不越权，不是策略提升或最终生成成功。

A28606优雅退出、B28613已正常终态，两组均0在途，随后同原目录A53774/B53812加载v881续产；不重建房间、不重放成功攻击、不清账。下一验真实作者是否读取候选并通过Builder/Plan联合提交，以及A限定实验是否回到选择。正式Plan0/6、对局0/12、余4片不变。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=strategy_decision/author_command；harnessToolsCalled=共享角色执行器/正常恢复/显式作者操作；uiTraceEvidence=无新增UI；agentDecisionEvidence=真实拒绝答复与脚本新操作输入；memoryTraceEvidence=仅工作流、无本局记忆；trainingTraceCandidates=0；rollbackOrDemotionRules=原未决义务仍须阻塞，Host不得替模型选表或删除问题；userVisibleChecks=事实返回后作者能直接选择下一操作，而非复制旧失败模板。

#### v881 后继真实结果

B实际请求48a81f4477c875f195b66fe00ba2dc875bc16905f0e2d1e86690d42a1a602ea4、回复eb3715396c52c0e75e6cfa168820be52029c056293a1f6ed4674148505311829选择更新publicSummaryText/componentPurposes，通过联合提交r1→r2；草稿bc04b820357f4f32e3c08e3d043b8d28f09d26ba6eba900fbdf21d00d0e41d3b。消费Marine/Marauder条件攻击测量，明确Goliath未测范围，保留其他Plan块。军表未改，9单位32模型、1760矿145气；这次主要补强证据，不据此称策略改善。新Teach回复12b58f0dce589325a32367d431ded5fbc33c218c64e035728b37714c787ddb54已返回，仍有首回合位置取舍/次回合路线与控制比较。最终未发布。

### 第二十六批：写入与验收共享Native表示，工具引用统一解析（v882）

P1/P3/P5。实际B r2停止于ROSTER_DECISION_NO_READY_WORK。机械检查中的plan_candidate_not_current是假问题：v879写入已使用Native selectedUpgrades中的profileId，readiness却仍从原始upgradeName构造并比较。相反requested_mineral_target_unmet（缺240）、unit_purposes_missing和card_purposes_missing是真实未完成项，必须保留。

新模块roster-workflow-native-candidate-v1供draft/readiness共用同次合法Native审核投影，核候选、单位一一对应、规模/升级来源。旧A名称式Plan没有profileId时，只能以当前Native同单位/名称/指定模型的唯一选择作只读规范视图；原件不变、显式错误ID/规模/旧审核仍拒绝。不是取消一致性检查或手填旧产物。

第二个实际停点2a379a667b7cf9547e7048bbb7bddb5f721e21e29285a6d2a7b13d1634bfd874：已保存solve-hold结果0aa5b5d26391da65ca28249b660efa99d2c24aafecdfb88fce1263a9e95e4f6f的完整stateRef被绑定到/base；executor只识别/stateRef，遂回explicit_parent_required，反复修参数却没有进入Native。共享引用模块现在对完整已知typed结构作无损位置归一，仍用原来源/上下文/冲突验证器，记录inputBindings；不自动选场景或替换模型选择。旧同错误给精确v3修复合同，现有产品恢复器可一次追加该明确修复，不重放成功求解。

验证`debug-slice272-shared-inputs-v882.mjs`读取上述真实草稿/失败工作单：RED2项；源码修改后唯一GREEN2/2，含8负例、实际A旧表示不误拒、B真实三阻塞保留、实际生产adapter把相同option送到相同Native父入口。原生边界用隔离桩观察，不执行新Native/Provider、不修改生产记录，不能宣称队形已实际生效或完整生产通过。证据`build/slice272-shared-inputs-v882-{red,green}.json`，不重跑旧通过门。

A53774/B53812均exit0且0在途后，同原目录A77302/B77309载v882继续，句柄activeRuns883；日志见CURRENT_WORK。下一观察真实状态引用恢复及作者填补剩余军表/Plan，不提前开战。正式Plan0/6、对局0/12、T27 5/6/T23 33/36，余4片。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/strategy_decision；harnessToolsCalled=同源Native候选投影/工具参数绑定；uiTraceEvidence=无新增UI；agentDecisionEvidence=真实B r2及失败原件；memoryTraceEvidence=只读工作流证据、无比赛记忆写入；trainingTraceCandidates=0；rollbackOrDemotionRules=错源/冲突不得归一、真实预算与用途门不得绕过；userVisibleChecks=相同军表不误报不同、相同引用不要求模型反复重写。

### 第二十七批：产品恢复采用工作图声明依赖（v883）

P5。v882同版B实际仍终态NO_READY_WORK，已修的stateRef错误没有获得一次受控恢复。原工作bindings仅army/rules/map/source，这是P3限定实验的正常依赖；全局Plan r1→r2不改变其原实验条件。产品resumeCorrectedHostBranchFaults却要求五字段包括plan完全相等，使合法当前实验被跳过。已改用现有graph.isCurrent；不另发明依赖判断，也不删除显式Plan绑定。旧来源合同版本、实际付费请求、同修复不得追加两次的检查均保留。

脚本debug-slice272-recovery-bindings-v883.mjs使用B实际状态、实际paid输入/失败和当前projectToolRepair，跑隔离产品start/close，截住准备边界不推进模型/Native。首次夹具未截住循环、缺run.readiness，明确不是生产原因；补操作边界后RED证明实际0恢复。来源修复后唯一GREEN：当前任务1次恢复，错source、显式旧Plan、已return、同修复已恢复各0次，原快照逐字不变。证据`build/slice272-recovery-bindings-v883-{red,red2,green}.json`；0真实Provider/Native/生产写，不重跑v882等旧门。

A77302已优雅退出、B77309正常终态，0在途后，同原hsxEYu/8aBuEV目录启动A84770/B84777、activeRuns884，加载同版；不是从空表重来，也不重算已成功求解。正式Plan0/6、对局0/12、T27 5/6/T23 33/36、余4片；真实源修复恢复和最终2000分产物仍待观察。

#### 实际实例覆盖缺口与v884

v883真实B仍NO_READY_WORK。不是同轮模型重试失败：模型根本尚未恢复。实查createRosterWorkflowLaboratoryExecutorV1.projectRepair有一处旧formation通用分支，先于共享投影返回v2，盖掉v882具体v3。v883隔离产品测试以共享函数作为run.projectToolRepair，证明了产品绑定判定，却未覆盖真实实例包装层，这一测试边界不足必须承认。

将通用formation分支移入同一共享projectRosterWorkflowToolRepairV1、置于具体错误之后，删除实例重复实现。新定点脚本debug-slice272-source-repair-instance-v884.mjs读取实际失败，经真实executor.projectRepair及projectRosterWorkflowRoleSourceInputsV1投影：RED实例2≠3；唯一GREEN实例/角色两处均v3、原失败request不变。0Provider/Native/生产写，旧门不重跑。A84770/B84777已终态且0在途后A89859/B89867同原目录载v884，activeRuns885。真正产品恢复与最终产物仍待，不能以离线GREEN宣称整个流程成功。

### 第三十一批：跨调查窗口发现与局部职责隔离（v889）

P2/P5。实际A请求`6a827d4f4a7a1c290336e76af8ca2a6ce78b03494cd662062f166ebfbeed801f`包含旧测量371/373/375/377的总目录号码，但当前questionEvidenceDirectory只含最新窗口，measurementConfigurations也只有失败旧臂与最近Marine臂。模型因此继续说Marauder/Goliath结果缺失。四原件实际均完成且当前同源，在b47f场景；最近新增c16f场景不同，不能由Host强称所有结果等价。

新增`roster-workflow-investigation-evidence-v1.mjs`由各角色共享source-input接缝调用：沿工作图显式祖先责任关系，保留同源已完成工具的原件/视图号码与来源目的，使用稳定编号按需读取。原记录、已授实验、未知与战略责任不改，不自动把目录当读过、成功或可比较证据；不同当前军表/地图/来源不混入。只供策略与事实负责人，单动作choice/repair/orderRepair不带父历史。

`debug-slice272-investigation-evidence-v889.mjs`先对实际角色输入RED，主修复后一次GREEN：四实际来源重新可达、6负例、旧视图不当前则指原件、战略和事实角色共享，50条目录24786字符，不含原始整批历史。随后检查本次新增索引的局部角色泄漏，实际choice先RED（输出过长已落盘，非生产失败）；补职责保护，仅跑该门GREEN，主门继承未重跑。最终`build/slice272-investigation-evidence-v889-final.json`累计2/2，0真实Provider/Native/生产写。只证明交接正确，不能保证模型一定复用或整体策略提升。

原A50995/B51002均终态0且无pending后，A71390/B71405同原目录加载v889，句柄activeRuns890。B已实际联合r2→r3、1760→1980，Native合法9单位32模型12Supply、11升级145气；缺20与其他未完成项不放行。A仍r2固定2000。正式Plan0/6、对局0/12、余4片。下一必须观察实际取舍/最终生成，不用本检查替代P6。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/strategy_decision；harnessToolsCalled=工作图及共享source-input；uiTraceEvidence=无新增UI；agentDecisionEvidence=实际缺失声明与保存的四原件；memoryTraceEvidence=仅工作流发现、无本局记忆写入；trainingTraceCandidates=0；rollbackOrDemotionRules=错源或局部职责泄漏即退回，不能自动批准旧结论；userVisibleChecks=用户可对照哪个结果已取得、由谁读取并影响哪次选择。

### 第三十批：Native菜单已发布身份必须能被同源解析（v888）

P1/P3/P5。B已实际执行resolve_mission_start_of_round（85d8d1c3…），inspect1ae702ed…有两个choose_first_actor条目，candidateId分别在外层。paid266753ec…选择正确ID，旧解析却只匹配entry.action导致0匹配。现在预检与执行共用nativeSelectionIdentity，暴露真实candidateId/entry.proposal.actionKey/sideKey/chosenFirstActorSideKey；无唯一匹配或字段冲突仍拒绝，不推测actionKey。

真实RED两项；第一门GREEN检查两席精确选择和4负例。第二门首次夹具错误要求未读条目直接通过，实际流程正确先补读待确认；修正夹具后仅补该门，保存reply不变、零重买、一次脚本确认，累计2/2与5负例。`build/slice272-native-choice-identity-v888-final.json`，0真实Provider/Native/生产写；不是最终Plan验收。旧A32953/B32960终态0且无pending后原目录A50995/B51002载v888。真实后继B最终进入1980表/Plan联合提交，A新Marauder两臂回战略；原四条成功测量未被专用索引交回的问题转v889。

### 第二十九批：只读意图和未派发动作输入应有确定交接（v886）

#### 后继实际消费与v887

v886真实A原付费只读已归还；随后744c5f4a97dfd60c9a212a3780a32bf8d65b717d4775a879950c65442efe557a明确选择blocked、无读取/搜索/工作单，但标签仍finish，又被仅标签合同拒绝。该回复没有伪造攻击结果，指出当前菜单只有charge而无单目标攻击域；不应付费重复生成同一结论。新/冷输出同一判定仅对这种唯一显式结论投影conclude，原status/answer/证据/未知不变，完整语义与来源检查照旧。混有工作单/读取/搜索，或另有事实错误，均不可凭此放行。

`debug-slice272-conclusion-routing-v887.mjs`实际停点RED→唯一GREEN，真实核心冷重验后evidence_ready承载blocked且acceptanceGranted=false；4负例、0Provider/Native/生产写、旧calls/草稿不变。`build/slice272-conclusion-routing-v887-{red,green}.json`。不重复v886或其他已过门。

v886真实B已自行用菜单选择器修正，68b14a75…先提出pass并inspect，下一36d4a1c…限定单动作，a58c09b802ced95b6fbef90ebcf4549bf65bd7874b9d126944555e224edfdccb实际Native成功。公开理由说明当前所读场景为Assault且只有pass：这是模型明确选择的条件转移，不是原resolve_mission_start_of_round成功的证据。后续summary必须保留该边界，不能以同native_action操作类型抹去语义差异。

旧A26770/B26777已终态/0在途后，原目录A32953/B32960加载同版v887；真正方法回交和最终2000分Plan仍待。正式0/6、对局0/12、余4片不变。

实际后继已观察：A原blocked经过正常方法返回，summary `1afc54447b5900c8c8ea12a00187b4014ab7a399ff93745f9041d6538987c7c1`保持unknown/未测量，不虚构存活率；总策略重新授权已有Marine场景及具有真实攻击域的有限对照，明确拒绝charge域重试。B策略结果`97f614463261998d43f1a12ec82d8e68381a141d08b9825bdeea9199b061a0a8`仍要求路线事实；后继`ae4615ca9b9341e907ec2a0163fe0f97a73a53e24000337c09be13ab4ab8dd38`明确旧pass发生在Assault/假设摆放场景，不能证明首轮部署到达，改选有限原生初始化方法。最后核实A/B句柄live、events3284/2266、无needs_repair；草稿r2未改。只证明责任交接真实推进，不证明策略比较完成或新方法已成功。

归属P1/P3/P5。v885实际B已进入r2 Teach后继，并执行限定路线查询；这里修复的是随后真实两停点，不恢复旧大上下文调查。

- A原付费回复`c62dd33063c169b24e37014ea79eb4e8e0a601bc00968cad600829e3633b6db0`已明确识别charge declaration不是attack_probability接受的攻击域，只请求两条473菜单读取、无工作单/结论，但标签为finish。原资料均已读取，且模型进入封闭准备窗口；旧反馈仅重复finish_requires_role_decisions_only。新/冷回复共用显式只读判定；一般窗口可按实际只读payload归类，封闭窗口只给一次“资料已读、请决策”的回交，不再读取、不批准结论，不重新开放查询额度。
- B `product:after-teach:r2:subject-v1:investigation:method:37509e1a73ab4bdc:order0:resolve-mission-start`用顶层kind/candidateId加stateRef，违反native_action封装。Native未执行，却因验证抛错停整组。现在该验证返回同一源动作合同和字段问题，既有模型纠错处理；不能自动把candidateId变为actionKey或选择动作。旧not_dispatched/无pending/当前同源工具任务经核心恢复命令只重入输入验证，原失败/输入保存。

`scripts/debug-slice272-read-and-action-input-v886.mjs`以实际A/B工作流和原请求/回复建内存store，使用真实核心、角色执行器和lab包装。RED：A无重验路径，B抛原输入错误。唯一GREEN2/2：A完整冷重验复用付费回复、零新读取、返回待决策；B完整核心重入返回needs_model_choice、保留旧失败、重复恢复零操作。5负例覆盖非空工作单、非空结论、其他语义错误、未知执行结果和pending。0真实Provider/Native/生产写，草稿/最终批准不变；不重跑旧门。证据`build/slice272-read-and-action-input-v886-{red,green}.json`。

旧A96438/B96445终态且0在途后，同原目录A26770/B26777加载v886，日志见CURRENT_WORK；真实纠正/最终产物待。A固定2000/r2，B1760/r2缺240。正式Plan0/6、对局0/12、余4片。A原charge查询错误仍需通过模型明确选择正确限定方法，当前修复没有伪造攻击结果或证明策略更好。

### 第二十八批：成功子操作归还须收敛后才判无工作（v885）

v884实际生效：B受控恢复原formation_scene，模型选择原已保存option0，真实工具回执8c8d3a3a4617f46991b4a23f559093a144247a3d022af10f8acb83c3c47cf8bf为completed/ok，base=source，分支8495063ffdbc682d0d8a076caa5d2536e8d8b7aa6f4cbd555f011f9d02603b4c。成功solver未重算，说明输入与恢复两项已在真实链路推进；仍不证明该布阵战略更优。

下一产品停点仍是NO_READY_WORK，但性质不同：原同步函数按旧state快照从早到晚扫一遍，深层成功只逐次归还一层；产品判断无ready时，尚有两层纯工程归还未处理。隔离真实工作流和原核心dispatch单步证明：已保存成功替代可合法将第一个父状态变为evidence_ready，外层仍needs_model_choice。原生动作已完成，不应重新调用模型/工具处理这个机械状态。

新roster-workflow-replacement-settlement-v1由实际workspace同步函数调用，有限队列沿已声明repairFor/choiceFor关系继续归还，全部仍走原resolve_with_work/resolve_choice_with_work的同源/同操作/问题匹配/真实回执检查；保留resultHistory及resolution链，不新增成功回执、不授语义通过。已归还结果不重复处理，未成功/未声明关系不推测。

`debug-slice272-replacement-settlement-v885.mjs`读取真实v884停点，以内存store执行原核心：一次GREEN两层归还、同8495063f原生后态、失败原件保留、重复settle零操作、草稿与acceptance未改。0Provider/Native/生产写，原生产workflow逐字不改；`build/slice272-replacement-settlement-v885-green.json`。RED为此前REPL实际单步留下外层needs_model_choice及真实产品NO_READY_WORK，不伪造一次新RED命令。A89859/B89867终态0在途后，A96438/B96445同原目录载v885；正式Plan0/6、对局0/12、余4片。下一验证原摘要被释放和作者完成军表/Plan，而非用这项门替代产品验收。

#### v885真实生产消费

B同Run实际完成归还，原summary后继释放；product:after-teach:r2:subject-v1三次返回后evidence_ready，结果925be73d869750a9ed42b2d530779fddf8ee95ba05b03eafdeface4f34bd9424。公开理由：采纳路线/计分查证，保留已注明边界的条件火力分工；只授权Marine/Marauder从ZoI到三个指定点的到达轮次与第2轮标记控制查询，不扩成全军完整比赛。其后route-marauder-m5结果07ac21aacaceb4fbec1cd891215b5c943614113aad774862b4113dc5dae63e26已保存，事实summary待。表仍1760，缺240与用途缺项不能因此豁免；新的保留决定不算满分军表或策略改善完成。A96438/B96445最后核实live，A current probability选域错误仍自动纠错，原四项成功测量保留。
