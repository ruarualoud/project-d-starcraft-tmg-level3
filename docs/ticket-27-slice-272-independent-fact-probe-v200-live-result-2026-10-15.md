# T27 / S272 — B 独立事实调查 v200：原生支付成功，Teach 尚未准出

日期：2026-10-15 CST。对应用户明确批准的**一次**独立事实调查，不是新一轮整套 Teach 或对局。

## 结论

独立事实角色在本例有效：旧 v198 没有发出查询、声称工具不存在；v200 发出了 3 批共 10 个查询，并在合法的假设 Movement 场景中用真实 Native 动作执行了 Raynor Orders。规则器确认支付 1 CP、耗尽 `faction:player1`，并对 `u-marauder-1` 应用 `critical_hit_2`。

但整个问题仍是 `unresolved`。已直接核对保存的 `synthesisRaw` 和限定后的 `synthesis`：**模型原答已经是 unresolved，并非检查器把成功改成失败。** 模型承认了这次支付，却将剩余要求扩大成“所有情形的一般支付覆盖合同”。具体假设场景成功不等于所有协同、进场时序都已证明；也不应把这一已证实的支付继续称为工具完全不支持。

没有自动接受 Plan、没有人工填答案、没有启动四组对局。B 保持 Plan19，A 未运行新试验。

## 授权边界与真实执行

- 仅 B 的 `q-timing-synergy-enabling-order`；最多 3 个工具往返批次，实际 3 批。
- 原 workspace、旧 Plan、历史回执和费用均保留；不新建房间、不重置历史。
- 实际 3 次调查模型调用 + 1 次最终汇总，共 4 次模型调用。
- 原生执行发生在隔离假设分支，`mutatesSourceState:false`，不是游戏房间动作，也不证明真实进场历史。
- 运行窗口：2026-10-15 02:33:50.807 至 02:40:00.664 CST。终态 `completed`、`failure:null`；completed 指本次调查结束，不是 Teach 通过。
- 本次没有修改生产代码、没有重跑旧绿测试、没有创建代理、提交、删除或更新官方数据。

观察入口：`build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v200-B-teach-fact-probe-progress.private.json`。

原始工作台：`build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json`。不要复制该大文件到报告；只读检查时在短生命周期子进程中解析并返回明确小字段。

## 三批查询发生了什么

| 批次 | 查询数 | 实际结果 |
| --- | ---: | --- |
| 1 | 3 | 未找到引用的假设队形，另两次连续性输入无效。没有支付证明。 |
| 2 | 4 | 读回旧 Assault 分支；含占位符的 Native 请求被拒绝；成功建立 Movement 几何场景并返回真实动作域；完成只读 builder 比较。 |
| 3 | 3 | 将 Movement Orders 域用于旧 Assault 分支被正确拒绝；在正确 Movement 父分支成功执行 Orders；旧 Assault 分支控点查询返回成功。 |

共 5 个查询返回 unknown，5 个返回有条件/上下文证据。错误均保留，不用成功的后继抹除历史。后两批确实向正确原生执行推进，因此不再是旧版本“queries=[]”的原地循环。

### 成功支付的精确证据

父查询：`q-timing-synergy-enabling-order-movement-orders-geometry`。

- phase `movement`，active side `player1`。
- Raynor `(27,18)`、Marauder `(27,20)`；假设几何，不宣称实际到达。
- 父状态 hash：`665a57be56af3d9a6cc3d3d455bda2ac1ff495022709ee1d9116d573f3a88d28`。

执行查询：`q-timing-synergy-enabling-order-orders-native-action-movement`。

```json
{
  "branchIdRef": "q-timing-synergy-enabling-order-movement-orders-geometry",
  "seatKey": "player1",
  "spec": { "kind": "native_action" },
  "domainId": "sc-domain-d46299938d59546963d75644aa1cd944eaa9a3085778a4e7896fda9b2938cd5e",
  "parameters": {
    "activeUnitId": "u-raynor-1",
    "targetUnitId": "u-marauder-1",
    "choice": "critical_hit_2",
    "paymentCardInstanceIds": ["faction:player1"]
  }
}
```

上面为可读展示；实际请求的 domainId/parameters 位于 `argumentsJson` 内，并非新增 API。

实际回执：

- `resultStatus:"ok"`，`nativeTransitionsApplied:1`。
- `ability_resource_paid`：resourceType `CP`，resourceCost `1`，exhaustedCardInstanceIds `["faction:player1"]`。
- `orders_applied`：sourcePieceId `u-raynor-1`，targetPieceId `u-marauder-1`，choice `critical_hit_2`。
- 后态 `cardResources` 中该阵营卡变为 exhausted。
- 后继状态 hash：`94b95b3691947e61ef56644ccd9d42ae7673060bce7a17497496de428bd94b96`。
- Native 回执 hash：`41bd700e19af5402ff41fb0b6cc1a24a155de7e11b180b1c5117fd811a57aace`。
- 外层证据 hash：`bd1b77b9dfaedb40f9948c20d38f361140bc73d8f3d2fe87a8829a56393bdcd0`。
- `authorityClaim:native_action_on_hypothetical_parent_not_live_or_arrival_history`，`provenArrivalHistory:false`。

