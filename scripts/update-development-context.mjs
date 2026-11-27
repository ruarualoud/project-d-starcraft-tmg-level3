import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, writeCurrent } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function updateDevelopmentContext(input = path.join(root, 'coordination/current-development.json')) {
  return writeCurrent(root, await readJson(input));
}
if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await updateDevelopmentContext(process.argv[2])));
}
