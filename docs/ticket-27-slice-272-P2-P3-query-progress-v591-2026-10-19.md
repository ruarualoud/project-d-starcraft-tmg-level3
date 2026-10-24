# P2/P3：重复观察与推进纠错，v591–592

所属 T27/S272。修复新流程实际失败，不恢复旧调查。正式 Plan 仍0/6、对局0/12；不能据以下局部门禁宣布整体完成。

## 真实失败与修正

1. [528回复](../build/slice272-projection-owner-v565-inlKbk/528.reply.json)已查同一私有分支五个控制点；[534回复](../build/slice272-projection-owner-v565-inlKbk/534.reply.json)仍提出相同查询。模型知道场外单位不在场，却继续用控制查询补进场缺口。
2. v591在唯一产品工具执行边界复用成功的同源、同上下文、同参数`spatial`回执。只排除Host查询标签，JSON格式／对象键顺序不改变输入身份；数组、分支、席位、参数、来源和规则均保留。未知／失败不当成功复用，原回执不改签，调用者的新后置断言仍检查。
3. 实际534所建工具在新进程复用了原回执`ef4ac95f…422a4`，`executed:false/newObservation:false`，原生执行0。完整复用记录保存在同Run事实原件及分块视图。
4. [539完整请求](../build/slice272-projection-owner-v565-inlKbk/539.request.json)包含复用反馈，但[实际回复](../build/slice272-projection-owner-v565-inlKbk/539.reply.json)仍提出相同查询。因此提示存在不能算模型收敛。
5. v592把该情形分派为独立的`reconcile_repeated_observation`推进纠错。保留原问题、审核要求、实际事实与来源；上批重复提案只保留原件引用，不再内联为当前意图。SYSTEM明确要求指出缺失谓词，选择能测量它的新实验／能力读取或带来源的结论，不能以同一观察重复推进。
6. 同时纠正SYSTEM中残留的旧静态选择器说明：当前`sourceEvidenceNumber/optionIndex`以及Native／静态候选区别以实际工具合同为准。没有更改Rules、军表、Plan或模型旧回复。

## 定点验证（通过后未重跑）

| 门 | 修前 | 修后一次结果 | 范围 |
|---|---|---|---|
| `verify-slice272-completed-query-reuse-v591.mjs` | 实际528/534模式重复执行Native，1≠0 | 通过；6种改变／旧未知不误复用；原件与新断言保留 | 产品执行器＋真实保存回执，Native spy；不是规则或策略证明 |
| `verify-slice272-progress-role-v592.mjs` | 实际539仍使用普通实验SYSTEM | 通过；专门纠错SYSTEM，原问题／审核／来源不丢，旧提案原件不改 | 实际539输入投影与SYSTEM路由；实际模型收敛另看 |

无Provider调用、无生产数据写入；只运行上述各门的具体红／绿，不重跑旧通过门。

## 安全加载与剩余验收

- PID79694收到优雅停止信号，完成534／当前advance后退出，running0。
- PID11527同Run加载v591，真实535–545保留；收到优雅停止后完成545／当前advance退出，running0。
- PID16916同Run加载v592，日志`build/slice272-live-p5-v592.log`。核对进程／最新日志后续行，不能仅凭本段假定仍活着。
- 实际549已收到专门的progress-recovery SYSTEM，先读已保存地图原件；[551完整请求](../build/slice272-projection-owner-v565-inlKbk/551.request.json)与[551回复](../build/slice272-projection-owner-v565-inlKbk/551.reply.json)明确把必要缺口改为预备队进场，提出inspect实际动作域→求解Marauder2，而非再次查询相同控制点。证明发生了相关下一步选择，不证明Native进场成功或整域收敛。
- 当前draft revision2；军表未变化，两个域仍须完成来源／问题覆盖审核，再联合修订与受影响Teach。最终收敛仍待。
- P6网页仅新入口／初始化／离线导出验证完成，未启动真实网页生成，未证明两模式最终产物；不因此转离P5主线。
- 至545：本Run20,725,235 Tokens，按冻结价格估USD4.727434056；项目已知127,291,701 Tokens。546以后不包含在此小计；旧未知费用保留。

继续：必要证据→独立来源审核→联合表／Plan修订→受影响Teach→现写／成表两类正式产品实际生成→最终中文逐步报告→约定对战。不得用本报告代替最终产物。
