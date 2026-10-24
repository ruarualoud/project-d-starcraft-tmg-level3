# P5：能力字段来源核对（施工中，非最终验收）

T27/S272，新 P0–P6 主线。正式 Plan 0/6、对局 0/12，剩余4片；不扩展 Web，不恢复旧调查。

## 实际失败与原因

实际675把 Medic 能力概括成「CP门控条件性反应（4英寸内友方Biological受伤时减伤/治疗/清debuff）」。已有15条原子来源检查及覆盖审核均通过，Host确实得到 acceptedForStrategy=true；逐条人工读回发现仍与官方31的结构化字段冲突：Medpack 是 Movement Phase / Active，Restoration 的触发为收到 DEBUFF，目标是 Friendly Unit，不能合并成受伤触发的 Biological 反应。

该检查的实际 operationState 表明 `/abilities` 原文已经读取，并非网络失败或漏传。审核在公开理由中同时承认 Medpack 为 Active、又认可整体「反应」概括。根因是以整句大意代替关系字段对齐。原通过结果原样保留，不涂改为失败。

- [完整675请求](../build/slice272-projection-owner-v565-inlKbk/675.request.json)
- [完整675公开回复](../build/slice272-projection-owner-v565-inlKbk/675.reply.json)

## 修正与可证明边界

`roster-workflow-source-claims-v1.mjs` 在已明确引用且含结构化 abilities 的来源上，另外生成逐能力字段矩阵。矩阵完整复制同一冻结记录的能力数组、来源身份、原始句子与span；每个能力独立核对 phase / activation / description 中触发、目标、距离与支付。未被该句描述的能力不是缺失证明；共享限定词不能跨多个效果错误泛化。无硬编码单位规则、伤害算法或战术权重。

Host校验实际检查项完整、无重复、绑定与来源hash一致，任一冲突均阻止准入；整体覆盖不能豁免。原15条已完成且未变的句级检查全部复用，仅新增1个能力矩阵及其依赖覆盖。后续相同矩阵可按原文／冻结来源／绑定复用真实结果。

这仍包含可犯错的模型语义核对；通过矩阵不等于数学保证所有自然语言都正确，更不等于策略提升。必须观察实际纠错，最终两种模式及产品全链路仍待。

## 定点验证

`verify-slice272-ability-fields-v601.mjs <Run>` 用同一实际675／已通过审核，先 RED：缺少逐能力矩阵。修后一次 GREEN：原8项能力完整、15条旧检查不重跑、绿色覆盖不能洗掉矩阵冲突、无显式授权不能第四次修订、显式工程修复只允许再一轮且不清旧计数。合成矩阵verdict仅作Host聚合fixture，明确不充当真实规则／模型证据；0 Provider／Native／生产写。旧通过门均未重跑。

来源作者已在第3轮。只对本次明确工程修复记录一次额外修订许可：owner身份、priorRound、engineeringChangeId、additionalRevisions=1均明确；实际下一轮若发生记录为4，不重置成0，第5轮不自动开放。失败原文、费用和已有来源保留。

## 真实加载与恢复点

PID82856已完成付费718并在当前advance结束后优雅退出，running/pending=0。地图进展保留：实际Native mission-start初始化双方Supply6、先手已选、Marauder2部署域已出现，当前停在模型读取后的整项队形选择；未替它选择。

PID9143以 `--recheck-component-ability-fields` 继续同一 `inlKbk/projection-owner`，日志 `build/slice272-live-p5-v601.log`。没有重建房、军表、Plan或地图。实际矩阵判断／作者修订仍待，不能提前记成功。

主Run至718：27,353,989 Tokens／冻结价估USD6.393155088；597独立原型49,457 Tokens／估USD0.014868900另计；项目已知133,969,912 Tokens，719+与旧未知费用不含且不清零。估价不是服务商账单，未自行换算人民币。

## harness记录

harnessLoopUsed:true；targetGames:starcraft_tmg；promptPackRoutes:局部source_fidelity＋结构化能力字段核对＋独立question_coverage；harnessToolsCalled:同一私有Native实验／冻结来源读取；uiTraceEvidence:无新Web生成；agentDecisionEvidence:675原文与其真实审核；memoryTraceEvidence:原件保留、精确复用、不清计数；trainingTraceCandidates:无，trainingTruth:false；rollbackOrDemotionRules:矩阵冲突／必要证据缺失禁止策略准入；userVisibleChecks:最终军表Plan仍未交付。

