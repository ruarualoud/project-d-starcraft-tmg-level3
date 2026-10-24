# Ticket 23 / Slice 248 — 原完整宿主恢复

## 最新：原局已到 r75；两类计划修订来源接线门通过

原截图驱动53664实际exit0，原房间继续接受r73 Queen特殊进场、r74 Hydralisk finish_activation、r75 Medic move；第2回合Movement/player1，0–0、非终局。每一步都有普通页、完整桌面、控制台截图，最新0503–0505。合局199记录调用/44,431,813 reported units/~¥63.360728；r73恢复新增费0，后两动作新增6条调用记录/~¥3.951098，不能把恢复单步费用与后续新决策混算。

用户要求无计划原局后台跑完：新的连续截图驱动61465附着唯一41291宿主、同Room/SQLite，从r75续跑，不新建/重置房间，不复跑旧验证；继承原180接受动作上限，尚未终局。旧driver53664已terminal，不同时启动两套驱动。

T27/S272实际根因是普通固定表/从头表revision未传`selectedCandidateInputHash`，且未接`verified-plan-facts`；review和targeted repair已有共用事实不能证明普通入口已接线。现在workspace沿用已有候选hash计算传递，ordinary runtime复用同一`buildRosterFinalPlanVerifiedFactsV1`，contextSeed绑定现有事实内容指纹；不添加新签名/准入检查。保留旧军表、Supply、首次进场schedule和所有旧计划/三审记录。路线没有同高程通路证据仍为unknown；领先10VP是自己累计VP减对方累计VP，不是自己到10分即胜。

既有具体验证脚本新增实际双会话revision捕获模式，Provider发送前截获。前两次夹具失败（frozen fixtureRoot、port descriptor方法名）保留；修接线后第三/最终一次exit0：两个实际产品入口prompt都收到certified route evidence、unknown/unreachabilityProven=false及相对领先公式；0Provider/原workspace写入/Room mutation。证据`build/slice248-daybreak-resume-web-JgsoAG/s272-revision-fact-wiring-final.json`。不声称两次夹具失败是规则bug的红门，不重跑旧已通过v3_5或任何全量测试。

14198确认idle后正常关闭；一次重载启动因私有配置文件名错误退出1、0费用，改用已存在0600实际冻结配置捕获。64615已HTTP200就绪于`http://127.0.0.1:57909/army`，同workspace-data/冻结source1adbdb…/Flash，私有entry已0600保存。两原候选hash、planHash/version、scheduleHash、付费回复数、三审历史读回相同，0重载Provider/新Room；证据`s272-original-workspace-source-ready.json`。随后固定表v5→v6实际POST/revise202/running，明确修旧事实冲突而保留军表/schedule，完成后从头表v3→v4；不能称新计划已通过准入。API投影原固定表28replies/1,053,394units，原从头表Teach24replies/882,045units，Builder journey费用另记；API all-miss价格快照保守估计原¥3.340155/¥2.651991，与旧文本不同口径不得静默合并或称实际扣费。内置浏览器inventory空、iab unavailable，本轮没有虚构写表网页验收；源接线捕获门是产品service入口，不是UI测试。

T23仍33/36，余248原完整对局及整步性能、249同军表同图带计划对照、250报告/复盘；T27仍5/6，余272固定表及从头表地图计划准入；完整三链0/3。selected9+2配置不重跑，18经典图最后。以下旧状态保留为历史，以本节及最新进程证据为准。

## 用户明确续修：预测来源合同修复，原 r72 已实际推进 r73

用户本轮明确“继续修复吧”，之前 blocked 审计是历史停点，不再代表未获方向。本轮使用 diagnose 与 agentic-harness-evolution-loop；不新建房间、不重跑任何旧绿门、不刷新来源、不创建代理。

原记录表明：第一次预测的 current_round 正确，随后风险文本修正时模型将 horizon 写成 current_phase，而 basis 仍明确说 Assault phase。两次旧纠错只返回泛化的生命周期错误。新增唯一共用时序投影，将当前阶段、普通动作阶段与对手逐阶段激活事实提供给模型；纠错明确指出当前 Movement 与 Ranged Attack/Assault 的冲突，保留对象、风险和反制。Action 归一化 v45 只在原已绑定队形的同回合火力证据为正、对手明确未在 Assault 激活、basis 明说该阶段且没有次回合限定时，把 current_phase 改为 current_round。缺失/未知/未绑定/已激活/下一回合不修，真正动作仍由 Preview/Apply/Replay 裁定。

具体新 bug 门 `verify-ticket-23-slice-248-captured-future-phase-prediction-v1.mjs` 使用原 r72 完全相同的 observationHash、最后付费输出 `8d39160a…f32e39`、原 query receipts/所选队形。一次红→修后唯一绿 exit0；actor/target/confidence/basis/counterplay、所选方案和风险正文都保留。证据 `r72-future-phase-prediction-{red,green}.json`，原捕获 `.private.json` 0600；0 Provider/Room mutation，旧 gate 不执行。

5062 在双席零预留/零在途/idle 边界正常退出0；唯一新宿主41291加载相同 SQLite，`http://127.0.0.1:54477/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1` HTTP200。ready 入口0600已自动落盘为 `live-entry-r72-horizon-41291.private.json`，不得打印 nonce。原 state/binding/map/usage 完全相同，私有 operational journal 仅增加1次 seat_recovery_issued，未借重载清零付费历史或规则状态。

实际单步恢复：39.768秒，原 r72→r73，Queen 经 Omega Network 部署获接受；最后原付费输出 hash 保持、7次本决策调用/semanticCorrectionRounds=3 保留，合局193记录调用/42,821,712 units/~¥59.409630不变，新模型调用/费用0。Raynor→Queen 本回合射击预测保留。证据 `r72-horizon-source-same-room-ready.json`，实际 accepted transition 是部署，不是执行未来射击。此40秒是旧回复恢复单步，不称新 Agent 动作已全部一分钟。

原截图驱动53664已附着唯一宿主，继续同房补记 r73 及完成当前 activation；未声称该驱动已收口。Medium：normalizeDecision 尚未把局部 normalization sidecar 直接复制到 completedDecision；原付费返回、v45 本地重验标记、类型化预测与此定点绿证据均保留，不阻断动作，后续补审计投影。T27 普通修订漏共用事实/名单 inputHash 的实际接线缺口已定位，正在用真实两会话的无 Provider 捕获门处理；不买旧候选第四审核。

T23仍33/36，剩248原局与性能、249同表计划对照、250截图/PDF/复盘报告；T27仍5/6，剩272两类2000分地图计划准入。完整链0/3，selected9+2配置保持、18经典图最后。下面的 blocked/PID5062/r72 内容均为保留的历史证据。

## 长任务阻塞审计：主链三轮停点需明确解除

上一目标轮是进展：回放前缀修复、完整原结果/篡改隔离门及5062同房加载已完成。本轮实读HTTP200/service5062/r72/R2Movement/P2/0–0，host句柄仍live，但autoDrive idle/无job，原驱动40543实际terminal exit1；不是仍在跑对局，也不是等网络。原费用193记录调用/42,821,712units/~¥59.409630保持，本轮0新Provider/动作/费用，不重启驱动、不重跑门。

对局Action3轮停点及两类计划3次来源审核停点，在前两目标轮交付和本轮当前状态中均保持，已有至少三个连续目标轮的同一阻塞证据。固定候选roomAdmission=false，现有从头候选不能进入房间；noFourthPaidReview均保留。自动目标续行不是用户对该停止规则的明确解除。

允许范围内的两项性能修复已源码验证并接入，已批准异步门已通过且不重复；共用计划事实v3_5已修。现在不能把补旧动作第四轮、静默新计划计费或调整后置18图优先级当替代进展。当前三条完整链0/3，完整目标未达到；标记goal blocked，而非complete/自行paused。原宿主/Room/SQLite保持，不删除或关闭房间。

需要的具体方向：(1)允许只修r72最后已付回复的typed horizon阶段错配，补验一次、不重新生成；(2)允许基于已修正v3_5事实合同产生固定表及从头表的新计划候选，旧候选/成本完整保留，不追加旧候选第四审阅。解除以后先完成S248原局及实测，再S249同表同图计划对照/S272两类计划准入，最后S250完整报告与复盘；18经典图仍最后。

权威审计`build/slice248-daybreak-resume-web-JgsoAG/s248-goal-three-round-blocked-audit.json`。T23 **33/36**（余248–250），T27 **5/6**（余272），9+2选定地图配置已过但不冒称20图全量完成。本轮只更新阻塞审计/账本，不计新开发完成数；其它项目与未提交改动保持。

## 已验证回放前缀复用：两次原请求57.39→35.18秒；已同房加载5062

上轮属于实际进展：最终编队投影源码已85039同房加载、原查询38.289秒。本轮仍不释放r72时域/T27旧计划三轮停点、不重跑旧绿门或原查询，继续处理用户要求的整步性能。

先依diagnose列出三个假设：重复规范化/哈希、Rules本身、Store解码/投影。已有诊断脚本新增只读`--replay-r70-stages`，从原SQLite检查点64及6条真实回执恢复原r70；仅在独立dataURL模块包裹真实函数计时，不生产采样。一次exit0，完整已存stateHash保持，回放31189ms；exclusive：Rules Apply9111ms、枚举6798ms、instantiate4006ms、authority hash6326ms/121次、normalize3689ms/27次。证据`r70-original-replay-stages.json`。Rules重复执行是主要可消除成本，不泛称复制或数据库慢。

新具体重复前缀bug模式先跑红：同一Engine回放r69，再回放r70，重复5条已验证前缀，Rule Apply为11而非6，完整原响应已有hash基线；57385ms两请求，exit1精确因`11 !== 6`，不是夹具错误。随后仅修`transition-v1.mjs`的私有replay流程：每Engine最多一个成功前缀；每次原initial/checkpoint/冻结依赖仍验证，完整原initial+checkpoint身份及每条**完整回执正文**一致才复用原验证前缀。新增回执照常验签、resolve、Rules、事件/状态比较；旧历史缩短或前缀变化走原完整路径。根/回执仅普通完整JSON形态可用，访问器/自定义原型/隐藏属性/稀疏数组等不缓存；私有memo复制保存，复用也复制，不能由返回值污染内部状态。不换检查点策略，不新增公共字段、规则版本、Prompt或Skill。

该具体门修后只跑一次绿exit0：两次原请求35177ms，对照57385ms；Apply11→6。两个**完整原replay响应**hash一致，重复相同完整输入0新增Apply且返回独立envelope；改早期回执、checkpoint或initial均拒绝，缩短历史保留原响应。证据`r69-r70-replay-prefix-{red,green}.json`、综合`s248-replay-prefix-performance-delivery.json`。这是两次相邻回放请求的合计，不冒称单动作35秒、实际人机一分钟或完整对局。

当前85039实际idle/双席0预留及在途/无job，正常SIGTERM退出0；新5062使用同SQLite/no-auto-drive，父进程ready控制入口已自动0600持久化。等待期间同一5062句柄及存在性确认live，不按超时重启。现已实读HTTP200/service5062，地址`http://127.0.0.1:50589/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1`；完整state/binding/Rules/map/公共链/72动作/recent64接受记录/费用均一致。private270→271仅1条seat_recovery_issued，不是新游戏动作。当前顶层句柄`replayHostChildCurrent`/`replayHostStatusCurrent`，私有控制入口`live-entry-r72-replay-prefix-5062.private.json`禁止输出/提交nonce；源码SHA与实际就绪证据`r72-replay-prefix-source-same-room-ready.json`。加载边界`r72-replay-prefix-reload-boundary.json`、综合交付和最新进程记录已更新。原r72/R2Movement/P2/0–0、72动作、193记录调用/42,821,712units/~¥59.409630；本轮新增模型/接受动作/费用0。原已付和3轮失败保留，新宿主idle/无job、驱动40543仍terminal1，不重启付费驱动。

