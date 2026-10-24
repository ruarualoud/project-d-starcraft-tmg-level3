# P1／P3／P4：局部战略假设到总体决策 v638

日期：2026-10-20。T27／S272。施工记录，不是最终生成验收报告。

## 为什么修改

实际1295、1305只记录／保留事实，军表与Plan r8未变。1300再次提出单Goliath部署；这可以是合法性问题，但不能证明新的战略优势。1303／1307的八条单攻击者火力估计有真实来源，不等于整队交换或三Medic的购买价值。六能力账中的“策略优化”仍未证明。

此前实验单只有问题、用途和停止点，没有统一表达对照、反驳条件及结果如何影响选择的接口。不能用查询成功或回答“answered”替代策略闭环。

## 本版实际修改

1. `roster-hypothesis-test-v1.mjs`：共享的局部假设设计及判定合同。假设、可信备选、控制条件、变化因素、支持／反驳观察、两种结果的决策后果、已有来源和新信息价值。
2. `roster-experiment-scope-v1.mjs`：新工作单的`hypothesisTest`可以为null。普通规则／支付／合法性／缺失测量仍可查询，但标为事实调查，不冒充策略实验。旧保存单不被重写或补成假设。
3. `roster-workflow-laboratory-v1.mjs`：Host为同一工作单附稳定experimentId；设计与实际工具回执、精简视图和条件场景来源一起保存。不进入真实比赛记忆，不自动晋级Skill。
4. `roster-workflow-read-role-v1.mjs`：实验合同2.1.0。实验结论有结构化`hypothesisAssessments`；支持、反驳、证据不足均允许。引用须是真实已交付来源；被引用的明确假设不能仅以工具完成代替判定。没有预声明假设的旧事实不能被事后包装为受控实验。
5. `roster-workflow-source-claims-v1.mjs`：结构化判定与正文一样进入独立源审，核对设计、真实对照、测量和限制。正确的“证据不足”可以是合格事实结论，不会因此成为战略改善。
6. 既有总体决策仍使用真实Builder／Plan修改端口：由模型选择采纳、驳回、调查或有依据保留。实际改动须有`strategicChanges`；只记事实不能算采纳。原有受影响复审继续负责发布，新增标签不授予发布。
7. 产品客户端可通过`--strategy-hypothesis-cycle`在**同一个正式Run**请求P4验收工作。任务只要求模型选一个有价值的战略问题，不硬编码单位、取舍偏好或获胜结论；不新建房间、不启动比赛。

## 新鲜启动接线缺口与定点验证

检查所有生产`compileRosterWorkflowExperimentV1`调用方发现：`prepareContext`创建的Host只读发现工作单没有v637要求的experimentScope。旧Run不一定经过此入口，所以继续旧断点不能证明从头启动可用。

- 新增具体bug复现：`scripts/verify-slice272-fresh-discovery-scope-v638.mjs`，调用实际`prepareContext → compile → advance`，实验室方法受控替身，独立临时目录。
- 最先两次装载被本轮新合同的错误nullable描述位置、缺少注册器要求的maxLength拦截；两处已修正，未放宽现有注册器。
- 合同可装载后实际复现`ROSTER_EXPERIMENT_SCOPE_REQUIRED`，发生在`prepareContext`的编译调用处，未调用Provider／Native。
- 来源修正：Host声明`rules_resource_check`、只读工具／计分／预算发现、无参与模型、无场景经验、`hypothesisTest:null`。
- 修正后只补验该门一次：通过，实际编译并完成2条只读工具工作。Provider0，Native动作0，生产Run写入0。替身实验室，不证明真实地图/规则或完整生成已通过。
- 本次7个修改模块／客户端各作一次语法检查，通过。旧已通过门禁未重跑；没有为新功能另建一组泛化测试。

## 当前真实运行与未完成项

- 旧61528正常保存1338后退出，原因`requested_observation_boundary`；退出已由进程检查确认。
- 新87210从同一`build/slice272-projection-owner-v565-inlKbk`、同一r8恢复，日志`build/slice272-live-product-review-v638.log`。
- 启动时无needs_repair；仅r3已superseded工作留有旧pending记录，未重发其请求。
- **本段写入时新进程尚在初始化。模型实际提出假设、执行对照、形成合格判定并改变／有依据保留方案，均未据此宣布完成。**
- 同版正式完整生成、中文逐步prompt／工具／选择／前后变化报告、成表与现写两流程及战局矩阵仍须完成。本文件不能代替最终产物。
- T27 5/6，T23 33/36；相关剩余S272/S248/S249/S250共4片。正式Plan0/6、对局0/12。

