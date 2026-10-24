# S248：当前目标闭环与查询合同修复

范围：T23/S248 × T27/S272；不另增 Slice 完成量。诊断优先复现原返回，再修共享来源；不以补 Prompt 策略权重代替接线。

## 已完成文件与功能

- `packages/online-agent-session/live-flash-decision-port-v1.mjs`：Planner v35/v36、规范化 v29。模型只提交 `plan.currentGoal`，通过 `currentGoalSource=plan.currentGoal` 声明唯一来源；Host 派生 assessment 的兼容字段。新目标能通过真实 TurnPlan/日志持续保存，continue 不强制伪造战略版本升级。旧含糊付费返回保持旧解释，不改写历史。新增只读同席 plan-progress-facts，将原预设进场轮次与真实进场、当前模型/Supply、已接受动作分开。
- `packages/online-agent-session/spatial-action-query-runtime-v1.mjs`：共享当前域参数接缝。当前菜单的精确 `candidateId` 可对应同一 Rules `domainId`；仅搬运明确提供且域 schema 声明的顶层参数，并保留嵌套 parameters/proposal。冲突或未知引用给可纠正的 Medium unknown，不猜目标。可信域只取本席当前 LegalSpace，不能由模型传入；同一原生工具描述器说明规范格式。
- 三个具体反例脚本：`verify-ticket-23-slice-248-planner-goal-continuity-v1.mjs`、`verify-ticket-23-slice-248-probability-query-transport-v1.mjs`、`verify-ticket-23-slice-248-threat-query-transport-v1.mjs`。
- `collect-ticket-23-slice-248-live-query-transport-evidence-v1.mjs`：隔离进程、SQLite 只读提取原请求/最终回执；只输出小型证据，不将大型 Room/全部历史复制到持久诊断会话。

## 单次对应验证及证据边界

证据根目录：`build/ticket-23-three-arm-official-standard1-20261008-v1/`。

1. B71 两个目标源反例：RED35490 → GREEN37760 exit0。新明确合同将原模型的新目标写入实际 TurnPlan 和日志；五个一致旧返回和一个旧含糊返回保留。无新 Provider、无原 Room 写。
2. C102 七条实际概率请求：RED65453（原请求到适配器为 unknown）→ GREEN66469 exit0。验证域与参数传递、规范旧参数、冲突拒绝和可信域来源；**没有执行概率数学计算**。后续通用化只扩展共享接缝，已绿概率门不重跑。
3. C102 七条实际威胁请求：有效 RED72011 → GREEN72552 exit0，真实共享 Runtime → 真实 Room Adapter → 明确标记的 Rules instantiate spy。规范 proposal 保留；**不是实际 Rules 合法性或数值概率证明**。先前取证 wrapper71670之前的一次 SyntaxError、夹具未生成的70840 ENOENT不算有效红例，日志均保留。

未跑旧绿、全量测试或构建；未创建代理/K3、安装、删除、刷新官方数据或提交。

## 同一 C 房间实际执行

原 Host1643 自然 completed/paused、全部229 paid completed、零 bot inflight 后正常退出；Host39986 从同一 SQLite恢复。初始/当前完整 envelope 和全部旧229 Paid在关闭前后/ready一致，预算200已加载；没有重建房间。

- r101→102：Swarmling finish_activation，Replay true，零新模型调用。
- r102→103：新版唯一目标合同实际进入模型；模型指名 Goliath2 对 Queen 使用 Scatter Missiles。Host执行同一合法动作，回执 `d3629cda…`，最终 `lastReplayMatchesCurrent=true`、`inflight=null`；同一 job completed/paused，非观察器超时重试。
- 新增3次 Flash 调用，774,304输入、7,338输出，合计781,642 units；估费新增¥1.928776。C合计232调用、估费¥83.961711；P1¥29.040369/P2¥54.921342分别保留。金额是估算，不是服务商结算账单；A/B未因此归零或混账。
- 只读截图 `C-r103-single-goal-live-web-ready-terrain-20261009.png` 已查看；最终证据 `C-r103-single-goal-final-replay-proof-20261009.json`。Web44184和照片53360的读取超时不代表动作失败，不曾重新派发。

