# T27/S272 · P1/P4：事实记录不是战略修订

## 实际暴露的问题

新产品同一Run实际1169已收到原审核义务，1170/1171作出总体决策，产品从r6原子提交r7。军表未变，仍合法2000矿／120气／9单位／29模型。逐字段对照发现，改变的是summary、scoreRoute文本、Goliath用途文本与deploymentConcept中的Native观察注记：唯一已部署Goliath、其它单位仍在储备、当前actionSpace、尚未证实到达／控点／VP。选表、得分目标、单位角色和行动顺序没有新的战略选择。

这证明总体回交能执行，**不证明策略优化**。原Interface只有revise/retain/investigate，没有明确的事实记账通道；模型又把事实注记写回Plan，导致版本变化和新一轮复审。旧r7及1171原文保留，不手改或倒退制造验收结果。

## 产品分流

- 总体决策合同1.2.0新增`record_facts`，`mutation=null`、`strategicChanges=[]`，须引用实际已交付来源。事实与必要未知进入独立证据记录，Plan／军表不变。
- `revise`须明确实际战略或已采纳前提的变化：intentPath、beforeIntent、afterIntent及decisionConsequence；空变化要求纠正。实际选择和论证仍由模型负责，不靠Host关键词判断“这算不算策略”。
- retain/investigate也不得暗带Plan修改；所有操作保留必要requiredData。record_facts在后续调度按retain处理，未解事实仍会进入下一调查，不能因记账而发布Plan。
- 证据记录可检索，但不自动取得来源／规则／最终Plan批准。中断在“保存结果→发布记录”之间时，下一次同步补齐发布；历史工作不会因此重启调查。
- 历史记录的目录入口不绑定当前Plan。正文完整保留原工作、原版本、原绑定，并明确historyNavigationOnly/currentApplicability=not_assessed。旧来源不能因此冒充当前事实。
- 精确旧网络请求仍按原合同重试；不会给旧已付费回复自动补一段战略意图来通过新版合同。

实现：`roster-workflow-read-role-v1.mjs`、新增`roster-workflow-decision-records-v1.mjs`、`roster-decision-workspace-run-v1.mjs`。

## 定点验证

`verify-slice272-fact-record-vs-strategy-revision-v629.mjs <同一Run>`：

1. RED：真实1171对应合同没有record_facts。
2. 第一修正后发现真实合同缺口：历史工作绑定旧Plan，目录发布要求当前绑定，出现`ROSTER_WORKFLOW_BINDINGS_INVALID`。不是模型故障，也不是删掉检查掩盖来源差异。
3. 入口明确为历史导航、正文保留原绑定后，一次GREEN：原旧回复不自动分类；事实记录与暗带mutation不能混用；空战略变化不能revise；必要未知／来源保留；通过产品record_draft_outcome＋publish_evidence＋read_evidence实际写读隔离内存记录；Plan引用／版本不变；重复发布不追加副本。

共三次命令已收敛，不再重跑；0 Provider／0 Native／0生产状态写。夹具只证明合同／存储行为，不证明模型会正确分类或策略更优。

## 真实检查与下一步

40139已安全完成1177/current advance并退出：r7，mechanicalBlockers空，semanticIssues6，activeWork6。

进程57336使用同一产品Run及已有`requestDecision`入口进行一次真实P4操作分类检查，客户端`--verify-fact-recording`只负责提出任务与保留日志，不实现第二套写表链路。它读取当前草案、此前决定和真实Native观察；不预填模型操作、不改表／Plan、不重跑旧查询／重建场景／启动对局。真实回复和证据记录待观察，不能先报通过。

日志`build/slice272-live-product-review-v629.log`；状态仍在`build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner/workflow.json`。

至1177：主Run已知55,235,573 Tokens，可计价部分估USD10.017778800；项目已知161,851,496 Tokens。767/955未计价295,843 Tokens与942／更早未知费用保留。1178及后续未计；冻结价格估算不是账单，不杜撰汇率。

## 完成边界

P1/P4分流工程已定点验证；真实分类、后续战略决策、六域收口及正式固定／可编辑生成尚未完成。策略比较、分块整体效果、正式中文逐步报告和约定对局仍是完整目标。

T27 5/6、T23 33/36，相关剩余S272/S248/S249/S250共4片；正式Plan0/6、对局0/12。

## 后续真实结果（v630）

原v629检查未派发，原因及修复见[历史输入合同](ticket-27-slice-272-P1-historical-input-v630-2026-10-20.md)。正确声明历史只读引用后，真实1191一次选择record_facts；产品实际保存独立记录并保持Planr7／军表不变，无新Plan版本、无Native查询重跑。必要全局待审问题没有因这条局部requiredData空列表而删除。该结果证明模型能使用非修订通道，不证明战略更优或全流程已完成。
