# Ticket 23 / Slices 215–250：全官方卡池、真实 Agent 对战、复盘实验与证据路线图

日期：2026-09-14  
状态：Slices 215–241 完成；Ticket 23 为 `27/36`，剩余 `9` 片
项目状态：原 22 Tickets 中 `21/22` 完成，Ticket 14 仅余真机验收；扩展 Ticket 23
加入后总体为 `21/23` 完成。

## 最终目标

先把冻结官方产品分母中的 26 个 Unit、37 张 Faction/Tactical Card 和 252 条卡面定义
全部接入可观察、可查询、可执行、可回放的产品 Runtime，再通过真实产品 Web UI 和稳定
大模型完成一场双方各 2000 分 Standard 人机对战、一场同配置机机对战、
两局合并复盘和基于权威 checkpoint 的反事实实验；输出逐动作截图、骰子、规则回执、
公开决策摘要、主 PDF/子 PDF、机器可读轨迹、SkillOpt 预期变化与 MuZero 候选。

Android 真机验收仍属于 Ticket 14，本 Ticket 不用模拟器或 Web 截图冒充真机证据。

## 已冻结的产品语义

- Codex 通过 Web UI 操作人类席位；机器对手由 live model 控制 Kerrigan's Swarm。
- 所有 Agent 拥有的选择点调用模型；Host 事务和 Rules/RNG 后果不调用模型。
- 机器合法动作自动 Preview/Confirm/Apply/Replay，无逐动作人工批准。
- 仅涉及玩家实际管理模型/组件时创建物理操作任务；玩家可亲自完成或委托 Agent。
- 普通拒绝不能否决合法对手动作；规则争议可暂停并进入裁判流程。
- 记录公开结构化决策摘要，不索取或披露隐藏 chain-of-thought。
- 复盘扫描所有动作，不固定只选三个局面；实验数量由证据价值和预算决定。
- 每条策略结论绑定明确 ScenarioContext、己方/对手 Skill 快照和适用/失效条件；双方
  策略可分别进化，但一次因果 A/B 只能改变一侧，避免双边同时变化造成归因混杂。
- 真实轨迹、反事实轨迹和训练资格严格分开，无自动 Skill 晋升。
- H-A ¥80、A-A ¥160、复盘/反事实 ¥260，总计 ¥500；每累计 ¥100 通知。
- 只有 Critical/High 阻断，Medium 记录；同一 review 最多三轮。

## 36 个 Slice

