# Ticket 28 / W3-08、W3-10 · 几何来源与风暴施放

Archon 的 High Templar 装盒清单分别列出风暴模板、小标记和 40 mm 的模型底座。社区讨论的 120 mm / 5 英寸都指模板外圈，当前冻结外圈仍按 127 mm。评论附图未能读取，无法核对是否含中心小标记或比例尺。 [厂商装盒清单](https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-high-templar) [社区原帖](https://www.reddit.com/r/StarCraftTMG/comments/1y26o4g/psionic_storm_template_size/) [实拍评论](https://www.reddit.com/r/StarCraftTMG/comments/1y26o4g/psionic_storm_template_size/19szjnjuyxgv9/)

Raven 可确认 100 × 100 mm 外廓。实物拥有者这次给的是整机与安装高度。可读取的支架照片受透视和模型遮挡，无法量出两条臂宽或完整落地轮廓。 [厂商说明](https://starcraft-tmg.com/news/rules/starcraft-miniatures-game-raven-nova-terra-wave-3) [外廓讨论](https://www.reddit.com/r/StarCraftTMG/comments/1x2btav/the_raven_stand_looks_unsafe/) [拥有者实测](https://www.reddit.com/r/StarCraftTMG/comments/1xhqxo0/my_loot_from_spiel_2026_the_raven/)

候选 3.213.0 接入 Storm／Gale 的移动施术菜单、底盘边缘测距、共用地形视线、付费、物理 Token 与阶段末中心。沿用已签正式场景军表，隔离 Gale 房显式用 40 mm 假设值做工程验证。公开查询与签名预览一致，支付 2 PE，成功放置并绑定中心，同一回合重复施术拒绝。缺付费、超距、与模型底盘重叠均拒绝；一条实际施术签名冷回放精确。 [签名证据](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/result.public.json)

当前冻结数据中心直径仍为空，真实菜单无施术动作，查询给出缺尺寸原因，房间维持 r0。旧 3.206.0 描述符全量相等。第一次夹具请求了尚未出现的 Pass，第二次落点碰到底盘；已保存两项证据。 [冻结拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/frozen-input-rejection.public.json) [首次夹具](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/verification-stop-1.public.json) [第二处夹具](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/verification-stop-2.public.json)

尚待确认中心实测值、Storm 已购升级实际施术、实物规格的跨阶段与清理、非等价同名裁定。Raven 仍缺两条支架臂宽与确切底面轮廓。本轮零模型，Wave3 组件仍 151/162，正式 Match 3/26，Ticket 28 2/16。

## 同房 r1 至 r9 续行

复用已签施放 r1，完成激活、移动末与突击末。原 Token 和中心贯穿两阶段。移动末对目标 5 骰造成 2 点非致命伤害，突击末对同一目标 5 骰形成 4 点标准伤害。随后房间进入近战 r9。保留原 r1 的签名、哈希和费用，8 条新增签名冷回放精确。

r9 的 3.213.0 组件原生菜单没有可提交的近战推进动作，故完整回合 Cleanup 尚待验。实物中心尺寸仍缺，本段沿原隔离房的假设尺寸。 [连续验收](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/gale/lifecycle-result.public.json) [r9 公开菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/gale/lifecycle-combat-menu.public.json)
