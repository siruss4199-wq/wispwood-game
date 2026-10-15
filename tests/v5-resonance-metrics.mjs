import assert from 'node:assert/strict';
import {fresh,act} from '../v5/core.mjs';
import {beam,sightLens} from '../v5/seals.mjs';
import {choose} from './v5-policy.mjs';
import {layouts} from './v5-optics-policy.mjs';
const runs=[];
for(const route of ['ridge','conduit'])for(const style of ['expedition','exploration'])for(const findStrategy of [null,'recover','restore','mixed'])for(const openCaches of [false,true])for(const decode of [false,true])for(const mergeSight of [false,true]){
 const options={route,style,findStrategy,openCaches,decode,mergeSight,sideFirst:false},s=fresh(0),actions=[];let entry=null;
 while(s.stage<4&&s.moves<200){
  const solutions=layouts(s);
  if(!entry&&solutions.length)entry={move:s.moves,occupied:s.board.filter(Boolean).length,solutions:solutions.map(({path,receiver})=>({path,receiver}))};
  const a=choose(s,options),from=s.board[a.from],occupied=!!s.board[a.to],result=act(s,a,s.moves*1000);assert.ok(result.ok,result.message);
  actions.push({...a,interaction:a.type==='merge'?(from?.type==='prism'?'reflector placement':occupied?'merge':sightLens(from)&&s.stage===2?'lens placement':'inventory relocation'):a.type,beamStop:beam(s).stop,stage:s.stage,occupied:s.board.filter(Boolean).length,energy:s.energy});
 }
 assert.equal(s.stage,4);assert.ok(entry);
 const segment=actions.slice(entry.move,-1); // receiver available → powered; exclude vault button
 runs.push({options,chapterActions:s.moves,merges:s.merges,pulls:Object.values(s.taps).reduce((a,b)=>a+b,0),minOccupied:Math.min(...actions.map(x=>x.occupied)),maxOccupied:Math.max(...actions.map(x=>x.occupied)),endEnergy:s.energy,environmentInteractions:actions.filter(x=>['breach','clear','restore','deploy','prime','turn','power'].includes(x.type)).length,decisions:{route:s.expedition.route,lift:s.board.find(x=>x?.type==='site'&&x.kind==='winch').repair,finds:s.expedition.log.filter(x=>x.type==='find-choice'),lensKept:s.seals.link.some(i=>sightLens(s.board[i])),receiver:s.expedition.log.find(x=>x.type==='seal'&&x.seal==='resonance').receiver},actions,entry,segmentActions:segment.length,segment,solvedPath:s.seals.link,receiver:s.expedition.log.find(x=>x.type==='seal'&&x.seal==='resonance').receiver});
}
console.log(JSON.stringify({note:'Deterministic policy observations, not human difficulty or an exhaustive shortest-path proof. Geometric alternatives ignore movable inventory; each still needs arrangement.',testedPolicies:runs.length,fastest:runs.reduce((a,b)=>a.chapterActions<=b.chapterActions?a:b),sameOldWitnessPolicy:runs.find(x=>x.options.route==='conduit'&&x.options.style==='expedition'&&x.options.findStrategy==='mixed'&&!x.options.openCaches&&!x.options.decode),byRoute:['ridge','conduit'].map(route=>({route,minimumActions:Math.min(...runs.filter(x=>x.options.route===route).map(x=>x.chapterActions))})),segmentRange:[Math.min(...runs.map(x=>x.segmentActions)),Math.max(...runs.map(x=>x.segmentActions))],runs},null,2));
