const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split('\n');

const modules = [
  // DATA
  { file: 'src/data/item-sets.js', start: 3, end: 402, desc: 'Hoàng Kim & Bạch Kim item sets conversion helpers' },
  { file: 'src/data/equipment-ge.js', start: 403, end: 4841, desc: 'Base equipment generation data table (s.ge)' },
  { file: 'src/data/monsters-zones.js', start: 4842, end: 15132, desc: 'Monster animation sprites, zone configurations' },
  { file: 'src/data/sound-effects.js', start: 15133, end: 18321, desc: 'Sound effects, music mappings & JFX visuals' },
  { file: 'src/data/skills-jmo.js', start: 18322, end: 69801, desc: 'JMO skill magic animation tables and projectile frames' },

  // CORE
  { file: 'src/core/helpers.js', start: 69802, end: 70208, desc: 'Core math, RNG, formatting, element constants, faction colors' },
  { file: 'src/core/attributes.js', start: 70209, end: 73529, desc: 'Attributes, stat modifiers, item affixes, character formula engine' },

  // COMBAT
  { file: 'src/combat/skills.js', start: 73530, end: 76801, desc: 'Skill tree, cooldowns, multi-target geometry, skill buffs' },
  { file: 'src/combat/battle.js', start: 76802, end: 79326, desc: 'Battle loop, auto-combat, monster aggro/AI, damage calculation' },

  // RENDER
  { file: 'src/render/arena.js', start: 79327, end: 80943, desc: 'Arena canvas rendering, camera viewport, sprites, onWorldDrawAfterFx' },
  { file: 'src/render/jxlook.js', start: 80944, end: 83247, desc: 'JXLOOK multi-layer compositor (horse, armor, weapon, reborn auras)' },

  // UI
  { file: 'src/ui/hud.js', start: 83248, end: 86148, desc: 'HUD bars (HP/MP/XP), skill buttons, hotkeys, potion belt' },
  { file: 'src/ui/inventory.js', start: 86149, end: 93712, desc: 'Inventory bag, gear slots, forge & crafting, mount stables, loot filters' },

  // SYSTEMS
  { file: 'src/systems/quests-boss.js', start: 93713, end: 97084, desc: 'Quests, World Boss, Dã Tẩu, Tống Kim, Phụ bản, party/chat' },
  { file: 'src/systems/storage-ui.js', start: 97085, end: 99873, desc: 'LocalStorage save/load, auto-save, settings modal, audio player, tab switching' },
  { file: 'src/systems/gm-tool.js', start: 99874, end: 100153, desc: 'GM debug panel, cheat commands, multiplayer render hooks' },
];

console.log('Writing clean standalone files...');

modules.forEach(m => {
  const dir = path.dirname(m.file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let chunk = lines.slice(m.start - 1, m.end).join('\n').trim();

  // Clean data wrappers so each file is standalone valid JS
  if (m.file === 'src/data/equipment-ge.js') {
    if (chunk.startsWith('((')) chunk = chunk.slice(1);
    if (chunk.endsWith(',')) chunk = chunk.slice(0, -1) + ';';
  } else if (m.file === 'src/data/monsters-zones.js') {
    if (chunk.startsWith('(')) chunk = chunk.slice(1);
    chunk = chunk.replace(/\n\s*\}\),\s*\n\s*\(function \(\)/, '\n  };\n  (function ()');
    if (chunk.endsWith(',')) chunk = chunk.slice(0, -1) + ';';
  } else if (m.file === 'src/data/sound-effects.js') {
    if (chunk.startsWith('(')) chunk = chunk.slice(1);
    chunk = chunk.replace(/\n\s*\}\),\s*\n\s*\(window\.JFX = \{/, '\n  };\n  window.JFX = {');
    if (chunk.endsWith('),')) chunk = chunk.slice(0, -2) + ';';
    if (chunk.endsWith(',')) chunk = chunk.slice(0, -1) + ';';
  } else if (m.file === 'src/data/skills-jmo.js') {
    if (chunk.startsWith('(')) chunk = chunk.slice(1);
    chunk = chunk.replace(/\n\s*\}\),\s*\n\s*Object\.assign\(window\.JMO, \{/, '\n  };\n  Object.assign(window.JMO, {');
    if (chunk.endsWith('));')) chunk = chunk.slice(0, -3) + ');';
  } else if (m.file === 'src/render/arena.js') {
    if (chunk.endsWith(',')) chunk = chunk.slice(0, -1) + ';';
  } else if (m.file === 'src/systems/gm-tool.js') {
    if (chunk.endsWith('})();')) {
      chunk = chunk.slice(0, -5).trim();
    }
  }

  // Ensure file ends with semicolon if not already
  if (!chunk.endsWith(';') && !chunk.endsWith('}')) {
    chunk += ';';
  }

  fs.writeFileSync(m.file, chunk + '\n', 'utf8');

  // Verify standalone syntax with node -c
  try {
    execSync(`node -c "${m.file}"`);
    console.log(`[PASS] ${m.file} (${chunk.split('\n').length} lines)`);
  } catch (err) {
    console.error(`[FAIL] ${m.file}:`, err.message);
  }
});

fs.writeFileSync('src/modules.json', JSON.stringify(modules, null, 2), 'utf8');
console.log('All files verified and saved!');
