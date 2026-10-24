# T27 / S272 / P2–P5：当前根场景与局部授权边界（v984）

## v987：真实重复范围拒绝，立即停止并修职责交接

**后续event11980：Native已实际检验部署。** 原件329ccc6b返回`SELECTED_SPATIAL_PATH_EXCEEDS_SPEED`，Host补入真实底盘起点(12000,36630)后路径12630milli-inch、当前最大4000。没有动作应用/新到达事实；参数字段与范围修复确实推进到几何判定，不是旧拒绝重现。Native返还完整合同和修复上下文，要求同父态/同域调用space.solve_formation并选完整候选；保持原件，后续正常有界修复不得Host手改坐标或推演整局。

**真实修复结果（event11976）**：PID3798按原断点普通恢复后，b3990514明确说当前错误为inspect-after-deploy超出委派，使用stepEdits.remove显式移除该子步骤，说明父任务排队inspect仍会从实际部署回执续接。14299351编译通过，failedWorkOrders=[]；不是Host删除，也不是重演旧成功步骤。1真实调用122833units/Provider6.712秒。当前只是职责纠错通过，Native部署几何仍待检验、Plan未改。观察器OOM已恢复，生产PID未停/未重发；后续大快照用独立只读短进程释放内存。

v986普通恢复PID98854后，一次实际请求`9d7beda2…`／回复`a79add36…`：122909 units，Provider7.507秒。模型声称只需修x/y字段，却保留inspect-after-deploy。`40e76c40…`再次是`ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED/work_after_delegated_completion`，没有Native执行。发现后立即SIGTERM，已确认退出，停在r23/event11973/0在途；未等待下一付费重试。

原请求确实包含正确task.error，因此不能说错误没传到。问题是最终增量命令未单列当前拒绝，旧提案的purpose/assumptions/stop仍写了“然后inspect”，同时要求保留旧方法；模型未按委派优先纠错。此外相同编译拒绝原先还会生成下一order-repair，没有纳入即时无进展门。

修复仅对应新流程P2/P5：

- `roster-work-order-edit-command-v1.mjs`明确currentRejection、currentDelegation、proposalAuthority=false。旧提案不是权限，显式remove可移除越界子步骤，但不取消父任务已排队的inspect；不由Host替模型删除。
- `roster-workflow-order-failure-v1.mjs`比较原错误与新编译错误、相关步骤/执行语义，忽略公开理由文字变化；相同拒绝未修才判无进展。成功修复/不同诊断不是同循环。
- `roster-workflow-read-role-v1.mjs`复用既有持久noProgressStop，原请求/回复保存后立即停止，不返回待续修结果、不给自动下一轮；冷恢复不绕过。
- 真实回复注入脚本`verify-slice272-order-correction-progress-v987.mjs`：RED2107；2773命令交付/反例检查通过，之后因夹具沿用旧context/session而被通信身份门拒绝（不是生产故障）；修正仅离线合成回执身份后3089以`--remaining`一次通过实际角色停止/冷恢复无二次调用/原件与workflow不变。0真实Provider、0Native、0生产写。已通过部分未重复。

下一同B现有局部修复使用新命令；仍需真实模型决定删除越界子步骤或返回owner，再由Native验证动作。不宣称部署可达/Teach收敛或正式Plan通过。T27 5/6、T23 33/36、正式0/6、新局0/12、剩余4片。

## v986：Native菜单旁的参数合同漏传（最新）

旧生成进程67477已安全退出，r23/event11968，0在途。不是重启房间；已完成的初始化/先手及其真实后态保留。当前待执行为既有`selected-native-action:input-repair:order-repair0`。

1. 原inspect `51cbf205…`同时发布`receipt.actionSpace`与`receipt.actionParameterContracts`；完整合同由Native提交校验器同源生成。原请求`92b80c7b…`只有浅层菜单，所有promptNodes中没有`xMilliInches`，并非模型看到了完整合同后仍拒绝遵守。
2. `e1822bff…`选择Marine部署域并提交x/y坐标，Native `c0f93f15…`返回20个嵌套字段缺失，部署没有执行。不能据此评价路径是否可达；原几何仍须规则器检验，未手改或批准。
3. 自动输入修复`64c0e71a…`改对坐标字段但追加了下游inspect，被`ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED`拒绝，转入已有局部工作单修复。保留该失败，不把它算成功部署。
4. 源投影现在交付同一原件中的合同；首次修复后的真实角色门发现最终`native_choice_command`白名单仍会删掉合同，故补同一交付链的第二出口。
5. RED95597复现真实缺失；源门已通过后未重跑。修出口后PID98153的`verify-slice272-native-choice-parameter-delivery-v986.mjs <flow> --remaining`一次通过：实际产品角色请求含精确合同、错军表/错父态拒绝、旧错参数仍拒绝、原件和workflow不变。0Provider调用、0Native执行、0生产写入。

