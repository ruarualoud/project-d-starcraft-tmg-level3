# Ticket 23 / Slice 248 — 同版暂停与原生 PLACE 参数修复

## 当前结论

B 原房推进到 r26、第 1 回合 Assault 后，下一次 Kerrigan Leaping Strike 提案被同一个参数合同错误连续拒绝三次。系统停在 Apply 前，未执行该动作。依用户要求，C 当前在途动作完成后也优雅暂停；A 工作台与两个旧主机/驱动全部停止，随后仅恢复同版空闲服务，不提前推进其他组。

本次修改后的共用来源版本：`s248-native-self-place-contract-v3-20261010`。A/B/C 均使用同一集成工作树；前端没有修改，沿用已成功导出的统一合同 v2 网页包，不重新构建或重跑地图验收。

用户已明确授权 A Plan v5 **仅追加一次最终审核**。原三轮历史保留；本次请求已持久化启动，不重发未知请求。审核完成前不宣称 A 已准入或三组已恢复正式对局。

### 唯一追加终审的实际结果：仍有一个新 High，全组继续停止

本次已完成 7 个审核分片，覆盖 50 个 claim。原先威胁证据为空和 Medic 生存保证两条 High 已消除；另一条先前未被列 High 的旧原句被明确指出：

> Supply Depot is the supply backbone that keeps this 12-supply opening legal

对应 `componentPurposes.player1-tactical-3`。Rules 审核过的入场表实际是首回合容量 6 / 已入场 6，第二回合累计 8、第三回合 9、第四回合 11、第五回合 12；12 不是首回合开局。当前公共服务 `planReviewBlockingHighFindings=true`，不是用原始标签误判有效严重度。其他发现为 Medium/Low，记录但不阻塞。

这不是 B 的位置参数故障、军表非法或所有计划丢失，是原计划文字与现有结构化 Supply 事实不一致。不能改 Supply 数据迎合叙述，也不能用“审完了”代替通过。

授权的一次审核已经用完；不擅自执行第五次全计划审核。**全部正式对局与空闲主机均已优雅关闭**，保存 A v5 与审核、B r26、C 权威 r37。C 的最后一动作已接受但 Web 当时只记录到 r36，后续必须恰一次补录，不重做。下一步应定点修正 Supply Depot 这一句，并明确仅对修正路径收口的授权/审核方式，避免重新遍历所有已审路径。

本次审核新增 7 调用、输入 137,816 / 输出 13,042 / 合计 150,858 units，回执延迟合计 79.812 秒（分片合计，不是对局动作耗时）。新增保守估算 ¥0.227981，A 累计 ¥97.160008。证据为 `A/authorized-v5-final-review-v3-result.private.json` 和 `native-self-place-and-authorized-review-fees.private.json`。

## B 故障来源与定点修复

实际模型选择的是队形工具提供的完整选项，而不是缺少坐标：

- 当前 domain 要求 `placements`；原生 selected self-place Runtime 同时接受 `placements` 输入和 `placement` 数组，返回 canonical `placement`。
- 四个真实工具选项都携带完整的 `placement` 数组、模型 ID、位置和合法付款，并已被 Rules 实例化。
- 新增的参数前置检查只按输入字段名查找 `placements`，错误拒绝原生 canonical 输出；重试又选同一合法选项，仍报 `required_field_missing`。
- 原生 Runtime 实际执行逻辑是 `parameters.placement || parameters.placements`。另一个接缝是显式 slot 分配往 `placements` 写新数组，却保留优先读取的旧 `placement`；此次一起修复，不静默忽略用户/Agent 分配。

修复范围只有两处生产模块：

1. `action-parameter-contract-v1.mjs`：仅对当前 selected active ability / self-place domain 接受原生完整数组；拒绝两种表示冲突、错误类型、缺失位置。坐标、模型分母、碰撞、范围和费用仍交由原生 Rules，前置检查不证明动作合法。
2. `live-flash-decision-port-v1.mjs`：显式分配沿用原生 `placement` 键；默认分配原样保留 canonical 参数。Action 本地重验版本 v49 → v50，以便重验已付输出；不清参数恢复历史或费用，不增加无条件付费重试。

没有改规则、策略奖励、合法候选集合、队形位置、旧回执/hash、军表、地图或 Plan。

## 唯一受影响验证

新增脚本只复现捕获的 B/r26 具体故障：`verify-ticket-23-slice-248-native-self-place-contract-v1.mjs`。

- RED：修复前一次 exit 1，真实 canonical 位置被错误报缺 `placements`。
- GREEN：修复后一次 exit 0，检查四个完整原生选项、默认/显式分配、相同双表示、冲突表示、缺位置及非 self-place 边界。
- 付费调用 0、Room 写入 0；完整原始查询回执不变。没有旧绿、无关测试、全量或性能测试重跑。
- 原运行时三轮失败仍留存；离线修复验证不冒充该动作已成功 Apply/Replay。

