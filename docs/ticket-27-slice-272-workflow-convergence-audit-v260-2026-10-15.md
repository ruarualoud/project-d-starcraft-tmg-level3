# S272 v260 — 军表／Plan／Teach 全流程设计与代码差异

日期：2026-10-15。1–8节保留v260诊断背景；第9节记录v261/v262整体修复及当前真实续接，不是全链路通过报告。

状态：T27/S272 5/6；T23 33/36；主线剩余 S272、S248、S249、S250 共4片；完整实验验收0/12。
v260诊断时未新增模型请求；v261/v262后已恢复原A/B真实生产。始终未启动新房间、未重跑已通过验证。

## 1. 产品合同：一个过程，不是写表完成后另起一份无关联计划

A固定军表，模型可改Plan，不可改购买；B从头写表，模型可改军表和Plan。
两者应共享问题、证据、修订和最终验收语义，区别只是编辑权限。
规则器判断合法性和确定性结果；模型依据Skill、证据和假设作战略取舍。
Teach不是第二个规则器，也不要求模型接受审查者偏好的保守打法。

同一会话至少保留：冻结上下文、当前军表版本、当前Plan版本、二者一致性状态、
稳定问题清单、原始查询证据及适用条件、公开决策理由／修改记录、运行断点。
版本是身份与依赖定位手段；版本一致不等于文字正确，不能用更新绑定代替更新内容。

## 2. 业务状态与转换

| 状态 | 输入／工作 | 允许转出条件与交付物 |
|---|---|---|
| ContextReady | 冻结本次地图／任务／部署／规模、己方权限、对手已知信息、数据和Skill | 工具能力与上下文可读；不虚构对手私有计划 |
| InitialHypothesis | 从Skill、任务和地图提出初步获胜路线、资源需求与风险 | 初稿可以不完整；目标、预测、已知事实分开 |
| CoDesign | B按用途选择／替换／删除单位与升级，并完善路线；A给既有单位分工 | Builder检查候选合法性；军表变更必须伴随受影响Plan更新或显式待对齐 |
| AlignPlan | 检查新增、移除、升级、规模变化影响哪些职责／入场／协同／假设 | 模型提交当前军表理由，或说明为何保留原策略；未对齐不得进入下一轮Teach |
| TeachQuestions | 对当前草案中影响胜负的主张提出反证、替代方案和定量场景 | 问题保持稳定身份及依赖；部分合法军表即可Teach，不必等满2000 |
| Investigate | 规则／地图查询、概率计算、条件局面、原生动作试验 | 每个结果记录实际回答的问题、前提、范围及错误类型；不能用一次成功读取替代问题答案 |
| DecideAndRevise | 模型选择保留、改Plan、改表并改Plan，或追加必要调查 | 写入实际结构化变更及公开理由；只使受影响结论失去当前适用性，原证据不篡改 |
| FinalAcceptance | 对完整当前军表与Plan验收 | 本次目标2000分合法、内容一致、关键工具事实可靠、无Critical/High工程问题；明确条件策略可保留 |
| ReadyForRoom | 输出当前军表、Plan、证据／假设摘要和重规划触发条件 | 产品端和实验走同一入口；不得拿旧版本通过标志放行新版本 |

主循环：初步路线 → 选型与Plan共同演进 → 对齐 → Teach／调查 → 决策修订 → 增量复核。
查一次资料不要求重写整份Plan；但改变军表、关键证据、路线或假设时必须记录影响。
购买候选不合法时保留为被拒提案，不替换当前合法候选，不删除已形成的策略理由。
所有修改由现有Builder／结构化Plan操作落盘，模型不手写合法回执或假装已经改过。

## 3. Plan允许包含什么

| 类别 | 可进入Plan的形式 | 不能声称什么 |
|---|---|---|
| 规则／数据事实 | 对应冻结来源的规则与数值 | 角色语气、Skill或模型意见不能覆盖规则 |
| 确定查询事实 | 明确局面、单位、阶段、位置下的实际查询结果 | 当前状态结论不能自动推广到未来回合 |
| 已验证的条件结论 | 前提成立时，路径／攻击概率／交换结果如何 | 假设摆好不等于能合法进场到那里；期望伤亡不等于必然伤亡 |
| 战略／对手假设 | 显式假设、依据、触发条件、收益、风险、验证及备用路线 | 不能当成对手一定如此行动、全局最优或必胜事实 |
| 目标 | 希望获得的分数、控制区、交换任务 | 目标不是已经达到或可保证达到的结果 |
| 工程未解／过期证据 | 草案问题清单；修复、调查或移除对它的依赖 | unknown不是false，也不是成功；不能支撑正式Plan的关键确定性断言 |
| 已被推翻／非法方案 | 历史中保留反例及淘汰原因 | 不能作为当前可执行路线继续使用 |

