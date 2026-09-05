# Skill 生产、人机、自博弈与复盘升级：现阶段修订方案

日期：2026-09-05。范围：StarCraft TMG，Ticket 17 / Slice 170 设计纠偏。

状态：**审查与止损已完成；下述生产改造尚未完成，不恢复付费生成。**
本文件优先于旧 Slice 170 文档中“只差下一次 paired run”的执行建议。
不刷新已冻结的官方游戏数据，不更换 DSH 版本，不调用模型，不修改规则器。
本轮没有启动 Codex 子 Agent。文中的 Teacher/Reviewer 等是待实现的产品角色。

## 1. 结论与现状

现有安全底座可保留，但当前流程不能作为正式基础 Skill 生产线。
问题不只是模型偶尔输出坏 JSON，而是**取证不足、纠错未闭环、评估不能证明内容正确、成功阶段不能持久复用**。
继续仅缩短 Prompt、增加固定模板或重跑全链，不会解决这些问题。

- Ticket 17：已完成 163–169，共 7/9；170 未收口，171 未开始。此比例是工程 Slice 比例，不是 Skill 可用率。
- 项目仍为 15/22 Tickets；未完结的是 14、17、18、19、20、21、22，14 的真机验收延期未豁免。
- 第一组可用于后续开发的目标仍是 5 个：总规则 + 两个种族/注册原型 + 正反两个对抗。当前正式晋级 **0/5**。
- 当前目录是 53 个可加载 Skill：1 总规则、10 任务、6 种族/注册原型、36 有向对抗。6 是当前注册项，不应解释成星际只有/共有六个生物种族。
- 1,163 个规则引用、1,215 个内部课程任务不是 1,163/1,215 个最终 Skill；114 个 display-only 条目不能获得可执行规则资格。
- 旧安全门通过不等于事实门通过；旧样例/注入测试通过不等于真实模型已会玩。

## 2. 审查依据与可复现问题

直接检查当前工作树、Attempt 1–10 安全报告、生产目录、输入编译器、DSH relay、角色图、评估器、在线角色、调度/晋级 scaffold。
MTL 读取的是本目录下只读副本 `build/reference-mtl-ticket16-audit`，HEAD 为用户指定的 `50ef5c29c655c015335d76e78fb4a0ecb442252f`，没有追随移动分支或刷新游戏来源。

| 问题 | 代码证据 | 后果与修正 |
| --- | --- | --- |
| Fact Judge 没有判断命题真假 | `packages/skill-generation-runtime/paired-skill-proof-v1.mjs:221`，只检查 evidence 哈希、claimType 与 advisoryOnly，不读取 statement | 相反的两句话能同时通过。降级为 provenance 检查；另建逐条事实/规则证据验证。 |
| Cross-Time 未运行测试 | 同文件 `:241`，取 testId 并对已有 verdict 做 every | 无 fixture、无局面、无执行器也返回 replayed IDs。改为运行有预期状态/拒绝码的真实用例，未执行不得标 passed。 |
| “盲评”是关键词计分 | 同文件 `:456`，includes/regex 搜索 phase、hash、replay 等 | 填满关键词可得满分，无法证明会玩。保留为文档完整性诊断，撤销质量证据用途。 |
| 输入承诺了检索但实际未接 | `how-to-play-model-projection-v1.mjs:52` 只提供章节数量/哈希；`dsh-skill-executor-v1.mjs:442` 强制角色 tools 为零 | 总规则结果更接近“如何问工具”，没有实际规则学习材料。必须提供冻结原文/结构化事实与可调用的只读取证工具。 |
| DSH 只包住单次调用 | DSH executor 的 Adapter 忽略模型消息内容，只 relay 固定 packet；角色只允许一次调用，候选工具调用由 host Adapter 合成 | 证明真实 DSH Session 生命周期，不证明 DSH 的规划/取证/纠错收益。改为真实受限工具循环。 |
| 固定模板抹掉纠错通道 | `provider-broker-v3.mjs:57` 与 ROLE_SHAPES：Student uncertainties、Proposer revisionTargets、Generator unresolvedClaims 都固定为空 | 基础角色图有修订血缘，但正式运行模板把可表达的失败压扁。允许类型化 uncertain/blocked/patch。 |
| 预算与输出形状不匹配 | `provider-broker-v1.mjs:594` 七等分预算；paired contract 每 arm 输出 7,168，故每角色 1,024；Generator 含许多列表 | 复杂整份工件与短答案同预算。按角色/章节预算，host 组装固定字段，结构化分块输出。不能断言历史 Generator 一定由截断导致。 |
| 成功阶段没有持久恢复入口 | paired proof `:584` 把两 arm 的结果暂存在对象；runner 只在完整返回后写候选；scheduler 明示 process_memory_v0 | Attempt 9 有 13 个成功调用，第 14 个失败，前面成果不能直接续跑。角色/章节结果验证后立即 checkpoint，两 arm 独立结算。 |
| 格式失败丢失 usage | `provider-egress-transport-v1.mjs:601` 先解析业务输出，成功后才组装 usage receipt | 已返回 usage 的坏输出也可能落入未知费用。先保留安全用量/终止原因，再判断业务内容；usage 缺失不能记为 0。 |
| 规划存在先后倒置 | Ticket17 负责付费生成，Ticket18 才负责多轮纠错/持久化/语义评估 | 把生产必需的最小子集前移，生产级扩展留 Ticket18；不是推倒重做 Rules。 |
| 后续闭环还不能靠接线完成 | 在线输出 `role-output-runtime-v1.mjs:327/426` 只选现成 enabled candidate，并强制真人确认；后续自博弈/复盘尚无完整 runtime | 需要参数动作搜索与规则验证、服务端 AI 席位授权、冻结实验和反事实工作流，不能把七角色链直接当对手。 |

