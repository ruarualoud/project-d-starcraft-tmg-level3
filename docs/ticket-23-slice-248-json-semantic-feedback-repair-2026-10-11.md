# Ticket 23 / Slice 248 — C 的 JSON 语义纠错接线

## 当前结论

**最新覆盖：费用上限取消，ABC共同v12实际网页续跑**。旧停点和下文快照只作历史，不表示当前停止。单个typed恢复事件登记后，已有store Host-only89870一次exit0，双席Plan/合法记忆/跨席隔离通过，0Provider/创建/五步重放。共同v10的费用告警根因为费用继承错误依赖可选旧通知窗口；安全收口已闭合，实际原B恢复数据RED97902→唯一GREEN1812，原32.048687保留。用户取消所有CNY自动上限，分组账/每100元通知保持；实际Host/Provider stack/LiveDecision/Web传null，不清历史用量。容量、超时、凭据和防无限调用保护不变。

V11实际Host已加载null，但新--no-cost-limit参数被Web误判为重新开局配置，在模型前退出/0新费用；根因是我只补了参数转发、漏同步分类。修成单一isRuntimeCostArgument后，实际v12 Hosts6482/6483/6484、Web7872/7873/7874、独立monitor7875由scheduler6839共同准入，三组真实progress均running/第2回合。A52/B恢复1/C82此前已接受动作已补录，未重执行；screens325/9/519。B正确显示原费用32.048687+恢复分支0.824371=32.873058，含旧外部账累计A114.109622/B174.575216/C163.040498。独立监控中的200只是下一通知节点，不是上限。

本轮diff：6生产文件——continuity事件合同、费用祖先、Web驱动、Host、Provider stack、LiveDecision——及CURRENT_WORK/本文/根TASKS/根MEM；无Prompt/Skill策略改动、无新测试、旧绿/全量/性能/地图重跑、代理K3、删除或提交。实际来源common-v12-source-manifest.private.json记录formalAdmitted=true及真实Host/Web结果，后续新动作和完整对局仍待，不能据此提高完成度。T23 33/36、T27 5/6，余248/272/249/250四片、完整0/12。harnessLoopUsed=true；routes=selfplay_agent_prompt/harness_optimizer/fact_probe；tools=原生Host准入/真实Web恢复/实际成本复现；memoryTraceEvidence=原合法seq241/262、真实typed事件及Host恢复回执；uiTraceEvidence=原接受动作真实补录；trainingTraceCandidates=[]、trainingTruth=false。后续遇到真实High先ALL安全停止再修复；已有授权不再逐项请示，三轮不收敛仍停止报告。

**唯一授权验收已闭合失败，覆盖下文执行中快照**：native80341 exit1。本次修改确实解决了checkpoint0假设：初始Envelope零journal验证、原r69回执签名/完全一致棋盘、双席创建及target Replay均通过；已绿五步重放0、Provider0、原房历史/原费用32.048687保持。新停点是恢复器发出 `rules_repair_branch_opened`，但 `match-decision-continuity-v1.mjs` 的 `QUERYABLE_EVENT_KINDS` 未登记此类型，normalizeEvent直接拒绝。这是我们上一轮新增恢复记忆时遗漏消费端合同，不是数据/模型/旧修复失效。源记忆lock实际P1seq241/P2seq262正确，非法计划263+未混入；目标有部分记忆初始化，尚未准入，不删不重建。唯一追加次数已用、无自行第五轮；正式ABC停止。

下一交付物：①统一该typed恢复事件的写入/查询合同；②获准后仅对**已有恢复存储**做一次Host-only验收（不创建/五步/模型重跑）；③成功后ABC同最终源续跑。当前仅一生产恢复CLI和状态文档改动；无新测试、旧绿/全量/性能/地图重验、删除/提交/代理K3。证据 `B/legal-prefix-admission-authorized-v9.private.{stdout,stderr,result}`、`common-v9r1-source-manifest.private.json` formalAdmitted=false。T23 33/36/T27 5/6余4、完整0/12。harnessLoopUsed=true；routes=harness_optimizer/fact_probe；tools=原生恢复/签名核对/实际Host准入；memoryTraceEvidence=精确合法源lock及真实事件拒绝；trainingTraceCandidates=[]、trainingTruth=false；userVisibleChecks=棋盘恢复通过而整条准入未通过，不伪报可续跑。

**用户已批准唯一点补，实际准入执行中**：仅修复用器假定genesis存在checkpoint0这一来源错误，改读原生initialEnvelope；零动作原生验证后核对原r69签名回执及完全一致的棋盘。Native80341已创建双席恢复存储、同逻辑Room、replayedReceiptCount=0/providerCalls=0/保留原32.048687费用，记忆-only Host准入仍在执行，未冒充exit0。原房/五步已绿前缀/来源地图/军表Plan不重做；正式ALL须等本次实际准入通过。本次只改恢复CLI一处、无新常规测试或旧绿重跑。T23 33/36/T27 5/6余4、完整0/12。

**阻塞审计最新覆盖**：上一目标轮是实际记忆修复进展，本轮不是进展或verified wait。定点PS确认B第三恢复39502及A/C补录41385/41386/44207/44208皆缺席；第三stderr仍为assert(cp)，带双席目标目录未创建，原已验证恢复回执仍在，v9未正式准入。同一“三轮后唯一点补例外未答复”已跨原停点、截图补录、记忆修复及本轮重复；安全独立工作已完成，按既定顺序不能绕过B启动新局/只跑A/C/提前扩展后置18图。长任务达到blocked审计条件，完整目标保留、不宣称完成、不自行paused。需要回复前面的单次定点修正与验收问题；不重放已绿五步、不调用模型，准入后再三组同版续跑。T23 33/36/T27 5/6余4，完整0/12，费用/原房不变。

