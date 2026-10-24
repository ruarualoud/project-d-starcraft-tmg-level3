# T27 / S272 — A/B 收敛与查询用途修复 v255

## 本轮范围

用户明确开局选牌后做，不再重复核对。只推进 A 固定表 Plan/Teach 与 B 从头写表/Plan/Teach；不改冻结地图、军表预算、Skill、模型或对局条件。T27 5/6、T23 33/36、主线剩 272/248/249/250 四片、完整实验 0/12，均未新增准出。

## 实际观察

- A 原 fresh-v249 产品会话继续：Plan3 的问题列表 31 条（含重复来源项及待修条目），Plan4 为 4 条，Plan5 为 2 条。不能当作 31 个独立 High；分别涉及进场时序、单位绑定/缺证据、Marine 3 补位论证。已自动到 Plan6 的来源审核/资格复核，尚未完成完整 Teach。无人工改写 Plan。
- B 原 fresh-v249 r6 已是 Builder 合法 2000 分，但暂存 Plan 仍含 910 分初稿，后续选择/修订尚未完成。不能把满分合法表等同于 Plan 可用。
- B `q-victory-route-control` 原错误为 `SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND`。模型把外层 intent/subjectUnitIds/targetIds 去掉，已有参数正确的 Native 查询回执；却连续以 `prerequisite_query` 交付。三份 inspection 复用同一结果，第四次到读取上限，最终 `context_read_budget_exhausted_query_unresolved`。这是协议用途引导和重复反馈缺口，不是此次网络失败。
- 已保存的 control 结果针对 setup/reference 场景，单位未进场；它不能证明计划将来的占点/进场可行。修复不得自动把辅助证据当作战略通过。

## 来源修复

`packages/roster-strategist/roster-teach-query-recovery-v1.mjs`：

1. 新的结构化 action protocol 明确直接修正的 kind/参数容器，区分辅助查询、delta 编辑及 Native 候选选择。
2. 已读取的相同辅助请求在既有模型纠错入口立即返回可操作反馈；不再接受它浪费新的读取回合。读取额度用尽时明确要求提交修正或说明延期。
3. 只对已证实“读额度耗尽、保存了同源同谓词/命名对象的成功辅助查询”的旧停点，提供一次显式纠正机会。旧选择、失败、额度和费用保留；不自动认定修复成功。
4. 模型明确提交直接修正、且既有范围/谓词检查通过后，精确参数与 source/base state 一致的保存回执可复用，保留原精度、适用条件和未知状态。没有重跑原查询，没有规则/策略晋级。

恢复脚本仅新增 `--resume-product-v255` 版本标识，仍调用普通产品 Run，不加入实验专用战略步骤。

## 一次红绿验证

命令：`node scripts/verify-slice272-recovery-query-purpose-v255.mjs <三组基线目录>`。

- RED：真实已存 B 请求进入生产 recovery seam，重复辅助查询未被反馈，断言失败。
- 一次 GREEN：2 项（当前未完成操作、已耗尽旧停点）；显式模型提交、原选择/失败保留、完全相同回执复用、条件边界保留。0 Provider、0 Native、0 Room。
- 仅恢复脚本有修改，追加该文件一次 `node --check` 通过。没有全量测试、旧已通过门禁重跑或新对局。
- 这证明协议传递修复，不等于真实模型后续 Teach/Plan 已收敛。

## 恢复边界

11:04Z：A PID95457 在 Plan6 资格复核；B PID84767 已收到产品安全暂停请求，等待当前处理落盘。不杀进程、不盲重发未知请求。B 完整停止且 pendingDecision 为空后，保留暂停标记为历史，再以 v255 恢复同一 session/r6；未满足条件不重复启动。真实结果继续写原目录，费用不清零。

开局选牌、双表和正式 UI 启动差距仍按原待办保留，不在本轮展开。

11:08Z 更新：A Plan6 的 `reviewHigh=false`，产品已进入 `teaching`，当前真实请求为 `teach_framework_agenda`；说明来源纠错已推进到下一阶段，完整 Teach 尚未验收。B 已保留第29次答复，第30条请求最新 dispatch 为 `reserved/not_sent`，产品暂停尚未完成，PID84767仍在；v255代码未加载到旧进程，不能宣称真实纠错已成功。后续先等安全终态再续接，不另开新表/新会话。

