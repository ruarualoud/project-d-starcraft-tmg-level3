# Detonation：Overwatch 与多武器后继

本批补齐伤亡前 Detonation 的 Auto-Turret 委托射击及多武器序列后继：**5 原生分支46次签名动作、2房Web6次显式确认通过**。复用已有攻击、反应支付、HITS、伤亡与Supply原子，扩展同一个尚未完成的Detonation语义，新增完整原子0，累计仍6/18。

| 精确来源 | 实际消费者 |
|---|---|
| unit:infested_marine/detonation-any-phase@1 | Auto-Turret Gauss后使用/拒绝；Goliath第二把武器后攻击者阵亡/存活两分支 |
| unit:infested_trooper/detonation-any-phase@1 | Auto-Turret Gauss后使用；共享激活外合同有实际Trooper见证 |

完整导出与消费者映射见[消费者证据](evidence/detonation-overwatch-consumers.public.json)，运行闭环见[harness证据](evidence/detonation-overwatch-harness.public.json)。政策1.3显式选择Root3.233，暂停并封存Overwatch父槽和多武器序列；恢复原骰、伤亡选择、Supply与激活标记，攻击者阵亡后原攻击仍完成。旧政策保留，Khassar/Target/声明替代等未准入组合继续拒绝。

| 原生分支 | 动作 | 实际后继 |
|---|---:|---|
| Marine使用 | 11 | 炮塔阵亡；原Gauss完成；下一方Raven真实Run/结束激活 |
| Marine拒绝 | 9 | 原射击一次；下一激活通过 |
| Trooper使用 | 11 | 炮塔阵亡，原射击和下一激活通过 |
| 多武器攻击者阵亡 | 7 | 首武器射Stukov；次武器射Marine；Detonation后保留原序列并完成 |
| 多武器攻击者存活 | 8 | 相同真实双武器链，最终明确结束序列 |

各分支均核对幂等、关闭重开冷重放。多武器存活分支从签名head7重放恢复后完成第8动作，未伪造新状态。兼容读取5房63个原动作：旧41动作与本批两个Overwatch房22动作；描述符和Envelope保持一致，未作为新增动作计数。

Web两个独立1500/390宽浏览器，从具名原生前缀完成Marine与Trooper各3次确认，预览只读，原射击哈希一致，刷新/恢复/重放一致，页面错误0。截图已查阅；5484服务已关闭。本批未修改Web产品代码，未声称整版大厅/Builder验收。

[只读准入范围核对](evidence/atom-admission-scope.public.json)明确18个合同中2个只被隔离的Alarak消费；其余16个服务未隔离记录，已实现6，仍有10个待完整实现。保持18原分母。39直接阻断对应4个整记录隔离，另7条Alarak定义随整记录不可用；当前Builder102/119，13个已审核记录尚待接线：Firebat、Reaver、三种Scarab、Slayer(Stalker)、Tal'darim Pylon及6张卡。

Firefly只Target Flying，不能以Ground感染步兵构造直接射击证据；本批使用Target All的Gauss。双Overwatch来源同房尚未接通，旧工厂只接受一路由。下一步补Auto/Ocular组合，再接Khassar、Target/声明父节点、其他外部HITS及Disengage/Consume直接移除，继续其余记录和整版Web。

复验入口：verify-wave4-detonation-overwatch.mjs、verify-wave4-detonation-weapon-sequence.mjs（支持签名断点）、verify-wave4-detonation-v3-compat.mjs --overwatch-only、verify-wave4-atom-admission-scope.mjs。39来源、工程估算和所有暂停项保持；模型调用0，trainingTruth:false。
