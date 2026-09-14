# T18 / S174：统一审查编号命名空间

最新正式预检已exit0：新recipe为`0a2eb5fe91b8ae51677a44dfd5be1821b52b17529e7a062bceac55af68633e6a`，从8262继承54条可复用角色、530calls/104,613,902tokens/¥88.741924链内账本（不是全局累计）。新执行模型为`deepseek-v4.1-flash-expires-on-0910`。dry首个未缓存的army_resources.1.reasoner是Host组装结果，因没有loop不进入直接复用清单；实际live已配置精确answerCompletionImports，两个实际补答batch仍有可复用loop。已只读核实此差别，没有据此重发旧角色。当前已启动唯一同参live，尚未得到新付费或Skill结果；T原未知请求继续隔离，先推进Z。正式入口是否恢复到原编号失败点并继续，仍以实际live结果为准。

2026-09-09 05:00 CST更新：所有受影响回归已完成。尾项草稿恢复92项/4DSH、编辑恢复83项/2DSH与313项聚合通过，聚合hash为`45f665a91cee254684da02d9b08bc20f43ad8cf66367464944948676eeb0698d`。现场启动快检49门/248文件全部一致，`ready=true`、无问题。现在从`faction-v1-8262a9a7181f3ec25c06`显式使用`--model-v41-beta`进入完整零Provider预检，尚未得到新正式preflight终态或启动live；下文保留历史阶段说明。所有真实DSH检查均没有新API调用，Skill与累计费用计数不变。

状态（2026-09-09 04:44 CST）：编号组件49组、新runtime 57项（4次真实DSH）、真实外层回调3路径、接线44项全部通过。V6绑定与11来源计数遗漏已修复；两条相关回归队列及三项遗漏的局部规则纠错回归尚在收口。尚未通过新的完整正式preflight/live，没有新增正式Skill或API支出。

最新报告：`slot-review-dsh-runtime-v1.json`为`fddddbae798a4f0f1938deac4d5f0fa6e23ffa8067e6693323f21b68b49f0cbe`；`slot-review-workflow-boundary-v1.json`为`c19334a7658a32886725a99facbf874acc3df9d3ea6d183ff4a84597dd529698`；`slot-review-readiness-v1.json`为`4aa90ec905eb43950c81f4deb70e89ca4535d52ce1037768069f27805cc563a5`。25953已终态，以下04:35及更早段落保留为历史过程，不是当前运行状态。新格式的三个模型响应为明确注入，四次DSH为真实本机执行；原始旧结果恢复使用实际付费证据。不能将这些合同/接线证据当作完整正式生产或策略可用性验收。最新快检分母为49门/248源码文件。

## 外层workflow预付费前检查（最新）

在准备启动完整生产前继续检查真正调用方，发现`produceFactionStrategyV1`的审查回调仍只允许V5使用128条来源和16384字符reason；V6会落入旧V4绑定比较与8来源限制。此前runtime、DSH、独立结构化consumer虽然能通过，也不能覆盖这一外层边界。因此没有启动正式模型，先补正确接缝测试。

三项假设是外层分支遗漏、生产/验收参数遗漏、回放合同漂移。读取保存的实际DSH结果，旧V5恢复产物通过，两个V6产物稳定失败。抽出原回调成为`validateFactionProductionTargetReviewV1`（先保持行为不变），测试在约0.75秒复现`FACTION_REVIEW_VALIDATION_BINDING_INVALID`；仅补合同分支后又精确复现`FACTION_SOURCE_REFERENCE_INVALID`。实际审查有11条来源，证据没有变成不存在的来源，而是外层还在用8条上限。

现已补齐V6显式binding、128来源边界、main两条生产路径及独立candidate/partial replay入口参数。旧V1–V5合同、数值约束和语义校验不变。新外层测试使用完整保存产物的11/6条引用及原始判断，三条路径约0.8秒通过；缺binding/伪造binding仍拒收。报告`slot-review-workflow-boundary-v1.json`最初green hash为`ce4c9f483f218edb3131940d46bf0c6ec7032a9e278b7a29197a285c62809ba0`，会在新DSH证据收口后按新proof hash重新生成。

