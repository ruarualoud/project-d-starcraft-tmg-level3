# Ticket 28 / W3-10、11 · Wave3 伤害前反应

旧发布已有 Medic Life Support 与 Transfusion 的支付、伤害累计和分伤组件。Wave3 的所选军表组装之前只接了数值攻击与少数主动能力。此次为冻结定义新增接线，共用原生伤害分配规则与原有攻击续算，新增规则原子 0。射击或近战产生伤害时等待反应席位选择，之后复用原骰子并按对应武器交回防守方分伤。窗口内仅提供反应菜单，普通攻击提交被拒。FAQ 1.3 的结构目标限制沿用现有规则。

| 验收动作 | 付费使用 | 放弃 |
| --- | --- | --- |
| Queen Talons 射击 Raynor，Medic 可用 Life Support | 1 CP、减伤 4，Raynor 剩 3 血 | Raynor 被移除 |
| Goliath Autocannon 射击 6 只 Kerrigan Raptor，Queen 可用 Transfusion | 1 BM、减伤 2，防守方分伤后剩 3 模型 | 防守方分伤后剩 2 模型 |
| Goliath Stomp 近战，Queen 可用 Transfusion | 1 BM、减伤 2，防守方分伤后剩 5 模型 | 防守方分伤后剩 4 模型 |

三组采用冻结军表、隔离工程棋位、原生菜单及确定性骰子，验证了序列化后的反应与分伤接续。旧 Wave1 V6 描述符与归档逐字段一致。本批验证覆盖所选数值射击与近战，模板、直接 Hits 与完整房间仍待验收。Standard 72/117，Skirmish 20/33。Ticket28 完成 2/16。

- [Life Support 射击回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-medic-queen-numeric-damage-life-assault.public.json)
- [Transfusion 射击回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-medic-queen-numeric-damage-queen-assault.public.json)
- [Transfusion 近战回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-medic-queen-numeric-damage-queen-melee.public.json)
- [Skirmish 与旧版](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-medic-queen-numeric-damage-compatibility.public.json)