**记忆修复最新覆盖**：C76/C77旧对手判断无法退出当前Plan的具体bug，已实际RED53710→唯一GREEN55212。只改三处生产接线与一个具体复现脚本：完整当前假设快照可替换旧列表，旧叙事按来源局面保留而非变成事实；历史付费输出不改，0模型/原房写。正式三组仍停，B第四次恢复准入仍等待唯一范围例外；共同代码候选v9未正式准入。没有把本次受控纠正夹具当成新模型已改善的实战结果。

**截图最新覆盖**：A51/C81原动作的真实Web补录均已成功：A50→51、C80→81，权威/用量不变，0新动作/模型/网页写请求。实际完整桌面及Agent控制截图已查看，均正常元素截图、无降级报警。只结束本次补录和观察进程；正式三组仍停，B恢复第三轮的定点补验申请仍待回复，没有第四次恢复或新模型调用。

**最新覆盖**：B原r64 checkpoint加5回执精确恢复到合法r69已实际exit0，新规则拒绝r70，原房不改/0模型。恢复Host的第三轮仍失败在复用器假设r0有checkpoint（实际只有initialEnvelope），已按三轮规则停止，已提出仅该假设的定点例外申请，未跑第四次。正式三组仍停止；A/C只启动原房截图补录主机，不派发新动作。下文详细状态见“B合法前缀恢复与三轮准入停点”。

下文旧运行快照已被本节覆盖：三组现在停止，不是运行中。A 的 r51 已执行但元素截图超时，独立监控在20:19:20UTC触发共同停止、20:19:45闭合；最终只读权威A51/R1Cleanup、B71/R2Movement、C81/R2Movement，Web已录50/71/80。B r69/r70同Queen重复同名Active是真实High，已完成规则限次定点修复；截图超时亦已修成明确标记的整页降级。两条具体bug各RED后一次GREEN，0模型/原房写，旧绿不重跑。B合法边界恢复及A51/C81实际补录待做，未启动新代码对局、不将污染历史当干净策略验收。T23 33/36、T27 5/6，余 S248/272/249/250 四片，完整0/12。

## C76/C77 过期对手判断的定点接线修复

### 来源及范围

- 上轮是实际进展：A51/C81原接受动作的真实Web截图补录成功、0新动作/费用。继续轮没有把旧running字段当活进程，也未重启三房；B三轮后的唯一范围补验尚无回复，未跑第四次。
- 本轮只读native52052 exit0，从原C player2的 `live-decisions.sqlite` 使用DatabaseSync readOnly及纯record decoder提取authority75的完整已付Planner/currentPlan，不调用写型Store工厂。原Plan有10条opponentModel，原严格提交已有 `currentGoalSource=plan.currentGoal`；r73 Marine-3 Move、r74 Stimpack、r75 finish_activation三个实际回执和C77的公开理由“movement is already activated; its Assault activation remains available”保留。
- 原模型本身存在矛盾，工程也存在永久并集：Planner当前完整plan在continue被归为null，只留下增量opponentModelUpdates；TurnPlan以字符串Set并入旧列表；observe刷新lastValidatedAuthority而未保留各判断的原观察时刻。完整当次输入正文已释放，不能据此排除一切漏传。

### 实际修改

1. `live-flash-decision-port-v1.mjs`：从**已声明的单源完整Planner Plan**派生Host-owned `opponentModelSnapshot`，绑定当前权威，Planner标准化保留该字段；模型自填来源包装不采用。旧未声明回复不被静默重解释；其他战略字段和提交schema/策略指令不改。
2. `hosted-bot-seat-runtime-v1.mjs`：同一实际Bot反思入口通过 `projectStarcraftTmgTurnPlanReflectionInputV1` 传入这份快照，继续保留原future-action amendment与明确revise逻辑，不让新观察替换完整获胜策略。
3. `turn-plan-runtime-v1.mjs`：当前完整快照替换opponentModel，不再与旧列表永久并集。`opponentModelContext`记录每条判断来源局面、freshness和originKind，明确model_authored_hypotheses_not_rules_facts；旧delta仍作为不同来源假设保留、不会整批刷成当前事实。observe仅更新绑定和新鲜度，legacy未知来源保持unverified；上下文跨持久化/hydrate保留。过期/不匹配的咨询快照软忽略，不创造新的游戏High或自行操作棋子。

### 唯一对应验证与限制

- 新脚本只为具体bug复现：`verify-ticket-23-slice-248-captured-opponent-memory-v1.mjs`。实际RED53710 exit1，输出同时保留旧“Marine-3未激活”和新“已激活”；修后三处接线，GREEN55212 exit0只跑一次，无旧绿/全量/性能/地图/规则器门重跑。
- 纠正快照是**使用C77真实公开理由构成的受控合同夹具**，不是声称C76原付费Planner自动纠正过，更不是新实战决策。门禁证明实际Mapper/Host反思桥→TurnPlan→持久计划的旧判断替换、战略版本/approach保持、legacy叙事不被stamp认证、stale快照软忽略及来源重启保持。不能推断所有revise/搜索/记忆路径或下一次模型策略均已验证。
- 原已付回复及历史Plan逐值未改，Provider/Room writes皆0、trainingTruth=false；新原房动作/新调用/新费用均0。私有fixture `C/opponent-memory-c76-fixture-v9.private.json`，原读回执及RED/GREEN日志分别 `opponent-memory-fixture-readonly-v9`、`opponent-memory-{red,green}-v9`，唯一报告 `C/opponent-memory-gate-v9.private.json`。
- `common-v9-source-manifest.private.json`记录共同候选v9及10个累计受影响生产文件，formalAdmitted=false。A51/B71/C81原房不变，B合法r69恢复入口仍待一次定点例外；全部后续正式驱动必须加载同一最终版本，不使用已退出的旧观察Host。费用累计仍A114.109622/B173.750845/C160.930293各200、未知派发不盲重试。
- 本轮diff：3生产源+1具体bug脚本，CURRENT_WORK/本文/根TASKS/根MEM四状态文档；没有提交、删除、来源刷新、代理/K3、安装、军表/地图/开局Plan再生成。T23 33/36/T27 5/6，余248/272/249/250四片，完整0/12，20图原范围和后续至多3组/批及完局先保全再清理政策保持。

