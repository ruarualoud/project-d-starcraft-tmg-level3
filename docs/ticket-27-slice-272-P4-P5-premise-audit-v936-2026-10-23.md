# v936：逐项理由审核与一次修复恢复

T27 / S272，P4/P5；2026-10-23。修复对象 H-CLOSURE-FALSE-POSITIVE-V935。

## v941真实结果：本项比较已收敛，不是整份Plan通过

**event8194 / Plan r17：产品实际写入 optional_comparison_closed。** 最新独立审核`e77ea54dcdf16180ad794c3ca5b1367b5595763b9c49408b360ba6ce469ff094`三项supported，19段原句逐项支持；方向断言与原生算术相符，明确保留未测边界。关闭回执`6651bf9961eefe85fbb4966cccc00c0a0fa5441c67ff460621ead6008a8dd53c`的 `nativeQueryAutomaticallyResolved=false / planApproved=false`，不是清空未知或全局准出。

| 实际顺序 | 输入与操作 | 返回及变化 |
|---|---|---|
| 1 旧否决恢复 | 原付费b5115d46…经正确schema、唯一字段投影及来源交接 | 8089保存12a27d3c…，仍requires_revision；0模型重发 |
| 2 明示授权 | 同产品recover-comparison绑定12a27d3c…及旧4次审核 | 只排一个作者任务、允许一次终审；不重算实验 |
| 3 作者首答 | 实际request d752f737…包含确切反馈、当前表/Plan及本次权限 | a40b80df…承认小Marauder +0.5278>0.5；正常补读引用、没有错误纠正循环 |
| 4 作者确认／提交 | 复用原工具证据、读后确认 | result92943b60…经产品提交r16→r17，outcome a1152aca…；armyChanged=false、2000矿/145气、仅componentPurposes改变 |
| 5 独立终审 | 读原测量/预算/作者取舍，第一次read、第二次结论后补读、第三次确认 | e77ea54d…三项及19段支持；原数字不变、不声称整体最优 |
| 6 核心关闭 | 同周期、最新作者与审核身份核对 | 8194关闭本项比较，未测实验不伪造成成功，整份Plan不批准 |

修前错误理由：“小Marauder未过足以替换的阈值”。修后：“小Marauder确已超过阈值，但该单次攻击期望不证明全军优越；选择保留现有Goliath/三Medic配置，承认放弃已测单次伤害收益，并保留大型方案未测的边界”。**是纠正事实并明确取舍，不是已证明战略优于旧版**；军表、路线、行动时序未变。到达回合、控点范围及更广泛替换决策仍未完成，不能发布正式Plan。

本次新增5付费调用：输入724,488、输出18,569，共743,057 provider units；Provider耗时合计104.522秒，不是端到端时间。实际人民币账单未取得，不臆估；原始回复、旧费用全保留。恢复阶段0新增Provider。授权和恢复定点门各一次GREEN，旧门未重跑。

剩余中等效率问题：Plan-only提交后逐条发布整份Plan资料，生产仍有明显本地等待；观察器反复保留41.7MiB状态快照曾OOM，但生产PID3046存活未重启。观察改为短生命周期只读，未借此改实验模型/策略或重复付费。后续优化须测真实瓶颈，不混同模型回复时间。

本轮diff：`roster-workflow-read-role-v1.mjs`修正常读取计数边界；`roster-hypothesis-cycle-v1.mjs`统一作者反馈和精确单次授权；product-journey/HTTP/客户端接同一恢复入口；workspace-run执行本次禁止新调查的范围。既有v939具体bug脚本修断言＋新增v941实际停点门；报告/CURRENT_WORK/根TASKS/MEMORY更新。无子代理、安装、删除、提交或全量门禁。

**总进度仍T27 5/6、T23 33/36，剩4片；正式Plan0/6、新对局0/12。** 以下“进行中／未修”均历史过程，不能覆盖本节实际结果。

## v941：恢复通过，获准的一次作者修订／终审进行中

v940真实产品恢复到event8089/r16。审核原件`b5115d46…`经本地无损恢复产生`12a27d3ca73d94198faaf80b67b88065c8741f1da0ff70f7c04ecec4035e1e03`：三项仍requires_revision，明确指出+0.527778>0.5、作者却声称未过阈值。原4次Provider调用仍4次，**本轮恢复0新增模型调用**。这次没有需要再付费确认，正常补读接续在本地完成。工作evidence_ready后按原四次审核上限停止，非新技术异常。

用户已明确授权一次作者修订和终审。新增产品`POST /workflows/:id/recover-comparison`，通过原`requestDecision`保存精确来源、周期、旧审核数和单次授权；重复同授权幂等，旧四次不归零，第五次失败仍停止。原正常反馈和授权反馈共用作者入队函数，并按`requestDecision`实际参数传递question，避免它被undefined覆盖。作者可正常读已有证据及修订，不授权新调查/实验；若提出新实验，同执行入口停止而非执行。

