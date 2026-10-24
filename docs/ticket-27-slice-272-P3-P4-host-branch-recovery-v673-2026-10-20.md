# P3／P4：真实策略质疑、Host分支字段故障与原断点恢复

2026-10-20，T27／S272。新P0–P6主线；不恢复旧Run／A–F对局。不是最终完整生产报告。

## 已实际提出的策略假设

固定军表原工作流 `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34` 的专用Teach已真实完成：

- work：`product:strategy-hypothesis:v1:3621f50797e05ed31755:teach`
- result：`04636b4811648b39a641baee5004e3dba176a0c7fd1e16ae5a653d06687b5c25`
- 4次实际回复、27条来源读取、`evidence_ready`、无失败。
- 真正质疑：Plan把站点得分作为主线、击杀敌方Supply作为补充，但任务允许第一回合起按击杀Supply得分，站点则第二回合开始；当前优先顺序尚未在同条件下比较。
- 可信备选：保留站点主线；转向击杀主线；分工为火力单位削减对方Supply、其余单位守点。
- 可反驳条件：同地形、同对手、同损失预算下，哪条路线能取得更多可兑现得分；敌人是否确实可达且可击杀。地图／资源／对手条件必须写清，不运行整场未来比赛当证据。
- 另两项为保留条件部署与反制，不强迫改表。

这证明模型真的提出了有战略意义、带备选与反驳条件的质疑，**尚不证明完成对照、采纳或策略改善**。当前 `hypothesisTest` 真正执行仍待；不能把普通火力测量冒充该策略假设的受控对照。

完整脱敏请求／回复保留在原workflow的artifacts中，末次请求 `ba3c5573e56a630d5fbd9b3b7aedfa346e161053994ca6ec19d65f9fcc5cc040`，末次付费回复 `888bb1588868d02ba920fb5b16c249ebeb8426ba87ce2b8e0d214b51c3b8d9af`。前3次请求是读取／确认，不能当作3次策略优化。

## P3 v672：第二次失败不是模型又漏父状态

实际 `formation_scene` 原先漏父状态，模型通过现有纠错已经补了正确完整 `stateRef`，并保留已读的static solver选项0。但公共执行器在加`branchId`后，又因另一个if/else自动追加`queryId`；分支应用接口只接受base/selections/branchId，因此正确输入仍被Host自己拒绝，错误文字又误报“explicit parent and selections required”。

因果核查：

1. 优先假设Host额外字段：原失败回执确有合法base、非空selections以及Host生成的queryId。
2. 父状态错误应进入状态解析或来源匹配错误，不应在字段白名单前失败。
3. 模型选项错误应产生选项/来源诊断；实际尚未执行到那里。

修复共用Host身份分流：私有分支操作使用branchId；只读查询才使用queryId。不放宽模型未知参数，不替模型换位置或选队形。`formation_scene`及同原因的`project_scene`都覆盖。

定点门 `verify-slice272-private-branch-host-identity-v672.mjs`：实际失败参数／父状态／保存选项，真实公共executor、受控laboratory。RED20093复现Host误拒；一次GREEN20424，完整父状态和所选原选项逐值保留，分支身份保留，错误模型字段仍拒绝。Provider0、Native0、生产写0。此门不冒充实际Native场景成功。

## P5 v673：恢复已耗尽的同一故障，而非重新初始化

固定组旧13848已终态／日志finished，产品停于`NO_READY_WORK`；同一个Host故障耗尽三代工具修复，无在途请求。只修代码不能让现有停点自行继续。

正常产品增加精确恢复：仅当前绑定、generation3、formation_scene、明确原Host queryId等于work身份、base/selection已存在、失败且没有Native成功的停点，调用原有`resumeToolRepair`追加一次。保存原resultRef、generation、engineeringChangeId与账，不重置历史、不重放成功工具、不对别的未知错误自动放行。相同修复在冷恢复时不能重复追加。

