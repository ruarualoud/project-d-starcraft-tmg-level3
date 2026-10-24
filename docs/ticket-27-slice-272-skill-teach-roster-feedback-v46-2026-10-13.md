# T27 / S272 v46 — Skill / Teach / 军表反馈与复盘记录

## 本次交付及证据边界

修复了一个真实架构缺口：选表模型已有胜利路线，但 Workspace 未接收 handoff 的初步策略；Teach 因而在锁定军表上重建计划，也无法反馈修改单位组合。

现在新写表会话默认采用 `skill_teach_roster_coevolution_v1`：

初步路线与候选军表 → 同一 Builder / 地图 / 场景查询 → 对候选快照 Teach → 模型查证、回改军表或路线、或明确接受 → 受影响进场与计划重新审核 → 最终冻结、晋升与来源审核。

每个 Teach 内的候选快照仍稳定，避免查询结果对应另一份军表；该稳定性不是整个写表过程永久锁表。既有 v5 会话、已付费上下文和回复不自动迁移。固定表 A 仍保持固定表；从头写表 B 才允许确认前改选组合。原 ABC 不替换，Native A59/B49/C72 继续封口。

具体门 `verify-ticket-27-slice-272-roster-teach-feedback-v1.mjs`：

- RED PID32482：实际 Workspace 丢失选择目的，`agentSelectedStrategySource.plan` 为 undefined。
- 唯一 GREEN PID44488：实际 Foundation 收到原始策略；模型得到 Skill 和完成的 Teach；通过同一个 Builder 改选另一份合法 2000 分军表；旧9条付费回复及5次选择迭代前缀不变；当前旧进场快照失效但历史保留；19条统一经验事件可导出。
- Provider calls=0，Room mutations=0，trainingTruth=false。此门不重跑，也不代替真实模型效果、完整比赛或 Wiki 导入验收。

## Teach 是否会削弱已选择策略

可能发生模型过度接受质疑，但不能把“改得更保守”视为通过标准。新的阶段协议明确：Teach 是挑战，不是战术否决；选择模型可基于公开理由保留有风险的策略、拒绝质疑或改变组合。`accept_teach` 只绑定当前被 Teach 的快照，不免除来源审核。

原 Teach 的 retain / revise / unresolved 仍表示证据与主张的关系，而不是战术优劣。未知工具结果不能冒充证明；未证实假设可以继续作为条件性路线，并给出失效/重规划触发条件，不必为了消除风险放弃路线。

Rules 拦非法编制、预算、进场、摆放和动作；不按风险偏好否决合法路线。模型审核只能把错误规则事实或关键无依据硬保证列为阻塞 High，普通战术风险、条件性意图、遗漏替代路线按 Medium 记录。既有最后一条 Goliath / Omega 侧翼 High 尚未重新完成来源判断，不能把协议修改宣称为它已经通过。

效果观察要比较：原路线是否延续、质疑对应什么工具证据、哪些批评被接受/拒绝、单位与升级为何替换、风险如何保留，以及实际对局结果。不能仅凭新计划更长或审核通过声称策略提高。

## Marine 对 Zergling 的期望能否查询

写表模型仍可调用 `scene_context`、`scenario_branch`、`scene_query`，复用实际对局查询合同。攻击概率查询需要准确的攻击/目标单位、武器域、人数/升级和明确的合法假设局面；它不是脱离距离、地形和状态的固定数字。当前概率工具处理合法远程攻击，不把冲锋距离或近战伤害伪装成远程期望。

旧选表5步没有实际请求这些场景工具，不能声称旧表已看过 Marine 对 Zergling 的期望。新流程提供真实查询与 Teach 后回改机会，但“能查”不等于“模型这轮已查”；实际请求证据由经验导出保留，真实生成比较尚待收取。

## 写表是否保留给 Wiki 复盘使用

新增统一只读入口：`GET /starcraft-tmg-level3/roster-planning/v1/iterative/sessions/:id/experience`。