定点验证先复现“已获准但产品无续行入口”，然后一次GREEN5项：确切第四否决→单作者；旧记录逐值不变；重复幂等；错源拒绝；第五次失败停止；活动操作不得插入。证据：`build/slice272-v941-authorized-closure-red.json`、`build/slice272-v941-authorized-closure-green.json`，0Provider/Native/生产写。未重跑已过门。

真实原B同目录PID3046：`build/slice272-v941-authorized-author-live-1792734443553.log`，通过同产品HTTP入口消费授权，不重建、不清旧账、不启动A/对局。作者修订/终审结果仍待，不能把授权机制通过当Teach收敛。T27 5/6、T23 33/36、余4片，正式0/6、新局0/12。

## v940：正常补读交接修复，实际恢复进行中

v939停点已修：`evidenceReadRepair` 只有在 `remainingErrors.length>0` 时才检查纠错上限；正常读源保留历史计数，交后续确认，不批准结论。若下一回复仍无效，旧次数继续生效。原具体bug执行器修正“来源尚未交付却期望最终提案”的错误断言，验证真实核心read_evidence交接、否定结论/原件与次数不变。

- 一次定点GREEN：`build/slice272-v940-normal-read-handoff-green.json`，0Provider、0Native、0生产写。旧门未重跑。
- 原B8081/r16同产品恢复：PID93443，`build/slice272-v940-normal-read-live-1792733944925.log`。不重新生成、重算实验或买回原审核。补读后可能需要一次新来源确认；实际结果待。
- 用户明确许可恢复后一次作者修订与终审，保留四次旧审核与费用，不启动对局。该许可尚未消费；不等于事实/战略准出或全局增加上限。
- T27 5/6、T23 33/36，余4片；正式Plan0/6、新对局0/12。以下“最终状态”是v939历史停点，不是当前修复结论。

## 最终状态（v936–939）

**未完成自动收敛。** 逐项审核已在真实模型回复中拦截原阈值理由；自动恢复执行器仍有High，不能宣称全流程可靠。B原目录 **event8081/r16/blocked/0在途**，PID57251已退出；A/对局未启动。军表仍2000分/9单位，正式Plan0/6、新对局0/12，余4片。

v939执行器最终定点失败的原因已从代码确认：已消除格式错误、`remainingErrors=[]` 后正常取回来源，`operation.correction=null`；`roster-workflow-read-role-v1.mjs` 的 evidenceReadRepair 分支仍无条件用历史 `consecutiveCorrections>=limit` 拒绝正常交接。**H-PREMISE-RECOVERY-READ-COUNTER-V939 尚未修复**。下一限定交付：只在仍有真实错误时检查该错误重试上限；正常新来源交付保留原计数并转一次确认，不清历史、不自动批准或重放成功计算。按收敛规则停止，不再跑第五次测试或买第五轮审核。

本轮新增付费6调用合计807,852 provider units（输入789,118、输出18,734），旧账保留；v938重验0新增Provider。未取得账单实付，金额不臆估。11组局部检查通过；最后执行器验证未通过，局部绿灯不替代产品验收。

最终diff：5个生产模块（逐句依据审核、比较关闭、角色请求/结果与恢复、比较周期、唯一归属字段投影）；4份具体bug调试脚本；本报告/CURRENT_WORK/根TASKS/PROJECT_MEMORY。无子代理、安装、删除、提交、全量验证或旧门重跑。

## 已完成的工程交付

- 原三个 `supported` 汇总不足以准出。由原作者的 selectedOption、declinedAlternative、decisionBasis、whyNoFurtherEvidenceNeeded 和选定问题理由提取逐字片段，独立审核每段，不改原件。
- 审核员声明原句所采用的数值方向和布尔断言；Host 对照同一不可变比较回执，核对当前来源与精确算术。错误断言不能和 supported 同时通过；正确拒绝交作者，不要求审核员重写成支持。
- 机会成本须引用作者实际写出的保留贡献与放弃收益，禁止审核员代写理由。数值优势不强迫换表。
- 同一个接口用于实际请求构造、返回验证和最终核心判定。不能仅在 prompt 中提醒而最终只看标签。
- 已关闭但缺该合同的旧比较不自动准出；通过同产品 requestDecision 记录一次具名修复任务，最多追加一次审核，三次旧审核计数及费用保留。再次失败不续赠。

## 定点验证

`scripts/debug-slice272-closure-assertions-v936.mjs`。

1. RED：原 B/r15 与真实审核 47091c7b 在核心判定中确实被接受，复现误放行。
2. 初次 GREEN 未进入检查：新增 Schema 使用 const／缺少该仓库要求的界限，模块加载失败。没有模型请求。修为既有 schema 子集。
3. 修后一次 GREEN：6组通过（原误放行不再接受、相反阈值拒绝、正确保留不强制换表、漏项/错源拒绝、真实请求中的原句与新返回合同、三轮历史保留且只追加一次）。

结果：`build/slice272-v936-assertions-red.json`、`build/slice272-v936-assertions-green-r2.json`。均0Provider、0Native、0生产写。不重跑已通过旧门。

**边界**：Host能证明算术和引用对应，不能用静态代码证明自然语言含义或全局战略最优。逐项语义判断仍需实际模型验证；模拟的正确保留不是实际策略产物。