例如“假设某队能在第二回合到点X”先是待证实的可达性主张。
静态摆放成功只能证明该布局成立；原生入场／移动与控制查询才回答相应可达／占点问题。
即便该路线合法，对手是否阻挡仍是条件假设；Plan应写阻挡时改走哪里，而非要求证明对手必然不挡。
本设计不要求穷举未来或证明胜利；要求每个关键结论不要超出证据的实际范围。

## 4. Teach如何推动流程，而不是原地质疑

- 问题状态：待调查、条件已支持、已反驳、策略已改而不再依赖、工程阻塞。
- 模型可以坚持有依据的冒险策略，公开收益／损失比较和备用方案；Teach建议不自动否决。
- 新军表重新评估受影响的问题，不因新hash重建全部题目；不相关旧证据保留原范围可继续引用。
- 修复一个坏查询仍不能解决原问题时，回到问题层重新选方法，而不是无限纠缠原参数。
- 收敛看问题是否真正关闭、证据是否相关、决策是否落实，不看调用数、改名或单纯文本变长。
- 有进展可继续依赖调查；同一问题无进展遵守用户三轮收敛约定，停止该故障循环并保留断点。
- 所有问题要有处置，但不要求所有未来不确定性都变成事实。Medium记录继续；Critical/High阻塞。
- 最终准出同时检查事实可靠性与战略说明完整性；不能把格式正确、Teach.completed或模型accept当成充分条件。

## 5. 运行状态与业务状态分开

业务进行到Investigate时，运行状态可以是running／paused／awaiting_result／recoverable_error。
网络中断不把业务状态退回InitialHypothesis；保留军表、Plan、已成功查询、公开答复和费用。
已经保存的答复继续解析；已成功证据只读复用；部分失败场景应作为部分失败场景恢复。
未知付费请求不能假装没发过并盲目重发。严重工具能力缺口也不能靠模型编造事实自愈。

“保存场景缺少可恢复位置”的实际含义：B的Teach假设布局中某单位求解失败，
原记录只有anchor、completeModelPlacement=false，没有完整模型坐标；旧恢复器却要求
每个单位都必须有成功布局。它不是正式房间丢了棋子，是恢复器无法表示自己保存的部分失败。
恢复后仍只能用于诊断／纠正及不依赖失败部分的事实，不能冒充合法完整场景。

## 6. 当前代码是否一致：只部分一致

1. **Plan与军表不同步（已证实）**：`iterative-roster-plan-session-v1.mjs:48`的publicPlan
   只检查基本形状／地图证据，再注入当前candidateHash；没有证明正文描述当前军表。
   B真实r2→r6，4单位→8单位、最终合法2000，strategy完全相同，仍解释旧4单位；
   更正：victoryRoute不是逐字相同，含scoring→marker scoring等少量措辞变化，正是旧对齐门漏过的原因。
   v260新增对齐提示和调度门仅识别“改表但原文照搬”，且尚未GREEN；不是完整语义解决方案。
2. **已有提前Teach和改Plan能力**：`iterative-roster-draft-teach-v1.mjs:14`起按候选+Plan建立
   草案Teach；`revise_plan`可不改军表单独改策略。不能说目前完全没有协同演进。
3. **证据复用尚非问题级增量**：草案改变时生成新snapshot，只继承旧framework、已有证据与
   previousInquiry；没有统一的稳定问题依赖清单，因此“保存了历史”不等于“只查受影响问题”。
4. **A/B上层编排不同**：A在`preset-roster-journey-v1.mjs:82`先来源审核／修订，再Teach、
   修订及再审核；B另由`agent-selected-roster-journey-v1.mjs`衔接选型、审核与Teach反馈。
   共享底层工具不等于共享状态机。
