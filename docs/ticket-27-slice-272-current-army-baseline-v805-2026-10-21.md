# T27 / S272：当前军表与实验基线身份 v805

## 本次结论与边界

P1/P2/P4 的来源身份接缝已修，实际 r4 素材的定点门一次 RED → 一次 GREEN（1.736 秒）。尚待真实模型完成复审／设计纠正，不能算最终策略通过。

T27 5/6，T23 33/36，余 S272/S248/S249/S250 四片；最终 Plan 0/6、对局 0/12。正式 r4 保持 2000 矿、170 气、8 单位、30 模型、19 升级；accepted=false。无人工改表、无新房间、无旧 A–F 重启。

## 实际故障与排除的原因

1. r4 已采用 Goliath-1 的 Ares-Class Targeting System、Haywire Missiles、Scatter Missiles 三项升级。
2. 实验设计仍称“当前 Ares、保留 Hellfire”，把 Haywire 说成待采用备选。
3. 真实预审 `a5bc46537490a82ee6c0bdc9fabb741d87457d0050d25380c25844c633ae5e37` 的 `workflow_role_assignment.inputs.draft.value.candidateInput` **确实包含三项升级**。不是漏传升级或网络错误。
4. 但该 draft 输入标了 `scopeUsage=historical_reference/currentApplicability=not_assessed`，两个旧预审检查主要论证任务、对手和有界实验，没有单独核对当前配置与分臂身份。
5. 保存预审结果 `81fb0aca5d1d1ea868b8d8280a5ed938b886f807989fadd1d8fc148cee783c64` 通过两项，未引用当前配置。后续 study 用历史604/708两臂得出保留 Ares，另自述几何并不完全一致；这些原测量和原结论保留，不能冒充新军表策略已经验证。

检验了三种解释：完整配置未送达（已排除）；当前配置身份／审核职责缺口（确认）；模型本意是历史反事实却误标当前（必须由模型明确，Host不替其改意图）。

## 改动

- `roster-workflow-evidence-lineage-v1.mjs`：共用角色输入新增 `currentArmyConfiguration`，从已保存当前 draft summary 的 `/candidateInput` 精确读取，核对与正式 draft 逐值一致、Builder candidateHash 一致。旧 Plan／历史输入不重写；不重新计算或挑军表。
- `roster-comparison-purpose-v1.mjs`：新增 `army_baseline` 预审职责，明确全部升级／卡牌及两臂与当前配置的关系；允许有清晰标签的反事实，不强制选哪种升级或一律重测。实际发出的请求和检查引用共同验证当前军表身份。旧合同只受控复审一次，原次数／费用／回复保留。
- `roster-hypothesis-cycle-v1.mjs`：旧两项通过不能代替新增身份核对；安排同一不可变设计的复审，不能直接放行后续比较／采纳。
- `roster-decision-workspace-run-v1.mjs`：设计作者和预审明确使用当前配置，历史 Plan 用途不能覆盖已采用升级。使用同一产品入口，不增实验专用策略路径。
- `verify-slice272-army-baseline-v805.mjs`：只复现本次实际缺陷。无真实 Provider、Native 或生产写入。

## 定点验证

命令：`node scripts/verify-slice272-army-baseline-v805.mjs <原 workflow 目录>`。

- RED：当前完整配置只藏在历史 draft，没有专属当前来源身份。
- GREEN：精确升级配置送达；旧预审不得复用为当前通过；同设计复审且不重置设计轮数；只引任务／对手来源不足以完成配置检查；新合同失败不会再次获得旧合同恢复；旧原件不变。
- 只跑本次红绿门，所有旧已过门未跑。此门证明接线和准入，不证明模型策略已改善。

## 实际续行

旧 PID39929 收到优雅停止，在当前操作完成后退出0；最终 r4/e6316，0 running、0 pending。随后 PID57025 从同原 `build/slice272-product-generation-v645-lqMWaS` 加载 v805，日志 `build/slice272-v805-army-baseline-live-20261021.log`。不得因旧状态日志或观察超时重复启动。

下一验收：真实复审识别或论证基线关系 → 需要时设计作者修正 → 同源事实／有效比较 → 作者联合军表与Plan决定 → 最终审核。不能只改一句名称便认定策略比较有效；原配置、几何和测量适用性仍须成立。

## Harness 可观测性

### 真实复审已纠正错误基线（e6400之后）

