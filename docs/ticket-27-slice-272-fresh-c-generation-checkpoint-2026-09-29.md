# Ticket 27 / Slice 272 — independent fresh-C roster and Teach checkpoint

Date: 2026-09-29. This is a second fresh sample, not a replay of `fresh-b` and not a production admission.

## C — fresh roster generation

- Reporting baseline was independently reset at `2026-09-29T09:05:08Z` on old session `iterative-standard-2000-fresh-b-v1` r21/19 paid replies. Historical invoices and receipts remain unchanged; A/B/D/E were not reset.
- New session `iterative-standard-2000-fresh-c-v1` reached r7. r2 Builder rejected one proposal; r3 was legal 1090/2000; r4 was Builder-legal **2000/2000**. r5–r6 were retained `repair_needed` decisions; r7 `finish` bound the selected-map receipt, then paused because Rules arrival and Teach review were still pending. The r7 pause is not a rejected roster.
- Same-session arrival schedule `2764bd84…c9fcb4a` was Rules-audited. Its first public deployment plan used temporary `agent-unit-*` identifiers, then the public-plan-only revision resolved all nine real Unit references without changing the schedule or roster. Zero unknown references remained.
- `prepareTeachHandoff` locked the 2000-point candidate to map-route receipt `4f69c8b7…54c9aa0d`, arrival schedule, and Teach session `agent-selected-teach-standard-2000-fresh-c-v1` with zero Provider calls.
- C post-reset settled usage: **9 calls**, 248,454 input / 17,622 output units, estimated **¥0.366624 off-peak–¥0.733248 peak**. This includes roster decisions, arrival schedule, and public-plan revision; it excludes all Teach/review and match calls. The Provider invoice is authoritative.

## D — separate Teach and review

- The locked-roster Teach ran four rounds to `planned`, 4 settled calls, 122,040 input / 33,997 output units, estimated ¥0.273808–¥0.547616. Teach plan `aaf22be8…bb468f` bridged to immutable room-plan hash `3ad66383…dd4445`, with candidate ID `terran-hold-position-2000-v3`; no Room was started.
- The next independent comprehensive source review ended with `ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE`. The current review CLI persists only `round_completed`, not `round_failed`, so no completed review or durable failure usage artifact was written for this attempt. It may have been billed; exact usage/cost is **unknown**, excluded from settled arithmetic but not considered free. Do not blindly retry the same paid request.
- Ranked diagnosis: (1) output ceiling from reviewing all plan/component claims in one answer is plausible, consistent with the Provider's explicit `incomplete` status and a historical Teach 32,768-output-unit incomplete event; (2) another Provider incomplete reason cannot be excluded because this attempt's reason was not retained; (3) transport or JSON parse is less likely because the runtime reached the completed HTTP payload and rejected its `status` before parsing. The missing failure receipt is a concrete harness observability defect, independent of the roster's Builder legality.
- D reporting window remains independent of C. Its cumulative settled increment from the frozen D baseline is 8 calls / estimated ¥0.382377–¥0.764754, including this new Teach; the one unresolved review attempt is itemized separately.

## Next bounded deliverables

1. Retain a safe `round_failed` review receipt with Provider incomplete reason and usage, without raw key/prompt; prove the specific failure path once before another paid review.
2. Replace the single potentially unbounded comprehensive review response with bounded claim partitions plus deterministic merge and source-quote verification. Preserve all original findings and separate any model judgment from Rules truth.
3. Complete a distinct-context review of this second sample, apply only cited High corrections within the three-round convergence policy, then decide room admission. No admission or full-match claim is made here.

## Harness evidence

`harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [ticket27.roster_strategist.iterative.v1, ticket27.roster_final_plan_review.v3, locked-roster Teach]`; `harnessToolsCalled: [Builder verdict, certified map route, Rules arrival audit, public Unit reference audit, Teach handoff, source review]`; `uiTraceEvidence: none in this checkpoint`; `agentDecisionEvidence: C r1–r7 persisted decisions and 2000-point candidate`; `memoryTraceEvidence: same-session candidate/map/schedule/Teach hashes`; `trainingTraceCandidates: none`; `rollbackOrDemotionRules: incomplete or unresolved High blocks room admission; no Skill promotion or training truth`; `userVisibleChecks: focused C/D ledger reconciliation only, not a Web match`.

Ticket 27 remains **5/6** (S272 open). Ticket 23 remains **33/36** (S248–S250). Ticket 24 strict map/deployment combinations remain **53/75**; all three long-goal acceptance chains remain **0/3** complete.

## 2026-09-29 增量：分片审查与产品入口边界

最终来源审查已拆成 7 片，每片审查自己的目标 claim，并以全部 51 个 claim 作交叉引用。第 1–4 片各保留一份完成的付费回复：合计 4 次已结算调用、56,962 输入／13,130 输出 units，估费 ¥0.129572–0.259144。第 1 片完整回复比 schema 的 24 条上限多 2 条；本地只软化这一个数量上限，其余字段、引文、目标路径覆盖仍严格核验，未重新购买这份回复。尚无 7/7 汇总报告或第二样本准入判定。

