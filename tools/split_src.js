const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split('\n');

const manifest = [
  // DATA
  { file: 'src/data/item-sets.js', start: 3, end: 402, desc: 'Hoàng Kim & Bạch Kim item sets conversion helpers' },
  { file: 'src/data/equipment-ge.js', start: 403, end: 13388, desc: 'Base equipment generation data table (s.ge)' },
  { file: 'src/data/monsters-zones.js', start: 13389, end: 15125, desc: 'Monster animation sprites, zone configurations' },
  { file: 'src/data/sound-effects.js', start: 15126, end: 18527, desc: 'Sound effect and music mappings' },
  { file: 'src/data/skills-jmo.js', start: 18528, end: 69801, desc: 'JMO skill magic animation tables and projectile frames' },

  // CORE
  { file: 'src/core/helpers.js', start: 69802, end: 70208, desc: 'Core math, RNG, formatting, element constants, faction colors' },
  { file: 'src/core/attributes.js', start: 70209, end: 73529, desc: 'Attributes, stat modifiers, item affixes, character formula engine' },

  // COMBAT
  { file: 'src/combat/skills.js', start: 73530, end: 76773, desc: 'Skill tree, cooldowns, multi-target geometry, skill buffs' },
  { file: 'src/combat/battle.js', start: 76774, end: 79326, desc: 'Battle loop, auto-combat, monster aggro/AI, damage calculation' },

  // RENDER
  { file: 'src/render/arena.js', start: 79327, end: 80943, desc: 'Arena canvas rendering, camera viewport, sprites, onWorldDrawAfterFx' },
  { file: 'src/render/jxlook.js', start: 80944, end: 83247, desc: 'JXLOOK multi-layer compositor (horse, armor, weapon, reborn auras)' },

  // UI
  { file: 'src/ui/hud.js', start: 83248, end: 86148, desc: 'HUD bars (HP/MP/XP), skill buttons, hotkeys, potion belt' },
  { file: 'src/ui/inventory.js', start: 86149, end: 90000, desc: 'Inventory bag, gear slots, mount stables, auto-pot, loot filters' },
  { file: 'src/ui/forge.js', start: 90001, end: 93712, desc: 'Forge (Lò rèn), enhancing, purification, set crafting' },

  // SYSTEMS
  { file: 'src/systems/quests-boss.js', start: 93713, end: 97084, desc: 'Quests, World Boss, Dã Tẩu, Tống Kim, Phụ bản, party/chat' },
  { file: 'src/systems/storage-ui.js', start: 97085, end: 99873, desc: 'LocalStorage save/load, auto-save, settings modal, audio player, tab switching' },
  { file: 'src/systems/gm-tool.js', start: 99874, end: 100153, desc: 'GM debug panel, cheat commands, multiplayer render hooks' },
];

console.log('Validating manifest continuity...');
for (let i = 0; i < manifest.length; i++) {
  const cur = manifest[i];
  if (i > 0) {
    const prev = manifest[i - 1];
    if (cur.start !== prev.end + 1) {
      console.error(`GAP or OVERLAP between ${prev.file} (ends ${prev.end}) and ${cur.file} (starts ${cur.start})`);
      process.exit(1);
    }
  }
}
console.log('Manifest line ranges cover exactly line 3 to line 100153 without any gap or overlap!');

// Create directories and write files
manifest.forEach(item => {
  const dir = path.dirname(item.file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const chunk = lines.slice(item.start - 1, item.end).join('\n');
  fs.writeFileSync(item.file, chunk, 'utf8');
  console.log(`Created ${item.file} (${item.end - item.start + 1} lines) - ${item.desc}`);
});

// Also create manifest.json inside src/
fs.writeFileSync('src/modules.json', JSON.stringify(manifest, null, 2), 'utf8');
console.log('Saved src/modules.json');