5. **最终未解门语义不一致**：A的appliedTeach（preset文件:20）显式要求unresolved为空；
   B的currentFramework（agent-selected:486）检查完成及Plan绑定，
   `rosterTeachAcceptanceIssuesV1`（roster-progress-supervisor:23）只收来源High/Critical与backlog，
   `accept_teach`（iterative-session:769）不单独要求Teach未解集合为空。
   这是静态可确认的合同差异；本次没有通过对局验证实际越过其它下游门，不能报已放行漏洞实测。
6. **Teach.completed不等于问题解决**：framework:1039明确保存unresolvedQuestionIds再完成；
   这是可用的中间状态，但外层必须读取其结果。引用绑定还明确interpretationVerified=false
   （:722），引用真实不等于推理正确。
7. **只有部分自适应**：主调查支持不同有效结果推进（capability-guide:113），但某些续查分支
   仍使用固定追加窗口；A同Plan／问题集合只补一次恢复；几何修复又有自己的进度扩展。
   本次B读额度实际上已从3增长到11，不应继续把问题误报成“全局固定3次”。本轮未改额度。
8. **恢复和观察状态缺口（已证实）**：B部分失败布局不可恢复；A产品正确暂停，外部runner却
   assert必须completed，将正常暂停显示为失败。需分别修产品恢复与观察器，不能重建会话掩盖。

## 7. 新旧效果与当前停点

- 旧B在1020分时出现17轮相同查询、未进入Teach；新B已合法2000且有提前Teach。
  这是阶段推进改善，不是最终策略质量或完整收敛证明。
- 新B当前r6/2000，37请求、34已知用量调用，6,861,818已报total units；
  停在ROSTER_TEACH_RETAINED_BRANCH_POSITIONS_MISSING；本次恢复没有新增付费请求。
- 新A Plan6来源审核干净，完整Teach未准出；84请求、82已知用量调用，8,693,246已报total units。
  请求84为ambiguous／费用未知；暂停文件存在。不能盲目重发84。
- 两组均stopped；无新房／无对局。完整流程“确实优化、收敛、自适应”目前仍未证明。

## 8. 修复交付清单（同一S272，不新包装成多个实验）

1. 统一军表／Plan协同推进及A/B接受合同：当前草案对齐、明确问题类型、最终检查一致。
2. 问题与证据增量生命周期：区分条件策略和工程未解，按实际依赖复查，失败查询可返回问题层。
3. 恢复合同：准确恢复完整／部分失败场景，正常暂停不报失败，付费不明请求先核对。
4. 仅对上述实际bug定点验证，再同版走完A/B真实产出；未完整接受不启动对局。

v260已有但未验证补丁：iterative-roster-plan-session／iterative-roster-flash-model-port、
pregame-scene-laboratory／roster-teach-evidence-port／roster-teach-framework；
对应两个实际bug复现脚本verify-slice272-roster-plan-handoff-v260和partial-branch-restore-v260
已得到RED，GREEN尚未运行。runner通用resume-product改动已做一次语法检查通过。
这份报告完成静态核对与设计，不声称以上四项已实现。

harnessLoopUsed: true。gameId=starcraft-tmg；角色为离线roster strategist／Teach／证据查询，
无Opponent正式动作、无Companion变更。skillPromotion=false；trainingTruth=false。

## 9. v261/v262交付与真实验证（当前）

### 9.1 整体修复

- 共享`roster-planning-workflow-v1`：当前Plan绑定、Teach调查完成与未解项共同决定接受；问题清单保留稳定标识、来源/分支条件、公开理由和触发条件。条件假设不被当成已证明未来，unknown不自动等同false。
- B草案：军表变更但rationale/revisionReason仍照搬时，先由原作者修订Plan，再进行Teach；不能靠胜利路线几个词变化绕过。合法提案先完成Plan解析再更新军表；阻塞Teach反馈允许回到改表/改Plan，不能直接accept。
- A固定表：查询修复未解后可以修改实际Plan主张并再Teach，军表保持固定；不把无法查明的问题隐藏成已完成。
- 证据生命周期：同军表/地图/任务/来源的完全相同初始问题可复用原回执；变化问题保留旧调查上下文。当前是保守精确复用，不宣称完成通用语义依赖增量编译。
- 原生场景恢复：完整坐标或失败anchor-only均按原保存状态恢复，核对原状态一致，不重新求解、不升格合法性；实际product facade已补恢复端口，避免只在底层单测里可用。
- 暂停修复：外层必须等待内层保存终态再退出；Teach接收pause控制，显式恢复清旧pause。正常暂停不再被观察脚本断言为失败。此前A请求84的HTTP200/正文0、PROVIDER_ABORTED与该提前关闭链路一致，并非已证实的断网。
- A原产品Run接收精确请求恢复参数，交现有服务核对原请求/授权/费用；每个未知请求至多受控恢复一次，不清旧账、不自动重建Plan。实验观察器只传该产品参数。
- 每个关键阶段持久化紧凑workflow转移；付费答复、请求正文和费用仍保存在原存储，不复制成第二套大历史。

