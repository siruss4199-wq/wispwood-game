// Action-first board guide. Every suggested action is grounded in reducer rules.
// Guidance lives outside saved gameplay state and never mutates the board.
import {FAMILIES,SOURCES,goal,count,ready,item,nameOf,sourceUnlocked} from './core.mjs';
import {ANCHORS,ROUTES,equipment,anchors} from './expedition.mjs';

const find=(s,p)=>s.board.findIndex((x,i)=>p(x,i));
const producer=(s,family)=>find(s,x=>x?.type==='source'&&x.id===family);
const ingredient=(s,family,tier)=>find(s,x=>x?.type==='item'&&x.family===family&&x.tier===tier);
const missing=s=>(goal(s)?.needs??[]).find(r=>count(s,r)<r.count);
const part=(family,tier)=>({type:'item',family,tier});
const pict=(x,label)=>({x,label});
const step=(title,detail,icons,primary,secondary=null,from=null,to=null)=>({title,detail,icons,primary,secondary,from,to});
const show=(label,index)=>({label,kind:'show',index});

export function boardCoach(s,index=null){
 const x=index===null?null:s.board[index];
 const story=goal(s);
 if(x?.type==='rock'){
  const tool=find(s,y=>y?.type==='brace'||y?.type==='item'&&y.family==='rig'&&y.tier===2);
  return step(tool>=0?'CLEAR THIS STONE · READY':'CLEAR STONE · MAKE A TOOL',
   tool>=0?'You have the tool. Tap CLEAR NOW to spend it and reveal supplies.':'You need ONE Split Spanner. Produce Fieldworks parts, then merge matching pairs until you make a spanner. Clearing stones is optional.',
   [pict(part('rig',2),'1 · Spanner'),pict({type:'rock'},'2 · Clear'),pict({type:'crate',kind:'locker',left:2},'3 · Supplies')],
   tool>=0?{label:'CLEAR NOW',kind:'clear',index}:show('FIND FIELDWORKS',producer(s,'rig')),
   null,tool>=0?tool:producer(s,'rig'),index);
 }
 if(x?.type==='sealed'||x?.type==='lock'||x?.type==='marker'){
  const relic=find(s,y=>y?.type==='site'&&y.kind==='scope'&&y.phase==='idle');
  const scope=ingredient(s,'chart',3);
  if(s.stage>=2&&relic>=0){
   return step('BURIED GROUND · REVEAL 2 SPACES',
    'This is LOCKED terrain, not a merge item. The Relic Finder device uncovers two buried spaces. Make a Survey Scope (Wayfinding T4), then activate that device. Remaining buried ground opens when the Vault is unlocked.',
    [pict(part('chart',3),'1 · Scope'),pict({type:'site',kind:'scope',phase:'idle',progress:0},'2 · Device'),pict({type:'sealed'},'3 · Open')],
    scope>=0?{label:'USE RELIC FINDER',kind:'deploy',index:relic}:show('FIND SURVEY KITE',producer(s,'chart')),
    show('FOLLOW MAIN STORY',null),scope>=0?scope:producer(s,'chart'),relic);
  }
  const r=s.stage===1?find(s,y=>y?.type==='route'):null;
  return step('BURIED GROUND · STORY LOCK',
   s.stage===1?'You do not merge this ground. Choose ONE breach (Ridge or Conduit) above to uncover part of the route. The remaining covered spaces unlock later.':s.stage>=3?'Do not spend a tool on this ground. Continue the MAIN STORY and open the Tideglass Vault; remaining covered ground disappears when the Vault opens.':'This is locked terrain, NOT a rock to clear. Finish the landing objectives and choose one route to uncover the first spaces.',
   [pict({type:'route',id:'ridge'},'1 · Route'),pict({type:'sealed'},'2 · Unlock'),pict({type:'site',kind:'scope',phase:'idle',progress:0},'3 · Explore')],
   r!==null&&r>=0?show('SEE ROUTE CHOICE',r):show('SHOW STORY STEP',null),
   null,r!==null&&r>=0?r:null,index);
 }
 if(x?.type==='glyph'){
  const lens=ingredient(s,'chart',2);
  return step('ECHO FRAGMENT · OPTIONAL DISCOVERY',
    s.discoveryDone?'Already decoded once. Extra fragments may be recycled.':'This purple-gold relic is NOT a rock or matching merge item. Make ONE Sight Lens (Wayfinding T3), then decode it for permanently richer producer drops. Skip it to focus on the Vault.',
    [pict({type:'glyph'},'1 · Echo'),pict(part('chart',2),'2 · Lens'),pict({type:'crate',kind:'relic',left:1},'3 · Bonus')],
    s.discoveryDone?{label:'CLOSE',kind:'close'}:lens>=0?{label:'DECODE NOW',kind:'decode'}:show('FIND SURVEY KITE',producer(s,'chart')),
    show('FOLLOW MAIN STORY',null),lens>=0?lens:producer(s,'chart'),index);
 }
 if(x?.type==='site'){
  const a=ANCHORS[x.kind],req=equipment(x.kind),tool=ingredient(s,req.family,req.tier);
  const finished=x.phase==='done';
  return step(finished?'DEVICE ALREADY ACTIVATED':s.stage<2?'DEVICE · UNLOCK A ROUTE FIRST':a.name.toUpperCase()+' · USE EQUIPMENT',
   finished?'This device is finished. Its effect has already changed your board.':s.stage<2?'Open a route in the MAIN STORY to access this device.':a.effect+'. Produce '+nameOf(part(req.family,req.tier))+' (tier 4) to use it. You only need two of the three devices.',
   [pict(part(req.family,3),'1 · Equipment'),pict(x,'2 · Device'),pict(part(a.drive,1),'3 · Reward')],
   finished?{label:'CLOSE',kind:'close'}:s.stage<2?show('FOLLOW MAIN STORY',null):tool>=0?{label:'USE DEVICE',kind:'deploy',index}:show('FIND '+SOURCES[req.family].name.toUpperCase(),producer(s,req.family)),
   null,tool>=0?tool:producer(s,req.family),index);
 }
 if(x?.type==='route'){
  const route=ROUTES[x.id],r={family:route.family,tier:2,count:1},available=s.stage===1&&ready(s,[r]);
  return step('STORY ROUTE · '+route.name.toUpperCase(),
   s.stage===1?'Choose only ONE path. '+route.benefit+'. This spends a '+nameOf(part(route.family,2))+'. The other path remains closed.':'First finish the landing mission. Then decide which route to open.',
   [pict(part(route.family,2),'1 · Item'),pict(x,'2 · Route'),pict({type:'glyph'},'3 · Discovery')],
   available?{label:'OPEN THIS ROUTE',kind:'breach',index}:show('FIND '+SOURCES[route.family].name.toUpperCase(),producer(s,route.family)),
   null,ingredient(s,route.family,2)>=0?ingredient(s,route.family,2):producer(s,route.family),index);
 }
 if(x?.type==='item'){
  const twin=find(s,(y,i)=>i!==index&&y?.type==='item'&&y.family===x.family&&y.tier===x.tier);
  const req=story?.needs?.some(r=>r.family===x.family&&r.tier===x.tier);
  const usable=x.tier===3&&s.stage>=2?anchors(s).find(y=>y.phase==='idle'&&ANCHORS[y.kind].equipment===x.family):null;
  if(usable){
   const i=s.board.indexOf(usable);
   return step(req?'KEEP OR USE? · STORY ITEM':'USE EQUIPMENT OR MERGE',
    'This '+nameOf(x)+' can activate '+ANCHORS[usable.kind].name+', or merge with its twin to become '+(x.tier<7?FAMILIES[x.family].names[x.tier+1]:'a top-tier item')+'. Choose what helps your next goal.',
    [pict(x,'1 · Equipment'),pict(usable,'2 · Device'),pict(part(x.family,4),'OR · Merge')],
    {label:'SHOW DEVICE',kind:'show',index:i},twin>=0?show('SHOW MATCH',twin):null,index,i);
  }
  return step(req?'MAIN STORY · KEEP THIS ITEM':twin>=0?'MERGE TWO MATCHING ITEMS':'CRAFT A MATCHING TWIN',
   req?'The main expedition needs this exact item. Keep it for the story action above. If you merge it higher, you may need to craft another.':twin>=0?'Tap the matching highlighted tile or drag this one onto it. Identical appearance + same tier produces the next item.':'Produce more '+FAMILIES[x.family].name+' parts, then merge matching tiers until you have a twin.',
   [pict(x,'1 · This item'),pict(x,'2 · Same item'),pict(part(x.family,Math.min(x.tier+1,7)),'3 · Result')],
   req?show('SEE MAIN STORY',null):twin>=0?{label:'SHOW MATCH',kind:'match',index:twin,from:index}:show('FIND '+SOURCES[x.family].name.toUpperCase(),producer(s,x.family)),
   null,index,twin>=0?twin:producer(s,x.family));
 }
 if(x?.type==='source'){
  return step('PRODUCER · '+SOURCES[x.id].name.toUpperCase(),
   sourceUnlocked(s,x.id)?'Tap this machine to make '+FAMILIES[x.id].name+' items. Merge two identical pieces. Each pull uses '+SOURCES[x.id].cost+' energy.':'This producer is locked. Finish the related MAIN STORY objective to unlock it.',
   [pict(x,'1 · Tap'),pict(part(x.id,0),'2 · Parts'),pict(part(x.id,1),'3 · Merge')],
   sourceUnlocked(s,x.id)&&s.charges[x.id]>0?{label:'PRODUCE ONE',kind:'produce',id:x.id}:show('SHOW STORY STEP',null),null,index,null);
 }
 if(x?.type==='crate'){
  return step('REWARD CACHE · UNPACK SUPPLIES','Tap the cache to unpack its stored parts into empty spaces. It does not merge with normal items.',
    [pict(x,'1 · Cache'),pict(part('rig',0),'2 · Parts'),pict(part('rig',1),'3 · Merge')],{label:'OPEN CACHE',kind:'crate',index},null,index,null);
 }
 const need=missing(s);
 if(!story)return step('EXPEDITION COMPLETE','Your Vault is open. Keep discovering advanced items in the journal.',
    [pict(part('chart',5),'Discover'),pict(part('flux',5),'Collect')],{label:'CLOSE',kind:'close'});
 if(s.stage===1)return step('MAIN STORY · CHOOSE ONE BREACH','Select one of the two routes at the top. Ridge uses a Split Spanner; Conduit uses a Sight Lens. The other route remains closed.',
   [pict(part('rig',2),'Ridge'),pict(part('chart',2),'Conduit')],show('SHOW ROUTES',find(s,y=>y?.type==='route')));
 if(s.stage===2)return step('MAIN STORY · ACTIVATE 2 DEVICES','Use any TWO devices. Tap one on the board to see which tier 4 tool it requires.',
   [pict(part('rig',3),'Stone lift'),pict(part('chart',3),'Relic finder'),pict(part('flux',3),'Power bridge')],show('SHOW DEVICE',find(s,y=>y?.type==='site'&&y.phase==='idle')));
 if(!need)return step('MAIN STORY · READY','You have all the required items. Claim your main-story progress. Optional tasks can wait.',
   (story.needs??[]).map(r=>pict(part(r.family,r.tier),'Ready')), {label:'COMPLETE STORY',kind:'goal'});
 const src=producer(s,need.family),found=ingredient(s,need.family,need.tier);
 return step('YOUR NEXT MOVE · '+nameOf(part(need.family,need.tier)).toUpperCase(),
  'Make '+nameOf(part(need.family,need.tier))+' for the MAIN STORY. Tap '+SOURCES[need.family].name+', then merge matching '+FAMILIES[need.family].name+' pairs until tier '+(need.tier+1)+'. Bonus tasks are optional.',
  [pict({type:'source',id:need.family},'1 · Produce'),pict(part(need.family,0),'2 · Merge'),pict(part(need.family,need.tier),'3 · Story')],
  show('SHOW '+SOURCES[need.family].name.toUpperCase(),src),null,src,found>=0?found:null);
}
