# Detonation：近战、HITS 与嵌套后继

本批为 W4-02 的可验证增量，整版人人对战长任务继续。两条来源共享一个新增语义合同 `rule-atom:wave4/before-casualty-batch-detonation@1`；本批新增完整准出原子 **0**，累计仍 **6/18**。远程、近战和自动命中的普通伤害批次现有原生证据；直接移除、委托攻击、激活外伤害及完整回合仍待，不以本批替代整版准入。

| 来源 ID | 分类 | 本批实际消费者 |
|---|---|---|
| `unit:infested_marine/detonation-any-phase@1` | 新语义；共用 BM、反应额度、HITS、几何与伤亡内核 | 近战封存/恢复、HITS 多目标封存/恢复、逐来源反应选择、两层中断栈、Web 真人确认 |
| `unit:infested_trooper/detonation-any-phase@1` | 同一新语义合同；伤害值读来源 2 | 近战、HITS 与双方嵌套；Web 从两层签名检查点恢复 |

接线版本采用显式政策 `1.1.0`、Root `3.228.0`、HITS `3.9.0`。默认政策仍为 `1.0.0`，旧远程房保持 `3.227.0`。没有新政策的历史房也保持原描述符和输出。

实际消费者分别位于：

- `official-before-casualty-batch-v1.mjs`：每目标保留原伤亡顺序、原结算哈希与新伤害余数；零伤亡行也可保留分配结果。
- `official-selected-roster-melee-action-runtime-v1.mjs`：在所有目标完成伤亡选择后暂停；恢复同一封存批次，原攻击者已阵亡仍完成尾部结算。
- `official-automatic-hits-runtime-v1.mjs`：暂停自身父节点，供子 HITS 使用独立槽；恢复后仅应用原已选伤亡。
- `official-before-casualty-runtime-v1.mjs`：逐目标见证、反应效果队列、持久化栈、父槽保存与恢复。
- `official-reaction-family-adapter-v1.mjs` / `official-detonation-facts-v1.mjs`：按实际来源单位核对见证，使用其仍在场的几何与将移除模型数。
- `official-characteristic-status-component-runtime-v2.mjs`：依次完成内层 HITS、外层 HITS、原近战及各自后继。

原生本批验证：

| 分支 | 签名动作 | 已验证结果 |
|---|---:|---|
| Marine 双方接受 | 13 | 两层栈，双方实际阵亡，原近战完成 |
| Marine 拒绝 | 7 | 原批次直接恢复，无 Detonation 支付 |
| Trooper 双方接受 | 14 | 两层栈，伤害值 2，双方实际阵亡 |
| 两个感染单位同批伤亡 | 17 | 两个目标各完成伤亡选择；选用非首行的反应来源 |
| 含零伤亡 Queen 行 | 16 | 同批保留两行；Queen 无伤亡，不被恢复操作覆盖 |
| Trooper 无伤害对照 | 4 | 实际原生骰子未造成伤害，不开启伤亡前窗口 |

合计 6 个分支、71 次签名动作。所有分支有幂等重提与关闭/重开后的全 journal 冷重放。6 房独立审计核对：每个原结算哈希仅结算一次、每个原伤亡顺序保留、原主动玩家/激活身份保持、每单位 Supply 差额与实际移除一致，最终没有悬挂保留或父槽。随机骰子不满足嵌套前提时保留为对照，另开独立房取得目标覆盖，未注入骰子结果。

零伤亡组件另验：原分配余数 2，后继伤害增加到 5，恢复原批次后仍为 5，模型数 1，拒绝重复恢复。这是声明封存输入的组件检查，0 Native 动作；不混入上表。

Web 使用已签名的两层中断检查点：Marine 原生前缀 9 动作，Trooper 前缀 10 动作。两房各执行第二次 Detonation、另一席拒绝、HITS 护甲与 Evade，合计 8 次真人确认；原近战最终完成、双方阵亡、刷新/席位恢复/重放一致，1500 与 390 宽的两独立浏览器无页面错误。它证明嵌套后继界面，不是从大厅建军开始的整局。5484 已关闭。沿用已验 Web bundle，未修改客户端实现。

兼容检查另外重放旧 Precision、Medic、Warden 回合 3 房30动作，以及政策 v1 的 Detonation 3 房16动作；当前描述符与 Envelope 完全一致。

可复验入口：`verify-wave4-detonation-nested.mjs`、该脚本的 `--multi-target` 模式、`verify-wave4-detonation-settlements.mjs --multi-target`、`verify-wave4-detonation-allocation-only.mjs`、`verify-wave4-before-casualty-compat.mjs`。证据见同目录 `evidence/detonation-{nested-host,multi-target,settlement-audit,allocation-only,nested-web,v1-cold-compat}.public.json`。

继续项：委托/Overwatch 与激活外时点；Disengage、Consume、Bio-Kill Switch 等直接移除；完整回合与其他后继。工程数据切换 releaseId 时，进口 Terran 转换政策仍绑定其原来源发布，应在后续新工程版本中重编建军组件后再验证，不能去掉来源核对。本批零伤亡对照改用合法 Queen/Hatchery 组合。

39 条来源阻断仍隔离，所有估算底座仍仅工程值；付费模型、K3、AI 对局、复盘和生产发布保持暂停，模型调用 0。
