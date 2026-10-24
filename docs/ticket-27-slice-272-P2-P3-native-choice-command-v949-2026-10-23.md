# P2/P3/P5：已观察菜单的选择命令 v949

## v951：准确来源与读取阶段修复

### 同产品真实选择及Native执行已观察

同PID72395、event9622/r19：

1. 请求 `599465dbd87ca94202935b51238f49979b9a980b0d6bf0be8d9c942a90bc18a4`：小命令Schema，actions仅select/conclude，225656字符。
2. 回复 `14bbea1a9cf4c3b1523651c37d5d803852389e91a8ad0e5dd5990f08d379ff64`：模型明确选择原菜单1849、finite索引0，无read、无新inspect，66367units/6.018秒。不是Host替它选择。
3. 产品工作单 `89e6c1fa…`：failedWorkOrders空，原范围/假设保留，唯一sourceEvidenceNumber绑定。
4. 原生结果 `7d5fb3bf92160f8ec2f9f871adf956b700b27c79617235e4b206a9af7977250b`：kind=tool_receipt、resultStatus=ok、nativeTransitionsApplied=1；实际resolve_mission_start_of_round，父73c6cc4c…→后继26adbf33…，阶段movement、双方可用Supply6、在场Supply0。原子为current-product-match-mission-lifecycle/runtime-dispatch。

这证明真实“准确菜单→模型选择→工作单→Native应用”闭环已推进，未重建/重放旧动作。没有单位到达/控点/未来VP/最优性证明；条件父态不是完整实战历史。原父任务后继inspect/总结及最终Plan仍待，正式0/6、新局0/12、余4片。原进程继续，不重启。

event9640已确认成功结果穿过嵌套纠错交回最初native-mission-start：`96afd4fb6a93b27a48838035f550e3adf2ec4a3034be41a846408463293b1dc9`仍是同父态/同后态/同1次Native转换的ok工具回执，非只在子任务完成。原inspect-successor已ready，summary等待它；PID72395仍活、0在途模型请求，不重启。

### 后继菜单和真实总结（event9649）

原inspect-successor结果 `e93c79f67e1519ff22184d16462dbdf5d40c952605d6a71081b287cb470bfb22` 与26ad后态一致。movement菜单恰有两个finite choose_first_actor（选player1或player2），parameterDomains为空。因此尚未出现Marine进场域，不能越过先手选择直接宣称到达。

事实总结真实请求 `3085c4960c49b31c5e26802bfdb1206ec59e0cdfec6bbf3f47d0fd40b18b8ef3` → 回复 `89c88bd9acb202ab02020b73032c0f043b5b67b91c1d33de91cf05bfd5fd7553` → 产品 `af329e80a7b93fde1f649f6f47da3062db313a66dffdf35a816d4a429d4025ce`，1次、21961units/10.075秒，无新增纠错。逐项核对正确保留条件父态、初始化事件、真实菜单、Supply池与控点的区别；没有声称进场/路线/VP已证。需要先手选择后的菜单是下一动作证据，不是首次初始化工具缺失。

当前父地图实验负责人待消费该总结，Plan仍r19；未据七条finding增加正式验收数。没有改码、额外单测、Native重放或房间重启。原PID72395继续。

等待期间只读测量当前断点一次structuredClone为1333ms；work约44.6MB、events约3.6MB、evidence约2.4MB。该单次耗时不能解释全部本地延迟，尚未修改持久化或运行性能全集。

继续观察发现v950并未收敛：`0a0c8a0b…`重复读取1004的actionSpace，实际1004是另一个Assault状态 `bc31e2f4…` 的历史精简事实，而待选动作的原状态是 `73c6cc4c…`。旧纠错任务没有继承原菜单；v949新建子任务的继承补丁没有覆盖已经保存的旧节点。另外我在小命令准备中重建action枚举并删掉experiment_evidence_window，重新暴露了原协议已经关闭的read操作，第四次回复被原Schema拒绝。该回归不能归咎于模型。

