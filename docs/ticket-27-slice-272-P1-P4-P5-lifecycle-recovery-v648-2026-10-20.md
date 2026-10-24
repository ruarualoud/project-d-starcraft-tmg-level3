# P1／P4／P5 v646–648：已答问题、原请求恢复与草案生命周期

2026-10-20，T27／S272。新 P0–P6 产品施工记录，不是最终军表／Plan 验收报告。

## v646：已回答的问题不应再次变成必要调查

固定表实际付费回复 `9a2490b5-0edd-4e58-b7d1-f6d271ee3bf1` 已明确写“already answered”，却只能把原问题留在 necessary_fact，随后被重新排入调查。

- 共用 dataQuestions 增加 `answered_fact`，保留原问题、公开答案／来源理由；Host 只把仍未解决的 necessary_fact 投影为 requiredData。
- 作者合同 1.5.0、审核合同 1.1.0 共用此语义。没有按文本关键词自动改旧分类，也没有删除旧问题／回复。
- `verify-slice272-answered-question-lane-v646.mjs`：实际错误夹具先 RED，来源修复后一次 GREEN（PID78202）。0 Provider／Native／生产写。分类夹具是显式输入，不伪称模型自行纠正。
- 真实后续已观察到作者和来源审核使用 answered_fact；**这不证明每个问题引用均正确**。当前只检查总体引用确实读取，尚不能仅据该标签证明逐问题答案与来源吻合，独立源审仍必要。

## v647：正式 HTTP 产品恢复精确 Provider 停点

固定表有三个保存停点：一个 HTTP200 后正文超时、费用未知；两个 DNS definitely_not_sent。原产品入口不能调已有精确恢复端口。

- journey 新增 recoverProvider；HTTP 新增 `POST /workflows/:id/recover-provider`。
- 只恢复真实 pending context，先完成整批恢复计划，再排队；重复排队拒绝。无出网的自动重试按保存记录找回未发送根请求，不创造新原始请求。
- 未知费用需要显式授权，保留旧失败／费用和恢复历史。恢复不清空语义纠错计数、不重跑成功工具、不建立另一套生成器。
- `verify-slice272-product-provider-recovery-v647.mjs`：404 RED → 来源修复后一次 GREEN（PID83210）；隔离夹具调用真实 HTTP/journey，底层精确 Retry port 为替身，0 Provider／Native／生产写。
- **实际生产也已恢复**：`build/slice272-product-generation-v647-fixed-recovery.log` 记录三请求排队，其中一项未知费用授权。三项随后均真实返回并保存 resultRef，原记录未删；不是只靠替身测试宣布恢复。

## 固定表实际 Teach→Plan r1→r2

固定军表仍 2000矿／120气、9单位，army hash `29d12ca7…` 未变。实际提交回执 `d7afa45f3b4610cbc38d15c3369735b889ece0c39bb1785c89a124051b32943f`。

模型修改了得分角色、备选论证及条件式目标，说明 Teach 能到达 Plan 提交端口；但这**不是已证策略提升**。例如“没有固有得分加成”不等于不适合作为主要争点单位，仍须审视其实际用途。

新版同时生成错误原句：

> 无增援；preset_immutable满编2000矿，损失不可补充，故以Medic Life Support与Raynor Orders减少关键单位损失。

该句混淆赛前写表权限与对战规则。r2 未获最终批准，不能因提交成功放行。

## v648：从真实错误输入修共享生命周期合同

### 两条原始失败

1. 从头写表实际回复 `2a64103e-2a3c-4cf2-9f40-6f85bfccc93a`：960矿草案合法，已读多页 1530／1540矿分支，但认为必须先找到一次达到最终目标的分支，否则任何中间改表都“不合理”，持续翻页至 offset168。
2. 固定表 r2 上述“preset_immutable→无增援”的推导。

### 修改

`roster-review-data-questions-v1.mjs` 定义同一 `draft_lifecycle_contract`，由 `roster-workflow-read-role-v1.mjs` 交给所有新作者／事实／Teach／审核请求，包括无 domainId 的原子源审。

- Builder 合法且有战略理由的部分草案可提交，军表和初步 Plan 必须匹配；最终目标仍是发布门，不要求每次中间编辑一次完成。
- fixed／preset_immutable 仅限制本写表流程中修改已选军表；不能推出没有预备队、不能进场／增援、已经全员在场或伤亡补充规则。对战能力必须查规则和 Native 菜单。
- 有限预算页不证明全局无解，也不禁止有依据的中间修订；不由 Host 强选单位／分支或强迫改表。
- 不硬编码本次目标分，不改输出 Schema、不降低必要事实验收，也不重写旧 Plan。已经派发的精确 pending 请求仍用其不可变原输入。

### 定点证明

`scripts/verify-slice272-draft-lifecycle-v648.mjs` 捕获上述两条实际输入经过真实角色构造器的新请求。

- RED PID93973：真实接缝缺少生命周期合同。
- 来源修正后一次 GREEN PID94795：两条新输入均包含同合同；旧付费回复／r2草案／生产状态逐字节不变；0 Provider／Native／生产写。
- 日志：`build/slice272-draft-lifecycle-v648-{red,green}.log`。
- 该门仅证明输入接线。**模型是否据此停止无效翻页并自行纠正增援表述，必须继续真实生产观察；不能据此勾选 P4/P6。** v643–647 等通过门未重跑。

