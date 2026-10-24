# P1/P3/P5：读取地址失败与能力缺失分离

## 当前结论

**真实恢复追加**：新请求 `fa68c0f50d16f12c8dbb251f9914dbcd0ada0f7c74353cea7fae2910c2af73fd` 确实完整携带该导航（正确路径、原失败身份、不得推断能力缺失的说明均在）；新回复 `557a7d03c898d5e94e433a26d4288d74e10e5f46e54b70a72b64c02efb966fec` 仍沿用旧解释，结果 `d5669932a7198d89f4f34b0e01f3b83a632779848a0dae67588a0c39348e72ca` 保留 necessary_fact/capability_unavailable。**传递修复有效，不等于语义纠错成功**。当前同产品进入 r17 六域独立审核，不批准军表/Plan；须核对其是否识别并回交该假前提，不手改模型答案。该新调用145,999units，Provider9.5秒；不是端到端耗时，未获得服务商实付金额，旧费用继续保留。

T27/S272，T27 5/6、T23 33/36，仍余 S272/S248/S249/S250 四片；正式 Plan 0/6，新对局 0/12。

v941 已实际关闭 Goliath 局部比较，不重新审核该比较。本次修的是其后继 Teach 的真实来源解释错误。定点读取、后继交接、实际请求捕获和路径异常验证分段通过；B 原目录从 event8297/r17 经同产品 HTTP 客户端继续，真实消费仍须观察。A、对局未启动。不把导航交付或用途修改算作策略提升。

## 实际过程

原件均位于 `build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/artifacts/`。完整脱敏请求、模型回复和费用不改写。

| 环节 | 实际发生什么 | 证据 |
|---|---|---|
| Teach | 关闭局部比较后，提出 Marine/Marauder 到达轮次和控点条件问题 | `fcfe5d3fb2b0cbc70618550d04348e6a02b8de32a3972cbf9e74886d9bd8af92` |
| 作者 | 首答 retain 却同时授权调查，被既有互斥操作检查拒绝；下一答自动改为 authorize_inquiry，只授权第1项 | 原回复 `8f452cfa0c360e2fef4a84014b399c56a65e2e1f2764b2fd486865d052f14c62` → `34904955b8e51fa3d937b30a196e7124e9e45b014dec1a5ef4d1aacb846caf79` |
| 查证 | 读到路线只证明 bounded_route_witness，同时将首轮初始化地址少写一层 | 失败读取 `cb8ea318d0bbd77f593723cf8257b40e6b3717858ba3dc4925ca8cd63f7bb6be` |
| 结论错误 | 把 path_missing 解释为工具无首轮初始化能力，未执行 Native 实验 | 原回复 `6a0b7d847bb5900fb980ec029ebd239a80dfc4a13ee45bc60849d1e06abc3642`，产品结果 `fe59a5672ffa97a13646840bbcc5752efebe44f9c0c8ee073e30b770175246b7` |
| 后继 | 战略负责人沿用该错误解释；产品补读6份来源，尚未批准结论 | 原回复 `1dd8ee07b6db379ad06b2c130135f74af1aa712944cf58e0cc2d933421625f95`；event8297，`evidence_reads_pending_recheck` |
| 安全停点 | PID3046按 SIGTERM 在本次操作保存后退出，0在途 | 原日志 `build/slice272-v941-authorized-author-live-1792734443553.log` |

### 错误与正确地址

同一真实工具合同原件：`2a76205ae51e63dc2737e8f3d21c36b9fde0a007716e38f912af1403c7262b2e`，当时资料编号940。

- 错：`/operations/7/capabilityContracts/firstRoundInitialization`
- 对：`/operations/7/specContract/capabilityContracts/firstRoundInitialization`

工具存在该能力。**这不代表到达轮次已被测量，也不证明任意未来回合路线可达。** Native 不能越过当前回合、不得自演整场比赛，是现有实验范围的真实限制，保持不变。

## 修复

1. 共同 reader 对普通精确路径缺失返回最近存在的父地址、可用键和同源候选地址。仅在局部对象中有界搜索，不读取全历史、不模糊替换原地址；仍返回 path_missing，不登记成功读取。
2. 同一纯导航函数为已保存失败生成诊断，经工作图的直接负责人关系交付给后继。不是靠任务名猜关系；生产发布的角色证据是 result.value 投影，不能用它的 hash 当整个 resultRef。
3. 导航明确 `capabilityAbsenceProven:false`：缺地址不能证明缺能力。模型须自己读取有效地址、重新判断方法；工程不改原答、不补 Native 结果、不批准 Plan。

提示只增加工具导航和证明范围，不注入选兵、路线或风险偏好。旧失败、当前未解项和费用保留。

## 定点验证（无模型、无 Native、无生产状态写）

脚本：`scripts/debug-slice272-path-navigation-v942.mjs`。

- `build/slice272-v942-path-navigation-red.json`：真实错误地址缺导航，RED。
- `build/slice272-v942-path-navigation-green.json`：core读取/不自动读/有效地址读值完全相同通过；后继未关联失败。修为使用已有工作图的显式父关系。
- `build/slice272-v942-owner-navigation-green.json`：真实后继交付通过；请求捕获夹具未返回生产要求的完整目录，失败。只修夹具，不降低生产检查。
- `build/slice272-v942-request-navigation-green.json`：实际角色请求捕获通过，导航未被局部压缩隐藏；多候选/无候选分支通过。发现 helper 接受非 JSON Pointer，补与 core 相同的格式约束。
- `build/slice272-v942-pointer-format-green.json`：按已有定点追加授权，只补未通过格式/转义/已存在路径，GREEN。

以上是分段证据，不把含失败报告的文件名当整体通过。每段已经通过的检查没有重复执行。没有全量测试、旧门重跑、新代理、提交或删除。

## 原断点实际恢复

PID47899：

`node scripts/run-slice272-product-generation-v645.mjs --resume build/slice272-product-generation-v645-8aBuEV --mode editable`

日志：`build/slice272-v942-path-navigation-live-1792737077524.log`。

不再发送已消费的 v941 审核授权，不重算旧实验、不重建房间、不清费用。下一检查真实请求是否收到导航、是否纠正能力解释并产生可执行的有界后继；只有真实结果才能说明收敛。

性能旁证：此前一次5秒CPU样本含 structuredClone，且多数采样空闲，不能据此认定整个过程的主要瓶颈。本次没有进行无证据的性能重构。