第 5 片首次请求和一次显式恢复均收到 `ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP`，两次回执均标 `requestMayHaveBeenSent=true`、用量未知。首次失败保存在恢复意图内，第二次失败在独立失败回执中；未授权的普通续跑已在发送 Provider 请求前被拒绝，进一步显式恢复也被一次上限拦住。两次请求**可能**产生费用，但没有实际计费或重复执行的证据；不得算作免费，也不得算入已结算用量。加上此前完整输出不足而未留用量的一次尝试，D 有 3 次未核销的可能调用。D 自己的冻结基线以来累计已结算增量为 12 次、估费 ¥0.511949–1.023898；C 仍单独 9 次、¥0.366624–0.733248。此时不再盲重试第 5 片。

用户功能验收边界也已核对：Web/App 确有新建会话、显式生成、进度轮询、暂停／续接及导出；本次 r2 非法候选到 r4 合法 2000/2000 是模型后续轮次自行修正，并非开发者手动选单位。但进场审计、锁表 Teach、分片审查目前由开发脚本分别触发；页面客户端没有最终审查操作，规划 HTTP Adapter 明确没有 Room mutation route，页面没有“经审查准入并以该表开局”的完整路径。这一整条仍属同一个待交付功能，不能把脚本候选或 Builder 合法性报为前端无干预写表对局完成。

`harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [ticket27.roster_final_plan_review.sharded.v1]`; `harnessToolsCalled: [Builder verdict, selected-map route, Rules arrival audit, retained review shards, Provider transport guard, roster workspace UI/API inspection]`; `uiTraceEvidence: current code has session creation/generate/export but no review-to-Room user path`; `agentDecisionEvidence: C r2 rejection to r4 legal roster and D Teach plan retained, no match action`; `memoryTraceEvidence: four source-review shard replies bound to one immutable plan hash`; `trainingTraceCandidates: none`; `rollbackOrDemotionRules: do not admit a plan with incomplete review or unresolved High; do not silently retry ambiguous dispatch`; `userVisibleChecks: API/code inspection only, no end-to-end Web roster-to-room acceptance`.

## 2026-09-29 产品审查入口接线（与上段历史状态区分）

针对“页面有生成、没有最终审查”的具体缺口，工作台服务的 `reviewFinalPlan` 已从单次 V1 改为完整 V3 七片流程：同一计划的分片回复按上下文／合同严格绑定并可逐片原样续接，来源审查运行时持久化；遇到 `ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP` 时，同一计划的普通页面/API 重发在再次调用 Provider 前拒绝。Web/App 客户端现可显式发起审查，页面轮询独立审查任务并显示片数、主张数、High 摘要和失败原因；可能已发送而无回执时隐藏普通重发按钮。规划服务仍无 Room mutation route，因此**尚未接成“审完直接开局”**。

用复制的 fresh-C Teach 计划做 0 Provider 的聚焦复现：旧服务入口先失败，改后同一 51 条主张在模拟回复下完成 7/7，保留的进度回执与计划状态一致。Expo Web 导出成功（约 190 秒）；隔离本地服务加载这一模拟完成态，真实浏览器打开 `/army` 并看到 [审查状态截图](../build/ticket-27-slice-272-final-review-visible-v1.png)，页面错误 0。本截图的“High 0”只来自测试用的零发现模拟回复，**不是**实际来源审查结论或真实模型准入证据。Web 全局 `tsc --noEmit` 未通过：错误均位于当前副官页面及其 `react-dom` 类型声明，不涉及本次修改的写表文件；不称类型检查通过，不重复跑无关门禁。

剩余同一产品交付：真实第 5–7 片来源审查及可能费用核销、High 纠错与准入、从合格写表计划进入正式 Room 的前端用户路径及截图、多次新鲜生成稳定性、带计划对局效果。此接线没有增加 C/D Provider 调用，也没有完成任何完整对局。T27 仍 5/6，T24 仍 53/75，T23 仍 33/36，长期三链 0/3。

`harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [ticket27.roster_final_plan_review.sharded.v1]`; `harnessToolsCalled: [workspace review API, retained-reply port, local mock review, Expo Web /army]`; `uiTraceEvidence: isolated real-browser screenshot of mock-completed status`; `agentDecisionEvidence: none newly paid; simulated zero findings are not Agent judgment`; `memoryTraceEvidence: copied session draft and seven local shard progress records`; `trainingTraceCandidates: none`; `rollbackOrDemotionRules: incomplete actual review and any unresolved High still block room admission; no automatic resend after ambiguous dispatch`; `userVisibleChecks: status renders, real paid review and roster-to-Room still unverified`.

### AI 自选军表的通用交接旁路

检查现有 Room 交接时发现两个入口：通用旧计划 `preparePregamePlanForRoom` 与自选军表专用 `prepareAgentSelectedTeachPlanForRoom`。后者要求 Builder 锁表、Teach 修订沿袭、最终审查裁定、任务来源与地图匹配；前者原本没有先排除 `agentSelectionHandoffHash`。用 fresh-C 保存会话做精确复现，旧入口竟进入 `roomRuntime.readRoom`，而非在入口拒绝（红）。现通用入口发现 Agent 自选军表即返回 `ROSTER_PLAN_ROOM_HANDOFF_AGENT_SELECTED_REQUIRES_PROMOTION`；同一复现绿，0 Provider、0 Room 读取/变更。修的是一个真实旁路，不代表专用准入已经通过或页面已能开局。

这也收紧上段话的含义：本次修改前“审查不完整阻止准入”只对专用交接成立，通用入口尚存在绕行风险；现在通用入口已显式拒绝，但完整专用流程仍待真实审查与用户路径验证。旧固定表仍走通用入口，不因这处改动重新解释其历史回执。