## v256：产品暂停被并发检查点覆盖

实际 B 暂停已确认，随后旧 Teach 保存又把 `pauseRequested` 写回 false；不是新模型请求可随意取消，也不是恢复应该重写军表。

- 修改 `iterative-roster-plan-session-v1.mjs`：暂停意图独立锁存，所有会话保存串行化；暂停读取最新付费状态再置位，避免覆盖已经收到的结果。显式恢复清除旧暂停，但不会抹掉恢复加载期间的新暂停请求。
- 具体竞态夹具 `verify-slice272-pause-checkpoint-race-v256.mjs` 先失败；第一次修复后识别出显式恢复未清已持久暂停的问题，再修改后仅运行一次并通过。验证暂停持久、付费记录不丢、暂停后不追加决策、显式恢复正常；0 Provider/Native/Room。
- 原 B 的全部已发查询答复已保存，`pendingDecision=null` 后，仅停止该 runner84767 和其子进程84837。保存核对记录 `B/fresh-generation-v249/settled-process-recovery-v256.json`，旧暂停标记保留为 `pause-recovered-v256`，不删除数据。
- 同一 B session/r6 以 v255 恢复标识加载 v255+v256，PID62868。后续真实 query recovery 已继续；2000 分表并不等于最终 Plan/Teach 准出。

## v257：Teach 查询准入与执行的重复未知语义不一致

A Plan6 来源审核已干净；完整 Teach 的第三次调查答复因 `ROSTER_TEACH_INVESTIGATION_UNCHANGED_QUERY` 停下。重复的是原 `side_identity_required` 未知查询，同批还有其它查询。执行层原本可复用失败证据，准入却整批拒绝。

- 修改 `roster-teach-framework-v1.mjs`：两处共用 `reuseRosterTeachFailedQueryEvidenceV1`。只有原结果 unknown、原回执存在、当前 descriptor 与完整参数精确一致才复用。
- 保留原 unknown、修复提示和来源，标记 `queryNotExecuted/repeatedFailedRequest/originalQueryNotAnswered`；已有进展统计不把它计为新证据。修改参数或上下文不能偷用旧结果，非待解决问题的查询仍拒绝。不是把失败标成成功或放宽策略准出。
- `verify-slice272-failed-query-reuse-v257.mjs <base>` 使用 A 已付费的真实第三次答复，RED→一次 GREEN；验证同批不被错误丢弃、未知保留、无重算、请求/descriptor 隔离、问题范围边界。0 Provider/Native/Room；旧已通过门禁未重跑。
- A PID95457 已终止；旧未完整审核输出按 contextHash 对应已保存的截断原文，最后调查答复已保存，无在途请求。以 `--resume-product-v255` 恢复原 session/Plan6，PID74450，加载 v255–257；不重写初始表、不清费用、不启动对局。

### 当前差异和仍待交付

产品修改仅查询用途恢复、暂停/保存竞态、重复未知准入三处；新增两个具体 bug 复现脚本，未运行全量/旧通过验证。B 已运行进程不热替换 v257，下一合法恢复边界再加载。

尚需：A 完整 Teach/最终当前计划准出；B 完善当前满分军表的 Plan 并完成 Teach/审核；之后才做产品链路对局。两条真实收敛结果仍未通过，计数不变（T27 5/6、T23 33/36、余4、完整实验0/12）。

## v258/v259：后续真实结果及来源修复

### 已观察到的推进与再停止

B 的 v255 恢复确实得到模型直接提交：`q-victory-route-control` 使用修正后的参数，不再重复辅助读取；保留的同源回执返回当前未进场单位、无争夺，不能证明未来占点。`q-opponent-crushing-grip` 模型主动延期，理由是当前空场没有可观测的 Kerrigan 位置；这不是通过，后续调查/汇总仍须处理条件场景与计划覆盖。B 已推进到其它查询的 delta 修复，仍在原 r6，不停止健康的在途请求。