改动：`roster-native-choice-sources-v1.mjs`、`roster-native-choice-command-v1.mjs`、对应真实失败复现脚本；下一只接同产品断点，禁止重演成功步骤。参数形状通过不等于距离/碰撞/部署合法，更不等于Plan验收。

性能：两个2秒系统采样文件已保留于build，忙时大量栈为StructuredClone/ValueSerializer/Deserializer，尚未定位具体JS调用点，不能据此宣称修好性能。没有引入性能改动。

T27 5/6，T23 33/36，正式Plan 0/6，新对局0/12，余4片。同一问题无新增事实、决策或状态推进时立即停止，修复后才恢复；不以重复付费请求等待概率通过。

## v984真实结果与v985分块续修（最新）

**event11909：先手选择已执行，Marine部署域已真实开放。** 同PID67477，r23未改；下一为第二批已有事实汇总，禁止重启或重演初始化。

- 正常续接方法`…:method:57d8627754104f0a`以已保存后态`26adbf33…`为起点。`c5e56087…`读取新菜单目录，`84fc4ec4…`提交“选择先手→inspect部署菜单”的有界工作单，明确先手选择是条件实验假设，不是实际对局事实，不扩展到其他单位/对手回合。
- `fde3f49d…`按真实2311/index0选择player1先手，一次通过，无格式纠错。Native原件`387a6050…`为completed，`choose_first_actor`生成新后态`6d0595f4…`，并真实记录`phaseFirstActorByRound['1:movement']`；不是只生成提案。
- 后继inspect原件`3d65402a…`为completed，round1/movement，17个参数域；其中marine-1有deploy域`sc-domain-88c2e033…`与resolve_relocation_ability域`sc-domain-3e368cc8…`。这证明相应动作入口在完成先手阶段后可用，不证明部署已执行、位移能力已支付或到达(12,24)。
- 过程有一次对同一保存后态的额外inspect，可作为后续减少冗余的优化项；后续确实执行新动作、产生新后态，不将其冒称无进展循环，也不因此重启实验。
- 累计11个模型调用 **840459 units / Provider76.606秒**；进程存活约31分31秒。Provider时间与全流程差距明显，不能宣称性能已合格；本轮优先确认真实方法与状态交接，未运行无关性能门或旧测试。

P2/P5本轮新增证据是：分块事实任务能沿保存结果续接，并推翻错误能力判断；**不是P6正式Plan通过或策略提升证明**。军表/Plan仍r23，正式0/6、新局0/12，剩余4片。遇到相同争议无新增事实/决策时仍立即停修。

**event11850：事实汇总已完成**，`0760b3a1…/evidence_ready`。准确限定为上述三步条件实验；明确先手尚未选，不能证明部署/移动域、到达、得分或最优性；大区块`available_unread`不是工具缺失。PID67477仍运行，下一观察正常父方法回交，不重演已成功三步。下方用量统计截至11843，不含随后汇总。

**event11843：有界方法三步均有真实回执**。同PID67477继续运行，军表/Plan仍r23。

| 实际阶段 | 结果与原件 | 证明边界 |
| --- | --- | --- |
| 场景准备 | `0403e7e8…`，scenario completed，分支`73c6cc4c…` | 同源首回合条件场景，不是新对局 |
| 实际菜单查询 | `05d1e918…`，round1/start_of_round，唯一finite为resolve_mission_start_of_round | 系统没有直接执行未观察菜单的提案；自动查询实际菜单 |
| 模型按菜单选择 | `36c2e7c9…`，精确条目补读一次后`da5b7e82…`确认，选择2295/index0 | 补读带来新正文，不是相同信息循环；旧选择与回执保留 |
| Native执行 | `ebeef621…` completed，后态`26adbf33…`；父步骤回填`4562cdd6…` | 真实规则器执行了任务初始化，不是模型声明成功 |
| 后继inspect | `b252ebbf…` completed，round1/movement，两个choose_first_actor，parameterDomains为空 | 必须先选择先手，不能把当前暂无部署域说成工具缺失；到达仍未测量 |

本工作单已到其预定“任务初始化＋后继inspect”边界，下一是已有事实汇总任务，不可擅自跳过choose_first_actor或把路线判为完成。包括独立审核累计7次调用 **600387 units / Provider51.925秒**；并不代表总墙钟耗时达标。没有新增军表、Plan修订或正式对局，正式0/6、新局0/12。后续出现同一无进展争议仍立即停修。

