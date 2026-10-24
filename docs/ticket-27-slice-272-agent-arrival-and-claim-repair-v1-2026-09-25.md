# Ticket 27 / Slice 272 — Agent 写表进场时序与定点审查修复

状态：局部通过，Slice 272 仍开放。保存的真实 DeepSeek Flash 草稿 `rws-58722117-8734-4e1e-bd2d-5d7cb98e5061` 生成了 Rules 合法、恰好 2000 Minerals 的 Terran 军表和独立的逐回合首次进场表；计划第三版最终来源审查为 Critical/High 0。带计划的同一真实机机房间已推进到 revision 18 的逐动作截图检查点，并在后台继续；尚未完成整局、K3 新地图同版接线或战术质量 A/B。

## 模型选择、规则验证与版本

- 军表候选 hash `c2b038218720f3c1dc386cfa069919319b78e50ad6f1fb56dc6c78aa008fc64f`：8 Units、30 Models、起始总 Supply 13。模型选择名单；Builder/Rules 确认合法，Host 不替模型排优先级。
- 模型在独立 `arrival_schedule` 轮次给出每个 Unit 的首次进场回合。第一次输出误把每回合 Supply 上限当作新增名额，R2 累计 13 > 8，Rules 以 `PLANNED_PRESET_ROUND_SUPPLY_EXCEEDED` 拒绝并返回具体 round/capacity/overflow。第二次模型自修为 R1/R2/R3/R4/R5 累计 `6/7/9/11/13`，对应容量 `6/8/10/12/不限`，Rules 接受。Schedule hash `d94f895037710507b15b9daf2be72e1c787ab97a7035de34e2b04c0aa1895a3d`。
- 历史六轮 V1 输出和旧计划保持原样；受控生成升级归档旧计划，建立版本化 Agent scheduled plan，不把计划 hash 变动伪装成普通 replay 一致。当前 plan v3 hash `1f6a7e7815b4a3322821a6c60e24544afca867d362c1266a8a051ae328f8e546`；修订前后的军表、首次进场表、score route 相同。
- 历史无进场表的 Agent 计划可读但禁止接入战斗记忆；新版带进场表的计划还须在真实 Room 核对阵营、军表、当前 Unit Supply 与来源冻结信息。下文已记录聚焦 Room handoff 与 Bot 附着，但尚无模型战斗动作。

## 三轮最终审查

1. v1 审查发现 2 个 High：文字把 R5 才入场的第二个 Goliath 用于 R1–4 后方警戒和更早的补位。模型只修订公开计划文本与组件用途；名单和 Schedule 不变。
2. v2 审查原 2 High 已消失，但新增 1 High：把 R2 的五个在场 Unit 表述成 R2 以后的固定数量。一次整份计划重写在 Provider 32,768 输出 token 上限处截断，记录 `ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE`，未覆盖 v2 计划。
3. 改为 versioned、严格结构化的 `agent-scheduled-claim-repair` 合同，只让模型替换被审查字段 `deploymentConcept.threatTradeText` 与相关 `publicSummaryText`。模型返回并重建完整计划，随后第三轮审查 Critical/High 0；保留 3 Medium、3 Low。Medium 包括未有动作类型证据却断言某单位能担任 Movement-Phase 冗余，以及条件性冲锋/射击职责；这些不是已证战术事实，待规则动作证据和对局实测。

完整计划重写失败轮次实际计费但无计划变更。当前同一草稿总计 **14 次模型调用、289,508 tokens、估算 ¥0.651207**（保守全 cache miss 价格快照）；未达到 ¥100 提醒阈值。与旧对局成本分开记账。K3 地图成本未取得可靠回执，不估造。

## 改动与聚焦验收

- `agent-arrival-schedule-output-v1.mjs`、`agent-scheduled-roster-plan-v1.mjs`：模型进场选择与不可变 Rules 检查的版本化产物。
- `agent-scheduled-plan-repair-output-v1.mjs`、`agent-scheduled-claim-repair-output-v1.mjs`：完整计划修复与小字段修复的独立严格合同。
- `roster-strategist-runtime-v1.mjs`、`roster-planning-workspace-service-v1.mjs`：审查绑定、版本修订、失败保留、受控重放与窄字段替换；不会用 Host 生成战术建议或改写名单。
- 聚焦导入检查在修复后通过；两次真实修订、第三轮真实来源审查通过；`git diff --check` 对本轮修改文件通过。未运行无关全量门，也未把 Medium/Low 当阻塞重审。

## 后续同日增量：修订计划的真实 Room 交接

产品入口原把 `planStatus === active` 当作唯一许可，导致审查后的正常 `revised` 计划在读取 Room 前被拒。保存的真实草稿复现 `ROSTER_PLAN_ROOM_HANDOFF_PLAN_UNAVAILABLE`，而底层桥已有完整修订链核对。入口现在仅放行 `active` 或 `revised`，保留审查 High、stale、预算、同席和底层修订链门；同一探针在修复后进入预期房间读取阶段。

第二个真实接线缺口是地图身份：`roomFreezeHash` 包含 `roomId`，不能要求独立写表实验室与新建权威 Room 的实例 hash 相等。现从写表收据先检查同实验室的 summary/selected-route 同版，再在新 Room 的受签状态中核对地图 seed、编译 hash、任务空间可达审查 hash 和六项冻结/可达标志；不同实例 hash 是预期，不降低跨地图隔离。

聚焦脚本 `scripts/verify-ticket-27-slice-272-agent-revised-room-handoff-v1.mjs` 用模型原选的 8 Unit/2000 分名单、当前 Rules 合法军表建房策略和相同 Lost Temple 编译配置创建独立内存权威 Room。真实产品 `preparePregamePlanForRoom` 成功交给 TurnPlan 桥：plan v3 `1f6a7e78…8f8e546`、进场表 `d94f8950…1895a3d`、Room revision 0、来源 hash 已出；未改名单/房间，Provider 0。反例把读出的地图 compilation hash 改为全零，仍明确拒绝 `ROSTER_PLAN_ROOM_HANDOFF_MAP_BINDING_MISMATCH`。

同一聚焦门继续调用真实 Hosted Bot 的 `attach(autoDrive:false)`，复现 TurnPlan 原先仅接受 `planned_preset` 进场来源而拒绝新版 `agent_built` 的具体错误 `pregame roster arrival schedule origin is invalid`。`turn-plan-runtime-v1.mjs` 现按两种明确版本化 schema 核对来源，且同时绑定 Rules audit 与 roster candidate hash；未开放任意来源。改后唯一相关门通过：Bot 读到 `opponent_prompt` 与全部 **8** 个首次进场条目。再用真实对局连续性日志关闭并重新创建 TurnPlan runtime，断点恢复仍读到同一个 rosterPlanHash 和 **8** 个进场条目；Room 保持 revision 0、accepted receipt 0，Provider 调用 0，房间动作 0。此处只证明 Bot 已接入可恢复的进场记忆，**不证明**实际战斗动作、K3 新地图版本、对局策略 A/B 或训练真值。相关 `git diff --check` 通过。

## 后续同日增量：机机实验入口采用真实模型军表和赛前计划

旧 T20/T23 机机 fixture 即使收到新 Agent 选表参数，也固定调用 15-Unit 默认军表；已保存的真实 8-Unit Terran 选表在聚焦脚本中先红为房间 Terran 仅 **7** Unit。fixture 现将可选 `standard2000Recipes` 和 `armySpendPolicy` 透传给权威标准房间工厂；没有传入时旧对局配置不变。覆盖摘要的矿物、气矿和总 Unit 数从工厂已验证的房间状态取得，不再对所有军表硬写 2000/115/140/15。保存的模型选表与旧 Zerg 对手同房重建后，聚焦门显示 Terran **8** Unit、两席共 **16** Unit、Terran **2000/2000** Minerals；Room 0 动作、Provider 0。