### 2.1 本轮实际反例测试

运行 `node scripts/verify-ticket-17-skill-design-audit-v1.mjs`：

1. 引用一致时，“规则器拥有合法性裁决权”和“Skill 可以覆盖规则器”都通过旧 Judge。
2. 错哈希被拒绝，证明它确实检查 provenance，但没有检查含义。
3. 不提供任何 fixture/state/executor，旧 Cross-Time 仍标记一个虚构 testId 已回放。
4. 含越权句子的关键词堆砌可获旧盲评满分；不意味着它通过整个角色图或晋级门。
5. 两个旧付费 CLI 即使带原授权 flags，也在读 Keychain、创建 attempt lock、调用 Provider 前退出。

共 9/9 审查/暂停保护检查；报告 `build/ticket-17-skill-generation-v1/slice-170-design-audit-report.json`。
**此结果证明缺口和止损生效，不证明新事实验证器或新纠错器已经实现。**
保留旧 Judge/score 作为历史反例，不偷偷把历史失败工件改成成功。

### 2.2 失败与费用的正确解释

Attempt 3 是形状问题；4–9 涉及 Worker/IPC 校验与错误回执问题，不能都称为“模型幻觉”。
Attempt 10 确认到 Provider 响应合同被拒，但当时没有保存足够的安全诊断来区分空内容、坏 JSON 或截断。后补分类代码不能倒推历史原因。
已准备但未启动的 Attempt 11 / Broker V6 不作为下一条默认执行路线。

截至 Attempt 10 + Challenger canary + Ticket16 tracer：

| 口径 | 数值 |
| --- | ---: |
| 已知成功回执 token 下限（不是全量实际值） | 2,864,424 |
| 已知用量按冻结计价估算 | ¥5.052393 |
| 9 次未知用量调用的保守风险预留 | 约 ¥28.961350 |
| 已知估算 + 未知风险预留账本 | ¥34.013743 |
| 本轮审查新增 Provider calls / tokens / 费用 | 0 / 0 / ¥0 |

来源：`build/ticket-17-slice-170-live-paired-skill-v1/` 各次 `live-report.json` 的安全用量及末次 costSnapshot；使用冻结预算换算 8 CNY/USD，不是汇率报价或 Provider 发票。
Attempt 8 顶层 physical=1 与六个成功回执加一次失败不一致，后续审计采用 7；不能直接相加历史顶层字段。
旧 `usageKnown:true` 在部分失败报告里只覆盖成功调用，不代表失败调用也已知。原报告不改，追加归并账本纠正解释。

## 3. 目标结构：事实、策略、表达分开

```text
冻结官方资料 + Rules/Referee + 规则关系图
                   ↓
          可检索事实库 / 可执行验证用例
                   ↓
     Teach → 策略草稿 → 挑错 → 定点修复
                   ↓
   事实检查 → 隔离演练 → 留出集 → 受控发布
                   ↓
      在线人机 / 机机（只读固定 Skill 快照）
                   ↓
     对局证据 → 反事实复盘 → Skill 补丁候选
                   └──────── 回到评估，不直接上线
```

三类产物不能混同：

