import assert from 'node:assert/strict';
import {act} from '../v5/core.mjs';
import {sight} from '../v5/navigation.mjs';
export function prepareSight(s,id){
 const view=sight(s,id),start=view.path[0];
 const lens=s.board.findIndex(x=>x?.type==='item'&&x.family==='chart'&&x.tier===2);
 assert.ok(lens>=0);
 for(const from of [start,...view.blocked])if(from!==lens&&s.board[from]){
  const to=s.board.findIndex((x,i)=>!x&&!view.path.includes(i));assert.ok(to>=0);
  assert.ok(act(s,{type:'move',from,to}).ok);
 }
 if(lens!==start)assert.ok(act(s,{type:'move',from:lens,to:start}).ok);
 assert.ok(sight(s,id).ready);
}
