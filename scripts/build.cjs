const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'dist');
if (path.dirname(dest) !== root || path.basename(dest) !== 'dist') throw new Error('Invalid build output path');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const file of ['index.html', 'app.js', 'style.css', 'Treemap', 'ListView', 'vendor', '_headers']) {
  fs.cpSync(path.join(root, file), path.join(dest, file), { recursive: true });
}
console.log('Static site built in dist/');
