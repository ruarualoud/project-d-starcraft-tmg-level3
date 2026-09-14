# Ticket18 / Slice174：通用策略层与 Strategy Case Compiler

此页保留首次组件检查点。后续当前数据适配、FAQ显式路由、共享生产/反思和历史哈希修复，
以[统一前置修复报告](ticket-18-slice-174-preexecution-repair-2026-09-07.md)为准；
下文“待修复”描述不是最新状态。

日期：2026-09-07。状态：新增组件合同与首批隔离执行通过；未恢复付费生产，未完成策略验收。

## FAQ 没有被 Skill 生成漏掉

实际读取 Terran Armed Forces 和 Zerg Swarm 的密封生产输入，两者都包含完整 68 条 FAQ，
`completeCoreAndFaqExposed=true`，来源锁仍为 `2881adb2…47226`。已有总规则参考层也按
Core + FAQ 生产。`packages/skill-production/mechanics.mjs` 和现有 Skill evaluation
直接调用 F3/F4/F5 FAQ 函数；并不是“规则器用了 FAQ，Skill 没用”。

这里必须区分三项证据：

1. FAQ 规则函数、68 问/137 原子及 current/historical 版本绑定已经实现。
2. 生成上下文含完整 FAQ，规则应用测试确实调用其中的函数。
3. 某个完整局面是否沿当前房间 LegalSpace → Preview → Apply → Replay 消费了所需 FAQ。

前两项不能自动证明第三项。本次选择的 `official-executable-rule-runtime-v1` 基础组件实例
是 `6e3527ce…903b9`，明确是 pre-FAQ 开发子集；不能以此宣称整个项目没有 FAQ，
也不能用它的测试通过证明 current FAQ 房间完整接入。本批未更改 Rules 或 Room 路由。
已知 FAQ46 v1 尺寸判断反向，独立 v2 修正已存在，但其 manifest 仍明确
`defaultRouterChanged=false/currentReleaseAdopted=false`，相关正式验收继续受阻。

## 本批实际交付

新增 `packages/strategy-skills/`，不重写旧的总规则候选、审核结果或 continuation 哈希。

- `strategy-contract-v1.mjs`：总规则、种族、定向对抗共用条件策略结构。
  强制目标、适用条件、决策步骤、至少两个备选、对手回应、风险、改计划条件、查询依赖及案例引用。
  单纯有 `kind: strategy` 或引用正确不能构成策略有效性。
- `general-strategy-layer-v1.mjs`：8 个通用维度的 host-authored 设计种子：任务目标、激活节奏、
  走位、威胁交换、资源时机、不确定性、对手回应、复盘适应。
  这是下一轮生产的设计输入，不伪称 DSH 已生成或正式 Skill 已完成。
- `strategy-case-compiler-v1.mjs`：在隔离 authority 实例内生成当前合法候选，逐分支
  Preview、显式确认、Apply、Replay；不接管真实用户房间，不另写规则裁判。
  模型输入只包含行动前的玩家可见状态和候选说明；结果、回执、偏好答案留在评估侧。
  只支持确定性的单次状态转移，随机动作要求独立分布适配器，否则拒绝编译。
- `strategy-production-input-v1.mjs`：三类 Skill 的新版本生产输入入口与严格 JSON Schema。
  保留完整冻结 Core/FAQ/产品来源、旧规则参考书和前置策略依赖；开发局面可以入输入，
  留出局面与答案不能入生成 workspace。该入口尚未接入付费调度，readiness 明确为 false。

协议 hash 与内容 hash 分离：正反 matchup 的 scope/input hash 不同，但相同结构协议 hash
相同，不因对手方向或候选内容变化而伪造一次输出协议升级。

## 种族与正反对抗是否也要改

要。沿用上述共享结构，不分别搭三套格式与纠错流程。

