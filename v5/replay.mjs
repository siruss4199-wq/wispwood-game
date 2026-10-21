import {SAVE_KEY,load,fresh} from './core.mjs';
// A second save slot: starting again never overwrites the original chapter.
export const REPLAY_KEY=SAVE_KEY+'-replay', ACTIVE_KEY=SAVE_KEY+'-active-slot';
export const slotKey=active=>active?REPLAY_KEY:SAVE_KEY;
export const loadSlot=(storage,now=Date.now())=>{
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
