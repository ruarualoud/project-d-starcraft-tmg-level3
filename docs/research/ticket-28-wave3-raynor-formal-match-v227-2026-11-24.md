# Ticket 28 / W3-08 · 雷诺游骑兵势力卡进入正式 Standard Match

使用同一份冻结 Wave3、同一个 Fire in the Sky 任务、同一个虫族对手。雷诺的势力卡包含 Rapid Ingress 和 Ready for Pickup? 两种用法。纯 Marine 军表在 2.26 只覆盖 13/15 项，2.27 已覆盖 15/15 项，正式开局给出首回合任务动作。装备 Internal Tech Module 和 Explosive Shrapnel Shells 的 Raven 军表从 14/21 提升到 16/21。预检与实际开局一致，五项剩余缺口为侦测、反装甲导弹、部署自动炮塔、爆炸弹片与内部科技模块。

## 实际动作

两个隔离房间使用同一军表、同一部署坐标和第一回合移动阶段。开局准入另从正式工厂的初始状态验证。采用预设部署以便分别检验同一张势力卡的两种消耗方式。

| 选择 | 公开菜单、签名动作及可见结果 | 后继 |
|---|---|---|
| Ready for Pickup? | 六个 Marine 各平移 5 英寸，势力卡耗竭，标准动作已消耗 | 只剩结束激活。完成交接后轮到虫族。 |
| Rapid Ingress | 在 (18, 9.5) 英寸生成一个己方防御无人机，卡耗竭，生成物带回合结束移除标记 | 原 Marine 可以移动或结束激活。本次选择结束，随后轮到虫族。 |

每个房间有两份签名回执。关闭后读取原绑定，重放两步得到与持久库相同的完整状态。另以两支 Marine 在第二回合的菜单为受控对照，势力卡均为就绪。没有历史用量时，两队均可撤离；加入第一回合实际撤离回执中的用量后，两队均失去该选项。此项为正式 Match 菜单验证。无人机实际回合末移除及其激光拦截仍需在后续跨阶段组合中核验。

## 修改与兼容

2.27 复用已有重定位、生成单位和射击消费者，让正式军表准入和房间执行共享同一组能力。撤离限额按势力卡实例与所属方保存。2.26 原房的描述符按原绑定重建，逐字段一致。本次零付费调用。保留夹具的原失败记录，包括坐标浮点表示、激活收尾的参数域、预览原状态字段及只读样本。

[军表准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raynor-match-v227/admission.json) · [撤离及交接](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raynor-match-v227/pickup/handoff-cold.json) · [无人机及交接](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raynor-match-v227/ingress/handoff-cold.json) · [第二回合用量对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raynor-match-v227/pickup-refresh-control.json) · [2.26 绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raynor-match-v227/legacy-v226.json)
