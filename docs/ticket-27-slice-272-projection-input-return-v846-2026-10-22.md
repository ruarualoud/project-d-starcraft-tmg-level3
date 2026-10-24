# T27 / S272 / P5：投影输入错误的自动交接 v846

日期：2026-10-22。当前产品 Run：`slice272-product-generation-v645-lqMWaS`。

## 实际断点与原因

v845 从 e9158 续行后完成候选创建，在 e9165 停止，终态为
`ROSTER_DECISION_NO_READY_WORK`。不是网络、Provider 或三轮限额失败。

原失败回执：`b3699331d79573d1b4ba23aadfc5deceffb175fe6e4602f4b3b28f91ea41e2c5`。
模型的 `project_scene` 参数含未定义的 `targetContextRef`，缺少显式
`changedUnits` 和 `unlistedUnits`。执行器以
`ROSTER_WORKFLOW_SCENE_PROJECTION_INPUT_INVALID` 拒绝，但没有附纠错合同；
恢复投影也不识别它。因此工具停在 `needs_model_choice`，后继等待，却没有纠错工作。
已完成候选和旧场景/测量均保留，不能把失败当成测量结果。

## 修改

- `roster-workflow-laboratory-v1.mjs`：复用既有原生投影参数合同和校验器，
  补齐 Adapter 外层字段诊断；新执行与历史失败恢复使用同一入口。
- 返回实际缺失/多余字段、原生校验信息、目标与参照状态的区别，交给既有
  `createRosterWorkflowToolReturnWorkV1` 生成局部纠错。
- 不把 `targetContextRef` 自动改名，不猜目标/重排策略，不补默认选项，
  不改付费模型回复、旧回执、正式军表或费用。
- 未改变策略、规则、发布门或普通恢复次数；未知执行故障不伪装成输入错误。

## 唯一定点验证

`scripts/verify-slice272-projection-input-return-v846.mjs <原 workflow 目录>`：

- RED：PID 38177，实际回执未生成纠错合同，失败与产品死锁一致。
- 修改后一次 GREEN：PID 38685；日志
  `build/slice272-v846-green-1792618704946.log`。
- 原失败可派出局部纠错；冷同步幂等；在途请求受保护。
- 六种定点注入：多余字段、缺少重排声明、错误集合元素、重复单位、错误
  排除政策、无效参照。均在原生执行前返回可纠正诊断。
- 合法输入仍到达原有原生边界；执行故障/成功回执/其他操作不误归类。
- 0 Provider、0真实 Native、0生产写入。未重跑其他已通过门禁。

门禁本身只证明工程恢复入口，不证明模型最终纠错成功或策略改善。

## 同 Run 真实闭环：e9165 → e9179

PID39406（存储守护39407）从原位载入；日志
`build/slice272-v846-projection-input-resume-1792618764087.log`。

1. 自动建立原投影的 `input-repair`，没有新建 Run 或清除历史。
2. 模型自行把目标引用改为完整 `stateRef`，绑定已保存候选1403；保留原参照，
   显式选择 `changedUnits:[]` 和 `unlistedUnits:"off_table"`。
   公开理由：只是升级差异，无须重排，保持原场景参与者；未编辑军表/Plan。
3. 修后真实原生投影成功：`exactUnits` 为 Goliath、Raptor，`adaptedUnits:[]`，
   场景状态仍为此前的 `c114258cd336790b599dac8b143f0c2ad7cf28fb3ecdad34227f9272936280ab`。
4. 原失败任务通过既有 `resolvedByWorkId` 接续，火力查询后继自动变为ready。
   不手改旧失败，不伪造查询或自动放行整题。

证据引用（均在同 workflow 的 artifacts 下）：