harnessLoopUsed=true；promptPackRoutes=selfplay_agent_prompt/harness_optimizer/fact_probe；harnessToolsCalled=原付费记录只读、公开动作对照、实际计划持久化接线复现；uiTraceEvidence=原A51/C81四真实PNG未重生成；agentDecisionEvidence=C76原Planner矛盾及C77原Action公开理由；memoryTraceEvidence=唯一具体RED/GREEN与持久上下文；trainingTraceCandidates=[]；rollbackOrDemotionRules=真实续跑若来源错误则降级该咨询记忆、不改Rules或已付历史；userVisibleChecks=受控合同旧判断确实退出当前列表，真实下一模型决策效果尚待。

## A51/C81 原动作真实网页补录完成

- 实际 `--reconcile-only` 结果：A在20:56:29UTC由50条补至51条，新增原接受回执 `f2ae77cb…`，stateHash `299447b6…`；C在20:56:42UTC由80条补至81条，新增原回执 `73b76d47…`，stateHash `a30909b0…`。两个 `reconciliation.json` 均ok=true、authorityUnchanged/providerUsageUnchanged=true，newAcceptedActions/newProviderCalls/browserWriteRequests皆0，matchContinued=false。
- A共有316张截图，新增完整桌 `0315-r051-player2-resolve_current_product_cleanup_refresh-complete-board-applied.png` 和控制 `0316-r051-player2-resolve_current_product_cleanup_refresh-agent-control-applied.png`；C共有511张截图，新增完整桌 `0510-r081-player2-use_active_ability-complete-board-applied.png` 和控制 `0511-r081-player2-use_active_ability-agent-control-applied.png`。四张真实PNG均已目视查看，棋子/地形有显示，控制栏分别r51/R1Cleanup和r81/R2Movement；截图观测revision与原回执一致，captureMode=element、warnings=[]。
- 两份成功报告不等于整局完成或新增策略验收。没有重做Apply、掷骰、Planner/Action、地图验收或旧绿色门。补录保持原房内费用A16.899574/C36.650490、调用76/167、units13,282,959/29,555,151。
- 完成后仅对本次A41385/44207、C41386/44208按exact PID/birth发送SIGTERM，释放观察主机及补录驱动。证据 `capture-only-reconciliation-closure-v8.private.json`；这是计划内收口，不是新增游戏失败，也未删除原Room、断点或付费记录。
- B仍等待第三轮后的唯一范围例外，正式ALL未派发，common-v8 formalAdmitted=false。T23 33/36、T27 5/6、余4片、完整0/12；后续至多3组/批，完局先保全复盘/报告再清理可重建缓存，当前删除0。

本次diff仅CURRENT_WORK、本记录、根TASKS三份状态文档与已有生成证据；无生产新改、测试重跑、Provider请求、提交、子代理或K3。harnessLoopUsed=true；uiTraceEvidence=上述四张真实原房PNG；agentDecisionEvidence=原付费公开动作不改；memoryTraceEvidence=B合法边界尚待正式准入；trainingTraceCandidates=[]、trainingTruth=false。

## B合法前缀恢复与三轮准入停点

- 原进程71590/71591/71592/73860/73861/73862/73863/71924本轮定点PS全部缺席，不据旧producer.running重启。原房SQLite读取始终DatabaseSync readOnly，未打开写型Store工厂。
- 新恢复器 `recover-ticket-23-slice-248-named-active-room-v1.mjs` 使用原B签名checkpoint64及5个实际回执到r69；原stateHash `4b7376cd…`/journal `7dbea3f6…` 完全一致。随后原真实r70重复施放被新Rules拒为LEGAL_SPACE_STALE，不人为改骰、不生成新决策。
- Native32010 exit0，source aggregate cipher前后完全相同。独立恢复存储保留同一逻辑Room ID；初始状态除明确officialRulesVersionFork来源外逐值同合法r69，原军表、地图1804几何、资源、位置、伤亡和骰保留，原r70/r71只作为失败历史留存。不是重新写表/出Plan/开始新实验。原B0:0得分说明不变。
- 第一实际Host准入34854 exit1：旧接口只接受Charge分支及target revision1。修成显式 `legal_prefix_recovery_v1`、target0/基础原规则器，不把任意无效旧分支静默兼容；0Provider。
- 第二实际Host准入36742 exit1：恢复器漏传现有initialStateAuthority.serverSeatPlan，只创建默认host。已经从**创建器来源**补传两席并断言human/player1及bot/player2，未降低Host凭据校验，也未覆盖或删掉这个只有r0的失败恢复存储。
- 第三实际准入39502 exit1：为避免重复5步重放，复用器读取已验证状态，却误要求genesis有签名checkpoint0；真实Room在r0仅保存原生initialEnvelope。因此本次在创建第二个目标前停，不是模型/源断点/限次规则再失败。三轮用尽，**未做第四轮**。已请求只修initialEnvelope复用假设、追加一次定点验收；原0到64前缀及已绿门不得重复跑。
- 现有源码已支持typed恢复记忆：source actor精确截到合法receipt对应decision_outcome，而不只筛stateRevision。真实B P2序号262对应合法r69；263/264的计划、265反思、266/267意图同样标r69，却针对非法r70，须排除。P1最后合法记忆241/r66。回迁计划需要reflection，不生成虚假charge_failed/新接受动作；source历史只读且同席隔离。该新路径尚未实际准入通过，不能宣称记忆恢复完成。
- 费用祖先补齐typed恢复固定旧房32.048687元，包括被排除的非法动作费用；恢复棋盘不退还/清零实际模型用量。三组合计账仍分别A114.109622/B173.750845/C160.930293各200，原未知派发结果不盲重试。本轮0新增模型费。
- A41385/C41386启动原房观察主机，只用于随后 `--reconcile-only` 补录A51/C81，不执行后续合法动作。共同v8代码清单 `common-v8-source-manifest.private.json` 标formalAdmitted=false；正式三组停派发。原B错误恢复分支与源房都保留，删除0。
- 本轮差异：4生产源（新恢复器、恢复记忆模块、真实Host类型化入口、费用祖先），0新常规测试、0旧绿重跑、0代理/K3/来源更新/提交。真实恢复生产操作和Host准入回执保留，不包装成完整对局通过。T23 33/36/T27 5/6，余4片，0/12完整、20地图目标保持。