## 真实纠错已发生；覆盖仍未收敛

真实721的矩阵拒绝Medpack反应归类，Host实际回交第4轮（不清零）。[727请求](../build/slice272-projection-owner-v565-inlKbk/727.request.json)／[727公开回复](../build/slice272-projection-owner-v565-inlKbk/727.reply.json)显示作者无人工补字段，分别写明Life Support伤害触发、Restoration受DEBUFF触发与非Biological限定目标、Medpack移动阶段主动治疗；后续实际逐能力复核通过8项。这证明该具体错误的反馈→模型修订→字段复核有效，不证明整个Teach／策略提升完成。

第4轮覆盖审核仍为supported＋3条requiredData，内容包括真实对局CP触发频率、其他收益补充实验、未来对手下一合法空间。Host保守阻塞正确；不应手清数组或盲开第5轮来源审核。原审核已停在该边界，下面v604仅分类这3条的必要性，不重新审数字或强迫全部放行。

## v602：每轮只接收本轮失败反馈

实际726还收到继承的v600 failedSourceClaim1/2，虽然本轮只剩v601能力矩阵失败；作者因此再次读已经纠正的火力原件。构造修订时现在排除旧failedSourceClaimN/sourceReview/rejectedConclusion，再从最新实际assessment精确生成本轮反馈。原问、通过证据、历史与round保留。

实际停点RED（3条而非1条）；首个修后检查误把正在运行的外部checkpoint变化当成该纯函数写盘，夹具改为核对传入state未变后一次GREEN。0Provider/Native/生产写。该夹具错误与生产修复分开记录，旧门不重跑。当前727已经完成，不为清输入而重买它；新建修订任务使用修正版。

## v603／605：相同Inspect不是新证据

实际744/749/753反复对同一df87f013父态inspect。完整保存回执含finish_activation域，但模型反复期待Medic部署域凭读取改变。旧无进展交接只覆盖spatial，因此此处没有触发。

v603增加完整Inspect比较：先执行当前只读inspect（不缓存跳过新合同），仅当上下文／绑定／参数／完整结果一致，标记没有新信息并进入既有专门推进角色。实际保存值对照定点红绿通过，但真运行未出现标记，不能据此宣布生效。

v605进一步修正调用接缝：先通过同一store保存并读回当前比较输入，再与旧持久化值比较，保留inspectionComparisonRef；不拿Native内存形状直接对比JSON持久化形状，也不改原receipt。真实执行器夹具（实际回执＋明确标注的own-undefined运输场景）先RED后一次GREEN；证明运输比较接缝，不宣称已定位真实Native的具体缺失字段。实际运行标记／模型下一步尚需观察。新合同／菜单变化不会被当成重复，无手选finish_activation或后续队形。

## v604：结构化待查项，而非删除未知

新增统一的review dataQuestions合同：necessary_fact（当前必要事实，仍阻塞）、future_condition（未来条件，保留为前提）、optional_probe（可选策略实验，保留记录）。由模型说明类型与公开理由，Host只做统一投影，不按关键词猜测。新鲜来源覆盖／最终域审核共用，旧回复不迁移。所有类型均保留原文，必要问题或来源冲突仍不能放行。

旧第4轮已核对的来源结果不重跑。仅针对其supported＋3条无类型待查项安排一次分类澄清；Host强制原3条逐项保留、不得新增/丢弃来绕过问题，前置来源／能力仍须通过。不是第5轮作者改写或来源重审。实际停点RED，新schema首次因枚举未显式声明字符串边界被registry拒绝，补齐声明后一次GREEN；fixture分类仅证明Host行为，真实分类仍待。

PID9143、24165均已在当前advance结束后安全退出。PID31498以`--classify-component-followups`载入v602–605继续同一Run，日志`build/slice272-live-p5-v605.log`；实际767已经发出，当前typed输入20,118字符。未重建军表／Plan／场景／账，未开Web或游戏。

