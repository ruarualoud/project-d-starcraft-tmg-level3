# S272 v275 — 队形查询说明与调查收敛

## 发现与修复

真实A Plan11调查已到17批。完全相同查询的缓存复用已有queryNotExecuted，进展计数会跳过；最初怀疑缓存编号变化造成假进展，经调用路径核对排除，未改缓存逻辑。

实际问题是多次静态队形查询更换锚点仍得零候选，工具只给bounded_packing_miss；不同空结果又被算作新证据，持续延长调查。

- 静态查询复用现有底盘几何判定，附加具体锚点越界、表面不支持、挡路模型/地形对象及边界。跟随模型未摆全仍明确为有限搜索不足。
- 诊断仅在请求时生成，不改合法性、输入锚点、策略权重、规则数据或正式动作执行。
- 零候选搜索保留真实记录，但不再重置已有“两批无新证据”计数，随后进入局部纠错/汇总/计划修订。不会自动回答未解问题或证明地图无合法位置。

## 定点验证

两个具体bug均先RED、修后各一次GREEN。无旧绿重跑、全量构建、模型调用或Room动作。

| 命令（工作树内） | RED | GREEN |
|---|---|---|
| `node scripts/verify-slice272-static-miss-diagnostics-v275.mjs <base>` | 无确切底盘越界原因 | 越界/模型碰撞两类准确说明；合法候选仍1个，锚点和源场景不变 |
| `node scripts/verify-slice272-retro-v271.mjs <base> A_empty_static_search_progress` | 真实A两次零候选计为2条推进证据 | 推进证据0，两批后转交；原证据不变 |

## 实际续行

六组通过pause-requested安全停点等待已发请求落盘，再用同产品Run、同session加载修复。各组日志`resume-static-diagnostics-v275-20261017.log`；停点标记改名`pause-released-static-diagnostics-v275`。观察PID：A76052、B76751、C76054、D76056、E76058、F76060，恢复前须核对存活状态。

A固定表Plan11；B/C为2000分r5；D仍1150分r5中间稿；E/F为2000分r7。C/D/F实际Skill路由分别为Terran→Zerg Swarm、Terran→Daelaam、Kerrigan's Swarm→Terran，包含对应总规则/本族/有方向对抗Skill，并非只改展示名称。

E继续Daybreak6.0.9。此前两端90个路线查询一致（62见证/28有限缺见证）不重跑；这不等于E具体Plan路径已证明。

仍待：场景队形、动作分支引用、查询参数/能力前提、最终战略理由和来源审核。局部修复通过不等于完整Teach准出。所有原付费输出/费用保留，不手工改军表/Plan。

T27 5/6、T23 33/36；主线余S272/S248/S249/S250共4片；六组规划准出0/6、完整对局0/12，无新对局。未来对手行为保留条件假设，不伪装已知。

本次源码增量：legal-formation-search、static-formation-query、roster-teach-capability-guide；两个具体bug门和状态文档。文件原有历史修改不归因本轮；不提交、不删记录、不刷新数据。

## v276 — 后续实际 E 暴露的共同请求入口差异

E的原付费请求存在两层`scenario → toolRequest → scenario → toolRequest`包装；局部纠错已有拆包装能力，但初始调查入口没有，先报`PREGAME_LAB_BRANCH_SPEC_INVALID`。另一个实际场景followUp中，Native argumentsJson与外层subjectUnitIds/targetIds/intent完全相同，顶层已能合并，scenario子查询却未走共同规范化，继续误报`SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND`。

统一`normalizeRosterTeachQueryDispatchV1`：

- 仅拆同kind、恰好kind/toolRequest两个字段的冗余层；额外选择器/不同kind不拆，原付费请求不改。
- scenario.followUps逐项复用同一Native规范化器，保留场景、坐标、分支和argumentsJson；有歧义的子项原样留给既有拒绝流程，不丢弃真实选择。
- 新请求、调查及已保存局部纠错都已引用此共同函数；不是只修实验入口。

`node scripts/verify-slice272-retro-v271.mjs <base> E_transport_normalization`使用真实E原请求，RED→一次GREEN；同时核对同型重复参数、原请求不可变及额外字段/不同kind不被静默丢弃。其后补显式kind存在保护，不改变上述正常输入语义，已通过门未重跑。0Provider/0Room验证。

请求六组在当前已发调用/工具批次落盘后加载v276；不可杀在途请求或重置会话。最终准出计数仍0/6。
