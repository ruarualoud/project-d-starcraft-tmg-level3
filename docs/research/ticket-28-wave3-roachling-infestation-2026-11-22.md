# Ticket 28 · W3-10/11 · Roachling Infestation

Corpser 的冻结能力经共用 SUMMON 源编译，用实际任务人口档、对手影响区和完整底盘。候选菜单给出三枚生成模型、存活母体模型和合法支付组合。领队接触母体，其余模型由同一队形规则校验。旧发布仍走原绑定。

从同版移动阶段检查点，使用菜单中的 Six Pool 卡支付 2 Biomass。实际提交后卡被耗尽，生成三枚零 Supply Roachling，生成单位带来源、母体标识和当前阶段锁并维持 Corpser 激活窗口。少一模型、领队脱离母体均拒绝，使用后同一能力从菜单撤销。前态序列化后重放，后态哈希精确一致。此处使用能力路由的实际 Preview 和 Apply，以及受控摆位。母体以后结束激活时的联动、Claws、禁止 Burrow、正式房间签名与持久恢复待验。

## 生产缺陷与修复

- 候选装配未向共用 SUMMON 传递同版任务人口档。现从开房已经绑定的任务重新编译官方人口档，构造或核对当前回合占用。
- 召唤预览的 V2 独立参数白名单未识别新队形及接触字段。现在复用该召唤的菜单参数定义。
- Skirmish Artefact Hunt 的冻结规模是 Skirmish Level。旧人口档只接受另一种拼法。人口档现与任务草案共用规模解析。
- 同房混入 Roachling 会误触发菌毯位移装配。现由真正的 Queen、Hatchery、Overlord 菌毯生产者启用。Standard 候选核到 Queen 与卡牌来源同时存在，同一生命周期还包含 Omega Worm。
- 支付断言曾误把 2 Biomass 定为两张卡。冻结 Six Pool 单卡面值为 2，采用权威菜单组合定点验证。

## 已验边界

| 规模 | 开局军表执行注册 | 正式工厂停点 |
|---|---:|---|
| Standard | 101/117 | 剩余 16 条所选能力绑定 |
| Skirmish | 33/33 | 完整 Room 装配、签名和持久恢复 |

开局分母由两套指定军表决定。生成单位后继随实际动作单独追踪。虫洞部署仍保留原定点。Ticket 28 为 2/16，模型调用为 0，策略效果未测。

- [召唤、支付、拒绝与重放原件](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-summoned.public.json)
- [实际召唤后态](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-summoned-checkpoint.json)
- [Standard 正式入口与 16 条定点清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-standard-inventory.public.json)
- [Skirmish 正式入口停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-skirmish-admission.public.json)
