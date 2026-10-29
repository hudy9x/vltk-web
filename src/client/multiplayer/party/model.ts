import type { WorldState } from '../state/protocol';
import type { RenderPlayer } from '../webtransport';

export interface Viewport {x:number;y:number;width:number;height:number}
/** Use rendered positions and the actual camera rectangle, never the whole map roster. */
export function visiblePlayers(state:WorldState|null, players:RenderPlayer[], view:Viewport) {
  if(!state)return [];
  return players.filter(p=>p.id!==state.self &&
    state.actors.some(a=>a.id===p.id) && p.x>=view.x && p.x<=view.x+view.width &&
    p.y>=view.y && p.y<=view.y+view.height)
    .map(p=>({id:p.id,name:p.appearance.name,alignment:state.actors.find(a=>a.id===p.id)!.alignment??3}));
}
export const replyText:Record<number,string>={
  1:'Đã gửi lời mời tổ đội.',2:'Đã vào tổ đội.',3:'Đã từ chối lời mời.',4:'Đã thoát tổ đội.',
  5:'Người chơi không còn sẵn sàng hoặc đã chuyển bản đồ.',6:'Chỉ đội trưởng được mời thêm thành viên.',
  7:'Tổ đội đã đủ 8 người.',8:'Lời mời không còn hiệu lực.',9:'Người chơi ở quá xa.',10:'Người chơi đang có lời mời chờ trả lời.',
};
