const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const modulesFile = path.join(ROOT, 'src', 'modules.json');
const outputFile = path.join(ROOT, 'app.js');

if (!fs.existsSync(modulesFile)) {
  console.error('Error: src/modules.json not found!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(modulesFile, 'utf8'));

console.log(`[Build] Assembling ${manifest.length} modules from src/ into app.js...`);

let combined = '(function () {\n  "use strict";\n';

manifest.forEach((item, index) => {
  const filePath = path.join(ROOT, item.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Module file not found: ${filePath}`);
    process.exit(1);
  }
  const code = fs.readFileSync(filePath, 'utf8');
  combined += code;
  if (index < manifest.length - 1) {
    combined += '\n';
  }
});

combined += '\n})();\n';

fs.writeFileSync(outputFile, combined, 'utf8');

console.log(`[Build] Successfully compiled app.js (${combined.length} bytes, ${combined.split('\n').length} lines).`);
