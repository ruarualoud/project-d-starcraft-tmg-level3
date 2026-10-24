# P2 v654：只读Teach不应等所有事实调查结束

T27／S272，2026-10-20。继续新P0–P6流程，不是最终生成验收。

## 真实失败

同一正式产品流程已有当前Plan及完整分块，但 `nextStage` 一开始只要看到 `readiness.activeWork.length>0` 就返回。因此subject-v1 Teach一直未排入，固定表r3仍由旧事实链占住；960矿从头写表虽已提交Plan r2，也未开始新Teach。这不是需要重建工作流或重新生成军表。

## 改动

只调整 `roster-decision-product-journey-v1.mjs` 的依赖顺序：

1. 尚无Plan时，初始总体决定仍等待当前事实工作。
2. 当前Plan存在时，可以先排入同版本、只读的subject-v1 Teach，读取实际被审Plan。
3. 总体改表／改Plan及最终发布仍等待activeWork结束。旧问题／事实审核不取消、不当作通过。
4. 所有角色仍绑定当前军表／Plan版本；正常版本失效与串行提交门不变，没有后台直接修改军表或新模型侧路。

## 定点证据与边界

`scripts/verify-slice272-product-teach-readonly-overlap-v654.mjs` 使用实际固定表队列：

- RED PID21074：已有Plan、独立来源工作未完成，正式journey仍排0个Teach。
- 首次GREEN PID21607：真实生产恰已完成这批独立工作，动态夹具没捕获原场景，止于夹具前提，未证明修复失败／通过。
- 固定为实际保存的 `2026-10-19T21:15:39.188Z` 队列观察、同r3不可变草案后，一次GREEN PID23092：排1个只读Teach、0个变更决定，原事实工作保留。
- 使用正式journey、job port替身，0真实Provider／Native／生产写。日志 `build/slice272-product-teach-readonly-overlap-v654-{red,green,green-frozen-fixture}.log`。没有重跑v648–653等通过门。
- 这只证明调度接缝。模型实际读取／正确质疑／修改，仍需看下面两条原产品工作流，不能用排队数替代。

## 继续执行的位置

原PID15211／15212已确认终态，两日志有finished/stopRequested。仍是原目录／workflow，不创建替代：

- editable：`build/slice272-product-generation-v645-M86Cg9`，workflow `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1`，PID23347。
- fixed：`build/slice272-product-generation-v645-I7zekC`，workflow `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34`，PID23348。

日志 `build/slice272-product-generation-v654-{editable,fixed}.log`。旧付费记录／来源审核／未知费用保留，没有重发v647恢复。

T27 5/6，T23 33/36；相关剩余S272/S248/S249/S250共4片；正式Plan0/6、游戏0/12。当前仅启动新码，真实subject-v1读取与最终军表／Plan准出仍未计为通过。