- **事实库/规则原子**：官方来源、数值、条件、时序和可执行 Rules 行为。由可信程序校验；LLM 不生成真值。
- **策略 Skill**：怎么取胜、如何构筑/部署/分配资源、何时交换/计分、失效条件与替代方案。可验证的建议，不是规则代码。
- **角色表达**：凯瑞甘世界书、口吻、头像、语音。可修饰说明，不能修改事实、决策结构、视野或行动权限。

不以“确保零幻觉”为承诺；目标是高危错误阻断、未知显式化、局部可修复，并用独立测量持续降低漏检。

### 3.1 最小正式 Skill 组，不扩大数量

先完成一个 `how-to-play` 包，内部有总览、章节、来源清单和场景例子，不是只写一段路由指令，也不是把 1,163 个原子各生成一个 Skill。
章节可分块生产/审计/保存，但最终是同一个版本化包。章节覆盖要包含开局、轮次/激活、移动/底座几何、战斗/冲锋、资源/卡牌、Token/状态、任务计分、结束与争议。

两个种族/注册原型 Skill 依赖这份已验证总规则；A→B 与 B→A 都依赖两方已验证种族包。
首轮范围从已冻结目录与测试军表选定并写 manifest，不在正文里臆造单位能力或编造第二份数据。
首批只支持声明的地图/军表/任务覆盖；至少有一个可玩的官方任务，其基本计分规则纳入总规则与运行时取证。无需先生产全部 10 个任务策略 Skill，但不能没有任务规则就开赛。
基础五件套可支持受控后续开发，不宣称已经泛化到全部军表或达到强 AI。

### 3.2 工件与证据粒度

每个包输出 `skill.json`、确定性渲染的 `skill.md`、`manifest.json` 和评估报告。hash、版本、ID、依赖、签名由 host 写，模型只输出正文与短引用 ID。

每个事实性句子/表格字段建立 `ClaimRecord`：

```text
claimId / fieldPath / text / kind
scope: game + source/rules hash + phase + unit/weapon/mission + preconditions
evidenceRefs: factId + exact source span + applicable exception refs
verification: evidence_checked | oracle_checked | semantic_reviewed | unknown | contradicted
dependsOnClaimIds / supportsProcedureIds / findingIds
```

区分 `source_fact`、`mechanics_derived`、`strategy_hypothesis` 和 `presentation`。
模型不能只靠自报 strategy 把隐含规则断言绕开；独立 claim inventory 覆盖 summary/procedure/examples/counterexamples/judge 文本等全部玩家可读字段。
每个数字、条件、否定、例外和“因此”因果关系都要检查适用范围。精确引文存在只证明引用，**不自动证明推导正确**。

对规则关系图增加：source→fact→claim→section→Skill→依赖 Skill→测试/实验的有向关系。
规则更新时按反向依赖找影响面；图缺边/无验证证据是待处理状态，不以“图已建”替代完整性证明。当前不刷新数据。

## 4. Skill 生产：受限、可恢复的 Teach + Ctx2Skill

### 4.1 输入与工具必须真实可用

把当前索引升级为 Evidence Module：`query(query, scope)`、`read(refs, budget)`。
返回冻结官方原文的连续片段、结构化卡/单位数据、明确时序与例外、当前 Rules 结果、缺证原因；不允许模型查询任意文件路径/网址。
发现正式来源与代码不一致时创建 Rules/source issue 并隔离相关 claim，不让模型选择“哪个看起来合理”，也不静默刷新来源。

问题树以官方资料和规则关系图生成覆盖骨架；模型补充疑点、条件组合和策略问题。按动作、阶段、尺寸/路径、武器/关键词、Token 生命周期和得分依赖取邻接证据，不能只靠正则把一个原子塞进唯一章节就宣称覆盖完整。

**声明有工具不算完成**：必须有模型提出查询→host 返回原文→后续 claim 引用该次结果的真实 trace。没有取到原文就返回 unknown，不以模型常识补 TMG 规则，更不混用 SC1/SC2 电子游戏机制。

### 4.2 角色是流程职责，不是每个任务固定七次付费

1. Planner：可信程序生成覆盖任务；需要新的策略问题时才用模型扩展。
2. Tutor：读取相关证据，示范玩法与策略权衡。
3. Student：独立上下文形成章节/策略草稿，保留不确定项与适用条件。
4. Challenger：找反例、例外、未来资源代价、对手合理回应和隐藏信息问题。
5. Reasoner：用原文及冻结 fixture/Rules 工具回答，不凭流畅解释宣布成功。
6. Judge：程序核事实/数值/合法性；语义审查用于无法直接形式化的句子。
7. Proposer/Editor：只改 finding 指向的 claim/段落；Generator 由 host 组装已检查正文，不再让模型重复整份带哈希大 JSON。
8. Cross-Time：真实执行旧回归 + 新反例，检查跨阶段/对手回应；两个概念分别报告，不能仅列 ID。

