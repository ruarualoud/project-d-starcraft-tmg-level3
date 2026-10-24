# T27 / S272：修复版同产品全流程试产 v713

施工／恢复入口，不是最终中文生产报告。T27 5/6，T23 33/36；余 S272/S248/S249/S250 四片；正式 Plan0/6、对局0/12。P0–P6和六能力证明范围不缩小。

## 为什么不继续追加旧调查

两条旧新流程试产（M86Cg9 / I7zekC）均已真实停止，旧作者／审核／原文／账不清零。现写停在第三轮比较；固定完成一次明确来源修复续行后仍未测出回火代价，只用同一材料重述inconclusive、却标answered。两条不准出，不进入对局；只作新设计的失败证据和具体故障回放。

v712的阶段分型已送达，不能说它已解决行为问题。真实请求收到了missing_fact_investigation、必要问题和原件，作者仍给workOrders=[]、结论answered。必须补工程状态约束，不再靠延长相同提示／清零审核维持调查。

## v713：信息进展门

同一source-repair模块新增确定性检查，接正常read-role语义纠错入口，不新增输出字段：当当前审核仍声明必要事实、作者尝试answered时，将它引用的原件与该审核／被驳回答复已考虑的材料对比。receipt-view和source-facts别名按已注册关系追到同一原件；角色／审核／Skill的解释不算新增测量。只引用原来的同一组材料，返回`necessary_fact_has_no_new_material_evidence`，不能升为已完成事实修复。

可以选择真实workOrders、读取其他已有原件，或明确blocked／strategy_required；不强迫购买新查询、不把未知变0、不替模型选策略。对审核本身有异议且仅用相同原件时可回策略角色重审必要性，不能假装已补上测量。

边界：新增原件仅证明材料不同，不证明它足以回答问题，仍需独立来源／覆盖审核。该门不保证消除所有幻觉，也不判断任一方案胜率。旧无基线反馈不作无依据的“没有进展”断言。

门`verify-slice272-source-repair-information-v713.mjs`回放真实已付费答复`31e6249a…`，0新Provider／Native／生产写：原正常executor接受该无新事实答复RED→修复后一次GREEN，正常错误纠正已拒绝；原答复与次数不改。未重跑v712或旧已通过门。

本轮相关代码：`roster-experiment-source-repair-v1.mjs`、`roster-workflow-experiment-owner-v1.mjs`、`roster-workflow-read-role-v1.mjs`；v712/v713两条具体故障门。记录／CURRENT_WORK／TASKS／MEMORY同步，不提交、不安装、不刷新源、不删数据。

## 当前两条新鲜同产品试产

### P3 v722：联合空间查询的等价复制／哈希优化

现写实际`solve-joint-hold-geometry-widened`在精确live进程中长时间运行；不是Provider故障，也未按超时重复派发。源端每个锚点调用完整单单位查询，丢弃其sourceStateHash，却仍规范化哈希约11.7MB状态；成功分支和单单位后验又多次structuredClone整份冻结官方源。三个候选热点为整状态元数据、内部摆放搜索、联合回溯，本次仅处理第一项，不缩减任何搜索预算或空间。

门`verify-slice272-static-search-copy-cost-v722.mjs`从当前现写源`04672fe6…json.gz`读取实际2000分/8单位源状态，对Goliath/Medic做有界联合查询。输入全深冻结，调用真实单单位求解与Native几何评估；内存包装只计本模块完整状态hash/clone成本，不写源码或生产数据。旧实现RED：4次锚点评估、2组完整选项，5次全状态哈希耗1950.61ms、7次整状态复制耗1692.90ms，总5721.25ms。完整结果摘要`b1d040cf89e7a27fb77b79d0a4a08350b3e8ef81aafb39e599c603fccf38a617`。

同一静态查询模块现在只复制本次会改变的piece/model，冻结源束、地形和未选阻挡物只读共享；联合内部不生成无人消费的全状态hash，公开结果仍计算原sourceStateHash。锚点、单位顺序、模型目标、预算、候选选择、最终整组Native检查和规则数据均不改。修后仅一次GREEN：完整输出摘要逐值相同、2选项/4评估相同、冻结输入未变；1次全状态hash428.06ms、0次整状态复制，总2009.57ms，最小真实回放改善64.88%。这是该回放的结果，不是完整长查询或对战动作提速已证明；保留余下摆放/回溯成本。

