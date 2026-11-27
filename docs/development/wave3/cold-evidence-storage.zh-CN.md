# Wave3 验收数据存放与恢复

## 每次验收后的处理

在子项的回放或产品边界通过后，打开具名证据目录，核对验收状态与仍在使用的断点。短报告、结果摘要、来源清单、冻结输入和在用数据库留在本机。将已有结论、很少重读的大型状态快照和已压缩的历史测试库列入冷存清单。查看报告里的大快照时接上 Lenovo 移动盘。付费回执、复盘素材、席位数据和真实对局有独立的保留要求。

从活动工作树运行以下命令。第一条只为已完成的目录生成本批清单，同时打印批次号、文件数和总字节数。第二条核对移动盘挂载、复制、回读校验，并用本地链接接回原路径。

```sh
node scripts/archive-cold-wave3-checkpoints-v1.mjs --prepare <build内已完成的验收目录>
node scripts/archive-cold-wave3-checkpoints-v1.mjs <批次号>
```

这条入口选择至少 1 MiB 的 `checkpoint-rN.json` 和 `*.sqlite.gz`。已有链接跳过。移动盘上的每份副本须与本机原件长度及 SHA-256 一致；本机原件的身份、长度、修改时间须与清单一致。验收目录须有 `cold.json` 的精确回放结果或 `verification/boundary.json` 的通过记录。停在半途的房间继续使用本机恢复。

每批的 `inventory.json`、`copies.jsonl` 和 `result.json` 可在本机 `build/storage-migrations/<批次号>/` 和移动盘 `/Volumes/Lenovo/ProjectD-StarCraft/<批次号>/` 查阅。迁移中断时，接回同一块盘并使用原批次号续行。已迁移文件按本地清单复核 SHA-256。

要在未连接移动盘时继续使用某一旧快照，先接上移动盘，执行以下命令。它把已验证副本恢复为原路径上的普通文件，外盘仍保有一份。

```sh
node scripts/archive-cold-wave3-checkpoints-v1.mjs <批次号> --restore <清单中的rel>
```

未压缩的 SQLite 库需要单独判断房间是否已关闭、签名回执和恢复来源是否齐全。现有房间、预写日志及伴随文件使用本地盘执行。在当前任务明确具名、完成冷恢复并确认不再使用后，按关闭数据库的归档流程整库核验并迁移。设备未挂载时保留本地原件，后续再归档。
