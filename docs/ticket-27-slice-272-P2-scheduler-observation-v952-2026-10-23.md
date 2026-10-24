# P2：调度观察重复复制的定点修复

T27 / S272，2026-10-23。新 P0–P6 主线的 P2 性能与状态交接修复，不另开 Ticket。

## 已证明的故障

同一 B 产品进程 PID72395 在模型调用之外持续占用本地 CPU。1秒进程采样存在大量 StructuredClone 序列化栈；采样只说明该时间窗，不能推算整个流程占比。

用真实 event9685 的冻结状态，经 `createRosterDecisionWorkspaceRunV1` 的实际同步入口隔离复现。工作图522项、45,575,537字节，一次同步复制整个工作图21次。没有调用 Provider 或执行 Native。诊断实验室使用独立来源身份，跳过历史 Native 分支恢复；所有 workflow 写入均在内存中。

- 初次夹具漏了历史分支恢复端口，构造阶段失败，不是生产故障。修正为独立只读诊断实验室后，得到有效 RED。
- 单独替换对象复制算法的小探针只快约26%，未采用，未改变生产复制语义。
- 最终修复针对重复观察，而不是缩减原件、改模型提示、删历史或替换规则算法。

## 改动

1. 核心新增 `inspectReadOnly`：返回脱离内部状态的深冻结快照；同一状态、同一 consumer 复用。持久检查点清缓存，包含不增加事件的 operationState 保存；失败命令亦清缓存。
2. Run 内部调度与合同投影使用该只读观察。普通 `inspect` 和 `advance` 对外返回仍为独立副本，保持调用者原有接口行为。
3. 不改变工作队列的选择、依赖、输入正文、读取资格、动作、军表、Plan、费用、验收判定或存盘时机。缓存不保存规则结论，也不延长历史证据有效期。

## 同输入一次 RED / GREEN

冻结输入 SHA256：`e12faf3361d95073104a967f1a0916fd1b442e9cd48bc21985765e59d6b2db07`。

| 单次隔离同步 | 修复前 | 修复后 |
|---|---:|---:|
| 总耗时 | 49.215秒 | 14.721秒 |
| 完整工作图复制次数 | 21 | 1 |
| 其中复制耗时 | 28.460秒 | 1.263秒 |
| Provider / Native / 生产状态写入 | 0 / 0 / 0 | 0 / 0 / 0 |

同步总耗时减少约70.1%。这是同一冻结输入的一次局部测量，不是整体生成、对局动作或长尾分布的性能结论；测量期间原 B 进程仍运行。

验证还覆盖：原军表/Plan/作用域不变；不可写共享快照；普通观察的调用者改动不会污染共享观察；命令改变状态后新快照可见新任务、旧快照保持原状；普通观察与只读观察内容深度相等。

- [有效 RED](../build/slice272-v952-snapshot-red-r2.json)
- [一次 GREEN](../build/slice272-v952-snapshot-green.json)
- [具体故障验证脚本](../scripts/debug-slice272-scheduler-snapshot-v952.mjs)
- [进程采样](../build/slice272-v952-local-cpu-sample.txt)

未重跑其它已通过门禁。新增的冻结诊断输入约束在本工作树 build 内，不修改原生产工作流。

## 同期地图流程真实结果

event9668：模型提交了条件先手选择方法，`16326782…`。工具在Native执行前正确拒绝错误顶层 `actionKey`（`dbc44188…`），场景没有变化。既有流程自动进入输入纠错，重新读取保存后态的菜单，随后 observed-choice 小命令一次生成正确选择。

- 请求：`6171f32bfd304d2aaafae44bd01d352f905df0f9f04ceedf3d2b0155e3f2b3cf`
- 回复：`a108c160419e913223e2fbbe97ed431243a4ecb73e76a14521cbcf7f3b0dbb3c`
- 编译产品：`13ae1106cc75b54e8e4f423bc93bef23de6038fba2b1eebd0eda2233ce95ee67`
- 参数：`selection {sourceEvidenceNumber:1876, kind:finite, index:0}`，对应实际 player1-first 条目；无 failedWorkOrders。

这是流程自行纠正后的模型选择，未手填模型回执。

实际后续已核实：`97c5b4e9d5699b0ccb0a15ecd327ad28beff8d6d75bc6110eab35eac8729aaf3` 为Native `ok` / 1次转换，`choose_first_actor` 选择player1，父态`26adbf33…`→后态`6d0595f4…`，产生`phase_first_actor_chosen`。此条件场景选择真实执行，但仍不证明进场/到达/控点。event9702时已自动交回原方法，原`inspect-successor` ready，不重放先手动作。

该选择调用用量为63,833输入＋176输出＝64,009 units，Provider 5.670秒；旧账保留，不将本地调度耗时计入Provider延迟。

### 新代码真实后继（event9708/r19）

PID1145已完成原`inspect-successor`，产物`bd424dba1897dba63a82c7c3ea4b9946ba5047b274fe463e5c364fe2a9700ee7`绑定先手后的`6d0595f4…`。实际菜单为1个有限pass、17个参数域，其中9个deploy域。Marine1的deploy域真实存在：顶边red-entry-1，当前速度额度4英寸，可用Supply6；参数要求领队、边缘进入点、领队路径及其余8模型落位。这证明本状态有进场接口及这些约束，不证明任意给定路径可行、最早到达轮次或得分。

原事实summary已ready，待模型消费新菜单并将尚未验证的路线/时序交回；没有发现新只读快照错误。不得重复初始化、重放先手或把本记录改成最终Plan批准。

## 加载与验收边界

旧PID72395经SIGTERM等当前操作完成后已确认不存在；安全停点event9702/r19，0running/0pending。用同B目录、工作流和旧账加载新代码，**PID1145**，日志`build/slice272-v952-scheduler-live-1792753058389.log`。不重新建房，不从头生成，不重放已成功Native动作。新进程真实后继消费待确认，不把隔离同步提速冒充正式产物完成。

T27 5/6、T23 33/36；剩余S272/S248/S249/S250四片。正式Plan0/6，新对局0/12。P2局部通过不代替P3地图闭环、P5整体准出或P6最终产品。

`harnessLoopUsed=true`；target=StarCraft；routes=实验规划/菜单选择/调度器；本修复验证无UI、无新模型、无Native、无训练候选。若真实消费因只读观察暴露写入假设，应定位该写入调用者；不能解除事实/验收门来规避。原独立观察接口保留，可撤回Run内部只读接线，不修改已存原件。