定点门 `verify-slice272-host-branch-recovery-v673.mjs`：真实当前停点，受控产品Run。RED21463未排恢复；一次GREEN21920，恰好一次原停点恢复，历史代数不改、二次启动不追加。Provider0、Native0、生产写0；实际后续Native结果待观察。

## 当前执行与剩余

- fixed原工作流由22253载v673，日志 `build/slice272-product-generation-v673-fixed.log`；不是新生成，不复制旧Plan。
- editable原15268已请求当前操作保存后退出，未精确确认终态前不并开writer；终态后同原workflow载同版。
- fixed仍r12／2000矿9单位，editable仍r5／1610矿8单位（实时再核）；当前主要未完是局部测量、假设实验到总体取舍、满分现写表以及正式发布。
- T27 5/6、T23 33/36；正式Plan0/6、游戏0/12，相关S272/S248/S249/S250共4片。

本轮诊断遵循真实停点→最小接口复现→源端修复→一次对应验证。没有重跑旧已通过门；条件实验不会自动写真实对局记忆或晋级Skill。

## 实际恢复后的证据

- fixed正常产品确实记录了唯一一次`hostToolRecoveries`，原generation3／原失败ref `9b7af7e73d3d567875bd9f59e7d75cc6b89b335010fc8714747aacb0ca280033`保留，historyReset=false。
- 模型保留原父态`09f29ee7…`与已读选项0，实际Native静态队形应用返回`resultStatus=ok`，Goliath落在模型原选的(16,16)，分支`ed55f99d…`、receipt `57651d6e…`。Host未代选，其他单位位置／阶段／资源／地形保留。
- 其证明范围仅Native二维底盘适配／碰撞间隔／连续性与假设分支注册；`arrivalOrMovementLegalityProven=false`、`rulesLifecycleTransitionsApplied=0`。不是进场或移动历史，也不是整个火力／计分实验已经通过。
- 原上游工具由同一成功修复回执逐级接续，不是重复创建多次Native分支。继续inspect／exchange中，尚有正常工具输入／unknown纠正，尚无完成的战略对照。
- editable15268终态／finished／paused确认后，原workflow由23967载同v673。当前精确进程为fixed22253、editable23967；最近ps分别6:12／4:13，均CPU执行中，不另开writer。

## 现写Teach已真实产生提案，但预算仍未收敛

editable专用Teach `product:strategy-hypothesis:v1:aed5a825b5a2e88eba5d:teach` 已3回复／23来源读取／evidence_ready，结果 `7adab17f4f528de4b23cf5e659f5a285d895ea6fc1a767a8210823346fb5b013`。

它质疑：大编制Marauder作为主控点，是否优于Marine small＋升级，或两者改变先后激活分工。要求同地图／任务／对手／位置与一次明确对方威胁下比较损失后控点能力，保留反驳与实际军表／角色调整后果。**这仍只是提案，不是数值结论；比较指标是否充分也须由后续设计／来源审核判断。**

真实总体角色已经收到该提案与槽位拒绝，却仍以“未完成分支覆盖，改表缺依据”为由继续预算分页，把战略对照列为可选。目前r5仍1610／2000，查询到page15；这不能汇报为收敛。

进一步只读生成覆盖诊断：使用当前冻结菜单／合法基线，受控Builder只收集候选、不作规则或策略判断。一次生成20,032条路径并在20,000复合路径处截断；前256个候选中233个复合路径，**纯升级组合0**，全部带新增单位（Jim Raynor／Goliath／Marauder及Medic组合）。耗时1.965秒、Provider0／Native0／生产写0。该观察说明当前有限深度优先生成覆盖明显偏向早期新增单位家族；不证明所有20,000路径都如此，也不证明某个纯升级表合法或更优。

下一P3/P4工作应针对这个真实不收敛点：检查截断前的候选覆盖及可操作替代、与总体角色“不必穷尽才可改草案”的合同。若修改生成顺序，必须显式版本化新搜索，保留旧分页意义，不能把旧cursor悄悄用于新候选序列。此处尚未实施新生成算法，不能提前记为修复。
