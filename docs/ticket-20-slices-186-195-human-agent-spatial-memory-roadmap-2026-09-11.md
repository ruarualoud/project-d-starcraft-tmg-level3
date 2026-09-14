# Ticket 20：人机完整对战、空间规划与持续记忆路线图

日期：2026-09-11；最终收口：2026-09-14。状态：完成；共 10 个 Slice。
Slices 186–195 全部验收，Ticket 20 为 `10/10`，项目为 `18/22`。下文保留此前的
开放检查点；末尾最终验收覆盖其历史状态。

## 目标与完成边界

Ticket 20 把 Ticket 18 已接受的 11 件规则/策略 Skill 接到真实的人机与机机
对战。第一阶段在 Slice 193 结束时交付一场可完整进行的人机对战；Slice
194–195 再交付多局复盘/反事实控制台和规则变化后的增量保鲜。

不能把以下内容冒充完成：单步 Preview、Hold/Pass 微型房间、UI 名义威胁圆、
未绑定当前状态的搜索答案、模型对位置的自然语言描述、未经过 Apply/Replay 的
假设动作。

## Slice 186：对局决策连续性

本 Slice 新增 `match-decision-continuity-v1` 深模块，并以可选端口接入现有
Opponent Role Context Runtime。模块接口为 `observe`、`record`、`query`、`close`：

- `observe` 从玩家可见的权威 Room Projection 恢复回合、阶段、当前行动方、
  Pass、First Player Marker 和阶段首行动方选择；读取同一 room/match/seat 的
  目标与动作目的记录；启动或复用异步预执行搜索后立即返回。
- `record` 保存 TurnPlan、动作目的和动作结果。当前 Role Runtime 会在模型选出
  当前 LegalSpace 候选并取得 Preview 后保存 `selectedReason`、局面价值、风险、
  被否决备选与两个回执引用；后续 Bot Seat 在 Apply 后补结果。
- `query` 从完整同局事件账本按计划、意图、单位、能力、资源、轮次、阶段、事件种类、
  标签或文本分页回忆；提示词只带实时工作摘要，分页不删除源记录。
- `close` 结束对局作用域并取消未完成搜索，不推广本局记忆为长期 Skill。

本局记忆不是隐藏思维链。它只保存可审计的计划摘要、选择目的、结果和规则状态
事实，使 Agent 在交替激活后能继续此前目标，或者明确说明为何改计划。

Pass/抢先不由模型推断。它直接消费规则器现有字段：
`players.*.passedPhases`、`firstPassSideByPhase`、`firstPlayerSideKey` 和
`phaseFirstActorByRound`。每次这些事实变化就形成同局 initiative observation，
因此 Agent 能看到自己是否曾先 Pass、当前是否持有 First Player Marker、该阶段
是否已 Pass，以及 marker holder 最终选择谁先行动。

日志 Adapter 出错会降级到进程内记忆并报警，不阻断对战；生产持久 Adapter 将在
Bot Seat/Room 生命周期接线时落到现有同构 SQLite/PostgreSQL 存储。提示词只投影
最近记录的软目标，不以文本长度拒绝写入，也不删除完整日志。

## 异步预执行搜索

搜索键绑定 `room + match + seat + stateHash + LegalSpaceHash + SkillSetHash +
activePlan`。Room 每次接受动作后可立即调用 `observe` 预热下一决策：

```text
权威状态变更
  -> observe（更新本局事实并排队搜索，立即返回）
  -> 后台对当前快照比较候选
  -> Agent 下次激活：命中 ready 结果，或在 running/failed 时直接走即时策略
  -> 选出的动作重新读取当前 LegalSpace
  -> Preview -> confirm -> Apply -> Replay
```

搜索没有 confirm/apply 权限，不修改 Room。状态变化会 Abort 旧任务；返回结果若
声明了不同 `stateHash` 会标为 stale。Role Runtime 永不等待搜索完成，故搜索不是
最慢链路；ready 结果只是建议，不能绕过当前 LegalSpace/Preview。

## 10 个 Slice 清单