首次学习保留 Teach；没有错误不付费让 Proposer 再写一份“无需修复”。复盘补丁只运行受影响的阶段，不能跳过影响面回归。
成功的上游安全工件立即保存；父 hash/输入/模型配置不变时复用。换了来源、Prompt 或正文，不得把不兼容缓存冒充同一实验。

### 4.3 DSH 应做什么

继续使用固定 DSH 作为离线 Adapter，但真实承担 `取证 → 草拟 → 运行探针 → 阅读 finding → 修订` 的有界循环。
工具只包括冻结来源、已验证 Skill、隔离 fixture/只读 Rules 查询、暂存草稿；Rules 查询不得指向生产房间写接口。
每个候选/修复节点维持一个隔离 Session，host 授予每次 Provider/tool 调用预算，保存安全 checkpoint；不为每个单次回答重复暂存整个 runtime。
依旧无凭据直读、通用 shell、任意网络、生产库写入、活房间 Apply、自动晋级权限。

DSH 实际消息/工具结果必须进入 Broker 请求，不再只传一个 role hash 后由 host 换成另一套固定请求。
相同事实、任务、模型配置、工具权限和**总预算上限**下对比 DSH 与直接执行器；允许调用轨迹不同，才能测流程收益。
旧严格逐角色同 Prompt 的对照只用于传输等价/开销测试，不再声称验证 Harness 增益。
先 A/A 检查测量噪声，再比较任务完成、错误修复、用量、延迟和留出表现。单个 paired 样本不能证明 DSH 显著更好。
不把“社区评价好”当作本项目效果证据；若增益不足，记录结果再决定配置，不擅自把 DSH 移到在线对战。

### 4.4 反幻觉与审查分层

| 层 | 自动检查 | 遇到失败 |
| --- | --- | --- |
| 结构 | JSON/schema、finish reason、列表/枚举、输出上限、引用存在 | 小块重发或格式修复；不补造缺失事实。 |
| 来源 | 引文偏移/hash、版本、主体、范围、条件/例外、claim inventory 覆盖 | 取补充证据；仍缺失则 unknown/隔离。 |
| 机制 | 数值表达式、可执行前置条件、合法/非法动作、期望事件/状态、真实回放 | 必须由可信 Rules/fixture 验证。source 与 oracle 冲突另报规则问题。 |
| 语义 | 两个独立新上下文，一正向核对、一主动证伪；只给候选和来源，不给作者自评分 | 分歧只送第三个上下文复核；三票不能推翻确定性失败。仍不确定则隔离。 |
| 策略 | 适用/失效条件、备选、成本与未来风险、留出局面和完整对局 | 可以保留事实安全但策略弱的实验候选，不当作规则错误，也不直接发布。 |

语义审查采用 MTL 的逐句分母/分歧仲裁，但不照搬“十轮一定好”或“两个模型一致就是事实”。
新上下文减少串扰但不等于独立知识；同模型有相关错误，确定性机制检查与外部留出证据仍是底线。
所有必要事实须获对应证据；不能靠删除困难内容或输出空壳达到 100%。覆盖清单中 mandatory 缺一就不可就绪；可选未验证策略可以明确删去，必须连同依赖段落和测试重新核验。

### 4.5 错误分类、修复与停止

| 失败类型 | 自动动作 | 必须保留 |
| --- | --- | --- |
| 明确未发送，如本地参数失败 | 修正本地请求后新 attempt，不计模型消耗 | 未发送证据、原错误 |
| 收到完整响应但空内容/坏 schema | 已知 usage 先结算，再对失败块做有界新 attempt | response status、finish reason、字节数、字段诊断、账目 |
| `finish_reason=length` | 拒绝作为完整结果；缩块或增加该块预算 | 原 usage；不能盲接剩余 JSON 或凭空补闭合 |
| 事实错误 | finding 定位到 claim+field，附支持/反驳证据，局部 patch | 父候选、修改原因、受影响依赖 |
| 网络/进程中断且可能已发送 | reconcile 已知回执；无可验证结果则标 ambiguous，保守预留，不自动重发 | dispatch intent、attemptId、lease/fence、未知金额 |
| 401/403、账户余额耗尽、来源冲突、越权 | 暂停相应生产队列；余额耗尽时依用户指令暂停其他开发 | 明确可恢复条件，不循环消耗 |
| 429/短暂服务故障且可明确结算 | 有界 backoff + 新 attempt，总预算控制 | 状态、原 usage；不能当作 definitely-not-sent |
| 判据分歧/无证/两次同一实质失败 | 停该节点，保留可复用上游，输出待办 | normalized finding 与失败谱 |