## 费用记录范围

1292–1338新增3,997,917 Tokens，冻结价格估算USD0.551424816。
至1338主Run69,648,010 Tokens，可计价部分估USD11.686344762；项目已知176,324,940 Tokens。
旧830,187未计价Tokens及历史未知费用均保留；1339及以后不在本小计。费用是估算，不是服务商账单。

## 实际1340未完成任务，v639调度与语义修正

1339真实总体规划读取当前Plan／原件；1340却再次复述已纠正引用，直接retain，未给出本次要求的可证伪战略取舍。这不是策略能力验收通过，也不应靠再运行相同泛化请求凑成功。

### 分清两个职责

新增共享产品编排`packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs`，通过已有正式Run的`requestTeach`与`requestDecision`调度：

1. Teach只负责挑出一项有价值的战略假设、可信备选与反驳条件，不修改军表或做整体验收。
2. 总体规划依赖该Teach实际完成的工作结果，决定据证修订、有依据保留、驳回无价值质疑，或授权一个局部对照。
3. 后续实验／回交／Builder／Plan提交／受影响审核继续走原产品，不旁路调用模型、不硬编码战术选择。

客户端`--teach-hypothesis-cycle`调用这一共享编排。两个新改动文件仅各检查语法一次，没有新建泛化测试。

### 修复“未来条件又变必要调查”的来源合同

1340原始第三条requiredData是“**if a quantified medic claim is later adopted**”。在旧作者合同中它只能混入字符串列表，产品随后把整个列表排成当前调查。不是查询工具失败，而是作者与审核者的未解项协议不一致。

- 新作者合同1.4.0复用现有审核端`dataQuestions`三类标准：necessary_fact、future_condition、optional_probe。
- 模型只输出分类、原问题和理由；Host通过已有投影函数生成必要requiredData，保留条件／可选项，不再让模型维护两个可能冲突的列表。
- 不用关键词自动分类，不删除旧原文／旧问责／费用。已派发旧合同请求仍按其原合同处理。
- 具体复现`verify-slice272-decision-question-lanes-v639.mjs`：实际1340暴露作者无分类能力的RED → 修改后仅跑一次GREEN。分类是夹具显式输入，证明合同可表达并正确保留2必要／1未来，不证明真实模型已正确分类全部旧问题。0新Provider／生产写。

87210保存1353后正常退出且进程已确认终止。新93188同Run/r8，日志`build/slice272-live-product-review-v639.log`，启动Teach→总体决策的实际验证；本文更新时尚待真实返回。禁止把“已排队”写成完成闭环。

至1353补计：主Run70,643,403 Tokens，可计价估USD11.810996334；项目177,320,333 Tokens，旧830,187未计价及未知费用保留，1354+未含。正式Plan0/6、游戏0/12、相关余4片不变。

### v639实际执行至1360

- 93188进程已多次以同一PID确认存活，没有因观察等待而重启。
- 1355旧事实分支实际区分了未来全军到达／逐轮实得分与当前事实，不再要求以完整赛前对局演练回答本次保留判断；这是作者提议，独立源审未完成，不算战略比较通过。
- 1357新Teach实际请求当前选表理由、得分路线、部署概念、对手反制和医疗兵／火力比较来源；1360继续读取所需Plan段落与原件，尚未提交提案。
- 新总体决策工作仍依赖该Teach结果，未越过未完成的依赖。当前不是新军表或完整闭环；正式产物数字不变。
- 1354及以后费用尚未计入上面小计。所有实际请求、完整脱敏prompt与回复按编号保存在同Run，待最终中文执行报告引用。

### 实际1372：独立Teach已交付具体战略假设

Teach经过1357/1360实际读取后，1372提交一项investigate提案，已存`9c95dd8b044db33eaeca43a72af9751fb4e38493ef994cc0a9fc98d37da0c0fd`：

- 质疑三Medic的资源／Support槽投入是否在固定争点交火中带来足够生存与Supply留存收益。
- 给出减少支援、转投火力／Supply来源的可信备选，没有强迫删单位。
- 指出现有1124/1138来自不同几何／关系图，差值不能归因于Medic；458/542只是合法／成本证据，不证明更优。
- 提出固定几何、对手火力、资源／能力窗口下的局部比较及决策后果，不要求整场模拟。

