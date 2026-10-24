// Authorized mechanical recovery, with backup, compare-before-replace and atomic rename.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const target = '/Users/rualoud/Downloads/codex_project/project-d/TASKS.md';
const reportFile = process.argv[2];
if (!reportFile) throw new Error('An inspected reconstruction report is required');
const report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
const digest = value => createHash('sha256').update(value).digest('hex');
if (report.target !== target || report.unresolved.length || report.applied.length !== 2268 ||
    report.observedPreimages.length !== 12 || report.uncertainAppendPositions.length !== 4 ||
    report.skipped.length !== 1 || report.skipped[0].ordinal !== 720736 || report.unchanged.length !== 2) {
  throw new Error('Recovery report is not the inspected candidate');
}
const candidate = await fs.readFile(report.candidateFile);
if (digest(candidate) !== report.candidateSha256) throw new Error('Candidate changed');
const before = await fs.readFile(target);
const beforeText = before.toString('utf8');
if (!beforeText.startsWith('# TASKS.md — 历史记录恢复中\n')) throw new Error('Concurrent root changed; inspect before recovery');
const metadata = [
  /^# TASKS.md — 历史记录恢复中/,
  /^> 2026-10-22：本文件更新时写入失败/,
  /^- \[ \] 恢复本文件的最新完整内容/,
  /^- \[~\] StarCraft T27\/S272：当前工作树/,
  /^- \[ \] 磁盘清理申请待答复/,
  /^事故详情：/,
];
const concurrent = beforeText.split(/\n{2,}/).filter(p => p.trim() && !metadata.some(pattern => pattern.test(p)));
const reportRelative = path.relative(path.dirname(target), reportFile);
const notice = '> 2026-10-22 存储故障恢复：以Git原件及已保存补丁重建可核历史，并保留故障后并发新增记录。12条外部编辑原文来自后续成功补丁的上下文；4条仅空行定位的历史追加保留原文于文末，位置未独立证明。无法保证未记载的外部编辑逐字节无缺失。详细恢复账：`' + reportRelative + '`。不要把历史记录中的LIVE/待办当作当前状态；各项目从自己的当前工作入口恢复。';
const latest = '- [x] StarCraft磁盘授权处理（2026-10-22）：已先存摘要再删除22份重复状态日志，释放275,556,877字节（约263MiB）；不能逐字节恢复被删除日志。模型原始请求/回复、费用、断点、报告截图和测试结果保留。TASKS可核历史已机械恢复，恢复边界见上；不宣称逐字节完整。\n\n' +
  '- [~] StarCraft T27/S272 v835：6项配置来源注入已过，不重复验证；正式模型消费尚待。从原e8540恢复前核无在途、磁盘余量及共享入口；上次77116于发送前ENOSPC退出，0新增Provider。原军表r4/2000矿170气不变，最终Plan0/6、剩余4 Slice，不启动旧对局或重置费用。';
const restoredText = '# TASKS.md\n\n' + notice + '\n\n' + latest + '\n\n' +
  concurrent.join('\n\n') + '\n\n' + candidate.toString('utf8').replace(/^# TASKS.md\n\n/, '');
const restored = Buffer.from(restoredText, 'utf8');
for (const paragraph of concurrent) if (!restoredText.includes(paragraph)) throw new Error('Concurrent paragraph lost');
const stem = reportFile.replace(/\.report\.json$/, '') + '.install';
const backup = stem + '.before.md';
const receipt = stem + '.json';
async function durableWrite(file, bytes) {
  const h = await fs.open(file, 'wx');
  try { await h.writeFile(bytes); await h.sync(); } finally { await h.close(); }
}
await durableWrite(backup, before);
const temporary = target + '.recovery-v835-' + Date.now() + '.tmp';
await durableWrite(temporary, restored);
if (digest(await fs.readFile(temporary)) !== digest(restored)) throw new Error('Temporary readback mismatch');
if (digest(await fs.readFile(target)) !== digest(before)) throw new Error('Concurrent edit: no replacement performed; keep temp');
await fs.rename(temporary, target);
const actual = await fs.readFile(target);
if (digest(actual) !== digest(restored)) throw new Error('Concurrent change after rename; inspect backup and root, do not retry blindly');
await durableWrite(receipt, JSON.stringify({ createdAt: new Date().toISOString(), target, reportFile,
  beforeBackup: backup, beforeSha256: digest(before), restoredSha256: digest(restored), restoredBytes: restored.length,
  concurrentParagraphsPreserved: concurrent.length, unresolvedRecordedPatches: 0, byteForByteOriginalProven: false,
  literalPreimagesRecovered: 12, appendPositionsUnproven: 4, atomicReplacement: true }, null, 2) + '\n');
console.log(JSON.stringify({ restoredBytes: restored.length, concurrentParagraphsPreserved: concurrent.length, receipt,
  byteForByteOriginalProven: false, atomicReplacement: true }));
