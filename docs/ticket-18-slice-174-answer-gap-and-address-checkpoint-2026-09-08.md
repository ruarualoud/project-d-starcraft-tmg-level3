# Slice 174：完整输出恢复后的新问题

这是开发检查点，不是两族或五件套验收。冻结来源不更新，未使用 Codex 子 agent。

后续容量/地址接线和Judge语义反例以[新检查点](ticket-18-slice-174-native-capacity-and-judge-counterexamples-2026-09-08.md)为准；以下“需接入8192”等文字记录当时状态，不表示该工程接线仍未开始。实际付费8192仍未执行。

## 最新终态（替代下方运行中状态）

`faction-v1-8a5389823de46cf062ae` 已结束，15536不可再轮询。15次尝试、2,436,275 tokens、估算¥4.177686；累计158,261,952 tokens、¥126.918382。报告hash为 `95602aacd8ba1aa784d010a360f2a2fa72c8905b0a5c4fa26f6dd8dc131d6f60`。只读复查0intent/0running，无活跃生产进程。

Zerg缺答[2,3]及[4,5]两批真实生成成功，分别238,594/239,171 tokens、¥0.031561/¥0.023557；两条原答案保留，聚合hash `12615ff121ab2a6e4fab67cfab8a87bb53767cc7f2781a37353c2950de4c487c`，随后统一Judge实际执行。该Judge全supported不等于可用：原答案存在35与35却称更便宜、1+1−2却称余量1的内部矛盾，需独立规则/算术检查，不能晋升。

其后真正失败为首章Proposer，attempt `structured-18946a75714b4367dd6a728a34db7b3f4f5408c812ea0517`，HTTP200、`incompleteReason=max_output_tokens`、输出4096、总241,817 tokens。notes复用Teach输出schema，不是六个Teach准备轴再次失败。失败回执 `a432ad6c8ec2848cca6a389c4b4349ddec5422d5a2a066a337302fc5fbdecf33`；不得接受截断前缀。需将已配置8192实际接入新角色、Provider profile、执行策略及消费者，而非只改提示词。

Terran第6章revision1的adversarial.1.2仍是地址错误。新原件reason含精确Host目标ID `advice-2-d443e02d4c6a`，但coverage写局部0为全章0；这是Host不透明ID可验证的映射，不需要扩大自然语言标题猜测。旧paid原件及所有语义判断保持不变。Unique债务仍待正式修正复审。

本轮生成进度不增加正式分母：Terran5/7、Zerg0/8、正式五包1/5、runtime0/5；Ticket18 2/8、项目16/22。下次从8a继续，保留新增补答、Judge与Terran复审；当前无新live运行。

## 最新工程接线（优先于下方历史的“待接线”描述）

实际新run已确认为 `faction-v1-8a5389823de46cf062ae`，父e85，会话15536/PID86696。两线已经启动，Zerg进入第一批缺答子任务、Terran进入adver0.2的无费导入；查询时尚0个新Provider attempt。该状态只是进入执行，实际输出/结算/终态以TASKS及会话最新证据为准。

四缺答补全已接入原生生产：精确绑定e85失败回执及完整请求，保留0/1两个未审查回答，分[2,3]、[4,5]两批调用；每批携带全部冻结来源、原问题、原失败正文、已有回答，聚合后必须继续统一Judge。子批原生输出/DSH/付费回执由消费者逐项重建，不能把问题改名为答案；恢复后的父产物保持native输入通道。新失败只有满足同样已证明的缺答模式才进入这一修复路径，子批不会递归无界拆分。

地址V2仅在旧V1无法解析时接受带明确括号或引号的精确标题头（首个冒号前、至少8码点），要求全章唯一、批内槽位对应、同一来源成员；来源ID独自不足以映射。旧V1成功保留原回执，V2单独绑定；原reason/verdict及paid candidate不改。

两者的主入口、显式续跑迁移、原生与审查消费者已接通。35项实际失败/注入单测通过（bab13342…）；16项实际运行时/最外层回放测试通过，包含3个真实DSH会话及2次注入Provider，0真实Provider（70fe55e0…）。所有受影响旧门重跑后，启动检查34门/136文件无漂移。已沿e85启动live的完整预检；正式生成新结果以TASKS和运行回执为准，不能将这些注入答案作为正式Skill。

本轮规范记录：ctx2skillLoopUsed=true，harnessLoopUsed=true，targetGames=[starcraft-tmg]，roleRoutes/promptPackRoutes=[rule_skill_builder,harness_optimizer]；skillsRead=[当前总规则最终版、两族冻结输入与失败原件]，skillsGenerated=[]，promotions=[]。judgeTestsRun为上述工程/传输检查，未完成新的策略Judge或整局评估；crossTimeReplayResult为旧合同与新消费者回归通过，非完整对战效果。harnessToolsCalled为隔离DSH与本地结构化Provider注入，uiTraceEvidence=[]，memoryTraceEvidence=[]，trainingTraceCandidates=[]。已知Unique语义债务仍阻断最终组装；未通过来源/对战/回归的候选不得发布或晋升，作为rollbackOrDemotionRules。

