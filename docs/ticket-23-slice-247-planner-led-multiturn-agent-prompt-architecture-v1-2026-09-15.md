# Ticket 23 / Slice 247 — Planner-led 多轮对战 Agent 与 Prompt 架构设计 v1

- 日期：2026-09-15
- 状态：设计基线，待按本文改造并完成 Standard 2000 人机局验收
- 范围：在线对战 Agent、同局记忆、空间查询、异步预演、副官解释、赛后复盘与 Skill 演进的共同 Agent 基线
- 不在本次变更中：刷新冻结官方数据、改变规则器结论、公开模型隐藏思维链

## 1. 结论

本项目需要的不是“一个包含很多字段的大 Prompt”，而是一个由 Host 控制器保证执行顺序的多轮 Agent：

```text
权威观察
  -> 计划建立/反思
  -> 信息缺口判定
  -> 规则/空间/概率/记忆工具调用（可多轮）
  -> 候选比较与必要的异步预演
  -> 选择一个意图
  -> 精确动作参数绑定
  -> Rules Preview
  -> Apply
  -> 结果观察与记忆更新
  -> 等待下一决策点
```

Prompt 只定义每一轮的认知任务和输出合同；循环、阶段、断点、工具执行、合法性、状态新鲜度与恢复必须由代码控制。只改 Prompt 不能把一次请求变成 Agent。

目标实现采用“单一策略主体 + 多阶段 Prompt”，而不是多个互不共享状态的自由对话 Agent。Planner 持有计划，Action Binder 只能落实 Planner 已选动作，Rules Service 持有真值，Adjutant 只解释公开事实。这样既保留玩家风格，又避免角色扮演、动作生成和裁判职责互相污染。

## 2. 调研依据与本项目采用方式

