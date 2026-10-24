# T23/S248–250 + T27/S272：新地图三组实验

## 2026-10-09 00:29：A截断原文留存来源修复；B/C同房继续

A v5原5条声明修订与唯一获批最终审核incomplete停点原样保留，没有再次发送或生成新Plan。已修两个共同来源：secure deliberation factory在incomplete分支先留存assistant公共output_text segments/原文字节及usage/receipt/context；独立incomplete诊断schema不能进入completed回复语法恢复，即使文本可解析为JSON。普通workspace round_failed私有保存同时覆盖OUTPUT_UNPARSEABLE和PROVIDER_OUTPUT_INCOMPLETE，不把截断内容投影成公共计划/审核。旧A原文已经丢失，源码修复不能追溯恢复，也不能冒称A已通过。

新测试只复现这个具体bug：verify-ticket-27-slice-272-incomplete-paid-output-retention-v1.mjs，在原A draft隔离副本及真实factory→workspace路径，dummy Worker而非真实Provider。首次夹具路径失败保留，正确冻结来源红为rawText undefined；唯一修后绿4358exit0，private draft留存完整原文/费用、两个message状态形态均保留、无自动重发/无准入，0真实Provider/原workspace writes/Room writes。未重跑其它绿门、构建或地图算法。

同workspace无activeRound/在途dispatch边界加载已验证来源，不动B/C宿主/名单/Plan/地图。首次重载retained args遗漏原enable-room-launch旗标，entry false作为配置红保留；随后显式补齐，最终8211／http://127.0.0.1:53055/army真实HTTP200、liveRoomLaunchAttached与liveDeliberationAttached均true，三原session存在、A Plan/usage/review原样不变、0新Provider。workspace-current-entry.json0600已更新，workspace-incomplete-output-source-ready.json是实际准出，旧64377/51643与6973/53021均历史。

00:29真实SQL：B r11/公开12，Web记录10动作/61截图；C r32/公开33，Web记录32动作/203截图，双方host81531/81530与drivers83747/83746存活。新鲜局未终局，完整0/3；最新分账约¥43.108477（A1.996806+B准备6.355486+共同P2准备1.085165+B对局10.010612+C对局23.660408），progress可能晚于SQL提交/后续调用，均估算非账单，不覆盖旧Daybreak/未知费。已实际查看B-r10与C-r32完整棋盘PNG，背景官方原布局轮廓、Rules层和实际单位存在；不能用截图代替几何或战略最优验收。

剩余交付仍S248机器链与性能/完整数据、S249同图三组终局对照、S250证据与复盘报告、S272两种军表Plan稳定准入，共4片；T23 33/36、T27 5/6，后置18经典图不取消。A追加请求许可待用户答复，B/C继续，不因此整体阻塞。

## 已实际续行的最新恢复点（2026-10-09 00:05左右）

- C当前host81530／http://127.0.0.1:52096，driver83746存活；同原Room r21旧5个已付回复outputHash/usage逐一相同，0新Provider重验形成完整决定，累计semanticCorrectionRounds仍3。实际r22 resolve_unit_lifecycle_ability成功召唤Roachling，付款player2-tactical-5、完整队形保持，AcceptedReceipt e9109e84…/Replay matchesCurrent true；随后r23。证据C-r21-summon-payment-real-local-recovery.json和screenshots/0142-r022-player2-resolve_unit_lifecycle_ability-complete-board-applied.png。这是实际Apply/Replay证明，不仅绿单测。
- B当前host81531／http://127.0.0.1:52093，driver83747存活；同Web创建的B-r2 Room，双方2000、17units/1804terrain，P1Plan c589ab9c／P2Plan6868f90d，JSON/v47；已r2/R1Movement/2paid调用。正式launch registry已同步实际新入口/同Room加载历史，之后Web重开不会误用旧PID。证据B-ordinary-web-formal-room-binding-green.json、B-zero-call-mode-alignment-start.json。两组仍非终局，完整0/3。
- 本轮源码diff：roster-planning-product-module-v1共用地图Room绑定；legal-formation-search-v1通用付款来源/旧exact canonical恢复；live-flash-decision-port-v1同付款消费与v47/只修付款事实Prompt；新增verify-ticket-23-slice-248-summon-formation-payment-v1仅复现已发生召唤bug。其余docs/current/root StarCraft记录更新，不覆盖Warmachine。唯一验证结果：B实际Web从503红到exit0绿；C具体gate红→一次绿0Provider/0Roomwrites，再实际原房已付零费Apply/Replay。未跑无关/旧绿/全量，不提交未关闭Slice。
- 计时勘误（2026-10-09 00:25）：原103.3s比较了两个不同choice。r21同choice-f42ecca0…的localOutputRevalidationHistory16:01:07.866Z→completedAt16:01:09.940Z为2074ms、0新Provider；16:02:51.166Z属于后续choice-bf682fa9…。C-r21-local-recovery-timing-correction.json保留原误读和正确绑定。不能把2074ms当新鲜完整动作一分钟通过；四席只读SQLite读取/解压/解析约36/513/538/1318ms，当前分钟级瓶颈尚需真实阶段归因，不凭这次勘误新增微优化。
- A维持唯一追加审核incomplete停点，已请求是否允许补齐本轮未完成片；未额外计费。余S248/S249/S250/S272共4，后置18经典图保留，所有旧未知费用/失败房/已过门保持。


