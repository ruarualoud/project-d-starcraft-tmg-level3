# S248：真实请求分类型性能评估

状态：进行中，未准出。T23 33/36、T27 5/6；余248/272/249/250四片，终局0/3。

## 用户再次明确：性能先于实验，硬顺序

2026-10-10 用户要求后续严格执行：

1. 完成当前能够达到的最优策略无损性能优化及**完整行动**验收。不能用23个查询通过或25.433秒RAM后端观察代替模型、多轮tools、执行/存储、Web的整链准出。仍以原一分钟要求为目标；确无进一步无损优化时先报告实际瓶颈、与用户讨论，不能自行减策略输入或放行实验。
2. 用该优化版本初始化既定12个实验：基础、种族/对手交换、换地图、同图换起始位置四条件×ABC。A固定表+适用Plan；B从头生成表+适用Plan；C与A同表、无赛前Plan。A/B各条件重新生成审核Plan；对手能力和产品链路保持一致。
3. 最快安全并行执行第一ABC组。
4. 修完该组发现的工程问题，再并行执行剩余组。
5. 以上数据就绪后复盘。不能把单个性能取样或实验初始化当作完整对战通过。旧ABC各¥200累计账保持；没有把它扩张为新12局每局¥200。

本轮在用户纠正顺序之前，为加载新源做过一次原房服务恢复：70039直接HTTP确认旧Host14122确为原C128；73286核对两席107/169请求全部终态、保存完整envelope和请求记录后正常关闭旧服务，0新请求。74007在同一SQLite恢复最终射击源码（native合同hash`7b14b746...`，原始文件字节SHA256`20823db7...`是不同算法，非源码漂移），沿用json_channels_v1/Flash和原账本。初次76444比较失败只有SQLite行null-prototype和保存JSON普通对象的区别；77352只纠正诊断数据比较后终态0、276完整旧记录逐字段0变化，envelope/map/usage全部相同；原失败保存，没有因记录差异修改生产或重发模型请求。

77647旧房Web单动作观察终态0，实际128 Corpser Run补镜像/截图，然后新129 Corpser finish_activation，Replay一致、0模型调用。随后80120三动作取样边界不够严格；用户要求先完成性能后已停止唯一Web自动推进，不再提交新动作。84349实际只读SQLite停点：权威revision132、两席无reserved/dispatched；本地NDJSON仅记录至131（129收尾、130/131 pass均标记modelDecision=false），不能把镜像131当真实停点，也不能据此断言132没有调用模型。费用以持久账本/最新progress为准：C累计¥107.857115、278请求，较恢复前276请求/¥107.488214新增2请求及¥0.368901。132的完整解释、实际驱动时长和截图镜像尚未补齐；不以继续开打的方式补齐。81665只读HTTP状态观察超时终态1，不是Host终态或新动作重试理由。

本轮没有生产源码改动/新测试/旧绿或全量重跑/新房初始化/代理或K3/安装/删除/提交。只更新CURRENT_WORK、此记录、root TASKS、PROJECT_MEMORY并保留生成证据；其它项目不动。原20图、精确2000表、完整同房对照及最终复盘目标保持。T23 33/36、T27 5/6、四主线Slice开放，旧终局0/3，新12实验0/12。下一步仅做剩余CPU/复制/序列化/调度与模型传输的性能定位优化，不能再自动推进对局来绕过准出。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=selfplay_agent_prompt（原房观察）/fact_probe；harnessToolsCalled=原生Room与产品Web单步/Replay；uiTraceEvidence=原C129至131截图已存；agentDecisionEvidence=未宣称策略性能通过、132镜像缺口保持；memoryTraceEvidence=原Room记忆未替换；trainingTraceCandidates=0；完整效果或账本变化不集成，未过性能不放行实验。

最终安全停点：Host74007已通过自己的正常关闭处理退出0，非强杀在途动作；Web驱动80120终态1。88185于19:02:23Z再次只读原SQLite，权威132、stateHash`216f62b8...`、R2/combat/player2、比分0–0，最后原生accepted action为`choose_first_actor`。没有132之后的新动作，没有新房；完整132截图/镜像仍未补齐，不靠继续对局填补。证据 `C-performance-priority-final-settled-room-20261010.json`。源代码不在运行中的服务/Worker下继续混改，后续只做性能工作。

## 02:35Z：按用户要求先完成真实 Flash 分类型矩阵

当前批次见 [真实模型性能矩阵](ticket-23-slice-248-real-model-performance-matrix-2026-10-10.md)。23原快/中位/极长工具样本映射18签名局面，80496主队列使用正式Hosted Opponent/live Planner+tools/Apply/Replay/outcome、私有WAL和原冻结记忆Skill；原Room只读。首C114核心57.470s/模型轮次25.581s/其余31.889s，准备68.321s另列、2真实调用/283608units/¥0.356613。没有调用原攻击/火力工具，仍记未覆盖，且未包含浏览器渲染，不作为完整分钟准出。下一C71运行中，不改生产源或重跑已完成case。用户当前顺序为先新鲜模型各case测量、再耗时归因、再提出优化；原性能先于12实验的硬顺序保持。

## 02:02Z：回放保留原生所有权；资产摆放重复整图哈希收口

完整行动性能仍 OPEN；执行顺序以首节为准。原C132不推进，12实验0/12，T23 33/36、T27 5/6；剩248/272/249/250。上一轮数据核对属于progress：分类型最新测量和上下文成本明确了下一步；本轮有两处实际生产修复，不以局部通过代替整行动完成。

第十处：13152真实签名前缀RED，重复回放复制完整1804地形Envelope两次，返回值失去引擎的内部所有权，下一次validate又正规化。只保留引擎自己createEnvelope生成的深不可变值；缓存写入要求私有ownedEnvelopes身份，外部hash/ID/freeze不授信。28335唯一GREEN：完整Envelope复制2→0、重复正规化1→0；整个原replay结果、原115签名后续动作、独立mutable Rules返回、decoded外部完整校验、篡改journal拒绝及输入保持全过。重复前缀观察1946.918→1083.525ms是不同运行样本，不包装受控提速或整行动时间。脚本 verify-ticket-23-replay-prefix-native-envelope-v1.mjs；证据 replay-prefix-native-envelope-{red,green}-v1/。

资产压力当前CPU37974终态0：同一原C69 query31.203s/context1.843s、完整原response hash54b83974...相同，未重跑功能门。旧CPU116.662s是在支付来源复用修复前，不能当当前热点；当前约26.475s inclusive定位到native instantiate的同一stateHashBefore整图哈希，非坐标几何。各CPU inclusive相互嵌套，不能相加。C69-current-native-asset-cpu-owner-analysis.private.json保留原始归属分析。

第十一处：43492首次夹具漏声明report而提前失败，记录保留；只加该声明后45207实际RED，两个不同合法位置重复hash同一完整C69状态两次。新增完整owned snapshot生产者只clone/freeze自己的副本，以私有WeakMap惰性记住原生完整哈希；不信外部字段，invalid坐标/支付仍在原位置失败。真实legal-asset搜索沿current-product→ability→native adapter传递同一snapshot。46583唯一GREEN：2→1；两个完整native计划/action/source/payment/geometry/receipt hashes和旧baseline相同，外部decoded仍分别hash、整个底盘越界仍拒绝。脚本 verify-ticket-23-asset-placement-owned-state-hash-v1.mjs；三个失败/成功目录分别保留。

49047只运行本次两个资产文件直接影响的原C69完整接线门一次，终态0/status complete_output_parity；query4.141s/context2.567s、合计6.708s（不含debug setup/签名前状态装配）。此请求是Ventral Sacs的reserve_deploy_indicator进场标记，不是菌毯。143原尝试和143原生实例化、96候选池、8返回选项、47原底盘出界拒绝、1804地形及完整原response hash全部相同。历史109.971s、修前当前CPU31.203s均保留，不宣称所有资产类型统一变成4秒，不重跑别的已过类型。源码接线和验证理由在 C69-owned-state-hash-integrated-scope.private.json。

串并行边界：同一Authority批次的独立只读查询进4线程池；关系图LOS分组并行；队形候选最多4并行。资产位置仍依原顺序逐个校验，native全图哈希只复用；非独立请求在adapter中先await，不能把整个混合请求列表视为全并行。Planner轮次及final Action→Apply→Replay→outcome memory目前串行。

未完成：**带模型和不带模型的整Agent行动总时间都没有当前版本证据**。旧41.447s仅7个正式后端操作，不含Planner多轮queries、outcome再读Authority/记忆和Web；C69 6.708s是独立查询而非整行动，不能相加冒称总计时。下一优先补完整产品链分段计时：恢复原签名输入/本局记忆、沿真实Planner工具及Apply/Replay/outcome/Web流程，区分recorded-model回放与新鲜模型调用；debug恢复装配独立列出。继续优化只针对实际热点，保留全部策略材料/候选/概率样本/两阶段能力；无法继续无损达到分钟目标时按首节先提供实测与用户讨论。

全部本轮child已终态。生产仅transition/native asset adapter/asset search三文件，两个脚本仅复现上述具体bug；0Provider/费用/源Room写/新实验/代理K3/无关或全量门/网络安装删除提交。原20图、精确2000、同表对照/最终复盘目标不缩；本轮无新Web截图或策略效果证明。源字节和证据：replay-and-asset-owned-state-final-source-lineage.private.json。

## 00:35Z：固定资料和反应预演复用；单查询过分钟门不代表准出

硬顺序仍为首节；原C132保持停止，12实验0/12。T23 33/36、T27 5/6，主线剩248/272/249/250四片。完整性能仍OPEN：没有用查询秒数代替模型、多轮tools、Apply、Replay、outcome memory和Web整行动验收。0Provider/费用/源房写/新局/代理K3/网络安装删除提交。

第八处用完整C82/17piece/1804地形、原Swarmling三个伤亡候选复现。81613首次RED：同一个约50KB官方combat bundle完整验证和重建索引72次。生产source模块只增加完整私有副本的clone→全验证→深冻结→私有WeakSet登记；外部对象的hash、ID或Object.isFrozen都不能授信。marker固定owner在原source校验位置采用此副本，保留之前terrain/state/runtime/board/marker错误顺序。82163唯一GREEN：72→1，完整伤亡后果、Supply/control/武器/可达性及hash完全相同；decoded和caller-frozen bundle仍每次验证，篡改内容/索引拒绝，调用方修改隔离。旧已绿marker geometry门没有重跑，只扩展已有具体bug脚本fixed_profile_source模式。

82587直接受第八处影响的原C71 phase观察终态0：query36.327s/context1.760s，原signed state、完整请求、4candidate、全部选项/样本和整个回复hash仍a4d3709f...，完整新response已存。setup28.415/restore31.207另列。与此前63.583s是不同负载单样本，不宣称受控因果提升，更不是全类型或整行动性能通过。

86098仅为剩余stationary-fire热点的一次CPU采样，未重跑功能门；终态0，query28.243s/context1.291s，完整原reply同/full response保存；setup22.825/restore27.059另列。线程CPU约14.8–21.6s；各线程topSelf中完整clone约5.5–8.1s，反应opportunity inclusive约4.6–7.9s。inclusive嵌套耗时不可相加，带采样秒数也不能直接宣称比无采样快。

第九处继承完整C82原生概率consumer与216样本，89694首次RED：5个反应窗口各Open/Pass复制完整战场，共10copies。只读native反应机会factory保留一份完整clone/frozen state与bundle，私有Open/Pass回调复制全部可变pendingOfficialReactionWindow、log、officialReactionResolutionHistory。其它单位、资源、地形和资料是自己的不可变副本；调用方不能提供state或授信标记。仍执行原source/domain/action、反应资格、支付候选、先后手、preview和pass解析。正式公共Open/Apply没有传入私有callback，仍走原完整复制/校验路径；非pass Apply也保留原路径。combat概率batch惰性采用本factory，scalar及其它原调用保留原流程。91130唯一GREEN：10→1；原完整枚举、所有反应选项、216样本、伤亡/Supply/VP/control、全部hash同，factory之后调用方篡改隔离。仅新增既有probability脚本reaction_window_snapshot具体模式，没有重复旧绿。

91818只运行直接受第九处影响的原C71 readonly phase观察，目录real-performance-C71-owned-reaction-window-phase-observation-v1/，已终态0：query40.105s/context2.792s，整个原reply同且完整response已存；setup35.762/restore52.121另列。负载与82587/86098不同，保留这个略慢结果，不包装因果提升；不重发。完整来源/输入不变，无Provider/createRoom/原房写。离线分析已保存Marine115后端51.134s采样，证明Legal/Preview/Apply/Replay均经过最近七处修复的ranged枚举/LOS几何，因此96061只启动一次直接受影响的当前后端时延观察，目录formal-room-Marine-original-r115-owned-native-batches-observation-v1/：原完整signed prestate、历史负载、原骰子/效果与Replay，encrypted RAM执行，原SQLite readonly，禁止Provider/createRoom。已于00:40:24Z终态0：后端整链41.447s，read0.719/Legal7.655/claim1.250/Preview7.299/Confirm2.410/Apply9.394/Replay12.457秒；setup65.594/restore22.534另列。全部原Legal/proposal/骰子/events/postState/Replay相同，完整阶段结果已存。当前CPU独立采样显示Replay inclusive9.657s、ranged enumeration5.897s、两处preview core约5s、GC2.231s及JSON clone/序列化仍可研究；inclusive嵌套不可相加。实际copy owner分析C115-current-native-backend-cpu-owner-analysis.private.json已存，下一先在真实seam复现剩余engine/kernel复制或Replay→nextAuthority/outcome memory串行关键路径，再定点改动。不重发终态过程或旧绿功能门，全部child已终态。该观察仍不含模型或outcome memory/Web，不作为整行动准出。另只读历史C82的187个completed调用账本，dispatch到settle中位16.458s/p90 27.370s/max50.173s；它包含传输和结算，不是纯Provider时延或新版本整行动 benchmark，保留于historical-provider-dispatch-settle-timing.private.json。全数据/选项/策略输入/概率样本/第二模型阶段均保留。

本阶段生产共7文件（native ranged/combat/elevation/ordinary LOS/marker control/官方combat bundle/反应adapter），具体bug probe仍3文件；四份恢复记录与generated私有source lineage同步。harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer_prompt/fact_probe；harnessToolsCalled=完整原readonly概率/伤亡/C71请求；uiTraceEvidence=无新Web动作；agentDecisionEvidence=无Prompt/Skill/策略输入修改；memoryTraceEvidence=原C132保持；trainingTraceCandidates=0；wholeActionAccepted=false。全事实/错误/来源/隔离变化或最终无性能/内存收益时撤回；性能未准出不进入实验。

## 00:12Z：完整高低地投影复用，第七处定点修复

62770于00:05:47Z已TERMINAL0：原C71query65.251s/context2.780s，完整原replyhash同/新response已存，setup49.781/restore62.015另列，未重跑旧绿功能门。其4candidate stationary-fire约40.6/40.9/41.6/49.4s；candidate2 graph约7.4s。**仍超过一分钟，不是完整行动，也不是性能准出**；不将跨负载时长比较宣称受控因果提升。原C132停止/12实验0of12。

