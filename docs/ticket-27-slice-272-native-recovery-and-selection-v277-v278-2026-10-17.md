# S272 v277–v279：原生输入自修复、草表推进与重复提交收敛

## 实际问题与交付

1. C 两条付费纠错把 native_action 的 domainId 改成空串，并认为 Host 会自动选动作。Native 拒绝是正确的，但其输入校验没有输出类型化 queryRepair，纠错因此提前结束。
   - 原生输入校验现在直接发布修复合同：JSON/参数对象/空 domain/不属于父场景的 domain 都给确切说明。
   - 明确由模型读取同一父场景的 actionSpace 并选择动作；Host 不填默认动作、不选战术。
   - Rules 对实际动作的拒绝、父场景/权限不变量仍独立处理，没有一概改成重试。
2. 已保存错误缺少新合同，重启不会自动获得说明。
   - 执行和旧错误投影共用纯输入解析器。只对请求与旧错误确切匹配的输入失败补充修复视图，原回执、原请求和费用不改。
   - 复用已有 reprojectSavedNativeQueryFailure 和局部恢复流程，不新建纠错器、不重放 Native 动作。
   - 投影仍 unknown，不是可用证据或策略准出。原尝试次数保留；既有一次明确修复后的额外尝试政策不扩大。
3. D r5→r6 军表仍1150分，连续只改Plan却每次重新进入完整Teach。
   - 同军表、同来源/地图/Skill/工具观测且未满预算时，已有草案Teach反馈可返回选表步骤继续使用。
   - 当前新Plan标记 currentPlanReviewed:false；旧未解问题保留，不冒充审过。
   - 换军表/证据/上下文或满预算后Plan变化仍正常Teach；已经开始的付费调查仍先恢复完成，不丢弃。
   - 不替模型买单位、写理由或选择策略。实际是否补到2000仍须观察，不把局部门通过当最终收敛。
4. E r8→r12至少四次Plan完全相同，仍被当成成功修订，绕过已有失败收敛计数。
   - 在正式session提交前用既有publicPlan规范化比较；精确无改动转成`ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED`，走同一output-repair状态机。
   - 诊断明确无字段变化，让模型选择查询/真实修改/符合条件的finish。Host不自动结束、不选策略；原Plan、军表及付费结果保留。
   - 当前Plan确实在模型decisionState里，故不是当前Plan漏传。旧完整iterations重复传输可能增加成本，尚无端到端归因；不凭此另改历史。

## 定点验证（不重复旧绿）

| 本次具体 bug 门 | RED | 一次 GREEN |
|---|---|---|
| `verify-slice272-native-input-recovery-v277.mjs <base>` | 实际空domain缺queryRepair | 两条C付费请求仍拒绝，但具备自动接续条件；0动作/模型/房间 |
| 同脚本 `<base> retained_input` | 保存回执没有新合同 | 旧回执不变、派生修复幂等、0Native重放 |
| `verify-slice272-partial-plan-continuation-v278.mjs <base>` | D真实r5→r6再次进入完整Teach | 返回选表；旧未解保留；满预算/换军表不会绕过Teach |
| `verify-slice272-noop-plan-recovery-v279.mjs <base>` | E真实r8→r9无变化却作为成功修订 | 送既有自动纠错、仍active，原表/Plan不改；0真实Provider/Rules |

第一个门最初使用战局中途夹具调用“初始状态”工厂，因已含召唤对象而不适配；改为输入校验隔离运行时后复现真实RED，再修产品。此门不声称验证完整移动或攻击：它只验证错误输入进入生产纠错合同，0模型/0真实动作。

## 六组与进度

A固定Terran军表Plan；B从头Terran→Kerrigan's Swarm；C改对Zerg Swarm；D改对Daelaam；E换Daybreak6.0.9；F反向Kerrigan's Swarm→Terran。全部Standard2000目标，共用产品链路和冻结数据；未创建新对局。

真实最新观察：A Plan11调查中；B/C为2000草稿；D1150/r6；E/F2000草稿。C汇总明确仍有路径、时机未解；其中14英寸与13.75英寸的大小比较还出现自然语言错误，必须通过后续来源/策略审核纠正，不能只看引用绑定。

安全切换保留已付费结果。本批最终为v279：六组均原session启动同版续行，A22609/B28651/C27083/D28653/E22611/F27086。日志均为各组`resume-common-recovery-v279-20261017.log`，maintenance flag均归档为`pause-released-common-recovery-v279`。实际状态以CURRENT_WORK、progress.private.json、原生session和进程存活综合判断；刚启动不等于生成完成。

真实模型验证：E r15精确no-op被送入自动修复，r16主动变成query；军表仍2000，未由Host补字段。保留对手触发、机会成本、卡牌时机、损失后方案四项未解，尚未准出。这证明纠错已影响真实下一步，不证明所有问题已收敛。

E观察器把 durable session.status=paused 显示成stopped/selecting_roster；查明无blockingFinding、无在途进程后按原会话恢复。此为Medium观察显示缺口，非模型请求失败；未因此重建房间或重买已完成汇总。

最终准出0/6；T27 5/6、T23 33/36；主线余S272/S248/S249/S250四片，完整对局0/12。仍需真实生成完成、2000合法性、最终Teach/来源审核、每块可解释的策略与地图依据。对手未来选择保留条件，不要求假装确定。

## 本轮 diff 边界

- `pregame-scene-laboratory-v1.mjs`：共享纯输入校验及源端修复说明。
- `roster-teach-evidence-port-v1.mjs`：旧输入错误的只读修复投影，接已有恢复入口。
- `iterative-roster-draft-teach-v1.mjs`：未满预算同表Plan修订返回选表，不冒充当前Plan验收。
- `iterative-roster-plan-session-v1.mjs`：精确重复Plan走既有纠错，不算有效修订。
- 三个具体bug脚本（4个独立门）和状态文档；没有规则数据刷新、依赖安装、记录删除、提交或推送。

这些文件已有大量历史修改，git整文件diff不能都归因本轮。
