# Ticket 27 / Slice 272 — 捕获请求的两个投影漏项修复

## 本轮交付与边界

上一轮实际交付了原生 PLACE 参数修复及 A 唯一追加审核，属于 progress。本轮继续修复两个已记录的赛前查询接缝；没有额外审核、模型调用、正式对局或房间写入。

共用代码版本更新为 `s248-s272-query-projection-v4-20261010`；A/B/C 后续都必须从同一集成工作树启动，不能只给某一组更新。原 A Plan v5 仍有一条有效 Supply High；唯一追加审核已用完，修正路径收口方式正在等待用户确认。B r26、C 权威 r37 / Web r36 继续保留，全部主机和驱动保持关闭。

## 1. 席位身份投影丢失

真实 B 请求 `need-marker-route` 的 strict superset 字段为：

```json
{"seatKey":"player1","sideId":"","baseId":"round_32mm","targetId":"mission-marker-5"}
```

原 canonicalization 只读取 `sideId`，丢掉已明确的 `seatKey`。地图端收到空 side，返回 `side_not_audited`；它不是“不可达”，也不是用户没选一方。

修复将这一边界集中为 `projectPregameMapRouteRequestV1`，同时供 strategist 与直接 map port 使用：

- 非空 `sideId` 与 `seatKey` 都只能是 player1/player2；两者同时非空且冲突则明确报错。
- 仅其中一个有效且非空时保留该明确身份；两个都空不默认某一方。
- 缺身份的 map receipt 保持 unknown，原因明确为 `side_identity_required`。
- 冲突在 strategist 转成该 information need 的 typed failure，不让完整写表流程崩溃、不把一方替换为另一方。
- 非 map query 家族的原投影未改；未改地图、Rules 路径、底盘或旧查询回执。

修复证明的是实际 wire request 的身份保留及冲突拒绝；本轮没有重新执行官方地图可达性验收，不能声称已产生新的 certified route 回执。

## 2. 单位到得分点的原生关系被错误摘要

原 `summarizeRelationship` 将每个 edge 都按单位对单位形状投影。目标 edge 明明含 `toObjectiveId`、底盘最近距离、同高差三寸内模型、当前控点几何与资格/LOS 限制，输出却只剩 null 攻击/视线字段与 hash。原模型不能从 hash 还原丢失信息。

本轮将实际生产调用的投影提取为 `projectPregameSpatialRelationshipV1`。对于 `objective_relationship` 保留完整 compact public native edge，不再维护一个容易遗漏新增几何字段的白名单；单位对单位的既有压缩逻辑保留。

捕获例子为 Hydralisk → marker 1：实际底盘边缘距离 **31,552 milli-inches**，`canGeometricallyContestNow=false`。修复后的摘要保留这些原生值，还保留 `exactControlStillRequiresCurrentMissionEligibilityAndLos=true`。不能把几何距离变成可得分保证，不能将 unknown 变成零风险。

没有重新计算这一条边、重写 native graph/hash、添加奖励或威胁惩罚。旧已签查询字节仍原样保留；新查询才经过修正后的投影。

## 一次红绿验证

唯一新脚本：`verify-ticket-27-slice-272-captured-query-projections-v1.mjs`。只针对上述两个已捕获 bug。

1. 先将原两处投影提取成生产调用使用的可测边界，行为未修；RED 一次 exit 1，同时看到 sideId 丢失和完整 objective 字段丢失。
2. 修复后 GREEN 一次 exit 0；验证真实请求身份、相同双身份、冲突、无默认身份；验证完整原生 objective edge、未知未来原生字段保留、输入不变、任务资格/LOS 限制不丢失。同期导入受影响 strategist 模块，未运行另一个语法或全量命令。
3. 付费调用 0、Room 写入 0；没有旧绿、B PLACE 门、地图、性能、已付计划审核的重复验证。

私有 capture/red/green：共同 baseline 的 `B/captured-pregame-query-seams.private.json`、`B/captured-query-projections-{red,green}.private.json`。这是生产投影边界验证，不是完整 Teach、军表生成、网页或整局验收。

## 本轮 diff

- `pregame-map-evidence-port-v1.mjs`：共享 map 请求身份投影；直接查询一致使用；缺身份原因细化。
- `roster-strategist-runtime-v1.mjs`：map 家族使用共享边界；参数冲突只成为当前 need 的 typed failure。
- `pregame-scene-laboratory-v1.mjs`：完整原生 objective edge 投影；生产 querySpatial 使用同一函数。
- 新增一个具体故障复现脚本；更新本页、CURRENT_WORK、TASKS 和耐久记忆。

上一轮两个 PLACE 生产模块保持，不再测试。全部后续启动须共用上述 v4 源码；前端没有变化，不重建既有 Web v2 bundle。

## 尚未完成与顺序

1. A Supply 文字纠错及修正路径审核收口：等待用户确认，不自行第五次全量审核。
2. 全组解阻后，B 已付 r26 输出本地重验/实际 Apply/Replay；C 补录已接受 r37；三个原房/计划用同版代码继续，任何一组停止都全组安全暂停。
3. S272 完整固定/从头计划对照与真实地图理解；本次投影已修不能替代策略效果验证。
4. S248 完整对局、S249 统一工程/策略分析、S250 复盘与 Skill 改前后验证。完整目标中的20图范围不缩减，九张官方选定配置9/9历史验收也不冒充所有配置或其余经典图完备。

计数不变：T23 **33/36**、T27 **5/6**；余248/272/249/250四片；新12完整终局0/12，旧0/3。费用本轮增量0，累计估算A ¥97.160008 / B ¥157.089339 / C ¥137.766074，各¥200，未知预留保留。

## Harness

harnessLoopUsed=true；targetGames=StarCraft TMG；routes=harness_optimizer/fact_probe；harnessToolsCalled=捕获 wire request/native relationship edge 的只读复现。uiTraceEvidence=此前原房逐动作截图、本轮无新网页操作；agentDecisionEvidence=原模型请求与工具回执；memoryTraceEvidence=原记忆未变；trainingTraceCandidates=none/trainingTruth=false。rollbackOrDemotionRules=冲突身份不猜测、资格/LOS caveat不丢、新High全组停；userVisibleChecks=本轮只证投影修复，未宣称完整可玩或策略改进。不创建代理/K3，不提交、不清理磁盘、不动其他项目。