下一红证是 A-A orchestrator 把 `pregameRosterPlan` 留在席位配置，`start()` 附着 Bot 时没有传入，故 Terran TurnPlan 中无赛前来源。调度器现在只从 server-side 席位绑定透传这个已由产品入口验证的 bundle；`recoverSeat()` 同样传入，Bot/TurnPlan 仍核同房同席、Rules audit、名单、地图和修订链。机机 fixture 新增房间建成后的 server-only `preparePregameRosterPlans` 回调，让其自带 orchestrator 而非测试专造调度器完成产品交接；默认无回调不变。唯一相关门通过：同一个权威 Room 的 Terran Bot 读到 v3 计划和全部 **8** 条进场安排，暂停后同席恢复仍保持 **8** 条；没有做出动作或模型调用，也没有晋升训练真值。脚本 `scripts/verify-ticket-27-slice-272-planned-selfplay-room-v1.mjs` 专门复现这两个具体接线 bug；不把该通过解读为真人/机机完整对局。

正式 A-A 网页启动脚本现在只在显式 `--pregame-roster-session-id=...` 时从保存的同版草稿读取模型选表，使用同一地图配置建房，并在开局前执行上述 server-only 计划交接。房间私有状态记录 session ID 与 plan hash；同房恢复若会话或计划版本漂移立即拒绝，不在恢复时默默换表。未给此参数的旧无计划启动路径保留。新增 `--pregame-preflight-only` 零 Provider 入口用真实保存草稿启动同一脚本并在 Provider/Web 启动前停下：房间 `ticket23-slice248-aa-20260924222812939` revision 0、8 个模型所选 Terran Unit、Bot 8 条首次进场、v3 计划 hash `1f6a7e78…8f8e546`；Provider 栈 0、模型调用 0、网页服务器 0、Room 动作 0。这只证明正式启动线已能建立带计划对局，尚未运行真实模型第一动作或完整网页对局。

恢复路径不重做赛前交接：经过部署/伤亡后的当前 Room 不是赛前军表，不能拿它伪造第二次原始计划审核。重启时从同席决策日志恢复 TurnPlan 并核对房间私有 `plannedPlanHash`；既有 Bot 附着不注入第二份计划。同一预检房间的 revision-0 断点恢复聚焦通过，仍是 8 条进场、Provider 0、Room 动作 0。**尚未**对已经发生伤亡的后期房间做真实恢复实测，因此此处不声称跨整局断点准出。

本增量 harness 记录：`harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；计划接线的 `promptPackRoutes=[selfplay_agent_prompt]`，但未触发模型输出；`harnessToolsCalled=[Room.createRoom, Room.readRoom, Product.preparePregamePlanForRoom, A-A.start, HostedBot.attach, TurnPlan.open_roster_plan, A-A.recoverSeat]`；`uiTraceEvidence=none`、`agentDecisionEvidence=none`；`memoryTraceEvidence=8 条首次进场在 Bot 同席恢复后仍在`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=名单/地图/同席/计划 hash 漂移拒绝且任何新 Critical/High 阻止动作`；`userVisibleChecks=尚待真实网页截图与动作`。

## 2026-09-25 原房间真实 Flash 动作冒烟

网络恢复后 K3 地图工作仍在独立会话中。T27 工作树的网页导出先因源码时间戳较新而拒绝启动；只更新该工作树的 Expo Web `dist`，没有重建房间。使用相同 `rws-58722117-8734-4e1e-bd2d-5d7cb98e5061`、相同 `20260924222812939` 房间从 revision 0 恢复；真实网页显示 16 Unit、9 个既有 Lost Temple 权威地形，两席 Bot 在线。此次构建未改源码，未运行无关门禁。

通过房间 Web UI 控制路由推进三次，权威 revision `0→3`：`resolve_mission_start_of_round`（唯一合法后继、0 模型调用）、`choose_first_actor(player1)`、`deploy(agent-unit-1)`。首个模型选择公开引用 R1 四支单位、累计 Supply 6/6、M1/M3 路线和 R1 无任务点 VP；部署选择一支 9 模型 Marine Unit 向 M1 做前锋，用 Host 的四个精确队形选项，给出边界、面积、任务距离和未知敌方威胁的比较。`deploy` 已有权威 Apply/Replay 一致回执；累计 DeepSeek Flash `6` calls / `404,392` units / 估算 `¥0.580305`，尚非整局费用。网页截图：[r2 未进场](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260924222812939/web-r2.png)、[r3 首支 Marine 进场](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260924222812939/web-r3-loaded.png)。初次 r3 快照抓在异步房间加载页，不作为证据；已等待「已连接权威房间」后补抓。

局部审查：模型确实读到进场计划，`planDisposition=continue`，部署理由有具体空间查询、精确队形和 Rules 实例化回执；但它称选项距 M1 的 `5.065in` 比另一个 `4.949in`“更近”，算术不成立。其更高综合分、边界余量和紧凑面积仍可能使所选队形合理；将“最近”表述记为 **Medium** 策略说明错误，待复盘，不因此否定合法 Apply。网页覆盖栏的两席 Minerals/Vespene 仍显示 `—`，与后端已核的 2000 分军表不一致，记 UI 呈现缺口；没有把网页截图当作军表审查证据。当前地图仍是旧 Lost Temple 九地形，不声称 K3 美术几何已进入此局；尚未证明后续决策持续按计划、Zerg 反制或 A/B 战术改善，training truth=false。

### 同一房间推进到双方首个激活结束（revision 10）

没有重建房间或重复已接受动作。Terran 在 r4 使用 Barracks (Proxy) 的 `Go! Go! Go!` 让 `agent-unit-1` 额外移动，Host 精确队形落点到 M1 最近底盘边距 `2.846in`；r5 `finish_activation` 后交给 Zerg。模型下一决策明确承认该 Unit 已上桌、其余 15 Unit 仍在预备队，并继续按赛前计划准备 M3 Marine/Medic/雷诺。r4 公开理由一边说已进入 3in 范围，一边说“本次无法进入争夺范围”，且还写“全部 16 Unit 在预备队”，与同一输出的已部署事实矛盾；r5 已自行更正为“除当前 Marine 外均在预备队”及“几何上可争夺、R1 不得任务 VP”。将 r4 的陈旧/矛盾措辞记 Medium，不能把它当作权威计分事实。

Zerg r6 部署 18 模型、Supply 2、Speed 5in 的 Raptor：从八个预备队、能力/Pass 候选中选它，并对比已有 Marine 威胁和 M4/M5 距离。选择的 Host 精确队形距 M4 `6.372in`，底盘边界余量仅 `0.046in`；规则合法但靠边且以最大敌距为主要收益，后续需观察是否过分保守。异步预演首次返回 `preexecution_search_running` 后，A-A 调度器把无权威动作的循环记为 `A2A_NO_PROGRESS_AT_CURRENT_STATE` Medium 并暂停；同状态再驱动可正常继续，未重付已接受动作。这是调度语义/体验缺口，不是首个 Zerg 决策失败。

Zerg r7 用 `Omega Network` 在 `(16.852,14.772)` 建虫洞，公开比较六个 Rules 精确落点、当前/未来射界与四个任务点的未来进场距离收益；r8 用 `Ventral Sacs` 在 M4 `(18,12)` 设置非实体阵营指示物，供回合末预备队进场；r9 用 `Creep Spread` 在 `(19,6.37)` 建 Creep Tumor，说明 Speed on Creep 与 M4 走廊的后续用途；r10 `finish_activation` 交还 Terran。阵营指示物在规则合同中 `physicalPresence=false`、`rulesFootprint=null`，与任务点同坐标不构成物理底盘碰撞，也不直接占点。所有 r4–r10 已有权威 Apply/Replay 一致回执。累计 DeepSeek Flash **36 calls / 2,670,744 units / 估算 ¥3.656974**；低于 ¥100 提醒阈值。K3 Kimi Code 的用量/费用未由当前工具计量，不合并编造。

