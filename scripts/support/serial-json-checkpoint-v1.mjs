import fs from 'node:fs/promises';

// The same checkpoint is touched by model events and workspace transitions.
export function createSerialJsonCheckpointV1(filename) {
  let queue = Promise.resolve();
  return value => {
    const text = JSON.stringify(value);
    const next = queue.then(async () => {
      await fs.writeFile(filename + '.tmp', text, { mode: 0o600 });
      await fs.rename(filename + '.tmp', filename);
    });
    queue = next.catch(() => {});
    return next;
  };
}
