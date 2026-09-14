# Ticket 23 / Slice 219：Standard 2000 Room 组合进展与收敛阻塞

日期：2026-09-14。状态：未收口；Ticket 23 仍为 `4/15`。

## 已完成文件和功能

- `packages/product-composition/official-standard-room-factory-v1.mjs` 新增统一 Server Factory，
  不再由测试脚本或客户端手拼 `initialStateAuthority`。
- 默认 Terran Armed Forces 与 Kerrigan's Swarm 名单分别由官方冻结快照计算到精确
  `2000 Minerals`；共 `7 + 8 = 15` 个 Unit，包含编成、升级、Specialist 模型分配、
  战术卡、槽位与 Vespene 校验。Kerrigan's Swarm 额外执行 exactly-one Creep card 条件。
- 完成 Standard engagement agreement、公开/封闭名单协议、权威 roster registry、
  玩家私有 roster 与公开 disclosure 的状态绑定。
- 完成 Hold Position + Gauntlet 的完整确定性 Draft、`54×36` 官方几何、空 Terrain
  height ledger、五个任务 Marker 放置和 Mission Runtime V2 初始化。
- 通过 Reserve lifecycle 内核生成初始 reserve resolution，并把 15 个 Unit 与其完整
  loadout、装备、底座尺寸全部置于场外等待合法 Deploy。
- `officialMissionRuntimeState` 已加入 Viewer V3 顶层字段白名单。

## 三轮定向验证事实

1. 第一次在旧 `official-cleanup-card-bundle-v1` 停止。该 bundle 只接受早期固定卡集合，
   不能冒充完整军表卡目录；修正为 roster/cardResources 持有全卡，旧 cleanup bundle
   不参与本 Slice。
2. 第二次在旧 assault-ranged 文本解析器读取 Hydralisk `Needle Spines` 时停止。该旧
   执行 bundle 不是军表成立条件，且属于 Slice 220 的通用动作覆盖，因此本 Slice 不
   再虚假声明全单位 assault/ranged runtime 已就绪。
3. 第三次已成功生成双边精确 2000 名单、15 Unit reserve、`54×36` / 5 Marker 状态，
   并成功创建 Room；最终在读取观察者公开 roster 时失败。V2 已形成正确
   `publicRosterDisclosureBySide`，但 Viewer V3 对该字段走 generic projector，动态
   `player1/player2` 键被裁掉。

第三轮错误为：

```text
TypeError: Cannot read properties of undefined (reading 'units')
```

按同一 review/验证最多三轮的收敛规则，本轮没有进行第四次代码修改和验证。

## 当前阻塞点

`packages/client-domain/viewer-projection-v3.mjs` 的 participant-map 分支覆盖了
`armyCompositionUpgradeAuditsBySide` 与 `ownTeamArmyRostersBySide`，却遗漏
`publicRosterDisclosureBySide`。下一轮必须新增一个受限 participant-map projector，
同时保留 roster public unit/card 合同字段，不能直接放开任意动态键或整棵私有树。

## 剩余步骤与具体交付物

1. `Viewer V3 roster-map patch`：公开 roster 使用 participant key 投影；玩家自己的
   authoritative roster 继续只经 V2 权限裁剪后进入 V3。
2. `Slice 219 focused receipt`：只重跑 factory→Room→observer/player projection 一次，
   证明 7/8 Unit 公开 roster、己方私有 roster 与 Mission Runtime state 均可见。
3. `Slice 219 closure`：记录确切 factory/roster/mission/deployment hash，更新路线图为
   `5/15`；不运行历史绿色门。

## 非声称

- 旧 Reserve Deploy executor 仍只覆盖 Marine；15 Unit 的通用 Deploy/动作/能力
  LegalSpace 属于 Slice 220。
- 当前完成的是 Room 初始权威数据组合，不是 2000 分完整对局。
- 没有 Provider、网络、来源刷新、Skill 修改或训练晋升。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none
- `harnessToolsCalled`: army/upgrade/roster/draft/geometry/reserve/Mission Runtime contracts
- `uiTraceEvidence`: none; network Room projection only
- `agentDecisionEvidence`: none
- `memoryTraceEvidence`: Mission Runtime state and reserve lifecycle resolution initialized
- `trainingTraceCandidates`: none; all state remains `trainingTruth=false`
- `rollbackOrDemotionRules`: old narrow executors remain explicit and are not widened silently
- `userVisibleChecks`: blocked at Viewer V3 public roster participant-map projection

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
