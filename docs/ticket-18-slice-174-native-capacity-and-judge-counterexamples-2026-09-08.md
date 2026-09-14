# Slice174：输出容量接线与独立语义反例

## 当前状态

仍是Ticket18 / Slice174；项目16/22 tickets，Ticket18为2/8 slices，正式五包1/5、runtime0/5，Terran5/7章、Zerg0/8章。已执行从8a的live命令（会话47418/PID90096），当前仍为启动/历史核验，尚无新runID或Provider请求。最近已结算正式run为 `faction-v1-8a5389823de46cf062ae`，15次尝试、2,436,275 tokens、估算¥4.177686；累计158,261,952 tokens、¥126.918382，下一提醒¥200。

本轮不刷新官方来源，不使用Codex子agent。实际DSH验证使用模拟Provider，不是新的正式Skill。

最新工程状态：旧零付费preflight28642的dry路由缺失已修；新会话60282已exit0，ready recipe `c7ca14be3b96ade06b22b046f264367ccc563900006a048c1814ddede3897e09`，确认279个历史角色可复用，首个未缓存角色走responses_json_schema。新版容量29项、地址25项、metadata14、分批补答16、workflow77、相关source/seed/transaction门全部通过；静态检查36个主入口门无漂移。随后执行唯一live命令。等待中另将3个独立消费者门按当前源码重验，12/12消费者门已准备好，但尚无真实新候选可以评估。实时会话状态以TASKS最新记录为准。

已新增实际Rules编军9案例/25检查，以及精确局部修正18检查；正式workflow接线26检查通过（`29107ef077faddb809ea6114742acc99df8f1f49cfeb59b7618b34598a6cbe01`）：Zerg旧完整历史按原请求只读重建，修正3答5处事实文本及2处来源后，6答共同交给新Judge；注入的uncertain保留到Proposer。Terran真实错误段落进入生产workflow的限定单句修正，正负两组测试均重新审核整章，共16个注入审核批；新否定仍阻止章节完成。上述新Judge/审查是测试注入，0新Provider、0新DSH，不能当真实模型接受或新Skill完成。

## 容量：扩大上限，不要求写满

| 工作 | 输出硬上限 | 处理方式 |
| --- | ---: | --- |
| 新Proposer、outline、每批至多2条建议 | 8192 | 写作目标3200，完整来源和完整前序工作区保留 |
| Reasoner与Judge | 4096 | 现有缺答补全每批2条，所有回答合并后再Judge |
| 小批来源审核 | 4096 | 旧有有界恢复保留，不自动无限重试 |
| 已付费完成的V1角色 | 原值 | 切换时冻结精确角色ID，不重发、不重标版本 |
| 新Profile的JSON Schema能力探针 | 512 | 只验证结构化支持；不冒充实际8192输出请求的证据 |

新Profile、角色/执行策略/上下文、能力探针身份、付费回执和只读消费者分别绑定。消费者独立重建实际请求体并核对其hash，确认发送的上限而非只相信配置；能力回执在实际发送时间验证。新旧Profile的探针不能复用同一个请求身份。单次新写作任务预算预留¥2，失败与成功都进入原累计账本，旧费用不清零。

回归先在实际入口得到 `4096 !== 8192` 红灯，再修改路由。已完成29项容量专项检查，包含1个真实隔离DSH会话、模拟Provider的8192发送、最外层消费者恢复、小探针Profile隔离、截断和402禁止自动重试。其证据仅证明工程调用链，不证明模型输出正确；最终代码固定后的受影响门仍需全部完成。

真实截断不是推测：只读程序重建Zerg全部旧准备角色、两批实际补答和Judge，捕获首章Proposer的完整请求，重算invocation hash与原失败完全相同。诊断 `1cff074eccfb6914703b06dd26df1e08a62f30670251a9627fa7b549b3c8ea97`；失败 `18946a75…`，HTTP200、max_output_tokens、实际4096输出，无可接受的截断前缀。

## 审核地址：使用系统提供的目标ID

Terran五章与第六章revision1的完整工作区已只读重建，诊断 `900c238ee5d80b367734689311fdf653347582a8a13960e114e70738a0aaea78`。新失败审核明确写 `advice-2-d443e02d4c6a`，但coverage用了批内0而不是全章2。

新V3只在旧V1/V2不能解析时，用精确Host目标ID、当前建议hash、对应批内槽位及同一来源共同证明地址；未知/过期/附加后缀/歧义ID均拒绝，不做模糊标题匹配。旧版本已成功的原回执保持不变，原paid candidate、reason、verdict不改。已接主入口、显式续跑和消费者；25项检查含1个真实DSH零Provider导入通过，回执 `99a4281a3d206b90f371a6abb28def2cce5d3cd0e0e3f543cfc444e7b93e12bb`。相关旧门仍在收尾。该修复只证明地址，不证明来源判断正确。

