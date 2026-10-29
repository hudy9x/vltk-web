import { mountWarDialogStyle } from '../../simulator/dialog-style';
import type { WorldState } from '../state/protocol';
import type { visiblePlayers } from './model';
type Candidate=ReturnType<typeof visiblePlayers>[number];
export function mountPartyView(escape:(value:string)=>string, action:(kind:number,target:number)=>void) {
  mountWarDialogStyle();
  const panel=document.createElement('section');
  panel.id='online-party';panel.className='war-dialog';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Tổ đội');
  panel.innerHTML='<header><h2>Tổ đội</h2><button class="war-close" aria-label="Đóng tổ đội">×</button></header><div class="war-content"><p>Chọn người chơi đang nhìn thấy trong bản đồ để mời. Tổ đội tối đa 8 người.</p><div class="war-grid"><section class="war-card"><h3>Người chơi trong tầm nhìn</h3><div id="online-party-nearby" role="group" aria-label="Người chơi trong tầm nhìn"></div><div class="war-actions"><button id="online-party-send">Mời tổ đội</button></div></section><section class="war-card"><h3 id="online-party-heading">Tổ đội của bạn</h3><div id="online-party-members"></div><div class="war-actions"><button id="online-party-leave">Thoát tổ đội</button></div></section></div><p id="online-party-message" role="status"></p></div>';
  const invitation=document.createElement('section');
  invitation.id='online-party-invite';invitation.className='war-dialog';invitation.hidden=true;
  invitation.setAttribute('role','dialog');invitation.setAttribute('aria-label','Lời mời tổ đội');
  invitation.innerHTML='<header><h2>Lời mời tổ đội</h2></header><div class="war-content"><p id="online-party-from"></p><div class="war-actions"><button id="online-party-accept">Đồng ý</button><button id="online-party-decline">Từ chối</button></div></div>';
  const style=document.createElement('style');style.textContent=`
  #online-party-toggle{align-self:flex-end;position:relative;width:32px;height:32px;flex:none;padding:0;border:0;border-radius:50%;background:url(/img/u2/team.png) 0 0/96px 32px no-repeat;image-rendering:pixelated;box-shadow:0 1px 3px #000;cursor:pointer;margin-top:4px}
  #online-party-toggle.in{background-position:-64px 0}#online-party-toggle.inv{background-position:-32px 0;box-shadow:0 0 9px #edc778}
  #online-party-toggle:focus-visible{outline:2px solid #edc778;outline-offset:2px}
  #online-party h3{font:inherit;color:#ead18e;margin:0 0 12px}#online-party .party-row{display:flex;align-items:center;gap:8px;border-bottom:1px solid #484938;padding:10px 2px;min-width:0}
  #online-party .party-row>span{flex:1;overflow-wrap:anywhere}#online-party .party-row small{display:block;color:#aaa990;margin-top:5px}#online-party .party-row button{width:100%;text-align:left;overflow-wrap:anywhere}#online-party-nearby,#online-party-members{max-height:42dvh;overflow:auto;min-height:100px}
  #online-party-invite{left:auto;top:auto;right:16px;bottom:85px;transform:none;width:min(360px,calc(100vw - 32px));z-index:95020}
  @media(pointer:coarse){body.u2s #online-party-toggle{width:36px;height:36px;background-size:108px 36px}body.u2s #online-party-toggle.in{background-position:-72px 0}body.u2s #online-party-toggle.inv{background-position:-36px 0}}
  `;
  document.head.appendChild(style);document.body.append(panel,invitation);
  const query=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  let selected=0,current:WorldState|null=null,nearby:Candidate[]=[],connected=false,pending=false,listKey='',memberKey='',inviteKey='';
  let toggle:HTMLButtonElement|null=null;
  function close(){panel.hidden=true;toggle?.setAttribute('aria-expanded','false');toggle?.focus();}
  function open(){panel.hidden=false;toggle?.setAttribute('aria-expanded','true');render();panel.querySelector<HTMLButtonElement>('.war-close')?.focus();}
  panel.querySelector<HTMLButtonElement>('.war-close')!.onclick=close;
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});
  query('online-party-send').onclick=()=>action(12,selected);
  query('online-party-leave').onclick=()=>action(15,0);
  query('online-party-accept').onclick=()=>action(13,current?.party?.invitations[0]?.id||0);
  query('online-party-decline').onclick=()=>action(14,current?.party?.invitations[0]?.id||0);
  query('online-party-nearby').onclick=event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-party-player]');
    if(button&&!button.disabled){selected=Number(button.dataset.partyPlayer);render();}
  };
  function render(){
    const party=current?.party,me=current?.self,members=party?.members||[],leader=party?.leader||0;
    const list=nearby,memberIds=new Set(members.map(m=>m.id));
    if(!list.some(p=>p.id===selected)||memberIds.has(selected))selected=0;
    const nextList=JSON.stringify([list,selected,[...memberIds]]);
    if(!panel.hidden&&nextList!==listKey){
      listKey=nextList;
      query('online-party-nearby').innerHTML=list.length?list.map(p=>`<div class="party-row"><button type="button" data-party-player="${p.id}" aria-pressed="${p.id===selected}" class="${p.id===selected?'selected':''}" ${memberIds.has(p.id)?'disabled':''}>${escape(p.name)}${memberIds.has(p.id)?' · Trong tổ đội':''}</button></div>`).join(''):'<p>Không có người chơi khác trong tầm nhìn.</p>';
    }
    // HP refreshes must not replace the player buttons while someone clicks/selects.
    const nextMembers=JSON.stringify([members.map(m=>({...m,hp:Math.ceil(m.hp),maxHp:Math.ceil(m.maxHp)})),leader,current?.map,connected]);
    if(!panel.hidden&&nextMembers!==memberKey){
      memberKey=nextMembers;
      query('online-party-heading').textContent=`Tổ đội của bạn${members.length?' · '+members.length+'/8':''}`;
      query('online-party-members').innerHTML=members.length?members.map(m=>`<div class="party-row"><span>${m.id===leader?'★ ':''}${escape(m.name||'Người chơi')}${m.id===me?' (bạn)':''}<small>${m.id===leader?'Đội trưởng':'Đội viên'} · ${m.map===current?.map?'Cùng bản đồ':'Khác bản đồ'} · HP ${Math.ceil(m.hp).toLocaleString('vi-VN')}/${Math.ceil(m.maxHp).toLocaleString('vi-VN')}</small></span></div>`).join(''):'<p>Bạn chưa có tổ đội. Người gửi lời mời sẽ làm đội trưởng khi lời mời được chấp nhận.</p>';
    }
    query<HTMLButtonElement>('online-party-send').disabled=!connected||pending||!selected||members.length>=8||!!leader&&leader!==me;
    query<HTMLButtonElement>('online-party-leave').disabled=!connected||pending||!leader;
    const invite=connected?party?.invitations[0]:null;
    invitation.hidden=!invite;
    const nextInvite=JSON.stringify(invite&&[invite.id,invite.name]);
    if(invite&&nextInvite!==inviteKey){inviteKey=nextInvite;query('online-party-from').textContent=`${invite.name||'Người chơi'} mời bạn vào tổ đội.`;}
    if(!invite)inviteKey='';
    query<HTMLButtonElement>('online-party-accept').disabled=pending;
    query<HTMLButtonElement>('online-party-decline').disabled=pending;
    toggle?.classList.toggle('in',!!leader);toggle?.classList.toggle('inv',!!invite);
    if(toggle)toggle.title=invite?'Tổ đội · Có lời mời':leader?`Tổ đội · ${members.length}/8`:'Tổ đội';
  }
  return {
    update(state:WorldState|null,players:Candidate[],online:boolean,busy:boolean){
      current=state;nearby=players;connected=online;pending=busy;
      const parent=document.getElementById('u20rc');
      if(parent&&!toggle){toggle=document.createElement('button');toggle.id='online-party-toggle';toggle.type='button';toggle.setAttribute('aria-label','Tổ đội');toggle.setAttribute('aria-controls','online-party');toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>panel.hidden?open():close();parent.appendChild(toggle);}
      render();
    },
    message(text:string){query('online-party-message').textContent=text;},
  };
}