最终diff为1个AuthorityEngine私有replay修复、1个已有只读诊断脚本的两个具体模式及交付/进度文档；没有新永久测试文件、无关验证、旧绿重跑、构建、代理K3、安装、刷新、清理或提交。按agentic-harness-evolution-loop留实际前缀/原完整结果/边界证据，截图沿用已看0484，记忆保持/训练候选0。T23 **33/36**，余S248原局+整步性能、S249同表同图带计划对照、S250报告；T27 **5/6**，余S272两类2000分地图计划准入；完整三链**0/3**，已过选定9+2配置保留/18经典图最后。

## 最终编队投影复制修复：原查询38.29秒；已同房加载85039

本轮先核对用户批准的异步authority-interleaving补验产物：此前已passed，完整四方案/Worker门保持复用，没有重复执行。r72预测时域及T27旧计划的三轮停点不因此解除。

实际r69原调用参数16的定点拆分证明：最终编队校验347.65ms，其中geometryProjection207.43ms、实际Coherency kernel139.66ms。新诊断只加可选`--final-geometry-only`模式，在独立诊断模块观察实际函数；没有生产CPU采样或修改规则算法。证据`r69-final-geometry-split-diagnostic.json`。

具体生产修改仍只在`official-selected-roster-spatial-action-runtime-v1.mjs`：`geometryProjection`复用既有深不可变证明后共享冷数据/其它单位；根、pieces列表、board及整个被摆放actor私有。浅冻/可变输入继续原整局复制；actor只替换原首个匹配，支持地形过滤和原Coherency函数不变。没有修改Rules、API、Prompt、Skill、地图或候选集合。

新具体bug门先红，再修生产代码，唯一一次绿exit0。实际r69 Deploy/r26 Run的完整投影hash及Coherency结果与旧基线完全一致，整局clone次数1→0；被摆放模型写入不污染原输入，浅冻可变分支仍clone1并保持隔离。证据`r69-r26-final-geometry-copy-{red,green}.json`。独立门绕过域枚举，其首次深不可变证明使本地计时527→3342ms、492→3515ms，**不是局部提速证明**；保留不利数字，不把clone次数直接等同延迟收益。

因为生产投影直接影响原164个实例化，只有此新源码版本运行一次完整原查询，未重跑任何旧通过门：`r69-original-zero-option-after-final-geometry-copy.json`，exit0，搜索**38289ms**，前版42949ms、原版126252ms。完整result逐字段相同：4452生成/2968去重/164实例化/148地形阻挡+16模型碰撞/0方案；原冻结runtime、authority及投影域保持。不减少策略材料或把采样0方案当全连续域不可达。这个数字仍不证明完整Agent动作一分钟或完整对局。

当前同房加载边界：60731实际HTTP200/idle/无job，双席Provider无reserved/dispatched/ambiguous、activeReservedUnits=0，正常SIGTERM退出0。新85039使用同SQLite、原军表/地图/Rules、无auto-drive加载；父进程ready入口已自动0600持久化，所有宿主句柄/状态在REPL顶层声明。已实读**HTTP200/85039**，新地址`http://127.0.0.1:63645/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1`。完整state/binding/Rules/map/recent64接受记录/72动作/公共链/费用均一致；private269→270仅一条seat_recovery_issued，没有新游戏动作。当前句柄`geometryHostChildCurrent`/`geometryHostStatusCurrent`；私有控制入口`live-entry-r72-final-geometry-85039.private.json`（禁止打印/提交nonce）。边界证据`r72-final-geometry-reload-boundary.json`、实际就绪`r72-final-geometry-source-same-room-ready.json`，综合交付`s248-final-geometry-performance-delivery.json`和进程账本已更新。原r72、72动作、0–0、193记录调用/42,821,712units/~¥59.409630；本轮新增模型/游戏动作/费用0。新宿主idle/无job、驱动40543仍terminal1，未买第四纠错。

最终diff：一个生产函数、一个已有诊断脚本的定点模式、一个实际bug红绿脚本，以及交付/恢复账本。没有旧绿/全量构建/新模型/代理K3/安装/数据刷新/清理/提交。使用diagnose与agentic-harness-evolution-loop，规则结果/投影/可变输入隔离是回退判据，UI截图复用0484，不伪称新对局截图。T23 **33/36**，剩S248原局/整步性能、S249同表同图计划对照、S250报告；T27 **5/6**，剩S272两类2000分地图计划准入。完整三链**0/3**；选定9+2地图保留，18经典图最后。

## 已同房加载性能与私有诊断源码：当前60731/r72

上轮已交付具体源码与原查询42.95秒证据，本轮将其加载到正式原宿主，而不是新建Room。先实读HTTP200/原39314、autoDrive idle/驱动40543 terminal1；底层Provider attempts仅completed/failed、双席active_reserved_units=0，早期4个not-sent和1个egress失败不是在途调用。正常SIGTERM后39314退出0，同一SQLite/no-auto-drive加载新源码。

恢复编排发生了一次明确的问题：REPL把临时句柄声明在if内，后续调用无法读取它们，也没有保存新控制nonce；只针对已知自有51701查监听端口，HTTP200证明其实际仍存活/r72/原费用，并非超时或停服。持久化入口仍指旧63157，故保存stale-control证据后在实际空闲边界正常关闭51701，等其退出后再加载60731，没有同时重复宿主。此问题属于操作编排，不是Rules或模型失败；没有买第四回复。后续所有状态/句柄必须在REPL顶层先声明，并在ready时自动将控制入口写入0600私有生成文件。当前父进程ready观察已完成自动保存；不依赖未保留的临时输出。

当前正式地址 `http://127.0.0.1:60732/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1`，serviceProcess60731/HTTP200；句柄 `durablePerfHostChildNow` / `durablePerfHostStatusNow`，控制入口 `build/slice248-daybreak-resume-web-JgsoAG/live-entry-r72-performance-60731.private.json`（含私有nonce，禁止输出/提交）。当前两个席位仍deepseek-flash，autoDrive idle/无drive job，旧网页记录器40543 terminal1；不自动再驱动。

实际恢复比较：原roomId、MatchBinding、stateRevision72、stateHash、accepted journal head、public sequence和72条接受回执均一致；当前地图、Rules绑定、64条最近接受动作、双方分数0–0/第二回合Movement/player2及费用逐字段相同。private sequence267→269有两条`seat_recovery_issued`，是操作恢复日志，不是新游戏动作；不能泛称所有私有历史字节未变。0新增接受动作/Provider/费用，合局仍193记录调用、42,821,712reported units/~¥59.409630。193包括历史未发出失败记录，不冒称193个成功模型请求。

证据 `r72-performance-source-reload-boundary.json`、`r72-performance-control-entry-stale.json`、`r72-performance-source-same-room-ready.json`；前后完整manifest仅私有保存。最新进程记录已替换旧39314/starting快照；旧记录保留为历史。只做新宿主恢复完整性观察，不重跑任何已过测试/原查询/构建，也不新建永久测试；本轮没有改生产代码、Prompt/Skill/地图/军表或账单。使用agentic-harness-evolution-loop，harnessLoopUsed=true；原记忆目录复用，训练候选0，UI沿用已查看r72截图0484，不伪称本轮新增截图/实际动作性能验收。

**仍需方向的停点不因重载解除**：r72 Queen Omega选择有4合法方案，但最后已付预测typed horizon=`current_phase`、basis明确Assault，而当前Movement，已3次Action纠错停止；只修这个时域字段/补验最后原回复一次，不重新生成的方向仍待确认。T27两个旧计划3次review停点独立保持，不第四审阅或静默新计费候选。

剩余交付清单不变：S248同房恢复该选择/完成原无计划对局/实测整步成本；S249同军表同图带计划对照；S250完整对局/复盘截图报告；T27/S272从头写表及成表写计划的2000分+地图计划正式准入。T23 **33/36**（余248–250），T27 **5/6**（余272），完整三链**0/3**；已过选定官方9+经典2配置不重复，余18经典图最后。goal仍active，不因局部源码/宿主就绪宣称完成。

## 部署与重复枚举性能修复：局部证明不能冒充整条速度

上一目标轮属于实际进展：原查询真实计数改变了性能定位。本轮先在同一冻结r69状态捕获生产求解器的164组原参数，不产生Rules结论、Provider调用或真实Room写入；并不是再次执行旧完整查询。原state/LegalSpace/投影/runtime身份均一致。证据 `r69-original-deploy-callsite-capture.json`；私有状态及参数保留在`.private.json`，不进入公开报告。

`deployTerrainResult`现在在**单次评估**内懒准备、复用路径底盘，保持原地形顺序/段访问顺序、全底盘碰撞、草丛处理与原拒绝细节，不跨状态缓存。新的具体bug门先红exit1、修后一次绿exit0：164组原输入的地形结果完全一致，构造159080→328，孤立terrain seam74918→2387ms。证据 `r69-deploy-footprint-reuse-{red,green}.json`。没有复跑旧Movement门。这个局部时间**不能代表正式整条部署查询**。

该源码直接影响原查询的164次实例化，因此只运行一次该版本的原冻结完整查询：`r69-original-zero-option-after-deploy-reuse.json`，exit0，完整search summary与原记录一致（4452生成/164实例化/0方案/148地形阻挡+16模型碰撞）；搜索147417ms，**尚未改善整条耗时**。不选择性隐藏这个结果，也不把再跑一个好数字当验收。

随后只诊断两个原调用参数，未重复完整查询，也不CPU采样。`r69-deploy-instantiation-stages.json`表明：全单位域枚举分别473.84/401.73ms，最终编队校验238.01ms，部署terrain只11.64ms；主要剩余问题是同一状态每个候选重复枚举全部单位，不能继续泛称底盘/Worker慢。

第二个具体修复在同一空间Rules模块：WeakMap按**已证明深度不可变的原状态对象身份**与席位/includeDisabled复用完整枚举；浅冻/可变子节点/自定义对象/访问器不认证、不同状态与选项不混用，实例化原域的相等检查保留。新的重复枚举红例为[5,5,5]，修后核心检查为[5,0,0]、原错误细节一致、旧域仍拒绝。第二轮附加夹具错误地要求没有启用空间域的player2一定构建正域，保存失败；第三/最终轮只修未过的作用域断言，核心与旧域检查复用，不重跑，exit0。证据 `r69-spatial-enumeration-reuse-{red,green}.json`（green命名文件实际为保留的第二轮partial failure，勿冒称整个门通过）及 `r69-spatial-enumeration-remaining-guards-green.json`。剩余门的3ms不是完整计算计时；核心三请求实测901ms，对照1646ms仅局部。

因枚举源码再次实际变化，唯一一次这个新版本的原完整查询已exit0：`r69-original-zero-option-after-enumeration-reuse.json`。搜索**42949ms**（原基线126252ms，中间仅Deploy版本147417ms）；实例化42317ms、其余632ms。完整search summary与原记录逐字段一致，原v5 runtimeHash/stateHash/LegalSpace/投影身份保持；4452生成、2968去重、164实例化、148地形阻挡+16模型碰撞、0方案，不降低候选或策略材料。r64→69恢复21368ms属于诊断准备，不混入搜索。汇总 `s248-deploy-enumeration-performance-delivery.json`。每次仅因生产源码实际变化、直接影响164调用才做一次该版本测量；没有重复旧绿门。

