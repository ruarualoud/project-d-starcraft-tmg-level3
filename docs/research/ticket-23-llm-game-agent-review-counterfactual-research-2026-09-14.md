# Ticket 23：大模型游戏 Agent、跨局复盘与反事实实验调研

日期：2026-09-14  
状态：完成调研；作为 Slice 215 的架构输入  
范围：StarCraft TMG 人机、机机、跨局复盘、反事实实验、SkillOpt 与 MuZero 数据候选

## 结论

现有系统已经具备可查询的同局事件、工作记忆、显式 TurnPlan、异步假设动作入口、
多 Episode 导入和隔离 SkillOpt 候选，但还不能据此宣称“成熟的多局复盘和实验系统”。
缺少的不是再写一段更长的复盘 Prompt，而是下面五个可执行层：

1. 不可变的真实轨迹账本与可恢复的实验 WAL；
2. 从全动作扫描中产生、去重和排序的假设，而非固定抽三个局面；
3. 从同一权威 checkpoint 克隆的 exact-Rules 配对分支、共同随机数和混杂检查；
4. 与 Gameplay Agent 隔离的 selection/hidden 评测与确定性晋升门；
5. 只修改策略 Skill、保留证据/适用范围/反例/可靠度的版本化候选。

TMG 已有精确 Rules Runtime，因此第一版不应让 LLM 或学习型 world model 预测规则
结果。LLM 负责提出计划、候选动作、对手响应和可解释假设；Rules 负责合法性、转移、
随机结果、计分和终局；确定性 Evaluator 负责计算差异和能否晋升。学习型 world model
只适合作为未来的大范围搜索加速器，不能成为裁判。

## 参考系统与可迁移做法

### VibeGamer / Turmoil

