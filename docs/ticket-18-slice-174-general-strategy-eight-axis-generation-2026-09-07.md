# Ticket 18 / Slice 174：总规则策略八维生成完成

最新职责修正：[初始Skill与演化链分离、来源纠错实证](ticket-18-slice-174-initial-skill-source-correction-2026-09-07.md)。
本篇“八维”是原V1生成批次：最新合同将初始运行策略定为7维，并把`review_adaptation`独立为演化候选；已付费历史不重写。

本步完成“修正第二维并生成其余六维”。固定工作目录、官方数据、FAQ、规则服务与原SQLite生产账本；
没有刷新来源、启用Codex子agent或把DSH接入在线对战。生成结果仍是离线候选，不是正式发布Skill。

## 结果

总规则策略的八个内部维度均已有真实正文和当前版本11字段模型审查：

| 序号 | 维度 | 本步处理 | 开发Case | 当前状态 |
|---:|---|---|---|---|
| 1 | `objective_plan` | 精确复用前一批候选 | 无 | 模型审查无当前问题，待独立验收 |
| 2 | `activation_tempo` | 来源绑定修正后重新审查 | `tempo.act-first`、`tempo.respond` | 定点修正已核对；整维仍待独立验收 |
| 3 | `movement_position` | 七角色生成+11字段审查 | `movement.near`、`movement.far` | 模型审查无当前问题，待独立验收 |
| 4 | `threat_trade` | 七角色生成+11字段审查 | 无 | 模型审查无当前问题，待独立验收 |
| 5 | `resource_timing` | 七角色生成+11字段审查 | `movement.near`、`movement.far` | 模型审查无当前问题，待独立验收 |
| 6 | `uncertainty` | 七角色生成+11字段审查 | 无 | 模型审查无当前问题，待独立验收 |
| 7 | `opponent_response` | 七角色生成+11字段审查 | 无 | 模型审查无当前问题，待独立验收 |
| 8 | `review_adaptation` | 七角色生成+11字段审查 | 无 | 模型审查无当前问题，待独立验收 |

“8/8”是一个总规则Skill内部的策略维度分母，不是八个Skill，也不是Ticket 18的八个slice。
Ticket 18仍为2/8个计划slice完成，Slice 174仍active；正式五件套仍0/5。

可读聚合：[八维策略候选](../build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/general-strategy-batch-v1/strategy-candidates.md)。

## 第二维定点修正

对冻结官方规则独立阅读确认三类措辞错误：

1. 原文是玩家轮流、每回合轮到时激活一个单位，每个被激活单位执行该阶段允许的一个行动；不能写成“每单位每Round仅一个行动”。
2. Reaction限制是每名玩家在每次Activation期间最多结算一个Reaction，不是只有一个触发窗口。
3. 第一名Pass的玩家取得下一阶段First Player Marker，由标记持有者选择谁先行动；不是自动由该玩家先行动。

新`strategy_targeted_source_adjudication_v1`绑定三个精确官方来源片段，只授权修改`decisionProcedure`和`alternatives`；
其他字段逐值保留，随后对新正文重新审查全部11字段。四项本地正反检查通过，未调用Provider。
这只证明三项定点修正，不冒充整维来源审核完成。

## 实际执行与费用

- 批次上限：63 calls / 20,000,000 tokens / ¥12，且受原父任务120 calls / 40M tokens / ¥20 / 6h共同约束。
- 实际：63 calls / 14,556,705 tokens / 估算¥4.850283。
- 执行中没有格式失败、隔离、自动重试、402或不明确在途请求。
- 全历史累计：128,833,000 tokens / 估算¥86.069924；尚未达到¥100提醒线。
- 批次报告hash：`e96fb1158802c8be2da73ba1010658fcc38a3ab3282ff184dcf23341e3929f22`。
- 批次配方hash：`60abf471e92c9a94f237783a1fed0224bd90c592dda92469ba8b721dd6ac5e7d`。

费用是本地定价适配器估算，不是Provider账单；失败账单和历史估算均未删除或下调。

## 断点与完整性

完成后从真实SQLite只读重建：第二维的3个新审查+1候选，以及六个维度各7生成角色+3审查+1候选，
共70个检查点。重建得到全部七个本步候选的精确hash；DSH调用0、Provider调用0、凭据读取0、写入0、账本变化0。
再加上前批复用的`objective_plan`，批次报告和可读聚合覆盖八维。

只读重启门通过5项，回执hash：`9edba01d59b2f657d1c15b9b83fb07412b362567b1fa496eb0a6032eca0c0a08`。
历史live控制器与其自代码hash保持冻结；后续来源/Case阶段使用新的有界控制器，不覆写本批配方。

## 可用性与策略性判断

八维候选不再只是规则转述。每维都有`when`、目标、条件决策步骤、至少两个备选、对手回应、风险、
`reviseIf`、所需查询、来源及Case边界，能够作为对战Agent的候选决策框架。

但目前不能指导正式对战发布，原因有四类：

- 88个`model_reports_no_current_defect`是模型对当前字段的意见，不是独立来源真值。
- 现有5个合成Case/13个执行分支只覆盖3/8维；策略表实际只引用4个开发Case，且不证明整局更优。
- `requiredQueries`还是语义查询名，需在运行时路由到`read_board_state`、`list_legal_actions`、`measure_distance`、
  `preview_action`、规则/威胁/概率服务，未映射的查询必须失败关闭。
- 尚无完整游戏A/B、Opponent合法动作轨迹、复盘升级实例或Web/App用户可见证据。

人工阅读另标记一项下一阶段必须核对的措辞：`opponent_response`把对手Pass描述成“改变激活顺序，抢先行动”；
官方规则限定为取得下一阶段标记，并由持有者选择首个行动方。该项尚未做定点裁决，不能因11字段模型审查为绿而忽略。

## 下一步

1. 对八维逐条做独立完整来源审核，先裁决上述Pass措辞及其他规则性陈述；只对确认问题做字段补丁并新审。
2. 为缺案例的五维建立冻结开发Case，并保留新的独立heldout；执行规则服务重放和候选决策消费。
3. 组装单个总规则策略Skill和router manifest，状态保持draft，`canAffectRules=false`、`trainingTruth=false`。
4. 通过小局面门后做完整对局A/B；合格后才能作为两个种族Skill与双向对抗Skill的已验证依赖。
5. 用真实development对局失败验证Memento/SkillOpt反思链；heldout不得进入生成或修正上下文。

ctx2skill字段：`ctx2skillLoopUsed=true`，目标游戏`starcraft-tmg`，路由`rule_skill_builder`，
本批策略候选8维、正式Skills生成0、字段judge事件88、promotions为空。
harness字段：`harnessLoopUsed=true`，提示路由`rule_skill_builder_prompt`；本步无在线Harness工具、UI、记忆或训练轨迹。
