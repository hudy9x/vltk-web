import { applyPotionDebit } from './consumables.ts';
import type { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const catalog = require('../definitions/catalog.cjs');
const progression = require('../definitions/progression.cjs');
import { createHash } from 'node:crypto';
type Character = Record<string, any>;
export interface Reward {
  id: string;
  account: string;
  slot: number;
  xp: number;
  gold: number;
  potion?: {id:number;spent:number};
  death?: {map:number;x:number;y:number;life:number;notice:unknown};
  knb?: number;
  merit?: number;
}
/** The online profile is imported once. Legacy local-storage writes cannot replace it. */
export function createCharacters(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS multiplayer_characters(account TEXT NOT NULL,slot INTEGER NOT NULL,profile TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(account,slot));
    CREATE TABLE IF NOT EXISTS multiplayer_rewards(id TEXT PRIMARY KEY,account TEXT NOT NULL,slot INTEGER NOT NULL,xp INTEGER NOT NULL,gold INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS multiplayer_progression_commands(account TEXT NOT NULL,slot INTEGER NOT NULL,id TEXT NOT NULL,hash TEXT NOT NULL,PRIMARY KEY(account,slot,id));
    CREATE TABLE IF NOT EXISTS multiplayer_profile_updates(account TEXT NOT NULL,slot INTEGER NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(account,slot));
    CREATE TABLE IF NOT EXISTS multiplayer_death_drops(id TEXT PRIMARY KEY,amount INTEGER NOT NULL,currency TEXT NOT NULL DEFAULT 'gold');`);
  // Preserve the currency of receipts already committed by the earlier KNB version.
  if(!db.prepare('PRAGMA table_info(multiplayer_death_drops)').all().some(row=>row.name==='currency'))
    db.exec("ALTER TABLE multiplayer_death_drops ADD COLUMN currency TEXT NOT NULL DEFAULT 'knb'");
  function read(account: string, slot: number): { profile: Character; revision: number } {
    if (!Number.isInteger(slot) || slot < 0 || slot > 2)
      throw Object.assign(new Error('Ô nhân vật không hợp lệ.'), { status: 400 });
    let row = db
      .prepare('SELECT profile,revision FROM multiplayer_characters WHERE account=? AND slot=?')
      .get(account, slot);
    if (!row) {
      const saved = db
        .prepare('SELECT value FROM account_storage WHERE account_id=? AND key=?')
        .get(account, slot === 0 ? 'jxidle' : `jxidle_${slot + 1}`);
      if (!saved)
        throw Object.assign(new Error('Hãy lưu nhân vật trước khi vào online.'), { status: 409 });
      const wrapper = JSON.parse(String(saved.value)),
        profile = typeof wrapper.d === 'string' ? JSON.parse(wrapper.d) : wrapper;
      if (!profile.fac || !Number.isInteger(profile.lvl) || profile.lvl < 1 || profile.lvl > 200)
        throw Object.assign(new Error('Dữ liệu nhân vật không hợp lệ.'), { status: 400 });
      catalog.character(profile); // Validate that the native stat builder accepts this profile.
      db.prepare('INSERT INTO multiplayer_characters(account,slot,profile) VALUES(?,?,?)').run(
        account,
        slot,
        JSON.stringify(profile),
      );
      row = { profile: JSON.stringify(profile), revision: 0 };
    }
    return { profile: JSON.parse(String(row.profile)), revision: Number(row.revision) };
  }
  function apply(grant: Reward) {
    if (
      !/^[0-9]+(?:-[0-9]+){1,4}$/.test(grant.id) ||
      grant.id.length > 100 ||
      !Number.isSafeInteger(grant.xp) ||
      !Number.isSafeInteger(grant.gold) ||
      grant.xp < 0 ||
      grant.xp > 1e8 ||
      grant.gold < 0 ||
      grant.gold > 1e8 ||
      grant.merit !== undefined && (!Number.isSafeInteger(grant.merit)||grant.merit<0||grant.merit>1000) ||
      grant.knb !== undefined && (!Number.isSafeInteger(grant.knb)||grant.knb<0||grant.knb>1e6) ||
      grant.death !== undefined && (grant.xp!==0||grant.gold!==0||!!grant.knb||!!grant.potion||!!grant.merit||!Number.isInteger(grant.death.map)||!Number.isInteger(grant.death.life)||!Number.isFinite(grant.death.x)||!Number.isFinite(grant.death.y))
    )
      throw new Error('Invalid server reward');
    db.exec('BEGIN IMMEDIATE');
    try {
      if (db.prepare('SELECT 1 FROM multiplayer_rewards WHERE id=?').get(grant.id)) {
        const death=grant.death?db.prepare('SELECT amount,currency FROM multiplayer_death_drops WHERE id=?').get(grant.id):undefined;
        db.exec('COMMIT');
        return death?{id:grant.id,amount:Number(death.amount),currency:String(death.currency)}:undefined;
      }
      const { profile: p } = read(grant.account, grant.slot);
      if(grant.potion)applyPotionDebit(p,grant.potion);
      progression.addExperience(p,grant.xp);
      p.gold = (p.gold || 0) + grant.gold;
      if(grant.merit){
        p.mats ||= {};p.mats.misc ||= {};
        const previous=p.mats.misc.tk_merit;
        const total=(Number.isSafeInteger(previous)&&previous>0?previous:0)+grant.merit;
        if(!Number.isSafeInteger(total))throw new Error('War merit overflow');
        p.mats.misc.tk_merit=total;
      }
      let deathDrop:{id:string;amount:number;currency:string}|undefined;
      if(grant.death){
        const balance=Number.isSafeInteger(p.gold)&&p.gold>0?p.gold:0;
        const amount=Math.min(1_000_000,Math.floor(balance/5));
        p.gold=balance-amount;
        db.prepare("INSERT INTO multiplayer_death_drops(id,amount,currency) VALUES(?,?,'gold')").run(grant.id,amount);
        deathDrop={id:grant.id,amount,currency:'gold'};
      }
      if(grant.knb){
        const balance=Number.isSafeInteger(p.knb)&&p.knb>0?p.knb:0;
        if(!Number.isSafeInteger(balance+grant.knb))throw new Error('KNB balance overflow');
        p.knb=balance+grant.knb;
      }
      db.prepare('INSERT INTO multiplayer_rewards VALUES(?,?,?,?,?)').run(
        grant.id,
        grant.account,
        grant.slot,
        grant.xp,
        grant.gold,
      );
      db.prepare(
        'UPDATE multiplayer_characters SET profile=?,revision=revision+1 WHERE account=? AND slot=?',
      ).run(JSON.stringify(p), grant.account, grant.slot);
      queueProfile(grant.account,grant.slot);
      db.exec('COMMIT');
      return deathDrop;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  function queueProfile(account:string,slot:number){
    db.prepare(`INSERT INTO multiplayer_profile_updates(account,slot,revision)
      SELECT account,slot,revision FROM multiplayer_characters WHERE account=? AND slot=?
      ON CONFLICT(account,slot) DO UPDATE SET revision=excluded.revision`).run(account,slot);
  }
  function mutate(account:string,slot:number,id:string,action:unknown,development=false,gameMasterMode?:'development'|'all'){
    if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(id))throw Object.assign(new Error('Mã thao tác không hợp lệ.'),{status:400});
    if(!action||typeof action!=='object'||Array.isArray(action)||typeof (action as {kind?:unknown}).kind!=='string')throw Object.assign(new Error('Thao tác không hợp lệ.'),{status:400});
    const hashAction={...(action as Record<string,unknown>)};if(hashAction.kind==='warPotionBuy'||hashAction.kind==='warPotionSelect')delete hashAction.spent;
    if(hashAction.kind==='warItemBuy'||hashAction.kind==='warItemUse')delete hashAction.room;
    const hash=createHash('sha256').update(JSON.stringify(hashAction)).digest('hex');
    db.exec('BEGIN IMMEDIATE');
    try{
      const saved=read(account,slot);
      const prior=db.prepare('SELECT hash FROM multiplayer_progression_commands WHERE account=? AND slot=? AND id=?').get(account,slot,id);
      if(prior){
        if(prior.hash!==hash)throw Object.assign(new Error('Mã thao tác đã được dùng.'),{status:409});
        db.exec('COMMIT');return saved;
      }
      const profile=progression.apply(saved.profile,action,development,gameMasterMode);
      catalog.character(profile); // Rebuild authoritative combat stats before committing anything.
      db.prepare('UPDATE multiplayer_characters SET profile=?,revision=revision+1 WHERE account=? AND slot=?').run(JSON.stringify(profile),account,slot);
      db.prepare('INSERT INTO multiplayer_progression_commands VALUES(?,?,?,?)').run(account,slot,id,hash);
      queueProfile(account,slot);
      db.exec('COMMIT');return read(account,slot);
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  return {
    read,
    apply,
    mutate,
    exists:(account:string,slot:number)=>!!db.prepare('SELECT 1 FROM multiplayer_characters WHERE account=? AND slot=?').get(account,slot),
    pendingProfiles:()=>db.prepare('SELECT account,slot,revision FROM multiplayer_profile_updates LIMIT 32').all(),
    ackProfile:(account:string,slot:number,revision:number)=>db.prepare('DELETE FROM multiplayer_profile_updates WHERE account=? AND slot=? AND revision<=?').run(account,slot,revision),
    character: catalog.character,
    world: catalog.world,
    revision: (account: string, slot: number) =>
      db
        .prepare('SELECT revision FROM multiplayer_characters WHERE account=? AND slot=?')
        .get(account, slot)?.revision,
  };
}
