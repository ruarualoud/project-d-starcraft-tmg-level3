# T27 / S272 v804：已选候选的读取、确认与恢复

## 实际问题

v803真实作者已提交采用候选＋修改Plan，但e6056停在候选未完整读取。必须读后确认是正确约束；把这一读取前置条件当作语义失败则是恢复缺口。

已确认的三处接线问题：

1. 候选解析器建议 `/request/candidateInput`，却使用摘要视图472的地址；该路径属于原件471。
2. 候选未读错误未进入已有 `evidence_not_read → 精确读取 → 作者确认`，而是消耗语义纠错额度。
3. 复用已付费分块命令时，通用重验重新装配完整回复请求，丢掉原命令依赖的问题台账/投影状态；新命令应按原请求解码，不能用重新生成的合同猜其含义。

## 修复

- 原候选解析器返回原件的证据号和精确路径，选择本身不变。
- 此明确读取前置条件统一进入已有补读与确认通道。补读不代表采纳、合法、策略通过。
- 旧停点复用1d5fc120已付费命令，只重验、不重买。命令/补片用原请求解码，普通非投影Schema升级仍用原机制。
- 读后确认继续用分块作者命令。完整候选真正交付后，仍由模型确认/修改/拒绝，再走原Builder与Plan提交流程。
- 修正新命令格式错误恢复时原台账的读取位置，避免Host投影状态移出prompt后无法恢复原问题。

没有新增模型策略、强制选表、来源放宽、费用清零或房间重建。

## 定点证据

脚本 `scripts/verify-slice272-candidate-read-v804.mjs` 使用实际停点、实际候选选择与实际原件。

1. RED：建议读的是472而非471。
2. 修后首次共享执行仍失败，暴露上述第3项原请求解码缺口；不是新增真实模型失败。
3. 修正后单次对应门通过，16,692 ms：原命令无新Provider读取、原件逐值一致、先needs_model_choice而非落库，作者确认后形成revise提案，同一候选解析器返回完整候选，仍要求Builder重验。

0真实Provider、0Native、0生产状态写入；原件不变、最终验收不增计。旧通过门禁不重跑。日志：`build/slice272-v804-red-20261021.log`、`build/slice272-v804-green-20261021.log`（发现解码接缝）、`build/slice272-v804-green-wire-20261021.log`（通过）。

## 真实续行

PID39929从同一 `build/slice272-product-generation-v645-lqMWaS` / e6056恢复，日志 `build/slice272-v804-candidate-read-live-20261021.log`。启动前确认旧PID32021缺失、0在途；观察接口变量错误没有被当作进程终态来重启。

当前正式r3/1490余510；实际候选读后确认、Builder落库和独立审核效果待观察。T27 5/6、T23 33/36，余4片，最终Plan0/6、对局0/12。

### 实际结果更新：军表与Plan已联合提交到 r4

以下更新取代上段启动时状态，尚不代表最终验收：

1. e6063：复用1d5fc120原选择，自动读原件471的 `/request/candidateInput`，进入 `needs_model_choice`；没有重买选择或自动落库。
2. 真实作者确认请求 `a0bc96dae47a049f4e69bbfad30e834d088660b6b119fd7ba5b2dd33036a205d`，回复 `f0dcd62b503d59ce1954f834586738bb537d40caffb98a7a76b7021a1f38f19c`，仍用 `decide/revise`。163,212输入＋2,256输出＝165,468 units，Provider14.032秒。
3. 实际Builder重新审核合法，正式 `draft_committed`：r3→r4，armyChanged=true，1490→2000矿，170气，8支单位、19项升级。
4. 同一次提交修改 `rosterCandidate`、`publicSummaryText`、`lossResourceBudget`；Plan与军表同时换版，没有手工替模型补字段。
5. e6136 / w580：产品已派发r4真实context/scoring并完成，进入新军表的局部Teach和实验设计Teach。`accepted=false`，独立来源/策略检查仍待。