runtime测试已增加实际外层回调，57项快测通过，hash为`6599aaafd4529be4fee5b3955110e41ba05064410e0dac28fd0f8fb53773be77`；新4次DSH/外层/接线聚合队列25953仍在执行。原两测试父队列曾SIGSTOP等待子测试完成；确认子进程终态后已正常终止父51079/51129（49578/50232均exit143），**没有遗留STOP进程，不应再恢复它们**。没有删除任何数据，也没有中止或重发付费请求。

新相关回归队列98172为workflow/旧合同等，28857为模型接线/fragment/规划等；66700旧短队列已终态。已完成的原focus25及decomposition40组件不依赖改动的外层函数，不重复重跑，仅让后续接线门重新核对。其它仍受影响的workflow/source-correction/unique-cross-field证据分别补验，不能用刷新摘要冒充通过。最新运行状态以TASKS为准。

本轮技能记录：ctx2skillLoopUsed=true、harnessLoopUsed=true，targetGames=[starcraft-tmg]，roleRoutes/promptPackRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]；使用diagnose和diagnosing-bugs先红测、分别改变合同判定/来源边界，再绿测。skillsGenerated=0、promotions=0；judgeTestsRun为57项组件与3路径外层合同检查，不是策略Judge成绩。crossTimeReplayResult为原始paid结果与旧合同保留、真实DSH更新中、完整对战未验收。harnessToolsCalled仅离线生成/审查/账本/重放；uiTraceEvidence、memoryTraceEvidence、trainingTraceCandidates为空。任何未通过独立来源、合法动作、空间对战或升级回归的候选仍隔离。

## 本轮接线与真实执行

- `faction-structured-review-runtime-v1.mjs`显式识别V6 binding，使用统一局部编号上下文与Host映射；旧V1–V5路径仍保持原合同。旧的output-cap、decomposition和焦点恢复策略不能悄悄套到V6。V6保留原完整上下文的有界schema纠错路径；这不是所有未来输出错误均可恢复的承诺。
- `faction-slot-review-runtime-v1.mjs`作为共同路由：已验证历史角色走旧合同；原始766986完成结果经原V5合同、实际owner/request/body/model/capability/usage重新核验后交给DSH，0新Provider；真正新角色走V6。持久化的是新恢复证明，原始candidate、judgment、reason、账单都不改。
- `faction-structured-replay-v1.mjs`独立重建新V6与旧结果恢复；V6局部schema修复还需重建修复上下文与精确允许修改路径。独立读取实际paid owner，不以最新导入recipe替代付费来源。
- `faction-slot-review-environment-v1.mjs`读取54层实际recipe链（允许有证明的manifest-only中间节点），列出200个历史审核角色的旧合同路由，并从实际账本读取原始owner与capability。200是跨历史的路由清单，不是完成章节/Skill数量；这一步**没有hydrate Terran祖先角色产物，也没有解除未知请求隔离**。
- `faction-slot-review-migration-v1.mjs`与continuation接入新recipe字段的显式迁移；模型锚、来源、输入、预算不能随合同切换重置。
- 正式main已接入新V6 capability探测、旧合同/原始结果恢复/新V6三路、独立进度日志、零Provider预检和迁移参数；`faction-replay-runtime-stack-v1.mjs`增加只读冷恢复路由。

新增runtime测试快测28788已exit0，54项、0Provider、3个明确注入的Provider响应，报告hash为`27159b18a2c3fa0ffd59bf2d6b3d941e32d4990f89605d908ff5e5a9b8a50bb1`。随后42673已exit0，**4次真实DSH/54项**通过，报告`slot-review-dsh-runtime-v1.json`，hash为`b6a022a63b57183b764b5d061cedc280b99230aed0e168597a6b2676344684c1`。三条路径为实际旧结果恢复、新V6、先schema-invalid再仅修对应字段；均经过SQLite关闭/重开、不重复执行与独立consumer。V6响应是注入测试，不能当作真实新模型策略产出。

