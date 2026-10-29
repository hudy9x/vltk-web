import { visiblePlayers, replyText } from './model';
import { mountPartyView } from './view';
import type { WorldState } from '../state/protocol';
import type { RenderPlayer } from '../webtransport';
declare var D:(value:string)=>string;
declare var k:(message:string)=>void;
declare var B0:{x:number;y:number};
declare var M0:{w:number;h:number};
let state:WorldState|null=null,send:(kind:number,target:number)=>number=()=>0;
let online=false,pending=0,lastReply=0,nextRefresh=0;
let view:ReturnType<typeof mountPartyView>|undefined;
export function reset(){state=null;online=false;pending=0;lastReply=0;nextRefresh=0;view?.update(null,[],false,false);}
export function update(next:WorldState|null,players:RenderPlayer[],command:typeof send,connected:boolean){
  state=next;send=command;online=connected;
  view ||= mountPartyView(D,(kind,target)=>{
    if(!online||pending)return;
    pending=send(kind,target);nextRefresh=0;
    view?.message(pending?'Đang gửi yêu cầu…':'Đang chờ kết nối online.');
  });
  const reply=state?.party?.reply;
  if(connected&&reply?.seq&&reply.seq!==lastReply){
    lastReply=reply.seq;pending=0;
    const message=replyText[reply.code]||'';view.message(message);if(message)k(message);
  }
  const now=performance.now();if(now<nextRefresh)return;nextRefresh=now+200;
  if(!connected){pending=0;view.message('Đang chờ kết nối online.');}
  view.update(connected?state:null,connected?visiblePlayers(state,players,{x:B0.x,y:B0.y,width:M0.w,height:M0.h}):[],connected,!!pending);
}