同Run的真实请求 `68b6a9cd6a225e3baeb55edf458be9b09faa72ec8631f2c77e5481387bb4d008` 已带当前完整 Goliath 三升级和三项审核职责。模型先读取配置/任务/工具原件，最后请求 `4ac523c7d9901a135305dbbe8e453efa254062e1c99f19fd6316d68cca38882a` → 原答 `52fcf3ba34030daf10a5d60a6e0a60ec2cec8123b91fde1d745186060f941261`：

- 冻结任务：supported。
- 当前军表基线：requires_revision。明确识别 Ares/Haywire/Scatter 同时存在，旧“当前Ares／待装Haywire”前提错误，要求作者相对真实配置明确反事实。
- 局部可执行性：conditional，须先纠正分臂；没有把尚未执行结果当成工具缺失。

正式保存审核 `96b6f273fa1148c7ea05290344fdbce079cf420c788d25394e5901f732fbe526`，系统自动入队 `purpose:v2`，未人工填写模型决定。这是本次输入／审核／交回作者的真实证明，不是整个比较／Plan完成。3次真实复审调用153270units，Provider合计18.940秒（不是墙钟），其他历史及期间已有study调用另计。

### 编号兼容 v807

真实请求把职责ID编码成q1/q2/q3，问题原文不变。检查旧合同恢复资格不能只搜原始`army_baseline`字符串，否则正常新合同会误获一次旧版重试。恢复检测支持明确合同版本和实际完整职责文本，构造器写入版本1。

只新增该具体模式脚本 `verify-slice272-preflight-handle-identity-v807.mjs`。首次夹具误选历史同名阶段，不算复现成功；修为精确r4 ID后RED确认，再修源码，一次GREEN。原v805/v806门未重跑；0真实Provider/生产写。现有这次controlledRecovery已防重复，修复主要保障后续新设计正常失败不会误被判为旧合同。

61446随后优雅退出0于r4/e6416，0pending/running；purpose:v2已完成首轮原件读取，未完成设计。PID67048同原Run载v807继续，日志 `build/slice272-v807-baseline-design-live-20261021.log`。所有旧原件及费用留存，无新初始化。

### 实际加载后发现的前置调度接缝 v806

v805同Run已把 `:preflight:v1:army-baseline-recovery:v1` 正确入队。但实际 e6331–6372 仍连续执行旧 study 的 source-revision：共享优先级图只把 `comparisonPurpose` 的实验后继作为优先对象，遗漏了用 `proposedDesign` 关联的前置审核。

新增本实际状态复现 `verify-slice272-preflight-priority-v806.mjs`：RED实际选旧study；修 `roster-workflow-graph-v1.mjs` 后一次GREEN。按显式 cycleId＋purposeResultRef 找当前预审，ready时优先；完成后旧study仍可正常调度。不凭名称猜归属，不取消历史工作，不改变事实／策略／重试计数。v805已过门不重跑。

为加载此调度修复，对57025发送同样的优雅停止，等待当前操作持久保存；没有强杀在途请求。此项不是新的策略实验，必须观察真实预审执行才算实际接线证明。

实际退出0于r4/e6374、0running/pending；PID61446同原Run载v806，日志 `build/slice272-v806-preflight-priority-live-20261021.log`。旧study真实已因几何不一致被来源审核拒绝（不是全都无条件通过），它在保存原结论后提出需同场景Haywire观测；当前基线身份仍须先审，不能仅改几何便放行旧配置说法。

- harnessLoopUsed: true；targetGames: StarCraft TMG 冻结数据。
- promptPackRoutes: comparison design / preflight / experiment / strategy；不是一个混合角色。
- harnessToolsCalled: 仅原产品调度入口；本次门无实际 Native 或模型调用。
- uiTraceEvidence: 本次为同产品 API 后端断点，不冒称浏览器验收。
- agentDecisionEvidence: 上述真实请求／原预审／study 原件；新真实结果待。
- memoryTraceEvidence: 历史配置和原 Plan 原件保留；当前配置单独明确，不改历史记忆。
- trainingTraceCandidates: 无新增获准训练材料；错误基线结论不晋升。
- rollbackOrDemotionRules: 身份核对不足不得接受；复审失败交回作者，不重置次数或捏造结论。
- userVisibleChecks: 最终军表／Plan尚未验收，数字不增加。