- 实际任务输入：`a5fa7163d5329b7d0080640fb358b02e2cae9d2f4faf47603d901b1dbee81861`。
- 脱敏模型请求：`3e8b3e7fdfdfafd83e9c59567d85e6346416e81da00d29a05170c71479d6fd97`。
- 原始公开回复：`9439638669e6d1765b3b9d72bf3513868942f54e8e0daf917e7e902bdeda08d2`。
- 编译后提案：`75983974b84d4390e7bfbf935865a463274fa50a4a7fa5bae46a5f1941297758`。
- 原生工具结果：`8770a6e23a04f8212cd8f739f1cd10c81c527615e23712e8be43b09f354f93fc`。
- 原逻辑任务接续结果：`42af3be7e51cffa92b7a1473fcfe7e58099b1547bf137f05416c25668dbde651`。

本次1个真实Flash调用：55,213输入＋1,089输出＝56,302 units，Provider 6,218ms。
这不是整流程耗时；载入/调度另有开销。已保留旧账，不重复记此前费用。
下一是火力查询/汇总/审核职责回交；最终Plan和策略提升尚未证明。

## 后续真实观察至 e9269（非最终准出）

- e9185无Ares火力后继直接复用原 `894cc927…`，结果
  `ec2de3dab3fbe488d735645875c91d0b7a927c79992bd2bae949d938a1b390f5`，
  `executed:false/newObservation:false`。没有新增火力计算。
- e9198局部汇总 `c7fc135ee3eceb3a23815ac29e736092bd1190ee774a6da0d40384811154b8fc`
  只描述本批无Ares结果；e9202正常回交总体策略，没有继续无限自续。
- 总体输入 `57c83429…` 的真实发送正文包含两组配置、投影关系、精确行差；
  并非只存于日志元数据。但模型仍说缺有Ares测量，首答还选错局部问题号。
  原校验要求自动修正，第二答把编号5改为1，却没有纠正缺测量的说法。
  该结果 `7d16a364533f25427d54e514bde33728e29431707be5c78d2ce9cfc7c4982448`
  仅授权同问题有限调查，不是军表/Plan批准。证据理解与收敛仍是未完成项。
- 后续事实角色选择建立有Ares候选并投影，又用了未知的
  `candidateContextRef/materializedSpec`。同v846校验直接返回具体诊断，
  自动创建纠错，未再修改代码。原错误
  `6a08cc67ddd837861f3e6df948e0d6323bd25e303b043bc77a2927d2ba1d7911`。
- 模型自动纠正，提案
  `f2aeb09aed89451590b44fc1badbf9c98f9b599825c63dc798be851a617e4610`，
  Native成功 `002f84d6113a53baec1ee8ad8c13e64e67445638c8071d3ff0295e1a309c1b7a`；
  原投影已接续为evidence_ready，结果状态确为已有参照 `7ac261b0…`。
  e9269有Ares火力后继ready，39406继续。不能据此称新增有效比较或策略改善。

从e9165续行至e9264共8个Flash调用，累计749,925 units、Provider73,572ms；
包含上述首次纠错56,302，不另外重复相加。原账和原未知费用保留。
只读REPL观察器曾因多次解析大workflow触及内存上限，产品39406未退出；
后改用独立Node只读投影返回少量字段，不重启产品、不改生产状态。

## Harness 记录与边界

- harnessLoopUsed: true；targetGames: StarCraft TMG。
- promptPackRoutes: 既有局部实验纠错角色；没有增加通用战略 prompt。
- harnessToolsCalled: 测试使用实际 Adapter 边界＋原生哨兵替身，未调用真实规则服务。
- uiTraceEvidence: 本次无新增 UI 验收；续行仍通过现有 Web/App 产品入口。
- agentDecisionEvidence: 上述实际输入、公开修正理由、原生结果与接续引用。
- memoryTraceEvidence: 原 workflow 与来源未改，未生成真实对局记忆。
- trainingTraceCandidates: 无晋级，`trainingTruth:false`。
- rollbackOrDemotionRules: 若发生静默选场景、绕过原生规则或重复派单，停止并撤销本补丁。
- userVisibleChecks: 不能把局部门禁等同最终军表/Plan发布。

整体：T27 5/6，T23 33/36，剩余 S272/S248/S249/S250 共4片。
正式 r4 2000矿/170气不变；最终 Plan 0/6，对局0/12。