harnessLoopUsed=true；targetGames=[starcraft-tmg]；promptPackRoutes=[selfplay_agent_prompt,harness_optimizer,fact_probe]；harnessToolsCalled=[read_board_state,read_rules_verdict,read_episode_trace,replay_legal_prefix,read_same_seat_memory,capture_visual_state]；uiTraceEvidence=原A51/C81待实际补录；agentDecisionEvidence=原付费公开动作和合法/非法回执不改；memoryTraceEvidence=B原262/241合法边界与263以后排除证据；trainingTraceCandidates=[]；rollbackOrDemotionRules=准入未通过禁止正式ALL派发/不复制非法suffix；userVisibleChecks=待真实截图补录，不以字段存在判通过。

## B 第一回合比分：0:0，不是6:6

| 原回执 | 内容 | 是否胜利分 |
| --- | --- | --- |
| r55 `mission_victory_points_scored` | 双方击杀VP0、站点VP0，结果0:0 | 是 |
| r59 先手骰 `[1,5,4,2]` | 双方争先总和6:6，平局 | 否 |
| r60 重投先手骰 `[5,1,1,5]` | 双方争先总和6:6，仍平局 | 否 |

来源是原房公开规则回执，非模型判断。证据 `B/round1-scoring-public-journal-v5.private.json`、`authority-public-journal-readonly-v6.private.json`。本局第1回合没有站点得分；不要把所有任务的首回合得分制度一概推广。

## 全停后两项定点修复与实际边界

### 同名主动能力限次漏接

- B r69在(27000,4551)、r70在(25497,3928)各创建一个Tumor，不是一个动作的声明/摆放两步骤。Queen、round2、abilityName相同，原物理重叠门只处理碰撞，并未证明使用次数正确。
- 冻结官方规则：同一单位的同名Active每回合一次，REPEATABLE例外；同卡多副本不绕过。冻结Queen的Spawn Creep Tumor没有REPEATABLE。SourceLock8月30日与实际房间一致；units71/cards69/rules48是**版本号**，不是文档数量，不能据此断言房间使用26单位的旧版本。
- 根因 `official-unit-lifecycle-family-adapter-v1.mjs` 的available只检查oncePerGame，漏通用每回合次数。新增统一round/unit/name查询，同时读通用activeAbilityUseHistory与旧unitLifecycleUseHistory的definition绑定；非active的PhasePrism/Omega生命周期消费者不被误当普通Active。LegalSpace、Preview和Apply共享现有fresh-domain边界，不靠提示词让模型自律。
- 真实B r71只读复现脚本 `verify-ticket-23-slice-248-captured-named-active-quota-v1.mjs` 首次exit1明确重复仍被提供；修后唯一exit0，重复禁用原因、首用隔离夹具、同名另一来源、旧domain预览拒绝及原状态不变均通过。首用夹具只隔离限次账，不是历史回退证明。没有重写旧源/历史/签名。
- 证据 `B/named-active-quota-{red,green}.private.*.log`。B r70及后续r71仍保留作工程失败/费用证据；恢复到准确合法边界后才可重新产生策略样本，当前未直接续跑污染状态。

### 截图等待稳定失败不应重做已执行动作

- A实际故障：driver captureElement的locator.screenshot等元素stable约30秒失败。r51权威已接受，Web却只录到r50。不能因为截图失败再Drive、Apply、掷骰或重发模型。
- `owned-live-capture-v1.mjs`只对仍可见目标的TimeoutError尝试真实整页截图；目标不存在、页面关闭等不伪造成功。返回full_page_fallback及ELEMENT_STABILITY_TIMEOUT，不冒充裁切完整桌图。Web driver保留原截图路径字段，并写入视图captureMode/warnings。
- 本地实际Playwright连续动画复现同一stability失败，唯一RED1；修后唯一GREEN0，真PNG已查看。此蓝色图片是bug夹具，不是实际A r51对局证据。A51和C81的截图-only补录仍待恢复原页面，不能说已补完。
- 证据 `A/capture-timeout-{red,green}.private.*.log`、`A/capture-timeout-gate-v8/unstable-board-fallback.png`。旧整局/性能/地图/JSON绿门均未重复执行。

