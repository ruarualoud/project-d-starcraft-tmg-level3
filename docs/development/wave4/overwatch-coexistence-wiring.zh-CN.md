# Auto / Ocular 同房接线

已复现并修复两种Overwatch同房构造失败。**2原生分支21次签名动作、Web2房5次确认、4房29个原动作冷读通过**。这是已有Overwatch/反应额度/数值射击原子的新组合；本批新增完整原子0，累计仍6/18。实际消费者与导出见[映射](evidence/overwatch-coexistence-consumers.public.json)，完整工具闭环见[harness](evidence/overwatch-coexistence-harness.public.json)。

Root3.234、Overwatch1.2按每个实际来源绑定武器、选择效果与完成历史；旧单来源1.0/1.1及其Root描述符保持。HITS不再争抢双来源的激活结束触发。拒绝双来源窗口时写共用完成历史，实际选择后归属相应炮塔。

| 精确定义 | 分类与实际消费 |
|---|---|
| unit:auto_turret/overwatch-assault-phase@1 | 既有原子复用；Gauss射击Ground感染步兵 |
| unit:infested_missile_turret/ocular-overwatch-assault-phase@1 | 既有原子新组合；Firefly射击Flying Raven，再与Gauss/反应额度共存 |
| unit:infested_marine/detonation-any-phase@1 | 尚未完成的新增语义；Ocular使用后被额度阻止，拒绝后可实际发动 |

原生使用Ocular分支9动作：Raven真实Run/结束→Firefly→感染步兵真实Run/结束→Gauss；同方阶段外额度已用，Detonation不出现，原伤亡仍完成。拒绝Ocular分支12动作：同样实际激活后Gauss→Detonation→HITS→原射击；Auto-Turret实际阵亡。两种炮塔的激活标记复原，Supply一次，均幂等与关闭重开冷重放。下一席按封存的resumeSideKey恢复；另一方已无可激活单位时可继续原席，不能写死交给另一方。首分支因测试写死下一席而停在head9，按签名恢复补验，未重复提交原动作。

只读冷验旧Auto4、旧Ocular4与本批9/12，共29动作，逐前缀核对5个实际射击grant及来源武器，描述符和Envelope一致。此前5房63动作兼容门也在本次修改后通过。Firefly只射Flying，直接射Ground感染步兵依然拒绝。

Web首房从原生head2完成Ocular与Firefly两确认；第二房从原生伤亡前前缀完成Detonation及后继三确认。独立1500/390浏览器，预览只读、页面错误0、席位刷新恢复与重放一致。首房驱动漏选目标而停在已确认head1；补显式目标选择后使用--resume-confirmed核对并接续原签名日志。5确认包含这1笔已落盘动作，未重复计算。截图已检查，5484已关闭；整版大厅/Builder和完整跨回合Web仍待。

范围为双方各一类炮塔。此前把Stukov进口Raven列为待办有误：Raven带Flying而没有Ground，不符合Ashes of the UED准入；该假设不作为待实现消费者。实际Builder正反例见[进口范围核对](evidence/stukov-import-scope.public.json)。Khassar/Target/声明、其他外部HITS及直接移除继续；39来源、80mm等工程估算、所有暂停项保持，模型调用0，trainingTruth:false。

复验入口：verify-wave4-overwatch-coexistence.mjs（签名恢复）、verify-wave4-overwatch-coexistence-cold.mjs、overwatch-coexistence-web-cases.json及共用serve/verify驱动。