网页证据：[r6 Zerg 进场和完整下半桌](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260924222812939/web-r6-lower.png)、[r7 Omega Worm](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260924222812939/web-r7-lower.png)、[r10 三种资产及双方首激活结束](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260924222812939/web-r10-lower.png)。对战桌内层需要滚动，普通 1500×1050 首屏截不到下沿 Zerg；`Fit` 在本会话没有让全桌进入同一视口，记 UI 验收缺口。r10 下沿还显示非实体阵营指示物 `geometry_unknown_fail_closed` 的渲染诊断；规则未因此失败，但图标/诊断呈现应由前端修正。

本轮 harness 记录：`harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`（双方）；`harnessToolsCalled=[Web UI drive, Room LegalSpace/preview/apply/replay, space.inspect_relationships, space.solve_formation, base_edge_distance, instantiate_parameterized_action, TurnPlan continuity]`；`uiTraceEvidence=r3/r6/r7/r10 截图`；`agentDecisionEvidence=Terran 赛前到 M1/M3 计划延续，Zerg Raptor/虫洞/指示物/Creep 选择及公开替代比较`；`memoryTraceEvidence=Terran r5 继续引用剩余 R1 进场职责，Zerg 为无赛前计划对照`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=新 Critical/High、规则或同席/地图/名单漂移、Replay 不一致即停止晋升；Medium 位置/叙事矛盾进入复盘`；`userVisibleChecks=房间 revision10 与下半桌资产截图`。仍未验证回合二计分、后续进场、完整对局、K3 新地图或计划与无计划的有效性差异，training truth=false。

### 同一房间 revision 11–14 与异步预演调度修复

原房间不重建，r11 Terran 再部署一支 9 模型 Marine，r12 结束其激活，r13 Zerg 部署 Corpser，r14 使用 Corpser 的 `Glial Reconstitution` 获得在 Creep 上的速度效果；四步均有权威 Apply/Replay 回执。r14 模型明说 Corpser 距 marker-4 仍 `8.668in`、本轮不能占点，且速度加成的精确幅度尚无回执；这是有风险说明的动作，不是已验证的得分收益。r11 公开风险文字把 Zerg 其余预备队误称为 15 Unit，而当前同席原表是 8 Unit、已有 Raptor 上桌，正确剩余应为 7；记 Medium 叙事/计数错误，不改 Rules 状态。

编排器原来把 Hosted Bot 的一次 `preexecution_search_started` 主动让出计入连续空转，真实 r5/r10/r12 因此各产生 `A2A_NO_PROGRESS_AT_CURRENT_STATE` Medium 并暂停，下一次人工驱动才执行。专属编排缝回归先红 `0 !== 1`（一次预演启动、一次普通等待、下一次动作被提前暂停），修后只对同一 state hash 的**首次**主动让出重置空转计数，重复让出或真正持续无进展仍走原保护；同一聚焦命令在代码修改后一次转绿 `A2A_PREEXECUTION_DEFERRAL_OK`。在 r13 持久化原子边界仅重启 Web 服务进程，`--resume-directory` 加载原房间，不新建 Room；真实下一 Web UI drive 在单个后台任务中执行 r14，未新增 no-progress finding，Replay 一致。服务重启后的内存编排发现列表不包含旧服务的三条 Medium，不能把它解读为历史问题消失；旧房间动作/计费均继续保留。

截至 r14 此带计划房间累计 DeepSeek Flash **57 calls / 4,593,749 units / 估算 ¥6.193194**，低于 ¥100 提醒阈值；K3 费用仍无可靠回执。网页证据：[r14 Corpser、Omega Worm 与底部战场](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260924222812939/web-r14-lower.png)。网页此时显示 17 Unit；资源栏仍为 `—`，非实体阵营指示物仍有 `geometry_unknown_fail_closed` 诊断，未在本调度修复中触及。

本增量 harness：`harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`；`harnessToolsCalled=[Web UI drive, Room read/LegalSpace/preview/apply/replay, Hosted Bot preexecution, A-A orchestrator]`；`uiTraceEvidence=web-r14-lower.png`；`agentDecisionEvidence=r11 Marine 屏护选择及 r14 Corpser 速度效果的公开收益/风险`；`memoryTraceEvidence=原同房 TurnPlan/席位恢复，非新的策略晋升`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=重复同状态主动让出、持续无进展、新 High 或 Replay 漂移均停止自动推进`；`userVisibleChecks=r13→r14 同房单任务成功与可读截图`。本修复改善执行连续性，不证明策略已变强。

### 原房间的受限后台 Web 逐动作记录

正式 Web 控制入口一次只排一个动作，逐次人工驱动会使完整局停在每个后台任务边界。新增专用 `drive-ticket-27-slice-272-planned-room-web-v1.mjs` 只通过本机 Web UI 路由驱动原房间，确认 Room ID、同状态结果及 Critical/High；每次权威 revision 后抓上/下半桌 JPEG 和一行不含凭据的动作/费用 NDJSON。遇终局、Critical/High、已失败的驱动任务、连续三次同状态无进展、主动停止或本房估费达到 **¥95** 即停，以便在约 ¥100 前通知用户；不会重建 Room、调用规则直写接口或自动晋升训练。

一次动作实跑先从 r15 抓图、经 Web UI 推进并抓 r16 后按 `max-new-actions=1` 正常退出；r15 是 Corpser 获得 Burrowed 状态，r16 结束激活。复查发现写入 POST 的网络回包若丢失会产生“已送达但未知”的状态，因此只读 GET 可有限重试，POST 一律不自动重发；失败/取消的后台任务也不重复排队。修改后仅做相关语法检查，持续驱动已重新接管原房间，在 r17 部署 `agent-unit-5`、r18 完成其重定位能力后继续。r18 已结算累计约 **¥8.611376**，后续正在增长；每 ¥100 提醒阈值以已结算账本为准。证据目录 [web-action-evidence](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260924222812939/web-action-evidence/) 内有 `r015`–`r018` 双视角截图与 `actions.ndjson`；早期 r1–r14 仍需从已有截图/可回放记录补齐，不把该新目录冒称全局逐动作报告。

本段 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`；`harnessToolsCalled=[Web UI drive, observer projection, authoritative transition receipt, Playwright Web capture]`；`uiTraceEvidence=r015–r018 双视角截图`；`agentDecisionEvidence=对应动作的公开回执，逐动作质量尚待统一复盘`；`memoryTraceEvidence=同房席位与 TurnPlan 持久日志不清零`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=无响应写入请求不重发，失败状态/High/三次无进展/费用阈值停止`；`userVisibleChecks=一动作试跑退出与持续会话写入 r18 截图/账本`。

## 后续边界

### r43 停机：把未来射程误当本回合火力

本带计划房间在第 1 回合 Assault、revision 43 安全停止：Zerg 计划以 Corpser Run 接近 M4，三个已付 Action 输出均区分“本回合 Terran 无可执行火力带”与“Raynor 下回合 Commando Rifle 可覆盖”。保存的 Host 队形回执对 `agent-unit-7` 写明 `enemyStationaryThreatProfileCount=1`、`enemyCurrentRoundStationaryThreatProfileCount=0`、最早射击 `next_round`；旧校验器却用跨回合总数反驳本回合陈述，三次只回同一单位 ID，最终 `LIVE_DECISION_ACTION_DID_NOT_CONVERGE` High。此处模型的时域区分成立，不应把它列为低策略。

针对该真实错误增加一条具体复现：修改前 `true !== false`，修改后唯一聚焦门 `FORMATION_THREAT_HORIZON_OK`；相同保存的第三次模型输出用新检查器零 Provider 本地复验，`contradicted=false`。校验现在按陈述时域选择本回合或跨回合计数，未限定时域的“没有静止火力”仍会被未来火力否定；纠错会包含声明字段、武器和最早时域，而非仅给单位 ID。动作本地重验版本升至 `v38`，已付输出保留。**尚未重启旧进程或 Apply r44**：原房与截图停在 r43，禁止把本地门冒充正式动作；后续从持久化同房安全恢复并核对 Replay。此修复 0 新 Provider/units/¥0。