| Slice | 具体交付物 | 单片验证 | 完成后 |
| --- | --- | --- | --- |
| 215 | 成熟游戏 Agent/Review 调研、现有能力真值矩阵、H-A 物理操作合同、初版路线图 | 文档/代码只读审计；不跑测试 | 1/21 |
| 216 | Mission Effect IR/compiler：把 10 张官方任务的参数、触发、计分、即时胜利、动作/随机要求编译成 typed contract，旧 Hold Position 作为 Adapter | 仅运行 mission compiler 现有相关门一次 | 2/21 |
| 217 | 五张 Standard 任务 exact runtime：marker 初始化/激活、quarter supply、control transfer、Gather、Supply Drop、逐轮计分和终局 | 仅运行 Standard mission 门一次 | 3/21 |
| 218 | 五张 Skirmish 任务 exact runtime；10/10 setup→action→scoring→endgame 覆盖矩阵 | 仅运行 Skirmish/10-card aggregate 门一次 | 4/21 |
| 219 | 2000 分写表到 Room：合法军表、升级、战术卡、reserve、部署和公开/私有投影完整绑定 | 仅运行 2000 roster/deploy 门一次 | 5/21 |
| 220 | 任意入局单位的动作/能力路由分母与显式 unsupported 队列；不把已识别路线冒充为已执行 | 仅运行 action coverage 门一次 | 6/21 |
| 221 | Hosted Opponent V2：自动机器动作、通知、PhysicalOperationTask、玩家确认/委托 Agent、争议暂停和恢复 | 仅运行 hosted-opponent 合同门一次 | 7/21 |
| 222 | live Flash Decision Port：每个选择点、空间/概率工具、计划/反思/记忆、公开理由、预算/恢复、开局模型冻结与 pre-game fallback | 仅运行 Provider/decision-port 门一次；不打正式局 | 8/21 |
| 223 | Review V2：全动作扫描、多局聚合、场景条件化双策略实验、payoff 矩阵、实验 WAL、checkpoint clone、配对 RNG、对手响应搜索、hidden/held-out、SkillOpt 最小差异与回滚 | 仅运行 review/counterfactual 门一次 | 9/21 |
| 224 | 500 分正式实验合同与能力审计：11-Skill 加载、V4.1 Flash/Pro 零生成可用性、最新价格、run manifest、Critical/High preflight；真实缺口不能误放行 | 仅运行本片 preflight 门，三轮内收敛 | 10/21 |
| 225 | **Complete:** 500 分 Skirmish Room Factory：双方精确合法军表、Hold Position (Skirmish)、CHAR PLAINS、36×36、平衡地形、reserve 和公开/私有投影 | 500 roster/map/terrain 门通过 | 11/21 |
| 226 | **Complete:** 所选五个 Unit 的通用空间动作闭包：Deploy、Move、Run、Disengage、底座/编队/地形/高低差/路径与边界 | selected-roster movement 门通过：5 Unit / 20 route / unsupported 0 | 12/21 |
| 227 | **Complete:** 所选五个 Unit 的通用远程战斗闭包：武器选择、射程/LoS、攻击池、防御、伤害、伤亡、补给与骰子 | selected-roster ranged combat 门通过：4 route / no-ranged 1 / unsupported 0 | 13/21 |
| 228 | **Complete:** 所选五个 Unit 的 Charge/IMPACT/近战闭包：冲锋距离、接战、卡位、批次、近战伤亡与脱离关系 | selected-roster melee 门一次通过：5 Charge / 5 Fight / 2 IMPACT / unsupported 0 | 14/21 |
| 229 | **Complete:** 参考阵容 13 主动/9 被动能力的资源、状态、Token/Marker、Omega Worm、激活窗口与消费者接线 | selected-roster ability 门第 2 轮通过：13/9/unsupported 0 | 15/36 |
| 230 | **Complete:** 通用能力注册表、类型化 Effect IR、Action/Consumer/System 生命周期自动路由、关系图和统一调用合同 | 三轮内收敛：252 definition / 1,762 edges / 20 exact / 232 pending | 16/36 |
| 231 | **Complete:** 冻结官方 26 Unit、6 Faction Card、31 Tactical Card、252 definition 的逐项产品责任账本、唯一 owner 和缺口清单 | current-product denominator 门一次通过：20 exact / 232 pending / 252 ownership edges | 17/36 |
| 232 | **Complete:** 全卡池 Move、PLACE、Deploy、位移 permission 与边锁能力族接线；误归类的战场资产/Unit 生命周期转交正确 owner | relocation family 门第 2 轮通过；25 new + 3 existing，owner pending 0 | 18/36 |
| 233 | **Complete:** 全卡池 BUFF、DEBUFF、Status、Heal、Damage 能力族接线 | characteristic/status family 门一次通过；60 new + 5 existing，owner pending 0 | 19/36 |
| 234 | **Complete:** 51 个官方武器档案进入全产品目录，23 个 Assault 武器与 7 个远程能力定义完成动作/Consumer 接线 | 30 new / owner pending 0；分母 135 exact / 117 pending；新 E2E 门因大小写验收脚本三轮未收敛，Medium 跟踪 | 20/36 |
| 235 | **Complete:** 全卡池 Fight、Charge、逐模型 IMPACT 与近战效果接线 | 40 new / owner pending 0；目标分母 175/77；三轮门停于前置冻结数据集身份，Medium 跟踪 | 21/36 |
| 236 | **Complete:** 24 条 Reaction、12 类触发窗口、双方优先级、每激活/每回合限制及支付接线 | 第 2 轮通过 24/24、Open→Replay；目标分母 199/53 | 22/36 |
| 237 | **Complete:** Token、Marker、Indicator、Structure、Creep、Pylon 与实体组件生命周期接线 | 30 new / owner pending 0；分母 229 exact / 23 pending；圆形 Creep Tumor 28mm、Force Field 80mm、Shade 40mm | 23/36 |
| 238 | **Complete:** Summon、Respawn、返回 Reserve、设置/创建 Unit/模型与 Supply 生命周期接线，并承接 Shade/Indicator/Pylon/Omega 部署机会 | 第 2 轮通过：11 new / owner pending 0；分母 240 exact / 12 pending；实际 3 模型 Roachling Apply/Replay | 24/36 |
| 239 | **Complete:** Stalker 已激活目标 `INSTANT` 与 Queen 7 模型/每轮一次 BM 减免两个阶段/回合 consumer 接线；既有任务、计分与 Pass Runtime 不重复实现 | 分母 242 exact / 10 pending；`TARGET: All` 通配修复后 Stalker 真实射击门通过 | 25/36 |
| 240 | **Complete:** Terran 独特余项：Medic Advanced Medic Facilities、Raynor Commander/Freedom Fighters、Supply Depot Additional Supply Depots；四语境 Supply 投影不改基础值 | 第 2 轮通过：4 new / owner pending 0 / 分母 246 exact、6 pending | 26/36 |
| 241 | **Complete:** Zerg 独特余项：Queen Domineering Presence 复用 Psionic Link 支付/消费，Lair Predation 进入真实 Close Combat INSTANT consumer | 第 2 轮通过：2 new / owner pending 0 / 分母 248 exact、4 pending | 27/36 |
| 242 | **Complete:** Protoss 独特余项：Nexus Ancient Pride、Artanis Commander、Warp Gate Warp In、Khalai Bound by the Khala；首武器消费、完整底座非入口边部署和连续激活已接线 | 4 new / owner pending 0 / 分母 252 exact、0 pending；窄化终态门 exit 0 | 28/36 |
| 243 | 全官方产品分母收口：252/252 有执行角色、`unsupported=0`、无静默缺口 | 仅运行 current-product aggregate 一次 | 29/36 |
| 244 | Standard 2000 Room/军表/任务 Factory 最终绑定：双方各 2000 Minerals、≤200 Vespene、54×36 | 仅运行 2000 factory 门一次 | 30/36 |
| 245 | Web 探索性 H-A dry-run 与统一 UI 修复：写表/数据库/对战桌、悬浮副官、通知/物理任务、计划/日志/成本/截图面板 | 只对本轮修复跑一次 Web 用户旅程 | 31/36 |
| 246 | 产品 Runtime 总组合与 2000 分零 Provider 完整自动 dry-run：任务全生命周期和最终 preflight | 仅运行一场 deterministic full-match dry-run | 32/36 |
| 247 | 正式 2000 分 H-A live-model 完整局，逐动作截图/描述/骰子/回执/公开理由；预算 ≤¥80 | 一次正式局 + 权威最终 Replay | 33/36 |
| 248 | 相同配置、独立记忆的 2000 分 A-A live-model 完整局；预算 ≤¥160 | 一次正式局 + 权威最终 Replay | 34/36 |
| 249 | H-A+A-A 全动作合并复盘、必要反事实实验、策略差异/骰运/操作错误区分、SkillOpt 候选和 MuZero/counterfactual 输出；预算 ≤¥260 | 一次 review aggregate | 35/36 |
| 250 | 主 PDF 索引、按局/按回合子 PDF、JSON/NDJSON、成本与验收矩阵；最终用户验收包 | 一次 Ticket 23 evidence aggregate | 36/36 |

