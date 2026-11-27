# Project D 长任务路线图

唯一执行位置由活动工作树 [CURRENT_WORK.md](../../../CURRENT_WORK.md) 和[结构化计划的 deliveryGoal](../../../coordination/wave3/implementation-plan.json)给出。2026-11-24 用户报告 Wave4 数据已出，并指定顺序为 **Wave3 → Wave4 → F7 复盘与 AI 对战 → 其余 Ticket**。

## 当前交付与换版条件

| 顺序 | 交付与准出 |
|---|---|
| Wave3 | 沿现有 16 项完成冻结 U83/C84/R50 + FAQ 1.3 的单位、卡牌、规则、地图、任务和部署。逐项从合法菜单到预览、提交、下一动作与恢复。Web/App 双人工席验证建房、写表、操作、回合结算、重连和回放。更新 Builder、Plan、Teach、对手、复盘与副官的发布绑定，补齐新增单位媒体。 |
| Wave4 | Wave3 独立工程和双人工产品验收收齐后，单独冻结官方写表器原件、版本和哈希，以 Wave3 为基线做差分。区分单位或模式、增援与衍生物、卡、任务、成本或文本、真正改变的规则和资产。复用未变能力，逐项核验受影响的生产消费者、正式房间、双人工流程、媒体和旧房回放。Wave4 的规模由冻结差分给出。 |
| 复盘与 AI 对战 | 两版上述工程和媒体验收齐备后，按调用授权执行真实写表、Plan/Teach、人机／机机、副官以及 F7 四路学习。保留每局原始数据版本，跨版用独立房间并列比较。历史局可用作对应版本的复盘材料。 |
| 其余 Ticket | F7 使用无学习基线对照 WikiSkill、SkillOpt、Memento2+ViSTA 与混合路线，按留出场景决定晋升。T27/S272 收口写表与 Teach，T23/S248 继续已约定的敌表、对抗和地图对照，T24 再扩展余图。 |

Wave3 的 16 项独立计数。若 14 或 16 只欠真实模型验收，登记具体边界和旧绑定，Wave4 工程可接续；这些项仍待真实验收。生产发布和付费调用沿用原授权。当前只执行 Wave3，历史实验保持停点。

## 两次换版共用的媒体验收

| 产品行为 | 逐版证据 |
|---|---|
| 棋盘和写表能认出单位 | 按冻结的单位、模式和衍生物的稳定 ID 核对数据库、写表和战场的实际显示；棋子使用与具体兵种或变体对应的游戏动态通讯头像。卡图独立验收。Zergling 和 Roach 各专属变体逐一验证，借用基础单位头像不得计为完成。标记、召唤物、变形前后和同族变体均要能区分。 |
| 点选单位能看到通讯头像、听到对应声音 | 对照中立／选中状态、已有动态头像和选中／确认／受伤／阵亡四类事件。记录实际文件和发布渠道，实测播放、静音和同一事件不会重复播放。副官头像保持独立绑定。 |
| 对战音乐在换版后仍能用 | BGM 属于整张战桌。Web 和 App 沿用已有的本地选曲、播放／暂停、循环和音量，与单位语音分别验证。 |
| 准出 | 每个新增或变更记录登记媒体键、来源、适用发布渠道和消费者。资产缺口单列，错误角色、空头像或通用占位不能计作覆盖。保留桌面、窄屏截图及音频实际加载／播放凭据。旧版房间按原绑定恢复；展示与音频不参与规则计算。 |

已有产品代码可直接复用：[单位媒体与音频政策](../../../packages/client-domain/battlefield-media-catalog-v1.mjs)、[Expo 媒体资源](../../../apps/starcraft-tmg-expo/lib/level3/battlefield-media-assets-v1.ts)、[战桌渲染与播放器](../../../apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx)、[媒体来源登记](../../../content/client/battlefield-media-provenance-v1.mjs)、[副官头像](../../../content/characters/companion-portrait-asset-registry-v1.mjs)。

2026-11-24 将相对 Wave1 新增的 19 条 Wave3 单位 ID 逐一传入现有战场单位媒体解析器。18 条返回空，Vileling 被名称匹配误归到 Zergling；按此 ID 没有一条命中新增单位专属键。这是解析器覆盖的基线，现存的图片、音频及其许可仍要逐件核对。[冻结来源凭据](evidence/T28-W3-01.md) · [产品验收卡](05-slices-13-16.md) · [F7 研究计划](../../research/ticket-23-slice-249-faithful-method-development-plan-2026-11-10.md)

[19 项冻结单位的媒体键与两版产品验收清单](evidence/release-media-wave3-wave4.zh-CN.md)。
