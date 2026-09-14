# Ticket 18 / Slice 174：下一次生产前的统一修复

日期：2026-09-07。范围：六项前置工程修复，不新增 Ticket 或 Slice。
状态：六项前置工程修复完成，统一零付费复验9/9组通过；未开始新一轮真实模型生成。

## 六项修复

| 项 | 问题与修复 | 证据边界 |
| --- | --- | --- |
| 1. 当前数据移动适配 | 新增显式 Stimpack move v3，重新绑定当前冻结 snapshot/dataset/gameplay bundle；单位、卡牌、底座来源和几何规则继续精确校验 | v2 文件不改，不下载新数据，不把旧数据回退当修复；仅当前两 Marine 的已支持动作组合 |
| 2. FAQ 消费版本 | 新增 FAQ router v2，68 条入口与冻结原文绑定；46 明确采用纠正后的 size≤2 阻挡判定，03 核对 Stimpack 非致命伤害 | 新策略输入携带路由 manifest 和 46 的边界探针；旧 aggregate/房间默认版本不静默更换，不声称完整力场移动已实现 |
| 3. Case 指标与隔离 | 修复己方资源投影遗漏数量/准备状态；真实比较普通移动与增强移动的距离、CP和伤害；Case 引用必须匹配策略维度 | 玩家视角、留出隔离、实际确认/执行/重放；缺数据拒绝，不能把缺字段默认为0；组件偏好不等于整局最优 |
| 4. 共享策略生产和反思 | 总规则、种族、双向对抗共用 notes/policy/review/decision 四种严格输出合同，Teach→ctx2skill→Challenger→Reasoner→Judge→Proposer→Generator→来源审查 | 一次只产一个维度的完整策略，保留完整冻结来源、旧规则参考、依赖与本轮历史；模型无权填写接受状态 |
| 5. 续跑与扣费身份 | 按密封祖先 recipe 追到角色首次执行，修复两个新角色被误当旧提示词；结构化失败持久隔离，能力凭据变化触发身份漂移检查 | 历史190角色复用，legacy prompt应为37而非39；不忽略input hash，不重跑已付费历史角色掩盖漂移 |
| 6. 汇总预检 | 新增 `npm run verify:ticket-18-preexecution`：组件、故障、真实隔离DSH、旧纠错、续跑和最终生产预检统一执行 | 无 live 参数、无密钥读取、无数据刷新；开始先检查真实账本402/在途，检查过程中代码变化则拒绝绿色回执 |

新增文件主要位于 `packages/strategy-skills/`、三个显式版本化 Rules adapter、
`faction-prompt-lineage-v1.mjs` 和两个 preexecution 验证脚本。
原有尚未提交的 conflict-history、continuation、local editor/workflow 修改继续保留并纳入相关回归。

## 幻觉、纠错与恢复如何处理

- 未知来源、错误策略维度、借用不相关 Case、模型自带 host 控制字段：本地拒绝。
- 审查提出具体问题：保留完整当前策略和全部历史否定，只允许修改点名字段；最多两轮。
- 原文不动、改了无关字段、恢复到历史失败版本：立即停止，不靠重复抽样赌收敛。
- 结构化失败：保留候选/usage/类型化问题，隔离后不自动全上下文重发。
- 模糊发送状态：不自动重试；402：按项目约定停止。
- 改 schema、上下文、执行策略或 capability receipt：显式新身份；不能借换凭据重复购买同一步。
- 已完成角色：精确输入缓存复用；验证失败候选也保留隔离状态，重启不会自动再次扣费。

联调另外拦截了两项跨层配置错误：输出预算超过冻结 Provider profile 的4096上限，
以及隔离进程超时参数超过现有 runner 合同。共享入口已校验输出能力并复用现有 DSH limits。
这类错误应在本地暴露，不等真实长任务花钱后再发现。

反思入口 `prepareStrategyReflectionInputV1` 必须绑定父策略、原输入、真实执行的开发 Case
及重新核算的失败 grade；`revisePolicy` 经同一结构化运行时定点修改，保留其他维度，重新审查。
新候选清空所有旧接受结论，仍须重新跑 consumer 和独立评估。
留出 Case 不能直接作为反思材料；若以后暴露留出答案，必须先冻结新的独立评估集，不能偷偷改名。
这只是后续复盘升级共用的基础机制，不代替 Slice177/178 的完整实战闭环验收。

## Case 现在能证明什么

当前编译5个合成中途局面、13条实际执行及重放分支：普通/增强移动的近目标与远目标对照、
独立几何控制、两种先后手意图。普通移动足以达成近目标时保留1CP；远目标只有增强移动
能达成时，选择发生变化。新增 FAQ03 核验事件也进入权威回执与重放。

不是五场比赛，也没有证明这些中途状态从开局可达。开发 Case 覆盖通用策略3/8维度：
`activation_tempo`、`movement_position`、`resource_timing`。
仍缺 `objective_plan`、`threat_trade`、`uncertainty`、`opponent_response`、`review_adaptation`
的策略有效性证据。FAQ46边界探针只证明判定，不自动填这些策略覆盖。
允许产出待验证策略假设，禁止凭这13分支宣称五件套正式可用。

## 验证入口与下一次执行

运行：`npm run verify:ticket-18-preexecution`。
汇总结果：`build/ticket-18-strategy-preexecution-v1/unified-readiness.json`。
专项结果、当前生产输入、开发 Case 同目录；留出输入不写入生产 workspace。

本次汇总9/9组通过：旧组件16、策略生产/反思专项20、结构合同5、上下文与分类7、
旧种族workflow77、续跑回归、结构editor5、结构review13，以及真实历史生产预检。
专项包含一次真实 pinned DSH 隔离进程，使用本地 Provider 故障注入；不是真实模型能力探针。
当前完整基础workspace为699,896 bytes，所有角色不删来源；改动文件与测试前后指纹一致，
`git diff --check`通过。汇总回执hash：
`621c8ed899f14cfdf76f1604619eedf60d3ce7877969345c6e5dfe5cfa1f1d95`。

预检必须证明旧续跑 first miss 为
`faction.terran_armed_forces.objectives.1.editor.2.2`，路由为 `responses_json_schema`。
这是历史任务可恢复的证据，不代表应该绕过用户优先级直接先跑旧种族链。

下一次实际生产应先给新四种输出合同做受预算约束的能力探针，再产总规则通用策略候选，
补齐来源审查和独立 Case 证据，之后两族、最后正反对抗。
旧总规则正文仍保留为规则参考依赖，不被丢弃；新策略候选不会继承它的合格标记。
真实模型能力探针、来源/策略质量及整局评估，不能用本地故障注入结果代替。

## 进度、成本与 Skill 工作流记录

本轮新增真实 Provider 调用0、tokens0、费用¥0；累计估算仍为107,400,318 tokens / ¥76.792408，
不是账单，不包括无法获知的 Codex 会话费用。
Ticket18仍2/8（174进行中，175–179待做）；项目16/22；旧规则参考离线依赖1/5；
正式/运行态五件套0/5；R0–R6仍6/7，不能把工程预检替代R6真实生产收口。

采用 `project-d-offline-skill-evolution`、`ctx2skill-rule-skill-loop`、
`agentic-harness-evolution-loop` 的来源优先、局面重放、离线DSH和候选/接受分离要求，
以 `diagnose` 的复现→定位→回归步骤处理数据身份、资源投影和提示词谱系问题。
因此保留了旧版本、所有失败和未覆盖维度，而没有用模型共识宣布规则或策略已合格。
