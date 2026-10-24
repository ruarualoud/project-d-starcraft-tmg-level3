# T23 / S248 — 同一付费决策的火力声明范围恢复

## 已交付范围

生产接缝只改`live-flash-decision-port-v1.mjs`，Action normalization v47→v48。
本批不改规则、策略Skill、Prompt偏好、候选集合、队形求解或骰子；不降低风险
权重、不增加进攻偏好、不把自然语言修复当成Rules权威。

实际C房r100最后付费返回同时存在三类声明：

- 收益句称避开所有当前回合火力：真正与Scatter投影矛盾。
- expectedOwnOutcome明确例外是Goliath2 Scatter：旧检查器误拦。
- expectedEffects只说避开三个Marine：旧检查器错误地用Goliath威胁反驳。

投影行是selected Unit→enemy，`targetId`是敌军；旧报告却读取不存在的
`enemyUnitId`作为攻击者，显示unknown_attacker。当前Goliath2/Scatter/22281
milli-inch投影和实际射击概率证据存在，unknown_attacker不是无威胁证明。

## 来源修复

1. 投影声明按实际观察中的敌军ID/名称限定；all/every声明保留全敌军范围。
2. 明确except/excluding/other than仅排除同一敌军明确点名的武器，不猜模糊例外，
   不让Scatter例外消除Autocannon或未解析LOS。
3. 报告攻击者用真实enemyUnitId或投影targetId，受击者用fromUnitId。
4. 仅剩一个selectedReason或scoreOrPositionValue矛盾时，可复用同一已选队形
   的模型publicReason，且必须重新检查所有声明通过；保留原文hash及修复元数据。
   没有正确替代文字、多个矛盾或其它字段不正确，仍拒绝。

这次是消费者错误加模型同份输出不一致；协议只规定字段结构、没有强类型的
声明范围，也是长期改进项，但不能以此跳过现有Rules/权限/付款/坐标校验。

## 聚焦验证

捕获原C同一付费返回、完整query receipts及原生权威状态投影。
新脚本仅为复现这个具体bug：
`scripts/verify-ticket-23-slice-248-same-submission-threat-scope-v1.mjs`。

- 红93898：原本正确的例外/Marine范围被判矛盾。
- 修后95606：第一段范围检查通过，后段失败因夹具漏了真实调用链中的
  bindPlannerSelectedProposal，binder因此没有执行。不是新Provider失败。
- 只补夹具的已选domain绑定并保留原付费全文；97778用`--binding-only`只跑
  未过段，exit0。队形ID/完整canonicalParameters保持；错误例外、另一武器、
  全敌军断言、没有正确替代文字都继续拦截。已过首段不重跑。

上述门0Provider、0原Room写。旧全量/绿色门、构建、其它slice不运行。
证据：共享three-arm build的C-r100-threat-scope-*日志和两版captured fixture。

## 原房加载与实际验收边界

原Host83329 drive已completed，85/144付费记录全部completed、0在途后正常
SIGTERM，exit0；封口r100无后续suffix。相同SQLite加载Host1643及C预算200。
完整初态、当前envelope和全部229付费行同加载前；没有新Room、规则版本迁移
或付费重试。私有入口`C-r100-threat-scope-source-entry.private.json`，连续性
`C-r100-threat-scope-source-continuity-20261009.json`。

普通Web4568触发原房单动作drive0001；Web只读观察GET超时后exit1，但原Host
任务实际completed/paused。未重复发动作，真实r100→r101 Swarmling Run已执行，
原生trace为applied_and_replay_verified / replayMatchesCurrent=true；Receipt
`f02f60b3df9c8becd76e3d5c7a3093834001d6938cff601aafdbdff60d73fff5`。
全部229 Provider行以及player2全部144原始输出/usage/hash完整相同，0新调用、
0已知增量费用，C仍估计CNY82.032935，实际预算200。最终记录
`C-r100-threat-scope-actual-recovery-with-replay-20261009.json`及
`C-r101-retained-raw-outputs-proof-20261009.json`。

