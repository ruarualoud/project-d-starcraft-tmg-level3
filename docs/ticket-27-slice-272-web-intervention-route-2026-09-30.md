# Ticket 27 / Slice 272 — Web 写表干预入口

状态：局部产品修复；Slice 272 仍开放，不能据此称“网页写表并开局”已完成。

具体断点：从头写表完成锁表 Teach 后，`source_review_required` 在网页被误判为不可续接，且生成路线页没有进入同一 Teach/Agent 计划的按钮；进入计划页后，锁表属性又把 Agent-selected 正式计划的修订入口隐藏。用户只能靠开发脚本接管来源审查及修订。

本次只改 `apps/starcraft-tmg-expo/components/roster-planning/roster-planning-workspace-panel.tsx`：待审查状态可显式续跑；显示来源审查状态及 High/Critical 数；从迭代会话打开同一 Teach 会话查看计划、审查结果和修订；Agent-selected 计划允许在名单不变时按现有后端合同修订，始终包含 `deploymentConcept`，普通锁表 Teach 计划仍不开放该入口。来源审查发送模糊时不提供盲续按钮；审查已完成时不提供空操作的续跑按钮。Room 准入及正式创建没有在前端伪装成已可用。

具体 Web 复现先红后绿：同一浏览器、同一模拟 `source_review_required` 投影，改前 `iterative-roster-resume=0`、`iterative-roster-open-teach=0`；改后两者均为 1。另一次有针对性的浏览器点击从迭代会话进入模拟的同源 Agent-selected 计划，页面展示 `High 1`，修订入口存在。此处浏览器响应是模拟投影，证明交互接线，不证明真实来源审查已完成、修订 Provider 成功或 Room 开局。

前端静态导出一次成功，生成当前 Web 包。一次 Expo TypeScript 检查未通过，错误仅在已脏的副官 `companion-catalogue-panel.tsx`、`tactical-adjutant-panel.tsx`，本次写表面板无报错；按只验证相关改动的约定，不改也不重跑无关副官代码。0 Provider/Room 调用，费用新增 ¥0。下一产品交付仍是：审查/裁定真实计划，前端发起使用同一生成名单/地图/计划的正式 Room，Bot Seat 接收 TurnPlan，浏览器凭用户席位进入并完成真实对局。

Harness 记录：`harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [iterative roster strategist, locked-roster Teach, final source review V3, opponent_prompt 待开局]`; `harnessToolsCalled: [Web workspace route, same-session read, browser click]`; `uiTraceEvidence: source_review_required red→green 0/0→1/1, simulated review High 1 + revision button`; `agentDecisionEvidence: none new`; `memoryTraceEvidence: existing Teach session ID reused, no new Room memory`; `trainingTraceCandidates: none`; `rollbackOrDemotionRules: ambiguous dispatch does not offer automatic review resend, High/Critical remains non-admissible`; `userVisibleChecks: review continuation and same-plan navigation passed, live Room launch pending`。
