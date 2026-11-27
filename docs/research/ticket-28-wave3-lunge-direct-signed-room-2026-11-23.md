# Ticket 28 / W3-11 · Lunge 单模型签名房反应

在隔离的双人工席 Room 上绑定冻结 U83/C84/R50 + FAQ 1.3 与原生组件 3.190.0。该绑定用实际 Standard 候选军表与地形，工程起始条件为 Hydralisk 已损失一名模型。数值射击到签名提交的每步由 Native 与同一 Room 完成。首次构造触及旧快照缺少当前规范化特征及装甲阈值绑定，均在开房前用正式构造器修复。未更改旧房间或默认 Match 策略。

## 方案与兼容

- 实际结算触发后，持久化源结算、反应激活身份、触发哈希和恢复方。只暴露当前反应优先方。该工程绑定仅开放已经证明的单模型直线移位，不提升正式整军表的覆盖数。
- 守方预览一次参数动作，原生反应器预览资源并模拟消费，再用 Move 规则器复算位移。最终 Apply 重算并比较整个动作。付款和位移同一笔提交；非法路径没有变更、扣款或签名。放弃不需要位移参数。
- 反应结束删除父窗口，按实际父攻击保存的行动方恢复。旧组件没有显式选项时继续使用原版本与分派。同一隔离蓝图关闭此开关得到原生 3.108.0。
- 当前适用域是有权威原生父结算且已经具备最短证明的直线。模板攻击、其他反应重叠、队形和最短绕障仍分别准出。

## 签名结果

| 场景 | 回执 |
|---|---|
| 使用 | r1 原生 Autocannon 结算打开窗口，r2 射手过手，r3 守方付款并移动 1.010 英寸，r4 原 Goliath 接回并结束射击。非法预览前后状态哈希相同，重复提交复用同一回执。Hydralisk 激活标志保留。冻结菜单标价 1 Biomass，此次按一个合法选项使用两张资源卡，超额资源按 §10.5.1 丢弃。 |
| 放弃 | 从已签 r2 的守方窗口开隔离分支，冷启恢复同一个待选触发。放弃、射手续行共两条签名回执，棋子与资源卡均保持原态直到射手续行。 |
| 回放 | 使用分支关库重开并重建相同绑定，4 条签名回执匹配当前状态。放弃分支 2 条回执匹配当前状态。 |

- [射击触发](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-direct-signed-room-opened.public.json)、[守方授权](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-direct-signed-room-defender.public.json)、[使用回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-direct-signed-room-applied.public.json)、[原方续行](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-direct-signed-room-terminal.public.json)。
- [使用冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-direct-signed-room-cold.public.json)、[放弃和待选冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-direct-signed-room-decline.public.json)。
- [房间守方窗口停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-direct-signed-room-defender-authority.json)、[反应窗口到同笔移动提交](../../packages/product-composition/official-ranged-lunge-continuation-v1.mjs)。

正式 Standard 仍为 114/115。尚需同版验证模板及其他反应重叠，关闭多模型领队、最短绕行和剩余模型的最接近合法布置，再开放正式 Match。Wave3 2/16，模型调用 0。
