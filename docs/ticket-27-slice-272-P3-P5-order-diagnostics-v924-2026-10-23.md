# T27 / S272：同源多步骤诊断与真实作者消费

日期：2026-10-23。主线 P3/P5；上一目标轮属于实际进展（v922/v923代码、定点证据、原流程续行），不是仅状态复述。

## 事实与原因

A 实际回复 `20048a65…` 依照 v921 修正了内层 JSON 的对象/字符串问题，但把明确的父分支 `base` 放在 `queryArguments` 内。原请求 `f9d2ccf0…` 已明确送达 `outerStateFields` 和“放在 queryKind 同层”的说明；这次是模型填错，**不是规则计算或该字段说明漏传**。

保存结果 `12973d6fa14384c566776a10d73507eb4718a36af65d4483d1d52f74a56dc051` 中的同一工作单还有第二个独立错误：`s2` 用 0 号来源和字段 binding 猜测未来队形选项的来源编号。共享编译器只在 `s1` 失败后返回，没有告知第二项。这会造成一次付费纠错后才遇到下一项，源头可以改进。

未将任何参数自动移动到另一层，未选择场景/选项，未修改原模型输出，也未接受非法状态。

## 改动

1. `packages/roster-strategist/roster-workflow-laboratory-v1.mjs`：保留原完整编译器作为执行准入。新的失败包装仅对尚未入队的多步骤订单，复用**同一纯编译器**进行步骤级诊断，把能独立确定的错误放入 `detail.workOrderDiagnostics.steps`。
2. 保留原错误 code/detail；不复制规则算法，不把订单级权限或全局依赖失败伪装成多项独立错误。不返回“部分成功工作”，不执行有效前缀。已编译的保留任务不追溯重解释。
3. `completeValidation:false`、`nativeExecuted:false` 明示该列表不是几何/规则/完整依赖的成功证明；修正后的整单仍须正常编译与 Native 检查。
4. `packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs`：只有原未发出订单经当前同源编译确实发现以前未送达的第二项错误，才追加一次具名的来源诊断纠错。原订单、错误、轮次、费用保留；同诊断已交付、已用过该追加、在途请求或无关错误不会再开窗口。

## 定点验证

`scripts/debug-slice272-order-diagnostics-v924.mjs` 使用上述真实 A 订单、当前事实绑定和真实方法编译上下文。

- [RED](../build/slice272-order-diagnostics-v924-red.json)：原代码没有第二步骤诊断。
- 修改后[一次 GREEN](../build/slice272-order-diagnostics-v924-green.json)：同时返回 `s1 / ROSTER_WORKFLOW_SPATIAL_ENVELOPE_INVALID` 和 `s2 / ROSTER_WORKFLOW_FORMATION_SELECTOR_CONTRACT`；原订单和原错误保留。
- 明确注入的正确订单只用于测试：同样父态和锚点保留，未来队形选项仍有正常 model-choice gate；不是 Host 修复生产数据。
- 单一错误仍使用原合同；新诊断只能取得一次有界纠错；重复、已送达、在途、无关网络错误均拒绝追加。
- 0 Provider、0 Native、0生产状态写入。v921/v922/v923和其他已通过门未重跑。

## 上轮修复的真实使用，不只检查函数

| 组 | 实际请求 | 实际回复 | 新入口确实生效 | 已提交产物与界限 |
|---|---|---|---|---|
| A | `3168e42a4cf8eef4b324e995b9cb80d0f8cbdbebbe48950990b598d252af37ad` | `b290315ca5b95a216d053c636d272d6b4ebc756e44d2c2beac601e82d1c88363` | `source_interpretation_challenge` + `strategy_owner_context`；8项历史/目录延期，当前Plan与事实保留 | r3→r4。按地图原件限定“至少一种当前底座可达”的证明范围，收紧部署/控点表述；固定军表不改。不是已证明每单位最早到达或胜率改善 |
| B | `6f4f0114d231b1338aa9e3649dcae29783589b0a327bd97bc91bb32c0f535c14` | `6f2d3565852c8f389d6eba7e44669f65bfc50e05640ab4112493e93330bfeafc` | 正常 `fact_owner_strategy_required` + `strategy_owner_context`；8项背景延期 | r9→r10，军表不变。publicReason中差值方向正确，但decision.publicReason又反写方向；仍不能批准或归档为已证优势 |

