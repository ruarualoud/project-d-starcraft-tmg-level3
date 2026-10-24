# T27/S272 P1/P2/P5：停止后的角色职责与原问题身份修复（v995–999）

日期：2026-10-24。仍属新P0–P6主线，不恢复旧生成架构。

## 当前结论

**最终收口／用户要求暂停**：84752已自动停止并退出0，B r23/event12227/0 pending。v999真实1b3effd3→217deb6b证明原题已进入同一可编辑清单，模型明确保留necessary_fact；但又授权实质相同调查，系统`unchanged_investigation_authorization`持久停止。另有2091/2092/2098/2099/2202五个去重未读来源提示。只新增一次真实调用318034units/Provider14.898秒，没有新Native或Plan提交，不追加补读/循环。用户要独立优化任务，故此处不再继续修下一问题。详[完整交接](handoffs/2026-10-24-roster-plan-optimization/README.zh-CN.md)。以下各“当前”是版本当时状态。


v999最新：PID84752同B既有断点观察原问题清单修复，日志`build/slice272-v999-author-ledger-live-1792799291609.log`。此前81307已停且退出0/r23/event12218/0在途；没有新房、重做实验或重置次数/账。实际语义推进仍待，以下运行/停止记录均为各版本当时事实。

v998最新：核对原进程确已退出后，沿同B已批准修复交接的来源确认启动PID81307，日志`build/slice272-v998-author-runtime-live-1792798934959.log`。未再次交接、重置计数/费用或重演Native。新合同真实语义效果待观察。以下v997停止是恢复前的真实边界。

生产现已再次停止：PID72601退出0，B r23/event12204/0在途。原军表、Plan、已付费回复、必要未知均保留。正式Plan 0/6，新对局0/12；T27 5/6，T23 33/36，余S272/S248/S249/S250。

v995局部合同与v996显式交接门通过；真实作者仍未推进，已停。v997进一步修原问题身份，实际原件离线门通过，尚未发起下一真实请求。没有把停止、单测或角色交接算成Plan验收。

## 查到的来源问题

1. 实际作者请求 `8d0fb18744962c18549a3b0756391411211374f681edbffe00cdd4850383d89e` 没有 `strategy_owner_assignment`，旧事实角色的 `originalTask/originalStrategicDecision` 仍作为当前输入。
2. 该请求确实已有 `current_plan_authoring_responsibility`；因此不能说完全没给作者写Plan职责。缺失的是统一的当前职责／历史职责分离。
3. 无进展回交不需要购买事实summary，所以没有batchFacts。共享owner投影却把batchFacts作为前提，导致这种合法控制返回漏接。
4. 另有语义冲突：旧来源审核要求最早到达轮次，当前局部方法只做单次位移且不能跨回合模拟。条件性可达证明、最早全局保证、作者未来得分目标必须分开；仍缺的真实路径/规则/支付事实不能靠改分类放行。

## 修改内容

- `roster-workflow-strategy-owner-context-v1.mjs`：用Host停止证明、原件身份及完整request/receipt相等性识别无summary回交；同共享owner入口分离旧角色限制，保留全部问题、原件和草案。保留明确“未解即未解”的指令。
- `roster-workflow-control-progress-v1.mjs`：从实际旧付费请求证明缺角色合同；已带合同、当前草案变更、在途请求不取得同类修复权限。派发校验须同时匹配显式修复记录与完整现输入，模型自写同名字段无效。
- `roster-decision-workflow-v1.mjs`：复用产品 `handoff-no-progress` 的显式控制，只补充尚未发出的后继请求；保存修改前输入、停循环证明和修复说明。没有新生成分支、次数清零、Native重演、原付费输出重写或Plan批准。

本次补交只说明工程职责修复，不要求作者选某条路线、某个回合或某种军表。作者若不能作出有效新决定，保持停止，不再重复原方法。

## 验证记录

### v995：实际保存请求

`verify-slice272-no-progress-owner-role-v995.mjs`

