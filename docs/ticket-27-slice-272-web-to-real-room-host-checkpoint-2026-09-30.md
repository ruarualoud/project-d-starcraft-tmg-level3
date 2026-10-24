# T27 / S272 — Web 写表到真实 Room 的接线检查点

日期：2026-09-30。状态：**Web 实际生成/审核/两轮纠错已跑，三轮未收敛，真实开局未验收**。

## 本轮发现与修改

用户可从 Web 发起 AI 写表，但此前正式 A-A 服务在没有人工制作的 admission manifest 时，仍读取固定名称的旧 `claim-repair` 文件。这使新生成的 Web 计划无法直接入房。本轮新房分支改为读取同一持久迭代会话与 Teach 会话，调用既有 `prepareAgentSelectedTeachRoomLaunch` 做 Builder 2000 分、地图、计划谱系与最终来源审查准入；不再把旧静态修订文件当作新计划权威。

新增本地 Web Room process host：显式 `--enable-room-launch` 时，写表服务器挂载真实启动端口。服务器用 plan/review 绑定的 launch key、迭代会话 ID、Teach 会话 ID 与冻结地图启动现有正式 A-A Room 服务；后者独立重读并准入当前计划、创建 SQLite Room 与两席 Flash Agent。宿主只返回公开观战入房 URL，不返回席位凭据或 runner token。同一 launch key 有持久注册；启动含糊或来源不一致时失败关闭，不自动再建第二间房。已就绪进程退出后的再次请求走原目录恢复，而非新建房间。

Web 客户端新增正式开局调用；只在 Web、本地 host 已启用且来源审查 0 Critical/High 的页面状态显示入口。点击仍由服务器重新核验；App 尚无可达本地服务的受信 App Link，因此不把此回路冒充双端完成。当前 A-A 页面一次只推进一个动作，自动整局仍待收口。

## 当前真实运行证据

- 新鲜 Web 会话 `iterative-web-89f4ecec-08bc-4725-b024-01e48e554ee4`：Builder 候选 2000/2000、8 个 Unit、冻结 Lost Temple；Rules 开局 Supply 行 6/6、8/8、10/10、12/12。Web 初始页面截图：`build/ticket-27-slice-272-web-fresh-d-v1/roster-workspace-initial.png`。这是实际浏览器点击的生成入口，不是 Room 开局截图。
- 锁表 Teach `rws-df5fa331-8ca5-48ed-ac81-e65cc8aa52e9` 四轮实际生成后，由真实 Web 页面续接 V3 七片来源审核。首轮 **6 High**，自动定点修订后 **2 High**，第二次修订后的第三轮 **5 High**；最终 v3 计划 hash `d51fd0ab…59caf028`，`AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NONCONVERGENT` 停止，不开 Room、不启动第四轮。第三轮确有把尚在 Reserves 的单位当作可被早期损失移除、引用无凭据的 20 VP 比较等问题；另外两条治疗分工/预案判断可能过严，但即便降为 Medium 仍有未决 High。
- 真实浏览器截图：`build/ticket-27-slice-272-web-fresh-d-v1/source-review-three-round-stop.png` 保留旧页面仍错误显示“继续审核”的缺陷；修复后 `build/ticket-27-slice-272-web-fresh-d-v1/source-review-persistent-stop-v3.png` 显示中文停点，`source_review_nonconvergent`、2000/2000，续审按钮 **0**、开局按钮 **0**。
- 无计划 A 原房 `20260926182512804-zvqoXv-84EeTL-PHj3DF` 同房续至 37 个已接受动作、第 4 回合 Movement，runner/server 进程在运行；完整局和同表 A/B 仍未完成。
- 20 图正式任务/部署几何仍 53/75，Grand 5 图缺冻结同规模任务卡；本轮未修改地图。

## 聚焦验证与未验证

- T23 新房启动脚本两次相关编辑后各做一次 `node --check`，均通过；新 host、写表服务器、产品模块、HTTP adapter 相关语法门通过。
- 两份改动的 TypeScript 文件 `transpileModule` 语法检查通过，随后定点 TypeScript 项目诊断对本次文件为 0；全项目 `npm run check` 的一次结果为失败，原因是已有副官组件中的类型错误，不冒充全局通过。
- 既有 `verify-ticket-27-slice-272-web-room-launch-route-v1.mjs` 在本轮相关修改后仅运行一次，**通过**路由/旧审查拒绝边界；它不能证明真实 Room。
- 新 Web 页面已独立导出到 `build/ticket-27-slice-272-web-room-launch-v1/export`，Expo 14 条静态路由成功且未覆盖 A 房间正在使用的旧 `dist`。旧页面实际出现新房按钮的条件因真实 High 未满足，未产生可点击的成功截图。
- 具体故障：状态轮询曾每次重建整份 Builder 锁表，聚焦复现同一路径 4 次无谓 `prepareTeachHandoff`；改用精确 `planId`/候选绑定后 0 次，完整来源核验仍在提升/Room 准入。Teach 与迭代阶段的日程 hash 不同，不能拿来做轻量会话查找。两次聚焦红→绿均只运行对应门。
- 有界纠错的聚焦门先红（首轮 High 后不修）后绿（两次来源审核、一次定点修订）；真实运行验证 6→2→5，按三轮上限停止。额外发现旧 UI 仍显示续审，补了基于持久 `planReviewHistory` 与同计划谱系的服务端拒绝及 UI 隐藏；聚焦门先红后绿。新版 Web 使用绝对工作树路径导出 **14/14** 路由；真实浏览器读回失败会话后，中文停点可见、续审按钮 0、开局按钮 0。服务端重启后一次 `run` 请求拒绝，同一 D 会话仍为 24 calls；没有第四轮付费调用。
- 新 host 尚未收到零 High 的真实计划，因此**未证明** Web 点击→真实 Room r0→Bot 两席计划→合法动作/Replay，也未证明同一 launch key 重启恢复。不得把此检查点计为 S272 关闭。

