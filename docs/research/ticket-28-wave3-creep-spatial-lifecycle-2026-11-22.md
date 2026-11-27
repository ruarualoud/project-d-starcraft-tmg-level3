# Ticket28／W3-10、11 普通空间动作中的菌毯位移与移除

## 缺口与改动

从保留的 Hatchery 放置断点，用原生 Pass 交给 Terran 后，Goliath 的合法 Move 可推动 Hatchery 菌毯，但旧候选只执行了位移，规则应触发的「敌方移动结束时 1 英寸内移除」漏接。已在 Wave3 候选的空间动作实例化与提交边界复用同一位移执行器，并在最终棋位上执行已有清理规则。普通移动与发生位移的移动共用该清理后继。提交时复核完整底盘；绕开位移选项提交原始移动也会被拒绝。

## 产品组件证据

| 场景 | 实际操作 | 结果 |
|---|---|---|
| Hatchery | 已保存放置 → Zerg Pass → Terran Goliath Move。分别用普通终点和需位移终点。 | 普通终点清理菌毯；需位移时先按同一查询回执挪动令牌，再移除。漏填选择及直送原始移动均拒绝。事件写入日志，冷读和同动作重放一致。 |
| Overlord | 复用已存 Movement 状态。Terran 先合法 Move 并结束激活；通过原生阶段切换进入 Assault。Zerg 从能力菜单花费 Overlord 战术卡、放置第二个菌毯，Pass 交给 Terran。 | Goliath 实际 Run，按查询落点位移 Overlord 菌毯并移除；远处 Hatchery 菌毯保留。重新加载并完成后继激活，进入 Combat。 |

两案使用冻结 Wave3 的 Standard 材料，零模型调用。新增执行路径由候选构造器按来源启用，未改旧发布的房间组合器或位移合同。旧 Bombard 来源兼容证据沿用上一个断点。本次证据覆盖候选运行时的 Move/Run，不证明完整 Room、Deploy、Disengage、Charge、Close Ranks 或特殊能力的完整位移；正式注册进度仍为 Standard 52/117、Skirmish 16/33，Ticket28 完成 2/16。

## 正式 Room 下一处绑定

Standard 和 Skirmish 构造器都先检查所选 Wave3 能力的覆盖，再进入正式 Match。当前覆盖扫描确实还有待接能力。正式 Match 自行重建旧动作组合，空间路由不会读取候选组合端口；开房与冷恢复需要使用同一份发布所选动作组合，聚合空间事件时应只执行一次清理。保留未完成规则的拒绝闸。两个候选回执不提高正式注册分母。

## 回执

- [修前复现](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/hatchery-creep-displacement-reproduction.public.json)
- [Hatchery 执行与恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/hatchery-creep-move-and-removal.public.json)
- [Overlord 支付及进入 Assault 的棋位](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overlord-creep-before-run.public.json)
- [Overlord 执行与后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overlord-creep-run-and-removal.public.json)
- [Combat 检查点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overlord-creep-combat-checkpoint.json)
