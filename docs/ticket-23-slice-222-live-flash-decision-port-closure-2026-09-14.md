# Ticket 23 / Slice 222：Live Flash Decision Port 收口

日期：2026-09-14。状态：完成；Ticket 23 为 `8/15`，剩余 `7` 片。

## 交付物

- `live-flash-decision-port-v1.mjs` 是 Hosted Bot 与既有安全 Provider Gateway
  之间的决策深模块。每个 Rules-owned 选择点以 state、LegalSpace 和空间 ActionSpace
  共同构成幂等 identity；同一 identity 返回已落盘决策，不再付费。
- 模型生命周期是 `preferred -> pre-game fallback -> match-frozen`。Fallback 只发生在
  `openMatch` 前；开局后 Provider profile、模型和策略 Skill snapshot 均冻结，不能在局中
  静默切换。当前稳定目标是 `deepseek-v4-flash`，真实 endpoint 可用性留给 Slice 224。
- Prompt 消费玩家视角 Room、LegalSpace、完整空间 observation/action domains、同局记忆、
  TurnPlan、异步预演和冻结策略 Skill。模型可先请求 typed spatial/probability query，Host
  调用既有只读 query runtime 后再请求最终决策；Rules、Confirm、Apply 权限始终不交给模型。
- 最终输出同时包含合法 proposal、计划评估/修订、ActionIntent、对手反制、己方再反制、
  tradeoff、风险和可展示公开摘要。Provider 多余字段被忽略；隐藏 chain-of-thought 不索取、
  不进入持久记录。唯一硬敏感拦截是 API credential material。
- 每次外部调用前先写 `provider_call_may_have_started`。若进程在发送/回写边界中断，新实例
  返回 commit-unknown 且不自动重付；只有显式证明 `definitely_not_sent` 才进入 retry-ready。
  每场新 match epoch 重置 max-call，历史 Provider ledger 与本场累计 token/成本不清除。
- `sqlite-live-decision-store-v1.mjs` 提供 WAL + FULL synchronous + revision CAS 持久 Adapter；
  进程内 store 只用于开发。Hosted Bot trace 现在保留 `publicDecisionSummary`，显式 retry
  也会传入 Decision Port。

## 唯一聚焦门

一次通过，使用注入 Provider（没有真实付费请求）：

- preferred 测试 profile 不可用，开局前选择 stable `deepseek-v4-flash`；
- 第一选择点先发出一次 `fire_zone_exchange` typed query，再在第二次 Provider 调用返回
  最终动作；query receipt 被纳入 ActionIntent 和公开摘要；
- 同一 authority/ActionSpace 再次调用得到缓存结果，Provider 调用数保持 `2`；
- Provider 返回的 harmless extra field 与 `chainOfThought` 字段均未进入持久决策；
- 另一场 match 在调用可能已发送时模拟服务重启，新 runtime 返回
  `LIVE_DECISION_PROVIDER_COMMIT_UNKNOWN`，Provider 调用数保持 `3`，没有自动重发；
- 原调用落盘后，新 runtime 读取同一决策为 idempotent replay；第二场 max-call epoch 显示
  `1`，没有继承第一场的 `2`；
- 首场保守成本估计为 `8,924 CNY micros` 的注入用量示例，不是账单；外部实际成本为零。

## 边界

本片证明 Provider/decision-port 合同和恢复语义，不证明真实 endpoint、BYOK attachment、
2000 分完整对局或策略强度。正式模型 endpoint、版本/数据/Skill/军表/任务/地图/seed/预算
冻结属于 Slice 224；正式 H-A/A-A 分别属于 Slices 226/227。当前任意 roster 的 128 条
显式 unsupported action route 仍由 Slice 220 的产品边界阻止 production claim。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `opponent_prompt`, `selfplay_agent_prompt`
- `harnessToolsCalled`: profile preflight, resolve frozen strategy Skills, read player Room/LegalSpace/spatial ActionSpace/memory/TurnPlan/preexecution, typed spatial query, Provider decision, decision WAL read/write
- `uiTraceEvidence`: none；Web 组合与用户旅程属于 Slice 225
- `agentDecisionEvidence`: query→decision 两轮、合法 current ActionSpace proposal、公开计划/目的/反制摘要
- `memoryTraceEvidence`: same-match memory、TurnPlan 和异步预演进入 prompt；无 hidden chain-of-thought 持久化
- `trainingTraceCandidates`: none；全部 `trainingTruth=false`
- `rollbackOrDemotionRules`: unknown egress 禁止自动 retry；开局后模型/Skill 不切换；Critical/High 阻断，Medium alias drift 记录继续；每场 max-call epoch 独立
- `userVisibleChecks`: 公开决策摘要、Provider/token/成本、query receipt、fallback/frozen model、commit-unknown 状态均可投影

Provider/model/source refresh/token/cost：`0 / 0 / false / 0 / ¥0`。

