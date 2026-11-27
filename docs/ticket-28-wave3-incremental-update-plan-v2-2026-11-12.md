# Ticket 28 — Wave 1 → Wave 3 增量升级方案 v2

2026-11-12实施补记。01已完成，当前1/16。核心PDF已核验与旧锁一致，官方写表器API为编军主源，PDF参考。实际结果见[01验收卡](development/wave3/evidence/T28-W3-01.md)，本页以下保留最初只读评估快照。

日期：2026-11-12。状态：调研与规划完成，实施 0/16。本文替代 2026-09-22 旧评估的增量数量与排期，不改变旧研究证据。

用户本轮授权的是查询、评估和方案；复盘等待充值，继续暂停。本轮没有更改生产冻结集、规则器、Skill、房间或数据库，没有调用模型、恢复对局、安装依赖、运行业务测试或删除历史材料。新增联网文件只存入独立研究目录，不是正式新版本。

实施入口已细化为[Wave3开发手册](development/wave3/README.md)，含16项步骤、真实代码索引、原子/工具接线门、恢复规范及[sol交接指令](development/wave3/SOL-HANDOFF.zh-CN.md)。本评估保留来源与工作量依据；逐项状态以 coordination/wave3/implementation-plan.json 为准，当前仍0/16。

## 1. 结论与边界

这是一次中等规模扩展，不能仅替换 JSON，也不需要从头重写对战平台。推荐保留现有权威规则内核、房间服务、共享工具、Web/App 与学习框架，做版本解耦、数据差分、新机制及三种对战入口的纵向接线。

