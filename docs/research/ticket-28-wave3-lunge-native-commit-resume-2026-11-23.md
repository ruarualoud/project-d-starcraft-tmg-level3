# Ticket 28 / W3-11 · Lunge 原生移动提交与射击续行

冻结 U83/C84/R50 + FAQ 1.3。复用已保存的 Standard 军表与棋盘开一个独立组件场景，开火前声明这组 Hydralisk 已有一名伤亡。该场景从真实原生射击、守方伤亡、优先权、1 Biomass 支付进入反应 Move。历史房间与已保存的多模型证据不参与重播。

## 改动与边界

普通 Move 和 Lunge 共用路径、扫掠、落点及状态提交。Lunge 行动必须绑定当前反应、实际支付效果、触发和几何哈希。当前可证明的提交范围为唯一活模型且实际完整底盘直线沿原射手方向。以固定起终点的直线下界证明最短，现有多模型绕行候选尚缺最优领队及其余模型证明，不能进入提交。此分支先用于原生组件的提交验收，正式 Match 与 Web 菜单仍未登记。

按原方向移动会处理普通 Move 的位移、地形和状态后继，保留原射手的激活窗口和射击序列。反应中的 Move 不占用 Hydralisk 的移动或突击激活。相同反应只能提交一次。

| 边界 | 验收 |
|---|---|
| 实际射击后使用 Lunge | Goliath 的 Autocannon 完整结算，Raptor 实际移除一名。守方付 1 Biomass，移动剩余 Hydralisk 1.010 英寸，Stationary 状态消失。 |
| 原射手续行 | 原有射击序列和当前行动方保留。实际选择结束射击序列后，原生后继清除该序列。 |
| 拒绝 | 改写几何哈希、重复消耗一次反应、射手续行后再用旧回执均拒绝。原有多模型候选仍不能直接提交。 |
| 冷读与原动作 | 从 JSON 冷读确定性复算 Lunge Move 和射击收尾，两份快照逐字段一致。对照改前模块，普通 Move 的域、动作、完整转移和 1.6.0 描述符一致。此处冷读为原生组件复算。 |

- [反应位移和实际射击收尾](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-single-model-native-move-replay.public.json)和[冷读与旧 Move 对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-native-move-cold-ordinary-compatibility.public.json)。
- [完整的预状态、动作与后态](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-single-model-native-move-checkpoint.json)。
- [权威提交](../../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs)。

正式 Match 仍需要在数值和模板射击收尾后持久保存反应与移动窗口，以签名回执核对菜单、预览、使用和放弃、续行与冷恢复。复杂路径最短性和领队／其余模型的最优摆位仍待。本轮模型 0，主 Standard 114/115，Ticket 28 2/16。