第七个具体问题继承同完整C82/三个实际model对，ordinary层已经共享1103远端native几何，但附加全部elevation/双方Size/cover属性后，又分配3052个相同完整结果。67468首次RED最大同事实3对象。已有probe仅新增elevated_assessment_projection模式，原远端绿门没有重跑。生产elevation只有私有nativeElevatedAssessmentProjection：每一项override仍按原规则fresh计算，实际geometry对象身份与全部override规范值共同匹配。不是猜测哪些字段重要，不使用外部prepared/frozen/hash授信；undefined override可能抹掉继承字段，明确保留原uncached路径，异常签名也执行原native完整构造/序列化。只在同一个私有source context中保留原不可变assessment及其原规范文本；所有near/support/模型来源/高低地/飞行和根结果计算仍执行。68368唯一对应GREEN：3052→1103对象、同完整事实每种1对象，全部3x1804原结果、wrapper rows与所有hash完全同、input不变及全条目冻结。组件elapsed1013.743→1104.087ms略高也保留：不以这个非受控单样本宣传时间改善，最终看实际慢请求/内存和完整动作。

69574于00:10:02Z启动仅直接受第七改动影响的原C71 readonly phase观察。原manifest receipt、完整signed state/request/4candidate/概率范围，无Provider/源房写/createRoom/CPU profiler/无关row参考。**00:13:05Z已TERMINAL0：query63.583s/context2.811s，ENTIRE原replyhash=a4d3709f...保持、完整新response已存；setup43.906/restore57.856另列。**4candidate stationary-fire约38.4/38.8/39.5/47.5s，candidate2 graph约7.2s。仍超一分钟，不是完整行动准出、也未宣称穷尽无损优化；单次负载非受控，不以65.3→63.6宣称因果比例。目录real-performance-C71-native-elevated-projection-phase-observation-v1/；全部自有child终态，不重发这些观察或已绿门。源谱系owned-snapshot-native-los-streaming-source-lineage.private.json更新全部五生产文件、三个具体probe和七红绿。下一仅继续实测remaining fixed-source取数/原生枚举/完整行动调度，不转回对战或初始化12。T23 33/36/T27 5/6，余248/272/249/250四片；无Prompt/Skill/候选/地形/样本削减，无已绿/无关全量重跑或代理K3/网络安装删除提交。

## 00:04Z：伤亡占点和远端原生证明复用；仍不准出

本段接续23:42Z四处具体修复，首节用户硬顺序不变。**性能尚未完成，原C132不推进、12cells0/12。** T23 33/36/T27 5/6，余248/272/249/250四片。当前生产共5文件，具体bug probe共3文件；0Provider/费用/Room写/新局/子代理/K3/网络安装清理提交。

43923在新增ordinary同terrain复用后，23:45:03Z已TERMINAL0：原C71query77.698秒/context2.811秒，完整原回复hash仍a4d3709f...、新完整response已存；setup49.612/restore58.405另列。4candidate线程保持，stationary-fire实际约50.3/50.7/51.4/61.7秒，candidate2 graph另约7.2秒。组件仍超一分钟，不是整行动验收，不将不同机器负载测量宣称受控因果提升。

第五具体问题使用完整C82/17piece/1804terrain、真实Swarmling两种单模型伤亡和零伤亡。50703首次RED：20种相同model-marker物理几何共执行80次、最大重复4次。只在本实际seam新建casualty-fixed-marker-geometry复现脚本。生产给mission control增加完整私有固定map/source、变化完整pieces的readonly操作；普通LOS增加固定原生visibility operation。每个输入model/profile/size/marker完整值/exclusions仍全校验；以完整已派生physical attacker、marker target与排除集合匹配本操作的原生几何，不用外部hash/ID/frozen旗帜授信。模型删除、当前Supply、状态、coherency、有效控制、全军Supply总和与控制权仍逐候选重算，不能复用“原控制结论”。只有相同不可变map上的相同原生视线事实复用；地图/资料由factory完整复制，输入pieces/query也完整复制。原公共scalar解析入口保持自己的完整路径。52180唯一对应GREEN：80→20、每种1次，三个ENTIRE原伤亡后果及所有control/Supply/weapon/reach/hash同，source/input不变；elapsed5022.222→2729.769ms仅组件单次非受控记录。

53030唯一对应原C71 phase观察23:55:13Z TERMINAL0：query77.387s/context2.876s，完整原replyhash同、完整新response已存；setup50.063/restore64.443另列，未重跑旧绿功能门。其stationary-fire约48.2/48.3/49.1/56.4秒，candidate2 graph约11.3秒；仍不是一分钟或整行动准出。不能把组件样本提升推广为整个产品提升。

第六具体问题：真实Marine1对Swarmling三个model对，1103种相同“远端完整assessment事实”分配了3052个native对象。59870首次RED最大相同事实3objects。已有ranged-elevation probe只新增distant_native_assessment模式。production ordinary LOS以双方完整底盘bounds扩大1inch+tolerance的严格分离坐标证明双方均不贴地形、任何连接底盘的线段均清晰，并检查双方未声明此地形support。只在这一个经过完整source验证的私有terrain context，对同一actual terrain复用首次完整评估的原生不可变对象及其既有规范文本；不是删除远端地形、选部分cell或跳过模型/profile校验。所有模型对仍包含全部1804assessment，近地形/support/阈值边界保留原算法。60641唯一对应GREEN：3052→1103对象、相同事实每种1对象，全部3x1804原native/elevated结果、wrapper rows和hash完全相同、全条目冻结/input不变。单次微观elapsed1129.246→1081.206ms不是整个Agent的速度结论。

62770于00:02:30Z启动仅受这一真实修改直接影响的C71 phase观察；原只读SQLite/签名71/完整请求/4candidate/原概率范围，原manifest receipt、无旧row参考/CPU profiler。输出real-performance-C71-distant-native-assessment-phase-observation-v1/，当前RUNNING，读取终态不重发。完整源谱系和六红绿保存在owned-snapshot-native-los-streaming-source-lineage.private.json。前38546错误参考造成的not_accepted及未存完整新response缺口继续保留，没有为不相关记录重跑同版查询。

后续仅针对剩余实测射击枚举/native elevated assessment序列化、完整固定源取数重复、完整行动关键路径调度。代码阅读已排除“preview-owned enum又clone完整snapshot”的猜测：nativeRangedPreparation明确识别自己实际contexts并走已有批次路径，未据假设再次修改。完整性能必须含模型、多轮tools、Apply/Replay/存储、outcome memory、Web，局部hash相同或秒数达标都不能提前放行实验。地图/军表/策略事实/概率样本/第二模型阶段均不削减。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer_prompt/fact_probe；harnessToolsCalled=真实完整readonly counterfactual与原C71phase观察；uiTraceEvidence=无新Web动作；agentDecisionEvidence=无Prompt/Skill/选项/样本改动；memoryTraceEvidence=原C132不变；trainingTraceCandidates=0；wholeActionAccepted=false。全事实/来源/错误或隔离改变、最终无性能/内存收益时撤回；未准出不进入实验。

## 23:42Z：四处固定事实重复开销已定点修复；整行动仍未准出

首节硬顺序保持：先达到当前能够做到的最优策略无损性能，再做完整行动验收，随后才初始化12实验。T23 33/36、T27 5/6；余248/272/249/250四片，新12cells0/12，原C132不推进。本轮0Provider/费用/原房写/新局/子代理/K3/网络/安装删除/提交。

本轮保留四处生产优化，每处都是保存完整C82/17piece/1804terrain的实际调用seam首次RED→唯一对应GREEN，旧绿和无关全量没有重跑：

|具体重复|首次RED|唯一GREEN|完整交付|
|---|---|---|---|
|概率preview/casualty/chance各复制固定状态|14664，4copies|16529，1copy|ranged私有统一query factory+combat消费者；完整枚举、216原概率样本、chance、伤亡/Supply/VP/占点/哈希同，调用方变更隔离|
|同私有terrain每unit pair重遍历canonical hash|20764，3times|22139，1time|elevation完整canonical terrain前缀的SHA256.copy；全部原bytes/容量/geometry与LOS hashes同|
|ranged先存全部完整LOS树再提取小结果|37019，3pending|37755，1pending|ordinary indexed私有query操作+elevation投影+ranged逐对消费；3x1804完整assessment/原hash同，整批成功才publish cache|
|同terrain因目标unit不同重复ordinary准备|42929，3owners/3preparations|43345，1/1|elevation按实际私有terrain数组复用ordinary owner；不同support排除集合仍独立，query/model仍复制和全校验，全部原结果同|

对应probe仅扩展已有ranged-elevation脚本的具体bug模式，新增probability-owned-snapshot脚本只用于第一个实际重复；没有无关新测试。单次组件耗时不是受控整链提升证据，pending树计数也不是实测heap字节。本轮没有减少候选、地形cell、策略事实、概率样本或第二模型阶段，没有改Prompt/Skill。曾怀疑originalFootprint重复大轮廓，实际只约130字符，已排除且未修改/合并1804地形cell。

23197唯一对应原C71 phase observation已TERMINAL0，23:22:53Z：query103.601s/context2.686s，ENTIRE原回复hash=a4d3709f...保持，完整新response已存；setup45.285/restore65.320另列。不带CPU采样，未重跑旧绿功能门，仍超一分钟，不是整行动通过。

38546流式消费后的唯一原C71观察已TERMINAL0，query99.482s/context2.830s/setup51.688s/restore60.707s。报告not_accepted：本次启动误传旧whole-SQLite-row参考，05462434...与当前7c5abddf...不一致。签名71state及整个新response hash仍与原receipt一致；原失败progress保留，observer在此比较前未存新完整response，证据缺口不隐瞒。不为这项不相关记录差异重复运行该版本查询，不修改生产绕过它；下一实际改动测量使用原manifest receipt，不传过时row参考。两次负载非受控，不能宣传103.6→99.5为因果速度提升。

43923于23:41:36Z启动一次仅受新增ordinary terrain复用直接影响的原C71 phase观察：既有只读SQLite/签名恢复/原完整请求/4候选/原概率范围，空referenceArtifact、原manifest receipt、不带CPU profiler。输出real-performance-C71-single-owned-ordinary-terrain-phase-observation-v1/，当前RUNNING；读取终态不重发。本轮最终source SHA与红绿/失败/运行句柄存owned-snapshot-native-los-streaming-source-lineage.private.json。后续仍针对stationary-fire枚举与伤亡后marker projection的实际重复，完整行动含模型、多轮tools、Apply、Replay、outcome memory及Web，任一局部门不能准出。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer_prompt/fact_probe；harnessToolsCalled=完整真实请求/固定snapshot与LOS具体红绿/原C71只读观察；uiTraceEvidence=无Web动作；agentDecisionEvidence=未缩策略输入/候选/样本或改Prompt/Skill；memoryTraceEvidence=原C132记忆不变；trainingTraceCandidates=0；wholeActionAccepted=false。完整事实/错误/来源/隔离变更或最终无性能/内存收益时撤回；性能未准出不进入实验。

## 23:00Z：性能门槛继续关闭；同批次地形复制实修

用户再次明确的硬顺序保持为本文件首节；性能必须做完当前能够达到的最优策略无损优化，并完成整行动验收，之后才能初始化12实验。所有后续实验使用同一准出源码；局部计时或门禁不能代替完整准出。

本轮先读取已有终态93763，不重发原查询：真实C71极长队形115.628秒，仍超一分钟。4候选比较线程确实并行，候选0/1/3的stationary fire段约85.7/86.0/86.0秒，候选2约94.1秒；各线程CPU57.7–74.5秒。Profiler是带采样的观察，历史负载不同，不能把162秒与115秒包装为受控AB。inclusive嵌套耗时不能相加。主要热点是完整射击枚举/几何准备、structuredClone及伤亡后mission marker投影；不是纯数学骰子等待，也不是尚未启动候选线程。

93763进程exit0并不等于验收通过：report.status=not_accepted，因为整个历史源SQLite行hash从旧05462434...变为当前7c5abddf...。已实际恢复的签名revision71/stateHash仍为c91c53d4...，新完整response hash=a4d3709f...和旧完整参考一致；离线查看旧参考和originalReceipt全值也相等。保留原失败；未为这个记录比较重跑查询，不把它当作改变规则/回复的证据。失败observer在比较前没有落盘完整新response，仅留下诊断和完整hash；这项证据缺口明确记录在C71-current-cpu-saved-analysis-with-lineage-gap.private.json，不补造成功记录。

具体源码问题复现使用保存完整C82/1804地形、Marine1对KerriganRaptor/Hydralisk/Swarmling三个真实模型对，无移动/部署/任务规模变更。4448首次RED：同一个私有批次中，三个不同participant集合各clone同一份terrain，3次。生产仅elevation.geometryProjection增加私有terrain共享：factory自己克隆/验证完整map；按精确排除support集合保留一份完整冻结terrain，其它unit pair只复制各自participant。模型、底盘、support、LOS、全部assessment及seal仍逐一计算；source/几何hash算法不变，不信任外来ID/hash/frozen flag，standalone路径保持原复制/错误顺序。

5059唯一对应GREEN终态0：terrain复制3→1，三个ENTIRE原native结果与所有身份相同、input不变、全assessment冻结，调用方改terrain不影响私有批次；独立scalar路径仍拒绝被改地图，批次仍拒绝非法model support。既有verify-ticket-23-ranged-elevation-preparation-reuse脚本只新增本具体bug的geometry_terrain_snapshot模式，没有无关新测试。初次红elapsed1334.755ms、唯一绿1133.865ms，仅记录，非受控因果或整链结论。

5857于23:00:38Z启动一次直接受影响的原C71 phase observation，使用既有只读signed restore入口，保留完整原请求/4候选/原概率样本/策略事实；不带CPU profiler，不再传不相关旧source-row参考。旧参考全值等于原receipt。**23:04:10Z终态0：query95.637秒、context3.071秒，完整原response hash仍为a4d3709f...，outputHashMatchesOriginal=true；旧绿功能门未重跑。** setup42.690秒、signed restore55.814秒另列。完整新response已落盘输出real-performance-C71-shared-owned-terrain-phase-observation-v1/，不是对93763缺失response的补造。四candidate线程保留；本次stationary fire段约66.0/67.3/68.4/79.4秒。全部自有child终态，源谱系native-los-shared-terrain-source-lineage.private.json已存。仍超一分钟、不是整行动准出；115秒前次带CPU采样且负载非受控，不能将两数相减宣称因果提升。没有创建新Room、推进原C132或发模型请求。下一仅优化实测射击枚举和伤亡后marker投影中仍重复的完整固定snapshot准备，先具体复现再深接口复用，不减任何输入、候选或概率样本。

T23 33/36、T27 5/6；主线余248性能与对局、272军表Plan、249复盘、250报告四片；12实验0/12/旧终局0/3。生产elevation1文件、具体bug脚本1文件、四份项目记录；0Provider/原房写/费用/已绿门或全量重复/子代理K3/网络安装清理提交，其它项目保持。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer_prompt/fact_probe；harnessToolsCalled=已有真实CPU诊断/具体重复terrain红绿/原只读C71分阶段观察；uiTraceEvidence=本轮无Web动作；agentDecisionEvidence=未改变Prompt/Skill/完整候选或概率样本；memoryTraceEvidence=原房不变；trainingTraceCandidates=0；wholeActionAccepted=false。完整事实/隔离或错误合同改变、无性能收益时撤回优化，保留旧证据；性能未准出时不进入实验。

## 22:34Z：实际自有Envelope重复正规化修复；完整性能未准出