当前生产基线为 U71/C69/R48 + FAQ v1.0。本次读取官方 Command Center 公共数据得到 U83/C84/R50；官方 Downloads 已列出三族 Wave 2、Wave 3 卡表，以及 2026-10-09 费用表。FAQ 已为 2026-11-11 v1.3。**数据版本号并不能覆盖 FAQ 的更新**，新发布清单必须分别记录单位、卡、核心规则和 FAQ 的来源版本。[官方资料入口](https://starcraft-tmg.com/downloads)；[费用表](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-Cost-Table-10.2026_EN.pdf)；[FAQ v1.3](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf)。

建议拆为 16 个独立可验收工作项 T28-W3-01～16，先完成不消耗模型的工程项，最后在额度恢复后做 Skill 和真实人机／机机验证。采用临时子项编号，避免与后来已使用的全局 Slice 编号冲突。不会把卡片条目数包装成几百个新 Slice。

本次估算为 **27～44 人日**（实现与验收的粗略工作量，不是当前代理的实测工期，也不含充值等待）。主要不确定性是 FAQ 逐条变化、新能力对既有执行器的复用率以及新底座／模板几何。01、04 完成后应一次收窄估算，而不是开发中不断追加无边界工作。

## 2. 实测增量，而不是按版本号猜测

对锁定原件与本次公共 API 的解码记录做集合及字段差分；各集合没有分页遗漏标记。原冻结 Firestore 文件的序列化字节与早期锁不同，但五份文件的 canonical hash 全部匹配现有锁，符合现有源校验器口径。没有把这种序列化差异计为数据改动。

| 范围 | 现有冻结值 | 当前观察值 | 真正需要处理的增量 |
|---|---:|---:|---|
| 单位／衍生单位记录 | 26 | 45 | 新增19；20条旧记录有字段变化 |
| 战术卡，不含势力卡 | 31 | 39 | 新增8 |
| 子势力卡 | 6 | 10 | 新增4；旧势力部分 Air 槽改变 |
| 单位能力／武器／升级条目 | 183 | 322 | 新增139 |
| 战术／势力卡效果条目 | 69 | 92 | 新增23 |
| 两类效果条目合计 | 252 | 414 | **新增162，约增加64%** |
| 官方任务记录 | 10 | 14 | 新增2种任务×Standard/Skirmish |
| 官方部署卡记录 | 10 | 13 | 新增3张；不是新增3张背景地图 |
| Command Center 核心规则节 | 15 | 15 | 解码内容未变；不能据此认定 PDF/FAQ 没变 |
| FAQ | v1.0，5页、68问 | v1.3，8页 | 需逐条比对；不能沿用旧报告“新增原子0” |

这些统计来自本次保存的官方公共接口原件；观察时间与完整差分在研究目录中。官方入口链接到 [Command Center](https://sc.starcraft-tmg.com/)。

重要计数区别：

- 162 是新产品效果定义，不是162个全新底层算法，也不是162个新规则原子。许多是既有武器、状态、支付、位移、生成物等原子的组合。
- 新19条含 Nova 两个模式、衍生部队和炮台／无人机等，不能说成19种新盒装模型。
- 旧单位效果只有12个条目的字段变化：10个升级费用变化、Adept文案大小写和Raynor武器名大小写各1。Raynor的 C-14 早已存在，不是新增武器。Queen两个同名 Talons 分属不同阶段，不能按名称合并后误判为规则改变。
- 37张旧卡都有时间戳变化，但其中23张仅时间戳变化；其余14张涉及价格、Air槽或资格字段。它们不等于37张卡重做。
- faction_cards 集合还混有社区内容：新增31条中24条是社区记录，只保留研究差分，不进入官方规则发布。
- 旧任务变化大多是显示文字、时间戳、refId；已确认 Gather the Resources 的 Skirmish 领先终局阈值由10改为8，必须更新执行，不能全归为显示变更。

### 新单位与卡

| 种族 | 新单位／衍生记录 |
|---|---|
| Terran，8 | Siege Tank、Raven、Nova Assault Mode、Nova Stealth Mode、Spec Ops Marauder、Auto-Turret、Holo Decoy、Sabotage Drone |
| Zerg，5 | Ravager、Defiler、Zagara、Bile Launcher、Vileling |
| Protoss，6 | Immortal、Zeratul、Nerazim Watchers、High Templar、Tassadar、Twilight Templar |

新增势力：Nerazim、Nova Covert Ops、Templar Caste、Zagara’s Swarm。
新增普通战术卡：Cocoon、Factory (Tech Lab)、Robotics Facility、Void Seeker、Defiler Mound、Reactive Creep、Templar Archives、Vanadium Plating。
新增任务：Artefact Hunt、Fire in the Sky，各两种规模。新增部署：POWER LINES（Skirmish）、MEETING ENGAGMENT（源名如此，Standard）、ONE BRIDGE TOO CLOSE（Standard）。

Wave 2 的5条单位记录加5张卡共55个效果定义，已被旧调研识别但未证明生产接入；余下 Wave 3 增量为14条单位记录加7张卡，共107个定义。两者都包含在本次162项中，不重复计费。

## 3. 现有架构能复用什么，还缺什么

以下是源码观察，不把“模块存在”当成当前产品已通过更新验收。

| 层 | 已有基础 | 本轮需要补齐 |
|---|---|---|
| 官方导入 | source revision manifest、差分、显式导入与回滚 ledger | 为新卡表／FAQ建一次冻结候选；完成正式产品发布入口 |
| 原子与执行器 | 飞行、模板、Morph、生成物、反应、支付、任务、LOS等内核；旧FAQ完成记录为1163原子／83执行器 | 针对新语义组合补执行，不重做所有旧原子；旧统计不是当前全量重新认证 |
| 能力组合 | 8类 effect family、定义覆盖表、族别 adapter、权威房间工厂 | 新162条逐项归属与执行证明；无法执行的不能仅展示为可选动作 |
| 版本选择 | latest-data certification、历史 room binding | 多版本实际加载闭环；避免新目录仍调用旧规则／旧底座表 |
| Skill保鲜 | source→fact→claim→section→skill 依赖传播与选择性发布逻辑 | 持久化和正式消费者接线，不能只停在内存 Map／演示夹具 |
| 三种对战 | 共享房间／权威执行、工具和Agent链路 | 新内容通过三入口同一服务运行，断线／阶段切换／终局均可恢复 |

### 必须先解决的两个结构问题

**A. 旧快照常量散落在消费者内。** 多个 data bundle 与 executor 直接导入旧 source-lock/snapshot/dataset 常量；例如 flying executor 的 verifySourceLock 会比较固定旧值。简单导入新数据会被拒绝，或者产品某入口继续拿旧数据。新增统一 ReleaseResolver，以房间绑定的发布版本选取合法数据与执行能力；旧执行器通过 legacy adapter 保持旧行为。消费者改为校验其实际输入契约，而不是一律等于某次历史下载的 hash。

**B. 能力身份与来源整包哈希耦合。** 当前能力 IR 将 sourceRecordHash、payloadHash 和数组 index 放进 sourceFeatureHash，再据此生成 definitionId。只调矿价或更新时间，也可能让未变能力失去原绑定。新方案用稳定的产品ID＋功能ID＋规则语义版本标识能力；来源hash仅证明所读原件。保留旧ID别名供旧房间／证据读取，明确对账映射，不做靠名称猜测的静默兼容。费用变化只传播到军表／经济评价，不能重置射击算法的资格。

保留 hash 的文件完整性用途，保留房间动作修订号／幂等校验；不新增让模型填写签名或全局重认证的流程。

## 4. 推荐的增量发布流程

~~~mermaid
flowchart LR
    A[官方候选：卡表/费用/FAQ/任务] --> B[冻结一次并做语义差分]
    B --> C[数据/几何/规则能力增量]
    C --> D[统一版本解析与权威工具]
    D --> E[人工写表或AI写表与Plan]
    D --> F[人人/人机/机机同房间执行]
    B --> G[受影响Skill章节与条件经验]
    G --> E
    G --> F
    E --> F
    F --> H[带版本的回放/复盘/训练输入]
    I[旧发布版本] --> J[旧房间与旧战报继续读取]
~~~

一个发布清单至少绑定 dataVersion、rulesVersion（含FAQ）、capabilityVersion、geometryVersion、可兼容的Skill清单。Web、App、Builder、Plan/Teach、Planner/Action、概率／路线查询、副官与复盘都由同一发布对象取数。

| 改动类别 | 自动完成 | 需要开发／判断 |
|---|---|---|
| 时间戳、排版、大小写 | 显示更新、来源记录 | 不改变行为，不重生成Skill |
| 单位／卡／升级价格及槽位 | 重算合法性、预算、可替代组合 | 重评受影响军表与策略成本；原军表不自动改选 |
| 既有机制的新参数组合 | 编译配置、复用执行器与工具 | 产品单步证明该组合，不能仅凭关键词命中通过 |
| 新规则语义／FAQ改变 | 定位依赖、生成影响清单 | 人工实现与来源对账后，事实由工程编译 |
| 缺尺寸或相互冲突的官方文字 | 标记精确缺件 | 只隔离相关能力，不猜底座、模板或规则 |

旧房间固定旧发布；不在对局中升级规则。新建房间才选新发布。把旧军表带入新规则时生成副本、重算价格与槽位、提示差异；超预算则让人／Builder重新选择，不能静默删单位。旧Plan及条件经验保留原适用版本，受影响部分完成重验才可用于新房。

核心规则PDF本轮请求超时，未取得新版字节，因此没有断言它与旧版完全一致。FAQ v1.3已保存，hash与旧版不同。其PDF抽取存在修订文字连排的情况，逐问对账须检查原版视觉标记，不能把新旧答案拼成一条规则。第一阶段关闭这些来源缺口；后续开发期间不自动刷新官方数据。

## 5. 新内容真正影响哪些能力

| 能力组 | 更新重点 | 必须一起使用新结论的消费者 |
|---|---|---|
| 飞行／大底座／高差 | Raven完整产品接入，新底座与模板尺寸、端点、LOS、控制资格、地形路线 | 棋盘、路线／队形、威胁、Plan和Apply |
| 模式与替换 | Nova两种资料、Tank模式、Morph前后状态和资源／Supply | Builder、动作菜单、战斗计算、评分 |
| 生成物 | 炮台、诱饵、无人机、Bile／Dark Swarm／Force Wall等对象的类型与权限 | 创建、范围查询、继承属性、可选目标、销毁和恢复 |
| 延迟与范围伤害 | 预先设置、触发时机、友军影响、来源已消失后的事件 | 概率、预计伤亡、阶段结算、事件日志 |
| 资源与额外行动 | 折扣、可消耗模型、反应、被授权行动与真正激活的区别 | 支付菜单、状态机、Planner、手动UI |
| 任务与部署 | 搬运／交付、标记等级／特殊动作、新部署区及进入方式 | 地图读取、占点工具、Plan、记分与胜负 |
| 旧内容平衡 | 费用、槽位、FAQ局部解释 | 所有编军入口与已有Skill条件 |

例如官方说明 Raven包含飞行和特殊无人机能力，Tassadar/High Templar引入力墙与战术配合；都不是把武器数字填入旧单位即可。[Raven/Nova官方介绍](https://archon-studio.com/blog/starcraft-tmg/starcraft-miniatures-game-raven-nova-terra-wave-3)；[Protoss Wave 3官方介绍](https://archon-studio.com/blog/starcraft-tmg/protoss-tassadar-high-templar-wave-3)。

既有地图不用重新画20张。复用已批准的地图集合，对新底座、飞行和模板执行规则可达性检查；部署卡新增几何和任务点另绑定。仍按官方游戏规模匹配地图，不要求所有单位通过所有窄路。任何地形例外、阻挡、可站立面，都同时出现在美术叠层和权威查询中。

## 6. 16个可独立验收子项

每项完成交付物与对应产品证据后再报完成；相关旧门禁复用，不反复跑全量。表中时间是估算人日。

| 子项 | 具体交付 | 准出证据 | 估算 |
|---|---|---|---:|
| 01 来源冻结与差分 | 全部W2/W3卡、费用、FAQ、任务／部署、尺寸来源和精确差分 | 原件齐全；社区隔离；核心PDF／修订文字疑点关闭 | 1–2 |
| 02 统一发布版本与稳定ID | ReleaseResolver、旧版adapter、能力别名与兼容映射 | 两版隔离房读取正确、冷恢复不串版；调价不使未改能力失效 | 2–3 |
| 03 平衡与编军 | 20旧单位变化、14旧卡实质字段、新势力资格和卡池 | 人工／从头写表／固定表三入口同预算同资格；可保存合法新表 | 1–2 |
| 04 FAQ逐条影响表 | v1.0→v1.3每问的保留／改动／新增及消费者清单 | 无漏项、无把既有条款算成新增；给出精确原子改动量 | 1–2 |
| 05 FAQ执行增量 | 仅变化条款的原子、工具与结算修订 | 每条变化合法／非法边界＋对应产品后继；旧版不变 | 2–4 |
| 06 几何与飞行接入 | 19记录底座／共享实体映射、新模板和token几何 | 真实尺寸、边缘距离、地形通行、范围渲染和执行一致 | 1.5–2.5 |
| 07 Wave 2纵切 | 5单位＋5卡的55定义接入 | 能写表、查询、选择、执行、回放；模板／变形等受影响链闭合 | 3–4 |
| 08 Terran Wave 3纵切 | Nova/Raven/衍生物及新卡 | 生成继承、延时触发、模式和飞行实际执行／冷恢复 | 2–3 |
| 09 Zerg Wave 3纵切 | Zagara/Defiler/Bile Launcher等 | 支付／牺牲、范围状态、延迟伤害及creep生命周期 | 2–3 |
| 10 Protoss Wave 3纵切 | Tassadar/Templar系列与势力卡 | 力墙、范围效果、资源与额外行动时序闭合 | 2–3 |
| 11 任务与部署 | 4任务记录＋3部署卡及旧任务修订 | 两规模开局、特殊动作、回合计分、胜负、恢复；任务条件不靠模型猜 | 2–3 |
| 12 工具与Agent统一消费 | 新能力接地图、概率、交换、资源、占点、行动菜单和Plan工具 | 同状态查询与Apply一致；人工／Planner／Teach使用同事实；无隐性禁用新能力 | 1.5–2.5 |
| 13 Skill／经验增量保鲜 | 正式持久化依赖传播、部分发布、旧版读取 | 一个实际调价／规则改变穿过依赖→局部更新→新房消费→冷恢复 | 1–2 |
| 14 策略包与Plan适配 | 既有11包局部更新＋新势力基础包，优先对抗补充 | 事实准确、来源匹配、合法行动可用；真实效果另计，不写“产出即更强” | 2–3 |
| 15 Web/App和副官展示 | 新单位卡图、token、状态／目标／支付／反应控件、规则版本选择 | 桌面／窄屏操作、人人双方视角、用户BYOK、副官读本房正确版本 | 1–2 |
| 16 三模式发布验收 | 一个可创建的W3产品版本与中文报告 | 人人／人机／机机同链路、实际终局、恢复和回放；性能与已过基线对照 | 2–3 |

依赖与里程碑：

- 01、02确定发布底座；03可先交付“旧单位最新平衡”候选，但不叫完整W3。
- 04→05解决FAQ差分；06→07～10补新内容；11与族别能力可按依赖交错推进。本方案不启动子代理或K3。
- 12、13、15沿各能力纵切接入；不能等规则做完才发现前端／Agent缺入口。
- 14须等待额度恢复；16最后发布。旧版保持可使用，新版候选只在明确范围内测试。
- 暂不额外扩展18张美术地图、不重做六副官角色素材、不展开全势力所有有向对抗Skill。

## 7. Skill、Plan与复盘资产怎么增量更新

当前正式基础目录实际有11个：通用1、势力4（Terran Armed Forces/Zerg Swarm/Kerrigan/Daelaam）、有向对抗6。复盘产生的候选另外管理，未发布候选不能算作正式包。

建议分三层：

1. **旧11包**：重算受费用、资格、FAQ、新对手能力影响的章节。通用原则及未受影响事实保留；无需把整份文字再生成。新增发布清单可引用经过兼容确认的旧章节。
2. **新4势力**：新增Nerazim、Nova Covert Ops、Templar Caste、Zagara包。若目标是官方10势力都支持AI，还需补原本就缺的Raynor’s Raiders、Khalai两包；这2个是历史覆盖缺口，不算Wave3新增。
3. **对抗包**：保留并局部更新原6个。建议优先为新4势力各选1个异族基准对手，生成正反向共8个包。完整最小基础库为17个（1通用＋10势力＋6原对抗），优先对抗扩展后25个。无需一开始生成66个跨种族方向或90个全部异势力方向。

没有专用对抗包的组合，使用明示的“通用策略＋双方势力资料＋权威工具”规划模式，并报告该覆盖级别；不能静默套用另一势力Skill。是否具有更好的战略效果，需要后续实验，不是数据升级验收可以声称的。

Teach仍允许模型选择与保留策略；工程提供更新后的合法成本、动作、概率和地图事实。不会硬要求某张卡／某单位一定入表，不会用prompt注入特定赢家。固定表模式只修Plan；从头写表允许表和Plan共同修订。已知敌表与仅知敌势力的权限保持，不能因版本升级泄露敌方军表。

Wiki／Memento条件经验记录规则版本、任务／地图、双方配置、成立条件和证据范围。更新后：未命中依赖的经验可复用；成本变化使价值比较待重估；规则语义变化使相关结论待验证。原战报依然是旧版本真实历史，不能改写为新规则训练真值。MuZero／自博弈导出按release隔离。新旧效果比较要固定同一新规则版本，不能把价格变化造成的胜率变化归功于Skill优化。

## 8. 三种对战如何确保仍是同一个产品

三模式共享 room factory → LegalSpace/query → preview/apply → event log/recovery/scoring，仅动作提议者不同：人人两席人工，人机一席人工一席Agent，机机两席Agent。新能力的规则、数据和工具不另建“实验专用实现”。

准出分层：

- **资料可浏览**：不是可对战。
- **规则可执行**：新414条产品定义均有明确执行／展示用途；162新增逐项落到真实能力，FAQ增量无未解决High。未支持的特性不能装成可用按钮。
- **人类可玩**：所有新增选择可由UI完成，包含目标、模板摆放、支付、反应、伤害分配、特殊任务动作；双方恢复与终局正常。
- **Agent可玩**：AI写表与固定表Plan都消费同版工具；新能力不在查询端消失；能实际决策、执行和结束对局。
- **策略更强**：独立配对评价另计，不能用合法终局替代。

工程验证先行：对实际新增／改动边界注入正常回复和具体异常（过期状态、重复事件、缺来源、错误付款、迟到回复、恢复期间退出等）；通过外层产品后继与冷恢复才调用模型。复用已经通过且未受影响的证据。跨回合／清理／终局可用隔离确定性状态定位，不为UI检查再打满整局。

发布样本建议：3场2000分人机（覆盖三族的新主能力）＋3场2000分机机（轮换双方，涵盖新势力与两个新增任务）；人人用实际双席操作覆盖同一变化矩阵。另在官方Skirmish规模进行聚焦任务／部署／终局验收。不是对10势力做全排列，更不能声称这6场证明所有策略组合最优。每场记录动作耗时中位数与长尾、实际工具用量和费用；有限搜索无解仍不得宣称全域不可能。

## 9. 待关闭的不确定项与成本控制

| 未定项 | 目前知道什么 | 在哪一步关闭 |
|---|---|---|
| 核心PDF是否另有变化 | rules_sections语义相同；PDF下载超时，不下结论 | 01 |
| FAQ新增／修改原子数 | 旧68问，新v1.3；很多旧条款仍相同，不能整篇算新增 | 04→05 |
| 新162定义复用比例 | 已有8类family和飞行等执行器；未对新定义跑产品准出 | 01、07～10 |
| 全部新底座／模板尺寸 | 存在官方卡表／装配资料；本轮未逐件几何认证 | 06 |
| 正式Skill保鲜是否完整接线 | 模块是内存状态；本轮packages/apps搜索没有发现其正式导入消费者 | 13 |
| Skill生成Token与新策略收益 | 本轮0模型请求；没有可信额度／效果数字 | 14先单势力试产并记录后外推 |

模型费用不能按162条能力逐条生成Skill来估。先完成来源和工具，再对受影响章节做增量，缓存已读事实，复用同一冻结材料；新增势力与优先对抗独立记账。技术模块依赖取数出错才修工程；模型的合理取舍不以“没有选预期答案”为High。

本方案不删除历史、不复制整个build、不重建原对局。来源采用一份不可变缓存＋轻量manifest／内容引用，隔离测试状态按需生成，避免再出现每项验证复制多GiB。

## 10. 可复核材料

本地只读观察：

- build/ticket-28-wave3-assessment-20261112/normalized-diff.json：集合增删、字段变化与旧冻结完整性。
- 同目录 counts.json：记录数、效果条目数、10势力和旧效果字段变化。
- 同目录 pdf-observations.json、faq-v1.3.pdf、protoss-w3.pdf：来源观察与原件。
- 五份公开API响应保存在同目录；未接入正式source-lock。

关键源码依据：

- content/official-development-tranche-s75-111-source-lock-v1.json
- packages/source-data/official-development-tranche-source-lock-v1.mjs
- packages/source-data/official-faq-v1-source-lock-v1.mjs
- packages/source-data/official-source-import-workflow-v4.mjs
- packages/source-data/official-latest-data-binding-v1.mjs
- packages/source-data/official-ability-effect-ir-v1.mjs
- packages/product-composition/official-current-product-ability-denominator-v1.mjs
- packages/rule-atoms/official-flying-rules-executor-v1.mjs
- packages/source-data/official-model-base-geometry-data-bundle-v1.mjs
- packages/strategy-skills/incremental-skill-freshness-runtime-v1.mjs
- content/strategy-skills/ticket-18-foundational-v1/skills/

官方W2/W3卡表：
[Terran W2](https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-W2-Card-Sheets-A4_EN.pdf)、[Terran W3](https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-W3-Card-Sheets-A4_EN.pdf)、[Zerg W2](https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-W2-Card-Sheets-A4_EN.pdf)、[Zerg W3](https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-W3-Card-Sheets-A4_EN.pdf)、[Protoss W2](https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-W2-Card-Sheets-A4_EN.pdf)、[Protoss W3](https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-W3-Card-Sheets-A4_EN.pdf)。

本次仅研究交付。Ticket23仍33/36，剩余248/249/250；复盘等待用户充值。Ticket28实施0/16，未经本轮计划之外的执行指令不自动导入／发布新规则或启动模型。
