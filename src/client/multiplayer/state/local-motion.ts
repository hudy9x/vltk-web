import { newer } from '../webtransport/protocol';
import type { ActorState, WorldState } from './protocol';
export interface MotionPoint { x:number;y:number }
type Step = (actor:MotionPoint,x:number,y:number,distance:number)=>void;
/** Replay a click's remaining local time from the acknowledged server pose.
 * Reaching the destination locally does not discard that click: delayed poses
 * must still be replayed to the same presentation time, including after arrival.
 */
export class LocalMotion {
  private input?:{goal:MotionPoint;started:number;seq?:number};
  private authority?:{world:WorldState;actor:ActorState};
  private shadow?:MotionPoint;
  private shadowTick?:number;
  private replayed=0;
  begin(x:number,y:number,now:number){this.input={goal:{x,y},started:now};this.shadow=undefined;this.shadowTick=undefined;}
  sent(seq:number){if(this.input){this.input.seq=seq>>>0;this.shadowTick=undefined;}}
  cancel(){this.input=undefined;this.shadow=undefined;this.shadowTick=undefined;}
  clear(){this.cancel();this.authority=undefined;}
  receive(world:WorldState){if(this.authority&&!newer(world.tick,this.authority.world.tick))return;const actor=world.actors.find(a=>a.id===world.self);if(actor)this.authority={world,actor};}
  get goal(){return this.input?.goal;}
  step(actor:MotionPoint,dt:number,now:number,move:Step,fallbackSpeed:number):void {
    const a=this.authority;
    if(!a)return;
    const {world,actor:self}=a, input=this.input;
    if(self.hp<=0){this.cancel();this.correct(actor,self,dt);return;}
    const speed=self.stun>0?0:world.movement.speed;
    const pending=input&&(input.seq===undefined||newer(input.seq,world.ack));
    if(pending){move(actor,input.goal.x,input.goal.y,(Number.isFinite(speed)?speed:fallbackSpeed)*dt);return;}
    if(input&&input.seq!==undefined&&!newer(input.seq,world.ack)&&world.movement.motion!==0){
      const goal=world.movement;
      if(this.shadowTick!==world.tick||!this.shadow){this.shadow={x:self.x,y:self.y};this.shadowTick=world.tick;this.replayed=0;}
      const elapsed=((world.tick-world.movement.commandTick)>>>0)*.05;
      const lead=Math.max(0,Math.min(2,(now-input.started)/1000-elapsed));
      let remaining=lead-this.replayed;
      while(remaining>1e-6){const step=Math.min(1/30,remaining);move(this.shadow,goal.x,goal.y,speed*step);remaining-=step;}
      this.replayed=Math.max(this.replayed,lead);
      move(actor,goal.x,goal.y,speed*dt);
      this.correct(actor,this.shadow,dt);
      return;
    }
    if(input)this.cancel();
    this.correct(actor,self,dt);
  }
  private correct(actor:MotionPoint,to:MotionPoint,dt:number){
    const d=Math.hypot(to.x-actor.x,to.y-actor.y),t=d>250?1:Math.min(1,dt*14);
    actor.x+=(to.x-actor.x)*t;actor.y+=(to.y-actor.y)*t;
  }
}
