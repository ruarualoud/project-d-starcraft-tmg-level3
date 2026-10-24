# S272 P2/P5：完整条件属于审核缓存依赖

2026-10-22。新 P0–P6 实际生成链路；不新增 Ticket，不重开 Run，不手改模型结论。

## 已完成

接续 v850 的完整条件交付与 v851 的进展识别，本次修正审核缓存：不能因为句子和原件编号没变，就复用没有看过新增 Native 条件的旧判定。定点 RED→一次 GREEN，正常入队／冷同步／在途保护通过。当前已同 Run 加载新代码；实际复核结果待观察。

## 实际发现

v851 真实第五次请求 `3fafd5362c856b316b613b0b2fa9131bfab9a5dc7b7331f0676a3560816c0c4a` 正确显示新增材料及失效旧诊断；回复 `e1db1bfab47be95a03606505b653ab68044be9c7cf0884d7cb9b409142528d27` 已越过误拦截，保存为 `d7ce1e7127ec12065d7b65a5787dfdc72d797d37be0dacc7e8851d8014db7cd0`，实际 correction 清空、进入来源审核。

这次请求 184,412 units／8,620ms。只证明工程交接恢复；模型仍把“未评估”标记用于否定归因，不能称语义修正已完成。

e9772 确认新审核复用四项旧判定，四个真实旧请求均没有 `measurementConditions`：

| 旧 claim | 内容 | 旧请求 |
|---|---|---|
| 2 | 逐武器期望数值 | `57e3f070d9462618b2b950d68bbb2f5c30383a93b2b5fb9d089713d43f85ad9c` |
| 3 | 未证明因果效应 | `1fc7d0027a35c3abdf3c3c3949a2d9510c7253c963000b1aab0b6143799e4022` |
| 4 | 差异不能归因 | `aff18988476bdd6d9e924f99f09dea04acf5511aadab37a3a85dfebefb9b0cc5` |
| 5 | hash／固定标记阻止归因 | `9b906c2df2ab4526405f1161c994a1cc708dc8acf765f7d22c54fb3e23b8e94f` |

后三项的判断依据明确涉及本次新增条件。旧缓存依赖粒度是所选来源及上下文，不是数值字段级依赖，所以这四项同来源检查需要重新取得当前材料；这不重算任何攻击，也不重跑全量旧验证。具有等价条件输入的有效判定仍可复用。

## 实现

- 复用 v851 的 Native 内容身份比较；对照当前作者请求和旧审核实际请求，不以名称、queryId、句柄或版本号单独判无效。
- 新来源审核的缓存查找检查这项依赖。
- 现有审核在正常安全同步边界识别确实缺条件的判定；复用既有定点迁移／入队流程，历史结论、原请求、费用均保留。
- 场景交付合同升为 v3；只作为检查入口，必须有实际缺失条件及两个请求地址才允许恢复。
- 正在执行的请求不被撤换；现有独立核对先完成。没有裁定策略、覆盖原判或批准 Plan。

涉及产品文件：`roster-experiment-source-repair-v1.mjs`、`roster-workflow-source-claims-v1.mjs`、`roster-measurement-scenes-v1.mjs`、`roster-source-review-repair-handoff-v1.mjs`、`roster-workflow-experiment-owner-v1.mjs`、`roster-decision-workflow-v1.mjs`。

## 定点证明

脚本 `scripts/verify-slice272-condition-review-cache-v852.mjs`：使用当前真实作者及四条已复用旧判定，未调用模型。

- RED38275：确实复用了缺条件的旧审核。
- 唯一 GREEN40262：四项不再被错误复用；条件等价时仍复用；在途保护；正常恢复事务及冷同步幂等；历史判定、正式军表／Plan不变。
- 0 Provider、0 Native查询、0生产写。事务阶段是内存隔离夹具，不冒充实际生产已完成迁移。
- 日志 `build/slice272-v852-red-1792626251250.log`、`build/slice272-v852-green-1792626402149.log`。已通过的 v850/v851/更早命令未重跑。

## 当前运行与尚未解决项

31515 已安全退出在 e9802，0 在途。新 PID41491，空间守护41492；原 Run `slice272-product-generation-v645-lqMWaS`，日志 `build/slice272-v852-condition-cache-resume-1792626491495.log`。继续已有 claim7 的引用纠错，再于安全边界处理缺条件缓存；没有重开军表或房间。

实际剩余语义问题必须如实保留：

1. 作者仍以固定 false／not_assessed 标记否定有条件归因。
2. 新 claim6 审核把 1213↔1429 与 1429↔1429 混淆；其当前来源范围与作者使用范围需要根据真实请求核对，不能照搬它的修改建议。
3. claim7 引用被审核者本身遭正常拒绝，现有自动纠错待继续。
4. claim8 以预算和派生 hash 变化认定非单因素实验；这是模型解释，不自动成为事实或规则。
5. v850 条件正文在不同测量关系中重复序列化，仍为 Medium 性能项，暂不为此再停主线。

这些不代表已解决或已完成整体 Teach。T27 5/6、T23 33/36；余 S272/S248/S249/S250 四片，最终 Plan0/6、游戏0/12，正式 r4／2000矿170气不变。`harnessLoopUsed=true`，`trainingTruth=false`，无记忆／Skill晋级。