## 本次最终加载点：B正式Web通过，C召唤付款来源修复

- B唯一修后Web验收PID71402 **exit0**，B-web-map-binding-fixed-response.json与before/after截图；正式Room为ticket23-slice248-aa-t27-5c1134629fc96767173b26f8a36009e7-r2，初始真实coverage双方2000/17units/1804terrain，map compilation22f5fe3c/audit8a1241ff，与C一致；Plan c589ab9c、共同P2Plan6868f90d真实绑定。旧失败r0独立目录保留，不当作一场对局。
- 初次attach明确拦截B native_tools与C json_channels_v1模式差异，0游戏调用。仅在已验证B r0/0Provider/0decision时用已有allow-failed-interaction-mode-migration允许空历史迁移，保持B原Room/Plan/army/map；双方已迁移为JSON，需同版v47重新加载，不能把异版对照标通过。
- C在r21/R1Movement实际三轮停下，driver53346exit1，不再说持续驱动；High ACTION_FORMATION_PAYMENT_NOT_APPLICABLE：Roachling Infestation cost2BM、三个已付Action都选tactical5，四个Rules instantiated完整编队候选canonical同样含tactical5。legal-formation-search却仅对use_active_ability输出付款菜单，lifecycle召唤返回空菜单；不是模型选错付款。具体原证据C-r21-summon-formation-payment-red.json。
- 来源已共同修复：projectStarcraftTmgFormationPaymentsV1对任意formation来源使用真实Rules payment enum，保留[] unavailable与[[]] free；旧工具receipt只能从complete/Rules canonical options恢复同付款，不修改旧receipt/paid内容，不免除final Rules实例化。Action Prompt只把self-place专有的付款事实改成所有适用编队动作，不加入策略分数；normalization v47启用既有零费本地重验。新增单测只复现这个具体bug，79052exit1→80105exit0一次，合法选项/原坐标付款不变、错卡/缺付款拒绝、无效canonical不补菜单/0Provider/0Roomwrite。未跑旧绿/全量/重新导出。
- C51568确认drive已completed且P2所有38物理请求completed/active reservation0后退出；B78238已JSON ready且idle退出。**当前C81530/B81531仍同各自SQLite/房间加载v47/json，无自动驱动；pending不等于停止，不重建。**后续读实际ready入口，只attach现有Room，C须证明已付输出→Apply/Replay，B启动正常模型对局；不是仅单测就说产品稳定。workspace64377/51643仍live。
- Medium待后续报告：B进场公有理由把2+1+1+1+2写成6，但Rules schedule中第一个Medic有真实能力减免poolSupply0，权威安排实际为2+1+0+1+2=6；不是非法7Supply进场。UI/文案需分别展示startingSupply与poolSupply，不能以中文理由覆盖Rules值。

剩余S248/S249/S250/S272共4，完整0/3、旧18模型冲锋搜索红仍保留、后置18经典图不取消。A唯一最终审核仍未完成，不通过/不自动重买。


