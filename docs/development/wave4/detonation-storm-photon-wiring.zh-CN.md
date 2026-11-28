# Detonation 与风暴／运输入场

本批局部接线通过，整版人人任务继续。完整新增原子0，累计仍6/18；Detonation仍是待补完的新语义，不能以本批证据登记完整原子。39条来源阻断和工程估算边界保持。

| 实际原生消费者 | 使用／拒绝动作 | 完整回合 | 严格使用分支 |
|---|---:|---:|---|
| High Templar 实际施放 Psionic Storm | 28／25 | 2 | Detonation实际移除原High Templar |
| Overlord运输入场触发Photon Overcharge | 34／32 | 2 | Trooper Detonation实际移除敌方Zealot；Photon来源是卡牌 |

四支共119个签名动作，从实际Movement生产者经过伤亡前子链、原HITS恢复、任务计分／回合末效果／清理进入R2。原骰和原伤亡顺序、Supply只记一次、幂等、关闭重开冷重放均通过。没有自然结果控制房混入主门。原生证据：[Storm](evidence/detonation-storm.public.json)、[Photon](evidence/detonation-photon.public.json)。

Web两房10次显式确认，独立1500px／390px双席、只读预览、恢复重入和回放一致；[Storm](evidence/detonation-storm-web.public.json)与[Photon](evidence/detonation-photon-web.public.json)均通过。Web从各自原生签名前缀接入，不是Builder／大厅完整开局。手机证据：[Storm](evidence/detonation-storm-web-390.png)、[Photon第二席](evidence/detonation-photon-web-390.png)。伤亡表单仍只显示长哈希，手机上溢出；原截图保存在run内，W4-03必须改为可读模型摘要后再验收，不能把本批局部通过当作产品可用性完成。Photon Web沿用的originalSourceDeathVerified字段表示Detonation目标Zealot被移除，不表示卡牌来源死亡。

[当前及前批冷验](evidence/detonation-storm-photon-current-cold.public.json)核对六房177个原签名动作、原描述符和最终状态，新增动作0，包含本批四房及此前Bile／Drone使用房。旧Wave3玩家房未改；本批没有以新快照重建旧SQLite冒充原档。

政策1.7保存Storm Assault Order、Movement End及Photon父槽。Storm按真实购买的Psionic Storm、精确Gale冻结来源和Our Minds as One投影施付PE，执行Movement非致命效果、Assault标准伤害、原来源阵亡后完成及token清理。Root3.238使用原护甲政策1.0，行为与来源均固定。

Photon实际路径是合法Stukov军表的Overlord／Ventral Sacs：Movement设置Faction Indicator，敌方真实Move／Run接近，回合末从原购买后备清单入场。Burrow Ambush使用己方Entry Edge，不能列作Photon正例。官方FAQ1.3说明Omega Worm和Pylon底座也是己方Entry Edge，免受Photon；Zagara底座按其Entry Edge原文排除。临时运输标记不创建Entry Edge。来源：[官方FAQ](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf)，下载字节与冻结SHA256 65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213一致。Kerrigan军表感染步兵被真实Builder按Stukov标签拒绝，未使用非法跨势力组合。

Root3.239显式运输观察器承接Native Router已验证的入场事件，再打开Photon窗口。工程Round合同1.3核对来源bundle、实际Router和对应消费者，补齐回合末选择／预览／应用；源域使用battlefieldAssetPlan身份。Photon及子链完成前不提前刷新或交权，阶段外按当前First Player Marker优先权处理。Root3.240／HITS3.12选择护甲政策1.1，读取封存效果上下文；阶段外activationId和本激活序数均为null，原Photon与Detonation子HITS实际护甲池仍计回合序数。默认1.0未更改。

[只读回合边界](evidence/photon-round-boundary.public.json)核对原Photon两房：规则8.9先计分及终局检查，再执行回合末效果。晚发生损失只作为本轮Supply事实登记，不插入第二次计分或即时全灭奖励，随后正常清理到R2。[来源边界](evidence/photon-source-boundaries.public.json)仅五个观察器组件分支；[卡牌护甲上下文](evidence/card-armour-context.public.json)用真实失败点的复制诊断状态复现旧错误并核对修复。两者新增Native动作均0，不计入四个完整回合。

[逐ID消费者映射](evidence/detonation-storm-photon-consumers.public.json)明确Marine／Trooper Detonation属于新增语义的部分消费者；Storm／Photon属于已有原子的新组合；Ventral Sacs复用已有原子。来源、运行时入口、实际动作及Web分支逐项对应。[工具闭环](evidence/detonation-storm-photon-harness.public.json)不声明整版准入。执行入口：verify-wave4-detonation-storm-photon.mjs --kind=storm|photon；verify-wave4-detonation-v3-compat.mjs --storm-photon-only；verify-wave4-photon-round-boundary.mjs；verify-wave4-storm-photon-closure.mjs。

接着补Disengage／Consume直接移除与新增单位组合；其余13个已审核记录、整版发布／Builder／大厅／媒体及500／2000分双席继续。80mm炮塔仍仅工程估算；付费模型、K3、AI对局、复盘与生产发布保持暂停，模型调用0。