旧95155/95162均已当前操作保存后paused且精确终态、无pending；新现写15829／成表15838同原两Run载v722，日志`build/slice272-product-generation-v722-{editable,fixed}.log`。没有重做成功查询、重建房间或清账，未重跑任何旧通过门。实际生产长查询改善与P4比较/Plan修订仍待；正式0/6、游戏0/12，T27 5/6/T23 33/36／余4片。

### v718：间接依赖的唯一责任与真实联合提交

**最新实际接续v721**：79303/79304均精确终态，journey paused/failure=null、无running/pending；原目录现写95155／成表95162，日志`build/slice272-product-generation-v721-{editable,fixed}.log`。两条原r1同版，不复用旧Plan、不清账或旧审核。初始化期间旧journey仍paused不等于进程终态；必须按精确PID判断。新作者回复及独立比较闭环尚待，正式数字不增。

**v721实际观察**：两精确PID在运行，journey running/failure=null。现写event1978仍为模型放宽其选定区域后的联合Native队形查询，原操作在途，不重发。成表来源审核`6ab92bd2…`及`d2bfd66a…`/`ab7eaf58…`已真实requires_revision：原作者错引285静态几何和290菜单为两臂控点证据，不能据此判refuted。标准source-revision随后实际产出`76d1f0f4…`工作单，从保存分支只读查询控点，不重做setup，原未解与边界保留；后继method d09a9770…的独立来源审查已event2477在途。该结果证明一次驳回→自动补证动作，不证明父策略比较闭合。新v721 Plan作者合同尚未等到新的战略owner实际修订，不能据局部门说已解决反复retain。正式接受/中文最终报告/对局仍未完成。

**v720–721待同版接续**：79303/79304已精确live后请求当前操作保存退出，旧在途未重发。v719真实事件1776已归还重复handoff给原repair-choice；原链随后实际应用9单位集中静态场景并查出控点，非仅测试。其总体角色仍误用无对手压力的即时控点判分兵更好，未证明原目的“压力后稳定性”，因此不计通过；独立审查／有效测量仍待。

v720补齐本次状态改变的整体验收消费：v719归还虽正确，readiness只认识旧returnedOrders报告，仍把新已归还角色列active。现在只消费状态机明确保存且reportRef与branchReturnRef相同的methodHandoffYield；无注册/不匹配/仍活动项照常阻塞。门`verify-slice272-method-return-readiness-v720.mjs`以真实事件1776后的状态RED→一次GREEN，0Provider/Native/生产写，不重跑v719或旧门。

v721处理当前P4职责缺口，而非替模型填写策略：实际成表owner`ed9cb87a…`反复retain，却把scheduleStatus/lossBudgetStatus/activationOrderStatus列necessary_fact；事实角色已strategy_required交回。新共享Plan作者合同从同一typed mechanicalBlockers投影这三个精确路径，正常请求明确当前战略角色负责填写条件性计划，固定表只锁军表不锁Plan，计划目标不是实得VP/已测伤亡；真外部事实仍需工具证据，比较有效性不因此豁免。Host不填值、不指定战术，仍需模型实际结构化修订，当前不能声称行为已修好。

门`verify-slice272-plan-authoring-owner-v721.mjs`回放实际已付费角色：缺作者职责RED；新合同通过后，夹具误用scheduler原始inputRef、漏过产品工厂的父目的补充，故“比较合同缺失”断言失败。读取实际付费prompt证明原比较合同本来已送达，不能把该夹具错误报成新生产缺陷。改为真实已交付输入层一次GREEN：三个路径、固定表Plan编辑权限、实验有效性合同均在；0Provider/Native/生产写。没有修改已有比较合同或重跑任何旧门。实际作者改Plan/有效比较/正式产物仍待。

**当前v719接续**：58085/58086已精确终态，两journey均paused/failure=null且无running/pending。原目录／workflow现写79303、成表79304同载v719，日志`build/slice272-product-generation-v719-{editable,fixed}.log`；不是新Run／房间，不复制旧Plan或重置费用。两者r1，真实新调度／比较结果仍待观察。

v718修的是未来不再创建竞争角色；当前停点已经保存了旧重复交接的付费回复，不能仅防新建后就放任旧角色续买。v719沿同一责任索引新增精确归还：仅当原同题owner通过显式依赖可推进、旧handoff无pending且尚无派生工作时，正常synchronize提交`yield_competing_method_handoff`。状态机重新核对原题、当前绑定、双方角色与未发请求，生成只读归还报告，把该重复角色设returned_to_owner；它的resultRef、operationState、收费、读取和次数完全保留，原求解/汇总/选择一项不改。不是模型结论、Native成功或整条实验退休。已有真实pending请求或已派生工作不走此自动归还。