## 依赖顺序

```text
215 research/contracts
  -> 216 typed mission compiler
  -> 217 Standard + 218 Skirmish exact mission runtime
  -> 219 roster/deploy + 220 action coverage
  -> 221 hosted physical-operation flow
  -> 222 live decision port + 223 review/experiment runtime
  -> 224 initial formal contract/capability audit
  -> 225 500 reference Room -> 226 movement -> 227 ranged -> 228 melee
  -> 229 selected abilities -> 230 generic ability/effect routing
  -> 231 full denominator -> 232–239 shared semantic families
  -> 240 Terran -> 241 Zerg -> 242 Protoss -> 243 unsupported=0
  -> 244 Standard 2000 final Room -> 245 Web dry-run/UI closure
  -> 246 deterministic full match -> 247 H-A -> 248 A-A
  -> 249 review/counterfactual -> 250 evidence/PDF closure
```

任务执行覆盖必须先于正式对局，因为任务决定部署、动作、资源、计分和终局。Review
V2 必须在正式对局前完成，因为逐动作证据、实验 checkpoint 和后续 SkillOpt 需要在
对局发生时就保存，不能事后靠截图猜回。

## Slice 215 结论

调研报告：
`docs/research/ticket-23-llm-game-agent-review-counterfactual-research-2026-09-14.md`。

