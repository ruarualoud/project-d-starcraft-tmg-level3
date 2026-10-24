# T27 / S272：产品场景投影接线 v816

P3/P5，同一新产品链路；最终 Plan 0/6、对局0/12、剩余4片。正式 r4/2000矿170气保持，不把候选合法当策略通过。

## 真实故障

e7085/e7088 两个单删升级候选已被 Builder 判为 legal，但 `candidate_context.comparisonScene` 都返回 `reference.captureSceneLayout is not a function`。原件分别为 `11a2552047ab34735a6d1795819fe7df87d82e07af6eb29e24ae116b945c97ee`、`1044980d5b37f8ad61ac91aeb2de826bab229ed9bffa80ef651e827aab2ed1e8`。63519自行保存退出 e7089，无在途；不是服务商/模型异常。

Native 已有 captureSceneLayout、runProjectedScenarioBranch、restoreProjectedScenarioBranch，但 `createRunLaboratory` 产品包装层没转发，导致真实 Web/App 同链路不能做候选场景比较。旧能力验证用裸 Native，未覆盖这个包装层。

## 修改

1. 产品包装层转发上述三项现有能力；投影结果继续进入原工具回执 sink，内部布局读取/冷恢复不冒充新测量。
2. 仅对“候选已 legal＋确切旧包装层缺方法错误”提供可识别恢复描述，回到已有有界局部纠错；要求保留原 candidateEdits、场景和问题。未知 TypeError 不盲重试，原错误/费用/模型提案不修改。

没有重写规则、选择战略或给模型手工改军表/位置。后续若 Native 指出其它参数问题，仍需模型按真实合同纠正，不能当本次包装层修复已使所有输入合法。

## 本次对应验证

脚本 `scripts/verify-slice272-product-scene-projection-v816.mjs` 使用实际产品组合、原 r4 候选与单删升级；0模型调用、不写原生产 Run。隔离创建/原生投影/重新打开产品恢复，直接覆盖此次缺失的方法，不重跑旧全量门。

- RED 已复现同一个缺失 captureSceneLayout 错误，`build/slice272-projection-facade-v816-AMRpmS/result.json`。
- 首次修后验证已越过接口错误，但夹具选了无人上桌的 setup 参考态；Native 正确返回 `PREGAME_LAB_SCENE_PROJECTION_REFERENCE_INCOMPLETE`，`build/slice272-projection-facade-v816-Cokwij/result.json`。这是夹具错误，不能放宽 Native 条件。
- 夹具改为从已成功 `2262dfba…` 回执读取两单位完整模型位置原样建立参考场景，不手工重新编队、不重算火力。第三次在编译前因嵌套绑定漏 `referenceStateRef:null` 占位而失败（`ROSTER_WORKFLOW_BINDING_TARGET_MISSING`），结果 `build/slice272-projection-facade-v816-hXWUkp/result.json`；生产规则未放宽。
- 按用户既有“三次后若明确修复可追加一次”授权，仅补这个夹具字段。PID1179执行一次追加并已 GREEN，日志 `build/slice272-v816-authorized-extra-1792568850058.log`；完整结果 `build/slice272-projection-facade-v816-7GxhCq/result.json`。前三次失败保留，旧门没有重跑。

实际候选结果 `78f5a7c034611afaeee95b3bf5e772a1eeb37f482e21b10c00918d754fc78772`：候选legal、投影ok、exactUnits 为 goliath-1 与 player2-kerrigan-raptor、adaptedUnits为空。冷产品恢复同一resultRef/分支与正式draft，源状态修改0；旧已知错误能被共享恢复器识别，无关TypeError不被转成可重试。0 Provider、0生产写、不证明战斗策略。

## 同 Run 续行

已核无其它生产进程、e7089没有running/pending。5531以v815/v816从原Run恢复，日志 `build/slice272-v816-live-1792569191367.log`，未新建房间或军表、未重置旧账。下一核实际摘要归属恢复事件与候选错误交接；生产两臂的最终测量/策略采用尚待。

实际推进至 e7160：68个旧自动汇总按原工作单精确补回owner；遗漏的v2 source-revision汇总继承原goal替代并退出。两个 `candidate-…:input-repair` 均由产品从保存的失败回执自动生成，状态ready，原提案/失败/费用保留。该记录证明新代码已载入且恢复任务可调度，不等于修订请求已完成、两臂测量已成功或最终Plan已接受。

本轮修改范围：产品包装层3方法转发、候选已知接口错误的共享恢复投影、对应具体故障脚本与记录。Native算法、概率模型、正式候选/Plan、模型原始回复均未手改。完整策略比较、最终计划与新鲜无人干预产出尚未完成。
