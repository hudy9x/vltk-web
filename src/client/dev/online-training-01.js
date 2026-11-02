// Legacy private-battlefield hooks remain optional. There is no arena runtime.
var combatSandbox = null;
var OnlineTraining=(()=>{
  let factions=[],kind='sim_token',busy=false,selectedFaction='',selectedSkill=0,attackPlayers=false,attackMonsters=true,modeChain=Promise.resolve();
  // This authored sprite is a stationary target; combat state comes from Rust.
  r0[999001]={n:'Bao cát',img:'img/m/training-dummy.png',sz:[100,100,50,100],spd:0,run:0};
  const panel=document.createElement('section');panel.id='online-training';panel.className='war-dialog';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');document.body.appendChild(panel);
  async function request(action,extra={}){
    if(!OnlineProgression.enabled()||!onlineWorld.state)throw new Error('Cần kết nối dev:online và ra bãi luyện công.');
    if(l.town&&!['clearSims','finish','simMode'].includes(action))throw new Error('Hãy ra bãi luyện công trước khi bắt đầu test.');
    await OnlineProgression.flush();
    const response=await fetch('/api/multiplayer/training',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot:m0,action,...extra}),signal:AbortSignal.timeout(60000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Không thực hiện được thao tác test.');return result;
  }
  const field=id=>panel.querySelector('#training-'+id);
  function factionButtons(){
    field('factions').innerHTML=factions.map(f=>`<button type="button" class="training-faction" data-faction="${D(f.key)}" aria-pressed="${f.key===selectedFaction}" title="${D(f.name)}"><img src="img/portraits/${D(f.key)}.webp" alt=""><span>${D(f.name)}</span></button>`).join('');
  }
  function skills(){
    const faction=factions.find(f=>f.key===selectedFaction);
    const rows=(faction?.skills||[]).filter(s=>kind!=='sim_token'||s.tier===90||s.tier===150);
    if(!rows.some(s=>s.id===selectedSkill))selectedSkill=rows[0]?.id||0;
    field('skills').innerHTML=rows.map(s=>`<button type="button" class="training-skill" data-skill="${s.id}" aria-pressed="${s.id===selectedSkill}"><img src="${D(T[s.id]?.ic||'img/s/'+s.id+'.png')}" alt=""><span><small>Cấp ${s.required}</small><b>${D(s.name)}</b></span></button>`).join('');
  }
  function render(){
    const sim=kind==='sim_token';
    const world=typeof onlineWorld==='undefined'?null:onlineWorld.state,current=world?.training?.units.find(u=>u.owner===world.self);
    if(sim&&current){attackPlayers=current.attackPlayers??false;attackMonsters=current.attackMonsters??true;}
    panel.innerHTML=`<header><h3>${sim?'SIM · Nhân vật mô phỏng':'Test · Nhân vật và mục tiêu'}</h3><button class="btn" data-close aria-label="Đóng">×</button></header><div class="war-content">
      <div class="training-label" id="training-faction-label">Môn phái</div><div id="training-factions" class="training-factions" role="group" aria-labelledby="training-faction-label"></div>
      <div class="training-label" id="training-skill-label">Chiêu chính</div><div id="training-skills" class="training-skills" role="group" aria-labelledby="training-skill-label"></div>
      ${sim?'<label>HP SIM <input id="training-hp" type="number" min="1" max="1000000000" value="100000"></label><label><input id="training-equipped" type="checkbox" checked> Mặc trang bị Tống Kim</label><label><input id="training-players" type="checkbox"> Đánh người</label><label><input id="training-monsters" type="checkbox" checked> Đánh quái</label><p class="dim">SIM cấp 200, tự trang bị vũ khí theo chiêu. Bật cả hai chế độ: ưu tiên người chơi, sau đó đánh quái. Bỏ cả hai: đứng yên. Giữ map hiện tại và hồi sinh bạn tại chỗ; mở khóa map bằng Lệnh bài Test.</p><button class="btn" data-action="sim">Tạo lại SIM</button> <button class="btn" data-action="clearSims">Xóa SIM</button>':
      '<p class="dim">Áp dụng lên nhân vật hiện tại: cấp tối thiểu 150, học chiêu tối đa, tự trang bị vũ khí. Xóa toàn bộ trang bị đang mặc, chỉ tạo vũ khí mới phù hợp với chiêu đã chọn.</p><button class="btn" data-action="faction">Đổi phái / chiêu chính</button><label>HP mục tiêu <input id="training-hp" type="number" min="1" max="1000000000" value="1000000"></label><p>Quái ID 602 · Phiến Khách · sát thương gốc cấp 150.</p><button class="btn" data-action="monster">Tạo lại quái 602</button> <button class="btn" data-action="dummy">Tạo thêm bao cát</button><p class="dim">Mỗi lần bấm tạo thêm một bao cát ngay tại vị trí bạn đứng. Bao cát đứng yên, không tấn công, hồi sinh sau 2 giây tại chỗ. Khi bắt đầu test: giữ map hiện tại, cấm Thổ Địa Phù, hồi sinh tại chỗ.</p><button class="btn" data-action="finish">Kết thúc test / mở khóa map</button>'}
      <p id="training-status" role="status"></p></div>`;
    selectedFaction=factions.some(f=>f.key===o.fac)?o.fac:factions[0].key;selectedSkill=+o.main||0;factionButtons();skills();
    if(sim){field('players').checked=attackPlayers;field('monsters').checked=attackMonsters;}
  }
  panel.onchange=event=>{
    if(!['training-players','training-monsters'].includes(event.target.id)||busy)return;
    attackPlayers=field('players').checked;attackMonsters=field('monsters').checked;
    const modes={attackPlayers,attackMonsters};
    modeChain=modeChain.catch(()=>{}).then(()=>request('simMode',modes));
    modeChain.then(()=>{if(kind==='sim_token')field('status').textContent='Đã đổi chế độ SIM trên server.';}).catch(error=>{if(kind==='sim_token')field('status').textContent=error.message;});
  };
  panel.onclick=async event=>{
    if(event.target.closest('[data-close]')){panel.hidden=true;return;}
    if(busy)return;
    const faction=event.target.closest('[data-faction]');
    if(faction){selectedFaction=faction.dataset.faction;panel.querySelectorAll('[data-faction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.faction===selectedFaction)));skills();return;}
    const skill=event.target.closest('[data-skill]');
    if(skill){selectedSkill=+skill.dataset.skill;panel.querySelectorAll('[data-skill]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.skill===selectedSkill)));return;}
    const button=event.target.closest('[data-action]');if(!button)return;
    busy=true;const buttons=[...panel.querySelectorAll('button,input[type=checkbox]')];buttons.forEach(b=>b.disabled=true);
    try{
      const action=button.dataset.action,extra={faction:selectedFaction,skill:selectedSkill,hp:+field('hp').value,equipped:field('equipped')?.checked===true,attackPlayers,attackMonsters};
      field('status').textContent='Đang xử lý trên server…';
      await modeChain.catch(()=>{});
      if(action==='faction'){await request('pin');await OnlineProgression.run({kind:'gm',action:'testFaction',faction:extra.faction,skill:extra.skill});l.mounted=false;l.dirty=true;n0(true);}
      else await request(action,extra);
      field('status').textContent='Đã áp dụng trên server online.';
    }catch(error){field('status').textContent=error.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);}
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.hidden=true;});
  const style=document.createElement('style');style.textContent=`
#online-training{z-index:100030;width:min(680px,calc(100vw - 24px));max-width:680px;box-sizing:border-box}
#online-training label{display:block;margin:12px 0}
#online-training input[type=number]{max-width:100%;padding:8px;background:#111a14;color:#eee1af;border:1px solid #888b61}
#online-training header{display:flex;align-items:center;justify-content:space-between}
#online-training .training-label{margin:14px 0 8px;font-weight:bold}
#online-training .training-factions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
#online-training .training-skills{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#online-training .training-faction,#online-training .training-skill{font:inherit;color:#eee1af;background:#111a14;border:1px solid #777b55;border-radius:4px;cursor:pointer;min-width:0;padding:8px}
#online-training .training-faction{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
#online-training .training-faction img{width:64px;height:64px;max-width:100%;object-fit:cover;border-radius:3px}
#online-training .training-faction span{font-size:12px;line-height:1.3;overflow-wrap:anywhere}
#online-training .training-skill{display:flex;align-items:center;gap:10px;text-align:left}
#online-training .training-skill img{width:36px;height:36px;flex:none;object-fit:contain;image-rendering:pixelated}
#online-training .training-skill span{min-width:0}#online-training .training-skill b{display:block;font-size:13px;line-height:1.4;overflow-wrap:anywhere}
#online-training .training-skill small{display:block;color:#beb58d;margin-bottom:3px}
#online-training button[aria-pressed=true]{border-color:#e3c36d;background:#534621;box-shadow:inset 0 0 0 1px #c4a451}
#online-training button:focus-visible{outline:2px solid #ffe49a;outline-offset:2px}
@media(max-width:440px){#online-training .training-factions{gap:4px}#online-training .training-faction{padding:4px}#online-training .training-faction img{height:48px}#online-training .training-faction span{font-size:10px}#online-training .training-skill{padding:6px;gap:6px}#online-training .training-skill img{width:30px;height:30px}}
`;document.head.appendChild(style);
  return {async open(token){try{
    if(!window.localGameConfig?.development)throw new Error('Lệnh bài SIM/Test chỉ dùng trong development.');
    if(!OnlineProgression.enabled())throw new Error('Lệnh bài này cần chế độ online.');
    if(busy)return;kind=token;
    if(!factions.length){const response=await fetch('/api/multiplayer/training');const result=await response.json();if(!response.ok)throw new Error(result.error);factions=result.factions;}
    render();panel.hidden=false;
  }catch(error){k(error.message);}}};
})();