**v985事实修订已从重复结论推进到真实工具执行**：同B、同PID67477，r23/event11808。实际请求`8dcad689…`含`fact_method_context`和根场景精确来源；`fd98925b…`请求7个地址，其中1个已交付、6个为该任务新读，增量记录保留，并非纯重复循环。随后`d941cb37…`明确撤回“旧relocation后继证明工具不可用”的推论，提交有界首回合初始化工作单，而不是重复原结论。

- 工作单先`scenario(start_of_round)`，再Native任务初始化，最后inspect真实后继菜单；尚未预选后续部署/移动，不做整场演练，不把准备阶段视为到达证明。
- 首次工作单漏必填`participantConfigurations`，正常局部纠错`c8c4078c…`补为准备实验允许的空数组，其余方法保持。无需人工改模型回执；该任务turn3/evidence_ready/correction=null。
- 首个真实工具结果`0403e7e8…`已保存：`operation=scenario,status=completed`，源仍`adabe1f1…`，分支`73c6cc4c…`。任务初始化与后继检查尚待完成；没有证明目标可达、没有修改军表/Plan，也没有放行未知。
- 事实角色3次调用共 **190476 units / Provider21.162秒**；本次PID加此前独立审核累计5次 **459609 units / Provider43.333秒**。这是Provider时间，不是整个流程耗时。
- 只读观察器因长时间保留多份65MB工作流快照耗尽堆而退出；生产PID仍存活、未重启。观察器已恢复，后续快照使用短生命周期局部变量，只输出必要字段，避免继续积累。未删除原记录。

接下来只观察同进程的实际Native回执；新事实/执行步骤是进展，若重新出现无新增事实或决策的同一争议，立即停止并修复，不能用新任务名绕过循环。正式Plan仍0/6，新对局0/12。

以下为此前审核与改造记录。

**v985真实独立审核已完成**：`8db42808…`提出两项requires_revision，经7份正常来源补读后，`5a6aba4d…`仍明确否决“当前方法不可用”；event11771保存`cab9001a…`、审核evidence_ready/correction=null。判断依据是已授权新方法尚未执行，不能拿耗尽relocation后继替代其执行结果。补读不是重复实验或格式纠错，旧结论未放行。两次真实审核共 **269133 units / Provider22.171秒**。

**event11776已自动派发 `…:investigation:source-revision`**，事实角色正在准备其请求，PID67477仍在运行。尚未观察其实际方法选择，不冒称新分块已让模型收敛；下一只观察同PID，重复原结论且无实质进展即停。军表/Plan仍r23、无新Native。

**v984来源交付已真实生效，语义尚未收敛**。实际请求 `ed72726f…` 包含根场景2275的4个精确字段和局部授权节点；回复 `3457d914…` 明确承认根场景 `sourceEligible=true`，但仍用旧后继移动域耗尽和不可跨轮推成整个到达问题不可测，没有尝试该次授权的方法。保存为待独立审核的结论，不是Plan通过。

发现后立即请求停止；PID61869已退出0，**r23/event11737/0在途**。退出前已排队 `…:investigation:source-review:v2`，没有重发该成功事实回复。新增1次真实调用 **243120 units / Provider12.069秒**，0新Native、0军表/Plan修改。

随后P2修正了“只追加边界说明，却仍内联大量旧解释”的入口问题：

- `roster-workflow-correction-context-v1.mjs`复用原文留存＋同reader引用机制，显式局部事实方法也有自己的输入投影，不再只给战略作者纠错分块。
- 旧调查结论/审核、整体decision目录、已关闭比较转为可读背景原文；原全局问题、当前局部授权、当前军表、工具、精确读取和必要反馈不改。目录只内联当前显式引用，完整原目录仍可读/可搜索。
- `roster-workflow-read-role-v1.mjs`普通事实请求接入，不依赖出错后才触发。挂起/原回复重验及已聚焦的委派选择命令不篡改。
- 这不自动选择实验，不改变必要未知或最终标准；不以更短输入证明更好策略。

具体失败脚本 `verify-slice272-fact-method-context-v985.mjs`：**RED66010**显示旧结论仍以内联evidence出现；首次修改运行遇到参数/局部变量同名语法错误，已改名；**66874一次GREEN**，原文逐值可恢复、当前源/授权不变、真实普通角色入口采用、无生产改写。旧已过门未跑。

同一保存请求序列化体积 **1,364,671→1,003,990字符**（约减少26.4%）；包含机器侧元数据，不等同实际模型Tokens/耗时或整体策略无损。0离线Provider/Native/生产写。

