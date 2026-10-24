# P2：Plan 分块批量持久化 v955

## 具体问题与范围

真实 B 的 r21 作者修订已提交，但进程随后仍长时间占用 CPU 发布 Plan。原 `publishRosterWorkflowPlanBlocksV1` 对每个语义块调用一次 `publish_evidence`，每次重新复制并序列化约 53 MB 工作图。不是模型等待；不涉及新的战略要求或规则数据。

这次修改属于 T27/S272 的 P2 调度。T27 5/6、T23 33/36，S272/S248/S249/S250 剩4片；正式 Plan 0/6、新对局0/12。不能据性能门通过宣布整个产品或策略改善完成。

## 一次 RED → 一次 GREEN

只读已有真实 event9685 冻结工作图，使用实际 r21 Plan 内容，在隔离内存状态发布。没有调用 Provider、Native，没有写生产断点。状态副本仅内存使用，复用既有压缩夹具。

| 指标 | 原实现 | 修复后 |
|---|---:|---:|
| 发布条目（含完整结构索引） | 47 | 47 |
| 完整工作图保存/复制 | 47/47 | 1/1 |
| 局部发布墙钟时间 | 70.060秒 | 5.476秒 |
| 完整复制耗时 | 38.870秒 | 2.976秒 |
| 序列化耗时 | 23.204秒 | 2.061秒 |
| 累计序列化字节 | 2,474,725,964 | 52,686,503 |

局部墙钟减少约92.2%；后台 B 同时运行，这不是全流程基准或对局延迟承诺。RED 明确失败于47次完整保存，不是夹具缺字段。GREEN 的完整最终 observation 与 RED 一致（包含所有事件/工作状态/证据目录），每个 Plan 块原值相同；不缩减正文、提示词、证据或策略分支。

证据：`build/slice272-v955-plan-publish-red.json`、`build/slice272-v955-plan-publish-green.json`。脚本：`scripts/verify-slice272-plan-publication-v955.mjs`。既有 v952/v953/v954 门没有重跑。

## 修改与失败边界

- `roster-decision-workflow-v1.mjs`：单条/批量发布共用同一条目准备与身份检查。批量先写不可变原件、校验全部条目，再一次保存目录与逐条事件。不改旧证据编号、引用或单条发布接口。
- `roster-workflow-plan-blocks-v1.mjs`：保持所有语义块/结构索引及顺序，改用上述批量命令。
- 一次 GREEN 同时覆盖：重复发布无新事件/保存；已有或批内身份冲突、作用域错误、非法类型、原件写入失败均不泄漏半批目录；检查点写入失败后内存和磁盘均不暴露半批，冷恢复后能完成原批次。
- 不自动删除原件，不吞异常；若持久化失败，沿原流程停止并从最后完整检查点恢复。局部发布成功不授予 Plan 准出。

## 真实后继与加载

同 B 的 PID41784 已真实完成 r21 保留方案决策 `8f74eb2b…`→`ad122e96…`，再次明确小型 Marauder 的单次期望伤害优势与保留其他组件的取舍；地图到达/控制范围仍未解决。局部 Teach `cec073ac…` 已返回，其中要求继续查地图，不把目标分数当已实现。此处只记录公开理由，未把模型解释当规则事实。

PID41784已收到优雅停止请求，等待当前操作保存；v955待确认进程退出后在同B载入。最后观测event10031/r21、0在途、after-teach作者已完成一轮读取且ready，原请求/回复及费用保留。不要重复启动，不重新生成军表或新建房间。

Harness：`harnessLoopUsed=true`；targetGames=StarCraft；routes=harness_optimizer/strategy_decision/local_teach；本次门无Provider/Native调用、无UI操作/训练真值。可见结果判据为完整Plan块及最终工作图相同、目录无半批，真实正式生产仍待；若内容、事件顺序、身份/作用域检查改变或失败泄漏半批，则撤回本优化。

## 已载入与独立网络停止

41784已安全退出，检查点event10040/r21/0在途。同B启动51653加载v955（`build/slice272-v955-publication-live-1792756785937.log`），没有新建房间。作者已读资料并返回第二次意见，因必要地图问题没有明确下一步被既有语义纠错接住；纠错原请求`34c753165818a811a240e900d300e04dc4c9328ba6e15aa83fb19df0f09d016e`发送时停止于event10048。

不是v955发布失败。保存的Provider trace显示两次尝试均`PROVIDER_DNS_RESOLUTION_FAILED / ENOTFOUND`，各3次DNS检查失败，`physicalAttempts:0`、`requestDefinitelyNotSent:true`、`costStatus:not_sent`。汇总层的`dispatchOutcome:unknown`过粗；底层已证明这两次未发出，不把它说成未知计费或模型输出错误。此展示口径差异记录为后续项，不阻止使用现有按原传输记录判断的恢复入口。

51653已退出。按已有网络恢复授权，同B **PID58149** 使用`--recover-provider-once`仅恢复原请求一次，日志`build/slice272-v955-network-recovery-1792760499821.log`。保留原两次失败、原prompt、已成功回复/读取和费用；后续结果待观察，不循环重试。T27/T23和正式准出数量不变。

## 单次恢复成功与地图后继

同一原请求已`response_received/completed`，费用已知；真实回复`34c05d9a…`（177056 units、17.375秒Provider）→产品`9d86602f…`→结果`802378bc…`。作者选择investigate，仅授权Marine-1到marker-1的有界部署/移动验证，其他单位与整局模拟不在此次范围；控制范围仍单独待查。不是恢复时手填Plan或回复。

实际事实角色先读保存证据、选择已存在的`6d0595f4…`分支，不重新初始化。工作单先缺`compositionProfileId`，一次正常结构纠错补null；随后域选择参数错误由order-repair子任务处理，没有人工改模型输出。子任务产物`73f63a69…`已无failedWorkOrders，实际只读inspect回执`5ab4022e…`读取原分支菜单（非新的部署）。这是复用保存场景、重新读取菜单，不声称复用了原inspect回执或已经证明到达。

最新event10129/r21，PID58149仍确认存活；后续实际部署/到达、控制范围及最终Plan未收口，继续同进程。尚需检查编译级整工作单纠错的前置/尾部命令衔接；已有单工具repairFor继承不代表该层全部通过。正式Plan0/6、新对局0/12。
