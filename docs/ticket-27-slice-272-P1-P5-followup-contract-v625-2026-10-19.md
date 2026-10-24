# T27/S272 · P1/P5：必要事实与未来条件的字段合同

## 失败与原因

同一新产品 Run：`build/slice272-projection-owner-v565-inlKbk`。实际1095、1100及1108均试图对 opponent_and_counters 提交 `conclude/answered`，不再申请查询，却同时把“未来实战中哪种反制更优尚未证明”填进 `unresolvedQuestions`。已有 `conditions` 也明确保留该战略不确定性。

三次本地纠正仍返回同一问题。输出 schema 没有该字段的语义说明；纠正只有 `experiment_answer_has_unresolved_necessary_facts` 错误码。既有赛前阶段定义允许保留未来条件，但局部反馈没有解释条件应放在哪里。这是 P1/P5 的合同与纠正缺口，不是新增事实查询的证明。

## 修改

- 共享字段合同：`unresolvedQuestions` 收当前义务的必要未解事实；`strategy_required` 时也可携带明确待决选择。未来／可选不确定性由作者明确保留在 `conclusion.conditions` 并解释，不由 Host 分类或删除。
- 当前规则、支付、地图／底盘／路径可行性、已采纳测量主张的证据仍必须完成；真正必要事实不得挪到条件栏凑通过。
- 实验 schema 1.9.1 增加字段说明，同一阶段合同进入实际角色输入。
- 新错误携带 JSON Pointer、原问题和具体修正说明；读取旧失败时也提供新版说明，但不修改旧错误、请求、回复、费用或计数。
- 原产品恢复方法只允许当前精确停点追加一次作者纠正，不重验旧语义错误回复为有效，不重建房间、军表或调查。

涉及实现：`roster-review-data-questions-v1.mjs`、`roster-workflow-read-role-v1.mjs`；观察客户端 `run-slice272-product-review-cycle-v616.mjs` 增加定点恢复入口。

## 定点验证

只运行 `verify-slice272-experiment-followup-contract-v625.mjs <同一Run>`：

1. 修改前 RED：实际合同的字段说明为空，明确复现缺口。
2. 修改后一次 GREEN：旧原文仍失败；恢复请求包含精确原问题及操作说明；显式标记的修正夹具保留未来条件；当前路径缺证夹具仍失败；Host 无自动分类，原件和生产状态未改。

0 Provider／0 Native／0 生产状态写入。修正夹具不是模型实际输出，不能据此宣称真实纠正成功或策略更优。已通过的旧门禁未重跑。

## 实际生产观察

v624进程85838已安全完成本次 advance 并退出：r6，mechanicalBlockers 空，semanticIssues 16，activeWork 40。不是最终发布。

v625进程9238复用同一 Run，通过产品 `resumeRoleCorrection` 发起一次真实作者纠正；日志 `build/slice272-live-product-review-v625.log`。实际纠正、独立来源审核和最终修订仍待观察，不能先算成功。

### 实际1117：作者纠正已发生，审核仍待

`1117.request.json`实际使用 `roster.workflow_experiment_preparation_return` 1.9.1；`local_contract_feedback`包含原未知文本、`/unresolvedQuestions`和具体分类说明。`1117.reply.json`由真实Flash返回：不再查证，提交`conclude/answered`，明确解释剩余“实战反制优越性”是未来／可选不确定性，并保留在conditions，不宣称其已证实。`unresolvedQuestions=[]`由模型填入，未修改旧1095/1100/1108或新回复。

产品实际状态：该工作`evidence_ready`、correction空、调用数14→15、正常纠错额度恢复3、failureHistory保留3条。该结果证明真实作者能理解新版字段合同；尚不证明它的来源解释全部正确、领域最终通过或策略提升。六域后续工作继续同一Run，不追加新的查询总轮限。

独立来源审核已实际接上：1140与1142分别完成两条`source_fidelity`，均`supported`且`requiredData=[]`，逐项核对官方能力费用／阶段及Plan条件表述；未来战略优越性仍明确未证。根问题覆盖审核1145已读取原件，最终覆盖结论仍待。两条来源通过不能代替整域／整Plan通过。

### 实际1149：该事实问题独立审核闭环

1149完成`question_coverage/supported`，`dataQuestions=[]`，保留未来战略优越性未证条件。随后只读调用**产品实际**`assessRosterExperimentConclusionV1`，结果`status=answered`、`acceptedForStrategy=true`、`failedClaimReviewIds=[]`，来源与覆盖均无必要未解项。因此本问题可以供后续总体策略引用，不是仅模型自报answered。

这关闭的是本条“反制能力费用／阶段窗口”事实义务；不证明反制策略更优、不代表六域Plan发布或P5整体完成。无需新增一次同测试或重新购买旧回复。

至1115：主 Run 已知49,907,706 Tokens；可计价部分估 USD9.405291900。项目累计已知156,523,629 Tokens。767／955缺模型标识的295,843 Tokens仍未计价；942和更早未知费用保留。冻结价格估算不是账单，不杜撰人民币汇率；1116及后续尚未计入。

## 验收边界

本项只证明字段合同与局部反馈的工程修正。尚未证明六域全部通过、策略提升、新鲜固定／可编辑生产稳定、Web同链路或最终中文流程报告。

T27 5/6，T23 33/36；相关剩余S272/S248/S249/S250共4片；正式Plan 0/6，对局0/12。P0–P6整体目标保持不变。
