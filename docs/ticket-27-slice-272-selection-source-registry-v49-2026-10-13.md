# T27 / S272 v49：详细 Teach 的来源登记修复；原 A/C 独立恢复

本文件保留当时停点。最新状态以 [v50 漏审与实际后台推进](ticket-27-slice-272-opponent-claim-coverage-v50-2026-10-13.md) 为准：A/C 已原房产生新Apply；common-v48-acr2是权威，acr1还曾因缺A原Plan目录失败。B已实际复用付费回复/自动改4High并二审0High，但对手假设计分仍因漏审而不合格；不得照此历史文件重启旧Host或重新Run。

## 用户顺序与当前结论

先确认最新 B 的详细严格 Teach 有效，再比较最初旧 B、启用最新 B 与无详细 Teach 的新方案 D。用户随后允许不受影响的 A/C 先后台恢复。A/C 保留原军表、Plan、房间和历史；B/D 不因局部门禁通过就进入对战。

详细标准的真实调用已经生效：新会话 v7 收到初始胜利路线、冻结能力、双席计分证据，完成 Foundation、挑战、回应，并返回8个已选单位的用途/配合/未选方案以及组合优劣论证。但这不等于事实审核已通过：公开回复仍含“P2自身2/4每轮4VP”的错误前提，若保留到最终 Plan 必须纠正。未知几何不得当成有效控制/火力证明。

## 实际失败及定点修复

同一生产会话 `iterative-web-c8738603-ea4c-466e-a5c9-73cf2e77cb55` 的 Teach `rws-6c164d9d-406a-425a-9f83-688bbe629226` 已完成6条付费回复（Foundation、挑战、回应、3次深化），三次深化补正后05:28:20Z以 `ROSTER_SELECTION_JUSTIFICATION_INCOMPLETE` 停止，无最终Plan/来源审核/房间准入。全部 dispatch completed，原始回复和费用保留；不无限买第四次同样的回复。

来源登记确有合同缺口：给模型的 sealed nodes 包括 `mission-marker-scoring-by-actor`、`candidate-map-access`、进场安排和实际候选，但论证校验器只登记 Unit/Skill/tool 子集，真实节点名称与精确来源哈希也被当成虚构引用。模型第三次改用节点名仍被同样拒绝。

修改仅两产品源：

- `roster-selection-justification-v1.mjs`：新增 scoped prompt-source registry。校验实际节点完整哈希，登记唯一节点名以及该节点实际包含的候选/回执/进场哈希别名。任意同前缀字符串、其它候选哈希、改变内容但沿用旧节点hash仍拒绝；引用解析不是来源事实或策略真值证明。
- `roster-strategist-runtime-v1.mjs`：当前深化校验取得同一 comparisonNodes 的登记项。原初次请求、上下文、已付费模型原文不重写；历史v5/v6不增新要求，不改 Native/在线动作决策算法。

只新增针对这一真实失败的 `verify-ticket-27-slice-272-selection-prompt-references-v1.mjs`：RED49238 实际第三条回复被上述节点名拒绝；唯一GREEN50055通过，8单位原文hash保持，伪造候选/节点内容漂移仍拒绝。此门是实际付费输出加来源引用编译夹具，不冒充整条Provider请求、Native几何或来源事实审核；0新Provider、0房写。旧已通过门均未重跑。

## 同一 B 续跑恢复点

v48写表Host25039在六条dispatch全部完成的停点精确关闭。v49独立Host50852，`http://127.0.0.1:60727`，仍无Room launch，原workspace/原会话不变。同一 `/iterative/sessions/:id/run` 续跑202各一次，记录 `selection-production-v49.resume.private.json`。使用既有明确修复后一次补验授权；优先复用原付费谱系，尚未证明复用、晋升或最终来源审核完成。

新旧生成使用同一被冻结的2000分 Standard/Hold Position/Gauntlet/standard-d6-1条件。原始B比较基准已准确定位：`B/plan-workspace/drafts/rws-929b02a7-fc43-4eb6-9c60-1c7894faf6e9.json`，原计划 `ba8a49a58d177836842c57746437c0c6d3fc8d474fa20fa0d25d9eed3ea6f389`；不是v43锁表候选，也不是v46无详细论证候选。仅保存只读比较基准，最终差异与效果报告待新B合格。

## A/C 后台恢复（不依赖 B）

从原 Native A59/C72恢复，两者第二回合Movement；原B49不启动。首次本轮Hosts46720/46721在准入前因 `SLICE248_CURRENT_WEB_EXPORT_STALE` 退出，0新动作。根因是启动调用遗漏 `STARCRAFT_TMG_PRODUCT_WEB_ROOT`，因此用了默认2026-09-29的dist，而不是已有且正确的2026-10-10统一导出；没有为此改校验器或重复构建。

已仅修启动环境并使用新日志前缀，原Hosts53552/53563、startup53567，配置 `common-v48-acr1-startup-config.private.json`，监控/启动脚本同前缀，版本 `s248-v49-ac-correct-web-root-20261013`。同一 Web export/在线代码，A的固定Plan、C无开局Plan不变；B离线来源修复不改两组在线战术/Rules。待ready/driver/下一动作回执，不把进程启动当作已执行。

监控保留原分账/未知费用，无cost cap、每¥100提醒，真实新High失败则安全封口A/C。独立B的离线失败不停止不受影响的A/C。保留历史停止/错误启动记录，不改为成功，不删除房间/动作/骰子/记忆。

## 剩余交付

1. 同一B付费停点重验→实际详细论证与来源事实审核→可读表/Plan；确认英雄用途、搭档/CP/顺序、真实替代取舍，不以字数/字段/仅合法性判合格。
2. 新B合格后才输出与最初B差异；绑定D为新协同写表但不加详细论证的对照，核对共享条件/同Zerg对手，再启动对应对战版本。不在旧B进行中换表。
3. 原A/C后台持续执行与全工具unknown审计；随后合并对局证据进入复盘/Wiki/Skill实验。新D不擅自改写既有12组总矩阵。

T27/S272 5/6，T23/S248 33/36，主线余 S248、S272、S249、S250 四片，完整有效对局0/12；20地图长期范围保持、18图扩展后置。无代理/K3、刷新、删除、安装、提交、无关新测试或全量验证。