### 停机、费用及后续12组空间政策

- 原共同监控停止保留；另一个定点停止协调器碰到原host已退出而安全拒绝，没有错杀。原Web B73862及调度71924在birth验证后收到SIGTERM；不扫描或停止其他项目。证据residual-observers-close-v8.private.json。
- 最终producer已报房内units：A13,282,959、B25,156,704、C29,555,151；房内估费16.899574/32.048687/36.650490；加原累计offset后114.109622/173.750845/160.930293，各¥200、不清零。在途/未知收费不能凭进程退出视为免费或重发许可。本次两修复0新增模型费。
- 完整12组不减少，最多3组/批；完成的单组可正常收口，批次问题统一修完再进下一批。当前完整0/12，没有清理未完局。
- 每局完成先保全复盘记录及用户报告：军表/计划、冻结地图与规则、动作/实际骰子/损失、公开决策/工具回执、代码版本、费用与未知派发证据；随后只清理已定位的可重建缓存、临时渲染和重复导出。原军表/断点/未闭合付费输出不得提前删。本次删除0。

本轮diff：3生产文件（lifecycle adapter、owned-live-capture helper、真实Web driver），2仅复现具体bug的脚本及4状态/任务文档。没有提交、代理/K3、安装、来源更新、旧绿重跑或新真实对局启动。剩余顺序：B准确合法边界恢复→A51/C81原动作补录→三组同代码续跑→完成后归档/定点清理→后续12组批次；C对手记忆替换/失效Medium另记，不阻塞为其添加策略提示词。

## r71 真实准入、监控误判修复与三组共同续行

- C 原r70→r71：18模型Swarmling Move，选择原四选项中的 `e6815ab2…`，向marker5推进，两个模型进入3英寸范围；明确承认Marine-1/3当前回合射击风险，18模型Supply1、12伤亡才降为0。意图/反制预测/后续触发条件均保留，不把预期存活写成规则保证或已占点得分。
- 真实规则收据 `dd26a06f…`，后状态 `93283344…`，Replay true；截图ObservedRevision71，前后完整桌图0445/0448、控制图0446/0449。0448已实际目视查看，非重建旧截图、非示意图。标准地图仍为原冻结电子地形预设，沒有刷新官方数据。
- 只读SQLite捕获exit0：仅新增1个Action完成请求，真实prompt1,860,698 bytes；旧9个尝试中已付输出原样、原查询逐值保留，Planner选项ID不变。新625,808输入/2,401输出=628,209 units，费用+¥0.762495；C累计¥152.038644，A¥111.322483/B¥164.741640，各200。证据 `C/action-r71-actual-provider-v7.private.json`。这次是真实HTTP准入和模型回复，不再仅依赖内部整包估计。
- Provider实际21.591秒；驱动187.724秒，不能宣称一分钟达标。manifest的106.851秒与驱动重叠，不能相加成额外顺序耗时；页面刷新9.823秒、收图29.722秒亦有独立记录。主耗时仍有非模型计算/观测链，按已冻结性能基线继续实验，未重跑性能门。
- 正常检查点的进度状态实际为 `checkpoint`。旧一次性监控写成 `paused`，误判驱动结束并关闭三待机主机；原错误停止记录仍保留，不称模型/规则失败。新增仅监督用途 `owned-live-driver-outcome-v1.mjs`，使用生产驱动真实checkpoint/complete合同，并检查房间、当前开始时间、动作数量/Replay。一次实际捕获门exit0、0模型/原房写；checkpoint不冒充整局，过期、错房间或未验Replay均不接受。完整match分支尚无真实整局验收，不能据此把0/12改绿。
- 原房Hosts C71590/A71591/B71592、Web C73860/A73861/B73862共同v7/原Webv2已正式启动；调度71924、独立监控73863按确切PID/出生时间运行，无retry/checkpoint旗标，不派发重复写者。19:42:22UTC实际A33/R1Assault、B62/R2start_of_round、C71/R2Movement，均running；轻量观察超时不是任务终止，不重发未知收费。正常一组整局完毕须有匹配的真实terminal报告后单独保留/关闭该组，其余继续；真实新失败仍全停。没有自动删记录，12组/每批3政策保持。

本轮差异只有监督分类器及状态文档；游戏Agent/规则/地图/Skill/Web未新增改动，旧所有绿色门不重跑。harnessLoopUsed=true，targetGames=starcraft-tmg，路由selfplay_agent_prompt/harness_optimizer/fact_probe；真实Web/Rules/Provider/记忆公开证据保留，无隐藏思维链或训练晋升。

最新20:06:30UTC独立监控：A44/R1Combat、B67/R2Movement、C77/R2Movement，全部running，finishedArms为空，无共同停止记录；定点PS实读确认三原主机和三网页驱动的出生时间匹配当前启动记录。累计估费A¥114.109622/B¥169.827864/C¥158.109939，各200；房内reported units分别13,282,959/21,987,683/27,287,891（不冒充包含全部历史预游戏费用的总token），当前调用数76/116/155包含保留的未发送尝试。在途费用仍待回执，不重发。尚未完整对局或清理记录。

### 本轮新增动作与计划延续观察

