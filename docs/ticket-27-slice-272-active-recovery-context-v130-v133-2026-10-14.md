# T27 / S272 — 当前场景纠错与原生反馈透传

2026-10-14。T27 5/6，T23 33/36，主线余 4 Slice（248/272/249/250），正式完整对局 0/12。A/B 必须工程修复、Teach 未解清零、最终计划验收后，从第 1 回合新开。没有重启任何比赛。

## 本轮进展

### 1. 纠错输入不再混合两个执行上下文

原纠错节点同时内联整份旧 Plan、框架、原始空场（0 个动作域）及失败假设场景（21 个动作域）。它们不是可互换的执行上下文。旧 A6 Plan 还反复写三队 Marine 为 6 模型，而实际冻结军表为各 9 模型。

`roster-teach-query-recovery-v1.mjs` 现在先发送当前失败与明确的分支/状态身份、原问题和上次被拒回复；只有当前失败的 `queryRepair` 是执行上下文。`roster-teach-framework-v1.mjs` 将完整旧 Plan、框架、上下文放入现有只读归档查询，未裁掉事实或改写策略。域与参数仍由模型从原生菜单选择，Host 只验证。

历史因这一明确缺口耗尽的停点，在显式恢复和既有用户授权下仅记一次追加机会，保留五次付费选择与原失败；新操作不追加，重复恢复不重新发放。

### 2. 真实模型调用改善了工具使用，但查询仍未成功

v132 使用原 A 离线工作台、原军表/地图/规则与 Plan A9。runner 16858 检查旧 host 95992 空闲后替换为 16956；02:30:06Z 终态 completed。没有 Plan 应用、房间动作或新比赛。

| 真实纠错调用 | 之前 v129 | 本次 v132 |
| --- | ---: | ---: |
| 输入 units | 148,192 | 45,966 |
| 输出 units | 1,000 | 1,649 |
| 合计 units | 149,192 | 47,615 |
| Provider 延迟 | 19.229 秒 | 23.608 秒 |

输入少约 69%，但本次单次 Provider 延迟未下降，缓存命中也不同，不能据此宣称费用同比例降低或对局性能达标。

模型这次没有删除待修 coherency 查询，而是选择真实 Marine1 动作域，给出了九模型的明确坐标。规则执行随后返回 `SELECTED_SPATIAL_PATH_MUST_CHANGE_POSITION`：它用零位移运动去询问静态队形。成功控点仍只是声明位置的条件计算，不是到达历史证明。模型只给 Marine1 的动作候选，也不能据此认证三队的所有路径。

本轮真实纠错加汇总共 **2 calls / 597,567 units**；A 离线累计 **98 calls / 17,435,154 units**。汇总仍约 55 万 units，是成本大头。旧账未清零。A 现三项未解 Q2/Q3/Q6；B 四项未解。其他回答标签改变不构成完整策略验收。

### 3. 新发现的反馈丢失已做共享接线修复

实际失败子回执内：

`queryReceipt.mayRepairSameChoice=true`，并附带原生 `repairContext`；Teach 外包装却没有 `queryRepair`。原因是包装层按错误码白名单开纠错，而非消费已有类型化原生结论。

`roster-teach-evidence-port-v1.mjs` 已补：从匹配的原生查询结果封套读取 `mayRepairSameChoice`、失败阶段、类别、原回执身份及修复材料，绑定到正确的直接请求或子查询位置。原生要求重新选择时仍 `correctable=false`；不能被旧白名单变成同选择重试。未降低 Rules 合法性要求，也没有逐个为新错误码加例外。

**这项修复只有适配器验收，尚未加载到下一次真实付费续修。** A 的已保存第六次结果仍是旧包装，需要先无模型地补投影/读取旧原生回执；不要盲目重跑已成功控点或直接再发第七次请求。

## 聚焦验证及证据

根目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

- v130 提示观察：本地旧输入重构未与历史 contextHash 完全匹配，未声称保存了精确线上全文。生产提示接缝实际 RED11724 证实两个内联动作上下文。修复后 PID12803 前七项（单场景/21域/原问题等）通过，随后夹具把大对象索引误当正文而失败；仅补验剩余归档读取，PID14090 GREEN，18,928 个返回叶片与原数据一致，旧七项未重复断言。该夹具内联 732,149→143,838 字符，不能当线上 token 测量。`common-v130-active-context-*.private.json`。
- v131 原5/5停点 RED（没有恢复机会）→唯一 GREEN：一次已证修复追加、原五次和回执保留、重复恢复不增加。`common-v131-active-context-resume-{red,result}.private.json`。
- v132 真实证据：`common-v132-A-active-context-recovery-progress.private.json`、`common-v132-choice-observation.private.json`。
- v133 真实返回原件：`common-v133-native-query-repair-fixture.private.json`。RED26428 复现原生可修复标志丢失；第一次修复验收夹具错误地用整个旧 queryRepair 代替 describeQueryContext，覆盖新字段，结果失败；改成真实上下文键集合后 PID28581 唯一整门 GREEN。直接/嵌套/原生要求重新选择及成功回执保留均通过。无 Provider、Room、Native 执行或历史通过门重跑。

## 确认尚未解决的工程事项

1. 旧失败原生反馈无重算地补入实际恢复流程，确保消费的是已保存真实参数错误，不是重复执行成功子查询。
2. “当前静态队形是否有效”与“候选移动是否可执行”要保持不同证明范围；不能为了查询过关伪造移动/到达历史。
3. Teach 原上下文仍绑定 A6，问题 Q5 自己写了 6 模型；当前 A9 的 `openingDeploymentSchedule.entries.1.publicReasonText` 也仍残留 6 模型描述。不能仅将旧汇总标签清零，必须让最终问题/计划消费统一原生编制事实，保留变更历史。
4. 不成功的参数纠错后反复全量汇总会消耗约 55 万 units，并引起其他答案标签漂移。后续应区分“工具纠错仍未闭环”与“有新可用证据需要战略再汇总”，不能把它当作已经优化完的链路。
5. A/B 全部具体问题真实闭环、最终 Plan 验收之后，才新开 A/B Round1。

`harnessLoopUsed=true`，目标 StarCraft TMG；路由 query recovery/synthesis；无新增 UI 对局或训练真相。若新查询仍失败或范围不匹配，保持 A/B 不准入，不做策略推广。
