# P1/P2/P5：同角色工作单纠错接入增量账本（v961）

**最新 v962**：原B r21/event10592，55245安全退出、0在途后PID59691载入自动补读交接修复，同产品继续已提交的位移工作单。log `build/slice272-v962-implicit-order-1792768067483.log`。真实v961改选已发生，Native与后继结果待；正式0/6、新局0/12、余4片。

## 本次范围与真实停点

T27/S272；T27 5/6、T23 33/36，关联剩余 S272/S248/S249/S250 共4片。正式 Plan 0/6、新对局0/12。本文不是最终产物报告，也不证明策略改善。

原产品 B `build/slice272-product-generation-v645-8aBuEV`，workflow `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，r21/event10574。PID38649已退出，0在途。军表仍2000矿/145气、9单位；没有新Native动作或Plan提交。

方法 `...:method:cc2a5a7715e1b02a` 共5次真实请求：前两次读取成功，后三次仍选择当前菜单中不存在的 `move/marine-1`。共782,822 provider units、Provider46.048秒，非整个流程耗时；旧费用照存，不据此推算全项目总费用。

| 轮次 | 实际作用 | 请求/回复引用（完整原件在 workflow/artifacts） |
|---|---|---|
| 1 | 读Native动作接口、原部署回执及后态 | `64877d349ea02f6c5a4f40801b182dce3a8dd28eb8e80e01c5a1df7b12c3cbe3` / `4af41d6346b2bc6857a9afa90b06199c5daab93d6f318ccc4f6ac2d992d01cd5` |
| 2 | 读当前菜单及动作参数 | `1710b17e9ccbfa11a2d8462214564d9ab2672b4feceefc1e929aaf7d17940eb7` / `e8aacb772af091be2e404f047108e36d16d7b3cefd6e067ba0541dc840004b20` |
| 3 | 把能力目录的 executable_exact 误当当前可移动 | `3a9fa9ab645e0597bd4bdad5433f592db490016771a043e84609a6bba6640f1d` / `74f4138e69c9b25f74b5cab297cf0870f6705031a28f38d91790a89a320e411c` |
| 4–5 | 收到matchCount=0及六个真实选项，但再次重发旧工作单 | `ff3d306503c34b85b271e9f7ccf8e00adf6aeb0d4916116b3f501bb03b63b46a` / `9def62fa74d5d1745aa9c241dd71623f1c7be399e1541171cfbcf56f28354715`；`991be12009db0041c9140bef006d392bb96a7a88af66106a710dbc11d9d6077e` / `8cf1f52449adcefbd7d8cc937f35a9a170d9834c74feb516326d7bf1c0ee91da` |

结论：不是查询结果丢失，也不是执行器拒绝合法动作。反馈已交付；模型误读当前动作资格。工程还有一处不一致：委派子任务纠错已使用增量命令，同角色内的选择器纠错仍要求重发整份工作单，容易固化旧方案。零匹配的提示还混用了多匹配的说明。

## 代码修改

1. `roster-work-order-edit-command-v1.mjs`：同角色发布前的单工作单选择器失败也进入现有stepId增量接口；未提及步骤保留。读取准备保存原工作单、修订提案与来源，冷恢复不依赖纠错字段仍然非空。多个工作单不擅自丢兄弟任务以适配此接口。
2. `roster-workflow-read-role-v1.mjs`：零匹配明确为当前菜单不存在，能力支持不等于当前可用。允许一次旧协议停点的新命令恢复，不给已用新协议者重复授权。
3. `roster-decision-product-journey-v1.mjs`：同产品自动恢复入口记录具体修复原因。原费用、失败、查询与账本不清除。

没有修改单位、地图、规则或可用动作；Host不代选替代动作。增量编辑不是成功：原编译、来源及Native合法性检查仍然执行。若方法目的本身不可行，模型必须明确交回负责人，不能靠改步骤偷偷换问题。

## 单步注入证据

仅新增复现本缺陷的 `scripts/verify-slice272-inline-order-repair-v961.mjs`，不运行旧门或全量测试。

- RED PID52539：真实角色入口发出的仍是 `roster_workflow_experiment_v1`，而非增量命令，复现入口漏接。
- 修后PID53812：增量接口、保留后继/作用域/旧查询、读取准备、冷恢复、显式确认、旧非法移动继续拒绝、过期依赖拒绝，均走过断言。最后控制返回注入失败：测试夹具遗漏 `nativeFacts`、`hypothesisAssessments` 两个必填数组；不是产品返回失败。
- 只修该夹具并用 `remaining` 模式追加PID54742：仅剩控制返回、原问题保留、一次旧协议恢复与负例通过。此前已通过分支不重跑。
- 全部为实际产品角色executor＋保存真实输入＋模拟返回；0真实Provider、0Native、0生产状态写。不能用这些证据声称真实模型已收敛。

## 实际恢复（待观察）

确认旧PID缺失、0运行/在途后，同产品同B启动PID55245：
`build/slice272-v961-inline-order-1792767711923.log`。
不使用网络重试标志，不新建房间、不重放成功部署。下一验收是模型真实使用增量修订或有依据控制返回，以及原问题的后续解决；最终军表/Plan仍未准出。

## v961真实消费与v962自动补读交接

真实新请求 `5ba462e24d76116dd0fca6f41668a0ba4e925180eb40b12eff65ed8b4fa84951` 确实使用增量命令。回复 `7f2b1d53dfc9dceba92372b616e56f784158f2bb0297adca8c26d567f8c7c8a0` 自行承认move当前不存在，显式upsert原 `select-marine1-move` 为菜单中Go! Go! Go!，未重写/删除尾部。172,571units，Provider10.860秒。

原生合法性仍未通过：模型把(27000,32630)到(25000,30630)称为2英寸，欧氏距离约2.828英寸；Host没有替它改参数。系统先按真实选中条目补读2057 `/receipt/actionSpace/parameterDomains/5`，回执 `54da98496af2972471b2f783b157a7ba98aa5b995d9b4cc87a95ffbdb75b3f2e`。

发现P1/P2/P5的另一处真实漏接：这次不是模型显式reads，而是系统正常自动补读，旧代码只保存wire回复到evidenceDelivery，未保存其增量基线。随后请求退回整单协议。已请求55245优雅退出；在当前操作结束前，它完成了 `2c3f3225ff7fabfdad3dd4072a7ed0aa080aa91fd373f92d5ed1a752c875ddad` → `b4005fee14ef52e49fdde19a6c46907367108c9848a1f83b197d4fc29722482b`（175,131units/11.551秒），保留同能力/参数及inspect后继，改用新stepId后经编译入队。此回复保留，不回退重买；不能据此声称“增量协议全程未退化”。

v962修改同两文件：mapper提供精确合并后的未确认preparationCandidate；自动补读与显式补读使用同一持久提案。旧冷恢复从已保存请求＋原回复重建工程视图，不重写原件、不自动提交、不添加Native事实；作用域不同不复用。

仅新增复现该缺陷的 `scripts/verify-slice272-implicit-order-handoff-v962.mjs`：PID58315 RED捕获到退化的全量Schema；PID59362一次GREEN，证明真实自动补读停点恢复同增量协议、后继/查询/调用记录保留、冷恢复幂等、显式确认保持模型参数且不代批准。0Provider/Native/生产写；v961已通过项不重跑。

确认55245退出、event10592/0运行/0在途后同产品PID59691续行原队列。两次新真实调用合计347,702units/Provider22.411秒，不是全链时间；全部旧账和未知费用仍保留。
