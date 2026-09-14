# Ticket 23 / Slice 223：Postgame Review V2 收口

日期：2026-09-14。状态：完成；Ticket 23 为 `9/15`，剩余 `6` 片。

## 交付结果

新增 `postgame-scenario-review-runtime-v2.mjs`，将旧的“一次反思、直接生成建议”升级为
可恢复的离线实验工作流：

1. 输入是至少两场已经终局且 Authority Replay 一致的 Episode。每个动作保存动作前
   checkpoint、玩家观察、LegalSpace、空间 ActionSpace、任务/地图/规模/轮次/比分/
   阵营/编成/位置/资源/状态上下文，以及双方 Skill、模型、Prompt Pack 快照。
2. development Episode 的所有动作一并交给 Challenger 扫描，不设固定前三局面；先完成
   扫描分母，再按证据优先级和实验预算选择假设。held-out Episode 只进入 Host/Evaluator，
   不进入发现或 Skill 提案上下文。
3. 每条假设绑定明确动作与 ScenarioContext。每个实验先通过 `cloneCheckpoint` 创建
   exact isolated Rules clone，再以相同 checkpoint、随机流、模型、Prompt 和对手策略跑
   baseline/candidate。一次配对只改变己方一份策略 Skill；双方如都要优化，必须形成两条
   独立假设，禁止同时修改造成归因混杂。
4. 同一假设可面对多个冻结的对手策略，输出按 development/held-out 分隔的 payoff
   matrix，并区分跨对手稳定、对手版本特异、回归和低信号结论。每个实验保存对手响应
   搜索轨迹，但绝不修改真实对局轨迹。
5. Challenger → experiment/Reasoner → Judge → Proposer → Host Generator 分离。Judge
   只有 Critical/High 会阻断集成；Important/Medium/Low 进入跟踪。流程不自动启动第二轮，
   同一 Review 上限仍为三轮。
6. Generator 只创建最小 typed diff 的 `project_d_skillopt_candidate_v2` 和场景化
   `project_d_memento_candidate_v2`。两者均为 quarantine、`humanReviewed=false`、
   `canAffectRules=false`、`runtimeAccepted=false`、`trainingTruth=false`；SkillOpt 保存明确
   parent rollback 引用，并继续要求独立 held-out 与完整比赛 arena。

新增 `sqlite-postgame-review-store-v2.mjs` 作为本地/受控实验 WAL。它使用 SQLite WAL、
`synchronous=FULL` 和 revision CAS。Reviewer 调用和每个 A/B arm 均在外部执行前落为
`running`；重启后优先通过调用/执行 key 读取已经完成的结果，状态不明时暂停，只有明确
`definitelyNotStarted` 才可重发。已完成 pair 在恢复时不会重复计数。

本片继续使用语义版本作为兼容合同；内容 hash 只用于 Episode、Skill、候选和证据身份，
没有重新引入“任意文件变化导致生产入口失败”的历史设计。

## 唯一聚焦门

一次内联门通过，未建立新测试文件，也没有重跑旧门：

- `3` 个 Episode，其中 `2` 场 development 对局和 `1` 个 evaluator-only held-out；
- `5` 个动作进入总分母，真实两局的 `4/4` 动作全部交给 discovery；
- 调度 `6` 个 exact paired experiment，得到 `4` 个
  `opponent-policy × evaluation-split` payoff cell；
- 每组 baseline/candidate 的 checkpoint、RNG 与对手 Skill 相同，仅己方 Skill 不同；
- 模拟首个 candidate arm 已执行但回包丢失，重启从执行 key 恢复，arm 总执行次数仍为
  `1`；
- 生成 `1` 个 SkillOpt 和 `1` 个 Memento quarantine candidate；
- held-out 内容在公共投影中被替换为计数/引用，原始及返回的 chain-of-thought 类字段未
  被持久化；
- Critical/High 为 `0`，Medium 为 `1`，所以本片可以集成但不授予生产或训练资格。

该门全部使用注入 Reviewer/experiment port，外部 Provider 为 `0 calls / 0 tokens / ¥0`。

## 边界与后继

- 本片证明 Review/experiment 合同及恢复语义，不证明真实模型的复盘质量；正式调用属于
  Slice 228。
- 本片的 checkpoint port 使用注入实现；正式 Room checkpoint capture/clone 将由
  Slices 224、226、227 的 run manifest 与逐动作轨迹提供。
- SQLite `:memory:` 只用于本次门；文件 SQLite 可用于本地受控实验。真实多实例
  PostgreSQL 仍沿用 Ticket 21 的 production external gate，不被本片伪造。
- 旧 `human-agent-learning-console-v1` 与 Ticket 18 SkillOpt 保持可读；正式新对局走 V2，
  不静默改写历史候选。

## Harness 报告

- `harnessLoopUsed`: yes；离线 Review/SkillOpt 采用
  `project-d-offline-skill-evolution`，外部对战实验保持 Harness 可观察边界
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: Challenger/discover、Judge、Proposer 三个隔离路由；held-out 不进入
  Gameplay Agent 或 Proposer
- `harnessToolsCalled`: `cloneCheckpoint`、`executeArm`、`readExecution`；均为注入门
- `uiTraceEvidence`: none；复盘控制台与产品 UI 组合属于 Slice 225
- `agentDecisionEvidence`: 5-action scan denominator、1 hypothesis、6 paired arms
- `memoryTraceEvidence`: 1 quarantined scenario-scoped Memento candidate
- `trainingTraceCandidates`: 1 SkillOpt + 1 Memento；全部 `trainingTruth=false`
- `rollbackOrDemotionRules`: parent Skill ref 固定；候选不自动发布；Critical/High 阻断；
  unknown execution 不重发；最多三轮 Review
- `userVisibleChecks`: payoff matrix、finding severity、适用/失效条件、候选隔离状态、held-out
  redaction 和恢复状态均在公共记录可见

