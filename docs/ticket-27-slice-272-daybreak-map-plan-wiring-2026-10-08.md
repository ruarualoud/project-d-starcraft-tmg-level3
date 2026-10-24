# Ticket 27 / Slice 272 — 当前 Daybreak 军表计划接线

## 2026-10-08 05:04 CST：共用事实语义修复完成，不追加旧候选第四审阅

针对第三轮真实付费案例查清工程输入缺口：地图有限同层搜索的`no_reachable_same_elevation_control_witness`仍被端口/审核直传`reachable:false`；计划与挑战者都容易把缺见证当不可能。`pregame-map-evidence-port-v1.mjs`现提供共用纯投影，单目标/双方比较/整军查询和`roster-final-plan-review-v1.mjs`同样使用：有见证保留true/certified_witness，否则null/unknown、unreachabilityProven=false。完整原几何/路线长度/失败码保留；旧已签false回执仅在读取时解释，不修改原字节/hash、不为清High改地图。整军审计完成不是每个底盘每条路线已获证明。

`mission-marker-scoring-arithmetic-v1.mjs`明确specialLeadWinCondition的算式为own_cumulative_vp_minus_opponent_cumulative_vp、阈值来自原来源profile；未给对方累计分时terminalFromOwnScoreAlone=unknown，不能仅自身10分推断终局。这里只补Rules事实，不设战略偏好或替模型修改路线。审核/纠错共享事实构建器，v3_5上下文用于新调用，旧计划/Teach/审核历史不变。

新脚本只复现这个已观察bug：`verify-ticket-27-slice-272-captured-route-proof-semantics-v1.mjs`实际八Units/原选表hash/同Daybreak1377地形/付费计划与13回执捕获，修前一次红、修后一次绿；未知与正见证、单路/整军一致、相对分差、所有捕获不变，0Provider/Room。证据在S248原恢复目录`s272-real-route-and-lead-facts-capture.json`、`s272-route-proof-semantics-{red,green}.json`；私有原state捕获仅本机。

这不是把现有v5/v3计划改正确或通过：两者仍在三轮停点，不准入、不买第四轮、不重置费用。已非阻塞提问：是否基于新事实合同开**新候选**，旧候选/成本完整保留；原无计划对局继续。当前计划工作台尚未为新周期重载/付费。固定表28回复/¥1.670078、从头表32回复/¥4.273751继续独立；T27 5/6余S272，T23 33/36余3，完整三链0/3。下方为旧候选详细停点。

## 19:35Z 最新：两类名单/计划产出；工程断点已修，三轮来源复核停止

当前工作台14198/60913，原workspace-data不变，无新对战Room。固定表session `rws-c371853a-2b26-433a-9b53-ea8323d712f7`；从头旅程 `iterative-web-6c40244a-6270-461e-a726-8bb8327fb11c`，Teach `rws-6ad3c968-4b74-467d-a9a1-47cf908dfb51`。下文旧PID/包/计划皆为历史。

本轮工程交付（不重跑无关旧绿）：

- 审核与纠错共享唯一公共文本路径清单，补齐fallbackRouteText并完整应用所有scoreRoute文本替换。原V1 Provider合同不变，新增路径走既有精确路径V2；名单/日程/VP目标不可改。实际捕获红→绿，首次绿色尝试的假端口漏descriptor失败另存，修测试端口后一次实际绿；0Provider/Room。
- 共用安全Worker加异步FIFO，每个真正发送回合前仍查暂停/取消/额度；实际并发busy复现红→绿，峰值物理发送1，排队暂停不发送，失败也释放。它不是跨工作台服务的并行修改锁：同一workspace的activeRun仍串行，UI遇busy的操作确认为NOT SENT后等空闲再提交，不把它当网络失败或费用。
- 已完成且已提升的Teach在**纠错发送前**失败，不能被退回“Teach未完成”。仅同一已绑定已复核计划/零轮发送/具体preflight错误可恢复原定点纠错；实际捕获红→一次绿，不再做选表、Teaching或再次提升，三轮上限保持。
- 计划UI固定名单修订与组件用途入口已真实验证；最终一次14路由构建通过，后端变动复用此包，没有新构建。

### 固定七Units/2000/115V/33模型

同原基线名单、升级、三战术卡及Daybreak编译。合法进场日程：R1 Marine1/Marine2/Raynor共5 Supply，R2 Medic后6，R3 Marine3后8，R4 Goliath1后10，R5 Goliath2后12。这是模型所选计划，不是规则强制Goliath第4轮才可进场。v4模型终审50主张/7片/0High，但人工发现1+2+1=3、2+2+1=4，不能据0High准入。