- A r43实际使用Raptor的Feral Rage，r44结束激活；C r74实际使用Marine-3 Stimpack，r76部署Kerrigan Swarm Raptor；B r67部署Queen；C r77使用Omega Network建立新的Worm。上述动作记录Replay=true，截图ObservedRevision与各自权威revision一致。C r76完整桌面0479已实际查看，保留原官方标准地图预设和真实单位，不是生成示意图。
- B r65/66公开理由明确延续marker5/3的开局计划，并说明Goliath掩护与结束激活目的；C r76/77明确接续Swarmling向marker5推进和Raptor向marker2部署。C r77说明Worm为后续回合Ground reserves进场边、每回合合计Supply至多2，本回合不能用该特殊能力。这证明这些局部动作有公开用途/时机记录，**不证明完整长计划、占点结果或最优策略**。
- 新增Medium复盘观察：C r76 assessment及r77 publicPlanSummary仍称Marine-3未在Movement激活，但实际r73 move、r74 Stimpack、r75 finish_activation已存在。先保留双方原文和动作引用；尚未比对其完整实际Prompt，不能把来源归为模型或工程输入，也不能据此宣称选择了非法动作。按Only Critical/High阻塞要求继续，同局终后统一工程/策略审查，不临时注入策略或重启房间。
- 本轮仅更新本记录、CURRENT_WORK和根TASKS；无生产源码改动、新常规测试、旧绿重跑、Provider重发、房间重建、代理/K3、Git提交或删除。独立监督仍负责真实新停机全组收口、正常完局匹配报告后单独关闭；完整12组/每批至多3及每局完成后保全再清理政策不变。T23 33/36、T27 5/6，余248/272/249/250四片，完整实验0/12，20图原范围保持。

Harness本轮：harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=selfplay_agent_prompt/fact_probe/harness_optimizer；harnessToolsCalled=现有真实Web/Rules/Provider执行、只读动作和独立监控、定点进程身份观察；uiTraceEvidence=上述真实逐动作截图/ObservedRevision与已查看0479；agentDecisionEvidence=公开理由/意图/风险/plan assessment、无隐藏思维链；memoryTraceEvidence=已有局内计划延续及一个未归因文字矛盾；trainingTraceCandidates=0/trainingTruth=false。真实合法性/回放/权威失配才升级工程阻塞；局部叙事与策略观察不当全局通过或静默规则豁免。

### C76/C77 对手记忆矛盾的只读来源诊断

不是重复生成或审核：两个本地原生捕获3757/5395均exit0，SQLite只读、0Provider、0原房写；分别只观察已存决策字段与目标authority75/76的原计划/付费公开输出。私有证据 `C/memory-source-readonly-detail.private.json`（约39KB），原记录不改。本轮继续采用diagnose/harness；没有新回归测试，因为尚未改生产实现，也不把观察exit0当成修复通过。

1. **旧局面绑定假设排除**：这两次choice分别绑定r75/r76，其stateHash与原动作75/76的postStateHash逐值相同、roomId正确，不是从旧r72复用整个权威局面。源码构建了current-spatial-observation和opponent-prediction-timing节点，实际请求留存相应节点字节长度；仅字段存在不能证明其每个具体值。
2. **原模型确有内部文字矛盾**：r75 Planner真实付费输出的`publicPlanSummary.visibleFacts[3]`明确写Marine-1和Marine-3已经移动；同一输出的`plan.opponentModel[9]`及`assessment.opponentModelUpdates[1]`却写Marine-2和Marine-3尚未在Movement激活。r76输出又同时记录“Marine-3 moved”的预测校准和该旧说法。因此不能声称模型完全不知道Marine-3已移动，也不能把全部责任推给缺输入。
3. **持续记忆确有不能替换过期说法的接线风险**：保存的currentPlan v3已包含旧说法。`turn-plan-runtime-v1.mjs`的observe更新lastValidatedAuthority；continue分支以字符串Set合并原opponentModel与opponentModelUpdates，只去掉完全相同字符串，不会区分当前事实/历史判断或使相反说法失效。新的authority时间戳不能证明整段旧叙事已重新核实。这个来源可由源码和原currentPlan证明，但本轮尚未实现替换/失效机制。
4. **完整实际输入边界仍未证明**：Prompt是内存artifact，生产发送finally中release；实际决策表留hash/节点长度而非正文，Provider ledger也只有hash/预算/回执。不能把事后重建当成当次已发送正文，不能断言所有输入字段无漏传。无需为补证重发已付请求。

保持Medium观察，当前未证明因此选了非法动作、查到错误几何或违反Rules；三组同v7继续。后续交付物是一个同局事实/对手判断分离的定点修复：保留历史计划与付费原文，当前单位激活等事实从权威状态读取；历史判断带原观察范围，continue更新具有显式替换/失效语义而非永久追加。用上述具体捕获先复现错误再修，只验该接线一次；不解析自由文本来硬塞战略、不改变军表/Skill/实验条件，不在三组运行中热改共同代码。该待办不冒充已完成或阻塞整局。

最新20:12:23UTC原房仍运行：A47/R1Cleanup、B68/R2Movement、C78/R2Movement，正常完局0。累计估费A114.109622/B171.563477/C158.944795，各200；reported房内units13282959/23398892/27956717。三原主机/三Web确切出生身份已实查，原监控73863继续；轻量观察超时不重启。T23 33/36、T27 5/6、主线余4、新12完整0、20地图完整目标不缩小。

## v6 实际新停点及 v7 容量修复（覆盖下文旧运行快照）

真实 Action 首次材料 2,134,973 bytes，超出既有 2MiB 包络。Supervisor 校验返回泛化错误 `invalid_provider_supervisor_request`；live-port 把确定未发送的容量错误误当 Medium 可重试，四次本地尝试均无网络派发、无新增收费。最终驱动32597报 `SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS` 并 exit1，独立监控34735于18:52:10UTC要求全组停止、18:52:12UTC闭合，A/B/C主机均exit0。没有新规则动作，原32/60/70保持。

