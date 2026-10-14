// Earned world state, separate from inventory. No timers or additional currency.
export const freshSeals=()=>({version:1,navigation:false,stabilization:false,resonance:false,link:[]});
export const allSeals=s=>['navigation','stabilization','resonance'].every(k=>s.seals?.[k]===true);
export const loopCell=x=>x?.type==='item'&&x.family==='flux'&&x.tier===1;
export const linkPhase=s=>s.stage===2&&s.seals?.navigation&&s.seals?.stabilization&&!s.seals.resonance;
const neighbors=i=>[i%6?i-1:-1,i%6<5?i+1:-1,i>=6?i-6:-1,i<30?i+6:-1].filter(j=>j>=0);
// Actual wiring uses orthogonal Loop Cells. A preview can cross movable stock,
// never fixed sources, rubble, unprepared devices or the other buried route.
export function circuit(s,planning=false){
 if(!linkPhase(s))return null;
 const start=s.board.findIndex(x=>x?.type==='site'&&x.kind==='winch'&&x.phase==='done');
 if(start<0)return null;
 const queue=[[start]],seen=new Set([start]);
 while(queue.length){
  const path=queue.shift();
  for(const i of neighbors(path.at(-1))){
   if(seen.has(i))continue;
   const x=s.board[i];
   if(x?.type==='site'&&x.kind!=='winch'&&x.phase==='done'&&path.length>1)return [...path,i];
   if(planning?(!x||['item','crate','glyph','brace'].includes(x.type)):loopCell(x)){
    seen.add(i);queue.push([...path,i]);
   }
  }
 }
 return null;
}
export function migrateSeals(s){
 if(!s.seals||s.seals.version!==1){
  s.seals={...freshSeals(),navigation:s.stage>=2,stabilization:s.stage>=3||s.board.some(x=>x?.type==='site'&&x.kind==='winch'&&x.phase==='done'),resonance:s.stage>=3};
 }else{
  for(const k of ['navigation','stabilization','resonance'])s.seals[k]=s.seals[k]===true;
  s.seals.link=Array.isArray(s.seals.link)?s.seals.link.filter(i=>Number.isInteger(i)&&i>=0&&i<36):[];
 }
}