本地审计确认：

- 现有 `human-agent-learning-console-v1` 接受任意多场 Episode，但反思只是一次性
  SkillOpt 调用；没有实验 WAL、同 checkpoint 配对分支、混杂控制或 hidden 评测。
- 现有复盘也没有绑定双方策略版本的 ScenarioContext/payoff 矩阵，无法区分稳定策略、
  针对旧对手的 exploit、对手反制和双方同时变化造成的混杂。
- 现有 `turn-plan-runtime-v1` 有异步、只读、state/LegalSpace 绑定的假设动作骨架，
  但还没有把历史动作前 checkpoint 还原成 exact Rules 实验单元。
- 现有 `hosted-bot-seat-runtime-v1` 已实现一次对局授权后的数字自动执行，但缺少
  玩家实际模型/组件的物理操作任务、委托、同步阻塞和争议恢复。
- 官方 10 张任务 profile 已导入；`official-gameplay-data-bundle-v1` 仍硬拒绝除
  Standard Hold Position 外的任务，所以可执行覆盖是 `1/10`，不是 `10/10`。
- Ticket 20 的 H-A/A-A 为 Provider `0` 的 Marine/Zergling bounded fixture，不能
  代替本 Ticket 的真实模型、500 分 Skirmish、多单位与完整任务生命周期验收。

Slice 215 没有代码、Provider 或来源更新，外部 token/成本为 `0 / ¥0`。

## Slice 216–218 进展

Slice 216 已交付 10-card typed Mission Effect IR 与旧 Standard Hold Position Adapter；
Slice 217 已交付五张 Standard 任务共用的 setup/start/Gather/scoring/endgame Runtime；
Slice 218 将它参数化为 Standard+Skirmish 统一 V2，补齐 36×36 Quarter 几何、五张
Skirmish 生命周期和可供权威组合层消费的 lifecycle LegalSpace/ChanceRequest seam。
10 张任务子 Runtime 当前为 `10/10`；旧 Standard V1 runtime hash 未漂移。它仍不能被
误报为已经进入产品 Room：统一 V2 与现有 80-executor Authority Runtime 的最终组合、
2000 分状态初始化和 Web 用户旅程分别在后续 Slice 完成。闭包记录：

- `docs/ticket-23-slice-216-mission-effect-ir-closure-2026-09-14.md`
- `docs/ticket-23-slice-217-standard-mission-runtime-closure-2026-09-14.md`
- `docs/ticket-23-slice-218-ten-mission-runtime-closure-2026-09-14.md`

## Slice 219 收口

Standard 2000 Server Factory 已从冻结官方数据生成精确 `2000 + 2000` Minerals、
`7 + 8` Unit、全 reserve、Hold Position + Gauntlet、`54×36` 与五 Marker 的权威 Room
初始状态。Viewer V3 现以 roster 专用 participant-map 投影公开卡/单位，并仅在 V2 权限
裁剪后投影己方完整编成/升级；Mission Runtime state 也使用显式顶层合同。最终聚焦门从
真实 Room 同时读到观察者 `7/8` 公开 roster、玩家自己的 `7` Unit 私有 roster 与
Standard Mission Runtime。旧 cleanup/assault/Reserve Deploy 的窄范围没有被冒充成
通用覆盖；该边界随后由 Slice 220 的通用 Deploy/动作路由承接。闭包记录：
`docs/ticket-23-slice-219-standard-2000-room-closure-2026-09-14.md`。

## Slice 220 收口

两份 2000 分 roster 的 15 个 Unit 已从冻结官方卡面编译出 191 条动作路由：15 条
通用 Deploy exact、48 条现有窄 runtime、128 条显式 unsupported。产品 Runtime
Adapter 为两边生成 `7/8` 个真实模型数/Speed/底座/入口/供应/coherency 约束的 Deploy
domain；Authority 将 unsupported 作为 hash-bound 非执行诊断，而不是假 candidate。
聚焦门实际部署 80mm 圆底 Goliath 和 40×100mm 矩形底 Hydralisk，并证明完整底座边缘
留在 54×36 桌面内。由于仍有 128 条未实现路由且 Deploy 路径是受限直线，
`legalSpaceComplete=false`、`productionRoomEligible=false`。闭包记录：
`docs/ticket-23-slice-220-standard-action-routing-closure-2026-09-14.md`。

## Slice 221 收口

