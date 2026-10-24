# T27 / S272 P1/P5：Plan 修订后的实验职责返回 v914

## 真实停点及原因

B 在 r5→r6 只修改 Plan 的 componentPurposes，军表仍 2000 分 / 145 气。最后事件 5850，退出原因为 `ROSTER_DECISION_NO_READY_WORK`，非网络失败。提交事件5774、回执 `62b9dfc648844f687e2a2ecff6f45264ee3e84219c5c98513638feb5b4637ea9`。

冻结果比较的军表/规则/地图/来源依赖没变，原问题仍有效；但它等待的战略负责人引用旧 Plan，提交后失效。原 return 只接受 retain/record_facts，未处理已经实际提交的 Plan 修订，因此没有后继。B r6 草案含 small/large 和比较方向争议，仍未通过审核；恢复执行不批准这些论述。

## 修改合同

新增单一 `projectRosterPlanRevisionReturnsV1`，供核心事务从实际提交回执推导续查任务，产品 synchronize 同时覆盖正常运行与冷恢复。调用方不能拼装任意恢复输入。

1. 必须是当前真实提交；军表未变，前后军表/规则/地图/来源一致；当前 Plan 身份与回执相符。
2. 必须是冻结比较的显式后代提交，原问题没有被替换，没有在途请求或未完成分支。
3. 原问题、来源争议、原审核、失败结论和批次/审核轮次保留。当前 Plan 和原实验 Plan 分开传递；旧战略作者仍失效，不被复活。
4. 新负责人和解除原等待状态同一 checkpoint；冷恢复幂等。不重放工具、不清费用、不重置纠错历史。
5. 只恢复职责，不授事实/策略/发布通过；变更军表、地图、规则或来源不能走此复用路径。原生工具描述仍由产品运行时交付当前版本。

## 唯一对应验证

`scripts/debug-slice272-plan-revision-return-v914.mjs` 使用实际 B r6 全工作流和已存原件，只写独立测试证据，内存执行核心。

- RED：原系统无这条返回转换。
- 一次 GREEN：原问题/原争议/计数/结果保留；生成唯一可调度负责人；冷恢复不重复；核心真实解析输入后完成一次注入回复。
- 军表、规则、地图、来源变更，非本题作者，在途请求、已替换问题共七类注入都不能授权返回。
- 原生产工作流逐字不变；0 Provider、0 Native、0 生产状态写。旧通过门禁均未重跑。
- 证据：`build/slice272-plan-revision-return-v914-red.json` / `...-green.json`。

这只证明工程交接，不是正常模型结论或策略改进。正式 Plan 0/6、对局0/12，T27 5/6、T23 33/36，剩余4片。

## 实际产品加载

旧 A98625/B98632 均已退出后，原目录同版启动 A13462/B13469，日志 `build/slice272-v914-plan-return-fixed-1792704838552.log` / `...editable-1792704838555.log`。

B实际事件5851已自动完成职责返回，随后原问题新负责人 `...:study:plan-revision-return:r6` 进入运行（至5869）；A至6123，继续原来源审核，r3不变。没有重建房间或重新初始化军表，未追加纠错额度，也未改旧回执/费用。新模型答案及比较收敛尚待，不能用真实入队代替结论。

续行观察：B5891保存新负责人实际读取回复 `84f6761c82f34dee5107d9e23c0197076aa3a8b7dd38b5bcc30e0f5dc99f16bb`（原付费回复 `5ff4bf470c0e432a8c9d91b3bec7e99838dca3a78a71d2b819d7d3fba947cc52`），读取5项证据后等待本人确认，未接受结论。A6130进入该场景菜单来源的汇总审核；具体菜单断言获得局部支持，不证明冲锋/生存轴已完成。下一步跟踪原负责人是否正确理解配置与方向、原比较能否完成，不重复已过门禁。

## 实际自动纠错跟踪（后续观察，无新生产修改）

B5907实际结论 `62615a7e7ddd875e8fe2f3c5bf88a9b5d9459449e2cc623b8e7693fbfbee2886` 仍把两个贡献模型当large并反读差值。对应请求 `fd5aa9377e62e592f3cc779b1d1b3d2624cde4c9f509183853fa25c0facf5e19` 已包含 #862 的 small/Kinetic Foam 配置与原件比较方向补充；本次不是这两项漏传。请求也仍有较多旧作者解释，不能据此直接判定因果或盲改prompt。

