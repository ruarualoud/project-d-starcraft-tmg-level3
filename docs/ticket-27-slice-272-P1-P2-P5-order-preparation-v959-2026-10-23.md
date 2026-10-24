# P1/P2/P5：增量工作单的读取准备与作者确认

T27/S272，2026-10-23。最终验收仍为正式 Plan 0/6、新对局 0/12；T27 5/6、T23 33/36、余 S272/S248/S249/S250 四片。

## 实际失败和修改

B 原产品目录 `build/slice272-product-generation-v645-8aBuEV`，工作流 `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，r21/event10491 停止；PID13773 已退出、无在途请求。三次付费回复同时给出 patch、两条来源读取和增量步骤，v1 互斥合同反复拒绝，未进入读取交接。

- 原回复：`11259d8a521caa071fbf90f15fa6b48e8252efe78915c05e0bc36d6fb79f1b60`、`86f2e67cccd04d6263d78187c9dd3b2c2c1193002538d0077ccea70ea7bba1e2`、`8961f0affc4d183a3f3681be11d895bed40f097fb022e0c7c6e4a83da614c58b`。
- 最后完整脱敏请求：`d14c2e46ce3a515942e32a5c689406483fe712ecaa934a867db354b543f799c3`。
- 工具请求为证据2057的 `/receipt/actionSpace`、`/receipt/actionParameterContracts`。这是读取已存来源，不执行新游戏动作。
- 原提案另含 `optionIndex` 等参数错误。读取准备不能批准其方法或修写模型的战略理由。

新命令合同 v2：显式 patch+查询进入准备态，按 stepId 合并并保存未确认提案；实际来源通过原证据读取器交回作者；后续 patch 仅改指定步骤、遗漏保留，confirm 明确提交已保存提案。原编译器、依赖、实验范围及 Native 合法性检查不变。原工作单/范围发生变化时拒绝使用过期提案。

旧 v1 请求/回复保持原义、原件及费用不变。唯一具名恢复将原混合回复导入**准备态**，不改写成合法回复，不重新调用 Provider，不提交方法。原诊断及纠错次数保存在既有恢复历史，后续仍是有界确认／纠错。

## 定点验证

脚本 `scripts/verify-slice272-order-preparation-v959.mjs`，以实际当前输入、原付费回复和证据为只读夹具，调用真实产品角色执行器。

1. RED PID25095：原始混合回复返回 `needs_local_correction`，没有准备态。
2. 改动后 lifecycle 一次 GREEN PID26500：只读取、不提交；冷恢复交付提案及来源；增量保留其他步骤；依赖变化拒绝；明确确认后原编译器仍拒绝实际坏参数。
3. recovery 一次 GREEN PID26501：原付费回复只读恢复，0新 Provider；3条旧回复在 v1 普通投影仍保持原拒绝语义；未知传输状态／在途请求／其他错误不适用此恢复。

以上均 0真实 Provider、0 Native、0生产写；没有重跑 v958 或任何已通过门禁。只能证明本次交接，不证明整体 Teach 收敛、地图到达或策略提升。真实同产品续接结果在下一节追加。

## 变更范围

- `roster-work-order-edit-command-v1.mjs`：版本化准备/确认及保留提案的增量投影。
- `roster-workflow-semantic-repair-v1.mjs`：统一识别 v1/v2 类型命令。
- `roster-workflow-read-role-v1.mjs`：持久准备态、结果交付、具名旧回复只读恢复、确认后编译与历史留存。
- `roster-decision-product-journey-v1.mjs`：产品自动恢复原因与边界。
- 定点脚本、本文、当前入口及 TASKS/MEMORY。

Harness：使用 experiment_planner 路由与原证据 reader；本次 UI 未测、记忆未晋级、trainingTruth=false。公开理由和原请求可追踪，不提供隐含思维链。若出现未确认提交、遗漏步骤或重复 Native，必须停止该恢复路径并保留原证据，不能靠准出降级绕过。

## 真实产品续接：已完成读取准备，作者确认待

确认原13773退出、同B无其他进程、0在途后，PID27979使用同一个 `--resume` 产品入口载入新码；日志 `build/slice272-v959-order-preparation-1792765528758.log`。没有新房间或新实验初始化。

- event10492：产品具名 `revalidate_role_reply`，旧三次错误/费用保存。
- event10494–10499：原回复8961f0直接转入准备；2条读取均真实 `status=read`。
- actionSpace读取回执 `4ea25578ec99dd76aa2217e3f7677c779768fb6ad34de86fa6c94882e0c12ea4`（72628字符）。
- actionParameterContracts回执 `59bbf9e4de0a9f2a73eaf5a4143fae32df82bf1059b32e962fb257506385fc44`（23981字符）。
- 产品结果 `ebe191dec35eca0a82288c60a34751ef061fe4bd182294cc7788636b27bcd312`：reads_completed、continuation=true、proposalSubmitted=false/nativeExecuted=false。
- 原失败命令与原步骤均未重写；未确认提案保留3步，原方法目标/参与者/范围不变。此阶段0新增Provider，0Native重放。

原回复关于“实际是deploy而非Go!Go!Go!”的公开解释仍只是模型未经确认的说法，不因准备成功成为事实。下一新命令必须根据真实菜单自行确认/修订，并过原编译/Native门；不能据此宣称地图问题、Teach或整个Plan收敛。

## 真实作者修订与第二个结构边界

同产品新请求 `d0b89e3f7b82614287ae3c31cd5959ab99907da1f862c4bb7095e28af6600881` 已实际包含未确认提案及分块读取的 actionSpace/参数域；回复 `29e670082f6f31a3ab9033a5d5e5ea5d699ac750fbf9a0f6a13556fb4330153e` 改为原菜单的 relocation domain，未再称需重复deploy。新增137995units、Provider10.607秒（不是全链时延）。

但作者将两个已有步骤的 beforeStepId 指向自己，旧代码将原地替换误判为非法移动；event10503/r21 停止，27979已退出、0在途。这个格式问题不是提案丢失。

按稳定ID增量语义，已有步骤“在自身之前”不改变位置；v2.1明确允许原地替换，保留全部参数和其他步骤；新步骤无已存在锚点仍拒绝。具体原回复自锚点 RED31812→一次GREEN32384，旧两个已过门未重跑；具名原付费回复重验，不重新生成。

**未批准其战略/几何内容**：作者仍手写超过2英寸的路径、9模型相同落点，且称检查后态却填写原父态。这些由后续原编译/Native与事实审核处理，不能把结构修复说成合法动作或策略提升。读取准备成功与提案可执行分别记账。

## v960：耗尽局部修订后的方法责任返回

33197同产品载入自锚点修复，event10504登记原付费重验、10507返回 `4e8626c0281e54c9f55c4d615c8edf21fb2637df5c4055dce17b75d0de292edc`，0新Provider。原编译器正确拒绝 `work_after_delegated_completion`：当前只委派native_action，作者在其后添加inspect；真正原父任务的inspect-move-successor/summary仍在排队。**没有执行有效前缀或非法几何**。

event10508后产品NO_READY_WORK，33197退出/0在途。原控制分类只覆盖operation_not_delegated，不覆盖“操作可用但越过本次完成边界”；局部修订次数耗尽后未将这类方法责任争议交回负责人。

v960只补后者的确定性返回：未耗尽时保留正常局部纠错；耗尽时携完整原提案、编译拒绝、原目标和计数，经既有work_order_delegation_return交原战略负责人。不是缺工具、不是批准方法、不是加次数或删除尾部；不会自动重演已完成步骤。负责人仍须显式决定下一方法或保留未解，不能因控制交接而准出Plan。

`scripts/verify-slice272-exhausted-method-return-v960.mjs` 用本次实际结果注入真实产品接收边界：RED37314→一次GREEN37849。证明产品实际生成责任返回与一个战略负责人任务、冷恢复保持、0Provider/Native/生产写；未跑旧v867或v959已通过门。额外修改仅 `roster-workflow-order-failure-v1.mjs` 分类与 `roster-decision-workspace-run-v1.mjs` 调度接线。真实后继待同B观察，完整Teach收敛未证。

### v960真实返回已发生（不是最终准出）

原33197退出、无同B进程／0在途后，PID38649同B载入v960，日志 `build/slice272-v960-method-owner-1792766393662.log`。event10509–10515实际执行确定性控制返回：

- 控制回执 `84c2b9f0c61e72b7392ed871299ab6901596f77504a11d79ec5a7e4156566ccd`，该角色calls=[]、turn=0。
- `coordination.kind=work_order_delegation_return`，保留源结果4e8626和完整失败工作单；localRepair={generation:4,limit:3}、localRetryAuthorized=false、nativeRetryAuthorized=false、factApprovalGranted=false、planApprovalGranted=false。
- 分支返回 `5214f99091d9fa77e958cd02fcc95ace98219dcff366c23b750700447cc0b444`；原动作及inspect-move-successor/summary标记returned_to_owner，不冒充执行成功、不删历史。
- event10519正式派发returned-summary，输入 `5c016f82c7b9de05d57b9f239bbd94661d9923927962a3a3029e73d37bf9cc21`。下一需检查总结与原负责人实际消费；保持同进程，不重启/不重复验证。

本轮已证“混合命令→准备→实际读→作者修订→编译拒绝→明确控制返回”；未证后续方法成功、地图到达、整体Teach收敛或策略优势。已观察新增真实模型调用仅d0b89e→29e670，137995units／10.607秒Provider；正在进行的总结调用另计，旧费用保留。

末次观察event10525/PID38649存活：总结首请求6e557a4e→cf0c1c72主动读取原返回来源，结果fcd2ffce，尚未提交最终总结；新增9313units/3.280秒Provider。本轮截至此共2新请求147308units/13.887秒Provider；不含本地恢复/调度时间，不换算未知单价费用。下一继续同进程，无在途重复发送。