本次改动：

- `roster-native-choice-sources-v1.mjs`：沿实际orderRepairOf→choiceOf关系找到原菜单，核原work/resultRef、作用域及stateRef，交付同一原生actionSpace和原编号。无标题搜索、无最新状态猜测、无重新inspect。
- `roster-workflow-evidence-lineage-v1.mjs`：所有实际角色输入在共同入口恢复上述来源，包括冷恢复旧节点。
- `roster-native-choice-command-v1.mjs`：只允许原菜单编号，其他场景返回错误；完整菜单按已有已读证据协议交付，不再强制模型自找。保留原action枚举的阶段限制（finish映射为select），保留读取阶段与必读菜单合同，不另开查询额度或改历史。

`debug-slice272-choice-source-v951.mjs` 使用真实工作单/状态/旧请求，修前RED明确缺少准确来源；修后一次GREEN。验证冷恢复得到73c6…首轮菜单、拒绝1004错误场景、synthesize只允许select/conclude，以及真实role executor消费显式模拟选择后直接产出一个工作单（failedWorkOrders空、无再次读取、无格式纠错）。0Provider/Native/生产写，原通过门不重跑。191743字符是该离线executor请求大小，不是实际模型用量或提速结论。

原PID64225在event9614/r19/0pending安全退出，原Schema错误仍保存；同B **PID72395**／`build/slice272-v951-choice-source-live-1792750949542.log`续行。下一验收是模型选定正确菜单并由Native实际应用，不能用本测试代替。正式0/6、新局0/12、余4片。

## v950：真实产品入口补正

实际消费追加：同PID64225到event9606/r19，真实请求 `382df6d8ebad765a4b3e8569b39a4f06d017009df6c3a064025a600fcb100182` 的Schema确为 `roster_native_choice_command_v1`，168322字符。回复 `f4e23418da036c7f875e9193eda8e5bbeffb315f86f3590527864bff6d86181e` 明确区别已保存菜单号/旧步骤名，并选择读取1004的actionSpace节；产品 `5819c258…` 保存reads_completed和小命令投影，没有Native执行/新inspect。50374units、5.919秒Provider，旧账保留。只是实际读协议通过，尚未证明最后选择/Native后态或语义来源正确；继续同进程，勿重复启动。

v949适配器门通过后，真实请求 `5fdf2621…` 仍发送旧实验 Schema，313124字符；回复 `b231d7e6…` 只读旧菜单，94359units/7.822秒。原因：read-role只在operation.correction/author-handoff中调用适配器；新建工作单纠错角色是普通调用，根本没进入。不能声称v949已被真实消费。

修 `roster-workflow-read-role-v1.mjs` 的正常请求路径：未在途重发、非旧回复重验且未已转换时，单独应用Native选择命令。真实角色执行器脚本 `debug-slice272-native-choice-executor-v950.mjs` 首个夹具误给空operation对象，修为null后得到明确RED；入口改动后一次GREEN：真实executor发小Schema、解码模拟选择、走原菜单证据读取，状态evidence_reads_pending_recheck，非字段修复；0Provider/Native/生产写。没有重跑v949已通过门。

PID59448已安全退出event9602/r19/0pending；同B **PID64225**／`build/slice272-v950-choice-entry-live-1792750323055.log`继续，保留已付费读值与账单，不重发该请求。真实新命令和Native后态仍待。下文PID59448是历史。

这是一条新流程失败的修复记录，不是最终产物报告。T27 5/6、T23 33/36，余 S272/S248/S249/S250 四片；正式 Plan 0/6、新局0/12。

## 实际问题与安全边界

同 B `slice272-product-generation-v645-8aBuEV`、Plan r19，原 PID97846 在 event9598/无在途请求安全退出。旧日志、原始模型请求/回复、费用及错误均保留，无房间重建、军表修改或手填回执。