另须分清实验：原**无赛前计划**房 `20260923062640613` 于动作 116、权威 revision 123、第 3 回合 Movement 停在另一项 Zerg `LIVE_DECISION_PLANNER_DID_NOT_CONVERGE` High，当前比分 Terran 0、Zerg 1，303 calls / 32,530,110 units / 估算 ¥53.974881，未终局；本房是后开、带已生成赛前计划的独立实验，不是它的续局，也尚未构成同条件 A/B。原无计划局应先诊断、完成并统一检查工程问题，再做可比的带计划对局。

- 当前计划 `planned/revised` 和零 High 是赛前审查状态，不是实际战略效果证明。M2/M4 17–19in 路径与结束底盘空间仍 `unknown`；其他 Movement-Phase 职责须证据化，不能从角色文案推出。
- K3 的 art-true 地图仍未产品验收。当前 Room 聚焦门使用已冻结的 Lost Temple 编译几何，不证明全部 20 张地图可用；待 K3 地图可用后，以真实网页/Room 检验进场、读图、动作计划、完整对局，并与无赛前计划版本做 A/B；再进入多局复盘和 Skill 更新。
- 本轮 `harnessLoopUsed=true`；`targetGames=["starcraft-tmg"]`；`judgeTestsRun` 为聚焦进场规则/合同与真实最终审查；`skillsGenerated=[]`、`promotions=[]`、`trainingTruth=false`。任何复盘或 Skill 升级仍需单独证据门。

## 固定军表带计划实验：同表而非另造表

用户指定的优先实验只改变“赛前计划可用性”，不改变军表。原无计划房的 Terran 7-Unit recipe 与保存的固定表 Teach v5 `lockedRoster.lock.recipe` 逐字段相等，规范 hash 均为 `533f5c142e211a22c6ce9d5666fd04a5a021c5eac74ce7b7d384da4b607b3f1b`。先前 8-Unit 模型选表房虽有计划，但 Terran roster hash 不同，且规则运行时版本与无计划旧房不同，不能用作因果 A/B。

旧固定表计划没有现行地图路线审查版本，赛前入口正确拒绝。保留同一固定 recipe，新建草稿 `rws-8c8d7c2b-bf8f-406e-b0fb-4c0de4ad454d`，只在选定 Lost Temple 编译地图上重做 Teach/计划；模型交互给出逐单位首次进场，Rules 审核容量为 R1 `6/6`（Goliath 1/2、Marine 1）、R2 `8/8`（Marine 2）、R3 `10/10`（Marine 3）、R4 `11/12`（Jim Raynor）、R5 不限（Medic）。这是计划选择而非主持端替模型填表，具体位置仍由现场 Rules/Agent 决定。

首次现行最终复核有 2 High：把 R1 的己方 Goliath 集结误写成已经支撑对方目标点，以及要求尚未到场的预备队承担异地屏护。固定表修订合同的一次模型修订保留名单和到场表，改为 R1 候选己方 marker 1/3、R2 对方 marker 2/4 仅在 Marine 2 实际到场且现场可达时争夺；虫洞侧翼按当前在场单位和回合分配，不能同时覆盖两处时明确取舍。第二次现行审查 Critical/High **0**；3 Medium、3 Low 仍作为策略复盘候选，不作工程放行阻塞。新计划 v4 hash `9cdfe788a93088f18c9273e1355f66f938a5b220a0495cb912504d2e477b3ad4`。草稿累计 DeepSeek Flash **9 calls / 223,335 units / 快照估算 ¥0.851307**，该数包含一次完成但无法解析的 Teach 输出；未把它冒充有效回复。

完成但无法解析的付费回复先前只留下失败码和用量，原文丢失。针对这一具体故障，安全适配器现在把原始/规范化文本、合同及回执存入权限 `0600` 的私有草稿，仍拒绝该回复、不自动重发、不投影到浏览器；同一个聚焦假 Worker 先红后绿，相关 MJS 语法和 diff 检查通过。此前已经丢失的原文不可恢复，不推断其内容。第一次误用只适用模型自选表的定点补句入口、第二次仍传该错误字段，都在本地绑定校验止步，**0 新 Provider 调用**；最终使用固定表完整修订入口成功。

正式机机服务的 `--pregame-preflight-only` 已对上述 v4 计划在真实权威建房线通过：新房 `ticket23-slice248-aa-20260925021221569`、Room revision 0、Terran 7 Units、Bot 7 条进场、Provider 栈/模型调用/Web 服务器/对局动作皆 0。该检查证明房间交接可用，不证明已打完整局。旧无计划房是不同代码版本且停于 r123 High；要做可信计划 A/B，仍需在**同一当前运行时、同军表、同 Zerg 表、同地图/任务、同 Skill/模型与可核对随机条件**下分别执行，比较首回合到终局的决策与计分，不拿旧 8-Unit 房替代。

本段 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[roster-strategist Teach, selfplay_agent_prompt 待实战]`；`harnessToolsCalled=[Army Builder, pregame-map-evidence-port, Rules round-Supply audit, final-plan review, authoritative pregame Room handoff]`；`uiTraceEvidence=零调用预检无网页截图，实战待采`；`agentDecisionEvidence=固定 7-Unit 表的到场表、目标点计划与复核修订`；`memoryTraceEvidence=Bot 7 条赛前到场记忆，逐动作延续待验`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=新 High、名单/地图/规则版本不等或 Room 交接不符即停止，Medium/Low 进入复盘而非训练真值`；`userVisibleChecks=现行复核 High 0 与新房 revision-0 零 Provider 预检`。

### 同版开局 A/B 房间与网络暂停点

在同一 T27 工作树完成一次相关 Web export（14 路由）后，另建带计划房 `20260925021934959` 与无计划房 `20260925021950038`，均保留于 `build/ticket-23-slice-248-standard-2000-aa-live-v1/`，不用旧 8-Unit 对局。产品默认 Terran recipe 与新计划选表逐字段相同、hash 均 `533f5c14…07b3f1b`；两个新 Room 的权威 roster hashes 均为 Terran `800a01b4…d311cc2a`、Zerg `30b3de35…e29a9e`。读取两房 manifest 核对 Rules runtime version/hash `1.0.1`/`8afbe8a5…ed856c6e`、地图/任务、双方 Skill refs、Flash 模型均相同。记录的 RNG seed 含各自 matchBindingHash，因此不同；这次只能观察计划如何影响动作，不能单局比分作严格随机配对因果判断。两房都是非训练真值。

逐动作 Web 驱动分别抓到 revision 0 截图，权威均接受唯一开局系统动作 `resolve_mission_start_of_round` 到 revision 1、第 1 回合 Movement、Terran 待行动、0:0。带计划房连续后续任务没有推进：Terran Provider 3 次请求均报 `provider_dns_resolution_failed`，manifest 记 3 次尝试但 **0 报告 input/output units、估算 ¥0**，另记 1 条 `A2A_NO_PROGRESS_AT_CURRENT_STATE` Medium；按三次无进展停止。直连 DeepSeek 域名 DNS 能解析、TCP 443 能连接，但 TLS handshake 超时；同机 GitHub HTTPS 正常，故不是 Rules/计划 High，也不能把未收到响应当成模型策略失败。无计划房在 r1 网页截图等候 45 秒超时，读回 manifest 确认权威动作已完成、模型调用 0；独立无动作浏览器再开同页为 HTTP 200，能显示已绑定权威房间与 r1，属于截图轮询暂态，不可重发已送达的动作请求。两房持久数据和计划草稿原样保存，待 Provider TLS 恢复后从 r1 续行，不重建 Room 或重生计划。

