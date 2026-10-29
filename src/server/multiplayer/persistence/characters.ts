import { applyPotionDebit } from './consumables.ts';
import type { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const native = require('../definitions/runtime.cjs');
const catalog = require('../definitions/catalog.cjs');
type Character = Record<string, any>;
export interface Reward {
  id: string;
  account: string;
  slot: number;
  xp: number;
  gold: number;
  potion?: {id:number;spent:number};
}
/** The online profile is imported once. Legacy local-storage writes cannot replace it. */
export function createCharacters(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS multiplayer_characters(account TEXT NOT NULL,slot INTEGER NOT NULL,profile TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(account,slot));
    CREATE TABLE IF NOT EXISTS multiplayer_rewards(id TEXT PRIMARY KEY,account TEXT NOT NULL,slot INTEGER NOT NULL,xp INTEGER NOT NULL,gold INTEGER NOT NULL);`);
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
      !/^[0-9]+(?:-[0-9]+){1,3}$/.test(grant.id) ||
      grant.id.length > 100 ||
      !Number.isSafeInteger(grant.xp) ||
      !Number.isSafeInteger(grant.gold) ||
      grant.xp < 0 ||
      grant.xp > 1e8 ||
      grant.gold < 0 ||
      grant.gold > 1e8
    )
      throw new Error('Invalid server reward');
    db.exec('BEGIN IMMEDIATE');
    try {
      if (db.prepare('SELECT 1 FROM multiplayer_rewards WHERE id=?').get(grant.id)) {
        db.exec('COMMIT');
        return;
      }
      const { profile: p } = read(grant.account, grant.slot);
      if(grant.potion)applyPotionDebit(p,grant.potion);
      p.xp = (p.xp || 0) + grant.xp;
      p.gold = (p.gold || 0) + grant.gold;
      const curve = native.catalog().exp;
      while (p.lvl < 200 && Number(curve[p.lvl - 1]) > 0 && p.xp >= Number(curve[p.lvl - 1])) {
        p.xp -= Number(curve[p.lvl - 1]);
        p.lvl++;
        p.attrPts = (p.attrPts || 0) + 5;
        p.skPts = (p.skPts || 0) + 1;
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
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return {
    read,
    apply,
    character: catalog.character,
    world: catalog.world,
    revision: (account: string, slot: number) =>
      db
        .prepare('SELECT revision FROM multiplayer_characters WHERE account=? AND slot=?')
        .get(account, slot)?.revision,
  };
}