只做性能、原C132停止/12cells0of12。上一扁平LOS生产修改的42421完整正式后端观察已终态0，56.939秒；原LegalSpace、proposal、骰子、events、postState、Replay全部保持。各段read1.309/Legal16.511/claim1.701/Preview9.672/Confirm2.741/Apply10.612/Replay14.068秒；诊断setup91.772秒另列，不混成动作或静默忽略完整产品冷启动。此后没有模型/Web整行动通过，更没有恢复对局。CPU实际nearest-owner校验5.822秒、正规化5.286秒、原生state guard4.536秒、native preparation4.467秒、Store decode4.061秒；下一沿实际热点，不凭微观counter判准出。

先排除了两个错误/无收益假设：51513 frozen-only资格RED虽然复现，但实际normalizer返回mutable state，不能优化该正式热点；此路径未接入生产。60627实际数据匹配重复遍历RED→62211合并匹配GREEN后，65614同进程七交错全C82对照old中位346.167ms/new347.989ms，完整匹配结果同但没有收益，**撤掉合并匹配**。selected ranged和ordinary源字节完全恢复本轮开始版本，临时frozen/matched脚本模式也撤掉，完整失败与候选源码保留`native-frozen-eligibility-repro-demotion.private.json`/`native-snapshot-matching-demotion.private.json`。不重跑这些已过/已撤回门。

新具体bug仅针对引擎自己的不可变Envelope被重复正规化。`verify-ticket-23-owned-envelope-normalization-reuse-v1.mjs`读完整实际C82/17Unit/1804地形，诊断data-module只暴露原私有validateEnvelope及计数，不改公共API、不建Room、不启Provider。77592唯一RED：同一native producer Envelope第二次正规化1次；完整原normalized state与独立mutable返回、caller冻结/decoded双次完整校验、state篡改和Room错配拒绝已保存。78468唯一对应GREEN：重复正规化0次、ENTIRE旧normalized state相同、返回独立，所有外部fallback保持。第一验证结果才缓存，不假定createEnvelope一次正规化已经达到固定点。

生产仅Authority closure新增actual-owned WeakSet/private WeakMap：createEnvelope完整深冻结后标记实际对象；每次validate仍执行schema、房间、revision、MatchBinding/依赖和hash格式检查。首次正常化/hash校验成功才复制完整值入private memo，后续仍完整复制给Rules/调用者；外部hash/ID/verified flag或Object.freeze不授予命中。memo不暴露、不被任何分支修改，去除其额外递归freeze遍历，公开Envelope仍完整冻结。不是跨状态、不减少规则检查、不复用Preview计算或省去Apply复现。

80285一次同进程五组完整cold+hot交错计时包含首次缓存成本，两次调用总中位old1424.259ms/new1199.103ms，全部normalized state完全一致；最后一组new1385.949ms略高于old1376.969ms也保留。`native-owned-envelope-normalization-paired-timing.private.json`保存逐组数据。它仅证明本环节的收益，不推广为整个Agent的百分比或一分钟通过。因其source确实直接影响正式后端，81531于22:34:37Z启动**一次**原Marine115 RAM后端CPU观察，22:37:13Z终态0；同一记录动作/原历史/骰子，原SQLite只读，createRoom/Provider禁止，不重复其它已过规则门。完整backend51.134秒，read0.665/Legal12.910/control2.381/Preview8.504/Confirm2.624/Apply9.826/Replay13.870秒；ENTIRE原Legal/proposal/dice/events/postState/Replay保持，setup86.072秒另列。输出`formal-room-Marine-original-r115-owned-normalization-cpu-observation-v1/`。51.134与前一56.939不在受控机器负载下，不宣传整链因果加速百分比。所有当前child终态，`native-los-owned-normalization-final-source-lineage.private.json`记录最终文件SHA、精确撤回和完整结果。

源码进一步证实完整Agent还有此backend诊断未覆盖的关键路径：`hosted-bot-seat-runtime-v1.mjs`的executeApply先await Replay，通过后recordOutcome再次readAuthority，读取完整下一LegalSpace、spatialObservation/actionSpace，再写策略记忆。两段完全串行；不能把51秒backend伪称含模型、记忆和Web一分钟。下一先查真实readonly CPU并行/缓存边界，保留回放接受门和最新记忆语义；单加Promise.all不能让同步CPU规则并行，不以跳过Replay或缩减下一决策材料换速度。尚未实现这个异步设计，也未宣称穷尽无损优化。

当前diff：上一已验证elevation私有flat serializer与其既有具体bug模式，加本轮Authority自有Envelope复用及唯一具体bug复现脚本、四工作记录；ordinary/ranged两个无收益候选已撤回。0Provider/0原房写/¥0/新实验/代理/K3/网络/安装/删除/提交，未碰Prompt/Skill/样本/数学/策略。T23 33/36、T27 5/6、余248性能与对局/272军表Plan/249复盘/250报告四片。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer_prompt/fact_probe；harnessToolsCalled=actual owned-envelope normalization RED/GREEN、完整值cold/hot交错计时、直接影响的原正式RAM后端观察；uiTraceEvidence=无新Web动作；agentDecisionEvidence=原完整事实保持/无新模型决策；memoryTraceEvidence=原记忆未改；trainingTraceCandidates=0；rollbackOrDemotionRules=完整结果/返回隔离/来源/动态输入语义改变或无计时收益则撤回，合并匹配已demote；userVisibleChecks=完整行动未准出/12实验未启动。

## 21:52Z：字段索引撤回，原生扁平序列化通过；完整性能仍未准出

本轮仍只做性能，原C132保持停止/12实验0of12。诊断技能排名假设：原生普通证明字段在高地重复序列化（最大封存热点）、elevated query准备仍重复、自有快照有额外完整复制。先用既有具体bug脚本新增`inherited_los_fields`模式，实际C82/17Unit/1804地形及实际`lineOfSightFor`，普通sealer只标记自己生成的opening数组；原生数组canonical遍历计数、完整wrapper/native baseline/input/frozen明细保存。34436RED/exit1：1804数组/3608遍历/max2，说明同一实际值被再次canonical，非相似字段名猜测。

第一版索引原生canonical字段片段，35873GREEN/exit0：1804遍历/max1/ENTIRE旧完整结果同。但36227唯一直接影响的原C96上下文CPU观察55.708秒（read0.563/legal53.028/observation0.748），完整旧legal/observation/source同；nearest-owner compose8.709秒+index3.257秒，新增CPU开销11.965秒。与前轮负载不受控，不把上下文差额全部归因这一修改，但该方案的自身成本确已过高。按rollback规则**撤掉字段索引**，ordinary module字节完全回到本轮开始；慢观察/RED/GREEN全部保留，不删结果换绿。

替换算法仅用于elevation内部自己新建的完整flat assessment：完整字段原键序、有限标量和string-ID arrays，以原生JSON序列化避免重复规范化/复制数组；新增未来非flat/非有限/非string-array值走原完整canonical诊断，不改公共generic crypto。完整证明、所有地形/模型/结果字段、原SHA256/capacity检查和fallback保留，无外部prepared授权。41133是该替换唯一对应GREEN/exit0：1804数组/1804遍历/max1，ENTIRE原wrapper+native、input及冻结明细保持，fullNativeAssessmentCount1804。519.618ms窄计时不是完整行动准出。再次运行此对应门的必要性：算法已经替换，直接影响完整结果字节/哈希；未跑其它已绿门。

41921一次同进程交错算法计时，只读完整原生1804条assessment、交替旧canonical数组/新flat完整数组各7样本。所有输出字节一致；old中位35.443ms/new28.516ms。不同轮样本差异及一次new高于old原样保留，不把算法约19.5%改善套用到整行动。记录`native-elevated-flat-canonical-paired-timing.private.json`，0Provider/原房写。该微观对照仍不能证明模型、工具、存储、网页全流程已达一分钟或最优。

42421于21:52:02Z启动新源码**直接影响的**旧Marine115正式后端CPU观察，已终态0：完整链56.939秒、setup91.772秒另列；ENTIRE原Legal/proposal/骰子/events/postState/Replay全部同。隔离加密RAM导入原完整历史与签名前态，经正式Room读/Legal/控制/Preview/必要Confirm/Apply/Replay；源SQLite只读、createRoom/Provider禁止，不推进132或初始化实验。输出`formal-room-Marine-original-r115-flat-los-cpu-observation-v1/`。不是实际Agent/Web整行动验收，不能解锁实验。

本轮最终生产diff仅elevation内部flat assessment serializer与既有bug脚本的一种具体复现；ordinary第一版索引已全部撤回。四工作记录更新；0Provider/原房写/¥0/代理/K3/无关新测试/旧功能门/全量/网络/安装/清理/提交，其它项目改动保持。T23 33/36、T27 5/6，余248性能对局、272表Plan、249复盘、250报告四片；12cells0/12。下一仍是实测剩余整链关键路径、最优策略无损优化及完整行动准出，不能把counter/窄算法/后端结果放行为新对局。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer_prompt/fact_probe；harnessToolsCalled=实际LOS字段诊断/同进程完整值计时/原正式Room后端隔离观察；uiTraceEvidence=无新Web动作；agentDecisionEvidence=完整旧模型可见规则结果保持、无新决策；memoryTraceEvidence=Room/episode/strategy未修改；trainingTraceCandidates=0；rollbackOrDemotionRules=完整结果/所有权/来源变化或新算法CPU成本过高即demote，第一版已执行；userVisibleChecks=不减规则/策略材料，完整行动时延未准出。

## 21:34Z：两处原生LOS重复工作消除；完整行动仍未准出

用户再次明确顺序，已作为硬准出条件写入CURRENT_WORK/rootTASKS/PROJECT_MEMORY：最优策略无损性能及完整行动验收→初始化既定12实验→最快安全并行首ABC→修工程问题→并行余组→复盘。原C132保持停点，12实验0/12；没有因局部性能结果启动对战。

第一处具体复现用既有bug脚本新增`los_wrapper_serialization`模式，完整保存C82/17Unit/1804地形，实际调用selected runtime的`lineOfSightFor`，只观察原生assessment的canonical遍历。13179RED/exit1：1804条实际assessment共3608次/同条最多2次，完整原wrapper/native result作为baseline保存，输入和冻结明细保持。仅native elevation sealer及selected wrapper改为私有原生完整canonical字节复用；实际原SHA256根字段字节顺序、Node真实字符串容量检查、完整结果及foreign非原生fallback全部保留。15643唯一GREEN/exit0：1804次/最多1次，ENTIRE baseline、input、frozen明细同。420.504/721.122ms是非受控窄观察，不宣传墙钟加速。

16719唯一受该改动影响的原C96上下文CPU观察终态0，不重跑graph/已绿功能门：45.013秒，readRoom0.441/legalSpace43.026/spatialObservation0.626秒；完整旧legal/observation/source身份同。CPU nearest-owner仍发现ordinary terrain input-only/evaluation各自完整verifyTerrain；这里只是热点观察，不是整行动或一分钟准出。

第二处同一bug脚本新增`ordinary_terrain_preparation`模式，沿实际`createEnumerationPhysicalGeometryBatch→verifyPairs→forPairs`，完整原C82/1804地形及同一Marine/Raptor模型对，记录原rows和完整native LOS baseline。22228RED/exit1：实际1804条terrain共3608次verify/同条最多2，完整native结果含1804 assessments。仅ordinary/elevated kernel源头修复：ordinary批处理私有复制冻结完整source/map并持有prepared context，incoming queries每次独立复制/模型与底盘照常核验；elevated自有geometry用私有WeakMap持有该操作，非外部ID/hash或已验证flag。普通单次公开路径不改，ordinary批处理延迟到完整elevated query preparation之后，保持原错误优先级。25926唯一GREEN/exit0：1804次/最多1次，ENTIRE原rows+全部native LOS、完整input同。763.686/971.823ms非受控、非加速证明，复制和封存仍是剩余成本。

26488于21:34:36Z启动仅本修复直接影响的原C96 context-only CPU观察，已终态0；保存到`real-performance-C96-owned-ordinary-context-observation-v1/`。total37.500秒/readRoom0.380/legalSpace35.790/spatialObservation0.498秒，完整旧legal/observation/source身份均同；0query/Provider/Apply，不重跑普通passed断言。与前轮45.013负载未控制，不包装无偏加速百分比。Profiler nearest-owner self归属（各桶不双加inclusive）：native elevated sealing7.659秒、ordinary sealing4.350、elevated query preparation3.863、ordinary owned snapshot cloning2.659、terrain verification2.647；geometryProjection2.309、model-base source verification2.535另有成本。下一仅沿实际重复封存/复制/源核验继续无损优化，不凭“结果一致”宣布性能最优。全部本轮child已终态，源字节与运行ID保存`native-los-owned-preparation-final-source-lineage.private.json`。当前完整行动性能仍开放，后续要完成含模型、多轮tools、执行/存储、Web的实际准出，不能拿两条窄绿门开新实验。

本段diff：ordinary terrain/elevation/selected ranged三生产文件及同一具体bug脚本；四工作记录更新。0Provider/0原房写/¥0/代理/K3/全量/安装/网络/清理/提交；其它项目修改保留。T23 33/36、T27 5/6，余248性能与对局、272军表Plan、249复盘、250报告四片；旧终局0/3、新12cells0/12不变。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer_prompt/fact_probe；harnessToolsCalled=原完整LOS call-site复现、原Room context只读CPU观察；uiTraceEvidence=无新Web动作；agentDecisionEvidence=无新模型决策，原完整结果保持；memoryTraceEvidence=原Room/episode/strategy记忆未修改；trainingTraceCandidates=0；rollbackOrDemotionRules=完整原结果、所有权、来源或容量/错误语义变化则不集成；userVisibleChecks=完整合法动作身份保持，整行动时延尚未验收。

## 20:57Z：原生LOS内部四线程完整结果相同；整行动未准出

严格按用户顺序只处理性能，原C132暂停、12实验0/12、无新对战。先排除不安全/错误优化假设：Preview→Apply确有重复计算，但V5借用外部legacyRuntime闭包，不能仅凭preview ID/hash/runtime ID直接缓存权威结果；legacy normalize内terrain factory只是浅层重建，不是第二次全树deep-copy，不能基于此错误归因修改根仓输入。

具体热点是外层readonly池虽并行，关系图内部原659对LOS仍串行。已有实际请求脚本增加独立`special_los_parallelism`复现模式，不重跑旧已绿功能门。83171RED终态0（脚本以报告为结果）：query32.784秒、完整原responseHash SAME、659全完成，但nativePairThreadCount=0，报告`not_accepted/ACTUAL_RELATIONSHIP_LOS_PAIRS_STILL_EXECUTE_SERIAL_IN_ONE_THREAD`。原SQLite只读、Provider0、费用0。

91376唯一GREEN终态0，4组4线程实际时间区间重叠，659requested/completed/recovered，0failed/scalarFallback/retag、完整旧responseHash SAME；query25.390秒、context46.074秒分别记录。组165–330为20.890秒、0–165为21.249、495–659为20.424、330–495为20.472秒。当前本机12逻辑核曾观察1分钟load17.847、free362MiB；未控制系统负载，**不把RED/GREEN耗时差包装受控AB，更不是整行动一分钟通过**。

实现边界：

