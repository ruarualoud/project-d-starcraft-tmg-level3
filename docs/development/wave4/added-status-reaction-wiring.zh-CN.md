# 新增卡牌状态反应接线

两条新卡定义已接入冻结Wave4候选数据的原生与Web消费者。5个完整原生回合124签名动作、Web四房12次确认、15项边界检查及12房172个原动作独立冷恢复通过。新增原子0，累计仍7/18。主Builder仍102/119；私有108记录候选用于工程验收，整版人人入口尚未通过。

| 定义ID | 差分与原子数 | 实际消费者 |
| --- | --- | --- |
| `card:hive/brutal-instinct-any@1` | 已有原子的新组合，新增0 | 敌方实际Move后结束Movement激活；控制方选12英寸内友方Ground Hydralisk；卡耗竭，获得／失去BURROWED及相应HIDDEN；实际Move继续并移除状态 |
| `card:infested_command_center/parasitic-bio-toxins-any@1` | 已有原子的新组合，新增0 | Stukov真实编军的Infested Marine完成行动、激活尚未结束；选8英寸内敌军，卡耗竭，施加INFESTATION作为DEBUFF；实际PRECISION射击、Restoration及原激活后继 |

复用已提交行动／激活边界、官方底座测距、FAQ反应优先权与支付／限次、BURROWED／HIDDEN、感染状态、Restoration、感染步兵PRECISION，以及计分和签名恢复。新增工程接线是把两种不同的结束时点分别取证、开放正确的收件人选择，并把卡牌授予的状态送入现有移动消费者；这些没有另算游戏原子。[13个实际导出映射](evidence/added-status-reaction-consumers.public.json)及[本批闭环](evidence/added-status-reaction-harness.public.json)保留具名来源与范围。

[原生五房](evidence/added-status-reactions-native.public.json)均到下一回合Movement且计分各一次。Brutal获得与失去各一房；感染分别覆盖普通Move、For the Swarm!额外Move和Medic Restoration。额外Move确实移动六个模型2英寸、保留before_action窗口并触发感染，之后标准Move仍能执行；同卡不会重复触发。普通Move的感染反应发生在after_action、finish_activation之前。感染实际使后续射击进入PRECISION选择；Restoration清除感染后实际查询归零，再完成原射击、守方伤亡选择与回合。既有骰子、签名和断点全部保留。

Brutal首次验证暴露了移动消费者只认单位自身burrow_toggle来源的问题。旧Root3.247房的7个原动作保留为对照。来源绑定钻地政策1.0／Root3.248仅为Hive授予的真实状态补接共享移除路径，核对定义、特征、状态、路由及bundle哈希；旧无政策房仍按原行为冷恢复。回合层对应的activation_end通知可通过，反应优先权和后继仍由本窗口持有。[15项边界](evidence/added-status-reaction-boundaries.public.json)另验超范围、Ground／Infested限定、源卡状态、伪造证据／目标／参数、额外Move、激活结束不重复触发，以及与远程、近战、HITS、目标／护甲消费者的构造组合。组合检查是组件输入，没有冒称混合军表的完整原生对局。

[Web四房](evidence/added-status-reactions-web.public.json)从各自原生签名前缀进入，两个独立浏览器恢复真人席位、选Native目标、只读Preview、确认Apply并核对Replay。两种Brutal各2确认，感染3确认、嵌套Restoration5确认。这些是反应和原激活后继验收，不计为完整Web回合。390px的[Hydralisk选择](evidence/added-brutal-target-390.png)和[Goliath选择](evidence/added-parasite-target-390.png)已目视核对，表单298px无横向溢出；桌面334px同样通过。支付卡常量仍有既有内部ID展示，留在W4-03可用性清单，未冒称整版支付界面完成。

[原生／旧版／原对照八房160原动作](evidence/added-status-reactions-native-cold.public.json)和[Web四房12原动作](evidence/added-status-reactions-web-cold.public.json)合计12房172原动作，独立只读重建一致，0新动作。旧扫描链和旧感染转移＋Restoration的描述符及状态保持。页面复用冻结的本地Tal’darim Web V2包；本批未改产品前端或宣称全应用类型检查通过。

Hive与Infested Command Center的全部卡面定义现在已有具名消费者证据，整版Builder／发布／房间准入仍待统一推进。下一条新增卡反应为Terran Charge；随后继续Firebat FT／Fire Wall、Reaver／Scarabs／Slayer、Tal’darim Pylon和完整500／2000分双席人人出口。初始位置与Brutal失去场景的先前钻地均明确为工程前提；感染步兵尺寸仍为已有工程估算。39条来源阻断保持隔离，炮塔80mm仅工程估算，FT尺寸问题待答；付费模型、K3、AI对局、复盘和生产发布继续暂停，外部模型调用0。
