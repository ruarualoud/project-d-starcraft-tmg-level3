# T27 / S272 — 纠错查看工具与原场景恢复

## 边界与结论

- A 最新 v122 汇总于 2026-10-14 00:38:57Z 完成：1 新 call、551466 units；累计 92 calls、15440012 units，原账不清零。
- A 已消费三支 9 模型 Marine 假设摆位下 1/3/5 各 Supply 2 对 0 的控点子回执。它仍明确区分静态条件控点、真实得分、合法路径及进场历史；Q2/Q3/Q6 共 3 个未解。没有自动更新 A9 或对局。
- B 当前 Plan19 与旧 Plan12 的军表、升级、进场排期相同；A4→A9 亦同。策略差异主要是修正计分主体、条件控点和火力覆盖前提，不是已证明更强的新军表或完整战略。
- 原四场保持 v119 同一对局代码，未加载本轮离线 Teach 改动。实际 00:42:58Z：A141/C164 为第3回合移动，B25/D25 为第1回合突击；四 host、四 driver、monitor 的真实 PID 均存在，没有联停文件。
- T27 5/6、T23 33/36；主线 248/272/249/250 余4，完整对局0/12。20地图/合法2000分写表/计划绑定/完整对照/复盘的总目标不缩小。

## 具体工程问题与修复

### v123：纠错角色被要求查看，却不能输出查看请求

真实失败反馈规定“建立场景 → 查看 → 选择当前动作域 → 查询”，但 `teach_framework_query_recovery` 的输出枚举不允许 `inspect` / `retained_evidence`，执行器也只接受最终查询。已补齐同一角色合同和只读执行，持久化查看结果，恢复不重复读，查看不能被标为策略证明或原查询成功。

仅该角色合同升至1.1.0；原查询 scope、Rules 和费用记录不变。查看仍消耗既有有界选择，不重置次数。未把 A 的所有缺参都归因于此：原付费回答也错误声称 Host 会自行选择动作域，这个假设已明确纠正。

### v124：重启后纠错自己建立的场景未恢复

保留回执里有完整模型坐标，但新 evidence port 的私有场景注册表为空；只恢复原调查场景不能覆盖纠错产生的场景。新增惰性恢复：

1. 从已保存的原调查及纠错请求/原生回执建立可恢复索引。
2. 仅在实际查询或查看该场景时恢复父依赖及该场景。
3. 用回执中的完整模型坐标，不重新求队形；不执行已保存的 follow-up 查询。
4. 原冻结来源、原 spec、父状态和最终状态必须一致，不把漂移后的新场景冒充原场景。
5. 场景恢复是只读上下文恢复，不是新进场动作或新的合法性结论。

按既有“确认修复后可增加一次”授权，仅旧合同下耗尽次数、已有场景却缺动作域的明确失败可获得一次补充选择。记录原次数、原回执、修复原因；旧3次仍在，最大4次；新合同创建的操作不获得此迁移，再次启动不能重复发放。

## 唯一定点验证

| 项目 | RED | 修复后唯一验证 | 范围 |
| --- | --- | --- | --- |
| v123 纠错查看合同 | PID25808，角色枚举缺查看 | PID27371，3604ms，PASS | 实际失败回执驱动的查看/归档读取/中断续行；0Provider/Room |
| v124 原场景恢复 | PID37983，`ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN` | PID39103，23484ms，PASS | 使用原生实验室的最小场景，恢复前后完整查询上下文相等；只恢复一次、0子查询重放；真实A旧尝试保留且最多补1次 |

v124 用实际 A 缺动作域回执确定错误类型，以冻结测试场景的两个单模型单位最小化场景恢复；不冒充原A全队形/路径已通过。两门无真实模型调用或 Room 动作，不重跑旧绿。

证据位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/`：

- `common-v123-recovery-inspection-red.private.json` / `common-v123-recovery-inspection-result.private.json`
- `common-v124-retained-scene-red.private.json` / `common-v124-retained-scene-result.private.json`
- `common-v122-A-partial-evidence-synthesis-progress.private.json`

## v125 原工作台真实续修

运行器 `common-v125-A-inspection-recovery.private.mjs`，已启动 PID40283。先核对旧 host19997 的实际 HTTP planned、付费终态及命令身份，再替换离线 host；只选 A 原 `query-r4-b4c5d6e7f8091a2b3c4d5e6f`，沿用原 Teach、A9、军表、地图与费用。不会重开 Teach/Room，不自动应用 Plan。

启动不等于模型修复成功。继续读取同名 progress、stdout/stderr 和实际 PID；观察超时不重提付费请求。若本次补充选择仍不能完成，保留具体结果，不能再次凭重启清零或重复追加。

## 修改与可观测性

- `roster-teach-framework-v1.mjs`：纠错角色查看合同、原档案读取与保留场景索引。
- `roster-teach-query-recovery-v1.mjs`：持久只读查看、失败/查看分离、一次版本迁移补充选择。
- `roster-teach-evidence-port-v1.mjs`：按原坐标惰性恢复场景及其父依赖。
- 两个具体 bug 复现脚本及一个原工作台运行器；本报告与任务记录。

`harnessLoopUsed=true`；targetGame=StarCraftTMG；route=offline Teach query recovery；memory=原Teach/原付费记录；无在线策略注入；所有候选 `trainingTruth=false`。降级条件是场景来源/状态不等、查询依然缺参或原请求语义被丢弃，此时不得采纳成合法路径证明。

## 尚未完成

A精确动作域/全路径、Omega合法假设、边际进场代价；B减员/替代队形及精确路径；实际模型自主纠错能力与完整策略收益仍待证。不得从本地门禁或0High推导高策略验收完成。
