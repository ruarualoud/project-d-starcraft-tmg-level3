# S272 v321：真实生成中的预备队静态队形错误

## 当前结论

军表达到合法 2000 分，不等于 Plan 合格。当前独立 debug 会话仍未取得最终 Plan／来源审核通过；原 A–F 及对局继续暂停。

`rosterTeachReadinessV1` 将未解决的 Teach 问题标为 `TEACH_UNRESOLVED / High`。正式接受及入局准备调用 `hasAcceptedCurrentRosterTeachV1`，要求当前 Plan 的 Teach 就绪。未来对手行动和骰子可以作为带条件的假设；工具失败、已知规则和地图事实不能靠改名“假设”冒充已证实。模型错误地把事实标为已解决仍需依据原回执审查，不能宣称这个代码检查已保证语义完全正确。

## 实际错误与修复

- 来源：v320 第三轮 Teach 的 `q-post-loss-medic-and-goliath`；查询 `space.solve_static_formation`，单位 `marauder-1`，锚点 `(25,29)`。
- 真实源状态：Marauder 存活、4 模型，但尚在预备队。原假设场景没有摆入它。
- 原错误：静态求解器直接把预备队对象交给要求“已经上场”的连续性检查，因此抛出 `MODEL_BASE_GEOMETRY_COHERENCY_INPUT_INVALID`。不是模型猜测的“2 寸间距容不下 1.969 寸底座”。反复改坐标不能修这个前提错误。
- 修法：仅在只读假设求解内部，建立该存活单位的上场状态投影；真实源、其他单位、地形、底座规则均不变。实际动作的 Rules 前置检查不放宽。被摧毁单位不允许通过这个入口复活。结果仍明确不证明进场、移动路径或行动合法性。

涉及产品文件：

- `packages/online-agent-session/legal-formation-search-v1.mjs`：只读假设状态投影。
- `packages/online-agent-session/static-formation-query-v1.mjs`：拒绝被摧毁／无存活模型的单位。

## 定点验证：先失败，再修复

脚本 `scripts/verify-slice272-reserve-static-formation-v321.mjs` 只针对上述真实 bug；未运行全量门禁或旧已通过用例。

1. 真实冻结源复现：同一个错误，RED 已保留。
2. 修复后，预备队静态结果与同单位已上场的几何结果一致；源状态不变；不声明进场合法。此项通过，不再重跑。
3. 测试夹具误禁止只读动作枚举，导致工具接线检查停止；这是夹具问题，不是新产品失败。参照已有工具夹具改为空动作目录。
4. 仅补未通过部分：普通 Teach 工具得到 advisory、1 个合法位置、0 个 miss；源状态不变；摧毁单位被拒绝。通过。

三个记录位于当前运行目录：

- `reserve-static-v321-red.json`
- `reserve-static-v321-green.json`（第一项通过，随后夹具失败）
- `reserve-static-v321-remaining-green.json`（余两项通过）

本次门禁 0 模型调用、0 对局动作；不是整个生成流程已验收。

## 恢复边界

同一 debug 会话在 revision 4、76 次续行请求后安全暂停，保留全部已付回复、未知项与费用；修复后从原断点继续，不重建军表／房间，不手工改 Plan 或查询回执。以运行目录 `status.json` 为实时权威：

`build/ticket-23-three-arm-performance-baseline-20261010-v1/walkthrough-v319-jjQtTj/continuation-v320-KxMNRE`

T27 5/6；T23 33/36；余 S272/S248/S249/S250 共 4 Slice；原矩阵最终 Plan 0/6、实验 0/12。
