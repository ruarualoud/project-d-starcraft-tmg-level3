# T27 / S272 v48：详细 Teach 接线修复与真实产出验收

## 当前执行顺序

用户最新要求：先确认新 B 的详细严格 Teach 有效，再比较最初旧 B；A/C 保留原军表、Plan 和原房间，B 使用新方案，D 使用不加详细 Teach 的新协同写表方案。不能用本文的局部门禁或“表合法”代替这一实际验收。B 更换军表需新实验版本，不能在已经执行动作的原房中直接换军表。D 的具体输入/版本与同一对手、地图、任务绑定仍待落盘。

原 ABC Native A59 / B49 / C72，封口时间2026-10-13T03:10:17.257Z，尚未续跑。三组只改变 Terran，完整 Zerg 对手相同且没有开局 Plan。全工具实际 unknown 审计仍开放；不能仅因写表门通过就解除对局停点。

## 已完成的定点修复

1. **实际 Product→Workspace→Foundation 接线**：仅补尚未完成的 Foundation 范围，不重跑已越过的合同和审核捕获。独立本地 PID8357 正常退出0，completed/passed 标记真实存在，用时179.787秒。模型请求捕获到了8个已选单位及冻结能力来源；0 Provider、0 Room writes。此前55秒观察器空输出不再被当作通过。此次耗时是隔离产品初始化/本地捕获，不是单个模型动作性能。
2. **接受 Teach 后事件 revision 与已教快照身份**：原真实 v46 r5 的军表/路线/进场不变，但接受事件把 r4 推进为 r5，旧代码因此重新生成另一 handoffHash，无法晋升。仅在接受来源、当前候选和路线严格匹配时，复用已教 sourceRevision，并仍从当前事实重建快照；实际改变路线或候选不会复用。正常 Node 进程真实 RED→唯一 GREEN，原 r4 来源、2000军表和进场保持。仅证明可建立晋升桥接，不代表原计划已通过来源审核。
3. **计分主体来源证据**：新详细 Teach/Foundation/深化/审核共享同一冻结任务回执的双席计分表。此 Hold Position 的 P2 自身2/4是合计2VP，P1 自身1/3加中立5是3VP；翻转P2自身点的相对变化为3，不是4。通用数学工具只证明用户输入数字的算术，不能证明点归属/计分前提。新字段不证明已经控点，不包含击杀Supply得分；缺权威来源仍为 typed unknown，不伪造0。
4. **审核/自动修复中的策略版本接线**：详细审核要求由会话 `unit_role_comparison_v1` 显式传入，不再仅靠用途文本标题。实际修订即使更换标题，冻结能力/编制/双席计分来源仍进入下一轮审核和修复；历史 v5/v6 未迁移、付费原文未改。

具体修改：`iterative-roster-teach-handoff-v1.mjs`、`mission-marker-scoring-arithmetic-v1.mjs`、`roster-strategist-runtime-v1.mjs`、`roster-final-plan-review-v1.mjs`、Workspace service、Product module；三个具体 bug 的局部脚本保留红绿证据。没有改 Native 计分规则或加入策略权重。

## 验证证据边界

原记录在 `build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/`：

- `selection-justification-foundation-v48.private.json`：仅剩余 Foundation，passed。
- `accepted-teach-handoff-red-v48.private.json` / `accepted-teach-handoff-green-v48.private.json`：真实 r5 来源身份 bug，passed。
- `scoring-actor-evidence-fixed-green-v48.private.json`：计分来源投影 passed；前两条 scoring 记录为夹具误读 sourceFacts 包装，不冒称有效生产 RED，原样保留。
- `selection-review-policy-red-v48.private.json` / `selection-review-policy-green-v48.private.json`：仅显式策略版本传递，passed，不重复已通过的计分断言。

一次 Node REPL 跨环境对象直接送入深相等 Builder 得到 round-trip drift；正常 Node 子进程没有该问题，未把观察环境差异当作生产规则缺陷修改。以上均0真实模型/0房写，不证明实际策略优越。

## 真实新 B 生产恢复点

独立写表 Host PID25039，`http://127.0.0.1:60039`，API `/starcraft-tmg-level3/roster-planning/v1`；`liveDeliberationAttached=true`，`liveRoomLaunchAttached=false`。同冻结数据、原 workspace、原地图配置，无重建 ABC。启动记录 `workspace-host-v48.launch.private.json`。

新会话 `iterative-web-c8738603-ea4c-466e-a5c9-73cf2e77cb55`：创建201、Run202各一次；modelContextVersion7、`unit_role_comparison_v1`、`skill_teach_roster_coevolution_v1`。真实选择已达2000分，正在进场审核/Teach，未完成详细论证及来源审核，不能声称“可进入对局”。创建/启动回执 `selection-production-v48.create.private.json` 与 `selection-production-v48.run.private.json`。超时先查原持久状态，不重发 Run。新旧费用分别保留，不清零，不把未知费用算0。

## 实际 Teach 准出要求

- 每个已选实例：实际任务、预设对手/场景、进场/地图路线、独特用途或重复配置理由。
- 使用能力：真实能力/阶段/搭档实例/距离和资源条件/动作衔接；未使用给出理由。英雄不能以空泛“光环”代替真实能力。
- 每个角色至少一个真实可选替代编制/升级/单位：优势、代价、未选依据。
- 最终组合的胜利路线、相对优势、代价与失效/重新规划条件有可解析来源；事实错误/关键无依据硬保证经来源审核纠正，不能以“字段都有”代替。
- 对 Teach 挑战有公开回应：保留、修订或回 Builder 改组合均可；不把更保守当作通过。军表/进场合法且最终审核无 Critical/High，才可报告可用于新 B。
- 实际比赛效果需随后比较；详细文本、合法性或审核通过本身不能证明胜率提高。公开论证和工具留给后续 Wiki，隐藏思维链不采集。

当前 T27/S272 5/6，T23/S248 33/36；主线剩 S248、S272、S249、S250 四片，有效完整对局0/12。新增 D 不擅自改写原12组矩阵。20地图长期范围保留，18图扩展后置。无代理/K3、刷新、删除、安装、提交、旧绿重跑或全量构建。