- 全请求先走原special-terrain source/context/actor/query-ID/target校验，再按原索引拆为最多4组。Standalone异步graph拥有完整纯JSON快照；已有外层CPU worker不嵌套另一个池，warm/dynamic/getter/Proxy/非标准输入保持原同步语义，不冻结调用者。
- Worker执行同一原生ordinary+grass计算，桌面LOS行使用与同步图共享的精确投影。完整canonical原始字节低压缩后以私有ArrayBuffer转移；已完成内容不依赖Worker存活，缺失transport结果只补算缺失索引，不把transport失败当规则判定。
- 正常容量时按原root排序和原索引流式SHA256，不能拼接子hash替代旧hash。真实Node字符串容量超限时保持原native scalar身份、adapter、`Invalid string length`与第一越界部分和/count fields；没有人为模型/地形/文字截断，外部调用者不能传入trusted prepared length/result。
- Room直接query异步后再次读当前权威，改变revision/hash不发布旧几何。换状态创建新cache对象，旧query最多持有旧对象；只在权威仍有效且cache仍属本次状态时加入本次owned cache。同步warm cache继续复用。

另一个已见来源成本是Worker仍持有整个分组的ordinaryResults+results。21:02Z进一步改native visitor：一次原context/model cache，逐对原生计算、投影/压缩/传回并释放完整树；同步公开batch合同不变，native WeakMaps不强留已释放树。不减任何模型对、地形评估、几何样本或策略信息。

95763已终态0：原C106正常批次query3.734秒/context11.830秒，原C96超限query22.844秒/context43.732秒；两个完整原responseHash SAME。C106原/新正常批次SHA256均`4fbb35913104dadcd709ec0d754c794815af5017e1146fdb6f010a4fcac96d90`、failure=null。C96全659requested/completed/recovered、0failed/fallback/retag、first-overflow partial sum538032073/实际cap536870888与旧scalar身份/标签全同。两条从既有manifest原样选取，不重跑已绿parallel gate；理由是visitor直接改变native结果产生顺序/存活期，正常批次字节封存也是新接线。没有当前冷/热或负载受控AB，不宣称墙钟数字单独证明性能最优。输出`real-performance-native-los-streaming-current-observation-v1/`，源码完整字节谱系`native-los-worker-streaming-final-source-lineage.private.json`；script驱动hash与runtime合同hash分开。

C106只有两个native pair，两个线程实算1.073/1.029秒而整个query3.734秒，启动/快照/汇合成本不可忽略；后续小批次是否回同步或使用热worker需基于实际测量决定，不能盲目声称任何规模4线程都最快。C96仍有43秒正式query context成本（readRoom→legalSpace→playerSpatialObservation），现阶段不能靠query22秒放行完整Agent。

3166**仅上下文**CPU诊断已终态0：context44.419秒，其中readRoom0.391/legalSpace42.618/spatialObservation0.504秒。完整旧legalSpaceHash/observationHash及源数据相同，没有执行graph query、模型或动作。既有observer独立`context_cpu_observation`入口不跑旧context功能assert/旧并行门，只有读源、实际阶段计时/CPU/原身份记录；不是另开对战，也不假装完整Agent准出。输出`real-performance-C96-context-only-cpu-observation-v1/`，来源归因`C96-context-source-attribution-current-20261010.private.json`。

CPU self normalizeCanonical11.272/canonicalStarcraftTmgJson8.882/nativeSHAupdate7.775/structuredClone2.790/GC1.843秒。按每个sample最近非通用crypto调用源分组（不重复累加inclusive）：selected-roster `lineOfSightFor→seal`6.519秒、`finishElevatedLineOfSight`6.382秒、ordinary输入verifyTerrain2.498秒、elevated prepare/verifyInputs2.148秒、ordinary seal值序列化2.145秒、verifyInputs geometryProjection1.637秒、evaluate verifyTerrain1.624秒等。**主要是合法动作生成对完整LOS重复封装/序列化及同context重复terrain准备，不是模型、Web读图或空间查询本身慢。**

下一交付仍仅性能：在这些确定来源处先用既有完整native输入做新具体重复序列化RED，再让native已冻结结果复用它自有canonical字节，保持完整旧两层结果及身份；另考察输入-only/evaluate是否共享同一次native准备，不能删掉输入验证或依据ID/外来prepared facts复用。其它旧绿/全量不重跑；未做此修复或完整Agent性能准出。当前所有本轮child终态，无在途进程/新Provider/原房写/新局。对局恢复和12实验初始化仍不允许提前执行。

本轮源码/已有具体bug脚本9文件：ordinary/special terrain kernel、tactical graph、Room空间query adapter、既有per-type replay脚本；新pair-row projector、native completion projection/压缩、native worker、private worker batch四个深模块。另CURRENT_WORK/本记录/root TASKS/PROJECT_MEMORY，未提交，不混入既有其它改动。0Prompt/Skill/模型调用/概率样本/候选变动，0原房写/新实验/代理/K3/网络/安装/清理/旧绿或全量重跑。

未完成性能交付仍是正式完整Agent行动（模型多轮/tools→Preview→Apply→Replay→Web）的当前版本验收；不能以25秒query或53秒RAM后端放行。T23 33/36/T27 5/6，余248性能与对局、272军表Plan、249复盘、250报告四主线；旧终局0/3，新12cell0/12。硬顺序保持性能→12初始化→首ABC并行→修工程问题→其余并行→复盘。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer/fact_probe（无模型）；harnessToolsCalled=实际原LOS/query/只读SQLite/CPU observer；uiTraceEvidence=0新Web动作；agentDecisionEvidence=完整历史659pair facts/response identity同、未做新决策；memoryTraceEvidence=0修改；trainingTraceCandidates=0；rollbackOrDemotionRules=完整结果/权限/所有权变化不集成、整性能未过不推进实验；userVisibleChecks=上述明确范围及仍未准出。

## 20:24Z：当前源码观测均终态；完整性能尚未准出

55106和58380均终态0，无本轮pending child。55106当前完整原C96 query32.562秒/context44.732秒（diagnostic setup48.186秒，restore3.725秒另列），ENTIRE输出身份/签名输入/全部659requested/completed/recovered和旧capacity/failure标签均相同。上一47874为25.696/26.345秒；上下文也明显增长，未控制其它负载，不能把不同冷运行硬说成源码提速/退化因果。prefix修复的有效证据仍为同完整body大文本update5→3且完全相同两个SHA256身份，不借墙钟波动包装完成。

58380因新ordinary/native grass封装直接影响正式Legal/Preview/Apply路径，只做一次当前原115正式后端CPU观察，**不是旧规则功能gate重跑**。本次read0.638/legal15.009/claim1.494/Preview8.602/Confirm2.427/Apply10.812/Replay14.214秒，链53.487秒；完整原proposal/chanceReveal/events/postStateHash/LegalSpace和Replay SAME。4提交仅隔离RAM、源SQLite只读/0写、Provider0/费用0；diagnostic setup82.503秒，restore30.893已含在setup中，不重复相加或当真实每行动固定成本。最新source不能用上一47.687秒替代，更不能称含模型/Web已一分钟通过。

当前正式CPU self canonical7.349/normalize6.827/nativeupdate4.925/legacyclone4.689/rangedguard4.252/codecdecode3.200/GC2.593/Storeclone1.773秒；inclusive不得重加。只读产品源确认hosted-bot-seat-runtime executeApply在Apply后确实等待Replay，再记录outcome；不能为了报快把Replay排除计时。Preview已经calculatePreviewCore得到native nextState/events，Apply又重新calculate；该剩余repeat seam尚未改，generic Rules runtime闭包可动态变化，后续必须完整来源/所有权/状态/权限/骰子/过期验证，不能仅凭preview ID/hash缓存放行。序列化/normalize/copies和inner同步pair计算仍是可继续论证的无损路径。

本轮已完成交付：1.native codec自身AES密文TEXT复用；2.SQLite commit单次完整serialize/fresh decode return；3.native LOS明细一次canonical/原生冻结文本复用；4.primary/scalar相同SHA256前缀只计算一次。四个具体bug各一个有效RED→一个GREEN，已过旧命令不重跑，无新常规矩阵。剩余性能交付：实际完整动作关键路径继续无损优化→当前统一源码完整Agent验收；**在完成之前不初始化12实验、不推进原C132**。其后才四条件各ABC共12cell初始化→首ABC最快安全并行→修工程问题→其余组并行→复盘；不存在提前以单query/后端合格放行的捷径。

最终diff范围10文件（本轮，不含用户既有变化）：packages/room-store/{room-store-v1,sqlite-room-store-v1}.mjs；packages/rule-atoms/{official-terrain-los-rules-kernel-v1,official-special-terrain-rules-kernel-v1}.mjs；scripts/{verify-ticket-23-room-aggregate-decode-reuse-v1,verify-ticket-23-los-result-identity-serialization-reuse-v1}.mjs；CURRENT_WORK、本记录、rootTASKS/PROJECT_MEMORY。无Prompt/Skill/几何/候选/样本/通用crypto改动，无代理/K3/网络/全量/安装/清理/提交。T23 33/36/T27 5/6，主线余248性能与对局、272军表Plan、249复盘、250报告四片，旧终局0/3、新12cells0/12。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer/fact_probe（无模型）；harnessToolsCalled=原native Room/LOS/SQLite/CPU observer；uiTraceEvidence=0新Web动作；agentDecisionEvidence=完整历史native提案/659pairs/骰子保持，未做新策略验收；memoryTraceEvidence=0修改；trainingTraceCandidates=0；rollbackOrDemotionRules=完整结果/权限/ownership变化不集成，完整性能未通过不推进实验。

## 20:16Z：关系图25.696秒；双身份相同哈希前缀只计算一次

47874本次直接影响的CPU观察在20:10:06Z终态0：完整原C96 graph query25.696秒，context26.345/诊断setup29.450秒分别记录，完整native签名恢复/responseHash与原值相同。全部659requested/completed/recovered、0failed/scalarFallback/retag、旧538032073容量下界与536870888实际上限保留。旧已绿功能gate没有重跑，不当作新实验/完整Agent一分钟或受控AB；当前source与原47.699跨负载不可只归因本次修复。实际CPU self hash update11.288秒，其中草丛双身份7.651、ordinary3.536秒；normalize3.356/canonical2.405/GC1.744秒，inclusive不重复相加。

针对实测热点，既有具体bug脚本新增独立prefix_hash_reuse模式（已过assessment_reuse/identity模式不重跑），实际53064首RED终态1：相同full/subset大文本在普通/草丛primary/草丛scalar SHA256中update5次、相同完整文本最多3次，完整两个旧native身份/输入/冻结原样正确，失败仅为相同prefix重复工作。

只改grass native sealer：固定命名root排序中两个身份在planId之前**完全相同**，先由原primary SHA256计算一次完整前缀，遇到planId在修改前copy同一原生Hash上下文，之后各写原planId/原scalarPlanId和后缀。没有改SHA256算法、内容字节、generic crypto或任何校验，也不跨对象/调用复用digest。53598唯一GREEN终态0：大文本update3/max2（ordinary一次、grass共同prefix一次；grass subset共同prefix一次），ENTIRE旧primary/scalar结果、完整输入和冻结细节相同。native caller/text权限不扩展；单身份不fork。窄query720.566→891.193ms跨负载且后者更慢，不冒称窄全查询加速；证明为删除重复工作/相同值。

55106于20:16:38Z启动唯一受这次prefix修改直接影响的原C96 query_cpu_observation，完整scope且无功能gate重跑/Provider/源房写；此记录时pending。输出real-performance-native-prefix-hash-cpu-observation-v1/，只轮询同句柄，禁止源混改/观察超时重启。native-los-text-and-prefix-final-source-lineage.private.json保留最终文件字节hash：ordinary ae515d50.../special30e890fa.../现有bug脚本a20b5d36...。源码组合不能由旧25.696秒直接替代新的观察。

另外只读查完整动作源：Preview calculatePreviewCore已经原生算出nextState/events，Apply又计算同一core；尚未改复用，因为必须保留当前source/全envelope/权限/骰子/expiry/幂等与malformed输入语义，不能借preview ID/hash绕过合法性。后续若CPU仍显著，先按实际source输入完整匹配论证该native私有seam；不是删Apply校验或随机缩策略查询。原Room C132、12cells0/12、旧终局0/3保持，T23 33/36/T27 5/6/主线余248/272/249/250。

本轮合计10文件局部diff：2Store/2native terrain生产、2既有具体bug脚本、CURRENT_WORK/本记录/rootTASKS/PROJECT_MEMORY；四具体性能bug各1RED→1GREEN，0旧绿/全量/代理/K3/网络/安装/删除/提交。harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer/fact_probe（无LLM）；harnessToolsCalled=原native LOS/SHA256 copy/正式原查询CPU observer；uiTraceEvidence=无新动作；agentDecisionEvidence=原完整query/pairs/提案保留；memoryTraceEvidence=0修改；trainingTraceCandidates=0；rollbackOrDemotionRules=原完整结果/权限/ownership变化则不集成；最优性能+完整行动未准出不启动实验。

## 20:08Z：原后端47.687秒；地形明细最多三次遍历降为一次

严格ONLY性能，未续打/初始化实验。32068已在19:52:56Z终态0：原签名C114→Marine115在完整C132历史负载的正式RAM链read0.580/legal13.124/claim1.562/Preview7.845/Confirm2.314/Apply9.180/Replay12.818秒，共47.687秒。原完整proposal/chanceReveal/events/postStateHash/LegalSpace及Replay均相同，4提交仅RAM/源SQLite0写/Provider0。coldsetup68.683、restore26.500秒独立记录，后者含在setup里不能重复相加或算单行动固定成本。54.619→47.687为不同运行负载，不宣称受控加速百分比；本后端观察不包括模型/Web，**整行动一分钟仍未通过**。

当前CPU self按函数汇总canonicalJson6.809s/normalize6.133s/nativecrypto update4.580s/legacy deepClone4.115s/ranged guard3.832s/codec decode2.915s/Storeclone1.644s，inclusive不得重加。读取既有源发现native普通LOS封装与草丛适配封装会重复canonicalize SAME完整assessments；先在现有具体身份bug脚本增加独立assessment_reuse模式，旧已过identity模式不执行，仅读取已保存两个完整旧结果作为参照。44964首RED终态1：真实C82/17Unit/1804地形同一批明细4024次遍历/max3（普通全明细、草丛全明细、416草丛subset），完整两个旧身份/输入/冻结边界原样正确，失败只为重复工作。

两个原生terrain模块源头修复：ordinary evaluator自己生成的普通data明细以原canonical serializer计算一次文本并冻结，再仅在私有WeakMap登记。普通result固定命名非数字root字段按同一排序、同一canonical值与SHA256生成**完全相同字节**；grass adapter只取本module原生冻结数组/明细文本，filtered subset逐descriptor检查native enrollment，不缓存可变subset、foreign/Proxy/getter/custom array均回到原serializer。未添加外部prepared facts/visibility authority，未改generic crypto、任何几何计算、pairs/candidates/samples、Prompt/Skill/策略信息。单身份和双身份均用该原生明细文本，但输出合同不变。

46372唯一修后GREEN终态0：1804条明细共1804遍历/max1，ENTIRE旧primary/scalar结果（全部明细、hash、metadata）和完整input/frozen明细保持。窄query旧794.888/新755.748ms非受控AB，不据此夸大整体收益。一次bug红绿收敛，无旧绿功能验证/全量/代理/K3/网络/安装/清理/提交。采用codebase-design仅把跨module序列化复用留在native内部小interface，不更改产品查询接口。

47874于20:08:31Z启动唯一受影响原C96的既有query_cpu_observation：完整659model-pairs/1804地形/原签名/原query，源房只读/0Provider，不重复已过功能gate，仅留完整output/input身份和CPU。输出real-performance-native-assessment-reuse-cpu-observation-v1/，此记录时pending；只轮询同handle，运行时不混改生产imports。留意weak-cache临时内存和剩余inner同步pair critical path，再决定后续无损优化，不能只因query<60就放行实验。

