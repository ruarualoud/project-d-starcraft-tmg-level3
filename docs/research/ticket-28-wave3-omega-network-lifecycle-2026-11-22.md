# Ticket 28 · W3-10/11 · Omega Worm 部署入口与回收

## 新版规则接线

从已保存的 Wave3 虫洞召唤回执继续。生成单位的 Omega Network 规则通过冻结来源注册。与 Queen 一起进入军表时，两个原生规则由同一个生命周期适配器拥有。旧版生命周期保持原分支。

虫洞的部署入口复用原生 Deploy 的单位底盘周界。Deploy 负责生成起点、沿路径移动、完整队形、全局 Supply 及阶段交接。虫洞的 2 Supply 配额由同回合、同入口的已提交 Deploy 回执累计，虫洞创建回合不提供该入口。部署提交时会刷新权威人口占用。

回收接受当前激活的 Move、Disengage 或 Run 的原生回执，并按其中的领队 ID 检查完整底盘接触。领队之外的模型接触、已结束的激活及旧回执不能触发。实际 Move 后成功把 Hydralisk 送回预备队，释放 2 Supply、关闭激活并交给对手。冷读同一提交的后态哈希一致。

## 部署验收断点

已从规则菜单确认第一回合可走普通入口，第二回合虫洞入口出现且剩余配额为 2。部署动作尚未成功提交。第一次揭示 Ground 类型过滤引用不存在的函数，已修复。之后两次测试用旧棋子快照的圆底尺寸估距，发生实际底盘重叠。按真实 40×100 mm 底盘拉开纵向距离又超出领队完整一致性范围。四次运行在同一部署验收计数内保留。

已从冻结矩形底盘和共用规则器预检并保存纵向一致的横排队形。两模型中心 (10.5,12) 和 (12.3,12) 英寸，底盘无重叠，后一模型完全处在领队的一致性范围内。只剩原生部署、额度消费、拒绝第三个 Supply 和冷读待补。这次预检不算部署成功。

虫洞本体是生成单位，因此不改变开局军表覆盖统计。Standard 100/117，Skirmish 32/33，Ticket 28 仍为 2/16。回收和部署使用隔离后续回合夹具。正式房间签名、Detection 和持久恢复待验。模型调用为零，策略效果未测。

- [原生移动回收](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-lifecycle-return.public.json)
- [横排队形的权威预检及参数](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-lifecycle-deploy-horizontal-formation-preflight.public.json)