默认每块最多一次结构性修复、每候选最多两轮语义 patch；总物理调用数、token、时间与费用另有共同上限，不能相乘形成隐性无限重试。
上限是首轮保守起点，在试运行报告后版本化调整。不会每次普通格式修复都要求用户操作。
“零传输自动重试”与“已计费响应后的受控内容修订”分开，后者也是新收费调用，有新 attemptId，不叫免费恢复。

每次 patch 前验证父内容 hash；只允许改 finding 指定路径，不得改 source/version/evaluator/审批信息。修复后跑改动事实和依赖测试，晋级前才跑固定全套回归。

### 4.6 持久调度与预算

复用 Ticket16 持久 attempt/budget 思路，而不是再造一套不相容日志。
生产 Module 的小 Interface：`submit(recipe)`、`inspect(runId)`、`resume(runId)`、`cancel(runId)`；DSH/direct 与 SQLite/PostgreSQL 分别作为真实可替换 Adapter。
内部负责节点状态、lease/fencing、dispatch intent、用量结算、checkpoint 和依赖调度。

节点经历 ready→leased→dispatched→response_recorded→validated→checkpointed；失败显式为 needs_repair / ambiguous / quarantined / stopped。
可以保证提交幂等与至多一次晋级，**不能承诺跨外部 API 的 exactly-once 计费**。
成功响应的脱敏规范正文属于工件，可以持久保存；原始 Prompt、原始响应、reasoning、Keychain 内容仍不落普通日志。只存 hash 无法恢复正文，不能继续这么做。
诊断最小字段：attempt/stage/模型别名与实际模型映射、HTTP 状态、终止原因、schema 路径错误、完整性标记、usage 及是否已知、响应字节数、安全内容 hash。未知错误不可统一抹成一个 generic code。

初始输出预算按节点形状分配，例如短检查块 1,024–2,048，章节/编辑块 1,536–4,096；只是拟定范围，须通过最大样例序列化与小规模真实校准，不是所有节点固定采用最大值。
上下文按相关证据和父摘要取用，保留可追溯原文；完整索引留 host，不重复发送 778 KB，也不能压缩成只有 hash。
预估以**真正发送的投影**计，分别显示已知用量估算、未知调用预留、待执行最大预算和 Provider 实际账单（如可获取）。未调用的角色不当作实际花费。
跨累计 ¥100、¥200 等阈值之前通知；授权与阈值通知分开。余额耗尽按用户要求暂停，不转去继续其他开发。

## 5. 验收：不再用一个 passed 代表一切

工件级别：`transport_passed` → `grounded_candidate` → `supervised_eval_ready` → `published`。
训练资格单列，不是发布后的自动下一步；总规则、种族、对抗依赖按精确 hash 绑定。
为解除鸡生蛋问题，已过事实/机制门的 candidate 可进入**隔离评估**，不需要先全局 published；不能因此进入普通玩家默认 Skill 路由。

首轮拟定的最小评估分母（在付费前形成具体 fixture，不拿数量代替设计）：

- 40 个可见开发题：总规则 10 主题 × 4 题，正例/反例/条件例外/时序。
- 40 个最终留出题：与上述主题相同但局面/军表/种子族隔离，不给生成器答案。
- 每个种族与有向对抗分别 12 个小局面，共 48 个；包含未见单位组合、先后手、地形、任务压力与不同武器/Token。
- 固定历史引擎回归另计；必须列清来源与缺口，80/48 这些数量不能宣称覆盖全部 1,049 个可执行原子。

所有必需机制用例真实执行且通过，非法 Apply/隐私泄漏/回放偏差/未解决高危事实均须为 0；一般语义或策略质量另报分布，不假装可数学保证全域零幻觉。
最终留出失败若反馈给编辑器，该题立即转入开发集并补充新隔离留出题，禁止在同一套测试反复打磨后称独立泛化。
受控可玩验收与“比基线更强”分开：前者证明完整玩法、稳定性和边界；后者需要冻结 opponent pool、完整对局与置信区间，样本不足就报 inconclusive。