账至766：主Run28,669,747 Tokens／估USD6.711303096；597原型另计；项目已知135,285,670 Tokens。767+及旧未知费用不含且保留。最终Plan0/6、游戏0/12、余4片不变。最终中文完整报告仍须等待正式两模式产物，本文只是施工证据。

## v604–606实际结果与继续点

- 实际767返回未闭合JSON，paid completed_invalid／8,704 Tokens已保存；既有局部纠错自动产生768，正确返回同一3条分类，无人工修改。不是网络失败或重买成功回复。[768请求](../build/slice272-projection-owner-v565-inlKbk/768.request.json)／[768回复](../build/slice272-projection-owner-v565-inlKbk/768.reply.json)。Host当前实际assess返回组件域answered/acceptedForStrategy=true、allOriginalFollowUpsClassified=true、required=0；2条未来条件和1条可选实验均在dataQuestions、conditions或optionalData保留。这只是本事实问题闭合，非最终Plan或整体策略优越性。
- 真实v605 Inspect已出现queryReuse.newObservation=false及inspectionComparisonRef，证明持久化层比较已实际生效。772收到专门推进输入，开始读旧菜单并提出推进激活；但773仍用同一父态重新inspect，说明提示不保证执行进展。
- v606在执行层按显式experimentOwnerId/orderRepairOf/repairOf等归属追到同一问题；完整当前Inspect与旧值一致时，不再作为新成功批次反复fan-in，而保留Native回执、标明不是规则非法、用EXPERIMENT_REPEATS_COMPLETE_INSPECTION交回方法负责人。其他问题可正常读取相同结果；不替模型挑下一战术。真实执行器fixture先RED后一次GREEN，0Provider/真实Native/生产写；实际生产的该拒绝分支尚未观察，不冒充已测。
- PID31498完成781/current advance后安全退出。PID37992同Run加载v606，日志build/slice272-live-p5-v606.log。组件分类结果复用，不重开审核。实际783模型自主改选已读菜单的finish_activation，Native成功（unit_activation_finished＋official_ability_lifecycle_applied），得到后继4b0b6191…；这是推进激活，不是Medic已经进场。[783请求](../build/slice272-projection-owner-v565-inlKbk/783.request.json)／[783回复](../build/slice272-projection-owner-v565-inlKbk/783.reply.json)。地图域仍未验收、草案仍r2。

账至781：主Run29,214,525 Tokens；已能按冻结价计算部分USD6.851402868，**另有767费用未定**（已知8,704 Tokens，失败receipt缺modelVersion，不伪造已报告模型来套价，也不因此卡生产）；旧未知费用另保留。597原型仍另计，项目已知135,830,448 Tokens；782+不在该小计。最终Plan0/6、游戏0/12、余4片不变。

## 最新原生进场证明：Medic 3已实际上桌

实际783自主完成Marauder2激活，787明确假设对方选择Pass并经Native成功，得到我方后继菜单（不是预测对手必Pass）。791选择真实Medic3部署域进行原生队形求解，未知未来候选经正常observed-choice读取后，793才显式选择完整候选执行。

Native `native-deploy-medic3` 实际完成：pieceId=u_medic_3，3模型，distanceTravelled=4in/speedAllowance=4in，movementActivated=true，branch=5cb31a2a…535553。后继inspect确认onTable=true、deploymentStatus=deployed、currentSupply=1；player1部署池仍capacity6/committed1/available5。后者是本冻结军表与被选能力下的原生结果，不可把控点Supply=1擅自改为0，也不是只看中心点或静态摆放。前述Marauder2进场与窗口链原件全部保留。

- [791实验工作单请求](../build/slice272-projection-owner-v565-inlKbk/791.request.json)／[公开回复](../build/slice272-projection-owner-v565-inlKbk/791.reply.json)
- [793实际候选选择请求](../build/slice272-projection-owner-v565-inlKbk/793.request.json)／[公开回复](../build/slice272-projection-owner-v565-inlKbk/793.reply.json)

这证明真实条件链「结束本方激活→假设对方Pass→观察新菜单→求解→读取候选→模型选择→原生进场→读回」，不证明全军进场时序、最早到达或策略优越。PID37992仍继续同Run的地图域收口／综合修订；最终计数不变，782起费用不在上述781小计。
