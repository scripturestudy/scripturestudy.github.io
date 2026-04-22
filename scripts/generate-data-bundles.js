const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bundles = [
  ['lds-scriptures.json',         'lds-scriptures.js',         '__LDS_SCRIPTURES'],
  ['cfm2026.json',                'cfm2026.js',                '__CFM_SCHEDULE'],
  ['assets/seek-scriptures.json', 'assets/seek-scriptures.js', '__SEEK_SCRIPTURES'],
];

for (const [src, dst, name] of bundles) {
  const srcPath = path.join(root, src);
  const dstPath = path.join(root, dst);
  const raw = fs.readFileSync(srcPath, 'utf8').trimEnd();
  fs.writeFileSync(dstPath, `self.${name} = ${raw};\n`);
  console.log(`wrote ${dst} (${fs.statSync(dstPath).size} bytes)`);
}
