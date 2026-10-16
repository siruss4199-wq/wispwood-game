// Earned world state, separate from inventory. No timers or additional currency.
export const freshSeals=()=>({version:1,navigation:false,stabilization:false,resonance:false,link:[],optics:{version:1,primed:false,direction:0}});
export const allSeals=s=>['navigation','stabilization','resonance'].every(k=>s.seals?.[k]===true);
export const loopCell=x=>x?.type==='item'&&x.family==='flux'&&x.tier===1;
export const sightLens=x=>x?.type==='item'&&x.family==='chart'&&x.tier===2;
export const reflector=x=>x?.type==='prism'||sightLens(x);
export const linkPhase=s=>s.stage===2&&s.seals?.navigation&&s.seals?.stabilization&&!s.seals.resonance;
// Keep the old serialized charge field: an already-spent Loop Cell stays spent.
export const movable=x=>!!x&&['item','crate','glyph','brace','prism'].includes(x.type);
export function optics(s){return s.seals.optics??{version:1,primed:false,direction:0};}
export function receivers(s){return s.board.flatMap((x,i)=>x?.type==='site'&&x.kind!=='winch'&&x.phase==='done'?[i]:[]);}
export function circuit(s,index){
 if(!linkPhase(s)||!optics(s).primed)return null;
 const lift=s.board.findIndex(x=>x?.type==='site'&&x.kind==='winch'&&x.phase==='done'),targets=receivers(s);
 // Two legacy receivers require an explicit choice, never an arbitrary reward.
 const receiver=index??(targets.length===1?targets[0]:undefined);
 return lift>=0&&targets.includes(receiver)?[lift,receiver]:null;
}
export function unfold(){} // Historical call site; no puzzle equipment is spawned.
export function migrateSeals(s){
 if(!s.seals||s.seals.version!==1){
  s.seals={...freshSeals(),navigation:s.stage>=2,stabilization:s.stage>=3||s.board.some(x=>x?.type==='site'&&x.kind==='winch'&&x.phase==='done'),resonance:s.stage>=3};
 }else{
  for(const k of ['navigation','stabilization','resonance'])s.seals[k]=s.seals[k]===true;
  s.seals.link=Array.isArray(s.seals.link)?s.seals.link.filter(i=>Number.isInteger(i)&&i>=0&&i<36):[];
 }
 // Do not reset earned seals or insert objects while loading a legacy board.
 // Retired mirrors become useful, mergeable lenses in the same cells. Never
 // remove earned inventory or re-award a milestone during migration.
 for(let i=0;i<s.board.length;i++)if(s.board[i]?.type==='prism')s.board[i]={type:'item',family:'chart',tier:2};
 const o=s.seals.optics;
 s.seals.optics={version:1,primed:o?.primed===true,direction:o?.direction===2?2:0};
}
