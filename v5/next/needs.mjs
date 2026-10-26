// What an order wants, one entry per distinct part (Build 45g). Delivery (game.mjs orderItems)
// takes a different board piece for every part counted, so two needs that name the same part pool
// their counts: one Grip tool on the board is 1 of 3, never shown as "1/1" beside "1/2".
// `sibling` marks a part whose chain also appears at another tier in the same order (Split
// spanner and Grip tool look alike at card size), so the card can say which level is which.
import {count} from './game.mjs';
export function needsOf(s,o){
 const byPart=new Map();
 for(const r of o.needs){const k=r.family+':'+r.tier,e=byPart.get(k);if(e)e.count+=r.count;else byPart.set(k,{family:r.family,tier:r.tier,count:r.count});}
 const list=[...byPart.values()];
 for(const r of list){r.have=Math.min(r.count,count(s,r));r.sibling=list.some(q=>q!==r&&q.family===r.family);}
 return list;
}
export const missingOf=(s,o)=>needsOf(s,o).filter(r=>r.have<r.count);
// A part's level as the player sees it (the first part of a chain is level 1).
export const levelOf=r=>r.tier+1;