| 层 | 专属内容 | 前置策略依赖 |
| --- | --- | --- |
| 总规则通用策略 | 8 个通用决策维度 | 已资格化的规则参考依赖 |
| 两个种族策略 | 军队资源、单位分工、阶段节奏、目标、交换、卡牌组合 | 经独立验证的总规则策略层 |
| 两个定向对抗 | 对手特征、开局分支、反制、资源交换、残局 | 总规则策略层 + 双方种族策略层 |

旧种族内容可作为待重新审核的候选材料，不能继承尚未取得的策略合格结论。
正反对抗不是交换标签，必须分别生成计划与回应分支。当前共享入口/验证合同已提供，
旧付费 workflow 未切换；缺少前置依赖时拒绝，不把本批设计种子当成已合格依赖。

## 当前案例到底有什么

有冻结官方数据和可执行基础组件，所以能构建“规则器实际执行的合成局面”。
但本批没有完整比赛记录，也没有证明这些中途状态从开局可达。

本批通过的 3 个组件案例是两个开发变体、一个独立隔离控制，均测试给定短计划下的
先后手选择，共 6 条分支完成签名回执重放。它们证明选择接线，不证明短计划本身更优。
只有 `activation_tempo` 维度有开发案例，其余 7 个维度尚缺；不能据此生产验收完整策略。
留出控制的几何虽然不同，也不宣称这是足够多样的策略泛化评估。

尝试移动/资源取舍局面时发现明确的版本接线缺口：
`official-marine-optional-stimpack-move-executor-v2.mjs` 固定校验旧数据集
`40ba7253…757a`，当前冻结官方输入是 `b2579b83…1067`，因此没有产生移动候选。
本批使用当前来源锁校验的数据，没有回退旧数据，没有放宽校验；失败保留为回归和阻塞项。
修复应先确认精确适配器与来源合同，再显式升版，不能把 hash 不同直接当规则语义改变。

## 验证、产物与剩余顺序

运行 `npm run verify:ticket-18-strategy-case-compiler`。当前 16/16 组件检查通过，涵盖
正反作用域、协议身份、当前来源、隐私、留出隔离、非法候选、未知指标、旧移动版本拒绝、
依赖阻塞和“结构通过不等于策略通过”。0 Provider calls / 0 新付费 tokens。
相关回归同时通过：现有 structured-generation contracts 5/5，以及 viewer-scoped
Apply/Replay 隐私与确认绑定门；新增模块语法检查、`git diff --check` 通过。

产物位于 `build/ticket-18-strategy-compiler-v1/`：

- `general-strategy-seed.md/json`：可阅读的设计种子。
- `general-strategy-production-input.json`：保留完整来源的新生产输入，明确禁止据此直接付费。
- `development-cases.json`：组件案例、执行结果及回执，仅开发侧使用。
- `readiness.json`：实际检查、范围与阻塞项；无 formal/runtime/training 接受。

下一步顺序：

1. 补当前数据/FAQ 房间动作适配与策略案例覆盖；优先走位/资源、目标与对手回应，
   以独立预先冻结的局面区分好坏决策。缺覆盖不得用模型同意补齐。
2. 完成新策略生产角色的 structured runtime/DSH 接线及零付费传输一致性预检。
3. **R6 恢复阶段修复旧 continuation 的非预期 hash 漂移**：逐字段对照历史任务/指令/上下文/
   output contract，合法升版显式切换，完全一致的角色才复用；不能忽略 hash 或重跑整链掩盖问题。
   这一步在下一轮付费调用之前，不是生成结束后的整理。
4. 新协议能力探针后，先生产总规则策略层，再生产/补修两族和双向对抗；来源审阅、实际
   decision consumer、独立局面及完整比赛各自验收。哈希问题未修、本入口未通过预检时不续跑付费。

本批只完成新增组件，不关闭 Slice174。项目仍 16/22，Ticket18 仍 2/8，
旧规则参考离线依赖 1/5；正式/运行态五件套 0/5。既有 R0–R6 仍 6/7，R6 未完成。
Provider 账本累计估算仍 107,400,318 tokens / ¥76.792408，非账单，不含无法获知的 Codex 会话费用。
