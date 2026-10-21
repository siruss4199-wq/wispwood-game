// Standalone Vaultwake experiment. NEVER reads the V5 or replay save.
export const LAB_SAVE_KEY='vaultwake-coastal-lab-v1';
export const FAMILIES={
 rig:{name:'Rivet Rover',role:'Restore the pier',art:'rivet-rover-vibrant.svg',items:[['Copper Offcut','copper-offcut-vibrant.webp'],['Grip Tool','grip-tool-vibrant.webp'],['Pocket Winch','pocket-winch-vibrant.webp'],['Split Spanner','split-spanner-vibrant.webp']]},
 chart:{name:'Survey Kite',role:'Chart the hidden channel',art:'survey-kite-vibrant.webp',items:[['Chart Scrap','chart-scrap-vibrant.webp'],['Route Fold','route-fold-vibrant.webp'],['Survey Scope','survey-scope-vibrant.webp'],['Bearing Dial','tide-2.webp']]},
 flux:{name:'Echo Crucible',role:'Wake the fleet signal',art:'echo-crucible-vibrant.webp',items:[['Relic Fragment','relic-fragment-vibrant.webp'],['Signal Ampoule','resonance-ampoule-vibrant.webp'],['Loop Cell','loop-cell-vibrant.webp'],['Resonator','resonator-vibrant.webp']]}
};
const req=(family,tier)=>({family,tier});
export const CHAPTER={
0:{title:'The abandoned landing',why:'Merge the glowing copper pieces. The crew needs its first tool.',tag:'THE EXPEDITION BEGINS',art:'landing-vibrant.webp'},
1:{title:'Repair the broken pier',why:'Ivo needs a winch and a hand tool to reopen the crossing.',tag:'1 · THE PIER',art:'worksite-vibrant.webp',needs:[req('rig',2),req('rig',1)],button:'RESTORE PIER'},
2:{title:'Find the erased channel',why:'Neri found a coastline that no longer appears on any map.',tag:'2 · THE LOST ROUTE',art:'worksite-vibrant.webp',needs:[req('chart',2)],button:'REVEAL CHANNEL'},
3:{title:'Wake the silent beacon',why:'Use Resonance and Wayfinding to read the signal under the stones.',tag:'3 · THE SIGNAL',art:'charting-loft.webp',needs:[req('flux',2),req('chart',1)],button:'LIGHT THE BEACON'},
4:{title:'Two possible coordinates',why:'The missing fleet may have sailed through the Northern Reef or beneath Echo Cavern. You decide.',tag:'4 · YOUR DECISION',art:'powered-vibrant.webp'},
5:{title:'Follow the fleet signal',why:'Craft the instrument that can follow your chosen route.',tag:'5 · THE FIRST ANSWER',art:'entrance-vibrant.webp',button:'TRACE THE SIGNAL'},
6:{title:'Someone answered',why:'The vanished fleet left a signal. Someone — or something — is still answering.',tag:'PROTOTYPE REVEAL',art:'vault-open-vibrant.webp'}
};
const reward={
0:{title:'A foothold!',text:'The grip tool secures the landing. The crew can finally reach the pier.'},
1:{title:'The pier comes alive!',text:'The winch turns. Neri launches the Survey Kite toward a shoreline that should not exist.'},
2:{title:'A hidden channel!',text:'The chart reveals an inlet erased by the tides. Something hums beneath it.'},
3:{title:'The beacon answers!',text:'A pulse crosses the coast. The signal splits into two possible coordinates.'},
5:{title:'The first fleet message!',text:'These coordinates are real, but who is answering the abandoned beacon?'}
};
export const item=(family,tier)=>({type:'item',family,tier});
export function newGame(){
 const board=Array(36).fill(null);
 for(const [i,f] of ['rig','chart','flux'].entries())board[i]={type:'source',family:f};
 for(const i of [14,15,19,22,26])board[i]=item('rig',0);
 return {version:1,board,phase:0,route:null,moves:0,merges:0,productions:0,discoveries:0,taps:{rig:0,chart:0,flux:0},history:[{title:'The abandoned landing',text:'A storm scattered the fleet. Neri and Ivo must follow its last signal.'}]};
}
export const unlocked=(s,f)=>f==='rig'||f==='chart'&&s.phase>=2||f==='flux'&&s.phase>=3;
export const image=x=>x?'../assets/premium/'+(x.type==='source'?FAMILIES[x.family].art:FAMILIES[x.family].items[x.tier]?.[1]):'';
export const itemName=x=>x?(x.type==='source'?FAMILIES[x.family].name:FAMILIES[x.family].items[x.tier]?.[0]):'Empty';
export const matching=(a,b)=>!!a&&!!b&&a.type==='item'&&b.type==='item'&&a.family===b.family&&a.tier===b.tier&&a.tier<3;
export function objective(s){
 if(s.phase!==5)return CHAPTER[s.phase];
 const reef=s.route==='reef';
 return {...CHAPTER[5],title:reef?'Search the Northern Reef':'Enter the Echo Cavern',why:reef?'A broken current blocks the reef. Use a Bearing Dial and a Pocket Winch.':'An impossible frequency echoes under the cliffs. Build a Resonator and a Route Fold.',needs:reef?[req('chart',3),req('rig',2)]:[req('flux',3),req('chart',1)]};
}
export function needIndices(s){
 const needs=objective(s).needs||[],used=new Set();
 return needs.map(n=>{const index=s.board.findIndex((x,i)=>!used.has(i)&&x?.type==='item'&&x.family===n.family&&x.tier===n.tier);if(index>=0)used.add(index);return index;});
}
export const ready=s=>!!objective(s).needs?.length&&needIndices(s).every(i=>i>=0);
export function direction(s){
 if(s.phase===0){
  const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family==='rig'&&x.tier===0?[i]:[]);
  return pair.length>=2?{type:'merge',indices:pair.slice(0,2),label:'Merge the two highlighted Copper Offcuts.'}:{type:'source',indices:[0],label:'Tap Rivet Rover to create more copper parts.'};
 }
 if(s.phase===4)return {type:'choice',indices:[],label:'Choose which fleet signal to investigate.'};
 if(s.phase===6)return {type:'end',indices:[],label:'The prototype discovery is complete — not the full story.'};
 if(ready(s))return {type:'ready',indices:needIndices(s),label:'Materials ready. Complete the restoration above.'};
 const needs=objective(s).needs||[],indices=needIndices(s),missing=needs.find((_,i)=>indices[i]<0)||needs[0];
 for(let tier=missing.tier-1;tier>=0;tier--){
  const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===missing.family&&x.tier===tier?[i]:[]);
  if(pair.length>=2)return {type:'merge',indices:pair.slice(0,2),label:'Merge the highlighted '+FAMILIES[missing.family].name+' materials.'};
 }
 if(s.board.every(Boolean)){
  for(const f of Object.keys(FAMILIES))for(let t=0;t<3;t++){
   const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===f&&x.tier===t?[i]:[]);
   if(pair.length>=2)return {type:'merge',indices:pair.slice(0,2),label:'Board full — merge the highlighted pair to make space.'};
  }
  return {type:'full',indices:[],label:'Board full. Select and recycle a spare object to make space.'};
 }
 return {type:'source',indices:[['rig','chart','flux'].indexOf(missing.family)],label:'Tap '+FAMILIES[missing.family].name+' to create the next required materials.'};
}
const valid=i=>Number.isInteger(i)&&i>=0&&i<36;
function progress(s,phase){
 s.phase=phase+1;s.discoveries++;
 const event=reward[phase];
 if(event)s.history.unshift(event);
 s.history=s.history.slice(0,12);
 return event||null;
}
export function act(current,a){
 const s=structuredClone(current),fail=message=>({ok:false,state:current,message});
 if(a?.type==='produce'){
  if(!FAMILIES[a.family]||!unlocked(s,a.family))return fail('Restore the coast to unlock this producer.');
  const index=s.board.findIndex(x=>!x);if(index<0)return fail('Board full. Merge matching items or recycle a spare.');
  const taps=s.taps[a.family]??0,tier=taps>0&&taps%7===0?1:0;
  s.board[index]=item(a.family,tier);s.taps[a.family]=taps+1;s.moves++;s.productions++;
  return {ok:true,state:s,message:'Created '+itemName(s.board[index]),index};
 }
 if(a?.type==='merge'){
  if(!valid(a.from)||!valid(a.to)||a.from===a.to||!matching(s.board[a.from],s.board[a.to]))return fail('Choose two matching objects.');
  s.board[a.to]=item(s.board[a.to].family,s.board[a.to].tier+1);s.board[a.from]=null;s.merges++;s.moves++;
  const event=s.phase===0?progress(s,0):null;
  return {ok:true,state:s,index:a.to,event,message:'Merged into '+itemName(s.board[a.to])};
 }
 if(a?.type==='claim'){
  if(![1,2,3,5].includes(s.phase)||!ready(s))return fail('Craft the shown ingredients first.');
  for(const i of needIndices(s))s.board[i]=null;
  const prior=s.phase;s.moves++;
  const event=progress(s,prior);return {ok:true,state:s,event,message:event?.title||'Restoration complete'};
 }
 if(a?.type==='choose'){
  if(s.phase!==4||!['reef','cavern'].includes(a.route))return fail('Choose a route.');
  s.route=a.route;s.phase=5;s.moves++;
  const event={title:a.route==='reef'?'Northern Reef selected':'Echo Cavern selected',text:a.route==='reef'?'The faded chart points past the reef.':'The ancient beacon echoes below the cliffs.'};
  s.history.unshift(event);return {ok:true,state:s,event,message:event.title};
 }
 if(a?.type==='recycle'){
  if(!valid(a.index)||s.board[a.index]?.type!=='item')return fail('Only ordinary objects can be recycled.');
  const label=itemName(s.board[a.index]);s.board[a.index]=null;s.moves++;return {ok:true,state:s,message:'Recycled '+label};
 }
 return fail('Unknown action');
}
export function load(raw){
 if(!raw)return newGame();
 try{
  const s=JSON.parse(raw);
  if(s?.version!==1||!Array.isArray(s.board)||s.board.length!==36||!Number.isInteger(s.phase)||s.phase<0||s.phase>6||!s.taps||!Array.isArray(s.history))return newGame();
  if(!s.board.every(x=>!x||FAMILIES[x.family]&&(x.type==='source'||x.type==='item'&&Number.isInteger(x.tier)&&x.tier>=0&&x.tier<=3)))return newGame();
  return s;
 }catch{return newGame();}
}
