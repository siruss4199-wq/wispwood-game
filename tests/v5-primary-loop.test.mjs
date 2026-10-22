import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,goal,expeditionGoal,act,load,item} from '../v5/core.mjs';
import {campGoal,recommendedOrder} from '../v5/camp-goals.mjs';
import {syncRequests,requestProgress} from '../v5/requests.mjs';
import {BENCH_COST} from '../v5/workshop.mjs';

function completedTreasures(){
 const s=fresh(0);
 s.stage=4;s.landingStep=2;s.routePrepared=true;
 s.workshop.repaired=true;
 s.camp.pier=true;s.camp.loft=true;s.camp.deepSurvey=true;
 for(let n=0;n<=4;n++)s.discovered.push('chart:tide:'+n);
 syncRequests(s);
 return s;
}

test('Vault open and Workshop 6/8 remains a real primary objective even if the expedition itself is complete',()=>{
 const s=fresh(0);s.stage=4;s.landingStep=2;s.routePrepared=true;s.requests.supplies=6;
 const before=JSON.stringify(s);
 const g=goal(s);
 assert.equal(g.kind,'camp');
 assert.equal(g.name,'Restore Coastal Workshop');
 assert.equal(g.action,'orders');
 assert.equal(g.cost,8);
 assert.equal(g.supplies,6);
 assert.ok(s.requests.orders.some(o=>o?.id===g.orderId));
 assert.match(g.next,/2 more/);
 assert.equal(JSON.stringify(s),before,'choosing a primary objective must not mutate the save');
});

test('discovering the Crown advances to the REAL unfinished Precision Bench instead of an unrelated post-vault expedition',()=>{
 const s=completedTreasures();
 s.requests.supplies=5;
 const g=goal(s);
 assert.equal(g.name,'Install Precision Bench');
 assert.equal(g.kind,'camp');
 assert.equal(g.action,'orders');
 assert.equal(g.cost,BENCH_COST);
 assert.equal(g.supplies,5);
 assert.match(g.next,/7 more/);
 assert.match(g.next,/Split Spanners/);
 assert.ok(s.requests.orders.some(o=>o?.id===g.orderId));
 assert.ok(expeditionGoal(s),'optional vault expedition still exists separately');
});

test('one affordable Precision Bench purchase advances to a genuine repeatable order without inventing a new building',()=>{
 const s=completedTreasures();
 s.requests.supplies=BENCH_COST;
 assert.equal(goal(s).action,'upgradeWorkshop');
 const r=act(s,{type:'upgradeWorkshop'});
 assert.equal(r.ok,true,r.message);
 assert.equal(s.workshop.precision,true);
 assert.equal(s.requests.supplies,0);
 const g=goal(s);
 assert.equal(g.kind,'camp');
 assert.equal(g.action,'orders');
 assert.equal(g.phase,'CAMP ORDERS');
 assert.ok(s.requests.orders.some(o=>o?.id===g.orderId));
 assert.deepEqual(g.needs,s.requests.orders.find(o=>o.id===g.orderId).needs);
 assert.match(g.next,/Supply Pier/);
 assert.equal(act(s,{type:'upgradeWorkshop'}).ok,false,'Bench purchase must not duplicate');
 const restored=load(JSON.stringify(s));
 assert.equal(restored.workshop.precision,true);
 assert.equal(restored.requests.supplies,0);
 assert.equal(goal(restored).action,'orders');
});

test('ready orders are recommended first, preserving pending orders and real delivery rewards',()=>{
 const s=completedTreasures();
 s.workshop.precision=true;
 s.journey.engine=true;
 syncRequests(s);
 const o=s.requests.orders[2];
 assert.ok(o,'expedition order must be available');
 // A focused state fixture verifies recommendation, not the human gameplay journey.
 s.board=s.board.map(x=>x?.type==='source'?x:null);
 let index=1;
 for(const need of o.needs)for(let n=0;n<need.count;n++)s.board[index++]=item(need.family,need.tier,need.line);
 assert.equal(requestProgress(s,o).ready,true);
 assert.equal(recommendedOrder(s).id,o.id);
 assert.equal(campGoal(s).orderId,o.id);
 const completed=s.requests.completed;
 const result=act(s,{type:'request',id:o.id});
 assert.equal(result.ok,true,result.message);
 assert.equal(s.requests.completed,completed+1);
 assert.equal(goal(s).action,'orders','normal orders continue after delivery');
});
