# Ticket 23 / Slice 248 — v4 冲锋横截面阻隔证明

状态：开发分叉规则验收通过；A 完整对局、生产 Room、策略质量尚未验收。

## 真实失败与原因

A 的 v3 房间 `20260926182512804-zvqoXv-84EeTL` 在 r9 已接受凯瑞甘对 Marine 2 的 Charge 宣告；骰 2，权威上限 10 英寸。后继只有 `resolve_charge`。Host 搜索了 57 个锚点、63 个候选，全部因 `SELECTED_SPATIAL_PATH_MODEL_COLLISION` 被 Rules 拒绝，旧 Host 随即报 `LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE`。有限候选为零不是冲锋失败证明。

成功条件按目标 **Unit 任一存活模型**接敌，而非仅宣告时指向的 model 9。纯 Rules 证明器逐一覆盖 Marine 2 的 9 个存活模型：8 个模型的最乐观直线下界已超过 10 英寸；model 9 虽直线下界约 9.914 英寸，但凯瑞甘通向它的连续中心路径必须穿过 Swarmling model 7 所在的水平截线。允许在阻隔底盘左右两侧擦边后，保守路径下界仍为 **10.008 英寸**。证明器缩小碰撞区间、放大接敌圆盘并留出路径舍入余量；任何条件不满足时只返回 unknown。地形、其他模型和编队约束被忽略，只会扩大可行域，故这不是从搜索失败反推规则。

## 版本与验收

- 新增 `official-charge-occupied-cross-section-proof-v1.mjs` 和以冻结 v3 为底的 `official-current-product-match-runtime-v4.mjs`；不修改旧版本 hash 或旧房间。
- 首次真实 r9 只读核算因过宽安全余量返回 unknown；收紧为仍覆盖内核舍入的 1 milli-inch 几何余量及最终 2 milli-inch 严格路径阈值后，同一 r9 返回 9/9 模型覆盖与 10.008 英寸 model 9 下界。原失败与修订均保留，不声称首次通过。
- 一次对应的持久房间门禁从 v3 r9 建 v4 开发房间，依次走 LegalSpace → Preview → Confirm → Apply → Replay；v4 r1 `charge_failed`、模型未移动、`targetReplayMatchesCurrent:true`、`originalRoomUnchanged:true`、`productionRoomEligible:false`。收据：`build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF/fork-receipt.json`。此门 0 Provider 调用。
- v4 Web/Agent 同房续局已启动，但新动作、默认记忆读取与完整终局尚待进程证据。B 独立分支仍在运行；它与 A 军表不同，不能当同表 plan-only 因果实验。
- v4 当前进程启动时使用旧费用展示代码，发出非阻断 `SLICE248_VERSIONED_FORK_COST_ANCESTRY_MISSING`，实际 Provider 用量未丢。恢复入口已改成逐层验证分叉收据、累加每层已付费分支，并继承最初原房的冻结成本；一次定向只读门核对 A v2/v3/v4 的继承值分别为 ¥68.216123／¥71.009034／¥73.430805，B v2 为 ¥49.137530，runner 语法检查通过。**正在运行的进程不会热更新**，其 v4 `progress.json` 中 `sourceCostAtVersionedForkCny:0` 仅是旧展示值；人工成本报告按祖先链修正，下次安全重启才加载新代码。C 写表线基线不变。
- 真实 v4 玩家 2 本局日志检查发现新的分叉入口记忆缺口：r1 `charge_failed` 是分叉工具直接 Apply，绕过 Hosted Bot `recordOutcome`；旧启动器只导入计划，故默认记忆从随后 `finish_activation` 才有 outcome。现启动器从 v4 签名、已回放的 r1 收据按 seat 写入去重记忆：行动方记 `decision_outcome`，对手记公开 `opponent_response_observed`；记录原始收据 hash 和 r1 来源，绝不虚构隐藏思维。对应模块 `node --check` 一次通过。**运行中的 A 进程未加载此改动，真实记忆门尚未验收**；不能声称当前 Agent 已读到冲锋失败。下一安全重启再验同 Room 的实际 Planner 输入。

## Harness 回路

`harnessLoopUsed`: 真实 Room 错误→权威状态解密只读核算→纯 Rules 充分证明→版本化 Room 接线→真实 Web 后续待观察。`targetGames`: StarCraft TMG。`promptPackRoutes`: 本轮未改 Prompt/Skill。`harnessToolsCalled`: 只读 Room SQLite、Rules LegalSpace、Preview、Confirm、Apply、Replay；模型调用 0。`uiTraceEvidence`: v4 续局截图尚待产生。`agentDecisionEvidence`: v3 r9 的公开 Charge 意图和失败后继保留；不能把样本搜索当结论。`memoryTraceEvidence`: 已暂存签名 `charge_failed` 回执进入默认本局记忆的修复，待新进程真实输入验证。`trainingTraceCandidates`: 此 Charge 失败和前两次高风险 Charge 暂留 S249 反例；未晋升训练真值。`rollbackOrDemotionRules`: 旧 v1–v3 房不迁就新规则；若 v4 续局/回放或记忆验证失败，冻结 v4 分支并保留收据，勿静默回写旧 Room。`userVisibleChecks`: r9/r1 状态和骰子、底盘未移动、分叉前后哈希、下一 Web 截图。

Ticket 23 仍 33/36，剩 S248 完整对局、S249 复盘、S250 汇总。长期三链 0/3 完整验收。费用 A/B/C/D 各自独立；本纯规则修复与分叉新增模型费为 ¥0。