| Slice | 具体交付物 | 完成后 Ticket 20 |
| --- | --- | --- |
| 186 | 同局目标/目的记忆、Rules-owned Pass/抢先账、异步预执行协调器及 Role 上下文接线 | 1/10 |
| 187 | 玩家视角的精确空间 Observation：世界坐标、底座/编队、地形/遮挡、目标与坐标变换隔离 | 2/10 |
| 188 | 参数化 ActionSpace 与测量/路径/LOS/威胁/概率查询；unknown 不伪装 exact | 3/10 |
| 189 | TurnPlan/ActionIntent、状态变化重规划、暂停点反事实搜索与计划修订 | 4/10 |
| 190 | 空间案例 A：底座编队、卡位掩护、威胁边界；各 2 development + 2 held-out | 5/10 |
| 191 | 空间案例 B：集火支援、火力圈互换、目标节奏；各 2 development + 2 held-out；合计 24 例 | 6/10 |
| 192 | 可托管 Bot Seat 生命周期：自动轮到 Agent、确认策略、Apply/Replay、断线恢复与同局持久记忆 | 7/10 |
| 193 | Web 人机完整局：建军/部署/交替激活/Pass/计分/终局/重放与空间证据 | 8/10 |
| 194 | 控制台手动触发、多局合并复盘、指定动作暂停/分支搜索、候选 SkillOpt 与回滚；凯瑞甘 companion 读取公开动作/空间差分/同局记忆并区分事实与意图推断 | 9/10 |
| 195 | 来源→事实→claim→section→Skill 反向依赖的增量保鲜、旧版展示、受影响回归与选择性发布 | 10/10 |

## Harness 与训练边界

- 在线使用 Provider/BYOK 和已接受 Skill；DSH 只用于离线 Skill 生产/优化。
- Room/Rules 是合法性和发生事实权威；计划、搜索评分和空间解释不是训练真值。
- MuZero 候选只取 Apply/Replay 后的权威 state/action/reward/legal mask；未执行搜索
  分支单列为 counterfactual，不混入真实轨迹。
- 本局记忆默认不跨局，不自动进入长期记忆或 Skill。Slice 194 的多局复盘经独立
  评估后才能产出隔离候选。
- 只有 Critical/High 阻止集成；Medium/Important 记录但不停止。验证最多三轮，
  每次代码修改只跑实际受影响的一个门。

## 当前验收状态

Slice 186 的模块与 Role Runtime 接线已经实现。唯一聚焦门通过：既有 Ticket 15
Role Output/Preview `28/28`，同命令的内存烟测证明 first-pass/marker 事实、动作目的
跨激活保留，以及异步搜索 `queued -> ready` 且同键只执行一次。它证明“连续性
上下文能够被构造和接入”，不证明持久数据库、真实空间搜索、完整 Bot Seat 或
人机整局已经完成；这些分别属于后续 Slice。Ticket 20 当前 `1/10`。

Slice 187 已实现玩家视角 Spatial Observation 与可选 Role Context 接线。它先用
共享 V3 viewer projector 丢弃未经审查的字段，再投影世界坐标、官方模型底座、
完整编队包围盒、地形/标记/Token、场外单位和目标状态。边界合法性按完整物理底座
而非模型中心；规则世界坐标固定为 bottom-left/x-right/y-up，viewport 的 top-left、
CSS pixels、DPR、pan/zoom 均不进入 Observation。路径、LOS、威胁和候选后计分只
登记为 Rules-query-required，不伪装成已知。唯一聚焦烟测用冻结官方 32mm Marine
资料通过 `2/2` 精确底座、1 个中心在内/底座越界反例、5 个任务标记和异步搜索
Observation 传递。Ticket 20 当前 `2/10`。

Slice 188 已实现 `spatial-action-query-runtime-v1`。`actionSpace` 同时保留全部
current finite actions 和 parameter domains，不把路径/坐标/目标域压成任意固定数量；
domain 必须经当前 Rules 实例化后再 Preview。`query` 直接调用官方底座 kernel 回答
base-edge 与 within/wholly-within，其他路径、LOS、威胁、概率、火力圈交换、候选后
计分通过可注入 Rules Query；缺 Adapter、失败或不支持统一返回 `unknown`，宣称
exact 的委托结果必须绑定当前 room/match/state/LegalSpace 并声明 Rules authority。
相同绑定和参数的委托查询 single-flight。唯一聚焦烟测通过 edge distance `5740`
milli-inch、within true、finite/domain 并存、unsupported unknown 和两次查询一次委托。
Ticket 20 当前 `3/10`。

Slice 189 已实现三层同局记忆与玩家式计划循环，设计依据和取舍见
`ticket-20-slice-189-agent-memory-and-player-planning-architecture-research-2026-09-11.md`。
完整追加式事件账本保留计划/反思/修订、动作意图/结果、实际能力/资源使用、单位意图
结果、对手响应和己方反制；实时工作记忆只投影当前总体计划、目标、计划健康、近期
承诺、战术账本、对手模型、反制和风险；Agent 可按需查询源日志。每个新的状态/行动
边界必须先 `reflect_plan`，其可审计 `PlanAssessment` 才能解锁正式 `ActionIntent`；
意图必须写明计划延续、目的、预计己方结果、对方反制、己方再反制、利弊、风险和
改计划条件。暂停点反事实搜索绑定 state/LegalSpace/plan checkpoint，异步运行，
不能确认、Apply 或成为训练真值。唯一聚焦门一次通过总体计划/反思、单位/能力查询、
工作记忆、能力/资源/对手反应记录和两分支异步搜索，执行器只调用一次；未运行其他
Slice、模型或网络。Ticket 20 当前 `4/10`，下一片为 Slice 190 的空间案例 A。