## 真实验证

同B `slice272-product-generation-v645-8aBuEV`，event7958/r15恢复，A未启动，未重建军表、房间或旧账。

1. event7967：同产品生成具名修复作者任务，保留旧3轮。实际请求 `a5f0e0af…` 包含修复记录、逐项原句和比较数据。
2. 作者两次返回（首次自动补读原件）后由同产品提交r16，结果 `28544e0d…`。军表仍2000分/9单位；Plan明确补入保留Goliath/三Medic贡献及放弃小Marauder单次收益，但 `whyNoFurtherEvidenceNeeded` 仍误述“未超过阈值”。不能叫策略改善或已修正。
3. 新审核读取原生证据后，`339af474…` **实际指出该句错误**，3汇总均requires_revision，逐项 `/request/whyNoFurtherEvidenceNeeded:2` 返回 `e866:reverseQuery/claimedSatisfied=false`，与工具true相矛盾。未再次误放行。
4. 新审核输出将tradeoff错放到根而非premiseAudit；三次格式补正仍相同，8074自动停止，PID41584正常退出。此处是新增字段协议恢复缺口，不是模型没有发现语义错误。

### v937–938：修复真实格式恢复缺口，不重买审核

- v937：现有无损字段恢复仅支持“子层→父层”，本例为反方向。新增一跳、唯一schema归属的“父层→子层”投影，仅在比较审核接线；不覆盖目标、不合成缺失父对象、不猜多重归属。保存原始回复及搬移证明。
- 原 `b5115d46…` 付费否定回复在现有saved-schema-revalidation入口RED，修后一次GREEN3项：恢复资格、实际字段/否定结论逐值不变、冲突/歧义/缺父对象拒绝。旧门不重跑。
- 全语义预检又发现引用集合遗漏作者顶层publicReason：审核所引“higher ... (2.5833 vs 2.0556)”确实在原作者publicReason，原编译器只收关闭字段，导致假报非原文。已按原作者artifact与pointer补入，不放过虚构引用。一次GREEN2项：实际引用有效但阈值理由仍否决；虚构引用仍拒绝。
- 用同产品原目录PID57251重新加载，event8075已经排入**原付费回复本地重验**；不发新审核、旧费用/拒绝/原件保留。最终停点待补。

当前新增6付费调用，789,118输入＋18,734输出＝807,852 provider units，Provider时间合计99.851秒（不是端到端时间）。本轮账单实付未取得；包含上述重复格式纠错，不隐去失败成本。

### v939：资格检查不等于实际执行器通过

v938真实重验到8081再次停止，0新增调用：资格检查选了专用schema，但执行器对revalidate跳过职责投影，使用通用审核schema，反而将premiseAudit本身视为多余字段。

在真实执行器以原付费reply和内存store复现RED后：仅当原请求确有专用premise合同且身份一致才恢复同合同；未授予新的调用/事实。一次具名恢复key仅适用于已记录的误选schema故障，不清轮次。

逐步调试记录：

1. RED：真实executor报premiseAudit/tradeoff additional_property_forbidden。
2. 修后首次测试夹具误以为不允许再读磁盘证据；修为复用生产core的read_evidence，依然0Provider/Native/生产写。
3. 实际执行暴露重复填引用要求：逐句审核已声明1539，汇总checks没重复列出。改为将同一模型回复已经声明的引用无损合入事实汇总check，再走原有来源/已读校验，记录projection，不替模型选择证据或改结论。
4. 具名修复后最后一次测试仍停：来源1539需要正常补读，读取成功、remainingErrors空、correction=null，却被旧纠错计数拦截。已停止该循环，未改最后一处逻辑或重跑。见 `build/slice272-v939-executor-{red,green,green-r2,green-final}.json`，其中后三份文件名含green但**pass均false**，不能当成功凭证。

新审核明确拒绝的依据：`/request/whyNoFurtherEvidenceNeeded:2`、比较`e866:reverseQuery`、原句claimedSatisfied=false而工具true；这是可直接返回作者的精确反馈。还未成功经过产品恢复交到下一作者，不能声称闭环已实现。

## Harness记录

- harnessLoopUsed: true；targetGames: starcraft_tmg。
- promptPackRoutes: roster_workflow_strategy_decision → roster_workflow_final_review。
- harnessToolsCalled: 同产品requestDecision/资料读取；当前离线验证无真实工具执行。
- uiTraceEvidence: 本轮无UI操作；同Web/App产品链路，不声称截图验收。
- agentDecisionEvidence: 原3fe809ce作者、47091c7b审核；新真实结果待。
- memoryTraceEvidence: 原记录只读保留；未发布战略经验。
- trainingTraceCandidates: 无；trainingTruth=false。
- rollbackOrDemotionRules: 原supported无逐项审核不能放行；错误数值或必要事实仍阻塞；追加审核失败停。
- userVisibleChecks: 数值正确不再代替理由正确；正常保留不强迫改表。

完成数保持：T27 5/6，T23 33/36；余S272/S248/S249/S250四片，正式Plan0/6、新对局0/12。