| 一手来源 | 已验证机制 | 本项目采用方式 |
| --- | --- | --- |
| [ReAct](https://arxiv.org/abs/2210.03629) | 推理与外部动作交替，工具观察用于更新计划和处理例外 | Planner 必须能够查询后再继续，而不是一次性同时输出计划与动作 |
| [Plan-and-Solve](https://arxiv.org/abs/2305.04091) | 先分解计划再执行，减少漏步 | 开局/回合/相位边界建立计划；动作轮只处理当前目标 |
| [LLM+P](https://arxiv.org/abs/2304.11477) | LLM 不可靠地解决长程精确规划，确定性规划器负责可行/最优计划 | Rules Service 和几何内核负责合法动作、后继状态与精确量距，LLM 不自造规则 |
| [Tree of Thoughts](https://proceedings.neurips.cc/paper/2023/hash/271db9922b8d1f4dd7aaef84ed5ac703-Abstract.html) / [RAP](https://arxiv.org/abs/2305.14992) | 对多个分支进行搜索、评分与回溯，比单一路径左到右生成更适合规划 | 高价值位置才启动 2–4 分支预演；规则器做状态转移，模型做策略先验和结果解释 |
| [Reflexion](https://papers.neurips.cc/paper_files/paper/2023/hash/1b44b878bb782e6954cd888628510e90-Abstract-Conference.html) | 将外部反馈转成语言反思并放入 episodic memory | 每个意图保存预期与结果；相位/回合边界生成短反思，不即时改写长期 Skill |
| [Generative Agents](https://research.google/pubs/generative-agents-interactive-simulacra-of-human-behavior/) | observation、planning、reflection 和动态记忆检索都对可信行为有贡献 | 同局记忆分为事实日志、工作计划、检索摘要和反思，不能只保留聊天历史 |
| [MemGPT](https://arxiv.org/abs/2310.08560) | 分层记忆和上下文换入/换出 | 热计划始终注入；动作日志按需查询；长期经验只通过已验证 Skill 进入在线局 |
| [Voyager](https://voyager.minedojo.org/) | 自动课程、可复用 Skill 库、执行反馈驱动的迭代 Prompt | Skill 是条件化策略，不是在线规则真值；赛后实验通过后再晋升 |
| [Cradle](https://baai-agents.github.io/Cradle/) | 信息采集、反思、任务推断、Skill、动作规划、记忆分模块；同时报告视觉精确定位困难 | 结构化棋盘/底座/几何为主观察，VLM 截图用于全局态势和 UI/状态异常核对 |
| [SIMA 2](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/) / [OpenAI CUA](https://openai.com/index/computer-using-agent/) | 游戏/GUI Agent 以 perception-reasoning-action 迭代工作，多模态有助于语义理解 | 后续接入棋盘截图，但不能用像素判断最终合法性或替代规则器坐标 |
| [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) | workflow 与自主 Agent 有区别；明确评价标准时 evaluator-optimizer 有效 | 固定控制流处理确定性环节；只有策略选择与复盘进入模型循环 |
| [Anthropic: Writing Effective Tools](https://www.anthropic.com/engineering/writing-tools-for-agents) | 工具应少而清晰、命名明确、返回高信号上下文、用真实 eval 改进 | 不向模型暴露数百个原子；按玩家工作流提供少量聚合工具，内部仍调用原子规则器 |
| [OpenAI Agents SDK Runner](https://openai.github.io/openai-agents-python/ref/run/) | Runner 在 final output、handoff 或工具调用之间循环，并有 max turns | 本项目 Host 实现等价可恢复状态机；Provider 只是模型 Adapter，不持有比赛权威 |
| [OpenAI Sessions](https://openai.github.io/openai-agents-python/sessions/) / [LangGraph Persistence](https://langchain-ai.github.io/langgraph/concepts/persistence/) | 会话历史、checkpoint、thread store 分开解决连续性和恢复 | 每个决策阶段持久化 checkpoint；同局事件日志与热计划分别存储 |
| [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) | 严格 Schema 能解决形状，不会解决字段值的语义错误 | Schema 错误局部修复；候选、相位和参数仍由 Rules Preview 做语义校验 |
| [DeepSeek Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/) / [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/) | 支持多轮工具调用；thinking 模式后续请求必须携带完整 `reasoning_content` | 原生模式必须保存本决策的 Provider continuation；不能每轮重建无历史请求 |
| [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/) | JSON mode 只保证 JSON，仍可能空返回，需提示示例和足够输出预算 | 作为非原生工具模式的退化通道，不把“可解析 JSON”当成策略正确 |
| [DeepSeek Context Caching](https://api-docs.deepseek.com/guides/kv_cache/) | 相同前缀自动缓存 | Prompt 顺序固定为系统合同→冻结 Skill→动态状态→错误反馈，避免早期动态字段破坏命中 |
| [VibeGamer](https://github.com/karminski/VibeGamer/blob/main/agents/turmoil/README.md) | `get_state -> model -> submit_actions`；同 seed 假设验证、Tip A/B/C、Playbook 晋升 | 复盘结论必须绑定场景；同状态/同 seed 对照验证后才进入 Skill，不凭一次自评晋升 |

## 3. 当前实现为什么退化

### 3.1 设计层本来具备的部件

仓库已有这些正确的深模块：

- `turn-plan-runtime-v1.mjs`：Plan、PlanAssessment、ActionIntent、Outcome、异步 counterfactual 和 history recall。
- `match-decision-continuity-v1.mjs`：同局意图、行动、能力、资源、对手响应与结果记录。
- `spatial-action-query-runtime-v1.mjs`：量距、完整底座、编队、路径、LoS、威胁、概率、火力圈和计分查询入口。
- `spatial-preexecution-search-v1.mjs`：不修改真实 Room 的预执行边界。
- Rules-owned LegalSpace/Preview/Apply/Replay：合法性和状态转移真值。

所以原始架构目标确实是 Planner 主导的 Agent，而不是一次性大 Prompt。

### 3.2 现场暴露的退化点

当前在线链路实际存在四个断点：

1. `provider-egress-transport-v1.mjs` 将 `arbitraryToolCallsAllowed` 固定为 `false`，只要求返回一个 JSON 对象。
2. DeepSeek 请求关闭 `thinking`，并设置低 reasoning effort。
3. 每次 Provider 调用重新构造 system/user 两条消息，没有把上轮 assistant tool call、tool result 和 Provider continuation 接回同一个决策回合。
4. 旧 Prompt 在一次输出中同时索要 plan、assessment、intent 和 action；`query_requests` 只是可选字段。模型可以完全不查询并直接猜动作。

这解释了 2000 分现场局的行为：模型看到了 `8` Supply 和可部署 Reserve，却把 Deploy 幻觉为 Assault/Combat 动作；随后又用字符串 `assessment`/`intent` 绕过了结构化语义。正常化器的默认值把错误掩盖成 `continue/sound`，使错误计划跨相位传播。

当前工作树中的第一轮修复已经把 Planner 和 Action 拆为两次调用，并加入相位生命周期校验，但它仍是“阶段化请求”，还没有成为保持工具轨迹、可断点恢复的完整 Agent loop。本文是下一轮实现基线。

## 4. 真值与职责边界

优先级从高到低：

1. **Rules truth**：Room state、LegalSpace、规则原子、精确几何、Preview/Apply/Replay。
2. **Observed facts**：玩家权限内的棋盘、单位、资源、Reserve、计分和事件日志。
3. **Exact query receipts**：绑定当前 state revision 的量距、路径、编队、概率、火力圈、后继状态。
4. **Plan and memory**：同局计划、意图、预期、对手模型；是策略状态，不得覆盖规则。
5. **Skill**：已验证的策略建议；必须满足适用条件，不能覆盖规则。
6. **LLM hypothesis / VLM reading**：候选、对手反制和视觉整体态势；不具合法性权威。

关键原则：

- Rules Service 决定“能不能做”和“做完发生什么”；模型决定“为什么现在做”。
- LLM 不生成骰子数、攻击结果、Supply、相位后继或底座合法性。
- VLM 可说“右路拥挤、火力集中”，最终坐标、遮挡和威胁仍须结构化查询确认。
- 人机局中只有涉及玩家实体的物理操作才生成 PhysicalOperationTask；Agent 自己的权威数字动作经 Preview 后自动 Apply，不要求玩家逐动作批准。

## 5. 目标控制器状态机

```text
WAIT_FOR_AUTHORITY
  -> OBSERVE                 编译当前玩家视角、相位、动作索引、事件增量
  -> ASSESS_PLAN             新建/继续/修订/完成计划
  -> GATHER_EVIDENCE         原生工具调用，可重复
  -> SEARCH_OR_SELECT        高价值分支可等待已有异步结果；否则直接选择
  -> BIND_ACTION             只展开已选动作的完整参数域
  -> RULES_PREVIEW
       accepted -> APPLY
       rejected -> BIND_ACTION（同候选可修）或 ASSESS_PLAN（候选失效）
  -> OBSERVE_OUTCOME
  -> UPDATE_MEMORY
  -> WAIT_FOR_AUTHORITY
```

### 5.1 必须由 Host 保证的转换

- 没有当前 Authority snapshot 不调用模型。
- Planner 没有完成 `ASSESS_PLAN`，Action Binder 不可运行。
- Required Evidence 未满足，Planner 不可提交 `select_action`。
- Action Binder 不可改变 Planner 的 `candidateId`；不可绑定时返回 `replan_required`。
- 任意参数化动作必须 Preview；有限动作至少校验当前 LegalSpace membership。
- Apply 后必须取得新 state revision；结果记录完成后才关闭该 intent。
- 相同 `choiceKey + stage + attempt` 可幂等恢复；重启不从开局重做。
- 无新代码或新状态时不重复模型请求/查询。

### 5.2 什么是模型决策点

每个**有策略选择的合法分叉**都是模型决策点，但规则自动结算不是：

- 需要模型：选择先手、Pass 与否、激活哪个 Unit、Deploy 哪个 Unit、移动/阵型、目标/武器/能力、资源支付、Reaction、分配伤害或规则明确交给玩家的选择。
- 不需要模型：唯一合法且无策略含义的状态推进、规则器确定的骰子数量、掷骰、自动效果、状态清理、Replay 写入。
- 可批量：一组动作能被同一个 Preview 原子验证，中间没有 chance、Reaction、对手选择或新观察时，可作为一个 ActionIntent 批处理。
- 必须拆开：动作后可能改变 LegalSpace、触发 Reaction/骰子/伤亡/计分或暴露新信息时，Apply 后重新观察再决策。

因此不是“每移动一个模型都重新问一次 LLM”，而是 LLM 一次决定完整 Unit 最终阵型，规则器逐模型验证底座与编队；结果不合法才带精确错误返回 Binder 修正。

## 6. Provider 双通道

### 6.1 首选：Native Tool Loop

Provider 请求使用真实 `tools`/`tool_calls`：

1. 发送稳定 system prompt、当前 Agent state 和按阶段动态加载的工具。
2. 模型发出工具调用。
3. Host 执行，追加 tool result。
4. 使用同一 Provider continuation 再调用模型。
5. 模型调用 `action.commit_intent` 或 `planner.select_action` 才结束该阶段。

DeepSeek thinking 模式若启用，必须按官方合同完整回传该决策回合的 `reasoning_content`。它只在 Provider continuation 内短期持有，不进入比赛报告、训练数据或长期记忆。产品只保存公开计划、证据、备选和取舍。

### 6.2 退化：Typed JSON Loop

供应商暂不支持稳定 tool call 时，输出只允许一个判别联合：

```json
{
  "next_step": "query | search | select_action | replan | wait",
  "query": null,
  "search": null,
  "selection": null,
  "public_reason": "..."
}
```

Host 根据 `next_step` 执行，再把上一轮 assistant envelope 与 tool receipt 追加回本决策 transcript。不能像当前实现一样把查询做成可忽略的并列 `channels.query_requests`，也不能每轮只重新发送“现在已有 receipts”。

### 6.3 能力降级而不是比赛失败

- Native tool call 不可用：切 Typed JSON loop。
- Thinking continuation 不可用：切显式 public Plan/Assessment，不伪造隐藏思考。
- Schema strict 不可用：本地 Schema validator + 局部字段修复。
- VLM 不可用：结构化观察继续完整工作。
- Counterfactual 超时：丢弃过期结果并用当前证据直接行动。
- Provider 连续三次不能给出可 Preview 动作：记录 High issue，使用确定性安全策略选当前合法动作并通知，不把非法动作 Apply，也不让整局永久卡死。

## 7. 工具设计

工具面按玩家工作流分组，模型每阶段只看到相关子集。内部仍可组合 252 个已接线定义和规则原子。

| 工具 | 返回 | 典型触发 |
| --- | --- | --- |
| `rules.current_turn_context` | 当前相位、相位生命周期、Reserve/Supply、可用动作类型、Pass 机会成本 | 每个新相位或相位控制决策 |
| `rules.preview_action` | 精确 accepted/rejected、消耗、触发窗口、后继 phase/action types | 所有参数化动作；Pass/选择先手；复杂能力 |
| `space.evaluate_formation` | 每个模型完整底座、边界、编队、地形、目标、LoS、阻挡、双方威胁变化 | Deploy、Move、Run、Charge、Place、Summon、Respawn |
| `combat.evaluate_exchange` | 命中/伤害概率、攻击目标、武器与关键词、双方火力圈互换、反制 | Ranged Attack、Fight、Charge 与攻击能力 |
| `score.forecast` | 当前分、相位末预计分、控制变化、任务条件 | 目标争夺、Pass、接近回合结束 |
| `memory.recall` | 按 plan/unit/intent/ability/opponent-response 查询同局事件 | 当前摘要不足或要延续较早意图 |
| `search.counterfactual_start/status` | 异步分支句柄、状态绑定、分支结果与不确定性 | 对手思考期间、关键激活/Pass/火力交换前 |
| `planner.select_action` | Planner 的唯一候选、计划变更和证据 refs | Required Evidence 满足后 |
| `action.commit_intent` | 完整 proposal、公开目的/取舍/反制/重规划条件 | Binder 完成后 |

工具返回遵循三种精度：`exact`、`advisory_estimate`、`unknown`。只有 `exact` 能证明合法性；估计只影响偏好；`unknown` 必须保留不确定性。

## 8. Required Evidence Matrix

Host 根据候选类型生成，不依赖模型自觉：

| 候选 | 提交前必须有 |
| --- | --- |
| `pass` 且存在其他动作 | 当前非 Pass 动作清单、放弃机会、精确相位后继、计分/先手影响（若相关） |
| `choose_first_actor` | 两个先手分支的精确后继，至少一个对手最强响应假设 |
| `deploy/place/summon/respawn` | 当前 Supply/Reserve、完整阵型几何、入口/边/距离条件、部署后威胁与目标影响 |
| `move/run/disengage` | Leading Model 路径、其余每个模型最终位置、完整底座/编队、前后威胁和目标影响 |
| `charge` | 路径/到达/编队、Charge 后攻击资格、预计交换、可能 Reaction |
| `ranged_attack/fight` | Rules 生成的骰池/武器/目标域、命中伤害概率、伤亡与反击/火力圈变化 |
| Ability/Card/Reaction | timing、资源、Exhaust/每轮限制、目标域、触发和后继窗口 |
| 接近相位/回合结束 | 当前分、预计本相位/回合得分、未使用资源/Unit/能力 |

## 9. Prompt 分层与公共格式

所有 Prompt 不要求隐藏思维链。为了可审计，模型输出：结论、证据、备选、取舍、对手反制、自己的再反制和重规划条件。

Prompt 顺序必须固定：

```text
P0 稳定系统合同
P0b 冻结规则/Skill 引用及适用条件
当前阶段说明
当前 authority + observation delta
热计划 + 检索到的同局记忆
已有 query/search receipts
最近一次局部错误（如有，放最后）
```

动态 correction 不应放在 Skill 前面，否则会破坏 DeepSeek 前缀缓存。

## 10. 各类 Prompt 设计

### P0 — 对战 Agent 系统合同（每场冻结）

用途：规定身份、真值层级、工具政策和公共解释，不包含当前棋盘。

```text
You are the strategic player for one seat in a StarCraft TMG match.

Authority:
- Rules state, LegalSpace, exact query receipts, Preview and Apply receipts are authoritative.
- Strategy Skills and memory are advisory. Never use them to override Rules.
- Never invent a future phase action, dice pool, distance, line of sight, supply,
  score, reserve availability, or action result.

Operating loop:
- Maintain one explicit match plan.
- At each meaningful choice, assess whether the plan still fits observed facts.
- Call the available tools until every host-required evidence item is satisfied.
- Compare current legal alternatives, opponent responses, counter-responses and
  opportunity costs before selecting one current candidate.
- The Action Binder may instantiate only the Planner-selected candidate.
- If evidence contradicts the plan, revise it explicitly.

Output policy:
- Do not expose hidden chain-of-thought.
- Provide concise public conclusions, evidence references, rejected alternatives,
  tradeoffs, expected opponent response, counter-response and replan triggers.
- You cannot confirm, apply or mutate the Room directly.
```

### P1 — Strategic Planner / Plan Assessor

触发：比赛开局、回合开始、相位改变、上一意图结果与预期显著不同、对手行为击穿假设、异步搜索产生新可用结论。

输入：全局目标、当前相位生命周期、精简棋盘摘要、当前动作索引、热计划、最近事件增量、检索 Skill、Required Evidence、可用工具。

Planner 可以输出工具调用；最终只能调用 `planner.select_action`：

```json
{
  "plan_status": "open | continue | revise | complete | abandon",
  "plan": {
    "objective": "win condition expressed for this scenario",
    "current_goal": "one near-term measurable goal",
    "strategic_approach": ["..."],
    "activation_priorities": ["..."],
    "resource_policy": ["..."],
    "initiative_policy": ["..."],
    "reserve_policy": ["..."],
    "assumptions": ["fact or explicitly labelled hypothesis"],
    "opponent_model": ["..."],
    "contingencies": ["if X, then Y"],
    "success_signals": ["..."],
    "revise_if": ["observable trigger"]
  },
  "assessment": {
    "health": "sound | at_risk | invalid | achieved",
    "evidence_for": ["receipt or observation ref"],
    "evidence_against": ["receipt or observation ref"],
    "changed_assumptions": ["..."],
    "unresolved_risks": ["..."],
    "next_decision_focus": "..."
  },
  "candidate_comparison": [
    {
      "candidate_id": "current id",
      "benefit": "...",
      "cost": "...",
      "opponent_response": "...",
      "counter_response": "...",
      "evidence_refs": ["..."]
    }
  ],
  "selected_candidate_id": "exact current id",
  "required_evidence_refs": ["all host requirements"],
  "public_plan_summary": "..."
}
```

约束：

- Planner 只看 compact action index；选中后 Binder 才获得完整 domain，控制 token。
- 初次必须建 Plan；之后默认复用，只返回差量 revision。
- 如果选择 Pass，必须列出被放弃的当前动作类型，不能以未经证明的未来动作作为理由。
- 如果工具返回 `unknown`，必须降低信心、选其他可证候选或显式接受风险。

### P2 — Information Gap / Tool Router

这不是独立自由 Agent，而是 P1/P3 内的受控下一步。Host 先给 `required_evidence`，模型再补充策略性查询。

Native 模式直接发工具调用；Typed JSON 模式：

```json
{
  "next_step": "query",
  "query": {
    "tool": "space.evaluate_formation",
    "candidate_id": "...",
    "arguments": {},
    "purpose": "which unresolved decision this answers"
  },
  "public_reason": "Need exact formation and fire-zone evidence before selection."
}
```

同一个查询错误不会整轮重来；工具返回可操作的参数错误，Planner 只重发该 tool call。

### P3 — Counterfactual Branch Proposer / Evaluator

触发：关键激活、Pass/先手、多个接近的阵型或攻击交换；普通低价值动作不调用。

Branch Proposer：

```json
{
  "horizon": { "kind": "bounded_activations", "count": 2 },
  "objective_metrics": ["score_delta", "surviving_supply", "position_value"],
  "branches": [
    {
      "branch_id": "b1",
      "current_candidate_id": "...",
      "purpose": "...",
      "expected_opponent_response": "...",
      "stop_condition": "..."
    }
  ]
}
```

Host 用规则器复制状态并执行精确可执行部分；对手策略不确定部分可由 opponent policy 采样。Evaluator 只读取结果：

```json
{
  "ranking": [
    {
      "branch_id": "b1",
      "score": 0.0,
      "benefits": ["..."],
      "costs": ["..."],
      "counterplay": ["..."],
      "uncertainties": ["..."],
      "evidence_refs": ["..."]
    }
  ],
  "recommendation": "b1",
  "replan_trigger": "..."
}
```

异步政策：在对方操作期间预计算；结果绑定 `stateHash + planVersion`。新状态不匹配就标 stale，不阻塞最慢链路。

### P4 — Action Binder / Executor

触发：Planner 已选唯一候选后。输入只包含该候选完整 domain、相关 exact receipts、当前 plan excerpt。

```text
Instantiate only SELECTED_CANDIDATE_ID.
Do not choose another candidate and do not rewrite the strategic plan.
For Unit repositioning, provide the Leading Model path and an explicit final
placement for every remaining model. Treat every physical base independently.
If the selected candidate cannot be instantiated, return replan_required with
the exact missing or contradictory evidence; never substitute Pass silently.
```

最终调用 `action.commit_intent`：

```json
{
  "status": "ready | replan_required",
  "proposal": {
    "kind": "finite | parameterized",
    "action_key": null,
    "domain_id": null,
    "parameters": null
  },
  "intent": {
    "current_goal": "...",
    "purpose": "...",
    "expected_own_outcome": "...",
    "expected_effects": ["..."],
    "predicted_opponent_responses": [
      {
        "opponent_action": "...",
        "basis": ["..."],
        "counter_response": "...",
        "counter_purpose": "...",
        "replan_if": "..."
      }
    ],
    "tradeoffs": [
      { "benefit": "...", "cost": "...", "acceptance_reason": "..." }
    ],
    "risks": ["..."],
    "fallbacks": ["..."],
    "stop_or_replan_triggers": ["..."],
    "unit_ids": ["..."],
    "skills_used": ["skill refs"],
    "evidence_refs": ["query/search refs"]
  },
  "public_decision_summary": {
    "visible_facts": ["..."],
    "plan": "...",
    "purpose": "...",
    "rejected_alternatives": ["..."],
    "calculation_results": ["..."],
    "risk": "..."
  }
}
```

Preview rejection分两类：

- 参数错误但候选仍合法：把精确错误和 domain 返回 P4，只修参数。
- 候选已失效或策略前提失败：回 P1，并保留已取得 receipts，不从开局开始。

### P5 — Outcome Observer / Plan Reflector

触发：Apply 后、骰子/Reaction/伤亡/计分等新事实出现后；短小，不承担下一动作绑定。

```json
{
  "intent_id": "...",
  "outcome_status": "met | partial | failed | interrupted",
  "expected_vs_observed": [
    { "expectation": "...", "observation": "...", "evidence_ref": "..." }
  ],
  "plan_impact": "none | strengthen | at_risk | invalidate | achieved",
  "opponent_model_updates": ["..."],
  "memory_facts_to_pin": ["only durable current-match facts"],
  "next_reflection_required": true,
  "public_summary": "..."
}
```

资源消耗、能力使用、单位血量和实际对手动作由 Host 从 Apply/Replay receipt 确定性记录，模型只能解释影响，不能改写事实。

### P6 — Same-match Memory Curator

记忆四层：

1. **Authority/event log**：完整追加日志，Host 写，不压缩。
2. **Hot working memory**：当前 Plan、当前目标、最近意图、关键资源/能力、等待中的反制；每个决策默认注入。
3. **Recall store**：按 unit、intent、ability、phase、opponent response 查询旧事件。
4. **Reflection summaries**：相位/回合摘要；仅作索引，不替换事实日志。

压缩 Prompt：

```text
Summarize only strategic continuity. Do not restate Rules and do not invent facts.
Every retained claim must cite an event or receipt ref. Keep: active objective,
current goal, unfinished commitments, abilities/resources already used, observed
opponent patterns, failed assumptions, planned counters and replan triggers.
Drop narration and duplicate facts. Unknown remains unknown.
```

输出：

```json
{
  "active_objective": "...",
  "current_goal": "...",
  "unfinished_commitments": ["..."],
  "used_resources_and_abilities": ["fact + ref"],
  "observed_opponent_patterns": ["observation + ref"],
  "failed_assumptions": ["..."],
  "planned_counters": ["..."],
  "replan_triggers": ["..."],
  "recall_queries_suggested": ["..."]
}
```

只有实时摘要不足时，Agent 才调用 `memory.recall`。这样既不会忘记“为何先移动这个 Unit”，也不会把整局日志塞满上下文。

### P7 — Multimodal Position Analyst

触发：关键局面、UI/结构化状态疑似不一致、报告截图点；不是每动作强制调用。

```text
Read the board image as a non-authoritative tactical observation.
Identify congestion, lanes, apparent fire concentration, objective pressure,
occlusion and visually suspicious state. Do not assert exact distance, legality,
line of sight, base overlap, model identity or score unless an exact structured
receipt confirms it. Return questions that should be checked by spatial tools.
```

输出只允许：`visual_hypotheses`、`structured_facts_consistent`、`queries_requested`、`uncertainties`。结构化位置与截图冲突时，记录 UI/投影 issue，并以 Rules state 继续。

### P8 — Kerrigan Adjutant / Communication Renderer

副官与策略决策分离。它读取玩家可见棋盘、公开 ActionIntent、计划摘要、规则/Skill 查询结果，然后把内容转换成凯瑞甘风格通讯；没有 Apply 权限，也不能秘密改变对战 Agent 决策。

```text
You are the selected StarCraft adjutant persona. Explain the current visible
position, the last action's public purpose, likely opponent intent, available
options and relevant rules. Clearly separate exact facts, strategic inference
and unknowns. Use the persona voice only for presentation. Never reveal hidden
provider reasoning, private opponent information or unobserved plans. Never issue
or apply a game action unless the user explicitly switches you to a player seat.
```

若用户问“对手这步意图”，副官可读取：动作前后事实、对方公开动作、自己对意图的推断、对战 Agent 已公开的 decision summary。公平模式下不能读取对手隐藏 Plan；实验/调试模式可在报告中查看双方公开结构化 Plan，但仍不展示隐藏 CoT。

### P9 — Schema / Semantic Repair

优先使用严格 function schema。失败时不重发整份大 Prompt，而是保留 checkpoint 并发送局部纠错：

```text
Restate only the arguments for FUNCTION_NAME.
The previous arguments failed these checks:
- /intent must be an object, received string
- /proposal/domain_id must equal the Planner-selected candidate
All other accepted fields and evidence remain unchanged.
Return one corrected function call. Do not add fields and do not change the plan.
```

政策：

- 多余字段：忽略并记录 Medium，不阻塞。
- 可局部补正的类型/枚举：同阶段自动纠正，最多 3 轮。
- 候选/相位/Authority 错误：不能软吞；回 Planner 或重新观察。
- 非法动作：Rules 拒绝，永不 Apply。
- 三轮不收敛：记录 High，安全策略接管当前动作，整局继续；不得无限初始化。
- API key/credential 泄露是唯一内容级 Critical 阻断；其他长度以 Provider 上限和可观测告警管理，不用任意业务字符上限杀死流程。

### P10 — Multi-match Review / Hypothesis Generator

触发：完整人机/机机局后，或控制台选择多局联合复盘。输入为结构化轨迹、局面 checkpoint、结果、对手/Skill/规则版本；不把原始全日志一次塞入模型，先按决策点检索。

```text
Find scenario-specific strategic hypotheses, not universal rules.
For each hypothesis, state the exact applicable position, rosters, resources,
phase, opponent policy/version, expected causal mechanism, control run, treatment
run, metrics, confounders and rejection condition. Prefer hypotheses supported
by repeated decision points across games. Do not promote from self-critique alone.
```

```json
{
  "hypotheses": [
    {
      "claim": "...",
      "applicability": {
        "scenario": "...",
        "phase": "...",
        "position_features": ["..."],
        "own_force": ["..."],
        "opponent_force": ["..."],
        "opponent_policy_version": "..."
      },
      "evidence_refs": ["game/decision/checkpoint refs"],
      "causal_mechanism": "...",
      "experiment": {
        "control": "...",
        "treatment": "...",
        "same_randomness_policy": "retain dice outcomes where valid",
        "metrics": ["..."],
        "reject_if": ["..."]
      }
    }
  ]
}
```

多局复盘只有在场景、对手版本和可比较状态明确时合并；不同对手策略造成的变化必须作为变量，而不是当噪声忽略。

### P11 — SkillOpt / Teach Promotion

触发：假设完成对照/重复验证后；在线局不直接写 Skill。

```text
Convert only causally supported hypotheses into conditional strategy guidance.
Preserve applicability, evidence, counterexamples, confidence, known opponent
responses, counter-responses and invalidation triggers. Never restate a strategy
as a game rule. Prefer a minimal patch to the existing Skill over regeneration.
```

产物必须包括：

- `when/applicability`：明确局面、位置关系、资源、对手和版本。
- `objective`：该策略改善什么。
- `procedure`：可执行但不包含伪造规则参数的步骤。
- `requiredQueries`：在线使用前要查什么。
- `opponentBranches/counterResponses`。
- `risk/reviseIf/counterexamples`。
- `evidenceRefs` 与 control/treatment 结果。
- 规则/数据变化后的 invalidation 判定。

这使 Skill 能指导对战，又不会把一次复盘的局部优势误写成通用规则。

## 11. 计划反思频率

不在每个微小自动效果上调用完整 Planner：

| 事件 | 调用 |
| --- | --- |
| 开局、回合开始 | 完整 P1 |
| 相位改变 | P1 快速 assessment；存在关键选择时完整比较 |
| 同一 Unit 连续、无新 chance/Reaction 的动作 | P4 延续当前 Intent，可批量 Preview |
| Apply 后出现骰子、伤亡、Reaction、计分或 LegalSpace 改变 | P5，然后下个选择点 P1 |
| 对手完成动作 | Host 记事实；若击穿假设，下次 P1 revise |
| 只剩一个无策略含义的合法推进 | Host 自动执行并记日志，0 模型调用 |
| 关键激活/Pass/火力圈交换 | P3 可异步预演 |
| 用户向副官提问 | P8，只读，不阻塞对战主循环 |

## 12. 成本与延迟设计

- 常规有意义选择目标：Planner 1 次 + Binder 1 次；查询轮按需，强制 Evidence 由工具返回。
- 强制唯一动作：0 次模型调用。
- 完整 Planner 只在计划边界触发；同一激活的连续动作使用 plan delta。
- Planner 只看 action index，Binder 只看 selected domain，避免把全部坐标域重复发送。
- 固定系统合同和冻结 Skill 放在前缀；动态 state/error 放尾部，利用 DeepSeek 自动前缀缓存。
- Query receipts 和事件以 ref + compact result 注入，完整内容可工具读取。
- 异步搜索在对手回合执行；超时不阻塞。
- 单场统计 planning/action/query/search/provider calls、cache hit/miss token、输入/输出 token、成本和 correction 次数。

## 13. 恢复、失败与断点

每个 checkpoint 至少保存：

```text
choiceKey
stateRevision/stateHash/legalSpaceHash
stage
planVersion
providerContinuationRef（若供应商支持）
assistant tool calls（公开参数）
tool receipts
selectedCandidateId
previewReceipt
applyReceipt
semanticCorrectionCountByStage
usage/cost
```

- 重启从最近未完成 stage 继续，不回到 `OBSERVE` 以前，也不重复已完成/已计费的 Provider attempt。
- Provider egress commit unknown：保留 unknown attempt；同一 attempt 不静默重付。玩家可等待供应商结果或显式创建新的 attempt，但新的比赛/新 choice 预算独立。
- Schema 修复沿用已有 Planner、receipts 和选择，只替换失败字段。
- state revision 已变化：旧 query/search/preview 标 stale，重新观察；Plan 本身保留并重新 assessment。

## 14. 验收标准

Slice 247 的正式 2000 分人机局必须证明：

1. 至少一个真实选择经历 `Planner -> query -> Planner -> Binder -> Preview -> Apply`。
2. 现场日志中 Planner 与 Action Binder 是不同阶段；Binder 未改变 candidate。
3. 模型能看到当前相位全流程、Supply、Reserve，并在 Movement Phase 正确 Deploy，不能声称 Assault/Combat 普通 Deploy。
4. Pass 有精确相位后继和放弃机会说明。
5. 多模型 Unit 移动包含 Leading Model 路径和所有模型最终摆位，规则器验证完整底座/编队。
6. 攻击骰数量、概率、伤害与计分来自 Rules/query receipts，不来自模型自报。
7. 同局 Plan 在多次交替激活间连续；使用能力、资源、目的、预设反制和实际结果可查询。
8. 异步预演结果只有在 `stateHash + planVersion` 未变化时采用，慢结果不阻塞主循环。
9. Provider 返回字符串 assessment/intent 时自动局部纠正，不能被默认值吞成 `continue/sound`。
10. Web 能展示公开 Plan、当前目标、证据、动作目的、对方可能反制、风险和 Prompt/工具阶段，不展示隐藏 CoT。
11. 完整局结束且 Replay/数据库/报告状态一致。

后续 Slice 248–250 在此基线上完成机机对战、复盘/反事实/SkillOpt/MuZero 与 PDF 截图证据。

## 15. 对当前代码的具体改造顺序

这些是 Slice 247 内部子交付物，不新增 Ticket：

1. **247-A Provider continuation**：Transport 支持 Native Tool Loop；DeepSeek thinking/tool continuation 正确回传；保留 Typed JSON fallback。
2. **247-B Agent controller**：把 `planning/action/query` 改为可持久化状态机，分别计数和断点恢复。
3. **247-C Prompt pack**：落地 P0/P1/P4/P5/P9，稳定前缀、差量上下文、严格判别输出；移除语义默认吞错。
4. **247-D Evidence/tools**：Required Evidence Matrix 接入现有 Rules/space/combat/score/memory/search seam；Pass/相位后继强制精确。
5. **247-E Live recovery**：对当前失败 run 保留诊断证据，新 run 从新 Room 开始；Provider correction 不再整局初始化。
6. **247-F Web & E2E**：修 Replay revision race，Web 展示 Agent stages/public rationale；完成 Standard 2000 人机局并按每个动作截图。

只对每个子交付物运行一次直接相关验证；已有通过门不重复。完成 247-F 后提交 Slice 247，再进入 Slice 248。

## 16. 最终架构判断

原始“Planner 主导、查询后决策”的方向是对的；退化发生在 Provider/控制器接缝，而不是规则原子、Skill 或计划数据模型本身。修复重点不是继续给一次性 Prompt 加字段，而是：

- 让 Planner 真正拥有下一步控制权；
- 把工具调用做成可恢复的回合；
- 让 Host 强制 Evidence，而非期待模型主动查询；
- 把选动作与绑定参数分开；
- 把 exact world model 与 LLM 策略假设分开；
- 把行动结果写入分层同局记忆；
- 把复盘实验和 Skill 晋升放到赛后因果验证链路。

这套设计能够同时支撑人机、机机、自博弈、复盘、SkillOpt 和 MuZero 轨迹，而无需为每种模式重写一套对战认知架构。