新增diff3文件：ordinary kernel native canonical text/private membership；special kernel同值文本封装；现有具体bug脚本独立模式。与本轮Store两修复及四记录合计10文件局部变动；证据los-assessment-reuse-{red,green}.private.json/original-sources.private.json，32068report/cpu，47874launch/exit和观测目录。T23 33/36/T27 5/6/余248性能与对局、272军表Plan、249复盘、250报告四片，新12实验0/12/旧终局0/3，停点132保持。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer/fact_probe（无LLM）；harnessToolsCalled=原native LOS/私有canonical-text adapter/正式RAM原动作CPU observer；uiTraceEvidence=无新网页动作；agentDecisionEvidence=完整原提案、query、pairs保留，不是新策略验收；memoryTraceEvidence=0改动；trainingTraceCandidates=0；rollbackOrDemotionRules=完整值/拒绝/ownership变化即不集成，本局部门不能放行12实验。

## 19:50Z：存储自身密文复用与提交重复序列化两处修复

继续ONLY性能，未启动Host/Web自动推进或12实验；旧C最后停点132保持。上一goal轮是实际生产与证据进展，不是性能准出。按diagnose/harness技能显示三假设后验证：native producer下一读重复AES、commit返回重复JSON序列化、完整状态反复normalize/hash。只实际修前两处，第三仍待优化，不能据此跳到实验。

实际完整原C132（1804地形、完整grants/历史/previews/幂等聚合）读取原SQLite只读/total_changes=0；测试只在内存SQLite导入原聚合，不是新实验房、没有规则动作。既有具体缓存bug脚本新增 `native_encode` seam：21267首RED终态1，自己刚产生的20575917字符密文下一读又decrypt1，encode356.949ms/read427.879ms。原完整数据、caller隔离、恶意tag、wrong Aad/key、外来reader和false option都原样正确，失败只为实测重复工作。

Codec只记**同一私有实例自己刚完成AES-GCM生成的完整密文/tag/完整AAD对应序列化TEXT**，不共享可变对象、不认外来hash/id/provenance。改变密文或AAD要原完整解密认证；不同key实例不共享。编码时配置只检查plain data descriptor，不新增Proxy/getter求值，动态配置仍走旧decode-only路，explicit false保持关闭。保留原64MiB/4entry LRU、超出留存容量仍接受payload并走原解密，不缩文本策略。22789唯一修后GREEN终态0：自身重复解密0，完整数据及全部本次直接影响的拒绝/caller边界通过，外来reader/off lane各实际decrypt1。encode510.543ms/read253.390ms跨运行非受控，不能宣称整链速度百分比。已有外来cipher重复读取门仅改fixture为独立producer，避免把新native-encode语义错误塞进旧“第一次外来读取decrypt1”断言；未重跑该已绿门。

接着新增独立具体 `native_commit_copy` 模式：26205首RED终态1，native SQLite commit同一完整nextAggregate根对象JSONStringify2次（一次AES encode、一次clone return），实际1065.294ms。仅同源数据roomRevision+1的RAM元数据提交，Rules state/骰子/军表/地图不变，源房0写。SQLite UPDATE保留同样expected counters、事务/三ledger/幂等/完整AES路径，改为保存完整 `aggregateCipher` 并返回它的fresh decode，不重新串行化原对象。29233唯一GREEN0：序列化1次，实际934.599ms；ENTIRE返回/持久化及submitted value一致，独立关闭cache的AES reader读完整cipher也一致，caller修改不污染下一读。createRoom未改；两个transport修复不改变Authority/RNG/规则数学/Prompt/Skill/候选/样本。

本次必要新性能观测32068于19:50:48Z启动，隔离RAM原C114→115完整正式操作链（原动作用原骰子，源SQLite只读），只量直接受codec/load/commit修改影响的CPU关键路径，不重跑旧功能gate，不推进原房/初始化实验、不调用Provider。此记录写入时仍pending；只轮询同handle，运行时不混改生产imports，观察超时不能当终止或重启理由。输出 `formal-room-Marine-original-r115-codec-commit-cpu-observation-v1/`。没有把阶段或RAM后端当含LLM/Web整行动60秒证明。

其它已读源头：readonly query pool已把外层query/fire工作并行到max4，但Graph `specialTerrainLineOfSightLookup` 内部仍同步执行完整model-pair草丛LOS batch，不能说关系图本身已经多线程分组；队形比较另有max4线程。还未改pool或删/缩任何pair，下一根据当前CPU与原复杂case证据优化这条内层critical path，而非只无条件加线程。

证据：共享build的 `native-room-encode-entire-original-aggregate.private.json`（完整输入保留）、`native-room-encode-decryption-{red,green}.private.json`、`native-room-commit-duplicate-copy-{red,green}.private.json`、两个original source capture、`native-room-codec-commit-final-source-lineage.private.json`（最终文件字节SHA256codec4434ee54.../sqlite76a33722...）、32068观测目录/launch/exit。当前child具体红绿均终态，一次分别收敛；无旧绿/全量循环、无代理/K3、网络、安装、清理、提交；0原Room写/新增Provider/费用，其它项目保持。

本轮diff7文件：codec私有完整文本producer复用；SQLite commit消除重复serialize；既有具体bug脚本两个新模式/外来writer夹具；CURRENT_WORK/本记录/rootTASKS/PROJECT_MEMORY。T23 33/36、T27 5/6、余248/272/249/250四片、旧终局0/3、新12实验0/12。最优无损性能+完整行动未准出不初始化实验，之后才首ABC并行→修工程→余组并行→复盘；旧账继续分组累计，不擅自扩12预算。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer/fact_probe（无LLM）；harnessToolsCalled=原生AES codec/正式SQLite commit-load/隔离RAM原动作CPU observer；uiTraceEvidence=无新Web动作；agentDecisionEvidence=保留原115提案/原132数据，不是新策略验证；memoryTraceEvidence=无记忆修改；trainingTraceCandidates=0；完整data/拒绝语义/caller isolation变化不集成，当前局部优化不能放行实验。

## 19:23Z：仅入口遍历优化通过；整行动仍未准出

本轮严格性能优先：没有推进原房C132、初始化12实验或新Provider调用。使用 `diagnose` 实测回路和 `agentic-harness-evolution-loop` 记录工程影响，不改Prompt/Skill/候选/样本。读已有CPU，不为取样开打。

原优化后Marine完整后端CPU中 `plainRangedDataTree` 自身约4.115秒：每个对象都生成完整属性描述表，再生成entries数组。现有具体bug脚本新增的 `descriptor_allocation` 模式读取真实签名C114、1804地形及完整旧原生枚举，不另造缩小局面。771第一次RED终态1，实际单遍82821份bulk descriptor maps，完整旧枚举和caller一致；源码修前已真实复现。

生产只改射击模块内部guard：先排Proxy/循环和非标准prototype，取得同一完整ownKeys（含symbol拒绝），逐属性读取data descriptor，保留非枚举/getter拒绝与原生array length例外，避免bulk map/entries分配。不改变source/runtime验证、完整state identity/equality、规则几何、缓存容量或caller所有权。2080唯一修后GREEN终态0：临时属性表0、完整旧原生枚举/完整输入/caller不冻结均保持。同一个进程、同一完整输入、交错顺序5对：旧guard中位673.460ms，新266.058ms。红绿冷公有枚举分别7.843和11.914秒，负载不同且后者更慢，**不能当全查询或全行动加速证明**；准出仅为实测guard变快和本次改动完整结果保持。旧已绿规则/查询门不重跑。

只读3445两席原Provider账本终态0/total_changes=0，查现有132 choose_first_actor的两条请求时间：21.359+9.781=31.140秒，发送至结算包含网络、Provider、响应处理、settlement，不冒称纯模型计算。对应既有agent_decision37.106秒，其余decision工作5.966秒；已付费输入279637、输出6945tokens，仅记录旧费用。本席read起点18:56:18.194Z到record_outcome18:57:20.582Z为62.388秒，nested record_outcome与后读不重复相加，尚未包括其余Web与未instrumented工作。**明确未达60，也不是本次guard源码的新鲜整行动验收**。该动作没有空间backend查询，不能解释重型队形/关系图动作。原账本/Room/记忆/骰子未写，新费0。

下一直接交付为实际剩余关键路径与策略无损优化，不是继续对局。9049于19:24:53Z启动唯一受本次guard修改影响的隔离RAM原115动作CPU观测（既有performance observer，非旧规则gate重跑），现在终态0。源SQLite只读/保留原C132完整历史开销、0Provider/原房动作/实验房初始化；原签名恢复至114再执行原115，不替换源房状态。运行时未混改生产imports或pending重启。CPU分段、coldsetup与正式操作分开，不把RAM结果当Web/模型整链准出。

当前操作read0.939/legal14.741/claim2.074/Preview9.311/Confirm3.229/Apply10.329/Replay13.709秒，后端链54.619秒；coldsetup75.366秒只属于诊断副本装配，不能相加成每行动成本。原完整proposal/chanceReveal/events/postState、LegalSpace及本次Replay一致，4commit仅RAM。当前输入仍完整1804地形/原17单位，源历史较旧25.433秒观测多4个accepted动作、负载未受控，不冒称整体加速或证明源码导致退化。新CPU self样本：canonical7.315秒、normalize6.840秒、native update4.966秒（另node crypto wrapper self2.356秒不与inclusive混算）、legacy deepClone4.620秒、guard4.247秒、Store clone3.279秒、decode3.143秒、GC2.830秒。Geometry节点只在Legal下面出现，后续prep/instantiate/chance仍有内部context复用，没有证据称cache失效或重复完整几何。剩余实际热点依旧是完整序列化、复制、hash，必须继续优化并测完整Agent关键路径，不能用54.619<60放行实验。

证据均位于共享build：`native-ranged-data-walk-allocation-{red,green}.private.json`、`native-ranged-data-walk-original-guard.private.json`、`native-ranged-data-walk-final-source-lineage.private.json`（最终文件字节SHA256`ef8ffc49...`）、`C-existing-paid-request-timing-diagnostic.private.json`、`C-existing-r132-action-critical-path-20261010.private.json`、`formal-room-Marine-original-r115-data-walk-cpu-observation-v1/`。

本轮diff：射击private guard1文件、既有具体bug脚本1文件、CURRENT_WORK/本记录/rootTASKS/PROJECT_MEMORY四记录。无通用crypto/Room/策略/规则数学/UI修改；0代理/K3/网络/安装/删除/全量/提交，其它项目保持。T23 33/36、T27 5/6、余248/272/249/250四片、旧终局0/3、新12实验0/12。性能及完整行动未准出不解锁任何实验；如进一步提速必须削减策略信息或LLM阶段，先拿实测与用户讨论，不自行退化。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer/fact_probe（无新模型请求）；harnessToolsCalled=原生public enumeration、只读Provider账本、隔离RAM正式Room CPU observer；uiTraceEvidence=无新网页动作；agentDecisionEvidence=旧132分段与原115提案，不是新策略结论；memoryTraceEvidence=无记忆修改；trainingTraceCandidates=0；完整原结果/caller ownership/拒绝语义变化或同进程guard计时退化则不集成，未过完整性能不启动实验。

## 18:29Z：原Marine正式后端链57.124→25.433秒，规则效果和骰子不变

30874原C114→115完整后端观测终态0：read0.457/Legal6.477/claim0.763/Preview14.782/Confirm1.313/Apply15.687/Replay17.510秒，链57.124秒。ENTIRE原proposal、chanceReveal、events、postStateHash与本次正式Replay都一致。真实原1804地形/完整17单位及完整20.5M字符aggregate历史开销保留，源SQLite只读、0新Provider；4次写入仅加密RAM。CPU实际有7条完整射击枚举调用路径（约5秒/次），6条实例化后额外context几何、3条chance额外context几何。Root函数inclusive不能相加；Store各read约0.1–0.27秒、commit约0.52秒，不是这个动作的主要瓶颈。

具体公有入口重复计算bug40645 RED/exit1：同完整签名局面与独立可变副本，两个完整原native枚举完全相同，分别5.400/5.388秒却未复用。唯一44432 GREEN/exit0：ENTIRE保存旧枚举（resultHash`f9316a26...`）、完整输入、caller不被freeze保持；cold7.977/hot1.151秒、同原生不可变结果复用。两轮负载不同，不把cold差异归因于源码。

射击模块新增内部深模块复用，不扩张外部interface：最多两份自己完整复制冻结的native state+enumeration+contexts。每个公开入口仍执行原完整source/runtime核验；缓存键是完整state hash、side、includeDisabled，命中还要求完整deep equality，不信caller hash/ID/prepared facts。任意值/规则源/版本/状态变化会miss并重走原生计算。缓存只复用原生已算事实，不替代Seat/Binding/Preview/Apply/Replay权威核验。实例化、chance只有在当前完整数据仍等于模块自有快照时消费其context；caller不被freeze。现有owned query batches保留原路径和私有diagnostic，未为了这处修改重跑23已过查询。非纯数据/getter/Proxy/非标准prototype/循环/不能完整复制的数据走原路径。

46507本生产修改唯一受影响原动作完整观测18:19:42Z终态0：

| 原生Room操作 | 修前秒 | 修后秒 |
| --- | ---: | ---: |
| Read | 0.457 | 0.453 |
| LegalSpace | 6.477 | 6.368 |
| Claim | 0.763 | 0.715 |
| Preview | 14.782 | 4.782 |
| Confirm | 1.313 | 1.210 |
| Apply | 15.687 | 5.159 |
| Replay | 17.510 | 6.624 |
| 完整后端观察链 | 57.124 | **25.433** |

原proposal/dice/events/postState、LegalSpace身份及Replay全部一致。修后CPU仅在Legal路径出现一次完整原生enum；其后6条preparation约0.51–0.53秒、没有实例化或chance下额外candidateGeometry采样堆栈。CPU采样不是精确调用计数，不能扩大成全类型证明。输出 `formal-room-Marine-original-r115-action-optimized-v1/` 留存完整Room返回、CPU及源谱系。coldsetup40.336秒包含签名restore14.110秒，二者不能相加；常驻运行不应重建这个诊断fixture。RAM-store不等于磁盘WAL或Web/模型时延，历史Room metadata也非完全同一时刻，仅真实Rules envelope/action重演；不把它当完整线上人机验收。前后单次观察也不是负载受控性能统计。

集成前边界排查确实发现两处新增High并定点红绿，而非放宽规则：51482 RED/exit1证明动态sideKey getter读取两次导致player2结果污染下一普通player1；只给options加纯数据资格保护，52588唯一GREEN/exit0，getter原单次读取、两完整结果等于旧baseline、caller保持。54755 RED/exit1证明不可枚举phase值被structuredClone遗漏而错误关闭射击；只排除不能完整复制的非枚举数据（保留数组原生length），55561唯一GREEN/exit0，原完整枚举/phase descriptor/caller保持。证据 `native-ranged-options-cache-poisoning-{red,green}.private.json`、`native-ranged-state-descriptor-{red,green}.private.json`。新增guard回归只覆盖已实际复现这两bug，无新常规矩阵、无旧绿重跑。25.433秒是这两个资格guard之前的普通参数路径，最终guard仅有定点完整结果证据，没有重新测正常全链速度；不伪报终版所有类型/Agent一分钟已过。三类具体bug各自收敛，不扩展第四审计循环。