Hosted Opponent V2 复用既有一次性 Bot 席位授权和自动 Host 事务，新增实体状态 diff、
可恢复动作前 observation、PhysicalOperationTask、共享 mutation gate、通知、本人完成、
Agent 委托及规则争议/裁决。聚焦门证明权威 Apply 后断网不会重复模型决策或丢实体任务，
pending/dispute 会暂停后续 mutation，移除模型与血量/状态记录能由人类同步。普通拒绝
合法对手动作没有入口，待同步任务不回滚数字事实。闭包记录：
`docs/ticket-23-slice-221-hosted-opponent-physical-operation-closure-2026-09-14.md`。

## Slice 222 收口

Live Flash Decision Port 现把每个 Agent-owned choice 绑定到当前 state、LegalSpace 和空间
ActionSpace，并消费冻结策略 Skill、同局记忆、TurnPlan 与异步预演。它支持 typed
spatial/probability query round、公开决策摘要、每局预算/max-call epoch 和 SQLite WAL/CAS
决策持久化。Provider 调用前先落 `may-have-started`，重启后不得自动重付；同一选择点的
已完成结果幂等复用。模型只允许开局前 fallback，开局后冻结。唯一聚焦门通过
query→decision、缓存重放、重启 commit-unknown 阻断和新 match 计数清零；使用注入
Provider，所以实际 token/费用为零。闭包记录：
`docs/ticket-23-slice-222-live-flash-decision-port-closure-2026-09-14.md`。

## Slice 223 收口

Postgame Review V2 现接受多场 Replay-verified Episode，对 development 两局的每个动作
完成全量扫描后才按证据价值/预算调度实验；不再使用固定三个局面。每个动作绑定显式
ScenarioContext、动作前 exact checkpoint 以及双方 Skill/model/Prompt 快照。配对实验使用
同 checkpoint、同随机流和同对手策略，一次只替换一侧 Skill；多个冻结对手策略形成按
development/held-out 分隔的 payoff matrix。SQLite WAL/CAS 在每个外部 arm 前落账，
重启能按 execution key 找回已执行结果，unknown 不自动重发。输出仅为带适用/失效条件、
parent rollback 的 SkillOpt/Memento quarantine candidate，不自动晋升、改规则或成为训练
真值。唯一注入门一次通过 3 Episode / 5-action denominator / 6 paired experiments / 4 matrix
cells，并恢复一个已执行但回包丢失的 arm，实际执行仍为一次。闭包记录：
`docs/ticket-23-slice-223-postgame-review-v2-closure-2026-09-14.md`。

## Slice 224 收口

> 2026-09-14 后续范围修订：本节记录当时的历史决定；用户随后把最终验收重新指定为
> 双方各 `2000` 分 Standard，并要求在正式对局前完成全官方卡池产品接线。历史 500 分
> Manifest 保留为参考闭环，最终门以 Slices 230–250 的现行表为准。

正式实验当时改按用户确认的 `500` 分执行，而不是旧路线图误写的 2000 分。Manifest 固定
Skirmish、Hold Position (Skirmish)、CHAR PLAINS、36×36、双方精确 500 分计划军表、
两条四层策略 Skill 路由、H-A/A-A/Review 的 `¥80/¥160/¥260` 独立预算、每累计 ¥100
通知和逐动作 Web 证据要求。现有 portable loader 已从写死 5 条改为验证任意扩展分母，
并成功装载全部 11 个 Skill。

官方 `/models` 零生成检查确认 `deepseek-flash` 与 `deepseek-v4-pro` 当前均可用；新版本
profile 使用 `deepseek-flash`（DeepSeek-V4.1-Flash）为首选，Pro 仅允许开局前 fallback，
开局后冻结。最新价格以独立 V2 快照进入 live decision 预算估算，Ticket 16/18 历史 profile
和价格证据未被改写。检查没有发送 prompt，Provider generation/token/cost 为 `0/0/¥0`。

能力审计也纠正了路线图的 Critical 低估：Slice 220 的 191 条路线中仍有 128 条
`unsupported_explicit`，旧 complete-match Adapter 只能推进阶段，不能代表完整移动/攻击。
因此当前 formal preflight 正确拒绝启动，并把 500 Room、所选 roster 的移动/远程/近战/
能力闭包及总 dry-run 显式展开为 Slices 225–230；Web 和正式实验顺延到 231–235。闭包记录：
`docs/ticket-23-slice-224-formal-500-run-contract-closure-2026-09-14.md`。