- RED：`ownerProjectionPresent:false`，exit1。
- 修复后一次GREEN：exit0。原问题/来源/草案逐值保留；字段改名不影响来源识别；历史来源、新观察、不同receipt、错误owner均不误识别。
- 0真实Provider、0Native、0生产写；通过门未重跑。

### v996：实际未执行后继边

`verify-slice272-stopped-owner-delivery-v996.mjs`

- RED：显式产品核心命令拒绝 `ROSTER_WORKFLOW_NO_PROGRESS_HANDOFF_INVALID`，exit1，未执行角色。
- 修改后单次运行PID71536，exit0；日志 `build/slice272-v996-owner-delivery-1792797910783.log`。全部本门通过，0真实Provider/Native/生产写，执行器注入1次后停止。
- 注入检查范围：保留旧付费角色/草案；幂等命令不增工作；旧请求已经带角色合同不得授权；在途拒绝；实际核心派发产生正确角色输入后停止于注入执行器。

旧v993/v994门未重跑。此验证不证明真实模型能够解决范围冲突、完成Plan或提升策略。

### 同一产品真实续接

PID72601，日志 `build/slice272-v996-owner-delivery-live-1792798026200.log`；启动于2026-10-24 07:27（上海）。原产品CLI只新增正确的修复标签，仍使用同HTTP端点、同工作流、同冻结数据。未新建房间、重置费用或重演Native。需核对实际新请求里的owner节点与原始回复；无进展立即停。

实际交接记录 `d02b61382313e2971c1fb94cee3ae73a53d7d0139926c73976287758af893bf3`。

实际请求 `0f54719b3bde8253ad73c3c772d88a1e6a7a14ab7e9c3e07f1944f9cc7894bcd` 已有owner职责与noProgressControl；回复 `6f676f60abf0daf5a8c277eb96bc97f84020395ad184b6e041c9cef9c563d1ef` 仍为retain，mutation/nextInvestigation均null，把接受未知列为decided_here。收到后立即SIGTERM。仅1真实调用，输入152850、输出1612、共154462units，Provider13.168秒；没有第二次模型调用、Native或Plan修改。结果 `7ae321b405483899a5d6e4581af60be207d1a5a52a541bf13b0dbc72e1bfe2d3` 为未批准interpretation、needs_model_choice，不是完成的策略。

### v997：实际未解事实被改写为作者选择

实际完整派发输入 `c48bd834f0c2ae41a4300ac054d6630f57ffbca42825aa78f063a2d25c034b13` 同时保存了原战略作者选定的necessary_fact，以及事实角色后来写出的“授权跨轮，或接受unknown”的长问题。旧逐题合同只取后者，因此让准确覆盖检查对齐错对象。角色说明送达不能修复这种范围来源错误；也不能归因于请求没通。

v997修改：

- `roster-author-question-contract-v1.mjs`：从实际当前来源、原作者nextInvestigation.questionNumbers及原句提取授权问题；保留原来源身份。子角色文本保存在returnedQuestionProposals中，不作为替换题目。原事实题不能用decided_here替代；另列作者选择不受影响。旧前提仍可能错误，允许有来源的范围/分类修正，Host不代答。
- `roster-workflow-strategy-owner-context-v1.mjs`：职责节点与覆盖检查共用上述选择器，避免两套问题集合。
- `verify-slice272-author-question-identity-v997.mjs`：真实输入RED（原题丢失）→一次GREEN/exit0；确认旧回复缺原题，单改题名仍被拒，诚实保留necessary_fact不被这项身份门误拒；answered_fact仍需后续正常来源审核，不在此自动批准。原件逐值不改，历史源不能冒充当前授权。

本项0真实Provider/Native/生产写。v995历史测试的预期同步原问题合同，但已通过门没有重跑；新行为由v997定点门覆盖。未进行下一轮真实调用。

## 最终改动范围

4个共享模块（owner投影、原问题合同、控制进展、工作流显式交接），1个产品CLI参数标签，3个真实故障定点脚本，以及本报告／CURRENT_WORK／根TASKS／根PROJECT_MEMORY。没有依赖安装、删除、提交、规则数据更新或子代理。