本轮最终diff（7文件）：射击native module完整自有复用；一个正式Room性能观察脚本（具体重复枚举模式）；一个实际新增getter/descriptor bug回归；CURRENT_WORK、本记录、rootTASKS与PROJECT_MEMORY。没有AuthorityEngine/RoomStore/通用crypto/规则数学/Prompt/Skill/UI修改，没有目标/候选/样本削减。所有诊断child终态，源房仍未写，原费用全部保持，0Provider/¥0/代理/K3/网络/安装/全量/清理/提交。T23 33/36、T27 5/6、248/272/249/250开放，终局0/3；20图、精确2000、完整同房对照目标不缩。

18:33:02Z直接只读SQLite最终观察确认原C仍revision128、roomRevision452、R2Assault及stateHash`89547e47...`，total_changes=0。最终射击source hash`7b14b746...`与25.433秒计时epoch`25524ee1...`分开存于优化目录的 `final-eligibility-source-lineage.private.json`；最终源码相对计时仅新增两处特殊数据缓存资格保护和注释，不冒充再次计时。

下一交付仍是含模型、多轮tools及正式操作/存储/Web的当前human/AA同行动时延，准出后才开新受控对局，然后272稳定军表+地图Plan、249复盘实验、250报告。harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=harness_optimizer/fact_probe（无模型调用/原selfplay提示词未动）；harnessToolsCalled=正式Room read/legal/claim/preview/confirm/apply/replay；uiTraceEvidence=无新UI动作/截图；agentDecisionEvidence=原115提案及骰子/效果全一致，不是新策略决策；memoryTraceEvidence=游戏记忆未改；trainingTraceCandidates=0；若完整原效果、caller ownership或拒绝语义漂移则不集成复用、保留原生路径。

## 18:02Z：正式Room只读分段完成，原Marine完整操作链观测启动

26323只读CPU观测终态0，原C128/R2Assault、1804地形、128预览/128幂等历史、20,522,099字符加密aggregate原样复制到RAM：readRoom383ms、legalSpace652ms、replayRoom3294ms且matchesCurrent=true。Store各load107–116ms、bundle510ms。输出 `formal-room-operation-cpu-observation-v1/`，源SQLite只读/0写，副本也0写、0Provider/¥0。该席finiteActions为空，不能用轻停点当复杂射击/整行动性能证明；当前样本也不支持把Store加载泛化成主瓶颈。

新增的是性能观察脚本（不是新规则单测）`observe-ticket-23-formal-room-action-latency-v1.mjs`：原生签名回放恢复真实Marine射击前C114，保留原完整军表/模型/1804地形及完整aggregate历史开销；仅RAM Rules envelope/accepted计数回退，审计与控制历史仍原完整副本，所以不宣称这是完全相同历史Room metadata或线上对局。执行正式Room read→LegalSpace→claimControl→Preview→需要时Confirm→Apply→Replay；提案直接取原115 receipt，预期骰子/效果/后态与原动作单独比对。Replay只保留原accepted facts至114及本次RAM新增receipt，不改签旧事实、不经过另一个权威mutation实现。原房仍C128。

30874于18:02:02Z启动唯一该实际动作观察，`formal-room-Marine-original-r115-action-observation-v1/`；本条写入时尚未产生完成结果。只轮询同句柄、超时不重启；运行期间不修改生产imports。全链报告与CPU将区分setup/签名恢复、正式操作和嵌套Store时长；即使backend过60秒门，也不能代替含模型/多轮查询/Web的完整Agent行动。旧23查询门不重跑、无Provider/网络/代理/K3/安装/全量/清理/提交，T23/T27/四片/full0of3及完整地图/2000目标保持。

## 17:43Z：关系图47.699秒完整一致，23个查询案例全部准出

93350本修改前的唯一新路径CPU观测终态0，实际原C96 query74.963秒、完整旧responseHash一致；既有功能assert不重跑。实际profile中hash48.446秒，恢复时重复scalar身份封装20.685秒，容量预判重复JSON长度6.362秒；原生ordinary LOS21.285秒包含其中9.151秒结果hash，native grass22.939秒包含18.315秒hash，不把inclusive时间相加。source verify115ms、map adaptation432ms不是剩余主因。完整CPU及热点在 `real-performance-graph-C96-recovery-cpu-observation-v2/`，这些是当前路径实测，不拿旧311秒图解释新68秒。

新测试仅复现具体重复身份序列化bug：`verify-ticket-23-los-result-identity-serialization-reuse-v1.mjs`读取真实C82完整17单位/1804地形和原位置，修改前保存两个legacy native完整结果，4234 RED/exit1证明同一次计算不能给出scalar身份、必须重复完整封装。保存baseline后不重新生成；6496唯一修后GREEN/exit0：ENTIRE legacy primary与scalar结果（全部assessments/metadata/hash）一致、完整输入不变、两身份共享已原生冻结明细，单次完整body序列化、原生精确JSON长度1270564。窄查询1.024秒与旧仅primary的0.764秒不是等工作量速度对比，不宣称窄门加速。

生产改动仅kernel与graph：原生草丛结果固定非整数名root字段使用**同一canonical serializer、同一SHA256算法、同一完整内容**，逐字段共享序列化值、分别生成两个planId的原样身份；不更改generic crypto、签名算法或规则几何。两原生identity和精确长度仅存在模块私有WeakMap、完成observer，不进入公开batch结果。正常scalar没有额外身份请求时仍走原路。Graph只复用其自己生成的scalarFallbackPlanId完全匹配的native counterpart，旧缓存无counterpart继续原完整retag。容量证明复用native已得长度、只累计到实际MAX_STRING_LENGTH被严格超过；所有659对在此前已完整计算，不是截断模型、查询或状态。

7859唯一修后**仍失败的原C96**完整验收17:42:07Z终态exit0：query **47.699秒**、ENTIRE原响应与signed state/binding/LegalSpace/observation一致；responseHash仍`5c85e4ca95e5b35bc7c9170e55b96d943a551ea4d12fd86d94e12d2351d1e1a8`。659requested/completed/recovered及precomputedScalarIdentityReuseCount，0failed/0scalarFallback/0scalarIdentityRetag。实际容量下界538032073>536870888，不再为计数遍历整个780MB树。原4主体/10目标/40关系/1804地形不减。输出 `real-performance-special-los-identity-serialization-reuse-v1/`，0Provider/0原房写/¥0；coldsetup61.396、restore4.105、context45.400秒独立记录，跨负载不做无偏AB或稳定百分比声明。

选定23个独立历史查询案例现在**23/23准出**，包括B3由完整原生图证明过的summary纠错，而非错误旧摘要原样保存；不是完全相同源epoch/负载的受控速度实验。最新关键查询：C火力15.546秒、资产47.114秒、队形中位46.090/极长52.206秒、关系图极长47.699秒。其它已绿门不重跑。**完整Agent行动（模型与多轮查询、Preview/Apply/Replay、Web）仍未证明一分钟**；下一具体交付为正式Room操作链分段、当前人机/AA同链路完整行动延迟，再新受控对局。旧A39/B162/C128、历史费用和20图/精确2000/完整对照目标保持，终局仍0/3。

本轮最终diff：special kernel共享原生identity序列化与私有长度；tactical graph native身份复用/计数；既有real-request runner定点验收；一个只复现本bug的回归；CURRENT_WORK/rootTASKS/PROJECT_MEMORY/本记录。Room adapter先前接口未再修改；没有Prompt/Skill/UI/策略/采样/权威变化，没有网络、安装、代理/K3、全量、清理或提交。遵循diagnose与harness skill，以实际失败CPU和完整原生结果证明源头改动；训练仍false，无新截图或策略决策。完整结果/ownership/拒绝语义漂移则不集成，整行动目标仍开放。

## 17:18Z：B三摘要证明完成；22通过、关系图68.881秒仍性能失败

76101已终态exit0，三条B图证明完成，最后17:10:48Z。直接通过正式Runtime获取原query binding，原compiler生成独立graph头；完整native graphHash分别等于原短118 `7925c82d...`、中位104 `32d6fcbb...`、极长113 `efd2fcc6...`，不是手抄ActionSpace身份。由完整原生图独立推得summary后，所有其它字段包括完整attackEstimates/failures保持，ENTIRE已存新response只等于这个证明过的纠错版本及其派生身份。概率不重跑，旧付费/签名回执不重写。证据 `real-performance-B-native-graph-summary-bound-v2/` 保存全图、真实委派请求和分开分析谱系；原查询耗时短4.875/中位1.639/极长48.315秒均<60。51097旧诊断的3失败永久保留，不当成Provider/规则数学异常，也未放宽hash约束。

80243只读实际60.259秒结果的性能RED/exit1，0查询重跑。特殊地形kernel新增精确平台容量预判：仅本模块原生已封装且冻结的JSON结果可用；逐项JSON长度之和只作为results数组下界，JSON对象键排序不改变长度。下界超过实际Node `MAX_STRING_LENGTH`才提前抛同一RangeError/Invalid string length、交给已验证的同次完成恢复；未证明超过仍原完整seal，不改任何hash算法、结果/失败或几何，不用任意文本上限，不删模型对。原生结果的私有WeakSet只证明数据由本模块生成，不能替代任何规则/来源核验，外部同内容或重建对象不凭hash获得这个身份。

81670本修改唯一原C96验证17:16:07Z终态exit0，但case **not_accepted**：完整原response/signed state/binding/LegalSpace/observation、659 requested/completed/recovered、0failures/0scalar重复均通过；`aggregateLowerBoundChars=780978491`大于运行时容量536870888、原必失败巨型seal已跳过。**query68.881秒仍FAIL60**；不把进程exit0或功能assert通过当性能通过。完整artifact/progress在 `real-performance-special-los-capacity-preflight-v1/`，旧60.259秒也未取整通过。coldsetup47.284、restore4.121、context46.484秒独立留证；跨轮负载不受控，不能判额外8.622秒全部来自改动或全部来自负载。未新测其细分耗时，先停重复性能调用、分析剩余native/result身份序列化；无新代码不重跑同命令。

最新23独立案例 **22查询通过、1关系图性能未通过**，其中B3为全图独立证明后的摘要纠错准出，并非原错误摘要原样保留。查询仍不等于完整Agent行动；下一交付是剩关系图开销定位/处理、同常驻正式人机/AA全行动时延，然后新受控对局。原A39/B162/C128停点未改，原Host未热载、原房未重初始化；官方冻结地图/精确2000/完整对照目标不缩，整局仍0/3。

最终diff范围（本轮）：special kernel原生完成通知及容量处理；tactical graph同次完成恢复、原scalar身份/标签保持；Room adapter私有diagnostic；原query runner定点恢复/性能assert和B真实绑定证明；CURRENT_WORK/本记录/rootTASKS/PROJECT_MEMORY。旧文件中的先前combat/payment/asset改动未重跑。0Provider/0原房写/¥0/网络/代理/K3/安装/全量/提交/清理，Prompt/Skill/UI/采样/策略未变。依据diagnose与agentic-harness-evolution-loop从实际失败trace改源头；训练仍false，完整结果漂移则拒绝集成，性能不足仍留开放门。

## 17:08Z：关系图659对完成结果恢复通过，60.259秒仍不准出

44659原C96 CPU观测终态exit0，query **311.351秒**、完整原responseHash `5c85e4ca...`保持。原4主体/10目标/40关系、1804地形、659模型对不减。native batch已计算各模型对，随后aggregate seal抛出 `Invalid string length`；graph catch丢完成结果，再执行659次scalar。CPU初次batch26.391秒、其后scalar certify244.141秒inclusive，包含上下层时间不相加。完整失败在 `real-performance-graph-C96-cpu-observation-v1/`。

67995具体RED/exit1仅读实际trace和CPU，无规则重跑：capacity失败后scalarFallbackCount659而要求0。交付 `special-los-capacity-completion-red.private.json`。源头修复：kernel在aggregate seal前报告真正完成且冻结的native pair结果；graph只持有同次局部map，仅对RangeError/Invalid string length恢复，未完成仍原生fallback、失败仍unknown。保留旧scalar planId、完整resultHash和adapter标签，评估数据不删、不跨state缓存、不接受caller prepared、不改通用crypto；私有diagnostic不进入模型回执。

70375唯一修后原C96于17:04:47Z终态exit0：**659 requested/completed/recovered、0failed、0scalar重复，ENTIRE原响应/state/binding/LegalSpace/observation相同**，responseHash `5c85e4ca95e5b35bc7c9170e55b96d943a551ea4d12fd86d94e12d2351d1e1a8`；query **60.259秒**仍FAIL60，不取整为通过。输出 `real-performance-special-los-capacity-recovery-v1/`；coldsetup42.466、restore2.768、context36.332秒独立记录。不同负载不作无偏AB，不能据此声称完整Agent行动一分钟。旧绿不重跑。

B51097三条not_accepted保留：诊断手抄的是action-space restore authority（含spatialActionSpaceHash），不是native query binding（gameId/visibilityScope）。仅脚本修正：真实SpatialActionQueryRuntime委派取得binding、原生compiler生成唯一graph head，完整图在assert前保存。76101于17:07:49Z启动三条native图证明，`real-performance-B-native-graph-summary-bound-v2/`；不重跑火力概率、不重签旧回执、不削弱完整hash一致性。尚无结论，B三摘要仍OPEN；活着期间不混改生产source，超时只轮询同句柄。

本轮diff：special kernel完成回调、tactical graph同次capacity恢复、Room adapter私有诊断、既有原请求runner恢复断言与B诊断来源修正、CURRENT_WORK/rootTASKS/PROJECT_MEMORY/本记录。0Provider/0原房写/¥0/网络/代理/K3/全量/提交/删除；不动Prompt/Skill、几何数学、候选和样本。最新仍19通过/1性能失败/3摘要待证明，Ticket/Slice及完整20图/2000/同房比较目标不变。harnessLoopUsed=true，targetGames=StarCraft TMG，harnessToolsCalled=实际原只读relationship query，uiTraceEvidence=无新UI动作，agentDecisionEvidence=完整原回执，memoryTraceEvidence=未变，trainingTraceCandidates=0；完整结果/隔离/拒绝语义变化则不集成。

## 16:38Z 最新准出状态：19通过、1超时、3摘要待对账

39725两条本次直接受支付source复用影响的原请求已顺序完成、进程终态exit0：

| 原请求 | 上轮秒 | 最新秒 | 完整范围与结果 |
| --- | ---: | ---: | --- |
| C69资产 | 123.617（CPU观测116.662） | **47.114** | ENTIRE原response/state/binding/LegalSpace/observation相同；143尝试/143native实例化/96候选池/8选项/47原出界拒绝，不减候选 |
| C127队形 | 120.397→上下文修后79.909 | **46.090** | ENTIRE原response/state/binding/LegalSpace/observation相同；四完整选项/原候选和216样本不减 |

两条query首次准出后不重跑；完整artifact及sourcehash见 `real-performance-payment-source-reuse-v1/`。原stateHash分别`a897b661...`、`696b6727...`，完整responseHash分别`54b83974...`、`e8f34769...`未变。跨轮负载不受控，不把全部下降称本修复的无偏加速百分比。冷setup52.108秒、各原signed-history restore50.717/38.719秒和context3.847/2.516秒独立留证；这些查询恢复工具成本不是实际常驻产品每动作成本，也不能在整行动目标中忽略真实业务读/写/模型成本。