Web定点修订到v5已改正上述加法，名单/日程保持；第三轮审阅仍5High，已停止且不买第四轮。真正明确错误是用自身累计VP达到10来推断**相对对手领先10**、终局时机；模型审阅也有把保守目标误当不合法数学的疑似误报，不能照单全收或全部豁免。28付费回复/1053394 reported units，按冻结价格/全未命中/8CNY每USD的现有口径保守估费约¥1.670078，非发票。`fixed-v5-three-review-stop.json`保留全部来源复核历史；UI截图`fixed-v5-third-review-high-stop-web.png`。v4公开文本可读于[ticket-27-slice-272-fixed-2000-daybreak-plan-v4-public-2026-10-08.md](ticket-27-slice-272-fixed-2000-daybreak-plan-v4-public-2026-10-08.md)，明确是历史未准入候选。

### 从头选表/2000＋地图计划

真实Web六轮模型/Builder选择，合法恰好2000的八Units：Marine large1、Marauder large2、Goliath small2、Medic small3；没有手动补分。Rules进场安排及公开用途审计完成，锁表Teach完成。原fallback preflight与阶段恢复修复后，Web原旅程只纠错公开文本，从v1→v2→v3。第三轮来源审阅剩2High，已进入source_review_nonconvergent，不开局、不再买第四轮。

剩余两条：objectiveControlText把“仅本名单小底盘有见证”写得可能被误读为普遍排除；goliath-1用途仍说80mm不能到达某些marker，而证据只是**未找到同高控制见证**，且与自己的摘要矛盾。第一条审核自己承认原句对当前名单字面为真，需将误报与真实事实错误分开；第二条的肯定不可达没有证明。不能用未知当不可能或为清High硬改地形。

完整独立账：名单/进场8付费回复2419116units；Teach/修订/复核24回复882045units；总32回复3301161units，保守估费¥4.273751。同表计划和原对局不混账，旧付费回放不重复计费。`fresh-daybreak-total-cost-v1.json`与`fresh-v3-source-review-stop.json`可复核；截图`fresh-v3-three-review-stop-web.png`。所有价格均冻结快照估计，无来源刷新。

T27仍5/6、S272开放余1片；T23 33/36余3，原无计划同房后台r23/R1Movement，23动作/160截图，Rules/Replay一致，未开新的有计划局。完整三链0/3。下一交付：保持原局完成；将规则数值、胜利**分差**计算和地图见证状态与策略意图分开，先用确定性事实校核减少假High，再处理候选停点；不能用第四轮盲重生成或源码内主观权重替代策略。无新代理/K3、安装、刷新数据、删除清理、提交；Warmachine文件不动。

本片仍开放，T27为5/6；不能把读图修复计作军表、长期计划或正式对照验收。

## 两条交付链

1. **固定表生成计划：** 原无计划基线保持2000/2000及15Units；用同一Terran七Unit军表和同一Daybreak冻结语义配置生成Teach长期计划，再作同表/同图对照。不移植旧LostTemple计划。
2. **从头写表和计划：** 原Web AI工作台多轮选表、Rules审核、地图路线查询、Teach、来源审核，产出合法选定预算军表与可执行公开长期计划。不是旧CLI或手工补分。

旧`build/ticket-27-slice-272-fixed-preset-map-current-v1`七Unit固定表计划在2026-09-25已完成，审核3Medium/3Low、零High；但绑定的是旧LostTemple拓扑`0bbf3388…ccc2`，不能作为当前Daybreak计划。

## 真实工程故障

使用原房间`runner-private.json`中的冻结Daybreak配置启动正式工作台，0付费请求、0新对战Room，实际报`COMPETITIVE_MAP_ROOM_FREEZE_INVALID`。三个诊断方向为旧类型误用、摘要不一致、部署绑定漏传。读取原SQLite初始状态（只读）确认：地图冻结是`starcraft_tmg_competitive_map_semantic_room_freeze_v1`，读图端口却无条件调用旧通用摆放地图校验器。摘要与部署绑定不是本次原因。

只修改`packages/roster-strategist/pregame-map-evidence-port-v1.mjs`：语义地图调用既有语义Room校验器，其他地图保持原校验器；语义地图摘要补明确准出范围，保留各底盘实际不可达结果，不把“至少一个底盘能到任务目标”说成全底盘全道路都通。没有关闭签名/冻结检查，没有改地形或任务规则。

