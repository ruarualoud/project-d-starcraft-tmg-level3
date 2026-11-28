# Detonation 攻击声明与目标反应后继

本批按 W4-02 接线，完整原子仍 **6/18**。政策1.5／Root3.236封存射击声明和目标反应父节点，原攻击者被Detonation杀死后仍完成已经掷骰、分配伤亡的原攻击。其他外部HITS所有者和直接移除仍待接，整版Wave4人人准入尚未完成。本批5原生分支82签名动作、2完整回合、Web3房13确认、当前/前批7房99原动作与旧版2房11原动作冷读通过。

## 实际原生消费者

| 来源／消费者 | 原生签名动作 | 验收行为 |
|---|---:|---|
| Nova Stealth／Head Shot | 7 | 原声明CP1只付一次，Nova实际阵亡；Damage3和CONCENTRATED FIRE(1)保留，原射击与声明完成各一次 |
| Siege Tank／Shaped Blast | 10 | Tank实际阵亡，PINPOINT／LOCKED IN声明及剩余模板批次照常完成 |
| Siege Tank／Smart Shells | 10 | Tank实际阵亡，INDIRECT／LONG RANGE与模板后继照常完成 |
| Defiler／Dark Swarm使用 | 26 | 实际Movement放Dark Swarm，Target反应使用占用该激活反应额度，Detonation不再出现；计分清理后到R2 Movement |
| Defiler／Dark Swarm拒绝 | 29 | 拒绝后Infested Marine实际Detonation，Goliath实际阵亡；恢复原射击、消费目标父节点一次，计分清理后到R2 Movement |

本批Detonation实际受体均为Infested Marine；不能据此给Infested Trooper登记这五条组合已验。两条来源共用同一后继内核，但逐ID覆盖仍分别登记。以上5分支82动作，另工程发布转换2分支2动作独立计数。

原生记录：

- [攻击声明证据](evidence/detonation-declaration.public.json)：`detonation-declaration-oKZBUx`，3分支27动作。
- [目标反应与完整回合](evidence/detonation-target.public.json)：`detonation-target-21AmRA`，2分支55动作。
- 每条动作均走Native LegalSpace、Preview、签名Apply与幂等；关闭重开后按原签名日志冷重放。

## Web与冷兼容

Head Shot从签名前缀完成3次确认，Shaped Blast完成6次，Dark Swarm拒绝后的Detonation完成4次。每房独立1500/390浏览器，两席只读Preview、显式确认、更新、恢复重进和Replay一致，页面错误0；只计前缀之后的13次确认。截图已人工检查，5484验收服务已关闭。局部Web没有覆盖整个回合；完整回合证据来自上述两条Native链。

[当前兼容](evidence/detonation-declared-current-cold.public.json)核对本批5房82原动作及前批Khassar8／双Overwatch9，共7房99动作，描述符和Envelope不变。[旧版兼容](evidence/target-declaration-legacy-cold.public.json)只读Head Shot5与Dark Swarm6，共11原动作、0新动作。工具闭环和逐定义范围见[消费者映射](evidence/detonation-declared-target-consumers.public.json)及[harness](evidence/detonation-declared-target-harness.public.json)。

## 修复与约束

`pendingOfficialAttackTargetReaction`和`pendingOfficialRangedAttackDeclaration`与原损伤父节点一起封存，子HITS拥有独立槽。原批次恢复后才消费目标反应和完成声明。阵亡来源仅可借有效封存父节点完成：核对哈希、回合、阶段、来源、原行动、武器和模板几何，不能以普通死单位重新发动攻击。

Head Shot首次验收发现阵亡Nova仍可结束激活。该记录已撤回通过，保留为[回归证据](evidence/detonation-declaration-regression.public.json)，计通过动作0。政策1.5关闭死单位的后行动窗口；新run重新验证。旧政策1.0–1.4保持原绑定输出。

完整回合场景从实际回合开始执行任务生命周期，不手工注入已计分回合。Supply通过R1实际损失事件和唯一entryHash核对；R2账本按规则重置，不把空新账本误读成漏记R1损失。Dark Swarm实际清理，原攻击骰与伤亡顺序不重掷、不重选。

## 工程发布依赖

新工程发布`wave4-u98-c88-r50-stukov-units-engineering-v2`重编Builder与单位特征，解决进口Terran转换政策仍绑定旧release的问题，保持`FACTION_UNIT_CONVERSION_RELEASE_MISMATCH`守卫。102/119记录的选择范围未扩张。旧工程V1仍供原签名房间只读重放。Raven是Flying而非Ground，Builder实际拒绝Stukov购买Raven；前批同方进口Raven双炮塔待办已纠正，[准入证据](evidence/stukov-import-scope.public.json)没有将其记作待实现消费者。

已审核的Power Lines／One Bridge Too Close仅在旧新记录哈希及payload完全一致、冻结官方PDF字节SHA一致时重新绑定；几何和审核证据原样保留。[篡改反例](evidence/deployment-rebinding.public.json)分别拒绝记录变化、PDF字节变化和旧几何变化。[实际转换](evidence/engineering-release-v2.public.json)中，进口Goliath Target Lock与Siege Tank Mode Transformation各实际支付1BM并冷恢复。

39条来源阻断、估算几何和13个已审核未接记录保持原范围。80mm炮塔底座仍是工程估算，正式Standard／Skirmish不据此准入。其他同步开发线不在本分支展开；付费模型、K3、AI对局、复盘及生产发布继续暂停，模型调用0。