门`verify-slice272-retained-method-owner-v719.mjs`用安全保存后的实际状态，经正常状态机接缝复现旧handoff仍被派发RED→源修复后一次GREEN；验证原链/所有付费操作逐值保留、同题角色归还、错误owner拒绝、pending不退休及冷恢复幂等。0Provider/Native/生产写，未重跑v718或任何旧门。生产是否实际归还须看新事件，不以本门替代。

v717已真实越过原guard停点：模型纠正方法控制条件后，预算分支分别返回7个与11个候选（原件`9e2fa278…`／`c0056d59…`）。这些是备选军表，不是单位数或策略优势。模型继续自行构造并审计候选，再由总体角色以`99cc5aad365b4646fe5871a69e10949d123c137d97ff8daf8389f0c41976c20d`实际提出联合修改，产品已从空表r0提交到r1：8单位／32模型／9起始Supply／36升级，2000矿／190气，Native Builder legal，Plan v1。新draft原件`91c51e21c9a0d0e1740a9812eb8c3ea5959f39abecc1f6f51170cccf73912850`。不是Host补字段或手工选表；初稿仍需Teach、必要事实和策略比较，不计正式接受。

本次成表发现真实并行竞争：`apply-concentrated-formation`已由原`observed-choice → order-repair0 → solve-concentrated-formation-v3 → summary → repair-choice`接续，Native求解仍running，后两项waiting_dependency；交接器只看第一层summary为waiting便又派发同题`completed-method-handoff`。已有v702只覆盖summary本身ready/running，未覆盖summary等待未发布tool-view的生产者。

v718只修改同一交接模块：沿显式work输入和已知tool/tool-view/role发布ID递归检查当前生产者；原链在推进就不再创建竞争责任角色。未知来源、过期绑定和依赖环均不当进展，真正停滞仍可把已完成事实交回。既有已派发工作不删除、不伪造完成，也不改阵型、收益预期或任何Native合法性。

定点门`verify-slice272-transitive-method-return-v718.mjs`回放当前真实保存边界：旧逻辑产生第二交接RED；新逻辑主断言通过后，测试把尚未返回的v3求解器设成evidence_ready却无结果，触发夹具null.json错误，未算生产故障；删除该假完成态后一次GREEN。当前真实Native v2原件保持只读，覆盖ready/running间接链、缺前提、循环、过期和无关责任；0Provider／Native／生产写，未重跑任何旧门。此门证明调度选择，不证明策略改善或现有竞争任务已经回收。

两精确PID58085/58086在新源改动后已请求SIGTERM：runner仅在当前操作保存后退出。终态前不另开写者，不重发pending请求；待精确ps和journey确认，再两条同版从原目录续行。新的实际接受数字仍0/6，游戏0/12，T27 5/6、T23 33/36、余4片。

### v715–716当前：两条原新鲜Run同版自动接续实测

#### 当前v717（覆盖下方PID）：现写58085／成表58086

同两新鲜目录／workflow继续，日志`build/slice272-product-generation-v717-{editable,fixed}.log`；50951已NO_READY_WORK终态，50952已当前操作后安全paused/failure=null且精确终态。没有新建Run／房间，不清旧费／纠错次数。

v715真实自修已发生：现写正常生成branches-from-empty:input-repair，模型自己补出有unitInstanceId和upgrades的一个Marine部分预算候选，实际`audit-legal-baseline`经Native返回legal。不是Host补表，也不是已提交完整军表。后继branch并非因军表不合法停止，而是模型guard把`/value/receipt/status`的Native合法性与包装执行状态混用：expected=completed，actual=legal。执行器正确不派发，但没有把该false guard交回模型，产生NO_READY_WORK。

v717将guard_mismatch作为明确方法控制返回接入既有修复链：新结果保留操作、原请求、expected/actual、真实来源工作／原件；旧同类保存控制结果只读获得当前合同。workspace的任务根据controlReturn分开：可基于原意与真实来源修正错误路径／枚举，或诚实返回负面/blocked/strategy_required；不能改expected=actual凑通过、削弱真前提或重放成功源操作。guard本身、原Native legal和旧回执不修改，受守卫操作仍不执行。