## 当前路线与恢复点

2026-10-08 用户改为：在新验收地图上重新产生两种 Plan，再加无 Plan 对局，验证地图、写表和对局的稳定性及策略效果。本路线取代继续旧 Daybreak 原局作为主验收；旧局、付费历史和未解决的问题完整保留。

首图选择官方 TMG **Standard 1 / standard-d6-1**，54×36 寸、2000 分、Hold Position / Gauntlet，采用用户已同意的可编辑电子推荐属性，明确不是官方逐件数值。来源与地图代码位于 `../../ticket-24-semantic-map-integration/`。原图与规则配方已验收，不重跑这些绿门；仍须证明这份配方进入完整机器席和军表工作台。三个实验尚未建房或启动，不能标成后台运行。

**本轮已完成共同产品接线，尚未完成对局验收。** 九官方布局与冻结PNG已接入当前原配置器、HTTP、Standard/Skirmish工厂、规则地形和写表产品；不是另造地图宿主。Standard1原接口→实际Room工厂→真实写表模块一次定点门最终通过：30逻辑地形组／1804精确单元／1146移动阻挡／1388摆放阻挡，源图hash与地图／任务审核绑定一致。中途实际发现 authored blocksPlacement在转化中丢失，已从共同来源修复；最后夹具区分可穿越但不可占据的242个小地形，不改规则来迁就计数。当前LOS批处理、空间深不可变投影和参数缓存保留；旧绿不复跑。证据见下方新地图交付。

## 最新恢复与本次交付（2026-10-08，覆盖下方旧过程记录）

工作台PID64377／http://127.0.0.1:51643/army继续同原A/P2/B会话、同shared-map-configuration.json。正式开局已有开关现显式启用，不重建规划数据；P2Plan6868f90d保持0High，匹配编译22f5fe3c／任务审核8a1241ff，房间实例freeze独立。

- **A**：v5 Plan57ea5d42已修原5条得分/证据声明，军表、逐回合进场和部署原样不变。用户唯一追加最终审核已真实发送：首片已知回复使用32768输出tokens并返回incomplete，不是新的语义结论、更不是0High。原raw不完整文本没有被当前失败分支留存，无法无损本地续接；已付56513units包含在29calls/1256779units/~¥1.996806中。保留停点与审批/派发记录，不擅自新增付费审核，已询问是否允许受控补齐本轮。证据fixed-v5-authorized-final-review-start.json、A-v5-authorized-final-review-incomplete-stop.json。
- **B**：同iterative-web-daf2a16e…实际完成原Rules合法恰好2000/9units、原候选3d9ed874和最终Teach Plan c589ab9c，完整来源审核0High，非手工补表。B-final-plan.json可读。已从普通Web“用此军表开始AI对局”按钮真实调用；首轮503/AGENT_SELECTED_TEACH_ROOM_MAP_MISMATCH复现Agent-selected桥仍要求Room摘要未声明的两个连通字段，成表桥先前已修。当前两入口共用私有roomMapMatchesPlanBinding，仍核对真实编译/任务审核/每入口/不可变/背景非规则字段，完整地图审核不重跑。B-ordinary-web-map-binding-fixed PID71402是修后唯一对应Web验收，尚未Ready，不重复点击；旧失败r0目录完整保留/0对局Provider。
- **C**：同正式Room ticket23-slice248-aa-official-standard1-C-no-opening-plan-20261008-v2，host51568／http://127.0.0.1:51136，driver53346持续同房。最新r21/R1Movement，非终局；P1仍无openingPlan、P2同Plan，正常局内Planner/记忆存在。原r6工具给出Omega合法坐标42158/12753，Rules canonical parameters用nested placement，而共享前置合同错误只读flat x/y；已从共同参数合同修复，v46本地重验实际Apply/Replay到r7。C-r6-canonical-ground-point-real-recovery.json证明原7paid outputHash/usage相同/0新增Provider、原3失败历史保留，proposalValidationRounds未清零。具体红→唯一绿已过，不重复运行。后续新动作正常计费。

