# Ticket 23 / Slice 248 — Marine为何放弃射击冲锋，以及查询/执行同源修复

## 结论

原C组第3回合突击、声明前revision107。Marine3仍有射击选项，模型知道它的
C-14对Corpser或Swarmling有12颗命中骰，却选择冲锋凯瑞甘。公开理由是：
射击不能争夺中心或威胁英雄，冲锋可以增加marker5压力。它把单位最近距离
6.971寸小于最大13寸作为支持，同时承认“骰子和路径未确定”。

这是**工程证据缺口 + 未经计算支持的策略取舍**，不是没看到射击。
原记录没有attack_probability或近战收益查询，不能说已比较真实伤亡/得分。
12颗命中骰也不等于12命中或12伤害。该Marine实际购买Bayonet：单模型2次
攻击、5+命中、伤害1，无Surge；不能把所有Marine冲锋一概写成非法或永远禁用。
这一次的问题是预设可接敌收益，但选定队长事实上骰满也到不了。

来源是原已完成choice `choice-1bbb05cc…`，保存在
`C/actual-C107-charge-declaration-choice.private.json.gz`，不是重新问模型：

- 原selectedReason：6.971寸小于13寸、冲中心威胁凯瑞甘。
- 拒绝C-14理由：12颗骰对Corpser，但不能争夺中心或威胁凯瑞甘。
- 拒绝AGG-12理由：2颗骰对Corpser，称即时价值不如冲锋。
- informationNeeds把attack_probability标为not_applicable：所选是冲锋而非射击。
- 共4条关系查询和1条声明实例化查询，没有实际冲锋路径/近战收益查询。

## 三种距离不能混用

| 项目 | 原局面数值 | 含义 |
| --- | ---: | --- |
| 单位最近底盘距 | 6.971寸 | 全单位中最近两个底盘，不是指定队长路线 |
| 指定队长到声明目标的直线底盘距 | 8.431寸 | 接敌所需直线移动下界7.431寸 |
| 同一队长的受阻路径保守下界 | 21.062寸 | 同执行规则证书证明所有支持路径都超过上限 |
| 最大冲锋移动 | 13寸 | Speed7+骰子6；这名队长任何骰子结果都失败 |

实际失败结算已在原C109 Apply/签名Replay/UI闭合，参见C108停点记录。
这张证书只证明原指定model1，不能未经计算宣告其它领队、其它目标都不能冲锋。

## 本次必要修改

1. `official-selected-roster-melee-action-runtime-v1.mjs`：增加只读声明路径
   证据入口，使用**与实际失败结算同一个**距离/占用横截面证明。最大骰只用于
   假设上限，不执行、不重掷、不改变原声明action或domain身份。
2. `room-backed-spatial-rules-query-adapter-v1.mjs`：现有声明实例化查询保留
   `proposalAccepted:true`，另给出chargePathEvidence。声明合法与成功可达分开。
3. `live-flash-decision-port-v1.mjs`：距离事实明确标注“不证明路径或冲锋成功”；
   路径证据绑定当前room/binding/revision/state/LegalSpace/seat、领队和目标。
   未支持或缺证据保持unknown。最终Host校验若才发现模型未见的必败证据，保留
   原付费返回/查询/长期Plan并交回Planner重新评估；已见同证据不反复重规划，
   不排除整个Charge域、不自动选择射击、不修改策略Skill/权重。

原已接受历史不回退、不重演。以上是正确性源码修改，**尚未加载在线共同清单**。
当前B111独立求解停点仍开放；必须修正后同版恢复三原房，不能单独热换C。

## 唯一定点门的真实范围

`scripts/verify-ticket-23-slice-248-charge-query-execution-evidence-v1.mjs`。
原C107状态由不含位移的声明逆操作精确恢复，完整hash与原权威107完全一致；
没有伪造位置或重建实验房间。原真实V1→V6军表构造与声明actionHash保持。

首83245仅夹具漏传Adapter原生currentLegalSpaceDomain，在求解前失败；修正
该明确参数后84320正常到实际症状：`C107_QUERY_OMITS_EXECUTION_PATH_FAILURE_EVIDENCE`。
必要源码修改后唯一89918/exit0、28.190秒：

- 查询证书hash adf935a0…与原C108执行结算域证书相同。
- 模型投影保留21.062>13寸必败结论，旧单位距离不再冒充可达。
- 改领队和过期revision不复用该证据；普通声明仍合法。
- 新Host-only事实返回Planner；已知相同事实不重复回送。
- 所有原付费返回、查询、当前Plan和候选域保留，无API密钥输出。

0 Provider、0原房写、无旧绿/无关门重跑。该门未调用新模型，**尚未验证新模型
是否改变选择、完整在线纠错循环、完整回合或策略优劣**，不冒称高策略已保证。
三轮记录分别为 `C/C107-query-execution-evidence-{red,native-red,green}.private.json`。

仍T23 33/36、T27 5/6；剩248/272/249/250共4片、完整实验0/12。