### 9.2 已执行验证与范围

`build/ticket-23-three-arm-performance-baseline-20261010-v1/workflow-v261-6ku70i/report.json`
与同目录`traces.json`：5/5。

1. 真实保存B r6陈旧Plan先返回原作者。
2. 原生部分失败假设场景精确恢复，无额外求解/房间动作。
3. A HTTP→未知查询→Plan修订→再次Teach→当前版本接受→重启不重复。
4. A暂停等待在途子任务保存，不让外层提前关闭Worker。
5. B真实session/coordinator→对齐→未解反馈→修订→再次Teach→当前接受，军表未被测试替换。

第一次组合4项通过，B夹具ID不足8字符导致HTTP400；仅修夹具后恢复失败项，4项通过结果原样引用，未重跑。
Provider、部分workspace与arrival为夹具；该5/5不证明真实策略正确/全产品/对局已经验收。

另`verify-slice272-preset-dispatch-resume-v262.mjs`：夹具补齐必要startPlanning后，真实HTTP Run返回409复现漏转交；修HTTP/coordinator后一次GREEN，exactRecoveryCalls=1/newPlans=0/providerCalls=0。无授权请求仍拒绝。

### 9.3 真实续接和下一步

2026-10-15 13:17Z观察：A PID83392／B PID78634均经进程表确认存活。
A原fresh-v249 Plan6正在恢复Teach，请求84旧费用未知；B原fresh-v249已到r8、合法2000/8单位。
B真实答复已经重写旧910分/4单位说明，列出新增第二Marauder、第二Goliath及两Medic；
并纠正“仅靠原三点基线能拉开10分”说法，明确该声明赛程只拉开4分，需要额外击杀/翻点。
这是修订生效证据，仍需Teach/source审核，不能据此报策略已通过。B请求40进入新草案Teach。
已报累计单位A8,693,246／B8,189,577；B较停点增加1,327,759。旧未知费用另存，不能按0计。
本阶段不启动对局；两组均完成当前Plan＋Teach准出后，继续产品UI/Room接线验收。

### 9.4 Diff摘要（不把历史未提交改动算成本轮）

- 新增共享workflow模块；修改session、两个journey、progress supervisor与product port：同步、接受和断点。
- 修改draft Teach/framework/service：问题范围、精确证据复用、暂停/恢复。
- 修改scene laboratory/evidence port/product composition：原生部分失败恢复及实际接线。
- 修改HTTP/观察runner：同入口受控续接、正常暂停记录。
- 两个既有具体bug脚本与v261组合、v262恢复验证；TASKS/CURRENT_WORK/本报告/PROJECT_MEMORY已更新。
- 未改规则数据、军表购买、地图几何或线上Skill；未提交git，未重跑无关门禁。

harnessLoopUsed=true；targetGames=[starcraft-tmg]；promptPackRoutes=[roster_strategist,teach_framework,fact_probe]。
harnessToolsCalled=[product_run,structured_plan_revision,saved_evidence_restore,teach_queries]。
uiTraceEvidence=本次无新浏览器截图，只有产品HTTP与原会话记录；agentDecisionEvidence=B r8公开Plan。
memoryTraceEvidence=workflow/issueLedger/原历史；trainingTraceCandidates=[]。
rollbackOrDemotionRules=实际语义/原生范围不符则不准出，不修改旧付费证据；userVisibleChecks=真实完整准出待完成。

## 10. v263真实恢复暴露的路由断点缺口

