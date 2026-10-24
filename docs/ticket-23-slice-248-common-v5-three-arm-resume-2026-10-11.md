# Ticket 23 / Slice 248 — 同版三组正式 Web 续跑

## 最新停点：A 已验收，C 三轮语义纠错不收敛，全组已停

2026-10-10T17:38:58.748Z，C 原房 r70/R2 Movement 的 player2 Planner 在三个语义纠错轮后仍失败，代码 `LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`。四份原始 Provider 输出都已完成并保存（首份为查询，后三份为决策/纠错），不是请求未通或 JSON 格式故障，不得擅自追加第四轮。

原语义错误依次是选中 Swarmling 的当前射界事实矛盾、漏比较 Pass、再次否认当前射界。只读原始工具回执显示 Swarmling到Marine1底盘最近距离9469 milli-inches，敌方 AGG-12/C-14/Rocket Launcher 三个当前回合静止射击 profile；Marine1 已移动，但 Assault 未激活，射击仍可在本回合执行。输出的“当前位置不在当前回合射界”确实与原图事实不符。错误摘要的 `horizon_unknown` 不是推翻这份原始事实的依据；更广的文本作用域/纠错反馈仍需按捕获定位，不能先宣布所有校验均正确或无工程缺口。

独立监控28195于17:39:02.001Z发出全组优雅暂停，17:39:09.344Z完成、exit0。一次定点 ps 未发现六个原 owned host/driver 存活。A/B 收尾的连接断开 `Error` 是本次维护结果，不记作另外两项独立策略故障。所有组恢复前必须同版，并先核对原权威/网页回执连续性；不回滚、重开或仅重启一组。

终态 Web 记录（不是凭计数证明权威状态）：A31/R1Assault/193截图/63calls，B59/R1Cleanup/364截图/99calls，C70/R2Movement/432截图/126calls。最终原房费用分别14.112435/23.039482/26.641030；按保留的历史分账偏移，累计估费 **A111.322483、B164.741640、C150.920833**，每组200上限不重置。原 paid 输出、已有 Replay、未知费用历史均保留。

A 本次修复仍通过：自动任务 completed，Planv6 当前独立审核 completed/nonstale、Highfalse、欠账0，历史军表/日程未改；不再跑 A 审核。C 新失败与 A 自动计划修订是不同入口，不能报告为 A 又修失败。

证据：baseline `all-stop-common-v5.private.json`、`C/planner-r70-original-failure-v5.private.json`、各原房终态 progress；只读事实核对，没有新模型、原房写入、旧绿重跑或代码热换。T23 33/36、T27 5/6、主线余四片和新12完整0保持。

前一轮真实交付为 A 自动修订/增量验收，以及 C 停机回执补录；不是重复汇报或未执行计划。本轮不重跑已通过验证，直接进入正式实验。

## 实际启动

三个原生 Node 空闲服务并行启动，随后读取各自实际 manifest。A 创建首个正式房间，绑定真实模型 Plan v6 `badb2eb6…e545874`；B/C 加载原房间，分别保留 r26 和 r37 的状态、记忆、已付输出及费用，不重新初始化。

三组实际数据均为 Standard 54×36 寸、双方2000矿、官方 `standard-d6-1`、1804条规则地形、Hold Position/Gauntlet。A/C 我方军表hash相同；三组对手军表hash相同。A为固定表带计划，B为新写表带计划，C为A固定表不带赛前计划。所有对手没有额外赛前计划，双方模型均为 `deepseek-flash`。

同一个集成工作树、共同源码 `s248-s272-auto-plan-repair-v5-20261011`、已成功导出的 Web v2。没有重新构建前端，或重复性能、地图、A来源审核门禁。

2026-10-10T16:41:37.274Z 开始启动三个附着 Web 驱动。初始 Host PID A17816/B17815/C17814，驱动 A19831/B19830/C19829；PID仅用于本次所有权定位，后续必须核对实际句柄/运行状态，不能把本页启动记录当持续运行证据。完整入口含私密控制令牌，只存私有文件，不在公开文档展示。

## 停止、记录与费用

轻量新任务状态观察已启用。任一新驱动/Host停止，或新drive结果失败/被High阻塞，即全组优雅暂停；等待已在途动作封口，不回滚已接受动作。之后保留实际回执，若网页漏录则使用已有补录路径。观察超时不会自动判定进程死亡或重复发送模型请求。

