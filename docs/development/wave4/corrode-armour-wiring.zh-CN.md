# Stukov：Corrode Armor 与完整后继

Corrode Armor 已接入实际远程攻击后的共用反应窗口。它是已有原子的**新组合**，本批新增完整游戏原子 **0**，累计仍 **6/18**。Stukov 的9条冻结定义均已有具名工程接线证据；整版 Wave4 人人对战继续，不能据此宣布完成。

| 来源 ID | 复用及实际消费者 |
|---|---|
| `unit:stukov/corrode-armor-assault-phase@1` | 精确来源编译 → Native ranged_attack/伤亡完成见证 → 与 Lunge 共用的攻击后窗口 → 1 BM 反应支付 → Armour DEBUFF(1) → 实际后续 Armour 骰、Medic Restoration 与 cleanup_and_refresh |

官方冻结原文要求“紧接本单位对敌军完成远程攻击后”，未要求造成伤害。新入口校验真实攻击日志、攻击者、目标、回合、阶段和封存哈希；由进攻方先取得反应优先权。旧 Lunge 入口仍保留，Corrode 与 Lunge 在同一窗口交替，避免互相覆盖。来源和7个具名消费者见 [映射](evidence/corrode-armour-consumers.public.json)。

Armour 减益复用通用状态、标记和特征投影，按同来源不叠加。它不会因施法者后来阵亡而消失。Medic 的 debuff_received 子窗口保存原攻击后窗口与优先权，清除后恢复原窗口。Root3.230.0只在选择Corrode来源时启用；完整回合另显式启用3.231.0的清理入口，避免改变已有绑定。

| 原生分支 | 签名动作 | 实际结果 |
|---|---:|---|
| 接受／拒绝 | 3＋3 | 接受支付1 BM、Armour4→5；拒绝保持4 |
| Medic Restoration | 5 | 嵌套清除后Armour回到4，再完成原窗口 |
| 后续步枪攻击 | 8 | 经Goliath实际还击和激活交接，友军步枪的非空Armour骰使用5 |
| Lunge 同窗 | 3 | Corrode后Hydralisk实际向攻击者移动，原减益保留 |
| 无BM／无Corrode来源的Lunge | 1＋4 | 无BM不出现Corrode；既有Lunge继续可操作 |
| 镜像Stukov四次实际掷骰 | 12 | 前三次伤害2/3/1，第四次伤害0；四次均能使用Corrode，未注入骰子 |
| 完整原生回合 | 20 | R1开始→移动→突击→战斗→计分→清理→R2；清理前Armour5，清理后4 |

合计 **12分支59次签名动作**，各房验证幂等重提与关闭/重开后的完整冷重放。11项只读边界检查包括6种重封哈希后的伪造状态拒绝、同源不叠加、施法者死亡留效及真实签名前缀清理边界。另25个旧动作在当前代码冷重放，描述符和Envelope保持一致。Queen探索分支已保存在build中，但未计入上述12分支或零伤害结论；其Armoured标签不适合隔离SURGE条件。

Web两房从签名攻击后前缀分别操作接受和Medic清除，共 **6次真人确认**。1500/390宽两个独立浏览器、只读预览、刷新、席位恢复、重放一致，页面错误0。截图为实际Medic支付/清除界面。验收服务已关闭，未改Web客户端代码。上述Web范围不包含大厅建军或从初始态完成全回合；旧分项JSON中的pending字段由本报告和消费者汇总列出的后续证明补齐，不改写历史证据。

复验：`verify-wave4-corrode-armour.mjs`及其restoration/successor/lunge/controls模式，`verify-wave4-corrode-round.mjs`、`verify-wave4-corrode-zero-damage.mjs`、`verify-wave4-corrode-boundaries.mjs`、`verify-wave4-corrode-compat.mjs`；Web沿用具名cases与`serve/verify-wave4-virus-web.mjs`。

接下来继续Detonation模板／委托／激活外和直接移除消费者，再接其他新增单位与势力、整版发布/Builder/大厅/媒体及500/2000分双席。39条来源阻断、80mm及其他工程估算和所有暂停项保持，模型调用0，trainingTruth:false。
