# S272 — 写表与 Plan 六组实验，v274 / 2026-10-16

本任务先完成写表/Plan/Teach，不启动对局。旧 C/D 与旧12场对局实验记录不覆盖；本矩阵独立命名 roster-plan-matrix-v274。A/B 继续 fresh-generation-v264 的产品会话与旧账，不手改军表或Plan。

## 分组

共同条件：Standard 2000分、同一冻结官方快照/FAQ/Skill版本、Flash、相同产品 Run/工具/纠错/审核链路。只有下表变量改变；各组隔离草案/场景/账本。对手军表是明确标注的公开参考假设，不是预测成真或真实隐藏信息。

| 组 | 方式 | 规划方 | 参考对手 | 地图 |
|---|---|---|---|---|
| A | 固定军表，生成/修订Plan，Teach不可改表 | Terran Armed Forces | Kerrigan's Swarm | 当前 official standard-d6-1 |
| B | 从头联合写表+Plan，Teach可改二者 | Terran Armed Forces | Kerrigan's Swarm | 同A |
| C | 同B | Terran Armed Forces | Zerg Swarm | 同B |
| D | 同B | Terran Armed Forces | Daelaam（Protoss） | 同B |
| E | 同B | Terran Armed Forces | Kerrigan's Swarm | Daybreak 6.0.9 已验收语义来源；当前查询接线已核对，Plan尚未生成 |
| F | 同B，反向对抗 | Kerrigan's Swarm | Terran Armed Forces | 同B；规划席仍player1，避免同时改席位 |

冻结数据已确认四个势力键：tactical_cards:terran_armed_forces / kerrigan_s_swarm / zerg_swarm / daelaam。

## 本轮交付顺序

1. B混合动作协议错误转局部纠错：已修，真实request70候选RED→GREEN；不执行半条请求，不丢弃edits，拒绝动作计入既有纠错次数，原证据保留。
2. A输入事实修复：已修，实际Plan9复现了固定表没有Builder比较段就漏掉所有selectionUnitRules；现接同一冻结公共单位规则集，明确不是对手实际军表。入场回合明确为模型选定日程，不是规则最早合法回合。对应RED→GREEN；审核上下文v3_8使旧准出变为待复核。
3. A/B真实产品Run：待同版复核/纠错完成。计分主体矛盾、循环选择理由、入场计分时序及未回答的实质问题均需实际模型修订与检查，不手工替换Plan内容。
4. C/D/F真实对手接线已补：产品接受显式referenceArmyRecipes，Native初始状态和候选实验室共用；setup对手与实际参考不符即拒绝查询。目录默认势力、两类迭代工具/Teach均传递同一冻结setup。F实际产品反向初始化已确认双方正确且均2000分；最后独立工具传播检查的返回在上下文边界未观察到，不计为通过、不盲重跑。C/D参考名单均已通过原生完整组军审计，见下方证据；不是模型自行选出的我方最终表。
5. E当前地图接线：Daybreak 6.0.9原房r43/Replay真实坡道回执的bindingHash与导入来源一致；没有重放旧动作。以当前工厂重新编译同几何，计划端/实战端90组side/base/target结果一致，62个已有路线见证，28个同层控制见证缺失。后者不是证明不可达，不称全部路线均可通行；须由E实际Plan的具体需求继续调用地形/队形/移动工具。第一次验收脚本误把ok当证明，修为precision/result；已过10组保留，第二次只查余80组。所有检查0Provider/0对战Room。
6. C–F入口已扩展到既有产品Run观察器，使用独立目录/账本；新组不导入旧B的决策/Teach或费用。C现已进入真实iterative_roster_decision；D/E/F观察器已启动，须以各自progress与session确认实际阶段。仍待新鲜真实生成及逐组可读报告，不宣称启动就是策略通过。
7. A/B继续暴露的共同重复参数误拦截已定点修复：显式Native容器与外层字段逐值同型相等时，规范化去除冗余外层副本；字段冲突、别名映射和额外过滤仍进入纠错，不静默丢弃。保留原付费输出，归一化留痕。本次实际B输出RED→一次GREEN，0Provider；A/B请求安全步骤边界暂停后加载同版续行，不重置草案/旧账。
8. C实际0调用初始化发现`RELOCATION_SOURCE_DENOMINATOR_INVALID:27`：历史全来源编译器错误地用当前名单实例裁剪实现注册。修复为来源能力全集与实例子集分离，两者保存在同一来源包；完整原Terran/Kerrigan注册逐值等同，不给缺席单位创建动作。首个定点诊断超时不计通过；随后暴露独立审计仍读旧实例集，补同源接线后C实际产品初始化通过。没有删除25/252等当前冻结来源完整性检查。
9. D随后独立复现`STANDARD_ROOM_INITIAL_STATE_AUTHORITY_INVALID`：合法17Units被旧固定15Units假设拒绝。改为两种花费策略均核对实际pieces与完整Rules军表ID集合（唯一且逐项相同），精确2000及资源要求保持。D-only实际产品门通过，已绿C与旧A/B门不重跑。
10. 观察器维护：暂停的B原生状态是paused、pendingDecision为空，但观察器曾把待完成arrival阶段写成stopped；现按实际iterativeStatus区分维护暂停。仅0request/0dispatch/0calls/无session的失败初始化可用`--recover-unstarted`续同记录；不能拿它重放已付请求或清账。C已使用这一受限路径恢复。