本暂停点 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`；`harnessToolsCalled=[Web UI drive, observer manifest, Room Apply/Replay, 浏览器只读截图、Provider 传输诊断]`；`uiTraceEvidence=两房 r000-top/lower，r1 截图仅带计划房成功；无计划房 r1 页面只读重开确认`；`agentDecisionEvidence=尚无模型战斗决策，只有 Rules 开局系统动作`；`memoryTraceEvidence=固定表计划已附着、实际行动记忆尚未产生`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=传输失败或重复无进展不自动重发付费请求；新 High/规则漂移停止`；`userVisibleChecks=两个同版 Room 的 roster/规则/Skill/地图指纹和 r1 状态`。

### 网络恢复后的同房续跑：300 秒仍超时，停止付费重试

两房 r1 未变。首次恢复试验中，带计划/无计划首个请求分别在约 150 秒被外层监督器标为 `timed_out` High；SQLite 回执的 `max_output_units=32768` 和 `charged_units=input_units+32768` 是**使用量未知时的保守预留记账**，两次 `reported_input_units=reported_output_units=0`、`usage_known=0`，不能解释成实际输出达到 32768 或 Provider 实际扣费。对应估费预留分别约 ¥0.436949、¥0.348802，实际账单未知。

查明同一个在线 Provider 栈默认传输时限为 300 秒，外层监督器却为 150 秒。`live-opponent-provider-stack-v1.mjs` 只将外层默认改为 300 秒；模型、Prompt、Skill、规则和已开的 Room 指纹不变。恢复时又实证两处控制缺口：恢复代码没有把 supervisor 原样发出的 `timed_out` 列为可在**显式后续运行**中处理的历史 Provider 故障（保存的历史 finding 定向断言先红后绿），且 Web 续跑驱动只在首次 manifest 读取传该许可、到检查点又被同一个旧 High 拦住；现许可在同一次显式恢复的每次读取中按 `occurredAt < startedAt` 处理，当前运行中新 High 一律仍阻断。两次本地恢复入口故障发生在新 Provider 调用前，没有增加模型用量；带计划房沿原有 r1 断点和原计划续行，未重建房或重发开局动作。重启时必须显式传只读来源根 `TICKET27_S271_FIXTURE_ROOT` 与固定表草稿目录 `STARCRAFT_TMG_ROSTER_PLAN_DATA_DIRECTORY`，否则工作树中缺 gitignored source-intake 会在启动前报 ENOENT；这个运行配置缺口也未发模型请求。

上述两处修正后，带计划房真实 Web 再次截图并发出**一条**新请求：Provider 尝试预留 `223738` input units/`32768` 最大 output units；外层预算收据时限确为 `300000ms`。请求从 `2026-09-25T12:58:21Z` 派发，到 `13:03:22Z` 仍无完成回执，结果再次 `timed_out` High；新尝试 `usage_known=0`、报告实际 token 均 0、可能已送达 Provider。房间仍 revision 1 / Round 1 Movement / 0:0、权威已接受动作仍只有开局系统动作。带计划房累计 5 尝试的保守估费预留 ¥0.862721，**不代表实际付费**；无计划房未重试，保守预留 ¥0.348802。单独一次**无生成费用**的已认证 `/models` 查询约 9 秒返回 HTTP 200 且 `deepseek-flash` 列出，证明凭据和模型列表入口可达，但不能证明较大的 `/beta/chat/completions` 请求可完成。带计划草稿的序列化计划约 89KB，请求保守 input units 约 224KB；额外输入可能影响延迟，现有证据尚不能归因为模型上下文、服务拥堵还是 POST 链路，不能据此裁剪计划或宣称策略退化。

只读查询失败请求保留的 `promptNodeByteLengths`：`turn-plan-state` 55,827B、`player-room-projection` 54,877B、`current-spatial-observation` 24,465B、`strategy-skill-snapshot` 22,203B、`same-match-memory` 21,237B、`live-decision-policy` 17,758B；这是后续定向诊断的候选分布，**不是**已证明的超时根因。若将来做分层摘要/按需查询，须保持完整计划与空间材料可检索，并用已保存的相同局面比较决策质量，不能简单删节点或把 Prompt 变小当作成功。

按三轮不收敛与 High 门要求，**停止这两个房间的进一步付费重试**。下一项应先以受控、低费用且与该故障区分的探针证明生成端点响应，再分析 Prompt 节点字节分布/传输计时，确定如何在不削弱策略与同表对照的前提下恢复；若仍不可用，报告外部 Provider 阻塞。没有模型动作，因此 A/B 决策、比分、复盘和训练真值一律未准出。此阶段 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`；`harnessToolsCalled=[Web 续跑、Room/Provider SQLite 只读回执、DeepSeek 无计费模型列表]`；`uiTraceEvidence=带计划房 r1 动作前整桌及控制区截图`；`agentDecisionEvidence=未收到新模型输出`；`memoryTraceEvidence=赛前固定表计划继续挂在原 Room、无行动记忆新增`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=新 High 停止、旧超时仅显式后续运行可忽略而不自动视为已解决`；`userVisibleChecks=新 300 秒收据、r1 未变和 K3 地图另行预览验收`。

### 低费用端点隔离与 K3 断点恢复

两间同表房间仍各停在 revision 1，未重发任何权威动作。使用现有 Keychain 凭据做了极小的独立生成探针，未把凭据写入文件或输出：标准 `/chat/completions` 的普通 JSON 请求一次 HTTP 200、约 7.88 秒返回，Provider 明确报告 40 input + 5 output = **45 tokens**。`/beta/chat/completions` 的普通 JSON 请求在 TLS 建成后 30 秒没有完整响应；标准路径 `strict:true` 工具调用探针 30 秒未完成 TLS；使用固定解析地址重试的极小 `strict:true` 工具调用在 TLS 后 30 秒无 HTTP 响应；同路径 `strict:false` 工具调用约 5 秒获得 HTTP 响应头，但响应体 30 秒内未结束。后三类均没有可信 usage 回执，实际是否扣费未知。无凭据的固定解析地址 GET/POST 分别迅速返回 401，只证明连接和路由可达，不是生成成功。

该对照证明凭据、模型和至少一种普通 JSON 生成路径可用，**不证明**原 200K+ input 的实战请求、原生工具调用或 Beta 路由可用，也不能据此断言任何单一根因。按三轮不收敛和策略质量优先原则，本轮停止额外付费探针，保留两房 r1、原始计划、失败收据和未知实际账单。后续若引入 JSON 查询通道，必须版本化保留 Planner 的空间查询、Skill/记忆检索、行动审核及同表 A/B Prompt 对称性；不能仅删除工具或缩短上下文伪装成修复。先作零费用本地接线/语义验证，再决定是否有条件地做一次真实调用。

K3 两个原工作树已在本日恢复：Ticket 24 / Slice 254-R8 继续 20 图的同版 Room/Rules/Agent 接线和实际地形证据；Ticket 27 / Slice 272 继续正式预算合同、新鲜写表/成表计划与网页验收。两者保留现有提交和未提交改动，不重建工作树；K3 用量暂无可靠统一回执，不并入上述 45 tokens 或 A/B 成本。此处仅记录启动与任务边界，不把仍在运行的 K3 工作称为完成。

### JSON 查询通道与同房恢复（2026-09-26，进行中）

零费用复现证明：传入 JSON 模式时，旧决策端仍无条件附带 `native_tools`，所以只改端点路径不会恢复对局。已新增显式 `json_channels_v1`：标准 `/chat/completions` + `json_object`，Planner/Action 保留现有计划、候选动作、Skill、记忆与空间证据要求；模型可在 JSON 中请求既有只读查询，Host 返回原有类型化收据；不能查询 Host 延迟求解器、不能修改 Rules。原生工具模式仍是默认；只有显式许可、旧尝试均为终态失败、没有已完成的付费决策或 native 续传时，才在同一房间迁移模式，并保留历史尝试和未知实际账单。聚焦回归先红后绿，确认迁移、Skill/记忆查询、禁用查询、无网络和无 Room 修改；受影响语法、`git diff --check` 均通过。**尚未证明真实大请求完成或策略质量等价。**

