# Ticket 23 / Slices 215–250：全官方卡池、真实 Agent 对战、复盘实验与证据路线图

日期：2026-09-14  
状态：Slices 215–229 完成；Ticket 23 为 `15/36`，剩余 `21` 片
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
| 230 | 通用能力注册表、类型化 Effect IR、Action/Consumer/System 生命周期自动路由和统一调用合同 | 仅运行 ability registry/compiler 门一次 | 16/36 |
| 231 | 冻结官方 26 Unit、37 Card、252 definition 的产品动作分母编译和缺口清单 | 仅运行 current-product denominator 门一次 | 17/36 |
| 232 | 全卡池 Move、PLACE、Deploy、Return-to-Reserve 能力族接线 | 仅运行 relocation family 门一次 | 18/36 |
| 233 | 全卡池 BUFF、DEBUFF、Status、Heal、Damage 能力族接线 | 仅运行 characteristic/status family 门一次 | 19/36 |
| 234 | 51 个官方武器与全部远程攻击效果接线 | 仅运行 ranged family 门一次 | 20/36 |
| 235 | 全卡池 Fight、Charge、IMPACT 与近战效果接线 | 仅运行 melee family 门一次 | 21/36 |
| 236 | 24 条 Reaction、触发窗口、双方优先级和每激活限制接线 | 仅运行 reaction family 门一次 | 22/36 |
| 237 | Token、Marker、Structure、Creep、Pylon 与实体组件生命周期接线 | 仅运行 battlefield asset family 门一次 | 23/36 |
| 238 | Summon、Morph、Respawn、创建/替换模型与 Supply 生命周期接线 | 仅运行 unit lifecycle family 门一次 | 24/36 |
| 239 | 任务控制、计分、先后手、Pass 和回合阶段系统动作接线 | 仅运行 match lifecycle family 门一次 | 25/36 |
| 240 | Terran 当前单位、阵营与战术卡的独特能力余项收口 | 仅运行 Terran gap gate 一次 | 26/36 |
| 241 | Zerg 当前单位、阵营与战术卡的独特能力余项收口 | 仅运行 Zerg gap gate 一次 | 27/36 |
| 242 | Protoss 当前单位、阵营与战术卡的独特能力余项收口 | 仅运行 Protoss gap gate 一次 | 28/36 |
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

## 验证与成本规则

- 已通过门不重跑；每次代码变更只跑一条确实受影响的门，且最多一次。
- 不为普通新功能另写重复测试；若现有门无法表达新合同，先记录具体可复现缺口，再
  新增最小验证，不扩展为全量回归。
- 同一验证无新代码不得重跑；三轮不收敛则停止并报告具体 blocker。
- 只有提交成功的 Provider 回执计入 token/费用；超时且状态未知进入人工判定，不能
  自动重付。
- 每个正式局独立 budget epoch；累计 ledger 保留，max-call 在新 run window 清零。

## 非声称

Slice 215 只冻结方案，不证明任务 runtime、500 分正式军表、live Flash、物理操作、真实
H-A/A-A、复盘改进或 PDF 已完成。它们必须分别由 216–235 的具体交付物证明。
