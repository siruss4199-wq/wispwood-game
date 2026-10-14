// Earned world state, separate from inventory. No timers or additional currency.
export const freshSeals=()=>({version:1,navigation:false,stabilization:false,resonance:false,link:[],optics:{version:1,primed:false,direction:0}});
export const allSeals=s=>['navigation','stabilization','resonance'].every(k=>s.seals?.[k]===true);
export const loopCell=x=>x?.type==='item'&&x.family==='flux'&&x.tier===1;
export const linkPhase=s=>s.stage===2&&s.seals?.navigation&&s.seals?.stabilization&&!s.seals.resonance;
// A raised saltglass rib interrupts the tempting middle crossing. Inventory
// can sit beside it, but light cannot cross it. No hidden/random obstacles.
export const BAFFLES=[[14,15]];
export const movable=x=>!!x&&['item','crate','glyph','brace','prism'].includes(x.type);
export const reflect=(direction,turn)=>turn?[3,2,1,0][direction]:[1,0,3,2][direction];
export function optics(s){return s.seals.optics??{version:1,primed:false,direction:0};}
export function unfold(s){
 if(!linkPhase(s))return;
 s.seals.optics??={version:1,primed:false,direction:0};
 for(const id of [0,1])if(!s.board.some(x=>x?.type==='prism'&&x.id===id)){
  const i=s.board.indexOf(null);if(i<0)break;
  s.board[i]={type:'prism',id,turn:0};
 }
}
export function step(i,d){return d===0?(i>=6?i-6:-1):d===1?(i%6<5?i+1:-1):d===2?(i<30?i+6:-1):(i%6?i-1:-1);}
// Trace only what the player built. No shortest-path hint or solution ghost.
export function beam(s){
 const start=s.board.findIndex(x=>x?.type==='site'&&x.kind==='winch'&&x.phase==='done');
 const path=start<0?[]:[start],prisms=[],seen=new Set();
 let i=start,d=optics(s).direction;
 if(!linkPhase(s)||!optics(s).primed||i<0)return {path,prisms,stop:'unpowered',receiver:null};
 while(true){
  const next=step(i,d);
  if(next<0)return {path,prisms,stop:'edge',receiver:null};
  if(BAFFLES.some(([a,b])=>a===i&&b===next||a===next&&b===i))return {path,prisms,stop:'stone',blocked:next,receiver:null};
  i=next;path.push(i);
  const key=i+':'+d;if(seen.has(key))return {path,prisms,stop:'loop',receiver:null};seen.add(key);
  const x=s.board[i];
  if(!x)continue;
  if(x.type==='prism'){prisms.push(i);d=reflect(d,x.turn);continue;}
  if(x.type==='site'&&x.kind!=='winch'){
   const accepts=d===0||d===2;
   return {path,prisms,stop:!accepts?'backplate':x.phase==='done'?'receiver':'dormant',receiver:accepts&&x.phase==='done'?i:null};
  }
  return {path,prisms,stop:'blocked',blocked:i,receiver:null};
 }
}
export function circuit(s){
 const b=beam(s);return b.receiver!==null&&new Set(b.prisms).size===2?b.path:null;
}
export function migrateSeals(s){
 if(!s.seals||s.seals.version!==1){
  s.seals={...freshSeals(),navigation:s.stage>=2,stabilization:s.stage>=3||s.board.some(x=>x?.type==='site'&&x.kind==='winch'&&x.phase==='done'),resonance:s.stage>=3};
 }else{
  for(const k of ['navigation','stabilization','resonance'])s.seals[k]=s.seals[k]===true;
  s.seals.link=Array.isArray(s.seals.link)?s.seals.link.filter(i=>Number.isInteger(i)&&i>=0&&i<36):[];
 }
 // Do not reset earned seals or insert objects while loading a legacy board.
 const o=s.seals.optics;
 s.seals.optics={version:1,primed:o?.primed===true,direction:o?.direction===2?2:0};
}
