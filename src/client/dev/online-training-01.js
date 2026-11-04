// Companion controls and explicit test tools share visual styles, not their lifecycle.
var combatSandbox = null;
var OnlineTraining=(()=>{
  let factions=[],units=[],kind='sim_token',busy=false,selectedSim=0,selectedFaction='',selectedSkill=0;
  let attackPlayers=false,attackMonsters=true,followOwner=false,autoAcceptParty=false,version=0,polling=false,modePending=0,modeChain=Promise.resolve();
  r0[999001]={n:'Bao cát',img:'img/m/training-dummy.png',sz:[100,100,50,100],spd:0,run:0};
  const panel=document.createElement('section');panel.id='online-training';panel.className='war-dialog';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');document.body.appendChild(panel);
  const field=id=>panel.querySelector('#training-'+id);
  const isCompanion=action=>['sim','simMode','removeSim'].includes(action);
  async function request(action,extra={}){
    if(!OnlineProgression.enabled()||!onlineWorld.state)throw new Error('Cần kết nối online trước.');
    if(l.town&&!['removeSim','finish','simMode'].includes(action))throw new Error('Hãy ra bãi luyện công trước.');
    await OnlineProgression.flush();
    const response=await fetch('/api/multiplayer/'+(isCompanion(action)?'companions':'training'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot:m0,action,...extra}),signal:AbortSignal.timeout(60000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Không thực hiện được thao tác.');return result;
  }
  function modesFrom(unit){
    attackPlayers=unit?.attackPlayers??false;attackMonsters=unit?.attackMonsters??true;
    followOwner=unit?.followOwner??false;autoAcceptParty=unit?.autoAcceptParty??false;
  }
  function roster(){
    const list=field('sims');if(!list)return;
    const html=units.slice().sort((a,b)=>a.number-b.number).map(unit=>`<button type="button" class="training-sim" data-sim="${unit.id}" aria-pressed="${selectedSim===unit.id}" aria-label="Chọn ${D(unit.name)}"><img src="img/portraits/${D(unit.faction)}.webp" alt=""><b>${D(unit.name)}</b><small>HP ${Math.ceil(unit.hp).toLocaleString('vi-VN')}</small></button>`).join('')+
      (units.length<3?`<button type="button" class="training-sim training-add" data-sim="0" aria-pressed="${selectedSim===0}"><span aria-hidden="true">＋</span><b>Thêm SIM</b><small>${units.length}/3 SIM</small></button>`:'');
    if(list.innerHTML!==html)list.innerHTML=html;
  }
  function factionButtons(){
    field('factions').innerHTML=factions.map(f=>`<button type="button" class="training-faction" data-faction="${D(f.key)}" aria-pressed="${f.key===selectedFaction}" title="${D(f.name)}"><img src="img/portraits/${D(f.key)}.webp" alt=""><span>${D(f.name)}</span></button>`).join('');
  }
  function skills(){
    const rows=(factions.find(f=>f.key===selectedFaction)?.skills||[]).filter(s=>kind!=='sim_token'||s.tier===90||s.tier===150);
    if(!rows.some(s=>s.id===selectedSkill))selectedSkill=rows[0]?.id||0;
    field('skills').innerHTML=rows.map(s=>`<button type="button" class="training-skill" data-skill="${s.id}" aria-pressed="${s.id===selectedSkill}"><img src="${D(T[s.id]?.ic||'img/s/'+s.id+'.png')}" alt=""><span><small>Cấp ${s.required}</small><b>${D(s.name)}</b></span></button>`).join('');
  }
  function render(){
    const sim=kind==='sim_token',current=sim&&units.find(u=>u.id===selectedSim),creating=sim&&!current;
    if(sim&&!current)selectedSim=0;
    if(current)modesFrom(current);
    const configuration=(!sim||creating)?'<div class="training-label" id="training-faction-label">Môn phái</div><div id="training-factions" class="training-factions" role="group" aria-labelledby="training-faction-label"></div><div class="training-label" id="training-skill-label">Chiêu chính</div><div id="training-skills" class="training-skills" role="group" aria-labelledby="training-skill-label"></div>':'';
    panel.innerHTML=`<header><h3>${sim?'SIM đồng hành':'Test · Nhân vật và mục tiêu'}</h3><button class="btn" data-close aria-label="Đóng">×</button></header><div class="war-content">
      ${sim?'<div class="training-label" id="training-sims-label">SIM của bạn · tối đa 3</div><div id="training-sims" class="training-sims" role="group" aria-labelledby="training-sims-label"></div>':''}
      ${configuration}
      ${sim?`${creating?'<label>HP SIM <input id="training-hp" type="number" min="1" max="1000000000" value="100000"></label><label><input id="training-equipped" type="checkbox" checked> Mặc trang bị Tống Kim</label>':`<p><b>${D(current.name)}</b> · ${D(factions.find(f=>f.key===current.faction)?.name||current.faction)} · Bản đồ ${current.map}<br>HP ${Math.ceil(current.hp).toLocaleString('vi-VN')} / ${Math.ceil(current.maxHp).toLocaleString('vi-VN')}</p>`}
      <label><input id="training-players" type="checkbox"> Đánh người</label><label><input id="training-monsters" type="checkbox"> Đánh quái</label><label><input id="training-follow" type="checkbox"> Theo sau chủ, kể cả khi đổi bản đồ</label><label><input id="training-party" type="checkbox"> Tự nhận lời mời tổ đội từ chủ</label>
      <p class="dim">SIM cấp 200. Bật cả hai chế độ đánh: ưu tiên người chơi, sau đó đánh quái. Khi theo sau, SIM ưu tiên quay về gần chủ. SIM không đánh đồng đội và không chiếm phần EXP. SIM được lưu khi bạn thoát; chỉ mất khi bị hạ hoặc bạn xóa.</p>
      ${creating?`<button class="btn" data-action="sim" ${units.length>=3?'disabled':''}>Tạo SIM${units.length>=3?' · Đã đủ 3 SIM':''}</button>`:`<button class="btn red" data-action="removeSim">Xóa SIM này</button>`}`:
      '<p class="dim">Áp dụng lên nhân vật hiện tại: cấp tối thiểu 150, học chiêu tối đa, tự trang bị vũ khí. Xóa toàn bộ trang bị đang mặc, chỉ tạo vũ khí mới phù hợp với chiêu đã chọn.</p><button class="btn" data-action="faction">Đổi phái / chiêu chính</button><label>HP mục tiêu <input id="training-hp" type="number" min="1" max="1000000000" value="1000000"></label><p>Quái ID 602 · Phiến Khách · sát thương gốc cấp 150.</p><button class="btn" data-action="monster">Tạo lại quái 602</button> <button class="btn" data-action="dummy">Tạo thêm bao cát</button><p class="dim">Mỗi lần bấm tạo thêm một bao cát tại vị trí bạn đứng. Bao cát hồi sinh sau 2 giây. Bắt đầu test sẽ khóa bản đồ và hồi sinh nhân vật tại chỗ.</p><button class="btn" data-action="finish">Kết thúc test / mở khóa map</button>'}
      <p id="training-status" role="status"></p></div>`;
    if(!sim||creating){
      if(!factions.some(f=>f.key===selectedFaction))selectedFaction=factions.some(f=>f.key===o.fac)?o.fac:factions[0]?.key||'';
      factionButtons();skills();
    }
    if(sim){roster();field('players').checked=attackPlayers;field('monsters').checked=attackMonsters;field('follow').checked=followOwner;field('party').checked=autoAcceptParty;}
  }
  async function refresh(){
    const started=version,slot=m0,response=await fetch('/api/multiplayer/companions?slot='+slot,{signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Không tải được danh sách SIM.');
    if(started!==version||slot!==m0||kind!=='sim_token')return;
    if(result.factions)factions=result.factions;
    units=Array.isArray(result.units)?result.units:[];
    if(selectedSim&&!units.some(u=>u.id===selectedSim)){selectedSim=units[0]?.id||0;render();}
    else roster();
  }
  panel.onchange=event=>{
    if(!['training-players','training-monsters','training-follow','training-party'].includes(event.target.id)||busy)return;
    attackPlayers=field('players').checked;attackMonsters=field('monsters').checked;followOwner=field('follow').checked;autoAcceptParty=field('party').checked;
    if(!selectedSim)return;
    const modes={simId:selectedSim,attackPlayers,attackMonsters,followOwner,autoAcceptParty};modePending++;version++;
    modeChain=modeChain.catch(()=>{}).then(()=>request('simMode',modes));
    modeChain.then(result=>{if(kind==='sim_token'){if(Array.isArray(result.units))units=result.units;roster();field('status').textContent='Đã cập nhật SIM.';}}).catch(error=>{if(kind==='sim_token')field('status').textContent=error.message;}).finally(()=>modePending--);
  };
  panel.onclick=async event=>{
    if(event.target.closest('[data-close]')){panel.hidden=true;return;}
    if(busy)return;
    const sim=event.target.closest('[data-sim]');
    if(sim){if(modePending)return;selectedSim=+sim.dataset.sim;modesFrom(units.find(u=>u.id===selectedSim));render();return;}
    const faction=event.target.closest('[data-faction]');
    if(faction){selectedFaction=faction.dataset.faction;panel.querySelectorAll('[data-faction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.faction===selectedFaction)));skills();return;}
    const skill=event.target.closest('[data-skill]');
    if(skill){selectedSkill=+skill.dataset.skill;panel.querySelectorAll('[data-skill]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.skill===selectedSkill)));return;}
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    busy=true;version++;const buttons=[...panel.querySelectorAll('button,input[type=checkbox]')];buttons.forEach(b=>b.disabled=true);
    try{
      const action=button.dataset.action,extra={simId:selectedSim,faction:selectedFaction,skill:selectedSkill,hp:+field('hp')?.value,equipped:field('equipped')?.checked===true,attackPlayers,attackMonsters,followOwner,autoAcceptParty};
      field('status').textContent='Đang xử lý…';await modeChain.catch(()=>{});
      if(action==='faction'){await request('pin');await OnlineProgression.run({kind:'gm',action:'testFaction',faction:extra.faction,skill:extra.skill});l.mounted=false;l.dirty=true;n0(true);}
      else {
        const result=await request(action,extra);
        if(isCompanion(action)){
          units=Array.isArray(result.units)?result.units:units;
          selectedSim=action==='sim'?result.id:action==='removeSim'?units[0]?.id||0:selectedSim;render();
        }
      }
      field('status').textContent='Đã áp dụng.';
    }catch(error){field('status').textContent=error.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);}
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.hidden=true;});
  window.setInterval?.(()=>{if(!panel.hidden&&kind==='sim_token'&&!busy&&!modePending&&!polling){polling=true;refresh().catch(error=>{if(!panel.hidden&&kind==='sim_token')field('status').textContent=error.message;}).finally(()=>polling=false);}},1500);
  const style=document.createElement('style');style.textContent=`
#online-training{z-index:100030;width:min(680px,calc(100vw - 24px));max-width:680px;box-sizing:border-box}
#online-training label{display:block;margin:12px 0}
#online-training input[type=number]{max-width:100%;padding:8px;background:#111a14;color:#eee1af;border:1px solid #888b61}
#online-training header{display:flex;align-items:center;justify-content:space-between}
#online-training .training-label{margin:14px 0 8px;font-weight:bold}
#online-training .training-factions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
#online-training .training-sims{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:18px}
#online-training .training-skills{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#online-training .training-faction,#online-training .training-skill,#online-training .training-sim{font:inherit;color:#eee1af;background:#111a14;border:1px solid #777b55;border-radius:4px;cursor:pointer;min-width:0;padding:8px}
#online-training .training-faction,#online-training .training-sim{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
#online-training .training-faction img,#online-training .training-sim img{width:64px;height:64px;max-width:100%;object-fit:cover;border-radius:3px}
#online-training .training-faction span,#online-training .training-sim small{font-size:12px;line-height:1.3;overflow-wrap:anywhere}
#online-training .training-add>span{height:64px;display:grid;place-items:center;font-size:32px;color:#e3c36d}
#online-training .training-skill{display:flex;align-items:center;gap:10px;text-align:left}
#online-training .training-skill img{width:36px;height:36px;flex:none;object-fit:contain;image-rendering:pixelated}
#online-training .training-skill span{min-width:0}#online-training .training-skill b{display:block;font-size:13px;line-height:1.4;overflow-wrap:anywhere}
#online-training .training-skill small{display:block;color:#beb58d;margin-bottom:3px}
#online-training button[aria-pressed=true]{border-color:#e3c36d;background:#534621;box-shadow:inset 0 0 0 1px #c4a451}
#online-training button:focus-visible{outline:2px solid #ffe49a;outline-offset:2px}
@media(max-width:440px){#online-training .training-factions{gap:4px}#online-training .training-faction{padding:4px}#online-training .training-faction img,#online-training .training-sim img{height:48px;width:48px}#online-training .training-faction span{font-size:10px}#online-training .training-skill{padding:6px;gap:6px}#online-training .training-skill img{width:30px;height:30px}#online-training .training-sim small{font-size:10px}}
`;document.head.appendChild(style);
  return {async open(token){try{
    if(token==='test_token'&&!window.localGameConfig?.development)throw new Error('Lệnh bài Test chỉ dùng trong development.');
    if(!OnlineProgression.enabled())throw new Error('Lệnh bài này cần chế độ online.');
    if(busy||modePending)return;version++;kind=token;
    if(token==='sim_token'){
      await OnlineProgression.flush();await refresh();selectedSim=units.some(u=>u.id===selectedSim)?selectedSim:units[0]?.id||0;modesFrom(units.find(u=>u.id===selectedSim));
    }else if(!factions.length){const response=await fetch('/api/multiplayer/training');const result=await response.json();if(!response.ok)throw new Error(result.error);factions=result.factions;}
    selectedFaction=o.fac;selectedSkill=+o.main||0;render();panel.hidden=false;
  }catch(error){k(error.message);}}};
})();