接线脚本14213已exit0，42项，实际祖先读取、dry切分、旧合同路由、恢复原请求重新验证、只读wrapper/冷stack接入、迁移反例与静态main参数检查通过；报告`slot-review-readiness-v1.json`，hash为`29b6d147be3c64bbf86a2c3d8f469b2d1621e174c4b0595f44c0b5ca945930f7`。其`mainProductionPreflightPassed=false`，不能用静态接线检查代替正式命令。

最新49组原组件报告hash更新为`5f1de83f2d11327241aeedb79ff1be939688753bdbc815e7beeec50ce9946899`。已有真实旧role的structured replay与旧/新模型42项快检也通过。前几次新测试失败来自夹具对wire hash、重开DB句柄、compiledInput布局及receiptRef结构的误用；修的是夹具，未为通过而放宽生产合同。

启动快检现在统一检查main原本需要的额外四聚合、新slot双证明及模型证明，共49门/245个源码文件。本轮改了共享runtime、consumer、入口和continuation，旧相关证据源码摘要必然陈旧，正在两条本机测试队列重验；这不是新一轮LLM生成失败，也不会触发付费重试。49578为合同/审核队列，50232为模型/DSH分解/规划等队列。队列状态以最新TASKS为准，勿重复启动。

本轮新增付费为0。累计仍174,637,245已知API tokens、¥155.050595估算与预留，下一通知¥200；五件套离线1/5、实战0/5，Terran6/7、Zerg1/8，T18为2/8、项目16/22。用户三个后续问题仍只记录，优先完成基础Skill。

以下为上一轮的原始诊断与历史检查点。

## 实际正式批次

唯一运行的54253/PID71927已exit1。批次为`faction-v1-8262a9a7181f3ec25c06`，recipe为`8262a9a7181f3ec25c06e8889507020363967f6a0d68efcd38de0c4aa1a35e71`，最终报告hash为`8825c919db4a85c8c86c1b0201c51c93e22a0e5a8c9794d2a59447705e4cca9c`。

- 新模型16次输出格式探测成功，6,948 tokens、保守估算¥0.026340。
- Zerg旧第一章和第二章草稿复用；supportive.1.4审查用保存的结果恢复，0新Provider。
- 新的adversarial.1.0先遇到一次已结算的schema错误，经过现有有界格式纠错完成；adversarial.1.2也拿到完整schema有效结果，却在Host编号映射时停止。
- 该批次合计19次调用、417,711已知tokens、保守估算¥1.284099。累计174,637,245已知API tokens、¥155.050595估算与预留；保留Terran旧未知发送的¥0.80。没有实际402，下一费用通知为¥200。
- Terran按原隔离策略没有重发。报告顶层失败为该通道的`AMBIGUOUS_EGRESS_NO_RETRY`；Zerg本轮实际停止码是`FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED`，必须同时查看parallel lane记录，不能用顶层错误掩盖Zerg原因。

## 复现与原因

原始成功attempt：`structured-76698661eced0d83008fc72ceecbeceb256367eb15b6105f`。

原始candidate hash：`ea3cc6f788065d6739dd334e695c20c3bf13bc8656cd796fd0eee52064705c96`。

独立重建完整上下文，hash与原请求精确相同：`45876c04ab31ddb5ff0eaa4460fbbd64e7daef1408e46efb1af28dce1d92d283`。批次对象为整章`[2,3]`，指定覆盖来源只有`source:army_units:queen`。原文明确写出`targetSlot 0`，却把`[0]`放进要求整章编号的`recommendationIndices`；Queen实际是本批次slot0、整章index2，整章index0没有Queen来源绑定。