## Slice 225 收口

独立 500 分 Skirmish Room Factory 已从冻结官方数据构建双方精确合法军表、
Hold Position (Skirmish)、CHAR PLAINS 36×36、七件认证平衡地形、五个 Unit/
二十五模型 reserve，以及公共/双方私有 Viewer V3 投影。组合过程没有复用 Standard
任务假身份，并修复了双卡集合顺序和 Skirmish 1/2/5 marker 分母。聚焦门通过
`500/500` Minerals、两条独立火力线和零私有资源泄漏；Provider token/cost 为零。
完整动作仍由 Slices 226–230 负责。闭包记录：
`docs/ticket-23-slice-225-skirmish-500-room-closure-2026-09-14.md`。

## Slice 226 收口

五个所选 Unit 现共享 Deploy、Move、Run、Disengage 的 20 条参数化空间路由。Runtime
按当前模型数读取官方 Speed，检查 32/40mm 完整底座的扫掠路径、棋盘边界、碰撞、
3/4 英寸编队、Entry Edge/Supply、Grass、普通/不可通行地形、高地支撑、access point、
Raptor Strain 及 Disengage Tactical Mass。LegalSpace、Preview、Apply 与 spatial query
共用同一实例化链。聚焦门通过 Marine/Kerrigan/Raptor 的部署、移动和奔跑，并覆盖高地、
脱离及完整底座边界；不声称任意 roster 或尚缺 Rules-owned 证明的无合法脱离落点分支。
闭包记录：
`docs/ticket-23-slice-226-selected-roster-spatial-actions-closure-2026-09-14.md`。

## Slice 227 收口

三个 Marine Unit 的 C-14 rifle 与 Kerrigan 的 Energy Blast 已组成四条精确远程路由；
Raptor 无 Assault 远程武器，作为合法无动作记录，unsupported 为 0。Runtime 对完整
模型对执行圆底边缘射程、Grass/普通地形、高地 effective Size/LoS、接战目标限制，按
合格攻击模型数构造 Unit 武器批次并结算 Hit/Surge/Armour/Evade/Damage。多模型伤亡、
Current Supply、Unit 销毁、交替激活、Disengage 限制消费及任务使用的 Supply Loss Ledger
均原子更新；Preview/query/Apply 共用同一计划。聚焦门通过 4 route、6×6 模型对、
12 damage/6 casualty、1 Supply 归因和 high-ground Evade；来源/Provider/训练真值均未更新。
闭包记录：
`docs/ticket-23-slice-227-selected-roster-ranged-actions-closure-2026-09-14.md`。

## Slice 228 收口

五个所选 Unit 已具有 5 条 Charge、5 条 Fight 与 Kerrigan/Raptor 的 2 条强制 IMPACT
精确路由。Charge 采用声明→D6→成功几何/失败证明的分段状态机，检查完整底座扫掠、
目标声明、合法接战、禁止穿模/未声明接战和编队；Fight 支持拒绝或执行 Close Ranks，
完整派生 Fighting/Supporting Rank 后按 printed RoA 分配多目标骰池。Kerrigan Critical
Hit 只转移已有命中，Raptor Surge D6 与 INSTANT Reaction lock 进入实际结算。伤害、
多模型伤亡、Current Supply、激活交替、Supply Loss Ledger 与日志原子更新。
Room Factory `1.3.0` 强制绑定 V2 Attack Profile Catalogue 与 melee descriptor。
唯一聚焦门一次通过 12 route、Marine `3+3` rank、Critical Hit、Surge/INSTANT 和 1 Supply
归因；来源/Provider/训练真值均未更新。闭包记录：
`docs/ticket-23-slice-228-selected-roster-melee-actions-closure-2026-09-14.md`。

## Slice 229 收口

参考阵容已从冻结官方数据编译 `13` 主动路由和 `9` 被动绑定，selected
ability unsupported 为零。Rules-owned LegalSpace 统一管理动作前/后窗口、目标、
资源支付、卡牌耗竭、PLACE/Omega Worm 几何和清理刷新；移动、脱离、射击、
冲锋、IMPACT 和近战消费者实际读取 Speed、Precision、Evade 及命中修正。无武器
Omega Worm 使用 Structure target-only 防御 Profile，不放宽旧武器编译器。聚焦门第
1 轮发现该类型缺口，第 2 轮通过 13/9/0、Stimpack 2/7/3、Combat Shield Evade
和 Omega Worm 实体生成；未跑历史全量门。闭包记录：
`docs/ticket-23-slice-229-selected-roster-abilities-closure-2026-09-14.md`。

