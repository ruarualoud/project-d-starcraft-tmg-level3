# T27 / S272：场景投影参数源头合同 v817

P3/P5；T27 5/6，最终 Plan 0/6、对局0/12，相关剩余 S272/S248/S249/S250 共4片。

## 真实故障与自动恢复

同产品 Run `slice272-product-generation-v645-lqMWaS` 的 e7184 保存失败回执 `2d302f0cd7d56be0ad3809032ef878f83b6621751f97df043332580274b4808e`：候选单删 Scatter 升级已 legal，但 `comparisonScene.changedUnits:["goliath-1"]` 被 Native 拒绝为 `PREGAME_LAB_SCENE_PROJECTION_INPUT_INVALID`。另一候选在 e7203 同样失败，原件 `764e1d14455c8b5eba3fda38a9b2b6a7450d0960dff134ce33e98a4b46268aa5`。

排查：候选工具只描述 `changedUnits:[]` 和“显式列出适配”，没有给元素结构；直接 Native 工具则另有准确结构。保存参数与模型输出一致，未发现包装层篡改。错误直到 Builder 审核、候选场景构建后才检查，浪费构建并增加纠错往返。

原 v816 进程已自行纠错：`6d493559f30e99ebdce8790077749cf3d40566ebde1d7cb8097df626e58a2c57` 将字符串改为显式 `{unitId,mode:"repack_at_reference_anchor"}`，保留同一候选 delta 与参考状态，e7216 入队；中间一次 schema 错误已由原局部纠错自行修正。未手改模型提案。另一候选的辅助步骤绑定也由模型自行修正。此时尚未取得两臂正式火力结果。

## 修改

- Native 投影模块统一导出输入描述和形状校验。候选工具说明、直接投影工具说明、失败修复回执读取同一合同。
- 明确 `changedUnits` 是对象数组，模型集合未变且要保留精确位置时用空数组；升级变化本身不是必须重新排布的理由。Host 不选择位置或改写模型参数。
- 候选入口在读取当前军表、Builder 审核和候选环境构建前执行同一校验；Native 保留相同校验。环境、几何、合法性规则没有放宽。

## 定点验证

`scripts/verify-slice272-projection-input-v817.mjs` 使用实际 e7184 请求与当前正式军表，只隔离 Builder/构建外部依赖，执行真实候选入口及 Native 投影编译。

一次 RED：错误输入触发 current/Builder/construction/projection 各1次。修复后一次 GREEN：四项均0，返回同一错误和准确共享合同；合法精确位置请求继续通过，candidate delta 与原候选逐值相同，位置不变、输入不变。0 Provider、0正式生产写。旧门未重跑。

这个门证明早期参数检查与合法路径保持，不替代此前产品冷恢复门，也不证明战斗或策略优越性。正式军表仍 r4/2000矿170气，未最终验收。

## 加载

5531已正常保存退出 e7225，确认0running/0pending且没有其它生成进程后，25795加载v817续行同Run，日志 `build/slice272-v817-live-1792570533023.log`。不新建军表/房间、不重置轮数和费用，不额外恢复已耗尽的审查。

停止前的真实成功：e7221回执 `5966ebb98f88bbc388b9805084a31e46686384b09ef4ba7a48187917832ce68a`，haywire-only候选legal，Native场景投影ok，候选上下文 `candidate:0c7f65aa2321b866b4467703db2f01c15da750bd643fe66c35029f648e5bd5fc`，后态 `194d3df69308aaf3c5fefb9d7e4db283eed8df06b5f2ce827cbf48eb2c781ce0`。Raptor精确保位；Goliath按模型显式适配、实际锚点仍(8,6)，单模型。e7223已用此实际结果回接上一失败步骤。这是v816自动纠错成功的实际证据，不是v817新合同已改善模型效果的证据；还没有第二臂/火力比较/策略准出。
