# Ticket 23 / Slice 248 — 不可实例化候选与 Action 校验视图不一致

同一无赛前计划 Standard-2000 房间 `20260926182512804` 从 r24 继续时，Zerg r25 后选择 Pass。Host 的 `legal_asset_placement_options` 已对 Creep Tumor 给出 `RULES_QUERY_NO_LEGAL_ASSET_PLACEMENT_OPTION`，并把该参数域记录在 `unavailableCandidateIds`；Planner 与发给模型的 Action 提示使用过滤后的候选视图。然而 Action 返回校验和最终规范化仍读取原始 `input`，把不可实例化的 `resolve_unit_lifecycle_ability` 误列为 Pass 必须放弃的当前动作。三份完整付费 Action 返回都没有声明放弃这一已被 Host 排除的动作，连续报 `DECISION_PASS_FORFEITURE_*`，最终 `LIVE_DECISION_ACTION_DID_NOT_CONVERGE`。失败发生于校验视图接线，不能归咎于模型没有遵守规则。

修复仅让 Action 提交校验与最终规范化调用既有 `decisionInputForChoice(input, choice)`，即与 Planner/提示相同的有效候选视图；规则层合法空间、参数求解与 Pass 合同均未放宽。提升本地 Action 规范化版本以重验已保存的完整付费输出，而不是再发模型请求。真实断点恢复的单动作 checkpoint：r25→r26、权威 Apply/Replay 与截图完成，Provider 调用保持 **41**、总 units 保持 **4,055,789**、内部估费保持 **¥5.273887**。旧连接失败 finding 在前一恢复中已于 r25 通过 Apply/Replay 标记解决；本次 High 亦由 r26 关闭。该证据只证明具体接线故障修复，不证明后续完整对局无异常，也不把公开模型理由当规则权威。

后续从 r26 同房继续到终局。当前覆盖报告中 `attack_probability`、`fire_zone_exchange` 已暴露的查询计数仍为 0；这是策略可用性观察项，待完整对局复盘，不以临时 Prompt 偏好注入掩盖。
