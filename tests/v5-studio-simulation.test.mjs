// Studio smoke simulation: deterministic reducer policies, NOT human retention or playtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,goal,expeditionGoal,load} from '../v5/core.mjs';
import {choose} from './v5-policy.mjs';
import {requestAction} from './v5-workshop-policy.mjs';
import {requestProgress} from '../v5/requests.mjs';
import {storySnapshot} from '../v5/story.mjs';

const checked=(s,a)=>{const r=act(s,a);assert.ok(r.ok,JSON.stringify({action:a,message:r.message}));return r;};

test('studio simulation: story-first and exploration-first players open a Vault with a continuing camp reason',()=>{
 const scenarios=[];
 for(const [style,options] of [
  ['story-first',{style:'expedition',sideFirst:false,openCaches:true,decode:false,route:'ridge',receiver:'relay',vaultKit:'field'}],
  ['exploration-first',{style:'exploration',sideFirst:true,openCaches:true,decode:true,route:'conduit',receiver:'scope',vaultKit:'survey'}]
 ]){
  const s=fresh(0);let actions=0,merges=0,pulls=0,orders=0;
  while(s.stage<4&&actions<300){
   const a=choose(s,options);assert.ok(a,'player policy should have a next action');
   checked(s,a);actions++;if(a.type==='merge')merges++;if(a.type==='produce')pulls++;if(a.type==='request')orders++;
   if(actions%13===0)Object.assign(s,load(JSON.stringify(s)));
  }
  assert.equal(s.stage,4,style+' must reach the opened Vault');
  assert.equal(goal(s).kind,'camp',style+' must not receive a false complete ending');
  assert.match(storySnapshot(s).expedition.line,/shoreline that has not appeared yet/);
  assert.ok(s.requests.orders.filter(Boolean).length>0);
  scenarios.push({style,actions,merges,pulls,orders,goal:goal(s).name,story:storySnapshot(s).expedition.title});
 }
 console.log('STUDIO_POLICY_SIMULATION',JSON.stringify(scenarios));
});

test('studio simulation: a request-first player earns meaningful rewards before the Vault',()=>{
 const s=fresh(0);checked(s,{type:'merge',from:7,to:8});checked(s,{type:'goal'});
 let turns=0;
 while(s.camp.earlyFragments<2&&turns<160){
  const a=requestAction(s,0);checked(s,a);turns++;
 }
 assert.equal(s.camp.earlyFragments,2);
 const frag=s.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===0?[i]:[]);
 assert.equal(frag.length,2,'real orders earned two mergeable fragments');
 checked(s,{type:'merge',from:frag[0],to:frag[1]});
 assert.ok(s.discovered.includes('chart:tide:1'));
 assert.equal(s.stage,0);
 console.log('STUDIO_POLICY_SIMULATION',JSON.stringify({style:'request-first',actions:turns+3,orders:s.requests.completed,treasure:'Reef compass',beforeVault:true}));
});

test('studio simulation: the returning Vault player has a real goal, relevant order and preserved history',()=>{
 const s=fresh(0);s.stage=4;s.post=2;s.landingStep=2;s.routePrepared=true;
 s.workshop.repaired=true;s.camp.pier=true;s.camp.loft=true;s.camp.deepSurvey=true;
 for(let i=0;i<=4;i++)s.discovered.push('chart:tide:'+i);
 s.requests.supplies=5;
 const old=JSON.stringify(s),g=goal(s);
 assert.equal(g.name,'Install Precision Bench');
 assert.equal(g.action,'orders');
 const o=s.requests.orders.find(x=>x.id===g.orderId);
 assert.ok(o&&o.supplies>0,'primary goal should point to a real outstanding order');
 assert.ok(requestProgress(s,o).progress.length>0);
 assert.equal(JSON.stringify(s),old,'returning player state remains unchanged');
 assert.equal(expeditionGoal(s).name,'Chart the next crossing','optional expedition goals stay available');
 assert.deepEqual(load(JSON.stringify(s)).requests,s.requests);
 console.log('STUDIO_POLICY_SIMULATION',JSON.stringify({style:'returning',vault:true,supplies:s.requests.supplies,primary:g.name,order:o.lane,optional:expeditionGoal(s).name}));
});