这是“真实Teach能提出有价值的可证伪问题”的进展，不是实验／战略改善完成。后续总体规划须审核设计：其中“Wilson区间重叠即推翻效果”等统计推断不充分，未检出差异不能自动证明无效；有／无支援的局部边际效应也不能直接证明三支购买数量最优。控制因素、CP机会成本和备选军表仍须明确，不能直接照抄成获准结论。

冻结Medic来源31已直接核对：Life Support为1CP Reaction，对4寸内其他友方Biological受伤减伤；Restoration为1CP Reaction，对4寸内友方获得DEBUFF后移除；Medpack为1CP Movement Active，对4寸内其他友方Biological治疗。以上不是实验结果。

93188在后续批次仍确认存活；新总体决策依赖该Teach，尚未据此报告改表。P4和六能力中的策略改善仍未准出；正式0/6、游戏0/12不变。

## v640–641：统一来源审核，保留真实记录，暴露实际实验缺口

### 实际1384–1395的交接

1384总体规划实际读取Teach引用的场景、比较与Plan原件。1385把外层action写成investigate，被既有局部纠错拒绝；1386自行改为finish，无手改／重放。产品实际清correction并记录investigate：2项necessary_fact、1项future_condition，Host投影后未来对手／骰子／VP没有进入必要调查。军表／Plan仍r8未改。

1391实验角色读取Medic来源31和此前比较；1395提交了首个带完整hypothesisTest的工作单。其“有／无Medic”设计并没有真正实现处理差异，不能据字段齐全算有效实验。

### 来源审核协议与缓存 v640

实际1387原句源审为supported，却用旧requiredData夹带全军到达／未来实得分；作者／域审已分类而原子源审没有分类，协议不一致。

- 所有**新**来源／能力／域审核请求统一用现有dataQuestions三类；旧精确请求重试仍恢复其原schema，不修改旧回复。
- 源检查合同v3复用实际已通过的旧检查，未通过的旧混合结论不跨新合同复用。
- `verify-slice272-source-review-question-lanes-v640.mjs`最初夹具漏传owner的实际result，修正夹具后真实RED显示两处缺口；来源修正后仅补验一次GREEN，且实际已通过的1条旧源检查仍复用。0Provider／Native／生产写，捕获真实请求构造，不是模型分类效果证明。
- 实际1397–1401已使用三类输出，未再输出未分类requiredData。但个别necessity判断仍需按原义务审核，不能把有分类字段当语义正确。

93188保存1396后正常退出且确认终止，17094同Run加载v640；未另建任务或重建房间。

### 官方记录投影与负缓存 v641

实际1399再次不能确认Medic的武器／能力。跟踪发现共享source-facts把所有来源当Native回执：官方单位的abilities/stats位于顶层，不在receipt，索引因此空缺；原件仍可读，但交付视图丢了类型和正文。

- source-facts投影v4保存真实sourceKind。Native仍用测量索引；非Native来源保留完整sourceRecord与原始引用，官方能力／Builder记录／模型提案各自的原始权限仍保留，不把提案升级成规则。
- 旧v2/v3索引／付费原件不改写，新索引独立保存。
- 仅缓存实际通过的源检查。失败不跨独立作者复审节点复用；同节点仍幂等，原三轮收敛界限不清零。这避免修复交付视图后仍永久复用旧失败。
- `verify-slice272-official-source-projection-v641.mjs`最初误以为实际1399排队元数据已经是v3，修正为通过当前构造器生成的隔离负缓存夹具、附实际失败回执后，RED同时复现记录缺失／错误缓存；修改后一次GREEN。真实源审核构造收到Medic完整8项能力、官方原件未改；0Provider／Native／生产写。旧已过门不重跑。不是完整生产／模型效果验收。

17094保存1408后正常退出且确认终止。新25979同Run/r8载v641，日志`build/slice272-live-product-review-v641.log`；不重新提出假设、不补写旧结果。实际新视图消费仍须跟踪。

### 已实际执行的实验，为什么仍未证明收益

两个scene均Native返回ok，但stateHash完全相同：`e1c604c40aaf5effd014e306bae622cb5710cdc9b9e8fe70467777040b5d10aa`。它们只保留源位置、改assault/player1，并未真正移除Medic、部署参战者或执行支援。

