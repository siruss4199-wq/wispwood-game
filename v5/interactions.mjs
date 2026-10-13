import {matches} from './core.mjs';
import {equipment,ROUTES} from './expedition.mjs';

// Shared by tap, drag and target highlighting: never advertise a locked action.
export function useAction(s,from,index){
 if(from==null||from===index)return null;
 const tool=s.board[from],target=s.board[index];
 if(target?.type==='rock'&&(tool?.type==='brace'||matches(tool,{family:'rig',tier:2})))return {type:'clear',from,index};
 if(target?.type==='route'&&s.stage===1&&matches(tool,{family:ROUTES[target.id].family,tier:2}))return {type:'breach',from,index};
 if(target?.type==='site'&&s.stage>=2&&target.phase==='idle'&&matches(tool,equipment(target.kind)))return {type:'deploy',from,index};
 return null;
}

export function openingPair(s){
 if(s.merges||s.stage||s.landingStep)return [];
 const twins=s.board.flatMap((x,i)=>matches(x,{family:'rig',tier:0})?[i]:[]);
 const left=twins.find(i=>i%6<5&&twins.includes(i+1));
 return left===undefined?twins.slice(0,2):[left,left+1];
}
