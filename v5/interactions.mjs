import {matches} from './core.mjs';
import {equipment,ROUTES,canRestore} from './expedition.mjs';
import {linkPhase,optics,loopCell} from './seals.mjs';
import {routePrepared} from './navigation.mjs';

// Shared by tap, drag and target highlighting: never advertise a locked action.
export function useAction(s,from,index){
 if(from==null||from===index)return null;
 const tool=s.board[from],target=s.board[index];
 if(s.journey?.engine&&!s.journey.boost&&loopCell(tool)&&target?.type==='source')return {type:'infuse',from,index,id:target.id};
 if(linkPhase(s)&&!optics(s).primed&&loopCell(tool)&&target?.type==='site'&&target.kind==='winch'&&target.phase==='done')return {type:'prime',from,index};
 if(canRestore(s,target)&&matches(tool,{family:'flux',tier:2}))return {type:'restore',from,index};
 if(target?.type==='rock'&&(tool?.type==='brace'||matches(tool,{family:'rig',tier:2})))return {type:'clear',from,index};
 if(target?.type==='route'&&s.stage===1&&routePrepared(s,target.id)&&matches(tool,{family:ROUTES[target.id].family,tier:2}))return {type:'breach',from,index};
 if(target?.type==='site'&&s.stage>=2&&target.phase==='idle'&&matches(tool,equipment(target.kind)))return {type:'deploy',from,index};
 return null;
}

export function openingPair(s){
 if(s.merges||s.stage||s.landingStep)return [];
 const twins=s.board.flatMap((x,i)=>matches(x,{family:'rig',tier:0})?[i]:[]);
 const left=twins.find(i=>i%6<5&&twins.includes(i+1));
 return left===undefined?twins.slice(0,2):[left,left+1];
}
