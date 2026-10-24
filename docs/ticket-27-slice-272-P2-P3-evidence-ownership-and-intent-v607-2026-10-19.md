# T27/S272：纠错证据归属与队形意图输入统一（v607–608）

这是新 P0–P6 的 P2/P3 施工实证，不是最终军表/Plan发布报告。T27 5/6、T23 33/36，相关余4片；正式Plan0/6、对局0/12。冻结数据不刷新；旧调查不恢复，不做Web扩展。

## P2：真实成功回执为什么没有被找到

同一 `inlKbk/projection-owner` 中，原生控点回执 `e62256fe…c8c141`（原件864、视图865）已经证明：特定完整静态几何下，两个Marine单位参与marker1控制，Supply 2:0；Goliath在该场景不合格。它不证明进场/移动/得VP，也不证明对手实际会配合。

实际801却再次认为仍缺“前排放到marker1附近后控制资格”的实验。读回其完整输入发现：questionEvidenceDirectory只有40批，**没有865**。原因两层：旧目录只认直接有experimentGoalId的普通负责人，忽略repairOf/orderRepairOf/experimentOwnerId等显式谱系；而该方法已直接回交父问题，没有独立fact_summary，单纯扩大摘要所属人仍然找不到这个原件。

### 实现

- 新 `roster-workflow-ownership-v1.mjs` 从显式字段建立有记忆的归属索引，返回目标问题、原负责人及谱系；循环/缺失不猜测，不按ID前缀或“全局最新”认领。
- 同一Interface用于问题证据目录和重复Inspect控制，避免两套归属逻辑。
- 目录纳入同问题、整条谱系绑定一致的纠错/回交摘要；尚无独立摘要的已完成工具另外以 `completed_operation_without_summary` 发现，summaryEvidenceNumber=null，明确不是新摘要或已准入事实。
- 原始编号、只读原件、用途与workStatus保留；其他问题、变更地图/规则/军表/Plan绑定排除。没有重演旧Native，也没有把旧条件场景改称当前实际部署。

### 定点与实际使用边界

`verify-slice272-repair-evidence-directory-v607.mjs`：真实865缺失先RED；第一修复只修谱系仍RED（无摘要的第二原因）；补原件独立发现后一次GREEN：131批、865可找到、其他问题/变更绑定排除、循环不制造归属、0Provider/Native/生产写。已通过旧门不重跑。

PID37992完成804/current advance安全退出。PID55751同Run载v607。[805实际请求](../build/slice272-projection-owner-v565-inlKbk/805.request.json)确实收到131批及865（kind=completed_operation_without_summary）；[805回复](../build/slice272-projection-owner-v565-inlKbk/805.reply.json)仍选择继续自己的6角色几何实验。**目录已送达不等于模型已经读回865、比较正确或策略更好。**

805当前的新实验有前置结果：804已读原生回执1417/1419，在不同显式假设几何下Goliath＋两Marine控制marker1，Supply4:0；Marauder2/Medic3不在控制范围。此4:0不是旧2:0的同条件战略增益，也不是实际对局得分。

## P3：三轮静态队形纠错为何停住

新增6角色场景中Marauder1位置需调整，806–808三轮静态输入未收敛；PID55751无ready任务后正常退出，不是网络故障，不据观察超时重启。原808保留同单位、同3个自选锚点、同control_objective/weight3/targetIds，但formationObjectives为单对象。Native静态入口真实返回STATIC_FORMATION_ARGUMENTS_INVALID，其源校验要求数组；当前动作队形合同却允许single_object/array_of_objects，模型跨合同重复用了单对象。

- [808完整请求](../build/slice272-projection-owner-v565-inlKbk/808.request.json)／[808原始回复](../build/slice272-projection-owner-v565-inlKbk/808.reply.json)

### 来源修复，不手改模型答案

新 `roster-formation-query-input-v1.mjs` 是调度Adapter：只对space.solve_static_formation把主单位/联合单位的单个formationObjectives封装成单元素数组；数组原样保留。Native函数normalizeExplicitStaticFormationObjectivesV1仍是字段、意图、权重与目标的唯一校验实现；Adapter校验但不把其默认值写入原始数据。

执行器保留submittedArguments原对象，在实际argumentsJson及inputBindings中记录canonicalization；不改单位/锚点/意图/权重/目标，不删未知字段，不将unsupported intent替换成balanced。错误以源校验的具体pointer/message在派发前回交；Native几何、规则、地图和随机性实现未修改。工具目录明确公布Adapter接收两种集合形式、Native规范形式为数组。