[VibeGamer](https://github.com/karminski/VibeGamer) 将游戏接成结构化
`get_state -> decision -> submit_actions` 循环，而不是仅依赖截图和鼠标。其
[Memory manual](https://github.com/karminski/VibeGamer/blob/main/agents/turmoil/memory-manual.md)
最值得采用的不是固定候选数量，而是：

- Hypothesis、Tip、Playbook、实验账本和研究议程分离；
- 同 seed A/B 先做因果复验，跨 seed/hidden 再看泛化；
- `candidate / validating / inconclusive / validated / rejected` 状态机；
- 开始验证前先写 WAL，异常恢复悬空实验，只有提交完成才消耗预算；
- Retry Reviewer 可以重试、换 seed、修订或归档；
- hidden 结果由 Host 持有，不注回 Gameplay Agent；
- 离线 SkillOpt 通过选择门后才形成在线 Playbook。

不照抄其 `0–3` 个假设、固定两次重试或“同 seed 通过即可进 playbook”。TMG 是
双人、部分信息、含骰子的桌面战棋，晋升至少需要真实重放、配对反事实、跨局复现和
未注入 Agent 的 held-out 证据；次数由证据充分度、价值信息和预算决定。

### ExpeL、Reflexion 与 Agent-Pro

[ExpeL](https://arxiv.org/abs/2308.10144) 从一组经历而非单条轨迹抽取可复用经验，
说明跨局聚合应先识别重复模式，再检索相关经历指导新局。
[Reflexion](https://arxiv.org/abs/2303.11366) 证明语言反思可作为情景记忆，但模型
自评可能把偶然结果或错误规则固化；TMG 因而只把反思当候选证据。
[Agent-Pro](https://aclanthology.org/2024.acl-long.292/) 从动作级反思提升到政策级信念
修订并用搜索优化策略，支持我们把“这一手错了”提升为“什么适用条件下的决策政策
应改变”，同时要求反例和停止条件。

### PokéChamp、LATS 与竞争对手建模

[PokéChamp](https://arxiv.org/abs/2503.04094) 在双人竞争游戏中让 LLM 分别参与动作
采样、对手建模和值估计，再由 minimax 搜索组合；这比让一个 Prompt 直接猜完整未来
更适合 TMG。我们的实现应让 Agent 提出少量有理由的己方候选和对方最强响应，Host
用当前 LegalSpace 与 Rules 展开，Evaluator 比较最坏/期望结果。
[LATS](https://arxiv.org/abs/2310.04406) 将 LLM、环境反馈、价值评估和树搜索结合，
适合高价值暂停点的异步搜索，不适合每个原子动作都同步深搜。实时 Agent 可以立即
行动，未按时完成的搜索转为复盘或下一次仍匹配同一 checkpoint 时使用。

### StarCraft 长时记忆与 world-model 规划

[TextStarCraft II / Chain of Summarization](https://arxiv.org/abs/2312.11865) 使用单帧
与多帧结构化摘要支撑长局规划，印证“完整日志 + 当前摘要”而非无限聊天历史。
[StarWM](https://arxiv.org/abs/2602.14857) 把观察拆成信息、队列、己方单位、己方建筑、
可见敌人，并执行 Generate–Simulate–Refine。TMG 可采用其语义分层和决策循环，但
用精确 Rules 克隆替代学习型未来预测；未知私有状态用 belief/hypothesis 表示，不能
偷偷读取对手视角。

### Skill 库共同演化

[Voyager](https://arxiv.org/abs/2305.16291) 通过环境反馈、执行错误和自验证形成可组合
Skill，说明 Skill 应是有前置条件、执行过程和验证规则的能力，而非纯总结。
[COSPLAY](https://arxiv.org/abs/2604.20987) 将决策 Agent 与从 rollout 提炼 Skill 的
Skill-bank Agent 分开共同演化。TMG 应保留相同职责分离：在线 Gameplay Agent 只读
已接受 Skill；离线 Review/SkillOpt 从多局证据提出版本化候选；独立 Evaluator 决定
是否可晋升。Gameplay Agent 不能评价并发布自己的更新。

### MuZero 与训练数据边界

[MuZero](https://arxiv.org/abs/1911.08265) 为搜索学习 policy、value 和 reward dynamics；
Reanalyse 会对历史经验重新生成搜索目标。TMG 导出应分别保留权威真实
`observation/action/reward/legal-mask/chance`、当时搜索策略/价值，以及后续重分析
目标。未执行反事实分支只能进入 counterfactual 数据集，绝不能冒充真实 transition。

### 评测与复现

[lmgame-Bench / GamingAgent](https://github.com/lmgame-org/GamingAgent) 强调标准环境
Adapter、动作处理、多实例评测和 Episode 回放。TMG 的 H-A/A-A 验收也必须固定
Rules、数据、模型、Skill、地图、任务、军表、随机种子与预算，并输出每动作可回放
证据，而不是只保留终局分数。

## 现有 TMG 能力真值

| 能力 | 当前状态 | 证据/缺口 |
| --- | --- | --- |
| 同局完整事件与工作记忆 | 已实现 | MatchDecisionContinuity + TurnPlan；保留计划、意图、能力/资源与结果 |
| 每个 Agent 决策前计划反思 | 已实现但仅有界验证 | 新状态要求 PlanAssessment；未在真实 2000 分 live-model 全局证明 |
| 异步当前局面假设动作 | 已实现骨架 | 绑定 state/LegalSpace，不能改真局；没有权威 checkpoint 克隆与配对 RNG 实验账本 |
| 任意数量 Episode 导入 | 已实现 | `addEpisodes` 无固定上限；Reflection 至少两场 |
| 多局复盘质量 | 不足 | 当前把所选 Episode 一次交给 SkillOpt；没有全动作扫描、重复模式、混杂与显著性合同 |
| SkillOpt 隔离候选 | 已实现但有界 | 不自动晋升；已有合成/有界回归，未有真实 H-A/A-A 多局证据 |
| 实验恢复 | 局部存在 | Provider/Release Store 有恢复语义；Review/Counterfactual 没有独立 WAL/重试状态机 |
| hidden/selection 评测 | 缺失 | 没有 Host-only 局面池和不注入 Agent 的评测结果 |
| 机器席位自动执行 | 已实现数字流程 | 一次对局授权后 Host 自动 Preview/Confirm/Lease/Apply/Replay |
| 玩家物理操作任务 | 缺失 | 未区分数字自动更新、玩家实际移模/放 Token/掷骰确认及委托 Agent |
| 真实大模型完整局 | 未证明 | Ticket 20 为 deterministic bounded fixture，Provider calls = 0 |
| 官方任务数据 | 10/10 已导入 | 5 Standard + 5 Skirmish 的字段与 draft identity 存在 |
| 官方任务可执行性 | 1/10 | 只有 Standard Hold Position 有 exact scoring/endgame；其余 9 张不可执行 |
| 任意合法 2000 分军表 | 未证明 | 现有完整局只覆盖 Marine/Zergling Hold/Pass 有界闭包 |

任务卡的 10 张记录为：Divide and Conquer、Frontlines、Gather the Resources、Hold
Position、Supply Drop，以及各自的 Skirmish 版本。当前
`official-gameplay-data-bundle-v1.mjs` 明确拒绝除
`faction_cards:mission_hold_position` 外的任务；导入数量不能冒充执行覆盖。

## 采用的 Review V2 架构

```text
真实 Room receipts / replay
  -> immutable Episode ledger
  -> full-action scanner
  -> hypothesis dedupe + confounder tags + value-of-information priority
  -> experiment WAL
  -> exact checkpoint clone
  -> paired branches (same chance tape first, alternate seeds when needed)
  -> deterministic metrics + LLM explanation
  -> cross-game recurrence and held-out/hidden evaluation
  -> versioned SkillOpt candidate
  -> independent approval / rollbackable registry revision
```

### 五层记忆

1. `EpisodeLedger`：真实动作、状态、骰子、回执和可见性，不可覆盖；
2. `RoundSummary`：每轮计划、资源、得分、单位损失和关键位置的确定性摘要；
3. `WorkingPlan`：Gameplay Agent 当前计划、目的、预计反制与改计划条件；
4. `ExperimentLedger`：假设、checkpoint、分支、seed、混杂、结论和下一动作；
5. `AcceptedPlaybook`：只含通过评测的策略 Skill，带适用范围、证据和反例。

聊天上下文不是任何一层的权威存储。摘要可以重建；原始 Episode 与实验 WAL 不因
上下文长度而丢失。

### 全动作扫描而非固定三个局面

扫描每个真实动作，确定性计算或标注：计划失效、合法备选差距、得分/棋值摆动、
威胁或空间误判、重复撤销/犹豫、资源浪费、Pass/先手节奏、对手意外响应、规则争议、
高方差骰子和相同错误复现。LLM 可补充策略假设，但不能伪造未发生事实。

只有预计信息价值高于成本的 checkpoint 才进入反事实队列；数量不设固定常数。
优先级由影响量、重复度、不确定度、可验证性和预计调用成本共同决定。预算不足时
保留 backlog，不把“没实验”写成“无价值”。

### 配对反事实

- 从动作前权威 checkpoint 克隆 Room，不修改真实房间；
- 实际动作与候选动作先使用相同 chance tape/seed，降低骰运混杂；
- 必要时用独立 alternate seeds 检验结论是否只对一组骰子成立；
- 对手响应由当前合法动作、冻结的对手 Skill 快照和最坏/期望响应搜索产生；
- 分支若缺 Rules 支持、信息泄露、状态不一致或指标不足，结论为 `inconclusive`，
  不靠 LLM 文案补齐；
- 真实与假设轨迹严格分库；只有真实 Apply/Replay 可进入 MuZero transition truth。

### 场景条件化的双策略实验

TMG 的对手也会复盘、升级 Skill，因此不存在脱离对手策略的永久动作排名。每条实验
假设必须采用下面的条件形式：

```text
在场景 C、己方策略快照 P_i、对手策略快照 Q_j 下，
动作/局部政策 A 相对基线 B，在指标 M 上取得收益 D，
适用到条件 R 为止；若对手采用反制 K，则切换到应对 A2。
```

`ScenarioContext C` 至少绑定：Rules/FAQ/data/action-space 版本、任务与部署、地图/轮次/
阶段/先手/比分/资源、双方 faction/roster/upgrade/tactical-card 快照、存活/受伤/状态、
玩家可见信息与 belief、位置关系图、LOS/掩体/通道/控制点、动作特定威胁与火力重叠。
位置策略优先使用可迁移关系特征，例如“底座边距、卡口宽度、威胁圈重叠、支援链、
到目标的回合数”，而不是记死某个棋子的绝对坐标；确实只适用于固定地图的策略必须
明确标为 map-specific。

因果对照一次只允许改变一侧策略：

1. 冻结 `Q_j`、模型、Prompt、Rules、场景和 chance tape，比 `P_i` 与己方候选
   `P_i+delta`；
2. 冻结己方候选，再对 `Q_old / Q_current / Q_counter` 做对手稳健性矩阵；
3. 反向重复同样过程，允许对手侧形成独立的 `Q_j+delta` 候选；
4. 如果两边同时变化，只能作为新对局观察，不能用于归因某一侧 Skill 改进。

这会产生四类不同结论，而不是一个虚假的“更强”：

- `scenario_validated`：只在明确场景与对手策略快照下成立；
- `robust_across_opponents`：在若干独立对手快照/反制下仍成立；
- `exploit_only`：显著利用某个对手版本，但被已知反制击破；
- `countered` / `inconclusive`：已被反制，或证据不足/混杂无法判断。

跨局复盘维护 `scenario cluster × own-policy version × opponent-policy version` payoff
矩阵，识别稳定策略、针对性 exploit、反制和循环克制。它不强行压成全局胜率或线性
Skill 等级。运行时先按适用谓词检索场景 Skill；没有充分匹配时回退到通用/本族/对抗
Skill，不能把窄场景结论套到所有局面。

### Skill 变化合同

Review 只允许修改策略 Skill，不修改规则 Skill。候选至少包含：

- 适用的 faction/matchup/mission/map/roster/phase/position 条件；
- 实验时冻结的己方/对手 Skill、模型和 Prompt 快照，以及已验证的对手版本范围；
- 可执行建议、优先级、停止/改计划条件和对手反制；
- 正例、反例、实际 Episode 与 counterfactual receipt 引用；
- 证据数量、跨 seed/跨局情况、不确定性和已知混杂；
- 父版本、最小差异、回滚目标和受影响评测集。

单局胜负、模型自信、隐藏思维或一条漂亮解释都不能单独晋升 Skill。

## H-A 物理操作合同

数字 Room 中，机器席位的合法动作由 Host 自动执行，不逐动作向玩家请求许可。模型
只选择当前合法动作；Host 独占 Preview/Confirm/Lease/Apply/Replay 权限，并将动作、
结果、骰子和需要告知的状态变化通知玩家。

只有动作要求改变玩家实际管理的模型或组件时，才创建 `PhysicalOperationTask`，例如
移除受攻击模型、移动/转向玩家模型、放置或移除 Token/标记、调整血量/状态组件。
任务包含权威动作回执、对象、操作、预期完成状态和照片/确认可选证据。玩家可：

- 自己执行并确认同步；
- 委托 Agent 代执行并由 Agent/设备回报完成；
- 提出规则争议，暂停数字/物理同步并交裁判处理。

玩家不能以普通“不同意”否决对手机器的合法动作。尚未完成的物理任务不回滚已接受
数字规则事实，但房间进入 `physical_sync_pending`，阻止依赖该物理状态的后续操作，
直到确认、委托完成或争议裁决。

## 决策调用与思考记录

每个 Agent 拥有的选择点都调用决策模型：选单位、Move/Charge/Attack/Pass、目标、
路径/终点、武器、能力、资源、重掷/分配与反应。Host 的事务步骤、Rules 确定结果、
随机数产生和物理同步确认不调用决策模型。

证据记录公开的结构化决策摘要：可见事实、当前计划/目的、备选、计算、选择、预计
对方反制、己方再反制、风险与改计划条件。不索取、不展示、不存储 Provider 的私有
隐藏思维链。该摘要足以审计策略，也避免把不可验证的内部推理当训练真值。

## 对 Ticket 23 的直接约束

- 在正式 2000 分 H-A/A-A 之前，先完成 10/10 任务卡 exact 执行覆盖和任意合法军表
  的真实动作路径检查；不能再用 Marine/Zergling/Standard Hold Position 代替范围。
- live model 固定为正式开局时选定的稳定 Flash profile；开局后不得静默换模型。
- Gameplay Agent 仅看其玩家可见投影、accepted Skill 和查询回执；hidden 评测、对手
  私有计划与裁判状态不得注入。
- 实时深搜异步运行，不成为最慢链路；结果过期即作废，来不及则转入复盘。
- H-A、A-A、Review/Counterfactual 分别使用 ¥80、¥160、¥260 硬预算；累计每 ¥100
  通知；只在已提交 Provider 回执后记账。
- 只有 Critical/High finding 阻断；Medium 进入债务表。相同 review 最多三轮。

## 证据强度边界

上述公开项目提供可借鉴机制，不直接证明其参数适合 TMG。特别是单 seed、固定重试数、
自评反思和 learned world model 均不能替代 TMG 的官方 Rules/FAQ、当前 LegalSpace、
Apply/Replay 和独立评测。Ticket 23 的最终判断必须来自本项目的完整 Web 操作记录、
真实 Provider 回执、权威重放和可复现报告。