Slice 190 已冻结第一组 12 个空间玩家决策案例：底座/编队、卡位/掩护、威胁边界
各 2 development + 2 held-out。每例的 Agent prompt 与 evaluator oracle 分离；
held-out split、首选候选和行为判据不进入 Agent 投影，且六例使用独立局面身份。
查询回执必须封口并绑定案例 state/LegalSpace，决策必须在所有候选比较中实际引用
路径、编队、遮挡、LOS、动作特定威胁或火力交换证据，同时保持 Slice 189 的计划、
反思、对手反制和己方再反制合同。唯一聚焦烟测一次通过 12 个主机正确选择，并拒绝
一个证据完整但空间选择错误的 held-out 负例；模型调用 0，所以不宣称真实 Agent 已
通过。详见 `ticket-20-slice-190-spatial-player-planning-cases-a-2026-09-11.md`。
Ticket 20 当前 `5/10`，下一片为 Slice 191 的空间案例 B。

Slice 191 已新增集火/支援、火力圈互换和目标节奏各 2 development + 2 held-out，
并用统一目录把两组收成 6 家族、24 例、12+12 分区。新案例覆盖一对多/多对一、
过量集火、支援节点、主动进入有利火力圈、小位移切断反击、棋值交换、资源预留、
回合末得分、增援通道、Pass/First Player 计划和 cleanup 前否决。唯一聚焦门一次
通过新增 12 个主机正确决定并拒绝一个证据完整但目标节奏错误的 held-out 负例；
A 组仅做投影兼容检查。详见
`ticket-20-slice-191-spatial-player-planning-cases-b-2026-09-11.md`。真实 Provider 仍为
0，故这只完成评估夹具，不宣称模型或整局表现。Ticket 20 当前 `6/10`；下一片为
Slice 192 可托管 Bot Seat 生命周期。

Slice 192 已实现宿主所有的 Bot Seat 生命周期。模型只从 current Room/LegalSpace、
空间投影、本局记忆和 TurnPlan 选择当前 ActionSpace 候选；宿主在一次人类当前对局
授权下执行 Preview、Confirm、ControlLease、Apply 和 Replay。Apply 响应中断后可由
新 runtime 以相同幂等请求恢复，且不重复调用 DecisionPort。唯一聚焦门通过一次
决策、一次权威动作和一次回放，模型 Confirm/Apply 均为 0。详见
`ticket-20-slice-192-hosted-bot-seat-lifecycle-2026-09-11.md`。Ticket 20 当前 `7/10`。

Slice 193 后端已用共享 effective-acting-side 模块统一 Hosted Bot 与 TurnPlan：普通阶段
取 `activeSideKey`，cleanup 回退 `firstPlayerSideKey`。有界官方房间、本地 Web 服务、
Hosted Bot 安全状态 API、Battle Lab 自动 revision 同步与证据面板已接通。唯一后续
完整局门通过五轮终局、43 个人类席位动作、37 个 Bot 动作和最终 Replay；五个基础
Skill、空间/计划/意图证据存在，模型 Confirm/Apply 和 Provider 调用均为 0。详见
`ticket-20-slice-193-web-human-agent-complete-match-closure-2026-09-11.md`。Ticket 20
后端完整局门已通过，但原演示把 Battle Lab 误作产品入口。2026-09-13 已改为原 TMG
Expo 产品 App 根入口，恢复数据库/军表/计算/对战/设置五 Tab，并把 Battle Lab 隔离到
`/dev/battle-lab/`。2026-09-14 又把冻结官方产品目录接回数据库/写表器/计算器/设置，
加入持久军表草稿，并把凯瑞甘副官改为所有产品页可用的右下悬浮窗。空编队在未选
指挥卡时现在明确解释依赖并可返回指挥卡页，不再表现为无操作入口。

