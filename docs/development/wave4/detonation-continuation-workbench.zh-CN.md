# Detonation 接线工作台（进行中）

整版任务保持活动；前一批已推送 `5920f4c`。远程所有者现已通过原生3分支16动作、Web2房8动作；见[远程接线报告](detonation-ranged-wiring.zh-CN.md)。该新增原子仍未全消费者准出，累计6/18。

已写：两条精确 Detonation 反应来源、`before_casualty_batch` 触发及共用 BM 支付；按仍在场的全单位底座测量 Enemy Units Within 2，HITS 数取本批将移除的模型数，Marine／Trooper 伤害分别 1／2。纯组件保留层可冻结已选择伤亡，暂留模型与 Supply，并将已分配模型排除出嵌套普通伤害；恢复时保留后来伤害标记，拒绝重复恢复。旧 Native 冻结伤亡域哈希与无新政策分支字节一致。

组件命令 `node scripts/verify-wave4-before-casualty-reservation.mjs` 已通过，含两条精确来源和BM反应效果；其中伤害批次和时点为声明组件输入、0 Native动作。原生远程另由 `verify-wave4-detonation-ranged.mjs` 负责；`verify-wave4-before-casualty-compat.mjs` 冷重放旧3房30动作并审计新3房原骰、原选择与损失账。

待实现的真实后继：

1. Ranged 已接：`settleOfficialSelectedRosterRangedResolvedChanceV1` 保存原 action／resolvedChance／casualty，`resumeOfficialSelectedRosterRangedBeforeCasualtyV1` 从封存结算继续，不重新 instantiate 或掷骰；原攻击者实际在反应中阵亡的分支已验。运行时3.227.0、政策v1目前只准单目标远程父批次；当前动态HITS区域可有其来源允许的敌军目标，但未完成嵌套／多目标父批次。
2. 同一门接 melee 的 `settleDamageAction`、automatic HITS 的最终 casualty settlement，再覆盖直接移除／Disengage／Consume／Stukov 杀死友军等实际消费者。仅远程样例不能算完整 Detonation。
3. 暂停父节点用可持久化栈；反应可能令另一方感染步兵受伤并再次 Detonate。已分配模型仍在场供本次区域测量，但不能被嵌套伤害再选择移除；最终只按原选择移除一次。总伤害已分配后的余数先记入可继续受伤的单位标记。
4. 多目标原批次需要保存所有结算行；没有伤亡的行也须保留新伤害标记，避免嵌套伤害后被旧余数覆盖。现组件 reserve 只支持非空伤亡行，扩展此项时单列验证。
5. 反应窗口须保留原 Active Player／Activation ID；Detonation 的使用方可能是另一方。HITS 自己的行动席位仍属反应使用方。`official-melee-pool-choice-runtime-v1` 的护甲／Evade 窗口及共享 Damage Received 入口需要按新来源传递原激活上下文，不能用反应施放者替代原主动玩家。旧来源默认分支不改。
6. 原 HITS 父节点／原反应窗口可能被子 HITS 暂时占用同一槽；保存并恢复，重建仅依赖当前事实的校验哈希，不重掷已保存骰子。主批次真正恢复后才发布攻击完成／伤亡／Supply 事件和后继观察器，避免提前触发或重复 Universal Carrier、Infestation、Lunge 等。
7. 多个单位同批次将有伤亡时，反应域要能选择实际来源单位；当前单一 `targetPieceId`／reservation witness 要扩为具名列表，逐来源重验。每玩家每激活一次、每单位同名每回合一次继续由共用 Reaction Family 执行。
8. 由新 roster 选项安装政策，Root 运行时要求实际 Detonation／HITS／各伤亡所有者齐备并提升版本。旧房不装政策，新增来源尚未完成时不得进入正式 Wave4 工厂。

验收至少包含：Marine／Trooper、接受／拒绝／无 BM／反应额度已用、严格 2 英寸和多个敌军、阵亡前几何、原攻击者被反应消灭、双方 Detonation 嵌套、原骰池和原伤亡选择不变、Supply 只记实际移除、持久化恢复、完整回合和 Web 显式选择。39 来源阻断和各暂停项保持；估算底座不提升为官方实测。