具体源码根因：共享父对象后，原始子树“重复次数”不再等于编码后引用次数，462条事实表记录实际只被引用一次，反而膨胀。只改两个生产文件：

- `spatial-query-prompt-projection-v1.mjs`：按实际编码引用数内联单引用事实，64字符以上精确重复子树可复用，使用短ID及自描述 `fireFactRef`；旧 `sharedIncomingFireFactRef` 表仍原样可还原。四个队形、全部火力概率/伤亡示例/坐标/Supply数据未删除，不平均不同状态，Host原始回执不变。
- `live-flash-decision-port-v1.mjs`：调用既有共享容量常量，在记录派发和增加调用计数前拒绝确定超容量请求，返回类型化 High；不进入同内容自动重试，不改未知收费处理。Prompt版本45/JSON46只标识该精确编码变化，不注入策略偏好。

新脚本只复现此具体错误 `verify-ticket-23-slice-248-captured-input-capacity-v1.mjs`。首跑夹具漏必填查询接口，exit1；补接口后 RED 同时复现462条无益事实、2,135,048 bytes包络和错误重试通道。生产修复后第三次、最终 GREEN exit0：单引用0、四个完整火力结果逐值还原、旧表兼容、超容量0 Supervisor调用/0费用或计数变化。实际捕获节点1,819,191→1,544,817 bytes，按原非查询节点字节计算整包2,135,048→1,860,674 bytes。该门明确**未重建完整原 HTTP 请求**；真实附着 Action 后的传输结果另验，不能把内部字节通过冒充全链通过。旧绿门/全量未重跑。

证据：`C/planner-r70-after-bounded-v6.private.json`、`all-stop-bounded-v6.private.json`、`C/input-capacity-{red,red2,green}-v7.*`。原已付输出/回执不改。C新增实际1次Planner/287,795 units/+¥0.355316；四个失败Action只是未发送记录。累计A¥111.322483、B¥164.741640、C¥151.276149，各¥200，不清零。当前三组停止；共同v7同版启动后仅恢复既有 `retry_ready` Action，不添加 retry flag/新Planner周期。完整实验0/12，未完房间0删除。

### v7 实际原房启动状态

第一次操作误写不存在的启动脚本，三进程在打开房间前退出；第二次独立调度误读 `/__ticket23/manifest`，404后关闭待机主机，尚未启动驱动/模型。两次操作错误及日志保留，不包装成规则或模型失败，也不修改生产代码。现已沿用上次真实成功的 `serve-ticket-23-slice-248-agent-agent-web-v1.mjs` 与源码明确路由 `/__ticket23/a2a/manifest`。

最新原房A58927/B58928/C58929启动中，独立原生调度58930实际存活，19:19:32UTC记录 `waiting_for_owned_original_hosts`；未新派发模型。它只绑定本次owned PID和出生时间，待真实主机回执及manifest就绪后附着C原Action，原独立监控负责真实新失败全组优雅停止；目标只新增一动作到r71，后续再共同续行。新状态文件 `v7-continuation-progress-launch2.private.json`，启动 `room-host-common-v7-launch3-20261011.process.private.json`；不要重复启动写者。这是运行中恢复，不是正式Action/传输准入通过。

## 授权后实际推进

- 唯一追加 JSON 门：exit0，原错误输出仍拒绝，实际下一次 prompt 包含纠错事实和历史约束，三轮限额未改；真实 Provider/原房写入均为0。
- 发现明确恢复边界：旧函数清空 continuation messages。新捕获复现 RED exit1；调用者现在用当前 normalizer 重验原已付规划输出并重建上下文，原对话存入恢复历史，旧 paid replies/queries 不改。首轮修后检查暴露异常 message 与 code 混用，已定点修正；第三次最终检查 exit0。没有再跑第四次恢复门或重复已绿 JSON 门。
- 新恢复只在相同 revision/state/action-space 身份下发生，历史三次修订归档，本次周期从0计数且只允许一次。它不是历史或费用清零，不推荐特定策略。Action 阶段旧恢复路径未宣称迁移完成。
- 共同源码 `s248-s272-semantic-feedback-v6-20261011`；上一共同 v5 模块未全量重扫，Web v2 不重建。第一轮主机 A21600 因启动配置遗漏原有计划工作区路径而退出，B/C 优雅关闭；没有 Provider 调用或动作。补上原 `A/plan-workspace` 环境配置后，A24964/B24965/C24966 三组就绪，实际 manifest 均200、原房 autoDrive idle、无当前任务。C 单次明确 retry 已批准，尚未派发。启动本身不等于动作/验收完成。
- 第一次 A/B 补录启动命令误填不支持的调用模式名称，入口校验直接退出，没有打开网页或改动房间。这是本次操作参数错误，不是模型/生产源失败。第二次删掉显式覆盖，让已有解析器读取原持久化模式；补录进程30989/30990均 exit0，A32/B60与权威一致，196/368截图，规则状态、费用及 Provider 调用数不变。原完整桌图已查看。
- C 原 r70 的已批准恢复由网页驱动32597启动，仅到新增一动作的检查点。独立原生监控34735最新见drive0001 running、无新失败；A/B仍idle。它只监控本次owned PID及实际启动时间，真实新失败全组优雅停止；观察读取超时不重启或重发。还没有新动作/成功结论；C恢复闭合后才共同续跑。

## 恢复连续性及 B 的比分澄清