这是**原精确查询**从126.25秒降至42.95秒，不是完整Agent动作一分钟、完整对局或计划链验收；模型/Preview/Apply/Replay和下一真实动作尚未覆盖。宿主39314尚未加载本轮新源码，原SQLite仍r72、驱动40543已terminal1，本轮费用新增0，合局仍193calls/42,821,712units/~¥59.409630。下一运行时交付须在零在途请求边界同房加载，不新建Room；r72时域及T27三轮停止仍待各自明确方向，不借性能门重置纠错计数。

本轮使用diagnose与agentic-harness-evolution-loop，`harnessLoopUsed=true`；目标StarCraft，Prompt/Skill/记忆与训练材料均未改，未调用模型。工具证据为原SQLite只读恢复、原求解器/Rules实例化与两例分阶段观察；UI证据复用已查看的r72截图0484，不冒称新增截图。回退/降级条件为任何原Rules结果/域身份/可变状态隔离不一致；不以缓存覆盖规则真值。

本轮代码diff为一个生产空间Rules模块、一个原诊断脚本新增仅捕获模式、两个具体bug门和一个两例阶段诊断脚本；没有新依赖、API/Rules版本、地图/军表/模型策略改动、安装、代理、刷新、清理或提交。r72时域三轮停点与两个旧计划停点独立保持，未买第四回复/审阅。T23 **33/36**，余S248原局/性能收口、S249同表同图计划对照、S250报告；T27 **5/6**，余S272两类2000分军表及地图计划正式准入。完整三链**0/3**，已过选定官方9+优先经典2图不复跑，余18图最后。

## 原r69只读复现：126秒的真实主因已经定位

新诊断脚本 `diagnose-ticket-23-slice-248-r69-zero-option-v1.mjs`只读原SQLite和runner凭据，使用原r64检查点+5条已接受回执恢复r69。原v5 runtime、MatchBinding、stateHash、LegalSpaceHash和原domain投影均完全一致。只在隔离Engine注册原依赖，不调用Room创建/Apply/Provider，不改原签名/骰子/军表/地图。首轮错误地把完整Rules域与模型投影域直接比较而停住；保存first-stop后仅修为生产投影比较，保留full域传给Rules，第二轮exit0。无第三次诊断或旧gate复验。

真实原Goliath2部署请求：4452生成候选，2968意图去重，164次精确实例化，0方案；148次 `SELECTED_SPATIAL_DEPLOY_TERRAIN_BLOCKED`、16次 `SELECTED_SPATIAL_PATH_MODEL_COLLISION`。搜索126252ms，164次实例化总125638ms，其余614ms。碰模型平均393ms，碰地形平均806ms；r64→r69恢复20512ms属于诊断准备，不混入搜索/新鲜对局性能。证据 `r69-original-zero-option-readonly-diagnosis.json`（含分阶段时间）及 `r69-original-zero-option-first-stop.json`。

结论是**这条无解查询几乎全部成本在Rules实例化**，不是等待比较Worker，也不是整个意图packing循环；不能把原111.744秒空档全部泛称LLM慢。0方案只针对本次采样，不证明所有连续位置/曲折路径均非法。不能删除Goliath候选、改变Supply或地形规则来让检查变快。

具体下一性能交付：已有Movement路径底盘在单次评估内复用，但Deploy的deployTerrainResult仍对每块terrain调用pathSweepsFootprint并重复创建移动底盘；先扩展同样的单评估准备，保持所有terrain/候选、精确碰撞和拒绝代码。共同状态/域验证仍须另外测量后再缓存，不跨状态盲复用。当前只是已完成真实诊断，不是已完成优化或整步一分钟。

原宿主实际HTTP200/39314/r72/idle，记录器40543exit1；本轮0模型/真实Room mutation、费用仍¥59.409630。实际查看新r72截图 `screenshots/0484-r072-player2-move-complete-board-applied.png`，Hydralisk Move已接受/Replay一致；少量头像旧Medium不在本轮扩展。r72阶段字段三轮停止和T27旧计划停止保持，等待各自明确方向。T23 33/36余248–250、T27 5/6余272、完整三链0/3；无代理/K3、安装、刷新、清理、构建或提交。

## 后台诊断具体修复：旧付费回执不变

依据diagnose/agentic-harness-evolution-loop定位到实际转接边界后，新增仅复现计数丢失的脚本 `verify-ticket-23-slice-248-unknown-query-diagnostics-v1.mjs`。实际已存r70 unknown回执为原样比较目标；Adapter计数7/失败代码是**明确的测试夹具**，不能称恢复了本局真实计数。先红exit1证明observer未收到诊断而旧回执已匹配，修后唯一一次绿exit0；不跑旧绿或第四阶段纠错。

最终本轮diff：`spatial-action-query-runtime-v1.mjs`增加可选observeQueryDiagnostic；在生成原回执之后，仅把合法非负整数计数、规则代码、查询总耗时、作用域及原hash送往独立后台observer，任意响应字段/result不透传。日志抛错/拒绝不改变查询结论，缓存命中不再调用Adapter。`scripts/support/ticket20-human-agent-demo-fixture-v1.mjs`两席接入既有observeBotStage，原JSON/策略输入/Rules合同无改动。第三文件是上述唯一具体缺陷回归脚本。

证据 `r70-unknown-query-diagnostics-red.json` / `r70-unknown-query-diagnostics-green.json`：原完整回执/hash一致、诊断保留、日志异常隔离、缓存去重和Adapter输入不变；0Provider/真实Room mutation。没有新依赖、Web构建、全量验证、提交或代理。只有源码与转接缺陷门已完成；宿主39314尚未重载，因此不宣称实际无解原因或速度改善。日志记录属于后台性能观察，不进入策略记忆或训练真值。

原房仍r72、驱动40543exit1，阶段字段三轮停点/旧两个计划停点独立保持。下一安全定位可用冻结检查点和原接受回执恢复隔离只读r69查询，保留现有search progress证明真实失败类别；不新建实际房间、不调用模型、不冒用夹具计数。T23 33/36余248–250，T27 5/6余272，完整三链0/3。

## 续行只读性能诊断：首查询不是并行比较等待

原宿主实际HTTP200、serviceProcess39314、room.stateRevision72；autoDrive idle/driveJob completed，记录器40543实际exit1。不据旧running文件重启、不调用第四纠错。当前停止和旧两个计划停止尚待方向。

对照r70原规划返回和付费时戳：首查询是Goliath2部署，返回 `RULES_QUERY_NO_LEGAL_FORMATION_OPTION`；下一查询才是Marine2移动并获得4方案。第一空档111744ms、第二23464ms。Async helper只有selectedJobs.length>0才await compareBatch；零方案的unknown路径没有比较Worker，排除“Worker卡住解释首空档”的猜测，但不排除内部baseline关系图、意图搜索、实例化和持久化。

同时定位具体证据缺口：Room Adapter在零方案时已返回attemptedCandidateCount/failureCounts；`spatial-action-query-runtime-v1.mjs`的delegatedResult unknown分支只保留分类/repairContext，将这些计数丢弃。实际已保存回执确实没有计数。不能据空结果断言是地形、底盘或Supply导致，也不为尚未精确归因的循环盲目剪枝。后续性能交付应先保留后台-only现有search progress并分离search结束→存储→下一Provider时间，不改变模型策略材料或合法候选集合。

无凭据交付 `r70-zero-option-gap-read-only-diagnosis.json`，harnessLoopUsed=true；本轮0Provider/Room mutation/验证命令、无源码/Prompt/Skill/Rules修改。本文/CURRENT_WORK/TASKS/PROJECT_MEMORY仅更新证据和后续定位边界，不计新Slice完成。T23 33/36（余248–250）、T27 5/6（余272）、完整三链0/3。

## 10:00 CST：r72新预测时域停点；没有第四次纠错

原房已连续接受r68–72，后台随后在Queen Omega进场选择停止，记录器40543 exit1，宿主39314保留同房。四合法队形已ready；首次Action错称安全，后两份已正确承认Raynor13490milli-inches/当前回合静止射击风险。但二者的预测 `horizon.kind=current_phase` 与正文“Assault phase”矛盾，实际当前是Movement，原阶段合法性检查拒绝。不是模型请求不通、主动作队形非法或刚通过的异步权威门失效。

3次Action纠错已满，保留所有原回复/hash/费用，未第四次调用、未清零或另起同候选审核。最后原回复hash `8d39160a64f7e4f21bf5d887ad58221fb27f24e4b9ef624deb069084c7f32e39`。累计193calls/42,821,712reported units/~¥59.409630，原72动作未回退。无凭据停止记录 `r72-prediction-horizon-three-round-stop.json`、进程记录latestObserved覆盖下面running快照。

建议的下一具体交付：只有当公开basis明确下一同回合行动阶段、选中精确队形提供当前回合火力、对手该阶段未激活时，规范化误写的current_phase为current_round，保留原公开策略和修复记录；真正当前阶段断言、已激活、未知火力均不放行。先报告此停点并取得定点补验方向，不重跑已过门、不买第四回复，也不一概软化生命周期检查。T23 33/36余248–250、T27 5/6余272、完整三链0/3，整局/一分钟仍未验。

## 09:57 CST：定点补验已过，原房实际续局

唯一获准的 `--stale-only` 门已 exit0：房间状态在计算期间改变时，旧结果返回High/unknown/null。完整四方案一致性、Worker重叠/关闭及输入隔离复用既有通过结果，不重跑；本门Provider0/Room mutation0。证据 `r35-formation-authority-interleaving-admitted-green.json`，旧计划三轮停止不解除。

宿主39314和网页记录器40543继续原SQLite、军表、地图、冻结规则、记忆、费用与骰子历史，实际加载v26/v44/复制/编码缓存/异步Adapter。页面 `http://127.0.0.1:63157/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1`；下面12595和“尚无r68”均为历史。

r68六模型Raptor Move已Rules Apply/Replay接受，回执 `07970cbf22e043165a864b01fcc87b402c53bbfa1f96e6b2a39b353791c9a791`。原已付Action hash `19c3da9a6e9cb3e0472b05feb60d4daab06066666485aacb33d9901386c0b1d1`未变、恢复新调用0；Jim Raynor与Marine2两条反击预测保留。证明 `r68-postmove-prediction-live-accepted.json`；已实际查看 `screenshots/0460-r068-player2-move-complete-board-applied.png`。此为工程接线证据，不证明策略最优。

r69关闭激活、r70九模型Marine2移动同样Replay匹配并留截图。09:57实读72动作/第二回合Movement/~¥54.492518、仍运行，未完成整局。实际完整棋盘截图间隔：r68付费复用恢复43.03秒（非新鲜性能），r69新鲜60.55秒，r70新鲜279.40秒。r70决策213.97秒、4个Provider窗口约76.20秒；第一次无解查询后的工程处理空档约111.74秒、第二次查询后约23.46秒，不能未经测量全归因求解器。Replay31.67秒（r69为15.56秒）。继续定位实际查询/重复Replay工作，不减少策略材料、合法选项或跳过Rules，不称整步一分钟验收已过。

剩余交付：S248原无计划整局及性能/工程收口；S249同军表同图带计划对照；S250整局/复盘报告；T27/S272两类2000分军表及地图绑定计划准入，旧候选三轮停点等待新候选方向。T23 **33/36**、T27 **5/6**、完整三链 **0/3**。无旧绿重跑、新房、构建、代理/K3、官方刷新、清理或提交；Warmachine保持。

## 08:52 CST：异步权威门准入、真实移动后预测误拒绝修复

