# Slice 174：卡牌组合草稿的人工来源债务

本记录不刷新游戏来源、不修改已付费草稿，也不是全章验收。生成来源为 `faction-v1-54e27ea11ecf1082df30`，Terran 第六章 `card_packages.1`。

## 必须在最终组装前解决

首条建议的 `risk` 含：

> 两者均 Unique，错误选择后无法在同一军队中补购另一张。

这把“同一张卡的重复份数限制”误写成了不同卡之间的互斥。

冻结输入中的 `core.Rj6sMyNODPQ8OHUc9Clp.items.1.subItems.4` / `p1` 说明：标记 Unique 的 Tactical Card 只允许包含一份。`core.u3zNStKpd5XegMjmJfMS.items.3` / `p1` 的措辞更明确：`only one copy of this card`。两份来源没有把不同的 Unique 卡变成互斥选项。

同一建议的 `procedure[5]` 已正确写“只能各购一张”，因而还是一处建议内部的矛盾。不能仅因为 supportive 模型说 supported 而忽略。

验收要求：删除这项无依据的互斥断言；保留预算、槽位和各自一份的真实限制；重新检查该建议全字段及双路来源审查。最终独立消费者/组装前复查实际最终候选，不允许只把本记录标为处理完成。正式发布和运行时仍未获准。

## 与本轮传输修复的边界

恢复 18 条 focus/302 字符原始引文，只证明传输容量和精确引用绑定，不改变 supported/negative 原判断，更不证明这些判断符合来源。Teach 缺 `uncertainties` 的 Host unknown 标记同样不等于模型已经做过不确定性分析。

## 独立回归检查已实现，尚未应用生产

`packages/skill-evaluation/faction-card-package-source-audit-v1.mjs` 用实际历史草稿复现这一处 risk 错误，绑定两份冻结来源 p1 原句；来源变更、重复目标和不存在目标都拒绝。检查只识别这条完整已知原文，不将关键词匹配当通用语义判定，也不把“未发现这条错误”视为其他文字正确。

`scripts/verify-ticket-18-faction-card-package-source-audit-v1.mjs` 已通过16组检查，0Provider，回执 `004844843b63e87e23edb994219d3033ec5fcaba11c1b411a51e43625c9f8b47`。修正提案只替换这条 risk 中关于不同 Unique 卡互斥的句子，其余字段逐字不动；保留原已付费草稿。提案明确 productionApplied=false、freshWholeSectionReviewRequired=true；未接入正在运行的配方或最终验收入口，故本债务仍未解决。后续应绑定实际最新候选，应用后重审，不能直接用该提案当最终 Skill。
