# Ticket 23：思维链、结构化决策轨迹与对局复盘

日期：2026-09-17

## 结论

不应把 Provider 的原始隐藏思维链当作正式复盘事实、长期记忆或 Skill 晋升证据。
它可以在供应商合同允许时作为短期、受限的调试侧信号，但长期可复用的核心应是：

1. 决策前可见状态与权威规则/空间查询回执；
2. 结构化的计划、目的、候选、取舍、风险、对手反制和重规划条件；
3. 实际提交动作、骰子、状态变化、计分与后续结果；
4. 在冻结场景上执行的 counterfactual/search 分支和 verifier 评价；
5. 多局聚合后的适用条件、失败边界和不确定性。

原始思维链最多是“为什么值得检查某个问题”的线索，不能单独证明规则事实、因果关系或策略优越性。

## 当前实现

Slice 248 的记录明确标记 `hiddenChainOfThoughtStored: false`。目前长期保存：公开计划、
当前目标、可见事实、候选比较、风险、查询/工具回执、动作、骰子、结果、计划修订和
同局记忆。DeepSeek thinking 模式需要的 `reasoning_content` 只允许在同一次 Provider
continuation 中短期回传，不进入报告、训练数据、长期记忆或 Skill。

这与已有架构文档一致：

- `docs/ticket-23-slice-247-planner-led-multiturn-agent-prompt-architecture-v1-2026-09-15.md`
- `docs/research/ticket-23-llm-game-agent-review-counterfactual-research-2026-09-14.md`

## 研究证据

### 有利于保存“过程信号”的证据

- OpenAI 的 *Let's Verify Step by Step* 比较 outcome supervision 与 process supervision，
  在 MATH 任务上发现逐步过程监督显著优于只看最终答案。这支持复盘时评价中间步骤，
  但论文中的步骤有人工标注和可验证正确性，不等于无条件信任模型自由生成的思维链。
  <https://cdn.openai.com/improving-mathematical-reasoning-with-process-supervision/Lets_Verify_Step_by_Step.pdf>
- Reflexion 把环境反馈压缩成语言反思并放入 episodic memory，在多类 agent 任务上改善
  后续尝试。这支持保存“经结果校正的反思”，而不是保存所有原始内心独白。
  <https://arxiv.org/abs/2303.11366>
- ReAct 证明交替的 reasoning/action/observation trace 有利于更新计划、使用外部事实并
  降低纯语言推理的幻觉传播。对本项目对应的是查询回执和动作结果，而非单次长 CoT。
  <https://arxiv.org/abs/2210.03629>
- DeepMind 的棋类研究显示，外部 MCTS 和模型内部线性化搜索都能提高棋类胜率；可靠性
  依赖准确状态转移、合法动作和搜索评价。对本项目更直接的启示是保存可重放搜索树、
  叶节点评价和权威状态，而非仅保存自然语言理由。
  <https://deepmind.google/research/publications/139455/>

### 反对把原始思维链当作真相的证据

- Turpin 等人的实验表明 CoT 可能受偏置线索影响，却不承认该影响，并会为已偏置答案
  生成貌似合理的事后解释。因此“写得像策略”不能证明它真实驱动了动作。
  <https://arxiv.org/abs/2305.04388>
- *Faithful Chain-of-Thought Reasoning* 明确指出普通自然语言 CoT 不保证忠实；其解决
  方案是把问题翻译成可执行的符号链，再交给确定性求解器。对应本项目应把距离、底盘、
  威胁、骰子和合法性落到 Rules/MCP receipt。
  <https://arxiv.org/abs/2301.13379>
- OpenAI 的 CoT monitorability 研究把思维链视为有价值但脆弱的监控信号；直接对 CoT
  施加强监督可能让模型学会隐藏意图，降低可监控性。因此不能把“写出审核喜欢的理由”
  直接作为 Skill 晋升目标。
  <https://openai.com/index/chain-of-thought-monitoring/>
- AgentPRM 指出 agent 动作不像数学步骤那样具有单一局部正确性，过程评价应同时衡量
  promise（未来潜力）和 progress（朝目标推进）。这支持用多回合结果、位置变化、资源
  与任务进展评价计划，而不是逐句评价 CoT 文风。
  <https://arxiv.org/abs/2511.08325>

## 对 Project D 的建议合同

### A. 长期保存：Decision Capsule

每个真实选择点保存一个可验证胶囊：

- `visible_state_ref`、`legal_space_ref`、`rule_receipt_refs`；
- `plan_before`、`intent`、`candidate_comparison`；
- `selected_action`、`expected_opponent_response`、`counter_response`；
- `risk_and_unknowns`、`replan_if`；
- `apply_receipt`、`dice_and_effects`、`state_after`；
- `prediction_outcome_labels`：哪些预测成立、哪些被证伪；
- `counterfactual_refs`：同一冻结状态上的备选动作实验。

这是复盘、监督和 Skill 演化的主数据。

### B. 可选短期保存：Provider Reasoning Envelope

仅当供应商 API 必须回传 reasoning content，或专门诊断某个问题时：

- 仅在单个决策 continuation 内保存；
- 加密、最短保留期、严格访问控制；
- 标记 `rulesAuthority: false`、`trainingTruth: false`；
- 不进入用户报告，不直接进入长期记忆或 Skill；
- 只允许派生出待 verifier 检查的假设，随后删除原文。

### C. 复盘流程

1. 先从权威轨迹找关键决策点和结果差异；
2. 检查当时公开计划的事实引用、预测与风险是否正确；
3. 在同一冻结状态运行多个合法 counterfactual；
4. 由规则器和结果指标评价，不让行动 Agent 自己担任唯一裁判；
5. 多局、跨 seed、冻结对手版本复验后，才形成带适用条件的 Skill patch。

## 对当前对局的直接判断

当前缺的不是“把隐藏思维链全部存下来”，而是两类更可靠的证据：

1. 把 formation/threat 查询真正送到候选比较，并记录风险信息改变了哪个选择；
2. 对 Hydralisk 暴露、Corpser Run 等关键点做冻结状态 counterfactual，比较任务进展、
   预期交换和后续反制。

这能判断模型究竟是合理避险还是被新威胁信息推成过度保守；只阅读一段原始 CoT 不能可靠回答。