用户单独回答“允许这一次定点补验”。既有异步门仅修正arguments中的domainId/currentLegalSpaceDomain；恢复原已验证async模块到Room Adapter，await结束后再读原stateHash/MatchBinding/revision。唯一`--stale-only`补验exit0，确实进入4option比较回调后发生revision变更，返回High/unknown/null/无规则权限；已过的完整四optionJSON、实际Worker重叠、事件循环心跳和关闭断言复用旧证据，不重跑昂贵Worker计算。该补验没有并行速度数值，不把stdout的0.01ms当性能。证据`r35-formation-authority-interleaving-admitted-green.json`；旧其它计划审查停点不解除。

12595宿主实际已复用r67末次付费Planner，v26 Medium记录保存，4个合法Raptor Move队形ready。随后3个新Action回复使原房仍停r67：前两个存在真实安全/计算错误，第三份模型已经承认所选队形Raynor底盘距13.438寸、在18寸火力圈内，并预测Raynor和Marine2反击；旧预测检查却读取移动前Raptor18.577寸的关系图，两条均误作current-round不在射程。这是生产工程输入的时态错误，不是再改策略/预算或伪造安全。

v44只从当前bound formationSelection对应exact回执和domain取选中option，为该移动目标读取enemy current-round profile/unknown字段；不信模型自填comparison、不借其它option或改变其它目标，未知LOS不证明不存在火力，阶段/已经激活仍严格。normalize与最终Action validation均传递ownAction，因此不再删掉正确反击预测。原已付hash`19c3da9a6e9cb3e0472b05feb60d4daab06066666485aacb33d9901386c0b1d1`原样保留。新测试只复现该具体bug：红一次；首修后夹具漏生产必经Planner→Proposal绑定未过；补齐后第三轮最终exit0。证据`r67-post-move-prediction-{red,green,bound-green}.json`，仅bound-green为通过，前两个失败保留。无其它旧绿复跑、0Provider/Room mutation的本地门。

实际新3次Action为989,043reported units/约¥1.217270，累计171calls/37,513,292units/约¥46.369678/454截图、r67/R2Movement/P2/0–0/67接受动作。`agent_decision`错误返回路径70.431秒，不是完整动作成功性能。网页记录器14250正常终止于High(exit1)，未盲再付费。全部原失败复制为`r67-action-before-postmove-repair.private.json`；旧付费/查询/模型理由与RNG保留。

08:52零在途请求、driveJob completed/autoDrive idle的同房边界保存`r67-postmove-async-safe-reload-boundary.json`，自有12595正常关闭，接下来同原SQLite加载async/v44并复用第三Action，不新开房、不买第四旧Action；现时尚未有r68 Apply/Replay，不能宣称已续局或整步一分钟。T23 33/36余248–250，T27 5/6余272、完整三链0/3。无Web构建、代理K3、官方刷新、清理、提交；Warmachine保持。

## 08:38 CST：用户明确续行，唯一未过selection作用域门通过

本次用户“那么继续吧，希望今天能有比较多的进展”作为已报告定点阻塞的续行指示，只补已定位的selection分句接线及尚未通过的作用域门一次，不解除其它三轮停点、不重跑旧绿门。`selectionThreatClaimFragments`保留同一原item上下文；只有单一明确own/allied前件的代词可继承身份，显式名称优先、歧义和全军声明严格。原scopeText误加平行formation分支的改动未恢复。

Planner v26在真实调用传入当前选中动作，返回持久的advisoryFindings。仅当前Move/Run且明确指向其它单位的plan.strategicApproach错误留作Medium；选中单位、其它动作、独立事实/计算、真实队形风险仍严格，Rules/Preview/Apply/Replays不改。`verify-ticket-23-slice-248-captured-plan-advisory-scope-v1.mjs`唯一补验exit0，原r67paid输出hash `621323e763a218e13b19524cddd3c4557ffcb0c326404281e175280d0789b6cb`未变。证据`r67-plan-advisory-selection-v26-green.json`；未写新测试、0Provider/Room mutation。

08:37实际99420 manifest HTTP200，仍原r67/R2Movement/P2、67接受动作、0–0、36,524,249reported units/约¥45.152408；autoDrive idle、driveJob null，双方Provider无reserved/dispatched在途记录。当前宿主尚为v23；接下来保存边界后同原SQLite安全加载v26，复用已付回复而非重买Planner，不新建房间。其它异步门和旧两个计划候选的三轮停点维持。T23 33/36余248–250、T27 5/6余272、完整三链0/3。

本轮只读新LOS探针对一对真实r35模型得到1377完整assessment/原结果hash，191组4775候选临时分配；没有测出这能解释分钟级瓶颈，因此不新增微优化源码/门禁，也不把它包装成性能交付。原两项历史复制/编码修复保持已加载。无构建、旧绿复验、代理K3、刷新、清理、提交；Warmachine保持。

## 08:21 CST：两项性能修复已同房加载，实际manifest就绪

99420新宿主实际HTTP200，serviceProcess.pid=99420；仍原r67/第2回合Movement/player2/0–0/67接受动作，原stateHash/MatchBinding/冻结v5 runtime全部保持，autoDrive idle、driveJob null。新页面`http://127.0.0.1:54816/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1`。本轮无模型请求、新动作、骰子或费用变化；合局36,524,249 reported units/约¥45.152408/449截图。不是新房或完整对局完成；控制面恢复计数正常变化，不能当动作增加。未启动付费/自动驱动来绕过三轮停点。

源码已由新进程加载，两项各有一次红→唯一一次绿；复制门没有因编码门修改而复跑。真实就绪证据`r67-history-copy-codec-same-room-ready.json`，完整manifest仅本机`r67-history-copy-codec-restored-manifest.private.json`，凭据隔离恢复点`current-background-processes-20261008.json`已指向99420/ready。旧79671及下面starting99420均为历史；不要据此再启动重复宿主。仍未验收整步一分钟。

最终本轮diff摘要：`live-flash-decision-port-v1.mjs`的单选择私有复制/只读历史共享及31调用点；`sqlite-live-decision-store-v1.mjs`的私有不可变JSON压缩条目缓存，外部Store接口/解码/schema/CAS不变；两个仅复现具体性能bug的捕获脚本及各自红绿证据；本doc/CURRENT_WORK/TASKS/PROJECT_MEMORY交付和恢复账本。没有更改Prompt、Skill、策略权重、规则器、地图或旧已接受动作，没有提交。

下一步等待已询问的三轮停点方向：仅修正Planner的selection分句位置，保留`it`的单位指代，并补一次尚未通过的作用域/Medium分级门；已过时态、简称、出入射、复制、编码门均不重跑。未得到明确方向前保持v23/idle，不做第四审核/验证或新付费。S248原局与性能收口仍未完成；S249同军表同图带计划对照，S250整局和复盘报告，S272两类2000分军表/地图计划准入。T23 33/36余3、T27 5/6余1、完整三链0/3；选定官方9+优先经典2保持原证据、18图最后。无代理/K3/构建/CPU采样/安装/刷新/清理/提交，Warmachine保持。

## 08:19 CST：SQLite不可变历史编码缓存通过，同房安全加载启动

第二个独立的实际性能bug已复现和修复：即使根元数据更新不改变任何决策，SQLite旧编码器仍遍历/压缩全部39个历史选择。新具体bug门`verify-ticket-23-slice-248-captured-history-codec-v1.mjs`只读原席位数据库，把记录注入实际SQLite **:memory:测试Adapter**；一次红证明39个历史选择再次编码，修后唯一一次绿(exit0)证明热缓存更新历史遍历0。前一个复制门已绿，不重跑。

修改仅`sqlite-live-decision-store-v1.mjs`内部私有编码器：按不可变对象身份缓存选择的压缩JSON条目；根元数据及可变选择重新编码。只有完整深冻结的普通JSON图可缓存，浅冻结而子数组仍可写不能缓存；自定义toJSON、属性访问器及特殊对象不作不可变证明。条目使用原JSON键上下文，最后拼接标准gzip成员，外部schema仍`starcraft_tmg_sqlite_live_decision_gzip_record_v1`、encoding仍`gzip-base64`，原解码器/表/CAS事务不改，不需要迁移或新依赖。

真实捕获原文91,453,308bytes/39选择。新测试中4次保存均只在:memory:执行；完整存储JSON hash保持`0e7707e0c23b778d5fc3782afa4657c37c4a983bc991bf520485ab3efe06538b`，原捕获hash保持`e9d40e3df8e570d4a5372060096a15cc97e51cbdd31a4b749c9853fb5c66049f`。浅冻结子数组改动被原解码器正确读回，失败CAS不更改版本。压缩记录14,886,554→14,972,202bytes，增加约0.575%，作为缓存吞吐换取的中性成本留存，不设置任意新长度硬门。证据`r67-history-codec-{red,green}.json`；0Provider/0真实数据库写入/0Room mutation。这是消除重复编码的功能证据，不另造整步耗时或反复跑微基准。

08:15安全实读：原manifest HTTP200，r67/R2Movement/player2/0–0/67接受动作，双方Provider在途0、autoDrive idle/driveJob null。边界保存`r67-history-copy-codec-safe-reload-boundary.json`。79671正常退出0；08:17:43新自有99420从**同原目录和SQLite**启动，禁用auto-drive和付费重试，保留v23、原冻结v5/名单/地图/RNG/记忆/费用，复用原Web包与阶段观察。启动配置只使用已经读取的resume-directory/observe-bot-stages接口，私有entry单独保存在`live-entry-history-copy-codec.private.json`，不得输出或提交。此刻尚在启动，凭`current-background-processes-20261008.json`和后续真实manifest就绪记录准出，不能把旧79671当运行。未开启新房或新驱动。

三轮语义/异步/旧计划停点保持，未第四验或新模型付费。剩余交付：S248完成原无计划局/实际性能与工程收口，S249同军表同地图带计划对照，S250整局及复盘证据；T27/S272完成固定军表和从头2000分军表的地图计划准入。T23 33/36余3，T27 5/6余1，完整链0/3。无全量/旧绿/Web构建/CPU采样/代理K3/安装/官方更新/清理/提交，Warmachine保留。08:07复制结果仍有效，非后续编码速度实测。

## 08:07 CST：长局决策历史重复复制修复，单一聚焦门通过

本轮不重开房间、不调用模型、不重跑旧绿。当前仍原r67/第2回合Movement/player2/0–0；79671只读宿主未重载，自动驱动仍停，67接受动作/449截图/36,524,249 reported units/合局估费¥45.152408不变。T23 33/36余S248–250，T27 5/6余S272，完整三链0/3。下述仅**源码及具体捕获回归完成**，不是当前宿主已加载或一分钟完整动作验收。

实际当前P2决策记录约91.45MB、39个选择。旧`commit`对每次小更新执行`structuredClone(record)`，因此一次只修改当前选择也复制全部历史。唯一新bug回归`verify-ticket-23-slice-248-captured-history-copy-v1.mjs`从当前席位SQLite以readOnly读取，通过真实`resolveCommitUnknown / closeMatch / read`接口和私有测试Store复现。为进入恢复接口，只改变隔离夹具的未知状态；**不声称真实已付费回复未知、不写真实数据库**。无Provider、查询、Prompt或发现调用。

修前一次红：三个更新各复制39个决策，复制分别4495/3287/2890ms；恢复约4501ms、关闭约3288ms。源码修复在同一个`live-flash-decision-port-v1.mjs`：根元数据私有复制，只复制明确的当前选择，38个其它选择深只读共享；31处选择更新统一使用`commitChoice`，匹配恢复和关闭仍为根元数据更新。其它选择的引用和新增槽位受私有不可写约束保护，失败CAS不修改旧缓存。SQLite表、编码、完整历史、费用、使用量和持久化事务不改；当前Planner仍v23，两个Prompt版本不变，无新策略注入。

