# T27/S272 P3/P5：同工具不同方法的事实交接（v610）

这是新P0–P6中的具体失败修复证据，不是最终军表/Plan生产报告或策略提升证明。

## 原始问题

同一inlKbk/projection-owner的810真实Native静态查询正常完成：3个模型自选锚点全部评估，0候选，search.exhaustiveOverFormations=false。不存在待收请求；PID74276在无ready任务后正常结束、现已不存在。

这组有范围的否定事实没有交给外层mission_marker_control任务。两者operation都是spatial，旧交接器只比operation，忽略queryKind；它还要求直接旧任务已成功，嵌套别名的成功resultRef又可能配着旧失败tool-view。必要问题因此仍悬挂，不能宣称自动收敛。

## 实现与验证

- 交接器复用Native替代的同一个rosterWorkflowRepairRequestMatchesV1，区分queryKind/mathKind；不放宽原查询替代条件。
- 允许沿实际修复谱系，向首个仍待决的不同方法交回已完成事实；保留原待决任务，不把静态0候选写成marker控制成功。
- 沿显式resolvedByWorkId取得实际成功工具work/resultRef/tool-view；缺失、循环、绑定改变不猜测。保留logicalStepWorkId供审计。
- 同一外层只生成一个handoff，持久恢复不重复生成，不执行任何已成功查询。

`scripts/verify-slice272-same-tool-method-handoff-v610.mjs`使用完整实际810后状态、真实产品交接函数和不可变原件。第一次夹具误找动作求解类型，实际记录显示外层是marker_control，已纠正；随后RED准确复现0个交接，修后一次GREEN证明单一外层返回、实际替代视图身份一致、0候选保留、无Native成功别名、无冷恢复重复、源状态逐字不变。Provider/Native/生产写入均0；不重跑其他已过门。

## 实际续行与边界

PID85289加载同一Run，没有恢复旗标或次数重置；日志`build/slice272-live-p5-v610.log`。实际模型是否收到并使用、最终域来源审核、联合军表/Plan修改仍需观察。没有重查810，没有启动Web生成、旧实验或游戏。

- [810完整脱敏prompt](../build/slice272-projection-owner-v565-inlKbk/810.request.json)
- [810原始回复](../build/slice272-projection-owner-v565-inlKbk/810.reply.json)

当前T27 5/6、T23 33/36、相关余4Slice；正式Plan0/6、对局0/12。组件域已通过但地图域未准出，draft revision2。六项能力和两种模式的最终验收数字不因本门通过而增加。

harnessLoopUsed:true；targetGames:starcraft_tmg；promptPackRoutes:实验负责人／方法完成回交；harnessToolsCalled:本门无执行、复用原生静态回执；uiTraceEvidence:无新增Web；agentDecisionEvidence:810，真实后续待；memoryTraceEvidence:显式替代链及原件不改；trainingTraceCandidates:无；rollbackOrDemotionRules:不匹配或无来源仍阻塞；userVisibleChecks:最终生成尚未通过。

## v610真实交接结果及v611：旧问题执行权必须显式终止

[812请求](../build/slice272-projection-owner-v565-inlKbk/812.request.json)收到实际成功来源，模型随后读取1429原件；[815回复](../build/slice272-projection-owner-v565-inlKbk/815.reply.json)明确指出：0候选是给定锚点的packing miss，不是marker控制结果，不能证明全局无解。实际事件9267把方法交还当前地图负责人，停止4个未完成后继，nativeActionSucceeded=false、toolReexecuted=false。这是P3控制回交的真实证明，不是整个地图域已通过。

同时新逻辑误唤醒同draft旧review-resolution调查，产生811/814请求。旧目标曾被当前P5目标接替，但产品状态没有记录“执行权已接替”，仅当时无ready；新调度能力因而重新发现旧待决分支。这是此次实现暴露的工程回归，不隐去调用或费用。85289收到安全停止信号后完成当前advance并exit0；未执行814新提出的旧inspect。

### v611产品状态修复

新增同产品`supersedeExperiment`／核心`supersede_experiment_goal`，明确指定旧/新目标及接替理由。两者必须存在、同scope、替代者仍有效；旧谱系存在running或未确认Provider pending时拒绝。沿共享显式ownership索引收集旧目标节点（含来源审核关系），保留原状态清单、所有resultRef、operationState与attempt；节点标superseded并记录replacement/ref。不可变证据不改、不删除、不冒充新问题已通过。

冷恢复的成功事实复用排除显式退休节点，避免再次激活旧工具并派生调查；证据原件仍可读取。重复同一接替幂等，不能循环或任意指定不存在目标。实验结果目录不再将已退休目标列为待继续。

