// node tools/import-skill-150-details.js /path/to/archived/game.js
// Only read catalog literals; never execute the archived application bundle.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const ROOT = path.resolve(__dirname, '..');

function literal(source, name) {
  const prefix = `window.${name}=`;
  const offset = source.indexOf(prefix);
  if (offset < 0) throw new Error(`Missing ${name}`);
  let node = acorn.parseExpressionAt(source, offset + prefix.length, { ecmaVersion: 'latest' });
  if (node.type === 'SequenceExpression') node = node.expressions[0];
  if (node.type !== 'ObjectExpression') throw new Error(`Expected catalog object: ${name}`);
  if (name === 'JX') node = node.properties.find(p => p.key.name === 'skills').value;
  return vm.runInNewContext(`(${source.slice(node.start, node.end)})`, {}, { timeout: 3000 });
}

function clean(text) { return text.replace(/\*\*|`/g, '').trim(); }

// Secondary names from the archived client; coefficients are its explicit
// balance registry, not estimates from animation frame counts.
const EFFECT_NAMES = {
  1064:'Băng Ngưng Hàn Yên',1083:'Long Thừa Bát Nhã Thủ',1084:'Hào Hùng Bạo Kích',
  1085:'Vạn Vật Đế Quy Nhất',1087:'Tung Hoành Bát Hoang · thương ảnh',1088:'Bá Vương Tạm Kim · chùy kình',
  1089:'Kiếm Hoa Vãn Tinh · kiếm kình',1091:'Lưu Phong Hồi Tuyết Băng Trụ',1093:'Khinh Sa Phù Thủy',
  1094:'Hình Tiêu Cốt Lập · đòn phụ',1095:'Hồn Ảnh Tùng Sinh',1096:'Hình Tiêu Cốt Lập · độc kình',
  1097:'Truy Tâm Tỏa Mệnh',1098:'Thiết Liên Tứ Sát · đòn phụ',1101:'Thời Thừa Lục Long · đòn phụ',
  1102:'Thủy Anh Man Tú · sóng nước',1103:'Thời Thừa Lục Long · hỏa kình',
  1107:'Kiếm Minh Thương Khung',1108:'Phong Minh Ngọc Toái',1109:'Lôi Động Càn Khôn',1131:'Nộ Lan Bộc Hỏa',
};
const EFFECT_COEFFICIENTS = {
  1057:[1085,.35,'phys',.2],1061:[1091,.3,'cold',.22],1067:[1095,.35,'poison',.3],
  1069:[1097,.15,'phys',.18],1070:[1098,.18,'phys',.3],1075:[1131,.15,'phys',.18],
  1079:[1107,.35,'light',.18],1080:[1108,.35,'light',.18],1081:[1109,.55,'light',.3],
};

function effectLayers(id, advanced) {
  const skill=advanced.skills[id], fx=advanced.fx.f, override=EFFECT_COEFFICIENTS[id];
  const enabled=Object.entries(skill.attr).filter(([key])=>/^skill_(start|collide|fly|vanished)event$/.test(key))
    .map(([,rows])=>rows.findIndex(row=>row[0]===1)+1).filter(level=>level>0);
  const minimum=enabled.length?Math.min(...enabled):1;
  const layers=[],seen=new Set();
  function add(child, depth, trigger) {
    if(!EFFECT_NAMES[child]||seen.has(child)||depth>3)return;
    seen.add(child);
    const meta=fx[child]||{},coefficient=override&&override[0]===child?override:null;
    const entry={id:child,name:EFFECT_NAMES[child],tier:depth,minLevel:minimum,trigger};
    if(coefficient)Object.assign(entry,{coefficient:coefficient[1],element:coefficient[2],delay:coefficient[3]});
    else if(meta.num>1)entry.count=meta.num;
    layers.push(entry);
    for(const [key,kind]of [['es','start'],['ec','impact'],['ev','expire'],['ef','interval']])
      if(meta[key])add(meta[key],depth+1,kind);
  }
  if(override)add(override[0],2,'secondary');
  else for(const [key,kind]of [['sk','secondary'],['es','start'],['ec','impact'],['ef','interval'],['ev','expire']])
    if(fx[id]?.[key])add(fx[id][key],2,kind);
  return layers;
}

function importDetails(bundlePath) {
  const source = fs.readFileSync(bundlePath, 'utf8');
  const skills = literal(source, 'JX'), advanced = literal(source, 'JX_ADVANCED');
  const doc = fs.readFileSync(path.join(ROOT, 'docs/SKILLS_120_150.md'), 'utf8');
  const details = {}, patches = {}, names = {};
  for (const section of doc.split(/(?=^### ✦ Skill )/m).filter(s => s.startsWith('### ✦ Skill 150:'))) {
    const id = Number(section.match(/\(ID: `(\d+)`/)[1]);
    if (advanced.skills[id]?.tier !== 150) throw new Error(`Not a 150 skill: ${id}`);
    const heading = section.split('\n')[0].replace('### ✦ Skill 150: ', '').trim();
    const mechanics = section.split('**Cơ chế các tầng chiêu thức & nhịp đánh**:')[1]
      .split('- **Kỹ năng hỗ trợ')[0].split('\n').filter(line => /^  - /.test(line)).map(line => clean(line.slice(4)));
    const table = section.split('| Thuộc tính chiêu thức |')[1].split('\n').slice(2)
      .filter(line => line.startsWith('|')).map(line => line.split('|').slice(1,-1).map(clean));
    const support = [];
    for (const line of section.split('\n').filter(line => /^\s+\| \*\*/.test(line))) {
      const supportId = Number(line.match(/ID: `(\d+)`/)[1]);
      const percentages = [...line.matchAll(/\+(\d+)%/g)].map(m => Number(m[1]));
      const maximum = percentages.at(-1);
      const candidates = Object.values(skills[supportId]?.attr || {}).filter(rows =>
        Array.isArray(rows) && Array.isArray(rows[0]) && rows[0][0] >= 1000 && rows.at(-1)[2] === maximum);
      const rows = candidates.find(rows => rows[0][0] === id) || candidates.find(rows => {
        const fx = advanced.fx.f[id] || {};
        return Object.values(fx).includes(rows[0][0]) || Object.values(advanced.fx.f).some(f => f.sk === rows[0][0]);
      }) || (candidates.length === 1 ? candidates[0] : null);
      if (!rows || rows.length !== 20) throw new Error(`Missing exact coefficient curve: ${supportId} -> ${id}`);
      const target = rows[0][0];
      // Match this document's skill, not another skill with an equal max bonus.
      if (target !== id && !Object.values(advanced.fx.f[id] || {}).includes(target)) {
        throw new Error(`Unresolved secondary support: ${supportId} -> ${id} (${target})`);
      }
      const key = `addskilldamage150_${target}`;
      (patches[supportId] || (patches[supportId] = {}))[key] = rows;
      names[target] = heading + (target === id ? '' : ' (tầng phụ)');
      support.push({ id: supportId, target, name: skills[supportId].n,
        coefficients: rows.map(row => row[2]), maximum });
    }
    details[id] = { name: heading, mechanics, samples: table, support, effects:effectLayers(id,advanced) };
  }
  const expected = Object.values(advanced.skills).filter(s => s.tier === 150).length;
  if (Object.keys(details).length !== expected) throw new Error('Incomplete 150 catalog');
  const output = `// Generated by tools/import-skill-150-details.js; 120 is intentionally excluded.\n` +
    `(function registerSkill150Details() {\n  window.SKILL_150_DETAILS = ${JSON.stringify(details,null,2)};\n` +
    `  window.SKILL_150_TARGET_NAMES = ${JSON.stringify(names,null,2)};\n` +
    `  const patches = ${JSON.stringify(patches,null,2)};\n` +
    `  for (const [id, attributes] of Object.entries(patches)) {\n` +
    `    const skill = window.JX.skills[id];\n` +
    `    if (!skill || skill.tier === 120) continue;\n` +
    `    for (const [key, rows] of Object.entries(attributes)) {\n` +
    `      const existing = Object.keys(skill.attr).find(k => k.startsWith('addskilldamage') && skill.attr[k][0]?.[0] === rows[0][0]);\n` +
    `      skill.attr[existing || key] = rows;\n` +
    `    }\n` +
    `  }\n})();\n`;
  fs.writeFileSync(path.join(ROOT,'app/data/skill-150-details-01.js'),output);
  return { skills: expected, supportLinks: Object.values(details).reduce((n,s)=>n+s.support.length,0) };
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Provide the archived game bundle path');
  console.log(importDetails(process.argv[2]));
}
module.exports = { importDetails };
