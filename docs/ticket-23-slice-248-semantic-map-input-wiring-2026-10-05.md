# T23 / S248：当前语义地图进入真实对局宿主（2026-10-05）

## 当前恢复与范围

截至2026-10-06：真实A-A宿主已载入Daybreak，并从同一SQLite跨进程恢复；入口地图准入红→绿、双席实际空间读数通过。宿主PID38407、`http://127.0.0.1:54359`仍运行，autoDrive=false；其它本轮启动/诊断进程已结束。没有执行新AI动作。

本轮是有效工程进展，不是完整新AI对局已经完成。T23 **33/36，余S248终局、S249复盘、S250总结三片**；T27 **5/6，余S272**；T24首图限定3/3，另外19图仍开放；三条完整链 **0/3**。本轮付费生成调用、tokens和估费均0；Provider启动仅进行了模型可用性GET，不是零网络。旧A/E账本与房间未重建、改图或清零。

地图来源只读[首图唯一检查点](../../ticket-24-semantic-map-integration/docs/ticket-24-playable-map-fast-pass-2026-10-05.md)。本集成工作树现在有同版语义地图能力；没有将20份旧资产数据自动批准为可用地图。

## 具体故障与修复

真实A-A宿主使用本树的Standard工厂，旧工厂根本没有semanticTerrain分支；驱动器只转发赛前军表参数，丢掉地图参数。正常CLI的具体红例记录在 `build/ticket-23-slice-248-semantic-map-input-wiring-v1/before/report.json`：旧9地形、0叠层、旧两层freeze、0地图参数转发；这不是模型策略问题。

已完成：

1. 从地图工作树集成已有语义binding、compiler、Room freeze、坡口准入/曲面支持，以及其静态20图数据依赖。26个此前缺失模块是已有实现搬入本对局树，不是26个新功能或地图通过。
2. Standard工厂及manifest接入同版semantic分支；保留本树原有blocksPlacement修复。同步语义地形所需完整标记底盘/精确可达审核。没有覆盖原冲锋v2–v5、连续性修复、Gap/Place判断和LOS缓存。
3. Web runner转发地图file/JSON参数；宿主支持 `--pregame-map-configuration-file=`，与JSON互斥。初次配置仍持久写入私有恢复文件；resume只用保存配置并拒绝外部地图覆盖。
4. Battlefield只增加已验收的叠层显示/镜像、不透明全板、密集地形低亮无标签展示；媒体解析只补Daybreak原有坡口精灵及已有地图资源查询。Tau原显示版本、Raynor/Goliath素材和其它UI改动保留，不整包覆盖。现有坡口PNG原样复制，无生图或重画。
5. 只新增一个复现上述具体bug的回归入口；先红后修，当前对应验证只跑一次。初次Node REPL跨realm复现停在face-up比较、没有认证地图故障；改用正常Node CLI得到权威红例，不为该环境问题改游戏代码。

## 已验证

`build/ticket-23-slice-248-semantic-map-input-wiring-v1/after/report.json` **passed=true**：