门`verify-slice272-guard-control-return-v717.mjs`用真实保存停点：旧false guard无回交RED→一次GREEN；Native legal原值/expected completed和来源完整交付，0守卫后派发、0Provider/Native军表审计/生产写。未重跑v715/v716或任何旧通过门。实际模型是否纠正并得到预算分支仍待生产观察。

v716也有真实进展：产品正常记录feedbackRecovery=spatial_selected_native_menu，原模型确认后实际`solve-goliath-move-formation`得到Native resultStatus=ok/queryStatus=exact、4个完整队形选项，原件cfaea481…；不再被整菜单evidence_not_read挡住。它只证明该次当前域查询可执行，不是总体策略更优或正式Plan通过。成表继续原局部实验，新一轮选择／动作仍需Native独立确认。

**现写50951／成表50952**，同下表Oc9hkr/onHtyj及workflow，日志`build/slice272-product-generation-v716-{editable,fixed}.log`。旧31325/36948已精确终态；不另开Run／房间、不复制Plan、不清费或旧纠错轮数。现写r0/0单位，成表r1/9单位/草案Plan，正式数字不变。

P3 v715源结果分类：Builder的invalid_candidate/candidate_addressing/rulesAuthority=null表示规则审计前输入拒绝，正常工具包装转continuation/returned_to_model，携同一候选合同和原拒绝进入现有标准input-repair。新的执行和保存completedRef的读取使用相同投影，原receipt不变；合法Native审计不被变成错误。Native未知保留未知，不把正常规则illegal当地址错误。

实际现写最新阻点是已保存`branches-from-empty`，它本来已needs_model_choice但queryRepair=null。预算分支源错误现在保留实际baselineAudit及修复合同；旧同码保存错误通过同一个源投影得到当前合同，不改旧原件／不编造旧baseline审计。工具发现明确：budget branches只围绕Native合法基线，合法的未满预算军表也可用，不要求先满2000；空军表不是隐式合法起点。让模型选择起始候选并审计，不由Host补选。

门`verify-slice272-builder-outcome-routing-v715.mjs`使用实际最新停点及实际候选：旧错误无标准修复RED→一次GREEN；新的地址拒绝不再completed；真实保存的合法Native审计作为缓存控制保持原样。0Provider/新Native军表审计/生产写。它证明适配器与保存错误投影，实际自动修复成功仍需生产观察；未重跑v714或其他已过门。

P2/P3 v716：成表实际input-repair三轮evidence_not_read 290/actionSpace，目标选择器actionType=move/pieceId=u_goliath_1实际唯一，Native源290的完整菜单约136,959字符。取回虽成功，分块把parameterDomains整数组省略；消费者只有native_action接入共享resolver，spatial当前域查询漏接，因此一直要求整个menu而无法读到该条目。不是单位不能移动／选择器不存在。

现在spatial domain选择也调用同一个执行resolver，空执行参数仅用于只读域身份解析，得到实际`/receipt/actionSpace/parameterDomains/46`；沿既有证据读取交接只取模型选中的该条，仍须作者确认，不代选／不执行。selected_native_menu_read_contract升2，明确旧请求无此修复的准确evidence_not_read停点可沿既有feedback-recovery追加一次作者纠错；新请求已含版本2不再续授权，旧失败／读取／收费保留。

门`verify-slice272-spatial-menu-entry-v716.mjs`回放真实付费输出：未读任何精确条目RED→一次GREEN，实际读取路径只为46条目、不重取整个menu，返回等待作者确认；源修复一次恢复可用、已带v2则不可再次恢复。0Provider/Native动作/生产写，未重跑v715或旧门。

源修复已加载，下一只观察两原新鲜流程：现写是否由标准input-repair得到正确Builder输入／实际军表；成表是否确认精确域并继续Native局部实验。门禁不能替代此实证，不提前增加接受数字。

### v714当前更新：Builder源合同已修，旧错误状态接续待检查

两条新鲜试产同版保存后，成表以PID31325载v714继续（原18116已安全终态）；现写在原18115终态停为NO_READY_WORK，以PID36948通过正常run检验新合同能否接续。日志改为`build/slice272-product-generation-v714-{editable,fixed}.log`，目录／workflow不变，下表PID为初次启动历史。

实际成表已从null生成Plan草案v1，进入局部Teach／比较，仍非正式接受。现写r0仍0单位；实际至少三组审计都在规则前拒绝，原件742ae229…虽已把compositionProfileId改为字符串，却仍遗漏unitInstanceId/upgrades。旧回执portErrorDetail为空，模型因而反复猜compositionProfileId，而非修真正缺字段。

