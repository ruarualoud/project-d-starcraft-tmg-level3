# T28-W3-09 / M08 正式军表准入 2.45

同一合法军表，两军共选 57 条定义，包含 Wave3 新增虫族全部 40 条。使用与 2.44 相同的军表、地区任务、部署、冻结定义和来源哈希。正式开局检查现识别 32/40，上一版 28/40。四条变化均属于 Bile Launcher。

| 定义 | 本次接入的已有消费者 |
|---|---|
| Biological Structure | 规则限制与近战冲击 |
| Detection | 侦测 aura、隐藏状态与射击目标 |
| Indomitable | 射击伤害与护甲 |
| Source of Creep | 战场菌毯范围查询与修正，同时支持含主动菌毯卡的军表 |

验证由正式 Standard 开局检查与严格工厂完成。全选军表实际返回以下八条未接定义，未创建对战房间；该检查只确认准入差分。发射体的完整产品动作、查询和冷恢复随 Bombard 再验。

- `card:defiler_mound/poisonous-essence-any@1`
- `card:defiler_mound/tunnel-network-any@1`
- `card:reactive_creep/creep-removal-any@1`
- `card:reactive_creep/living-glob-of-tissue-any@1`
- `card:reactive_creep/reactive-tissue-any@1`
- `unit:bile_launcher/bombard-movement-phase@1`
- `unit:defiler/cancerous-bite-combat-phase@1`
- `unit:defiler/plague-assault-phase@1`

[逐项状态及哈希](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v245/coverage.json) · [正式工厂回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v245/factory.json) · [同军表上一版](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v244/factory.json) · [核对入口](../../scripts/inspect-wave3-zerg-definition-coverage-v243.mjs)
