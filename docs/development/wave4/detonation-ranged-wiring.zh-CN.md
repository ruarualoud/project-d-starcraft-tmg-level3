# W4-02：Detonation 远程所有者后继

Infested Marine／Trooper 的两条 Detonation 已接入**原生远程攻击所有者**，不是阵亡后补放效果。已确定的伤亡模型保持在场，先开共用反应窗口、支付 1 BM、结算区域 HITS，再从封存的骰子和伤亡选择继续原攻击。其他伤害／移除所有者、嵌套和多目标父批次仍待；本批不计成完整新增原子准出，累计保持 **6/18**。

| 稳定定义 ID | 本批实际消费者 |
| --- | --- |
| `unit:infested_marine/detonation-any-phase@1` | 精确 Reaction 来源 → 原生 ranged casualty 封存点 → Before Casualty 保留层 → Reaction Family 的 BM／频率／优先权 → 共用自动 HITS、防御骰池和伤亡 → 原攻击恢复。每个本批待移除模型产生 HITS 1(1)。 |
| `unit:infested_trooper/detonation-any-phase@1` | 同一链路，独立来源与数值，每个本批待移除模型产生 HITS 1(2)。 |

范围从仍在场的单位实际底座测量，保留待移除模型；后续伤害分配不能再次选择已分配的模型。恢复时保持原伤亡选择，并保留中断期间对其他模型造成的伤害及新标记。源定义、费用和触发依旧精确匹配；普通旧绑定没有新政策，保留原结算。

[原生三分支](evidence/detonation-ranged-host.public.json)共 **16 条签名动作**：Marine 使用（6）、Marine 拒绝（4）、Trooper 使用（6），均幂等和完整 journal 冷重放通过。Marine 使用分支的 HITS 实际消灭原攻击者 Goliath，已掷出的原攻击仍完成结算。Trooper 分支原攻击者存活，未把这个分支写成阵亡证明。原攻击的 resolution hash 和伤亡模型选择保持相同，没有重新 instantiate／重掷原骰。

这些是具名工程棋位：使用真实军表与新单位数据，初始 Goliath 只剩 1 Wound；感染步兵携带已声明的非致命伤害标记，以覆盖伤亡前中断。Infested Marine／Trooper 的 32 mm 底座仍是既有工程估算。没有把声明的初始伤害写成此前实际攻击的结果。

[恢复与账本审计](evidence/before-casualty-compat.public.json)检查每房仅一条原攻击记录、原伤亡选择不变，以及原攻击者的 Supply 损失只记录一次。它还以当前代码冷重放了旧 Precision、Medic／Munitions 和 Warden 完整回合三房的 **30 条既有动作**；运行时描述符和最终 Envelope 均完全一致，未添加旧房动作。[两项组件情形](evidence/before-casualty-reservation-component.public.json)另验保留／嵌套分配与原标记恢复，清楚标为声明组件输入、0 Native 动作。

Web 验收从两房实际签名的伤亡前前缀开始，共 **8 次显式确认动作**，继续 Detonation 与完整 HITS 后继。两个人类席位以 1500px／390px 独立浏览器完成 Preview 只读、确认、重放、刷新及恢复重进，页面错误 0；原攻击 hash 保持相同。见[远程 Detonation Web](evidence/detonation-ranged-web.public.json)、[手机实际表单](evidence/detonation-marine-mobile.png)和[Harness 回执](evidence/detonation-ranged-harness.public.json)。5484 已关闭。本页只覆盖远程所有者，未替代整版 Builder／大厅或两种规模完整对局。

未完成的接口与具体停点见[接线工作台](detonation-continuation-workbench.zh-CN.md)。下一步是近战与 HITS 的同一保留／恢复、双方 Detonation 嵌套、多目标及直接移除／Disengage／Consume 等触发入口；全部相关消费者完成后才计入该新增原子。

39 条来源阻断继续隔离，估算几何没有提升为官方实测。付费模型、K3、AI 对局、复盘与生产发布继续暂停，零模型调用，`trainingTruth: false`。
