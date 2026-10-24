# P1/P5 类型命令的字段诊断与冷恢复 v958

T27/S272。T27 5/6、T23 33/36；剩余 S272/S248/S249/S250 共4片。正式Plan0/6、新局0/12不变。本次只处理新P0–P6实际产品流程的两个具体失败，不恢复旧调查，不把门禁代替最终产物。

## 真实经过

同B `slice272-product-generation-v645-8aBuEV` / `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`。

1. v957已经在条件场景中完成Marine1合法部署，原后继检查和汇总实际完成（详v957报告）。随后方法负责人提出普通move。请求 `d2abe1da60d80c32b299a80e063d3faf37f6ce59f7f96ff25dbc8a88b519d4a8` 已交付 `executionEligibilityProven=false` 和“能力目录不是当前合法菜单”的说明，故不能把这次误读归咎于漏传。
2. 第一份动作外层字段错误被执行前拒绝（`1d8a1483f3511f2953141447786634f35a43305f9ae6c10892f034f761947bdc`），原生没有执行移动。模型经现有读取发现普通move不在当前菜单，提出Go! Go! Go!替代，并重复附带父任务的后继inspect；编译器因越出单项委派拒绝。
3. 模型实际采用v956的增量命令，删除额外inspect，改为队形查询＋候选选择（`82414e4ebae0baa2463f52289d24c35f9c81e753ce1522f9239b0d4932a12490`），没有静默漏掉步骤。接着把未来步骤引用写成回执的evidenceNumber，已有诊断指出该字段不存在。
4. 下一稿修成fromStepId，但仍使用 `optionIndex` 而不是Native选择合同的 `index`。实际 `af0cc15b8a362d8166a9eddb21ae24cc5f61dd7c59e1c1efe9d71959403ffb4c` 返回 `ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID`，却给出 `issues:[]`。这是工程诊断缺口，不是场景或规则不合法的证据。
5. 模型之后错误怀疑Go! Go! Go!场景，混合patch和read（付费回复 `11259d8a521caa071fbf90f15fa6b48e8252efe78915c05e0bc36d6fb79f1b60`）。命令映射正确拒绝该混合，但又把不存在的投影结果送入完整角色Schema，附加了误导性的null对象错误。
6. 构造下一纠错请求时，恢复代码假设所有小命令都来自旧 `local_contract_feedback.originalOutput`；v956独立工作单命令并无该节点，触发TypeError。原进程85184在event10483/r21退出，0在途。原错误标成unknown，但实际保存请求/回复链证明错误发生在下一Provider请求登记之前。

## 修复内容

- `roster-workflow-laboratory-v1.mjs`：统一Native选择校验按字段收集所有原拒绝条件，包含来源、selector、索引、match、参数归属、未知字段和额外绑定；不再存在拒绝却issues为空的分支。明确本层未执行菜单查找或原生合法性判断。未增加别名，未替模型选动作，原合法性要求不放宽。
- `roster-workflow-read-role-v1.mjs`：旧语义patch有完整基线则保留基线；独立类型命令无旧反馈节点时保留真实被拒命令本身，不能空引用或伪造完整角色输出。命令映射失败不再对null生成次生Schema错误。
- 同一只读执行器的现有断点证明扩展到这条已定位TypeError：核对精确dispatch、当前输入、已保存continuation、付费请求/回复身份、该类型命令及其拒绝，且无pending/retry/revalidate。任意其它unknown、工具动作或在途请求都不获准恢复。
- `roster-decision-workflow-v1.mjs`：启动时消费上述具名证明，保留failureHistory、读取、调用、计数和原reply，恢复下一请求准备；不重发旧请求、不重新开始三轮、不重复Native。

## 一次性定点验证

脚本 `scripts/verify-slice272-command-feedback-v958.mjs <原workflow目录> <mode>`，原件只读、注入在内存，不调用Provider/Native，不写生产状态。

| 模式 | 有效RED | 修改后一次GREEN | 证明范围 |
|---|---|---|---|
| selection | PID8359，实际选择拒绝却issues空 | PID9788 | 原失败和同校验器各异常分支均指出字段；已保存合法候选仍逐值复制参数，原件不变 |
| recovery | PID8360，真实冷恢复抛originalOutput TypeError | PID9789 | 实际角色请求可重建；再次注入坏命令只返回真实命令错误；再次冷恢复仍保留原工作单/读取/历史 |
| reentry | PID12214，已知本地准备错误不能重新入队 | PID12823 | 真工作图通过已保存链路证明而恢复一次；unknown其它错误/在途/工具均拒绝；第二次冷加载不重复登记，计数不变 |

未复跑已通过项或无关测试、构建。0真实Provider、0Native、0生产写入是验证脚本的范围，不能据此声称模型已纠正或Plan已准出。

## 实际继续

确认85184退出、无同B进程且0在途后，PID13773用原产品入口继续：

`node scripts/run-slice272-product-generation-v645.mjs --resume build/slice272-product-generation-v645-8aBuEV --mode editable`

日志 `build/slice272-v958-command-feedback-1792764401976.log`。未加Provider重试标志、未新建房间。实际恢复和下一模型结果须继续观察，不用启动成功代替验收。

技能影响：harness观测保留了真实公开理由、请求、工作单及原生回执边界；diagnose先证伪“能力说明漏传”，再用实际失败复现两个工程缺口。没有修改战略Skill或手补策略/坐标。后续若仍有模型错误，应由类型纠错或职责回交处理；最终军表/Plan与策略比较仍待。

## 实际恢复结果与下一停点

event10484实际登记 `typed_command_feedback_v958` 的 `unissued_read_role_resumed`，原TypeError与原reply保留，countersReset/historyReset/providerReplayed/nativeReplayed均false。随后两次真实请求成功返回，未再次发生空节点崩溃：

| 请求 | 回复 | 用量units | Provider耗时 |
|---|---|---:|---:|
| aeafea84ac1c9305edd72aa9725b38cb3a9ad2dc6857e1c5de12d3eb7bf9df10 | 86f2e67cccd04d6263d78187c9dd3b2c2c1193002538d0077ccea70ea7bba1e2 | 106221 | 7.557秒 |
| d14c2e46ce3a515942e32a5c689406483fe712ecaa934a867db354b543f799c3 | 8961f0affc4d183a3f3681be11d895bed40f097fb022e0c7c6e4a83da614c58b | 106195 | 6.431秒 |

合计212416units/13.988秒仅是这两次Provider量，不是完整流程时间或全部旧账。请求、回复、用量原件保留。

两次回复仍将 `action:patch`、非空reads与非空stepEdits混在一起，因此被真实互斥合同拒绝。v958已消除次生null Schema错误，但尚未解决这种混合准备/修改的收敛。连同修前一次，共三次，event10491/r21以 `ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED` 停下；PID13773已确认退出、无在途、无新Native动作。

下一P1/P2/P5交付物应是可恢复的“读取准备→作者确认修改”交接：保留模型修改提案但不执行，先取得明确请求的资料，之后让作者确认/修订再提交。必须区分准备阶段、未确认提案、已接受命令与已执行结果；不通过丢弃reads或自动应用旧patch凑成功。先用这三份实际回复离线注入证明无丢失/无抢跑/冷恢复，再按已授权的明确修复后一次续行处理当前停点；不原样追加重试。此项尚未实现，不能列为已完成。
