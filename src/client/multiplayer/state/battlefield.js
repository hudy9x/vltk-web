// Public-room presentation. Commands express intent; only server snapshots change the match.
var OnlineBattlefield=(()=>{
  let state=null,world=null,sender=()=>0,panel=null,hud=null,table=null,summary={},lastAt=0,requestAt=0,leaving=false,preferPlayers=true,preferenceSent=null,controlsActive=false,recruitment=null,shop=null,shopSlot=0,shopStamp='',shopBusy=false,shopMessage='',respawnNotice=null,rejoinNotice=null;
  let shownResult=null,configuredDrops,configuredMarshals,configuredSimPerTeam,configuredSimRecovery,configuredSimRoster;
  let lastKillNotice=0,marshalAnnounced=false,announcementAt=0;
  const bodies=new Map();
  const rank=p=>['Binh sĩ','Hiệu úy','Thống lĩnh','Phó tướng','Đại tướng'][[3000,9000,18000,30000].filter(n=>p>=n).length];
  const key=()=>`__tongkim_public:${window.localGameAuth?.user?.id||''}:${m0}`;
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(key())||'null');}catch{return null;}};
  const remember=value=>{try{if(value)sessionStorage.setItem(key(),JSON.stringify(value));else sessionStorage.removeItem(key());}catch{}};
  const clock=()=>state?state.now+Math.max(0,(performance.now()-lastAt)/1000):0;
  const time=n=>{n=Math.max(0,Math.ceil(n));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
  function mount(){
    if(hud)return;
    // The private battlefield mounts the shared .war-dialog styles at startup.
    const style=document.createElement('style');style.textContent=`
@font-face{font-family:WarCalligraphy;src:url('/fonts/charm-bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}
#public-war-hud{position:fixed;top:22px;left:50%;transform:translateX(-50%);z-index:1200;margin:0;color:#ffe1a0;font:700 20px/1.5 WarCalligraphy,cursive;text-align:center;text-shadow:0 2px 3px #000,0 0 12px #000,0 0 24px #9b3a12;pointer-events:none}
#public-war-hud[hidden],#public-war-respawn[hidden],#public-war-rejoin[hidden]{display:none}
#public-war-rejoin{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:95020;width:max-content;max-width:90vw;box-sizing:border-box;padding:18px 26px;border:1px solid #b29455;border-radius:8px;background:#181c16ed;color:#ffe1a0;font:500 20px/1.6 'IBM Plex Mono',monospace;text-align:center;box-shadow:0 8px 32px #0008;pointer-events:none}
#public-war-respawn{position:fixed;bottom:130px;left:50%;transform:translateX(-50%);z-index:95020;max-width:90vw;box-sizing:border-box;padding:10px 20px;border:1px solid #b29455;border-radius:6px;background:#181c16ed;color:#ffe1a0;font:700 20px/1.5 WarCalligraphy,cursive;text-align:center;text-shadow:0 2px 3px #000,0 0 12px #000;pointer-events:none}
#public-war-settings{width:min(960px,94vw);height:min(760px,88dvh);overflow:hidden;display:flex;flex-direction:column}
#public-war-settings>header{position:static;flex-shrink:0}
#public-war-settings>.war-content{padding:0;min-height:0;flex:1;display:flex;flex-direction:column;overflow:hidden}
#public-war-settings .war-settings-note{margin:0;padding:12px 18px 4px;font-size:12px}
#public-war-settings .war-tabs{position:static;flex-shrink:0;overflow-x:auto;padding:10px 18px;gap:6px}
#public-war-settings .war-tabs button{white-space:nowrap;min-height:40px}
#public-war-settings .war-tabs button[aria-selected=true]{color:#ffe3a0;border-bottom:3px solid #cbbb72}
#public-war-settings button:focus-visible{outline:2px solid #ffe3a0;outline-offset:2px}
#public-war-settings .war-settings-body{overflow:auto;min-height:0;flex:1;padding:18px;overscroll-behavior:contain}
#public-war-settings [role=tabpanel]>h3{margin:0 0 8px;color:#ead48e;font-weight:500}
#public-war-settings [role=tabpanel]>p{margin:0 0 16px}
#public-war-settings .sim-subtabs{display:flex;gap:8px;margin:18px 0}.sim-subtabs button{flex:1}
#public-war-settings .sim-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
#public-war-settings .sim-chip{display:inline-flex;align-items:center;gap:8px;padding:4px 6px 4px 10px;border:1px solid #746d4f;border-radius:5px;background:#393b2b}
#public-war-settings .sim-chip button{border:0;background:transparent;padding:4px 6px}
#public-war-settings .sim-slider{display:flex;align-items:center;gap:12px}
#public-war-settings input[type=range]{flex:1;min-width:0;width:100%;padding:0;accent-color:#cbbb72}
#public-war-settings output{min-width:44px;text-align:right;font-variant-numeric:tabular-nums}
#public-war-settings .sim-check{display:flex;flex-direction:row;align-items:center;gap:8px;margin-bottom:14px}
#public-war-settings .war-settings-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0;padding:12px 18px;border-top:1px solid #57523b;background:#23251d}
#public-war-settings .war-settings-footer p{margin:0;font-size:12px}
#public-war-settings .war-settings-footer button{min-height:40px;border-color:#b6a363;color:#ffe3a0;white-space:nowrap}
@media(max-width:600px){#public-war-settings{height:90dvh;max-height:90dvh}#public-war-settings .war-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:8px 12px}#public-war-settings .war-tabs button{min-width:0;white-space:normal;padding:7px 4px}#public-war-settings .war-settings-body{padding:12px}#public-war-settings .sim-subtabs{display:flex;gap:8px;margin:18px 0}.sim-subtabs button{flex:1}
#public-war-settings .sim-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
#public-war-settings .sim-chip{display:inline-flex;align-items:center;gap:8px;padding:4px 6px 4px 10px;border:1px solid #746d4f;border-radius:5px;background:#393b2b}
#public-war-settings .sim-chip button{border:0;background:transparent;padding:4px 6px}
#public-war-settings .sim-slider{display:flex;align-items:center;gap:12px}
#public-war-settings input[type=range]{flex:1;min-width:0;width:100%;padding:0;accent-color:#cbbb72}
#public-war-settings output{min-width:44px;text-align:right;font-variant-numeric:tabular-nums}
#public-war-settings .sim-check{display:flex;flex-direction:row;align-items:center;gap:8px;margin-bottom:14px}
#public-war-settings .war-settings-footer{align-items:stretch;flex-direction:column-reverse;padding:10px 12px}}
#public-war-ranking{z-index:100020}
body.tongkim-controls #modeSw,body.tongkim-controls #rotBtn,body.tongkim-controls #rideBtn{display:none!important}
#public-war-prefer{display:none;align-items:center;gap:6px;cursor:pointer}
body.tongkim-controls #public-war-prefer{display:flex}
#public-war-prefer input{accent-color:#7fe07a;margin:0;width:14px;height:14px}
#public-war-recruitment{z-index:100020}
#public-war-ranking .war-table{overflow-x:auto}
#public-war-ranking .war-self strong{color:#fff4ad;text-shadow:0 0 6px #b99b36}
`;document.head.appendChild(style);
    hud=document.createElement('div');hud.id='public-war-hud';hud.hidden=true;hud.setAttribute('role','timer');hud.setAttribute('aria-label','Thời gian chiến trường còn lại');document.body.appendChild(hud);
    respawnNotice=document.createElement('div');respawnNotice.id='public-war-respawn';respawnNotice.hidden=true;respawnNotice.setAttribute('role','status');respawnNotice.setAttribute('aria-live','polite');document.body.appendChild(respawnNotice);
    rejoinNotice=document.createElement('div');rejoinNotice.id='public-war-rejoin';rejoinNotice.hidden=true;rejoinNotice.setAttribute('role','status');rejoinNotice.setAttribute('aria-live','polite');document.body.appendChild(rejoinNotice);
    void document.fonts?.load('700 20px WarCalligraphy');
    panel=document.createElement('section');panel.id='public-war-ranking';panel.className='war-dialog';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','public-war-title');
    const header=document.createElement('header'),title=document.createElement('h2');title.id='public-war-title';title.textContent='Bảng xếp hạng · Tống Kim';
    const close=document.createElement('button');close.className='war-close';close.textContent='×';close.setAttribute('aria-label','Đóng bảng xếp hạng');close.onclick=()=>{panel.hidden=true;};header.append(title,close);
    const content=document.createElement('div');content.className='war-content';
    for(const key of ['status','teams','personal','potions']){const line=document.createElement('p');line.id=`public-war-${key}`;summary[key]=line;content.appendChild(line);}
    const scroll=document.createElement('div');scroll.className='war-table';table=document.createElement('table');scroll.appendChild(table);content.appendChild(scroll);
    const hint=document.createElement('p');hint.textContent='Top 10 quân trạng và hạng của bạn · Phím ` để bật/tắt · Esc để đóng';content.appendChild(hint);
    const actions=document.createElement('div');actions.className='war-actions';const leave=document.createElement('button');leave.id='public-war-leave';leave.textContent='Rời chiến trường';leave.onclick=()=>api.leave();actions.appendChild(leave);const settings=document.createElement('button');settings.textContent='Cài đặt Tống Kim · lưu server';settings.onclick=openSettings;actions.appendChild(settings);content.appendChild(actions);
    panel.append(header,content);document.body.appendChild(panel);
    const control=document.createElement('label');control.id='public-war-prefer';control.className='chip';control.title='Ưu tiên người chơi và SIM đối phương trước binh sĩ';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=true;checkbox.onchange=()=>{preferPlayers=checkbox.checked;if(l.battlefield){o.preferPKSim=preferPlayers;l.tgt=null;l.dirty=true;}};control.append(checkbox,'Đánh người');document.getElementById('topCtl')?.appendChild(control);
  }

  function render(){
    const intent=!state&&!leaving?read():null,pending=!!intent&&intent.until>Date.now();
    if(!hud){if(!pending)return;mount();}
    hud.hidden=!state;
    const elapsed=state?Math.max(0,clock()-state.now):0,entry=state?Math.max(0,state.entryRemaining-elapsed):0,respawn=state?Math.max(0,state.respawnRemaining-elapsed):0;
    rejoinNotice.hidden=leaving||!(pending||(state&&state.phase!=='finished'&&entry>0));
    if(!rejoinNotice.hidden){
      const text=entry>0?`Vào Tống Kim sau ${Math.ceil(entry)} giây`:world?'Đang xin vào lại Tống Kim…':'Đang kết nối lại Tống Kim…';
      if(rejoinNotice.textContent!==text)rejoinNotice.textContent=text;
    }
    if(!state)return;
    const phase=state.phase==='finished'?(state.score[0]===state.score[1]?'Hòa':`${state.score[0]>state.score[1]?'Tống':'Kim'} thắng`):entry>0?`Nhập trận sau ${Math.ceil(entry)} giây`:respawn>0?`Tái xuất sau ${Math.ceil(respawn)} giây`:'Đang giao chiến';
    hud.textContent=entry>0?`Phòng chờ · Vào trận sau ${Math.ceil(entry)} giây`:time(state.ends-clock());
    hud.style.fontSize=entry>0?'40px':'20px';
    const now=performance.now();
    if(typeof arenaSimulator!=='undefined')arenaSimulator?.marshalNotice?.tick(Math.max(0,(now-announcementAt)/1000),state.phase==='running');
    announcementAt=now;
    const self=world?.actors.find(a=>a.id===world.self);
    respawnNotice.hidden=state.phase==='finished'||!(self?.hp<=0&&respawn>0);
    const notice=`Tái xuất chiến sau ${Math.ceil(respawn)} giây`;
    if(!respawnNotice.hidden&&respawnNotice.textContent!==notice)respawnNotice.textContent=notice;
    if(panel.hidden)return;
    summary.status.textContent=`${phase} · Còn ${time(state.ends-clock())} · Phe của bạn: ${state.team===0?'Tống':'Kim'}`;
    summary.teams.replaceChildren();
    for(const [team,name,color] of [[0,'Tống','#ffcc00'],[1,'Kim','#c77bff']]){const span=document.createElement('span');span.style.color=color;span.textContent=`${name}: ${state.score[team].toLocaleString('vi-VN')}`;summary.teams.append(span,team===0?' · ':' quân trạng');}
    summary.potions.textContent=`Thuốc còn lại: ${state.potions[0]} HP / ${state.potions[1]} MP`;
    table.replaceChildren();
    const head=document.createElement('tr');for(const label of ['Hạng','Nhân vật','Phe','Danh hiệu','Binh sĩ hạ','Người chơi/SIM hạ','Điểm']){const cell=document.createElement('th');cell.textContent=label;head.appendChild(cell);}table.appendChild(head);
    const rows=state.units.filter(u=>u.kind<2).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name,'vi')||a.id-b.id);
    const own=rows.findIndex(row=>row.id===world.self),player=rows[own];
    summary.personal.textContent=player?`Bạn: ${player.name} · Hạng ${own+1}/${rows.length} · ${player.points.toLocaleString('vi-VN')} điểm · <${rank(player.points)}>`:'';
    for(let i=0;i<rows.length;i++){const row=rows[i];if(i>=10&&row.id!==world.self)continue;const tr=document.createElement('tr');if(row.id===world.self){tr.className='war-self';tr.setAttribute('aria-current','true');}
      const values=[i+1,`${row.name||'Người chơi'}${row.id===world.self?' (Bạn)':''}${row.kind===1?' · SIM':''}${row.online?'':' · Đã rời'}`,row.team===0?'Tống':'Kim',`<${rank(row.points)}>`,row.kills,row.playerKills||0,row.points.toLocaleString('vi-VN')];
      values.forEach((value,index)=>{const td=document.createElement('td');if(index===1){td.style.color=row.team===0?'#ffcc00':'#c77bff';if(row.id===world.self){const strong=document.createElement('strong');strong.textContent=String(value);td.appendChild(strong);}else td.textContent=String(value);}else td.textContent=String(value);if(index===3)td.className='war-title';tr.appendChild(td);});table.appendChild(tr);
    }
  }

  function resetAnnouncements(){
    lastKillNotice=0;marshalAnnounced=false;announcementAt=performance.now();
    if(state&&typeof arenaSimulator!=='undefined')arenaSimulator?.marshalNotice?.reset();
  }
  function announce(previous){
    if(!previous||previous.id!==state.id)resetAnnouncements();
    for(const notice of state.killNotices||[]){
      if(notice.id<=lastKillNotice)continue;
      lastKillNotice=notice.id;
      if(state.now-notice.at>10)continue;
      const message=`Bạn đã giết ${notice.title.toLocaleLowerCase('vi-VN')} <${notice.name}>`;
      if(typeof k==='function')k(message);
      if(typeof combatLog!=='undefined')combatLog?.war?.(message,true);
    }
    const spawned=state.marshalsSpawned??state.units.some(unit=>unit.kind===3);
    if(spawned&&!marshalAnnounced&&state.phase==='running'){
      const notice=typeof arenaSimulator!=='undefined'?arenaSimulator?.marshalNotice:null;
      if(!notice)return;
      marshalAnnounced=true;
      if(previous||state.now-(state.starts+(state.ends-state.starts)/2)<=6){
        const viewer=state.team===0?'song':'jin';notice.show('song',viewer);notice.show('jin',viewer);announcementAt=performance.now();
      }
    }
  }
  function showResult(){
    if(state?.phase!=='finished'||leaving||shownResult===state.id)return;
    const dialog=typeof arenaSimulator!=='undefined'?arenaSimulator?.resultDialog:null;
    if(!dialog)return;
    const result=state.score[0]===state.score[1]?'Hòa · Hai phe bằng quân trạng':`${state.score[0]>state.score[1]?'Tống':'Kim'} thắng · Tổng quân trạng`;
    if(panel)panel.hidden=true;if(shop)shop.hidden=true;recruitment?.remove();
    if(typeof Y!=='undefined')Object.assign(Y,{keys:{},target:null,active:false,moved:false,mouse:false});
    Object.assign(l,{moveTo:null,pickTarget:null,manTgt:null,tgt:null,clickHold:false,dash:null,dashTrail:null});
    dialog.open(result,{song:state.score[0],jin:state.score[1]},state.team===0?'song':'jin');
    shownResult=state.id;
  }
  function closeResult(){
    if(shownResult!==null&&typeof arenaSimulator!=='undefined')arenaSimulator?.resultDialog?.close();
    shownResult=null;
  }
  function openRanking(){mount();panel.hidden=false;render();}
  async function openSettings(){
    mount();
    let dialog=document.getElementById('public-war-settings');
    if(dialog){dialog.hidden=false;return;}
    dialog=document.createElement('section');dialog.id='public-war-settings';dialog.className='war-dialog';dialog.style.zIndex='100022';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','public-war-settings-title');
    dialog.innerHTML='<header><h2 id="public-war-settings-title">Cài đặt Tống Kim · lưu server</h2><button class="war-close" aria-label="Đóng cài đặt">×</button></header><div class="war-content"><p>Đang tải cấu hình từ server…</p></div>';
    dialog.querySelector('.war-close').onclick=()=>dialog.remove();document.body.appendChild(dialog);
    const content=dialog.querySelector('.war-content');
    try{
      const response=await fetch('/api/multiplayer/battlefield-settings');const data=await response.json();if(!response.ok)throw new Error(data.error);
      const value=data.settings,escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const input=(label,path,v,min,max)=>`<label>${label}<input data-setting="${path}" type="number" step="any" min="${min}" max="${max}" value="${v}"></label>`;
      const skills=(path,ids,available)=>[0,1].map(slot=>`<label>Chiêu ${slot+1}<select data-setting="${path}.skills.${slot}"><option value="0">${path.startsWith('marshals')?'Mặc định theo hệ':'Đánh thường'}</option>${available.map(skill=>`<option value="${skill.id}" ${ids[slot]===skill.id?'selected':''}>${escape(skill.name)} · cấp ${skill.level}</option>`).join('')}</select></label>`).join('');
      content.innerHTML='';
      const notice=document.createElement('p');notice.className='war-settings-note';notice.textContent='Lưu tại server · Áp dụng từ trận mới. Trận đang chạy giữ cấu hình ban đầu.';
      const tabs=document.createElement('div');tabs.className='war-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Nhóm cài đặt Tống Kim');
      const body=document.createElement('div');body.className='war-settings-body';
      const groups=[['match','Trận đấu'],['sims','Quân SIM'],['soldiers','Binh sĩ'],['marshals','Nguyên soái'],['drops','Vật phẩm rơi']];
      const panels=new Map(),buttons=[];
      function selectTab(index,focus=false){
        groups.forEach(([key],i)=>{buttons[i].setAttribute('aria-selected',String(i===index));buttons[i].tabIndex=i===index?0:-1;panels.get(key).hidden=i!==index;});
        body.scrollTop=0;
        if(focus)buttons[index].focus();
      }
      groups.forEach(([key,label],index)=>{
        const tab=document.createElement('button');tab.type='button';tab.id=`public-war-tab-${key}`;tab.textContent=label;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`public-war-page-${key}`);
        const page=document.createElement('section');page.id=`public-war-page-${key}`;page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby',tab.id);page.tabIndex=0;
        panels.set(key,page);buttons.push(tab);tabs.appendChild(tab);body.appendChild(page);
        tab.onclick=()=>selectTab(index);
        tab.onkeydown=event=>{
          const next=event.key==='ArrowRight'?(index+1)%groups.length:event.key==='ArrowLeft'?(index+groups.length-1)%groups.length:event.key==='Home'?0:event.key==='End'?groups.length-1:null;
          if(next===null)return;event.preventDefault();selectTab(next,true);
        };
      });
      panels.get('match').innerHTML=`<h3>Thời lượng trận đấu</h3><p>Thiết lập riêng cho chiến trường PvP và trận riêng.</p><div class="war-grid">${input('Thời lượng PvP (phút)','durationSeconds',(value.durationSeconds??1200)/60,1/6,120)}${input('Thời lượng trận riêng (phút)','privateDurationSeconds',(value.privateDurationSeconds??1200)/60,1/6,120)}</div>`;
      panels.get('sims').innerHTML=`<h3>Quân SIM mỗi phe</h3><p>Số lượng chia đều cho Tống và Kim. Nhập 10 sẽ có 10 Tống + 10 Kim = 20 SIM.</p><div class="war-grid">${input('SIM mỗi bên','simPerTeam',value.simPerTeam??10,0,100)}</div><p>Mỗi đợt 2–4 SIM, cách nhau ngẫu nhiên vài giây; hoàn tất trong tối đa 2 phút. Đặt 0 để không tạo SIM.</p>`;
      const simPage=panels.get('sims');
      value.simRoster ||= [];
      const subnav=document.createElement('div');subnav.className='sim-subtabs';
      const recoveryPage=document.createElement('section'),rosterPage=document.createElement('section');rosterPage.hidden=true;
      for(const [index,label]of ['Bơm máu & mana','Đội hình chung hai phe'].entries()){
        const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-selected',String(index===0));
        button.onclick=()=>{recoveryPage.hidden=index!==0;rosterPage.hidden=index!==1;for(const [i,tab]of [...subnav.children].entries())tab.setAttribute('aria-selected',String(i===index));};subnav.appendChild(button);
      }
      const slider=(label,path,current,min,max,step=1,unit='%')=>`<label>${label}<span class="sim-slider"><input type="range" data-setting="${path}" min="${min}" max="${max}" step="${step}" value="${current}" aria-label="${label}"><output data-sim-value="${path}">${current}${unit}</output></span></label>`;
      recoveryPage.innerHTML=`<h3>Thuốc cho SIM · dùng chung hai phe</h3><p>Chỉ dùng Ngũ Hoa Ngọc Lộ Hoàn. Một bình hồi cả máu và mana theo chỉ số gốc, chỉ tiêu hao một lần. Mỗi SIM có túi riêng 60 bình.</p><div class="war-grid">${[['life','máu'],['mana','mana']].map(([key,label])=>{
        const row=value.simRecovery[key],path='simRecovery.'+key;
        return `<div class="war-card"><label class="sim-check"><input type="checkbox" data-setting="${path}.enabled" ${row.enabled?'checked':''}>Tự bơm theo ${label}</label>${slider('Bắt đầu khi '+label+' ≤',path+'.start',row.start,1,99)}${slider('Bơm đến mức '+label+' ≥',path+'.stop',row.stop,2,100)}${slider('Bơm liên tục khi '+label+' ≤',path+'.urgent',row.urgent,1,99)}</div>`;
      }).join('')}</div>${slider('Khoảng cách bơm thông thường','simRecovery.interval',value.simRecovery.interval,.3,60,.1,' giây')}<p>Dưới ngưỡng liên tục: uống ngay mỗi khi hết hồi chiêu 0,3 giây. Không uống hai bình cùng lúc.</p>`;
      recoveryPage.oninput=event=>{
        const field=event.target;if(field.type!=='range')return;
        const path=field.dataset.setting,parts=path.split('.');
        if(parts.length===3){
          const at=name=>recoveryPage.querySelector(`[data-setting="simRecovery.${parts[1]}.${name}"]`),kind=parts[2];
          if(kind==='urgent'&&+field.value>+at('start').value)at('start').value=field.value;
          if(kind==='stop'&&+field.value<=+at('start').value)at('start').value=+field.value-1;
          if(kind!=='stop'&&+at('start').value>=+at('stop').value)at('stop').value=+at('start').value+1;
          if(+at('urgent').value>+at('start').value)at('urgent').value=at('start').value;
        }
        for(const range of recoveryPage.querySelectorAll('input[type="range"]'))recoveryPage.querySelector(`[data-sim-value="${range.dataset.setting}"]`).textContent=range.value+(range.dataset.setting==='simRecovery.interval'?' giây':'%');
      };
      rosterPage.innerHTML='<h3>Đội hình chung · áp dụng cho cả Tống và Kim</h3>';
      const rosterLabel=document.createElement('label'),chips=document.createElement('div'),routeSelect=document.createElement('select'),rosterSummary=document.createElement('p');chips.className='sim-chips';chips.setAttribute('aria-live','polite');
      routeSelect.setAttribute('aria-label','Thêm hệ phái và tuyến chiêu');
      routeSelect.innerHTML='<option value="">+ Chọn hệ phái & tuyến chiêu</option>'+(data.simRoutes||[]).map(route=>`<option value="${escape(route.id)}">${escape(route.name)}</option>`).join('');
      function renderRoster(){
        const countField=simPage.querySelector('[data-setting="simPerTeam"]');
        let count=Number(countField.value||0);const tooSmall=count<value.simRoster.length;
        countField.min=String(value.simRoster.length);
        if(tooSmall){count=value.simRoster.length;countField.value=String(count);}
        rosterLabel.textContent=`Hệ phái & tuyến chiêu · ${value.simRoster.length} / ${count} vị trí mỗi phe`;
        chips.innerHTML='';
        for(const [index,id]of value.simRoster.entries()){
          const route=(data.simRoutes||[]).find(route=>route.id===id);if(!route)continue;
          const chip=document.createElement('span');chip.className='sim-chip';const text=document.createElement('span');text.textContent=route.name;
          const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Xóa '+route.name);remove.onclick=()=>{value.simRoster.splice(index,1);renderRoster();};chip.append(text,remove);chips.appendChild(chip);
        }
        routeSelect.disabled=value.simRoster.length>=count;
        rosterSummary.textContent=tooSmall?'Xóa bớt badge trước khi giảm số SIM mỗi bên.':`Mỗi phe: ${value.simRoster.length} SIM theo cấu hình + ${count-value.simRoster.length} SIM ngẫu nhiên.`;
      }
      routeSelect.onchange=()=>{const count=Number(simPage.querySelector('[data-setting="simPerTeam"]').value||0);if(routeSelect.value&&value.simRoster.length<count)value.simRoster.push(routeSelect.value);routeSelect.value='';renderRoster();};
      simPage.querySelector('[data-setting="simPerTeam"]').oninput=renderRoster;
      rosterPage.append(rosterLabel,chips,routeSelect,rosterSummary);const rosterHelp=document.createElement('p');rosterHelp.textContent='Mỗi badge tạo 1 SIM theo tuyến đã chọn ở mỗi phe. Có thể chọn trùng tuyến; nhấn × để xóa và chọn lại.';rosterPage.appendChild(rosterHelp);
      simPage.append(subnav,recoveryPage,rosterPage);renderRoster();
      panels.get('soldiers').innerHTML='<h3>Binh sĩ chiến trường</h3><p>Số lượng là tổng hai phe. Tối đa 200 binh sĩ; đặt 0 để tắt một cấp quân. Chiêu dùng cấp 50–70.</p>';
      panels.get('marshals').innerHTML='<h3>Nguyên soái · cài đặt chung hai phe</h3><p>Các chỉ số bên dưới áp dụng giống nhau cho cả Tống và Kim. Mỗi phe một Nguyên soái, xuất hiện ở nửa thời lượng trận. Ngũ hành ngẫu nhiên; bộ chiêu gồm 1 chiêu cấp 80, 1 chiêu cấp 150 và 1 phụ trợ cùng hệ.</p>';
      panels.get('drops').innerHTML='<h3>Vật phẩm Quân Nhu</h3>';
      content.append(notice,tabs,body);selectTab(0);
      const rates=document.createElement('div');rates.className='war-card';
      rates.innerHTML=`<h3>Tỉ lệ rơi vật phẩm Quân Nhu (%)</h3><p>Áp dụng cho PvP và trận riêng từ trận mới. 20 giây đầu dành cho người hạ quái; sau đó ai cũng có thể nhặt, kể cả phe đối phương. Tự nhặt khi đến gần; biến mất sau 2 phút kể từ lúc rơi.</p><div class="war-grid">${[...data.ranks,'marshal'].map((rank,index)=>input(index<data.titles.length?data.titles[index]:'Nguyên soái','dropRates.'+rank,value.dropRates[rank],0,100)).join('')}</div>`;panels.get('drops').appendChild(rates);
      for(const [index,rank]of data.ranks.entries()){
        const row=value.soldiers[rank],path='soldiers.'+rank,card=document.createElement('div');card.className='war-card';
        card.innerHTML=`<h3>${escape(data.titles[index])}</h3><div class="war-grid">${input('Tổng hai phe',path+'.count',row.count,0,100)}${input('Máu',path+'.hp',row.hp,1,1e12)}<label>Hồi sinh<select data-setting="${path}.respawnSeconds">${[10,20,30].map(n=>`<option ${n===row.respawnSeconds?'selected':''}>${n}</option>`).join('')}</select></label>${input('Tuần tra',path+'.patrolRadius',row.patrolRadius,40,1200)}${input('Truy đuổi',path+'.leashRadius',row.leashRadius,40,1600)}${skills(path,row.skills,data.skills.filter(s=>s.level>=50&&s.level<=70))}</div>`;panels.get('soldiers').appendChild(card);
      }
      const marshal=value.marshals.song;
      panels.get('marshals').innerHTML+=`<div class="war-grid">${input('Máu mỗi Nguyên soái','marshals.song.hp',marshal.hp,1,1e12)}${['Vật lí','Độc','Băng','Hỏa','Lôi'].map((name,i)=>input('Kháng '+name+' (%)','marshals.song.res.'+i,marshal.res[i],-100,100)).join('')}${[['stunReduction','Giảm thời gian choáng (%)',40,0,100],['poisonReduction','Giảm thời gian trúng độc (%)',40,0,100],['coldReduction','Giảm thời gian làm chậm (%)',40,0,100],['hurtReduction','Giảm thời gian khựng đòn (%)',40,0,100],['attackSpeedPercent','Tốc độ đánh (%)',200,25,300],['movementRadius','Phạm vi di chuyển',500,0,1600]].map(([key,label,fallback,min,max])=>input(label,'marshals.song.'+key,marshal[key]??fallback,min,max)).join('')}</div><p>Tốc độ đánh 200% dùng hệ tốc độ đánh/thi triển của game. Phạm vi di chuyển tính từ vị trí xuất hiện; đặt 0 để đứng yên.</p>`;
      const save=document.createElement('button');save.textContent='Lưu cấu hình lên server';save.disabled=!data.editable;const message=document.createElement('p');message.setAttribute('role','status');message.textContent=data.editable?'Lưu tất cả nhóm cài đặt trong một lần.':'Chỉ GM được lưu cấu hình.';
      save.onclick=async()=>{
        save.disabled=true;message.textContent='Đang lưu…';
        try{
          for(const field of content.querySelectorAll('[data-setting]')){
            const parts=field.dataset.setting.split('.');let target=value;for(const part of parts.slice(0,-1))target=target[part];target[parts.at(-1)]=['durationSeconds','privateDurationSeconds'].includes(field.dataset.setting)?Math.round(Number(field.value)*60):field.type==='checkbox'?field.checked:Number(field.value);
          }
          value.marshals.jin={...value.marshals.song,res:[...value.marshals.song.res]};
          for(const row of Object.values(value.soldiers))row.skills=row.skills.filter(Boolean);
          const response=await fetch('/api/multiplayer/battlefield-settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}),saved=await response.json();if(!response.ok)throw new Error(saved.error);
          message.textContent='Đã lưu trên server. Áp dụng từ trận mới.';
        }catch(error){message.textContent=error.message;}finally{save.disabled=!data.editable;}
      };const footer=document.createElement('footer');footer.className='war-settings-footer';footer.append(message,save);content.appendChild(footer);
    }catch(error){content.textContent=error.message;}
  }
  const api={
    settings:openSettings,
    get marshalSettings(){return configuredMarshals;},
    get dropRates(){return configuredDrops;},
    get simPerTeam(){return configuredSimPerTeam;},
    get simRecovery(){return configuredSimRecovery;},
    get simRoster(){return configuredSimRoster;},
    async matchDuration(mode='public'){
      const response=await fetch('/api/multiplayer/battlefield-settings'),data=await response.json();
      if(!response.ok)throw new Error(data.error||'Không tải được thời lượng trận từ server.');
      configuredDrops=data.settings.dropRates;configuredMarshals=data.settings.marshals;configuredSimPerTeam=data.settings.simPerTeam??10;configuredSimRecovery=data.settings.simRecovery;configuredSimRoster=data.settings.simRoster;
      return data.settings[mode==='private'?'privateDurationSeconds':'durationSeconds']??1200;
    },
    get active(){return !!state||!!read();},
    get state(){return state;},
    join(team,send=sender){
      if(![0,1].includes(team)||state||l.battlefield)return false;
      const seq=send(19,{target:team});if(!seq)return false;
      leaving=false;requestAt=performance.now();remember({team,until:Date.now()+30000});return true;
    },
    leave(send=sender){const seq=send(20);if(seq){leaving=true;remember(null);}return !!seq;},
    slot(index){
      const selected=state?.selected?.[index],p=S.potions.find(p=>({life:0,mana:100,both:200})[p.kind]+p.tier===selected);
      return {ic:p?.ic||S.potions.find(p=>p.kind===(index?'mana':'life'))?.ic,n:state?.inventory?.find(i=>i.slot===index&&i.id===selected)?.count||0,name:p?.n||(index?'Thuốc nội lực':'Thuốc sinh lực')};
    },
    pharmacy(index=0){
      if(!state)return false;mount();shopSlot=index;shopMessage='';
      if(!shop){shop=document.createElement('section');shop.id='public-war-pharmacy';shop.className='war-dialog';shop.style.zIndex='100021';shop.setAttribute('role','dialog');shop.setAttribute('aria-label','Chủ Dược Điếm');document.body.appendChild(shop);}
      shop.hidden=false;shopStamp='';api.renderShop();return true;
    },
    renderShop(){
      if(!shop||shop.hidden||!state)return;
      const stamp=JSON.stringify([state.inventory,state.selected,state.potions,shopSlot,o.gold,shopBusy,shopMessage]);if(stamp===shopStamp)return;shopStamp=stamp;
      shop.innerHTML='<header><h2>Chủ Dược Điếm · Tống Kim</h2><button class="war-close" aria-label="Đóng dược điếm">×</button></header><nav class="war-tabs"><button data-war-slot="0">Ô 1 · Sinh lực</button><button data-war-slot="1">Ô 2 · Nội lực</button></nav><div class="war-content"><p id="public-war-stock"></p><div id="public-war-products"></div><p class="war-note" id="public-war-shop-message"></p></div>';
      shop.querySelector('.war-close').onclick=()=>{shop.hidden=true;};
      shop.querySelector('#public-war-stock').textContent=`Ô ${shopSlot+1}: ${state.potions[shopSlot]}/40 bình · Tổng ${state.potions.reduce((a,b)=>a+b,0)}/80 · Ngân lượng ${o.gold.toLocaleString('vi-VN')}`;
      shop.querySelector('#public-war-shop-message').textContent=shopMessage;
      for(const button of shop.querySelectorAll('[data-war-slot]')){button.setAttribute('aria-selected',String(+button.dataset.warSlot===shopSlot));button.onclick=()=>{shopSlot=+button.dataset.warSlot;shopStamp='';api.renderShop();};}
      const products=shop.querySelector('#public-war-products');
      for(const potion of S.potions.filter(p=>(p.kind==='both'||p.kind===(shopSlot===0?'life':'mana'))&&o.lvl>=(be[p.tier]||1))){
        const id=({life:0,mana:100,both:200})[potion.kind]+potion.tier,row=document.createElement('div');row.className='war-shop-row'+(state.selected?.[shopSlot]===id?' selected':'');
        const image=document.createElement('img');image.src=potion.ic;image.alt='';const select=document.createElement('button');select.className='war-product';select.textContent=`${potion.n} · ${Ot(potion).toLocaleString('vi-VN')} lượng · còn ${state.inventory?.find(i=>i.slot===shopSlot&&i.id===id)?.count||0}`;
        const submit=async(kind,quantity)=>{if(shopBusy)return;shopBusy=true;shopMessage='Đang lưu giao dịch…';api.renderShop();try{await OnlineProgression.run({kind,potion:potion.kind,tier:potion.tier,slot:shopSlot,...(quantity?{quantity}:{})});shopMessage=quantity?'Đã mua thuốc và chọn vào ô.':'Đã chọn thuốc.';}catch(error){shopMessage=error.message;}finally{shopBusy=false;shopStamp='';api.renderShop();}};
        select.disabled=shopBusy;select.onclick=()=>submit('warPotionSelect');row.append(image,select);
        for(const quantity of [1,20]){const buy=document.createElement('button');buy.textContent=quantity===1?'Mua':'Mua ×20';buy.disabled=shopBusy;buy.dataset.buy=String(id);buy.dataset.quantity=String(quantity);buy.onclick=()=>submit('warPotionBuy',quantity);row.appendChild(buy);}products.appendChild(row);
      }
    },
    rankTitle(id){const unit=state?.units.find(u=>u.id===id);return unit&&unit.kind<2?`<${unit.team===0?'Tống':'Kim'} ${rank(unit.points)}>`:'';},
    ranking:openRanking,
    recruit(team){
      if(![0,1].includes(team))return;
      if(state){openRanking();return;}
      mount();recruitment?.remove();recruitment=document.createElement('section');recruitment.id='public-war-recruitment';recruitment.className='war-dialog';recruitment.setAttribute('role','dialog');recruitment.setAttribute('aria-label','Chiêu binh Tống Kim');
      const header=document.createElement('header'),title=document.createElement('h2');title.textContent=team===0?'Tống Quốc Chiêu Binh quan':'Kim Quốc Chiêu Binh quan';
      const close=document.createElement('button');close.className='war-close';close.textContent='×';close.setAttribute('aria-label','Đóng');close.onclick=()=>recruitment.remove();header.append(title,close);
      const content=document.createElement('div');content.className='war-content';const description=document.createElement('p');description.textContent=`Gia nhập phe ${team===0?'Tống':'Kim'} · PvP · Chiến trường chung. Chờ 5 giây tại khu chờ trước khi nhập trận.`;
      const join=document.createElement('button');join.id='public-war-recruit-join';join.textContent=`Gia nhập phe ${team===0?'Tống':'Kim'}`;join.onclick=()=>{if(api.join(team))recruitment.remove();else description.textContent='Đang chờ kết nối máy chủ. Vui lòng thử lại.';};const settings=document.createElement('button');settings.textContent='Cài đặt Tống Kim · lưu server';settings.onclick=openSettings;content.append(description,join,settings);recruitment.append(header,content);document.body.appendChild(recruitment);
    },
    controls(){
      const active=!!state||!!l.battlefield;
      if(active){mount();if(!controlsActive){preferPlayers=true;if(l.battlefield)o.preferPKSim=true;}const checkbox=document.querySelector('#public-war-prefer input');if(checkbox)checkbox.checked=preferPlayers;}
      document.body.classList.toggle('tongkim-controls',active);controlsActive=active;
      if(state&&world?.actors.find(a=>a.id===world.self)?.battlefieldReady&&preferenceSent!==preferPlayers&&sender(9,{skill:0,target:+preferPlayers}))preferenceSent=preferPlayers;
    },
    handleKey(event){
      if(state?.phase==='finished')return false;
      const toggle=event.code==='Backquote'||event.key==='`',escape=event.key==='Escape';
      if(!state||(!toggle&&(!escape||!panel||panel.hidden))||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||/TEXTAREA|SELECT/.test(event.target?.tagName)||(event.target?.tagName==='INPUT'&&!['checkbox','radio','button','submit'].includes(event.target.type))||event.target?.isContentEditable)return false;
      event.preventDefault();event.stopImmediatePropagation();
      if(!event.repeat){if(toggle&&panel.hidden)openRanking();else panel.hidden=true;}return true;
    },
    reset(){resetAnnouncements();closeResult();leaving=false;state=null;world=null;requestAt=0;preferenceSent=null;controlsActive=false;document.body.classList.remove('tongkim-controls');recruitment?.remove();if(shop)shop.hidden=true;bodies.clear();if(hud)hud.hidden=true;if(respawnNotice)respawnNotice.hidden=true;if(rejoinNotice)rejoinNotice.hidden=true;if(panel)panel.hidden=true;},
    sync(next,send){
      sender=send;world=next;
      if(!next.battlefield){if(shop)shop.hidden=true;
        if(state){R=true;l.dirty=true;l.stKey=null;resetAnnouncements();closeResult();state=null;bodies.clear();if(hud)hud.hidden=true;if(respawnNotice)respawnNotice.hidden=true;if(panel)panel.hidden=true;}
        const intent=read();if(intent&&!leaving){if(intent.until<Date.now()){remember(null);render();return;}if(!requestAt||performance.now()-requestAt>10000){requestAt=performance.now();send(19,{target:intent.team});}}
        render();return;
      }
      const previous=state;state=next.battlefield;if(!previous){preferPlayers=true;preferenceSent=null;}const buffKey=s=>Object.keys(s?.itemBuffs||{}).filter(key=>s.itemBuffs[key]>0).sort().join(',');
      if(!previous||previous.phase!==state.phase||buffKey(previous)!==buffKey(state)||String(previous.potions)!==String(state.potions)){R=true;l.dirty=true;l.stKey=null;}lastAt=performance.now();mount();
      remember({team:state.team,until:Date.now()+Math.max(0,state.ends-state.now)*1000});
      announce(previous);showResult();render();api.renderShop();
    },
    potion(kind,send=sender,quiet=false){
      if(!state||state.phase!=='running'||state.entryRemaining>0||state.respawnRemaining>0)return false;
      const index=kind==='mana'?1:0;
      if(!state.potions[index]){if(!quiet)k('Đã hết thuốc chiến trường.');return false;}
      if((l.potCd?.[kind]||0)>0)return false;
      if(!send(7,{skill:index===1?100:0}))return false;l.potCd||={life:0,mana:0};l.potCd[kind]=.3;return true;
    },
    entities(next){
      render();if(!next?.training&&(!next?.battlefield||next.map!==9003)){bodies.clear();return [];}
      const ids=new Set(),result=[],now=performance.now();
      for(const unit of [...(next.training?.units||[]),...(next.map===9003?next.battlefield?.units||[]:[])]){
        if(!unit.kind||!unit.online)continue;
        const actor=next.actors.find(a=>a.id===unit.id);if(!actor||(actor.hp<=0&&!(unit.kind===1&&unit.corpseRemaining>0)))continue;ids.add(unit.id);
        let body=bodies.get(unit.id);
        if(!body||body.life!==actor.life||body.dead!==(actor.hp<=0)){
          body={x:actor.x,y:actor.y,dir:0,t:0,actT:0,runT:((Math.imul(unit.id,2654435761)>>>0)%1000)/1000,at:now,history:new GameWebTransport.RemoteTimeline(),life:actor.life,dead:actor.hp<=0};bodies.set(unit.id,body);
        }
        body.history.push({id:actor.id,seq:next.tick,timestamp:(next.tick*50)>>>0,effectTime:0,x:actor.x,y:actor.y,dir:body.dir,moving:unit.moving},now);
        const position=body.history.sample(now),dx=position.x-body.x,dy=position.y-body.y,dt=Math.max(0,(now-body.at)/1000);
        if(Math.hypot(dx,dy)>0.01)body.dir=kn(dx,dy);
        Object.assign(body,{...unit,...actor,supports:actor.supports||[],x:position.x,y:position.y,battlefieldUnit:true,max:actor.maxHp,hpMax:actor.maxHp,n:unit.name,f:unit.faction,s:unit.sex,dead:actor.hp<=0,mv:position.moving,t:body.t+dt,at:now});
        // Movement wins over a lingering attack pose. Preserve each actor's gait across brief stops.
        const pose=onlineWorld.pose(actor.id),action=body.dead?'die':body.mv?'run':pose?.atT>0?'at':actor.hurt>0?'hurt':'st';
        if(body.mv)body.runT+=Math.min(dt,.15);
        body.actT=action==='run'?body.runT:body.act===action?body.actT+dt:0;body.act=action;
        result.push({remotePlayer:body,x:body.x,y:body.y});
      }
      for(const id of bodies.keys())if(!ids.has(id))bodies.delete(id);
      for(const drop of next.battlefield?.itemDrops||[])result.push({remotePlayer:{...drop,battlefieldUnit:true,warDrop:true},x:drop.x,y:drop.y});
      for(const trap of next.battlefield?.itemTraps||[])result.push({remotePlayer:{...trap,battlefieldUnit:true,warTrap:true},x:trap.x,y:trap.y});
      return result;
    },
    draw(ctx,actor,next){
      if(actor.warDrop){if(typeof arenaSimulator!=='undefined')arenaSimulator?.drawWarItemDrop(ctx,actor);return;}
      if(actor.warTrap){
        const skill=({freezeTrap:345,stunTrap:349,slowTrap:343})[actor.kind],code=A0.f?.[skill]?.c,sprite=A0.m?.[code]?.fly;
        if(!(sprite&&Fa(sprite,0,Math.max(0,30-(actor.expires-clock())),actor.x,actor.y,true))){ctx.strokeStyle='#83dcff';ctx.beginPath();ctx.ellipse(actor.x,actor.y,24,12,0,0,7);ctx.stroke();}
        return;
      }
      const color=(actor.training&&OnlinePvp.nameColor(next,actor))||(actor.kind>=2?'#ffffff':actor.team===0?'#ffb347':'#c77bff'),pose=onlineWorld.pose(actor.id);
      const definition=actor.kind===1?Jt(actor.f,actor.s):r0[actor.skin],anim=definition?.anim;
      let elapsed=actor.actT;
      if(actor.act==='at'&&pose?.atD>0){elapsed=(1-pose.atT/pose.atD)*(ws(anim,'at')||.4);if(Number.isFinite(pose.dir))actor.dir=pose.dir;}
      const effects=layer=>{if(actor.dead)return;for(const support of actor.supports||[]){const sprite=support.active&&U1[support.skill];if(sprite&&(sprite.pos==='foot')===(layer==='under'))F3(ctx,sprite,actor.x,actor.y,0,actor.t,Jn,.9,actor);}};
      ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(actor.x,actor.y,16,6,0,0,7);ctx.fill();effects('under');
      const scale=actor.kind===1?Jn:Ua;
      const appearance=actor.kind===1&&actor.appearance;
      const look=appearance&&typeof lB==='function'?lB({sx:appearance.sx,ride:appearance.ride,r:appearance.rows}):null;
      if(look)look.mg=appearance.mg;
      const height=(look&&typeof It==='function'&&It(actor.act,actor.dir,elapsed,actor.x,actor.y,scale,1,anim,look))||(anim&&Va(anim,actor.act,actor.dir,elapsed,actor.x,actor.y,scale));
      if(!height){
        const asset=definition?.img&&bA(definition.img);
        if(!asset||!M8(asset,definition.sz,actor.x,actor.y,1,false,actor.dead ? .35 : 1)){ctx.fillStyle=color;ctx.beginPath();ctx.arc(actor.x,actor.y-18,12,0,7);ctx.fill();}
      }
      effects('over');
      if(actor.dead || actor.act==='die')return;
      L3(actor.x,actor.y-(typeof nameplateOffset==='function'?nameplateOffset(anim,scale,.9,6,58):65),(actor.kind>=2?`${actor.team===0?'Tống':'Kim'} ${actor.name}`:actor.name),color,12,actor.hp/actor.maxHp,OnlinePvp.healthColor(next,actor),!actor.training&&actor.kind<2?`<${actor.team===0?'Tống':'Kim'} ${rank(actor.points)}>`:undefined,'#8de1cf');
    },
  };
  return api;
})();
