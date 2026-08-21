#!/usr/bin/env node
// Imports every js/ module in Node to validate syntax + side-effect-free top levels.
import { readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (extname(p) === '.js') files.push(p);
  }
};
walk(join(root, 'js'));

let fail = 0;
for (const f of files) {
  const url = pathToFileURL(f);
  try {
    await import(url);
    console.log(`ok   ${f.replace(root, '')}`);
  } catch (err) {
    fail++;
    console.error(`FAIL ${f.replace(root, '')}`);
    console.error(`     ${err.message}`);
  }
}
console.log(fail === 0 ? `\nAll ${files.length} modules imported clean.` : `\n${fail} module(s) FAILED.`);
process.exit(fail === 0 ? 0 : 1);
