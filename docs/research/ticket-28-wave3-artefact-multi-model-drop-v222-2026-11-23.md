# Ticket 28 / W3-11 · Artefact 多模型掉落

冻结 U83/C84/R50 + FAQ 1.3，使用 Standard 2.22.0 的同版任务、军表和 Room。先在声明场景由正式菜单判定 1 号点控制，两模型 Hydralisk 签名拾取。两条射击分支复用该签名状态，声明突击站位和目标首个模型剩余 1 点生命。骰子及防守方伤亡由权威动作结算。

| 分支 | 真实结果 | 掉落参照 |
| --- | --- | --- |
| Autocannon 移除一枚 | Current Supply 2 → 1，单位仍在场。触发 `current_supply_reduced`。 | 幸存的模型 2。 |
| C-14 rifle 移除全队 | 两模型按伤亡回执的顺序移除，Supply 2 → 0。触发 `destroyed`。 | 最后移除的模型 2，底座中心 (14.85, 22) 英寸。 |

两条分支都只给对手开放摆放菜单。全灭时，在靠近首个阵亡模型、离最后阵亡底座超出两寸的坐标提交预览，权威规则明确拒绝。首次夹具预期了错误的拒绝码，保留原记录并从全灭 r2 验收剩余摆放。对手在 (14.85, 23.6) 英寸放回标记，携带记录清空。

拾取两签，两条射击及摆放分支各三签，共八签。三房均重开 SQLite 并按原绑定精确冷回放。模型调用 0。撤回预备队、其他移除来源和 Skirmish 的 PLACE 时序仍需相应产品证据。

- [签名拾取](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/multi-model-drop-v222/claim/result.public.json) · [Supply 降低](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/multi-model-drop-v222/supply-reduction/result.public.json) · [全灭与最终落点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/multi-model-drop-v222/multiple-model-destruction/result.public.json)
- [首个阵亡模型附近的拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/multi-model-drop-v222/multiple-model-destruction/earlier-model-range-rejected.public.json) · [初次夹具停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/multi-model-drop-v222/multiple-model-destruction/stop-1.public.json)
