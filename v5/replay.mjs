import {SAVE_KEY,load,fresh} from './core.mjs';
// A second save slot: starting again never overwrites the original chapter.
export const REPLAY_KEY=SAVE_KEY+'-replay', ACTIVE_KEY=SAVE_KEY+'-active-slot';
export const slotKey=active=>active?REPLAY_KEY:SAVE_KEY;
// Saves written by the rolled-back one-loop build (version 6) cannot load here.
// Copy each one aside, once, before this build starts fresh over it.
export const REWORK_BACKUP={[SAVE_KEY]:SAVE_KEY+'-rework-backup',[REPLAY_KEY]:REPLAY_KEY+'-rework-backup'};
function keepReworkSaves(storage){
 for(const [key,backup] of Object.entries(REWORK_BACKUP)){
  const raw=storage.getItem(key);let version=null;
  try{version=JSON.parse(raw)?.version;}catch{}
  if(version===6&&storage.getItem(backup)===null)storage.setItem(backup,raw);
 }
}
export const loadSlot=(storage,now=Date.now())=>{
 try{keepReworkSaves(storage);}catch{/* Storage full or blocked: play continues. */}
 const active=storage.getItem(ACTIVE_KEY)==='replay';
 return {active,state:load(storage.getItem(slotKey(active)),now)};
};
export function beginReplay(storage,now=Date.now()){
 const s=fresh(now);
 storage.setItem(REPLAY_KEY,JSON.stringify(s));
 storage.setItem(ACTIVE_KEY,'replay');
 return s;
}
export function returnOriginal(storage,now=Date.now()){
 const s=load(storage.getItem(SAVE_KEY),now);
 storage.removeItem(ACTIVE_KEY);
 return s;
}
