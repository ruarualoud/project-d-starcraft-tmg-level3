# Ticket 18 / Slice 174：总规则通用策略真实生产

最新续篇：[取证审查修复、真实校准与第二维生产](ticket-18-slice-174-evidence-review-calibration-2026-09-07.md)。当前正文及模型审查2/8维，仍待独立来源/Case/整局验收。以下保留首次生产的实际过程、费用与旧终态，不作为当前重跑指令。

本篇历史终态：新协议4/4真实探针完成；首个策略维度已真实生成并修正两处规则/时序问题，审查器重复误报导致两轮纠错上限停止。无在途API，不是正式对战可用性验收。

## 本轮顺序与预算

1. 核对上一轮9组预检与代码指纹，检查共享实际账本无402和在途请求。
2. 对 notes、policy、review、decision 四种新合同各做一次真实能力探针。
3. 用实际隔离 DSH 按8个通用策略维度执行 Teach / ctx2skill / Challenger / Reasoner / Judge / Proposer / Generator / 来源审查。
4. 成功拼成候选后，使用冻结的5个合成 Case 做8次真实决策消费，再独立核对可读性、策略性与来源。

探针上限¥0.10，生产与组件评估上限¥20 / 120 calls / 40M tokens / 6小时；每次请求前检查剩余额度，
沿用原账本和估算口径，不重复计算已花预算。没有刷新官方数据，没有启用 Codex 子agent。
DSH仅在离线生产使用；源审共识、Case偏好、整局策略及正式发布分别验收。

## 已完成：四种真实能力探针

run：`strategy-probe-076e46fed729eb294a0414ecbc8d5c0a`。
4/4通过，2,138 tokens，估算¥0.004473；探针后累计107,402,456 tokens / ¥76.796881。
回执：`118f3747c8adaf5449c1eaeb079ba7c2df7154010cc1eadf2525672ad10c530f`。
每个能力凭据都绑定实际共享账本里的Provider响应、输出合同、模型与有效期。
微型格式探针不证明真实策略内容正确。

## 出网前发现并修复的 Case 生命周期问题

第一次大上下文生产预检拒绝 `STRATEGY_LIVE_CASE_RECOMPILATION_DRIFT`，没有发出请求。
局面 stateHash 和结果向量相同，但裁判使用临时 Ed25519 密钥，重编译导致签名、MatchBinding、
LegalSpace、控制租约和完整 Case 哈希不同；因此不能把“重新执行了同一局面”当成“读取同一产物”。

修复为生产 Case 编译、执行、重放一次后整体冻结；重启读取精确原始签名产物。
`general-case-corpus-v1.json`以0600权限保存全部案例（包含私有留出），workspace仍只含开发输入。
不删除签名、不放宽匹配、不覆写旧预检样本；源码/来源绑定变化硬失败。
实际CLI先复现失败，再经过连续两个独立进程启动验证同一runId和corpusHash；6项回归通过、账本未改变。
回归回执：`c78d5d51c6a7cc5177b56a1a7f213c4af939113072ff7fcd8be0fc1f7069e236`。

## 生产入口和保留证据

- `scripts/run-ticket-18-strategy-capability-canary-v1.mjs --preflight|--live`
- `scripts/run-ticket-18-general-strategy-production-v1.mjs --preflight|--live`
- `scripts/verify-ticket-18-case-corpus-restart-v1.mjs`
- `scripts/verify-ticket-18-opening-fence-recovery-v1.mjs`：真实失败原响应本地重放，6组零付费检查。
- `scripts/verify-ticket-18-strategy-host-patch-v2.mjs`：实际越界修正复现、字段补丁、断点与负面证据保留，8组零付费检查。
- `scripts/run-ticket-18-general-strategy-continuation-v2.mjs --preflight|--live`：当前显式续跑入口，沿用同一run、计费、预算与时钟。

## 本次真实生产发现及修复

首个 `objective_plan` 维度的七角色已经完成。第8次来源审查HTTP200正常结束，内部JSON完整，
但只有开头Markdown代码块标记、没有结尾标记，被旧解析器拒绝。原run8 calls / 1,663,269 tokens / ¥1.637672。
此前“只保留失败元数据、不能事后恢复”的限制不适用于这次：本入口已在无凭据0600文件中保存精确原始响应。

新增独立、版本化opening-fence恢复适配器：只去除开头一行，剩余必须是完整JSON对象，
再走同一输出合同；不补字段、不截断正文、不删除审查意见。绑定原始传输、请求、失败、恢复与校验哈希。
真实失败本地重现后恢复，8条findings与6条limitations逐值不变，0新增API。
旧隔离与失败账单不覆盖；显式恢复别名允许复用此前七角色。