只读截图15734 exit0，等待工作台加载完成、打开规则地形后保存
`C-r101-threat-scope-recovery-web-terrain-ready-20261009.png`，已人工查看：
r101/Standard54×36/1804规则地形可见、单位头像已加载。首张未加载完整的图
只保留为过程证据；此图不替代地图全任务/全图公平性验收，局部token标签
拥挤仍是UI观察项。没有点击新动作或调用模型。

真实耗时仍不合格：本次复用Paid的agent_decision19.254s，preview13.435s、
apply21.715s、replay_room272.817s。Replay是本次主要长尾；不是新Flash耗时，
也不能拿局部查询5.313s宣称动作已达一分钟。记录优化项，不重跑同一动作。

## 本组之后的排查队列（用户新增，保持原四片，不另包装完成量）

1. **B计划延续来源**：对照实际authority/当前LegalSpace/原计划及修订输入→模型
   原safeOutput→记忆/动作导出。六次Deploy assessment已证明逐字来自各自
   planning-stage模型返回，不是导出层替换；仍不能据此证明完整Prompt正确。
   排查AMF printedSupply/poolSupply传递、开局schedule偏离是否可见、阶段/回合
   assessment是否沿用。交付真实输入/输出/存储对照与根因分类，再决定源修复
   还是模型/Skill Teach修订。不得强制建议schedule作为规则。
2. **预游戏unknown分类**：查attack_probability缺攻击者、placement未知单位
   的原请求/解析参数/选定军表registry/工具回执。区分调用不合法或接线错、确实
   缺合法场景、未实现能力；不让invalid_input伪装成正常unknown，也不将真实
   unknown改成虚构数字。交付失败原因表及合法工具请求的定点修复/验收。
3. **计划不足如何补充**：事实缺失先补接线；策略不足在完整地图/规则/概率
   证据下用Teach修订计划和条件分支，不向运行Prompt注入人为得分偏好。保留
   明确unknown、原表和原计划，记录推进/交换条件、替代路线、对手分支和何时
   推翻假设。交付可读修订计划与前后对照，不凭详细文字认证策略变好。
4. **协议范围契约**：记录将claim绑定observedAuthority、selectedCandidate、
   queryReceipt、目标/攻击者/武器、时间范围、量词与例外的设计项。强类型事实
   校验与可读策略理由分层；不能继续把无范围自然语言regex当完整事实协议。

B源对照证据：`B-plan-assessment-model-source-link-20261009.json`。进一步只读
排查已找到r71同份返回plan.currentGoal是R2 Deploy Goliath，但assessment.currentGoal
仍为choose_first_actor/R1；verdict=continue。现实现只在revise时采用新plan，
continue写回assessment.currentGoal，二者冲突未经核对。是模型输出不一致加
Harness协议缺口，不是已证明的纯模型弱或丢记忆；完整旧Prompt已按原设计
release，不能把节点长度当全文正确证据。见
`ticket-23-B-plan-continuity-triage-2026-10-09.md`。

预游戏两条原计划引用明确报告PREGAME_LAB_PLACEMENT_PIECE_UNKNOWN
(`4403529f5b455106d454186af282313e61a150264401f803810a20f079ecfe08`)
和PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED
(`f72820f6d15d6673b5285513476c8add873dbe0156bd3a0b91e71e3aa01c1de5`)。
这是单位绑定/调用参数失败信号，不是正常的未发生随机事件概率未知。
当前session里的成功receipt不能替代locked Teach原请求；下步查其来源链。
B传输未知费用仍独立保留，不因本地来源排查记零或自动再次付费。

T23 33/36、T27 5/6；248/249/250/272四片开放，完整对局0/3。
9官方选定布局＋2优先经典的证据不代表20张/全任务完成，18经典仍后置。

Harness loop=true；route=harness_optimizer_prompt/selfplay_agent_prompt；tools=
原生提交/队形绑定、只读SQLite、原房Web ui-drive。memory未改、原Paid保留、
hiddenCoT不存、trainingTruth=false。实际unsafe claim放行、队形/付款改变、
旧Paid覆盖或同房历史不连续均是回退该修复的条件。
