# Detonation：Khassar 委托攻击后继

本批 **6原生分支51次签名动作、Web2房10次显式确认通过**。复用Khassar委托行动、武器/IMPACT、反应支付、NLD与激活原子，扩展尚未完成的同一个Detonation新增语义；新增完整原子0，累计仍6/18。精确来源、分类与实际导出见[消费者映射](evidence/detonation-khassar-consumers.public.json)，闭环见[harness](evidence/detonation-khassar-harness.public.json)。

| 实际来源与分支 | 原生动作 | 结果 |
|---|---:|---|
| Marine：Khassar射击，代打者阵亡 | 8 | Adept实际被Detonation消灭，原射击仍完成；跳过对已阵亡代打者的NLD，原行动单位完成激活 |
| Marine：射击，代打者存活 | 7 | Detonation后原射击与NLD(3)继续 |
| Marine：射击，拒绝反应 | 5 | 原射击及NLD(3)各一次 |
| Trooper：Khassar近战 | 10 | 完整近战池/伤亡→Detonation→代打者阵亡→原行动单位结束 |
| Marine：Khassar冲锋 | 11 | 真实声明/成功路径/强制IMPACT池/伤亡→Detonation→原IMPACT及激活完成 |
| Marine：原行动单位阵亡，代打者存活 | 10 | Detonation对两支实际敌军HITS；High Templar阵亡，Adept仍结算NLD(3)，费用和激活不悬挂 |

政策1.4显式选择Root3.235，保存Khassar Shot/Fight/Charge父槽与近战序列。恢复时匹配封存原攻击、来源、阶段/回合、所有者及父哈希，随后完成原攻击；原来的代打者若已阵亡，不再要求其保留行动后窗口。原行动单位活着则获得自己的结束窗口，阵亡则直接按合法激活次序交接。旧政策和未准入组合守卫保留。

6房结算只读审计确认：势力卡耗尽事件和能力使用历史各一次；活代打者标记实际增加3且不移除模型，死代打者有效NLD为0并记明原因；活原行动单位确有一次结束事件，已阵亡者无假结束事件。原骰/伤亡次序保留，Supply只记实际移除，所有父槽与reservation均清空。所有原生动作幂等且关闭重开冷重放。

当前代码对本批6房51动作与前批Auto/双来源2房20动作，共8房71原动作冷读通过，描述符/Envelope一致。仓库内历史Khassar射击、近战、冲锋3房只读冷验，2+4+3共9个原动作保持，未提交新动作、未改历史文件。完整来源门仍要求其他消费者继续接通。

Web从Marine/Trooper具名签名前缀分别完成Detonation、子HITS、原攻击及原行动单位结束，各5次确认。1500/390两浏览器，预览只读，页面错误0，刷新/席位恢复/重放一致；手机页已查阅，5484已关闭。Web未从大厅写表开始，不替代整版人人验收。

复验：verify-wave4-detonation-khassar.mjs（支持签名断点）、verify-wave4-khassar-settlement.mjs、verify-wave4-khassar-legacy-cold.mjs、verify-wave4-detonation-v3-compat.mjs --khassar-only，以及具名Web cases。仍待Target/声明、其他外部HITS、Disengage/Consume直接移除和13个已审核记录、整版发布/Builder/大厅/媒体及500/2000分Web。39来源、工程估算和所有暂停保持；模型调用0，trainingTruth:false。