修后对应门**只跑一次、exit0**：恢复约752ms（包括首次冻结历史）、纯根状态更新约28ms；根复制约3ms，当前选择复制约98ms。完整恢复和关闭序列化SHA256分别仍为`54752215958ca24089d0c6579447f7123eeeda5a88ee6c7c470b8fb486e9badb`、`e24d987b5d76ef3e8b8f79242564c5d104a21d4278130ad641c7a5091a1376e7`；38个历史选择共享且不可写，当前选择独立，原图和失败CAS保持，0Provider/0Room mutation/0真实数据库写入。原恢复目录的`r67-history-copy-red.json`和`r67-history-copy-green.json`保存完整证据，红例不是新对局失败。

这个测试Store不计SQLite整份JSON/gzip/WAL落盘成本，不把局部752ms当完整动作性能。下一交付：收到三轮停点方向后，仅修Planner分句接线/补一次未过门；在双方0Provider边界同房加载已验证后端，继续r67并用现有阶段记录观测实际决策/执行/Replay/截图。其它异步门和两个旧计划候选的三轮停点不因此解除，不购买旧计划第四轮审核。无新构建/CPU采样/代理K3/安装/官方刷新/清理/提交，Warmachine保留。

## 07:48 CST：原房网页恢复已实读，次数停点保持

自有79671进程signal0确认存活；`/__ticket23/a2a/manifest`实际HTTP200。原房r67/第2回合Movement/player2/0–0、67接受动作，binding/state/runtime仍为原v5，非新房。room248/private249/public68/recovery83是正常恢复后的控制面计数，不代表多执行动作。autoDrive为idle、driveJob为null，未启动记录器或新付费纠错。只读页面：`http://127.0.0.1:52093/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1`。

本次续行0Provider/0新接受动作，不重跑已绿测试或旧网页门。合局仍36,524,249 reported units/约¥45.152408。真实完整manifest只存原恢复目录`r67-read-only-restored-manifest.private.json`；凭据隔离的`current-background-processes-20261008.json`已经覆盖旧r66/32372“仍运行”快照。后台回调对REPL原始boolean的重绑定不可靠，读取实际文件/进程/HTTP结果，不能把boolean=false当宿主失败而重启。

非当前单位策略描述Medium方案仍**未准入**、生产v23保持严格；三轮停点未解除，待用户对仅一次定点修正/未过门的方向。自动目标续行不替代该授权，不运行第四次检查或盲付费。T23 33/36余S248–250、T27 5/6余S272、完整三链0/3。以下为源码修复和停止原因。

## 07:42 CST：原r67未推进；具体修复、真实费用与三轮停止

当前仍r67/第2回合Movement，449截图、36,524,249 reported units、合局估费¥45.152408。本轮**0新接受动作**，不能称对局恢复完成或高策略准出。上一段“不买第五Planner”是恢复意图，实际并未实现：原第四付费计划通过时态检查后缺队形意图，补齐后Hydralisk候选未找到合法队形，随后模型改选Raptor但持续否认Hydralisk入射威胁；实际新增4份付费回复、1,261,083units、约¥1.567801。全部8份本选择返回、原hash和失败证据保留，没有手改计划、清零计数或删除失败。

真实观测已生效：该次`agent_decision`182.174秒，其中4个Provider dispatch至settle窗口合计84.740秒，剩余97.434秒包含查询、存储与宿主处理，未精确归因。读取约0.5–0.6秒、合法域约0.8秒、空间观察约0.36秒、记忆观察6–40ms；无下一Apply/Replay成功证据，不能把错误返回路径当完整动作门。阶段只写元数据，不入模型材料。费用和窗口原始事实在`r67-recovery-and-advisory-three-round-stop.json`。

聚焦源码修复保留在v23：

1. **计划时态**：承认当前在射程内，再提出移动目标，不是当前安全事实；原捕获一次红→一次绿。
2. **简称身份**：从当前观察的单位名称解析通用末词简称，不硬编码Raptor表。真实Raptor18577、Hydralisk16573，旧校验不能识别简称，错误套用后者。修前红；首修后“简称与全名相同”已通过，但脚本后续真实入射否定断言未过，失败完整保留。
3. **出射/入射区分**：原返回的`is not threatened by current-round stationary fire`应判断为入射否定，不能与`has no fire band against ...`这种出射事实混淆。该未过断言在第三轮仅补一次，通过；已过简称/时态不重跑。`r67-incoming-denial-green.json`明确passedAliasChecksRepeated=false，不把先前名为green的失败文件冒充完整通过。

随后尝试仅将Move/Run中明确非当前行动单位的错误策略描述作为Medium，保留到复盘，不阻塞合法当前移动；当前行动单位、整军无威胁声明、实际队形及其它操作继续严格。这个拟议接线**未通过**：红例→第一次修后→第二次修后三轮均未收口。确切原因是我把完整item的`scopeText`加到相似的`formationThreatClaimFragments`，不是`selectionThreatClaimFragments`；Planner的分句仍只剩“it ...”，丢了前句Hydralisk身份。这是我的源码修改错误，不是测试脚本误读或Flash断连。

按三轮规则已停止，不第四跑或宣称Medium生效。全部未准出接线和错误位置的scopeText撤回到v23，严格判断保持；测试`verify-ticket-23-slice-248-captured-plan-advisory-scope-v1.mjs`及三个失败报告留存。已单独询问是否只允许修正确切Planner分句位置并补一次未过门，不重复任何旧绿。源码撤回不是新测试或新部署成功证据。实际修正须保留原item的身份上下文来处理指代，但仍逐分句检查事实/目标，不能把整个计划叙事都当认证事实。

67178宿主正常退出0，安全界room247/state67/private248/public68/recovery82、双方0Provider在途。原房、v5、军表、Daybreak、RNG、记忆、截图和费用不变。网页重新以无自动驱动方式启动供读取；不自动买第四纠错周期、不开新房，后台状态随后凭`current-background-processes-20261008.json`准出。T23 33/36余248–250、T27 5/6余272、完整三链0/3；剩余18图最后，既有地图配置不复跑。无代理K3/模型诊断新调用/全量测试/网页构建/安装/刷新/清理/提交，Warmachine保留。以下为历史。

## 07:24 CST：r67计划时态误报修复；原房安全加载

原局实际r67/第2回合Movement/444截图、估费¥43.584607。旧记录器33478在下一player2决策报`LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`后退出1；不是断网、非法进场或新房。第三付费输出说“Hydralisk无当前原地威胁”，与雷诺Commando Rifle的16573底盘最近距离/18000射程矛盾，应当拒绝。第四付费输出则明确承认位于火力圈内，提出移动后争取断视线或超射程的目标；旧校验把这条未执行目标误判成当前安全声明。原第四返回hash为`87140caaa8c7c3fcd6862930c91092197d1defdbc72b39e243933f17ff476a30`，不改原文、不清零纠错计数、不买第五Planner。

`live-flash-decision-port-v1.mjs`的v21仅在`plan.strategicApproach`识别未执行指令，当前计算/独立当前安全事实/选定队形位置声明仍走原严格关系图检查。唯一新测试`verify-ticket-23-slice-248-captured-prospective-threat-claim-v1.mjs`使用真实r67付费输出和查询回执：修前一次红，修后唯一一次绿；未来目标放行、第三输出错误事实仍拒绝、复合当前错误声明与错误计算仍拒绝，原返回及证据hash保持，0Provider/0Room mutation。红绿产物在原恢复目录`r67-prospective-threat-claim-{red,green}.json`；不复跑其它已绿门。

为拆解已有141–590秒整步延迟，增加可选内部阶段观察：`hosted-bot-seat-runtime-v1.mjs`包裹现有读取/合法域/空间投影/决策/预览/确认/执行/Replay/连续性步骤；fixture仅传回调；宿主`--observe-bot-stages`将元数据异步写到`bot-stage-timings.ndjson`。不传输入、结果、凭据或模型消息，观察异常不改变动作错误合同，不注入Prompt/Skill/记忆。该后端修改不在Web依赖中，不做无关构建；验收使用下一自然动作，而非重复已成功动作。此刻尚不能称观察已生效或一分钟达标。

完整安全边界保存于`r67-prospective-safe-reload-boundary.json`：room246/state67/private247/public68/recovery81，双方Provider均无在途；原记录器已terminal。仅正常关闭自有宿主32372，退出0。新67178从同SQLite、冻结v5、2000军表、Daybreak、RNG、记忆与费用启动，网页自动attach安排好，未初始化房间或回退动作。实际就绪/下一Apply、Replay、截图以后续记录为准；旧r66运行快照已过时。当前T23 33/36余S248–250三片，T27 5/6余S272一片，完整三链0/3。异步状态变化测试及两旧计划三轮停点仍未擅自解除；无代理K3/源码刷新/安装/清理/提交，Warmachine保留。

## 06:59 CST：原房r66；实际耗时拆分及排除项

当前32372/33478仍后台运行原房，r66/第2回合Movement/434截图/33,937,051 reported units/估费¥41.951900。同SQLite/v5/军表/地图/RNG/付费历史未重建。r60–66的雷诺移动、凯瑞甘移动及Mutating Carapace、Marine1移向任务点和激活收尾均有实际Rules/Replay一致与逐动作截图；这不证明全局已完成或高策略准出。`current-background-processes-20261008.json`更新到此权威观察点；异步Worker仍未准入，原同步入口保持。S248未收口，T23 33/36、T27 5/6、完整三链0/3。

仅读取已发生的截图时间与Provider费用库，无新增模型请求或重复动作：r59/60/61/62/63整步操作前→应用整桌约141/590/198/349/234秒；其Provider dispatch到settle窗口累计25/86/38/51/44秒。剩余116/504/160/298/190秒包含规则几何、存储、控制面排队、网页刷新/截图及同时运行本地工作的影响，不能直接当作纯规则计算，也不能当纯网络耗时。所有成本字段明确为席位累计或合局累计，非单动作费用；保留未知用量。证据`r59-r63-original-room-provider-window-timings.json`和`r59-r63-original-room-observed-action-timings.json`。

现成manifest阶段钩子的唯一闲时观察总3.292秒，其中room_read1.064秒、两席读0.106/0.130秒、Provider读0、public_journal3ms。因此此前24–32秒读取不能未经排队分析就归因于清单本身。一次只读当前P1决策记录观察：编码6.438MB、解压原文39.469MB/27决策；读25ms、解压解析835ms、structuredClone1345ms、stringify586ms、gzip一级634ms。这显示整份历史有成本，但单次复制/编码2.566秒不是数分钟延迟的充分解释；没有因此改变存储/删历史或添加迁移。证据`current-manifest-stage-cost-observation.json`及`current-player1-decision-record-stage-cost-observation.json`。第一REPL观察的后台重绑定没有留下有效产物，未作为结果；实际原生观察器一次保存成功。

r61的三个`space.inspect_relationships`并不是相同查询：第一雷诺→七个敌方对象，第二雷诺→marker5/3/1，第三Marine1/2/Medic→六个敌方Units；全结果hash均不同。不能仅因kind一致而删除，策略输入没有裁剪。最新实际检查点64/56/48；存储读最新检查点，核心checkpoint的receipt序号与SQLite私有事件sequence不同，不能把数据库237误当核心64而判断尾段错误。“一直从32重放”旧记录不适用于当前；无回放门重跑。后续继续定位精确空间比较与同步宿主排队，不通过删资料/限制推理削弱策略。