## 6. 人机：策略决策与角色扮演解耦

在线仍用 direct Provider + BYOK，**不启动 DSH，不在线生成/改写 Skill**。

每次决策：

```text
席位可见状态/目标 → 检索当前 Skill → 回合计划/备选
  → 请求测距/威胁/概率/Rules 工具 → 选择或实例化动作
  → Preview → 配置的确认策略 → 服务端 Apply → Receipt/Replay
```

两个层次：TurnPlan 记录目标、资源预留、激活顺序与 revise-if；ActionIntent 只提出当前一个原子动作，状态变化后重验并决定是否重规划。不能一次计划整回合后连续盲执行。
输出需简短决策依据与备选，不要求保存隐藏思维链。测距、概率、底盘、攻击后移动和 Token 时序由工具/规则器给结果，不让 LLM 心算坐标和强行回忆规则。

当前在线 V1 只选已列出的 candidate；需要增补参数化动作实例化/搜索。搜索建议只是合法动作域的子集，不能把没采样的移动地点标为非法。
新 candidate 仍必须来自 Rules-owned domain，带当时状态/LegalSpace hash；不能让模型提交自由格式命令直接改房间。

保留现有“人类每步确认”的辅导模式。自动人机采用**新的服务端 bot seat 授权策略**：用户在开局授权 AI 控制指定席位，host 持有受限租约并提交经 Preview 验证的动作。
不能修改老 V1 的 `requiresExplicitHuman` 来绕过确认；新版本配置明确 human_confirmed / delegated_bot，仅允许当前 AI 席位，撤销/暂停立即 fence 旧决策。
遇到坏输出最多一次当回合修订；仍失败只能暂停或采用已声明的合法保底动作。保底是独立策略且计入实验失败/降级指标，不能悄悄替模型赢比赛。

凯瑞甘仍是可替换示例角色包。优先由无角色权威的 Decision Module 产出结构化选择，Presentation Module 按选定时代表达；先模板化表达避免每步双倍模型调用。
如比较带/不带角色提示对决策的影响，固定 Skill/模型/局面独立 A/B。先确认玩法正确，再评估角色一致性、年代泄漏、解释帮助与用户体验，不以头像或流畅台词证明 Agent 有效。

## 7. 机机自博弈：先建立实验，不要立即自我强化

复用人机 Decision Module，每席独立 Provider 会话、私有视图、Skill snapshot、短期记忆和预算。不得让同一聊天上下文轮流扮演双方。
冻结 Rules/data/地图/军表/任务、先后手、随机机制、Provider 配置、Skill、Harness、确认策略和评估定义；一局内不替换模型/Skill，也不读取未来事件。
补足 pause/resume、turn timeout、lease/fence、幂等 Apply、断线恢复、循环/无进展上限。人类席位没有输入时不能后台替人下棋。

初始对手池：随机合法、确定性简单 AI（可复用但需先证明同一 Rules 合同）、无策略 Skill 的同模型、当前基础包、历史已验证包；暂无历史版时明确缺桶，不伪造一个。
先小型 headless arena 供 Ticket18 评估，不必等完整后台 League 产品；Ticket20 再做 Web 接入和批量编排。

完整对局 pilot 建议 3 个可用基线 × 2 种军表/地图配置 × 4 个种子族 × 2 个换座位 = 48 个实验 cell。
每 cell 跑 incumbent/candidate 配对，因此计划 **96 局**，不是把 48 cell 说成 48 局。这是首次工程/效果校准，不保证统计功效；先做更小 smoke 再启动该批次并预估成本。
比较已注册主要指标、最差桶、未完成/超时/保底率、非法提案和规则器拒绝率、成本与延迟。成对统计按 cell/run family 聚合，报告区间；差异不足为 inconclusive，不强选赢家。
同种子不代表分叉后相同随机事件：使用引擎既有 ChanceTicket/独立事件 lineage，不为了“公平”强行给不同动作同一随机结果；原版/候选分别保留真实随机轨迹。
对战质量评估与 DSH 生产质量比较分开，禁止同时换 Skill、模型、Harness 后归因给其中一项。

## 8. 复盘与 Skill 升级：依照 MTL 五阶段闭环