## Slice 230 收口

冻结官方 `26 Unit + 37 Card` 的 `252` 条 definition 已进入同一个 typed IR catalogue，
并自动分类为 `138 Action / 24 Reaction / 51 Consumer / 39 System`。深模块只暴露一个
`dispatch` Interface，现有 selected exact Runtime 与 pending-family diagnostic 作为两个
Adapter；后者永不产生可执行 candidate。当前 `20 exact / 232 pending` 是 definition
分母，不把同一 Stimpack 展开到三队 Marine 后的实例动作重复计数。关系图随 compiler
自动生成 `1,762` 条边；Factory `1.5.0` 已绑定 catalogue/runtime。聚焦门在第 3 轮内
收敛并证明全产品诊断、Tactical Retreat Preview/Apply/Replay 和 phase-end cleanup。
闭包记录：
`docs/ticket-23-slice-230-ability-effect-runtime-closure-2026-09-14.md`。

## Slice 231 收口

当前官方产品能力账本精确覆盖 `26 Unit + 6 Faction Card + 31 Tactical Card = 63`
个来源记录和 `252` 条 definition。每条 obligation 有且只有一个 Slice 232–242 主 owner，
并进入 `252` 条 ownership edge；当前为 `20 exact / 232 pending`。pending 按 owner
精确拆为 `34/60/30/40/24/26/3/2/5/2/6`，后续每片从同一账本扣减，不能以局部
阵容门替代全产品分母。Factory `1.6.0` 已绑定 denominator。唯一聚焦门一次通过。
闭包记录：
`docs/ticket-23-slice-231-current-product-ability-denominator-closure-2026-09-14.md`。

## Slice 232 收口

位移 Adapter 将 Slice 231 预账本中的 relocation 原文逐条复核后，纠正 9 条主 owner：
6 条 Indicator/战场实体进入 Slice 237，3 条返回/设置 Unit 进入 Slice 238。真实位移分母
为 `28 = 3 selected exact + 25 new`，25 条新定义编译为 Burrow permission、Raptor terrain
permission、DISPLACEMENT、deploy Stimpack discount、Entry/Friendly-anchor PLACE、直接
PLACE、额外 Move、非 Entry Edge Deploy 与 ComSat edge lock 十类。统一 Runtime 当前为
`45 exact / 207 pending`，Slice 232 pending 为 0。

几何使用完整圆/矩形底座和完整编队，不用棋子中心代替合法边界；Hydralisk 40×100mm
矩形底 Entry PLACE、Zealot 2 英寸额外 Move、ComSat round-end expiry 与 Query consumer
均通过 Preview→Apply→Replay。聚焦门第 1 轮发现 Router 未读取嵌套 request executor，
修复 Seam 后第 2 轮通过且不再重跑。闭包记录：
`docs/ticket-23-slice-232-current-product-relocation-family-closure-2026-09-14.md`。

## Slice 233 收口

特征/状态 Adapter 将 owner 233 的 `60` 条 pending 原文逐条编译为 `28` 个共享语义族，
覆盖主动资源支付、BUFF/DEBUFF/Status、Burrow/Hidden、HEAL、NON-LETHAL DAMAGE、
首把武器增益、Guardian Shield/Target Lock，以及被动武器关键词、首次 Armour Roll、
Detection、Hit Points、4 英寸 Coherency、Regeneration 和条件式近远战修正。加上 Slice 229
已有 5 条，本 owner 为 `65/65 exact`；全产品账本推进到 `105 exact / 147 pending`。

统一 Runtime 增加 `activation_start` 与 `action_performed` 生命周期事件；所有主动效果、
状态 marker、资源耗竭与消费者投影仍通过同一 Adapter Interface。后续移动/远程/近战
Module 只通过 query Seam 消费 modifier，不复制规则原文。唯一聚焦门首轮通过 60/60
编译、Adrenal Overload BM 支付、Preview→Apply→Replay、IMPACT +1 与 Squadron 4 英寸
投影。闭包记录：
`docs/ticket-23-slice-233-current-product-characteristic-status-family-closure-2026-09-14.md`。