第一次 Web 原房恢复因误指定赛前草稿目录，在任何新 Provider 调用前报 `ROSTER_WORKSPACE_SESSION_NOT_FOUND`；正确草稿位于本工作树 `build/ticket-27-slice-272-fixed-preset-map-current-v1`，保存 7 Unit 计划。改正目录后的启动又暴露恢复性能缺口：服务器为了读取已保存的计划，重建完整赛前 Rules/Skill 实验环境，超过现有 600 秒启动上限，仍未产生新 Provider 尝试。已增加只读持久草稿恢复路径：按原 `sessionId`、版本化 Plan parser、原计划 hash 和所选候选核对；新开房仍走完整赛前产品模块，既有 Room 和行动日志仍是对局权威。原草稿的聚焦读取通过，得到同一计划、7 Unit、零 Provider 调用、零 Room 修改；服务启动与真实模型回执仍待当前一次续跑完成。不能把启动失败或离线门禁记作对局动作。

K3 地图与写表均从原工作树恢复过，但 Kimi 服务连续报 `provider.connection_error`/timeout 后两条会话再次退出，未清理工作树，也不在同一外部故障上无限重试。写表旧离线门禁自行完成（`providerCalls=0`）；新鲜 2000 分写表/计划/Web 验收没有完成。地图只有 20/20 预览登记，真实 Room/Rules 地形门仍未完成。两个对局房间仍 revision 1、第 1 回合 Movement、0:0；无计划房未续。K3 消耗缺可靠账单，主线此节本地修复 0 Provider tokens；独立小探针确定 45 tokens，先前大请求实际计费未知。

本节 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`；`harnessToolsCalled=[DecisionPort 局部回归、赛前草稿只读加载、Web 原房恢复、Room/Provider SQLite 只读审计]`；`uiTraceEvidence=原 r1 截图保留、此节尚无新行动截图`；`agentDecisionEvidence=尚无模型战斗动作`；`memoryTraceEvidence=原计划与旧尝试保留，行动记忆未新增`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=新 High 停止，原生工具模式保持默认且 JSON 仅显式迁移失败记录`；`userVisibleChecks=同房 revision/比分不变、原计划 hash 与 7 Unit 读取通过`。

### JSON 通道首个真实动作与格式容错

有计划房 `20260925021934959` 使用正确持久草稿目录，在原房、原 7 Unit 军表、原固定计划继续；没有重新建房。真实 Flash 在标准 JSON 通道完成三次请求，报告总量 166,580 input + 14,703 output = **181,283 tokens**。第三次回执后，Terran 选择 `choose_first_actor`，权威 Room 从 revision 1 推进到 revision 2，仍在第 1 回合 Movement、比分 0:0。公开理由是保留本阶段先手，让 Goliath 1/2 与 Marine 1 可先按目标线进场；风险文字提到对手 Crushing Grip / Omega Network，但目前只是可审计预测，尚未证实。动作前截图 `screenshots/0013-r001-room-next-agent-decision-before.png`，应用后 `screenshots/0016-r002-player1-choose_first_actor-applied.png`，均在该房 build 目录。Planner/Action 公开材料与预测存在，但本步没有 `attack_probability` 或 `fire_zone_exchange` 查询，不应写成已验证火力策略。

本步的 3 个新请求按内部估价约增 ¥0.270471；Room 显示累计估价 ¥1.133192 **含前 5 次失败请求的保守预留**，不能当作 Provider 实际账单。旧请求的真实计费仍未知。回读发现新通道首个付费 Planner 回答直接输出计划字段，没有外层 `planning`；旧解析器把它标为 `PLANNER_FINAL_OUTPUT_MISSING`，又付费一轮纠错，第二轮同内容类型才成功。已针对这个实证格式缺口让等价的裸 Planner 对象进入原有语义/规则校验，而不是放宽计划字段或改变策略 Prompt；零费用回归经历两次测试夹具断言调整后通过，保留查询边界。该节改动后的新解析器尚未再次做付费调用；下一步从原无计划房尝试一个动作，比较同一开局条件下的选择，再决定是否继续长局。