不能据此说 Orders 能在 Assault 使用：同批错误分支请求被 `PREGAME_LAB_NATIVE_ACTION_DOMAIN_NOT_IN_PARENT` 拒绝。

## 尚未解决的两个层次

### 1. 汇总角色的判定范围漂移

原问题包含协同先后顺序、当前哪张 ready 卡能支付、使能单位晚行动或先被移除怎么办；没有要求单次实验证明任意场景的一般支付定理。原始汇总承认原生支付成功后，仍以缺少 general payment-coverage contract 为未解理由，并引用旧 Skill 中另一项时序不确定性。

事实调查输入已经隔离历史战略结论，但 `roster-teach-framework-v1.mjs` 的最终汇总仍同时收到完整旧 Plan/context、agenda 中的旧未解假设、历史调查理由及当前原始证据。**这是后续要修正的证据归并/完成条件问题，不是再给支付工具换名字。** 本次只证明症状和数据路径，不宣称已证明哪一段旧文本单独造成模型判定。

下一具体交付物：按原问题分解“已证实事实／被反证事实／剩余待查条件”，用当前有效回执更新对应假设；保留战略判断归模型，不能把单场景成功提升为全局证明，不能靠人工改 disposition 放行。

### 2. 两条定量证据路径错误

**后续来源修正（v201，2026-10-15）**：下述第一条路径实际上存在于交付给模型的 `nativeActionEvidence` 展示视图中，是限定器只读原始结构造成误判，不能归咎为模型编造。已用保存回复 RED→GREEN 修复同源展示读取；第二条仍是真实路径缺层。参见 [v201–v202 修复报告](ticket-27-slice-272-synthesis-evidence-reconciliation-v201-v202-2026-10-15.md)。以下保留 v200 当时观察，原始回复未改。

模型提供的支付数值路径是 `nativeActionEvidence[0].nativeEvents[0].resourceCost`；在它所引用的外层证据中，实际值位于 `sourceReceipt.nativeEvents[0].resourceCost`，值为 1。

另一条控点数值路径 `sourceReceipt.result.markerResults[1].supplyTotals.player1` 也没有绑定成功；本报告不把模型声称的控点数值当作已验证事实。

两条均被限定器准确记为 `quantitativeEvidence.status:"unknown"`。该问题应通过同源显式数值地址/局部引用纠错修复，不应任意递归搜索同名数字或手填推测值。当前限定器不会仅因这两条路径错误强制整个回答 unresolved；本例原始回答已 unresolved，`hostEvidenceStatus` 仍为 advisory。

下一具体交付物：用这两条已保存的错误引用复现定量绑定问题，只修对应引用合同/局部纠错；不重跑无关测试或整套付费调查。

## 费用与耗时

使用项目现有 `provider-pricing-v2.mjs` 冻结价格、实际缓存命中/未命中用量计算，不代表服务商最终账单，也不是本次联网重新查价。

| 调用 | units | Provider latency | 冻结估算 US$ |
| --- | ---: | ---: | ---: |
| 调查 1 | 121,793 | 24.212 s | 0.019388886 |
| 调查 2 | 140,222 | 27.407 s | 0.022744788 |
| 调查 3 | 160,856 | 23.433 s | 0.025065438 |
| 汇总 | 659,645 | 51.915 s | 0.021162270 |
| 合计 | **1,082,516** | **126.967 s** | **0.088361382** |

观察器启动至终态约 369.857 s，其中首次模型请求之前约 114.904 s；其余包含工作台上下文准备、原生查询、持久化和观察轮询，不能把全部时间算作模型时间或真实对局行动延迟。汇总占本次约 61% units，后续优化可研究同源问题级汇总，但不得丢失策略所需上下文。

B 累计：251 → **255 calls**；34,577,698 → **35,660,214 units**。A 仍 165 calls / 29,776,463 units。旧账不重置。

## 续接顺序与禁止事项

1. 本次一次性真实调查已经结束，不重新提交 v200，也不因观察器退出重启同一付费任务。
2. 完成上述问题级事实归并、定量引用局部纠错后，再决定需要的最小新验证；本次批准不是无限追加调查授权。
3. B 仍 1 未解，Plan19 `proposed_not_applied`；A 原问题未动，Plan9 不变。不能据本报告自动通过 A/B 或恢复四局。
4. 后续 Plan 终审与消费者工具同源检查通过后，才按同版链路续跑对局；不重新初始化房间、不重跑已通过门禁。

进度：T27 **5/6**、T23 **33/36**；主线剩 Slice **272（Teach/Plan 收口）、248（对局验收）、249（复盘实验）、250（交付收口）**，完整验收对局 **0/12**。本次是事实调查取得进展，不是 Slice 完成。其余 18 张经典地图仍按用户顺序后置。
