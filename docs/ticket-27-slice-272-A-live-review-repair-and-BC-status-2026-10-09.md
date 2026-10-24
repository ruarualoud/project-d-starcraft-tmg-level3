# T27 / S272 — A真实续审、五条修订及B/C现状

## 本批交付

A的计划问题已修复到**v6正式审核通过、导出成功**，尚未创建或运行A对局。
不能将这一交付写成三组对局完成、所有写表规模稳定或策略效果通过。

[B军表与开局计划中文阅读版](ticket-23-B-roster-and-opening-plan-readable-2026-10-09.md)。

## A原来停在哪里

原v5计划正文完整，失败的是第一个来源审核分片。旧请求有23745输入/32768输出
单位、已知计费，但旧失败分支没有保存不完整原文或受控终止原因。因此不能仅凭
达到输出上限就宣称它一定是容量截断，更不能把残缺返回当成通过。

已验证的三文件修复此前没有加载到实际工作台。本批先确认工作台planningBusy=false、
三会话均planned，然后正常关闭旧PID8211，同一dataDirectory加载新PID61049。
三份完整草稿字节相同，0加载收费；最新地址从共享build的
`workspace-current-entry.json`恢复，不要复用旧53055地址。

新审核保留失败原文/usage；只有服务商明确max_output_tokens才分拆受影响片，
每片仍携带完整cross-claim/facts，已完成结果可以复用。原历史未知原因失败不伪造
成容量检查点。这一轮真实返回均完整，没有触发递归分拆；不能说真实容量分拆
分支已在本批执行过，其对应源门仍是此前的合成回归证据。

用户本轮明确要求修复A后启动一次v5续审。7次真实Flash返回覆盖50/50声明，
但产生5条High。最初状态汇报误按大写severity过滤，本批已更正；正式合同使用
小写`high`。完整审核结束不等于准入通过。

## 五条实际修订

| 声明 | 问题 | 修订 |
| --- | --- | --- |
| Marine3角色 | 把仅有数值VP行的27e46bf9…回执归因为M5退化例子 | 撤回该归因；M5角色只作为任务事实与计划假设 |
| Marine3 Combat Shield角色 | 重复同一错误回执归因 | 同样撤回，不伪造回执内容 |
| Raynor角色 | Orders使用没有到场时间限定 | 明确第4回合实际合法进场后才可用 |
| Goliath2角色 | 双平台冗余没有到场时间限定 | 明确第3回合实际合法进场后才成立 |
| Goliath2 Haywire角色 | 双向反装甲没有到场时间限定 | 同样限定为第3回合起的条件计划 |

使用既有`targetedClaimPaths`精准修订能力，1次模型调用产生v6。只改五个
`publicPurposeText`。完整军表、进场schedule、deploymentConcept、scoreRoute和
publicSummary与v5相同，不重新写表，不注入新的游戏策略。

接口要求锁定计划修订携带deploymentConcept，并且triggerIds必须引用已有
invalidationTrigger；两个入口请求因不满足该合同而被409/400拒绝，均0模型调用。
正确请求使用`inv-authority-mismatch`，声明路径放targetedClaimPaths，不放triggerIds。

## 最终验证及成本

五个来源声明参与完整cross-claim及回合/得分关系，新v6不能沿用v5审核作为
当前版本准入证据。因此仅追加一次当前计划7片来源审核，不重跑规则器/Skill/
构建或既有绿色代码门禁。最终结果：

- 50/50声明、7片完成；Critical0、High0，Medium42、Low46。
- `blockingHighFindings=false`，`reviewRequiredForHandoff=false`。
- 正式计划导出HTTP200；v6计划`024168283b59dd6d377f11a85d719d253dec4a185ffc8be4b3ead39fc22acae0`。
- 旧28份retainedOutputs完整不变，原军表和schedule完整不变。
- 本轮15次调用（7续审＋1精准修订＋7最终审核），332594单位，按当前价快照
  增量估CNY1.061379；A累计44calls/1589373units，当前价快照重估CNY5.054991。
  旧快照CNY1.996806与本批起点重估CNY3.993612不是额外扣费或计费清零，
  对账需使用同一pricing snapshot；不以估计值替代服务商实际账单。
- 本批没有新代码、新测试、旧绿重跑、代理/K3、数据刷新、安装、删除或提交。

权威证据在共享three-arm build：
`A-v5-adaptive-source-load-continuity-20261009.json`、
`A-v5-real-review-completed-20261009.json`、
`A-five-cited-claims-exact-repair-proof-20261009.json`、
`A-v6-real-final-review-completed-20261009.json`及
`A-v6-source-reviewed-final-export-20261009.json`。

## B/C实际交战，不按动作总数冒充交战次数

