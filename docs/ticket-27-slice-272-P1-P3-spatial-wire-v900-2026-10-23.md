# T27 / S272 — P1/P3 无歧义参数层级恢复 v900

## 本次交付与边界

修复新流程真实请求 `29a9e36c3979b5a661a9eaa9fd9d5238bd4f3283d2f8ccf45d77da1288418375` 的第一步：模型已给定 Raptor、区域边界、队形目标与搜索预算，却将其放在查询外层，导致另一次模型纠错。只把 Native 合同明确列出的字面量参数移入 `queryArguments`；不补值、不改目标、不选择位置、不改父状态，不修改保存的原回复。每字段保存 original/value/from/to 投影记录。

重复字段（即使相等）、动态绑定交叉、混合旧编码均不自动解释；未知字段、缺失必填字段和错放父状态仍拒绝。旧已编译工作按原身份保留；新工作冷恢复核对同一规范化结果，不重放成功操作。

## 验证

- RED：`build/slice272-spatial-wire-projection-v900-red.json`，实际错误为 `ROSTER_WORKFLOW_SPATIAL_ARGUMENT_CONTRACT`。
- 一次 GREEN：`build/slice272-spatial-wire-projection-v900-green.json`。
- 同原件首步、字段逐值相同、原回复不变、冷恢复相同、损坏工作拒绝。
- 冲突/缺值/未知字段/动态绑定/父状态错误负例。
- 产品执行器注入 Native 边界：真正走到调用点，载荷与父状态相同；注入明确失败，不伪造几何成功。
- 0 Provider、0 Native 计算、0 生产状态写入。未重跑旧通过门。

这不是整个原订单通过：后续 formation_scene 选择仍有独立问题，实际模型和 Native 后继继续验证。不能据此宣布策略提升或 P3/P6 完成。

## 同版运行

A51441/B51434 已确认 exit0，事件5226/4877，0 running / 0 pending。原目录同版续行：

- A73915：`build/slice272-v900-wire-fixed-1792690135527.log`。
- B73922：`build/slice272-v900-wire-editable-1792690135530.log`。
- REPL `activeRuns1176`；只查真实句柄，不凭旧日志重启。

A 已实际接受 Kerrigan 放置 `afc0a807…`，组合 Raptor 场景仍未完成。B 作者 `07a349eb…` 明确授权第二 Marauder 同条件调查，但子角色 `bf213ca3…` 没有发新实验，仍以旧同配置测量答复；独立来源/覆盖审核不能省略，尚不承认比较已完成。

## Supply 问题回查

本次回查的是 v869 记录的 Medic 误推论，不是新增一次 Supply 原子失败。此前只说明 poolSupply 语境不足以防住模型从能力文本推导控点；v869 才强制原生标量查询/引用核对。已保存验证为 pool=0、mission=1。当前 A Plan r3 不含“Medic占点0”，但 objectiveControlText 将 Freedom Fighters 与 Advanced Medic Facilities 合句，仍须既有语义审核明确两者各自用途；不能把数值一致性测试当作所有自然语言解释正确，更不手改付费 Plan 凑验收。

T27 5/6；T23 33/36；余 S272/S248/S249/S250 共4片。正式 Plan 0/6、对局0/12。未提交；正式中文全过程报告仍需等待真实正确产物。
