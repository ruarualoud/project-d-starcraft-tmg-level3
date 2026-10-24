# T27 / S272 P2/P5：角色工具展示与执行权限同源

日期：2026-10-23。沿 P0–P6 主线修复实际交接，不恢复旧调查，不替代最终策略验收。

## 实际问题与判断

B 在原新产品 Run 的场景修复角色中，`pending_operation_choice_contract.allowedOperations` 为 `inspect / spatial / scenario`，但同一个真实模型请求的工具操作目录仍有27项，包括 `candidate_context`。

模型随后提出 `candidate_context → scenario`，被编译器拒绝并回交上级。这不是网络请求失败或 Native 已执行；源头配置修复说明建议建立候选上下文，但并不授予该局部角色权限。

保存证据（B workflow artifacts）：

- 调度输入：`0d8b1d031ac05c7fdcd59d47113b742d627b3b45d8c1f5cc629acffaa3aacb95`。
- 真实请求：`fb75bac8aa0885f1ec17f8068a4aa5ed5042f54519c7d1d2bbf58af534a3d266`。
- 原模型回复：`22496d6101348a450884ae7a3e0fa5e6dad044fcdd2c6c80be1f54887d40ed3f`。
- 回交：`d499a66e…`，保留原提案和原问题，没有把权限缺口当成工具不存在。

三种解释的核对：

1. **工具目录与当前权限不一致**：真实请求和编译器均证实，定点 RED 复现。
2. **编译器误拒绝本来已委派的方法**：当前合同明确只委派该 scenario 及既有准备查询，不能由 Host 擅自扩为更换候选军表，因此本轮不放宽权限。
3. **工具能力说明整体漏传**：A 的概率能力检查发现完整 `proofScope.doesNotProve` 已交付，未实施重复提示补丁。模型选择“冲锋域用于单次攻击概率”仍须在真实方法中被纠正；不能据此猜测所有失败均为传输问题。

这里只证明界面合同矛盾客观存在；尚未证明它是模型错误的唯一原因或修复后错误率一定下降。

## 源头修复

`roster-tool-proof-scope-v1.mjs` 新增共享只读投影 `projectRosterDelegatedToolPresentationV1`：

- **直接使用同一个 graph-derived choice contract**，不维护第二份权限清单。
- 本角色的 `operations` 只展示允许的方法；若 spatial 只是前置准备，其查询种类同样按该合同限制。
- 非本角色的方法保留在 `deferredOperations`，注明交给上级负责人；不伪称能力不存在。
- 完整原始工具来源、精确读取地址和已保存请求都保留。读取广泛的原件或修复建议不等于扩权。
- 未委派的顶层方法角色不受裁剪；Native、编译权限、原问题、假设、验收和费用均不改变。
- 完整 descriptor 和已压缩的目录都走同一投影；重复投影不改变结果。

`roster-workflow-read-role-v1.mjs` 在真实角色输入组装处调用。仅用于新请求；已发出请求的 retry／原付费回复 revalidation 不重写。

## 定点验证

脚本 `scripts/debug-slice272-delegated-tools-v916.mjs` 使用上面的真实 B 调度输入、原请求、原回复以及真实 read-role 请求构造器。Provider 边界是注入捕获，不调用模型。

1. **RED**：实际构造出的角色仍暴露27个操作，与3项委派不一致。
2. 修改后 **一次 GREEN**：
   - 实际请求中的工具列表与同一权限合同一致；原始输入／工作流不变。
   - 完整 descriptor 和目录两路一致；允许的 schema 和来源地址保留，前置 spatial 查询范围一致。
   - 原越权模型提案仍被真实编译器拒绝，未通过宽松化权限换取绿灯。
   - 上级方法角色及本身被委派为 spatial 的角色没有被额外收窄。

[RED](../build/slice272-delegated-tools-v916-red.json)／[GREEN](../build/slice272-delegated-tools-v916-green.json)。0真实Provider、0Native、0生产状态写；没有重跑其他已通过验证。**证明输入和权限同源，不证明策略效果或完整生产稳定性。**

## 原任务实际续行

旧 A13462/B13469 已在当前操作边界保存退出；两条日志都有 `finished / stopRequested:true`，ps 无旧进程，两组 pending dispatch 均为空后才续行。

- A：原目录 `build/slice272-product-generation-v645-hsxEYu`，r3／事件6403；新 PID **61931**，日志 `build/slice272-v916-delegated-tools-fixed-1792707622253.log`。
- B：原目录 `build/slice272-product-generation-v645-8aBuEV`，r6／事件6397；新 PID **61943**，日志 `build/slice272-v916-delegated-tools-editable-1792707622828.log`。

原目录、军表、Plan、费用和成功证据均保留，未重新生成军表、初始化房间或重放成功查询。

退出时的真实进展：

- A 已把 Raptor 从旧接战位置改到新锚点，但 Native 有界队形搜索未找到解；随后选了不属于该分支的旧队形候选，被来源父态检查拒绝。正在同分支修复，不把搜索未找到当成几何不可能，也没有产生生存结果。
- B 已实际尝试新的候选上下文；该提案把当前 small Marauder 升成 large＋额外升级但未释放其他预算，Native 拒绝 `ARMY_MINERAL_BUDGET_EXCEEDED`。事实角色 `ca6b8fb2…` 把缺预算的实际候选交回战略负责人，未伪造大编成测量。**这个候选失败不证明所有替代方案都非法或原战略假设已被反驳。**

下一步读取新实际请求确认权限投影被消费，并继续到同场景可比测量→来源审核→战略取舍／必要的联合修订。r6 旧 purpose 尚未获最终批准。

### 实际加载后的观察

- A 请求 `be3cefb5…` 已实际带 `roster_delegated_tool_presentation_v1`：仅 inspect／spatial／formation_scene 三项，24项交回上级。回复 `53b54169…` 识别旧队形来自错误父态，要求在原失败分支重新求解；当前仍在工作单纠错，未产生成功生存测量。
- B 新战略回复 `ac99ea5d…` 拟保留军表、修改用途并收窄比较。但其理由又把 866 的差值方向解释成“不支持 Marauder 优势”，不能据此批准。实际请求 `95c5a480…` 的 `registered_native_measurement_supplements` **确实包含**正反方向：Goliath−Marauder = −0.527778，反向 = +0.527778 且 >0.5 为 true。此次没有证据表明算术投影漏传；需追踪既有来源审核是否纠正此新作者论述，不手填替换答案，也不把它作为已审经验。
- 上述两项均未扩大本轮验证结论：权限展示已实际送达，但语义纠错与整体策略收敛仍未证明。两进程存活，未启动对局。

## 完成度

T27 5/6、T23 33/36；剩余 S272/S248/S249/S250 共4片。正式 Plan 0/6、对局0/12。本轮补强 P2/P5 的实际工程证据，不勾选整体策略优化或完整 Teach 收敛。