Slice 194 的 companion 公开事实/意图推断、多局手动合并复盘与隔离 SkillOpt 候选，
以及 Slice 195 的 `source → fact → claim → section → Skill → regression` 反向依赖保鲜
均已实现并挂到 `复盘与 Skill` 面板。它们没有自动训练、自动发布或读取对手私有计划。
Expo 类型检查已通过，新 Web 静态构建可启动；完整 Playwright 用户旅程已走到合法
写表选卡/加单位页，但验收脚本的单位搜索选择器同时命中了后台保留的数据库搜索框。
该具体选择器已修复。遵守“验证循环最多三轮”的用户约束，本轮不再启动第 4 次完整
门禁；因此这三片仍作为实现完成、集成验收未闭合处理，Ticket 20 保持 `7/10`，项目
保持 `17/22`。下一交付物是仅执行一次修正后的完整产品用户旅程并保存收据；通过后
才可同时关闭 Slices 193–195、将 Ticket 20 记为 `10/10`。

后续收敛周期已把 Matchup 的双方选择器收为响应式双列、独立可访问作用域，并让旅程
真实选择 Marine/Zergling 后验证双向结果。受影响 TypeScript 与 1419/1428 模块、14
路由 Web 导出通过，Matchup 本体及控制台均正常。周期第三轮停在 Versus：其“武器
概览”同样在双方单位选择前不会出现，而旅程仍只切 Tab 即断言。按三轮上限停止；
下一周期只修 Versus 的 A/B 作用域和真实操作，然后继续余下完整用户旅程。三片集成
状态与 Ticket/项目计数不变，模型/Provider/来源刷新/费用均为 0。

下一收敛周期把 Versus 双方基础选择提升到同屏双列并通过真实 Marine/Zergling 武器
概览、阶段对比与详细对抗；骰子 Pressable 补齐 button role/label 后，真实投掷和历史
也通过。第三轮停在英文来源标题断言：截图证明语言已切换并显示大写
`OFFICIAL SOURCE INTEGRATION`，只有大小写敏感 verifier 错误。按三轮上限停止；下一
周期从大小写不敏感断言继续剩余副官、房间、战桌、Replay、复盘与保鲜旅程。Ticket20
仍 `7/10`，项目 `17/22`，模型/Provider/来源刷新/费用为 0。

再下一周期通过了设置语言与全局悬浮副官，并把 Demo Room 接上已有开发内 Character
Presentation Runtime，消除了真实角色接口 404。战桌地图存在但模型列表没有
`Marine · player1`。三轮后的只读权威查询确认 V3 viewer projection 中棋子 `name=null`：
fixture 写了会被安全投影丢弃的 `name`，却没写已允许的公开 `unitName/unitId`，导致
Battlefield 回退到 pieceId 且头像媒体无法解析。按三轮上限停止；下一周期补齐由官方
profile 导出的公开单位身份，再继续模型/威胁/写入/Replay/复盘/保鲜。状态与费用不变。

最新周期已把公开棋子身份改为官方 `profile.unitName` 加 `profile.recordKey`，产品真实
选择 Marine、显示头像并进入威胁/动作流程。外接 Rules Runtime 的 Preview 一度因
`postGameClock.transition` 未推进而被客户端拒绝，现由权威引擎统一标记下一 revision；
最后一轮已确认并应用人类 Hold，自动 Bot 随即完成 Zergling Hold。只读回放为 revision
2、两条收据且 `matchesCurrent=true`，但客户端仍以 Apply 后较早的房间投影验证更晚的
Replay，触发 `REPLAY_RESPONSE_INVALID`。三轮已满；下一周期只实现一次 revision-ahead
Replay 投影 catch-up，再续跑复盘/SkillOpt/保鲜，不放宽回放合同。Ticket20 仍 `7/10`、
项目 `17/22`，外部 token/费用为 0。

最终产品周期已完成严格 revision-ahead Replay catch-up，并一次通过 Database、军表
持久化、全部计算器与骰子、设置/语言、全局悬浮副官、Room 恢复、地图/头像/模型/
威胁、Preview/Apply/Replay、四 Episode 合并复盘、两个隔离 SkillOpt 候选与五 Skill
增量保鲜的完整真实浏览器旅程；产品 console/page error 均为 0。随后对原始范围复核
发现缺少 A-A 实证，因此仍在 Slice 193 内补入双 Hosted Bot Seat 深编排，而没有伪造
第 11 个 Slice。其 `1/1` 有界实验单元以 80 个动作完成五回合终局，并证明第 8 动作
原子暂停、重连恢复、双方定向三 Skill、空间/同局记忆/TurnPlan/ActionIntent、逐动作
及最终 Replay、安全轨迹、失败记账和无自动晋升。聚焦门一次通过；Provider/model/
来源刷新/token/费用为 0。至此 Slice 193=`Web H-A 完整产品旅程 + 原始 A-A 编排`，
Slice 194=`人工多局复盘/反事实/隔离 SkillOpt/副官公开事实与推断`，Slice 195=`增量
保鲜与旧版保留`，三片全部收口，Ticket 20=`10/10`。