- 来源claim0实际 `96479eea76be3cd4064929416ea0f22885a068a669bf13181df5a39f32a42a77`：数值保留，large解释 requires_revision。
- 有一条局部claim3错误地接受“旧配置过期”的归因；这不是可靠结论，应继续跟踪修订后的审核，不以其supported单值当事实。
- 总覆盖审核实际 `6ba7ae9fa5c7d4e896cf0428b6a4bf6bc444b7ddc72287546de49d229bf01b6a` 明确否定反向解读与过期归因：Marauder-minus-Goliath=+0.527778，原small配置不是被授权的large替代。
- 至B6001，产品自动派 `...:plan-revision-return:r6:source-revision`，未手填结果、未追加额度、未重跑成功测量。尚未得到该修订的最终答案。
- A的来源汇总 `5826bc87bd07c91a5452a75a9e5483cbcdd24f81ede572bf519d56cc022e6337` 只支持旧场景不能执行目标测量，不代表生存轴完成；策略角色已自主授权限定的新场景方法，至6186进行方法设计。

### 本轮逐边合同核查范围

| 交接边 | 可信内容/责任 | 实际检查与未完成部分 |
|---|---|---|
| 原工具→读取投影 | 原身份、配置和算术保留；模型数不推断编成 | v913实际B新请求已交付配置及正反方向；仍有模型误读 |
| 模型结论→独立来源审 | 模型答案是提案，不是工具事实 | B配置错误被claim0否定；claim3局部误判仍需关注 |
| 分项审核→总判断 | 核心组合分项结果，不能由总模型抹掉失败项 | 静读`assessRosterSourceClaimReviewV1`/`assessRosterExperimentConclusionV1`，失败项进入未通过状态；B总审核也实际否定两处错误 |
| 未通过→局部修订 | 原问题、有效数值、具体失败反馈与轮次同时交回 | `createRosterExperimentReviewRevisionV1`共享出口；B实际source-revision已排出，最终修正待 |
| Plan提交→实验负责人 | Plan-only不使事实实验丢失；事实条件变更不得复用 | v914真实断点RED/GREEN＋B5851实际返回 |
| 实验→可查询经验 | 观察、已审条件结论、发布Skill三层隔离 | v905/v912已有出口；本轮未审结果没有发布；对局Skill检索及适用性仍待 |

本表只声明这些具体边的证据，**不是全工具/全状态机已完成验证**。正式产物数量仍不变。

## 实际自动纠错结果（B6022 / A6196）

B原负责人实际修订 `517936107c00e5e6ba509a351e7fef57915a514f9d3be9d6d500d751e1b15f4a` 已自行承认并纠正：Marauder伤害期望高0.527778，实际测量配置是small/Kinetic Foam，不能再称旧配置过期或large。没有新的Native测量，也没有人工填写答案；原数值和原问题保持。这补强P5“具体来源错误→反馈→作者纠正”的真实证据，不证明策略提升。

重要未闭合点：修订仍标`answered`，同时承认没有验证原被授权的large替代。因此尚不批准原比较；下一步必须检查问题覆盖审核仍要求原范围，不能把收窄陈述当原实验完成。当前Plan仍r6，错误旧purpose尚未证明已修入新Plan。

A新方法结果 `09a974e84efda90c374587b5cd4e225e0dae8737b125025f5215df6208a57246` 的场景spec缺kind，`ROSTER_EXPERIMENT_SCENARIO_KIND_FORBIDDEN`，dispatchOutcome=not_dispatched。属于明确输入错误，进入现有order repair；没有实际执行新场景或取得生存分布。下一步观察其按已交付工具合同自动修正，不能说实验已经完成。

## Harness

- harnessLoopUsed: true；targetGames: starcraft-tmg。
- promptPackRoutes: 原比较 experiment planner → source review；无新策略注入。
- harnessToolsCalled: 保存提交、共享关系图、核心调度及只读证据；不重放规则执行。
- agentDecisionEvidence: 实际 B r6 提交为来源，测试回复明确为 injected。
- memoryTraceEvidence: 不发布经验；v912 条件结论归档仍要求已审结论。
- uiTraceEvidence: 本轮没有新增 UI 验证。
- trainingTraceCandidates: false。
- rollbackOrDemotionRules: 如发现变更事实条件仍被沿用、历史丢失、重复执行或准出状态被提升，停止该返回转换。
- userVisibleChecks: 明确区分调度修复、模型事实纠正和最终策略产出。