这证明 P2 新入口已被真实模型调用使用，也证明**分块本身没有消除语义错误**。不追加策略倾向 prompt 来强迫换表，不把较窄 small 实测当作 large 替代完成，不因版本增加而计策略提升。后续需观察既有来源审核和作者纠正实际闭环。

## 当前运行与经验

旧 A46665/B46672 均已安全退出，无 pending。A 在停止边界前完成 r4，B 完成 r10；原费用和历史未清。

同一原目录、同版代码续行：

- A **58000**，起点事件6760/r4，`build/slice272-v924-step-diagnostics-fixed-1792713353362.log`。
- B **58029**，起点事件7164/r10，`build/slice272-v924-step-diagnostics-editable-1792713353933.log`。

不新建房间、不重发成功调用。A 的新合并诊断是否被真正修正、B 的语义纠正是否收敛，仍须读取后续实际结果，不把进程启动算通过。

条件观察 A110/B17，已审条件结论各0。后续 Skill 检索接线及适用性验证未完成，不能宣布127条有效 Skill。

## Harness 本轮记录

### 实际消费追加：两错一次修正，Native已返回6个候选

A真实请求 `32ce922bf3ac5599e5ce5e8bb8679cc687be5a0e6b1c8626028d24e7944384af` 同时携带s1/s2两项准确诊断。

真实回复 `9211a79b349f4fb735640c6a0cea8f447b1a2361ce395f27443d1b71e5c01615` 一次完成修正：base移到queryKind同层，unitId/原锚点不变；s2改为明确 `{fromStepId:"s1", optionIndex:0}`，删除非法来源编号绑定。模型原回复完整保留，没有手工改成成功。

产品结果 `137d558ed022ae66377f9b5306c1ed021194b0147c3ee54a305d4c7a0381349b` 的 `failedWorkOrders=[]`，订单进入实际队列。该次真实调用记录72,569 units（输入71,017、输出1,552），Provider耗时8.739秒；不把此耗时当整流程墙钟耗时，费用沿原Run账保留。

Native s1结果 `1e5910d41735653bf32d1fdb90b545c5edae9f62310a61a1c61774ad9df6ba7b` 实际对同一父分支 `162003fc…`、同一Raptor、同一x3..5/y5..7/step0.5区域求出**6个静态队形候选**。这不是进场路径/冲锋或存活概率证明。

A事件6776：s2正常进入 `needs_model_choice`，`observed-choice` 已ready，要求看到真实候选后再确认，并非又一次工程错误。条件观察增至111；仍无已审结论。B事件7228/r10事实角色已返回给作者，尚未收敛。A58000/B58029均以ps核实存活；不重复启动、不重跑已过门。

- `harnessLoopUsed: true`；`targetGames: [starcraft_tmg]`。
- 路由：experiment planner、strategy decision、source review；Native合同版本与冻结数据未更新。
- 工具：同产品订单编译/参数诊断、证据读取、结构化Plan提交。没有本轮新的浏览器验收或正式对局动作。
- 决策证据：上表真实请求/回复、A提交 `fe57e516…`、B提交 `c5923030…`。
- 记忆边界：条件观察/已审结论独立；本轮不生成训练真值、不晋级Skill、不写真实对局记忆。
- 回退/降级：如诊断改变选择/父态、重复派发、来源错配或出现未经完整准入的部分执行，该改动不得用于生产；当前门覆盖对应不执行与原件保留界限，不声称所有异常已穷尽。
- 用户可见结果：A新Plan有更准确的地图证明范围；B仍有待纠正矛盾，不交付为最终方案。

## 进度

T27 5/6、T23 33/36；S272/S248/S249/S250共4片。正式Plan0/6、新对局0/12。

下一步仍是完成真实条件实验→作者处理→受影响审核→有效经验，随后P6完整逐步报告和约定对局。局部诊断绿灯不替代完整产物。
