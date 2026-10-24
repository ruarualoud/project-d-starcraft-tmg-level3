# P1/P5：重复纠错即时停止与正确的来源反馈

2026-10-24，T27/S272。T27 5/6，T23 33/36，相关剩余4片；正式Plan0/6、新局0/12。

## 真实停点

原B仍为 `slice272-product-generation-v645-8aBuEV`，r22。地图调查第三、第四次回复
`7f6bbc93…`、`6d202314…`逐值相同，无新查询、动作或结论。发现后向PID57943发送一次安全停止；
退出前第五次已完成，最终event11314、ROLE_CORRECTION_NOT_CONVERGED、0running/0pending。
没有新增Native动作或重建房间。原始请求、回复、费用、必要未知和Plan均保留。

三种候选原因是：来源未送达、纠错内容没有变化、调度重复提交。实际查明：
来源已读，但466/472是旧军表、旧规则、旧场景源的路线记录，只有地图绑定仍相同。
把它们作为当前nativeFacts会被正确拒绝；然而原反馈给的是“选择正确字段、重新读取”的地址提示，
没有清楚指出来源已经过期。两轮模型因此原样重复，而旧调度仅按三次上限停止。
这不是断网，不是需要重算同一条路径，也不是可以取消来源检查。

原调查五次调用共1,035,027 units，Provider延迟合计51.335秒；另有前序可选比较关闭三次560,799 units/48.200秒。
这不是全链路耗时，未知旧账未重置。此前event11257的可选比较关闭仍有效，不能因此称整个Plan已通过。

## 本次代码

1. `roster-native-fact-claims-v1.mjs`：区分来源过期和地址/读取失败；提供实际army/rules/source等绑定差异，
   明确重复读取不能修复版本。允许作者保留历史引用的原义，但不把旧测量升级成当前事实，不删除必要问题。
2. `roster-workflow-read-role-v1.mjs`：当前反馈与验证共用同一来源诊断。对完成/结论回复，
   相同执行内容、相同拒绝原因、无新读取请求时立即持久化noProgressStop并停止，不等剩余次数耗尽。
   冷恢复在Provider调用前检查该停点；有新内容、错误变化或正常证据交付不等于这一确定性循环。
   此次只证明该具体循环类型，不声称自动识别所有语义上不同措辞的策略空转。
3. `roster-decision-workflow-v1.mjs`：既有显式恢复命令可以在有具体修复后释放新停点；
   原停止原因、全部调用、读取及费用保留在历史中。普通重启不释放，也不自动再领次数。
4. 旧错误提示的具名恢复仅适用于原generic错误且确有sourceCurrent=false的旧视图反馈。
   新版过期来源提示不能重复申领同一恢复。没有历史回执改写、Host代写结论、策略或军表。

## 定点验证

`scripts/verify-slice272-correction-progress-v971.mjs`，仅使用保存材料和内存检查点，0Provider/Native/生产写。

- 来源反馈：69939复现generic错误；72668一次通过，明确三项绑定差异且旧事实仍不合格。
- 循环：初始完整夹具未获得完整返回，缩小夹具后71387暴露夹具漏已读状态；补齐后71757真正复现
  “Missing expected rejection”。72668一次通过：同内容立即停止、冷恢复不调用、真正纠正的blocked返回可交后续审核。
- 显式恢复：74161复现新增停点无法恢复；74442一次通过，原停止标记、调用/读取完整保留，只开启一次受控机会。
- 旧提示迁移：75186复现缺恢复入口；75626一次通过，只识别确切旧错误，新反馈/在途请求均不适用。
- 后两项分别只运行未通过的具名门，没有重跑前面已通过项，也没有跑无关全量测试。

测试中的纠正输出是显式离线注入，用于验证通道边界，不是实际模型已完成纠正。

## 同产品继续观察

确认旧PID退出和0在途后，同原HTTP产品runner恢复 **PID75940**；
日志 `build/slice272-v971-currency-feedback-1792778339752.log`。
实际请求 `ada966cf8ac7a1a9c8a0b1429cf6937f8bbd225eee6c59017dd097b1c6407308`
已包含两条native_fact_source_not_current、army/rules/source差异和reReadingRepairsValidity=false。
promptNodes仍1,016,105字符，不称性能已优化。

实际回复 `eae03427b068c5c97b0165175cc03595c802b3560656e121c54646b06b51ac49`
自行将466/472移出当前nativeFacts，并在公开理由、条件和必要未知里明确其历史绑定；
没有删除必要问题。当前11条Native观察保留，结果仍blocked，不批准事实覆盖或Plan。
结果 `b5cf7b36f658b0da7d19789c22524c5126e6dc85ecf929fa5a6b2f6004e645c5` 已保存，
event11333进入原独立source-review:v2，未产生新Native动作。
这次新增277,762 units、Provider11.171秒；旧费用不变，不能与全链时延混淆。

本处证实模型确实消费新版诊断并走出原纠错循环，不是仅离线注入。独立审核与必要问题闭合仍待；
若后续同题无新增证据/决策，立即停止，不追加轮次。

地图到达、控点范围与原r22修订理由仍须据真实证据处理，本次未宣称这些问题已解决。
军表仍2000矿/145气、9单位32模型；Plan保持r22。

## Harness记录

harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=experiment_planner/shared read roles；
harnessToolsCalled=原始记录读取、事实验证、实际角色executor及恢复控制；uiTraceEvidence=无新UI。
agentDecisionEvidence=保存的重复回复及明确拒绝原因；memoryTraceEvidence=停止标记/旧调用/历史来源均保留；
trainingTraceCandidates=无；rollbackOrDemotionRules=错误晋级旧事实、重复计费空转或正常修正被误拦时停止；
userVisibleChecks=区分“可读取的历史”与“当前有效事实”，不把一次验证算最终Plan验收。
