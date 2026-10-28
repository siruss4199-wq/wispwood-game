// Tideglass hints (Build 45n, user: "zarimdaa merge hiihed musuu tsohihgui baih shig baina").
// A merge cracks the tideglass beside it only if what it makes is at least the level of the part
// inside (game.mjs crack()), so a small merge beside a Split spanner's glass does nothing and the
// player could not tell why. Presentation only: these read the rules, they never change them.
import {cellPos} from '../core.mjs';
import {cellIndex} from './game.mjs';
// The four spaces beside a cell (no diagonals), the spaces crack() looks at.
export const besideOf=i=>{const [r,c]=cellPos(i);return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([y,x])=>y>=0&&x>=0&&y<=6&&x<=6).map(([y,x])=>cellIndex(y,x));};
// The level a merge beside this glass must make to crack it, or null when any merge does
// (a merge always makes level 2 or better, so glass holding level 1 or 2 needs no hint).
export const iceNeed=g=>g?.type==='glass'&&g.tier>=2?g.tier+1:null;
// The tideglass beside a merge that the merge was too weak to crack (what it made: board[index]).
export const weakIceBeside=(board,index)=>{const m=board[index];if(m?.type!=='item')return [];
 return besideOf(index).filter(j=>board[j]?.type==='glass'&&board[j].tier>m.tier);};
