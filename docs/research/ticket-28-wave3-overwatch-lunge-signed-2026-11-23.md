# Ticket 28 · W3-11 / Overwatch 射后 Lunge

冻结 U83/C84/R50 + FAQ 1.3。隔离原生组件签名房复用已保存 Standard 军表、正式炮塔生成器和权威完整底盘。起始炮塔位置和 Assault 阶段是工程声明条件。炮塔过全底盘检验，Gauss Cannon 到 Corpser 的合法底盘距离是 2.647 英寸。

## 根因与修复

- 3.192.0 的常规射后路径已经保留结算证据，但独立 Overwatch 父动作来自敌方激活结束之后。若按普通射手解析，会生成虚假的激活身份。实际授权有原触发回执和源、目标、武器档。3.193.0 读取并验证此授权和实际完整结算，按 FAQ 的激活外规则打开窗口，先手标记持有者优先。两边合法域均会检查，实际能由守方先选。
- 实际同房首次预览因 Siege Tank 常规模板在独占炮塔授权期间被枚举而停在 r0。Root 此前先计算两个菜单再过滤。现在授权后的合法域直接进入数值射击及其实际前置／伤亡消费者，普通模板等到行动权恢复后再枚举。预检阶段还修正了一个夹具的效果目录类型和一次坦克／炮塔底盘重叠。复测工具的重复局部变量在入房前报错，保留原生产反例。
- 在这个唯一合格 Lunge 选择先执行时，另一方仅有合法放弃，Host 消费该放弃并完成同一签名提交的付款及位移。检测到另有合格反应时保留原窗口，当前分片会拒绝未经证明的先手位移组合。旧发布继续使用原选项，3.192.0 已完成前缀。

## 实际签名记录

| 停点 | 结果 |
| --- | --- |
| 3.192.0 前缀 r1–r3 | Corpser 射击及结束激活，规则器真正给 Terran 炮塔 Overwatch。r3 保存完整原生授权。 |
| 3.193.0 r0 | 由原 r3 的已保存状态单独开工程候选，保留冻结数据、棋位与授权。两房绑定独立。 |
| r1 | Gauss Cannon 实际完成射击和伤亡结算。Lunge 保存原攻击与 Overwatch 身份，没有虚构 activationId。虫族是持标记一方，先获得合法窗口。 |
| r2 | 守方按权威域支付 1 Biomass，Hydralisk 从 (13, 14) 朝炮塔移动到 (13.49, 13.64)，约 0.608 英寸。付款、自动空窗放弃和位移均在同一签名提交。两方使用各自的激活外 Assault 额度。炮塔和 Lunge 待办结束，Terran 接回行动权。 |
| 冷恢复 | 关闭再打开 r2 的 SQLite，重新绑定原依赖后，两条签名回执完整回放，终态 Hash 一致。 |

[原签名 r3 授权](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-overwatch-lunge-prefix/overwatch-ready.json)、[r0 原始产品故障](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-overwatch-lunge-signed/r0-menu-ownership-failure.public.json)、[r2 执行](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-overwatch-lunge-signed/live.public.json)和[冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-overwatch-lunge-signed/cold.public.json)。

覆盖 Overwatch、原生数值射击和单模型 Lunge 与已选坦克模板共存的候选。可共存且双方还有多项可选反应、Nova 被动刷新组合、通用最短绕行、多模型队形、正式 Match 与 Web/App 尚待。工程进度 Standard 114/115，Wave3 2/16。真实模型产出和策略效果未测。模型调用 0。
