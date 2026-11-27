# Ticket 28 / W3-10、11 · 修复 Wave3 候选的被动能力菜单崩溃

在原 Standard 突击阶段候选断点查询全部已注册能力时，Terran 能力适配器尝试读取一个未注册的主动路线，抛出 TypeError。该候选只装载 Raynor 的被动 Freedom Fighters，适配器原先假定同时存在提供主动效果的战术卡。单独查询 Supply 或其他适配器的旧验收无法遇到这条聚合路径。

主动候选枚举现在先检查该规则族是否配置了主动路线。仅含被动时，沿用同一菜单封装并返回零主动候选，保留自动消费者登记和 Supply 读取。仍有主动路线的来源继续经过原有筛选、排序和动作签名逻辑。未修改冻结规则、资源费用或房间准入。

| 检查点 | 结果 |
|---|---|
| 修前原状态、全适配器菜单 | 突击阶段 player2，Terran 被动适配器空路线访问导致整张菜单失败。 |
| 修后同一来源和候选棋位 | 11 个执行适配器联合返回，其他能力提供 3 个参数化动作。Freedom Fighters 保留自动生效绑定，自身无主动按钮。 |
| 序列化后重新构造候选运行时 | 菜单逐字段一致，回执哈希相同。此检查覆盖候选运行时冷读。 |
| Roach 起始能力 | 冻结军表包含 Burrow，其登记仍是 pending_family_adapter。下一步补来源绑定与潜地状态的原生动作消费者。 |

两次补验断言分别误用了诊断适配器标识和覆盖字段名。改用聚合模块导出的标识和覆盖记录的 registrationStatus 后通过。修复未改变游戏事实或累计覆盖。Standard 为 79/117，Skirmish 为 22/33，Ticket 28 为 2/16。正式房间准入和后续产品验收仍待完成。模型调用为零。

## 证据

- [修前复现](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-freedom-fighters-full-menu-before.public.json)
- [聚合菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-freedom-fighters-full-menu-after.public.json)
- [冷读](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-freedom-fighters-full-menu-cold.public.json)
- [Roach 停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-freedom-fighters-full-menu-roach-next.public.json)
