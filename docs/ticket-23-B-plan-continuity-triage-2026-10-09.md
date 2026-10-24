# B 计划延续与 unknown：初步根因及下一步交付

范围：T23/S248、T27/S272现有四片内的排查，不另算已完成量。
本次只读原Paid/实际源码，0新Provider/0房间写；B仍停r119，一笔传输费用未知。

## 已确认，不等同于完整根因

本批进展：见 `ticket-23-slice-248-single-goal-and-query-contract-2026-10-09.md`。
唯一当前目标合同已用B71原反例红→绿并在真实C102→103接入，TurnPlan/日志
只读进度分开；这不是B完整战略闭环验收。B仍r119旧源停点，原付费记录不改。

六个实际Deploy的导出assessment均逐字对应其planning模型原safeOutput，
排除“导出层拿错评估”。其中五次plan.currentGoal与assessment.currentGoal一致；
不能将这五次continue本身认定为错误，战术推进无需每次改战略版本。

实际r71→72是具体反例：

- 原模型plan.currentGoal：第二回合部署Reserve Goliath。
- 同份assessment.currentGoal/continuitySummary：选择Movement先手、Round1预部署。
- 同份lifecycleAssessment又列出了当前Deploy/Move/能力候选。
- verdict=continue；normalizePlannerOutput在已有计划时不接纳raw.plan，只在
  revise时转为planRevision；turn-plan-runtime的continue将assessment.currentGoal
  写回当前计划。实际normalized plan和planRevision均null。

因此：模型同份输出不一致已证实；系统允许“新目标、旧评估、当前动作”互相
不一致也已证实。不是导出错，也不能就此证明所有Prompt输入正确。原Prompt
按release_after_durable_decision_attempt释放，仅有hash/节点长度/原输出，
不得事后伪称保存了全文或重建出逐字相同输入。

证据：共享three-arm build的
`B-plan-continuity-protocol-diagnosis-20261009.json`与
`B-plan-assessment-model-source-link-20261009.json`；源码
`live-flash-decision-port-v1.mjs` normalizePlannerOutput/assessmentSubmissionSchema，
`turn-plan-runtime-v1.mjs` reflectPlan。

## unknown 不应被统一视为概率难算

原计划的工具引用分别出现：

- PREGAME_LAB_PLACEMENT_PIECE_UNKNOWN：摆放piece ID无法与场景registry匹配。
- PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED：概率请求缺明确攻击者。

这是明确失败分类，不是可自动填0的合法unknown。已取回旧保存的
strategy_foundation.sanitizedOutput.informationNeeds：六个placement ID都属于
实际选定表；createRunLaboratory却创建默认表source，未绑定selectedCandidateInput。
概率请求缺attacker且引用场景need-round2-scenario，而Teach端固定source，未消费
branchIdRef。还存在语义能力差异：原问题问ON CREEP冲锋可达/IMPACT，现有工具只
做当前合法射击概率，不能补一个默认attacker蒙混过关。上述路径已有源码证据，
原失败调用的完整重放仍待做。当前成功receipt不替代旧失败receipt。

另在真实C102确认7条概率和7条威胁请求使用candidateId/顶层targetUnitId，入口只认
domainId/嵌套parameters，均未进入具体计算。共享域/参数接缝已定点红→绿，当前
Host39986尚未加载这次后续修改；测试spy仅证明传递，不证明实际数值或Rules合法性。

## 本组修复之后按顺序交付

1. **计划闭环根因表与定点修复**：核对旧输入可恢复证据/当前权威事实/已执行
   步骤/原目标；拆开战略计划、可自动记录的实际进度和当前动作意图，保留continue
   与有理由改计划的区别。对同份目标冲突做有明确来源的局部纠错，绝不静默
   猜哪个字段对、强迫原schedule或让错误自然语言覆盖Rules。
2. **合法预游戏查询及失败分类**：取回原请求，修唯一registry/参数接缝；合法
   明确场景可计算则返回结果，缺参返回可纠正原因，真缺场景保留unknown。
   不发明攻击者、位置、概率或全自动补战略假设。
3. **可读补全计划及前后对照**：接线缺事实先修；证据充分后用Teach补充推进/
   交换条件、地图路线、对手响应、损失预算、备用分支及推翻条件。不向Prompt
   注入人工进攻/风险权重；原计划和本轮低策略记录继续保留给复盘比较。
4. **协议对齐交付**：机器事实以当前authority、candidate、queryReceipt、
   攻击者/目标/武器、时段、量词/例外及计划步骤绑定；可读理由保持模型所有。
   JSON形状正确不代表语义闭环，regex范围修复也不等同完整事实协议。

每个明确代码bug先用原捕获证据复现，再改来源并只跑对应未过门一次；旧绿不跑。
修后必须观察实际同房新动作，才能区分“协议修复后仍策略弱”与工程错误。
不要强迫过去合法动作回滚，也不要在这份初步排查上认证策略优于无计划。

T23 33/36、T27 5/6；248/249/250/272开放，完整终局0/3。
Harness loop=true；route=harness_optimizer_prompt/selfplay_agent_prompt；
memory-source审查、不改原Paid；hiddenCoT不采集、trainingTruth=false。
