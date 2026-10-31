// Public-room presentation. Commands express intent; only server snapshots change the match.
var OnlineBattlefield=(()=>{
  let state=null,world=null,sender=()=>0,panel=null,hud=null,table=null,summary={},lastAt=0,requestAt=0,leaving=false,preferPlayers=true,preferenceSent=null,controlsActive=false,recruitment=null,shop=null,shopSlot=0,shopStamp='',shopBusy=false,shopMessage='',respawnNotice=null;
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
#public-war-hud[hidden],#public-war-respawn[hidden]{display:none}
#public-war-respawn{position:fixed;bottom:130px;left:50%;transform:translateX(-50%);z-index:95020;max-width:90vw;box-sizing:border-box;padding:10px 20px;border:1px solid #b29455;border-radius:6px;background:#181c16ed;color:#ffe1a0;font:700 20px/1.5 WarCalligraphy,cursive;text-align:center;text-shadow:0 2px 3px #000,0 0 12px #000;pointer-events:none}
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
    void document.fonts?.load('700 20px WarCalligraphy');
    panel=document.createElement('section');panel.id='public-war-ranking';panel.className='war-dialog';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','public-war-title');
    const header=document.createElement('header'),title=document.createElement('h2');title.id='public-war-title';title.textContent='Bảng xếp hạng · Tống Kim';
    const close=document.createElement('button');close.className='war-close';close.textContent='×';close.setAttribute('aria-label','Đóng bảng xếp hạng');close.onclick=()=>{panel.hidden=true;};header.append(title,close);
    const content=document.createElement('div');content.className='war-content';
    for(const key of ['status','teams','personal','potions']){const line=document.createElement('p');line.id=`public-war-${key}`;summary[key]=line;content.appendChild(line);}
    const scroll=document.createElement('div');scroll.className='war-table';table=document.createElement('table');scroll.appendChild(table);content.appendChild(scroll);
    const hint=document.createElement('p');hint.textContent='Top 10 quân trạng và hạng của bạn · Phím ` để bật/tắt · Esc để đóng';content.appendChild(hint);
    const actions=document.createElement('div');actions.className='war-actions';const leave=document.createElement('button');leave.id='public-war-leave';leave.textContent='Rời chiến trường';leave.onclick=()=>api.leave();actions.appendChild(leave);content.appendChild(actions);
    panel.append(header,content);document.body.appendChild(panel);
    const control=document.createElement('label');control.id='public-war-prefer';control.className='chip';control.title='Ưu tiên người chơi và SIM đối phương trước binh sĩ';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=true;checkbox.onchange=()=>{preferPlayers=checkbox.checked;if(l.battlefield){o.preferPKSim=preferPlayers;l.tgt=null;l.dirty=true;}};control.append(checkbox,'Đánh người');document.getElementById('topCtl')?.appendChild(control);
  }

  function render(){
    if(!hud)return;hud.hidden=!state;if(!state)return;
    const elapsed=Math.max(0,clock()-state.now),entry=Math.max(0,state.entryRemaining-elapsed),respawn=Math.max(0,state.respawnRemaining-elapsed);
    const phase=state.phase==='finished'?(state.score[0]===state.score[1]?'Hòa':`${state.score[0]>state.score[1]?'Tống':'Kim'} thắng`):entry>0?`Nhập trận sau ${Math.ceil(entry)} giây`:respawn>0?`Tái xuất sau ${Math.ceil(respawn)} giây`:'Đang giao chiến';
    hud.textContent=time(state.ends-clock());
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
    const head=document.createElement('tr');for(const label of ['Hạng','Nhân vật','Phe','Danh hiệu','Binh sĩ hạ','Người chơi hạ','Điểm']){const cell=document.createElement('th');cell.textContent=label;head.appendChild(cell);}table.appendChild(head);
    const rows=state.units.filter(u=>u.kind<2).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name,'vi')||a.id-b.id);
    const own=rows.findIndex(row=>row.id===world.self),player=rows[own];
    summary.personal.textContent=player?`Bạn: ${player.name} · Hạng ${own+1}/${rows.length} · ${player.points.toLocaleString('vi-VN')} điểm · <${rank(player.points)}>`:'';
    for(let i=0;i<rows.length;i++){const row=rows[i];if(i>=10&&row.id!==world.self)continue;const tr=document.createElement('tr');if(row.id===world.self){tr.className='war-self';tr.setAttribute('aria-current','true');}
      const values=[i+1,`${row.name||'Người chơi'}${row.id===world.self?' (Bạn)':''}${row.kind===1?' · SIM':''}${row.online?'':' · Đã rời'}`,row.team===0?'Tống':'Kim',`<${rank(row.points)}>`,row.kills,row.playerKills||0,row.points.toLocaleString('vi-VN')];
      values.forEach((value,index)=>{const td=document.createElement('td');if(index===1){td.style.color=row.team===0?'#ffcc00':'#c77bff';if(row.id===world.self){const strong=document.createElement('strong');strong.textContent=String(value);td.appendChild(strong);}else td.textContent=String(value);}else td.textContent=String(value);if(index===3)td.className='war-title';tr.appendChild(td);});table.appendChild(tr);
    }
  }

  function openRanking(){mount();panel.hidden=false;render();}
  const api={
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
        for(const quantity of [1,20]){const buy=document.createElement('button');buy.textContent=quantity===1?'Mua':'Mua ×20';buy.disabled=shopBusy||state.potions[shopSlot]>=40;buy.dataset.buy=String(id);buy.dataset.quantity=String(quantity);buy.onclick=()=>submit('warPotionBuy',quantity);row.appendChild(buy);}products.appendChild(row);
      }
    },
    rankTitle(id){const unit=state?.units.find(u=>u.id===id);return unit&&unit.kind<2?`<${rank(unit.points)}>`:'';},
    ranking:openRanking,
    recruit(team){
      if(![0,1].includes(team))return;
      if(state){openRanking();return;}
      mount();recruitment?.remove();recruitment=document.createElement('section');recruitment.id='public-war-recruitment';recruitment.className='war-dialog';recruitment.setAttribute('role','dialog');recruitment.setAttribute('aria-label','Chiêu binh Tống Kim');
      const header=document.createElement('header'),title=document.createElement('h2');title.textContent=team===0?'Tống Quốc Chiêu Binh quan':'Kim Quốc Chiêu Binh quan';
      const close=document.createElement('button');close.className='war-close';close.textContent='×';close.setAttribute('aria-label','Đóng');close.onclick=()=>recruitment.remove();header.append(title,close);
      const content=document.createElement('div');content.className='war-content';const description=document.createElement('p');description.textContent=`Gia nhập phe ${team===0?'Tống':'Kim'} · PvP · Chiến trường chung. Chờ 5 giây tại khu chờ trước khi nhập trận.`;
      const join=document.createElement('button');join.id='public-war-recruit-join';join.textContent=`Gia nhập phe ${team===0?'Tống':'Kim'}`;join.onclick=()=>{if(api.join(team))recruitment.remove();else description.textContent='Đang chờ kết nối máy chủ. Vui lòng thử lại.';};content.append(description,join);recruitment.append(header,content);document.body.appendChild(recruitment);
    },
    controls(){
      const active=!!state||!!l.battlefield;
      if(active){mount();if(!controlsActive){preferPlayers=true;if(l.battlefield)o.preferPKSim=true;}const checkbox=document.querySelector('#public-war-prefer input');if(checkbox)checkbox.checked=preferPlayers;}
      document.body.classList.toggle('tongkim-controls',active);controlsActive=active;
      if(state&&world?.actors.find(a=>a.id===world.self)?.battlefieldReady&&preferenceSent!==preferPlayers&&sender(9,{skill:0,target:+preferPlayers}))preferenceSent=preferPlayers;
    },
    handleKey(event){
      const toggle=event.code==='Backquote'||event.key==='`',escape=event.key==='Escape';
      if(!state||(!toggle&&(!escape||!panel||panel.hidden))||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||/TEXTAREA|SELECT/.test(event.target?.tagName)||(event.target?.tagName==='INPUT'&&!['checkbox','radio','button','submit'].includes(event.target.type))||event.target?.isContentEditable)return false;
      event.preventDefault();event.stopImmediatePropagation();
      if(!event.repeat){if(toggle&&panel.hidden)openRanking();else panel.hidden=true;}return true;
    },
    reset(){state=null;world=null;requestAt=0;preferenceSent=null;controlsActive=false;document.body.classList.remove('tongkim-controls');recruitment?.remove();if(shop)shop.hidden=true;bodies.clear();if(hud)hud.hidden=true;if(respawnNotice)respawnNotice.hidden=true;if(panel)panel.hidden=true;},
    sync(next,send){
      sender=send;world=next;
      if(!next.battlefield){if(shop)shop.hidden=true;
        if(state){state=null;bodies.clear();if(hud)hud.hidden=true;if(respawnNotice)respawnNotice.hidden=true;if(panel)panel.hidden=true;}
        const intent=read();if(intent&&!leaving){if(intent.until<Date.now()){remember(null);return;}if(!requestAt||performance.now()-requestAt>10000){requestAt=performance.now();send(19,{target:intent.team});}}
        return;
      }
      const previous=state;state=next.battlefield;if(!previous){preferPlayers=true;preferenceSent=null;}if(!previous||String(previous.potions)!==String(state.potions)){R=true;l.dirty=true;}lastAt=performance.now();mount();
      remember({team:state.team,until:Date.now()+Math.max(0,state.ends-state.now)*1000});
      if(state.phase==='finished'&&previous?.phase!=='finished')openRanking();render();api.renderShop();
    },
    potion(kind,send=sender,quiet=false){
      if(!state||state.phase!=='running'||state.entryRemaining>0||state.respawnRemaining>0)return false;
      const index=kind==='mana'?1:0;
      if(!state.potions[index]){if(!quiet)k('Đã hết thuốc chiến trường.');return false;}
      if((l.potCd?.[kind]||0)>0)return false;
      if(!send(7,{skill:index===1?100:0}))return false;l.potCd||={life:0,mana:0};l.potCd[kind]=.3;return true;
    },
    entities(next){
      render();if(!next?.battlefield||next.map!==9003){bodies.clear();return [];}
      const ids=new Set(),result=[],now=performance.now();
      for(const unit of next.battlefield.units){
        if(!unit.kind||!unit.online)continue;
        const actor=next.actors.find(a=>a.id===unit.id);if(!actor||actor.hp<=0)continue;ids.add(unit.id);
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
      for(const trap of next.battlefield.itemTraps||[])result.push({remotePlayer:{...trap,battlefieldUnit:true,warTrap:true},x:trap.x,y:trap.y});
      return result;
    },
    draw(ctx,actor,next){
      if(actor.warTrap){
        const skill=({freezeTrap:345,stunTrap:349,slowTrap:343})[actor.kind],code=A0.f?.[skill]?.c,sprite=A0.m?.[code]?.fly;
        if(!(sprite&&Fa(sprite,0,Math.max(0,30-(actor.expires-clock())),actor.x,actor.y,true))){ctx.strokeStyle='#83dcff';ctx.beginPath();ctx.ellipse(actor.x,actor.y,24,12,0,0,7);ctx.stroke();}
        return;
      }
      const color=actor.team===0?'#ffcc00':'#c77bff',pose=onlineWorld.pose(actor.id);
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
      L3(actor.x,actor.y-(typeof nameplateOffset==='function'?nameplateOffset(anim,scale,.9,6,58):65),actor.name,color,12,actor.hp/actor.maxHp,OnlinePvp.healthColor(next,actor),actor.kind<2?`<${rank(actor.points)}>`:undefined,'#8de1cf');
    },
  };
  return api;
})();