## 同一产品恢复点

旧 78800／83498 均已确认不存在，日志有 finished/stopRequested。不是因为观察超时判失败。

新代码同一 HTTP 产品工作流继续：

| 方式 | 原目录 | workflow | v648进程 |
|---|---|---|---|
| 从空表写军表＋Plan | `build/slice272-product-generation-v645-M86Cg9` | `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1` | 95090 |
| 固定表写Plan | `build/slice272-product-generation-v645-I7zekC` | `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34` | 95091 |

日志 `build/slice272-product-generation-v648-{editable,fixed}.log`。当前只是启动并确认原 PID 存活；后续须核对实际行为。没有重发 v647 恢复、复制旧 Plan、创建旧房间或恢复旧 r8 调查。旧费用与未知费用全保留，新增用量另累计。

T27仍5/6，T23仍33/36，相关剩余S272/S248/S249/S250共4片；最终Plan0/6、对局0/12。最终同产品生成、六项能力证明、中文完整脱敏逐步报告及约定对局矩阵均未被本施工记录替代。

## v648真实消费：模型停止翻页，但产品下一阶段被控制标记挡住

从头写表末次总体决定（原件 `8a1a03f5…`）实际承认：有限预算页不证明全局无解，分页不是改表的强制前提。它选择 record_facts，暂不采纳任何分支，保存 offset216 的24条1490矿候选事实。军表仍960矿，**不是已证明策略优化或满分产物**。

随后产品实际停止 `ROSTER_DECISION_NO_READY_WORK`：所有工作均已 evidence_ready/superseded，但 readiness 仍把三个已消费的调查回交标为 awaiting_strategy_resolution。这阻止下一轮 Teach，不是模型请求失败。

固定表总体角色则仍声称 Zone of Influence、任务／部署原文不可得，来源查证不能据此通过。

## v649 P2／P3：冻结原文存在，元数据目录却查不到

实际保存查询 `Zone of Influence`（kind为空、validity=all）返回0。只读核对同工作流来源43，原文明确有该术语与6寸定义；来源87也已带 Hold Position 完整计分 sourceText。旧目录只匹配 title/id，而官方规则标题仍是 Support source N 和不透明记录编号，所以“目录零命中→来源不可得”不成立。

- 新 `searchRosterWorkflowSourceCatalogueV1` 对同一注册目录中的不可变 JSON 文本做字面检索，去HTML标签／空白归一；返回原 evidenceNumber 与匹配 JSON Pointer。不是LLM摘要或战略关键词白名单。
- 保留来源 kind、有效性、原始顺序及分页；Plan/Skill中的命中不会升为规则。Host建索引不等于模型已经读到／通过来源。
- 同一角色执行器按不可变 artifactRef 缓存索引；旧查询／来源正文不改写，后续需正常搜索、明确读取和解释。
- 共用角色执行器实际调用新检索；目录说明明确旧元数据零命中不能证明正文缺失。错误kind有诊断和实际kind列表，不静默替换过滤条件。

`verify-slice272-catalogue-source-search-v649.mjs`：真实零命中 RED99121；首次修后已通过正文命中／复用／任务源断言，但夹具误把实际有效的 official_source 当作无效kind，失败如实保留。只纠正该夹具后一次GREEN1049：76命中（含旧模型文字，**不是76条规则**），原43／87均可发现、重复搜索无新增artifact读取、旧文件逐字节不变、0Provider／Native／生产写。日志 `build/slice272-catalogue-source-search-v649-{red,green,green-fixture-corrected}.log`。此处没有声称模型已经读取并正确应用原文。

## v650 P1／P5：消费交接≠批准事实，不能阻塞后续Teach

来源问题在 `assessRosterWorkflowReadinessV1`：它只要看到 investigationHandoff 就永久计为活动控制，即使对应总体策略已完成且非修订结果已保存。

- workspace 只从实际有效的 applied／retain／investigate 结果收集 settledDecisionIds；record_facts原合同的结果status为retain，操作disposition仍为record_facts，不造新状态。
- readiness 仅移除这些**已消费的控制等待**。未消费交接、真实运行中工作、原必要问题、未满预算和未声明Plan栏目仍保留；不删除 handoff、不解冻原实验、不当作事实已回答／准出。
- 同一产品 journey 因此可继续下一Teach，而不是人工补表或另起生成器。

`verify-slice272-consumed-handoff-readiness-v650.mjs`：首夹具误按status找record_facts，未到目标；纠正为真实disposition后RED3477复现3个假活动等待，来源修复后一次GREEN3920，活动控制3→0，同时960未满目标／Plan未声明／实际在途／必要支付未知均仍阻塞准出。0Provider／Native／生产写。日志 `build/slice272-consumed-handoff-readiness-v650-{red,red-fixture-corrected,green}.log`。没有重跑v648／v649或其他通过门。

两路旧PID95090/95091均终态，当前同原目录／workflow由PID4191(editable)与4192(fixed)载v650继续，日志 `build/slice272-product-generation-v650-{editable,fixed}.log`。启动后已确认两PID存活；**下一Teach真正排入、模型正常查到原文及最终军表／Plan仍待观察**。v647恢复未再次调用，旧账和未知费用保留，正式数字不增加。