23个独立原输入最新为 **19完整一致且query<60、1完整一致但超时（C96关系图467.946秒）、3B火力摘要待对账**；全23已执行，但不是全部验收。上述17/3/3是16:17Z历史停点，不代表最新状态。仍不能认证完整Agent行动一分钟，尚不开新综合对局/不关闭S248。B原生攻击和失败完整相同、graphhash原样；尚无独立旧图证明摘要差异，不能把这3条算通过。

44659于16:38:29Z启动唯一剩余失败C96的私有CPU观测，输出 `real-performance-graph-C96-cpu-observation-v1/`；原4主体/10目标/40关系及全模型几何不减。沿原签名恢复，普通runtime不启用Profiler，功能已绿assert不重复，保存旧/新完整hash与输入。待判别来源核验、model-pair LOS、复制/密集result sealing，尚未得到结果，不提前归因或承诺拆分成效。只轮询同句柄，不超时重启、不混改其仍可导入的生产source。

本轮最终diff范围：三个生产文件（combat普通probability的私有context转交；asset只读owned snapshot；payment source首次完整核验后的深不可变复用）、既有具体概率bug模式、一个针对实际支付CPU缺陷的回归、既有原请求runner私有CPU观测/新增sourcehash、CURRENT_WORK/rootTASKS/PROJECT_MEMORY/本记录。没有Prompt/Skill/UI/Rules数学/候选预算或采样变更；0Provider/0原房写/¥0/代理/K3/网络/安装/全量/提交/删除。harnessLoopUsed=true，targetGames=StarCraft TMG，promptPackRoutes=selfplay_agent_prompt未改，uiTraceEvidence=无新截图/动作，agentDecisionEvidence=完整原query回执，memoryTraceEvidence=未改，trainingTraceCandidates=0。若任何完整结果/输入隔离或拒绝语义变化则撤回对应复用，不缩策略材料。

## 16:17Z：23个原输入均已执行，仍有三个性能失败

88347 已终态 exit0，不再运行。其 C12/A3/B3 未测输入全部产生结果；结合此前五条，共 **23/23 有结果**，不是全部通过。17条完整响应一致且查询低于60秒，3条完整一致但性能失败，3条B火力摘要差异尚未完成历史事实对账。所有原始失败保留；不把进程exit0、已启动或摘要差异排除后的小范围比较当作整体验收。

| 案例 | 最新实际查询秒 | 当前结论 |
| --- | ---: | --- |
| C 参数实例化短64 / 中位98 / 极长114 | 0.019 / 3.431 / 8.169 | 完整响应一致，query<60 |
| C 关系图短97 / 中位106 / 极长96 | 0.477 / 2.223 / **467.946** | 极长性能失败，完整响应一致 |
| C 队形短65 / 中位127 / 极长71 | 5.026 / **120.397** / 52.206 | 中位性能失败，完整响应一致 |
| A 资产放置短6 / 中位7 / 极长8 | 11.189 / 43.394 / 41.161 | 完整响应一致，query<60 |
| C 指定动作威胁短103 / 中位114 / 极长114 | 2.491 / 9.800 / 7.130 | 完整响应一致，query<60 |
| C 攻击概率短103 / 中位108 / 极长108 | 11.479 / 19.602 / 18.536 | 完整响应一致，query<60 |
| B 火力短118 / 中位104 / 极长113 | 4.875 / 1.639 / 48.315 | query<60；三条完整摘要差异待对账 |
| C 额外资产压力69 | **123.617** | 性能失败，完整响应一致 |
| C 额外火力压力114 | 15.546 | 与已证明纠错的完整响应一致，query<60 |

目录 `real-performance-untouched-per-type-v1/{C,A,B}` 保留18条完整旧/新回执和逐条进度；其余五条留在此前对应目录。不因本表汇总重跑数学或通过门。不同轮次机器负载未控制，仍不是无偏AB或整行动一分钟证据。B短/中位原本零攻击估计，不能替代非零概率性能。

B三个差异已完整定位到摘要计数/classes及派生hash：原生attackEstimates、attackEstimateFailures和原关系图hash全部相同。25496只读原Paid库寻找同hash完整关系图，三条均未找到，**不能声称已由旧独立图证明新摘要正确**。记录 `B-native-graph-summary-proof.private.json` 保留这个缺口，不改旧回执，不制造通过。后续可从同签名原态获取原生完整图并绑定原graphHash，而不重跑已绿概率。

### 概率普通批入口的重复上下文实修

已绿的火力Worker入口复用preview context，但队形比较所用的普通 `createStarcraftTmgAttackProbabilityBatchV1.estimate` 仍调用重新构建geometry的普通chance resolver。24201具体RED/exit1：同保存C82/1804地形/6存活Raptor、原36样本/7伤亡例完整结果一致，却构建1次/复用0次；新增 `chance_context_reuse` 模式只验证此bug，不重复原已绿copy门。源码修复仅combat batch：每次estimate通过原生 `previewWork`取得自己的完整校验context，再交给既有native work resolver；私有局部关联、不接受caller prepared、不跨调用或revision缓存、公开chance/Apply保持原路。

24901唯一GREEN/exit0：重复构建1→0、复用0→1，ENTIRE原概率/伤亡/后果/hash、输入/source保持，36样本/7例未减。窄观测5.640→5.209秒不是全部120秒来源，也不是无偏性能结论。25845于16:18:13Z启动唯一受影响的**失败原r127**完整重放，目录 `real-performance-formation-ordinary-context-reuse-v1/`；尚未收到query结果，不先称修好。不重跑已通过r71、其它概率门、全量构建或旧房间。

25845随后于16:20:44Z终态exit0：实际原r127 **79.909秒**，完整原响应、signed state/binding/LegalSpace/observation身份均相同；responseHash `e8f34769c7c487414253f4202c23140851cfa771da8f3b7546f44e28617daa3a`。四次Rules实例化合计约2.1秒，四份comparison仍并行；stationary-fire为74.7–77.1秒、graph为4.8–5.0秒。候选/四选项/216样本未削减。它仍FAIL60，不能把120→79.9跨负载观测全归于本次上下文复用，或声称整个行动一分钟。此前启动时未知的历史陈述仅作时序记录。

29629于16:22:06Z启动原C69资产的私有 `query_cpu_observation`，沿原签名恢复/同Runtime+Adapter+Rules、完整原请求；尚无profile/query最终结果。只启用该失败性能样本的CPU观测，不重新运行其已绿功能assert，保留新/旧整个responseHash和未变输入。普通入口不启用Profiler。当前排名假设为143次native实例化重复准备、96候选战术指标、复制/hash；未拿到CPU前不把123秒归因或删候选。脚本新增可选择的私有诊断模式和资产/图/kernel源hash留证，不进入模型回执或改变策略。

### 16:32Z：资产CPU定位到重复支付来源核验，源头复用门收敛

29629于16:25:33Z终态exit0，原query CPU观测116.662秒、完整响应hash与旧原始`54b83974...`一致。Profiler原文件和`cpu-hotspots.private.json`保存；累计样本wall118.857秒包括约2.2秒Profiler.stop，不能混入query116.662。调用层inclusive时间不能相加：资产search114.198秒、native实例化114.131秒，其中battlefield enumerate81.184秒；hash101.668秒跨枚举和计划，是上层inclusive而非独立新增成本。战术Placement仅19ms、canonicalParameters11ms。CPU self最大为canonical JSON39.9秒/规范化31.8秒/crypto update20.2秒。来源具体是支付组合枚举多次`getOfficialCardBuildPaymentProfileV1`/resourcePayment复验同37张资料，成功方案另对完整state封计划。

具体回归`verify-ticket-23-immutable-payment-source-reuse-v1.mjs`用同保存C82完整官方37卡bundle，不造小资料，代理原生crypto.createHash只计数、每次仍执行原生函数。36225有效RED/exit1：首次41次完整hash、后续三次profile读取又123次完整hash，ENTIRE profiles相同。source-data verifier现在仅在**第一次完整原核验成功后**，对每层frozen、纯数据属性、普通JSON对象/数组且非Proxy的完整树记私有WeakSet；mutable/shallow-frozen/accessor/Proxy不记忆、照常逐次核验。不同对象、同hash变体仍完整核验，不接受prepared参数，不缓存可变状态，不改变规则源版本。

37340首次修后门仍失败，实际是新增predicate误排除合法null，因此缓存没有启用；记录保留。仅修这个明确null错误后，38932唯一该修改GREEN/exit0：首次41完整hash仍在，后续三读取123→0；ENTIRE原profiles相同，mutable和shallow-frozen先通过后篡改仍拒绝，accessor换值拒绝，Proxy两次仍调用原验证，缺profile仍拒绝，原资料/caller不被修改或冻结。三轮已收敛，不重复此绿门，也不把修后失败当已通过。

资产search同时只为这一次只读连续查询复制并冻结完整state一次；所有143规则候选使用同一个自有快照，仍每次完整参数/底盘/距离/支付校验和同计划内容，模型/地形/候选池/排序全部保留，caller mutable Room不被freeze。这让生产Store解码出的可变state也能在该查询内部复用已验证不可变来源，而非只改善历史回放的frozen对象。普通公开源校验对可变输入仍原样；不修改crypto公共算法。

39725于16:33:18Z启动**仅两条本次直接影响且仍性能失败的原请求**：C69资产、C127队形，`real-performance-payment-source-reuse-v1/`。资产native实例化的支付枚举和队形probability batch的冻结射击准备均消费这个37卡源，故属于本修复影响范围；此前passedA/r71/概率/全量门不重跑。启动时尚无结果，不预报已低于60秒。当前所有目标/Ticket/Slice计数保持，0Provider/0原房写/¥0/提交/代理/K3；Bench活着期间不混改生产源。

本段0Provider/0原房写/¥0/网络/代理/K3/提交，公开策略材料和Prompt/Skill未变。S248仍开放；接下来原r127结果、资产阶段、极长关系图来源，然后完整人机同链路行动时延。20图、合法精确2000及完整同房对照目标保持。

## 15:34Z：队形瓶颈实测，重复高地视线准备 85→1

原 r71 的 162.370 秒不是成千上万候选耗时：12 生成、4 检查、4 原生实例化、4 完整比较。55494 独立阶段观测得到 108.180 秒；四次实例化 996/973/986/945ms 合计约 3.9 秒，比较确实并行，stationary-fire 阶段每份 81–91 秒。65125 私有 CPU 观测得到 120.753 秒，四线程实际 CPU 分别约 68.2/68.9/69.1/88.3 秒，不能归因于网络等待。完整响应 hash 都与原 r71 一致；这两次是新增缺失阶段的诊断，不是重跑已通过的功能门。

CPU 路径确认 `candidateGeometry → verifyPairs → verifyOfficialElevatedLineOfSightBatchInputsV1 → prepareElevatedLineOfSightBatch` 是重复准备来源。一个队形的完整 probability batch 准备约 48.5–53.6 秒，其中高地输入核验约 28.2–28.7 秒。包含父子调用的 inclusive 时间不能相加，各线程时间也不能相加当墙钟。

新增具体 bug 回归 `scripts/verify-ticket-23-ranged-elevation-preparation-reuse-v1.mjs`：保存的 C82 全部 17 个 Unit、1804 地形和实际位置，局部 hypothetical 只按队形比较同一规则让 player1 的 Assault 可用，不改变几何或削减目标。81193 有效 RED/exit1：完整枚举成功，有 6 个启用 domain，但同一次原生枚举复制高地地图快照 85 次，41.615 秒。baseline 和失败报告完整保留。

源头修复仅涉及两个生产文件：高地 kernel 新增自有批处理操作，私有复制并验证完整地图/来源一次；ranged 同次枚举持有这个操作。每次查询仍复制查询对象，走原生模型、支撑和普通几何验证；只在同一个不可变私有地图中按原 participant/support 分组复用几何投影。不接受外部 prepared context，不跨 Room/revision 缓存，不改变公开 scalar/batch 的规则结果。概率采样、所有模型/目标/候选、Rule authority、Prompt 和 Skill 都未削减或改变。

83185 是唯一修后对应门，exit0：85→1、41.615→25.011 秒，完整原生枚举（包括所有禁用原因与哈希）deepEqual；完整一对模型的原高地视线结果/核验相同、同 ID 错误支撑仍拒绝、空查询拒绝、调用方未冻结/修改、调用方后来修改地图不改变已持有的私有快照。0 Provider、0 原房写、¥0，窄计时不是无偏 AB 或完整行动准出。已通过的对应门不再跑。

84069 于 15:34:10Z 启动唯一修后原 r71 完整请求验证，15:36:32Z 完成/exit0，目录 `real-performance-formation-elevation-reuse-v1/`。原签名历史到内存恢复，ENTIRE 原响应及完整 state/binding/LegalSpace/observation 身份均相同，responseHash 仍为 `a4d3709f8a49b8ed86d9ee5fb4d6bf0d4b342abfb5f33a7ea3a292654304897b`。实际 query **52.206 秒**、首次 underOneMinute=true；coldsetup38.966/restore31.069/context1.341秒独立保留。新比较中各 stationary-fire34.7–43.9秒，四次实例化约2.3秒，原12候选/4原生实例化/4完整216采样比较不变。前几观测负载不受控，不声明无偏加速百分比，更不能把 query52秒称完整Agent行动一分钟。原 Room、DB和旧回执无修改，新模型调用/费用仍0。通过的原响应门不再执行。

88347 于 15:38:39Z 开始顺序执行尚未测的18个真实输入：C12个、A3个资产、B3个火力，生成的only-untouched manifest逐条保留原输入/签名恢复要求，仅排除已测的5个输入。每个只跑一次，七类型不混成全局中位；工作目录 `real-performance-untouched-per-type-v1/{C,A,B}/`，观察同一个句柄/日志，不因超时重启。该进程尚未收尾，不能称18条通过；来源B短/中位fire原本0个实际攻击估计、极长5个，0攻击只是该真实状态下的可用性/关系图计算，不代表非零攻击概率计算的性能。任何old-summary差异仍须对完整已存原生事实解释，不能仅为绿色而接受漂移。23个选定独立输入完成计数由各progress记录统计，不因同一个r71反复诊断虚增。

本轮 diff：两生产文件、一个具体 bug 回归、原 replay 脚本记录新 kernel 的源 hash；前轮私有阶段/CPU诊断留作非模型观测，未启用普通请求 CPU profiler。剩余仍是分类型案例、完整同链路行动时延、正式受控对局、S272 写表/地图计划、S249 复盘、S250 报告，不能以本地枚举门关闭 S248 或缩小 20 地图/完整对照/精确 2000 分目标。

### 15:42Z 未测案例新增三条完整原响应通过

88347 同一句柄已完成 C 的参数实例化中位98（3.431秒）、指定动作威胁短103（2.491秒）、队形短65（5.026秒）。三条都完整原响应/authority/input parity，query低于60秒；这是未测输入首次执行，不是旧绿重跑。当前23独立输入8有记录/15尚无最终结果；进程仍活着，下一正在执行原攻击概率短103。总目标与T23/T27/Slice计数不因微基准增加；训练、正式新对局和整行动时延仍未验收。后续以各arm progress日志为准，不将启动或保存manifest算完成。

随后同句柄原攻击概率短103也完成：11.479秒、ENTIRE原响应/authority/input parity、query低于60。当前选定输入**9/23有结果、14待完成**；88347进程仍非终态，生产源不要在Worker仍会导入时改动。这四个新增结果并非原r71或旧绿的重复执行；总目标和正式完整行动准出保持未完成。