### v998：把新合同接到实际验证入口

排查假设按优先级为：保存回复确认路径未带新合同；调用点只识别旧合同；模型在正确输入下仍不决策。代码证据确认第二项：`roster-workflow-read-role-v1.mjs`查找`author_original_question_contract`时额外要求`version===1`，静默漏掉v2。仅测共享函数不能发现此缺陷。

修改仅为：调用点读取实际请求中的同kind合同；共享校验器识别支持的v1/v2，不支持版本返回明确工程错误。历史已付费回复仍只对其实际收到的合同负责，没有拿今天的prompt重判旧请求。

`verify-slice272-author-contract-runtime-v998.mjs`使用实际停点operation、完整输入、旧回复，注入真实执行器，并用同一核心证据读取器访问原件。80407缺注入身份、80612错误拒绝离线读取，为夹具失败，不冒称复现；修正后80825有效RED：v2已交付但errors为空。具体生产修改后按用户既有“明确修复可追加一次”授权，81005一次GREEN：`author_original_question_coverage`保留在补证据之后，不支持版本不会静默忽略。0Provider、0Native、0生产写；旧通过门不重跑。

v998新增1个实际执行器故障脚本，修改read-role及问题合同两个模块；不改Rules/军表/Plan。真实续接仍需观察输出，不能根据该门提高正式完成数。

v998实际请求 `05beb9ef5720605d2f79476189b0129097ace25c7bd7a89af651c08d90eacb47` 有v2合同，实际回复 `f673d26fd6483e504dd665d1fdd5219056e71d605d17f63afdf2ff7637c93269` 仍选择retain、接受未知、无新调查。发现即停止。81307退出0，结果 `316fd3384338ec84821073a15f4e6b80c280289bd7bf0df55ba5e769d84237c0` 未批准；1次新调用309674units（308331输入、1343输出）/Provider13.446秒。与上轮合计2次464136units，但职责和输入不同，不能据此宣称性能提升。

### v999：合同必须进入可编辑的问题清单

实际最终userMessage被增量命令编译器替换成NORMAL SOURCE CONFIRMATION，其strategyRepairState.originalOutput只含事实角色改写的选择题。原题虽在v2节点里，却不在可按编号修改的清单中。这是输入组装与解码使用不同问题集合，不是请求没通。

按codebase-design的Module/Interface原则，修同一个作者命令Module，不另造生成路径：

1. 原问题合同保存实际当前原作者选定记录，而不只是原句。
2. 清单追加缺失的来源记录，原题分类仍是原作者的未解necessary_fact；旧编号/旧条目不动，不由Host替模型回答。
3. 原付费originalOutput不改。新请求单独保存retainedQuestionLedger及来源，schema编号范围、模型看到的清单、最终指令与decoder都消费这一份。
4. 明确scope_reconciliation，不能把旧选择题确认当原事实已回答；nextInvestigation使用本次清单编号。
5. 历史命令没有新清单，继续按它自己原始请求解码，不追溯改写旧结果。

`verify-slice272-author-ledger-source-v999.mjs`用实际05beb9ef请求/f673d26f回复及c48bd834完整派发输入：RED原题不在命令中；修改后一次GREEN/exit0，覆盖旧编号保留、原题可独立改为仍未解、解码与身份检查一致、旧付费命令未改变。0Provider/Native/生产写，旧v998/v997等通过门不重跑。

新真实验证84752仅接已有纠错/补证据步骤；此代码门仍不证明完整Plan、Teach收敛或策略优越性。

## 后续边界

当前保持停止，不能普通resume或把新门通过当作真实收敛。下一验证须沿同产品核对原事实问题／作者选择分离后的实际输入与输出；不重演旧部署、重建房间或清零次数。再次无进展立即停。A与对局继续保持未启动。原作者必要事实仍未回答、完整Plan未验收，是剩余阻塞，不是已经完成。