原生首轮动作仍未执行：`f01c8735…` 明确 awaiting_model_choice/executed=false。已保存菜单1850有唯一首轮初始化条目，但实际作者 `07e278a3…` 又在新工作单使用前一响应的 inspect 步骤名并额外绑定 /stateRef，被编译器正确拒绝。后续纠错又创建 inspect 和未观察选择，形成嵌套工作单。

根因不只是模型选错字段：

1. 窄的“选择已观察动作”仍使用整个实验工作单输出协议，模型必须重复填写不归本角色修改的范围、步骤及身份。
2. 工作单纠错入口没有继承 observedSource 菜单引用。
3. 独立绑定的错误提示不分已保存/同响应来源，统一推荐 fromStepId，诱导重建 inspect。

## 改动

- `roster-native-choice-command-v1.mjs`：选择角色输出 read/catalogue/select/conclude 小命令；select 只含已保存菜单号、类型、索引、显式参数/结果与公开理由。Host 保留工作单范围/假设/停止条件/守卫，以正常 source-owned 编译器生成唯一 Native 操作。正常读证据、来源有效性、已读确认、规则器合法性与后态验证均继续执行。
- `roster-workflow-semantic-repair-v1.mjs`：同一个请求准备/解码入口接新命令；恢复时仍用原业务 Schema 验证映射结果，原付费回复不改。
- `roster-workflow-choice-observation-v1.mjs`：正常已观察菜单提供工程持有的单动作模板。不把有未映射守卫的复杂工作单静默降成无守卫模板；这类仍留原完整路径。
- `roster-source-review-repair-handoff-v1.mjs`：纠错保留原菜单引用与模板，不再丢失。
- `roster-workflow-laboratory-v1.mjs`：错误提示明确区分已保存 sourceEvidenceNumber 与同一响应 fromStepId；不放宽拒绝规则。

不能因单动作命令存在就宣布所有查询已迁移或整个 P3 通过。多步骤方法不被裁掉来适配本命令；方法变更必须交负责人。conclude 只能 blocked/strategy_required，不允许把菜单选择当已证事实。

## 定点验证

脚本 `scripts/debug-slice272-native-choice-command-v949.mjs` 使用真实已付费请求 `8a51a7b1…` 和 `5d08b1c8…`，显式模拟模型选择菜单1850索引0；不是实际模型/原生执行证明。

1. 修复前 RED：真实请求仍是 roster_workflow_experiment_v1，而非小型选择合同。
2. 首次修后发现我遗漏了仓库 Schema 要求的字符串/整数边界，未进入生产；补齐该错误后只运行本门一次，PASS。
3. 通过内容：真实请求改用小命令；正常选择与纠错共用；原范围/守卫保留；编译只有一个使用已保存来源的 native_action，不再带 modelChoiceSources；新旧步骤名混用、无效来源号、finite 带参数、domain 缺参数均拒绝；读来源/交回负责人仍可用；有未映射守卫不静默丢弃。

0 Provider、0 Native、0 生产写。该请求 promptNodes 337167→162859 字符；不据此宣称整体策略无损或真实选择成功。旧门禁没有重跑。

## 实际续行

原 B 同产品 HTTP 入口由 PID59448 续行，日志 `build/slice272-v949-native-choice-live-1792749928564.log`。从原 ready 工作单继续，没有额外 Provider 重发授权、重算旧实验或清零账单。真实模型命令、首轮后态及最终 Plan 仍待观察。

## 性能观察（未修改）

旧进程一次一秒采样显示主线程热点在 structuredClone；当前 workflow.json 已约52MB，内存超过3GB。单样本不能代表全部耗时比例。本轮优先消除不断创建菜单/纠错工作的实际循环，未顺带修改状态持久化或重新跑性能全集。

技能影响：harness 技能要求以实际角色请求/工具后态为证；诊断技能要求先复现真实失败，再做同接缝异常检查。仍需实际产物，局部 PASS 不替代正式军表/Plan。