三个假设分别检查：局部槽位写法不被识别；全局/局部或来源歧义；恢复时草稿/上下文漂移。完整上下文相同，source及whole-recommendation hash唯一对应，排除后两项。只在诊断内修改编号，或只调整旧解析器要求的声明写法，均能通过原Host检查；没有写回原结果。这说明是混合坐标合同及旧解析器表达限制，不是上下文丢失；也不能据此证明模型的规则判断正确。

实际最小重放和新组件回归先后以相同错误红测；原V4保持不变，仍能重现旧错误。

## 已实现

新增三个文件，旧V1–V5合同和V4解析器源码不变：

1. `content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs`：V6要求coverage使用`recommendationSlots`，与verdict的`targetSlot`统一。整章`recommendationIndices`为Host字段，不再让模型跨命名空间计数。
2. `packages/skill-production-v3/faction-review-slot-namespace-v1.mjs`：完整上下文工厂、原生槽位映射、纯关系诊断和带真实付费来源核验的旧结果恢复。新格式按结构化槽位映射，不解析理由文字来确定地址。旧结果恢复要求明确`targetSlot`声明、同一来源和唯一整体建议身份，不使用实体相似度，保留原判断、理由和支付记录；已合法的旧全局编号不被重新解释。
3. `scripts/verify-ticket-18-review-slot-namespace-v1.mjs`：读取实际生产账本，重建完整capsule及原请求/HTTP body，校验实际owner recipe、模型、capability、usage和回执，再测试无损恢复。另用明确标注的注入输出验证新V6，不把它们算作实际模型或策略证据。

最终49组检查通过，报告为`build/ticket-18-faction-production-v1/review-slot-namespace-component-v1.json`，hash为`cfcd767637b7db785ce88b1228595c0bc29eb5dd32052d74115a45cc24978e5e`。覆盖错误编号、混合坐标、重复/缺失槽位、错误来源、缺失或篡改付费证据、重新封装但模型名/HTTP body错误的回执、负面判断保留、原始attempt不变，以及实际整章三个批次的非零偏移和数组重排。扩展测试首次失败是测试把`when`数组直接作为quote；改为使用Host已枚举的具体field文本后通过，未放宽生产校验。

新文件语法检查通过；这是组件与原始失败重放证据，`providerCalls=0`、`actualDshSessions=0`、`productionWired=false`。没有新V6实际API、正式续跑或完整Skill成功证明。

## 下一步及边界

- 将V6上下文/输出合同/Host映射接入正式runtime；已有成功角色按原合同原样复用，新付费角色才使用新合同。
- 将实际766986完成输出经新的显式恢复路线交给真实DSH；需要持久化恢复证明、重启重放和独立consumer重新核验，而非只信本组件报告。
- 将绑定及精确旧结果导入接入recipe/continuation，保留费用和失败记录。当前8262未hydrate的Terran成果仍在已验证祖先中，后续不能以子run缺行认定从未付费；未知发送继续隔离。
- 只重验受影响门后，以新的显式recipe预检/执行；不要原样重启54253、8262或旧27ef请求。
- 种族独立评估与正反对抗入口仍需新模型接线；未完成前不允许它们直接使用旧profile付费。用户新增的三组优化/保鲜/多模态问题仍仅记录，不提前实施。

五件套离线1/5、runtime0/5；Terran来源审核6/7、Zerg1/8；T18为2/8、项目16/22。完整长目标保持active。

技能记录：ctx2skillLoopUsed=true，harnessLoopUsed=true，targetGames=[starcraft-tmg]，roleRoutes/promptPackRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]；skillsGenerated=0，promotions=0。judgeTestsRun为上述49组合同/证据检查，不是新策略Judge成绩；crossTimeReplayResult为实际旧结果Host重建通过、真实DSH及完整对战未验收。harnessToolsCalled仅离线准备/生成/审查/账本与重放；uiTraceEvidence、memoryTraceEvidence、trainingTraceCandidates为空，trainingTruth=false。不能通过独立来源、合法动作、空间对战或升级回归的候选保持隔离。