## 费用与后续

接线代码的定点验证本身 0 Provider/Room 调用。Web C 迭代会话保留 8 个已保存付费回复，188,043 输入、14,995 输出 units；独立 D 此次 Teach＋三轮审核/两次修订合计 **24 calls、376,900 输入/75,507 输出 units，保守全未命中估费 ¥0.814714**，不是供应商账单。A 原房同房进度约 ¥18.575880，A/B/C/D/E 继续分账；历史未知 Provider 用量不归零，均未达到独立新增 ¥100 提醒线。

下一步：先完成新版 UI 的“不可继续付费审核”可见验收。当前计划的三轮审核已封存，不能用第四次模型抽样掩盖不收敛；需分析剩余真实错误与审核严重级别，再在下一份有明确修正策略的新计划上验证零 High。只有零未决 High、来源绑定一致时，才能用 Web 点击开局并证明 Room r0、两席 Bot 计划、首个 Apply/Replay 与截图。

## Harness loop

- harnessLoopUsed: true
- targetGames: `starcraft-tmg`
- promptPackRoutes: Web C 为 Roster Strategist，D 为锁表 Teach/来源审核；A 原房为 `selfplay_agent_prompt`。
- harnessToolsCalled: Web 实际调用 Builder、地图证据、进场 Rules 审核、Teach 和 V3 七片来源审核；新 Room host 尚无真实调用。
- uiTraceEvidence: 上述实际 Web 初始、续审及三轮停止截图；成功开局与 Room 页面截图待验。
- agentDecisionEvidence: C 的 8 个付费写表回复与 2000 分 Builder 接受，D 的四轮 Teach、两次修订与三轮审核 6→2→5；A 的 37 个已接受动作另属独立对局。
- memoryTraceEvidence: 本轮未审计新 Room 记忆；A 保留原房连续记录，不据此声称新计划记忆生效。
- trainingTraceCandidates: 无新晋升，`trainingTruth: false`。
- rollbackOrDemotionRules: 未决 Critical/High、三轮不收敛、名单/地图/计划哈希漂移、启动记录含糊均阻止暴露新 Room；不购买同计划第四轮修订。
- userVisibleChecks: Web 写表入口、计划、续审和三轮停止已目视；真实入房、AI 自动动作均待实测。

## 2026-09-30 首版即通过审核的开局边界

当前 Web→Room 准入曾无条件要求计划为 `revised` 且至少有一次修订；来源链验证器也把零修订初版当成非法。这意味着 AI 若首版就得到 0 Critical/High，反而必须制造一次无意义修订才能开局。使用已保存的真实 Agent-selected 初版计划（`planStatus: active`、`revisions: []`、hash `2e5dc278…488a22`）只调用来源链验证器，修前实际报 `AGENT_SCHEDULED_REVISION_LINEAGE_INVALID`，构成具体 bug 复现。

现在零修订链只在最终计划与提升后的初版 **同 hash、同版本** 时通过；任何内容变化仍必须有逐版修订收据。Web 准入与 Room 计划接线允许这个完全未改动的 `active` 初版，其余名单、地图、2000 分、当前来源审核和 Room 核验不放宽。既有 `verify-ticket-27-slice-272-web-room-launch-route-v1.mjs` 增加该真实初版的零修订/伪造初版 hash 两个断言；代码变化后只运行一次聚焦门，结果 `Web Room route and stale-review rejection: passed`，0 Provider、0 Room mutation、0 新费用。此门仍只证明版本边界与旧 V2 审查拒绝，**没有**真实 0 High 首版计划的网页点击/建房证明；当前 Web D 三轮失败计划仍阻塞，未被降级或第四轮审核。

`harnessLoopUsed: true`; `targetGames: [starcraft-tmg]`; `promptPackRoutes: [locked_roster_teach, final_plan_review_v3]`; `harnessToolsCalled: [saved initial-plan lineage verifier, Web Room route gate]`; `uiTraceEvidence: existing three-round-stop screenshot only, no new Room screenshot`; `agentDecisionEvidence: no new model decision`; `memoryTraceEvidence: exact initial plan hash/version required, revised chains unchanged`; `trainingTraceCandidates: none`; `rollbackOrDemotionRules: mismatched initial hash/version or unresolved Critical/High still block`; `userVisibleChecks: focused zero-revision admission boundary and stale-review rejection, actual Web launch pending`.