两场均第2回合Assault，正式比分均0:0，本回合尚未计分。当前回合Supply-loss
计分账本为0，不代表从未损失模型或HP。只有完整战局才能比较长期策略效果。

| 组别 | 实际交战 | 当前停止点 |
| --- | --- | --- |
| B：从头写表＋计划 | r34/r114两次射击启动；r111虫族冲锋声明、r112失败结算；r119巨人主动冲锋声明但尚未结算。近战攻击0。 | r119后Provider传输失败，普通Web26588已exit1；Host4368正式drive0005 completed/blocked。 |
| C：固定表无开局计划 | r97/98/99是同一Marine3激活分别用三种武器射击Kerrigan，不是三次独立交战；冲锋/近战0。 | r100后Action语义纠错三轮失败；Web86307已exit1，Host83329正式drive0009 completed/blocked。 |

B已经有主动射击/冲锋，并非完全缩着；但交战仍不密集。C仍以持点和远程威胁
控制为主，目前不能称高频交战。两者都没有已经通过“缩着刷分”获利：本回合
计分尚未执行。不能由此断言策略已好或必然过于保守。

B公开Run117理由接受17模型Raptor预计约1.9模型伤亡、Supply不变的风险，向
中央推进，但未立即进入控制距离。冲锋119公开目的是限制快速翻点单位。
C当前拟选Swarmling Run到marker2接近区，其主理由/风险已承认Goliath2的当前
Scatter Missiles火力；然而scoreOrPositionValue仍称“outside every current-round
enemy fire band”，因此High拦截。尚未证明该候选几何非法，也未证明拦截误报；
需要在同一完整已付费返回与精确query证据上修复矛盾说明链路。

B最新已知估费CNY92.590496/264calls/71515007units；另有一次失败请求
`usageKnown=0,providerMayHaveBeenCalled=1`，费用未知，不能记为免费或盲目重买。
C估费CNY82.032935/229calls/62844445units；六次本停点返回均已完成结算并保留。

现有截图：B目录`0745-r119-player1-charge-complete-board-applied.png`，
C目录`0632-r099-player1-ranged_attack-complete-board-applied.png`，均在screenshots下。
频率和停止证据：`BC-combat-frequency-and-current-stops-20261009.json`。

## 下一步和边界

### B计划连续性：本批新发现，尚未修复

房间绑定与原计划文件均为c589ab9c…，不是拿错另一份计划。实际六次Deploy
中三次首轮与原schedule不同：9模型Marine R3→R1(r3)、6模型Marine R4→R1(r18)、
首批Goliath R1→R2(r72)。首批第二Medic及R2 Marauder截至r119未见Deploy。
六次Planner的planRevision均null、reconstructedPlanRevision均false，却均称
continue/sound。r8仍把唯一巨人称第二巨人并用错误Supply加法；r72 assessment
描述的是choose_first_actor/R1预站位，实际动作却是R2 Deploy。

这是公开计划/动作/修订记录不一致，不因偏离建议schedule就认定动作非法。
尚未确认是旧assessment输入、模型输出还是持久记忆边界造成，不能用策略差
掩盖工程问题，也不能把“B有计划输入”包装成“B正确延续计划”。具体证据
`B-opening-plan-vs-actual-deployment-20261009.json`；人工版已并排列原计划和实况。

1. 修C同份决策的风险承认/无风险收益句矛盾，复用原付费结果、保持所选策略和
   合法落位证据；不得为了让它激进而改Prompt权重。
2. 对B失败请求走原生传输/计费恢复，保留未知费用，不能因High或超时重建房间。
3. 两场恢复时同SQLite一次加载已改好的每组CNY200参数；当前仍为旧160总限/
   80每席/notice100，尚未应用。三个财务账独立，旧费用不清零。
4. A计划已准备好，但A对局未开始；以相同冻结地图/对手配置完成后续实验。
5. 定位B上述assessment与计划修订来源，记录合法调整的实际后续安排；不改写
   历史原计划来假装一致。此项未完成前，不认证带计划策略效果。

T23仍33/36，T27仍5/6；主线248/249/250/272四片开放，完整对局0/3。
地图9官方选定布局＋2优先经典图的现有证据保持，后置18经典图及全目标不缩减。

Harness loop:true；路由:harness_optimizer_prompt/roster_strategist及原房
selfplay_agent_prompt；工具:原工作台review/revise/export、原房manifest/drive-status、
只读SQLite/动作记录。真实策略证据只来自公开理由与回执，不存储隐藏思维链。
本批不改变对局记忆或生产Skill，不提升trainingTruth。任何旧输出变更、锁定军表/
schedule变更、覆盖缺失或准入High均使本交付失效。