- 当前实际Standard初始authority验证通过，1377地形、3叠层；
- semanticBindingHash为 `0a29bb1fd517cdec4145fd50c0eec7f4c9ef97e826660023ac396b4ffa05fa68`；
- overlayHash为 `971101d16c07176679b5adb4ada9f1444e9d4f24688ed494ba455712622e750e`；
- file/JSON两个入口参数均由实际runner过滤函数保留；
- 使用冻结官方源dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`，无官方数据刷新；
- 不创建产品Room、无模型调用、不证明完整宿主启动/SQLite恢复/模型决策/终局。

初次红例的binding/overlay预期读在报告顶层、实际位于maps行；当前回归已显式选择seed对应行并断言非空，再投影既有ramp candidate routes合同。保留旧红报告，不把其缺失字段冒称已验证。

当前启动用地图配置为 `build/ticket-23-slice-248-semantic-map-input-wiring-v1/after/map-configuration.json`；pin原生源、10条保存路线、whole_base_area及canonical32mm物理策略。这是下一真实宿主启动的输入，不是另一个运行中Room。

## Web构建

直接修改了地图显示代码，故本次一次独立输出构建是必要验证：
`npm run export:web:local -- --output-dir ../../build/ticket-23-slice-248-semantic-map-web-v1/dist`。

状态：工具session64940已正常exit0；14静态路由导出，Web bundle178372ms（不是完整Agent耗时）。证据为`build/ticket-23-slice-248-semantic-map-web-v1/build-report.json`，成品目录`build/ticket-23-slice-248-semantic-map-web-v1/dist`，旧A/E的dist未覆盖。既有node-linker/NO_COLOR/Browserslist警告保留，不安装或联网更新。未重跑此构建、回归或旧地图/全局门。

本轮修改了server的文件读取/异步ternary以及runner的入口参数，工厂回归不导入这两个完整入口；因此各一次`node --check`是直接相关的补充，均exit0。只检查35个本批源码/静态输入的冲突标记、尾空格和换行，发现0。构建与语法不替代实际浏览器/机器席验证。

## 接下来具体交付

1. 用当前独立Web包和同版实际产品Room观察/截图验证新宿主的地图；不得把T24最小服务器截图冒称本宿主截图。
2. 当前机器席初始化、同房冻结配置恢复及共同空间工具只读输入已过；下一观察真实Planner首次工具/决策/Apply/Replay。只读工具通过不是模型已经理解或执行移动，旧A/E继续作为历史样本保留。
3. 同固定2000军表、双方身份、地图/任务/规则、可比随机条件，做无赛前plan/成表赛前plan两房完整对照，每房均从自身SQLite断点恢复。当前固定表新地图计划还未生成/来源审核，不能沿用Lost Temple旧计划。
4. T27的从头2000/2000军表+地图绑定计划稳定性随后验证；完整对局后才做复盘/反事实/Skill变化。

新房可显式选择已实现的Rules variant，选择持久保存；本新房实际descriptor已为v5。未指定的新房和旧恢复记录仍沿原缺省，恢复拒绝外部variant覆盖。这个选择不证明人机/机机完全等价；一分钟性能目标也尚未通过，无新增行动性能结论。

## 2026-10-06：真实宿主、驱动器及机器输入

恢复目录：`build/ticket-23-slice-248-standard-2000-aa-live-v1/daybreak-map-host-20261006-v1`。使用当前独立Web包、已保存地图file和显式`charge_round_path_v5`首次启动；首次PID29826正常SIGTERM/exit0后，PID38407只带resume-directory恢复，未覆盖地图/规则或重跑任何动作。实际双方2000/2000、15单位全部尚未进场，r0/R1/start_of_round。选中任务为`faction_cards:mission_hold_position`，部署卡为`faction_cards:2NdngLtIeZAprsWr25hM`；GAUNTLET是部署布局，不把它误写成任务名称。

同房、状态hash、match binding、地图manifest、Rules hash和r0全部一致。stateHash为`00201f1125c7fc1c2175e409848e8823503186a098b2fd5e77a1ea7ee3adbc28`，实际runtimeHash为`7e6503851f63d4cf6ab538df834012cc4a571a258505a244c10153b8264be3d6`；两席Flash Provider已open，0付费调用。私有凭证仍只在原恢复目录，不写入公开报告。

真实宿主暴露了第二个入口bug：驱动器写死Lost Temple，而fixture统计写死9个地形；保存实际宿主manifest执行原runner准入块，报`SLICE248_CERTIFIED_MAP_FREEZE_MISSING`。最小修复只改runner/map准入和fixture实际terrain.length，地图计数、seed、freeze与实验场景互相一致才通过。恢复后同一实际runner准入块一次绿，1377地形，不放松冻结任务/规则或改Prompt。首次截图等待连接文案60秒超时不是该地图准入红例，不混成已解决的浏览器问题。

机器输入证据：`build/ticket-23-slice-248-semantic-map-host-v1/machine-input-report.json`。从实际双席HTTP projection/LegalSpace和同一加密SQLite，使用与产品席相同的SpatialObservation、Room-backed Query Adapter、Spatial Runtime和同hash v5 Rules。两席均1377完整地形footprints、1377查询地形nodes、5任务点，返回`ok=true/status=advisory_estimate`及各自查询回执；绑定当前state/seat/freeze。尚未部署，所以0单位关系，不能冒称实际移动、攻击、模型决策或训练真值。检查脚本最初误写`board.frozenCompetitiveMap`，更正为已有`board.competitiveMap`；产品代码没为这个笔误改变。真实回执用`status`而非`precision`，最终报告由保存回执核对补全，没有再次调用查询。

当前仍缺新宿主的可视Web验收：现有截图脚本连接等待超时，未产截图；Cua内置浏览器不可用、浏览器清单为空。`browser-probe-incomplete.json`明确INCOMPLETE。不能据此宣布UI故障，也不能把T24最小宿主截图冒充本宿主截图。下一先恢复可用浏览器控制/查看真实页面，再同房推进无plan实验并留存逐动作截图；首图不再追加不可达装饰精修，其余19图不挡这条实验。

只修改三个源码文件：server增加新房variant选择/保存/拒绝恢复覆盖，runner转发选择并移除旧地图准入常量，fixture统计取实际地形。没有新测试文件、地图源/编译器/规则原子/Skill/Prompt更改；没有重跑已绿回归/Web构建。runner新增参数后一次语法检查通过；其后修改的准入块由实际manifest VM验证，server/fixture被真实启动/恢复加载。实验cell旧Lost Temple显示标签作为Medium追踪，不拦地图实验。Slice未收口、混合历史工作仍保留，不伪作原子提交。

`harnessLoopUsed=true; targetGames=[starcraft-tmg]; promptPackRoutes=[selfplay_agent_prompt]; harnessToolsCalled=[actual live host, current runtime selection, same SQLite resume, real runner admission block, player-scoped HTTP/LegalSpace, actual Room-backed spatial query]; uiTraceEvidence=incomplete; agentDecisionEvidence=null; memoryTraceEvidence=r0 stores retained; trainingTraceCandidates=[]; eligibleForTraining=false; rollbackOrDemotionRules=Room/map/Rules mismatch blocks continuation; userVisibleChecks=backend map and query evidence only`。

## 变更/风险边界

### 2026-10-06：Daybreak合理平衡的轻量核对已完成

同一r0冻结输入在地图树完成一次带作者坡口折线成本的共享路径诊断，19.695秒，10个席位/底盘的可达分母与原报告一致；本树和Room未改。32mm双方近己方点7/7.25寸、中立点18.75/19.5寸，双方均有敌方点路线。允许当前GAUNTLET/Hold Position组合继续诊断实验，不要求镜像对称；远端点/入场/实际军表大底盘限制列Medium，全面平衡及官方推荐布局符合性没有获批。完整结论只维护在[首图检查点](../../ticket-24-semantic-map-integration/docs/ticket-24-playable-map-fast-pass-2026-10-05.md#合理平衡的轻量核对最新结论2026-10-06)。

当前首图实验下一交付仍是本宿主的真实浏览器截图，不重建房间或重跑已绿输入；PID38407/r0/autoDrive=false、0新AI动作不变。内置浏览器不可用，使用已安装Playwright的询问尚未获答；本轮没有绕过该限制。T23 33/36、T27 5/6、完整图库0/20、完整链0/3均未增加。

### 2026-10-06：网页连接诊断，不是新AI动作

在同一PID38407/r0宿主进行一次实际HTTP客户端bootstrap；使用真实ClientDomain与HTTP transport、内存投影缓存，返回`ok=true/phase=ready`、1377地形，耗时3251ms。证据 `build/ticket-23-slice-248-semantic-map-host-v1/client-bootstrap-diagnosis.json`。网页文档及当前JS bundle读取200；Daybreak背景与坡口PNG各HTTP200（3,308,591和1,995,194bytes），见同目录 `web-resource-diagnosis.json`。没有重建Room、调用模型或重复已过的查询/构建。

这排除了本次实际HTTP客户端的投影拒绝及这两张原路径图片缺失，**没有排除浏览器挂载/路由/显示问题**；内存缓存也不证明浏览器AsyncStorage缓存验收。当前投影约4.13MB，接近既有4MiB传输上限，列为Medium性能/增长风险，不在没有具体失败时盲目放宽或删字段。客户端连接成功不是浏览器视觉通过，更不是动作一分钟性能通过。

内置Cua本次恢复接口说明后读取库存仍为apps0/browsers0；已询问用户是否允许使用项目已有Playwright继续本地截图，没有获答前不绕用其它UI技术。原房保持autoDrive=false、0新AI动作，以保留逐动作截图要求。地图本身已可用于选定GAUNTLET/Hold Position场景；新增四种Daybreak部署均未通过，限制只维护在T24首图检查点，不拦本选定场景、不将全图库批准数增加。

新余量清单见 `../../ticket-24-semantic-map-integration/build/ticket-24-playable-map-readiness-20261006/remaining-work.json`。本轮无源码改动或新测试；新执行只覆盖先前未验的四部署和实际客户端/资源诊断，旧绿门未重跑。生成调用/token/估费0；局部HTTP读取不是零网络。T23仍33/36、T27仍5/6、首图限定1/20、完整图库0/20、完整三链0/3。

本次共35个源码/静态输入文件：26个已有语义模块/数据新增，4个工厂/manifest/审核文件集成，runner/server两处，UI两处，一个具体bug回归；另复制1个原PNG。本片仍开放、既有树混有历史改动，尚未伪作原子提交。没有新代理/K3、网络、安装、删除、推送、Provider计费或旧Room动作。

`harnessLoopUsed=true; targetGames=[starcraft-tmg]; promptPackRoutes=[selfplay_agent_prompt,opponent_prompt]; harnessToolsCalled=[frozen source, real Standard factory, actual runner argument filter, existing semantic Room composition]; uiTraceEvidence=pending new host; agentDecisionEvidence=null; memoryTraceEvidence=old A/E retained unchanged; trainingTraceCandidates=[]; eligibleForTraining=false; rollbackOrDemotionRules=source/overlay mismatch or legacy9 fallback blocks current-map match startup`。

`ctx2skillLoopUsed=true; targetGames=[starcraft-tmg]; roleRoutes=[selfplay_agent]; skillsGenerated=[]; judgeTestsRun=[]; promotions=[]; crossTimeReplayResult=not run; remainingRuleGaps=no rule or strategy skill change this round`。