v714在Builder原端口定义唯一完整candidateInputContract：明确单位身份、单一编制选择、upgrades对象数组／可空数组及菜单路径。descriptor、所有Builder菜单／回执、实验工具发现、比较工具输入和纠错合同都复用它。原校验一次列出所有单位缺字段的真实JSON路径，不填ID、不改单位／升级选择；成本／槽位／资格仍由原Native内核决定，port1.0.1没有刷新官方源。

门`verify-slice272-builder-address-contract-v714.mjs`用新鲜失败原件：空错误详情RED→一次GREEN。unitInstanceId/upgrades两个路径均报告，发现合同与回执同源；预制完整2000军表仍经原Native审计legal，1次Native军表审计、0Provider／生产写。没有复跑任何旧通过门。

新发现的P3接续缺口：`roster-workflow-laboratory-v1.mjs`仅用receipt.resultStatus判unknown，Builder却用receipt.status=invalid_candidate。因此源端候选寻址拒绝被包装为completed，没有进入标准needs_model_choice/input-repair，而被总体规划当负面事实反复调查。合法性illegal与输入寻址invalid_candidate必须区别；现有旧回执也要保持原件、仅修执行分类并接正常修复链，不能手补军表或清零历史。这一传输修复尚未实施，不能说v714已使空表恢复；普通产品run正在确认实际行为。

**v714普通run结果**：现写36948已真实终态，仍NO_READY_WORK/r0/0单位/无Plan；最后保存了`...method:0997b9577ea24d1c:order0:branches-from-empty`（events667/668），后续须检查该具体回执及源错误分类，不能仅因它停止再重启。成表31325精确live/running/r1/9单位/有草案Plan，继续原局部实验；正式0。下一实现要在正常工具包装与保存结果接续共用源端输入失败分类，保留错误原件，不对正常illegal裁决做纠错或重放成功操作。旧W中roster-decision-workflow状态机能由continuation=true转needs_model_choice；workspace已具备标准input-repair，缺的是Builder结果语义到此入口的映射。

| 方式 | PID（先精确ps） | 目录 | 身份／边界 |
|---|---:|---|---|
| 从空表联动写表＋Plan＋Teach | 18115 | build/slice272-product-generation-v645-Oc9hkr | decision-e8614ca0-551e-492e-8068-6e81d65765ad；0初始单位，无旧Plan |
| 成表写Plan＋同等Teach | 18116 | build/slice272-product-generation-v645-onHtyj | decision-a6d75905-a910-49a7-b260-f6eb8f7558d5；9初始单位，只取预制军表，不复制旧Plan |

日志`build/slice272-product-generation-v713-{editable,fixed}.log`。这两条是修复版端到端生产验证，不是复活旧同问题审核／重置旧账，也不是12场对战实验；旧两条所有失败继续保留。使用相同冻结数据、2000分Standard设置、Flash Adapter、Web/App产品HTTP入口及P0–P6调度，未创建或重置对战房间。初始状态不同不代表工程链不同。

实际启动：两精确PID均live，两个journey running/failure=null/r0，现写初始0单位、成表9单位，两者Plan均null，未导入旧Plan。两个初始角色都已返回investigate，正在正常Builder／规则／地图准备与初步战略交接；尚未形成首个新Plan，不能把启动成功计作正式产物。实时Node索引为activeRuns；legacyRuns/root是旧只读故障来源，不可拿来报新进度。

观察顺序：初步目标与军表→角色主动读Skill／规则／地图→局部Teach→有目的的真实工具证据→联动取舍→受影响复审→正式接受。具体必要工程未知未闭合不能准出。不能用合法2000、门禁GREEN或本记录替代真实最终产物。

最后中文逐步报告须从最终实际事件生成：完整脱敏prompt、公开回复、工具参数／原生结果、每次军表／Plan变化、依据与反例、自动恢复、人工工程干预，以及与旧方案的同条件策略比较。当前尚未交付为完成品；正式接受后才接后续对局，不跑旧房间／A–F。

## 用量边界

旧两条当前工作流在启动v713前已有至少138,618,026 API Tokens（含缓存输入）：现写68,783,028、固定69,834,998；之后旧调用还须继续计入。保留既有价格记录和未知费用，不清零。这个数不是整个项目／Codex对话用量，也不等于完整账单。新试产独立记账，最后汇总与旧账分列。