注意：39986 **已加载唯一目标修复，尚未加载后来完成的查询接缝修复**。真实C102的7概率、7威胁请求仍为旧入口 unknown，不能宣传概率已在真实局中生效。下一自然停点只读保存全部连续性后再同房加载。

## 未完成与根因分类

### 计划延续：工程缺口已证，不将其全归模型

B71同份原返回有 R2 Deploy goal 与 R1 choose-first assessment 的矛盾；系统曾允许旧 assessment 覆盖新目标。新合同与事实进度解决这一具体接缝，但还没有认证 B 原战略步骤的逐步完成/失效/重规划，更没有证明带计划强于无计划。五个一致 continue 不能认定为错；进场建议偏离也不是违反规则。

### 预游戏 unknown：选定军表、分支及查询语义三层不同问题

已取回旧保存的 `publicOutputs.strategy_foundation.sanitizedOutput.informationNeeds`，不是声称恢复了已释放的 Prompt 全文。见 `B-pregame-query-root-cause-20261009.json`。

- 六个场景 placement ID都属于实际选定军表；产品 `createRunLaboratory` 却以未传选定候选的默认军表创建 source。当前是源码路径证据，尚未用原失败调用完成重放；旧失败回执不能被当前成功回执替代。
- probability 请求明确缺 attacker，同时请求 `branchIdRef=need-round2-scenario`；Teach wrapper固定 `base.kind=source`，未消费该引用。
- 模型问题是 ON CREEP 冲锋可达概率与卡牌速度/IMPACT变化；现有 pregame probability 方法只支持当前合法射击。因此补 attacker 也不能正确回答这道问题，不能拿射击概率充数。

### 新真实动作仍不等于高策略验收

C102公开理由把 Goliath2全单位两个武器合计15骰与所选 Scatter6骰混用；真实 Rules动作的 hit6/surge1/armour6正确，不能以理由15骰当实际骰池或据此认证策略。记录为语义来源对齐待排查，保留原返回。

单动作耗时仍超目标：Agent147.427s、Preview109.970s、Apply150.165s、Replay464.321s；非模型一轮回复慢的单一原因。完整结果已得，不重复跑这个动作。只读诊断持久内核累积对象触及4GB并退出，原Host39986仍存活/空闲；改用独立提取的小型证据，不把诊断OOM误报为游戏失败。

## 剩余步骤：每步一个可验收交付物

1. **当前查询接缝同房生效证明**：自然暂停、零在途后同SQLite加载，新真实查询的当前域/目标/结果证据；不重买已付原答、不重跑已绿门。
2. **选定表/分支实验室接线交付**：选定名单唯一注册、实际分支引用、明确攻击者/目标；区分射击、冲锋可达与伤害查询。支持项产出证据，不支持项返回具体能力缺口，绝不 unknown=0。
3. **B原计划的事实进度与局部Teach补片**：在工具证据可用后补胜利路线、分阶段任务、交战/交换条件、对手预期与反制、地图路线、可接受损失和推翻条件。保持锁定表/合法进场/原历史；提供人读前后差异。
4. **同一完整输入下工程/模型分界记录**：校验与模型理由绑定同一个目标/武器/时段/当前事实/原计划步骤；对模态词、量词和条件保留原语义，不能只靠字段齐全或正则。事实输入正确且无工具/持久化误差后仍忽略计划，才记策略/模型效果给后续Skill复盘。

T23 **33/36**，余S248（当前三组完整对局与稳定性）、S249（复盘/假设实验）、S250（效果与报告）；T27 **5/6**，余S272（两类军表与计划正式整局验收）。当前四片开放、完整终局**0/3**；20图完整目标及后置18经典图不因本批调整。

Harness loop=true；route=harness_optimizer_prompt/selfplay_agent_prompt。诊断、深模块共享接缝与 agent 文档规范影响本交付；不采集隐藏思维链，trainingTruth=false。
