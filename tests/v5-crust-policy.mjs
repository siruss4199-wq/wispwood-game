// Scripted players free salt-crusted parts the way people do: instead of tapping a
// producer, merge a spare low-tier part onto its crusted twin. Like a person, they
// never spend a part that is protected (route tools, a charge cell, receiver gear) or
// the last copy a visible goal or order needs at that exact tier. On the dig-out
// board they also merge a spare pair beside the sand before tapping again, since
// that is how the camp grows.
import {act,cellAt,cellPos,freesCrust,goal,matches} from '../v5/core.mjs';
import {reservedItems} from '../v5/requests.mjs';
function spare(s){
 const kept=reservedItems(s),needs=[...(goal(s)?.needs??[]),...(s.requests?.orders??[]).flatMap(o=>o?.needs??[])];
 return i=>!kept.has(i)&&!needs.some(r=>matches(s.board[i],r)&&s.board.filter(y=>matches(y,r)).length<=r.count);
}
export function preferCrust(s,a){
 if(a?.type!=='produce')return a;
 const free=spare(s);
 for(let j=0;j<s.board.length;j++){
  const y=s.board[j];if(y?.type!=='crust'||y.tier>1)continue;
  const i=s.board.findIndex((x,i)=>freesCrust(x,y)&&free(i));
  if(i>=0)return {type:'merge',from:i,to:j};
 }
 return preferDig(s,a,free);
}
const besideSand=(s,i)=>{const [r,c]=cellPos(i);return [cellAt(r-1,c),cellAt(r+1,c),cellAt(r,c-1),cellAt(r,c+1)].some(j=>j>=0&&s.board[j]?.type==='sand');};
function preferDig(s,a,free){
 if(!s.board.some(x=>x?.type==='sand'))return a;
 for(let j=0;j<s.board.length;j++){
  const y=s.board[j];if(y?.type!=='item'||y.line||!free(j)||!besideSand(s,j))continue;
  for(let i=0;i<s.board.length;i++){
   const x=s.board[i];if(i===j||x?.type!=='item'||x.line||x.family!==y.family||x.tier!==y.tier||!free(i))continue;
   const m={type:'merge',from:i,to:j};if(act(structuredClone(s),m,0).ok)return m;
  }
 }
 return a;
}
