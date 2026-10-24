# T27 / S272：精确选择、分块读取与假设交接（v674–682）

2026-10-20。施工子项 P2/P4/P5；仍以 P0–P6 主计划为准。本记录不是最终逐步生产报告，不替代最终军表、Plan、策略对照或受影响审核。

## 当前真实产物与边界

- 现写原工作流 `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1` 已由 r5/1610 → r6/1810 → r7/2000 → r8/2000，9支单位。r6作者称1860，但Builder实算1810；旧原文没有改写成正确答案。
- r8正式策略假设所有者已实际返回 investigate；实验作者自主提出“Raynor前置 Orders 与后置被动支援”的同条件局部比较，并实际运行来源查询和私有场景构建。尚未完成两臂测量、条件性结论和采纳。
- 固定表原工作流 `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34` 仍 r12/2000。原HTTP400容量拒绝已通过正常产品恢复，Flash已实际返回多个新回复；没有把拒绝伪造为已付费完成的内容回复，也没有清零未知账。
- T27 5/6，T23 33/36；相关余 S272/S248/S249/S250 共4片。正式Plan 0/6，对局0/12。Plan的comparisons尚未形成正式可验收的策略比较结果。

## 发现→修复→实际结果

### P2/P4 v674–675：有限预算候选覆盖与当前源交付

旧深度优先生成在20,000复合路径截断前，纯升级组合覆盖为0；模型随后把穷举分页当作修改前提。新增显式 `breadth_first_v2` 搜索版本，保留旧顺序与旧cursor。新有限种群含6175条纯升级组合，不声称穷举或全局无解。正常Run按军表/规则/来源键发布当前预算查询，Plan-only修改不重查；旧调查分支也实际收到当前视图。

证据：

- `build/slice272-budget-generation-coverage-v674-green-population.log`：旧顺序保留，新种群覆盖成立；第一次绿门夹具错误要求每个前256页均含纯升级，已改成真正相关的种群覆盖。
- `build/slice272-breadth-budget-real-rules-v674.json`：8/8真实Builder合法；不是模型采纳，也不是最优性。
- `build/slice272-current-budget-discovery-v675-green.log`：同Run冷恢复/幂等/Plan-only不重复。
- 实际生产新页24/24合法，模型随后实际提交r6；但重抄内容与所称候选不一致，见下节。

### P4 v676：选择候选不再靠重抄

原候选 `compound:0bd7158d8daf7162a991` 为1860，包含 Rocket Launcher、Laser Targeting Systems、Advanced Medic Facilities。作者声称采用它，却提交 Combat Shield、Kinetic Foam、Stabilizer Medpacks，Builder正确算出1810。这是模型重抄与选择接口的缺口，不是Builder丢字段。

新接口 `mutation.rosterBranchSelection={sourceEvidenceNumber,branchId}`：

1. 作者必须实际读取所选candidate正文。
2. Host从同事实版本的不可变来源复制完整candidate，不替模型选分支。
3. 同一次mutation不能混入另一套unit/card修改；Plan仍可独立修订。
4. 原Builder重算并通过同Run联动提交；固定军表权限不变。
5. 原显式编辑仍可用；旧合同缺这个nullable字段保持旧语义。

证据：`build/slice272-budget-selection-v676-final-controlled-green.log`，原r5冻结输入→同Run提交原候选逐值一致/1860；未读、固定表、冲突、过期均拒绝。0 Provider/Native/生产写，Builder受控，不能代替正式策略证明。

调试过程透明记录：首次红夹具误解原件封装，修正后真实红；绿门先遇新增nullable描述位置错误，再遇r6历史占位与异常夹具绑定错误。三轮后停止，按用户既有明确修正后追加一次授权，最终定点通过。没有重跑旧已通过门。

### P2/P5 v677–678：已取回≠模型已读完整原件

固定表真实请求一次读13份原件，下一请求4,669,160字符；服务商明确HTTP400/`contextLengthExceeded=true`，不是网络超时。