## 当前运行位置（2026-10-17 CST，需重新读存活状态）

- A：原fresh-v264、原session，PID56146，Plan11的Teach进行中。
- B：原fresh-v264、原session，PID59938，合法2000/r5的Teach进行中。
- C：矩阵/C/fresh-generation-v274，PID75327，session `iterative-web-db483dfe-a404-42d9-9a7a-d986ffaae39c`，已开始真实决策；首次失败0调用原记录保留。
- D/E/F：矩阵各自fresh-generation-v274，PID76749/76750/76751；已各有真实session/付费回复，当前迭代写表Plan。D session `iterative-web-b75e6f04-517e-44d0-ad47-7aea16235594`；E `iterative-web-ad25d8e6-823b-45cb-bbba-ecd0e51990ad`；F `iterative-web-414929bf-60eb-4fed-b7a4-55053eebded5`。观察时C已早期Teach、D request3/E request3/F request2；这些数字不是最终完成次数。
- 所有使用普通产品Run；没有Battle launch端口，不写任何旧房间。最终六组验收仍0/6。

## 新组准备证据与限制

- 配置源：`content/roster-plan-experiment-matrix-v274.mjs`。C以普通large Zergling及其升级替换Kerrigan专属Raptor，才可成为合法Zerg Swarm参考表；因此是合法对手子势力/名单组合对照，不声称只改一个名称就完全隔离所有名单差异。
- C/D审计：`build/ticket-23-three-arm-performance-baseline-20261010-v1/roster-plan-matrix-v274/{C,D}-reference-army-audit.json`，两者`rules_audited_exact_2000`，原生核算，不手填成本。
- E源：地图工作树`build/ticket-24-daybreak-forward-inner-stairs-v6-9/candidate-binding.mjs`；坡道证据`build/ticket-24-daybreak-forward-inner-stairs-signed-room-v6-9/same-room-ramp-resume-evidence.json`。
- E新证据：同矩阵目录`E-map-preparation-report-v2.json`及`E-map-configuration.json`。编译`3e34d5ed47c09a4dfde96e7162ceed7f2676ccfede7d35b919e4290bb89e141b`，同冻结官方快照、Hold Position/GAUNTLET、54×36英寸/2000分。
- 拓扑差异：基线34掩体区域+9草地区域；E为8结构阻隔、7可站立高地、5断崖、10坡道、13水/熔岩阻隔区域。逻辑区域不是编译后的规则格数量。
- 新组命令形式：`node scripts/run-slice272-fresh-generation-v240.mjs <base> C --fresh-v274 --matrix-v274`（D/E/F同理）；同一脚本、同一产品API，不存在实验专用Plan修补。
- 门禁：旧A/B相关通过项未重跑；入口语法检查一次通过。不能宣称以上离线准备证明模型会正确使用工具或完整对局可用。

## 准出含义

- 工程错误、失败查询及关键事实缺口不能被unknown/缺依据/免责声明掩盖成通过。
- 未来对手行为仍然是假设：必须给条件、可观察信号和应对，不把未来不确定性伪装成已证事实。
- 单块理由必须解释用途、时序、位置、针对对象、替代方案与何时改选；不能仅称“已固定/日程已锁定”。事实绑定由Host负责，战略取舍由模型负责。
- 来源事实、查询结果和最终叙述相互矛盾时不能准出；正确的引文不自动使旁边的错误正文变对。
- 仅跑本次直接影响的门禁一次；保留真实失败和已付费输出。三轮不收敛按既定规则停点报告，不无限重试。
- 六组全部验收之前不称“稳定无错误”；单次成功也不是对所有未来模型输出的绝对保证。

## 当前统计

T27 5/6；T23 33/36；主线剩S272/S248/S249/S250共4片。新增C–F为S272规划验证组，尚未把历史整体12场对局计数改名或视为完成。
