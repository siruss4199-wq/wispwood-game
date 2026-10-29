// Coast Camp saves the game cannot read, and kept camps (secondary-chain pilot, round 2, 2026-10-29;
// docs/V5_SECONDARY_PILOT_2026-10-29.md). Nothing here writes: the app decides when a save is written.
//
// Why: a save that holds a part an older build does not know (the pilot's Bolts and Note fragments)
// cannot be read by that build. Builds from 47c on leave such a save exactly as it is and offer Retry or
// an explicit new camp, which first copies the save aside (SAVE_KEY-damaged…). This module lets the app
// (1) tell a save from a NEWER build apart from a damaged one, so the player is told which it is and
// nothing starts silently, and (2) list every camp kept aside in this browser that this build can read,
// so any of them can be restored: the way back after a camp went through an older build, after a new
// camp was started on purpose, or after ?new=1.
import {load,fresh,VERSION,SAVE_KEY,currentArea,totalBuilt} from './game.mjs';
import {CHAINS,GENERATOR_CHAINS} from './chains.mjs';
import {STAGES} from './areas.mjs';

// What a raw save is to this build: 'empty' (none), 'ok' (it loads), 'newer' (made by a later build:
// a later save version, or parts or generators this build does not know) or 'damaged' (anything else
// that does not load). load() answers a save it cannot read with exactly fresh(now).
export function readSave(raw,now){
 if(!raw)return {state:fresh(now),status:'empty'};
 const state=load(raw,now);
 if(JSON.stringify(state)!==JSON.stringify(fresh(now)))return {state,status:'ok'};
 let s=null;try{s=JSON.parse(raw);}catch{}
 return {state,status:s&&typeof s==='object'&&fromNewer(s)?'newer':'damaged'};
}
const unknownFamily=f=>typeof f==='string'&&/^[a-z]{2,16}$/.test(f)&&!CHAINS[f];
const unknownGenerator=id=>typeof id==='string'&&/^[a-z]{2,16}$/.test(id)&&!GENERATOR_CHAINS[id];
const list=x=>Array.isArray(x)?x:[];
export function fromNewer(s){
 if(Number.isInteger(s.version)&&s.version>VERSION)return true;
 const cells=[...list(s.board),...list(s.shed),...list(s.pending)];
 const needs=list(s.orders).flatMap(o=>list(o?.needs));
 return cells.some(x=>x?.type==='item'&&unknownFamily(x.family)||x?.type==='source'&&unknownGenerator(x.id))||needs.some(r=>unknownFamily(r?.family));
}

// Keys a camp is kept under: SAVE_KEY-damaged… (a save that could not be read, Build 47c), PR #80's
// SAVE_KEY-backup, and SAVE_KEY-kept… (round 2: the camp a new camp replaced). Kept copies are never
// overwritten or removed.
const KEPT=new RegExp(`^${SAVE_KEY}-(damaged|backup|kept)(-\\d+)?$`);
export const isKeptKey=k=>KEPT.test(k);
// The first free key of a kind ('damaged' or 'kept'): -kind, then -kind-2 … -kind-9, then one named by the time.
export function freeKey(kind,get,now){
 const keys=[`${SAVE_KEY}-${kind}`,...Array.from({length:8},(_,i)=>`${SAVE_KEY}-${kind}-${i+2}`)];
 return keys.find(k=>get(k)===null)??`${SAVE_KEY}-${kind}-${now}`;
}
// Every kept camp this build can read, newest first, one per distinct save, leaving out a copy of the
// current save (raw). Each: {key, state, when (the camp's last action), label}.
export function keptCamps(keys,get,now,current=null){
 const seen=new Set(current?[current]:[]),out=[];
 for(const key of keys.filter(isKeptKey)){
  const raw=get(key);if(!raw||seen.has(raw))continue;seen.add(raw);
  const r=readSave(raw,now);if(r.status!=='ok')continue;
  out.push({key,state:r.state,when:r.state.lastAt,label:campLabel(r.state)});
 }
 return out.sort((a,b)=>b.when-a.when);
}
export function campLabel(s){
 const a=currentArea(s),built=a?.tasks?.reduce((n,t)=>n+(s.built[t.id]??0),0)??0;
 return a?.tasks?.length?`${a.name} · ${built} of ${a.tasks.length*STAGES} stages built`:`${a?.name??'Coast Camp'} · ${totalBuilt(s)} stages built`;
}