包含：

- 选表模型的公开输出、请求/上下文/回执标识、用量，含未接受的输出与失败信息。
- 工具请求及回执，候选与策略版本；新 v6 迭代还保存当时军表和计划快照。
- 进场历史、Teach 的公开质疑和回应、模型接受/回改理由。
- Teach 原始公开回复、技能路线回执、计划版本、来源审核与修正历史。

导出复用原始保留记录，不重新生成故事，不把假设查询当作真实比赛发生的动作；`trainingTruth=false`。不保存隐藏思维链，不含密钥。`wikiImportCompleted=false`：Wiki 导入、经验归纳和 Skill 晋升仍是后续复盘交付，不能把“原始记录已保留”称为“Wiki 已自动学习”。

## 修改文件

1. `iterative-roster-plan-session-v1.mjs`：持久反馈、回改/接受、军表和计划快照。
2. `iterative-roster-flash-model-port-v1.mjs`：反馈阶段合同、Skill / Teach 材料与模型公开取舍。
3. `iterative-roster-product-port-v1.mjs`：实际产品反馈及原始公开回复读取接口。
4. `iterative-roster-teach-handoff-v1.mjs`：绑定选择策略与反馈模式。
5. `iterative-roster-arrival-port-v1.mjs`：按候选/反馈快照收敛，累计历史与付费记录不清零。
6. `roster-planning-workspace-service-v1.mjs`：选择目的进入 Teach，读取完整公开规划经验。
7. `roster-strategist-runtime-v1.mjs`：Foundation / Teach 接收原路线与其证据身份。
8. `agent-selected-roster-journey-v1.mjs`：真实 Web 流程回流、拒绝重复旧 Teach、经验导出。
9. `roster-planning-workspace-http-v1.mjs`：同产品只读经验接口。
10. 上述具体 bug 的原始 RED / 唯一 GREEN 门禁脚本。

## 当前剩余交付物

### 真实执行停点（不重发）

独立既有 Web 写表服务 Host48993，origin `http://127.0.0.1:57641`，无 Room-launch 连接。新生产会话 `iterative-web-751823b0-ed88-49e6-84a2-2b88b553bed9`，POST 创建201、启动202各一次。

截至本次持久状态收取：revision4、8单位、共享 Builder 2000分合法，进场公开审核 `unit_references_verified`；Teach 会话 `rws-b04f5eb8-ae84-4d3a-a759-1772f8fb678c` 正在 `strategy_foundation`，已持久化初始选择目的，尚无完成的 Teach 反馈。因此不能宣称最终计划、策略回改或效果比较已完成。

一次只读进度 GET 超时导致观察会话重置，不等于 Host 停止，也不重发启动；以上状态直接从原会话 JSON 收取。观察请求延迟作为性能问题保留，不能把初始化/查询堵塞当作模型战略失败。

旧流程的实际 Web 经验导出已保存 `legacy-locked-roster-experience-v46.private.json`：9条选表/进场付费回复，1个 Teach 快照内25条 Foundation、Teach、深化、审核、修正公开回复，共34条原始回复谱系。文件属于规划经验，不是比赛完成证明；Wiki 导入仍未完成。

1. 实际新模型生成及与旧“锁表后 Teach”军表 / Plan 的可读差异；报告是否查询对抗期望、是否回改、是否无依据保守化。尚未完成，不将本地假 Provider 当真实生成。
2. 原 ABC 及写表的全部实际工具 unknown 分类表与确认缺陷来源修复，完成后才考虑同版原房续跑。
3. 同军表的有/无 Plan 对照及从头写表闭环对局；之后统一进入复盘 / Wiki 与 Skill 更新实验。

T27 / S272 为5/6；T23 / S248 为33/36；主线余 S248、S272、S249、S250 四片；有效完整对局0/12。20经典图长期目标未缩，18张剩余扩展排在核心验证后。无子代理/K3、数据刷新、删除、安装、提交、旧绿重跑或全量构建。
