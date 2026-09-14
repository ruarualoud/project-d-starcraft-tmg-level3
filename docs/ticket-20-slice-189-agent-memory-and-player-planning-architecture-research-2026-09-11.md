# Ticket 20 / Slice 189：对局记忆与玩家式规划架构调研

日期：2026-09-11。状态：采用并实现。范围仅限同一场 StarCraft TMG 对局；跨局
经验升级属于 Slice 194，规则变化后的 Skill 保鲜属于 Slice 195。

## 结论

对战 Agent 不应依靠一条不断增长的聊天记录，也不应只记 Pass、抢先或最近一个
动作。采用三层记忆和一个显式决策循环：

1. `MatchEventLog` 是同局完整、追加式、可查询的事实账本；任何压缩都不能覆盖它。
2. `WorkingMemory` 是每次推理默认携带的短摘要，只保留当前计划、当前目标、承诺、
   已用能力/资源、近期结果、对手反应、反制与未决风险。
3. `MemoryQuery` 让 Agent 按计划、意图、单位、能力、资源、轮次、阶段、事件类型、
   标签或文本主动回忆完整执行记录；分页只限制一次取回量，不删除源记录。
4. `TurnPlanRuntime` 强制执行“总体计划 → 观察 → 计划反思 → 假设/比较动作 → 决策
   → 当前 Rules Preview/Apply → 结果 → 下一次反思”。

这套结构更像玩家的原因不是让模型输出更多文字，而是让每个决定都能回答：我在
延续哪个计划、当前目的是什么、预计对方怎样反制、我怎样再反制、接受了什么代价、
什么变化会让我停下或改计划。

## 主要参考及取舍