私有证据在共同 baseline 目录的 `B/r26-parameter-failure-captured.private.json`、`B/r26-self-place-contract-{red,green}.private.json`；共同暂停记录为 `shared-code-pause-native-self-place.private.json`。

## 计划与记忆的只读排查

捕获快照中，B 的 10 个决策输入和 C 的 13 个输入均带已有 Plan。计划 ID 连续，战略数组的内容一致；B 的开局入场表也一致。原存储中有 TurnPlan、动作意图、执行结果、预测校准记录。源码实际 Prompt 组装包含同局记忆、TurnPlan 与计划进度节点，原付费回执也记录非零节点字节。

C 有几轮原始公开解释写“No prior plan”，但当时已有 Plan。这支持“模型把无赛前计划误说成无当前计划”的语义问题，不支持“整个计划未传入”的工程结论；按 Medium 记录，不能凭一句话中断合法对局。后续仍须用完整对局判断计划效果，不能把字段存在当策略闭环有效。

最初的诊断错误地用引用相等比较两个战略数组，产生 false；已保留该无效探针并改为内容比较。它是诊断错误，不是生产 Plan 丢失。原始全量 Prompt 文本已按既有策略释放，不能声称逐字完整输入仍可读取。未采集或索取隐藏思维链。

## 赛前查询待修项（Medium，不伪称已完成）

1. B `map_route` 原请求填 `seatKey=player1`，却留空 `sideId`；canonicalization 丢掉席位字段，地图端返回 `side_not_audited`。最终军表地图审计仍存在且通过，不能将早期 unknown 当不可达。后续应统一显式同义身份、拒绝冲突，不盲目默认一方。
2. 赛前 `summarizeRelationship` 按单位对单位字段投影，遗漏原生 objective edge 的目标 ID、底盘边缘距离、同高差三寸内模型和控点几何。来源已确认是真实投影漏项，不是底层图没有计算。后续修这一查询边界，不向 Prompt 注入战略偏好。
3. B 的 fire-zone 查询没有具体敌方目标和位置，四种假设伤亡均为 null，且明确不能按已知值排序；此次没有真实 `attack_probability` 需求回执。该 unknown 不证明概率工具故障，也不能当零损失。

上述属于 S272 的已捕获待修查询材料，不重新生成 B 军表、不改变当前地图、也不冒称所有查询已验收。

## 暂停快照与费用

| 组 | 实际状态 | 逐动作记录 | 本局账本 | 累计估算 |
| --- | --- | --- | --- | --- |
| A | Plan v5，唯一追加终审完成，1 新 High；尚无 A 房 | 不适用 | 本次 7 调用、¥0.227981 | ¥97.160008 |
| B | 原房 r26 / R1 Assault，High 停在下一动作前 | 26 步、162 截图 | 65 调用、¥15.387181 | ¥157.089339 |
| C | 权威 r37 / R1 Assault，在途动作完成后主动维护暂停 | Web 当时 36 步、225 截图，待补 r37 | 75 调用、¥13.486271 | ¥137.766074 |

C 主机完成动作后关闭，Web 后续读取连接失败是本次主动暂停的结果，不是另一个新 Rules/Planner High。恢复时先读取最新权威 Revision 并补录在途动作，不能以 Web 记录数回滚或重做。此费用表为暂停快照，不是最终结算；两组累计算法保留旧费用并只加本局增量，不重复扣预算。各组预算仍 ¥200，旧未知费用预留保留。

## 接下来交付与计数

1. A 新发现的 Supply 叙述定点纠错及修正路径收口；本次唯一追加审核已完，不自动开启下一轮。
2. B 原付费提案 v50 本地重验及真实 Rules/Preview/Apply/Replay；C 最新权威回执补录，两个原房不重建。
3. 全组解除阻塞后同版恢复第一组实验，继续逐动作截图和实际单回合计时。任何新 High 先全组安全暂停，修完后一起续跑。
4. S272 查询漏项与两类计划效果；S249 全局决策/工程纠错；S250 复盘与 Skill 改前后证据。

T23 33/36、T27 5/6；余 248/272/249/250 共四片。新 12 实验已启动 2/12、完整终局 0/12；旧完整对局 0/3。官方九张选定地图配置保留 9/9 历史验收，不代表所有任务/分数或后续十八张经典图全部完成。

## Harness

harnessLoopUsed=true；targetGames=StarCraft TMG；routes=harness_optimizer/fact_probe/selfplay_agent/roster review。证据包含真实 Web 动作、Rules 回执、公开意图/预测、Plan 与记忆谱系。trainingTruth=false；修复及未完局证据不升级为训练真值。新 High 独立报告后全组暂停；保留 paid bytes、实际骰子与成本，不重复 Apply、不盲重试。不创建子代理/K3，不提交、不碰其他项目。
