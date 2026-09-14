# Ticket 23 / Slice 220：Standard 动作路由与通用部署收口

日期：2026-09-14。状态：完成；Ticket 23 为 `6/15`，剩余 `9` 片。

## 交付物

- `official-standard-action-route-catalogue-v1.mjs` 从两份实际入局 roster 和冻结官方卡面
  建立完整路由分母。15 个 Unit 共 191 条路由：15 条通用 Deploy 为
  `executable_exact`，48 条由现有窄 runtime 在具体状态继续裁决，128 条为显式
  `unsupported_explicit`。
- `official-standard-reserve-deploy-adapter-v1.mjs` 保留
  `authority.reserve-deploy-v5@5.0.0` 原子身份，以产品 Adapter 接受任意当前官方 Unit
  的真实模型数、Speed、圆形/矩形底座、入口边、Round Supply 与 3/4 英寸 coherency。
  当前路径合同故意限制为从入口边直线向内；它不是任意曲线路径的生产完备声明。
- `official-standard-action-runtime-v1.mjs` 将上述 Adapter 组合到最终 80-executor
  catalogue runtime。未实现的卡面能力只作为不可执行诊断进入 LegalSpace，不创建
  假 candidate、executor 或训练真值。
- Authority LegalSpace 现在校验并绑定 typed unsupported diagnostics 的 hash/count；
  非法诊断按 `RULE_RUNTIME_INVALID` 拒绝。
- Model-base coherency kernel 现参数化支持 Core 3 英寸与 Squadron 4 英寸，同时继续按
  完整底座而非中心点执行桌面边界、碰撞、敌方间距和连通性。

## 唯一聚焦验收

最终 action-coverage 门通过：

```text
fielded Unit                 15
action routes               191
exact Deploy routes          15
existing bounded routes      48
explicit unsupported        128
player1 Deploy domains         7
player2 Deploy domains         8
player1 phase diagnostics     14
player2 phase diagnostics     37
```

同一门实际 instantiate/apply 了两种关键几何：

- Terran Goliath：80mm 圆底（3150×3150 milli-inch）；
- Kerrigan's Swarm Hydralisk：40×100mm 矩形底（1575×3937 milli-inch）。

两者均以完整底座边缘留在 54×36 Battlefield 内，并更新 Reserve、Movement activation、
Round Supply、coherency 和动作日志。第一轮验证仅因脚本误选 40mm 单模型却断言 80mm
而停止，没有产品失败；补强 catalogue 自校验并按尺寸选择后，第二轮通过。没有重跑
任何已绿历史门。

## 冻结身份与边界

```text
Standard action runtime     d5733152d0fadf25bafe5716b13c8a5d4cae63a2698250c944c54589463296e2
action route catalogue      ba93ad582c7703f5f5088b57cc044de40a32e159ba612319a919a2685fd269ae
source snapshot             8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105
normalized dataset          b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067
```

`productionRoomEligible=false` 与 `legalSpaceComplete=false` 保持显式。当前证明的是两份
2000 分名单所有入局 Unit 都不会从动作分母消失，且任意 Unit 可按受限直线入口部署；
不证明 128 条能力已经实现，也不把 48 条窄 runtime 路由扩大解释成全状态可用。
Slice 221 接续 Hosted Opponent V2、自动机器动作和物理操作任务。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none；本片没有调用 Agent/Provider
- `harnessToolsCalled`: frozen source fixture、Standard Room Factory、final catalogue runtime、Standard action adapter、Authority LegalSpace、deploy instantiate/apply
- `uiTraceEvidence`: none；Web 用户旅程属于 Slice 225
- `agentDecisionEvidence`: none；只建立 Agent 将消费的可执行/不可执行动作合同
- `memoryTraceEvidence`: Deploy 写回 Reserve、Round Supply、activation、coherency 与 log
- `trainingTraceCandidates`: none；全部 `trainingTruth=false`
- `rollbackOrDemotionRules`: typed diagnostic 不合法则 runtime 拒绝；Adapter 或 route denominator 漂移则回退 Slice 220，禁止伪造 candidate
- `userVisibleChecks`: 7/8 Deploy domains、阶段 unsupported 数量及完整底座边界可由后续客户端展示

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。
