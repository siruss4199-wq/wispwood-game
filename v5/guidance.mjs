// Player-facing guidance is derived from the current real rules, never from a parallel tutorial state.
import {FAMILIES,SOURCES,goal,count,nameOf,item,sourceUnlocked} from './core.mjs';
import {ANCHORS,ROUTES,equipment,anchors} from './expedition.mjs';

const needName=r=>nameOf(item(r.family,r.tier));
const missing=(s,g)=>g?.needs?.find(r=>count(s,r)<r.count);
const progress=(s,r)=>Math.min(count(s,r),r.count)+'/'+r.count;

export function objectiveGuide(s){
 const g=goal(s);
 if(!g)return {title:'Expedition completed',short:'EXPLORE · Discover more combinations',recipe:'',detail:'The main expedition is complete. The journal shows your remaining discoveries.'};
 if(s.stage===1)return {
  title:'MAIN STORY · Choose one route',
  short:'NEXT · Choose Ridge or Conduit',
  recipe:'CHOOSE ONE · Ridge gives space / Conduit gives relic parts',
  detail:'You need only ONE route. Ridge spends a Split Spanner and clears more work space. Conduit spends a Sight Lens and gives relic supplies. Tap a route on the board or its goal icon to see the choice.'
 };
 if(s.stage===2)return {
  title:'MAIN STORY · Use two devices',
  short:'NEXT · Power any two devices',
  recipe:'USE 2 DEVICES · Tap a device to see its equipment',
  detail:'Pick any two of the three buried devices. Each uses one finished tool and returns different rewards. Tap a device to find out which item it needs. You may instead keep that tool and merge it higher.'
 };
 const need=missing(s,g),isReady=!need;
 const recipe=(g.needs??[]).map(r=>needName(r)+' '+progress(s,r)).join(' · ');
 return {
  title:isReady?'MAIN STORY · Ready to continue':'MAIN STORY · Craft the required items',
  short:isReady?'STORY READY · Tap '+g.verb:'NEXT · Make '+needName(need),
  recipe,
  detail:isReady?'You have all required items. Tap the main story action above. Optional bonus work is not required.':'To make '+needName(need)+', tap its picture in the main story to locate '+SOURCES[need.family].name+'. Produce parts, then merge TWO IDENTICAL items of the same family and level. The separate BONUS task is optional and may be skipped.'
 };
}

export function objectGuide(s,index){
 const x=s.board[index];if(!x)return objectiveGuide(s);
 if(x.type==='item'){
  const f=FAMILIES[x.family],next=x.tier<7?f.names[x.tier+1]:null;
  const twin=s.board.some((y,i)=>i!==index&&y?.type==='item'&&y.family===x.family&&y.tier===x.tier);
  const keep=goal(s)?.needs.some(r=>r.family===x.family&&r.tier===x.tier);
  const site=s.stage>=2&&anchors(s).find(y=>y.phase==='idle'&&y.kind in ANCHORS&&ANCHORS[y.kind].equipment===x.family&&x.tier===3);
  const role=keep?'This exact item is needed for the MAIN STORY.':site?'You can USE this on '+ANCHORS[site.kind].name+' or keep it to merge higher.':'This is a merge item, not a producer or an Echo fragment.';
  const how=x.tier===7?'Highest discovery tier.':twin?'Tap or drag this item onto its matching twin to make '+next+'.':'No matching twin on the board. Make another from '+SOURCES[x.family].name+' and merge pairs to this level.';
  return {title:nameOf(x)+' · '+f.name+' T'+(x.tier+1),short:(keep?'STORY ITEM · ':twin?'MERGE MATCH · ':'CRAFT PART · ')+nameOf(x),detail:role+' '+how};
 }
 if(x.type==='source')return {
  title:'PRODUCER · '+SOURCES[x.id].name,short:sourceUnlocked(s,x.id)?'PRODUCER · Tap for '+FAMILIES[x.id].name+' parts':'LOCKED · '+SOURCES[x.id].name,
  detail:sourceUnlocked(s,x.id)?'Tap this machine to produce '+FAMILIES[x.id].name+' items. Every pull costs '+SOURCES[x.id].cost+' energy. Merge TWO items with the same appearance and level to make a higher item.':'This producer is locked until you complete the related main story milestone.'
 };
 if(x.type==='glyph')return {title:'ECHO FRAGMENT · Optional secret',short:'ECHO FRAGMENT · Not a merge item',detail:s.discoveryDone?'You already decoded a fragment. This extra can be recycled for energy.':'This is NOT a normal stone and cannot merge with another fragment. In the optional Relic Find task, combine ONE Sight Lens (Wayfinding T3) with this Echo fragment to permanently improve future source drops. You can skip it and continue the main story.'};
 if(x.type==='rock')return {title:'SALTSTONE · Buried reward',short:'SALTSTONE · Clear with Split Spanner',detail:'This blocker does NOT merge. Make one Split Spanner (Fieldworks T3), then tap this rock and choose Clear to reveal stored supplies. Clearing it is optional; the Vault story does not require every rock.'};
 if(x.type==='sealed')return {title:'BURIED GROUND',short:'BURIED · Opens with expedition progress',detail:'This space is buried, not an item to merge. Route choice and later story progress open parts of the ground. Continue the main story.'};
 if(x.type==='crate')return {title:'REWARD CACHE · '+nameOf(x),short:'CACHE · Tap to reveal stored parts',detail:'Tap this reward container to unpack its stored items when the board has room. It is not a normal matching merge item.'};
 if(x.type==='route'){const r=ROUTES[x.id];return {title:r.name+' · Main story choice',short:'ROUTE · '+r.name,detail:s.stage===1?'Spend a '+nameOf(item(r.family,2))+' to open '+r.name+'. '+r.benefit+'. You need only one route.':'You have already made your route choice. Continue the story.'};}
 if(x.type==='site'){const a=ANCHORS[x.kind];return {title:a.name+' · Expedition device',short:'DEVICE · '+a.name,detail:s.stage<2?'This is a buried device. Open a route first.':x.phase==='done'?'This device has already been activated.':'Make '+nameOf(item(a.equipment,3))+' to use this device: '+a.effect+'. You need only two of the three devices.'};}
 if(x.type==='brace')return {title:'TRAIL BRACE · Clearing tool',short:'TOOL · Clear Saltstone',detail:'Tap a Saltstone blocker and choose Clear to spend this brace and uncover a reward. This does not merge with normal items.'};
 return objectiveGuide(s);
}
