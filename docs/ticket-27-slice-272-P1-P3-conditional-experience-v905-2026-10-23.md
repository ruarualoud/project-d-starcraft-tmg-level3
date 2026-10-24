# T27/S272 P1/P3：条件观察归档与合同检查

2026-10-23。T27 5/6，T23 33/36，剩余 S272/S248/S249/S250 四片；正式 Plan 0/6、对局 0/12。本项不是完整 Teach 或经验 Skill 准出。

## 本次实际交付

此前 `scenarioExperienceRef` 只保存实验声明，实际结果在另一份回执里；没有独立的条件观察目录。现已在**产品工作流既有 synchronize 出口**接入同一归档模块，按真实生产 workId＋resultRef 幂等登记：

1. 声明条件：原问题、假设、比较双方、控制条件、预期收益、参与者、规则/地图/军表绑定；保留全文且明确不是已验证条件。
2. 实际观察：提交参数、实际 request、原生 stateRef、来源原件地址、攻击者/目标/武器/贡献模型、原生标量与不确定性、证明范围。
3. 审核状态：初始 `unreviewed`、结论空；不能把工具返回成功当成实验假设成立。unknown 不变成零。
4. 可查性：既有 evidence 目录/read_evidence 与新增 `conditionalExperiences(query)` 共用记录；冷恢复可读原件、幂等不重跑工具。版本不匹配明确返回，不冒充当前可用经验。

大概率分布和几何原件仅引用，不重复复制。原 `scenarioExperienceRef` 不改、旧回执不改、军表/Plan 不改。只登记真正产出原生结果的工作节点，不重复把修复父节点别名当新实验。

## 已验证范围

实际 A 原件 `75136d1c6c7a54a398b8b3c620d332c0e1c61a50786cfab62ace83c13dad027f`：u_marauder_1 对 player2-kerrigan，Quad K12 **射击**估计，36 个确定性分层样本，期望伤害 4.222222222222222、期望伤亡 0.027777777777777776。不是近战、不是实际击杀，也不证明原声明的同条件比较完整。记录使用原生攻击类型，不按实验标题猜测。

`scripts/debug-slice272-conditional-experience-v905.mjs`：先复现只有 origin 的缺口 RED，再一次 GREEN。使用真实保存结果和生产 workflow 核心的 publish/read/冷重开端口；验证条件/来源/数值、可查询、原件可达、幂等、不重复执行，以及进行中/错误/非工具/修复父别名不能登记成功观察。0 Provider、0 Native、0 生产写；未重跑 v903/v904 已通过门。

证据：`build/slice272-conditional-experience-v905-red.json`、`...-green.json`。实际产品同步消费须另观察，不用此局部门禁冒称整个产品验收。

### 产品真实消费补记

A 原流程加载同版后，在事件5623快照已登记 **98条条件观察**，不是98条通过的策略。共享查询按 `u_marauder_1 player2-kerrigan` 检索，实际找到75136d…原回执对应记录 `426a1decc652ec33c902ee6dc91c48afa7f6295a2249f728ff02936d7d098f25`，原数值/条件/状态引用可读，`unreviewed`、`advisorySkillEligible:false`保持。没有为归档重跑查询。A58212随后进入原来的observed-choice模型选择。

生产证据：`build/slice272-v905-production-experience-observation.json`。查询的sourceBindingsMatchCurrent只表示规则/军表/地图等依赖一致，不证明与另一局实时几何相同，也不证明原假设成立。正式Plan和对局数量不变。

## 整条经验合同的状态

| 交接 | 必须保持 | 本次状态 |
|---|---|---|
| 声明 → 实际实验 | 问题、条件、实际配置分开；不得用标题覆盖执行 | 归档分开保留；配置等价性仍由来源审核验证 |
| 工具 → 存储 | 工作身份、源状态、原件、未知/成功分开 | 新归档只读生产回执，具体失败红绿通过 |
| 存储 → 查询 | 同一原件、幂等、冷恢复、依赖有效性 | 已接同一 evidence 目录；局部真实核心验证通过 |
| 观察 → 有效假设结论 | 两侧配置一致、实际测量、来源/覆盖审核、支持/反驳/不足 | **未完成经验层聚合；当前观察均未自动批准** |
| 有效结论 → 对局 Skill | 条件匹配、依赖更新提示、可回退、离线评估，不改 Rules | **尚待跨运行/对局检索接线与验收** |

