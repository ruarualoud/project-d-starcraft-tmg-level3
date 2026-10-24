# P1/P3/P5：局部实验准入、场景经验隔离与菜单读取阶段

2026-10-20，T27/S272。对应用户新确认范围；不是最终P6报告或整体准出。

## 1. 菜单纠错从提示改为明确阶段（v636）

真实1289已读到准确的v635反馈，仍照抄2215动作回执作为菜单来源。这说明只增加错误说明不足，不能说v635实际自修成功。

现在 `choice_menu_source_has_no_menu` 进入持久的“实际菜单读取”阶段：输出合同只允许read/catalogue/conclude，不允许再次finish提交动作。读到正确同状态菜单后才恢复正常选择；旧path_missing、stateRef、无关读取不能解除要求。可以准确回交该方法，不强迫动作成功。旧原文、费用和问题不改。

具体门 `verify-slice272-menu-read-stage-v636.mjs`：真实1289输入接缝RED→一次GREEN，检查限制动作、实际菜单交付后恢复、缺/错读取不能解锁、paid原文不变。0Provider/Native/生产写，旧门不重跑。

## 2. 用户边界接入实验申请和执行（v637）

新工作单要求 `experimentScope`，明确：用途、要回答的问题、会影响哪项军表/Plan决策、双方参与单位、场景条件、停止谓词、是否记录场景经验。

允许用途：火力比较、路线可行性、固定场景战术、规则/支付检查、军表比较。不只限换单位；固定表也能验证Plan。没有“完整对局”用途。

实际接缝：

1. 新workOrder由编译器检查，范围随每个工具任务保存；旧成功工作恢复不改原件、不重演。
2. 运行入口再次检查创建场景的任务；旧未执行/无范围任务返回来源明确的修复合同，而不是悄悄授予权限。
3. 实际显式摆放必须属于声明参与者。
4. 原生动作按既有Rules执行条件计算，在注册后继分支前检查真实父/后态：禁止跨回合推进，禁止行动者或已知单位目标超出声明参与者。不是根据动作文字/名字猜其含义。
5. 这一版本的原生演练窗口不跨回合；未来时间/VP目标走明确条件的路线和计分查询，不通过完整未来比赛“证明”。更广的固定场景时域未默认授予。

实验用途和决策理由的战略充分性仍需职责角色审查；Host不凭非空文字就认证有价值，也不靠关键词清除旧问题。限制单次回合不是完整的语义发散证明，仍须观察是否反复授权无信息价值的局部测试。

## 3. 场景经验与真实比赛记忆分开

新结果带 `experimentOrigin`，记录问题、参与者、条件、停止谓词、源工作及版本绑定，固定标记：

- `recordKind=conditional_scenario_candidate`
- `hypothetical=true`、`realMatchHistory=false`
- `mayWriteLiveRoomMemory=false`、`mayAutoPromoteSkill=false`、`trainingTruth=false`

选择采集时另存typed场景经验候选artifact，通过 `scenarioExperienceRef` 引用；实际参数/回执仍从命名工作原件读取，不复制成真实比赛事件。精简source-facts和receipt-view保留这些标记。此产品执行路径没有写真实房间记忆或直接晋级Skill的接口。

这交付的是产出侧的隔离/来源合同，不是完整WikiSkill复盘晋级器或所有未来消费者的认证；后续实际固定场景与消费端仍要验收，不能只凭标签声称全平台记忆隔离已证。

## 4. 具体门禁与边界

`verify-slice272-local-experiment-scope-v637.mjs` 以真实1285工作单复现旧准入无范围：RED→一次GREEN。检查编译及执行入口拒绝无范围、声明局部实验可执行、跨回合/未声明行动者拒绝、typed独立场景记录及精简传输标记。

0新Provider、0真实Native、0生产写；执行入口采用受控laboratory stub，跨回合保护是规则作用后的边界函数夹具。**没有跑真实整场负例，也不能据此声称全部Native能力都已真实验收。** 已过v634/v635/v636及无关门不重跑。

## 5. 同产品真实运行与尚缺证明

48069已收到SIGTERM，tick0完成后以 `requested_observation_boundary` 保存并确认进程退出。1289–1291保留。

PID61528同一Run、原产品客户端 `--resume-menu-read-stage`，日志 `build/slice272-live-product-review-v637.log`。只针对已修的阶段缺陷申请一次既有授权追加，不重复v635的旧修复额度。仍r8/2000分/120气/9单位/29模型，没有新房间、正式对局或数据刷新。

当前只确认进程存活/初始化，新阶段真实作者读取、新权限实际Native执行和场景经验写入尚待观察，不能据门禁报整体收口。

### 实际采用至1304

- 1293真实选择read 2222 `/receipt/actionSpace`，公开说明2215是动作回执、不得重放setup。产品实际保存该读取，correction清空、正常limit3恢复、completedCorrectionRecovery记下原1289/不清历史。证明v636在这个真实停点起效；不是模型已经选定下一合法动作或整个Teach已收口。
- 1295总体决策正确按record_facts保存新菜单事实，仍r8/军表不变；没有把观察记账当策略提升。
- 1300模型真实提出route_feasibility范围，参与者仅Goliath，说明问题/决策后果/停止点、collectScenarioExperience=false。此处有重复既有Goliath证明的信息价值风险；范围字段存在不证明实验必要性。所选domain缺少参数被现有合同拦截，1304自动读实际来源修正，尚未Native执行，不计权限真实执行或新到达证明。
- 1303真实火力负责人已读Medic来源和新估计，选择conclude：有ranged能力者的覆盖已取得；Medic只有Strike近战，不能把没有ranged估计当支援无收益；损失预算是声明意图，交作者选择而不是假造工具事实。仍需独立来源审查。其条件中将Medpack同称reaction的文字仍需源审，不能拿这条未审叙述认证技能时机。
- 1294汇总曾出现“eight”与同句9条单位列表不一致；1295读取原件后实际采用正确9数目。旧汇总原文保留，未据它授予接受。

新模型调用/原始资料都在原Run，1300并未越权成完整对局；整体必要性及实际场景记录/消费仍未完成。

之前本批两个真实火力查询各返回8项per-attacker估计/0失败：Goliath三种武器与Marine_1对Queen/Corpser；Medic在该阶段没有ranged domain，不等于支援收益为零。采样36、几何/反应限制仍在原件，不可相加成联合齐射或因果支援收益。此事实已具备，但模型尚未完成受影响Plan采纳/复审。

正式Plan0/6、对局0/12，T27 5/6、T23 33/36，相关余4片；策略更优和P6完整产物仍待。

## 6. 费用与改动范围

至1291：主Run65,650,093Tokens，可计价部分估USD11.134919946；项目已知172,327,023Tokens。旧830,187未计价Tokens及未知费用保留，1292+未计入。估算不是服务商账单。

生产文件：`roster-experiment-scope-v1.mjs`、`roster-workflow-laboratory-v1.mjs`、`pregame-scene-laboratory-v1.mjs`、`roster-workflow-read-role-v1.mjs`、`roster-review-data-questions-v1.mjs`、`roster-experiment-source-facts-v1.mjs`、`roster-workflow-receipt-view-v1.mjs`。客户端仅新增窄恢复入口；两个具体bug门禁和本文之外，没有安装、提交、子代理、源更新或无关验证。
