# Ticket 20 / Slice 191：空间玩家规划案例 B 与 24 例目录

日期：2026-09-11。状态：完成。Ticket 20：`6/10`；项目：`17/22`。

## 交付结果

新增第二组 12 例，并用 `spatial-player-planning-case-catalogue-v1` 合并为一个只读
`project/evaluate/manifest` 接口。完整目录现有 6 个家族、24 例、12 development、
12 held-out：

| 家族 | Development | Held-out | 核心空间差异 |
| --- | ---: | ---: | --- |
| 底座与编队 | 2 | 2 | 完整底座、全模型路径与编队，不以中心/Leader 代替 |
| 卡位与掩护 | 2 | 2 | 窄口、插入掩护、撤退路与绕行 |
| 威胁边界 | 2 | 2 | 走打/原地、冲锋/武器、资源增强、重叠威胁 |
| 集火与支援 | 2 | 2 | 一对多目标、多对一支援、过量集火与支援节点损失 |
| 火力圈互换 | 2 | 2 | 有利进入、小位移切断反击、交换棋值与预留反击资源 |
| 目标节奏 | 2 | 2 | 回合末得分、增援通道、Pass/先手延续与 cleanup 前否决 |

第二组不是单纯增加“距离题”。每个答案都必须连接当前总体计划、下一激活、预设对手
反制和自方再反制，并在所有候选之间引用 Rules/估算回执。目标节奏案例显式读取同局
Pass 与 First Player 计划，使位置决策与 Slice 186/189 的记忆合同连接。

## 验证与诚实边界

唯一聚焦门一次通过：统一目录 `24`，development/held-out 各 `12`；第二组 12 个
主机构造的正确决定通过；一个保留全部查询和玩家式决策字段、但为追求攻击而错过
cleanup 前计分否决的 held-out 负例失败。A 组只检查原投影接口仍存在，没有重复跑
其 12 个评分。

这仍是评估器就绪，不是模型能力结果：`realProviderRuns=0`、`fullMatchEvidence=false`、
`trainingTruth=false`。案例中的几何是冻结评估夹具；Slice 192/193 必须将真实房间的
state/LegalSpace/Rules Query/Preview/Apply 回执带入，才能报告 Agent 通过率。