v985真实观察：确认61869退出0、无在途后，沿同B原产品入口启动 **PID67477**，日志 `build/slice272-v985-local-fact-context-1792787428478.log`。下一是既有独立来源审核，不是重发3457d914。只观察同PID，不因准备间隙重启；若无事实/决定进展的同一争议再循环立即停。正式数量仍0/6、对局0/12。

以下为v984此前实现和启动记录，不能据其“待追加”推断当前状态。

## 本次要修的真实失败

v982第四事实回复 `2b1a3ac9…` 把后继2098的 `sourceEligible=false` 推成当前到达问题不可测。该回复只处于补引用待确认，未被接受；v983已停止运行并修纯重复读取门。

本次核对三种原因：局部授权被原全局问题盖过；可用根场景没有进入可见输入；工具实际上不支持初始化。

证据支持前两项：

- 同源根场景 **2275 / `tool:discovery:r23:context`** 已保存，原件 `47512888…`，Native inspect 返回 `round=1, phase=setup, sourceEligible=true`。
- 它与当前 army/rules/map/source 绑定完全一致，stateRef.stateHash 与 sourceStateHash 相同，contextRef为空。不是换军表或换地图的替代实验。
- v982实际第四请求 `660511b8…` 的角色可见正文/目录没有该来源。完整机器编号表保留它，模型虽可另行搜索，但当前输入围绕既有后继2098展开；后者不可重新初始化不证明当前根场景不可初始化。
- 原问题仍列 marine-1/marauder-1 与三个位置；当前授权具体为 marine-1 向(12,24)的有界观察。局部方法结束与原全局义务完成必须分列。

这不证明 Marine 一定能到达，也不授权重置已用卡牌、重复成功动作或跨轮整场模拟。

## 修改

1. `roster-workflow-read-context-v1.mjs`：共享当前根场景引用投影。只认产品实际登记的 discovery 原件，核军表/规则/地图/源绑定、完成状态、完整 source stateRef 与根身份，选取最新同源记录。
2. `roster-workflow-read-role-v1.mjs`：事实方法负责人通过现有 `readEvidence` 增量取回四个精确字段：stateRef、phase、round、firstRoundInitialization。原件不改、不调用Native、不自动选择实验来源；有明确父态的委派动作选择角色不被替换。挂起/原回复重验请求不更改当时输入。
3. `roster-inquiry-premise-boundary-v1.mjs`：显式授权的局部观察/停止条件独立呈现，完整原问题仍保留。局部事实不足以解决全局时保留结果和剩余问题交原负责人，不把未完成全局要求推成所有工具不可用。

## 定点证明

脚本 `scripts/verify-slice272-source-scope-delivery-v984.mjs`，真实B输入/原件，内存存储和捕获Provider边界，不调用模型。

- **RED59997**：实际事实请求缺当前根场景入口。
- **60728**：改后实际执行器交付根场景四字段、Native eligibility=true、不授到达/替换后继权限均通过。后段夹具未执行产品Run的事实任务投影，导致缺question/授权节点；这是夹具缺失，未称全脚本通过。
- 夹具补同一 `projectRosterWorkflowFactInquiryV1`，与产品Run接线一致；只追加 `--remaining`。**61463通过**：局部授权与原问题全保留；错军表、非根后继拒绝；原件/增量台账不改。没有重跑已通过根场景门或其它旧门。
- 0真实Provider、0Native、0生产状态写。仍需真实模型消费验证，不能据此宣称Teach收敛。

## 真实验证恢复点

旧PID44331已退出0，原 **r23/event11724/无在途**，磁盘可用约19717MiB。使用原产品命令、原B目录恢复，没有新建房间或重置次数/费用：

- PID **61869**。
- 日志 `build/slice272-v984-root-source-scope-1792786843532.log`。
- 目录 `build/slice272-product-generation-v645-8aBuEV`。
- 同时加载v983重复读取停止门与本次来源修复。只能观察同进程，不能因准备间隙无pending就再启动。

真实结果待追加；发现无进展循环立即停止。第四旧结论不会因新增入口自动批准。

## 整体状态

T27 **5/6**，T23 **33/36**；剩余S272/S248/S249/S250四片。正式Plan **0/6**，新对局 **0/12**。P2来源接线与P5停止门的局部证据增强，不是P6完成；中文最终流程报告仍必须对应最终真实军表/Plan。

`harnessLoopUsed: true`；目标StarCraft；fact_probe/harness_optimizer路由；证据为实际请求、Native保存回执和执行器捕获。无UI/对局变更、无训练真值、无Host战略选择。错误绑定进入当前源、根入口替换显式后继或原问题被删除均应撤回本投影。
