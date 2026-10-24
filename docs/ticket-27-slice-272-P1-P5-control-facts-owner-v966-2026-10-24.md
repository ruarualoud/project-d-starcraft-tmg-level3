# T27/S272 P1/P5：控制返回的事实与原问题责任

日期：2026-10-24。正式Plan仍0/6、新对局0/12；T27 5/6、T23 33/36，余S272/S248/S249/S250四片。本文件是具体修复证据，不是P4策略改善或P6最终报告。

## 真实停点与两个问题

原B `build/slice272-product-generation-v645-8aBuEV`，workflow `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，r21。原PID80370已在event10884安全退出，0运行/0在途。此前真实轨迹见[v963/v964报告](ticket-27-slice-272-P1-P3-delegated-domain-parent-v963-2026-10-23.md)。

### 1. 声明事实被控制状态绕过

实际付费回复`4cc1de64f69d18491b8c8fdb997cad6754e54933b93c2830cfe4d40eefc9961f`选择blocked，并在nativeFacts中声称视图2099的`/receipt/actionMenuDirectoryIsBodyRead=false`。该字段是视图导航元数据，不在原Native回执此地址中。

`verifyRosterNativeFactsV1`此前只验证answered，blocked/strategy_required直接返回空错误和空事实。独立来源审核虽仍存在，但不能替代对显式原值的机械核对。

修复：所有结论已声明的nativeFacts经过相同来源身份、原件读取、地址和全值相等检查。只有answered在必要事实阶段必须提供非空事实；正常控制返回可以没有事实。不改模型结论、不填字段、不让Host判断战略。

`verify-slice272-control-return-facts-v965.mjs`使用真实回复与不可变源：RED PID8874复现空错误绕过；一次GREEN PID9205覆盖实际缺字段拒绝、两类控制返回的正确值/错值/未读/过期、无事实控制返回仍可用、answered原必需条件未削弱、旧回复不变。0Provider/Native/生产写；日志`build/slice272-v965-red.log`和`build/slice272-v965-green.log`。旧门没有重跑。

### 2. 已确认的阻塞因原问题未解又重开调查

实际原作者结果`b1e6e2af08c3ca3472793be635267b4f6800d4cad1bb1267cba65a4971114a18`仍blocked。来源审核`c943518d8f69af502f286cefa41f95e7c564252cb927dfa7ef3136fc34842ccc`两项均supported：它支持本场景的能力/范围限制，同时保留原授权问题“Marine最早到达marker1的回合”是necessary_fact。它没有声称原问题已回答或Plan通过。

旧分流复用了“答案审核所有必要问题必须已解”的门，因此将这个保留项再次排给同一事实角色；event10884已有下一source-revision。这是“阻塞是否成立”和“原问题是否完成”的阶段混淆。

修复：仅在同一不可变blocked结论、同作用域、两个检查均支持、来源引用存在的前提下，将审核中与原typed inquiry `necessaryQuestions`逐字一致的未解项保留为`retainedOriginalQuestions`，携reviewId/原题序号/原goal与`resolved:false`交回。它仍是necessary_fact，`acceptedForStrategy=false`。不是关键词归类，也不删除问题。新的事实缺口、待作者决定、否决、无typed原题身份或错原结论仍拦截；正常answered审核不改。

`verify-slice272-blocker-question-owner-v966.mjs`使用实际审核/作者结果：RED PID10844复现requires_revision；一次GREEN PID11357证明blocked责任返回且原题未解、原始回执不变、五类反例继续拦截，并调用真实修订任务工厂确认不会再新建同题事实修订。0Provider/Native/生产写；日志`build/slice272-v966-red.log`和`build/slice272-v966-green.log`。没有重跑v965或旧门。

## 修改范围与真实恢复

- `roster-native-fact-claims-v1.mjs`：控制返回已有事实同样核对原值。
- `roster-workflow-experiment-owner-v1.mjs`：区分阻塞审核与原问题完成，精确保留责任。
- 两条新增脚本仅复现上面的真实bug，不执行真实模型或规则动作。
- 原B同产品入口恢复PID11850，日志`build/slice272-v966-blocker-owner-1792772111571.log`。使用既有军表、r21、冻结地图/规则与账本，不创建新场景，不重买成功回复。已排队的历史修订不人工删除；观察新代码实际消费和后继交接。

实际模型修订、战略负责人如何处理最早到达问题以及最终Plan准出仍待，不能用这两个局部门替代。原表2000矿/145气、9单位32模型未改；费用与未知费用继续累计。

harnessLoopUsed=true；routes=事实调查/独立来源审核/战略责任交接；tools=保存证据读取，测试中0Native/Provider；UI本轮未操作；memory=条件实验与真实战史隔离；trainingTruth=false；若新缺口被忽略、原题被删除或未答问题升为acceptedForStrategy，撤回本项完成声明。技能促使检查真实角色交接而非只看结论标签。

## 同产品实际消费（event10953，PID11850继续）

- 旧代码已在停机前排入的第三代修订仍按原记录执行，没有人工删队列。真实请求`43cbc84a…`→`33448dc7…`、`e33c086c…`→`0d6bd156…`读取旧证据；`c9b422d4…`→`5d6ccd93…`的原件交付再确认后，`38f38dde…`→`b42ae1a6…`由模型自行删去不存在的`/receipt/actionMenuDirectoryIsBodyRead`事实引用，没有手填或更改Native原件。
- 实际结果`1b8fa5cc269bfee02bf62c0dc9e643d87fd54c5b1b7f88313fc0aa5142d0208d`保留blocked与最早回合未解，`verifiedNativeFacts`实际为14条，均经过来源/地址/读取/原值检查。证明v965在真实产品执行器生效；不证明blocked的语义成立或Plan通过。
- 新来源审核`b80f1022…`→`de37e321…`，结果`bde3712226b6fcddf15288b481261f24250635791ea34da9f385f93381f6ebfb`，source_fidelity=supported，但question_coverage=requires_revision：它区分“本次有界调查未测得”和“能力不存在”，并将是否调整第二轮得分目标/激活顺序列为author_decision。这与前一份两项supported审核不同；v966正确没有忽略新的否决、改写题目或作者决定。第三次source-revision已排入，责任交接的实际终点仍待。
- 新进程这五次真实调用共660623units、Provider46.199秒；不是端到端时延或累计总费用。全部原账保留。无新Native动作、无新房、军表/Plan仍r21。

下一观察第三代修订能否按真实审核意见把未解谓词及作者选择交回战略角色，或给出合法的限定证据；不可继续无效重复，也不可把本地事实校验通过当成P4/P6验收。
