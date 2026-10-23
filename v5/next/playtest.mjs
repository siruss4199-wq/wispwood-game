// Local playtest log (Build 41 M6): what happened in each session, kept only in this browser
// under its own key, never sent anywhere. The player can copy or download it for the team.
// No identifiers: sessions are numbered; the only device facts are the screen size and whether
// it is a touch screen. Bounded: the oldest events go first; milestones and counts stay.
export const LOG_KEY='vaultwake-v5-coast-playtest',LOG_VERSION=1,MAX_EVENTS=2000,MAX_BYTES=200000;
const blank=(build,t)=>({v:LOG_VERSION,build,created:t,sessions:[],milestones:{},counts:{},events:[]});
const valid=d=>d&&d.v===LOG_VERSION&&Array.isArray(d.sessions)&&Array.isArray(d.events)&&d.milestones&&typeof d.milestones==='object'&&d.counts&&typeof d.counts==='object';
// storage: {get(key), set(key,value) that may throw, remove(key)}.
export function createLog({storage,now=()=>Date.now(),build='',viewport='',touch=false}){
 let data,off=false,dirty=false;
 try{const raw=storage.get(LOG_KEY),d=raw?JSON.parse(raw):null;data=valid(d)?d:blank(build,now());}catch{data=blank(build,now());}
 const session=()=>data.sessions.at(-1);
 function push(e,d){
  const t=now(),s=session();if(s)s.last=t;
  data.events.push({t,s:s?.n??0,e,...(d===undefined?{}:{d})});data.counts[e]=(data.counts[e]??0)+1;
  if(data.events.length>MAX_EVENTS)data.events.splice(0,data.events.length-MAX_EVENTS);dirty=true;
 }
 const log={
  startSession(){const t=now();data.build=build;data.sessions.push({n:data.sessions.length+1,start:t,last:t,viewport,touch});push('session');},
  event:push,
  // The first time something happens, kept even when old events are dropped.
  milestone(name,d){if(data.milestones[name])return;const s=session();data.milestones[name]={t:now(),s:s?.n??0,...(s?{after:now()-s.start}:{})};push(name,d);},
  touch(){const s=session();if(s){s.last=now();dirty=true;}},
  end(reason){const s=session();if(s){s.end=now();s.last=s.end;}push('pause',{reason});log.flush();},
  // Writes when something changed; drops the oldest events until it fits; a storage error turns
  // the log off for this session so the game's own save is never at risk.
  flush(){
   if(off||!dirty)return false;let json=JSON.stringify(data);
   while(json.length>MAX_BYTES&&data.events.length){data.events.splice(0,Math.max(1,Math.ceil(data.events.length/10)));json=JSON.stringify(data);}
   try{storage.set(LOG_KEY,json);dirty=false;return true;}catch{off=true;return false;}
  },
  // The export: the log plus a summary of the sessions (minutes from start to last activity).
  toJSON(){const minutes=data.sessions.map(s=>+(((s.end??s.last)-s.start)/60000).toFixed(2));
   return JSON.stringify({...data,summary:{sessions:data.sessions.length,minutes,totalMinutes:+minutes.reduce((a,b)=>a+b,0).toFixed(2),events:data.events.length}},null,1);},
  clear(){data=blank(build,now());dirty=false;try{storage.remove(LOG_KEY);}catch{}},
  get off(){return off;},
  get data(){return data;}
 };
 return log;
}
