# T27 / S272 — C 写表产物到 E 对局的当前来源核对

2026-09-29。只读核对已有本地持久文件；0 Provider 调用、0 Room 动作、0 新费用。

- C 会话 `iterative-standard-2000-fresh-b-v1` 当前 r21、`paused`，原始 Builder 输入的 `candidateId=terran-hold-position-2000-v14`、矿物 2000/2000、9 个 Unit；原始输入 hash `1a69048c…c79bbfc`。其内部 `blockingFinding=ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED` 是旧会话状态，不能把它当后续已裁定 Teach 计划的当前结论。
- 后续 v5 Teach 计划 `58388c55…e5fbc3` 有四条可追踪修订；53 项完整审查中的三项 High 由保留原文及限定句的类型化裁定降为 Medium，原审查仍不可变，裁定版 hash `540c27c9…cee87`。裁定为策略/文本审查，不改 Rules 合法性、不产生训练真值。物化入房清单在 `build/ticket-27-slice-272-iterative-live-v1/agent-selected-teach-f1047bc9848e12ef-cycle-component-purpose-20260929-room-admission-v1.json`。
- E 房 `ticket23-slice248-aa-20260928191935713` 的 `agent-selected-pregame-snapshot.json` 使用同一个 C/Teach session ID、计划 hash 与裁定审查 hash。其 `selectedCandidateInput` 与 C 持久会话的原始候选输入在去掉内部 `candidateId` 后逐字段相等，候选 ID 也相同。`plan.rosterCandidate.candidateHash=d3d4a4fd…d685237` 是带 Builder 合法性收据的计划候选封装，不与 C 的原始输入 hash `1a69048c…c79bbfc` 作裸值相等断言；两者值不同本身不是换表证据。
- E 同房已到 r10，前十次动作的完整对局仍未完成；r10 后 Planner 传输 High 留在对局链 E，不应反向宣称 C 军表生成失败或把 E 费用加到 C。C 新观察窗口自 `2026-09-29T09:05:08Z` 计，当前新增 ¥0；下一次 C 付费调度前重新核对持久 Provider 收据。

结论：**一份**精确 2000/2000 且绑定 Lost Temple 任务/部署路线的 Agent 原始名单，已通过 Teach 计划与审查裁定接到 E 房间；这不足以证明从头写表能稳定重复产出任意 2000 分名单，也不足以完成完整对局/策略复盘。T27 保持 5/6，S272 未收口。下一验证应是另一次新鲜写表全程的同合同成功率与成本，以及最终名单 hash 之后的地图/到达计划绑定；不要重跑已付回复来制造样本。

`harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [ticket27.roster_strategist.iterative.v1, offline Teach/review, selfplay_agent_prompt]`; `harnessToolsCalled: [persisted C session read, Builder-selected input comparison, admission manifest, E pregame snapshot]`; `uiTraceEvidence: existing E r10 screenshots, none created here`; `agentDecisionEvidence: existing C selected roster and v5 plan, no new decision`; `memoryTraceEvidence: E pregame snapshot source IDs and plan hash`; `trainingTraceCandidates: none`; `rollbackOrDemotionRules: any raw input/room snapshot mismatch, reopened Critical/High, or map receipt drift blocks future admission`; `userVisibleChecks: source-identity audit only, not a fresh generation or complete match`.
