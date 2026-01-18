#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const mdPath = process.argv[2];
if (!mdPath) {
  console.error('Usage: compare-md.js <path-to-md>');
  process.exit(2);
}

const content = fs.readFileSync(mdPath, 'utf8');

const lines = content.split(/\r?\n/);
const items = [];
for (let i=0;i<lines.length;i++){
  const m = lines[i].match(/^[-*] \[( |x|X)\] (.*)$/);
  if (m) {
    items.push({ text: m[2].trim(), checked: m[1].toLowerCase() === 'x', line: i+1 });
  }
}

const out = {
  file: path.relative(process.cwd(), mdPath),
  items,
};

console.log(JSON.stringify(out, null, 2));