只读原 SQLite 公共动作链：A权威32/Web31、B权威60/Web59、C70/70。160条已记录Web动作的回执/状态hash均对应，引用截图均存在，原权威链无缺口。A待补的r32是Kerrigan Leaping Strike，B待补r60是先手骰平局；只补记录/截图，不能重跑动作。

B r55真实 `mission_victory_points_scored`：双方击杀VP0、站点VP0、合计比分0:0。r59骰[1,5,4,2]、r60骰[5,1,1,5]均为双方先手骰总和6:6，不是第1回合得分。证据见 `authority-public-journal-readonly-v6.private.json` 和 `authority-web-continuity-v6.private.json`。

用户新增运行/空间政策：12组仍完整保留，每批最多3组，批次完成及工程问题统一修复后进入下一批。每局结束先保全可复盘记录和用户报告（军表/计划、冻结地图规则、动作/骰子/损失、公开决策和相关查询、版本与费用及未知收费证据），再定位清理不再需要的临时渲染、可重建缓存和重复导出。未完局原房/断点/未闭合付费结果不能提前删；清理范围须逐次明确，当前没有删除操作。

## 原始失败与来源

保留 C 原 r70/R2 Movement 的四个完整付费输出及两个空间查询回执。不是网络或 JSON 解析失败：模型三次语义修订后仍否认 Swarmling 当前所在位置进入 Marine 当前回合静止射击圈。原查询边 gap=9469 milli-inches，包含当前回合射击武器和可用 Assault 窗口；不能因摘要中的 `horizon_unknown` 就放行。

诊断确认三个接线问题：

1. 当前威胁摘要遗漏了原查询的 actionWindow、最早可攻击回合及关系边出处，完整事实没有进入纠错信息。
2. 纠错只提供本次首个错误的字符串，缺少以前问题的防回归记录，模型容易修好一个又重新引入另一个。
3. 最关键的 JSON 通道缺口：完整 continuation messages 虽已保存，但 JSON prompt 的 agentLoop 为 null，实际节点只带错误码，没有发送完整纠错信息。保存记录不等于模型收到。

原第三个输出描述的是**移动后的预测**，不是否认当前位置；当前位置查询不能证明它的未来预测错误。本次没有因此新增错误拦截，也没有向模型推荐保守/进攻等策略。

## 已改源码与定点准入

仅改生产文件 `packages/online-agent-session/live-flash-decision-port-v1.mjs`：

- 结构化当前问题、对应事实/查询出处、历史防回归约束和当前提交通道。
- 保留真实 actionWindow、关系边、回执和攻击时间范围。
- 多问题可以一起修；历史错误只是约束，不冒充本轮新判定。
- JSON prompt 显式加入纠错对话节点；查询回执不再按 native-tools 的独立消息投递假设被省略。
- 三轮上限、规则权威、未知事实及旧错误输出的拒绝条件不变；不自动追加调用。

新增的唯一验证脚本是实际捕获 bug 的复现：`scripts/verify-ticket-23-slice-248-captured-correction-feedback-v1.mjs`。它使用原四个输出，经真实 live-port 持久化及下一次 prompt 路径，Provider 为本地伪实现，不调用真实模型、不写原房。

## 三次门禁记录与停点

1. RED：原代码缺少结构化纠错，exit 1。
2. 首次修后检查：错误测试预期把移动后的预测当成当前位置矛盾，exit 1；已按原输出修正该预期。
3. 第二次修后检查：事实、历史约束和提交通道检查通过，实际下一次 JSON prompt 不含完整纠错信息，exit 1，暴露真实接线缺口。

第三次之后定点补上 JSON 节点，先停止；随后用户明确答复“补验通过后允许一次有界纠错”，唯一第四次补验 exit0。旧三次记录保留，不自动重置或无限追加。

清空边界已在真实调用者补齐，原有通用恢复函数未另开实现。A/B的已封存动作补录完成；C原r70已授权单周期运行中，不得盲重发未知收费请求。

## 阶段报告与本轮差异摘要

C原r1–65逐动作报告导出和渲染exit0，103页（布局修正前104页），13张缩略总览覆盖全部页；原第27页孤立预测已并回第26页，26/51/103完整尺寸也已查看，无新截断或缺图。包含真实截图、公开决策、规则回执和预分配骰子池，明确不冒充完整对局、策略通过或隐藏思维链。产物 `output/pdf/slice248-performance-baseline-C-20261010-v1/partial-r001-r065.pdf`，视觉记录 `C/pdf-visual-acceptance-layout-v6.private.json`。

本轮差异：一个生产 live-port 补事实/JSON投递/恢复保留上下文；两个新脚本仅复现捕获的具体bug；报告生成器修冻结元数据/骰子标签及孤行布局；状态文档同步门禁、原房恢复和批次保全政策。启动配置及补录参数已纠正，不为它们另改规则或提示词。没有旧绿/全量重跑、代理/K3、提交或删除。

## 费用与证据

本次定点诊断和复现新增真实 Provider 调用 0、费用 0。原始付费历史不变。当前累计估费 A ¥111.322483、B ¥164.741640、C ¥150.920833，每组上限 ¥200。

实际捕获和日志位于共同 baseline 的 C 子目录：`planner-r70-original-failure-v5.private.json`、`correction-feedback-{red,green,final,authorized}-v6.*.private.log`、`prompt-repair-context-{red,green,final}-v6.*.private.log`。共同v6来源记录为 `shared-code-semantic-feedback-v6.private.json`，最后实际执行对战动作仍来自v5。

本轮 harnessLoopUsed=true；路由 harness_optimizer/fact_probe；证据为原始付费回复、空间回执和真实 JSON prompt 生产路径。没有新策略真值、训练晋升、完整对局验收或 UI 验收。
