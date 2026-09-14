# Slice174：c7真实复审、8192截断与提纲范围问题

## 已执行的结果

Ticket18/Slice174；Ticket18仍2/8，项目16/22，五包正式离线接受1/5、runtime0/5。`faction-v1-c7ca14be3b96ade06b22` 是从8a继承的真实双线生产批次，现已终止（会话47418 exit1，0intent、0running、0payment-stop）。23次尝试，3,334,010已知tokens，估算/预留¥5.332313；累计161,595,962已知tokens、¥132.250695，下一提醒¥200。没有刷新官方数据、Codex子agent或Git提交。

- **实际事实修正已进入模型复审**：Zerg原3答的5处已证实事实错误及2处来源补充进入新身份的全6答Judge。原付费Reasoner/Judge保留；新Judge实际245,754tokens/¥0.045846，产物`6e0c97df1a7ba1e8d1976104a93f18a4668a9985df82c0372bab632896ecb9b4`，6条supported。独立重看费用/槽位/Unique来源并核对卡牌Ready/Exhausted原文；不能将这6个模型判断当完整策略或规则真值。
- **8192确实生效，但不能解决所有长输出**：Zerg首章Proposer实际输出8192后截断，attempt `structured-5ecd3e5fabd4e02899caf6911d8293273da034cf7c3fcec3`，incompleteReason=`max_output_tokens`，回执reportedReasoningOutputUnits=0，无可接受前缀。Terran最后一章Proposer实际3539、outline1220输出完成，说明不是所有8192调用都失败。这个样本不能支持“长token必然幻觉”的推论。
- **Terran流程推进到6/7，但第6章不能验收**：第6章模型复审完成，result `937147b92e39cc8bd65313595182128d8e676e604a0d0d4d05a99085d042b3f1`；独立检查发现同一句“不同Unique卡互斥”的错误断言仍在。模型编辑改变了风险字段前半句，旧检查比较整段原文，因而错误漏检。准确分母为流程6/7、已排除当前已知问题5/7；第6章1个已知语义问题、第7章未完成。Zerg0/8。
- **第7章失败不是JSON问题**：提纲缺`source:tactical_cards:dropship`、`source:tactical_cards:factory`、`source:tactical_cards:supply_depot`。补写返回全8条原样复制，focus和sourceRefs都没变，被`FACTION_OUTLINE_SOURCE_RECONSTRUCTION_CONTENT_REQUIRED`正确拒绝。原问题树及Proposer高度集中于另一组卡，后续必须显式保证本节指定来源的编写义务，不能只再发一次原提示。

## 新增但未接生产的改进

`faction-proposer-batches-v1.mjs` 建立专用短计划结构，替代Proposer复用128条、每条可16384字符的宽泛Teach格式。每批最多2个计划、每计划最多600字符、最多2个短不确定项；每个原问题必须有索引明确的计划。问题树未提到的本节指定来源另成覆盖任务（每组最多4个来源），不会因为问题树遗漏而消失。完整原工作区、修正后答案、新Judge及所有否定理由通过绑定保留；所有批齐全才能无损汇总成后续Generator计划。**600字符限制的是单个编写计划，不是最终章节/Skill长度。** 35项检查通过`1fa4718e5984c451cca4e897cbf994c69c3716f983fb707e490dae4afd2bb5b0`，实际Zerg6题计划分为3批；尚无新批次Provider调用或runtime接线。

`faction-unique-risk-clause-v2.mjs` 定位有独立官方引文支持的精确错误末句（字段开头或分号后），不要求此前无关句子相同；修改只替换该句，保留全部前缀和其他字段。带引号或明确否定示例不自动改写，重复目标拒绝。19项检查通过`cf0fd53dc4d5bc4fc4bf7e09fec7940b69d3e6a6f5879aa2e56f1c5515e6bae8`，真实c7漏检样本被检出；这里只是提案，尚未生产应用或重新审核。

`diagnose-ticket-18-faction-proposer-capacity-v1.mjs` 在c7终态后零Provider重建全部Zerg历史、Host事实修正、新付费Judge及Proposer完整请求，重算invocation与实际8192失败一致；报告`4c3c97590859b6484dac7a6fd27b2d3dbca90aefb081aff88aa690db58dd7a60`。第一次诊断在Terran仍运行时被RUN_NOT_TERMINAL正确拒绝，没有关闭该安全检查；终态后54929已exit0。

## 下一次执行前

1. 将专用Proposer批结构接入真实native/DSH/持久存储和独立消费者；源上下文不裁剪。保留旧成功角色/付费原件，新增编写义务必须有新身份。Zerg应复用已完成的新Judge，不再收费重审同一份答案。
2. 将Unique精确句检查接入生产修正与消费者资格拒绝，显式版本化；对第6章修改后重新审核整章，不继承此前模型supported作为通过。
3. 对第7章已证明漏范围且补写无进展的Proposer/outline采用有明确指定来源义务的新编写分支；旧产物隔离，不把同一组旧卡反复复制。新提纲覆盖三来源后仍须完整正文和来源复审。
4. 一次刷新受影响门、零费预检，然后从c7续跑；不是原样重试。两族完整后才运行真实独立消费者和finalization，随后175正反对抗，再176空间Harness。

另已将3个旧消费者门按当前源码重验；12/12消费者准备门无漂移，全部零Provider。这些是准备检查，并未评价一份尚未完整生成的种族Skill。

## 本轮规范与边界

ctx2skillLoopUsed=true；harnessLoopUsed=true；targetGames=[starcraft-tmg]；roleRoutes=[rule_skill_builder]；promptPackRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]。skillsRead=[冻结两族输入、最终总规则依赖、c7实际中间产物]；skillsGenerated=[Zerg新Judge、Terran第6章未合格候选及第7章未合格计划/提纲]；promotions=[]。judgeTestsRun=[实际全6答Judge、19条断言检查、35条短计划检查、12个消费者准备门]；crossTimeReplayResult=c7终态的Zerg修正及新Judge精确重建通过，非实际整局。harnessToolsCalled=[本地DSH、BYOK Provider、SQLite、规则器资源/槽位计算]；uiTraceEvidence=[]；agentDecisionEvidence=[]；memoryTraceEvidence=[]；trainingTraceCandidates=[]。blocks=[Proposer仍截断、已知错误句漏检、指定来源遗漏与无进展补写]；remainingRuleGaps=[两族独立评估、正反对抗、24空间案例、回放反思与升级]。rollbackOrDemotionRules=来源矛盾/遗漏、未完成输出、上下文或回放漂移均阻断发布；所有产物canAffectRules=false、trainingTruth=false。