A v262在新请求85发送前止于`ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED`，没有新增Provider dispatch／模型费；旧84未知费用仍保留。
原84使用`roster_teach_fact_probe_v1`，恢复85却选`strategy_inquiry_v2`：旧replyCorrections中存在不属于当前批次的pending行，恢复启发式把本批切回旧investigator。不是新增问题清单字段导致的编码变更，也不是模型异常。

修复`preserveRosterTeachPendingInvestigationPromptV1`：本批显式保存的路由优先；旧数据当前批次沿用已保存的事实调查链路，不受其它旧pending行误导。发送前将roundIndex/route写入断点，不等回复后才记录。
`verify-slice272-investigation-route-resume-v263.mjs`读取实际A state与request84，已RED→一次GREEN；额外确认显式保存的旧路由仍优先，不强制所有历史请求变新。0Provider/房间动作。
A PID91996于原会话继续请求84的受控恢复；授权尚未发生实际重发，不能把85本地拒绝算一次付费重试。完整request/body一致性门未绕过。
B PID78634继续：请求40议题生成已完成，当前10项初始查询记录落盘、继续原Teach；无对局。所有既有局部门禁不重跑。

## 11. v264按用户最新指示从头验证

用户明确“不再恢复，找到不能自恢复的问题修好，然后从头走”。停止旧v249，不继续其调查或导入结论。

已确认的恢复缺陷：外层暂停提前关闭在途Worker、恢复器不支持自身保存的部分失败场景、恢复路由被其它历史纠错行覆盖、产品Run未转交已有受控恢复接口。前述局部门禁均通过；其中v263旧A实际请求86与原84一致，已经返回并保存，再因pause停止下一请求87，旧费用不抹去。这证明该具体恢复/暂停路径生效，不代表任意网络/工具故障都能无限自愈。

旧B请求41公开答复和费用已保存，但仍在执行只读假设批次；pause意图已持久化。按最新停止指示，仅对确认的PID78634发SIGTERM，不等待被放弃的旧调查继续计算。最后原A91996/B78634进程均不存在。B观察JSON可能仍显示running，**该旧状态不代表进程存活，禁止恢复**；原数据和暂停标记留存，未删除。

新v264启动：A PID4855，B PID4856，路径分别为本base下`A/fresh-generation-v264`和`B/fresh-generation-v264`。
两者使用同一版`run-slice272-fresh-generation-v240.mjs --fresh-v264`和普通产品Run。
A只从既定军表输入重新生成Plan/Teach；B从空表开始共同生成军表和Plan。原v249的问答、Plan、Teach及证据不迁入。
冻结的地图/任务/部署/规则数据/策略Skills保持不变，以便比较工程流程。房间和对局仍后置。
观察入口仅新增通用generation选择及累计旧费用，语法一次检查通过；这不是一次新的业务门禁或已通过验证重跑。

旧fresh-v249累计已报：A83调用9,122,326units，B38调用9,172,440units；此前v240及未知请求费用独立保留并进入新报告累计口径，未清零。
下一步只看新v264实际推进、工具事实和策略收敛；不再通过修旧稿声称完整从头生成已稳定。

13:38Z实际进展：A新会话`rws-5c8ed89c-06a0-4c29-910d-f33d17421516`初步策略已返回，进入teach_challenge；B新会话`iterative-web-94c1b8fa-7e87-482b-8a1d-408e1eca095d`已从查询→提案推进到r2，合法临时920分/4单位并同时保存初步Plan，进入早期Teach。920不是最终准出，后续仍需补足/重选至2000并完成当前Plan/来源/Teach验收。新A已报216,473units/B472,040units，仍在更新；本次不重置旧费用。

13:43Z真实观察（无新代码/无重复门禁）：两进程经ps确认存活。A已经Plan3并进入final_plan_review；B仍为r2临时军表，在早期Teach调查。
B第一批9个问题中的7项初始unknown进入模型自纠错，后续已有地图/编队/控制查询返回advisory；这不自动证明完整行动合法。4批25操作时记录18个不同结果和1批无进展，随后第5批推进到23个不同结果、无进展计数归0，repairs=[]。这是超过固定3批且按实际证据继续的运行证据，不代表已完成收敛；还需观察调查→修表/Plan→最终2000准出。
本次未手工改模型策略、未补规则数据、未新建测试或重跑旧绿。两组均未进入对局。
