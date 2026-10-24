# T27 / S272 P1/P5：能力交付修复后的作者重审 v974

## 原停点

B `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，r23 / event11454，旧PID87021已退出、0在途。

v972/v973已经修复工具输出说明及策略请求的当前能力目录，但原r23决定及其未执行调查来自旧prompt。直接运行后续调查会继承错误的能力判断；不能把修复新请求等同于修复已保存决定。

## 产品实现

复用既有工作图的 `hold_experiment_for_strategy`，不增加第二套恢复状态机：

1. 显式指定待重审调查、真实原回复、当前草案版本和工程原因。
2. 核对原调查尚未开始、没有在途调用、源作者结果/付费调用身份相符，且实际原策略prompt没有收到当前能力目录。
3. 暂扣旧调查，交给正常策略角色重审；保留原决定、所有问题、当前Plan修订理由及旧费用。
4. 当前可执行工具能力仍从产品真实descriptor生成；不是测量，不自动批准或修改军表/Plan。
5. 同一恢复重复调用幂等；换版本、换原回复或已开始的调查拒绝。

端口由产品写锁保护，经 `/workflows/:id/reconsider-capabilities` 调用。薄HTTP运行脚本只传精确恢复标识，之后仍使用普通 `/run`。没有实验专用Teach/模型链路。

## 定点验证记录

`scripts/verify-slice272-capability-reconsideration-v974.mjs` 使用实际r23状态的内存副本，不写生产状态，不调用模型或Native。

- RED94711：没有安全重审入口。
- 95226：新增实现误用了不存在的clone函数，修成structuredClone。
- 95437：原件/Plan保留、作者交接已通过；夹具用isActive判断调度暂停错误。未解任务可以仍属active；真实调度入口使用canRun。
- 按既有定点追加授权，仅补 `--remaining-dispatch` / 95874：旧调查canRun=false、新作者canRun=true、冷恢复不重复派单、错误来源/版本拒绝。已通过交接断言未重跑，旧门未跑。

## 真实执行

PID96777，日志 `build/slice272-v974-capability-reconsideration-1792780374375.log`；同原B目录、editable模式，通过产品HTTP先做上述交接，再执行正常工作流。实际结果待追加，不能以离线门禁代替模型消费证明。

### 已有真实证据

- HTTP交接成功，回执 `5b3dd17e262705825e11c650aba6043fdceab2220222ceba4cb6e356d7fc6b61`；旧followup:r23绑定hold，新 `:capability-delivery-reconsideration:v1` 作者ready，0原生动作。
- 产品先按已有顺序复核r23的旧可选比较关闭。首真实请求 `612c45de…`（615637字符）已包含 `currentToolCapabilities`，其中 `mission_marker_control` 明确返回范围、LOS、资格及Supply。v973不再只是本地字段证明。
- 回复 `7274f735…` 选择保留原军表/Plan和已完成的小臂比较，明确Plan计分变化不改变该槽位取舍，未请求重跑火力实验。194053 units、Provider18.540秒。
- 回复额外提供 `decisions[0].retainedSectionReasons`，被当前schema拒绝，现走一次正常结构纠错；尚未把该回复计为通过。地图重审尚未实际执行，不能称整体收敛。

### 前置关闭已完成，原作者重审已派发

- 结构纠错 `0615510f…` 消除了该额外字段问题；随后正常补读原件并由 `5f7f3119…` 确认，没有再次修改代码或重跑实验。
- 关闭审核读取原件后给出支持结论，补齐一条引用后最终通过；**event11534 `optional_comparison_closed`**，回执 `ef31598485a78ee871522e1f9ecfb3c61a96a254cf040d436695908859aa09ad`。军表/Plan未改，不代表整份Plan批准。
- 该前置链共6次真实调用，**1110772 units / Provider91.706秒**；含1次结构纠错和实际保存证据读取，不是新增Native实验。端到端时间远大于Provider时间，不宣称性能改善。
- **event11537** 已派发原目标 `...:followup:r23:capability-delivery-reconsideration:v1`，输入 `8b467a846f5f5098ab8de57233b6d0e869be38806dfd7600b468ae6d915693f4`。PID96777仍活，旧调查保持hold，下一只观察本作者是否正确使用当前能力并推进必要问题。

### 再次选错合同，已停止；v975补当前合同导航

真实请求 `3044cc83… → 42ebac11…` 已有当前能力摘要，但作者称旧合同940是当前合同并重新读取 `/operations`。发现后立即发出一次SIGTERM。此处暴露第二层来源问题：当前能力摘要没有带当前完整合同的读取地址；历史合同在通用目录里仍可读取，不能据此称为当前执行接口。

安全退出期间原操作继续完成保存引用确认，`9fc85351… → b4f53e32…`、`ca67f12d… → 56349385…`。其决定仍把控点范围当成“不能由局部查询取得的Rules问题”，并再次授权到达调查，不能称已正确采用新能力。

**最终停止状态：PID96777已退出，r23 / event11570 / 0在途。** 作者结果 `33ff78dfbd0fdfb13749becccf84008c504aab7eb886baf5eafb0a14fdaf7c7c`；新 `...:capability-delivery-reconsideration:v1:investigation` ready但未执行。军表/Plan未再修改。整次v974共9调用，**1907836 units / Provider128.481秒**；0新Native/房，历史及费用保留。

v975修改：

- 产品Run给策略角色现有 `tools` 输入，沿已经存在的分块目录机制绑定真实当前descriptor及精确evidenceNumber/JSON Pointer，不只给无读取地址的能力摘要。
- 正常角色请求增加 `executable_tool_contract_scope`：当前合同的确切来源、旧合同编号列表、历史可读性与“接口说明不是测量”边界。只改请求投影，不重写旧原件或存储有效性，不影响规则算法。
- `verify-slice272-current-contract-navigation-v975.mjs` 使用真实错误请求，通过实际Run→角色→请求构造验证。7853夹具漏conditions先失败；修正后8064实际RED（缺当前合同导航）；8339当前目录、精确地址/原件相等、历史身份与权限、旧原件hash断言全部通过。最后夹具错误检查存储中不存在的validity字段而失败，该无效断言已移除；没有重跑已通过部分，**不记作整条脚本一次全绿**。

v975尚未真实加载。下一必须先处理当前未执行调查的错误能力前提，再恢复；不得直接运行旧派单。v974重审入口目前仅覆盖“修订后literal决定＋缺currentToolCapabilities”，本停点则是“investigate的evidence引用决定＋已有摘要但缺当前合同导航”，需要沿同一责任回交机制补齐该实际输入形式，不能手改Plan、删调查或再次独立初始化。原请求、结果和当前状态提供了精确复现来源。

正式Plan0/6、新局0/12；T27 5/6、T23 33/36，余S272/S248/S249/S250四片。同问题无新证据、有效决定或状态推进即停，不扩大重试额度。

## Harness边界

- harnessLoopUsed：true；targetGames：StarCraft TMG。
- promptPackRoutes：正常strategy_decision，当前工具能力目录由实际执行器投影。
- harnessToolsCalled：产品重审与run端口；无手写规则结论或房间操作。
- uiTraceEvidence：本轮为Web/App相同HTTP产品链路，不宣称浏览器UI验收。
- agentDecisionEvidence：保留原付费回复与r23修订；新作者实际请求/回复待记录。
- memoryTraceEvidence：旧工作、未知、证据和调用不删不清；不把调查草案写成对局记忆。
- trainingTraceCandidates：无自动晋升。
- rollbackOrDemotionRules：当前目录未实际交付、沿旧能力判断重复调查、无进展改写或越界模拟整局，立即停并保留失败。
- userVisibleChecks：只有真实军表/Plan与完整闭环通过才计最终产出；当前未达到。
# v976：同一重审入口兼容实际引用式决定

2026-10-24，B 原 r23/event11570，原进程已退出且无在途请求。最新调查尚未执行。

- 具体缺陷：修订后的派单内嵌 literal 决定；正常 investigate 派单引用已保存的 role 证据。旧重审入口只支持前者，不能处理真实停点。另把“当前能力摘要已交付”误作“当前完整合同导航已交付”。
- 修复：同一入口解析两种决定来源，引用形式逐值核对原生产结果及绑定；显式交付版本 1 检查摘要、版本 2 检查实际请求中的 tools/source/scope 导航。仍只执行已有 hold→正常作者调度；原决定、军表、Plan、历史和账目不变，已闭比较不重演。
- 产品链路：Journey 写锁入口传递 requiredDeliveryVersion；原 HTTP 路径不变；原运行客户端新增 `--capability-delivery-version 2`，不是另建实验流程。
- 定点证据：`verify-slice272-referenced-capability-reconsideration-v976.mjs` 用实际停止状态的内存副本，RED13916 复现拒绝，修改后一次 GREEN，证明原值解析、原生暂扣、正常作者可调度、冷恢复幂等、错误回复拒绝。Provider/Native/生产文件写入均 0；未重跑已通过门。
- 实际作者使用新导航尚待观察；这不是最终 Plan 通过，更不是策略改善证明。重复同问题/同证据且无事实、决定或状态进展时立即停修，不增重试额度继续空转。

# v977：已有重复诊断必须第一次就停止

## v976 实际结果与停止点

- 同一 B 产品入口重审报告 `40ebc68ab07ac41ce364785ebe035851bd2d87b81121fe5adbc699ec43bedd45`，旧未执行调查被正常暂扣。
- 真实请求 `4e706daf2bca78fa8a605c55423dee68ed016e62a527a377e863630a55d87cfe` 已带当前工具目录、合同 2202 的精确地址和历史接口编号（含 940）。不是漏接导航；请求约 1,127,939 字符，未声称性能改善。
- 第一回复 `bc188c1fd8eb0737780ffd0f4fbe99db5a2cffae5921e888c5235b0c491f7ffb` 的 nextInvestigation 与原作者逐值相同，继续把控点范围查询搁置。原校验已产生 `unchanged_investigation_authorization`，但仍进入引用读取后再纠错。
- 发现重复即请求安全停止。当前操作的第二回复 `c9165771c10f2bc46faa94202045e114db7550557da9073b8a6dcd7aa4ab5bd7` 保存后，既有重复纠错门持久停止。PID 15634 已退出；**r23/event11606，needs_repair，0 在途**。没有执行新调查、没有 Native 动作、新房或 Plan 修改。
- 实际新增 2 调用：194,662 + 312,423 = **507,085 units**；Provider 返回耗时合计 **26.362 秒**，不是全流程耗时。费用保留原账，不清零。

## 修复及可用性证明

只修改既有角色执行器的停止时机：`unchanged_investigation_authorization` 本身已经对比同责任链、同绑定的前次授权，不必再付费重复一次。首次命中即保存 `noProgressStop`、原回复和前任务身份，抛出原停止类型；不读取引用、不派纠错，不改变模型策略或事实。

具体 bug 脚本 `verify-slice272-immediate-investigation-stop-v977.mjs` 复用真实请求、回复与责任链，内存检查点，**RED19707 → 修改后一次 GREEN**：

1. 注入第一条真实回复，立即停止；未发生引用读取或第二次模型调度。
2. 完整保存该回复、停止原因及原责任来源，不批准 Plan。
3. 冷恢复仍停止，调用数不增，历史不清零。

验证真实 Provider/Native/生产写入均 0，未重跑以前已通过门。未宣称所有换措辞的语义循环均能自动识别。

## 剩余问题

作者照搬旧提案且忽略当前工具说明的语义问题仍未修好；需要继续检查输入角色边界和历史提案的继承方式。**B 保持停止，不通过加重试、只重启或重做已关闭比较来继续。** 正式 Plan 0/6、新对局 0/12；T27 5/6、T23 33/36，余 4 个 Slice。