每步继续由现有 Web 驱动记录截图、公共决策理由、计划/意图/预测、查询回执与Apply/Replay。没有采集隐藏思维链，不提前声明策略、全生命周期或训练数据验收完成。

启动前累计估费 A¥97.210048、B¥157.089339、C¥137.766074，各自¥200，不清零。原B/C房间预算保持¥58.297842/¥75.720196，不能在恢复时重复扣已经计入的房间费用；A新房可用上限¥102.789952。旧未知费用预留保留。续跑后的费用以实际Provider账本另记。

私有证据位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1`：`common-v5-formal-start.private.json`，各组 `before-drive-common-v5.private.json`，`room-host-common-v5-launch2-20261011.*`、`web-drive-common-v5-20261011.*`。新任务观察写 `common-v5-live-jobs.private.json`，全组停止则写 `all-stop-common-v5.private.json`。

本页截至启动时，新12实验启动3/12、完整0/12；Ticket23为33/36，Ticket27为5/6，仍余248/272/249/250四片。原20图目标保持，官方9个选定配置通过不扩称所有规模/任务或20图全部验收。下一步观察本轮实际动作和工程问题，完整数据后才进行策略比较/复盘。

## 首次真实推进快照

2026-10-10T16:44:26.412Z，六个本次Host/驱动句柄均未退出，最新任务仍运行，没有触发全组停止。这是具体运行句柄和原始记录的观察，不是仅据启动文件推断。

- A r2/两条Web记录/13截图，R1 Movement；已完成初始化和真实模型首行动权决策，Apply/Replay一致。新增2次调用/232,376units/¥0.301528；累计A约¥97.511576。本快照证明计划入房绑定和首动作，不将其扩大为所有后续决策可靠延续计划的验收。
- B r28/28条Web记录/175截图，R1 Assault。原r26停点的Kerrigan Leaping Strike已真正接受为r27，随后结束激活r28；其公开理由明确接受两份当前回合射击暴露，推进中央marker，而非由Host注入保守策略。r27完整战桌已目视查看，截图观察revision27，Apply/Replay一致。Provider仍65次/12,074,678units，房内费用仍¥15.387181，说明使用原已付结果，没有新增模型请求。屏幕中凯瑞甘仍呈无头像圆形，列为展示观察，不以这张图声称所有头像齐备。
- C r38/38条Web记录/236截图，R1 Assault。原r37 Marine Run之后的结束激活已接受，Apply/Replay一致；Provider仍75次/10,750,446units，费用未增加。

三组正在各自下一合法动作。完整快照为 `common-v5-first-live-progress.private.json`；B原停点真实验收为 `B/retained-place-r27-real-apply-v5.private.json`。

[B r27真实Leaping Strike后的完整战桌](../build/ticket-23-slice-248-standard-2000-aa-live-v1/performance-baseline-B-20261010-v1/screenshots/0168-r027-player2-use_active_ability-complete-board-applied.png)

## 本轮实际续行与观察保护恢复

A r3 Marine1部署的真实公开assessment声明继续当前计划，并引用1/3号点路线、地图路线见证和首回合2+2+2=6 Supply日程；r4又选择Go! Go! Go!的2寸额外移动推进该队形。这比单纯计划字段存在更强，但仍不是完整对局的计划延续/策略效果证明。观察到个别替代项把计划的firstArrivalRound表述为不能进场，留待整局策略审核区分计划选择与规则合法性，不在本轮无证据改prompt。

B r29 Goliath的Autocannon真实攻击Kerrigan，r34另一个Goliath再次射击。已通过原房间原生SQLite**只读**取出r29公开接受事件，完整原始骰子及结算保存在 `B/first-current-ranged-public-journal-v5.private.json`：

- 底盘射击距离16.543寸，实际启用Long Range效果。
- 命中骰为6/6/6/2/6/6/4/1/3，逐骰门槛5，5次命中。
- 实际使用护甲骰6/2/5/4/1，门槛5，2次救下；另四个预留护甲随机数未使用，不能算入实际护甲池。
- 无surge/evade；最终3伤害、伤害标记3、无模型移除，Supply保持1。没有把模型说的预期2.713伤害当成实际骰子结果。
- r29的Apply/Replay一致，完整战桌图已目视查看；公开事件与NDJSON按revision/回执关联，为后续报告和复盘保留真结果。

[B r29真实射击后战桌](../build/ticket-23-slice-248-standard-2000-aa-live-v1/performance-baseline-B-20261010-v1/screenshots/0180-r029-player1-ranged_attack-complete-board-applied.png)

一次并行读取三份重型manifest的观察达到30秒超时并重置node-repl。马上用只检查本次PID的原生ps确认六个原Host/驱动仍运行，未将超时判为对局失败，也未重开或重复付费。REPL观察回调随重置消失，已启动独立原生Node监控PID28195；它只读取私有入口/进度、轻量drive-status和本次PID+精确启动时间，观察超时仅记录，不盲重启。发现真实新阻塞或任一进程终态则全组优雅停机并等待已在途动作封口。监控自身实际未退出且进度时间不断更新，记录在 `common-v5-independent-monitor-{start,progress}.private.json` 与 `independent-monitor-v5-20261011.*`；后续应核对这些具体实时状态，而非依赖已丢失的REPL变量。

16:56:53UTC最新观察：A r10/R1Movement、B r34/R1Assault、C r50/R1Assault，最近接受记录Replay均一致，仍运行。截图61/211/308；累计Provider27/79/92、units4,618,956/14,684,414/13,944,010。累计估费A¥103.123530/B¥160.484245/C¥141.706378。A跨过¥100已通知用户，各组仍按已批准¥200预算分别累计。完整对局0/12、剩余四片不变。

## C 首回合完成与冻结 Supply 来源核实

最新观察2026-10-10T17:18:05.888Z：A r25/R1 Assault、B r49/R1 Combat、C r66/R2 Movement；六个原Host/驱动仍运行，独立监控进度持续更新，最近任务完成且无failure/High。截图151/301/404；Provider累计49/97/106；累计units8,300,143/17,714,207/16,856,378。累计保守估费A¥107.842663、B¥164.453518、C¥145.293916，各自¥200继续累计，未知费用预留不释放。本页快照会随实际动作推进，不是最终账单。

C原生公开journal的r57–65已保存：Combat结束后依次确定marker控制、计分、非终局检查、回合结束效果、清理刷新、下回合先手骰、任务回合初始化和选择首行动方。首回合比分0:0；下一回合先手骰1/1对6/3，合计2:9，player2持先手并选择自己先行动。r64实际打开R2 Movement，供给容量双方8；r65只读原房aggregate证明上场pool双方6、可用双方2。没有用模型预测或截图中单位数量代替权威供给计算。完整证据在`C/round1-to-round2-public-events-v5.private.json`及`C/round2-supply-authority-readonly-v5.private.json`。

对18模型Swarmling Supply1的疑点已回溯到**冻结原始官方数据**，不是只读派生适配器：源锁捕获时间2026-08-30T06:18:09.287Z，units/cards/rules版本71/69/48；原Firestore `army_units/swarmling__zergling_`的small为18模型、Supply1、260矿，large为无可选配置；squadProfile为1–6模型Supply0、7–18模型Supply1。原`raptor__zergling_`则small12/Supply1、large18/Supply2。因此18模型并不全都等于large或Supply2，当前Swarmling计算正确，不作工程修正。凯瑞甘当前/pool Supply1、marker Supply2属于Commander的场景化计算，也不能混为部署消费。原始有限字段、源锁与原文件出处存于`C/swarmling-frozen-raw-source-proof-v5.private.json`，原房选配与派生值存于`C/swarmling-authority-source-readonly-v5.private.json`。

此次没有更新资料；结论限定冻结8月30日快照，不宣称是10月11日最新官网值。后续官方资料刷新保留原排期。只读诊断使用SQLite readOnly连接与原store keyId，没有调用会写PRAGMA/建表的store factory；一次诊断keyId填写错误导致本地解码失败，改用原身份后读取成功，未修改密钥、Room或Provider，也不是新对局High。

本阶段C完成一个回合，不是完整对局。T23 33/36、T27 5/6，余S248/272/249/250四片，新12完整0/12不变；没有因为资料疑点或观察超时重新初始化/重复请求/暂停实际正常游戏。

## 待整局审核的文字与位移观察（未确认为工程 High）

- A r26 Goliath Run：Planner请求preferredAnchor(12000,27000)，最终选择工具提供的(8000,34000)。原生目标关系变化是marker1距离减少78 milli-inches、marker3增加789；公开文字却称能缩短大部分距离，并将milli-inches错误简称mm。Action确实读到了返回锚点及距离、Apply/Replay一致，未发现写入位置不同于选项的证据。已读源码确认preferredAnchor由Planner透传查询；其与最终锚点不同仍需结合原完整合法域/地形与求解回执判断，不能仅凭差异断言丢参或修改目标。
- C r66 Corpser Move：Planner请求(18000,12000)，最终选(22000,8007)及三模型tight-spacing。marker4距离4042→4037 milli-inches，只减少5；marker5距离增加1673，最近Marine间距增加1248。公开Action承认进入射击范围、引述预期伤害0.64/无伤亡概率并接受风险；但“显著提高目标压力”的措辞缺乏实际目标距离改善支持，且早先assessment仍称在射击范围外。需要复盘区分安全重编队的真实取舍与文字延续未校准，不能把只读射击预测当实际伤害。

两条对应原动作/回执、模型请求/最终锚点和距离delta保存于`current-position-strategy-observations-v5.private.json`。暂作为Medium观察保留，不运行新对比模型/重复动作、不手改Prompt策略、不回滚合法动作；任何后续确认的工程High仍按全组停修规则处理。

### 原请求/工具回执只读回溯结果

直接以SQLite `readOnly:true`读取原席位live-decision已保存记录，使用现有纯解码器，不创建会写表/PRAGMA的store；没有重新运行求解或模型。A请求(12000,27000)与工具回执preferredAnchor一致，起点(9000,34425)，直线约8008 milli-inches，超过Run的7000额度。C请求(18000,12000)也原样进入工具，队长起点(22000,8000)，直线约5657，超过本次原生5000额度（模型文字所说Speed4000并非本次完整行动额度）。这排除了这两例的锚点字段丢失，不证明所有取数/所有移动均正确。

A原生成1260候选、检查944、原生实例化74，拒绝模型路径碰撞48/地形路径阻挡22；最终四个不同策略标签却具有**同一个actionHash和位置**，是候选物理多样性观察，不能称四条不同路线。C生成996、检查489、实例化52，拒绝模型路径碰撞48；四个选项为四种不同物理动作，但几乎没有靠近目标。两例searchCoverage都明确betterOptionMayExist=true，因此“当前返回选项合法”不能推出“再没有更好的合法走法”。不因这个有限搜索记录禁用任意位置能力，也不把solverScore当获胜概率或全局最优。

完整原决策/回执保存于`captured-position-query-decision-v5.private.json`，有限摘要分别为`position-query-diagnostics-v5.private.json`、`position-query-physical-evidence-v5.private.json`和`position-readonly-conclusions-v5.private.json`。只读诊断一次完成exit0，0新Provider/Room动作/生产改动/测试重跑。这些供整局后的工程与策略审核；暂未证实非法行动或强制错误位置，仍按Medium记录继续。

同一时段实际性能记录仍有长尾：A新drive任务17:21:12.346Z→17:25:52.835Z约280秒，B17:23:50.914Z→17:25:25.121Z约94秒；C r67的最新并行查询批次约78秒，尚在后续决策。原stage记录表明A Replay约19秒、B Apply约25秒/Replay约14秒，不能把这些生产时延算成仅模型响应或声称持续一分钟内。这只是正在正式对局中发现的性能观察，不重跑已通过性能case，不在运行中给单组换代码。

[C 第二回合Corpser激活完成后的实际完整战桌](../build/ticket-23-slice-248-standard-2000-aa-live-v1/performance-baseline-C-20261010-v1/screenshots/0409-r067-player2-finish_activation-complete-board-applied.png)

本图已目视检查；头像圆形缺素材等历史展示缺口仍记录，没有据其宣称全部前端验收完成。

harnessLoopUsed=true；routes=selfplay_agent/fact_probe；tools=实际Room只读、冻结原始数据、Web驱动、合法动作/Preview/Apply/Replay及持久记忆；uiTraceEvidence=续跑逐动作截图；decision/memory evidence=原始公共记录，非新测试夹具；trainingTruth=false。此次仅更新CURRENT_WORK、TASKS和耐久记忆，没有生产代码变更、测试重跑、代理/K3、提交或其它项目修改。