1. **Evidence Compiler**：从真实 journal 重建关键决策机会，当时 observation、合法域、选用 Skill、动作/备选、预期、真实结果、随机和最终计分。长局分块但可回到整局位置。
2. **席位视角 Reviewer**：仅用该席当时能知道的信息判断选择；全知数据只允许隔离的机制审计，不得回流到策略训练输入。明确区分坏选择与好选择遇到坏运气。
3. **Challenger + 工具 Reasoner**：核对距离、威胁、概率、时序、备选和对手回应；允许结论是证据不足，不强写心得。
4. **Counterfactual Lab**：从同一 checkpoint 开隔离分支，比较动作/激活顺序/回合计划及对手合理回应。多个随机分支下评估，短期收益不冒充整局胜率提升，不能修改正式对局历史。
5. **Memento / Topic Skill / SkillOpt**：分别保存情景记忆、跨多局假设、现有 Skill 的最小补丁；带父 hash、finding、影响范围、验证用例、撤回条件，再走事实/回归/留出/League/人工发布。

失败归因至少包括：规则器缺陷、规则知识、合法域使用、几何、信息/工具未提供、回合规划、估值、对手建模、执行绑定、Provider 格式、随机尾部、证据不足。
只有相关问题才改 Skill：规则器 bug 开规则 Ticket，Harness 缺信息改 Harness，网络失败改工程层。不能每输一局就污染长期经验库。
生成候选可按用户已授权计划自动运行；发布全局 Skill 仍需管理员审批。个人候选与全局库隔离。
晋级是 registry pointer CAS；已有房间继续用开局快照，新房间才读新发布版。发现泄漏/规则回归/显著成本退化按预定条件降级，历史包与旧规则仍可展示/精确回放。

## 9. MuZero/训练数据不能被复盘结论污染

Ticket19 复用同一个事件 journal，定义 player-view observation、动作编码、奖励/折扣、终局、随机与依赖版本。
参数动作的候选集合/搜索策略与完整合法域分开；Provider 没返回动作概率就填 unknown，不用解释文本或选择次数伪造 policy target。
复盘反事实与真实对局分开 lineage；修复轨迹不得覆盖原事件。以 run family/近重复局面/镜像种子/军表/对手快照分组切训练与留出集。
NDJSON/MuZero/RLDS round-trip、可见性/未来信息泄漏、版本依赖与独立资格门通过之前，`trainingTruth=false`。
能导出与能训练/已经训练是三件不同的事，本阶段不运行 MuZero learner。

## 10. 实施顺序与验收清单

不新增一个“重新做规则器”的 Ticket，也不把历史 Slice 改写成未做。
**明确承认 Slice170 工作量扩大**：把原本安排在 Ticket18 的最小恢复/纠错/评估前移。
以下 170-A…E 是同一 Slice 的工作点，不是新增五个全局 Slice，不能拿它们提高 7/9 的完成率。

| 位置 | 工作 | 完成条件 | 当前 |
| --- | --- | --- | --- |
| 170-A | 整体审查、失败反例、暂停旧付费入口、修订路线 | 代码证据、9 个可重复检查、明示成本/缺口 | 本轮完成 |
| 170-B | 原文取证、逐句 claim、真实机制/回放验证、完整覆盖清单 | 假规则/错范围/漏例外/虚构 fixture 被拒，真实正例可过；不是只做负例 | 未做 |
| 170-C | 节点 checkpoint、用量先结算、故障分类与有界局部修复 | 中断续跑不重发成功调用；完整坏响应保留 usage；模糊发送不自动重试 | 未做 |
| 170-D | DSH 真实取证/探针/修复循环 + 同预算 control | 实际 tool trace；预算/隔离/修订/正文恢复门；不再单次 relay 冒充 Harness 增益 | 未做 |
| 170-E | 小规模正式目标 pilot | 同一总规则包的分章产物、事实报告、真实演练、独立 arm checkpoint；不要求先全目录 | 未做 |
| 171 | Ticket17 收口 | 相关前置回归 + 安全边界聚合、故障恢复/性能报告；只称生产 Adapter 可用，不称全部 Skill 上线 | 未做 |

Ticket18 内部按以下顺序落地，正式全局 Slice 编号在进入该 Ticket 时登记，不冒报一个尚未逐项估算的总 Slice 数：

1. 持久 Scheduler 的 SQLite/PostgreSQL 同构合同与多 worker 恢复（扩展 170-C，不重写）。
2. 独立事实/语义审查、留出评估与最小 headless arena，包含分歧仲裁。
3. Skill 工件库/可追溯读取、实验隔离就绪级别、发布 CAS/回滚与依赖隔离。
4. 总规则正式验收，再两个种族，最后正反对抗；依赖阶段通过才付费下游，第一组 5 件套可玩为本阶段目标。
5. 在相同预算下形成 DSH/control 生产质量报告，未显著更好也如实记录，不以“必须 DSH 胜”筛掉结果。
6. 余下目录按批次生产的调度/观察面板；可以先继续人机开发，不以 53/53 拦住五件套后的产品推进。

