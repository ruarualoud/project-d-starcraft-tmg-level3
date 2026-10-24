# S272 P2/P3/P5：测量与场景条件共用交付接口

日期：2026-10-22。仅修新 P0–P6 流程的实际交接缺口；不恢复旧生产，不启动对局。

## 结论与边界

共享交付的定点门禁通过，原生成 Run 已用新代码继续。**尚未证明模型据此完成原必要问题，也未证明完整 Plan 准出或策略更优。**

T27 5/6，T23 33/36；相关剩余 S272/S248/S249/S250 四片；最终 Plan 0/6，对局 0/12。正式军表仍 r4、2000 矿／170 气。本次不改军表、不改已付费回复、不重新计算攻击、不重跑已通过的旧门禁。

## 真实原因

v849 已提供只读 `compare_scenes`，实际请求也包含其入口，但作者没有使用它。已分配的两个测量，系统自动给了配置差、几何关系、逐武器数值差，却没有附带同一对 Native 状态的完整条件差异；消费者必须重新发现并调度这一纯读取。

实际作者请求 `e2be814d490a9095c1657c68c1bd02140ce8718983f2ce2eec25d85defe480ed` 的 `workflow_role_assignment.inputs` 缺 `measurementConditions`。作者结果 `92d7da61b3bb0503543e1971dae799097c85a3533d86ae15fd0dac45d754d1d3` 仍以几何投影的固定 false 标记和不同 hash 保留因果未决。

随后父审核 `e216665466c40e99e14918ed269536db792ef26b1888e22c26053fcd54f0b7b7` 同样保留三条必要事实并自动回交作者。旧判定不覆盖、不手改。false 标记表示该投影未评估，不是测量得到的无效或不相等。

## 本次实现

1. 执行器新增 `compareSavedSceneConditions`：调用 v849 已验证的同一 Native 比较函数，读取明确选中的两份保存状态。精确来源校验；完整成功结果按状态对缓存，共享并发读取，返回副本；失败或不完整结果不留成功缓存。
2. 产品工作流 → 角色来源接口 → 测量配置接口 → 测量场景接口统一传递这个只读能力，没有建立另一套规则实现。
3. 只对原来已匹配、已分配的测量对附带 `measurementConditions`。不扫描无关候选、不选择新实验、不重复同一状态对、不自比。
4. 输出包括原始 Native 条件回执及两个测量、原投影和状态引用；检查源状态、目标状态、Rules、Builder 和完整性。错配、缺失、未知或读取失败明确列为不可用，不填零或编造相等。
5. 条件事实不授予因果、统计显著性、合法到达、战略优越或发布批准；解释和决策仍由职责角色完成。显式 `compare_scenes` 工具继续保留。

## 验证：只运行当前失败门

命令入口：`scripts/verify-slice272-measurement-conditions-v850.mjs`，输入为当前 Run 和保存的 v849 Native 比较夹具。使用实际作者输入和实际 Native 回执；缓存部分使用明确的端口替身，不冒充新的 Native 实验。

| 执行 | 结果 |
|---|---|
| RED，PID 20242 | 实际角色输入缺条件事实，断言失败 |
| 修后，PID 21744 | 条件已交付；同一状态对因多条测量链接被调用 4 次、实际仅 2 对，去重断言失败 |
| 修正共享读取去重后，PID 22112 | 一次完整 GREEN，退出 0 |

最终涵盖：作者／战略／事实汇总／局部 Teach／审核五类共享消费者；错参照状态、错目标来源、比较不完整、Native unknown、读取失败五类注入；同状态读取合并、返回副本不污染缓存、非法来源拒绝、原工作流不变。

日志：

- `build/slice272-v850-red-1792624847982.log`
- `build/slice272-v850-green-1792624969359.log`（未通过的中间执行，名称不代表结果）
- `build/slice272-v850-final-1792624999285.log`（最终通过）

Native 夹具：`build/slice272-conditions-v849-oefzKs/workspace/decision-workflows/conditions-v849`。沿用其 579 条完整结构差异，**不是 579 个独立干扰变量**。没有新 Provider、攻击计算或生产状态写入。

## 实际续行

- 同 Run：`build/slice272-product-generation-v645-lqMWaS`
- 同工作流：`decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c`
- v849 PID 5128 已正常停止，最终 e9700，0 在途；守护 5129 退出。
- 新 PID 22376、空间守护 22377，日志 `build/slice272-v850-measurement-conditions-resume-1792625022408.log`。
- 从既有 `:source-revision` ready 工作继续，不新增运行、不重建房间、不清旧费用。
- 下一证据：真实请求是否携带实际条件回执，以及作者／审核能否正确消费。仅初始化或门禁通过不计完成。

### 首个真实请求已送达且被使用（e9707–9709）

请求 `8f1056c2d37a904c6a535b1936e05ac4238c0be0682e98fde7d169c06be21166`，回复 `94ab477fe1f938246797ce9c0ba434802d1246267cd45c4f153073e271006078`。

四条已匹配关系全部为 observed：1213→1410、1429→1410 各 579 条结构差异；1213↔1429 为同 Native 状态、0 差异。正式请求中含完整 Native 回执、board/cardResources/phase/runtime 等相等覆盖，不只是工具目录。

作者公开理由已经明确：两组只有 Goliath 升级及派生预算／审核／目录字段不同，其他场景条件相同；下一步读取原 1410/1429 攻击回执，确认采样、目标和反应设置。此次 action=read、workOrders 空，无新攻击或场景申请。**证明事实交接被真实使用，不代表作者最终回答、独立审核或策略发布已完成。**

首调用 141,798 units，Provider 5,477ms；全部费用按原 Run 继续累计。请求 JSON 1,119,924 字符，其中条件部分 348,268 字符；同一回执因不同测量关系仍在序列化输入中重复出现，虽 Native 读取已缓存，文本尚未去重。列为 Medium 性能优化项，不在当前事实收口期间再次停机，也不虚报整体提速。

## 文件与验收口径

改动五个产品文件：`roster-workflow-laboratory-v1.mjs`、`roster-workflow-evidence-lineage-v1.mjs`、`roster-measurement-configuration-v1.mjs`、`roster-measurement-scenes-v1.mjs`、`roster-decision-workspace-run-v1.mjs`；新增一条具体缺陷验证。

`harnessLoopUsed=true`；游戏 StarCraft；路由为事实方法／战略／Teach／事实汇总／来源审核。无 UI 行为、无记忆晋级、`trainingTruth=false`。若真实角色收不到或误用条件，记录实际请求并按来源问题修复，不能把尚未取得的战略结果写成通过。