`verify-slice272-static-intent-collection-v608.mjs`用实际808输入、真实执行器和同一个Native意图校验器：先RED（returned_to_model），修后一次GREEN（主/联合singleton可规范化、原输入不改、unsupported intent派发前拒绝）。其中2次是明确标记的Native Adapter运输夹具，**0真实Native几何/Provider/生产写**，不冒充真实落位成功。

### 安全续行

仅针对本次已明确修复的generation3停点，使用既有resumeToolRepair记录engineeringChangeId=static-intent-collection-v608并追加一次generation4，不清零历史/费用，不重放已成功工具。PID63566以`--resume-static-intent-collection`继续同Run；日志 `build/slice272-live-p5-v608.log`。实际静态求解／后续来源审核尚待观察，不据运输夹具宣布整个P3/P5完成。

## v609：真实Native暴露的第二个合同错误

v608真实809续行的inputBindings证明singleton已按原意图变为数组；Native仍返回同一STATIC_FORMATION_ARGUMENTS_INVALID。进一步检查不是另一种意图错误，而是**单单位入口硬编码白名单拒绝了公开合同一直允许的maximumJointOptions/maximumJointEvaluations**。v608运输夹具只调用意图校验器，未覆盖完整Native查询，所以不能代表此接口完整可用。这次保留失败，不把夹具通过当上线证明。

### 完整来源修正

- Native静态入口从同一个public query contract派生允许的外层字段，不再与展示合同各自维护一份。
- 单单位真实消费两个预算：按给定锚点顺序计数求解/返回选项，明确search截断与非全局无解；不提供预算时仍遍历原先全部给定锚点，保留旧行为。联合查询仍用原6/128默认值，共用预算校验和常量。
- 不改变底盘/碰撞/连续性/地形规则或意图排序；single的canonicalPlacement结果形状保留，附加search说明，未冒充joint结果。
- Rules查询Adapter的静态输入错误保留具体validationMessage，不再只向模型返回通用错误码。

### 真实Native验证，不是模拟返回

新增`verify-slice272-static-search-budgets-v609.mjs`直接使用同一冻结authority、产品V6 Rules runtime、私有lab与真实查询Adapter/静态求解器：

1. RED中先保存旧无预算入口的成功基线，再用实际已规范化参数＋6/128预算复现unknown。
2. 修后GREEN只读复用该成功基线（不重演），3次新真实Native查询覆盖完整预算、小预算、非法预算。完整预算的**3个几何见证及misses与旧基线逐值相同**；小预算实际限制评估/返回；0预算经真实Adapter交回具体positive_search_budgets错误。
3. sourceMutations=0，Provider=0，生产Room/军表/Plan写入=0。基线是脚本诊断，不伪装Agent决策、进场或策略收益。

- [实际RED](../build/slice272-static-budgets-v609-red.log)／[一次GREEN](../build/slice272-static-budgets-v609-green.log)
- [只读成功基线](../build/slice272-projection-owner-v565-inlKbk/static-budget-v609-legacy-baseline.json)

PID63566在809后达到gen4停点并无ready正常结束；不以超时认定终止。PID74276同Run以`--resume-static-search-budgets`续行，仅对此不同且已验证的Native合同修复记录一次新增代次；历史/费用不清零，不重放成功来源。日志`build/slice272-live-p5-v609.log`，实际原分支恢复仍须观察。Native输入/搜索预算代码确实改动，不能再声称v609只改运输Adapter；官方数据与几何规则核仍未改。

## 账与下一步

截至804，主Run30,160,806 Tokens；可按冻结价计算部分USD7.077647820，另保留767已知8,704Tokens但失败receipt缺modelVersion的未定费用及更早未知费；597原型另计。项目已知136,776,729 Tokens，805起未含。不用费用元数据缺口阻塞生产，也不伪造reported model来强套价格。

下一步仍是当前地图问题收口→综合军表/Plan修订→两种模式同产品链路正式生成与策略对照→中文逐步最终报告→约定对战。当前合法2000与局部工具成功不能替代这些交付。

harnessLoopUsed:true；targetGames:starcraft_tmg；promptPackRoutes:实验负责人/局部纠错/独立来源与覆盖；harnessToolsCalled:同一私有Native静态队形/控点接口；uiTraceEvidence:无新增Web生成；agentDecisionEvidence:801/805/808原件；memoryTraceEvidence:来源谱系、原编号与费用不改；trainingTraceCandidates:无，trainingTruth:false；rollbackOrDemotionRules:绑定不一致/来源未读/必要事实未知不准入；userVisibleChecks:完整产物尚未验收。
