# P2/P5：修改依据必须随当前 Plan 进入审视

T27/S272，2026-10-24。正式Plan0/6、新局0/12；T27 5/6、T23 33/36、余4片。

## 真实失败

B r22的作者将未测到达误写成测得不能到达，进而延后得分目标。军表不变，不能把这称为策略改善。原回复为 `8af48f93e8cfbe81991140fa55687325b26d6978a4446e868322ca0b101db570`，草案 `9eec1377a600fff9a2ccd78b035626d90d920ca31196db426350da93b41b61d4`，真实理由保存在draft.history最后一项及Plan修订记录中。

产品下一轮Teach只有当前Plan摘要/章节目录，没有明确交付本次提交依据。原件可找回不等于审核实际收到它；仅审视改后的目标可能遗漏改动理由中的错误推断。

## 修改

- `roster-workflow-draft-v1.mjs` 增加共享修订审视投影：按当前revision取真实已应用回执，原样保留publicReason、evidenceRefs、改动章节和前后身份，并给出原草案引用及精确history地址。不把回执当事实或策略批准。
- `roster-decision-workspace-run-v1.mjs` 的同产品requestTeach和requestFinalReviews使用此投影。
- `roster-workflow-readiness-v1.mjs` 将同一投影交给六个最终审核域；已有域复核继续继承原输入，不替换历史付费请求。
- 审核职责区分声明目标与测量结果：没有测量不是阴性测量；条件性目标不要求先打一整场未来比赛，但修改目标也不能补足它声称的事实依据。未指定任何战术、目标值或军表选择。

## 唯一定点验证

`scripts/verify-slice272-revision-reason-review-v968.mjs` 使用真实r22和实际公共Run，只在内存写入；本项不验证Native场景恢复，因此夹具省略该恢复事件账，不执行历史动作。

- RED41856：实际requestTeach未交付修订依据。
- 一次GREEN42564：Teach与六域审核均取得逐值一致的真实回执；源草案、军表、模型理由不变；0Provider/Native/生产写。
- 日志：`build/slice272-v968-red.log`、`build/slice272-v968-green.log`。未重跑v967或其他已通过门。

这证明交付接口，不证明模型一定正确识别该错误，亦不证明整体策略收敛。

## 真实观察

后续实际结果：Teach收到修订理由，但仍未识别“未测→测得不能到达”的推断错误，并重新提出到达/控点调查。已在同B r22/event11220停止，PID43040退出/0在途；不能宣称本项语义纠错通过。另查明保留决定回执生产器漏非批准标记，使关闭消费者静默丢弃实际申请，已v969定点修复；尚不恢复原重复调查。完整结果见[v969](ticket-27-slice-272-P1-P5-retention-closure-v969-2026-10-24.md)。以下为当时启动记录。

确认32197已退出、原B r22/event11134/0在途后，同HTTP产品客户端启动PID43040，日志 `build/slice272-v968-revision-review-1792775162817.log`。同时载入已通过的v967作者分块补齐；没有重发两条旧回复、修改旧账或新建房间。真实Teach消费待观察。

一旦出现同问题无新证据、无有效决策的循环，停止修复，不通过增加轮次继续运行。

## Harness边界

harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=local_teach/final_review；harnessToolsCalled=保存原件读取、同产品Run排队；uiTraceEvidence=本轮无新UI验收。agentDecisionEvidence保留真实r22错误理由，不手改；memoryTraceEvidence保留草案历史，不成为真实战史；trainingTraceCandidates无。rollbackOrDemotionRules：理由错配、原件变化、未解被批准或实际请求未交付即停止对应路径。userVisibleChecks：最终报告应能看到为何改、所据证据及审核是否接受，不能只看到新Plan数值。