**费用**：known-usage-cost-estimate-current.json为本次快照，A~¥1.996806、B从头生成13paid回复4257557units加Teach/审核11calls823362units~¥6.355486、共享P2准备~¥1.085165只计一次、C当前~¥19.708957；合计22978768units/~¥29.146414，均估计非账单。失败A费用已计，B原零费finish重放不重复计。旧费用/未知发送不覆盖。

本次修改来源仅roster-planning-product-module-v1.mjs共同地图绑定；此前canonical point、workspace slot、finish authority、首次schedule来源修复与各唯一红绿证据继续保留。B实际网页开局是本次直接相关验收；未跑全量/旧地图门/已过性能门，前端无变更无需重导出。截图B-web-before-room-launch.png、B-web-after-room-launch.png保留首次真实结果，修后截图独立命名。

三组完整对局0/3；T23 33/36余S248机器接线/性能、S249三组终局对照、S250报告；T27 5/6余S272两类完整军表Plan，合计当前验收余4Slice，后置18经典图不取消。首图30groups/1804cells共同接线绿不是九图全部运行或20经典图全局完成。无子代理/K3、安装、删除、官方数据刷新、提交、旧绿复跑或全量构建。

## 三组与对照

| 组 | 我方军表／计划 | 用途 |
| --- | --- | --- |
| A 成表写 Plan | 原合法 Terran 2000 分军表；按新地图重新生成 Plan | 与 C 同军表，观察计划影响 |
| B 从头写表＋Plan | 同势力与2000分目标；在同地图上迭代选表、查询、修改假设并产生 Plan | 验证从头写表链；同时改变军表和计划，不作纯计划因果对照 |
| C 成表无 Plan | 与 A 完全相同的军表；不注入开局长期 Plan | 保留正常局内记忆和 Planner，不把无开局 Plan 退化为无 Agent |

三组对手使用相同 Zerg 军表、同一份按新地图生成的初始 Plan、同一 Skill / 模型 / Harness / 记忆流程。每个对手仍对实际局面自主反应，不用脚本固定其动作。共用地图、属性、任务、部署、规则／数据冻结版本和可比较的初始 RNG 配置；三房间独立隔离记忆与用量。战局分化后的骰子不声称逐动作配对。一场／组用于工程验收和个案比较，不证明总体胜率提升。

## 剩余交付物，按此顺序执行

1. **同版地图接线包与真实读回**：把 Standard 1 已验收输入和来源图接入当前完整产品宿主及军表工作台。源几何、属性、任务、部署、完整底盘、Room、公开空间查询、模型收到的地图证据和网页边界需一致；从原配置走正式工厂，不直接拼装 Rules 状态。只验新增跨工作树接线，不复跑地图旧绿。原验收 Room 不改，实验房是用户明确要求的新房。
2. **三组输入包**：A 的成表新 Plan、B 的合法恰好2000分军表与新 Plan、C 的相同成表无 Plan输入；共同对手的新地图军表／Plan。保存真实公开理由、查询和假设修订、源事实及审核结果。旧 Daybreak v8不移植；旧 fresh v4未知审核不盲重发。
3. **三份完整同链路对局记录**：正式人机机器端的 LegalSpace→查询→Planner→Action→Preview→Apply→Replay；每步截图、动作／骰子／结果／公开计划变化。持续至 Rules 终局，记录停点与恢复，不用 Host 替模型选动作或默认 Pass。若已知 High 在新局出现，修负责它的来源，不靠换图隐藏问题。
4. **综合验收报告**：地图效果证据、两类写表成功与恢复情况、三局终局与工程错误、策略个案差异、各组用量／费用及每动作 P50/P95。通过这些交付后再进入复盘；当前不计作任何 Slice 已关闭。

## 验收判据

