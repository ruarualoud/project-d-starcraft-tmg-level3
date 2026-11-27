# Detonation：模板与 Seeker 激活外后继

本批继续实现 Detonation 这项新增语义，补上模板批次与 Seeker 阶段末的实际消费者。**6原生分支83次签名动作、2完整回合、3房Web16次确认通过**。Detonation 仍未覆盖全部移除入口，未计为完整新增原子；累计仍 **6/18**，整版人人对战继续。

| 精确来源 | 本批实际消费者 |
|---|---|
| `unit:infested_marine/detonation-any-phase@1` | Shock Cannon主目标批次；Seeker阶段末HITS接受/拒绝；政策1.2下Bio-Kill Switch直接伤害回归 |
| `unit:infested_trooper/detonation-any-phase@1` | Shock Cannon溅射先结算批次；共用激活外时点合同已有实际Marine见证，未声称Trooper也执行了Seeker分支 |

完整出口、导出函数与具名证明见[消费者映射](evidence/detonation-template-outside-consumers.public.json)。本批复用既有模板几何/覆盖、命中与防御、伤亡选择、BM支付、Supply和回合驱动，扩展的是尚未完成的同一个伤亡前中断原子。

政策1.2显式选择Root3.232.0、HITS3.11.0、模板2.4.0；政策1.0/1.1仍保留。模板在骰子与伤亡选择已确定后保存父批次，待Detonation后沿原结果恢复；攻击者后来阵亡仍完成剩余主目标/溅射，不能重新声明或重掷。模板尺寸沿用此前用户确认的5英寸，重新绑定当前同源规则；新步兵底座仍为登记过的工程估算。

| 原生分支 | 签名动作 | 结果 |
|---|---:|---|
| Marine主目标先结算，使用Detonation | 9 | Tank实际阵亡，原模板仍完成 |
| 主目标先结算，拒绝Detonation | 9 | 两个具名伤亡前窗口依次通过，模板仅完成一次 |
| Trooper溅射先结算，使用Detonation | 9 | Tank实际阵亡，主目标后续仍完成 |
| Seeker阶段末，接受 | 26 | 真实Movement支付/声明→双方Assault Pass→原HITS→Detonation→双方全灭→计分/清理→R2 |
| Seeker阶段末，拒绝 | 24 | 原HITS只结算一次，再完成同样完整回合 |
| 政策1.2下Bio-Kill Switch | 6 | Stukov被反向Detonation实际消灭，原伤害及感染清除仍只完成一次 |

各房验证幂等重提、原骰及已选伤亡顺序、Supply仅在实际移除时记账，并关闭/重开冷重放。当前代码另只读复验5个政策1.2房74动作，描述符与Envelope一致；5个早期房50动作也保持一致（原兼容文件另包含本批2个模板房18动作，未重复算新增动作）。

Seeker能力已实际支付和声明；工程回合入口必须显式绑定其阶段末延迟政策。原父HITS与Seeker父槽在子反应期间保存，子HITS的实际inspectContext为outside_activation、activationId:null；伪造重封的inside_activation父槽被拒绝。优先权读取**当时**的firstPlayerSideKey，首次Pass会转移标记，不能沿用阶段开始的标记持有者。具名接受/拒绝分支均为player1控制Seeker、player2持有当时标记。父阶段等待所有伤亡前子节点完成再恢复；双方全灭后，新合同跳过空军表移动菜单，保留合法Pass、计分和清理。5项只读上下文/完整回合核对通过。

Web模板两房各6次确认，激活外一房4次确认，均从具名原生签名前缀开始。1500/390宽两个独立浏览器实际支付、子HITS与原批次后继，预览只读，刷新/席位恢复/重放一致，页面错误0；5484已关闭。模板Web v1因驱动未选择hash伤亡方案停在4动作，保留但未计通过；修驱动后v2通过。产品仍以hash显示这类小规模伤亡方案，W4-03将补可读模型摘要，当前技术确认链不替代整版可用性验收。

复验：`verify-wave4-detonation-template.mjs`、`verify-wave4-detonation-outside.mjs`（支持原签名断点续验）、`verify-wave4-detonation-outside-context.mjs`、`verify-wave4-bio-kill-switch.mjs --before-casualty-v3`、`verify-wave4-detonation-v3-compat.mjs --v3-only`；Web使用各自具名cases及共用serve/verify驱动。

仍待委托攻击（Overwatch/Khassar/Target/声明父节点）、其他外部HITS父节点（Bile/Drone/Storm/Photon）及Disengage/Consume等直接移除。政策1.2对未准入的外部HITS和委托攻击组合在构造时拒绝；下一版本逐所有者补封存与后继，不能放宽守卫后直接计完成。其余新增单位/势力、整版发布/Builder/大厅/媒体及500/2000分Web继续。39条来源、80mm等工程估算、付费模型/K3/AI对局/复盘/生产暂停保持，模型调用0，trainingTruth:false。
