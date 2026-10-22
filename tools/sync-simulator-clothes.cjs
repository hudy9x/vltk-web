// Refresh after adding native body/head sprite sheets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const available = Object.fromEntries(['m','f'].map(sex => [sex,
  fs.readdirSync(path.join(root, 'public/img/jx', sex))
    .filter(file => /_(bd|hd)_/.test(file) && file.endsWith('.webp'))
    .map(file => file.slice(0, -5)).sort(),
]));
fs.writeFileSync(path.join(root, 'src/client/simulator/clothes-assets.json'), JSON.stringify(available) + '\n');
