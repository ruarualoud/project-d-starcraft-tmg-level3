# P1/P2：共享证据、依赖调度、真实分块 Teach 阶段证据

所属 T27/S272，2026-10-19。这是新流程开发交付，不是最终军表/Plan报告。
P0–P6长期任务继续；旧调查396未恢复，旧军表/Plan未修改，未启动对局。

## 本轮落地

1. `roster-decision-workflow-v1`：共享证据目录、精确读取、按输入引用计算依赖、独立任务并行、同分支独占、版本失效、断点。已完成结果不重复执行；中断中的派发保留未知结果并进入恢复责任，不默认重买。
2. `roster-decision-workflow-store-v1`：小状态记录与不可变正文分离。哈希仅作内容存储地址，不是审批或战略正确性证明。当前要求同一个 Workspace Run 单写者。
3. `roster-workflow-read-role-v1`：模型实际选择读取资料，工具返回后继续；每次请求/原始回复独立保存。事实解释与局部 Teach 使用不同输出合同，不再让 Teach 复述事实列表。
4. `roster-workflow-plan-blocks-v1`：Plan 按语义章节、数组中的具名成员分为43块，所有原文保留；结构索引可无损还原完整 Plan，不靠字数删减。

这些是正式 package 中的新流程核心模块。当前真实调用经现有安全 Flash Adapter；**尚未从 Web/完整 Workspace Journey 跑通，不把核心验证冒充全产品验收**。

## 已实际验证

### 定点调度与持久化（v508）

真实 P0 输出中的条件计分比较错误依赖进场实验，先复现失败。新队列的依赖来自实际读取前序结果，不接收没有数据依据的 `dependsOn`。

一次对应验证通过：

- 原始证据在目录中为可读未读；读取子路径后仅该消费者为部分已读。
- 不存在的字段返回 path_missing，不把整份证据判为不存在。
- 条件计算与独立证据读取重叠执行，峰值2；真正依赖计算结果的 Teach 等待。
- 加载持久状态后不重复已完成任务。
- Plan升版只失效依赖它的任务，规则/地图未变的原始材料仍可读取。

此验证使用真实保存材料，执行器为明确标注的测试回显，没有调用原生游戏工具。
[验证结果](../build/slice272-evidence-workflow-v508-TMQrvu/verification.json)

### 实际模型调用：先发现问题，再修改并重测

第一组（v509-OdykLQ）：模型主动读取资料，但要求整份Plan，下一请求达到13万字符；局部Teach使用通用事实合同，最终主要复述事实。另一次未读引用被新读取检查发现，模型自行补读后继续，未手改回复。

第二组（v509-NNnyqE，修后）：同一个历史Plan/问题改为43个无损语义块；事实角色自己选择读取原生目录、失效触发、进场计划，Teach自己读取计分路线、部署方案、触发与排程。二者各2次模型请求完成，没有格式纠错。

| 同素材局部链 | 初版 | 修后 |
|---|---:|---:|
| 真实模型调用 | 5 | 4 |
| 输入Token | 83,841 | 48,499 |
| 输出Token | 3,137 | 1,717 |
| 合计Token | 86,978 | 50,216 |
| Provider耗时合计 | 21.040秒 | 15.263秒 |
| 冻结价格估算USD | 0.013442286 | 0.007495962 |

本样本总Token减少42.27%，Provider耗时减少27.46%。这是同素材两个角色的小链路，**不是完整生产时间、CPU性能或策略无损的普遍证明**。

修后Teach实际交付3项保留建议，分别针对到点未知的条件路线、条件计分投影、增援/威胁权衡；每项有原文范围、备选、反证条件和后续材料要求。它没有要求为了展示修改而强制改表。

### 策略内容边界，必须继续处理

- “本次到点仍未知”没有被判成已解决，保留为P3实际实验工作；当前发布许可始终为false。
- Teach的部分规则判断引用的是Plan中的叙述，不是该判断的原生来源。它只能作为建议，后续工具取证/事实审核必须核对，不能直接晋升规则真值。
- `claimPaths`是建议范围，尚未成为编辑权限；P4仍须使用Host绑定工作单、正式Builder/Plan修改工具，不直接执行模型路径。
- 尚无本轮实际改表、改Plan、完整生成、战略效果比较。六项能力义务未完成。
- P5仍要完成真实中断对账、局部恢复、全局发布门；本轮仅保存停止状态，没有宣称自动恢复已完备。

## 可直接查看的真实过程

修后四步为：事实角色选读 → 事实解释 → Teach选读 → Teach提出建议。

- [第1步完整脱敏prompt](../build/slice272-scoped-read-workflow-v509-NNnyqE/1.request.json) / [模型选择读取](../build/slice272-scoped-read-workflow-v509-NNnyqE/1.reply.json)
- [第2步完整prompt及真实读结果](../build/slice272-scoped-read-workflow-v509-NNnyqE/2.request.json) / [事实解释](../build/slice272-scoped-read-workflow-v509-NNnyqE/2.reply.json)
- [第3步Teach prompt](../build/slice272-scoped-read-workflow-v509-NNnyqE/3.request.json) / [Teach选读](../build/slice272-scoped-read-workflow-v509-NNnyqE/3.reply.json)
- [第4步Teach prompt及材料](../build/slice272-scoped-read-workflow-v509-NNnyqE/4.request.json) / [实际建议](../build/slice272-scoped-read-workflow-v509-NNnyqE/4.reply.json)
- [结构化结果](../build/slice272-scoped-read-workflow-v509-NNnyqE/outputs.json) / [运行结论](../build/slice272-scoped-read-workflow-v509-NNnyqE/result.json) / [费用记录](../build/slice272-scoped-read-workflow-v509-NNnyqE/usage-cost-summary.json)

没有导出隐含思维链；记录的是公开理由、原始请求、公开回复和工具结果。

## 当前进度与下一步

七子项仍未全部准出，P1/P2新增上述核心运行证据。接下来接入P3工具执行工作单，再完成P4军表/Plan联动、P5恢复/全局准出、P6正式完整生成与最终中文可视报告；之后才启动约定分组对战。

本轮新增9次调用、137,194Token，估USD0.020938248；累计已知79,355,225Token，旧293/335未知费用不变。价格按仓库冻结快照估算，以服务商账单为准。

T27 5/6、T23 33/36；相关剩余4片；正式Plan0/6、实验对局0/12。
未新增子代理、未安装/删除/更新数据/提交，也没有重跑旧通过项。