此阶段 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`；`harnessToolsCalled=[Web UI 恢复与截图、Room Apply/Replay、DecisionPort/Provider SQLite 回读、局部格式回归]`；`uiTraceEvidence=[planned r1 pre-action, planned r2 choose-first-actor applied]`；`agentDecisionEvidence=[选先手、公开意图、风险与对手预测，非隐藏思维链]`；`memoryTraceEvidence=原赛前计划继续挂载，首个行动可写入同局记录；未证明后续调用读回`；`trainingTraceCandidates=[r1→r2 可审阅候选，trainingTruth=false]`；`rollbackOrDemotionRules=任何新 High 停止；格式归一仅接收可识别 envelope，仍执行原计划语义校验`；`userVisibleChecks=revision 2、截图、3 条实际 usage 回执及原 Room/军表未变`。

无计划对照房第一次请求“再做 1 动作”却在修订 1 直接产生 checkpoint，且 Provider 尝试数仍为 1：该房先前权威开局动作已存在，但本地 `actions.ndjson` 尚未同步。Web 驱动先按本地旧计数设置 checkpoint 目标，再把旧开局动作补进来，误认作新增。已把目标计数放到 `recordUnseen(current)` 之后；修订 1/0:0 没变，代码语法与 diff 检查通过。当前从同一无计划房再次只推进 1 个真正新增动作；本次运行结果待写，不能将上次空 checkpoint 当成 A/B 策略样本。

该次无计划原房续跑最终结论：JSON Planner 一次成功，明确选择保留 player1 本阶段先手，Provider 报告 46,061 input + 2,005 output = **48,066 tokens**。其公开摘要说“8 个 Terran 单位都在预备队”，而权威 Terran 军表为 7 Unit；这是需复盘的模型事实错误，不应当作额外单位。随后 Action 请求从 `2026-09-25T16:44:29Z` 派发，到 `16:49:33Z` 仍无可用回执，结算为 `timed_out` / `usage_known=0`，新 High 阻止自动重试。房间仍 revision 1、第 1 回合 Movement、0:0；没有模型动作、没有动作后截图。内部保守预留累计约 ¥0.722925（旧失败、成功 Planner 与新失败 Action 混合），**不是实际账单**；Action 的实际 tokens/费用未知。当前 A/B 仅能比较两侧 Planner 对同一两选项局面的意向，不能比较被权威接受的行动效果或胜率；只有计划侧进到 revision 2。后续须先调查标准 JSON Action 超时是否偶发传输/服务拥堵或请求特征问题，再做有界、显式的同房恢复；不能以重复付费请求代替诊断。

K3 两个独立工作树都保留未提交内容，但会话连续遭 Kimi `provider.connection_error`/`Request timed out`，现均已退出；地图真实 Room/Rules 验证、写表新鲜生成与 Web 验收未完成。写表旧离线门禁已结束，报告 `providerCalls=0`；其后新鲜生成日志仅写 `S272_PLANNING_FAILED`，不能算成功。遵守同问题三轮不收敛停止相同重启，待服务状态改变再从原工作树继续。

### 原房间 r2 同表对照与 JSON 队形接线修复（2026-09-26）

K3 从各自原会话、原工作树经既有钥匙串注入恢复；匿名 HTTP GET 的无首字节并不代表已认证 Kimi 或 DeepSeek 不可用。安全模型目录口持凭据返回 HTTP 200 且列出 `deepseek-flash`，0 次付费调用；这一目录结果不保证大型决策 POST。地图 Ticket24/S254-R8 继续正式地形接线，写表 Ticket27/S272 的新鲜生成三次付费尝试均未准出，不得作为已完成军表。

无计划固定表 Room `20260925021950038` 第一次重启因未传既有只读 `TICKET27_S271_FIXTURE_ROOT` 而在新 Provider 请求前报基础 Skill 资格回执 ENOENT；改用主仓已冻结材料及本工作树既有赛前草稿目录后，同一 Room 的已付 Planner 回复保留，Action 新返回 **37,683 input + 1,245 output**，权威完成 `choose_first_actor(player1)`，revision 1→2，截图 `screenshots/0014-r002-player1-choose_first_actor-applied.png`。该 Action 新增内部估费约 ¥0.051196；旧 300 秒超时的实际费用仍未知。带计划与无计划房同表、同规则、同动作结果，但公开策略材料不同：带计划方指向 Goliath 1/2 + Marine 1 首波与本方 marker 1/3；无计划方临时形成较泛的 marker 1/3/5 部署计划且误把权威 7 支 Terran Unit 写成 8 支。此时无交战，不作胜率或计划有效性结论。

两房各尝试从 revision 2 再推进一次时，在模型已经给出合法的 `formationSearchRequested=true`、非空 `formationTacticalPurpose` 和四条 `formationObjectives` 后，均被 `PLANNER_FORMATION_INTENT_REQUIRED` 重复纠错三轮而停在 revision 2，**没有进场或 Apply**。带计划输出选 Goliath 1 趋向本方 marker 1；无计划输出选同一 Goliath 1 但趋向中央 marker 5；这些只是被工程错误挡住的意图，不是已执行策略。根因是 JSON 通道没有原生 terminal tool 标志，旧 `parts.terminal ? mapPlanningSubmission : raw` 跳过扁平提交字段→内部 `formationSearchRequest` 转换；Action `selection` 也同样绕过映射，后续队形选择会受影响。这是输出接线错误，不是模型未提供队形意图。

已按提交形状而非 Provider 模式进入既有 Planner/Action 映射，并将局部形状版本从 Planner v14→v15、Action v38→v39，使保存的付费输出可原样本地重验。具体聚焦门先红，报 `formationSearchRequest` 缺失；修复后同一聚焦门一次通过，`git diff --check` 通过。两份真实已保存 Planner 输出的只读零费用回放均恢复同一候选及 **4** 条队形目标；原文、Room、Rules、Skill 均未改。两房已从原 revision 2 各启动一次有界续跑，结果另记，不能把局部回放写成权威动作。

本轮 revision-2→下一动作失败的两房共 **22 次有回执的模型调用 / 1,580,431 reported tokens**（带计划 11 次/890,257；无计划 11 次/690,174），内部估费增量约 **¥2.036713**；全部因查询与无效纠错累计，不能算行动成功。两房当前总内部估费分别约 ¥2.278941 / ¥1.665085，均含历史失败请求预留，**非真实账单**。`harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt/json_channels_v1]`；`harnessToolsCalled=[Web 原房续跑、Provider/Decision SQLite 只读回执、Skill 冻结读取、JSON 聚焦门、已付 Planner 本地重验]`；`uiTraceEvidence=[两房 r2 已应用截图，r3 尚无应用截图]`；`agentDecisionEvidence=[相同先手动作、本方 marker 1 与中央 marker 5 不同部署意图，均未执行]`；`memoryTraceEvidence=[带计划赛前计划绑定继续，无计划局内计划创建，r3 接线停在 Planner]`；`trainingTraceCandidates=[两房 r2 可审阅，r3 仅失败诊断且 trainingTruth=false]`；`rollbackOrDemotionRules=[新 High 停止、不重发已保存 Planner 原文、仅通过显式原房恢复重验]`；`userVisibleChecks=[同表同规则 revision 2、保存输出映射4/4、未进场未计分]`。

### 已付 Planner 断点复用后的首次部署 A/B

同一份已保存 Planner 原文经 v15 本地重验而非重新生成；两房各只增加一条真实 Flash Action 回复，规则合法、Apply 与 Replay 一致，均从 revision 2→3、第 1 回合 Movement、比分 0:0。两席 Terran 都派 `player1-goliath-1`，但底盘中心不同：

| 固定表条件 | Goliath 1 中心／高度 | 计划目标 | 到目标底盘边最短距 | 当前目标 3 寸内模型 | 权威截图 |
| --- | --- | --- | ---: | ---: | --- |
| 带赛前计划 | `(12000,30575)`／ground | 本方 marker 1 | 4.370 寸 | 0 | `20260925021934959/screenshots/0029-r003-player1-deploy-complete-board-applied.png` |
| 不带赛前计划 | `(27000,30575)`／ground | 中央 marker 5 | 10.370 寸 | 0 | `20260925021950038/screenshots/0027-r003-player1-deploy-complete-board-applied.png` |

两者都不是此刻占点；规划条件已造成实际横向部署差异，但尚无得分、交火或因果胜负证明。无计划方说“部署到 marker 5 高地”，当前真实落点仍为地面且距点超过 10 寸；这是需要在下一激活观察其计划是否自我校准的策略声明偏差，不是规则器已确认控点。带计划方亦距离目标 4.37 寸，不得说已占 marker 1。两房 `formationEvidence.agentSelectedCount=1`、`rulesAppliedAndReplayVerifiedCount=1`，但 `attack_probability` 与 `fire_zone_exchange` 查询仍 0；当前无敌方上桌，不能声称火力策略验收。

修复后各增加一次有 usage 的 Action：带计划累计 20 calls / 1,659,041 reported units / 内部估费约 ¥2.368941；无计划累计 16 calls / 1,192,664 reported units / 约 ¥1.756027。数字含历史失败预留与未知实际账单，非 Provider 账单。两房原地再次各启动“最多 3 个新增动作”检查点，待观察队形/计划修订、目标距离和对手进场；不另造军表或 Room。

### r3 下一动作三次 Provider 超时后的停止点

上述两房续跑并未到下一次 Apply。带计划房在保存了 3 轮 Planner 查询回执后，第 4 次约 239,086 字节提示请求于 300 秒超时；无计划房第 1 次约 174,001 字节请求亦于 300 秒超时。两者均为新的 `timed_out` High，Room 均保持 revision 3。无计划房随后**单独**在原房显式续跑，不改规则、军表、赛前计划或历史回执：先得到 2 条真实新查询回复，分别读取同局记忆以及空间/地形关系；第 4 次约 201,434 字节提示再次 300 秒超时，仍无权威新动作。前一轮并发拥塞不能单独解释后一次单跑超时。三次同类超时后停止盲目重发，先处理请求负载／重复证据查询和传输可观测性。

`provider` 持久账中这次无计划新回复有 2 次、合计 105,514 reported units；最后一条超时请求无 usage 回执，其实际计费未知。当前带计划 Room 内部累计估费约 ¥3.068112、无计划约 ¥2.659370，均含失败请求预留，不是提供商账单，也不能把 32,768 的输出预留算成实际生成量。保存的无计划 Planner 前两次新回复分别为 `retrieve_match_memory` 与 `space.inspect_relationships`，其中对 marker 5 的高地／距离预测仍须待动作与回放证实。带计划 Planner 的第 2、3 轮曾重复申请相同空间/记忆信息而未得到新回执，但仍继续增加查询轮次，这是另外一个可定位的调度效率缺口，不足以证明超时的唯一根因。下一次付费前需完成定向诊断与修复，避免在同一 High 上无限续跑。

`harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt/json_channels_v1]`；`harnessToolsCalled=[同房 Web 续跑、DecisionPort/Provider SQLite 只读检查、Room manifest/截图回读]`；`uiTraceEvidence=[两房 r3 Goliath 部署截图，r4 无]`；`agentDecisionEvidence=[已执行的位置差异，后续查询未形成动作]`；`memoryTraceEvidence=[无计划下一轮确实请求同局记忆；尚未证明用它形成有效更新计划]`；`trainingTraceCandidates=[r3 可审阅，三次失败不作训练真值]`；`rollbackOrDemotionRules=[同类 High 三次后停止自动重试，保留原 Room/原回执]`；`userVisibleChecks=[两房 r3、比分 0:0、无交战、无新 Apply]`。

重复证据调度缺口另经本轮聚焦修复：现有 JSON 通道门禁先以两次相同 `retrieve_strategy_skill` 返回同一 hash 复现“回执只有 1 份、下一轮仍可继续查”的红灯；随后在同阶段查询只返回已知回执时，下一提示改为强制终稿并明确复用已有证据、保留未解决的不确定性。若模型仍查询则进入有界语义纠错。修改后的同一聚焦门一次通过，0 Provider、0 房间变更；这只消除重复查询浪费，**不宣称修好大请求的 300 秒超时，也没有新的策略动作/效果证据**。旧失败尝试保持原样，未通过重写 SQLite 伪造历史回执。

第二个实证负载缺口是同一 Room 的 `armyResourceBudgetsBySide` 含构筑过程成本审计的 unit/upgrade/card 逐行副本，而 `publicRosterDisclosureBySide` 已公开保留单位、升级与价格。原冻结 r3 全状态只读测量：预算审计 **43,317 字节**，公开军表 **44,238 字节**。新投影只压缩前者，保留两席预算上限、已花、剩余、资源转换、合法性结论及审计 hash；公开军表字节级不变。原 Room 对同一投影函数的本地只读比较为预算 **43,317→1,873 字节，减少 41,444**。新增针对具体重复形态的聚焦门先红后绿，0 Provider、0 Room 改动；Prompt policy 升版。后续真实请求是否因此低于 300 秒与策略是否等价均**未验**，不得把本地字节节省当作线上延迟证明。旧 Room 和已付回执保留，未做第四次付费尝试。

### 2026-09-26 r3 超时同量级对照（只读，不重发）

直接从两间原 Room 的 `provider-attempts.sqlite` 与 `live-decisions.sqlite` 读取状态、时长和提示节点尺寸；没有读取或输出凭据/模型原文，也没有新的 Provider 调用。计划房同一 Provider profile 下，连续两次 `input_units=243182` 的 Planning 查询在约 **9.1 秒、5.4 秒**完成，随后相同预算输入量的一次请求在约 **301.9 秒**超时；三次 `request_hash` 不同，不能称其内容逐字节相同。无计划房 `input_units≈178097–179397` 的请求既有 **4.6–7.2 秒**完成，也有约 **301.5 秒**超时；后续 205530 预算输入量请求再超时约 **301.0 秒**。成功查询实际报告的输入通常约 52k–70k units、输出 96–394 units；失败请求 `usage_known=0`，预算输入和 32768 输出上限均非实测计费。

结论限度：**总输入大小不是超时的充分解释**，所以前述预算审计重复裁剪的 41444 字节只证明降低冗余，不能宣称修复 300 秒 High。失败多发生在取得查询回执之后的下一 Planning 请求，仍可能是内容/长终稿生成、外部模型长尾或连接/等待首字节/读正文中的任一环节；现有失败回执仅有 `timed_out` 和是否可能已出网，缺少阶段计时，不能裁定根因。下一项应先在隔离传输边界加入**不含正文/密钥**的 DNS、TLS、请求写完、响应首字节、响应完成阶段耗时与超时阶段，再在授权的有界同房续跑中观察；不得仅凭字节数继续删减策略、Skill 或记忆，也不得无观测盲发第四次付费请求。

本诊断 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt/json_channels_v1]`；`harnessToolsCalled=[SQLite 只读回执与 Prompt 节点尺寸查询]`；`uiTraceEvidence=[既有双房 r3 截图，无 r4]`；`agentDecisionEvidence=[无新动作]`；`memoryTraceEvidence=[无新记忆写入]`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=[任何新 High 停止、不改写历史回执]`；`userVisibleChecks=[两房仍 revision 3、0:0]`。

### 2026-09-26 Provider 超时阶段可观测性（离线完成）

针对真实 300 秒超时回执缺少传输阶段这一具体故障，现只在超时失败回执附加单调计时 `transportProgress`：DNS 完成、TCP 建连、TLS 完成、请求写完、响应头、响应体完成的毫秒里程碑与当前阶段；若已取得 HTTP 响应头，保留状态码。字段仅含阶段/整数，不含凭据、地址、请求内容、模型输出，也不改变请求路径、提示、规则、自动重试或超时阈值。Worker v1/v2 允许并保留此可选安全字段，旧失败回执无需迁移。聚焦夹具先红（超时无阶段），代码修改后对“已写请求、等待响应头”和“已收 200 响应头、读取正文”各一次绿测；`providerCalls=0`、`roomMutations=0`，本轮未重跑全量门。最后将 DNS 耗时起点前移至实际解析前，此微调未再次运行已通过的相同门。

这解决**无法判断超时发生在哪段**的工程缺口，不解决 300 秒超时本身。两间同军表 A/B 房仍停在 revision 3、第 1 回合 Movement、0:0；按三轮不收敛继续停止第四次付费调用，需另行获得明确恢复指令后才可在原房有界续跑。新 DeepSeek 调用/可确认新 tokens/新估费均为 `0/0/¥0`；K3 用量缺可靠回执，单独保持 unknown。

地图 K3 原会话仍在独立工作树持续输出，未重启：标准尺寸 9/9 已验，非标准 11 张尚无正式准出。当前定位 Skirmish 的 Destination 错画坡道与 Xel’Naga Caverns 大底盘入场；Grand Offensive 五图因当前冻结官方包没有对应官方任务/部署卡，不能借 Standard 卡冒充正式 Room。K3 的在途改动及 `quarterProbeSnapLimitInches` 例外仍须审查，不能把诊断输出写成正式完成。

`harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt/json_channels_v1]`；`harnessToolsCalled=[Provider Transport 离线阶段夹具、K3 原会话状态轮询]`；`uiTraceEvidence=[既有双房 r3 截图，无新增]`；`agentDecisionEvidence=[无新增模型决策]`；`memoryTraceEvidence=[原计划/旧回执保留，无新增]`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=[新 High 停止、不自动重发旧请求；若可选阶段字段不被旧消费者接受则撤回新回执而不改写旧历史]`；`userVisibleChecks=[两种超时阶段离线回执可区分、双房未变、K3 活会话]`。