## Slices 234–235 收口

Slice 234 把 23 个 Assault weapon 与 7 条 ranged consumer 接入全产品远程攻击
Adapter，推进到 `135 exact / 117 pending`；其三轮内联门留下规范武器名大小写的 Medium
证据债务。Slice 235 再绑定 28 个 Combat weapon、11 条新增 Devastating Charge 和
My Life for Aiur，目标账本推进到 `175 exact / 77 pending`。IMPACT 已纠正为逐个
Fighting/Supporting Rank 合格模型各生成 X 骰，并按该模型实际对抗的 Enemy Unit 分配；
近战同时消费 Target、替换武器、Precision、Anti-Evade、Pierce、Titan Killers、Shield、
伤亡和 Supply。

Slice 235 三轮门分别遇到一处已修语法错误，以及两次发生在新逻辑之前的冻结数据集
fixture 身份拒绝。因此新增模块完成并可解析，但没有新的 Factory/Apply/Replay 绿色回执；
按 Only Critical/High block 作为 Medium 集成证据债务保留。Slice 243 必须用当时权威
冻结装配入口同时清偿 234/235 两项。闭包记录：

- `docs/ticket-23-slice-234-current-product-ranged-family-closure-2026-09-14.md`
- `docs/ticket-23-slice-235-current-product-melee-family-closure-2026-09-14.md`

## Slices 236–241 收口

Slice 236 把 24 条 Reaction 接入双方优先级、资源支付、每激活/每回合限制和 12 类触发
窗口；Slice 237 把 30 条 Token/Marker/Indicator/Structure/Creep/Pylon 定义接入实体组件和
战斗消费者；Slice 238 再把 11 条 pending Unit lifecycle 定义接入召唤、重生、召回、
Reserve 和跨 family 回合末机会。Slice 239 接入 Stalker Fury 的阶段激活条件与 Queen
Psionic Link 的完整模型/回合支付条件，并修正所有远程武器 `TARGET: All` 被误当普通标签的
生产缺口。Slice 240 再把 Medic、Jim Raynor 和 Supply Depot 的四条 Supply 定义拆成
Supply Pool、Marker、Objective、Disengage 四个上下文投影，基础 `currentSupply` 不变。
Slice 241 将 Domineering Presence 接入同一 Psionic Link 支付账本，并让 Predation 同时影响
Fight 声明域与实际 chance plan 的 INSTANT/Reaction。当前产品账本为
`248 exact / 4 pending`，owner 236–241 均为 pending 0。

Slice 238 聚焦门第 1 轮正确拒绝只有 1 Biomass、却尝试支付 2 Biomass 的旧 500 分夹具，
并发现 Omega Network 应按每轮累计 Supply≤2，而非首个部署后锁死；第 2 轮以合法资源
通过 11-route、三模型 Roachling Preview→Apply→Replay。闭包记录：

- `docs/ticket-23-slice-236-current-product-reaction-family-closure-2026-09-14.md`
- `docs/ticket-23-slice-237-current-product-battlefield-asset-family-closure-2026-09-14.md`
- `docs/ticket-23-slice-238-current-product-unit-lifecycle-family-closure-2026-09-14.md`
- `docs/ticket-23-slice-239-current-product-match-lifecycle-family-closure-2026-09-15.md`
- `docs/ticket-23-slice-240-current-product-terran-unique-family-closure-2026-09-15.md`
- `docs/ticket-23-slice-241-current-product-zerg-unique-family-closure-2026-09-15.md`

## 验证与成本规则

- 已通过门不重跑；每次代码变更只跑一条确实受影响的门，且最多一次。
- 不为普通新功能另写重复测试；若现有门无法表达新合同，先记录具体可复现缺口，再
  新增最小验证，不扩展为全量回归。
- 同一验证无新代码不得重跑；三轮不收敛则停止并报告具体 blocker。
- 只有提交成功的 Provider 回执计入 token/费用；超时且状态未知进入人工判定，不能
  自动重付。
- 每个正式局独立 budget epoch；累计 ledger 保留，max-call 在新 run window 清零。

## 非声称

Slice 215 只冻结方案，不证明任务 runtime、完整卡池、live Flash、物理操作、真实
H-A/A-A、复盘改进或 PDF 已完成。它们必须分别由 216–250 的具体交付物证明。
