import { createHmac, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import { createCharacters } from '../persistence/characters.ts';
import gameMasterConfig from '../../../shared/game-master.json' with { type: 'json' };
import progressionFields from '../../../shared/multiplayer/progression-fields.json' with { type: 'json' };
import { parseJsonBody, sendJson } from '../../http.ts';
import type { GameMasterMode } from '../../types.ts';

/** Short-lived, binary HMAC ticket. The account ID always comes from the cookie session. */
export function issueMultiplayerTicket(
  accountId: string,
  secret: string,
  now = Date.now(),
): Buffer {
  const account = Buffer.from(accountId.replaceAll('-', ''), 'hex');
  if (account.length !== 16 || secret.length < 32)
    throw new Error('Invalid multiplayer ticket configuration');
  const payload = Buffer.alloc(37);
  payload[0] = 1;
  payload.writeUInt32LE(Math.floor(now / 1000) + 30, 1);
  account.copy(payload, 5);
  randomBytes(16).copy(payload, 21);
  return Buffer.concat([payload, createHmac('sha256', secret).update(payload).digest()]);
}

export function registerMultiplayerWebTransport(
  app: FastifyInstance,
  requireUser: (request: FastifyRequest) => Record<string, unknown>,
  db?: DatabaseSync,
  development = false,
  gameMasterMode: GameMasterMode = (process.env.GAME_MASTER_MODE ?? gameMasterConfig.mode) === 'development' ? 'development' : 'all',
): void {
  const characters = db ? createCharacters(db) : undefined;
  let polling: Promise<void> | undefined;
  const stopped = new AbortController();
  async function controlCall(path: string, body?: unknown) {
    const response = await fetch(new URL(path, process.env.MULTIPLAYER_WT_CONTROL_URL!), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'x-multiplayer-secret': process.env.MULTIPLAYER_SECRET || '',
        'content-type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.any([stopped.signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok)
      throw Object.assign(new Error('Máy chủ thế giới chưa sẵn sàng.'), { status: 503 });
    return response.json();
  }
  async function refreshProfiles(selected?:{account:string;slot:number}){
    if(!characters)return;
    for(const row of selected?[selected]:characters.pendingProfiles()){
      const account=String(row.account),slot=Number(row.slot),saved=characters.read(account,slot);
      await controlCall('/refresh',{nonce:'',account,slot,revision:saved.revision,profile:characters.character(saved.profile)});
      characters.ackProfile(account,slot,saved.revision);
    }
  }
  const timer = setInterval(() => {
    if (polling || !characters || !process.env.MULTIPLAYER_WT_CONTROL_URL) return;
    polling = (async () => {
      try {
        const grants = await controlCall('/rewards');
        const ids: string[] = [];
        for (const grant of grants) {
          const deathDrop=characters.apply(grant);
          if(deathDrop)await controlCall('/deaths/ack',deathDrop);
          else ids.push(grant.id);
        }
        await refreshProfiles();
        if (ids.length) await controlCall('/rewards/ack', ids);
      } catch (error) {
        if (!stopped.signal.aborted)
          app.log.warn({ err: error }, 'Online reward delivery will retry');
      }
    })().finally(() => {
      polling = undefined;
    });
  }, 1000);
  timer.unref();
  app.addHook('onClose', async () => {
    clearInterval(timer);
    stopped.abort();
    await polling;
  });
  app.get('/api/multiplayer/character', (request, reply) => {
    const user = requireUser(request);
    const slot = Number((request.query as { slot?: string }).slot);
    if (!characters) return sendJson(reply, 503, { error: 'Online storage unavailable' });
    if(!Number.isInteger(slot)||slot<0||slot>2)return sendJson(reply,400,{error:'Ô nhân vật không hợp lệ.'});
    const onlyExisting=(request.query as {existing?:string}).existing==='1';
    if(onlyExisting&&!characters.exists(String(user.id),slot))return sendJson(reply,200,{exists:false});
    const previous = Number((request.query as { revision?: string }).revision);
    if (
      Number.isInteger(slot) &&
      slot >= 0 &&
      slot <= 2 &&
      Number.isInteger(previous) &&
      previous >= 0 &&
      characters.revision(String(user.id), slot) === previous
    )
      return reply.code(204).send();
    const saved = characters.read(String(user.id), slot);
    const profile =
      Number.isInteger(previous) && previous >= 0
        ? Object.fromEntries(
            progressionFields.map((key) => [key, saved.profile[key]]),
          )
        : saved.profile;
    return sendJson(reply, 200, { revision: saved.revision, profile, full:!(Number.isInteger(previous)&&previous>=0) });
  });
  app.post('/api/multiplayer/progression',async(request,reply)=>{
    const user=requireUser(request),body=parseJsonBody(request.body) as {slot?:unknown;id?:unknown;action?:unknown};
    if(!characters)return sendJson(reply,503,{error:'Online storage unavailable'});
    if(!body||typeof body.slot!=='number'||!Number.isInteger(body.slot)||body.slot<0||body.slot>2||typeof body.id!=='string')
      return sendJson(reply,400,{error:'Ô nhân vật hoặc thao tác không hợp lệ.'});
    const action=body.action as {kind?:string;matchId?:number;starts?:number;spent?:number[]}|undefined;
    if(action?.kind==='warPotionBuy'||action?.kind==='warPotionSelect'){
      const room=await controlCall('/battlefield/shop',{account:String(user.id),slot:body.slot});
      // Only trusted room metadata is forwarded to the transactional mutation.
      Object.assign(action,room);
    }
    const allowGm=gameMasterMode==='all'||development;
    if(action?.kind==='gm'&&!allowGm)return sendJson(reply,403,{error:'GM chỉ dùng trong development.'});
    const saved=characters.mutate(String(user.id),body.slot,body.id,body.action,development,gameMasterMode);
    if(process.env.MULTIPLAYER_WT_CONTROL_URL)await refreshProfiles({account:String(user.id),slot:body.slot});
    return sendJson(reply,200,{...saved,full:true});
  });
  app.post('/api/multiplayer/webtransport/session', async (request, reply) => {
    const user = requireUser(request);
    const control = process.env.MULTIPLAYER_WT_CONTROL_URL;
    const secret = process.env.MULTIPLAYER_SECRET || '';
    if (!control || secret.length < 32) return sendJson(reply, 200, { enabled: false });
    const response = await fetch(new URL('/config', control), {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok)
      throw Object.assign(new Error('Máy chủ multiplayer chưa sẵn sàng.'), { status: 503 });
    const config = (await response.json()) as Record<string, unknown>;
    let ticket:Buffer;
    // The shared Fastify parser deliberately returns a raw JSON string.
    const payload = parseJsonBody(request.body) as { slot?: unknown;position?:unknown } | null;
    const slot = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload.slot === undefined ? 0 : payload.slot)
      : null;
    if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot > 2)
      return sendJson(reply, 400, { error: 'Ô nhân vật không hợp lệ.' });
    if (characters) {
      const saved = characters.read(String(user.id), slot);
      await controlCall('/catalog', characters.world());
      ticket = issueMultiplayerTicket(String(user.id), secret);
      await controlCall('/admit', {
        nonce: ticket.subarray(21, 37).toString('hex'),
        account: String(user.id),
        slot,
        revision:saved.revision,
        position:parseResumePosition(payload?.position),
        profile: characters.character(saved.profile),
      });
    }
    ticket ||= issueMultiplayerTicket(String(user.id), secret);
    return sendJson(reply, 200, { enabled: true, ...config, ticket: ticket.toString('base64') });
  });
}
function parseResumePosition(input:unknown){
  if(!input||typeof input!=='object')return undefined;
  const p=input as Record<string,unknown>;
  if(!Number.isInteger(p.map)||Number(p.map)<1||Number(p.map)>0xffffffff||!Number.isInteger(p.life)||Number(p.life)<1||Number(p.life)>0xffffffff||
    typeof p.x!=='number'||typeof p.y!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>1e7||p.y>1e7)return undefined;
  return {map:p.map,x:p.x,y:p.y,life:p.life};
}