第一次exchange-with-medics返回0条攻击估计，不是零伤害：querySeatKey=player1，而subject是player2-queen，sameSideAsQuerySeat=false；双方当前火力图均0，诊断为no_current_ranged_domains，并明确不能证明零伤害。第二次查询本段检查时尚待执行。不得采纳这些结果为Medic收益／无收益。

进一步检查真实能力：`pregame-scene-laboratory-v1.mjs`的probability/threat_exchange接到同一个`combat-estimation-runtime-v1.mjs`。当前期望分布明确排除可选反应；原生反应适配器能列合法窗口／选择、支付并给出实际damageReduction等投影，Native条件行动也能按声明骰子结算，但这不等于已经提供“执行指定支援策略后的期望伤亡”查询。

这是下一项P3实际能力检查／补齐重点，不再用重复baseline查询证明支援：需要有效几何、同父态／同随机条件、明确的模型所选支援／pass策略、真实Native支付和效果、损失分布／不确定性。普通查询、一次固定骰子演示与期望值不可混算。不得手写减伤公式替代Native；一次支援收益也不能直接证明三支购买数量最优。模型可依当前事实回交／修正方法，必要工具能力缺口须明列，不能清空为通过。

正常产品`roster-decision-product-journey-v1.mjs`已有先Teach再总体决策，使用同一Run／合同／工具；专项P4任务不能代替P6新鲜同产品生成和发布／对战交接验收。当前不扩Web，也未启动游戏。

### 费用及整体边界

至1396主Run73,099,511 Tokens／可计价估USD12.118797432，项目179,776,441 Tokens。
1397–1408另增726,178 Tokens／估USD0.095132712；至1408主Run73,825,689 Tokens／可计价估USD12.213930144，项目180,502,619 Tokens。
旧830,187未计价Tokens及未知费用保留；1409+未含。T27 5/6、T23 33/36，相关余4片，正式Plan0/6、游戏0/12。未宣布P3/P4/P5/P6整体通过。

## v642：完成旧排队视图的真实消费者接线

v641修好了新来源投影，但实际1399任务早已排入不可变的v3视图。不能重写该视图，也不能仅因新投影生成成功就声称旧任务已收到正文。

- `roster-workflow-read-context-v1.mjs`沿实际注册别名找原件，给缺少正文的旧非Native视图补完整同源记录。
- `roster-workflow-read-role-v1.mjs`把该记录单独放入`registered_source_record_supplements`，来源、kind、原始artifact、适用条件均保留；不是模型汇总／源审通过，也不伪造原件读取回执。
- 所有角色共用该输入接缝。直接原件读取、已有sourceRecord的新视图不重复注入；原Native证明补充路径不改。
- `verify-slice272-legacy-source-record-input-v642.mjs`使用实际1399已解析输入捕获真实请求：RED确实缺正文 → 修改后一次GREEN，完整Medic原文已交付，旧输入／付费请求逐字节不变。0Provider／Native／生产写，未重跑v640/v641等已过门；真实模型消费仍待加载后观察。

25979收到SIGTERM后将保存当前批次退出，不是暂停长期目标，也不是直接重发请求。加载v642前必须确认该PID终止。

### 下一步P3的真实复现入口（尚未证明的风险）

当前私有实验创建规则运行时的实际路径是`roster-planning-product-module-v1.mjs`的`createPlanningRules`：V6包装V1完整对局运行时。源码中V1的ranged分支直接调用selected-roster ranged apply；V6只做singleton身份修复。概率分布明确排除可选反应，这一点已确认；**生产攻击是否自动开启、结算并恢复Life Support等反应，仍应以真实Native案例复现，不能只凭局部源码断言整个规则器缺失。**

发现历史`verify-official-life-support-damage-reaction-rule-slice-v1.mjs`确实验证过伤害分配前Life Support／CP／pass，但走的是旧原子执行器及Optical Flare ranged consumer，不能代替当前Standard主链C-14/Queen等攻击的接线证明。该旧脚本包含网络重新校验，**本次仅阅读，禁止直接重跑或刷新源**。

后续应读取当前Run的`workspace/laboratory-sources/*.json.gz`冻结authority及同源数据，构造明确合法的局部攻击、可支付且4寸内的Medic，先证明其反应机会确实存在，再观察真实Native攻击是否在伤亡分配前交给防守方。不要新建真实房间或手写伤亡。若主链可用，再集成模型选定反应／pass后的概率损失查询；若确有接线缺口，先修共享主链再接查询，不能另造只用于写表的规则。固定骰子示例仍不等于期望分布，三Medic整体取舍仍需真实对照。