- OpenAI Responses API 可以用 `previous_response_id` 延续会话，但完整历史仍会占用
  输入预算；其压缩结果明确是不可供人解释的 opaque item。因此 Provider 会话延续
  只能是推理运输层，不能替代可审计的对局事实库。
  [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)、
  [Compaction](https://developers.openai.com/api/docs/guides/compaction)
- OpenAI 的长上下文建议把已完成动作、当前假设、工具结果、未决阻塞和下一目标带入
  后续窗口。这里把这些内容做成显式 `WorkingMemory` 字段，而不依赖模型自行回忆。
  [Using the latest model](https://developers.openai.com/api/docs/guides/latest-model)
- LangGraph 将当前线程状态放在 checkpoint 中，把跨线程记忆放在独立 store，并指出
  长历史会分散注意力、增加延迟与成本。这里采用同局 checkpoint 范围，但不在本片
  自动生成跨局长期记忆。
  [LangGraph memory overview](https://docs.langchain.com/oss/python/concepts/memory)
- MemGPT/Letta 把始终在上下文中的 Core Memory 与按需检索的 Archival Memory 分开。
  这里对应 `WorkingMemory` 和 `MatchEventLog + MemoryQuery`；不同之处是对局事实只能由
  Room/Rules/Apply 回执写入，模型不能自由改写。
  [Letta memory architecture](https://www.letta.com/blog/introducing-the-agent-development-environment/)
- Generative Agents 使用完整经历流、动态检索、反思和计划；消融实验显示观察、计划和
  反思都影响行为可信度。这里采用该循环，但把自然语言经历约束成游戏事件合同。
  [Generative Agents](https://arxiv.org/abs/2304.03442)
- ReAct 说明交错的观察、行动和计划更新比把规划与操作割裂更有效；Reflexion 则把
  外部反馈压成可复用的情景反思。在线同局使用前者；后者只在 Slice 194 经回放/评估
  后产生隔离候选，不能把模型自评直接提升为 Skill。
  [ReAct](https://arxiv.org/abs/2210.03629)、
  [Reflexion](https://arxiv.org/abs/2303.11366)
- 成熟长任务 harness 也倾向于把 recoverable append-only session 与可替换的上下文
  管理解耦，并通过进度工件恢复当前目标。这里同样让日志可恢复、工作摘要可重建。
  [Managed agents](https://www.anthropic.com/engineering/managed-agents)、
  [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

公开资料没有披露 Codex 内部的完整记忆实现。因此本设计只采用 OpenAI 明确公开的
会话延续/压缩原则，不声称复制 Codex 私有架构。

## 三层记忆合同

### 1. MatchEventLog：不可丢的同局源记录

事件至少覆盖：

- `turn_plan`、`plan_reflection`、`plan_revision`；
- `action_intent`、`decision_purpose`、`decision_outcome`；
- `ability_used`、`resource_spent`、`unit_intent_result`；
- `opponent_response_observed`、`counter_response_used`；
- `initiative_observation`。

每条记录绑定 match/room/seat、顺序号和当时的 state revision/hash、round、phase。
移动“为了卡住路口”属于 `action_intent.purpose`；实际是否到位属于 Apply 后的
`unit_intent_result`，两者不得混写。能力与资源的“计划使用”和“实际使用”也分别
记录，避免 Agent 把想过的动作误记成已经发生。

### 2. WorkingMemory：默认注入的实时战术摘要

默认只投影：

- 当前总体计划、当前子目标、最新计划健康度与下一关注点；
- 最近单位承诺、动作目的和结果；
- 已实际使用的能力/资源；剩余量必须来自当前 Rules Projection 或查询；
- 预计的对手反制、已经观察到的反应、预设的再反制；
- 未决风险以及 Pass/First Player Marker/阶段首行动选择。

摘要是源日志的可重建投影，不是新事实。每类只取近期高信号记录以控制注意力预算，
但完整日志不因长度被拒绝或删除。

### 3. MemoryQuery：按需回忆

Agent 可以按 `kind/round/phase/planId/intentId/unitId/abilityId/resourceId/tag/text`
查询。例如：“Marine-2 之前为什么先移动？”会返回该单位的 `action_intent` 及结果；
“Stimpack 用过几次？”会查询 `ability_used`，而不是依赖工作摘要中是否还保留它。

## 玩家式决策合同

### 总体计划 TurnPlan

`objective`、`currentGoal`、`strategicApproach`、`successSignals`、
`activationPriorities`、`resourcePolicy`、`initiativePolicy`、`reservePolicy`、
`assumptions`、`opponentModel`、`contingencies`、`reviseIf`。

### 每个决策前 PlanAssessment

每个新的权威状态/行动边界都要求一次结构化反思：

- `verdict`: continue / revise / complete / abandon；
- `health`: sound / at_risk / invalid / achieved；
- 计划延续摘要、支持/反对证据、变化的假设；
- 对手模型更新、未决风险、当前目标与下一决策关注点。

这里只保存可审计的结论和证据引用，不请求或持久化隐藏思维链。

### ActionIntent / Decision

正式意图必须包含：计划引用、当前目标、动作、目的、计划延续关系、预期己方结果、
至少一种预设对方响应及对应反制、利弊权衡、风险、备选、停止/重规划条件、涉及单位、
计划使用的能力/资源和空间/概率查询回执。它仍无确认或 Apply 权限。

## 反事实与实时性

反事实搜索从当前 state/LegalSpace/plan checkpoint 派生，只写 hypothetical branch；
结果不能进入真实对局日志或 MuZero truth。对手动作完成后可以异步预热搜索。Agent
轮到行动时若结果未就绪，使用当前 `WorkingMemory + LegalSpace` 立即决策，不等待；
就绪结果也必须重新绑定当前状态并走 Preview/confirm/Apply。

## 与后续 Slice 的边界

- Slice 189：内存 Adapter、查询接口、结构化计划/反思/意图/反事实合同。
- Slice 190–191：用空间案例证明计划会利用卡位、威胁边界、集火与火力圈互换。
- Slice 192：Bot Seat 在真实 Apply/Replay 后写能力、资源、单位意图结果和对手反应。
- Slice 193：Web 完整人机局让玩家查看计划摘要与执行记录。
- Slice 194：多局聚合、指定动作暂停搜索和候选 SkillOpt；只经 held-out gate 提升。
- Slice 195：规则/数据变更沿依赖图选择性使旧反思和 Skill 失效或再验证。

