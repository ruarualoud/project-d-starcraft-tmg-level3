# T27 / S272：P3 联合几何的真实使用证明（v588）

本文件是一个子能力的验收记录，不是最终军表／Plan 发布报告。最终 Plan 仍为 0/6，对局 0/12，剩余 4 Slice；P5 两域闭环及 P6 产品 Web／新鲜生产尚未完成。

## 故障与修复

独立静态队形分别以旧场景求解，合并后仍可能重叠。Native 正确拒绝了两队 Marine 及 Marine／Medic 的相撞场景；此前工具只能让模型反复改每队锚点，不能一次求出互相兼容的整组方案。

仍使用 `space.solve_static_formation`，不另建规则器：模型显式指定主单位及 `jointUnits` 中各单位的锚点、编队意图和顺序；仅撤下这组单位的旧底盘，在同一原生求解器上逐步加入完整队形，最后对整组复核底盘、敌方间距、地形和连续性。模型选一个完整候选后，`formation_scene` 一次应用全部 `canonicalPlacements`。其他单位／资源／阶段／地图保留。

有界搜索会标注已检查范围和截断；没有候选不代表无解。这里没有选择最优战术，也没有证明合法移动、进场、完整历史或未来对手动作。

## 定点门禁

实际保存碰撞场景：`cbbe98c7a430253f87eb3df6131d3a0cdea380b72c83e45c848fca57d8f107d0`。沿用模型此前实际给出的两组、各 3 个锚点。

- [RED](../build/slice272-joint-static-v588-red.log)：旧合同拒绝 `jointUnits`，返回 unknown，而不是合法组。
- [GREEN](../build/slice272-joint-static-v588-green.log)：只运行一次修复后门禁；返回 2 组完整候选，整组应用后的全场参与者检查通过，原生 `mission_marker_control` 正常返回且不发放 VP。
- [原始 GREEN 回执](../build/slice272-joint-static-v588-green.json)：求解检查 3 次，到 2 组选项上限后明确标为非穷尽。0 Provider 调用、0 生产改写、0 源状态修改。

门禁中的选项选择是脚本测试，不冒充 Agent 决策；下面另列实际模型使用。

## 实际模型链路（同一 inlKbk Run）

| 步骤 | 实际输入／选择 | 执行结果 |
|---|---|---|
| 403 | 模型选择联合重排 Marine1／2，分别锚定 (10,24)、(14,24) 英寸；Goliath 不动 | 同源原生求解返回 1 个完整组 |
| 405 → 407 | 在普通观察边界读取真实候选后，模型明确选 evidence852 的 optionIndex0；不是 Host 自动取首项 | 完整组 `static-group-e3257cf4212ebb949eef69f7` 被应用 |
| 整组后态 | 两队 Marine 与未选的 Goliath 全部 Native 静态检查通过 | 后态 `71da78b11d5b5b72159a04d4e997360ff6c670671bceeb904a513d23d48471a6` |
| 原问题查询 | 在该后态查询 mission-marker-1，仍保留所有对手参照单位 | `sole_contestant_takes_control`，当前 Supply 比较 2:0；这是条件控点，不是已经得 VP |
| 组件域 | 实际404使用同一新工具联合排 Marine1／Medic3；首锚点被地形拒绝，后续锚点又被模型底盘拒绝 | 模型读具体阻挡后继续改自己的假设；0 候选没有被当作成功、无解或组件价值结论 |

完整已脱敏 prompt／Provider 指令与公开回复保存在同一 Run：

- [403 请求](../build/slice272-projection-owner-v565-inlKbk/403.request.json)、[403 回复](../build/slice272-projection-owner-v565-inlKbk/403.reply.json)。
- [407 请求](../build/slice272-projection-owner-v565-inlKbk/407.request.json)、[407 回复](../build/slice272-projection-owner-v565-inlKbk/407.reply.json)。
- [404 回复](../build/slice272-projection-owner-v565-inlKbk/404.reply.json)、[408 回复](../build/slice272-projection-owner-v565-inlKbk/408.reply.json)：组件域未命中的实际原因与修订公开理由。

不可变工具原件位于该 Run 的 `workspace/decision-workflows/projection-owner/artifacts/`：

- 求解：`504260e0094f5024685d63acc05189bc6480d7cffcac6e6411f3616440b5d1f2.json`。
- 完整组应用：`2292b326a6bc8243476e1dd46dbda3b1c7e11d44ebe0aa406bb6916246b45381.json`。
- 当前原生占点：`e62256fe0384051276ae802180c461040d11b9592be89a1a3186df8c3ce8c141.json`。

当前观察边界有一次同状态静态应用／占点查询重复，产出同一后态，无正式房间修改，记录为后续去重效率项，不把重复次数计成独立能力覆盖。

## 重启与恢复

重启后原进程缺失，402 请求有 402 保存回复，running0；没有因此重买旧调用。第一次新启动在模型调用前退出：地图恢复已入队，但组件已到 generation4，旧恢复入口硬编码只接 generation3。现在要求精确 `expectedGeneration`，后续代次同时记录 `engineeringChangeId`，每个修复在同谱系只续一次，不重置次数／费用，不改旧模型原文或工具事实。已入队地图工作直接复用；实际403／404证明两个当前域均已走到恢复后的模型边界。

截至402，当前 Run 累计 16,145,743 Tokens，冻结价格估计 USD 3.648447774；项目已知累计 122,712,209 Tokens。403 以后尚未计入这个小计，旧未知费用继续保留。这不是服务商账单。

## Harness 记录与边界

`harnessLoopUsed:true`；`targetGames:[starcraft-tmg]`；角色为局部实验规划／事实汇总，工具为共享静态求解、显式整组应用、原生占点查询。真实输入／回复与原件均保留；没有修改战略记忆或 Skill，0 训练晋升。本次无 Web 截图验收（`uiTraceEvidence:pending-P6`）。若组成员丢失、来源错配或完整 Native 复核失败，则该结果不得作为 Plan 事实。当前证明工具能力和实际调用，不证明整个生产无人干预、组件战略收益、最终 Plan 接受或胜率提升。
