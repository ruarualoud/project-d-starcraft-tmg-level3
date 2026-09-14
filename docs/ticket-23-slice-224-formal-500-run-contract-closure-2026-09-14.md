# Ticket 23 / Slice 224：500 分正式实验合同与能力审计收口

日期：2026-09-14。状态：完成；Ticket 23 为 `10/21`，剩余 `11` 片。

## 交付物

- `formal-experiment-run-manifest-v1.mjs` 固定 500 分 Skirmish 实验语义：
  Hold Position (Skirmish)、CHAR PLAINS、36×36、双方精确 500 分计划军表、双方各四层
  Skill 路由、独立 run seed、H-A/A-A/Review 的 `¥80/¥160/¥260` 预算、每 ¥100 通知、
  自动机器动作、实体操作任务和逐动作 Web 证据。
- `portable-foundational-skill-pack-loader-v2.mjs` 与
  `formal-foundational-skill-pack-loader-v1.mjs` 不再写死五条旧分母；它们验证唯一 General、
  可扩展 Faction/Matchup 集、唯一 ID/hash/direction、依赖与两类资格报告，实际装载 11 条。
- `deepseek-model-availability-port-v1.mjs` 从 macOS Keychain 临时读取 BYOK，仅请求官方
  `GET /models`；不发送生成请求、不保存 credential/响应正文，返回安全可观测结果。
- `ticket-23-live-provider-profiles-v1.mjs` 新增首选 `deepseek-flash`
  (DeepSeek-V4.1-Flash) 与仅开局前 `deepseek-v4-pro` fallback，开局后模型冻结。
- `provider-pricing-v2.mjs` 记录 2026-09-14 官方 Flash/Pro 最新峰谷价格；
  `live-flash-decision-port-v1.mjs` 按本局冻结模型选择版本化价格，不改写 Ticket 16/18
  历史快照。

官方依据：

- <https://api-docs.deepseek.com/api/list-models/>
- <https://api-docs.deepseek.com/quick_start/pricing/>

## 正式配置

```text
scale / points       Skirmish / 500 each
mission              Hold Position (Skirmish)
deployment           CHAR PLAINS
battlefield          36 x 36 inches
player1              3 small Marine Units; one Combat Shield; 500 Minerals
player2              Kerrigan + Kerrigan Swarm Raptor; 500 Minerals
creep card            Accelerating Creep
preferred model      deepseek-flash / DeepSeek-V4.1-Flash
pre-game fallback    deepseek-v4-pro / DeepSeek-V4-Pro-0813
```

选择该配置不是声称其平衡性或最优性已经证明，而是用最小正式规模保留多模型编队、英雄、
远程、近战、冲锋、任务控制、地形、Creep 与位置关系决策，降低首次端到端实验成本。

## 聚焦门与三轮收敛

第一轮在 Daelaam 扩展阵营资格报告暴露旧 loader 只认识原 faction handoff；第二轮加入
扩展阵营与四条扩展 matchup 的版本化资格判定后通过 11-Skill 加载，同时 `/models`
发现旧 profile 名不在当前列表。官方文档确认现名 `deepseek-flash` 对应 V4.1 Flash，旧名
虽被兼容但已退役。第三轮以新 profile/价格收敛：

```text
portable Skill entries                11
Terran -> Kerrigan Skill route          4
Kerrigan -> Terran Skill route          4
deepseek-flash available              yes
deepseek-v4-pro available             yes
availability paid calls/tokens/cost  0 / 0 / ¥0
```

示例价格核算（非真实调用）：谷时 1,000 cache-miss input + 500 output 为 `$0.00045`。

## 能力审计与路线修正

当前不能启动正式局。Slice 220 已准确报告 191 条动作路线，但其中 128 条仍为显式
unsupported；旧 Ticket 18 complete-match Adapter 主要提供 Hold/Pass 和回合终局推进，
不等价于可移动、射击、冲锋与使用卡面能力的完整比赛。Formal preflight 因而返回 High：

- `FORMAL_500_ROOM_INCOMPLETE`
- `FORMAL_ACTION_RUNTIME_INCOMPLETE`
- `FORMAL_WEB_USER_JOURNEY_INCOMPLETE`

这不是本片失败，而是预检正确阻止伪正式实验。原剩余六片扩成十一片：225 Room；
226 空间移动；227 远程；228 Charge/近战；229 卡面能力；230 总 dry-run/preflight；
231 Web；232 H-A；233 A-A；234 合并复盘；235 PDF/最终验收。

## Harness loop

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `opponent_prompt`, `selfplay_agent_prompt`, `postgame_review`
- `harnessToolsCalled`: 11-Skill loader、正式 run manifest、Keychain availability port、
  official `/models`、versioned pricing
- `uiTraceEvidence`: none；Slice 231 执行真实浏览器用户旅程
- `agentDecisionEvidence`: none；本片不发送生成请求
- `memoryTraceEvidence`: manifest 要求独立 H-A/A-A memory scope；未开局
- `trainingTraceCandidates`: none
- `rollbackOrDemotionRules`: fallback 仅开局前；开局后模型/Skill/source/seed 冻结；
  Critical/High 阻断，Medium 跟踪；unknown paid attempt 不自动重付
- `userVisibleChecks`: 正式配置、模型选择、预算、剩余动作/UI blocker 均进入 preflight

外部 Provider generation/token/成本：`0 / 0 / ¥0`；来源刷新：`false`。