## 具体红绿门（已过，不重跑）

在已有`verify-ticket-27-slice-272-map-evidence-v1.mjs`增加`--captured-semantic-map=`专用分支，只复现这个真实失败；旧地图/Teach/服务器门完全跳过，无创建或删除目录。

- 修前一次exit1，原错误精确复现。
- 修后一次exit0：1377地形、5任务点、固定军表7Units、3类已审底盘路线读入；旧原状态不变、exactMoveOrDeploymentLegality仍false。
- `strictUniversalConnectivity`保持false；双方可进场、必要任务/象限可达范围按原语义证书报告。
- 伪造setupPlanHash仍被语义校验器拒绝，不以兼容之名接受坏冻结数据。
- Provider/Room均0；不重跑已过门。此后端模块未被ClientDomain直接导入，不要求重构建已过网页。

捕获输入和红绿结果：`build/ticket-27-slice-272-daybreak-plan-web-sgbKA3/{captured-semantic-map-port-failure.json,semantic-map-port-gate-red.json,semantic-map-port-gate-green.json}`。捕获文件0600，无API密钥。

## 当前实际运行与剩余

## 18:24Z 更新：真实Web固定军表Teach已生成，审核缺口修复中

旧PID47287/50450为历史；当前PID63620/55277，session `rws-c371853a-2b26-433a-9b53-ea8323d712f7`。真实Web创建时使用原基线Terran七Units及原升级/三战术卡；`fixed-roster-map-parity.json`确认军表与Daybreak compilation完全相同，2000矿物/115瓦斯/33模型/起始army Supply12，未新建对战Room。

第一付费Foundation提出九项合理信息查询，旧八项硬上限失败。数量改为保留全部查询的软提醒；规则字段、工具类别、ID唯一性不放宽。JSON schema子集原先强制maxItems，实际失败后将缺省上限作为合法schema，其他明确上限仍原样执行。旧付费回复只在同role/round/context、同主版本并通过当前schema时回放，不改内容/hash，不跨角色/上下文。对应具体门红→中间schema支持失败→实际绿保留于`information-needs-gate-{red,green,green2}.json`，不要把green文件名中的历史失败当通过。

真实Web点resume一次，旧Foundation原样回放，0新增调用；Teach质询、修订、固定名单深化完成，18:03:16Z状态planned。十九工具回执，四付费回复合计569480 reported units，首次估费¥0.775191（all-miss定价快照估计，非发票）。计划含两层胜利路线、各组件用途、地形底盘可达性、对手假设、反制/失效触发；没有凭空确认尚未部署的支持半径或进场轮次。固定名单不变不等于最终计划已过。

一次真实Web最终审阅50主张/7分片完成：8High/66Medium/7Low。查明工程漏传：固定计划没有openingDeploymentSchedule，旧事实投影却依赖其missionScoringProfileHash查找任务回执，错误过滤了本来已绑定当前地图的Hold Position回执。已有具体事实门新增实际捕获分支，修前unknown一次红，修后一次绿；按冻结任务recordKey匹配，若有schedule仍核对其profile，源/hash/重复回执依然拒绝，未知进场轮次保持未知。`locked-plan-mission-gate-{red,green}.json`；后端审阅context版本v3_4，旧结果留历史。

此外实际Web隐藏了锁定固定军表的策略修订按钮，虽然后端已有同名单修订能力。保存实际UI红例后补planned-preset入口，并强制包含deploymentConcept；只改此页面能力，不允许改名单。正在为该前端改动进行一次相关构建，随后须从Web修订/重新审阅。旧数学假设引用和未经证实的生存保证仍须按当前事实处置，不能因工程漏传而一并放行。

截图：`fixed-roster-same-daybreak-setup.png`、`fixed-roster-teach-plan-complete-web.png`、`fixed-roster-final-review-web.png`。三链仍0/3；本片5/6不增加，待固定计划准出、从头2000与同表/同图真实对照。

原首次失败工作台PID47287已退出；修后PID50450启动，原Web14路由包、当前冻结Daybreak配置、相同来源锁与Flash安全通道。工作目录如上。初始化本身不发模型请求、不创建对战Room。后续必须从实际`/army`页面进入AI规划并执行，留存军表、计划、地图证据、费用与截图。

剩余交付物：固定军表Daybreak Teach计划及审核；从头合法2000军表与Daybreak Teach计划及审核；正式同表/同图有无plan对照与策略/复盘证据。完整端到端链仍0/3。后台原无计划对局不会因本工作台暂停或重建。