修改文件按职责分为：`faction-native-output-capacity-v2.mjs`与native runtime负责分档调用；`faction-parallel-v1.mjs`、主runner与continuation负责Profile/探针/冻结角色切换；三个faction replay模块负责恢复及实际请求验证；coverage-address-v3、完整审核导入与target-id-review-binding负责无损ID映射。新增两组诊断/验证脚本，更新根TASKS与PROJECT_MEMORY。未提交Git，未修改游戏规则、UI或官方来源。

## Judge放过的Zerg语义错误

原Reasoner聚合 `12615ff121ab2a6e4fab67cfab8a87bb53767cc7f2781a37353c2950de4c487c`；实际Judge `ce4c75156c4ff380fc4ad3ac84430f6d428c8f6205a26cc993c59a6a7f6aca2c`。以下是独立阅读冻结数据发现的反例，不能因Judge为supported就发布。

1. 回答2前文说Overlord和Lair都是35，后文却称Lair更便宜。冻结两卡cost均35，故价格差为0。
2. 回答2称Lair“不占Unique名额”。冻结Lair与Overlord的isUnique均true；Unique是同一张卡份数限制，不能发明跨不同卡共享的唯一名额。
3. 回答5称仅Lair加小Hydralisk仍余1 Elite。冻结起始1、Lair+1、小编制占2，余量应为0。
4. 原问题5没有要求额外余1 Elite。Overlord本身+1 Elite/+1 Hero，与起始1 Elite合计可提供小Hydralisk所需2 Elite及Kerrigan所需1 Hero；回答将“为了再多留一个Elite”混成同时容纳两单位的必要条件。这里仅核对槽位，不据此宣布完整名单、所有费用和部署动作合法。
5. 回答0把Hydralisk Den或Lair写成必选，遗漏Overlord同样+1 Elite的可选事实。原题示例不等于所有合法选项。

冻结来源：Overlord `ff6e4956b8224be7dc410eba0468411a145f75ad926af48b9694428d093720c3`；Lair `cb993ba2b82ea3c5648f9bba20fcc9e93cb83445efefb145972350d841138704`；Hydralisk `5d84d1692a9c7282545db93a9a56691f6014c6eff1ed07ec0673e5c62fb70d30`；初始槽位来自同一Zerg输入。当前已接限定事实修正与新Judge请求，实际付费复审仍未执行；不声称已实现任意自然语言的通用数学判定器。

新增代码分工：`faction-observed-roster-facts-v1`调用真实资源/槽位kernel形成开发反例（不是heldout答案）；`faction-observed-source-repair-v1`仅在原题、原答、原Judge及冻结来源完全一致时修正已证实的五处事实；workflow追加新身份的全组Judge，将旧Judge保留为未可信历史。主runner/continuation显式绑定修正规则及事实hash，消费者独立从冻结dataset重算Rules结果并重建新角色。Terran使用既有`faction-card-package-source-audit-v1`限定单句提案，下一revision重新审核整章；消费者在资格入口额外拒绝已知Unique债务。任何新措辞或新事实矛盾仍须新证据，不做模糊文本替换。8192只解决截断，不解决这类错误；分批还必须检查跨批一致性。

## 本轮规范记录

ctx2skillLoopUsed=true；harnessLoopUsed=true；targetGames=[starcraft-tmg]；roleRoutes=[rule_skill_builder]；promptPackRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]。skillsRead=[总规则最终版、两族冻结输入、8a真实中间产物]；skillsGenerated=[]；promotions=[]。judgeTestsRun=[上述工程测试、实际失败上下文重建、冻结来源算术反例]；crossTimeReplayResult=[Zerg完整前序、Terran五章及当前审核工作区重建通过，非整局对战]。harnessToolsCalled=[隔离DSH、本地结构化Provider注入、只读SQLite]；uiTraceEvidence=[]；agentDecisionEvidence=[]；memoryTraceEvidence=[]；trainingTraceCandidates=[]。blocks=[语义反例尚未修正/复审、相关工程门尚未全部结束]；remainingRuleGaps=[独立策略评估、实际空间对战、复盘/升级]。rollbackOrDemotionRules=任何规则反例、来源漂移、传输不一致或回归失败均阻断发布；userVisibleChecks=尚无新增对战UI证据。所有产物canAffectRules=false、trainingTruth=false。