后续 Ticket 不变但补齐职责：

| Ticket | 后续工作 | 依赖/界限 |
| --- | --- | --- |
| 14 | 真机验收 | 用户延期；Web/backend 继续，不假装已完成 App 实测 |
| 19 | 统一轨迹/玩家视角/训练导出 | 可复用稳定 journal；不把完整导出作为小局面评估的前置条件 |
| 20 | 人机自动 AI 席位、参数动作、回合计划；机机 League；五阶段复盘/SkillOpt | 最小 arena 在 Ticket18 前置；五件套后开展产品闭环，正式学习仍走隔离评估/发布 |
| 21 | 生产身份/密钥/容器隔离/持久队列/监控/隐私/成本/事故处理 | 不能把 macOS 沙箱当生产部署；延迟/并发/成本要实测 |
| 22 | Web/App/Rules/Agent/Skill/复盘/训练导出逐项验收与交接 | 以用户可见功能和真实记录验收，不以文件数/测试数量收口 |

执行纪律：每次改动跑相关快速测试；公共合同改变跑消费者测试；Slice 收口跑受影响邻接门，Ticket 收口才跑该 Ticket 必要聚合。固定运行时的完整 manifest 可按内容寻址复用，但每次启动仍核对关键入口与隔离能力。
已完成/发布的版本冻结；未完成实验实现可直接修复并靠 Git 留历史，不再一次 Provider 尝试新增一套 Broker/合同模块。Attempt 记录是数据，不是源代码版本。
根目录 TASKS/MEMORY 与本文件记录事实；对外每次继续汇报 Ticket/Slice、正在做的工作点、完成/剩余量、已验证与未验证边界和费用。

## 11. 恢复付费前的硬条件

- 170-B/C/D 的正反例、真实检索 trace、局部修复、checkpoint/恢复和用量账本完成；账户/Provider 健康再小额校准。
- 原工具返回正文，不仅承诺能读取；Judge 能拦住本次反例，Cross-Time 实际执行。
- 新 recipe 冻结第一组 Skill 范围、开发/留出集、模型/工具、总物理调用/token/人民币上限与停止规则。
- 输出预算与最大样例匹配；结构问题不能整条回炉；双 arm 独立保存；无旧 flags 跳过新门的路径。
- 仅在实现+证据就绪后以受审查代码变更替代本轮 hold；不提供临时 `--force`、环境变量或再次贴 Key 即可绕过的开关。

本轮交付是**新方案 + 缺口复现 + 旧入口止损**，不是以上新系统全部已开发。下一项明确是 170-B，不是 Attempt 11。

## 12. 外部设计依据

- [MTL 平台指导文档（固定 commit）](https://github.com/ruarualoud/project-d-maze-tower-league/blob/50ef5c29c655c015335d76e78fb4a0ecb442252f/docs/project-d-level3-wargame-platform-standard-template-v1.md)：采用第 10–14 节的策略 Skill、实验隔离、五阶段复盘、反事实与 no-auto-truth；本地读取全文相关章节。
- [MTL 后台 Skill 生产文档（同一 commit）](https://github.com/ruarualoud/project-d-maze-tower-league/blob/50ef5c29c655c015335d76e78fb4a0ecb442252f/docs/maze-tower-league-skill-background-service-v1.md)：采用逐句审查/分歧仲裁/定点修订/原子进度；不复制其凭据注入方式，不把它的模型共识当全域真值。
- [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)：官方明确提醒合理输出上限及偶发空内容；因此 JSON mode 不能替代容错。已在线核对，未刷新游戏数据。
- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)：文档给出 finish_reason、工具调用与 strict Beta；严格工具 schema 可作为新 Provider Adapter 的候选优化，但必须针对固定模型/端点实测，不能声称现有 Worker 已支持，更不能视为事实正确性保证。
- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)：官方定位是插件化 Agent Harness，并注明 developer preview / breaking changes。继续固定已审计版本，效果以本项目实验为准。

本方案还按本项目 `project-d-offline-skill-evolution`、`ctx2skill-rule-skill-loop`、`agentic-harness-evolution-loop` 的要求，把实际演练、失败归因、回归和晋级分开；按 `codebase-design` 收敛生产 Module 的 Interface，避免继续堆叠只转发的版本层。
