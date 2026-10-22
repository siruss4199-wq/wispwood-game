// One suggestion at a time: what moves the current coast task forward now.
// Pure: reads state, never changes it. The UI pulses the returned cells.
import {TASKS,PRODUCERS,SITES} from './chapter.mjs';
import {orderProgress,ordersOpen} from './orders.mjs';
import {containerInfo} from './containers.mjs';

const NAMES={
 rig:['Copper offcut','Grip tool','Split spanner','Pocket winch','Crawler jack','Bridge rig','Dune hauler','Expedition crawler'],
 chart:['Ink scrap','Route fold','Sight lens','Survey scope','Bearing dial','Star chart','Horizon model','Sky atlas'],
 flux:['Violet shard','Loop cell','Pulse coil','Resonator','Phase lantern','Orbit engine','Vault heart','Aurora beacon']
};
export const partName=(family,tier)=>NAMES[family][tier];
const isItem=(x,f,t)=>x?.type==='item'&&x.family===f&&x.tier===t;
const have=(s,r)=>s.board.filter(x=>isItem(x,r.family,r.tier)).length;
const ready=(s,needs)=>needs.every(r=>have(s,r)>=r.count);
// Raw-part equivalents a need still lacks, counting partial progress on the board.
export function missing(s,r){
 let want=r.count*2**r.tier;
 for(const x of s.board)if(x?.type==='item'&&x.family===r.family&&x.tier<=r.tier)want-=2**x.tier;
 return Math.max(0,want);
}

// The needs the player is working toward: for the crossing, the closer option.
export function focusNeeds(s){
 const t=TASKS[s.task];if(!t)return [];
 if(!t.choices)return t.needs;
 const options=Object.values(t.choices);
 const cost=o=>o.needs.reduce((n,r)=>n+missing(s,r)+(s.producers[r.family].unlocked?0:99),0);
 return options.sort((a,b)=>cost(a)-cost(b))[0].needs;
}

function mergeToward(s,needs){
 const pairs=[];
 for(const r of needs){
  if(have(s,r)>=r.count)continue;
  for(let t=r.tier-1;t>=0;t--){
   const cells=s.board.flatMap((x,i)=>isItem(x,r.family,t)?[i]:[]);
   if(cells.length>=2){pairs.push({family:r.family,tier:t,cells:cells.slice(0,2)});break;}
  }
 }
 return pairs.sort((a,b)=>b.tier-a.tier)[0]??null;
}

export function suggest(s){
 const t=TASKS[s.task];
 if(!t)return {kind:'done',cells:[],text:'Chapter 1 complete. The fleet heard your signal.'};
 const site=SITES[t.site].name;
 if(t.choices){
  const open=Object.entries(t.choices).find(([,c])=>ready(s,c.needs));
  if(open)return {kind:'task',choice:open[0],cells:[],text:`Ready: take the ${t.choices[open[0]].label} at the ${site}.`};
 }else if(ready(s,t.needs))return {kind:'task',cells:[],text:t.needs.length?`Ready: deliver to the ${site}.`:`Tap “Listen” to hear the crown.`};
 const needs=focusNeeds(s);
 const pair=mergeToward(s,needs);
 if(pair)return {kind:'merge',cells:pair.cells,text:`Merge two ${partName(pair.family,pair.tier)}s → ${partName(pair.family,pair.tier+1)}`};
 if(ordersOpen(s))for(const o of s.orders.lanes)if(o&&orderProgress(s,o).ready)return {kind:'order',id:o.id,cells:[],text:`${o.who}'s order is ready: +${o.energy} energy.`};
 const crate=s.board.findIndex(x=>x?.type==='crate');
 const free=s.board.filter(x=>x===null).length;
 if(crate>=0&&free>0)return {kind:'open',cells:[crate],text:`Open the ${containerInfo(s.board[crate]).name}.`};
 if(!free)return {kind:'recycle',cells:[],text:'Board full: merge, or select a spare part and recycle it.'};
 if(s.energy<1)return {kind:'meal',cells:[],text:'Out of energy: take a free field meal.'};
 const lack=needs.find(r=>have(s,r)<r.count&&s.producers[r.family].unlocked)??needs.find(r=>have(s,r)<r.count);
 const family=lack?.family??'rig';
 const at=s.board.findIndex(x=>x?.type==='source'&&x.id===family);
 if(at>=0)return {kind:'produce',cells:[at],text:`Tap ${PRODUCERS[family].name} for ${partName(family,0)}s.`};
 return {kind:'idle',cells:[],text:'Merge matching parts.'};
}
