# S272：通信注入后的全历史调度检查与修复

2026-10-21；T27/S272，新 P0–P6 主线。

## 结论与进度

- [v827通信注入](ticket-27-slice-272-communication-fault-campaign-v827-2026-10-21.md)48项累计通过，本轮未重跑。使用假设prompt、脚本化模型/工具回复，但调度、编解码、存储恢复用产品代码。
- v828定向恢复门通过，却遗漏“完整启动扫描先看到旧祖先”。真实续跑发现后在操作边界停止；不能以局部恢复门代替完整调度验收。
- v829真实缺陷驱动的14项检查累计14/14通过。最后一次只补验一个夹具错误，其余13项复用；无关门不跑。
- 正式产品恢复事务已恢复误退役的10个节点；错误重审新建的2个节点保留为历史。**e7865、r4、0running/pending**，2000矿/170气军表与已有Plan内容不变；恢复0Provider/Native。
- T27 **5/6**、T23 **33/36**；剩余 **S272/S248/S249/S250 = 4**。正式验收Plan **0/6**，对局 **0/12**。工程通过不是策略或最终Plan验收。

## 为什么上一条门漏掉问题

v828测试直接选择最新修订者，证明“只重审其失败假设、复用7条通过文本检查”。实际启动遍历完整历史，先遇到旧作者的旧失败审核；该旧请求也缺criterion，于是退役了已经完成的新修订及其审核，回头审旧答案。

问题是Host选错执行版本，不是模型忽略新prompt。新结论已经产生后，旧审核是历史证据，不能再夺回执行权。

## 统一修复

1. 按`experimentReviewOf`及明确的`sourceReview`输入边识别已完成修订；不猜ID后缀、不依赖数组顺序。
2. 候选阶段：存在新结论时不迁移旧祖先；新结论自己的失败审核仍可恢复。
3. 提交阶段：应用同一归属判断，防止候选生成后、新修订才完成的竞争窗口。
4. 已发生的错误迁移：读取不可变退休记录，核对原status/resultRef/attempt、当前scope、迁移身份及无在途请求，再恢复状态。答案、请求、计数、费用、证据均保留。
5. 新分支边界来自实际`work_enqueued`记录。`materialClaimReviewIds`包含复用的旧通过项，不能当成本次创建列表。
6. 正式`synchronize()`先执行恢复事务；冷启动无需手改JSON，重复恢复无动作。记录变更或在途时不覆盖、不重买。

该机制不判断游戏策略，也不将诚实`inconclusive`自动当成原比较完成。

## 14项注入

| 场景 | 验收要求 |
|---|---|
| 完整真实历史扫描 | 只选最新修订：1项重审、7项复用 |
| 新结论与旧失败并存 | 旧祖先不可抢占 |
| 历史数组乱序 | 归属不变 |
| 修订尚未完成 | 确有旧合同问题仍可恢复 |
| 投影后、提交前新修订完成 | 拒绝过期候选 |
| 错误迁移后恢复 | 原状态恢复，答案/计数/证据不改 |
| 冷启动再次恢复 | 幂等，仍选最新审核 |
| 新审核在途 | 不覆盖请求 |
| 被恢复节点在途 | 不恢复 |
| 原结果引用改变 | 不覆盖 |
| attempt改变 | 不覆盖 |
| 作用域改变 | 不跨版本恢复 |
| 退休记录属另一迁移 | 不恢复 |
| 离线注入结束 | 生产文件不变，0Provider/Native |

入口：`scripts/verify-slice272-review-lineage-v829.mjs`；真实快照和退休回执作为只读夹具，内存Store执行产品代码，不进入真实记忆/Skill。

### 结果记录

- v828：`build/slice272-v828-recovery-1792583456812.json`红 → `...1792583521639.json`绿。局部恢复通过但覆盖不足，如上。
- v829 `build/slice272-v829-lineage-1792584004139.json`：初版夹具误把复用旧审核算成本次新节点，该部分结论无效，原记录保留。
- `...1792584073066.json`：按实际enqueue修正夹具，明确复现误选祖先、竞争窗口及无恢复事务。
- `...1792584267013.json`：修复后13/14累计通过；剩余夹具将带access/readPaths的inspect视图与原始存储数组相比，接口不一致。
- **`...1792584376633.json`：修正为同一接口前后比较，只执行唯一未过项；14/14累计通过，13项复用。**

