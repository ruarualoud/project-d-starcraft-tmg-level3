# 新增卡牌主动能力与扫描后继

本批5条定义的具名消费者通过，新增原子0，累计仍7/18。6个完整原生回合130动作、Web五房9次确认、14房203个原动作独立冷重建通过。主Builder仍102/119；私有108记录候选用于本批，整版发布／房间准入继续。

| 定义ID | 差分分类 | 已验实际消费者 |
| --- | --- | --- |
| `card:robotics_support_bay/master-of-robotics-any@1` | 已有原子的新组合 | 真实Builder的Mechanical Stalker、固定HEAL(2)、卡牌消耗、后续标准Move及清理 |
| `card:barracks__reactor_/go-go-go-any@1` | 已有原子 | 六模型Marine实际额外Move2英寸，保留before_action窗口，再执行标准Move |
| `card:infested_barracks/for-the-swarm-any@1` | 已有原子的新组合 | Biological且Ground；12个Zergling模型实际额外Move2英寸，标准Move仍可执行 |
| `card:hive/creep-spread-any@1` | 已有原子 | 实际Creep Tumor设置、官方物理轮廓与Entry Edge范围、来源绑定、卡牌和回合生命周期 |
| `card:infested_command_center/scanner-sweep-any@1` | 已有原子的新组合 | 实际指示器、HIDDEN移除、Evade／射击入口、离开范围后的状态，以及Nerazim反应后继 |

复用固定HEAL、额外Move、路径／连贯校验、Creep设置、指示器几何、HIDDEN及反应、计分与恢复。两个门槛式限定、来源名称变化和补接投影不单独计新原子。[实际文件与导出映射](evidence/added-card-consumers.public.json)逐项列出消费位置；[来源六项](evidence/added-card-source.public.json)保留冻结原文和ID。

For the Swarm!不能只检查Biological；Reactor的Go! Go! Go!又不能误加Ground限定。感染指挥中心的正文是“lose the HIDDEN Status”，本批只对该精确来源接受这个变体，原Scanner Sweep的正文和全局语法保留。[九项边界](evidence/added-card-boundaries.public.json)覆盖Mechanical治疗、两种移动限定、后备和时点。飞行／Mechanical标签反例是明确的组件输入，不是伪造的原生军表；正向来源与后继另由真实Builder和Native证明。

[原生五房104动作](evidence/added-card-active.public.json)全部到R2 Movement，计分各一次。真实Builder要求Zerg另选一张Creep组卡、Stukov另选一张Virus，均已满足；治疗使用正式Daelaam势力。Zergling小军组实际12模型，紧凑队形经官方连贯核验，全部模型按原哈希提交移动。初始伤害、HIDDEN和部署位置是明确的工程前提，没有冒称从部署开始的完整对局。

扫描首次验证发现：旧投影已经报告指示器压制HIDDEN，原生攻击读取的Characteristic投影却只包含单位Detection，导致射击入口仍关闭。原Root3.245房的20个签名动作保留为对照。新增Detection政策1.1／Root3.246把经来源绑定的指示器接入同一投影，并复用实际HIDDEN移除；旧政策1.0和默认路径不扩展语义。新房实际移除HIDDEN后，敌军移动3英寸离开范围，HIDDEN和对应Evade资格均不恢复，随后原生射击完成。[九项桥接检查](evidence/indicator-detection.public.json)核对只读、友方排除、恰好一次、旧政策保留及来源篡改拒绝。

另一个[26动作完整回合](evidence/added-card-nerazim.public.json)由扫描真正触发敌方Nerazim反应：先按优先权Pass，再实际支付／消耗势力卡，取得Speed+2和首武器CRITICAL HIT(2)，恢复原行动方，继续双方移动、射击、计分和清理；跨轮效果清除另经独立冷验。这个消费者复用旧Nerazim定义，没有另算Wave4新增能力或原子。

[Web五房](evidence/added-card-web.public.json)从各自原生签名前缀进入，由两个独立浏览器恢复席位、选择现有Native表单、只读Preview、确认Apply和核对Replay。四房各2确认、Creep一房1确认；这些是实际卡牌发起与激活后继验收，不计为五个完整Web回合。手机三个表单宽度均298px且无横向溢出；[12模型表单](evidence/added-card-swarm-form-390.png)和[扫描确认画面](evidence/added-card-scanner-preview-390.png)已目视核对。填写器只采用Native规范参数与公开字段描述，没有计算新规则或绕过页面提交。

[当前／旧版／原对照八房](evidence/added-card-native-cold.public.json)、[Web五房](evidence/added-card-web-cold.public.json)及[Nerazim一房](evidence/added-card-nerazim-cold.public.json)合计14房203原动作重建一致，0新动作。实际页面沿用已冻结验过的本地Tal’darim Web V2包；本批没有修改产品前端，也没有宣称全应用类型检查通过。[本批闭环](evidence/added-card-harness.public.json)保留工程消费者范围。

Robotics Support Bay和Infested Barracks的全部卡面定义已具名验过；整版Builder／房间选择尚未改变。Reactor仍待Terran Charge，Hive仍待Brutal Instinct，Infested Command Center仍待Parasitic Bio-Toxins。随后继续Firebat模板／Fire Wall、Reaver／Scarabs／Slayer与Tal’darim Pylon、完整发布和500／2000分人人出口。39条来源阻断保持隔离，80mm炮塔仅工程估算，FT尺寸问题待答；付费模型、K3、AI对局、复盘及生产发布继续暂停，模型调用0。
