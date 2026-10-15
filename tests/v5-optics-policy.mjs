// Test-only search over geometric solutions. Never imported by the game/UI.
import {beam,movable,optics,linkPhase,sightLens} from '../v5/seals.mjs';
export function layouts(s,{receiver=null,lane=null}={}){
 if(!linkPhase(s))return [];
 const start=s.board.findIndex(x=>x?.type==='site'&&x.kind==='winch'),out=[];
 for(const [end,x]of s.board.entries())if(x?.type==='site'&&x.kind!=='winch'&&x.phase==='done'&&(!receiver||x.kind===receiver)){
  for(let row=0;row<6;row++){
   if(lane==='upper'&&row>=Math.floor(start/6)||lane==='lower'&&row<=Math.floor(start/6))continue;
   const a=row*6+start%6,b=row*6+end%6;
   if(a===b||[a,b].some(i=>s.board[i]&&!movable(s.board[i])))continue;
   for(const direction of [0,2])for(const t0 of [0,1])for(const t1 of [0,1]){
    const board=s.board.map(x=>movable(x)?null:x);board[a]={type:'prism',id:0,turn:t0};board[b]={type:'item',family:'chart',tier:2,turn:t1};
    const trial={...s,board,seals:{...s.seals,optics:{version:1,primed:true,direction}}},ray=beam(trial);
    if(ray.receiver!==end||ray.prisms.length!==2)continue;
    const prisms=[{index:a,turn:t0},{index:b,turn:t1}],path=ray.path;
    const cost=prisms.reduce((n,p,id)=>{const i=s.board.findIndex(x=>id?sightLens(x):x?.type==='prism');return n+(i===p.index?0:1)+((s.board[i]?.turn??0)===p.turn?0:1);},0)+(optics(s).direction===direction?0:1)+path.filter(i=>i!==start&&i!==end&&i!==a&&i!==b&&s.board[i]&&s.board[i].type!=='prism').length;
    out.push({path,prisms,direction,receiver:x.kind,cost});
   }
  }
 }
 return out.sort((a,b)=>a.cost-b.cost||a.path.length-b.path.length);
}
export function arrange(s,plan){
 if(optics(s).direction!==plan.direction)return {type:'turn',index:plan.path[0]};
 for(const [id,p]of plan.prisms.entries()){
  const from=s.board.findIndex(x=>id?sightLens(x):x?.type==='prism');
  if(from<0)break;
  if(from!==p.index){
   if(id&&s.board[p.index]&&s.board[p.index].type!=='prism'){
    const to=s.board.findIndex((x,i)=>!x&&!plan.path.includes(i));
    if(to>=0)return {type:'merge',from:p.index,to};
    const raw=s.board.findIndex(x=>x?.type==='item'&&x.tier===0);if(raw>=0)return {type:'recycle',index:raw};
   }
   return {type:'merge',from,to:p.index};
  }
  if((s.board[from].turn??0)!==p.turn)return {type:'turn',index:from};
 }
 for(const i of plan.path.slice(1,-1))if(s.board[i]&&!plan.prisms.some(p=>p.index===i)){
  const to=s.board.findIndex((x,j)=>!x&&!plan.path.includes(j));
  if(to>=0)return {type:'merge',from:i,to};
  const stock=s.board.flatMap((x,j)=>x?.type==='item'?[{...x,index:j}]:[]).sort((a,b)=>a.tier-b.tier);
  // Reclaim working space through a real merge, before sacrificing raw stock.
  for(const x of stock){const twin=stock.find(y=>y.index!==x.index&&y.family===x.family&&y.tier===x.tier&&x.tier<7);if(twin)return {type:'merge',from:x.index,to:twin.index};}
  if(stock.length)return {type:'recycle',index:stock[0].index};
 }
 return null;
}