权威产物：

- r4 draft：`50dcc66c974ce02817cf05b6687e9f21dafec0d036a7e6138a7d2e712175fb5e`
- 当前Builder verdict：`e929b883b67c820e936519fa1f107b25154895a27806838563706ff864401606`，status=legal。
- 当前candidateHash：`ba4b6927bc2e8a150bfbd429ef43aa6255963364c2811cca34cfb7d34ead8a30`。
- 同Run `workspace/decision-workflows/decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c/artifacts/` 保存上述完整脱敏原件。

可读变化（保留原有单位与既有升级）：

| 单位 | 本次新增升级 |
|---|---|
| Marine 1 | Bayonet、Slugthrower |
| Marauder 1 | Laser Targeting Systems、Veteran of Tarsonis |
| Goliath 1 | Haywire Missiles、Scatter Missiles |
| Medic 1 | Advanced Medic Facilities |
| Marine 2 | Bayonet、Slugthrower、Rocket Launcher |
| Medic 2 | Advanced Medic Facilities |
| Goliath 2 | Haywire Missiles、Scatter Missiles |
| Medic 3 | Advanced Medic Facilities |

模型的公开取舍：采用已有合法候选补足510矿；保留Goliath和主要得分路线，认为现有局部比较不足以论证删除Goliath；把Marine比较限于已测单目标基线，未来对手行为继续作为条件。不因这段理由就认定新增14项升级都已充分论证；这正是r4 Teach/复审要继续查明的内容。

v803选择＋v804确认两次本轮真实调用共 **330,461 units**，Provider合计28.464秒；不含初始化/读取/Builder/状态处理墙钟，不含此前旧账，不猜人民币金额。旧v802失败费用另保留。

已证明的范围：该真实样本走通“分块作者选择→原件补读→作者确认→Builder重验→军表/Plan联合提交→受影响Teach入队”。尚未证明：整体策略更优、完整Teach无未知收口、A固定表同等闭环、正式最终发布及对战胜率。

后续观察到e6174：r4实验Teach已返回局部保留理由，明确单目标生存比较的局限，并提出升级对比问题；实验目的角色正在处理，常规Plan各节Teach仍在读取。不能把Teach提问自动当作新的必要实验：后续应检查现有证据的适用范围与当前升级配置，复用足够原件，避免重新扩张到整场模拟。此处是待验证内容，不由Host代模型删除问题。

Harness记录：`harnessLoopUsed=true`；`targetGames=[starcraft_tmg]`；`promptPackRoutes=[roster_workflow_strategy_decision,roster_workflow_local_teach]`；`harnessToolsCalled=[exact_evidence_read,rosterCandidateSelection,Builder_reaudit,Plan_joint_commit]`。`uiTraceEvidence=未做本轮UI验收`；`agentDecisionEvidence=1d5fc120/f0dcd62b与r4提交历史`；`memoryTraceEvidence=原问题/命令/来源/提交日志保留，未晋级长期记忆`；`trainingTraceCandidates=无晋级`。回退/降级条件：完整候选未交付、修改未实际执行、必要未知丢失或独立审核失败时不发布；完整策略和对局效果仍待最终验收。

## Diff 摘要

- `roster-workflow-budget-selection-v1.mjs`：候选原件地址。
- `roster-workflow-read-role-v1.mjs`：统一补读、旧停点无付费重验、原命令解码、读取合同与格式恢复台账。
- `roster-workflow-author-command-v1.mjs`：补读后的分块确认。
- `roster-decision-product-journey-v1.mjs`：同产品恢复原因。
- 一条具体失败复现/闭环脚本、本报告、进度记录。

Harness技能要求的可观察证据为实际命令、读取原件与后续提交；当前没有UI验收、Skill/长期记忆或训练晋级。完整2000表、Plan策略性和正式发布仍须后续实际证明。
