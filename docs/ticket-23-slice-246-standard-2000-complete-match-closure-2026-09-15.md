# Ticket 23 / Slice 246：Standard 2000 零 Provider 完整对局收口

日期：2026-09-15。状态：完成；Ticket 23 为 `32/36`，剩余 `4` 片。

## 交付结果

- 产品 Runtime 总组合完成一场双方各 `2000 Minerals` 的 Standard `54×36` 完整对局；
  Vespene 为 `115/140`，15 个 Unit 均合法部署，战场使用 9 件认证地形。
- 对局从 start-of-round 经 Movement、Assault、Combat、Cleanup 循环至第 5 回合任务终局，
  共接受 `107` 个权威动作和 `107` 个不同 LegalSpace；任务开始、控制、计分和终局检查
  各执行 5 次。
- 252 个当前产品能力定义维持 `252 exact / 0 pending / 0 unsupported`；Rules Runtime 的
  `legalSpaceComplete` 与 `productionRoomEligible` 均为 true。
- 最终 checkpoint 为 revision 96，只重放后续 11 条 receipt；总重放计数为 107，重放
  state hash 与当前终态 hash 均为
  `fd290fbb064e3f9bda8cae5578ecfeb883f09a61845cb622b3ed5f184940c882`。
- SQLite WAL、原子 progress sidecar 和持久化 referee/room 密钥支持断点续跑；重启后按
  MatchBinding 精确恢复冻结依赖，不做静默兼容。

## 本片修复

- Hydralisk 40×100mm 矩形底座进入共享完整底座关系、部署、交战、任务控制、任务几何、
  高度 effective size、地形 LoS、近战和保守连续移动 sweep；V1 严格旧语义按调用合同保留。
- 修正部署编队先截断后排序造成第二个 Hydralisk 模型被选到对角远位的问题，并优先尝试
  空闲入口通道；最终合法性仍只由 Rules 决定。
- RFC8785 正常规范化移除无用的逐节点错误路径字符串分配；真实 6,229,779 字节 revision
  83 状态仍产生原历史 hash，单次 hash 为 241ms。非法值才回退到旧诊断器，保留精确路径。
- ranged LoS 从“每个模型对复制并哈希完整房间”改为只包含参战模型和 terrain/support 的
  最小几何投影；完整 252 定义目录仍保留，ranged/melee 核心动作只由专用 Runtime 枚举一次。

## 验证

矩形底座 effective-size→任务标记 LoS 聚焦门通过 `31/31`。随后只从 SQLite 断点继续
标准 2000 对局，没有重开已接受动作。最终报告：

`build/ticket-23-slice-246-standard-2000-complete-match-v1/report.json`

关键结果：

```json
{
  "terminalRound": 5,
  "acceptedActionCount": 107,
  "unitCount": 15,
  "deployedOrDestroyedUnitCount": 15,
  "abilityCoverage": { "exact": 252, "pending": 0, "unsupported": 0 },
  "finalReplayTotalAppliedCount": 107,
  "finalReplayTailAppliedCount": 11,
  "finalReplayMatchesCurrent": true,
  "providerCalls": 0,
  "costCny": 0
}
```

## 边界与下一步

本片是确定性产品 preflight，全部 action record 的 `agentDecision=false`，不冒充真实策略局。
Slice 247 才调用 live model 完成 2000 分 H-A。进入正式局前有一个 High 门禁：Unit 动作必须
由 Agent 提交队长连续路径和所有其余存活模型的明确最终摆位；凡途中地形、阻挡、接战或
特殊移动会影响合法性时，还必须提交每个模型自己的连续路径。Rules 检查全员桌内、互不
重叠、单位连续性、路径、地形和高度，系统不得替 Agent 任意摆放剩余模型。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `none_deterministic_driver_only`
- `harnessToolsCalled`: Standard Room factory、LegalSpace、Preview、Confirm、Apply、Chance、Checkpoint、Replay、SQLite resume
- `uiTraceEvidence`: 本片无新增 UI 截图；产品 Web 证据沿用 Slice 245 的 11 张成功旅程截图
- `agentDecisionEvidence`: 无；107 条动作均为 Rules 驱动的确定性 preflight，`agentDecision=false`
- `memoryTraceEvidence`: SQLite WAL、107 条 receipt、原子 progress sidecar 和 revision 96 checkpoint
- `trainingTraceCandidates`: 无；`eligibleForTraining=false`、`trainingTruth=false`
- `rollbackOrDemotionRules`: Critical/High 阻断；Medium 跟踪；依赖、签名、Replay 或完整底座合同漂移即停止，不做静默兼容
- `userVisibleChecks`: Standard 2000 双方预算、54×36、15 Unit、9 terrain、252/0/0、五回合任务生命周期和最终 Replay 报告

Provider/model/source refresh/token/cost：`0 calls / 0 tokens / false / ¥0`。