已按三轮规则停止异步验证并报告夹具漏传domain；询问是否只补这一项未通过状态变化检查，既有昂贵Worker绿不得复跑。在获得方向前不第四跑、不加载异步接线；原对局持续推进。r62整桌图实际查看：背景/大部分头像显示，底部标签重叠仍为Medium展示项，不阻塞主线。无新CPU采样/旧绿/构建/代理K3/源码刷新/安装/清理/提交，Warmachine不动。以下为历史。

## 06:45 CST：同原房r61；并行实现的三轮停点与生产撤回

实际读回r61/第2回合Movement，404截图、30,877,697 reported units/估费¥38.147137；32372宿主/33478记录器仍运行同SQLite/v5/2000表/Daybreak/RNG/付费历史。r60雷诺Move与r61结束激活均Rules接受、Replay一致、截图观测对应revision：`0397-r060-player1-move-complete-board-applied.png`和`0403-r061-player1-finish_activation-complete-board-applied.png`。未新建房间、停止原局或重复任何动作。

本轮针对既有89秒四队形关系比较串行的实际阶段捕获，新增可异步批量比较的搜索导出与最多四个独立Worker，规则生成/预筛/完整结果/策略权重不变；Worker只收只读状态和比较任务，不接Room、Provider或凭据，按原顺序回填完整比较，错误保留同一纯函数计算路径。源文件：`legal-formation-search-v1.mjs`、`formation-comparison-worker-v1.mjs`、`formation-comparison-worker-batch-v1.mjs`。新增具体捕获门`verify-ticket-23-slice-248-captured-formation-parallel-v1.mjs`，红例复用原串行阶段凭据而非重复昂贵旧绿。

首次修后真实执行已通过完整四选项JSON一致、输入hash不变、实际Worker区间至少二重叠、调用方心跳、四任务完成和一次关闭。随后测试夹具错误地把既有unknown的ok:true期望成false；补充只测状态变化、不重复已过昂贵Worker断言，但夹具把domain传在顶层，真实接口要求`arguments.domainId`/`arguments.currentLegalSpaceDomain`，因此在计算前返回`RULES_QUERY_CURRENT_DOMAIN_MISSING`。这两处是验证代码错误，不是模型失败、原房失败或证明异步守卫通过。完整日志保留，不把名为green的computed中间件当通过报告。

按三轮收敛要求停止该验证循环，不运行第四次。`room-backed-spatial-rules-query-adapter-v1.mjs`生产接线撤回到此前已验证的同步入口，避免后续宿主误载未准出异步分支；当前32372本就未加载异步实现，原局不需重启。异步/Worker代码保留待方向确认，不删除失败记录、不改付费历史。`r35-formation-parallel-three-round-stop.json`为凭据隔离停点。首次失败之前未保存精确并行耗时，因此只报告已走过的断言，不声称具体加速数值或一分钟整步达标。本轮0Provider/0Room mutation来自本地验证，不含仍在运行原局的新增费用。

下一交付仍为S248原无计划局完成及实际性能/工程收口；S249同表同图带计划对照；S250整局与复盘报告；S272两类2000军表地图计划准入。T23 33/36、T27 5/6、完整三链0/3保持。选定官方9/9+优先经典2/2旧证据仅已验收配置，剩18图最后；两旧计划仍三轮停点，不买第四审阅。无Web构建/旧绿复跑/CPU采样/代理K3/刷新/安装/清理/提交，Warmachine不动。以下为历史快照。

06:26CST最新实读：32372/33478同原房已r59/第2回合Movement/392截图/28,256,555 reported units/估费¥34.941396；恢复后的finish_activation已Replay一致。`model-reuse-same-room-r59-followup.json`保存实际后续应用，整桌`0391-r059-player2-finish_activation-complete-board-applied.png`。该动作不是新LOS性能测试，一分钟仍未准出；当前后台running，以下r58是加载边界及源交付，不是当前回退点。

## 06:24 CST：原房r58续跑；同批模型计算复用与完整局部对比

当前原房r58/第2回合Movement，386截图，28,007,036 reported units/估费¥34.624095。新宿主32372与网页记录器33478已经就绪；同SQLite、冻结v5、军表、Daybreak、RNG和付费历史，未初始化新房或重做完成动作。加载前原r58动作/Replay/截图已存，双方Provider在途0，权威计数room216/state58/private217/public59/recovery71；正常关闭旧7743/15730。边界`model-reuse-safe-reload-boundary.json`、启动`model-reuse-same-room-driver-launch.json`在原恢复目录；新privateentry不得输出/提交。本次只有后端LOS文件，网页依赖没有变化，复用现有已通过包、不构建或重跑旧绿。

一次现成阶段钩子观察（不是新CPU profile）：真实r35四队形底层Rules捕获总102.567秒，四次关系比较合计91.489秒；实例化约2–3秒每次、生成8ms。所有四选项`incomingStationaryFireEstimate`都为无当前原地攻击域、0估算，因此当前慢速不能归咎于概率采样、也不能通过降低骰子样本解决。第一离线诊断误把已扁平的组合域交给直接空间实例化器，0选项、不代表生产结果，已停止并完整保留`r35-full-formation-stage-diagnostic-20261008/launch-mismatch.json`；正确观察使用同状态重新枚举的底层真实合法域，外层组合调度成本未包括。

具体重复工作：同一模型对多个目标，底盘以及该模型到同一地形的接近性在每对里重新计算。`official-terrain-los-rules-kernel-v1.mjs`现在只在同步批量调用内以实际piece对象/modelId复用已检查底盘，并以批内物理模型/已验证terrain对象复用近距判断；不跨状态或revision，不以公有ID缓存不同对象，仍评估所有模型对和地形。新具体测试`verify-ticket-23-slice-248-captured-los-model-reuse-v1.mjs`修前一次红（6≠4）、修后唯一一次绿：构造6→4、接近性6068→4411，两正常原hash/各1377评估和一未决原错误码保持；新调用修改base/source仍拒绝，默认严格接口仍拒绝未支持几何。小三对计时722→1099ms没有改善，不将计数减少冒充小样本加速。

源码修改后的唯一一次完整局部前后观察：102.567→89.047秒（单次约13.18%），四个队形及所有战术/规则字段完整JSON逐字节相同；未减选项/模型对/地形、未改Skill/Prompt或战略权重。证据`r35-full-formation-model-reuse-local-compare.json`，前后完整结果分别在`r35-full-formation-stage-diagnostic-corrected-20261008`和`r35-full-formation-stage-after-model-reuse-20261008`。这不是整步一分钟验收，真实新动作还需观察；此前r53完整操作307.938秒事实保留。

剩余具体交付：S248原无计划局完成＋真实整步性能/工程收口；S249同表同图带计划对照及策略差异；S250整局/复盘验收报告；S272两类2000分军表计划准入。两旧计划仍三轮停点，待新候选方向，不买第四旧审阅或重置成本。T23 33/36、T27 5/6、完整三链0/3不变。无代理K3、源码刷新、安装、清理、提交；Warmachine不动。以下为历史快照。

## 06:00 CST：网页容量恢复，原房实际r53；性能仍未准出

最新原房为第2回合Movement、r53，355截图，23,853,043 reported units/估费¥29.524292；同宿主7743/57909、记录器15730继续后台。原Room/SQLite/冻结v5/2000名单/Daybreak/RNG和已付费历史不变。旧9089记录器的连接失败已保留，不是当前进程。

真实失败：`read_room`有效响应4,197,857bytes，超过旧默认4MiB仅3553bytes，HTTP200却被客户端`TRANSPORT_RESPONSE_TOO_LARGE`挡掉。`packages/client-domain/authoritative-transport-adapters-v1.mjs`将未配置硬上限改成分级、元数据限定的软告警；显式`maxResponseBytes`仍严格拒绝，协议/超时/权限检查不变。没有裁掉官方资料、地图或历史。新增测试只复现该实际bug，修前一次红→修后一次绿，完整结果SHA256 `beac2297b22eb54d17a1d5eaef5261a5bc36d01e6f213257ab250f38e90403b0`不变、一次警报及显式硬拒绝均保持，0Provider/Room。证据`r52-real-web-room-response.private.json`及`r52-room-response-capacity-{red,green}.json`仅本机，前者不得公开全文。

只进行一次与客户端修改相关的本地网页构建：14routes、新bundle包含软警报码，未清缓存/下载/安装或跑无关门。新包`build/slice248-room-response-soft-web-xLUBhj/export`已在同宿主发布；旧served export完整移至`build/s272-component-revision-ui-yQkrqU/export-before-response-soft-20261008`，可以恢复，未删除。发布凭据隔离证据`same-host-response-capacity-publication.json`，构建receipt在新包目录。真实网页重新连接r52，截图`0349-r052-room-connected-initial.png`已查看，背景与单位头像实际显示。

随后原r52选择实际应用为r53：player2 Swarmling移动，18模型/18摆位、Rules接受、Replay一致、截图观测r53。原三份付费Planner输出及已完成查询保持；新增两份Action回复，不买第四Planner。操作前整桌21:51:07.483Z→应用后21:56:15.421Z为307.938秒，仍未达到一分钟。新LOS逐对隔离已加载，不能把局部门禁或网页恢复当整步性能准出。实际证据`r53-live-pair-isolation-capacity-recovery-accepted.json`，应用后整桌`0354-r053-player2-move-complete-board-applied.png`。

T23仍33/36余S248–250三片，T27仍5/6余S272一片；旧计划候选保持三轮停点、不准入，等待新候选方向，不重置预算/旧审阅；完整三链0/3。下一步在原房后台继续时拆实际整步耗时，不再CPU profiling或重跑已绿。以下时间/PID为历史快照。

## 05:35 CST：实际混合LOS整批失效修复；等待安全加载

r36保留的第四队形确实有`TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED`，7个Marine2模型对和3个Marine1模型对未决。旧批量函数遇到任一这种情况抛弃整批，关系图继而让所有正常模型对重做完整地形适配；这解释了局部两对门禁改善后，真实多模型动作仍出现长延迟的一部分，不是模型要求更多队形或候选穷举。

修复只在战术关系图的只读查询启用逐对隔离。共享地形/输入上下文错误仍在批量开始前拒绝；正常模型对保留原完整评估及hash，个别未支持几何保留原错误码和unknown，没有被当合法/可见/安全。原严格Rules批量API默认行为不变，仍抛出未支持几何。隔离后的批量证据明确记录失败数；旧失败回执不改、不补签。涉及`official-terrain-los-rules-kernel-v1`、`official-special-terrain-rules-kernel-v1`和`tactical-relationship-graph-v1`，未改Skill、策略权重或模型提示。

唯一新增测试只复现实际r35第四队形：生产归一化投影捕获两个正常模型对和一个未决模型对；修前一次红（同一真实错误），修后一次绿。每个正常模型对的1377评估和原hash保持，未决项仍unknown；生产图的完整地图scalar回退0次，严格API仍拒绝。2110ms是测试中多次接口及严格拒绝的总时长，不是完整Agent动作耗时。证据：原恢复目录`r35-real-mixed-los-pairs.json`、`r35-fourth-formation-option.json`、`r35-los-pair-isolation-{red,green}.json`；捕获只在本机保存。没有重跑其他已绿门禁或构建。