`verify-slice272-explicit-goal-supersession-v611.mjs`用完整实际811–815后状态和真实核心状态机、内存存储：先RED缺状态转换；修后一次GREEN，82旧地图节点停止、源原件/次数不变、当前目标不受影响、冷恢复不复活、重复不增事件、未确认请求受保护。Provider/Native/生产写均0，不重复v610已过门。

PID90882加载同Run无恢复旗标，通过同产品接口对存在的旧review-resolution目标显式接替，再推进当前两域。本次实际找到旧地图目标82节点；没有找到旧组件同名根，未伪造第二次接替。日志`build/slice272-live-p5-v611.log`。没有手改workflow.json或模型回复，没有重置计费／代次；本轮仍无最终Plan、Web生成或对局。

## v611真实继续：模型改锚点、选候选、自动补父态、原生控点

| 实际步骤 | 输入／公开决定 | 已执行结果与边界 |
|---|---|---|
| 816–817 | 方法否定事实交当前地图负责人；模型保留其余5单位，改3个锚点 | 新一轮静态搜索仍0候选，没有改成“不可能”或自动通过 |
| 818–819 | 模型改东侧锚点18/24、19/22、17/26 | 同Native返回2个完整候选、1个有范围的重叠失败；不是手工造坐标回执 |
| 820–821 | Host拦住未观察未来候选的预选；模型收到实际候选后明确选option0 | 模型公开选择18/24，未由Host默认第0项；无需源码修改 |
| 822–824 | 应用缺显式父态，原有局部纠错交确切错误；模型读1449并绑定/stateRef | 修订经既有“读取后确认”继续；不手补模型答案／正式军表，Native成功应用所选静态几何 |
| tick14、825–826 | 对真实后继3267a402…执行mission_marker_control并读取原件 | marker1为player1，Supply7:0；Goliath2、Raynor当前2、Marine1/2各1、Medic1为1。Marauder1因无模型满足距离／同高／LOS不参与，其余标记无争夺。不同影子步骤的同参数查询有queryReuse，未重复相同Native观察 |
| 827 | 负责人据原生结果选择进一步检查Marauder近点几何 | 仍是实验选择，不是整个地图问题已准出；其“清除敌方”角色与“自身参与控点”不能混作同一证明，最终来源／覆盖仍需独立审核 |

这些是同产品Run的真实行为与有限恢复证明，不是“必要未知全部收敛”、完整9单位到达、获VP或策略优势证明。上表不增加正式验收数量。

完整脱敏prompt／原始回复：

- [817模型改锚点prompt](../build/slice272-projection-owner-v565-inlKbk/817.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/817.reply.json)
- [819第二次锚点工作单](../build/slice272-projection-owner-v565-inlKbk/819.reply.json)
- [821已观察候选的选择prompt](../build/slice272-projection-owner-v565-inlKbk/821.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/821.reply.json)
- [822来源读取](../build/slice272-projection-owner-v565-inlKbk/822.reply.json)／[824修订确认](../build/slice272-projection-owner-v565-inlKbk/824.reply.json)
- [826实际控点总结prompt](../build/slice272-projection-owner-v565-inlKbk/826.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/826.reply.json)

计费截至817：805–817新增352,269 Tokens／冻结价估USD0.075563268；主Run已知30,513,075 Tokens／可计价部分USD7.153211088，另保留767及更早未知费用。项目已知137,128,998 Tokens；818起尚未纳入本小计。费用为估计、非服务商账单。

## 观察延伸至848：真实比较有进展，整体收敛仍未证明

831读取完整候选后，公开比较option0有2模型／option1有1模型接近标记，选择前者。原生应用和控点均成功：marker1 Supply由前一假设几何的7:0变为9:0，Marauder1当前Supply2参与；其余4标记仍无争夺。这是同军表／显式布局变化下的条件控点比较，不是战局比分、到达证明或军表策略全局优越性。

834–848尝试把剩余3支预备／支援角色纳入同一几何。锚点先后撞实际墙体、Goliath或Marine底盘，Native给出具体阻挡物；模型换锚点或返回父问题，未伪造选择空候选。当前还未形成完整9单位部署／到达证明，也未关闭地图goal，尚无新的联合军表／Plan提交。另记录语义风险：计划“Marauder清除争夺点的敌方单位”并不等同于“Marauder自己必须在控点圈”，不能用后者的正结果替代前者攻击效能证明。来源／覆盖复审仍需约束这一差别。

截至842，805–842新增1,040,238Tokens／估USD0.165395010（38次付费返回，含旧目标误唤醒）；主Run31,201,044Tokens／可计价USD7.243042830，项目已知137,816,967Tokens，767及旧未知费仍单列，843+未含。观察时90882仍存活，原Run继续；draft revision2、acceptanceGranted=false，正式Plan0/6、游戏0/12，未转做Web。
