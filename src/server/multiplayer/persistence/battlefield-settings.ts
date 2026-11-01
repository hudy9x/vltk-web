import type { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const settings=require('../definitions/battlefield-settings.cjs');
export function createPublicBattlefieldSettings(db:DatabaseSync){
  db.exec('CREATE TABLE IF NOT EXISTS public_battlefield_settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL)');
  let cachedValue:string|undefined,cachedWorld:any;
  function read(){const row=db.prepare('SELECT value FROM public_battlefield_settings WHERE id=1').get();return row?settings.validate({...settings.defaults(),...JSON.parse(String(row.value))}):settings.defaults();}
  function world(base:any){
    const value=read(),key=JSON.stringify(value);
    if(key!==cachedValue){cachedWorld={...base,battlefield:settings.configure(base.battlefield,value)};cachedValue=key;}
    return cachedWorld;
  }
  function save(value:unknown,base:any){
    const valid=settings.validate(value),configured={...base,battlefield:settings.configure(base.battlefield,valid)};
    db.prepare('INSERT INTO public_battlefield_settings(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(valid));
    cachedValue=JSON.stringify(valid);cachedWorld=configured;return valid;
  }
  return {read,save,world,options:settings.options};
}
