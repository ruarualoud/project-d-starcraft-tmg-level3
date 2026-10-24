# T27 / S272：比较结果交接故障注入与修复 v830

## 当前结论

属于 P2 分块输入 / P4 作者决策 / P5 恢复。正式 Plan **0/6**，对局 **0/12**；T27 5/6，相关剩余 S272/S248/S249/S250 共4片。工程门通过不是策略改善或最终生产通过。

本次新增16场景累计通过；v827通信48场景、v829恢复14场景沿用原证据，未重跑。测试只读真实Run原件、在内存副本执行；真实Provider、Native调用及生产写入均0。不能据78个累计场景宣称所有未知故障已经穷尽。

## 实际推进及新缺口

原Run `build/slice272-product-generation-v645-lqMWaS` / `decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c`：

1. 最新来源审核 `a2dbe3f6…`、父覆盖 `5241af61…` 接受忠实的 **inconclusive** 结论，不是接受“总伤害优势”。
2. 作者3次实际回复完成取舍：首次把选择留作作者待办，第二次明确选择但漏两个字段，现有格式纠错自动补齐；未手改回复。结果 `a8805b67…`，正式outcome `e4183e8c…`，retain / draftUnchanged。
3. 独立比较 `febbcaad…` 两项通过：当前三升级与两种单删升级在同一局部场景有可核对的分攻击项差异。组合齐射总伤亡、回火、普适优势并未测得，仍保留限制。
4. 后续总决策 `product:after-teach:r4:subject-v1` 的实际请求 `d1d3ed1c…` 没收到上述结果及作者取舍，却收到原挑战的“Consider … NOW”。它重新引用旧604/687/708并申请新实验。新实验问题不必然等同旧问题；工程错误是漏交最新状态，不是Host有权禁止一切新问题。
5. 停于 **e8003**：方法已提出工作单但 comparisonBinding 校验拒绝，待 `...:investigation:order-repair0`。16659已退出、无在途；未执行该新Native工作单。

以上原请求/回复都保存在该Run的 `workspace/decision-workflows/<id>/artifacts/<完整引用>.json`，关联保存在 workflow.json 的各work.operationState.calls。旧结果、调用次数和费用不改写。

## 来源修复

共享 `loadRosterProductHypothesisChallengeV1` 不再仅传挑战：复用产品同一 `assessRosterProductHypothesisCycleV1`，附带当前完成状态、实验原结论/条件/未知、实际作者outcome、独立比较和精确原件地址。只投影完成对象；pending、跨事实版本、未形成outcome不能冒充完成。

规划、局部Teach、实验方法使用同一入口。方法不能因读到作者判断就越权改表；独立来源审核、事实摘要和工具角色不自动接收历史裁决。Plan-only修订保留同一事实实验，但明确旧作者判断不是新Plan批准。

原始挑战保留供理解来源；新指令要求先消费既有结果，若需新实验说明新问题。Host不选择战略、不静默删待查项、不把retain或inconclusive变成策略已证。

## 验证

入口：`scripts/verify-slice272-comparison-memory-v830.mjs`。完整原状态的产品恢复与 `advance` 接缝，Provider为无网络捕获替身，原生实验室恢复只复用保存的身份/audit；原记录逐字节不变。

- 第一轮包含夹具缺失：未给候选实验室恢复端口，产品入口被 `ROSTER_WORKFLOW_CANDIDATE_CONTEXT_UNAVAILABLE` 阻挡；其余缺口已复现。保留 `build/slice272-v830-comparison-memory-1792586583073.json`。
- 仅补齐保存候选的测试替身，单独复现产品真实请求缺少完成比较：`build/slice272-v830-comparison-memory-1792586734349.json`。不是生产故障或新增调用。
- 修复后只跑未通过场景，5项既有通过继承；**16/16**：`build/slice272-v830-comparison-memory-1792586865941.json`。

覆盖：实际下一决策请求；原结论/限制/作者取舍逐字保留；Teach/方法职责；3种不注入历史判断的角色；army/map/rules/source四种换版；Plan-only变化；未完成审核；未完成实验；无实际作者outcome；生产原件不变。

其中真实产品最终请求接线验证在总体决策角色执行；其余角色验证共享选择器与职责，不能夸大为各角色都已做新的真实模型验收。脚本化回复及错配/伪造/格式恢复由v827原证据覆盖，本轮不重跑。

## 下一步与准出边界

同Run继续原待处理工作单纠错，观察真实请求是否携带新记忆、模型是否准确使用，不能提前认定它会取消所有新实验。最终来源/策略/Plan审核仍需完成；没有最终Plan，不启动对局。

改动文件：共享cycle输入、产品角色接线、定点故障脚本、本报告与工作入口/任务账。未提交、删除、安装、刷新规则或启动旧对局。

## 真实使用跟踪（49327，至 e8037）

- e8003无在途/无同Run进程后原目录续行，日志 `build/slice272-v830-live-1792587053051.log`。没有清轮次、改旧答或重建房间。
- 请求 `a6d0098f57d312d99910a44f5f92c8191f206d2e2e53c0cf9277fcdbe6ff0f75` 的实际方法角色已携带 `comparisonMemory`：实验 `2e3005b5…`、作者outcome `e4183e8c…`、比较审核 `febbcaad…`，假设仍为inconclusive。
- 方法先主动读取原件1275/1289，再返回结论；现有“读后确认”门自动让其确认原件，不是手补字段。结果 `6130f699e97115c16adc7bf66ef280ad4ebbe8f6ada5b066afbfc18a75af961b`。
- 后继方法请求 `99b6a6f6c7554bac0d6eaf58e8ee595d22c153627d76cb5cd30f6642e2daa331` → `f6d83034e3c6b33f33416aadd2217d03b43ed42846c65350eb29c16ae79c44d3`，结果 `54bb1362d2078f6ac3650fcb5d98df1ec1c7d4259fd24ab43896cda80d392d35`：引用已有分攻击项差异及作者retain，保留组合总量未证明，workOrders为空，没有重新执行Native实验。
- 此5次真实调用合计 **247,543 units**；Provider报告耗时 **33.767秒**，不是端到端墙钟时间。旧账不清零；金额沿产品账，不从tokens臆造价格。
- 新回复仍须独立来源/覆盖审核：局部修复回复曾把“实验结论”称为“比较目的”，后继结论将新Ares-vs其他单升级的问题视作旧比较已回答，并声称当前能力不能补联合测量。这些是待核模型陈述，不能凭格式正确或本报告批准。共享交接已真实生效，不等于这些新陈述都正确，也不等于最终Plan通过。