## 用户要求与准出顺序

不重建原房间，先用旧的真实慢请求观察新源码效果。每种类型分别取短、中位、极长，不能用全局中位数代表所有类型。所有类型评估通过再启动新对局综合验证；不通过则继续定位来源。已通过的单测不重跑，原样本、候选、上下文和策略材料不削减。

## 案例来源与完整性

源为原C正式2000分房间 `official-standard1-C-no-opening-plan-20261008-v2`。读取原生 `bot-stage-timings.ndjson`，两席原 `live-decisions.sqlite` 的完整回执与已付费安全返回中的原始工具参数。Host自动队形、资产放置、最终参数实例化的请求仅按已存Planner/最终proposal及原Host配方恢复，不能猜测。

每个输入必须从原初态、原签名checkpoint和必要的原签名receipt恢复，恢复后的完整stateHash、matchBindingHash、LegalSpaceHash、spatialObservationHash都与旧记录一致，才进入计时。不得移动模型、缩小战场或移除原1804条地形。原数据库readOnly；内存SQLite只用于导入原记录，不createRoom、不开新模型、不写原房间。

整条生产共享 `SpatialActionQueryRuntime → RoomBackedAdapter → native Rules/geometry/probability/formation` 执行一次，完整响应与完整旧回执deepEqual；并检查输入未变。各案例新建查询缓存，防止同一快照命中掩盖真实计算成本。冷启动、历史恢复、上下文构建和实际query分别计时，不能把重放工具初始化算进旧backend比较，也不能把backend改善当作完整行动一分钟通过。

原记录只有回执hash不能独立还原多条不同参数的对应关系时，标为歧义而不是随便选一个。`ok:true/status:unknown`是类型化返回，不是成功概率计算；不会把这种0.2秒短路作为正常攻击概率的短/中位代表。完整历史总体分布和排除数仍保留。

## 当前C案例覆盖

| 类型 | 全部历史数 | 完整可恢复且成功数 | 短/中位/极长旧耗时（秒） |
| --- | ---: | ---: | --- |
| 关系图 | 104 | 86 | 0.300 / 3.146 / 391.827 |
| 参数动作实例化 | 36 | 36 | 0.189 / 3.592 / 50.363 |
| 队形求解 | 20 | 20 | 9.997 / 312.167 / 5203.577 |
| 资产放置 | 5 | 1 | 109.971（仅一个成功且可严格恢复案例） |
| 指定动作威胁 | 24 | 9 | 6.281 / 29.081 / 37.716 |
| 攻击概率 | 17 | 3 | 14.748 / 34.239 / 35.512 |
| 火力交换 | 1 | 1 | 282.262（仅一个历史案例） |

共207条历史query观察、156条成功且参数可严格恢复记录，选出17个独立真实输入覆盖七类型。这里的中位数是各类型可完整恢复的成功子集下中位数；完整总体中位数另在manifest保存，不能混淆。关系图总体中位2.556秒，指定威胁总体1.109秒、概率总体1.014秒包含unknown；后二者unknown为15/14条。资产放置三unknown、一参数歧义，仅一个成功案例；火力交换天然只有一个，三标签合并不制造三次测量。仍需寻找原A/B补充独立样本，不能将覆盖缺口当作通过。

源案例清单：`build/ticket-23-three-arm-official-standard1-20261008-v1/real-per-type-performance-cases.private.json`。最初两轮覆盖发现也保存，最后一轮纠正了`ok:true/unknown`统计；这属于案例采集修正，不是重跑已通过生产门。采集三次已收敛，后续不在相同C数据上反复采集。

## 执行与结果

原revision114、原282.262秒的火力交换由55172完成，同一请求保持Marine1、五个真实敌方目标及所有当前动作domains。实际query98.974秒，仍不合格。原完整输入、state/binding/LegalSpace/observation身份相同；完整响应有18条差异，不能称旧回执完全一致。

差异来源是旧火力摘要未正确识别原生`unit_spatial_relationship`边：把原图已有的己方原地射击profile计数10、己方移动后攻击13、敌方移动后攻击1读为0，classes读为空。原同revision已付费保存的独立关系图五条Marine1边可逐条核对出10/13/1，因此新摘要正确，旧摘要漏读；这是工程提取问题，不是模型幻觉。计数是profile-target关系，不是模型数、命中数或伤亡。完整所有attackEstimates/概率/伤亡/failures以及原火力graphHash均相同；estimateHash/queryReceiptHash随正确摘要变化是派生结果，不覆盖或重签历史回执。证据为`real-r114-fire-summary-difference-analysis.json`。

随后只修私有冻结preview batch的重复context计算：完整native枚举已算过的context由同批次preview复用；公开domain/参数/PointDefense校验不省，外部不能注入prepared事实。80381是本次修改唯一原请求验证，13:29:26Z完成，6构建/6复用/6完整攻击任务，完整响应与上述修正后98.974秒参考deepEqual，输入未变。旧历史回执仍独立保留。

| 观测 | 实际query秒 | 准备秒 | 最长graph秒 | 结论 |
| --- | ---: | ---: | ---: | --- |
| 55172、本次context修复前 | 98.974 | 50.925 | 45.143 | 原摘要纠错差异，性能失败 |
| 80381、context复用后 | 75.877 | 28.302 | 45.111 | 修后完整响应一致，性能仍失败 |

上表各阶段有重叠，六攻击任务与graph共用最多4Worker，不能把所有Worker时间相加。历史/两观测负载未控制，不报告无偏加速百分比。80381另有coldsetup76.116秒、历史restore29.412秒、context构建31.749秒；它们不混入旧backend比较，但也不能从完整产品时延目标中忽略。75.9秒只是一个查询，仍不是完整Agent行动一分钟通过。

旧源剩余案例进程64834完成了实例化短18.902ms、关系图短477.105ms、关系图中位2223.164ms三个完整parity案例；其中关系图短比历史300ms慢177ms，保留退化观察而非假称全面加速。它在median实例化98恢复期间于13:21:50Z仅对自身SIGTERM终止，避免修改源码时新旧混用，未动原Host或Paid。17个独立C案例现有4个记录、13未完成；新context验证是已失败同一输入修后验证，不虚增案例数。旧绿不重跑，unfinished98可在后续新源恢复；资产/fire的独立档位仍缺。

最新源码明确：graph任务本不依赖射击preview，但当前pool先同步完成整个work planning才启动任何Worker。下一可拆分设计为独立graph提前启动；共享快照的规则/几何准备保留一次，合法preview按单位-武器-目标分组；graph按单位对/模型对LOS/任务点/每单位clearance拆分，保留全局engagement证明和稳定汇总/hash。这只是设计，尚未实施或认证；45.1秒内部各子项未分别计时，不能把它全归因于某一个子项，不承诺拆分后必然60秒。不得对子任务各跑完整graph再相加，也不得套多层线程池。

### 13:46Z 独立graph提前派发已实施，结果通过但速度仍失败

94587从上面原实际75.877秒完整分项证据复现，exit1：准备28.302秒，graph在准备结束后1798ms才开始，具体错误`INDEPENDENT_RELATIONSHIP_GRAPH_BLOCKED_BY_RANGED_PREPARATION`。不重算已绿原query，不编造新场景。

三个生产文件改动：combat work compiler先把原同一个graph job发送内部回调，再做原native preview；Room Adapter只把私有调度回调透传；Worker pool给该head固定唯一索引并立即postMessage到同一最多4池，后续追加原攻击jobs，最后按原plan索引汇总。父线程同步CPU计算期间不能等待它处理online事件，否则仍被屏障阻塞。Worker空队列只有planningComplete之后才退场，已有结果保留、仅缺失transport结果本地恢复，最后Room authority freshness不变。没有公开prepared信任或额外Worker层；普通query与旧不使用回调的compiler保持原路径。

96307是这次修改唯一原r114修后验证，13:46:06Z完成：准备32.202秒，graph39.984秒且开始时间早于准备完成30.020秒，真实重叠成立。原完整6攻击jobs/6context构建及复用、ENTIRE响应/全部概率/伤亡/geometry/hash与75.877秒参考deepEqual。实际query70.769秒，仍未通过60秒；这不是完整模型行动。Graph结束后仍有攻击波次，实际六attack kernels17.235/17.116/17.280/17.705/19.135/16.810秒，与graph共同占用4线程，最后一波成为critical path。不能把30秒重叠说成总时延降30秒或承诺无偏AB收益。Coldsetup84.951秒、restore56.308秒、context29.775秒独立保留。0Provider/0原房write/¥0，刚通过的门不重复。

原完整响应artifact：`real-performance-preparation-overlap-v1/real-performance-fire_zone_exchange-short-114.private.json`，RED/GREEN launch日志均在共用three-arm目录。公开理由、Plan、Skill、骰子与训练标记没有改变。本轮只消除graph/preview的无谓依赖；graph内部单位对并行与preview内部拆分没有假称已完成。

### 真实独立档位已找到，尚待执行

A2336与B3835各只读采集一次，均exit0。A112历史观察/41完整成功原输入，B232/184；模糊参数、unknown原样留在覆盖报告。资产使用A的三个原输入8.835/43.550/46.779秒，fire使用B的三个原输入2.560/3.312/412.221秒。B fire总体9条仅4可严格恢复，所选中位3.312秒是成功可恢复子集中位，不能称总体10.703秒；其它五条参数歧义不猜。

七类型现有21个独立短/中位/极长基准，另保留原C资产109.971与fire282.262两个压力样本，共23个选定输入；截至14:52Z为5有记录、18待完成，不把来源采集称性能通过。`real-per-type-performance-coverage-supplement.json`按原房来源列清单，A/B private manifest保留完整参数/旧回执。不同Room样本仍恢复自己的签名历史，不混成一个默认房间。

另只读B冻结初态5230证实9Terran+8Zerg及原Marauder配方。重放脚本使用`initialEnvelope.state.armyBuildingConfigurationBySide`和正式Web对planned recipe使用的unspent-lost policy；不重新选单位、生成Plan或用默认Raynor资料冒充B。后续仍需actual binding/LegalSpace/observation身份一致才计时。

7752实际原C极慢队形r71已于13:57:50Z完成/exit0，输出`real-performance-C-formation-extreme-v1/`。原5203.577秒→新162.370秒，ENTIRE旧响应与原state/binding/LegalSpace/observation身份均一致；生成12/检查4/原生实例化4/选项4/0失败。仍FAIL60，当前缺少内部阶段计时，不据此归因于大量候选或宣称队形已达标。用户的“其他项目”按隔离workspace仅指本Project D主线其余优化项，不触及Warmachine或其它项目。

### 14:52Z 概率线程重复context实修：单查询15.5秒，不是整体验收

用户质疑70.8秒是否完成优化；明确没有达到整体标准。源码证据表明父线程的完整native preview已计算context，但每个概率Worker的chance resolver再次计算同一geometry/engagement/loadout/机械计划。先给这一步加不进入模型回执的独立计时，不改变数学。

40597仅一次原r114诊断得到query16.594秒，ENTIRE结果与70.769秒参考相同，完整6攻击各重复构建context571/665/677/679/687/1550ms。第一次夹具把带workKind=fire_attack的6新diagnostic也计为6额外任务，导致12≠6，不能称该失败是生产RED。只将计数修为stage=query_worker_completed；42545从同一保存artifact取得有效RED/exit1：真实6完整任务、6重复context，错误`PREPARED_FIRE_ATTACK_RECONSTRUCTS_SAME_NATIVE_CHANCE_CONTEXT`。没有再次执行数学或旧绿门。两记录均保留，不删改失败。

生产实修只涉及native ranged/combat两文件：native私有owned preview batch新增previewWork，仍经完整domain/参数/PD校验再提取自己的成功context；work compiler将该完整context与原preview一同放入原私有job。Worker沿同一完整冻结快照、owned copies及exact action/context关联消费它，继续原始dice/Precision/casualty解析和全部后果。公开preview、普通chance resolution、Apply、查询参数均不接受prepared context；legacy内部job缺context仍原样重算，不制造结果。没有跨revision缓存、模型提示词、Skill、样本、目标、排序或规则变更。Worker/pool另外透传private diagnostic，原结果中不添加字段。

45029是唯一修后原r114验证，14:52:40Z完成/exit0：6parent contexts constructed/6preview reused/6完整攻击/0worker context reconstructed/6transferred native contexts。ENTIREresponse/所有概率伤亡及哈希与70.769秒参考deepEqual，原signed恢复身份及完整输入不变；responseHash仍`8243ae5e98ba977c393cb377375ab88661f6281d84e843e09d9ade96fc4bc5b1`。实际query15.546秒，coldsetup21.464/restore14.080/context8.650秒另记；0Provider/0原房写/¥0。完成的门不重跑。

不能把70.769→15.546的全部差异归因于本修复：只有增加计时、还没修重复时就已16.594秒，跨轮机器负载未控制且此前graph/preparation同时更慢。消除重复的计数与完整结果已证明；稳定全流程性能没有证明。这个单query低于60秒不是含模型/多轮查询/Preview/Apply/Replay的完整行动。162.370秒的队形案例仍不合格，剩余18独立输入继续按类型验证，不启动新综合对局或关S248。

证据：`real-performance-chance-context-red-v1/`、`real-performance-chance-context-reuse-v1/`和40597/42545/45029的launch/stdout/stderr。Diff：native ranged与combat的私有context转交/原resolver共享闭包；readonly Worker与pool私有计时透传；既有真实case runner增加针对本bug的计数门及完成事件过滤，本记录/CURRENT_WORK/rootTASKS/PROJECT_MEMORY。无新常规测试/全量/网络/安装/删除/代理/K3/提交或Host重载。harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=selfplay_agent_prompt未改；uiTraceEvidence=无新动作截图；agentDecisionEvidence=整原query响应；memoryTraceEvidence=未改；trainingTraceCandidates=0。若完整结果、样本/顺序、snapshot ownership改变则撤回本局部优化，不删除策略材料。T23 33/36、T27 5/6、余248/272/249/250四片、终局0/3保持。

`replay-ticket-23-real-performance-cases-v1.mjs` 每案例完成即保存完整旧/新回执和小进度NDJSON，重启只跳过已完成记录，不重跑已通过案例、不重新计费。失败记录不能以删除/覆盖换绿；来源错误先修来源，模型策略材料不变。

准出看完整结果、typed unknown/stale/privacy/输入所有权、各类型短请求退化和慢请求改善。旧耗时来自不同当时负载，只能称历史对照观测，不声称无偏AB百分比或稳定P50。当前源码整条行动是否≤60秒还需同链路综合验证。独立查询案例与完整行动是不同层，不能用17个窄query代替Preview/Apply/Replay和真实模型完整链路。

## 本轮diff与恢复

- 两个具体真实案例采集/重放脚本；本文件及S248记录更新。
- 原房间Host未关闭/热载；原初/现态、Paid、骰子、计划、记忆、截图和预算不变。
- 同轮之前正式checkpoint重复验证实修已GREEN，详见S248性能文档；不重复那条验证。
- diagnose与agentic-harness-evolution-loop用于要求真实来源、正式入口和完整响应证据，不引入代理/模型调用/全量验证；harnessLoopUsed=true、targetGames=StarCraft TMG、promptPackRoutes=selfplay_agent_prompt未改、trainingTruth=false。
- 新对局尚不启动；余S248性能与整局、S272表Plan、S249复盘、S250报告不减少。
