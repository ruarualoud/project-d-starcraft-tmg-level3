# P1/P4/P5：局部 Plan 编辑不可隐式删除其他条目（v953）

## 当前结论

真实 B 已从 r19 提交 r20：修正旧摘要、细化两条反制动作、量化 Supply 损失触发条件；军表仍为 2000 分、145 气。不是最终准出。检查实际提交发现，作者只声明修改 t2，却以单条数组覆盖原有 t1/t2，比分落后触发器 t1 被遗漏。

这是新流程的编辑合同缺口，不是传输缺字段，也不是事实工具失败。原输入已经说明数组整体替换，但只提供 componentPurposeEdits 的局部接口，另外三类记录没有同等能力；语法和非空 strategicChanges 检查没有阻止未声明删除。

T27 5/6；T23 33/36；S272/S248/S249/S250 共余 4 片。正式 Plan 0/6、新对局 0/12。不以定点门禁代替策略改善或完整生产成功。

## 原始证据

同 Run：`build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`。

- r19：`6339c4b0ea441d6e41eb1d607e8b88895e1a9f5dc6e8ed7fd223b992e767aa56`，含 t1/t2。
- 作者最终产品：`7959ed8e81ed96d31a164be086f2beb63aa8833afac6929f23decc75461500b8`。声明只改摘要、r1/r2、t2；实际 invalidationTriggers 只含 t2。
- r20：`ecbdd0370c7fabc02bd008026603cd9ad6b62bfaacb45c0a58e134e7d22973a7`，只剩 t2。
- 提交事件 9799；原进程 PID1145 请求安全退出后，实际停于 event9851/r20、0 running/0 pending。旧进程停机期间已排入的 followup 保留，不删除，不执行到修订之前。
- 原始回复、草案和费用记录不改写。

## 修改

1. `roster-workflow-draft-v1.mjs`：四类 keyed records 使用统一编辑逻辑。已有 componentPurposeEdits 保留；新增 opponentHypothesisEdits、counterResponseEdits、invalidationTriggerEdits，均使用 `{upsert, remove}`，对应整数组设 null。不修改的记录逐值保留。
2. 完整数组仍表示完整替换，但遗漏现有记录会在 Builder/提交前拒绝，并返回具体条目与纠错方式。作者可以明确指定 remove；合法策略删除没有被禁止。重复身份、不存在的删除、两种写法混用也不接受。
3. `roster-workflow-read-role-v1.mjs`：正常作者请求收到相同编辑合同。已保存的付费请求保留原 Schema，新字段不会塞入其旧回复；原件只做派生字段的无损投影。
4. `roster-plan-record-recovery-v1.mjs`＋Run：只检查当前最新旧合同提交，不重审全部历史。发现此类遗漏时自动交回作者恢复或明确确认删除，保留正确的新内容和所有必要未知；Host 不自行填回 t1。此修订拥有调度优先权，旧实验后继暂不执行；修订仍走同一 Builder/Plan 提交及最终审核。

## 定点验证

使用真实 r19/r20/作者回复；隔离内存状态、保存 Builder 回执，0 外部模型调用、0 Native 执行、0 生产状态写入。

| 验证 | 实际结果 |
|---|---|
| 原始局部 t2 更新不能隐式删除 t1 | RED 复现；修后通过，Builder 尚未调用 |
| 固定表与现写表局部修改 | 通过；t1 原样保留，t2 更新，军表未改变、不授发布资格 |
| 三类新增 keyed edit 的显式删除、完整替换、重复/不存在身份 | 通过；删除关联条目时仍须处理双向引用 |
| 实际同产品 Run 冷恢复 | 通过；排入作者修订，r20 原件未改，旧后继未执行 |

记录：

- `build/slice272-v953-plan-record-red.json`
- `build/slice272-v953-plan-record-green.json`：前两项通过，后续测试删除 r1 却保留其引用，被既有 Plan 合同正确拒绝；不是生产代码失败。
- `build/slice272-v953-plan-record-green-remaining.json`：三类编辑通过；测试误要求旧 followup 不存在，实际它在旧进程优雅停机期间已入队。修正为“保留原状态，不执行”，不是删除旧工作。
- `build/slice272-v953-plan-record-recovery-green.json`：仅补验剩余冷恢复门通过；已通过项没有重跑。

验证脚本：`scripts/verify-slice272-plan-record-loss-v953.mjs`。不运行其他旧门禁。

## 实际续行

PID24819，同一 B 目录、同一 Web/App HTTP 产品流程，日志 `build/slice272-v953-plan-record-live-1792754773991.log`。没有新建房间、重放成功 Native 或复购旧审核。真实作者修订及其后继结果待观察；不能把隔离验证称为无人干预稳定生产。

本轮 Harness 路由：strategy_decision → structured draft edit → Builder/Plan → affected review。保留条件实验与真实战史的区分；没有新增训练真值。回退/降级条件：局部接口丢失其他记录、绕过正常合法性、旧付费 Schema 被改写，或修订期间仍执行依赖缺陷 Plan 的后继。任何一项出现即停止该链路并记录具体证据。

## 真实作者使用及 v954 来源复用

实际作者已使用新 `invalidationTriggerEdits`，只 upsert 旧 t1，明确保留当前 t2/军表/其余章节、保留地图未知，未要求新实验。此时尚未提交：

