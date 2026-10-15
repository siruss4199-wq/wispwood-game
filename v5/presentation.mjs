import {requestProgress} from './requests.mjs';
import {goal,normalContract,ready,matches,nameOf,item,SOURCES} from './core.mjs';
import {equipment,ROUTES,canRestore} from './expedition.mjs';
import {circuit} from './seals.mjs';
import {sight} from './navigation.mjs';

export const SITE_NAMES=['Landing tray','Survey worksite','Excavated saltglass','Powered relic site','Vault observatory'];
// A single continuous surface, under the unchanged 36 hit targets. All marks are original.
export function siteSurface(stage){
 const powered=stage>=3,excavated=stage>=2;
 return `<svg class="siteSurface" viewBox="0 0 600 600" aria-hidden="true"><defs><radialGradient id="site-dust"><stop stop-color="${excavated?'#efe0c8':'#e7d9c1'}"/><stop offset="1" stop-color="${powered?'#b0c5c9':'#c5b496'}"/></radialGradient><radialGradient id="site-light"><stop stop-color="#a3f4eb" stop-opacity=".32"/><stop offset="1" stop-color="#a3f4eb" stop-opacity="0"/></radialGradient></defs><rect x="5" y="5" width="590" height="590" rx="23" fill="url(#site-dust)"/>
 <path d="M19 178Q127 151 218 183T577 159M24 367Q160 343 264 376T578 347M42 580Q91 482 60 431" fill="none" stroke="#fff4d8" stroke-opacity=".18" stroke-width="15"/>
 <g fill="none" stroke="#826f58" stroke-opacity=".18" stroke-width="2"><path d="M182 27l37 5m-28 4 13 2M467 283l29-6m-27 11 18-3M96 393l25 7M382 566l35-4M280 97l9 5"/></g>
 ${stage>=1?'<path d="M100 23H496V109M23 113h79V25M22 488h86v88" fill="none" stroke="#568b95" stroke-opacity=".25" stroke-width="3" stroke-dasharray="14 9"/>':''}
 ${excavated?'<g fill="none" stroke="#897c95" stroke-opacity=".2" stroke-width="4"><circle cx="350" cy="367" r="176"/><circle cx="350" cy="367" r="155"/><path d="M350 196v23M350 515v23M180 367h22M498 367h22"/></g>':''}
 ${powered?'<circle cx="350" cy="367" r="223" fill="url(#site-light)"/><path d="M31 525V579H556V391" fill="none" stroke="#54717c" stroke-width="9"/><path d="M31 525V579H556V391" fill="none" stroke="#9ff2e4" stroke-width="3"/>':''}
 <g fill="#697b85" stroke="#e7d6b3" stroke-width="2">${[[14,14],[586,14],[14,586],[586,586]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5"/><path d="M${x-2} ${y}h4" stroke="#334755"/>`).join('')}</g></svg>`;
}

// Uses precisely the same first-match order as the reducer's consume(). Pure and testable.
export function deliveryItems(s,action,now=Date.now()){
 if(action.type==='request'){const o=s.requests?.orders.find(o=>o?.id===action.id);if(!o)return [];const p=requestProgress(s,o);return p.ready?p.indices.map(index=>({index,x:{...s.board[index]}})):[];}
 if(action.type==='power')return (circuit(s)?.slice(1,-1)??[]).filter(index=>s.board[index]?.type==='prism').map(index=>({index,x:{...s.board[index]}}));
 if(action.type==='prime'){
  const index=action.from??s.board.findIndex(x=>matches(x,{family:'flux',tier:1}));
  return index>=0?[{index,x:{...s.board[index]}}]:[];
 }
 // Survey prepares both tools; only the subsequent chosen route consumes one.
 if(action.type==='goal'&&s.stage===0&&s.landingStep===1)return [];
 if(action.type==='restore'&&canRestore(s,s.board[action.index])){
  const index=action.from??s.board.findIndex(x=>matches(x,{family:'flux',tier:2}));
  return matches(s.board[index],{family:'flux',tier:2})?[{index,x:{...s.board[index]}}]:[];
 }
 if(action.type==='clear'&&s.board[action.index]?.type==='rock'){
  const index=action.from??s.board.findIndex(x=>x?.type==='brace'||matches(x,{family:'rig',tier:2}));
  const x=s.board[index];return x?.type==='brace'||matches(x,{family:'rig',tier:2})?[{index,x:{...x}}]:[];
 }
 let needs;
 if(action.type==='goal'&&goal(s)?.action!=='inspect')needs=goal(s)?.needs;
 if(action.type==='breach'&&s.stage===1&&s.board[action.index]?.type==='route'&&sight(s,s.board[action.index].id).ready){
  const need={family:ROUTES[s.board[action.index].id].family,tier:2,count:1},index=action.from??s.board.findIndex(x=>matches(x,need));
  return matches(s.board[index],need)?[{index,x:{...s.board[index]}}]:[];
 }
 if(action.type==='deploy'&&s.stage>=2){
  const site=s.board[action.index];if(site?.type!=='site'||site.phase!=='idle')return [];
  const index=action.from??s.board.findIndex(x=>matches(x,equipment(site.kind)));
  const x=s.board[index];if(!matches(x,equipment(site.kind)))return [];
  return [{index,x:{...x}}];
 }
 if(action.type==='contract')needs=normalContract(s).needs;
 if(action.type==='opportunity'&&s.opportunity&&now<=s.opportunity.ends)needs=s.opportunity.needs;
 if(action.type==='discovery'&&!s.discoveryDone)needs=[{family:'chart',tier:2,count:1}];
 if(!needs||!ready(s,needs))return [];
 const found=[],used=new Set();
 for(const r of needs)for(let n=0;n<r.count;n++){const index=s.board.findIndex((x,i)=>!used.has(i)&&matches(x,r));used.add(index);found.push({index,x:{...s.board[index]}});}
 if(action.type==='discovery'){const index=s.board.findIndex(x=>x?.type==='glyph');if(index<0)return [];found.push({index,x:{...s.board[index]}});}
 return found;
}
export function continuation(s,action,rewards=[]){
 if(action.type==='breach')return 'Navigation secured · restore the stone lift';
 if(action.type==='power')return 'Three seals secured · open the Tideglass Vault';
 if(action.type==='goal'&&s.stage===0&&s.landingStep===1)return 'Landing secured · Survey Kite unlocked · chart the crossing';
 if(action.type==='goal'&&s.stage===1)return 'Survey complete · choose your breach and 3 Surge pulls';
 if(action.type==='goal'&&s.stage===2)return 'Echo Crucible unlocked · reveal the ampoule';
 if(action.type==='goal'&&s.stage===3)return 'Rings powered · prepare the vault instruments';
 if(action.type==='goal'&&s.stage===4)return 'The crossing is open · chart the star ocean';
 if(action.type==='discovery')return 'Echo decoded · every third pull now brings richer parts';
 if(s.surge>0)return `Supply Surge · choose a producer for ${s.surge} refined pulls`;
 const box=rewards.find(x=>x.x.type==='crate');if(box)return `Tap your ${nameOf(box.x)} to reveal supplies`;
 const g=goal(s);if(g&&g.action!=='inspect'&&ready(s,g.needs))return `${g.name} · READY above`;
 const c=normalContract(s);if(ready(s,c.needs))return `${c.title} · READY above`;
 const need=g?.needs.find(r=>!ready(s,[r]));return need?`${nameOf(item(need.family,need.tier))} next · ${SOURCES[need.family].name}`:'Choose your next discovery';
}
