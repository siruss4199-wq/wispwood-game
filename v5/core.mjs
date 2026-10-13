import {container,containerInfo,contents,CONTAINERS} from './containers.mjs';
import {ANCHORS,ROUTES,equipment,anchors,activeAnchors,completedAnchors,trace,expeditionState,installSites} from './expedition.mjs';
// Vaultwake: deterministic rules, independent of rendering and wall-clock timers.
export const SAVE_KEY='vaultwake-v5';
export const FAMILIES={
 rig:{name:'Fieldworks',color:'#f27755',source:'rig',names:['Copper offcut','Grip tool','Split spanner','Pocket winch','Crawler jack','Bridge rig','Dune hauler','Expedition crawler']},
 chart:{name:'Wayfinding',color:'#43bfe7',source:'chart',names:['Ink scrap','Route fold','Sight lens','Survey scope','Bearing dial','Star chart','Horizon model','Sky atlas']},
 flux:{name:'Resonance',color:'#ac83fa',source:'flux',names:['Violet shard','Loop cell','Pulse coil','Resonator','Phase lantern','Orbit engine','Vault heart','Aurora beacon']}
};
export const SOURCES={rig:{name:'Rivet Rover',cost:1,family:'rig',unlock:0},chart:{name:'Survey Kite',cost:1,family:'chart',unlock:1},flux:{name:'Echo Crucible',cost:2,family:'flux',unlock:2}};
export const sourceUnlocked=(s,id)=>!!SOURCES[id]&&(s.stage>=SOURCES[id].unlock||(id==='chart'&&s.stage===0&&s.landingStep>=1));
const req=(family,tier,count=1)=>({family,tier,count});
export const STAGES=[
 {name:'Clear the landing',verb:'Clear path',scene:'Blocked approach',needs:[req('rig',1,2)],energy:4,next:'Survey Kite + coast survey',text:'Stabilize the landing. Then combine Fieldworks and Wayfinding to chart a breach.',phase:'LANDING 1 / 2'},
 {name:'Find the buried door',verb:'Excavate',scene:'Excavation camp',needs:[req('rig',4),req('chart',3)],energy:6,next:'Echo Crucible + excavation cache',text:'A crawler jack and survey scope will uncover the entrance.'},
 {name:'Wake the ring engine',verb:'Power rings',scene:'Entrance uncovered',needs:[req('flux',4),req('rig',4)],energy:6,next:'Powered vault + enriched sources',text:'Raise the rings with a lantern and crawler jack.'},
 {name:'Open the Tideglass Vault',verb:'Open vault',scene:'Rings awakened',needs:[req('chart',5),req('flux',5),req('rig',3)],energy:20,next:'The chamber + relic cache',text:'Align a star chart and orbit engine to open the vault.'}
];
export const POST_GOALS=[
 {name:'Chart the next crossing',verb:'Chart crossing',scene:'Vault opened',needs:[req('chart',6),req('rig',5)],energy:35,next:'Archive expedition badge'},
 {name:'Build an aurora beacon',verb:'Light beacon',scene:'Vault opened',needs:[req('flux',7)],energy:50,next:'Aurora collector badge'}
];
export const nameOf=x=>!x?'Empty space':x.type==='site'?ANCHORS[x.kind].name:x.type==='route'?ROUTES[x.id].name:x.type==='item'?FAMILIES[x.family].names[x.tier]:x.type==='source'?SOURCES[x.id].name:x.type==='rock'?'Saltstone blocker':x.type==='marker'?'Buried survey marker':x.type==='lock'?'Dormant relic lock':x.type==='crate'?containerInfo(x).name:x.type==='brace'?'Trail brace':x.type==='glyph'?'Echo fragment':'Buried ground';
export const item=(family,tier)=>({type:'item',family,tier});
const source=id=>({type:'source',id});
export function fresh(now=Date.now()){
 const board=Array(36).fill(null);
 board[0]=source('rig');board[5]=source('chart');board[30]=source('flux');
 [[7,'rig',0],[8,'rig',0],[9,'chart',0],[10,'chart',0],[13,'rig',1],[14,'chart',1],[15,'flux',0],[16,'flux',0],[19,'rig',0],[20,'rig',0],[21,'chart',0],[22,'chart',0]].forEach(([i,f,t])=>board[i]=item(f,t));
 // Starter pockets leave nine working spaces; extra saltstone is recoverable salvage.
 for(const [from,to] of [[19,2],[20,18],[21,11],[22,33]]){board[to]=board[from];board[from]=null;}
 for(const i of [24,25,26,27,28,29])board[i]={type:'sealed'};
 for(const i of [19,32])board[i]={type:'rock'};
 ['winch','scope','relay'].forEach((kind,n)=>board[[20,23,31][n]]={type:'site',kind,phase:'idle',progress:0});
 board[24]={type:'route',id:'ridge'};board[27]={type:'route',id:'conduit'};board[34]=container('salvage');
 return {version:5,board,stage:0,landingStep:0,routePrepared:false,producerStreak:0,energy:32,marks:0,moves:0,merges:0,contracts:0,serial:0,charges:{rig:7,chart:7,flux:7},taps:{rig:0,chart:0,flux:0},normal:0,opportunity:null,discovery:false,discoveryDone:false,boost:false,post:0,discovered:[],expedition:expeditionState(),startedAt:now,lastAt:now,rations:0,history:[]};
}
export function goal(s){
 if(s.stage===0&&s.landingStep===1)return {name:'Chart the safe crossing',verb:'Mark route',scene:'Survey camp established',needs:[req('chart',2),req('rig',2)],energy:8,next:'Choose a route with prepared equipment',text:'Build a Sight Lens and Split Spanner to survey the crossing. Both stay with you for the route choice.',phase:'LANDING 2 / 2'};
 if(s.stage===1)return {name:'Choose your breach',verb:'Clear',scene:'Survey worksite',needs:[req('rig',2),req('chart',2)],action:'inspect',next:'Either route unlocks Echo Crucible',text:'Both prepared tools are ready. Ridge spends a spanner for workspace; Conduit spends a lens for relic supplies.',phase:'CHOOSE ONE'};
 if(s.stage===2)return {name:'Wake the vault',verb:'Use equipment',scene:'Entrance uncovered',needs:anchors(s).filter(x=>x.phase==='idle').map(x=>equipment(x.kind)),action:'inspect',next:'Choose two devices · each helps a different family',text:'Use equipment in any two devices. Choose the benefit you need.',phase:`${completedAnchors(s)} OF 2 READY`};
 if(s.stage===3)return {name:'Open the Tideglass Vault',verb:'Open vault',scene:'Rings awakened',needs:s.expedition.route==='conduit'?[req('rig',4),req('chart',4)]:[req('chart',4),req('flux',4)],energy:20,next:'The chamber + relic cache',text:'Your chosen breach determines the final alignment equipment.',action:'goal'};
 return STAGES[s.stage]??POST_GOALS[s.post]??null;
}
export function count(s,r){return s.board.filter(x=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier).length;}
export function ready(s,needs){return needs.every(r=>count(s,r)>=r.count);}
export function matches(x,r){return x?.type==='item'&&x.family===r.family&&x.tier===r.tier;}
function consume(s,needs){for(const r of needs)for(let n=0;n<r.count;n++)s.board[s.board.findIndex(x=>matches(x,r))]=null;}
export function normalContract(s){
 // One optional late trade spends an actual vault ingredient. Keep it to finish
 // sooner, or redirect its value into the other family and three chosen pulls.
 if(s.stage===3&&!s.expedition.vaultTrade){
  const [from,to]=goal(s).needs;
  return {title:'Vault trade',who:'Neri · navigator',needs:[{...from}],energy:8,marks:4,exchange:item(to.family,3),surge:true,vaultTrade:true};
 }
 if(s.stage>=2&&s.stage<4&&s.expedition.trades<3){
  const from=['rig','chart','flux'][s.expedition.trades],to=['chart','flux','rig'][s.expedition.trades];
  return {title:'Equipment exchange',who:'Neri · navigator',needs:[req(from,3)],energy:6,marks:4,exchange:item(to,3)};
 }
 const early=[{title:'Fuel for the climb',who:'Ivo · quartermaster',needs:[req('rig',1)],energy:12,marks:2},{title:'Mark a safe route',who:'Neri · navigator',needs:[req('chart',2)],energy:16,marks:3},{title:'Anchor the tents',who:'Ivo · quartermaster',needs:[req('rig',2),req('chart',1)],energy:20,marks:4}];
 if(s.normal<3)return early[s.normal];
 const f=s.stage>=2?['rig','chart','flux'][s.normal%3]:['rig','chart'][s.normal%2];
 const tier=1+(s.normal%3);return {title:['Supply run','Equipment exchange','Camp commission'][s.normal%3],who:s.normal%2?'Neri · navigator':'Ivo · quartermaster',needs:[req(f,tier),...(s.normal%3===2?[req('rig',1)]:[])],energy:8+2**tier*(f==='flux'?3:2),marks:3+tier};
}
export function opportunity(s,now=Date.now()){
 if(!s.opportunity)return null;
 return {...s.opportunity,remaining:Math.max(0,s.opportunity.ends-now)};
}
export function nextOutput(s,id){
 const n=s.taps[id]+1;
 if(n%9===0)return {type:'glyph'};
 // Late-game anti-grind: reward consecutive dry pulls with one actual pair.
 // This never overrides the scheduled ninth-pull glyph.
 if(s.stage>=3&&(s.producerStreak??0)>=2){
  const tier=[3,2,1,0].find(t=>count(s,req(id,t))===1);
  if(tier!==undefined)return item(id,tier);
 }
 const base=s.boost&&n%3===0?2:n%4===0?1:0;
 return item(id,base+(s.surge>0?1:0));
}
// Action-limited, shared across sources: spend the improved pulls where they matter.
// Never stack or expire while the player thinks. Old saves simply have no active surge.
function surge(s){s.surge=3;}
export function near(s,needs){
 const missing=needs.flatMap(r=>Array(Math.max(0,r.count-count(s,r))).fill(r));
 if(!missing.length)return 'READY';
 if(missing.length===1){const r=missing[0];return r.tier>0&&count(s,{family:r.family,tier:r.tier-1})>=2?'1 MERGE AWAY':'1 ITEM LEFT';}
 return '';
}
function put(s,x){const i=s.board.indexOf(null);if(i<0)return -1;s.board[i]=x;return i;}
// Supply rewards are finite, usable material. Never displace a kept object.
function supplies(s,n=4,delivery=false,kind=null){
 const added=[];const families=s.stage>=2?['rig','chart','flux']:['rig','chart'];
 for(let k=0;k<n&&s.board.filter(Boolean).length<(delivery&&k===0?30:25);k++){
  const canPack=kind&&!s.board.some(x=>x?.type==='crate'&&x.kind===kind)&&s.board.filter(x=>x?.type==='crate').length<3;
  const x=k===0?(canPack?container(kind):item(families[s.normal%families.length],1)):item(families[(k+s.normal)%families.length],0);
  const i=put(s,x);if(i>=0)added.push(i);
 }
 return added;
}
// Roomy boards get a second raw part; crowded boards keep their last working spaces.
export function burstOutput(s,id){return s.board.filter(x=>x===null).length>12||((s.taps[id]+1)%3===0&&s.board.filter(x=>x===null).length>5);}
// One tap reveals as much as fits. The last find uses the container's own cell.
// No discarded rewards, automatic inventory replacement or per-item confirmation.
function unpack(s,index){
 const box=s.board[index],info=containerInfo(box),revealed=[];
 while(box.left>0){
  const last=box.left===1;if(!last&&!s.board.includes(null))break;
  const x={...info.outputs[box.left-1]};box.left--;
  const i=last?(s.board[index]=x,index):put(s,x);revealed.push(i);
 }
 if(box.left===0&&box.kind==='salvage')s.charges.rig=Math.min(7,s.charges.rig+2);
 return revealed;
}
function remember(s,event,now){s.history.push({event,at:now});s.history=s.history.slice(-40);}
function activate(s,site){
 const opened=[],revealed=[];site.phase='done';site.progress=2;delete site.reclaimed;
 const uncover=type=>{for(let i=0;i<36&&opened.length<2;i++)if(s.board[i]?.type===type){s.board[i]=null;opened.push(i);}};
 if(site.kind==='winch'){uncover('rock');for(let n=0;n<2;n++){const i=put(s,item('chart',1));if(i>=0)revealed.push(i);}}
 else if(site.kind==='scope'){uncover('sealed');for(const x of [item('flux',2),container('relic')]){const i=put(s,x);if(i>=0)revealed.push(i);}}
 else {for(const id of Object.keys(SOURCES))s.charges[id]=7;surge(s);const i=put(s,item('rig',2));if(i>=0)revealed.push(i);}
 for(let n=0;n<2&&s.board.filter(Boolean).length<24;n++){const i=put(s,item(ANCHORS[site.kind].drive,0));if(i>=0)revealed.push(i);}
 trace(s,'device-used',{kind:site.kind,crossFamily:ANCHORS[site.kind].drive,opened,revealed});
 if(s.stage===2&&completedAnchors(s)>=2){s.stage=3;s.energy=Math.min(120,s.energy+6);revealed.push(...supplies(s,4,false,s.expedition.route==='ridge'?'relic':'survey'));trace(s,'powered');}
 return {opened,revealed};
}
// Mutating reducer is intentionally atomic: failed commands leave all state untouched.
export function act(s,a,now=Date.now()){
 const fail=message=>({ok:false,message});
 const done=(message,event='action',index=null)=>{s.moves++;s.lastAt=now;if(event!=='produce')s.producerStreak=0;installSites(s);if(event==='milestone')remember(s,event,now);for(const x of s.board)if(x?.type==='item'){const key=x.family+':'+x.tier;if(!s.discovered.includes(key))s.discovered.push(key);}return {ok:true,message,event,index};};
 const valid=i=>Number.isInteger(i)&&i>=0&&i<36;
 if(a.type==='merge'||a.type==='move'){
  if(!valid(a.from)||!valid(a.to)||a.from===a.to)return fail('Choose another space.');
  const x=s.board[a.from],y=s.board[a.to];
  if(!x||!['item','glyph','brace','crate'].includes(x.type))return fail('That object stays here.');
  if(!y){s.board[a.to]=x;s.board[a.from]=null;return done('Moved.','move',a.to);}
  if(x.type!=='item'||y.type!=='item'||x.family!==y.family||x.tier!==y.tier||x.tier>=7)return fail('Merge two identical objects.');
  if(x.tier===3&&anchors(s).some(site=>site.phase==='idle'&&ANCHORS[site.kind].equipment===x.family))trace(s,'kept-for-merge',{family:x.family});
  s.board[a.to]=item(x.family,x.tier+1);s.board[a.from]=null;s.merges++;const bonus=s.merges%3===0?1:0;s.energy=Math.min(120,s.energy+bonus);
  const crafted=s.board[a.to];
  const firstCraft=crafted.tier>=2&&!s.discovered.includes(crafted.family+':'+crafted.tier);
  const resupply=firstCraft&&s.stage<4?supplies(s,3):[];
  // Large assemblies return reusable offcuts, keeping expensive merges from hollowing the tray.
  const offcuts=!firstCraft&&crafted.tier>=3&&s.board.filter(Boolean).length<23;
  if(offcuts)put(s,item(crafted.family,0));
  const chainFind=false;
  const breakthrough=firstCraft&&crafted.tier>=3;
  if(breakthrough){s.charges[crafted.family]=Math.min(7,s.charges[crafted.family]+2);if(crafted.tier>=5)s.energy=Math.min(120,s.energy+4);}
  return {...done(`${nameOf(crafted)}${breakthrough?' · source recharged':''}${resupply.length?' · expedition supplies':''}${bonus?' · +1 energy':''}`,'merge',a.to),breakthrough};
 }
 if(a.type==='produce'){
  const p=SOURCES[a.id];if(!p||!sourceUnlocked(s,a.id))return fail(`Unlock after ${a.id==='chart'?'stabilizing the landing':'opening a breach'}.`);
  if(!s.board.some(x=>x?.type==='source'&&x.id===a.id))return fail('Source missing.');
  if(!s.charges[a.id])return fail('Service this source: a grip tool or 3 energy.');
  if(s.energy<p.cost)return fail('Deliver a contract, recycle an item, or use a field ration.');
  if(!s.board.includes(null))return fail('Board full. Merge, deliver, recycle, or clear a blocker.');
  const surged=s.surge>0,burst=burstOutput(s,a.id),x=nextOutput(s,a.id),i=put(s,x);const windfall=burst&&(s.taps[a.id]+1)%7===0;const bonusIndex=burst?put(s,item(a.id,windfall?1:0)):-1;s.energy-=p.cost;s.charges[a.id]--;s.taps[a.id]++;s.producerStreak=(s.producerStreak??0)+1;
  if(surged&&x.type!=='glyph')s.surge--;
  if(x.type==='glyph')s.discovery=true;
  return {...done(x.type==='glyph'?'Echo fragment found! A discovery awaits.':`${nameOf(x)}${windfall?' + bonus tool!':burst?' + raw part':''} · ${s.charges[a.id]} charges left`,'produce',i),bonus:windfall?a.id:null,improved:surged&&x.type==='item',reveal:windfall?[i,bonusIndex]:[]};
 }
 if(a.type==='service'){
  if(!SOURCES[a.id]||!sourceUnlocked(s,a.id)||s.charges[a.id]>0)return fail('This source does not need service.');
  const r=req('rig',1);
  if(a.useTool){if(!ready(s,[r]))return fail('Make a grip tool first.');consume(s,[r]);}
  else {if(s.energy<3)return fail('Need 3 energy or a grip tool.');s.energy-=3;}
  s.charges[a.id]=7;
  const restocked=s.board.filter(Boolean).length<22;if(restocked){put(s,item(a.id,0));put(s,item(a.id,0));}
  return done(`Seven fresh charges.${restocked?' Two spare parts unpacked.':''}`,'service');
 }
 if(a.type==='breach'){
  const x=s.board[a.index],r=ROUTES[x?.id];
  if(s.stage!==1||x?.type!=='route'||!r)return fail('Clear the landing, then choose one breach.');
  const need=req(r.family,2),from=a.from??s.board.findIndex(x=>matches(x,need));if(!valid(from)||!matches(s.board[from],need))return fail(`Bring a ${FAMILIES[r.family].names[2]}.`);
  s.board[from]=null;s.expedition.route=x.id;s.stage=2;s.discovery=true;
  for(let i=r.start;i<r.start+3;i++)s.board[i]=null;
  s.board[r.start]={type:'glyph'};
  if(x.id==='ridge')s.board[r.start+1]=item('rig',1);
  else {s.board[r.start+1]=item('flux',2);s.board[r.start+2]=container('relic');surge(s);}
  s.energy=Math.min(120,s.energy+6);trace(s,'breach',{route:x.id});
  return done(`${r.name} opened · Echo Crucible unlocked · fragment found. Choose equipment for two devices.`,'milestone',a.index);
 }
 if(a.type==='deploy'){
  const site=s.board[a.index];if(s.stage<2||site?.type!=='site'||site.phase!=='idle')return fail('Choose an unused device.');
  const need=equipment(site.kind),from=a.from??s.board.findIndex(x=>matches(x,need));
  if(!valid(from)||!matches(s.board[from],need))return fail(`Use a ${FAMILIES[need.family].names[3]}.`);
  trace(s,'deployment',{kind:site.kind,family:need.family,contractAlternative:normalContract(s).needs.some(r=>matches(s.board[from],r)),mergeAvailable:count(s,need)>=2});
  s.board[from]=null;const before=s.stage,change=activate(s,site);
  return {...done(ANCHORS[site.kind].effect,s.stage>before?'milestone':'deployment',a.index),reveal:change.revealed,opened:change.opened};
 }
 if(a.type==='goal'){
  const g=goal(s);if(!g||g.action&&g.action!=='goal'||!ready(s,g.needs))return fail('Make the highlighted expedition items.');
  // Crossing survey is a preparation milestone, not a delivery.
  // Consuming both route tools here made the player craft them twice.
  const routeSurvey=s.stage===0&&s.landingStep===1;
  if(routeSurvey)s.routePrepared=true;
  else consume(s,g.needs);
  s.energy=Math.min(120,s.energy+g.energy);
  // The first reward opens a new producer and changes the camp, but not the main stage.
  if(s.stage===0&&s.landingStep===0){
   s.landingStep=1;
   put(s,item('chart',0));put(s,item('rig',0));
   trace(s,'landing-secured',{chartOnline:true});
   return done('Landing secured · Survey Kite online · field parts received. Chart the crossing next.','milestone');
  }
  if(s.stage<4){if(s.stage===0)s.landingStep=2;s.stage++;
   if(s.stage===4){for(let i=0;i<36;i++)if(['sealed','route'].includes(s.board[i]?.type))s.board[i]=null;const packed=s.board.find(x=>x?.type==='crate'&&x.kind==='relic');if(packed)packed.left=5;else put(s,container('relic',5));s.marks+=15;trace(s,'vault',{discovered:[...s.discovered]});}
  }else{s.post++;s.marks+=10;}
  supplies(s,6,false,s.stage===1?'survey':s.stage===2?'relic':null);
  if(s.stage===1||s.stage===2)surge(s);
  return done(s.stage===4&&s.post===0?'The Tideglass Vault is open. The sky inside is moving.':g.next,'milestone');
 }
 if(a.type==='contract'){
  const c=normalContract(s);if(!ready(s,c.needs))return fail('Make the highlighted contract items.');
  consume(s,c.needs);s.energy=Math.min(120,s.energy+c.energy);s.marks+=c.marks;s.normal++;s.contracts++;
  if(c.exchange){put(s,{...c.exchange});if(c.vaultTrade)s.expedition.vaultTrade=true;else s.expedition.trades++;trace(s,c.vaultTrade?'vault-diversion':'exchange',{from:c.needs[0].family,to:c.exchange.family,spentTier:c.needs[0].tier});}
  const shipment=c.exchange?[]:supplies(s,4,true,{rig:'salvage',chart:'survey',flux:'relic'}[c.needs[0].family]);
  if(c.surge)surge(s);
  return done(`${c.exchange?nameOf(c.exchange)+' received':'Supplies secured'}${shipment.length?' · field supplies':''}${c.surge?' · 3 rich pulls':''} · +${c.energy} energy`,'contract');
 }
 if(a.type==='startOpportunity'){
  if(s.stage<1||s.opportunity)return fail('One opportunity at a time.');
  s.opportunity={needs:[req(s.stage>=2?'flux':'chart',3)],energy:12,marks:8,ends:now+180000};return done('Signal window started · three minutes.');
 }
 if(a.type==='opportunity'){
  if(!s.opportunity)return fail('No active signal.');
  if(now>s.opportunity.ends){s.opportunity=null;return done('Signal passed. No items lost.');}
  if(!ready(s,s.opportunity.needs))return fail('Make the highlighted signal item.');
  consume(s,s.opportunity.needs);s.energy=Math.min(120,s.energy+s.opportunity.energy);s.marks+=8;s.opportunity=null;s.contracts++;supplies(s,4,true,'survey');surge(s);return done('Signal reached · Supply Surge: choose your next 3 improved pulls','contract');
 }
 if(a.type==='discovery'){
  const i=s.board.findIndex(x=>x?.type==='glyph');
  if(i<0||!ready(s,[req('chart',2)]))return fail('Decode an echo fragment with a sight lens.');
  if(s.discoveryDone)return fail('Fragment already decoded. Recycle extras for energy.');
  s.board[i]=null;consume(s,[req('chart',2)]);s.discoveryDone=true;s.boost=true;s.energy=Math.min(120,s.energy+8);s.marks+=6;supplies(s,4,true,'relic');
  trace(s,'decoded',{alternative:activeAnchors(s).length>0});
  return done('Hidden cache located. All sources now yield richer parts.','discovery');
 }
 if(a.type==='branch'){
  if(!valid(a.index)||!matches(s.board[a.index],req('rig',2)))return fail('A split spanner can become a trail brace.');
  s.board[a.index]={type:'brace'};return done('Trail brace built. Tap a saltstone blocker to clear it.','branch',a.index);
 }
 if(a.type==='clear'){
  if(!valid(a.index)||s.board[a.index]?.type!=='rock')return fail('Choose saltstone.');
  const b=s.board.findIndex(x=>x?.type==='brace'||matches(x,req('rig',2)));if(b<0)return fail('Use a split spanner to clear this stone.');
  s.board[b]=null;s.board[a.index]=container('locker');
  trace(s,'brace-clear');
  const revealed=unpack(s,a.index);surge(s);return {...done('Saltbound Locker revealed · Supply Surge: 3 improved pulls','clear',a.index),reveal:revealed,containerKind:'locker'};
 }
 if(a.type==='crate'){
  if(!valid(a.index)||s.board[a.index]?.type!=='crate')return fail('Choose a reward container.');
  const box=s.board[a.index],kind=box.kind??'locker',name=containerInfo(box).name;
  if(box.left>1&&!s.board.includes(null))return fail('Merge or move a loose item out first. This reward is safely packed.');
  const revealed=unpack(s,a.index);
  return {...done(`${name} · ${revealed.length} finds${s.board[a.index]?.type==='crate'?' · rest safely packed':''}`,'container',a.index),reveal:revealed,containerKind:kind};
 }
 if(a.type==='recycle'){
  if(!valid(a.index))return fail('Choose an item.');const x=s.board[a.index];
  if(!x||!['item','glyph','brace'].includes(x.type))return fail('Only loose items can be recycled.');
  const gain=x.type==='item'?Math.max(1,2**x.tier):x.type==='glyph'?5:3;s.board[a.index]=null;s.energy=Math.min(120,s.energy+gain);return done(`Recycled · +${gain} energy`,'recycle');
 }
 if(a.type==='ration'){
  if(s.energy>3)return fail('Field rations are reserved for low energy.');
  s.energy+=12;s.rations++;return done('Field ration · +12 energy. No waiting required.','ration');
 }
 return fail('Unknown action.');
}
export function load(raw,now=Date.now()){
 try{
  const s=JSON.parse(raw);if(s?.version!==5||!Array.isArray(s.board)||s.board.length!==36)return fresh(now);
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  if(!integer(s.stage,0,4)||!integer(s.energy,0,120)||!integer(s.post,0,2))return fresh(now);
  // V5 save migration: retain older board/progress when landingStep was absent.
  if(s.landingStep===undefined)s.landingStep=s.stage===0?0:2;
  if(!integer(s.landingStep,0,2)||s.stage===0&&s.landingStep===2)return fresh(now);
  if(s.stage>0)s.landingStep=2;
  for(const x of s.board){if(x===null)continue;if(!x||typeof x!=='object')return fresh(now);
   if(x.type==='item'){if(!FAMILIES[x.family]||!integer(x.tier,0,7))return fresh(now);}
   else if(x.type==='source'){if(!SOURCES[x.id])return fresh(now);}
   else if(x.type==='crate'){if(!integer(x.left,1,5)||x.kind!==undefined&&!CONTAINERS[x.kind])return fresh(now);x.kind??='locker';}
   else if(x.type==='site'){if(!ANCHORS[x.kind]||!['idle','active','done'].includes(x.phase)||!integer(x.progress,0,2)||x.phase==='idle'&&x.progress!==0||x.phase==='done'&&x.progress!==2||x.phase==='active'&&x.progress>1||x.reclaimed!==undefined&&typeof x.reclaimed!=='boolean')return fresh(now);}
   else if(x.type==='route'){if(!ROUTES[x.id])return fresh(now);}
   else if(!['glyph','brace','rock','sealed','marker','lock'].includes(x.type))return fresh(now);
  }
  for(const id of Object.keys(SOURCES))if(!integer(s.charges?.[id],0,7)||!integer(s.taps?.[id],0,1000000)||s.board.filter(x=>x?.type==='source'&&x.id===id).length!==1)return fresh(now);
  for(const k of ['normal','moves','merges','marks','contracts','rations'])if(!integer(s[k],0,1000000))return fresh(now);
  if(!Array.isArray(s.discovered)||!s.discovered.every(x=>typeof x==='string'&&/^(rig|chart|flux):[0-7]$/.test(x)))return fresh(now);
  if(s.opportunity&&(!Number.isFinite(s.opportunity.ends)||!Array.isArray(s.opportunity.needs)||s.opportunity.needs.length!==1||!['chart','flux'].includes(s.opportunity.needs[0]?.family)||s.opportunity.needs[0].tier!==3||s.opportunity.needs[0].count!==1))s.opportunity=null;
  if(s.opportunity)s.opportunity.energy=s.opportunity.energy===28?28:12;
  s.history=Array.isArray(s.history)?s.history.filter(x=>x?.event==='milestone'&&Number.isFinite(x.at)).slice(-40):[];
  if(s.surge!==undefined&& !integer(s.surge,0,3))delete s.surge;
  if(!s.expedition){
   s.expedition=expeditionState(s.stage);
   if(s.stage<2)for(const [id,r] of Object.entries(ROUTES))if(s.board[r.start]?.type==='sealed')s.board[r.start]={type:'route',id};
  }else if(![1,2].includes(s.expedition.version)||!integer(s.expedition.trades,0,3)||s.expedition.route!==null&&!ROUTES[s.expedition.route])return fresh(now);
  if(s.expedition.vaultTrade!==undefined&&typeof s.expedition.vaultTrade!=='boolean')delete s.expedition.vaultTrade;
  s.expedition.log=Array.isArray(s.expedition.log)?s.expedition.log.filter(x=>x&&typeof x.type==='string'&&integer(x.move,0,1000000)).slice(-200):[];
  installSites(s);if(s.expedition.version===1){for(const site of anchors(s))if(site.phase==='active')activate(s,site);s.expedition.version=2;}delete s.mission;
  if(!integer(s.producerStreak,0,1000000))s.producerStreak=0;
  // Idempotent migration from older V5 builds whose survey already
  // consumed both route ingredients. Keep all existing board progress.
  if(s.routePrepared!==true){
   if(s.stage===1){
    for(const family of ['rig','chart'])if(count(s,req(family,2))===0)put(s,item(family,2));
    s.routePrepared=true;
   }else s.routePrepared=s.stage>=2;
  }
  return s;
 }catch{return fresh(now);}
}
