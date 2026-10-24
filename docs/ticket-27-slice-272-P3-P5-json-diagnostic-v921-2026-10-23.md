# T27/S272 P3/P5：工作单编码诊断与原停点恢复（v921）

## 真实问题

A 的 Raptor 场景准备尚未执行。三份失败 `37b5b470…`、`b8b8e6b2…`、`229c1249…` 均为 `ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID`，但 detail=null。实际外层 JSON 合法；内层 `argumentsJson` 是对象，而旧兼容字段要求 JSON 字符串。模型因没有失败层级信息，先后修改了坐标字段命名和单位字段，仍未触及实际编码问题。

停止时最后一次原回复 `65500e7b0b180e7101eda3b444d5e5c23db2fc3e9e443d0b250a4d3b76272372` 仍解释成“嵌套引号未转义”，原始错误依旧没有细节。不能把这几次拒绝算 Native 几何失败、策略比较完成或工具能力不可用。

## 来源修复

1. 共享解析器保留原拒绝条件，补充 stepId、operation、外/内层、解码后字段路径、期望编码、实际类型。
2. 内层空间查询同时返回同源 Native 参数合同，指向已有标准 `queryArguments` 对象形式；明确 stateRef/base/contextRef/seatKey 在外层。错误诊断不替模型移动父态、选坐标或补字段。
3. 对旧 detail=null 的未执行工作单，由同产品编译器重查原输入。只有同一错误现在确实有精确诊断，且此前未使用这份诊断恢复，才追加一次作者纠错。旧错误、原回复、计数与费用保留，不执行旧订单，也不把它改成合法。

## 定点证据

- `scripts/debug-slice272-json-diagnostic-v921.mjs`：真实 A 失败 RED→一次 GREEN；内层对象/字符串错误准确定位；显式注入的正确准备步骤可编译，父态与坐标等值；外层坏 JSON、错放父态、缺 Native 字段仍分别拒绝。注入输入只用于测试，不写回模型产物。
- `scripts/debug-slice272-json-recovery-v921.mjs`：实际 A 三轮停点 RED→一次 GREEN；原失败不变、纠错任务收到新诊断；已交付过诊断、已使用恢复、请求在途、无关错误不能再开窗口。
- 四份结果位于 `build/slice272-json-{diagnostic,recovery}-v921-{red,green}.json`。
- 零 Provider/Native/生产状态写，不重跑旧门禁。通过证明格式诊断与恢复，不证明场景几何、攻击概率或战略优劣。

## 续行状态

旧 A15382/B15403 均退出，pending=0。原目录同版恢复：

- A27378，`build/slice272-product-generation-v645-hsxEYu`，起点 r3/event6631，日志 `build/slice272-v921-json-diagnostic-fixed-1792711518884.log`。
- B27392，`build/slice272-product-generation-v645-8aBuEV`，起点 r8/event6920，日志 `build/slice272-v921-json-diagnostic-editable-1792711519247.log`。

下一证据必须是 A 在产品流程中利用新诊断完成纠错，及 B 当前作者真正正确使用来源并完成受影响审核；不能用测试通过替代。正式 Plan 0/6、对局0/12，T27 5/6、T23 33/36，余4片。

修改生产文件：`roster-workflow-laboratory-v1.mjs`、`roster-decision-workspace-run-v1.mjs`。另增加两个上述具体 bug 复现脚本及施工记录。未提交、无安装、无删除、无子代理。
