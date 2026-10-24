# T27 / S272 — Web 写表到正式房间的接线边界（未收口）

用户验收目标是从前端选阵营、2000 分与地图，AI 产出合法军表及绑定地图的计划，来源审查与必要修订后直接开局；不由开发者手动搬运 manifest 或运行 CLI。当前尚未达到该目标。

## 本轮改动与聚焦证据

- 写表 HTTP 入口新增 `POST /starcraft-tmg-level3/roster-planning/v1/iterative/sessions/:id/launch-room`。仅配置实际 Room launch host 时才可调用；未配置返回 `503 ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE`，不会伪装成可开局。
- 产品模块从持久的同一 iterative/Teach 会话读取军表、计划、修订历史与来源审查；核对名单、2000 分、地图种子、修订链及有效 High/Critical，再向注入的 host 提交正式军表 recipe 和 Room 后二次准入回调。浏览器提交的 plan/recipe 被忽略。host 必须按 `launchKey` 幂等，保管私密席位凭据，完成 Room、Bot 和恢复链接。此模块尚无生产 host adapter。
- 具体缺口先红：新增路由的聚焦检查得到 `404 != 201`；修改后路由模拟 host 为 201。随后使用留存真实 v5 计划及旧 V2 来源审查重建 Web 会话，预期拒绝 `409 AGENT_SELECTED_ROOM_LAUNCH_NOT_REVIEWED`，没有调用 host。完整聚焦检查一次通过；运行约六分钟，0 Provider、0 Room、¥0。
- 旧 v5 计划的 V2 审查不能冒充新版七片 V3。真实新 D 目前只有 4/7，下一片可能已发送且用量未知；不得盲目重发，也不得把旧产物导入成“已审查”。

## 尚未完成的产品交付

1. 把真实 V3 审查/修订链持久完成并给出可复核的原文裁定；处理可能已发送的请求时保留费用和回执风险。
2. 在正式 Web host 实装幂等 Room launch adapter：使用生成军表建立正式 2000 分 Room，执行 Room 后计划准入，接入真实 Bot 席位与恢复链接；失败时不能暴露半成品房间。
3. 前端提供审核状态、明确开局按钮和实际 `/room` 跳转；浏览器以真实 HTTP/Room 运行检查，而不是 mock 投影。
4. 对局、Apply/Replay、截图和成本证据仍须随后完成；此轮不计入完整人机/机机对局验收。

## Harness 回执

- `harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: []`（无模型决策）。
- `harnessToolsCalled: [persisted iterative/Teach read, source-review verification, HTTP launch adapter]`；`uiTraceEvidence: focused HTTP red/green only, no real browser Room`。
- `agentDecisionEvidence: none`; `memoryTraceEvidence: preserved source/plan lineage, no match memory`; `trainingTraceCandidates: none`。
- `rollbackOrDemotionRules: stale/missing V3 review, unresolved Critical/High, map/roster lineage drift or absent host => no Room launch`。
- `userVisibleChecks: absent host 503; old V2 review 409; configured fake host 201 only as interface proof`。

状态：T27 **5/6**，S272 仍开放；T23 **33/36**（S248–250）；T24 正式 **53/75**；三条长期链路 **0/3** 收口。本轮不提交开放 Slice 的混合工作树。
