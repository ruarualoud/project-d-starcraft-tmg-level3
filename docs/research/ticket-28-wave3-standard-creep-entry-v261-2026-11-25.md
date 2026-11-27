# Ticket 28 · Queen 桌边进场时的菌毯位移

## 场景与输入

冻结的 Wave3 Standard 2.61.0，任务为 Fire in the Sky。Kerrigan 在独立来源房间实际打出 Hatchery，生成中心位于 (16, 4) 英寸的己方菌毯。目标房间从该签名棋位设置为第二回合另一轮己方激活，Queen 从普通桌边进场。此处验证一个条件局面，跨激活设置由夹具提供。

Queen 的底盘纵深为 3.150 英寸。规则器把底盘贴住桌边时的中心定在 (16, −1.575)，当次可移动 4 英寸，沿直线可达 (16, 2.425)。初次夹具让中心直接到 (16, 4)，实际要走 5.575 英寸，权威预览以超过移动距离拒绝。修正后按正式动作域的入口和移动额度生成终点，保留原房间、来源和失败记录。[真实几何](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/entry-geometry.json) · [初次拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/stop-1795551019717.json)

## 玩家界面

共享战桌已为中英文补全标记位移提示，明确触发条件为领队结束移动时与标记重叠，并区分非法坐标和最近落点证明不足。普通桌边进场超出速度时，两种语言均提示从桌外贴边量起，可缩短路径或更换进场点。原生运行时返回带动作名的错误，客户端通讯层会提取主错误码。两组定点组件检查各通过中英文 2 项。这是共享组件交互证据，双端实机验收另计。[标记提示](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/editor-feedback.json) · [部署距离提示](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/editor-entry-distance.json)

## 真实部署、人口与回放

领队在 (16, 2.425) 停下时，与中心在 (16, 4) 的己方菌毯重叠。漏填标记落点，预览返回 `PSIONIC_DISPLACEMENT_PLACEMENTS_REQUIRED`，房间仍为 r0。共享查询绑定同一房间、同一行动域、同一菌毯，返回 (18.126, 2.425)，底盘间隙为零，查询没有执行权限。

席位 2 使用这个坐标签名。r1 先记录 Queen 入场，再记录菌毯位移，己方菌毯保留。Queen 从预备队转到桌面，桌上人口 1 → 2。该席位仍可使用当前激活的能力，也可以结束激活。关闭并重新打开运行时后，从初始信封回放这一条签名，得到与提交后完全相同的房间信封。

[缺选点拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/omitted.json) · [共享工具落点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/query.json) · [实际采用的参数](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/choice.json) · [签名后继与冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/result.json)

## 激活结束与对手接手

部署后的菜单包含绑定到 Queen 的结束激活动作，参数为空。验收最初将它当作固定按钮查找；实际产品将其作为单位绑定的动作域返回。已修正验收调用，直接从已签 r1 使用当前单位的动作域。[首次交接夹具记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/stop-1795552110146.json)

席位 2 实际完成 Queen 激活，签名将房间推进到 r2。席位 1 随后从自己的公开菜单可选 Pass 或 Deploy。虫族桌上人口仍为 2。重新打开房间后，用 Deploy 与 Finish Activation 两条签名重建出的完整信封与 r2 一致。来源卡房仍在 r1。两份原始失败均保留。 [交接与双签冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-standard-entry-v261/handoff.json)