新读取传输对大JSON对象按精确子字段分块，大数组保留原编号、长度和逐项JSON Pointer。未传正文明确为 `fetched_not_delivered`；引用、Teach正文检查与菜单选择使用实际交付内容。原完整来源仍可查询，不把省略误作没有。完成回复后才持久登记交付，失败或pending不授予已读权限。

仅对明确HTTP400容量拒绝，正常产品可为同工作重建输入一次；保留旧pending、dispatch、unknown费用、完整旧请求与语义计数。不把401/403、普通400、错误context或ambiguous网络异常混入此恢复；不重放Native动作。

证据：

- `build/slice272-source-read-chunks-v677-green.log`：实际13源的读取节点3,284,833→299,687字符；203覆盖节点，字段精确/大块仍可读，根未假称完整交付。
- `build/slice272-context-reflow-v678-green.log`：真实读角色构造的完整请求4,669,160→1,497,066字符；原工作/旧账保留，错误恢复拒绝，Provider失败不登记新交付。0 Provider/Native/生产写。
- 原固定工作真实 `contextReflows.length=1`，从原1个完成回复继续到至少6个完成回复，服务商接受约1.7M字符的后继请求。付费回执及真实返回保存在原工作，不在本报告复制。

### P4 v679：Plan-only修订后，完成的假设提案仍可交接

r7→r8军表/规则/地图/来源不变，但已完成的假设Teach标为superseded。旧调度同时把它当未完成，又让新所有者依赖旧work状态，最终NO_READY_WORK。

修复：同事实cycle的完成Teach作为只读历史提案交给当前Plan所有者，显式原/现Plan版本；未发出的旧所有者保留，新所有者用当前Plan版本身份，幂等排队。若事实军表改变，则新cycle，不复用旧提案。未完成的旧Teach不能冒充完成提案。原提案不变成规则事实或已采纳策略。

证据：`build/slice272-hypothesis-plan-rebase-v679-green.log`：实际r8停点，当前所有者ready，旧付费Teach无重发/旧未发所有者保留/不同军表不复用。真实生产随后排入并执行 `product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:decision:plan-r8`，作者实际授权独立事实核对与Raynor局部对照，实验工作单已有非null `hypothesisTest`。

实验声明包括假设、可信备选、相同条件、变化因素、支持/反驳观察、两种结果如何改变选择。当前只证明已经提出并开始执行，不证明控制条件已充分或策略更优；这些仍需实际测量与独立审查。

### P2/P3 v680：读取所选队形，不强迫下载全菜单

容量恢复后的真实作者选12个队形方案；948/950的全菜单较大被导航化，旧校验器仍要求全列表，导致作者读不到它所选的option0并返回blocked。

修复：显式 `optionIndex` 允许通过其精确原件 `/receipt/queryReceipt/result/formationOptions/0` 完成来源检查；Host自动取回后仍需作者确认。完整菜单读取仍有效，未读的其他方案不被认为已读；Native仍负责联合碰撞/合法性。

证据：`build/slice272-selected-formation-read-v680-green.log`：实际付费选择只读重放，2个所选正文→作者确认→原12项工作单通过，不重取全表。0 Provider/Native/生产写；不证明12方案联合摆放成功或策略有收益。

## v681–682：保持原对照问题，并完成真实原生动作

### P1/P2/P4：原假设在检查点之后漏传

真实请求 `15cf3aff…` 没有任何结构化hypothesisTest，当前问题只剩阶段／菜单修复；原Raynor对照声明仍在不可变来源中。新增控制链投影：仅跟随experimentGoalId、investigationFor、investigationOwnerId、methodContinuationOf等明确关系，提供同army/rules/map/source的原设计、实际声明来源、执行来源和已有评估提案。不按workId前缀或全局最新猜归属，不把其他军表或独立查询拉进来。

该输入明确区分：当前子问题可完成，但原比较仍可能未测；只传设计，不伪造测量或判定；模型可据理由调整／拒绝实验，无新增强制战略偏好或放行门。

`build/slice272-hypothesis-lineage-v681-green.log`：正常Run模型接缝、实际丢失请求、原设计逐值保留、原始证据地址、无关查询与不同军表排除。首次夹具漏掉受控实验室restore接口，补齐后真实RED79081→一次GREEN80013。0 Provider/Native/生产写，不代替模型实际消费。

