# P1/P5：赛前验收口径与只读请求自动纠正

T27/S272新P0–P6内。正式Plan0/6、对局0/12、剩余4片；不以此文或单测替代最终军表/Plan。

## v621真实控制证据

- 实际1051确认choose_first_actor已执行，后继`7f8f2e566107837a062363e6b77759feb74bdd13d553e403b2d7e1c43f7a4ed1`，双方部署池6/0/6，当前movement/player1。
- 实际1064由`review-resolution:r6:scoring_and_timing:method:97191d031ce4b258`接管同题，使用实验合同1.9.0读取部署actionSpace、actionParameterContracts和availableUnits。没有写Plan日志，仍r6。
- 同类事实续行还实际创建component_choices、map_and_arrival和plan_continuity方法任务；后续已提出Goliath部署，但真实合法部署尚未完成，不能冒充准出。
- 方法/问题完成分离已在上述交接实际采用；整道题收敛与正式策略提升仍待。单次路线批次CPU较高，作为性能观察保留，未在策略调试中另改算法。盘余约32.17GiB，没有删除文件。

## v622：不能把赛前条件计划变成已完成比赛认证

实际1025计分审核要求拿到未来每回合的实际VP，才能接受已明确声明为战略目标的VP时序；实际1026还要求并未被Plan声称的“合并齐射”。这些是验收阶段/必要性定义缺口，不等于现有源数据丢失。

新增共享`acceptance_stage_contract`，传给三类作者和六域审核：

- 仍要求当前规则、预算、能力支付/时机、地图/底盘/资源可行性及已采纳的测量/因果主张有证据；仅写“未量化”不等于合理取舍。
- 替代与协同仍需场景化论证，不改为无条件通过或要求全局最优。
- 未来自己的/对手的选择、骰子、实际损失、实际控点与VP是条件；目标分数不是“未来比赛已经发生”的主张。
- 已明确授权的条件实验仍要交付承诺的真实测量，不能用阶段口径掩盖当前工程事实缺失。
- 已有审核与继承问题是待评估提案，不是额外规则权威。逐题保留，可据原Plan/源事实解释分类，不由Host自动删未知或手改旧结论。
- 原子来源事实核对职责不变。

定点门`verify-slice272-pre-game-review-scope-v622.mjs`：第一轮夹具误把并行1026当计分；读取实际workId后纠正为1025，再复现缺合同RED，修改后一次GREEN。四角色共用阶段、原子核对不变、旧necessary_fact仍原样保留。0Provider/Native/生产写。真实模型分类效果待观察，不据此降低旧问题计数。

## v623：正常只读载荷不应因标签停三轮

真实停止：`review-resolution:r6:opponent_and_counters`三次返回同一catalogueQueries（counterResponses/opponentHypotheses/invalidationTriggers），reads为空、无workOrders/结论，却把action写为read；连续三次仅被标签错误阻止，未执行检索。

现只在完全只读、无提案/写入/结论时，按实际typed payload确定read/catalogue；独立读取与目录查询可同批执行，两组意图均保留。映射记录在outputProjection，已付费原文/哈希/次数不改。混入写入/提案的歧义依旧拒绝，元数据检索仍不等于事实已读。

定点门`verify-slice272-read-only-payload-routing-v623.mjs`实际原回复RED→一次GREEN：重验能执行原3检索且0新Provider；混合只读查询夹具两组都执行；写入歧义夹具拒绝；原件不变。夹具2次模拟回复不是实际模型调用。未重跑旧门。

客户端仅通过现有产品`revalidateRoleReply`重验精确失败（限定只读标签错误/无写入载荷），依据用户“明确工程修复后可追加一次”的既有授权；保留原三轮、费用和成功前缀，不重开三轮、不买新标签回复。

## 当前产品进程

47399已安全完成1078/current advance并exit0。r6、机械阻塞空、语义问题16、活动25；上述只读标签为真实needs_repair停点，其余部署选择还在正常方法纠错中。

PID73495同inlKbk/projection-owner Run载v622+v623，日志`build/slice272-live-product-review-v623.log`，参数`--revalidate-read-only-label review-resolution:r6:opponent_and_counters`。当前只证明已启动；原回复真实重验、阶段口径实际消费、Goliath合法进场及最终Plan仍待，不重建房间、不恢复旧A–F。

截至1078本Run已知46,779,727Tokens、可计价估USD8.992700676，项目已知153,395,650Tokens。767（8704）与955（287139）缺reportedModel未计价，942及旧未知费用保留；1079+未计入，重验不重复计费。估算不是服务商账单，无新汇率推断。