A v257 续接后又收到一份真实完整调查答复，但11:39Z再次因重复门停止。这次是已成功的 `scenario`，不是 v257 修过的 unknown。第82条请求已完成并保存；不能把先前定点通过说成整个重复场景问题已解决。

### v258：地图参数漏传不能被标成不可修复

真实 A 请求 `map.route_access` 缺 `sideId`，原地图工具返回 `side_identity_required`，共享适配器却未传递参数修复分类，最终 Native `mayRepairSameChoice=false` 阻碍自动纠错。

- 地图证据源按冻结审计区分缺失/不匹配的 side/base/target 标识与真实证据缺失。前者返回必填字段、实际可选标识和修复说明；不替模型选路线、底座或目标。原对象无审计条目仍 unknown，不可换成别的对象冒充证明。
- 共享房间/Teach 地图适配器保留这一类型化反馈。场景工具版本 1.4.6 标识语义变化，旧失败记录/费用不改、不把旧记录重签为成功。
- `verify-slice272-map-selector-repair-v258.mjs <base>`：真实 A 参数 + 已有冻结地图，RED→一次 GREEN。修正后共享查询结果与直接地图证据端完全一致；底座/目标误标识可修，未认证地图仍 unknown。0 Provider/Native动作/Room写入。

### v259：成功的只读假设场景也应幂等复用

- 调查器原本特意排除 `scenario` 的成功证据复用，导致同批八项调查因一个已成功场景重复而全被拒绝。现在按相同参数/同源工具合同复用完整场景和 follow-up 回执，仍标记 `queryNotExecuted`，不计新进展。
- 证据端同时注册新查询标识到原来的私有分支；核对原请求、场景来源、运行时、Builder、spec 和分支身份。不能只复制回执却留下后续查不到的分支句柄，也不重新摆放或重新执行假设动作。
- `verify-slice272-scenario-query-reuse-v259.mjs <base>`：实际 A 第82条已付费答复 RED→一次 GREEN；原始场景和 follow-up 不变、新句柄读同一分支、错请求/缺分支拒绝，0 Provider/场景执行/Room写入。不同工具版本仍不复用过时计算。
- 恢复入口只增加 v259 记录标识，一次语法检查通过。A 原74450已终止、最后回复已保存；PID93415以 `--resume-product-v259` 续原 session/Plan6。B62868继续其在途原流程（尚未加载 v257–259），不热替换或重复发请求。

### 本次最终差异摘要

产品：`iterative-roster-plan-session-v1.mjs` 暂停/写入顺序；`roster-teach-query-recovery-v1.mjs` 查询用途及精确回执复用；`roster-teach-framework-v1.mjs` 查询准入/执行缓存一致；`roster-teach-evidence-port-v1.mjs` 只读场景别名；`pregame-map-evidence-port-v1.mjs` 地图参数修复反馈；`room-backed-spatial-rules-query-adapter-v1.mjs` 原样转交反馈；场景工具版本标识。观察脚本只续现有产品 Run。

验证仅 v255–259 的具体失败复现及恢复脚本改动对应的语法检查；已通过的旧门未重跑，没有全量构建/新对局/新官方数据/军表手工改写。11:47Z A已报81次8282730tokens、B32次6787027tokens，旧轮和未知费用另保留；这些是服务商返回用量，不是最终账单。当前仍未达到 A/B 完整收敛验收。

11:52Z 后续观察：A93415仍在同一 Teach 恢复，未新增准出；B62868已到请求37、33次6822390tokens。B `q-capability-demand-tags` 的当前几何修复有8个失败单位，但 `maximumContextReads=3` 且3次已用完；产品又要求先获取各单位的 Native 候选再一次性提交。下一优先检查这个依赖数量与读取预算不匹配，不要把工程额度不足当作模型策略不成立，也不要盲目重开整个 Teach。原记录和所有未知项保留。

观察接口读取大快照时曾超时重置；已用原PID确认 A/B 生产进程仍在（PPID1），没有重启它们或重发请求。后续只提取小摘要，大快照读取使用短生命周期作用域和30秒观察超时，避免持有多份巨型对象；这不是模型/网络故障。