- 地图：源／规则／网页轮廓一致，路径以完整底盘和真实入口校验；墙、草丛、遮挡等适用效果实际参与结果。合法／非法提案及规则拒绝留痕。候选未找到不等于证明不可达，UI 图层关闭不等于规则地形消失。Standard1不证明庙台或其它图的全部运行情形。
- 写表：两种流程真实模型无代码手工补表产出合法恰好2000分；Plan绑定本图与本表，说明胜利路线、进场顺序、能力用途、对手反制、备选假设及调整条件。合法性由原 Rules 判定，策略内容由模型／Skill产生。
- 对局：三组与实际人机机器端同入口，不走测试替身。规则正确、可恢复、无重复 Apply／丢记录、骰子保留、终局一致；耗时以真实全动作测量，查询局部时间不冒充全动作一分钟。
- 恢复：仅复用绑定同上下文的付费结果；新候选、新图与旧未知请求分账。同问题三轮不收敛报告阻塞，已过门不复跑。Critical/High阻塞；Medium记录并继续，不用降级掩盖已知规则错误。
- 费用：A/B/C分别累计，新实验从零账开始但旧记录不清除；每累计约¥100通知，未知发送保留未知。成本估算与原始usage冲突时标注暂估待对账，不写成零成本。记录公开决策依据，不要求或宣称捕获隐藏思维链。

## 新地图本轮源码与定点证据

交付：原生官方配置／来源／authoring约定十个模块；共同Configurator、语义几何/Rules/freeze/reachability、Standard/Skirmish工厂、HTTP、LOS/surface/selectedSpatial来源；冻结9PNG。Host新增对手Plan入口，CLI新增冻结配置文件入口；策略角色schema取消任意四摆放上限，laboratory按实际piece分母检查；Strategist消费与workspace兼容恢复共用归一化，原模型内容不改。并非所有Git dirty差异均为本轮，不覆盖历史优化。

- `../build/slice248-daybreak-resume-web-JgsoAG/native-map-product-integration-20261008/receipt.json`：最终exit0，0Provider/0旧Room或workspace改动；前两轮失败保留，第三轮关闭该门，此后不复跑。
- `../build/ticket-23-three-arm-official-standard1-20261008-v1/preset-session-admission.json`：A33模型/7units/2000、共同P252模型/8units/2000；打印Supply12/10不当作首回合池6。
- 同目录 `fixed-paid-teach-revision-red.json`／`fixed-paid-teach-revision-green.json`：七单位原修订不改文案的容量红绿。
- 同目录 `fixed-plan-retained-compatibility-red.json`／`fixed-plan-retained-compatibility-green.json`：三已付角色返回字节相同、0Provider，不同context/付费hash/缺scoreRoute拒绝。

- 同新实验目录 `opponent-review-public-json-red.json`／`opponent-review-public-json-green.json`：真实已付第4审核片的单多余括号无损恢复，拒绝截断scalar／缺内容，0Provider。共同normalizer负责语法，workspace生成和审核复用同一已付回复保留入口。
- 同目录 `fresh-gas-feedback-red.json`／`fresh-gas-feedback-green.json`：实际旧B修订Prompt缺210预算合计→新v4事实到账；旧付费历史完整，同版本三次停止／重启不重置，一次绿。只改变工程证据、不注入战略加减分。
- 同目录 `common-opponent-source-review-result.json`：实际P2完整审核0High，原4审核片复用；`fixed-plan-source-review-start.json`／`fresh-run-after-gas-source-fix.json`为A审核、B续行启动回执；`C-host-startup-request.json`只证明宿主启动请求，未证明游戏动作。

仍须完成：A审核、新图P2真实绑定、B fresh exact2000与Plan；C无开局Plan注入仍有正常局内Planner；原人机机器端完整三局与截图／地图实际影响／性能／费用及报告。

## 本轮已完成的真实恢复，不是三组实验结果

### 原局与队形阻塞

原宿主最后实际 PID76890，入口 `http://127.0.0.1:63039/room/ticket23-slice248-aa-daybreak-map-host-20261006-v1`，同原SQLite。r81旧参数合同迁移后由真实Planner改选可付Orders，实际Apply/Replay到r82；旧付费结果和累计纠错历史不清零。整步65.236秒，未过一分钟。

随后原局到r87、第二回合Assault、player2、非终局；截图591张、87动作，227记录调用、48,811,684 units、暂估¥74.316930。driver82282已停止，不声称后台还在对局。