不能用这些绿灯代替全部工具、状态机和策略验收。源合同逐边检查沿 [v903 清单](ticket-27-slice-272-P1-P3-P5-comparison-contract-v903-2026-10-23.md) 继续；新增源类型必须保证下游审核识别为条件观察，不能当独立 Native 测量。

## v904 实际消费与停点

- B 已真实纠正 Native 事实通道：删除 3 个 Host 元数据误引、保留 8 个真实 Native 项。但新 prose 中仍有一个虚构投影路径，不能称来源全正确；产品返回 `strategy_required`，并未放行。
- B 随后真实总体决策选择 retain、无新调查，Plan r5/2000 分保持。明确指出实测第二 Marauder 为 small＋Kinetic Foam，而想比较 large＋Kinetic Foam＋Laser Targeting Systems，拒绝用错臂结论换掉 Goliath。**这是尚未完成的配置/方法问题，不是网络停止，也不是 Teach 通过。**下一应追踪实验条件→配置选择→工具参数的合同，不能盲重启同一留置任务。
- A 已取得上述真实射击估计，仍有其他方法选择待执行；不是所有实验已完成。
- 修改前 A41576/B41583 均 exit0；A5515/B5262、0 running/pending。A 可按原工作目录继续；B 无 ready work，不伪称已启动。旧费用/原始答复/失败/版本均保留。

## 文件

新 `roster-conditional-experience-v1.mjs`；产品 `roster-decision-workspace-run-v1.mjs` 两个接线点；一个具体缺口探针、本报告及 CURRENT_WORK/TASKS/MEMORY。未提交、删除、安装、更新官方数据或创建子代理。

## A/B 实际交接图的只读检查

读取两组保存图，A397/B307工作节点，A891/B892证据（A同步进行中的快照），共检查365条未退役输入引用。未发现重复work/evidence身份或“已完成却无结果／仍在途”的矛盾。A有两条尚未发布的tool-view引用：其summary是waiting_dependency、未dispatch，前置分别needs_model_choice/waiting_dependency，属于正常未就绪，不是丢回执。B未发现缺失引用。

原始结构观察保存在 `build/slice272-v905-structural-contract-observation.json`。此检查只覆盖身份存在及指定状态关系；不证明每个JSON路径、配置语义、数值或整链正确。

### B 配置偏差的源头已定位，但修复尚未完成

实际场景原件 `178c8ab7db47177ec35f583d88f229ed042819e7e0704af0458cb88979958a81`：

- 工作单的 purpose/scenarioDescription 声称 `marauder-2 large + Kinetic Foam + Laser Targeting Systems`。
- 机器参数只有 `scenario.spec` 的位置/阶段，`contextRef:null`；没有 candidate_context、candidateEdits 或选择不同配置的绑定。
- 实际工具按当前军表的小编制执行，与提交的机器参数一致。不是传输中丢了large字段；该字段从未存在于可执行参数中。
- candidate_context 已暴露可选的合法候选修改/场景投影能力，不能据此次漏选宣称工具完全不支持。

**根因边界**：模型把配置写在实验描述里但没有执行选择；合同允许“声明的比较臂”只停留在自由文本，未提前要求与机器选择的配置身份对应，直到后置来源审核才发现。需要在声明→工作单之间统一具体配置身份及原生核对，不应靠解析英文large或替模型自动加单位/升级。当前不是可以放行的有效假设，也不能盲重买相同测量。

### 下一合同交付（仍属P1/P3/P5）

1. 明确实验臂配置的结构化来源/选择，和实际context/state/参与者绑定；在测量前向负责角色返回不一致，而不是等最终结论纠错。
2. 同一合同用于新实验、来源审核、恢复及经验适用性；声明文本不赋予配置修改权限，Host不擅自选择候选。
3. 对该具体错配做正常/未选择/错配置/换版本/恢复注入，再由原产品流程让模型自行选择；不改原答复、不放宽准出，不靠又加一条战略prompt。

这三项尚未完成；不能把本次结构检查写成“状态机已经全部正确”。