- 请求 `97cd193df8663a54579924f9710776f197b852e66ab0bb1eb388e0c4ce1f7541` → 公开补读回复 `89bd1899c755c53f48bf61941f06304d01da07912c84a2dfcda60c8b8281cf9f`：111381 units，13.768 秒 Provider。
- 请求 `64dba4748d426d7914282b6cd46c3ba0c2a85d6af0c50da4f289f189523e2353` → 恢复 t1 回复 `b6d43e9d7c31c86be864144cca71bb03489221af39a5e8b18d9cc28fc44215e5`：126386 units，27.615 秒 Provider。
- 随后来源检查仍要求四条旧引用重确认；其中前三条的当前对应块是同一不可变原件，仅编号不同，属于过严误拦截。第四条混入已经修改的 t2，不应一并豁免。初次判断“四条全是编号”不准确，测试已纠正并保留失败记录。
- 请求 `86ab92ae62c8792294bb2feec521207421dc05a7aa0d6da13f4371c433966466` → `e37c4bc43fa9b64f71f7da7c0baebffcd7fc4b3188b94de448656658917b667e`：276934 units，12.319 秒 Provider；为旧门要求的读取，不算策略推进。前三次合计514701 units，非项目总账；旧账不清。

v954 修改共享 `rosterAuthoredChoiceSourceErrorV1`：相同结构地址且当前与旧引用指向同一不可变内容时，接受已读取的原引用，不重写编号、不自动通过语义审核。内容变化、地址变化、源缺失或空引用仍拒绝；比较设计的独立身份合同不变。

`scripts/verify-slice272-identical-plan-source-v954.mjs` 使用上述真实回复。`build/slice272-v954-identical-source-red.json` 复现；`...green.json` 前三条通过、第四条测试误期待通过；`...green-remaining.json` 仅补验后续边界通过，前三条继承而不重跑。0Provider/Native/生产写。没有重跑 v953 或旧门。

PID24819 在 event9907/r20 第四次请求在途时收到优雅停止请求：等待该操作保存，不强杀。**v954 尚未载入；下一确认进程退出与0在途后，同目录加载新代码。不要重发在途请求，也不要把已返回 t1 修订当成已提交。**

## 用户确认的增量方向

命令账本不可变保存；模型返回对稳定 commandId 的增量操作，遗漏表示保留，取消/替换须显式。成功查询复用原回执；失败纠错替换指定未完成操作，不能重演已成功前缀。事实依赖真正变化时只失效相关结果；工具能力目录独立于本轮查询清单。工具仍可发现不等于旧查询自动获准重执行。

当前 Plan keyed edits 和同内容引用复用仅覆盖其中两条边。查询工作单／纠错／恢复／已授权后继仍需逐边核对，不能声称所有工具命令已完成统一增量合同。

## 真实 r21 提交成功

第四次实际回复 `e48c693371dfde30cf7014afd9481528f94d7f6872873fab8ce0f801a29646e0` 完成当前引用确认（290114 units、28.457秒 Provider）。产品 `774d3a27b3e83653282ca23539434f30f376534af27725e16037413b00936c82` 经正常提交，回执 `2a8091bd148b35428a29ac59c3b7e33214afc8939a98e43a32c67a0d30415306`，新草案 `35c18da1f3f25dce0b8e4587a31e4397f7ed778ec54868ad1c11be71b5fc96e4`。

直接比对实际产物：t1 与 r19 原记录逐值相同，t2 与 r20 新记录逐值相同，candidateInput 原样保留。除 invalidationTriggers 外，变化仅为正常 planVersion/revisions/planHash。没有手工修模型输出或草案。此次四次调用总804815 units、82.159秒 Provider；不含本地调度时间，不声称完整流程策略改善。

最新观察 event9928/r21、0running/0pending，PID24819仍在完成本轮持久化/安全退出（14分08秒进程墙钟、9分25秒CPU是该整个进程观测，不是单次请求延迟）。不要重复启动。v954已过定点门但尚未由新进程加载；下一等旧进程退出，再同Run续行。按条目发布草案仍触发大量完整工作图保存，属于待优化的P2本地耗时，不是Provider等待。

## 增量查询的代码核对与同 Run 续行

PID24819已退出；启动前确认同B无其他观察器，检查点event9959/r21、0running/0pending。同目录同产品PID41784加载v954，日志`build/slice272-v954-incremental-resume-1792756085564.log`，启动记录`roomReinitialized:false`。不是重新生成或重跑已通过门；新的实际后继结果尚待。

本次只读核对发现查询调度已经有部分所需机制，不能把它误报成全无：

- `roster-decision-workspace-run-v1.mjs`逐条保存合法工作单与失败工作单；失败只生成对应`orderRepairOf`子任务，提示不重复合法兄弟，工具目录来自独立`tool.descriptor()`。
- 成功纠错以`repairFor/choiceFor`回接原节点；`roster-decision-workflow-v1.mjs`保存原失败回执和替换关系，重复结算返回既有结果，不重新执行原生操作。
- 批次汇总同时等待合法工作单和失败子任务；不是拿最后一轮的工作单数组覆盖此前整个批次。

这只是相关代码路径核对，不是新增执行证明。仍须区分：单查询纠错的继承、作者整方法重新提交、Plan改版后的未完成查询授权迁移、冷恢复后的来源发现。尚未据此宣布整链增量合同已验收，也未额外运行测试。原则是同ID显式修订当前命令、不改写历史；遗漏保留，显式取消才退役；已执行结果可读取，条件改变时仅相关结果失效。可发现全部允许工具不等于重新执行所有历史任务。