当前实际冲锋子动作：18模型Swarmling向Jim Raynor，原骰5＋速度6＝11寸。确定性候选器只放到队长＋15跟随模型，零完整候选；这是搜索不完整，不是已证明合法队形不存在。只读真实输入红门已保存。边界接触补搜尝试耗时17分钟被受控停止，**全部该生产改动已撤回，未加载宿主、未通过验收**。未解决问题继续保留，不以新实验启动当作修好。

旧房是 `sc2_daybreak_v1`，不是九官方布局；`standard_balanced_nine_v1` 是预设名称。规则状态有1377地形片。此前截图关闭规则层；实际打开后SVG21→1398，无非GET请求／游戏状态变化，边界已显示。不能从计数或此截图推出所有路径、九图或全局地图验收通过。

### 固定表审核恢复

用户允许的一次未知请求重试仅用于 fixed v7第6审核分片，授权已在发送前持久化消耗；旧未知请求／费用和前5已付分片保留。实际完成第6／7片后，模型定点修订得到v8，最终50断言／7分片审核完成、0 High。原军表／进场／VP schedule不变。Medium仍跟踪，v8是旧Daybreak计划，不移植到新地图。

该会话52回复、1,736,721 units；相对许可前42回复新增10回复／259,784 units，另有旧未知请求费用。页面累计费用从¥4.745408变成¥2.770254，与usage增长不一致，保留原记录作Medium计价问题，不能声称费用倒减。fresh v4仍旧未知审核／缺完整request身份，未准入，不能借fixed许可重发。

当前旧工作台PID8089，`http://127.0.0.1:64938/army`；同原workspace-data，Room launch未接。

## 聚焦改动与证据

此续段改动四处来源：`action-parameter-contract-v1.mjs`、`live-flash-decision-port-v1.mjs`的证据绑定旧合同重规划；`roster-planning-secure-deliberation-factory-v1.mjs`的安全传输原因保留／一次授权物理发送；`roster-planning-workspace-service-v1.mjs`的同请求授权账。原源码阶段五绿保留不复跑，本段三个具体bug各一次红→绿，队形bug仍红且尝试撤回。

证据相对目录 `../build/slice248-daybreak-resume-web-JgsoAG/`：

- `r81-legacy-parameter-replan-green.json`、`r81-runtime-recovery-actual-history-readback.json`。
- `s272-transport-cause-retention-green.json`、`s272-authorized-review-resume-green.json`。
- `s272-fixed-v8-real-review-completed.json`，原v7许可与请求记录同目录保留。
- `r87-charge-solver-red.json`、`r87-charge-solver-attempt1-controlled-stop.json`。
- `three-arm-standard1-current-product-map-gap.json`、`three-arm-latest-recovery-observation-20261008.json`；原game与workspace分别只读HTTP200，新实验仍未启动。
- [旧Daybreak规则层已开启截图](../build/slice248-daybreak-resume-web-JgsoAG/r87-rules-terrain-enabled-board.png)与`r87-rules-terrain-enabled-ui.json`。
- [新实验首图Standard1原网页截图](../../ticket-24-semantic-map-integration/build/official-native-map-browser-RS4oHw/06-desktop-raynor-deployed-r3.png)及[限定配方验收](../../ticket-24-semantic-map-integration/build/official-native-map-browser-RS4oHw/first-map-selected-recipe-acceptance.json)。后者复用原绿，非本轮三组新局。

技能：diagnosing-bugs定位真实失败，agentic-harness-evolution-loop以同链路真实结果为准，writing-for-agents固定新路线恢复入口；本轮不生成或升级策略Skill。`harnessLoopUsed=true`；路由fact_probe／harness_optimizer，旧局opponent／selfplay；本轮网页工具只改变显示层，未产生新记忆或训练晋升，trainingTruth=false。

计数保持：T23 **33/36**，余S248原机器链路与性能／S249三组对照／S250报告；T27 **5/6**，余S272两类写表与地图Plan；合计余**4**，完整实验链**0/3**。T24所选九官方＋两经典配方证据保留，完整产品接线未由地图宿主验收代替；其余十八经典图后置。无子代理／K3、安装、删除、官方数据刷新、提交、旧绿重跑或全量构建；其它项目修改保留。