第一次续跑仅新增1 call / 216,825 tokens / ¥0.041638，已生成字段修正，但模型还改了未获准的`reviseIf`，
被 `STRATEGY_REPAIR_UNRELATED_FIELD_CHANGED` 拦截。不是网络问题，也没有重发整份上下文。
修复采用Host字段补丁：保留原始模型提议，只从中应用获准字段，其他字段精确复制父版本，
逐字段记录被忽略的越界提议。应用后仍要求实际变化、无循环、来源/语义新审；不靠模型抄对全文。
V2七角色生产和局部反思共用此机制，旧V1保持不变；8组检查含完整结构化路径与10输出重启复用。

独立读源还发现两条：Hold Position第二回合才开始计算标记VP；预备队部署风险必须在合法部署窗口关闭前规划，
“最终计分开始时视为摧毁”是结算时点而不是开始规划的时点。两条证据绑定精确已付费候选与冻结来源，
随下一次审查进入完整历史；即使模型返回无问题，Host负面证据仍要求修正。

此检查点累计109,282,550 tokens / 估算¥78.476191；本次探针与生产合计1,882,232 tokens / ¥1.683783。
没有402、没有在途请求；后续结算以共享SQLite及续跑report为准。四输出合同探针不证明策略来源正确，
各角色产物有重复也不构成独立策略有效性的证据。首维尚未收口，完整新通用策略仍0/1。

## 本轮最终结算与当前阻塞

V2续跑新增3 calls / 676,116 tokens / ¥0.179922，真实完成复审、限定字段修正、再次复审。
独立检查确认两处规则/时序修正已进入Host实际应用后的当前正文，而不只是模型提议。
复审仍返回7条重复的缺失/相反结论；其中“第一回合未区分”“未提前规划部署”“缺少第三对手分支”
“未写信息缺口保守分支”“未要求概率期望值”“未引结束检查/确定先手”均被实际当前正文直接反驳。
不是传输漏发：最新真实wire中的currentPolicy哈希严格等于实际Host补丁候选。

流程因`STRATEGY_REPAIR_BUDGET_EXHAUSTED`停止，没有扩大纠错轮次或继续改正确正文。
新增固定反例检查`verify-ticket-18-general-strategy-current-review-v1.mjs`，7/7实际样本绑定核验，0API。
反例报告`d4ac796c53e7491f334fc8f0ea222729da483208a8781b0484e6ba58c53eba3b`；
明确只证明这7条已读样本的误报，不能冒充通用自然语言审查器已修好，也不自动豁免来源门。

可读候选：`build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/independent-current-review-v1/objective-plan-candidate.md`。
候选hash`220dcacaabc22a4da15bb28b31d17f55b35eef2e9385e4b37bb30f57816abc30`。
这是8维中的首个目标规划候选（Hold Position条件策略），不是完整总规则Skill。实际规则服务Case消费尚未启动。

最终本轮：4探针+12生产请求，2,558,348 tokens，估算¥1.863705。
全历史累计：109,958,666 tokens，估算¥78.656113；0在途、0余额耗尽，非账单结算值。
工程新回归20组与7条审查反例通过；策略正文产出1/8维度、来源审查收口0/8，正式五件套0/5。

下一执行前优先修审查器，不原样重开该run：

1. 让每条意见绑定精确当前候选、字段和原文片段；完整历史保留，但历史问题与当前开放问题显式区分，当前版本在输入末尾再次明确。
2. 引入意见处置：已证实缺陷、被当前正文反驳、尚不确定分别处理，只有已证实且尚未解决的目标进入字段修正。
3. 用这7条误报及重新引入真实规则错误的反例校准新审查路径；不能只验证JSON形状或把删掉意见当成通过。
4. 新输出合同/提示绑定须显式升版并做必要能力探针；保留首维所有付费正文、修正、原审查和费用后续跑，再做剩余7维与Case。

生产run：`general-strategy-3705e4aa46ecd74a7826207a67b5b096`。
产物、原始无凭据Provider请求/响应、DSH隔离回执、每维候选、可读Markdown、Case回答与费用报告，
保留在`build/ticket-18-general-strategy-live-v1/<runId>/`。
主进程不把Keychain内容写入日志或生成上下文，凭据仅进入现有隔离Provider worker的会话内存。

生产输入继续携带完整来源、规则参考和历史推理，明确每个策略维度允许引用的Case；
没有对应Case的维度必须留空引用并标示缺少证据，不借用其他维度凑覆盖。
当前Case覆盖3/8维度，剩余5个维度和整局策略测试仍是正式接受的阻塞项。
Ticket18仍2/8、项目16/22、正式五件套0/5；本轮不改变这些分母。

本轮遵循离线Skill/ctx2skill/harness流程；使用诊断循环修复跨进程Case身份问题。
后续报告必须区分实际模型成功生成、审查无开放问题、独立来源核验、Case选择结果和整局有效性。