本项绿验时原局已实际到r51/第2回合Movement/338截图，第一回合已执行到Cleanup与下一回合初始化，0–0、估费¥27.397152。新修复尚未加载85986宿主：安全边界观察器等当前动作、付费返回和截图全部完成、无Provider在途后，才停止自己的记录器/宿主并从原SQLite继续；不重建房间、不重做已完成动作、不重置记忆/RNG/费用。加载状态以后续当前记录为准。T23 33/36、T27 5/6、完整三链0/3不变。

05:39 CST加载补记：原房已r52。观察器发出的正常记录器终止没有及时停下主循环，旧宿主忙于只读计算，5秒drive-status读超时；没有因此认定可强停付费请求。再次核对原库r52计数与双席Provider零在途，并确认下一choice只有三份完成Planner、没有任何Action请求，保存完整边界后才停止自有进程。原输出hash与两份已存查询保留，未做第四Planner。新7743宿主加载同原库/配置/已绿网页，自动attach等待就绪。此意外及边界详见`pair-isolation-safe-reload-boundary.json`，实际PID/加载完成以后续快照为准。

## 05:18 CST：原房实际推进r38，18模型Run恢复；整步性能仍未达标

原r35的Swarmling Run已成为实际r36：18模型、18摆位、Rules接受、Replay一致，整桌截图`0247-r036-player2-run-complete-board-applied.png`观测r36且已查看。原付费Planner输出hash `8c1f4a92cce9f90abac47d915aec0530cd17841e148c38dc02bfae9a816541e5`保持，0新Planner；只重做中断未产出回执的只读查询，再进入正常Action。四个完整队形选项保留，最终模型选择requested-left，比较回执未把未知LOS提升为安全。三份新增Action回复总46.040秒；两次公开语义纠错保留，不掩盖重试成本。

恢复后的操作前全桌21:03:58.232Z至应用全桌21:10:04.826Z为366.594秒，不能计入修复前整段停机，也不能声称一分钟。之后r37结束Swarmling激活，r38雷诺Run完成并Replay一致；该新动作操作前到应用全桌174.378秒，模型三回复共39.737秒，仍有显著本地查询/Apply/Replay/网页成本。先前两模型对599ms只是局部门禁，不代表完整队形比较已足够快。

凭据隔离的真实交付记录：`build/slice248-daybreak-resume-web-JgsoAG/r36-live-los-recovery-accepted.json`。同一85986/54798宿主和87446记录器仍后台推进相同Room/SQLite/v5/军表/Daybreak/RNG/付费历史，无重建或重复已完成动作。最后已读r38/第1回合Assault/260截图、21333250 reported units、估费¥26.426810。T23 33/36余248–250三片、T27 5/6余272一片、完整三链0/3不变。以下为历史。

## 05:04 CST最新：原房r35；LOS工程错误与性能修复，同房续跑

r28已完成原动作Apply/Replay与网页补拍，证据`r28-replay-web-recovery-accepted.json`；整桌`0195-r028-player2-use_active_ability-complete-board-applied.png`已实际查看。随后r29结束凯瑞甘激活、r30 Marine2 Run、r31结束激活、r32 Raptor主动能力及后续推进至r35，均有自动Replay一致和逐动作截图，238张，仍第1回合Assault/0–0。未生成带计划新房。原房20332002reported units/估费¥25.170729，未知/NOT SENT与两计划独立账保留。

r35的下一动作：Planner选择18模型Swarmling Run，原返回20:37:30Z已付费完成，哈希保留。随后没有Action发送，而是纯本地关系图LOS占线程；短CPU捕获约30/31.8秒在`lineOfSightPairs`/草丛适配，而非队形铺放。只读HTTP超时，不是Flash网络慢。精确活跃地形是1367impassable+10ordinary、零grass：图仅有草丛时才开批处理，普通LOS遇不可通过/坡道又退回草丛适配，该适配错误拒绝空grassAssessments，因此逐模型对重复整个地图。最初“视线没碰草丛”的描述更正为**草丛全部已移除、其他特殊地形仍在**。

保存`r35-before-los-recovery-boundary.json`后，确认双方最近Provider均completed、无Action在途，停止失控只读宿主/记录器；未倒退权威r35、不删或重写paid输出。源修复及唯一对应门禁：

- 特殊LOS批处理覆盖grass/impassable/ramp；空grass子集合法，仍核验全部普通适配地形。真实无草丛捕获红→一次绿，1377完整评估与正常核心LOS逐项/哈希一致，坏actor仍拒绝。
- 官方LOS核心仅本批准备/验证固定地形，不跨state缓存；一寸接近性用完整底盘包围框下界作精确否定，近处仍用原核；完全处于所有底盘连线包围域外的矩形保留原center_to_center_clear见证。两个真实模型对红→一次绿：4121→2744验证调用（包含适配构造自验）、5508→14昂贵接近计算、1007→599ms；每对1377评估、全部原结果/批hash不变，坏地形新调用仍拒绝。没有删模型对、地形、战术查询或注入战术权重。
- V3投影去掉进入既有V2所有权克隆前的逐字段重复复制。真实r24公共/双方视图红→一次绿，完整字节hash和修改输出不影响源状态的隔离保持；三视图局部4773→4373ms。输出合同/权限不变。

当前85986/54798宿主已加载本轮全部后端修复及原已通过Web包；87446网页记录器attach同一Room/SQLite/v5/2000表/地图/RNG/费用。私有入口`live-entry-los-recovery.private.json`不得打印/提交。只重做中断未产出回执的只读LOS查询，复用原Planner；实际r36及整步一分钟指标仍待观察，不能用两个模型对门禁推算整步。

证据都在原恢复目录：`r35-swarmling-run-formation-capture.json`、`r35-active-swarmling-run-cpu.cpuprofile`、`r35-active-swarmling-run-cpu-summary.json`、`r35-no-grass-los-{red,green}.json`、`r35-los-read-original-hashes.json`、`r35-los-read-amplification-{red,green}.json`、`r24-viewer-clone-{red,green}.json`、`r24-original-viewer-projection-hashes.json`、`los-recovery-same-room-driver-launch.json`。共用写表事实错误修复见S272文档；旧计划三轮停点不重置、不做第四审阅。

本轮source差异：`live-flash-decision-port-v1`原付费身份/重验、`official-selected-roster-spatial-action-runtime-v1`底盘复用、`in-memory-room-v1`投影、`tactical-relationship-graph-v1`特殊地形触发、两个terrain LOS kernels，以及S272的map-evidence/review/arithmetic三文件；具体bug脚本包括原身份门捕获分支和五个新真实捕获门。每个红例修后只跑对应绿一次，不跑旧绿/全量/重构建。无代理K3/安装/刷新/清理/提交，Warmachine不动。T23仍33/36余248–250，T27仍5/6余272，完整三链0/3。以下快照为历史。

## 2026-10-08最新：r28已接受，精确地形计算修复，同房补回放中

原房第1回合Assault已权威接受r28凯瑞甘Leaping Strike；截图记录仍暂在r27/189张，未把尚未完成的Replay/截图记为通过。62706宿主、63995网页记录器已从相同SQLite、冻结v5、2000/2000军表、1377地形、RNG和费用历史恢复；当前私有入口`build/slice248-daybreak-resume-web-JgsoAG/live-entry-terrain-reuse.private.json`不公开、不提交。没有新房、换名单或重新购买已完成决策。

r27的三次Planner纠错揭示能力名检查用子串把Leaping Strike认成Leap。修复为完整Latin词边界及同起点最长名称，不模糊修正candidateId；新增最新到最旧的保留付费Planner完整本地重验，只有当前全部约束通过才选用，原始输出/哈希不改。真实捕获门红→一次绿，最后无效回复仍保留；选用第二份原有效付费回复，未买第四次Planner。正常新Action完成并Appliedr28，与本地工程重验分开计费。

实际90秒CPU捕获定位`specialTerrainResult`约10.8秒，主要是在每个地形格重复验证同一模型底盘。修复只将同一函数调用里的路径/最终摆放底盘预计算一次，不跨revision缓存、不减少地形、不改碰撞/支撑/高差/入口规则。新增测试仅复现这个实测bug：真实r26 Marine Run捕获修前失败27540次/10777ms，修后唯一绿11次/516ms，保留1377交互、完整结果和原plan/result哈希，并拒绝假支撑；0Provider/Room。局部耗时减少约95.2%，不能冒充完整动作一分钟。

诊断器关闭时执行dynamic import造成宿主未处理拒绝并exit1，这是本次诊断操作的错误，证据`r27-diagnostic-host-stop.json`保留。动作r28已入权威库，因此恢复只补Replay/网页记录，不倒退或重做该动作。旧失联网页记录器终止，原资料不删除。新宿主加载已通过后端修复与原通过Web包，未重构建。

证据目录均为`build/slice248-daybreak-resume-web-JgsoAG/`：`r27-ability-name-collision-paid-capture.json`、`r27-prefix-collision-{red,green}.json`、`r27-local-recovery-cpu.cpuprofile`、`r27-cpu-self-time-summary.json`、`r26-real-run-terrain-reuse-capture.json`、`r26-terrain-reuse-original-result.json`、`r26-terrain-footprint-reuse-{red,green}.json`、`terrain-reuse-same-room-driver-launch.json`。捕获/私有入口仅本机；不得公开凭据或隐藏推理。

T23仍33/36，余248–250；T27仍5/6余272，两个计划候选到三轮停点，不买第四轮；完整三链0/3。下一步补r28Replay/截图并测实际后续动作耗时，原基线后台继续。以下时间与PID为历史。

19:39Z更晚快照：同一宿主/记录器继续，已r24/第1回合Assault/24接受动作/166截图，17703765reported units/估费¥21.865063。两类计划仍三轮复核停止，不开新Room；下一次以实际progress/manifest为准。下方r23是19:35Z证据，不是重新启动的另一局。

## 19:35Z 最新：同房身份读取修复真实续到 r23，性能仍未准出

当前原Daybreak房在第一回合Movement，r23，23接受动作、160截图、0–0。宿主15950/61193、Web attach记录器18397；仍使用原SQLite/v5、原2000/2000名单、地图、rng和所有付费历史。私有入口`build/slice248-daybreak-resume-web-JgsoAG/live-entry-identity-recovery.private.json`不得公开。下面PID与断点都是历史。

r21阻塞不是网络：末次付费Planner已经在**选中候选的比较理由**里明确写Burrow Ambush，身份检查却只读goal/summary，连续报缺身份。现将该当前候选的公开比较加入同一检查，不从别的候选借身份、不改模型文本/策略。原捕获门红→一次绿，0Provider/Room；v19原样重验最后付费Planner，实际进入Action，未购第四次Planner纠错。最初15479在初始化前因旧Web包过期退出，保留失败；改用已通过的组件修订包，未重构建。历史High保留在r21-before-identity-repair-host-reload.json，没有将名字一致宣称为规则/策略通过。

实际r22：player2 Swarmling `resolve_relocation_ability`完整18模型编队进场；r23：player1 Pass。两者Rules接受、自动Replay匹配；r22全桌截图`0153-r022-player2-resolve_relocation_ability-complete-board-applied.png`已实际查看。证据`r22-live-recovery-acceptance.json`含原Planner输出hash、动作/截图和保留预算信息。模型描述仍有把Burrow Ambush与Omega Worm混说的策略材料，交给S249来源/策略复盘，不把模型解释当行动参数权威。

只读核对本房冻结组成资料：Swarmling只有一个来源选项，small/18模型/起始Supply1/260矿物，Room相同；不能根据“18模型”自行改Supply或刷新来源。本房这一事实不代表后续更新版资料相同。

