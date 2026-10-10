// Vaultwake: deterministic rules, independent of rendering and wall-clock timers.
export const SAVE_KEY='vaultwake-v5';
export const FAMILIES={
 rig:{name:'Fieldworks',color:'#f27755',source:'rig',names:['Copper offcut','Grip tool','Split spanner','Pocket winch','Crawler jack','Bridge rig','Dune hauler','Expedition crawler']},
 chart:{name:'Wayfinding',color:'#43bfe7',source:'chart',names:['Ink scrap','Route fold','Sight lens','Survey scope','Bearing dial','Star chart','Horizon model','Sky atlas']},
 flux:{name:'Resonance',color:'#ac83fa',source:'flux',names:['Violet shard','Loop cell','Pulse coil','Resonator','Phase lantern','Orbit engine','Vault heart','Aurora beacon']}
};
export const SOURCES={rig:{name:'Rivet Rover',cost:1,family:'rig',unlock:0},chart:{name:'Survey Kite',cost:1,family:'chart',unlock:1},flux:{name:'Echo Crucible',cost:2,family:'flux',unlock:2}};
const req=(family,tier,count=1)=>({family,tier,count});
export const STAGES=[
 {name:'Clear the landing',verb:'Clear path',scene:'Blocked approach',needs:[req('rig',1,2)],energy:10,next:'Survey Kite + expedition camp',text:'Two grip tools can lift the fallen marker.'},
 {name:'Find the buried door',verb:'Excavate',scene:'Excavation camp',needs:[req('rig',4),req('chart',3)],energy:24,next:'Echo Crucible + six spaces',text:'A crawler jack and survey scope will uncover the entrance.'},
 {name:'Wake the ring engine',verb:'Power rings',scene:'Entrance uncovered',needs:[req('flux',4),req('rig',4)],energy:30,next:'Powered vault + enriched sources',text:'Raise the rings with a lantern and crawler jack.'},
 {name:'Open the Tideglass Vault',verb:'Open vault',scene:'Rings awakened',needs:[req('chart',5),req('flux',5),req('rig',3)],energy:36,next:'The chamber + relic cache',text:'Align a star chart and orbit engine to open the vault.'}
];
export const POST_GOALS=[
 {name:'Chart the next crossing',verb:'Chart crossing',scene:'Vault opened',needs:[req('chart',6),req('rig',5)],energy:35,next:'Archive expedition badge'},
 {name:'Build an aurora beacon',verb:'Light beacon',scene:'Vault opened',needs:[req('flux',7)],energy:50,next:'Aurora collector badge'}
];
export const nameOf=x=>!x?'Empty space':x.type==='item'?FAMILIES[x.family].names[x.tier]:x.type==='source'?SOURCES[x.id].name:x.type==='rock'?'Saltstone blocker':x.type==='crate'?'Expedition cache':x.type==='brace'?'Trail brace':x.type==='glyph'?'Echo fragment':'Unknown';
export const item=(family,tier)=>({type:'item',family,tier});
const source=id=>({type:'source',id});
export function fresh(now=Date.now()){
 const board=Array(36).fill(null);
 board[0]=source('rig');board[5]=source('chart');board[30]=source('flux');
 [[7,'rig',0],[8,'rig',0],[9,'chart',0],[10,'chart',0],[13,'rig',1],[14,'chart',1],[15,'flux',0],[16,'flux',0],[19,'rig',0],[20,'rig',0],[21,'chart',0],[22,'chart',0]].forEach(([i,f,t])=>board[i]=item(f,t));
 for(const i of [24,25,26,27,28,29])board[i]={type:'sealed'};
 board[31]={type:'rock'};board[32]={type:'rock'};board[34]={type:'crate',left:3};
 return {version:5,board,stage:0,energy:32,marks:0,moves:0,merges:0,contracts:0,serial:0,charges:{rig:7,chart:7,flux:7},taps:{rig:0,chart:0,flux:0},normal:0,opportunity:null,discovery:false,discoveryDone:false,boost:false,post:0,discovered:[],startedAt:now,lastAt:now,rations:0,history:[]};
}
export function goal(s){return STAGES[s.stage]??POST_GOALS[s.post]??null;}
export function count(s,r){return s.board.filter(x=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier).length;}
export function ready(s,needs){return needs.every(r=>count(s,r)>=r.count);}
export function matches(x,r){return x?.type==='item'&&x.family===r.family&&x.tier===r.tier;}
function consume(s,needs){for(const r of needs)for(let n=0;n<r.count;n++)s.board[s.board.findIndex(x=>matches(x,r))]=null;}
export function normalContract(s){
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
 return item(id, s.boost&&n%3===0?2:n%4===0?1:0);
}
function put(s,x){const i=s.board.indexOf(null);if(i<0)return -1;s.board[i]=x;return i;}
function remember(s,event,now){s.history.push({event,at:now});s.history=s.history.slice(-40);}
// Mutating reducer is intentionally atomic: failed commands leave all state untouched.
export function act(s,a,now=Date.now()){
 const fail=message=>({ok:false,message});
 const done=(message,event='action',index=null)=>{s.moves++;s.lastAt=now;if(event==='milestone')remember(s,event,now);for(const x of s.board)if(x?.type==='item'){const key=x.family+':'+x.tier;if(!s.discovered.includes(key))s.discovered.push(key);}return {ok:true,message,event,index};};
 const valid=i=>Number.isInteger(i)&&i>=0&&i<36;
 if(a.type==='merge'||a.type==='move'){
  if(!valid(a.from)||!valid(a.to)||a.from===a.to)return fail('Choose another space.');
  const x=s.board[a.from],y=s.board[a.to];
  if(!x||!['item','glyph','brace','crate'].includes(x.type))return fail('That object stays here.');
  if(!y){s.board[a.to]=x;s.board[a.from]=null;return done('Moved.','move',a.to);}
  if(x.type!=='item'||y.type!=='item'||x.family!==y.family||x.tier!==y.tier||x.tier>=7)return fail('Merge two identical objects.');
  s.board[a.to]=item(x.family,x.tier+1);s.board[a.from]=null;s.merges++;s.energy=Math.min(120,s.energy+1);
  return done(`${nameOf(s.board[a.to])} discovered · +1 energy`,'merge',a.to);
 }
 if(a.type==='produce'){
  const p=SOURCES[a.id];if(!p||s.stage<p.unlock)return fail(`Unlock after ${a.id==='chart'?'clearing the landing':'excavating the door'}.`);
  if(!s.board.some(x=>x?.type==='source'&&x.id===a.id))return fail('Source missing.');
  if(!s.charges[a.id])return fail('Service this source: a grip tool or 3 energy.');
  if(s.energy<p.cost)return fail('Deliver a contract, recycle an item, or use a field ration.');
  if(!s.board.includes(null))return fail('Board full. Merge, deliver, recycle, or clear a blocker.');
  const x=nextOutput(s,a.id),i=put(s,x);s.energy-=p.cost;s.charges[a.id]--;s.taps[a.id]++;
  if(x.type==='glyph')s.discovery=true;
  return done(x.type==='glyph'?'Echo fragment found! A discovery awaits.':`${nameOf(x)} · ${s.charges[a.id]} charges left`,'produce',i);
 }
 if(a.type==='service'){
  if(!SOURCES[a.id]||s.stage<SOURCES[a.id].unlock||s.charges[a.id]>0)return fail('This source does not need service.');
  const r=req('rig',1);
  if(a.useTool){if(!ready(s,[r]))return fail('Make a grip tool first.');consume(s,[r]);}
  else {if(s.energy<3)return fail('Need 3 energy or a grip tool.');s.energy-=3;}
  s.charges[a.id]=7;return done('Seven fresh charges.','service');
 }
 if(a.type==='goal'){
  const g=goal(s);if(!g||!ready(s,g.needs))return fail('Make the highlighted expedition items.');
  consume(s,g.needs);s.energy=Math.min(120,s.energy+g.energy);
  if(s.stage<4){s.stage++;
   if(s.stage===2){for(let i=24;i<30;i++)if(s.board[i]?.type==='sealed')s.board[i]=null;}
   if(s.stage===3)s.boost=true;
   if(s.stage===4){put(s,{type:'crate',left:5});s.marks+=15;}
  }else{s.post++;s.marks+=10;}
  return done(s.stage===4&&s.post===0?'The Tideglass Vault is open. The sky inside is moving.':g.next,'milestone');
 }
 if(a.type==='contract'){
  const c=normalContract(s);if(!ready(s,c.needs))return fail('Make the highlighted contract items.');
  consume(s,c.needs);s.energy=Math.min(120,s.energy+c.energy);s.marks+=c.marks;s.normal++;s.contracts++;
  return done(`Supplies secured · +${c.energy} energy`,'contract');
 }
 if(a.type==='startOpportunity'){
  if(s.stage<1||s.opportunity)return fail('One opportunity at a time.');
  s.opportunity={needs:[req(s.stage>=2?'flux':'chart',3)],energy:28,marks:8,ends:now+180000};return done('Signal window started · three minutes.');
 }
 if(a.type==='opportunity'){
  if(!s.opportunity)return fail('No active signal.');
  if(now>s.opportunity.ends){s.opportunity=null;return done('Signal passed. No items lost.');}
  if(!ready(s,s.opportunity.needs))return fail('Make the highlighted signal item.');
  consume(s,s.opportunity.needs);s.energy=Math.min(120,s.energy+28);s.marks+=8;s.opportunity=null;s.contracts++;return done('Signal reached · +28 energy, +8 merit','contract');
 }
 if(a.type==='discovery'){
  const i=s.board.findIndex(x=>x?.type==='glyph');
  if(i<0||!ready(s,[req('chart',2)]))return fail('Decode an echo fragment with a sight lens.');
  if(s.discoveryDone)return fail('Fragment already decoded. Recycle extras for energy.');
  s.board[i]=null;consume(s,[req('chart',2)]);s.discoveryDone=true;s.boost=true;s.energy=Math.min(120,s.energy+18);s.marks+=6;
  return done('Hidden cache located. All sources now yield richer parts.','discovery');
 }
 if(a.type==='branch'){
  if(!valid(a.index)||!matches(s.board[a.index],req('rig',2)))return fail('A split spanner can become a trail brace.');
  s.board[a.index]={type:'brace'};return done('Trail brace built. Tap a saltstone blocker to clear it.','branch',a.index);
 }
 if(a.type==='clear'){
  if(!valid(a.index)||s.board[a.index]?.type!=='rock')return fail('Choose saltstone.');
  const b=s.board.findIndex(x=>x?.type==='brace');if(b<0)return fail('Convert a split spanner into a trail brace.');
  s.board[b]=null;s.board[a.index]={type:'crate',left:3};return done('Saltstone cleared. A three-pull cache was hidden below.','clear',a.index);
 }
 if(a.type==='crate'){
  if(!valid(a.index)||s.board[a.index]?.type!=='crate')return fail('Choose a cache.');
  const box=s.board[a.index],last=box.left===1;
  if(!last&&!s.board.includes(null))return fail('Free one space to open the cache.');
  const x=item(['rig','chart','flux'][box.left%3],1);
  let i;if(last){s.board[a.index]=x;i=a.index;}else{box.left--;i=put(s,x);}
  return done('Cache opened · no energy spent','produce',i);
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
  for(const x of s.board){if(x===null)continue;if(!x||typeof x!=='object')return fresh(now);
   if(x.type==='item'){if(!FAMILIES[x.family]||!integer(x.tier,0,7))return fresh(now);}
   else if(x.type==='source'){if(!SOURCES[x.id])return fresh(now);}
   else if(x.type==='crate'){if(!integer(x.left,1,5))return fresh(now);}
   else if(!['glyph','brace','rock','sealed'].includes(x.type))return fresh(now);
  }
  for(const id of Object.keys(SOURCES))if(!integer(s.charges?.[id],0,7)||!integer(s.taps?.[id],0,1000000)||s.board.filter(x=>x?.type==='source'&&x.id===id).length!==1)return fresh(now);
  for(const k of ['normal','moves','merges','marks','contracts','rations'])if(!integer(s[k],0,1000000))return fresh(now);
  if(!Array.isArray(s.discovered)||!s.discovered.every(x=>typeof x==='string'&&/^(rig|chart|flux):[0-7]$/.test(x)))return fresh(now);
  if(s.opportunity&&(!Number.isFinite(s.opportunity.ends)||!Array.isArray(s.opportunity.needs)||s.opportunity.needs.length!==1||!['chart','flux'].includes(s.opportunity.needs[0]?.family)||s.opportunity.needs[0].tier!==3||s.opportunity.needs[0].count!==1))s.opportunity=null;
  s.history=Array.isArray(s.history)?s.history.filter(x=>x?.event==='milestone'&&Number.isFinite(x.at)).slice(-40):[];
  return s;
 }catch{return fresh(now);}
}
