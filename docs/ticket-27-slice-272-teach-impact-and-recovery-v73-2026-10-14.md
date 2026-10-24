# T27 / S272 — 自动修复实际结果与 A/B Teach 策略影响

T27 5/6，T23 33/36；主线剩248/272/249/250四片，完整对局0/12。本文覆盖v72/v73修复与2026-10-14只读复核，不代表新Teach策略效果通过。

## 已完成的修复

- 审核自身的绑定/判断合同错误返回审核器纠错，不再要求Plan改写正确事实。逐项断点复用已付费结果，不清空历史。
- 从实际公开声明目录解析跨字段依赖；只提及正确反例不自动变成待修字段；真正依赖中的假设支持文字和历史未解项保留到新审核。
- 原句之外的额外事实检查保留为上下文，不能证明或否定目标原句；原句中的真实矛盾和缺失来源仍拒绝。
- 真实D自动修复至Plan v7（1281cacf0c3142244874b012a3c2f297ebabb52afe53d6bada095e62d5c76efa），修了得分路线、控制说明、H4假设及两条支持文字。军表/进场日程不变，当前未解High为0，真实模型已接受并准备房间。
- 本段D工作台新增4calls、239448输入/9049输出、248497units；按历史3/9价格估算约¥0.800。另有迭代接受请求，须独立账本累加，以上不是全账。原费用/未知费用保留。

具体bug门禁：review-owner-routing-v72真实RED/唯一GREEN；review-extra-premises-v73中D零调用回放和A错误依赖范围已通过，仅剩H4支持句修正后使用remaining-dependency-only验证一次。没有重跑通过部分或全量验证。

## A/B未解项是否影响策略

实际来源为两个工作台draft的teachFramework.state.synthesis/evidence，以及原生查询回执。A：12问中9 unresolved、2 retain、1 revise；B：8问中5 unresolved、3 revise。问题数量不是规则原子或未修bug数量。

主要未解项影响胜利路线可兑现性，不是纯记录问题：

| 缺口 | 当前证据 | 可能影响 |
| --- | --- | --- |
| 占点及减员后控制 | 查询的是空场；假设摆位压墙/重叠，后续分支不存在 | 三点得分基础、损失后守几个点尚未证明 |
| 战损与交换 | A无有效攻击局面；B补出了三条去地形条件攻击估计 | 不能据此证明本地图中可以靠击杀补足分差 |
| 精确移动/队形 | 缺当前动作域引用；通路见证不等于一次合法移动 | 到达时序、双翼覆盖和后续动作可能无法兑现 |
| 能力/工具匹配 | 用射击概率询问Crushing Grip，合同不覆盖该能力 | 无法证明该能力风险，不能把unknown当作低风险 |
| 替代军表机会成本 | budget_fit缺所选军表审计，重复返回缺前提 | 现表合法/花满不等于已比较替换组合收益 |

这些是证据生成、工具选用和自动恢复链路的问题；原生工具拒绝非法局面本身不是错误。不是所有未知都能消灭：对手未来选择、骰子和未来可见条件属于正常策略不确定性，应保持条件分支，而非伪造确定答案。

另有A回答指出Marine数量文字与送入局面9模型不一致；这是待定点核对的主张，不能仅凭回答直接修改数据。

## 军表未变，策略是否明显变了

- A正式房仍绑定原Plan v4；本轮Teach建议增加“预计占点基础未形成”的重规划条件、明确击杀补分未定量。这些尚未应用到正式Plan。
- B此前的Teach已把“守1/3/5，2/4可选争夺”改成守点基础加2/4拒止/争夺的双线；撤回单Goliath兼顾双翼的未证实结论，并补充武器替换、单位角色、进场顺序等公开比较。
- B v9-v12主要改善理由与事实边界，例如Raynor武器替换的真实取舍、Goliath与Marauder进场次序可交换、进场路线长度不能当射程；军表及到达安排没有改变。
- **最新一轮定量Teach并未证明产生新的正式策略：A/B applicationStatus均为proposed_not_applied。** B最新accept_teach公开理由仍主要引用旧ch1-ch4，未论证新增三条攻击估计如何改变取舍。不能把接受/调用完成当作策略闭环完成。
- 缺少证据可能把模型推向“退守更少点”等保守建议；这只是待观察风险，尚无干净对照证明实际发生。修工具证据，不通过策略prompt强迫冒险或保守。

## 四组真实启动与新停点

共同代码标识s272-v73-review-scope-owner-and-related-claims-20261013。
2026-10-13T15:57:20Z四组Web驱动已启动；A/C保留原房，B/D使用正式产品准备房，没有重建原A/C。

- A：r129，第3回合Movement；新Provider调用被HTTP拒绝，16:00:01Z记录High provider_http_rejected（player2），未完成新动作。
- C：147→148，第2回合cleanup。
- B/D：各0→1，第1回合Movement，均为确定性生命周期动作，不是策略动作验证。
- 16:00:09Z监控写入四组联停请求。B/D progress的running是最后快照，不能据此宣称仍在正常推进；此处不宣称所有进程已退出。

证据目录：build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v72-four-arm-*；运行目录中的progress.json/failure.json。原记录、房间和账本不删除。

## 后续交付

1. 定位A真实HTTP拒绝及同步恢复停点，保留原房/已应用动作，不能用盲重试掩盖请求问题。
2. 打通带地形合法假设局面→查询当前动作域→正确工具→有效结果/原因驱动修正。未来未知与缺参错误分开。
3. 用有效证据使Teach明确保留/修订并落入可追踪Plan版本；A原房身份不静默替换。验证前不将四组称为新定量Teach效果实验。

本次未新增模型调用/测试，仅读取现有证据和更新记录；此前v72/v73源码修改涉及roster-final-plan-review、roster-review-premises、roster-public-claim-paths、roster-claim-repair-backlog、reviewed-plan-auto-repair及workspace-service。无子代理、安装、删除、官方数据更新或提交。

harnessLoopUsed=true；ctx2skillLoopUsed=true；targetGames=starcraft-tmg；roleRoutes=fact_probe/harness_optimizer/rule_skill_builder。保留公开理由与工具结果，不采集隐藏思维链；trainingTruth=false、canAffectRules=false、无Skill晋级。