## 实际生产结果

`faction-v1-e85faeb7af610d098c8c`（父a266，会话40313）已结束，7次尝试、996,596 tokens、估算¥2.470942；累计155,825,677 tokens、¥122.740696。终态报告hash `0faf0fa663b062034e0120b9635e9b404f0ae707c63118cd870f6f818b892a7d`。无intent、无running、无402；不要继续轮询40313，也不要原样重发。

本轮真实推进：Zerg完整问题树18题仅去一个重复来源ID，正式恢复为 `93560f00…`，0Provider；Terran第6章supportive第2批完整付费输出已恢复为 `38ceac50…`，coverage地址0→2且reason/verdict未改，0Provider。Zerg随后生成完整challenger（3733输出tokens）；Terran剩余两个supportive批完成，首个adversarial的18focus/302字符引文也由现有机制无费恢复。

正式离线五件套仍1/5、运行时0/5；Terran5/7章，Zerg0/8章。Ticket18完成2/8 slices，项目16/22 tickets。教学/问题树/反例准备不算策略章。

## Zerg：四项没有回答，不是字段别名或截断

实际失败 `structured-3bb2a992ad6a2e8cd6f527c580723d6e021962b4d1e05607`，首章army_resources reasoner。HTTP200正常结束，输出1320tokens；answers中0、1是回答，2、3、4、5的question及sourceRefs逐字复制输入原题。不能把question重命名成answer冒充回答，也不能认为1320输出用满4096。

已实现 `faction-reasoner-answer-gap-v1.mjs` 的保守补答计划：保留两项原答案和uncertainties，四个待答索引分成[2,3]、[4,5]。每批须有完整冻结来源、原工作区、所有前答；合并后重新运行统一Judge，原两项只是未审查模型内容。该模块是计划，不是已执行补答。

诊断脚本 `diagnose-ticket-18-faction-reasoner-answer-gap-v1.mjs` 的首轮14项实际样本检查通过；额外完整请求重建首次暴露消费者路由问题：恢复产物protocol改变但输入仍是native contract，最外层stack将它错归legacy并触发 `FACTION_REPLAY_STEP_INPUT_DRIFT`。已在native runtime导出共享显式协议路由函数，生产续跑和只读stack统一使用；新的21项检查已通过，包含实际e85全部Zerg准备角色回放及Reasoner请求context hash匹配，0Provider，回执 `4ee2a4c38c6cd8286061e806dc7093653e2218e2b4615d1c4c6ea51d24766e7d`。这证明输入路由修复，不是补答生产完成。

补答仍待接入：实际失败上下文/回执绑定、每批实际DSH与Provider调用、原两答保留的聚合回执、消费者完整重建、显式续跑迁移及相关门。不能仅运行计划或改名字段就宣布修复完成。后续常规Reasoner也可复用分批策略，但须独立证明新任务合同及历史兼容。

## Terran：缩写标题的覆盖地址

实际已付费schema-valid输出 `structured-b0fb63adffb1dae58bcb69ef011977874d05e1f458a7a97f`，第6章adversarial第2批。coverageSlot0（Academy）声明recommendationIndices[0]，原因只写“Academy 与 Medic 协同”，不是完整标题“Academy 与 Medic 协同：Advanced Training 降低 CP 费用”。当前显式规则要求全章唯一完整标题加同来源，故拒绝 `FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED`。

不能直接放宽为来源ID猜索引：该来源仍被全章2与6引用。下一步应明确版本化的地址证明/Host持有映射规则；如使用短标题，须有唯一、精确、有限且来源一致的证据，并保留旧V1完整标题合同，或者让模型只修复明确的地址字段。尚未实现这一处恢复。

## 另外两条边界

- 卡牌Unique语义债务已有16项独立检查及单句修正提案，仍未生产应用或复审；见[来源债务](ticket-18-slice-174-card-package-source-debt-2026-09-08.md)。
- 8192输出分档仍只工程配置，正式Provider仍4096。此次缺答不是容量截断；先做明确目标分批。以后确认真实截断时再接完整profile/执行策略/能力探针/消费者一致的8192迁移。

下一次不得直接live：先完成补答与地址修复，重跑因路由代码改变而失效的相关门，再从e85继续，保留所有已完成Teach、问题树、反例及Terran审查。每预计跨¥100提醒（下一¥200），余额耗尽停止所有开发。
