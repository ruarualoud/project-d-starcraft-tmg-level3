# Ticket 28 / W3-11 · 爆炸模板与 Lunge 的签名验收

同一 U83/C84/R50 + FAQ 1.3，独立双席组件 3.191.0。从已保存的 Standard 模式后棋位建立突击场景，Hydralisk 一名在场棋子，真实签名房由 Siege Tank 声明并执行 Shock Cannon。原隔离数值射击 3.190.0 的构造路径与默认正式版本不切换。

## 根因和修复

新版 Lunge 之前不能通过真正的模板伤害优先权，因为组件只在 Zagara 的特定开关打开时把通用反应动作交还模板所有者。普通 Queen 的 Damage Received 窗口也属于悬挂的模板批次。已按该实际模板所有者分派，让反应和伤亡走原父批次与已保存骰子，再按完整结算的主目标证据开启 Lunge。按当前发布显式分隔模板组合的 Native 版本。

## 实测

| 签名点 | 结果 |
|---|---|
| r1–r2 | 普通 Queen 的伤害反应窗口保留模板批次，由相同 Native 消费者处理攻击方和守方优先权。 |
| r3 | Corpser 主目标批次结算，Queen 溅射尚待。没有 Lunge 窗口。 |
| r4 | Queen 溅射完成。Lunge 使用原 Corpser 主目标，保留主目标打击与伤亡哈希及 Siege Tank 激活身份。 |
| r5–r6 | 原射手过手，守方用一张资源卡支付并提交反应移动。原 Siege Tank 激活和行动权恢复。 |
| 冷回放 | 原房完成 r6 后，单独重开并重建原始绑定，6 条签名回执与状态及日志头一致。首次完整工具调用在冷验阶段超时，动作没有重做。第一次补验在工具的跨运行环境对象比较上停住，改用与正式模块同环境的本地执行器后通过。 |
| Transfusion 分支 | 从原房签名日志恢复 r2，在独立分支让守方使用 Queen Transfusion。该反应实际记在同一个 Siege Tank 激活。模板完整结算仍保留 Hydralisk 的范围快照，但同方该激活额度已用，没有第二个 Lunge 窗口。 |

- [主目标未开窗](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-template-signed-room-primary.public.json)、[完整模板触发身份](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-template-signed-room-opened.public.json)、[位移签名后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-template-signed-room-moved.public.json)。
- [原房冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-template-signed-room-cold.public.json)和[同激活 Transfusion 分支](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-template-signed-room-transfusion-use.public.json)。
- [模板分派](../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs)与[所在反应窗口](../../packages/product-composition/official-ranged-lunge-continuation-v1.mjs)。

已证模板主/溅射及本次串行伤害反应组合。其它同一结算上同时竞争的窗口还需验证。复杂路线、领队与剩余模型和正式 Match 准入仍待。主 Standard 114/115，Ticket 28 2/16，模型调用 0。
