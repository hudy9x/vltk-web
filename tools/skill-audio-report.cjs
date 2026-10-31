// Regenerate the listening report from the exact config/resolver shipped in game.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { compileTypeScriptEntry } = require('./build-app');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = process.argv[2];
if (!output) throw new Error('Usage: node tools/skill-audio-report.cjs /absolute/path/report.html');
const configPath = 'src/client/combat/audio/config.json';
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(compileTypeScriptEntry('combat/audio/runtime.ts', 'SkillAudio').code, sandbox);
const api = sandbox.SkillAudio, config = api.SKILL_AUDIO_CONFIG;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const media = {};
for (const [id, sound] of Object.entries(config.sounds)) {
  const filename = path.join(root, 'public', sound.src);
  if (!fs.existsSync(filename)) throw new Error(`Missing sound ${id}: ${sound.src}`);
  media[id] = `data:audio/${sound.src.endsWith('.wav') ? 'wav' : 'mpeg'};base64,${fs.readFileSync(filename).toString('base64')}`;
}
function play(id, label = id) {
  if (!id) return '—';
  if (!config.sounds[id]) throw new Error(`Unknown sound ID: ${id}`);
  return `<button type="button" data-sound="${esc(id)}">▶ ${esc(label)}</button>`;
}
function stage(value) {
  return Object.entries(value || {}).map(([key,id]) => play(id, `${{ male:'Hô nam',female:'Hô nữ',effect:'Hiệu ứng',maleEffect:'Xuất chiêu nam',femaleEffect:'Xuất chiêu nữ' }[key]} · ${id}`)).join('') || '—';
}
const entries = Object.entries(config.skills).sort(([,a],[,b]) => a.faction.localeCompare(b.faction) || a.level-b.level || a.name.localeCompare(b.name,'vi'));
const rows = entries.map(([id, own]) => {
  const s = api.resolveSkillAudio(id);
  if (own.inherit && !config.skills[own.inherit]) throw new Error(`Missing parent ${own.inherit}`);
  const iconPath = path.join(root,'public',s.icon);
  const icon = s.icon && fs.existsSync(iconPath) ? `<img width="40" height="40" alt="${esc(s.name)}" src="data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}">` : '—';
  const inherited = own.inherit ? `<small>Kế thừa ${own.inherit} · ${esc(config.skills[own.inherit].name)}<br>${esc(own.route)}</small>` : '';
  const voice = s.cast?.male || s.cast?.female || s.cast?.effect || s.cast?.maleEffect || s.cast?.femaleEffect ? '' : `<small>Hô mặc định khi tấn công</small>${play(config.defaults.male,'Hô nam mặc định')}${play(config.defaults.female,'Hô nữ mặc định')}`;
  return `<tr><td>${icon}</td><td>${esc(s.faction)}</td><td>${s.level}</td><td><strong>${esc(s.name)}</strong><small>ID ${id}</small>${inherited}</td><td>${stage(s.cast)}${voice}</td><td>${stage(s.release)}</td><td>${stage(s.hit)}</td><td>${s.review.map(r=>play(r.sound,r.sound)+`<small>${esc(r.reason)}</small>`).join('')||'—'}</td></tr>`;
});
const hash = createHash('sha256').update(fs.readFileSync(path.join(root,configPath))).digest('hex');
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skill Sound ID Report</title><style>body{font:15px system-ui;margin:24px;background:#faf9f6;color:#242424}h1{font-size:25px}p{line-height:1.6;max-width:1100px}table{border-collapse:collapse;width:100%;background:#fff}td,th{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #ddd}th{position:sticky;top:0;background:#ece9e2}button{display:block;text-align:left;padding:7px 10px;margin:4px 0;background:#f6f4ef;border:1px solid #ccc;border-radius:5px;color:#222;cursor:pointer;overflow-wrap:anywhere}button:focus-visible{outline:3px solid #376fa4}small{display:block;color:#666;margin-top:5px}input{padding:10px;width:min(500px,90%)}img{object-fit:contain}.scroll{overflow-x:auto}audio{width:320px;max-width:100%}code{overflow-wrap:anywhere}summary{padding:16px 0;cursor:pointer}</style><h1>Âm thanh kỹ năng · cấu hình theo Sound ID</h1><p>${entries.length} kỹ năng · ${entries.filter(([,s])=>s.level===150).length} skill 150 · ${Object.keys(config.sounds).length} Sound ID. Đọc từ <code>${configPath}</code> bằng cùng hàm <code>resolveSkillAudio</code> của game. Report là snapshot tại lúc sinh; chạy lại công cụ sau khi sửa config.</p><p>Xuất chiêu và phóng: một lần khi chiêu thực sự được tung. Va chạm: một lần ở contact đầu tiên của cả lượt thi triển. Tiếng hô riêng thay tiếng hô chung; effect xuất chiêu có thể chứa tiếng hô nên không chồng tiếng hô mặc định. Kỹ năng 150 kế thừa skill 80 cùng tuyến. Cột cần xác minh chưa được phát trong game; dấu — là chưa có mapping. Không dùng SoundSlot4 làm hit khi chưa xác minh. Buff bật tay/tự động dùng cấu hình khi kích hoạt; online phát theo sự kiện server. Không lặp âm thanh theo tick DOT.</p><p>Nhóm tiếng hô: <code>voice_male_01–05 → sound_k001–005.wav</code>; <code>voice_female_01–05 → sound_k006–010.wav</code>.</p><p id="status" role="status" aria-live="polite">Chọn ▶ để nghe từng Sound ID.</p><audio id="player" controls></audio><p><label>Tìm tên, ID skill, Sound ID, cấp hoặc môn phái<br><input id="search" placeholder="Ví dụ: 150, voice_male_03, shaolin"></label></p><div class="scroll"><table><thead><tr><th>Icon</th><th>Môn phái</th><th>Cấp</th><th>Chiêu thức</th><th>Xuất chiêu / hô</th><th>Bay / phóng</th><th>Va chạm</th><th>Cần xác minh · chưa phát</th></tr></thead><tbody id="rows">${rows.join('')}</tbody></table></div><details><summary>Danh mục ${Object.keys(config.sounds).length} Sound ID</summary><table><thead><tr><th>ID / nghe</th><th>Tên</th><th>Loại</th><th>File trong config</th></tr></thead><tbody>${Object.entries(config.sounds).map(([id,s])=>`<tr><td>${play(id)}</td><td>${esc(s.name)}</td><td>${esc(s.category)} ${esc(s.gender||'')}</td><td>${esc(s.src)}</td></tr>`).join('')}</tbody></table></details><details><summary>Config nguồn · SHA-256 ${hash.slice(0,16)}</summary><pre>${esc(JSON.stringify(config,null,2))}</pre></details><script>const media=${JSON.stringify(media)};const player=document.getElementById('player'),status=document.getElementById('status');document.addEventListener('click',e=>{const b=e.target.closest('[data-sound]');if(!b)return;player.pause();player.src=media[b.dataset.sound];status.textContent='Đang nghe: '+b.dataset.sound;player.play().catch(()=>status.textContent='Hãy bấm Play trên trình phát để nghe.')});document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLocaleLowerCase('vi');document.querySelectorAll('#rows tr').forEach(r=>r.hidden=!r.textContent.toLocaleLowerCase('vi').includes(q))});</script></html>`;
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
fs.writeFileSync(output,html);
console.log(JSON.stringify({output,skills:entries.length,sounds:Object.keys(config.sounds).length,configSha256:hash}));