整步性能未达一分钟：r21操作前全桌截图19:26:08.345Z→r22应用全桌19:30:09.913Z，共241568ms，包含Host查询、三份Action回复、Apply/Replay及网页截图，不能以单份模型约19秒冒充整步。r23快照16036886 reported units、估费¥19.813353；attempt与已收到付费回复分开，未知/NOT SENT仍保留。三条成本流独立，不重置历史。

T23仍33/36，余S248–250三片。S248还需原无计划完整局及性能/工程问题记录；S249同军表计划对照与决策复盘；S250整局报告与端到端验收。T27仍5/6余S272，两个计划候选已达到三轮来源复核停点，不购第四轮。T24选定官方9/9+优先经典2/2真实Web证据复用，其余18最后扩展；完整三链仍0/3。

## 当前范围

继续原 Daybreak 房间，不创建替代房间、换军表、换冻结规则或移植旧计划。
这是固定 2000/2000 军表、无赛前长期计划的基线；有计划对照必须使用同一军表及地图配置。
T23 仍 33/36（248–250 开放），T27 仍 5/6（272 开放），三个完整端到端链仍 0/3。

原持久目录：`build/ticket-23-slice-248-standard-2000-aa-live-v1/daybreak-map-host-20261006-v1`。
恢复前为 r0 / 第一回合 start_of_round，15 Units 全在预备队。
冻结运行变体 `charge_round_path_v5`；1377 地形行、3 地图覆盖层，旧双席输入门已通过，不重跑。

## 本次具体修复

1. **工作树构建缓存串用。** 原完整网页导出实际报 `No routes found`，而工作树有完整路由。共享依赖的 Metro transform cache 没有区分工作树。`apps/starcraft-tmg-expo/metro.config.js` 将工作树路径纳入已有 cacheVersion，不清缓存、不删旧包。一次修后导出通过：14 静态路由，138.175 秒。
2. **冻结美术版本优先级。** 将地图工作树已实测的显式 assetPath 优先修复带入完整产品的媒体解析器；保留其他媒体能力。原 LostTemple V4 PNG 字节不变，复制到完整产品工作树，非重新生图。
3. **恢复入口漏用冻结缓存解析器。** 首次实际启动在工作树缺失 gitignored `army_units.json` 处失败；主 checkout 与工作树的来源锁完全相同。宿主的计划模块与实际 fixture 现在共用已有冻结根目录解析器，仍验证原冻结字节，不下载新数据、不默默换版本。
4. **恢复入口覆盖原交互模式。** 上一步通过后实际出现 `OPEN_MATCH_INTERACTION_MODE_MISMATCH`：直接启动宿主默认 native_tools，而持久记录不是该模式。宿主现在复用原驱动已有的双席 SQLite 模式恢复器，保留原模式及显式迁移约束，不重置模型会话。
5. **驱动重复初始化宿主。** 原截图驱动只能再启动一份宿主。新增 `--attach-entry-file=` 配合原 `--resume-directory=`，连接已经恢复的 loopback 宿主；后续仍是原 Web 操作、Legal/Preview/Apply/Replay、逐动作页面/桌面/控制截图和独立费用统计。外部宿主不由驱动退出逻辑关闭；需要重启宿主时明确停止并保留原断点。
6. **真实网页白屏与丢覆盖层。** 浏览器捕获 `AuthoritativeBattleWorkspace` 的 `undefined.map`；并非只缺初始空数组，完整产品共享投影根本未转交地图覆盖层。补齐 `mapArtOverlays` 的空状态、实际来源投影和 TypeScript 合同；真实原 r0 快照验证空状态0、来源/投影3/3。
7. **任务点重复。** 同一真实 r0 来源只有5个当前任务点，投影却合并了演示中心圈与冻结快照而画11个。复用地图工作树已实测的“当前 Rules 优先、缺失才用冻结快照”规则；该具体红例修后5/5坐标及ID精确相等。不是删除规则数据或改任务。

## 唯一当前网页包与日志

- 当前网页：`build/slice248-current-rules-map-web-zL6yb6/export`，14路由，最后对应改动一次构建通过（21.734秒）。
- 原宿主的网页路径仍为 `build/slice248-current-map-web-cache-isolated-fhrjvl/export`，现是指向当前包的本机符号链接，未重启宿主。
- 前一网页字节完整保留于 `build/slice248-current-map-web-cache-isolated-fhrjvl/export-before-map-contract-20261008`；发布证据 `same-host-web-publication.json`。
- 一次修后构建证据：同目录 `build-receipt.json` / stdout / stderr。
- 服务恢复记录：`build/slice248-daybreak-resume-web-JgsoAG`。
- 带 `private` 的日志包含服务访问凭据，只允许本机使用，不能公开输出或提交。
- 缓存缺失、模式不一致的失败日志保留。没有重复旧绿门，没有新增无关测试。

## 实际完整宿主 Web 恢复结果

2026-10-07 16:38:51Z 原模式恢复成功，实际启动122.932秒；PID13812，loopback53774，两席均 `deepseek-flash`，0calls/0units/¥0。网页修改通过保留旧包的热发布载入，不重复初始化。

真实完整产品网页已连接，浏览器页面异常0、HTTP错误0、1500px无横溢出；SVG实际1377地形、3覆盖层、5任务点，任务坐标和当前Rules一致。原地图响应是真实PNG，1536×1024、SHA256 `54fb2c23826fb774cf789bb8c07d2dce4d22621ff1d3596955c1ffe0249673f5`；三覆盖层全部解码。初始全部Units在预备队，0在场模型不是丢头像。

证据：`build/slice248-daybreak-resume-web-JgsoAG/same-room-full-product-web-acceptance.json`；同目录 `same-room-full-product-r0-daybreak-art-rules.png` 与 `same-room-daybreak-whole-board-initial.png` 已实际查看。白屏、任务点11→5的红例及对应定点绿证据保留。

原驱动PID25675于16:55:25Z连接现有宿主，**没有再启动服务**。初始化与模型选择先手完成至r2；随后具体输入容量错误使驱动停止。不是已完成对局，也不是网络失败。

## 地形提示传输具体故障及同房修复

原r2 Planner的两个查询都返回相同的1377地形集合，后续请求累计至2,747,366字节。Supervisor在发送前拒绝超过1,000,000的输入估算；四个失败尝试均为`provider_failed_not_sent`，没有四次额外模型费用。原三个付费返回、两条查询完整保留。无进展驱动停止是正确边界，不能用放松该保护代替修复。

新增生产模块`packages/online-agent-session/exact-geometry-column-table-v1.mjs`，将完全相同结构的地形字段表示为常量与逐字段列；同样的后续查询集合引用前一查询，不抽样、不删地形、不近似坐标。`spatial-query-prompt-projection-v1.mjs`与`live-flash-decision-port-v1.mjs`使用此无损表示，并补传原地图可达性证书。完整回执、权限和Rules输入不变，不注入策略收益权重。

已有具体bug门新增捕获输入分支，修前一次失败（2,753,539字节），修后一次通过（≤654,918字节）；观察与查询中的全部1377地形逐字段还原一致，关系、权限、哈希及证书不变，0Provider/Room。不要重跑该绿门或旧r80门。相关改动仅在后端，无须重构建网页。

原宿主在r2没有在途或发送状态未知的请求时正常关闭（exit0）；PID40715恢复同SQLite、冻结v5、两席Flash及原费用。新驱动PID45472于17:27:05Z attach该宿主，没有创建新Room。实际新Planner已使用`v31_json_exact_geometry`，648,644字节并成功返回；保留旧查询、继续后续Action，而非从第一步重新购买。

**最新实际断点：17:29:55Z，r3 / 第1回合Movement，player1 Jim Raynor进场，0–0。** 原UI路径完成Rules Apply和Replay（matchesCurrent=true）；30张截图已保存，完整桌面截图`0029-r003-player1-deploy-complete-board-applied.png`已查看。地形仍1377、原军表15Units、2000/2000。

费用累计742,959→1,294,254 reported units，估费¥0.903608→¥1.579508。记录的9个尝试包含4个未发送失败，实际收到5个付费返回；后续报告必须区分尝试数与付费返回数。请求体下降约76%，**没有证明token或模型费下降76%**；新Planner本身报告278,548 units，行动一分钟目标仍未通过。

模型称“靠近marker5”，但自己计算雷诺到底盘控制距离约12.292寸、到marker3约4.706寸；记录为策略复盘问题，不修改提示词、不重掷同一决策。此局继续生成基线数据。

新增证据位于恢复目录：`captured-r2-terrain-prompt-failure.json`、`captured-r2-terrain-prompt-gate-red.json`、`captured-r2-terrain-prompt-gate-green.json`、`r2-geometry-safe-reload-boundary.json`、`exact-geometry-driver-launch.json`。私有入口和日志不公开或提交。原付费返回与截图、旧宿主日志均保留。

## 同地图军表计划工作台

## 18:20Z 更新：r16网络断点已真实续过至r17

此前r3/PID40715等为历史。原房在r16遇到Action传输失败：TLS阶段约30秒后失败，无模型回复，714929 units保守预留记账，不得宣称免费或删除未知用量。完整Planner、查询、34个已收到付费回复与4个NOT SENT尝试保留。一次已授权恢复请求只返回blocked、没有调用Provider；实际原因是宿主queueDrive忽略retry参数，而且编排器只允许paused恢复。

具体修复：编排器仅对显式授权的provider_transport_failed/timeout在同revision/hash下接受重试；保留原High和明确“重试获准、不是成功判决”的历史回执。其他High、Rules/Replay错误、局面漂移仍阻塞。宿主把retry传到队列和恢复入口，不自动清空预算。新增测试只复现此r16具体bug：修前一次红，修后一次绿，0Provider/Room；证据`blocked-transport-resume-gate-{red,green}.json`，不重复旧绿。

无在途请求时正常关闭40715（exit0）。74725/55716恢复同SQLite、同v5、同军表/map/骰子/费用；76269 attach原网页记录器。18:20:05Z实际r17、第一回合Movement、17已接受动作、119截图、Apply/Replay一致。只新购失败的Action（286423 reported units/13.884秒），没有重买旧Planner和查询；未知失败记录仍在原SQLite。

此时累计7571044 reported units、估费¥9.432757；attempt计数含NOT SENT和未知发送，不能视为40次付费回复。最新数据以`progress.json`及原席SQLite为准。一步一分钟性能仍未通过，manifest曾17.817秒、网页刷新8.408秒、截图10.181秒，均单独记录，不以模型响应时间冒充整步时间。原基线后台继续；当前PID/私有入口保存在恢复目录，不能公开私有token。

T23仍33/36，余248–250三片；完整无计划/带计划/从头写表复盘三链仍0/3。

旧`fixed-preset-map-current-v1`计划虽有7Units/2000及零High审核，但绑定旧LostTemple拓扑，不能移植到当前Daybreak。新正式工作台PID47287启动于`build/ticket-27-slice-272-daybreak-plan-web-sgbKA3`，读取当前房间同一冻结mapConfiguration及相同来源锁，使用当前14路由包。附着Flash本身0请求，不创建对战Room；后续必须由原Web军表操作生成固定表计划与从头2000表/计划，成本各自计数。

下一步：此原无计划基线持续推进并逐动作截图 → 同表/同地图计划对照及从头2000写表计划 → 复盘。真实行动性能尚未证明一分钟以内，不能用网页构建或服务启动时间替代。

地图依据见地图工作树：官方 9/9 与优先经典 2/2 是**已选电子配方的真实网页证据**，不是所有任务或完整对局通过。
通用方法见[地图工作树方法记录](../../ticket-24-semantic-map-integration/docs/ticket-24-selected-map-common-acceptance-method-v1-2026-10-08.md)。
