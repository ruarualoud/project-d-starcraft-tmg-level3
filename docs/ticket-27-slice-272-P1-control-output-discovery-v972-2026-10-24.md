# T27 / S272 P1：控点输出可发现性修复 v972

## 停点与范围

- 同一 B 产品工作流 `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，r22 / event11369；PID75940 已退出，无在途调用。
- 来源审核争议已通过既有分流交回 `product:after-teach:r22:subject-v1:investigation:strategy-frontier`。这次责任交接有效，不是又派事实重写；不能把 `requires_revision` 本身当成分流失效。
- 仍未解决：原调查把“控点工具说明未列出范围”推成“无法取得范围”。现有原生工具实际返回该字段，缺的是能力说明的具体性，而非新规则算法。
- 军表、Plan、必要未知项、历史证据、费用均未改。正式 Plan 0/6、新局0/12；T27 5/6、T23 33/36，余 S272/S248/S249/S250 四片。

## 修改

只修改 `packages/online-agent-session/spatial-query-contracts-v1.mjs` 的共享 `mission_marker_control` 描述：

- `proves` 明确返回争夺范围、标记半径、视线政策及逐标记控制结果；未提供动作域时也可只读当前场景。
- `resultFields` 列出实际字段、单位和适用边界，不写入规则阈值常量，不把说明视为已获得的测量。
- 写表方法合同、设计能力目录、分块工具目录和线上 Native 工具都继承同一描述。规则原子、工具执行和判定不变。

## 本次一次 RED → 一次 GREEN

脚本 `scripts/verify-slice272-control-output-discovery-v972.mjs` 只复现当前缺陷。

- RED / PID85799：原描述未暴露 `contestRangeMilliInches`，断言失败；未发模型请求或动作。
- GREEN / PID86064：共享描述四条投影一致；经产品 SnapshotSceneQueryService 调用原生控点查询一次，实际输出包含全部声明字段，原状态 hash 不变，0动作、0模型、0VP授予。
- 冻结夹具实际返回争夺范围3000 milli-inch、标记半径630 milli-inch、5个标记，LOS政策为 `same_elevation_official_terrain_los_marker_effective_size_zero`。这些是该冻结数据查询结果，不是新下载的规则、也不是当前 B 已完成的新调查证据。
- 未重跑此前通过的门禁。未提交 Git、未新建房间、未清理文件。

## 下一步与循环止损

从原决策停点加载新合同，观察模型是否选择有效方法/作出有依据的决策；本地接口验证不等于模型已正确使用，更不等于整体 Teach 收敛。

同问题、同证据、无有效决策或事实进展，立即停止受影响循环。v971已自动覆盖相同无效结论/相同错误/无新读取的确定性重复及冷恢复；语义改写式空转仍需观察，不宣称自动检测已覆盖全部。不得增加额度、删除未解问题或清空历史以续跑。

## 实际恢复观察

PID87021，日志 `build/slice272-v972-control-output-1792779389704.log`，同 `run-slice272-product-generation-v645.mjs --resume <原B目录> --mode editable`；没有恢复旧成功请求，没有新建房间。启动时r22/event11369，实际作者消费待记录。

### 实际失败与立即止损

新合同已发布为 event11370 / `20edf2ab8ca9ec8c25c75e72e66b946cf341bed8995546ca02b85029429eec73`，但真实作者请求 `083847bd…` **没有当前能力目录**（567474字符）。回复 `8b958954…` 仍引用旧合同940，声称没有控制范围输出，并建议清空计分目标。发现后立即发出一次SIGTERM，不直接续下一调查。

安全退出完成了当时正在处理的决策及结构化纠错：`bd4c4118… → 867dc3a2…`，最终保存r23 / `b358103f6cb89e284cbe00cb602895fc74a7e12faa214a1ec92673d98598c139`，只有scoreRoute变为unknown/空targetVpSchedule，军表不变。**不是策略改善、不是正式准出。** 两次调用合计481443 units、Provider42.523秒，全部旧账保留；0新Native/房间。

最新停点 **event11454/r23，PID87021已退出/0在途**，`product:after-teach:r22:subject-v1:investigation:strategy-frontier:followup:r23` ready但未执行。其调查仍由缺能力信息的旧决策提出；不要未经核对直接启动。

### v973：修正真正的策略角色接线

根因不是描述更新未落盘，而是产品Run只给方法角色当前完整合同，给设计Teach当前能力目录，却未给负责选择调查方法的策略角色当前能力目录。旧证据仍正确保存，但被拿来判断当前工具是否可用。

修改 `packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs`：每个新策略角色请求附上由实际 `tool.descriptor()` 投影的 `currentToolCapabilities`。该目录明确不是测量、没有执行权；保留历史引用，当前能力与历史观察分开。

`scripts/verify-slice272-author-capability-delivery-v973.mjs` 使用真实失败问题和旧合同，经实际产品Run→正常角色→请求构造，内存存储，Provider前截获：

- RED90247：当前能力目录缺失。
- 90380：策略prompt接线、Native输出说明、无观察/执行权、旧合同原样保留全部通过；最后仅夹具把不存在的draftRef误断言成null而失败。
- 修正夹具后，只跑 `--remaining-empty-draft` / 90580，未重跑已过的接线检查。0模型/原生查询/生产写。

**真实v973消费尚未验证，整体Teach未收敛。** 下一先让受影响的策略决定依据当前能力重新审视，再决定是否执行其原后续调查；不能沿旧“工具无此能力”判断继续重启、重复测量或删除未知项。现有r23和全部原件保留，不手改Plan或洗掉错误历史。