工具观察曾超时重置，但原测试进程继续运行；只检查PID与落盘结果，没有重复启动。额外补验只针对明确夹具错误，所有失败保留。

## 实际调用、恢复及成本

Run：`build/slice272-product-generation-v645-lqMWaS`，workflow `decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c`。

PID99376从e7851续跑，安全停在e7864、0在途。误选旧claim3产生2次Flash请求：**85,037 units / Provider11.760秒 / 0新Native**。模型再次拒绝旧的组合总量优势断言，不能让此答案覆盖已存在的新修订。历史账目及未知费用不清零，不据未核实价格估人民币金额。

完整脱敏prompt和回复位于该workflow的artifacts：

- 请求`ddc3ec0828c54408bc2ac4a202adb8aa8942059f0703aa5788e75e904b41ba2e`，回复`25d1c9a2596ca808506ccce6df272df1835fba47801a722714d33ecd7df2f553`。
- 请求`8e86d0bf569111fc0df99dd547b5f47895c092e7ce70fc2d4ef55b27cddfda53`，回复`5b6f682a1eb5904fb75a43f26266861b2b7c60f4d957febf55c9c7ed951f56f3`。
- 退休记录`f4acea9228317bed4fdc6beb348e45bd7335e8b1aed5f7e96d109350d42e1919`。
- `build/slice272-v829-product-reconcile.log`：正式Store及`reconcile_source_review_lineage`，执行器禁用；恢复1次迁移，e7865，0Provider/Native/在途。

## Diff与下一步

- `roster-role-communication-v1.mjs`：v828检测原请求实际丢失的义务字段。
- `roster-workflow-experiment-owner-v1.mjs`：v828定向恢复身份，不篡改语义版本。
- `roster-source-review-repair-handoff-v1.mjs`：v828丢字段依据；v829版本归属及可验证逆向恢复。
- `roster-decision-workflow-v1.mjs`：v828接入；v829提交竞争保护和正式恢复事务。
- `roster-decision-workspace-run-v1.mjs`：启动同步先恢复被错误退役的新结论。
- v828/v829两个定点脚本、本报告、入口/TASKS/持久教训。未提交、安装、删除或刷新规则。

下一步同Run验证最新结构化假设审核收到完整criterion，再观察覆盖审核→方法/战略取舍；必要比较缺口仍由方法和策略角色处理，不让Host写结论，不因格式通过发布Plan。

真实续跑已启动：PID16659，`build/slice272-v829-live-1792584733756.log`，从e7865续行；启动前0在途且无同Run进程，未新建房间。初始冷载入约1分钟时仍在CPU工作，不是Provider请求失败；完成状态以新事件为准。源码多为已有未跟踪文件，本报告只列本轮增量，不能把整个文件计成本轮新开发。

`harnessLoopUsed:true`；`targetGames:[starcraft_tmg]`；`uiTraceEvidence:none`；`trainingTraceCandidates:[]`；`trainingTruth:false`。模拟结果仅是工程证据。

## v829实际验证：最新失败项已通过

16659同Run至e7885，正确选择最新修订的`source-recheck:obligation-delivery-v2:hypothesis:0`，没有回到旧claim3。实际请求含完整criterion，包括“诚实inconclusive可通过来源核对，但不是正向策略结果”；短ID为q1，Host映射回原source_fidelity。

模型先读现有原件，再返回`supported`来源判定：每武器条件估计不能证明联合/顺序攻击总伤亡；新修订保留inconclusive是准确的，旧总量优势是过度断言。必要未知没有被改成零或事实成功。组合火力是否值得额外测量，仍由覆盖审核及方法/战略角色接手，未授予策略采纳或Plan发布。

- 首请求`9a97cadbc9364031b4806e6a5ec3684144c9ec2e98c77006badff58397bd5d16`；回复`249b540a17fc9052cb34540140fe3ea79523d494a10f49713f652cdfdba1321f`。
- 审核请求`a15100ef90771411b0813a6fda3a8ab357504d61edbf002a84d29ab7786f197e`；回复`135daca4834c341df88fae9973c3b7d3c1a7358c57fdbdd814b4f8bc4ccd2293`。
- 结果`a2dbe3f6854a1344c6f0ceb4adf421c67369478283e74a01672e1a3e6f7f0786`。
- 本项2calls、146902units、Provider17.423秒；7项原通过结果复用，0新Native。
- 当前父覆盖审核ready，进程继续；最终Plan0/6，不能将本项通过写为全流程完成。