真实后继请求 `6ac9cb18…` 已收到原始Raynor前置vs被动支援设计、后续Orders子假设及其来源编号，当前模型已显式读取这些设计和实际Native状态，不再仅凭最后一个几何步骤宣称原比较已答。

### P2/P3/P5：参数域和有限动作也必须按所选项读取

真实作者使用 `actionType:"orders"`，实际菜单为 `resolve_battlefield_asset_ability`、abilityName Orders。旧门在执行匹配前反复要求整份60,598字符actionSpace，原8轮角色累计3次拒绝而停。

提取执行器原有唯一解析为共享 `resolveRosterWorkflowNativeSelectionV1`，读取定位与实际执行调用同一解析。错误身份返回真实availableIdentities与读取地址；正确选择只读所选参数域/有限动作/原生队形条目。新视图提供精确动作身份导航，不把导航算正文。原生执行参数、side、stateRef的绑定逻辑不变，不接受能力名的猜测别名，也不由Host选其他动作。

旧付费错误的反馈在新请求中从原来源重新计算；只对缺所选项读取的新旧合同差异允许明确一次恢复，metadata保存repairKind selected_native_menu、feedbackVersion4和旧失败。新合同再次失败不能用这条规则无限续次。

`build/slice272-native-menu-entry-v682-green.log`：原错误付费回复只读复现→准确身份错误→受控作者选真实domainId→读取4,365字符所选域→作者确认→原工作单通过；有限动作也与同解析一致，一次恢复不可重复。RED84360→一次GREEN85475。0 Provider/Native/生产写；不证明实际Orders效果或策略。

### 实际产品结果：已跨过动作选择，不是仅单测通过

原r8工作正常产品在新代码下自动恢复，模型公开承认selector别名错误并自行改正，未由工程手改付费回复。随后：

1. Native `orders-action` 实际完成，`resultStatus=ok`。
2. 一次Native transition，事件记录从faction:player1与player1-tactical-1支付2CP、对player1-branch-815c9d5c7cef应用remove_activation_marker。
3. 原生后继inspect完成，实际Movement/player1阶段和资源可读（工具来源814/816，视图815/817）。
4. 后续事实角色正在读nativeEvents、stateChanges、后继actionSpace/cardResources，核对真实前后差异与原假设。

这是一次真实局部行为／支付测量，不是完整对照。`orders_applied`事件并不自动证明移除了原本存在的标记、获得额外有效激活、提升控点／火力，或优于同CP备选；这些仍需实际状态差分、对照与独立审查。正式Plan与对局计数不增加。

### 用量截点（仅这两个新工作流累计）

| 流程 | 已完成真实回复 | Tokens | 冻结价格估算USD | 统计截止UTC |
|---|---:|---:|---:|---|
| editable | 350 | 24,541,698 | 2.867228784 | 2026-10-20 00:33:42 |
| fixed | 550 | 48,669,767 | 5.929671072 | 2026-10-20 00:34:10 |

合计73,211,465 Tokens／估USD8.796899856。按traceId去重，使用实际cache命中/未命中和请求时段；不是本轮新增或全项目总账，不是服务商账单。另有editable1／fixed2条未知费用dispatch仍保留，不按零计入；后续继续累计，无硬费用停机。

## 当前恢复入口

仅使用原两工作流，不创建替代房间或重发旧已完成请求。

- fixed：PID86201，`build/slice272-product-generation-v682-fixed.log`。
- editable：PID86182，`build/slice272-product-generation-v682-editable.log`。
- 每次先精确核对PID；观察超时不等于终态。旧PID65653/66378均已退出；不恢复它们。
- 跟踪实际实验动作→对照测量→条件结论→独立来源审查→当前所有者采纳/驳回→受影响复审。预算满分或Native静态摆放不替代此闭环。
- 后续仍欠P5整体一致性、P6正式发布/房间桥和最终中文逐步报告；本记录不减少正式验收分母。
