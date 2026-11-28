# Firebat 来源与基础消费者（整单位接线进行中）

本批 5 个完整原生回合、122 个签名动作通过，均实际走过任务开始、三个阶段、计分、清理及下一回合。显式 Root 3.243.0 只为 Firebat Stimpack 新来源开放回合生命周期，已有版本分支保持。Firebat 的完整准入仍未完成；主 Builder 仍为 102/119，完整新增原子仍 6/18。

| 定义 ID（共同前缀 `unit:firebat/`） | 差分 | 本批实际范围 |
| --- | --- | --- |
| `stimpack-movement-phase@1` | 已有原子的新组合 | CP 付款、NON-LETHAL DAMAGE (2)、Speed +3、Perdition Flamethrower 和全部近战 PRECISION (3)，回合清理 |
| `perdition-flamethrower-assault-phase@1` | 数值／武器数据 | 实际远程攻击与防御、伤亡及激活收尾；有／无 Stimpack 两房 |
| `flame-strike-combat-phase@1` | 数值／武器数据 | 实际近战、敌方反击、伤亡及激活收尾；有／无 Stimpack 两房 |
| `fire-it-up-assault-phase@1` | 新语义，未完整接线 | 精确来源与逐模型选择组件；尚无 FT 攻击消费者证明 |
| `need-a-light-combat-phase@1` | 同一新语义的第二消费者 | Builder 真正购买／未购买的选择边界；尚无 FT 近战后继证明 |
| `incinerator-gauntlets-movement-phase@1` | 新语义，未接线 | 只精确编译来源；尚无 Fire Wall 设置、移动前 HITS 与原移动恢复证明 |

`Stimpack` 原通用编译器会把 Firebat 的远程武器误归为 C-14 Rifle。本批按精确 ID、正文、时点和 CP 费用单独绑定 Perdition Flamethrower，仍复用既有付款、非致命伤害、武器修正和清理消费者。没有新增完整游戏原子。

[原生证据](evidence/firebat-foundation.public.json)：远程有／无药分别 24／20 动作，近战有／无药分别 29／27，真实移动分支 22。攻击计划实际读到 PRECISION 3／0；费用后模型数不变、伤害标记为 2。移动分支中，同一 6.5 英寸提案在原 4 英寸速度下被 Native 拒绝，付款后原生上限为 7 英寸，四个模型真实移动并在清理后结束加成。没有改骰、回滚或代写后继；驱动参数／菜单选择纠正均在同一签名断点续行。早期无动作建房失败目录单列保留。

官方 [Firebat 商品内容](https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-firebat-terran-expansion-set)列出 40 mm 与 40×100 mm 底座，冻结图片可辨六个圆形模型底座及一个长形 Fire Wall。模型用 40 mm 圆底座，来源为商品内容加视觉关联，明确没有冒称 P2P。新增 geometry 2.3.0 为这类来源保留独立字段和严格校验，既有 Raven 轮廓、工程炮塔与步兵估算保留。[冻结底座证明](../../../content/source-releases/wave4-20261127/firebat-product-20261128/unit-base-source.json)与[七项来源检查](evidence/firebat-source.public.json)绑定原件字节，尺寸篡改和向旧 geometry 版本塞入新来源均拒绝。

冻结 HTML 保留服务器原始换行和尾空白，单独以字节哈希验收；代码及记账文件通过语法和空白检查，未格式化原始来源来消除其空白差异。

[逐模型选择组件](evidence/firebat-model-selection.public.json)使用真实 Builder 的小／大军组及付费 Need A Light?：远程 Supply 1 最多选 1 模型、Supply 2 最多 2，近战最多 1；所选模型不再出现在普通池，零选择保留全部普通模型。重复、超额和未购买升级拒绝。此项是四个组件用例、零签名动作，不证明覆盖、混合攻击池或完整后继。

[独立当前五房／122 原动作](evidence/firebat-current-cold.public.json)冷重建及实际棋子的 Stimpack 清理验证通过；旧 Consume／Plague 四房 14 原动作已再次只读验证，合计九房／136 原动作，描述器与原状态一致、0 新动作。[实际消费者映射](evidence/firebat-foundation-consumers.public.json)区分原生消费者、组件选择和仅编译来源。FT 的形状／尺寸尚待确认，正式资料未补齐；可选工程估算问题保持待答。两类模板组合和移动前 Fire Wall 继续接线，完成前不把 Firebat 放入整版 Builder 或宣称 Web 准出。39 条既有来源阻断保持隔离；80 mm 炮塔仍仅工程估算。付费模型、K3、AI 对局、复盘和生产发布继续暂停，模型调用 0。