### 超时阶段回执的端到端持久接线补正（2026-09-26）

补审真实 A/B 链路发现上一节“传输与 Worker 有阶段回执”仍不足以供重启后诊断：DurableGateway 仅在异常对象保留完整安全回执，Provider attempt SQLite 只记其 hash；Supervisor 的 `safeFailure` 又删去阶段信息，LiveDecision 原先只把失败码写入 SQLite JSON。另一个时序缺口是传输与 Supervisor 默认均 300 秒，上层计时先开始，可能抢先中止下层回执。以上是工程接线缺口，不是新的模型策略失败。

现仅在可核对完整安全回执 hash、失败码为 `PROVIDER_TRANSPORT_TIMEOUT` 且阶段结构为纯数字/枚举时，将阶段摘要写入 Supervisor 的失败 Turn/receipt；LiveDecision 对同类失败把已验证阶段存入该次 attempt 的 `providerTransportProgress`，SQLite 旧记录缺字段仍可读取。当前 live opponent 栈的默认传输截止仍为 300 秒，Supervisor 默认增加 15 秒结算宽限，显式调用方截止不被暗改，且不触发自动重试。两个独立零 Provider 聚焦门各自先红后绿一次：Supervisor 原先丢回执；决策端原先丢持久字段。默认栈的改动只做了一次语法检查，尚未真实超时运行，因此不能声称线上相位已观测到；如 DNS/排队超过宽限仍可能是上层 `timed_out`，需按真实回执判断。没有再次调用 DeepSeek；原双房仍 r3/0:0。

本次 `harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt/json_channels_v1]`；`harnessToolsCalled=[Supervisor 注入式失败回执、LiveDecision 持久记录夹具、K3 会话轮询]`；`uiTraceEvidence=[旧双房 r3 截图、无新动作]`；`agentDecisionEvidence=[无新增]`；`memoryTraceEvidence=[原计划/旧回执不改]`；`trainingTraceCandidates=[]`；`rollbackOrDemotionRules=[异常阶段字段无效则不保存、任何新 High 停止且不自动续付费]`；`userVisibleChecks=[两个离线端到端丢失点均可复现并消除、原 Room 未变]`。
